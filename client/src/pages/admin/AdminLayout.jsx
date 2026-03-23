import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, UserPlus, Users, BarChart2, Tag, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { to: '/admin/overview',   icon: LayoutDashboard, label: 'Overview' },
  { to: '/admin/bookings',   icon: CalendarDays,    label: 'Bookings' },
  { to: '/admin/walkins',    icon: UserPlus,        label: 'Walk-ins' },
  { to: '/admin/users',      icon: Users,           label: 'Users' },
  { to: '/admin/analytics',  icon: BarChart2,       label: 'Analytics' },
  { to: '/admin/discounts',  icon: Tag,             label: 'Discounts' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-bgc-base">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-56 bg-bgc-surface border-r border-bgc-border flex flex-col transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        {/* Logo */}
        <div className="px-4 py-4 border-b border-bgc-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-pink flex items-center justify-center">
              <span className="font-heading font-bold text-white">B</span>
            </div>
            <div>
              <p className="font-heading font-bold text-bgc-text text-sm leading-none">BOMBAY</p>
              <p className="font-heading text-bgc-pink text-xs tracking-widest leading-none">GAMING CO.</p>
            </div>
          </div>
          <div className="mt-2 px-1 py-0.5 rounded bg-bgc-pink/10 inline-block">
            <span className="text-bgc-pink text-xs font-semibold tracking-wider">ADMIN</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? 'bg-bgc-pink/15 text-bgc-pink border border-bgc-pink/20' : 'text-bgc-muted hover:text-bgc-text hover:bg-bgc-elevated'
              }`}>
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-bgc-border">
          <div className="flex items-center gap-2 px-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-gradient-pink flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-bgc-text text-xs font-medium truncate">{user?.name}</p>
              <p className="text-bgc-muted text-xs truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-bgc-error text-sm hover:bg-bgc-error/10 transition-colors">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-bgc-base/95 backdrop-blur border-b border-bgc-border px-4 sm:px-6 h-14 flex items-center gap-3">
          <button className="lg:hidden p-1.5 text-bgc-muted" onClick={() => setSidebarOpen(v => !v)}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <h1 className="font-heading text-lg font-bold text-bgc-text">Admin Dashboard</h1>
          <div className="ml-auto text-bgc-muted text-xs">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
