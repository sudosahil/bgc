import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import dayjs from 'dayjs'
import api from '../../api/axios'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bgc-surface border border-bgc-border rounded-xl px-3 py-2 text-sm shadow-card">
        <p className="text-bgc-muted text-xs mb-1">{label}</p>
        {payload.map(p => (
          <p key={p.name} className="font-semibold" style={{ color: p.color }}>
            {p.name}: ₹{p.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function AdminAnalytics() {
  const [data, setData] = useState(null)
  const [period, setPeriod] = useState('7')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get(`/admin/analytics?period=${period}`)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period])

  const totalRevenue = data?.dailyRevenue?.reduce((sum, d) => sum + d.revenue, 0) || 0

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-2xl font-bold text-bgc-text">Analytics</h2>
        <div className="flex gap-2 flex-wrap">
          {[['7', '7 Days'], ['30', '30 Days'], ['90', '90 Days']].map(([v, l]) => (
            <button key={v} onClick={() => setPeriod(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                period === v ? 'bg-gradient-pink text-white shadow-pink-sm' : 'bg-bgc-surface border border-bgc-border text-bgc-muted hover:text-bgc-text'
              }`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center pt-16"><div className="w-8 h-8 rounded-full border-2 border-bgc-border border-t-bgc-pink animate-spin" /></div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card">
              <p className="text-bgc-muted text-xs mb-1">Total Revenue</p>
              <p className="font-heading text-2xl font-bold text-bgc-text">₹{totalRevenue.toFixed(0)}</p>
              <p className="text-bgc-muted text-xs mt-0.5">Last {period} days</p>
            </div>
            {data?.revenueByType?.map(r => (
              <div key={r.type} className="card">
                <p className="text-bgc-muted text-xs mb-1 capitalize">{r.type === 'pc' ? 'Gaming PC' : r.type === 'playstation' ? 'PlayStation' : 'Pool'}</p>
                <p className="font-heading text-2xl font-bold text-bgc-text">₹{r.revenue || 0}</p>
                <p className="text-bgc-muted text-xs mt-0.5">{r.bookings} booking{r.bookings !== 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>

          {/* Revenue chart */}
          <div className="card">
            <h3 className="font-heading text-lg font-bold text-bgc-text mb-5">Daily Revenue</h3>
            {data?.dailyRevenue?.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.dailyRevenue} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: '#7B7B9A', fontSize: 11 }}
                    tickFormatter={d => dayjs(d).format('DD MMM')} />
                  <YAxis tick={{ fill: '#7B7B9A', fontSize: 11 }}
                    tickFormatter={v => `₹${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" name="Revenue" fill="url(#pinkGrad)" radius={[4,4,0,0]} />
                  <defs>
                    <linearGradient id="pinkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E8185A" />
                      <stop offset="100%" stopColor="#9B1060" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-bgc-muted text-sm">No revenue data for this period</div>
            )}
          </div>

          {/* Revenue by type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="card">
              <h3 className="font-heading text-base font-bold text-bgc-text mb-4">Revenue by Station Type</h3>
              {data?.revenueByType?.length > 0 ? (
                <div className="space-y-4">
                  {data.revenueByType.map(r => {
                    const max = Math.max(...(data.revenueByType.map(x => x.revenue || 0)), 1)
                    const pct = Math.round(((r.revenue || 0) / max) * 100)
                    const colors = { pc: 'bg-blue-400', playstation: 'bg-bgc-pink', pool: 'bg-green-400' }
                    return (
                      <div key={r.type}>
                        <div className="flex justify-between mb-1 text-sm">
                          <span className="text-bgc-text capitalize font-medium">
                            {r.type === 'pc' ? 'Gaming PC' : r.type === 'playstation' ? 'PlayStation' : 'Pool Table'}
                          </span>
                          <span className="text-bgc-muted">₹{r.revenue || 0} · {r.bookings} bkgs</span>
                        </div>
                        <div className="h-2 bg-bgc-border rounded-full overflow-hidden">
                          <div className={`h-full ${colors[r.type]} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-bgc-muted text-sm">No data</p>
              )}
            </div>

            {/* Popular stations */}
            <div className="card">
              <h3 className="font-heading text-base font-bold text-bgc-text mb-4">Popular Stations</h3>
              <div className="space-y-2">
                {data?.popularStations?.filter(s => s.bookings > 0).slice(0, 8).map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between py-1.5 border-b border-bgc-border/30 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-bgc-muted text-xs w-5">{i + 1}.</span>
                      <p className="text-bgc-text text-sm">{s.name}</p>
                      <span className="badge-muted capitalize">{s.type}</span>
                    </div>
                    <span className="text-bgc-muted text-xs">{s.bookings} bookings</span>
                  </div>
                ))}
                {!data?.popularStations?.some(s => s.bookings > 0) && (
                  <p className="text-bgc-muted text-sm text-center py-4">No bookings in this period</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
