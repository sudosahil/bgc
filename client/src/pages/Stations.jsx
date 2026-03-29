import { useState, useEffect, useRef } from 'react'
import { Monitor, Gamepad2, Circle, Check, ChevronDown, ChevronUp, Wallet, Tag, X, ShoppingCart, AlertCircle, CheckCircle2, Info } from 'lucide-react'
import dayjs from 'dayjs'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { useNavigate, useSearchParams } from 'react-router-dom'

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
  const available = station.available !== false

  let bg, border, cursor, textColor
  if (!hasSlot) {
    bg = 'rgba(255,255,255,0.03)'; border = 'rgba(255,255,255,0.08)'; cursor = 'default'; textColor = '#4a3f5c'
  } else if (!available) {
    bg = 'rgba(255,26,107,0.08)'; border = 'rgba(255,26,107,0.3)'; cursor = 'not-allowed'; textColor = 'rgba(255,26,107,0.45)'
  } else if (selected) {
    bg = 'rgba(0,255,136,0.15)'; border = '#00ff88'; cursor = 'pointer'; textColor = '#00ff88'
  } else {
    bg = 'rgba(0,255,136,0.06)'; border = 'rgba(0,255,136,0.3)'; cursor = 'pointer'; textColor = '#00ff88'
  }

  return (
    <div
      onClick={(hasSlot && available) ? onToggle : undefined}
      title={!hasSlot ? station.name : !available ? `${station.name} — booked` : station.name}
      style={{
        background: bg,
        border: `1.5px solid ${border}`,
        borderRadius: 8,
        padding: '10px 6px',
        cursor,
        textAlign: 'center',
        transition: 'all 0.12s',
        position: 'relative',
        minHeight: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
      {hasSlot && !available && (
        <div style={{
          position: 'absolute', top: 3, right: 3,
          width: 14, height: 14, borderRadius: '50%',
          background: 'rgba(255,26,107,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <X size={8} color="#ff1a6b" strokeWidth={3} />
        </div>
      )}
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, color: textColor, lineHeight: 1.2 }}>
        {station.name}
      </div>
    </div>
  )
}

// ─── Checkout Panel ─────────────────────────────────────────────────────────
function CheckoutPanel({ selected, stations, duration, slot, user, onBook, booking }) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const navigate = useNavigate()

  const selectedStations = stations.filter(s => selected.has(s.id))
  const total = selectedStations.reduce((sum, s) => sum + s.hourly_rate * duration, 0)

  async function handleBook() {
    if (!user) { navigate('/login', { state: { from: '/stations' } }); return }
    if (selected.size === 0 || !slot) return
    setLoading(true); setErr('')
    try {
      await onBook({ payMethod: 'cash' })
    } catch (e) {
      setErr(e.response?.data?.error || 'Booking failed. Please try again.')
    } finally { setLoading(false) }
  }

  if (booking) {
    return (
      <div style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.25)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
        <CheckCircle2 size={36} color="#00ff88" style={{ margin: '0 auto 12px' }} />
        <p style={{ fontFamily: "'Bebas Neue'", fontSize: 20, color: '#00ff88', letterSpacing: '0.05em' }}>Booking Confirmed!</p>
        <p style={{ color: '#a0a0b8', fontSize: 13, marginTop: 6 }}>
          {Array.isArray(booking) ? booking.length : 1} station{Array.isArray(booking) && booking.length > 1 ? 's' : ''} booked
        </p>
        <button onClick={() => navigate('/dashboard')}
          style={{ marginTop: 16, width: '100%', padding: '10px 0', borderRadius: 8, background: 'rgba(0,255,136,0.12)', border: '1px solid rgba(0,255,136,0.3)', color: '#00ff88', fontFamily: "'Bebas Neue'", fontSize: 15, letterSpacing: '0.05em', cursor: 'pointer' }}>
          View in Dashboard
        </button>
      </div>
    )
  }

  const canBook = selected.size > 0 && !!slot
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Selected stations */}
      <div style={{ background: '#1a1025', border: '1px solid #2d1f3d', borderRadius: 10, padding: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#6b5c8a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
          Selected ({selected.size})
        </p>
        {selected.size === 0 ? (
          <p style={{ color: '#4a3f5c', fontSize: 13 }}>Click green stations to select</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {selectedStations.map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#00ff88' }}>{s.name}</span>
                <span style={{ fontSize: 13, color: '#a0a0b8' }}>₹{(s.hourly_rate * duration).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slot + total */}
      {slot && (
        <div style={{ background: '#1a1025', border: '1px solid #2d1f3d', borderRadius: 10, padding: 14, fontSize: 12, color: '#a0a0b8', lineHeight: 1.9 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Date</span><span style={{ color: '#e0d0f0' }}>{dayjs(slot.date).format('D MMM YYYY')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Time</span><span style={{ color: '#e0d0f0' }}>{fmt12(slot.hour)} → {fmt12(slot.hour + duration)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Duration</span><span style={{ color: '#e0d0f0' }}>{duration}h</span>
          </div>
          {canBook && (
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #2d1f3d', paddingTop: 8, marginTop: 4 }}>
              <span style={{ color: '#e0d0f0', fontWeight: 700 }}>Total</span>
              <span style={{ color: '#ff6eb4', fontWeight: 700, fontSize: 14 }}>₹{total.toLocaleString()}</span>
            </div>
          )}
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
        disabled={loading || !canBook}
        style={{
          width: '100%', padding: '15px 0', borderRadius: 10,
          background: canBook ? 'linear-gradient(135deg, #E8185A, #9B1060)' : '#1a1025',
          border: canBook ? 'none' : '1px solid #2d1f3d',
          color: canBook ? '#fff' : '#4a3f5c',
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 19, letterSpacing: '0.08em',
          cursor: canBook ? 'pointer' : 'not-allowed',
          transition: 'all 0.15s', opacity: loading ? 0.7 : 1,
          boxShadow: canBook ? '0 4px 24px rgba(232,24,90,0.35)' : 'none',
        }}>
        {!user ? 'LOGIN TO BOOK'
          : loading ? 'BOOKING...'
          : !slot ? 'SELECT A TIME SLOT'
          : selected.size === 0 ? 'SELECT STATIONS'
          : `BOOK NOW · ₹${total.toLocaleString()}`}
      </button>

      {!user && (
        <p style={{ textAlign: 'center', fontSize: 12, color: '#6b5c8a' }}>
          <span style={{ color: '#ff6eb4', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate('/login', { state: { from: '/stations' } })}>Log in</span>{' '}
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
  const [searchParams] = useSearchParams()

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

  // Filter — can be pre-set via ?type=pc|playstation|pool
  const typeParam = searchParams.get('type')
  const [filter, setFilter] = useState(['pc', 'playstation', 'pool'].includes(typeParam) ? typeParam : 'all')

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

  async function handleBook(arg) {
    // arg is either { payMethod, discountCode } (wallet/cash) or bookings[] (razorpay already verified)
    if (Array.isArray(arg)) {
      // Razorpay: bookings already created, just update state
      setBooking(arg)
      setSelected(new Set())
      await refreshUser()
      fetchSlot()
    } else {
      const { payMethod, discountCode } = arg
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
      fetchSlot()
    }
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
        <div style={{ background: '#12091c', borderBottom: '1px solid #2d1f3d', padding: '32px 0' }}>
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
            <p style={{ fontSize: 11, fontWeight: 700, color: '#6b5c8a', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>// BOOK A SESSION</p>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(28px,5vw,44px)', color: '#e0d0f0', letterSpacing: '0.03em', marginBottom: 6 }}>
              Pick Your Station
            </h1>
            <p style={{ color: '#6b5c8a', fontSize: 14 }}>
              Select a date & time slot, then choose stations and checkout on the right.
            </p>
          </div>
        </div>

        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 flex flex-col lg:flex-row gap-7 items-start">

          {/* ── Left: Slot picker + Seat Map ── */}
          <div className="flex-1 min-w-0 w-full">

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
                    border: '1px solid #2d1f3d', color: '#e0d0f0', fontSize: 16, outline: 'none',
                    colorScheme: 'dark', width: '100%', maxWidth: 220,
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
          <div className="w-full lg:w-[300px] lg:flex-shrink-0">
            <div className="lg:sticky lg:top-20">
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
