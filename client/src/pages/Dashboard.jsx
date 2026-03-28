import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, Zap, Clock, CheckCircle, XCircle, AlertTriangle, Plus, ArrowDownLeft, ArrowUpRight, RefreshCw, ChevronRight } from 'lucide-react'
import dayjs from 'dayjs'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

const statusConfig = {
  confirmed:     { label: 'Confirmed',     class: 'badge-success',  icon: CheckCircle },
  pending_final: { label: 'Pay Final',      class: 'badge-warning',  icon: AlertTriangle },
  pending_cash:  { label: 'Pending Cash',   class: 'badge-warning',  icon: Clock },
  cancelled:     { label: 'Cancelled',      class: 'badge-error',    icon: XCircle },
  completed:     { label: 'Completed',      class: 'badge-muted',    icon: CheckCircle },
}

const txTypeConfig = {
  deposit:        { label: 'Deposit',       color: 'text-bgc-error',    prefix: '-' },
  final_payment:  { label: 'Final Payment', color: 'text-bgc-error',    prefix: '-' },
  refund:         { label: 'Refund',        color: 'text-bgc-success',  prefix: '+' },
  points_redeem:  { label: 'Points Redeemed', color: 'text-bgc-success', prefix: '+' },
  topup:          { label: 'Top-up',        color: 'text-bgc-success',  prefix: '+' },
  walkin_credit:  { label: 'Walk-in Credit', color: 'text-bgc-success', prefix: '+' },
}

