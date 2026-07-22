'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function LoginPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleGitHubLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'public_repo read:user',
      },
    })
  }

  async function handleEmailLogin() {
    setError('')
    if (!email || !password) {
      setError('Enter both email and password.')
      return
    }
    setLoading(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    setLoading(false)
    if (signInError) {
      setError(signInError.message)
      return
    }
    // full-page nav so the server component picks up the new session cookie
    window.location.href = '/profile'
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        <a href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-white transition-colors mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          Back to home
        </a>
        <h1 className="text-2xl font-medium mb-2">Sign in to Paradyx</h1>
        <p className="text-gray-400 text-sm mb-8">
          Connect your GitHub account, or sign in with email.
        </p>

        <button
          onClick={handleGitHubLogin}
          className="w-full bg-white text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
        >
          Continue with GitHub
        </button>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-xs text-gray-500 uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        <div className="relative">
          <div className="space-y-3 text-left opacity-40 pointer-events-none select-none">
            <div className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-500">Email</div>
            <div className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-500">Password</div>
            <div className="w-full bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium text-center">Sign in with email</div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs uppercase tracking-widest text-gray-400 bg-gray-950 px-3 py-1 rounded-full border border-gray-700">Email accounts coming soon</span>
          </div>
        </div>
      </div>
    </main>
  )
}
