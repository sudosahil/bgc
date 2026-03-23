import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register, user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' })
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) { navigate('/dashboard', { replace: true }); return null }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), password: form.password })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="min-h-screen bg-bgc-base grid-bg flex items-center justify-center p-4 py-20">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-bgc-pink/5 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
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
          <h1 className="font-heading text-3xl font-bold text-bgc-text">Create Account</h1>
          <p className="text-bgc-muted text-sm mt-2">Join BGC and start booking today</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" type="text" placeholder="Your name" value={form.name} onChange={set('name')} required />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
            </div>
            <div>
              <label className="label">Mobile Number</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-bgc-muted text-sm font-medium">+91</span>
                <input
                  className="input pl-12"
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={form.phone}
                  onChange={set('phone')}
                  maxLength={10}
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={show ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={set('password')}
                  required
                />
                <button type="button" onClick={() => setShow(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-bgc-muted hover:text-bgc-text transition-colors">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input
                className="input"
                type={show ? 'text' : 'password'}
                placeholder="Re-enter password"
                value={form.confirm}
                onChange={set('confirm')}
                required
              />
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
                <><UserPlus size={17} /> Create Account</>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-bgc-border text-center">
            <p className="text-bgc-muted text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-bgc-pink font-semibold hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
        <p className="text-center mt-4">
          <Link to="/" className="text-bgc-muted text-sm hover:text-bgc-pink transition-colors">← Back to Home</Link>
        </p>
      </div>
    </div>
  )
}
