import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/dashboard'

  const [form, setForm] = useState({ identifier: '', password: '' })
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) { navigate(from, { replace: true }); return null }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const u = await login(form.identifier.trim(), form.password)
      navigate(u.role === 'admin' ? '/admin' : from, { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bgc-base grid-bg flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-bgc-pink/5 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-pink flex items-center justify-center shadow-pink-md">
              <span className="font-heading font-bold text-white text-xl">B</span>
            </div>
            <div className="text-left">
              <span className="font-heading font-bold text-bgc-text text-xl leading-none block">BOMBAY</span>
              <span className="font-heading text-bgc-pink text-xs tracking-widest">GAMING CO.</span>
            </div>
          </Link>
          <h1 className="font-heading text-3xl font-bold text-bgc-text">Welcome Back</h1>
          <p className="text-bgc-muted text-sm mt-2">Sign in with your email or mobile number</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email or Mobile Number</label>
              <input
                className="input"
                type="text"
                placeholder="Enter email or 10-digit mobile"
                value={form.identifier}
                onChange={e => setForm(f => ({ ...f, identifier: e.target.value }))}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={show ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
                <button type="button" onClick={() => setShow(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-bgc-muted hover:text-bgc-text transition-colors">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-bgc-error/10 border border-bgc-error/30 rounded-lg px-4 py-2.5 text-bgc-error text-sm">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-2">
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <><LogIn size={17} /> Sign In</>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-bgc-border text-center">
            <p className="text-bgc-muted text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-bgc-pink font-semibold hover:underline">Create one</Link>
            </p>
          </div>
        </div>

        {/* Demo credentials */}
        <div className="mt-4 bg-bgc-surface/50 border border-bgc-border rounded-xl p-4">
          <p className="text-bgc-muted text-xs font-semibold mb-2 uppercase tracking-wide">Demo Accounts</p>
          <div className="space-y-1.5 text-xs text-bgc-muted">
            <p>👤 Player: <span className="text-bgc-text">player@bgc.com</span> / <span className="text-bgc-text">player123</span></p>
            <p>🛡️ Admin: <span className="text-bgc-text">admin@bgc.com</span> / <span className="text-bgc-text">admin123</span></p>
          </div>
        </div>

        <p className="text-center mt-4">
          <Link to="/" className="text-bgc-muted text-sm hover:text-bgc-pink transition-colors">← Back to Home</Link>
        </p>
      </div>
    </div>
  )
}
