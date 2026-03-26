'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { MapPin, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields')
      return
    }
    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('Invalid email or password. Please try again.')
      setLoading(false)
      return
    }

    // Get user role to redirect correctly
    const { data: userData } = await supabase
      .from('users')
      .select('role, is_banned')
      .eq('auth_id', data.user.id)
      .single()

    if (userData?.is_banned) {
      await supabase.auth.signOut()
      setError('Your account has been suspended. Contact support.')
      setLoading(false)
      return
    }

    if (userData?.role === 'admin') {
      router.push('/admin')
    } else if (userData?.role === 'landlord') {
      router.push('/dashboard')
    } else {
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
          <MapPin size={20} className="text-white" />
        </div>
        <span className="font-bold text-gray-900 text-xl">HOMZ <span className="text-blue-600">PROPS</span></span>
      </Link>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Welcome back</h1>
        <p className="text-sm text-gray-500 mb-6">Sign in to your account</p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Email address</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-3 py-2.5">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Don't have an account?{' '}
            <Link href="/auth/register" className="text-blue-600 font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>

      <p className="mt-6 text-xs text-gray-400 text-center">
        Are you an admin?{' '}
        <Link href="/admin/login" className="text-gray-600 hover:underline">
          Admin login →
        </Link>
      </p>
    </div>
  )
}
