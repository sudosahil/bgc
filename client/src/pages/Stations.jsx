import { useState, useEffect, useRef } from 'react'
import { Monitor, Gamepad2, Circle, Check, ChevronDown, ChevronUp, Wallet, Tag, X, ShoppingCart, AlertCircle, CheckCircle2, Info } from 'lucide-react'
import dayjs from 'dayjs'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

// ─── Config ────────────────────────────────────────────────────────────────
const TYPE_CFG = {
  pc:          { label: 'Gaming PCs',    icon: Monitor,  accent: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)' },
  playstation: { label: 'PlayStation 5', icon: Gamepad2, accent: '#ff6eb4', bg: 'rgba(255,110,180,0.08)', border: 'rgba(255,110,180,0.2)' },
  pool:        { label: 'Pool Table',    icon: Circle,   accent: '#34d399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.2)'  },
}

const HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]
const DURATIONS = [1, 1.5, 2, 2.5, 3, 4, 5, 6]

function fmt12(h) {
  if (h === 12) return '12 PM'
  return h > 12 ? `${h - 12} PM` : `${h} AM`
}

// ─── Seat Tile ──────────────────────────────────────────────────────────────
function SeatTile({ station, selected, onToggle, hasSlot }) {
  const cfg = TYPE_CFG[station.type] || TYPE_CFG.pc
  const available = station.available !== false

  // If no slot selected yet, show neutral state
  if (!hasSlot) {
    return (
      <div
        title={station.name}
        style={{
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          borderRadius: 8,
          padding: '10px 6px',
          textAlign: 'center',
          cursor: 'default',
          opacity: 0.7,
        }}
      >
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, color: cfg.accent, lineHeight: 1.2 }}>
          {station.name}
        </div>
      </div>
    )
  }

  let bg, border, cursor
  if (!available) {
    bg = 'rgba(255,26,107,0.06)'; border = 'rgba(255,26,107,0.2)'; cursor = 'not-allowed'
  } else if (selected) {
    bg = 'rgba(0,255,136,0.14)'; border = '#00ff88'; cursor = 'pointer'
  } else {
    bg = cfg.bg; border = cfg.border; cursor = 'pointer'
  }

  return (
    <div
      onClick={available ? onToggle : undefined}
      title={!available ? `${station.name} — booked` : station.name}
      style={{
        background: bg,
        border: `1.5px solid ${border}`,
        borderRadius: 8,
        padding: '10px 6px',
        cursor,
        textAlign: 'center',
        transition: 'all 0.12s',
        position: 'relative',
      }}
    >
      {selected && (
        <div style={{
          position: 'absolute', top: 3, right: 3,
          width: 14, height: 14, borderRadius: '50%',
          background: '#00ff88',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Check size={9} color="#0a060d" strokeWidth={3} />
        </div>
      )}
      {!available && (
        <div style={{
          position: 'absolute', top: 3, right: 3,
          width: 14, height: 14, borderRadius: '50%',
          background: 'rgba(255,26,107,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <X size={8} color="#ff1a6b" strokeWidth={3} />
        </div>
      )}
      <div style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: 13,
        color: !available ? 'rgba(255,26,107,0.35)' : selected ? '#00ff88' : cfg.accent,
        lineHeight: 1.2,
      }}>
        {station.name}
      </div>
    </div>
  )
}

// ─── Checkout Panel ─────────────────────────────────────────────────────────
function CheckoutPanel({ selected, stations, duration, slot, user, onBook, booking }) {
  const [payMethod, setPayMethod] = useState('wallet')
  const [discountCode, setDiscountCode] = useState('')
  const [discountData, setDiscountData] = useState(null)
  const [discountErr, setDiscountErr] = useState('')
  const [validating, setValidating] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const navigate = useNavigate()

  const selectedStations = stations.filter(s => selected.has(s.id))
  const subtotal = selectedStations.reduce((sum, s) => sum + s.hourly_rate * duration, 0)
  const discountAmt = discountData ? discountData.discountAmount : 0
  const total = subtotal - discountAmt
  const deposit = Math.ceil(total * 0.5)
  const final = total - deposit

  async function applyDiscount() {
    if (!discountCode.trim()) return
    setValidating(true); setDiscountErr(''); setDiscountData(null)
    try {
      const r = await api.post('/discounts/validate', {
        code: discountCode.trim(),
        station_type: 'all',
        subtotal,
      })
      setDiscountData(r.data)
    } catch (e) {
      setDiscountErr(e.response?.data?.error || 'Invalid code')
    } finally { setValidating(false) }
  }

  async function handleBook() {
    if (!user) { navigate('/login'); return }
    if (selected.size === 0) return
    if (!slot) return
    setLoading(true); setErr('')
    try {
      await onBook({ payMethod, discountCode: discountData ? discountCode.trim() : undefined })
    } catch (e) {
      setErr(e.response?.data?.error || 'Booking failed')
    } finally { setLoading(false) }
  }

  if (booking) {
    return (
      <div style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.25)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
        <CheckCircle2 size={36} color="#00ff88" style={{ margin: '0 auto 12px' }} />
        <p style={{ fontFamily: "'Bebas Neue'", fontSize: 20, color: '#00ff88', letterSpacing: '0.05em' }}>Booking Confirmed!</p>
        <p style={{ color: '#a0a0b8', fontSize: 13, marginTop: 6 }}>
          {booking.length} station{booking.length > 1 ? 's' : ''} booked · ₹{deposit} deposit paid
        </p>
        <button onClick={() => navigate('/dashboard')}
          style={{ marginTop: 16, width: '100%', padding: '10px 0', borderRadius: 8, background: 'rgba(0,255,136,0.12)', border: '1px solid rgba(0,255,136,0.3)', color: '#00ff88', fontFamily: "'Bebas Neue'", fontSize: 15, letterSpacing: '0.05em', cursor: 'pointer' }}>
          View in Dashboard
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Selected stations */}
      <div style={{ background: '#1a1025', border: '1px solid #2d1f3d', borderRadius: 10, padding: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#6b5c8a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
          Selected Stations ({selected.size})
        </p>
        {selected.size === 0 ? (
          <p style={{ color: '#4a3f5c', fontSize: 13 }}>Click stations on the map to select</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {selectedStations.map(s => {
              const cfg = TYPE_CFG[s.type]
              return (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: cfg.accent }}>{s.name}</span>
                  <span style={{ fontSize: 13, color: '#a0a0b8' }}>₹{(s.hourly_rate * duration).toLocaleString()}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Slot info */}
      {slot && (
        <div style={{ background: '#1a1025', border: '1px solid #2d1f3d', borderRadius: 10, padding: 14, fontSize: 12, color: '#a0a0b8', lineHeight: 1.8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Date</span><span style={{ color: '#e0d0f0' }}>{dayjs(slot.date).format('D MMM YYYY')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Time</span><span style={{ color: '#e0d0f0' }}>{fmt12(slot.hour)} → {fmt12(slot.hour + duration)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Duration</span><span style={{ color: '#e0d0f0' }}>{duration}h</span>
          </div>
        </div>
      )}

      {/* Payment method */}
      <div style={{ background: '#1a1025', border: '1px solid #2d1f3d', borderRadius: 10, padding: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#6b5c8a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Payment</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {['wallet', 'cash'].map(m => (
            <button key={m} onClick={() => setPayMethod(m)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.12s',
                background: payMethod === m ? 'rgba(255,110,180,0.12)' : 'transparent',
                border: payMethod === m ? '1px solid #ff6eb4' : '1px solid #2d1f3d',
                color: payMethod === m ? '#ff6eb4' : '#6b5c8a',
              }}>
              {m === 'wallet' ? '💳 Wallet' : '💵 Cash'}
            </button>
          ))}
        </div>
        {payMethod === 'wallet' && user && (
          <p style={{ fontSize: 11, color: '#6b5c8a', marginTop: 8 }}>
            Balance: <span style={{ color: '#e0d0f0' }}>₹{user.wallet_balance?.toLocaleString() ?? 0}</span>
          </p>
        )}
      </div>

      {/* Discount */}
      <div style={{ background: '#1a1025', border: '1px solid #2d1f3d', borderRadius: 10, padding: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#6b5c8a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Discount Code</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={discountCode}
            onChange={e => { setDiscountCode(e.target.value.toUpperCase()); setDiscountData(null); setDiscountErr('') }}
            placeholder="ENTER CODE"
            style={{
              flex: 1, padding: '8px 10px', borderRadius: 8, background: '#0f0a18', border: '1px solid #2d1f3d',
              color: '#e0d0f0', fontSize: 12, fontFamily: 'monospace', outline: 'none',
            }}
          />
          <button onClick={applyDiscount} disabled={validating || !discountCode.trim()}
            style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: 'rgba(255,110,180,0.12)', border: '1px solid #ff6eb4', color: '#ff6eb4',
              opacity: (!discountCode.trim() || validating) ? 0.5 : 1,
            }}>
            {validating ? '...' : 'Apply'}
          </button>
        </div>
        {discountErr && <p style={{ fontSize: 11, color: '#ff6eb4', marginTop: 6 }}>{discountErr}</p>}
        {discountData && <p style={{ fontSize: 11, color: '#00ff88', marginTop: 6 }}>✓ −₹{discountData.discountAmount} applied</p>}
      </div>

      {/* Price breakdown */}
      {selected.size > 0 && slot && (
        <div style={{ background: '#1a1025', border: '1px solid #2d1f3d', borderRadius: 10, padding: 14, fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a0a0b8', marginBottom: 6 }}>
            <span>Subtotal</span><span>₹{subtotal.toLocaleString()}</span>
          </div>
          {discountAmt > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#00ff88', marginBottom: 6 }}>
              <span>Discount</span><span>−₹{discountAmt.toLocaleString()}</span>
            </div>
          )}
          <div style={{ borderTop: '1px solid #2d1f3d', paddingTop: 8, marginTop: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e0d0f0', fontWeight: 700, marginBottom: 4 }}>
              <span>Total</span><span>₹{total.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ff6eb4', fontSize: 12 }}>
              <span>Pay now (50% deposit)</span><span>₹{deposit.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b5c8a', fontSize: 11, marginTop: 2 }}>
              <span>Pay later (at counter)</span><span>₹{final.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {err && (
        <div style={{ background: 'rgba(255,26,107,0.08)', border: '1px solid rgba(255,26,107,0.25)', borderRadius: 8, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <AlertCircle size={14} color="#ff6eb4" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: '#ff6eb4', margin: 0 }}>{err}</p>
        </div>
      )}

      <button
        onClick={handleBook}
        disabled={loading || selected.size === 0 || !slot}
        style={{
          width: '100%', padding: '13px 0', borderRadius: 10,
          background: (selected.size > 0 && slot) ? 'linear-gradient(135deg, #ff6eb4, #ff1a6b)' : '#1a1025',
          border: (selected.size > 0 && slot) ? 'none' : '1px solid #2d1f3d',
          color: (selected.size > 0 && slot) ? '#fff' : '#4a3f5c',
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 17, letterSpacing: '0.06em', cursor: (selected.size > 0 && slot) ? 'pointer' : 'not-allowed',
          transition: 'all 0.15s', opacity: loading ? 0.7 : 1,
          boxShadow: (selected.size > 0 && slot) ? '0 4px 20px rgba(255,26,107,0.3)' : 'none',
        }}>
        {!user ? 'LOGIN TO BOOK'
          : loading ? 'BOOKING...'
          : !slot ? 'SELECT A TIME SLOT'
          : selected.size === 0 ? 'SELECT STATIONS'
          : `BOOK ${selected.size} STATION${selected.size > 1 ? 'S' : ''} · ₹${deposit.toLocaleString()}`}
      </button>

      {!user && (
        <p style={{ textAlign: 'center', fontSize: 12, color: '#6b5c8a' }}>
          <span style={{ color: '#ff6eb4', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate('/login')}>Log in</span>{' '}
          or{' '}
          <span style={{ color: '#ff6eb4', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate('/register')}>register</span>{' '}
          to book
        </p>
      )}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Stations() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()

  // Slot selection
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [hour, setHour] = useState(null)
  const [duration, setDuration] = useState(2)

  // Station data
  const [allStations, setAllStations] = useState([])   // base list (no availability)
  const [slotStations, setSlotStations] = useState(null) // with available: bool
  const [loadingSlot, setLoadingSlot] = useState(false)
  const [slotErr, setSlotErr] = useState('')

  // Selection & booking
  const [selected, setSelected] = useState(new Set())
  const [booking, setBooking] = useState(null)

  // Filter
  const [filter, setFilter] = useState('all')

  // Load base station list on mount
  useEffect(() => {
    api.get('/stations').then(r => setAllStations(r.data.stations)).catch(() => {})
  }, [])

  // Auto-fetch slot when all three are set
  useEffect(() => {
    if (!date || hour === null) return
    fetchSlot()
  }, [date, hour, duration])

  async function fetchSlot() {
    setLoadingSlot(true); setSlotErr(''); setSelected(new Set()); setBooking(null)
    try {
      const r = await api.get('/stations/slot', {
        params: { date, start_time: `${String(hour).padStart(2, '0')}:00`, duration },
      })
      setSlotStations(r.data.stations)
    } catch (e) {
      setSlotErr(e.response?.data?.error || 'Failed to load availability')
    } finally { setLoadingSlot(false) }
  }

  function toggleStation(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleBook({ payMethod, discountCode }) {
    const startISO = `${date}T${String(hour).padStart(2, '0')}:00:00`
    const r = await api.post('/bookings/multi', {
      station_ids: [...selected],
      start_time: startISO,
      duration_hours: duration,
      payment_method: payMethod,
      discount_code: discountCode,
    })
    setBooking(r.data.bookings)
    setSelected(new Set())
    await refreshUser()
    // Re-fetch availability
    fetchSlot()
  }

  // Display stations (slot data if available, else base list)
  const displayStations = slotStations || allStations
  const hasSlot = !!slotStations && !loadingSlot

  const grouped = { pc: [], playstation: [], pool: [] }
  displayStations.forEach(s => { if (grouped[s.type]) grouped[s.type].push(s) })

  const types = filter === 'all' ? ['pc', 'playstation', 'pool'] : [filter]
  const slot = hour !== null ? { date, hour } : null

  const availCount = hasSlot ? displayStations.filter(s => s.available).length : null
  const totalCount = displayStations.length

  return (
    <div className="min-h-screen flex flex-col bg-bgc-base">
      <Navbar />
      <div style={{ paddingTop: 64, flex: 1 }}>

        {/* Header */}
        <div style={{ background: '#12091c', borderBottom: '1px solid #2d1f3d', padding: '40px 0' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#6b5c8a', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>// BOOK A SESSION</p>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(28px,5vw,44px)', color: '#e0d0f0', letterSpacing: '0.03em', marginBottom: 6 }}>
              Pick Your Station
            </h1>
            <p style={{ color: '#6b5c8a', fontSize: 14 }}>
              Select a date & time slot, then choose stations and checkout on the right.
            </p>
          </div>
        </div>

        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px', display: 'flex', gap: 28, alignItems: 'flex-start' }}>

          {/* ── Left: Slot picker + Seat Map ── */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Slot Picker */}
            <div style={{ background: '#12091c', border: '1px solid #2d1f3d', borderRadius: 14, padding: 20, marginBottom: 24 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#6b5c8a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
                Select Time Slot
              </p>

              {/* Date */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#6b5c8a', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Date</label>
                <input
                  type="date"
                  value={date}
                  min={dayjs().format('YYYY-MM-DD')}
                  max={dayjs().add(30, 'day').format('YYYY-MM-DD')}
                  onChange={e => { setDate(e.target.value); setHour(null); setSlotStations(null) }}
                  style={{
                    padding: '9px 12px', borderRadius: 8, background: '#0f0a18',
                    border: '1px solid #2d1f3d', color: '#e0d0f0', fontSize: 13, outline: 'none',
                    colorScheme: 'dark',
                  }}
                />
              </div>

              {/* Duration */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#6b5c8a', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Duration</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {DURATIONS.map(d => (
                    <button key={d} onClick={() => setDuration(d)}
                      style={{
                        padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.1s',
                        background: duration === d ? 'rgba(255,110,180,0.15)' : 'transparent',
                        border: duration === d ? '1px solid #ff6eb4' : '1px solid #2d1f3d',
                        color: duration === d ? '#ff6eb4' : '#6b5c8a',
                      }}>
                      {d}h
                    </button>
                  ))}
                </div>
              </div>

              {/* Hourly grid */}
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#6b5c8a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Start Time {hour !== null && <span style={{ color: '#ff6eb4' }}>· {fmt12(hour)} → {fmt12(hour + duration)}</span>}
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {HOURS.map(h => {
                    // Disable past hours for today
                    const isPast = date === dayjs().format('YYYY-MM-DD') && h <= dayjs().hour()
                    return (
                      <button key={h} onClick={() => !isPast && setHour(h)} disabled={isPast}
                        style={{
                          padding: '7px 13px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: isPast ? 'not-allowed' : 'pointer', transition: 'all 0.1s',
                          background: hour === h ? 'rgba(255,110,180,0.15)' : 'transparent',
                          border: hour === h ? '1px solid #ff6eb4' : '1px solid #2d1f3d',
                          color: isPast ? '#2d1f3d' : hour === h ? '#ff6eb4' : '#6b5c8a',
                          opacity: isPast ? 0.4 : 1,
                        }}>
                        {fmt12(h)}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Status bar */}
            {loadingSlot && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#6b5c8a', fontSize: 13 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #2d1f3d', borderTopColor: '#ff6eb4', animation: 'spin 0.7s linear infinite', margin: '0 auto 8px' }} />
                Checking availability...
              </div>
            )}
            {slotErr && (
              <div style={{ background: 'rgba(255,26,107,0.08)', border: '1px solid rgba(255,26,107,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#ff6eb4', fontSize: 13 }}>
                {slotErr}
              </div>
            )}
            {hasSlot && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, padding: '10px 16px', background: '#12091c', border: '1px solid #2d1f3d', borderRadius: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#00ff88', display: 'inline-block', boxShadow: '0 0 6px #00ff88' }} />
                  <span style={{ fontSize: 12, color: '#a0a0b8' }}>{availCount} available</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,26,107,0.4)', display: 'inline-block' }} />
                  <span style={{ fontSize: 12, color: '#a0a0b8' }}>{totalCount - availCount} booked</span>
                </div>
                <span style={{ fontSize: 12, color: '#6b5c8a', marginLeft: 'auto' }}>
                  {fmt12(hour)} → {fmt12(hour + duration)} · {dayjs(date).format('D MMM')}
                </span>
              </div>
            )}

            {!hasSlot && !loadingSlot && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(167,139,250,0.05)', border: '1px dashed rgba(167,139,250,0.2)', borderRadius: 10, marginBottom: 16 }}>
                <Info size={14} color="#a78bfa" />
                <p style={{ fontSize: 12, color: '#6b5c8a', margin: 0 }}>
                  {hour === null ? 'Pick a time slot above to see real-time availability.' : 'Loading availability...'}
                </p>
              </div>
            )}

            {/* Type filter */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {['all', 'pc', 'playstation', 'pool'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.1s',
                    background: filter === f ? 'rgba(255,110,180,0.12)' : 'transparent',
                    border: filter === f ? '1px solid #ff6eb4' : '1px solid #2d1f3d',
                    color: filter === f ? '#ff6eb4' : '#6b5c8a',
                    textTransform: 'capitalize',
                  }}>
                  {f === 'all' ? 'All' : TYPE_CFG[f]?.label}
                </button>
              ))}
            </div>

            {/* Seat map */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {types.map(type => {
                const cfg = TYPE_CFG[type]
                const Icon = cfg.icon
                const list = grouped[type]
                if (!list.length) return null

                const gridCols = type === 'pc' ? 'repeat(auto-fill, minmax(62px, 1fr))' :
                                 type === 'playstation' ? 'repeat(auto-fill, minmax(72px, 1fr))' :
                                 'repeat(auto-fill, minmax(100px, 1fr))'

                return (
                  <div key={type} style={{ background: '#12091c', border: '1px solid #2d1f3d', borderRadius: 14, padding: 18 }}>
                    {/* Section header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={16} color={cfg.accent} />
                      </div>
                      <div>
                        <p style={{ fontFamily: "'Bebas Neue'", fontSize: 16, color: '#e0d0f0', letterSpacing: '0.04em', margin: 0 }}>{cfg.label}</p>
                        <p style={{ fontSize: 11, color: '#6b5c8a', margin: 0 }}>
                          {list.length} station{list.length > 1 ? 's' : ''} · ₹{list[0]?.hourly_rate}/hr
                          {hasSlot && <span style={{ color: '#00ff88', marginLeft: 8 }}>{list.filter(s => s.available).length} free</span>}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 8 }}>
                      {list.map(s => (
                        <SeatTile
                          key={s.id}
                          station={s}
                          selected={selected.has(s.id)}
                          onToggle={() => toggleStation(s.id)}
                          hasSlot={hasSlot}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

          </div>

          {/* ── Right: Checkout ── */}
          <div style={{ width: 300, flexShrink: 0 }}>
            <div style={{ position: 'sticky', top: 80 }}>
              <div style={{ background: '#12091c', border: '1px solid #2d1f3d', borderRadius: 14, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid #2d1f3d' }}>
                  <ShoppingCart size={16} color="#ff6eb4" />
                  <p style={{ fontFamily: "'Bebas Neue'", fontSize: 17, color: '#e0d0f0', letterSpacing: '0.05em', margin: 0 }}>Checkout</p>
                  {selected.size > 0 && (
                    <span style={{
                      marginLeft: 'auto', background: 'rgba(255,110,180,0.15)', border: '1px solid #ff6eb4',
                      color: '#ff6eb4', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700,
                    }}>{selected.size}</span>
                  )}
                </div>
                <CheckoutPanel
                  selected={selected}
                  stations={displayStations}
                  duration={duration}
                  slot={slot}
                  user={user}
                  onBook={handleBook}
                  booking={booking}
                />
              </div>
            </div>
          </div>

        </div>
      </div>
      <Footer />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.5) }
      `}</style>
    </div>
  )
}
