'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const supabase = createClient()
  const router = useRouter()

  const [user, setUser] = useState(null)
  const [repos, setRepos] = useState([])
  const [selectedRepo, setSelectedRepo] = useState(null)
  const [commits, setCommits] = useState([])
  const [logs, setLogs] = useState([])
  const [loadingRepos, setLoadingRepos] = useState(true)
  const [loadingCommits, setLoadingCommits] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    entry_type: 'decision',
    content: '',
    linked_commit_sha: '',
    is_retrospective: false,
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login') } else { setUser(user) }
    })
  }, [])

  useEffect(() => {
    if (!user) return
    fetch('/api/github/repos')
      .then(res => res.json())
      .then(data => { setRepos(data.repos || []); setLoadingRepos(false) })
  }, [user])

  function handleRepoClick(repo) {
    setSelectedRepo(repo)
    setCommits([])
    setLogs([])
    setLoadingCommits(true)
    setShowForm(false)
    fetch('/api/github/commits?repo=' + repo.full_name)
      .then(res => res.json())
      .then(data => { setCommits(data.commits || []); setLoadingCommits(false) })
    supabase
      .from('build_logs')
      .select('*')
      .eq('repo_name', repo.full_name)
      .order('created_at', { ascending: false })
      .then(({ data }) => setLogs(data || []))
  }

  async function handleSubmit() {
    if (!form.content.trim()) return
    setSubmitting(true)
    const { error } = await supabase.from('build_logs').insert({
      user_id: user.id,
      repo_name: selectedRepo.full_name,
      entry_type: form.entry_type,
      content: form.content,
      linked_commit_sha: form.linked_commit_sha || null,
      is_retrospective: form.is_retrospective,
    })
    if (!error) {
      const { data } = await supabase
        .from('build_logs')
        .select('*')
        .eq('repo_name', selectedRepo.full_name)
        .order('created_at', { ascending: false })
      setLogs(data || [])
      setForm({ entry_type: 'decision', content: '', linked_commit_sha: '', is_retrospective: false })
      setShowForm(false)
    }
    setSubmitting(false)
  }

  function groupByWeek(commits, logs) {
    const groups = {}

    commits.forEach(commit => {
      const date = new Date(commit.date)
      const day = date.getDay()
      const diff = date.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(new Date(commit.date).setDate(diff))
      const key = monday.toISOString().split('T')[0]
      if (!groups[key]) groups[key] = { commits: [], logs: [] }
      groups[key].commits.push(commit)
    })

    logs.forEach(log => {
      const date = new Date(log.created_at)
      const day = date.getDay()
      const diff = date.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(new Date(log.created_at).setDate(diff))
      const key = monday.toISOString().split('T')[0]
      if (!groups[key]) groups[key] = { commits: [], logs: [] }
      groups[key].logs.push(log)
    })

    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }

  const typeColors = {
    struggle: 'bg-red-950 text-red-400 border-red-800',
    decision: 'bg-blue-950 text-blue-400 border-blue-800',
    solved: 'bg-emerald-950 text-emerald-400 border-emerald-800',
    learning: 'bg-purple-950 text-purple-400 border-purple-800',
  }

  if (!user) return null

  return (
    <main className="min-h-screen bg-gray-950 text-white px-4 py-12">
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-4 mb-10">
          {user.user_metadata?.avatar_url && (
            <img src={user.user_metadata.avatar_url} alt="Profile" className="w-16 h-16 rounded-full" />
          )}
          <div>
            <h1 className="text-2xl font-medium">{user.user_metadata?.full_name || user.user_metadata?.user_name || 'Developer'}</h1>
            <p className="text-gray-400 text-sm">{user.email}</p>
          </div>
          <form action="/auth/signout" method="post" className="ml-auto">
            <button type="submit" className="text-gray-500 hover:text-white text-sm underline">Sign out</button>
          </form>
        </div>

        <div className="mb-10">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-4">Your Repositories</h2>
          {loadingRepos ? (
            <p className="text-gray-500 text-sm">Loading repos...</p>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {repos.map(repo => (
                <button key={repo.id} onClick={() => handleRepoClick(repo)}
                  className={'text-left px-4 py-3 rounded-lg border transition-colors ' + (selectedRepo?.id === repo.id ? 'border-emerald-600 bg-emerald-950 text-white' : 'border-gray-800 bg-gray-900 text-gray-300 hover:border-gray-600')}>
                  <div className="font-medium text-sm">{repo.name}</div>
                  <div className="text-xs text-gray-600 mt-1">Last pushed {new Date(repo.pushed_at).toLocaleDateString()}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedRepo && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-widest">Timeline - {selectedRepo.name}</h2>
              <button onClick={() => setShowForm(!showForm)}
                className="text-sm bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg transition-colors">
                {showForm ? 'Cancel' : '+ Log entry'}
              </button>
            </div>

            {showForm && (
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-5 mb-6">
                <div className="flex gap-2 mb-4 flex-wrap">
                  {['decision', 'struggle', 'solved', 'learning'].map(type => (
                    <button key={type} onClick={() => setForm(f => ({ ...f, entry_type: type }))}
                      className={'px-3 py-1 rounded-full text-xs font-medium border transition-colors ' + (form.entry_type === type ? typeColors[type] : 'border-gray-700 text-gray-500 hover:border-gray-500')}>
                      {type}
                    </button>
                  ))}
                </div>

                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="What happened? What did you decide, struggle with, solve, or learn?"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-gray-500"
                  rows={4}
                />

                <div className="flex items-center gap-4 mt-3 flex-wrap">
                  <input
                    value={form.linked_commit_sha}
                    onChange={e => setForm(f => ({ ...f, linked_commit_sha: e.target.value }))}
                    placeholder="Link a commit SHA (optional)"
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-gray-500 flex-1 min-w-0"
                  />
                  <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                    <input type="checkbox" checked={form.is_retrospective}
                      onChange={e => setForm(f => ({ ...f, is_retrospective: e.target.checked }))}
                      className="accent-emerald-500" />
                    Logging from memory
                  </label>
                  <button onClick={handleSubmit} disabled={submitting || !form.content.trim()}
                    className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                    {submitting ? 'Saving...' : 'Save entry'}
                  </button>
                </div>
              </div>
            )}

            {loadingCommits ? (
              <p className="text-gray-500 text-sm">Loading timeline...</p>
            ) : (
              <div className="space-y-8">
                {groupByWeek(commits, logs).map(([weekStart, { commits: wCommits, logs: wLogs }]) => (
                  <div key={weekStart}>
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">
                      Week of {new Date(weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="space-y-2 border-l border-gray-800 pl-4">
                      {wCommits.map(commit => (
                        <div key={commit.sha} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
                          <div className="flex items-start justify-between gap-4">
                            <p className="text-sm text-white leading-snug">{commit.message}</p>
                            <a href={commit.url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-600 hover:text-gray-400 font-mono shrink-0">{commit.sha}</a>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">{new Date(commit.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      ))}
                      {wLogs.map(log => (
                        <div key={log.id} className={'border rounded-lg px-4 py-3 ' + typeColors[log.entry_type]}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-medium uppercase tracking-wider">{log.entry_type}</span>
                            {log.is_retrospective && <span className="text-xs opacity-60">(from memory)</span>}
                            {log.linked_commit_sha && <span className="text-xs font-mono opacity-60">#{log.linked_commit_sha.slice(0, 7)}</span>}
                          </div>
                          <p className="text-sm leading-relaxed">{log.content}</p>
                          <p className="text-xs opacity-50 mt-2">{new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  )
}