export default function Dashboard() {
  const { user, refreshUser } = useAuth()
  const [wallet, setWallet] = useState({ wallet_balance: 0, points: 0 })
  const [bookings, setBookings] = useState([])
  const [transactions, setTransactions] = useState([])
  const [tab, setTab] = useState('upcoming')
  const [topupAmount, setTopupAmount] = useState('')
  const [redeemPts, setRedeemPts] = useState(100)
  const [topupModal, setTopupModal] = useState(false)
  const [redeemModal, setRedeemModal] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [loading, setLoading] = useState(true)
  const [payingId, setPayingId] = useState(null)
  const [cancellingId, setCancellingId] = useState(null)

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text: '', type: '' }), 3500)
  }

  const fetchData = useCallback(async () => {
    try {
      const [wRes, bRes, tRes] = await Promise.all([
        api.get('/wallet'),
        api.get('/bookings/my'),
        api.get('/wallet/transactions'),
      ])
      setWallet(wRes.data)
      setBookings(bRes.data.bookings)
      setTransactions(tRes.data.transactions)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleTopup = async () => {
    const amt = parseFloat(topupAmount)
    if (!amt || amt < 50) { showMsg('Enter at least ₹50', 'error'); return }
    try {
      const res = await api.post('/wallet/topup/create', { amount: amt })
      const { order, key_id } = res.data

      const options = {
        key: key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'Bombay Gaming Co.',
        description: 'Wallet Top-up',
        order_id: order.id,
        handler: async (response) => {
          try {
            const verifyRes = await api.post('/wallet/topup/verify', response)
            showMsg(verifyRes.data.message || `₹${amt} added to your wallet!`)
            setTopupModal(false)
            setTopupAmount('')
            fetchData()
            refreshUser()
          } catch (e) {
            showMsg(e.response?.data?.error || 'Payment verification failed', 'error')
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: { color: '#ff1a6b' },
        modal: { ondismiss: () => showMsg('Payment cancelled', 'error') },
      }
      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (e) {
      showMsg(e.response?.data?.error || 'Could not initiate payment', 'error')
    }
  }

  const handleRedeem = async () => {
    try {
      const res = await api.post('/wallet/redeem-points', { points: redeemPts })
      showMsg(res.data.message)
      setRedeemModal(false)
      fetchData()
    } catch (e) {
      showMsg(e.response?.data?.error || 'Redemption failed', 'error')
    }
  }

  const payFinal = async (id) => {
    setPayingId(id)
    try {
      await api.post(`/bookings/${id}/pay-final`)
      showMsg('Final payment successful!')
      fetchData()
      refreshUser()
    } catch (e) {
      showMsg(e.response?.data?.error || 'Payment failed', 'error')
    } finally { setPayingId(null) }
  }

  const cancelBooking = async (id) => {
    if (!window.confirm('Cancel this booking? Deposit will be refunded to your wallet.')) return
    setCancellingId(id)
    try {
      await api.delete(`/bookings/${id}`)
      showMsg('Booking cancelled. Deposit refunded.')
      fetchData()
      refreshUser()
    } catch (e) {
      showMsg(e.response?.data?.error || 'Cancellation failed', 'error')
    } finally { setCancellingId(null) }
  }

  const now = dayjs()
  const upcoming = bookings.filter(b => ['confirmed', 'pending_final', 'pending_cash'].includes(b.status) && dayjs(b.start_time).isAfter(now))
  const pendingFinal = upcoming.filter(b => b.status === 'pending_final')
  const past = bookings.filter(b => ['completed', 'cancelled'].includes(b.status) || dayjs(b.start_time).isBefore(now))
  const displayBookings = tab === 'upcoming' ? upcoming : tab === 'past' ? past : bookings

  if (loading) {
    return (
      <div className="min-h-screen bg-bgc-base">
        <Navbar />
        <div className="flex justify-center items-center h-96">
          <div className="w-10 h-10 rounded-full border-2 border-bgc-border border-t-bgc-pink animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-bgc-base">
      <Navbar />
      <div className="flex-1 pt-20 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="py-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-bgc-text">Hey, {user?.name?.split(' ')[0]}!</h1>
              <p className="text-bgc-muted text-sm mt-1">Manage your bookings and wallet</p>
            </div>
            <Link to="/book" className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={16} /> New Booking
            </Link>
          </div>

          {/* Toast */}
          {msg.text && (
            <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium animate-slide-up ${
              msg.type === 'error' ? 'bg-bgc-error/10 border border-bgc-error/30 text-bgc-error' : 'bg-bgc-success/10 border border-bgc-success/30 text-bgc-success'
            }`}>
              {msg.text}
            </div>
          )}

          {/* Pending final alert */}
          {pendingFinal.length > 0 && (
            <div className="mb-6 bg-bgc-warning/10 border border-bgc-warning/30 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-bgc-warning shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-bgc-warning font-semibold text-sm">Final Payment Due!</p>
                <p className="text-bgc-muted text-xs mt-1">
                  You have {pendingFinal.length} booking{pendingFinal.length > 1 ? 's' : ''} requiring final payment.
                  Pay before your slot starts or the booking will be auto-cancelled.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {/* Wallet card */}
            <div className="md:col-span-2 card neon-border">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-bgc-muted text-xs uppercase tracking-wider mb-1">BGC Wallet</p>
                  <p className="font-heading text-3xl sm:text-4xl font-bold text-bgc-text">₹{wallet.wallet_balance?.toFixed(2)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setTopupModal(true)}
                    className="btn-primary text-xs py-2 px-4 flex items-center gap-1">
                    <Plus size={13} /> Top Up
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1 bg-bgc-elevated rounded-xl p-3">
                  <p className="text-bgc-muted text-xs mb-1">BGC Points</p>
                  <p className="font-heading text-xl font-bold gradient-text">{wallet.points?.toLocaleString()} pts</p>
                  <p className="text-bgc-muted text-xs mt-0.5">≈ ₹{((wallet.points || 0) / 10).toFixed(0)} value</p>
                </div>
                <div className="flex-1 bg-bgc-elevated rounded-xl p-3">
                  <p className="text-bgc-muted text-xs mb-1">Next Reward</p>
                  <p className="font-heading text-xl font-bold text-bgc-text">{100 - ((wallet.points || 0) % 100)} pts</p>
                  <p className="text-bgc-muted text-xs mt-0.5">to earn ₹10</p>
                </div>
              </div>
              {(wallet.points || 0) >= 100 && (
                <button onClick={() => setRedeemModal(true)}
                  className="mt-3 w-full py-2 rounded-lg border border-bgc-pink/30 text-bgc-pink text-sm font-medium hover:bg-bgc-pink/10 transition-colors flex items-center justify-center gap-2">
                  <Zap size={14} /> Redeem {Math.floor((wallet.points || 0) / 100) * 100} Points for ₹{Math.floor((wallet.points || 0) / 100) * 10}
                </button>
              )}
            </div>

            {/* Quick stats */}
            <div className="space-y-3">
              <div className="card">
                <p className="text-bgc-muted text-xs mb-1">Upcoming</p>
                <p className="font-heading text-3xl font-bold text-bgc-text">{upcoming.length}</p>
                <p className="text-bgc-muted text-xs">active booking{upcoming.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="card">
                <p className="text-bgc-muted text-xs mb-1">Total Sessions</p>
                <p className="font-heading text-3xl font-bold text-bgc-text">{bookings.filter(b => b.status === 'completed').length}</p>
                <p className="text-bgc-muted text-xs">completed</p>
              </div>
            </div>
          </div>

          {/* Bookings */}
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-bold text-bgc-text">My Bookings</h2>
              <div className="flex gap-1">
                {['upcoming', 'past', 'all'].map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                      tab === t ? 'bg-gradient-pink text-white' : 'text-bgc-muted hover:text-bgc-text hover:bg-bgc-elevated'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {displayBookings.length === 0 ? (
              <div className="text-center py-12">
                <Clock size={32} className="text-bgc-border mx-auto mb-3" />
                <p className="text-bgc-muted text-sm">No {tab} bookings</p>
                {tab === 'upcoming' && (
                  <Link to="/book" className="btn-primary text-sm mt-4 inline-flex items-center gap-2">
                    <Plus size={15} /> Book a Station
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {displayBookings.map(b => {
                  const sc = statusConfig[b.status] || statusConfig.confirmed
                  const StatusIcon = sc.icon
                  const isPendingFinal = b.status === 'pending_final'
                  return (
                    <div key={b.id} className={`rounded-xl border p-4 transition-all ${isPendingFinal ? 'border-bgc-warning/40 bg-bgc-warning/5' : 'border-bgc-border bg-bgc-elevated'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-bgc-text text-sm">{b.station_name}</p>
                            <span className={sc.class}><StatusIcon size={10} /> {sc.label}</span>
                            <span className="badge-muted capitalize">{b.station_type}</span>
                          </div>
                          <p className="text-bgc-muted text-xs mt-1.5">
                            {dayjs(b.start_time).format('DD MMM YYYY, h:mm A')} – {dayjs(b.end_time).format('h:mm A')}
                            · {b.duration_hours}hr{b.duration_hours > 1 ? 's' : ''}
                          </p>
                          <p className="text-bgc-muted text-xs mt-0.5">
                            Total ₹{b.total_amount} · Paid ₹{b.deposit_paid ? b.deposit_amount : 0}
                            {b.final_paid ? ` + ₹${b.final_amount}` : ''}
                            · {b.payment_method === 'cash' ? 'Cash' : 'Wallet'}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          {isPendingFinal && !b.final_paid && b.payment_method === 'wallet' && (
                            <button onClick={() => payFinal(b.id)} disabled={payingId === b.id}
                              className="btn-primary text-xs py-1.5 px-3">
                              {payingId === b.id ? '...' : `Pay ₹${b.final_amount}`}
                            </button>
                          )}
                          {['confirmed', 'pending_final', 'pending_cash'].includes(b.status) && dayjs(b.start_time).isAfter(now) && (
                            <button onClick={() => cancelBooking(b.id)} disabled={cancellingId === b.id}
                              className="text-bgc-error text-xs hover:underline">
                              {cancellingId === b.id ? '...' : 'Cancel'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Transactions */}
          <div className="card">
            <h2 className="font-heading text-lg font-bold text-bgc-text mb-4">Transaction History</h2>
            {transactions.length === 0 ? (
              <p className="text-bgc-muted text-sm text-center py-8">No transactions yet</p>
            ) : (
              <div className="space-y-2">
                {transactions.slice(0, 20).map(tx => {
                  const cfg = txTypeConfig[tx.type] || { label: tx.type, color: 'text-bgc-muted', prefix: '' }
                  return (
                    <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-bgc-border/40 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${cfg.prefix === '+' ? 'bg-bgc-success/10' : 'bg-bgc-error/10'} flex items-center justify-center`}>
                          {cfg.prefix === '+' ? <ArrowDownLeft size={14} className="text-bgc-success" /> : <ArrowUpRight size={14} className="text-bgc-error" />}
                        </div>
                        <div>
                          <p className="text-bgc-text text-sm font-medium">{cfg.label}</p>
                          <p className="text-bgc-muted text-xs">{tx.description || ''} · {dayjs(tx.created_at).format('DD MMM, h:mm A')}</p>
                        </div>
                      </div>
                      <span className={`font-semibold text-sm ${cfg.color}`}>
                        {cfg.prefix}₹{tx.amount}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top-up modal */}
      {topupModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-sm animate-slide-up">
            <h3 className="font-heading text-xl font-bold text-bgc-text mb-4">Top Up Wallet</h3>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[100, 200, 500, 1000].map(a => (
                <button key={a} onClick={() => setTopupAmount(a.toString())}
                  className={`py-2 rounded-lg text-sm font-medium transition-colors ${topupAmount === a.toString() ? 'bg-gradient-pink text-white' : 'bg-bgc-elevated border border-bgc-border text-bgc-muted hover:text-bgc-text'}`}>
                  ₹{a}
                </button>
              ))}
            </div>
            <input className="input mb-4" type="number" placeholder="Or enter custom amount (₹50–50,000)"
              value={topupAmount} onChange={e => setTopupAmount(e.target.value)} min={50} max={50000} />
            <p className="text-bgc-muted text-xs mb-4">Secure payment via Razorpay. Amount credited instantly on success.</p>
            <div className="flex gap-3">
              <button onClick={() => setTopupModal(false)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={handleTopup} className="btn-primary flex-1">Add ₹{topupAmount || '...'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Redeem modal */}
      {redeemModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-sm animate-slide-up">
            <h3 className="font-heading text-xl font-bold text-bgc-text mb-2">Redeem Points</h3>
            <p className="text-bgc-muted text-sm mb-4">100 points = ₹10 wallet credit</p>
            <div className="bg-bgc-elevated rounded-xl p-3 mb-4 text-center">
              <p className="text-bgc-muted text-xs mb-1">You have</p>
              <p className="font-heading text-3xl font-bold gradient-text">{wallet.points} pts</p>
            </div>
            <label className="label">Points to redeem (multiples of 100)</label>
            <input className="input mb-1" type="number" step={100} min={100} max={wallet.points}
              value={redeemPts} onChange={e => setRedeemPts(parseInt(e.target.value))} />
            <p className="text-bgc-muted text-xs mb-4">You'll receive ₹{(redeemPts / 100) * 10} wallet credit</p>
            <div className="flex gap-3">
              <button onClick={() => setRedeemModal(false)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={handleRedeem} className="btn-primary flex-1">Redeem {redeemPts} pts</button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
