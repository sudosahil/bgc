import { useEffect, useState, useCallback } from 'react'
import { Search, Filter, Check, X, AlertTriangle } from 'lucide-react'
import dayjs from 'dayjs'
import api from '../../api/axios'

const STATUS_OPTS = ['', 'confirmed', 'pending_final', 'pending_cash', 'cancelled', 'completed']
const TYPE_OPTS = ['', 'pc', 'playstation', 'pool']

const statusConfig = {
  confirmed:     { label: 'Confirmed',    class: 'badge-success' },
  pending_final: { label: 'Pending Final', class: 'badge-warning' },
  pending_cash:  { label: 'Pending Cash', class: 'badge-warning' },
  cancelled:     { label: 'Cancelled',    class: 'badge-error' },
  completed:     { label: 'Completed',    class: 'badge-muted' },
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ status: '', type: '', date: '' })
  const [msg, setMsg] = useState('')
  const [updating, setUpdating] = useState(null)

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    const params = {}
    if (filter.status) params.status = filter.status
    if (filter.type)   params.type = filter.type
    if (filter.date)   params.date = filter.date
    try {
      const res = await api.get('/admin/bookings', { params })
      setBookings(res.data.bookings)
    } catch {}
    finally { setLoading(false) }
  }, [filter])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  const updateStatus = async (id, status) => {
    setUpdating(id)
    try {
      await api.put(`/admin/bookings/${id}`, { status })
      setMsg(`Booking #${id} updated to ${status}`)
      fetchBookings()
      setTimeout(() => setMsg(''), 3000)
    } catch (e) {
      setMsg(`Error: ${e.response?.data?.error || 'Update failed'}`)
    } finally { setUpdating(null) }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <h2 className="font-heading text-2xl font-bold text-bgc-text">All Bookings</h2>

      {msg && (
        <div className="bg-bgc-success/10 border border-bgc-success/30 rounded-xl px-4 py-2.5 text-bgc-success text-sm">{msg}</div>
      )}

      {/* Filters */}
      <div className="card flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">Status</label>
          <select className="input w-36" value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
            {STATUS_OPTS.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Station Type</label>
          <select className="input w-36" value={filter.type} onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}>
            {TYPE_OPTS.map(t => <option key={t} value={t}>{t || 'All Types'}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Date</label>
          <input type="date" className="input w-40" value={filter.date} onChange={e => setFilter(f => ({ ...f, date: e.target.value }))} />
        </div>
        <button onClick={() => setFilter({ status: '', type: '', date: '' })} className="btn-ghost text-sm">Clear</button>
      </div>

      {loading ? (
        <div className="flex justify-center pt-12"><div className="w-8 h-8 rounded-full border-2 border-bgc-border border-t-bgc-pink animate-spin" /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bgc-border">
                {['#', 'User', 'Station', 'Date & Time', 'Amount', 'Method', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left text-bgc-muted text-xs font-semibold uppercase tracking-wider py-3 px-2 first:pl-0 last:pr-0">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-bgc-muted">No bookings found</td></tr>
              ) : bookings.map(b => {
                const sc = statusConfig[b.status] || { label: b.status, class: 'badge-muted' }
                return (
                  <tr key={b.id} className="border-b border-bgc-border/30 hover:bg-bgc-elevated/40 transition-colors">
                    <td className="py-3 px-2 text-bgc-muted">#{b.id}</td>
                    <td className="py-3 px-2">
                      <p className="text-bgc-text font-medium">{b.user_name}</p>
                      <p className="text-bgc-muted text-xs">{b.user_phone}</p>
                    </td>
                    <td className="py-3 px-2">
                      <p className="text-bgc-text">{b.station_name}</p>
                      <p className="text-bgc-muted text-xs capitalize">{b.station_type}</p>
                    </td>
                    <td className="py-3 px-2">
                      <p className="text-bgc-text">{dayjs(b.start_time).format('DD MMM YY')}</p>
                      <p className="text-bgc-muted text-xs">{dayjs(b.start_time).format('h:mm A')}–{dayjs(b.end_time).format('h:mm A')}</p>
                    </td>
                    <td className="py-3 px-2">
                      <p className="text-bgc-text">₹{b.total_amount}</p>
                      <p className="text-bgc-muted text-xs">Dep: ₹{b.deposit_amount}</p>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`badge ${b.payment_method === 'wallet' ? 'badge-pink' : 'badge-success'}`}>
                        {b.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className={sc.class}>{sc.label}</span>
                    </td>
                    <td className="py-3 px-2 last:pr-0">
                      <div className="flex items-center gap-1">
                        {b.status === 'pending_cash' && (
                          <button onClick={() => updateStatus(b.id, 'confirmed')} disabled={updating === b.id}
                            className="w-7 h-7 rounded-lg bg-bgc-success/10 text-bgc-success hover:bg-bgc-success/20 flex items-center justify-center transition-colors" title="Confirm">
                            <Check size={13} />
                          </button>
                        )}
                        {['confirmed', 'pending_final', 'pending_cash'].includes(b.status) && (
                          <button onClick={() => updateStatus(b.id, 'cancelled')} disabled={updating === b.id}
                            className="w-7 h-7 rounded-lg bg-bgc-error/10 text-bgc-error hover:bg-bgc-error/20 flex items-center justify-center transition-colors" title="Cancel">
                            <X size={13} />
                          </button>
                        )}
                        {b.status === 'confirmed' && dayjs(b.end_time).isBefore(dayjs()) && (
                          <button onClick={() => updateStatus(b.id, 'completed')} disabled={updating === b.id}
                            className="w-7 h-7 rounded-lg bg-bgc-muted/10 text-bgc-muted hover:bg-bgc-muted/20 flex items-center justify-center transition-colors" title="Mark Complete">
                            <Check size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
