'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter'
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import CodeRunner from '@/app/components/CodeRunner'
import VoiceInput from '@/app/components/VoiceInput'
import WeeklyRecap from '@/app/components/WeeklyRecap'
import ProgressRow from '@/app/components/ProgressRow'

export default function ProfilePage() {
  const supabase = createClient()
  const router = useRouter()

  const [user, setUser] = useState(null)
  const [repos, setRepos] = useState([])
  const [selectedRepo, setSelectedRepo] = useState(null)
  const [commits, setCommits] = useState([])
  const [logs, setLogs] = useState([])
  const [allLogs, setAllLogs] = useState([])
  const [authType, setAuthType] = useState(null)
  const [loadingRepos, setLoadingRepos] = useState(true)
  const [loadingCommits, setLoadingCommits] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showCode, setShowCode] = useState(false)
  const [form, setForm] = useState({
    entry_type: 'decision',
    content: '',
    linked_commit_sha: '',
    is_retrospective: false,
    code_snippet: '',
    code_language: 'javascript',
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login') } else { setUser(user) }
    })
  }, [])

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('auth_type')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setAuthType(data?.auth_type || 'github'))
  }, [user])

  useEffect(() => {
    if (!user) return
    if (authType && authType !== 'github') { setLoadingRepos(false); return }
    if (!authType) return
    fetch('/api/github/repos')
      .then(res => res.json())
      .then(data => { setRepos(data.repos || []); setLoadingRepos(false) })
  }, [user, authType])

  useEffect(() => {
    if (!user) return
    supabase
      .from('build_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setAllLogs(data || []))
  }, [user])

  useEffect(() => {
    if (!user || selectedRepo) return
    supabase
      .from('build_logs')
      .select('*')
      .eq('repo_name', 'no-repo')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setLogs(data || []))
  }, [user, selectedRepo])

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
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setLogs(data || []))
  }

  async function scoreEntry(logId, content, entryType) {
    setLogs(prev => prev.map(l => l.id === logId ? { ...l, _scoring: true, _scoringFailed: false } : l))
    try {
      const res = await fetch('/api/ai/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_id: logId, content, entry_type: entryType }),
      })
      if (!res.ok) throw new Error('Scoring request failed')
      const { scores } = await res.json()
      if (!scores) throw new Error('No scores returned')
      setLogs(prev => prev.map(l => l.id === logId ? { ...l, ai_scores: scores, _scoringFailed: false, _scoring: false } : l))
    } catch (e) {
      setLogs(prev => prev.map(l => l.id === logId ? { ...l, _scoringFailed: true, _scoring: false } : l))
    }
  }

  async function handleDelete(logId) {
    const confirmed = window.confirm('Delete this entry? This cannot be undone.')
    if (!confirmed) return

    const { error } = await supabase
      .from('build_logs')
      .delete()
      .eq('id', logId)
      .eq('user_id', user.id)

    if (!error) {
      setLogs(prev => prev.filter(l => l.id !== logId))
      setAllLogs(prev => prev.filter(l => l.id !== logId))
    } else {
      window.alert('Could not delete the entry. Please try again.')
    }
  }

  async function handleSubmit() {
    if (!form.content.trim()) return
    setSubmitting(true)

    const { data: inserted, error } = await supabase.from('build_logs').insert({
      user_id: user.id,
      repo_name: selectedRepo?.full_name || 'no-repo',
      entry_type: form.entry_type,
      content: form.content,
      linked_commit_sha: form.linked_commit_sha || null,
      is_retrospective: form.is_retrospective,
      code_snippet: form.code_snippet || null,
      code_language: form.code_snippet ? form.code_language : null,
    }).select().single()

    if (!error && inserted) {
      if (inserted.entry_type !== 'progress') {
        scoreEntry(inserted.id, inserted.content, inserted.entry_type)
      }

      const { data } = await supabase
        .from('build_logs')
        .select('*')
        .eq('repo_name', selectedRepo?.full_name || 'no-repo')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setLogs((data || []).map(l => (l.id === inserted.id && l.entry_type !== 'progress') ? { ...l, _scoring: true } : l))
      setAllLogs(prev => [{ ...inserted }, ...prev])
      setForm({ entry_type: 'decision', content: '', linked_commit_sha: '', is_retrospective: false, code_snippet: '', code_language: 'javascript' })
      setShowForm(false)
      setShowCode(false)
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

  const typeConfig = {
    struggle: { bg: 'bg-red-950', border: 'border-red-800', text: 'text-red-400', badge: 'bg-red-900 text-red-300', bar: 'bg-red-500', coach: 'text-red-300' },
    decision: { bg: 'bg-blue-950', border: 'border-blue-800', text: 'text-blue-400', badge: 'bg-blue-900 text-blue-300', bar: 'bg-blue-500', coach: 'text-blue-300' },
    solved: { bg: 'bg-emerald-950', border: 'border-emerald-800', text: 'text-emerald-400', badge: 'bg-emerald-900 text-emerald-300', bar: 'bg-emerald-500', coach: 'text-emerald-300' },
  }

  const languages = ['javascript', 'python', 'typescript', 'java', 'cpp', 'css', 'html', 'sql', 'bash', 'json', 'rust', 'go']

  function ScoreBar({ label, value, coachTip, barColor, coachColor }) {
    return (
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs opacity-60 truncate pr-2">{label}</span>
          <span className="text-xs font-semibold opacity-90 shrink-0">{value}/10</span>
        </div>
        <div className="h-1 rounded-full bg-white bg-opacity-10 mb-1.5">
          <div className={'h-1 rounded-full transition-all ' + barColor} style={{ width: (value * 10) + '%' }} />
        </div>
        {coachTip && <p className={'text-xs opacity-70 ' + coachColor}>{coachTip}</p>}
      </div>
    )
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
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.href = '/login'
            }}
            className="ml-auto text-gray-500 hover:text-white text-sm underline"
          >
            Sign out
          </button>
        </div>

        <WeeklyRecap logs={allLogs} />


        {authType === 'github' && (
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
        )}

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-widest">
              {selectedRepo ? 'Timeline - ' + selectedRepo.name : 'Build Log'}
            </h2>
            <button onClick={() => setShowForm(!showForm)}
              className="text-sm bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg transition-colors">
              {showForm ? 'Cancel' : '+ Log entry'}
            </button>
          </div>

          {showForm && (
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mb-6">
              <div className="flex gap-2 mb-4 flex-wrap">
                {['decision', 'struggle', 'solved', 'progress'].map(type => {
                  const activeStyle = typeConfig[type]
                    ? typeConfig[type].badge + ' ' + typeConfig[type].border
                    : 'bg-gray-800 text-gray-300 border-gray-600'
                  return (
                    <button key={type} onClick={() => setForm(f => ({ ...f, entry_type: type }))}
                      className={'px-3 py-1 rounded-full text-xs font-medium border transition-colors ' + (form.entry_type === type ? activeStyle : 'border-gray-700 text-gray-500 hover:border-gray-500')}>
                      {type}
                    </button>
                  )
                })}
              </div>

              <button onClick={() => setShowCode(!showCode)}
                className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors mb-3">
                {showCode ? 'Remove code block' : '+ Add code block'}
              </button>

              {showCode && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <select
                      value={form.code_language}
                      onChange={e => setForm(f => ({ ...f, code_language: e.target.value }))}
                      className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded px-2 py-1 focus:outline-none">
                      {languages.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <span className="text-xs text-gray-500">Select language</span>
                  </div>
                  <textarea
                    value={form.code_snippet}
                    onChange={e => setForm(f => ({ ...f, code_snippet: e.target.value }))}
                    placeholder="Paste your code here..."
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-sm text-green-400 placeholder-gray-600 resize-none focus:outline-none focus:border-gray-500 font-mono"
                    rows={8}
                  />
                  {form.code_snippet.trim() && (
                    <CodeRunner code={form.code_snippet} language={form.code_language} />
                  )}
                </div>
              )}

              <textarea
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="What happened? What did you decide, struggle with, or solve?"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-gray-500 mb-1"
                rows={3}
              />
              <div className="mb-3">
                <VoiceInput onTranscript={(text) => setForm(f => ({ ...f, content: (f.content ? f.content + ' ' : '') + text }))} />
              </div>

              <div className="flex items-center gap-4 flex-wrap">
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
                  From memory
                </label>
                <button onClick={handleSubmit} disabled={submitting || !form.content.trim()}
                  className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                  {submitting ? 'Saving...' : 'Save entry'}
                </button>
              </div>
            </div>
          )}
        </div>

        {loadingCommits ? (
          <p className="text-gray-500 text-sm">Loading timeline...</p>
        ) : logs.length === 0 && commits.length === 0 && !showForm ? (
          <div className="border border-gray-800 rounded-xl p-8 text-center">
            <h3 className="text-lg font-medium text-white mb-2">Start your build log</h3>
            <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
              Document your real thinking as you build. Each entry captures the <span className="text-white">why</span>{' '}behind your work &mdash; the part resumes and commits can&rsquo;t show.
            </p>
            <div className="flex flex-wrap gap-3 justify-center mb-6 text-left">
              <div className="border border-blue-900 bg-blue-950 rounded-lg p-3 w-52">
                <span className="text-xs font-semibold uppercase tracking-widest text-blue-300">Decision</span>
                <p className="text-xs text-blue-400 mt-1 opacity-80">A tradeoff you made &mdash; what you chose and why over the alternatives.</p>
              </div>
              <div className="border border-red-900 bg-red-950 rounded-lg p-3 w-52">
                <span className="text-xs font-semibold uppercase tracking-widest text-red-300">Struggle</span>
                <p className="text-xs text-red-400 mt-1 opacity-80">Something that blocked you &mdash; the root cause and what you tried.</p>
              </div>
              <div className="border border-emerald-900 bg-emerald-950 rounded-lg p-3 w-52">
                <span className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Solved</span>
                <p className="text-xs text-emerald-400 mt-1 opacity-80">A fix you figured out &mdash; what worked and why it makes sense.</p>
              </div>
            </div>
            <button onClick={() => setShowForm(true)}
              className="bg-emerald-700 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm transition-colors">
              Write your first entry
            </button>
          </div>
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
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-500">{new Date(commit.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        <button
                          onClick={() => {
                            setForm(f => ({ ...f, linked_commit_sha: commit.sha, is_retrospective: true }))
                            setShowForm(true)
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }}
                          className="text-xs text-gray-500 hover:text-emerald-400 border border-gray-800 hover:border-emerald-700 rounded px-2 py-0.5 transition-colors"
                        >
                          + Log this commit
                        </button>
                      </div>
                    </div>
                  ))}
                  {wLogs.map(log => {
                    if (log.entry_type === 'progress') {
                      return <ProgressRow key={log.id} log={log} onDelete={handleDelete} />
                    }
                    const cfg = typeConfig[log.entry_type] || typeConfig.decision
                    const s = log.ai_scores
                    const m1key = s?._metric1_key
                    const m2key = s?._metric2_key
                    const m1coach = s?._metric1_coach_key
                    const m2coach = s?._metric2_coach_key
                    return (
                      <div key={log.id} className={'border rounded-xl px-4 py-4 ' + cfg.bg + ' ' + cfg.border}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className={'text-xs font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full ' + cfg.badge}>{log.entry_type}</span>
                          {log.is_retrospective && <span className={'text-xs opacity-50 ' + cfg.text}>(from memory)</span>}
                          {log.linked_commit_sha && <span className={'text-xs font-mono opacity-50 ' + cfg.text}>#{log.linked_commit_sha.slice(0, 7)}</span>}
                          {log.code_snippet && <span className={'text-xs opacity-50 ' + cfg.text}>+ code</span>}
                        </div>

                        {log.code_snippet && (
                          <div className="mb-4 rounded-lg overflow-hidden border border-gray-700">
                            <div className="flex items-center justify-between px-3 py-1.5 bg-gray-900 border-b border-gray-700">
                              <span className="text-xs text-gray-400 font-mono">{log.code_language || 'code'}</span>
                            </div>
                            <SyntaxHighlighter
                              language={log.code_language || 'javascript'}
                              style={atomOneDark}
                              customStyle={{ margin: 0, padding: '12px', fontSize: '12px', background: '#0d0d0d', maxHeight: '300px', overflowY: 'auto' }}
                            >
                              {log.code_snippet}
                            </SyntaxHighlighter>
                            <div className="px-3 pb-3">
                              <CodeRunner code={log.code_snippet} language={log.code_language} />
                            </div>
                          </div>
                        )}

                        <p className={'text-sm leading-relaxed mb-4 ' + cfg.text}>{log.content}</p>

                        {s && m1key && m2key ? (
                          <div className="rounded-lg p-3 bg-black bg-opacity-20 border border-white border-opacity-5 space-y-4">
                            <div className="flex gap-6">
                              <ScoreBar label={s._metric1_label} value={s[m1key]} coachTip={m1coach ? s[m1coach] : null} barColor={cfg.bar} coachColor={cfg.coach} />
                              <ScoreBar label={s._metric2_label} value={s[m2key]} coachTip={m2coach ? s[m2coach] : null} barColor={cfg.bar} coachColor={cfg.coach} />
                            </div>
                            <p className={'text-xs italic opacity-50 pt-1 border-t border-white border-opacity-5 ' + cfg.text}>"{s.one_line_insight}"</p>
                          </div>
                        ) : log._scoring ? (
                          <div className="text-xs opacity-30 italic">Analyzing...</div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-red-400 opacity-70">Scoring failed.</span>
                            <button
                              onClick={() => scoreEntry(log.id, log.content, log.entry_type)}
                              className="text-gray-400 hover:text-white underline"
                            >
                              Retry
                            </button>
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-3">
                          <p className={'text-xs opacity-40 ' + cfg.text}>{new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                          <button
                            onClick={() => handleDelete(log.id)}
                            title="Delete entry"
                            className="text-gray-600 hover:text-red-400 transition-colors p-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  )
}
