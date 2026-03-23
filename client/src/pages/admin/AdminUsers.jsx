import { useEffect, useState } from 'react'
import { Search, UserX, UserCheck, ChevronRight } from 'lucide-react'
import dayjs from 'dayjs'
import api from '../../api/axios'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    api.get('/admin/users').then(r => setUsers(r.data.users)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const loadDetail = async (id) => {
    setSelected(id)
    setDetailLoading(true)
    try {
      const res = await api.get(`/admin/users/${id}`)
      setDetail(res.data)
    } catch {}
    finally { setDetailLoading(false) }
  }

  const toggleUser = async (id) => {
    try {
      const res = await api.put(`/admin/users/${id}/toggle`)
      setMsg(res.data.message)
      const uRes = await api.get('/admin/users')
      setUsers(uRes.data.users)
      if (selected === id) loadDetail(id)
      setTimeout(() => setMsg(''), 3000)
    } catch (e) {
      setMsg(`Error: ${e.response?.data?.error}`)
    }
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.phone.includes(search)
  )

  const txColors = { deposit: 'text-bgc-error', final_payment: 'text-bgc-error', refund: 'text-bgc-success', topup: 'text-bgc-success', points_redeem: 'text-bgc-success' }

  return (
    <div className="space-y-5 animate-fade-in">
      <h2 className="font-heading text-2xl font-bold text-bgc-text">Users</h2>

      {msg && <div className="bg-bgc-success/10 border border-bgc-success/30 rounded-xl px-4 py-2.5 text-bgc-success text-sm">{msg}</div>}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
        {/* List */}
        <div className="md:col-span-2 space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-bgc-muted" />
            <input className="input pl-9" placeholder="Search name, email, phone..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {loading ? (
            <div className="flex justify-center pt-8"><div className="w-7 h-7 rounded-full border-2 border-bgc-border border-t-bgc-pink animate-spin" /></div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin">
              {filtered.map(u => (
                <button key={u.id} onClick={() => loadDetail(u.id)}
                  className={`w-full text-left card-hover p-3 transition-all ${selected === u.id ? 'border-bgc-pink/40 bg-bgc-pink/5' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-pink flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {u.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-bgc-text text-sm font-medium truncate">{u.name}</p>
                        {!u.is_active && <span className="badge-error text-xs">Inactive</span>}
                      </div>
                      <p className="text-bgc-muted text-xs truncate">{u.email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-bgc-text text-xs font-medium">₹{u.wallet_balance?.toFixed(0)}</p>
                      <p className="text-bgc-muted text-xs">{u.total_bookings} bkgs</p>
                    </div>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && <p className="text-bgc-muted text-sm text-center py-6">No users found</p>}
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="md:col-span-3">
          {!selected ? (
            <div className="card h-full flex items-center justify-center text-center">
              <div>
                <Search size={28} className="text-bgc-border mx-auto mb-3" />
                <p className="text-bgc-muted text-sm">Select a user to view details</p>
              </div>
            </div>
          ) : detailLoading ? (
            <div className="card h-full flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-bgc-border border-t-bgc-pink animate-spin" />
            </div>
          ) : detail ? (
            <div className="space-y-4">
              {/* User info */}
              <div className="card">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-pink flex items-center justify-center text-white text-lg font-bold">
                      {detail.user.name[0]}
                    </div>
                    <div>
                      <p className="font-heading text-xl font-bold text-bgc-text">{detail.user.name}</p>
                      <p className="text-bgc-muted text-sm">{detail.user.email}</p>
                      <p className="text-bgc-muted text-sm">{detail.user.phone}</p>
                    </div>
                  </div>
                  <button onClick={() => toggleUser(detail.user.id)}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                      detail.user.is_active ? 'bg-bgc-error/10 text-bgc-error hover:bg-bgc-error/20' : 'bg-bgc-success/10 text-bgc-success hover:bg-bgc-success/20'
                    }`}>
                    {detail.user.is_active ? <><UserX size={13} /> Deactivate</> : <><UserCheck size={13} /> Activate</>}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="bg-bgc-elevated rounded-xl p-3 text-center">
                    <p className="font-heading text-xl font-bold text-bgc-text">₹{detail.user.wallet_balance?.toFixed(0)}</p>
                    <p className="text-bgc-muted text-xs mt-0.5">Wallet</p>
                  </div>
                  <div className="bg-bgc-elevated rounded-xl p-3 text-center">
                    <p className="font-heading text-xl font-bold gradient-text">{detail.user.points}</p>
                    <p className="text-bgc-muted text-xs mt-0.5">Points</p>
                  </div>
                  <div className="bg-bgc-elevated rounded-xl p-3 text-center">
                    <p className="font-heading text-xl font-bold text-bgc-text">{detail.bookings.length}</p>
                    <p className="text-bgc-muted text-xs mt-0.5">Bookings</p>
                  </div>
                </div>
                <p className="text-bgc-muted text-xs mt-3">Joined {dayjs(detail.user.created_at).format('DD MMM YYYY')}</p>
              </div>

              {/* Recent bookings */}
              <div className="card">
                <h4 className="font-semibold text-bgc-text text-sm mb-3">Recent Bookings</h4>
                {detail.bookings.length === 0 ? <p className="text-bgc-muted text-xs">No bookings</p> : (
                  <div className="space-y-2">
                    {detail.bookings.slice(0, 5).map(b => (
                      <div key={b.id} className="flex justify-between items-center py-2 border-b border-bgc-border/30 last:border-0">
                        <div>
                          <p className="text-bgc-text text-xs font-medium">{b.station_name}</p>
                          <p className="text-bgc-muted text-xs">{dayjs(b.start_time).format('DD MMM YY, h:mm A')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-bgc-text text-xs">₹{b.total_amount}</p>
                          <span className={`text-xs capitalize ${b.status === 'confirmed' ? 'text-bgc-success' : b.status === 'cancelled' ? 'text-bgc-error' : 'text-bgc-warning'}`}>{b.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
