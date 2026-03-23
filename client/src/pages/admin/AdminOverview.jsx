import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, CalendarDays, AlertTriangle, Users, Clock, Monitor, Gamepad2, Circle } from 'lucide-react'
import api from '../../api/axios'
import dayjs from 'dayjs'

const STATION_ICONS = { pc: Monitor, playstation: Gamepad2, pool: Circle }

export default function AdminOverview() {
  const [data, setData] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const today = dayjs().format('YYYY-MM-DD')

  useEffect(() => {
    Promise.all([
      api.get('/admin/overview'),
      api.get(`/admin/bookings?date=${today}&limit=8`),
    ]).then(([oRes, bRes]) => {
      setData(oRes.data)
      setBookings(bRes.data.bookings)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex justify-center pt-20">
      <div className="w-8 h-8 rounded-full border-2 border-bgc-border border-t-bgc-pink animate-spin" />
    </div>
  )

  const stats = [
    { label: "Today's Revenue", value: `₹${data?.todayRevenue?.toFixed(2) || 0}`, icon: TrendingUp, color: 'text-bgc-success', bg: 'bg-bgc-success/10' },
    { label: 'Active Bookings', value: data?.activeBookings || 0, icon: CalendarDays, color: 'text-bgc-pink', bg: 'bg-bgc-pink/10' },
    { label: 'Pending Final Pay', value: data?.pendingFinal || 0, icon: AlertTriangle, color: 'text-bgc-warning', bg: 'bg-bgc-warning/10' },
    { label: 'Total Users', value: data?.totalUsers || 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: "Today's Walk-ins", value: data?.todayWalkins || 0, icon: Clock, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Pending Cash', value: data?.pendingCash || 0, icon: CalendarDays, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  ]

  const statusColor = { confirmed: 'badge-success', pending_final: 'badge-warning', pending_cash: 'badge-warning', cancelled: 'badge-error', completed: 'badge-muted' }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-heading text-2xl font-bold text-bgc-text">Overview</h2>
        <p className="text-bgc-muted text-sm mt-1">{dayjs().format('dddd, DD MMMM YYYY')}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="card">
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                <Icon size={18} className={s.color} />
              </div>
              <p className="font-heading text-2xl font-bold text-bgc-text">{s.value}</p>
              <p className="text-bgc-muted text-xs mt-1">{s.label}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Station utilization */}
        <div className="card">
          <h3 className="font-heading text-base font-bold text-bgc-text mb-4">Station Utilization Today</h3>
          <div className="space-y-3">
            {data?.stationUtilization?.map(s => {
              const Icon = STATION_ICONS[s.type] || Monitor
              const maxCapacity = { pc: 20, playstation: 3, pool: 1 }[s.type] || 1
              const pct = Math.min(100, Math.round((s.bookings_today / maxCapacity) * 100))
              return (
                <div key={s.type}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Icon size={13} className="text-bgc-muted" />
                      <span className="text-bgc-text text-sm capitalize">{s.type === 'pc' ? 'Gaming PC' : s.type === 'playstation' ? 'PlayStation' : 'Pool Table'}</span>
                    </div>
                    <span className="text-bgc-muted text-xs">{s.bookings_today}/{maxCapacity}</span>
                  </div>
                  <div className="h-1.5 bg-bgc-border rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-pink rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Today's bookings */}
        <div className="card md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-base font-bold text-bgc-text">Today's Bookings</h3>
            <Link to="/admin/bookings" className="text-bgc-pink text-xs hover:underline">View All →</Link>
          </div>
          {bookings.length === 0 ? (
            <p className="text-bgc-muted text-sm text-center py-6">No bookings today</p>
          ) : (
            <div className="space-y-2">
              {bookings.map(b => (
                <div key={b.id} className="flex items-center justify-between py-2.5 border-b border-bgc-border/40 last:border-0">
                  <div>
                    <p className="text-bgc-text text-sm font-medium">{b.user_name}</p>
                    <p className="text-bgc-muted text-xs">{b.station_name} · {dayjs(b.start_time).format('h:mm A')} – {dayjs(b.end_time).format('h:mm A')}</p>
                  </div>
                  <span className={statusColor[b.status] || 'badge-muted'}>{b.status.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/admin/walkins',   label: 'New Walk-in',     color: 'bg-bgc-pink/10 border-bgc-pink/20 text-bgc-pink' },
          { to: '/admin/bookings',  label: 'View Bookings',   color: 'bg-blue-400/10 border-blue-400/20 text-blue-400' },
          { to: '/admin/users',     label: 'Manage Users',    color: 'bg-green-400/10 border-green-400/20 text-green-400' },
          { to: '/admin/analytics', label: 'Analytics',       color: 'bg-purple-400/10 border-purple-400/20 text-purple-400' },
        ].map(a => (
          <Link key={a.to} to={a.to}
            className={`border rounded-xl p-4 text-center text-sm font-semibold transition-all hover:scale-[1.02] ${a.color}`}>
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
