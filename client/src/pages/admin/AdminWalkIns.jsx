import { useEffect, useState } from 'react'
import { Plus, UserPlus } from 'lucide-react'
import dayjs from 'dayjs'
import api from '../../api/axios'

export default function AdminWalkIns() {
  const [walkins, setWalkins] = useState([])
  const [stations, setStations] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [dateFilter, setDateFilter] = useState('')
  const [form, setForm] = useState({
    station_id: '',
    customer_name: '',
    customer_phone: '',
    start_time: dayjs().format('YYYY-MM-DDTHH:mm'),
    duration_hours: 1,
    amount_paid: '',
    notes: '',
  })

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text: '', type: '' }), 3500)
  }

  const fetchWalkins = async () => {
    setLoading(true)
    try {
      const params = dateFilter ? { date: dateFilter } : {}
      const res = await api.get('/admin/walkins', { params })
      setWalkins(res.data.walkins)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => {
    api.get('/stations').then(r => setStations(r.data.stations)).catch(() => {})
    fetchWalkins()
  }, [dateFilter])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await api.post('/admin/walkins', {
        ...form,
        duration_hours: parseFloat(form.duration_hours),
        amount_paid: parseFloat(form.amount_paid),
      })
      showMsg(`Walk-in created for ${res.data.walkin.customer_name}`)
      setShowForm(false)
      setForm({ station_id: '', customer_name: '', customer_phone: '', start_time: dayjs().format('YYYY-MM-DDTHH:mm'), duration_hours: 1, amount_paid: '', notes: '' })
      fetchWalkins()
    } catch (e) {
      showMsg(e.response?.data?.error || 'Failed to create walk-in', 'error')
    } finally { setSubmitting(false) }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  // Auto-calculate amount when station and duration change
  const selectedStation = stations.find(s => s.id === parseInt(form.station_id))
  const suggestedAmount = selectedStation ? selectedStation.hourly_rate * parseFloat(form.duration_hours || 0) : 0

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-bold text-bgc-text">Walk-in Entries</h2>
        <button onClick={() => setShowForm(v => !v)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} /> New Walk-in
        </button>
      </div>

      {msg.text && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${msg.type === 'error' ? 'bg-bgc-error/10 border border-bgc-error/30 text-bgc-error' : 'bg-bgc-success/10 border border-bgc-success/30 text-bgc-success'}`}>
          {msg.text}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="card animate-slide-up">
          <h3 className="font-heading text-lg font-bold text-bgc-text mb-4 flex items-center gap-2">
            <UserPlus size={18} className="text-bgc-pink" /> New Walk-in
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Station *</label>
              <select className="input" value={form.station_id} onChange={set('station_id')} required>
                <option value="">Select station</option>
                {['pc','playstation','pool'].map(type => (
                  <optgroup key={type} label={type === 'pc' ? 'Gaming PCs' : type === 'playstation' ? 'PlayStations' : 'Pool Table'}>
                    {stations.filter(s => s.type === type).map(s => (
                      <option key={s.id} value={s.id}>{s.name} — ₹{s.hourly_rate}/hr</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Customer Name *</label>
              <input className="input" type="text" placeholder="Walk-in customer name" value={form.customer_name} onChange={set('customer_name')} required />
            </div>
            <div>
              <label className="label">Customer Phone</label>
              <input className="input" type="tel" placeholder="Mobile number (optional)" value={form.customer_phone} onChange={set('customer_phone')} maxLength={10} />
            </div>
            <div>
              <label className="label">Start Time *</label>
              <input className="input" type="datetime-local" value={form.start_time} onChange={set('start_time')} required />
            </div>
            <div>
              <label className="label">Duration (hours) *</label>
              <select className="input" value={form.duration_hours} onChange={set('duration_hours')} required>
                {[0.5,1,1.5,2,2.5,3,4,5,6].map(d => <option key={d} value={d}>{d}hr{d > 1 ? 's' : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Amount Paid (₹) *</label>
              <div className="relative">
                <input className="input pr-24" type="number" placeholder="Amount collected" value={form.amount_paid} onChange={set('amount_paid')} required min={0} />
                {suggestedAmount > 0 && (
                  <button type="button" onClick={() => setForm(f => ({ ...f, amount_paid: suggestedAmount.toString() }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-bgc-pink hover:underline">
                    Use ₹{suggestedAmount}
                  </button>
                )}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <input className="input" type="text" placeholder="Optional notes" value={form.notes} onChange={set('notes')} />
            </div>
            <div className="sm:col-span-2 flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2">
                {submitting ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Plus size={15} />}
                Create Walk-in
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <div>
          <label className="label">Filter by Date</label>
          <input type="date" className="input w-40" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
        </div>
        {dateFilter && <button onClick={() => setDateFilter('')} className="btn-ghost text-sm mt-5">Clear</button>}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center pt-12"><div className="w-8 h-8 rounded-full border-2 border-bgc-border border-t-bgc-pink animate-spin" /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bgc-border">
                {['#', 'Customer', 'Station', 'Start Time', 'Duration', 'Total', 'Paid', 'By', 'Created'].map(h => (
                  <th key={h} className="text-left text-bgc-muted text-xs font-semibold uppercase tracking-wider py-3 px-2 first:pl-0">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {walkins.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-bgc-muted">No walk-ins found</td></tr>
              ) : walkins.map(w => (
                <tr key={w.id} className="border-b border-bgc-border/30 hover:bg-bgc-elevated/40 transition-colors">
                  <td className="py-3 px-2 text-bgc-muted">#{w.id}</td>
                  <td className="py-3 px-2">
                    <p className="text-bgc-text font-medium">{w.customer_name}</p>
                    {w.customer_phone && <p className="text-bgc-muted text-xs">{w.customer_phone}</p>}
                  </td>
                  <td className="py-3 px-2">
                    <p className="text-bgc-text">{w.station_name}</p>
                    <p className="text-bgc-muted text-xs capitalize">{w.station_type}</p>
                  </td>
                  <td className="py-3 px-2 text-bgc-text">{dayjs(w.start_time).format('DD MMM, h:mm A')}</td>
                  <td className="py-3 px-2 text-bgc-text">{w.duration_hours}hr{w.duration_hours > 1 ? 's' : ''}</td>
                  <td className="py-3 px-2 text-bgc-text">₹{w.total_amount}</td>
                  <td className="py-3 px-2">
                    <span className={`font-semibold ${w.amount_paid >= w.total_amount ? 'text-bgc-success' : 'text-bgc-warning'}`}>₹{w.amount_paid}</span>
                  </td>
                  <td className="py-3 px-2 text-bgc-muted text-xs">{w.created_by_name}</td>
                  <td className="py-3 px-2 text-bgc-muted text-xs">{dayjs(w.created_at).format('DD MMM, h:mm A')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
