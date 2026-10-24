import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await signIn(email, password)
    if (res.error) {
      setError(res.error.message || 'Failed to sign in. Please check your credentials.')
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  // Quick fill helper for demo/testing convenience
  const fillCredentials = (roleEmail: string) => {
    setEmail(roleEmail)
    setPassword('raptee123')
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-raptee-500 flex items-center justify-center shadow-lg shadow-raptee-500/20">
          <Zap className="h-7 w-7 text-white" />
        </div>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white">
          Raptee.HV
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Complaint Management & Field Intelligence Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="e.g. radhika@raptee.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-raptee-500 hover:bg-raptee-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-raptee-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          </form>

          {/* Quick login demo helper */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center font-medium mb-3">
              Quick Role Test Logins
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials('radhika@raptee.com')}
                className="px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md text-center"
              >
                CCE (Radhika)
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('sanmitha@raptee.com')}
                className="px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md text-center"
              >
                FI (Sanmitha)
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('admin@raptee.com')}
                className="px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md text-center"
              >
                Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
