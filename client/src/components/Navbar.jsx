import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, LayoutDashboard, Shield, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const navLinks = [
    { to: '/',         label: 'Home' },
    { to: '/stations', label: 'Stations' },
    { to: '/pricing',  label: 'Pricing' },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-bgc-base/95 backdrop-blur-md border-b border-bgc-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            {/* Neon live dot */}
            <span className="w-2 h-2 rounded-full bg-bgc-pink animate-dot-blink shrink-0"
                  style={{ boxShadow: '0 0 6px #ff1a6b, 0 0 12px rgba(255,26,107,0.5)' }} />
            {/* Logo image — drop logo.png into /public to use; falls back gracefully */}
            <img
              src="/logo.png"
              alt="BGC"
              height="36"
              style={{ height: 36, width: 'auto', display: 'block' }}
              onError={e => { e.currentTarget.style.display = 'none' }}
            />
            {/* Cafe name — Bebas Neue per brand spec */}
            <span
              className="text-bgc-text leading-none tracking-[0.05em] select-none"
              style={{ fontFamily: "'Bebas Neue', 'Rajdhani', sans-serif", fontSize: 22 }}
            >
              BOMBAY GAMING COMPANY
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(l => (
              <Link
                key={l.to}
                to={l.to}
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(l.to)
                    ? 'nav-active bg-bgc-pink/8'
                    : 'text-bgc-muted hover:text-bgc-text hover:bg-bgc-elevated'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(v => !v)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bgc-elevated border border-bgc-border hover:border-bgc-pink/40 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-pink flex items-center justify-center text-white text-xs font-bold">
                    {user.name[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-bgc-text">{user.name.split(' ')[0]}</span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-12 w-52 bg-bgc-surface border border-bgc-border rounded-xl shadow-card overflow-hidden animate-slide-up">
                    <div className="px-4 py-3 border-b border-bgc-border">
                      <p className="text-sm font-semibold text-bgc-text">{user.name}</p>
                      <p className="text-xs text-bgc-muted mt-0.5">{user.email || user.phone}</p>
                    </div>
                    <div className="py-1">
                      <Link to="/dashboard" onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-bgc-muted hover:text-bgc-text hover:bg-bgc-elevated transition-colors">
                        <LayoutDashboard size={15} /> Dashboard
                      </Link>
                      {user.role === 'admin' && (
                        <Link to="/admin" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-bgc-pink hover:bg-bgc-pink/10 transition-colors">
                          <Shield size={15} /> Admin Panel
                        </Link>
                      )}
                      <button onClick={logout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-bgc-error hover:bg-bgc-error/10 transition-colors">
                        <LogOut size={15} /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="btn-ghost text-sm">Sign In</Link>
                <Link to="/book"  className="btn-primary text-sm py-2 px-5">Book Now</Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2 text-bgc-muted" onClick={() => setMobileOpen(v => !v)}>
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-bgc-surface border-t border-bgc-border px-4 py-4 space-y-1 animate-slide-up">
          {navLinks.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)}
              className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(l.to) ? 'text-bgc-pink bg-bgc-pink/10' : 'text-bgc-muted hover:text-bgc-text hover:bg-bgc-elevated'
              }`}>
              {l.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-bgc-border space-y-2">
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="block w-full btn-outline text-center text-sm">
                  Dashboard
                </Link>
                <button onClick={logout} className="block w-full btn-ghost text-sm text-bgc-error text-center">
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)} className="block w-full btn-outline text-center text-sm">Sign In</Link>
                <Link to="/book"  onClick={() => setMobileOpen(false)} className="block w-full btn-primary text-center text-sm">Book Now</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
