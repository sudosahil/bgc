import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Monitor, Gamepad2, Circle, ChevronRight, ChevronLeft, Check, Wallet, Coins, AlertCircle, X } from 'lucide-react'
import dayjs from 'dayjs'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

const TYPE_CFG = {
  pc:          { label: 'Gaming PCs',    icon: Monitor,  color: '#ff6eb4', rate: 50 },
  playstation: { label: 'PlayStation 5', icon: Gamepad2, color: '#ff1a6b', rate: 150 },
  pool:        { label: 'Pool Table',    icon: Circle,   color: '#ff6eb4', rate: 450 },
}

const HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]
const DURATIONS = [1, 1.5, 2, 2.5, 3, 4, 5, 6]

function fmt12(h) {
  if (h === 12) return '12 PM'
  return h > 12 ? `${h - 12} PM` : `${h} AM`
}

// ── Station tile in the seat map ───────────────────────────────────────────
function SeatTile({ station, selected, onClick }) {
  const available = station.available
  const cfg = TYPE_CFG[station.type] || TYPE_CFG.pc

  let bg, border, cursor, textColor
  if (!available) {
    bg = 'rgba(255,26,107,0.05)'; border = 'rgba(255,26,107,0.15)'; cursor = 'not-allowed'; textColor = 'rgba(255,26,107,0.35)'
  } else if (selected) {
    bg = 'rgba(0,255,136,0.15)'; border = 'rgba(0,255,136,0.6)'; cursor = 'pointer'; textColor = '#00ff88'
  } else {
    bg = 'rgba(0,255,136,0.05)'; border = 'rgba(0,255,136,0.25)'; cursor = 'pointer'; textColor = '#00ff88'
  }

  return (
    <div
      onClick={available ? onClick : undefined}
      title={available ? `${station.name} — click to ${selected ? 'deselect' : 'select'}` : `${station.name} — booked`}
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 8,
        padding: '10px 6px',
        cursor,
        textAlign: 'center',
        transition: 'all 0.12s',
        position: 'relative',
        minWidth: 0,
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
      <div style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: 13,
        color: textColor,
        lineHeight: 1.1,
        letterSpacing: '0.03em',
      }}>
        {station.name.replace(/^(PC|PS|POOL)-?/i, '$1\n').trim()}
      </div>
    </div>
  )
}

// ── Station section in the seat map ───────────────────────────────────────
function SeatSection({ type, stations, selected, onToggle }) {
  const cfg = TYPE_CFG[type]
  const Icon = cfg.icon
  const availCount = stations.filter(s => s.available).length
  const selectedCount = stations.filter(s => selected.has(s.id)).length

  const cols = type === 'pc' ? 'repeat(auto-fill, minmax(64px, 1fr))' : type === 'playstation' ? 'repeat(3, 1fr)' : '1fr'

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Icon size={16} color={cfg.color} />
        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: '#f0e8f0', letterSpacing: '0.05em' }}>
          {cfg.label}
        </span>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: '#7a5f7a', letterSpacing: '0.05em', marginLeft: 4 }}>
          {availCount} available · ₹{cfg.rate}/hr
        </span>
        {selectedCount > 0 && (
          <span style={{
            marginLeft: 'auto',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700,
            color: '#00ff88', letterSpacing: '0.05em',
          }}>
            {selectedCount} selected
          </span>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
        {[
          { color: 'rgba(0,255,136,0.6)', label: 'Available' },
          { color: 'rgba(0,255,136,0.6)', label: 'Selected', selected: true },
          { color: 'rgba(255,26,107,0.15)', label: 'Booked', dim: true },
        ].map(({ color, label, dim, selected: sel }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 12, height: 12, borderRadius: 3,
              border: `1px solid ${color}`,
              background: sel ? 'rgba(0,255,136,0.15)' : dim ? 'rgba(255,26,107,0.05)' : 'rgba(0,255,136,0.05)',
            }} />
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#7a5f7a' }}>{label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 6 }}>
        {stations.map(s => (
          <SeatTile key={s.id} station={s} selected={selected.has(s.id)} onClick={() => onToggle(s)} />
        ))}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function Book() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [step, setStep] = useState(1)
  const [date, setDate] = useState(dayjs().add(1, 'day').format('YYYY-MM-DD'))
  const [startHour, setStartHour] = useState(14)
  const [duration, setDuration] = useState(2)

  const [slotData, setSlotData] = useState(null)   // { stations, slot }
  const [slotLoading, setSlotLoading] = useState(false)
  const [slotError, setSlotError] = useState('')

  const [selected, setSelected] = useState(new Set())  // Set of station ids

  const [paymentMethod, setPaymentMethod] = useState('wallet')
  const [wallet, setWallet] = useState(null)
  const [discountInput, setDiscountInput] = useState('')
  const [discountCode, setDiscountCode] = useState('')
  const [discountData, setDiscountData] = useState(null)
  const [discountLoading, setDiscountLoading] = useState(false)
  const [discountError, setDiscountError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)  // { bookings, summary }

  useEffect(() => {
    api.get('/wallet').then(r => setWallet(r.data)).catch(() => {})
  }, [])

  const startTimeISO = `${date}T${String(startHour).padStart(2, '0')}:00`
  const endTimeISO   = dayjs(startTimeISO).add(duration, 'hour').format('YYYY-MM-DDTHH:mm')

  // Selected station objects
  const selectedStations = slotData?.stations.filter(s => selected.has(s.id)) || []
  const subtotal = selectedStations.reduce((sum, s) => sum + s.hourly_rate * duration, 0)
  const discountAmount = discountData ? discountData.discountAmount : 0
  const total = Math.max(0, subtotal - discountAmount)
  const deposit = Math.ceil(total * 0.5)
  const finalAmt = total - deposit

  const toggleStation = (station) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(station.id) ? next.delete(station.id) : next.add(station.id)
      return next
    })
    setDiscountData(null); setDiscountCode(''); setDiscountInput('')
  }

  const checkSlot = async () => {
    setSlotLoading(true); setSlotError(''); setSelected(new Set()); setSlotData(null)
    try {
      const res = await api.get('/stations/slot', {
        params: { date, start_time: `${String(startHour).padStart(2, '0')}:00`, duration }
      })
      setSlotData(res.data)
      setStep(2)
    } catch (e) {
      setSlotError(e.response?.data?.error || 'Could not load availability')
    } finally {
      setSlotLoading(false)
    }
  }

  const applyDiscount = async () => {
    if (!discountInput.trim() || selectedStations.length === 0) return
    setDiscountLoading(true); setDiscountError('')
    try {
      const res = await api.post('/discounts/validate', { code: discountInput.trim(), station_type: 'all', subtotal })
      setDiscountData(res.data)
      setDiscountCode(discountInput.trim().toUpperCase())
    } catch (e) {
      setDiscountError(e.response?.data?.error || 'Invalid or inapplicable code')
      setDiscountData(null); setDiscountCode('')
    } finally {
      setDiscountLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (selected.size === 0) { setError('Select at least one station'); return }
    setLoading(true); setError('')
    try {
      const res = await api.post('/bookings/multi', {
        station_ids: [...selected],
        start_time: startTimeISO,
        duration_hours: duration,
        payment_method: paymentMethod,
        discount_code: discountCode || undefined,
      })
      setSuccess(res.data)
      refreshUser()
      api.get('/wallet').then(r => setWallet(r.data)).catch(() => {})
    } catch (e) {
      setError(e.response?.data?.error || 'Booking failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD')
  const maxDate  = dayjs().add(30, 'day').format('YYYY-MM-DD')

  // ── Success screen ──────────────────────────────────────────────────────
  if (success) {
    const { bookings, summary } = success
    return (
      <div className="min-h-screen flex flex-col bg-bgc-base">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6 pt-24">
          <div className="max-w-lg w-full animate-slide-up">
            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-full bg-bgc-success/15 border border-bgc-success/30 flex items-center justify-center mx-auto mb-4">
                <Check size={36} className="text-bgc-success" />
              </div>
              <h2 className="font-heading text-4xl text-bgc-text mb-1">Booking Confirmed!</h2>
              <p className="text-bgc-muted text-sm">
                {bookings.length} station{bookings.length > 1 ? 's' : ''} locked in · See you at BGC!
              </p>
            </div>

            <div className="card mb-4">
              <div className="flex justify-between text-sm mb-3 pb-3 border-b border-bgc-border">
                <span className="text-bgc-muted">Date & Time</span>
                <span className="text-bgc-text font-medium">
                  {dayjs(bookings[0].start_time).format('DD MMM YYYY, h:mm A')} –{' '}
                  {dayjs(bookings[0].end_time).format('h:mm A')}
                </span>
              </div>
              <div className="space-y-2 mb-3">
                {bookings.map(b => (
                  <div key={b.id} className="flex justify-between text-sm">
                    <span className="text-bgc-text font-medium">{b.station_name}</span>
                    <span className="text-bgc-muted">₹{b.total_amount}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-bgc-border pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between font-bold">
                  <span className="text-bgc-muted">Total</span>
                  <span className="text-bgc-text">₹{summary.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bgc-muted">Deposit Paid</span>
                  <span className="text-bgc-success font-semibold">₹{summary.deposit}</span>
                </div>
                {paymentMethod === 'wallet' && (
                  <div className="flex justify-between">
                    <span className="text-bgc-muted">Final Due (2hrs before)</span>
                    <span className="text-bgc-text">₹{summary.finalAmt}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setSuccess(null); setStep(1); setSelected(new Set()); setSlotData(null) }}
                className="btn-outline flex-1">Book More</button>
              <button onClick={() => navigate('/dashboard')} className="btn-primary flex-1">My Bookings</button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // ── Grouped stations ────────────────────────────────────────────────────
  const grouped = { pc: [], playstation: [], pool: [] }
  slotData?.stations.forEach(s => { if (grouped[s.type] !== undefined) grouped[s.type].push(s) })

  return (
    <div className="min-h-screen flex flex-col bg-bgc-base">
      <Navbar />
      <div className="flex-1 pt-20 pb-16">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start pt-6">

            {/* ── Left: main content ── */}
            <div>
              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-8">
                {['Pick Your Slot', 'Select Stations', 'Confirm & Pay'].map((label, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        step > i + 1 ? 'bg-bgc-success text-white' : step === i + 1 ? 'bg-gradient-pink text-white shadow-pink-sm' : 'bg-bgc-elevated border border-bgc-border text-bgc-muted'
                      }`}>
                        {step > i + 1 ? <Check size={14} /> : i + 1}
                      </div>
                      <span className={`text-xs hidden sm:block whitespace-nowrap ${step === i + 1 ? 'text-bgc-pink' : 'text-bgc-muted'}`}>{label}</span>
                    </div>
                    {i < 2 && <div className={`w-8 sm:w-12 h-px mb-5 ${step > i + 1 ? 'bg-bgc-success' : 'bg-bgc-border'}`} />}
                  </div>
                ))}
              </div>

              {/* ── Step 1: Date & Time ── */}
              {step === 1 && (
                <div className="animate-slide-up">
                  <h2 className="font-heading text-3xl text-bgc-text mb-1">Pick Your Slot</h2>
                  <p className="text-bgc-muted text-sm mb-6">Choose a date, time and how long you want to play.</p>

                  <div className="card space-y-6">
                    {/* Date */}
                    <div>
                      <label className="label">Date</label>
                      <input type="date" className="input" value={date} min={tomorrow} max={maxDate}
                        onChange={e => setDate(e.target.value)} />
                    </div>

                    {/* Start time */}
                    <div>
                      <label className="label">Start Time</label>
                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                        {HOURS.map(h => (
                          <button key={h} onClick={() => setStartHour(h)}
                            className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                              startHour === h
                                ? 'bg-gradient-pink text-white shadow-pink-sm'
                                : 'bg-bgc-elevated border border-bgc-border text-bgc-muted hover:text-bgc-text hover:border-bgc-pink/30'
                            }`}>
                            {fmt12(h)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="label">Duration</label>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                        {DURATIONS.map(d => (
                          <button key={d} onClick={() => setDuration(d)}
                            className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                              duration === d
                                ? 'bg-gradient-pink text-white shadow-pink-sm'
                                : 'bg-bgc-elevated border border-bgc-border text-bgc-muted hover:text-bgc-text hover:border-bgc-pink/30'
                            }`}>
                            {d}hr{d > 1 ? 's' : ''}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Slot preview */}
                    <div className="bg-bgc-elevated rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-bgc-muted text-xs mb-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>YOUR SLOT</p>
                        <p className="text-bgc-text font-medium">
                          {dayjs(startTimeISO).format('ddd DD MMM')}&nbsp;·&nbsp;
                          {fmt12(startHour)} – {dayjs(endTimeISO).format('h:mm A')}
                        </p>
                      </div>
                      <span className="font-heading text-2xl text-bgc-text">{duration}hr{duration > 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {slotError && (
                    <div className="mt-4 bg-bgc-error/10 border border-bgc-error/30 rounded-xl p-3 text-bgc-error text-sm flex items-center gap-2">
                      <AlertCircle size={15} /> {slotError}
                    </div>
                  )}

                  <div className="flex justify-end mt-6">
                    <button onClick={checkSlot} disabled={slotLoading}
                      className="btn-primary flex items-center gap-2 px-8">
                      {slotLoading
                        ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        : <> Show Availability <ChevronRight size={16} /> </>
                      }
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 2: Seat map ── */}
              {step === 2 && slotData && (
                <div className="animate-slide-up">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="font-heading text-3xl text-bgc-text">Pick Your Stations</h2>
                    <button onClick={() => setStep(1)} className="btn-ghost flex items-center gap-1 text-sm">
                      <ChevronLeft size={15} /> Change Slot
                    </button>
                  </div>
                  <p className="text-bgc-muted text-sm mb-6">
                    {dayjs(startTimeISO).format('ddd DD MMM, h:mm A')} – {dayjs(endTimeISO).format('h:mm A')} · {duration}hr{duration > 1 ? 's' : ''}
                    &nbsp;·&nbsp; <span style={{ color: '#00ff88' }}>Tap to select multiple</span>
                  </p>

                  {(['pc', 'playstation', 'pool']).map(type => (
                    grouped[type].length > 0 && (
                      <SeatSection
                        key={type}
                        type={type}
                        stations={grouped[type]}
                        selected={selected}
                        onToggle={toggleStation}
                      />
                    )
                  ))}

                  {/* Floating bottom bar */}
                  {selected.size > 0 && (
                    <div className="sticky bottom-4 mt-6">
                      <div className="bg-bgc-surface border border-bgc-border rounded-2xl shadow-card p-4 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap gap-1.5 mb-1">
                            {selectedStations.map(s => (
                              <span key={s.id} style={{
                                background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)',
                                borderRadius: 6, padding: '2px 8px',
                                fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, color: '#00ff88', letterSpacing: '0.04em',
                              }}>
                                {s.name}
                              </span>
                            ))}
                          </div>
                          <p className="text-bgc-muted text-xs">
                            {selected.size} station{selected.size > 1 ? 's' : ''} · Total ₹{subtotal} · Deposit ₹{Math.ceil(subtotal * 0.5)}
                          </p>
                        </div>
                        <button onClick={() => { setError(''); setStep(3) }}
                          className="btn-primary flex items-center gap-2 whitespace-nowrap">
                          Continue <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  {selected.size === 0 && (
                    <p className="text-center text-bgc-muted text-sm mt-4" style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.05em' }}>
                      TAP ANY GREEN STATION TO SELECT IT
                    </p>
                  )}
                </div>
              )}

              {/* ── Step 3: Confirm ── */}
              {step === 3 && (
                <div className="animate-slide-up">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="font-heading text-3xl text-bgc-text">Confirm & Pay</h2>
                    <button onClick={() => setStep(2)} className="btn-ghost flex items-center gap-1 text-sm">
                      <ChevronLeft size={15} /> Edit Selection
                    </button>
                  </div>
                  <p className="text-bgc-muted text-sm mb-6">Review your booking before confirming.</p>

                  {/* Booking summary */}
                  <div className="card mb-4">
                    <h3 className="text-bgc-muted text-xs font-semibold uppercase tracking-wider mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>Booking Summary</h3>
                    <div className="space-y-2 mb-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-bgc-muted">Date & Time</span>
                        <span className="text-bgc-text font-medium">
                          {dayjs(startTimeISO).format('DD MMM YYYY')}, {fmt12(startHour)} – {dayjs(endTimeISO).format('h:mm A')}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-bgc-muted">Duration</span>
                        <span className="text-bgc-text font-medium">{duration}hr{duration > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <div className="border-t border-bgc-border pt-3 space-y-1.5">
                      {selectedStations.map(s => (
                        <div key={s.id} className="flex justify-between text-sm">
                          <span className="text-bgc-text">{s.name}</span>
                          <span className="text-bgc-muted">₹{s.hourly_rate * duration}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment method */}
                  <div className="card mb-4">
                    <h3 className="text-bgc-muted text-xs font-semibold uppercase tracking-wider mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>Payment Method</h3>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <button onClick={() => setPaymentMethod('wallet')}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          paymentMethod === 'wallet' ? 'border-bgc-pink bg-bgc-pink/10 ring-1 ring-bgc-pink/30' : 'border-bgc-border bg-bgc-elevated hover:border-bgc-pink/20'
                        }`}>
                        <Wallet size={20} className="text-bgc-pink mb-2" />
                        <p className="font-semibold text-bgc-text text-sm">BGC Wallet</p>
                        <p className="text-bgc-muted text-xs mt-1">Balance: ₹{wallet?.wallet_balance?.toFixed(2) || '—'}</p>
                      </button>
                      <button onClick={() => setPaymentMethod('cash')}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          paymentMethod === 'cash' ? 'border-bgc-success bg-bgc-success/10 ring-1 ring-bgc-success/30' : 'border-bgc-border bg-bgc-elevated hover:border-bgc-success/20'
                        }`}>
                        <Coins size={20} className="text-bgc-success mb-2" />
                        <p className="font-semibold text-bgc-text text-sm">Cash at Counter</p>
                        <p className="text-bgc-muted text-xs mt-1">Pay when you arrive</p>
                      </button>
                    </div>

                    {/* Order total */}
                    <div className="bg-bgc-elevated rounded-xl p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-bgc-muted">Subtotal ({selected.size} station{selected.size > 1 ? 's' : ''})</span>
                        <span className="text-bgc-text">₹{subtotal}</span>
                      </div>
                      {discountData && (
                        <div className="flex justify-between text-bgc-pink">
                          <span>Discount <span className="font-mono text-xs">({discountCode})</span></span>
                          <span className="font-bold">− ₹{discountAmount}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold border-t border-bgc-border pt-2">
                        <span className="text-bgc-muted">Total</span>
                        <span className="text-bgc-text">₹{total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-bgc-muted">Deposit due now (50%)</span>
                        <span className="text-bgc-pink font-bold">₹{deposit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-bgc-muted">Final (2hrs before slot)</span>
                        <span className="text-bgc-text">₹{finalAmt}</span>
                      </div>
                      {paymentMethod === 'wallet' && (
                        <div className="flex justify-between border-t border-bgc-border pt-2">
                          <span className="text-bgc-muted">Wallet after deposit</span>
                          <span className={`font-bold ${(wallet?.wallet_balance || 0) < deposit ? 'text-bgc-error' : 'text-bgc-success'}`}>
                            ₹{((wallet?.wallet_balance || 0) - deposit).toFixed(2)}
                          </span>
                        </div>
                      )}
                      {paymentMethod === 'wallet' && (wallet?.wallet_balance || 0) < deposit && (
                        <div className="flex items-center gap-2 text-bgc-error text-xs">
                          <AlertCircle size={13} />
                          Insufficient balance. <a href="/dashboard" className="underline">Top up wallet</a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Discount code */}
                  <div className="card mb-4">
                    <h3 className="text-bgc-muted text-xs font-semibold uppercase tracking-wider mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>Discount Code</h3>
                    {discountData ? (
                      <div className="flex items-center justify-between bg-bgc-elevated rounded-xl px-4 py-3 border border-bgc-pink/30">
                        <div className="flex items-center gap-2">
                          <Check size={14} className="text-bgc-success" />
                          <span className="font-mono text-bgc-pink text-sm font-bold">{discountCode}</span>
                          <span className="text-xs" style={{ color: '#00ff88', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
                            − ₹{discountAmount}
                          </span>
                        </div>
                        <button onClick={() => { setDiscountData(null); setDiscountCode(''); setDiscountInput('') }}
                          className="text-bgc-muted hover:text-bgc-error transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="flex gap-2">
                          <input className="input flex-1 font-mono tracking-widest uppercase text-sm"
                            placeholder="ENTER CODE"
                            value={discountInput}
                            onChange={e => { setDiscountInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setDiscountError('') }}
                            onKeyDown={e => e.key === 'Enter' && applyDiscount()}
                            disabled={discountLoading} />
                          <button onClick={applyDiscount} disabled={discountLoading || !discountInput.trim()}
                            className="px-4 py-2 rounded-lg border border-bgc-pink text-bgc-pink text-sm font-bold transition-colors hover:bg-bgc-pink/10 disabled:opacity-50"
                            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
                            {discountLoading ? <div className="w-4 h-4 border-2 border-bgc-pink/30 border-t-bgc-pink rounded-full animate-spin" /> : 'APPLY'}
                          </button>
                        </div>
                        {discountError && <p className="text-xs mt-1.5 text-bgc-error">{discountError}</p>}
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="bg-bgc-error/10 border border-bgc-error/30 rounded-xl p-3 text-bgc-error text-sm flex items-center gap-2 mb-4">
                      <AlertCircle size={15} /> {error}
                    </div>
                  )}

                  <button onClick={handleConfirm}
                    disabled={loading || selected.size === 0 || (paymentMethod === 'wallet' && (wallet?.wallet_balance || 0) < deposit)}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base">
                    {loading
                      ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      : <><Check size={18} /> Confirm {selected.size} Station{selected.size > 1 ? 's' : ''} · Pay ₹{deposit}</>
                    }
                  </button>
                </div>
              )}
            </div>

            {/* ── Right: sidebar ── */}
            <BookSidebar wallet={wallet} />

          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

function BookSidebar({ wallet }) {
  const today = new Date().getDay()
  return (
    <div className="sticky top-24 space-y-4">
      <div className="bg-bgc-surface border border-bgc-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-bgc-border bg-bgc-elevated">
          <p className="text-xs font-semibold tracking-widest uppercase text-bgc-muted" style={{ fontFamily: 'Inter, sans-serif' }}>How It Works</p>
        </div>
        {[
          { icon: '🎯', text: 'Pick your slot & select any stations you want' },
          { icon: '✅', text: 'Book multiple stations — PCs, PS5, Pool in one go' },
          { icon: '💳', text: 'Pay 50% deposit now, rest 2 hrs before your slot' },
          { icon: '⚡', text: 'Earn 1 BGC Point per ₹1 spent' },
        ].map((row, i, arr) => (
          <div key={row.text} className={`flex items-start gap-3 px-5 py-3.5 ${i < arr.length - 1 ? 'border-b border-bgc-border/60' : ''}`}>
            <span className="text-base shrink-0 w-6 text-center mt-0.5">{row.icon}</span>
            <span className="text-bgc-text text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>{row.text}</span>
          </div>
        ))}
      </div>

      {wallet && (
        <div className="bg-bgc-surface border border-bgc-border rounded-xl px-5 py-4">
          <p className="text-xs font-semibold tracking-widest uppercase text-bgc-muted mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>Your Wallet</p>
          <p className="font-heading text-3xl text-bgc-text">₹{wallet.wallet_balance?.toFixed(2)}</p>
          <p className="text-bgc-muted text-xs mt-1">{wallet.points} BGC Points</p>
          <a href="/dashboard" className="text-bgc-pink text-xs underline mt-2 inline-block">Top up →</a>
        </div>
      )}

      <div className="bg-bgc-surface border border-bgc-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-bgc-border bg-bgc-elevated">
          <p className="text-xs font-semibold tracking-widest uppercase text-bgc-muted" style={{ fontFamily: 'Inter, sans-serif' }}>Opening Hours</p>
        </div>
        {[{ label: 'Mon – Sun', hours: '10:00 AM – 11:00 PM' }].map(row => (
          <div key={row.label} className="flex items-center justify-between px-5 py-3.5">
            <span className="text-bgc-muted text-sm" style={{ fontFamily: "'Courier New', monospace" }}>{row.label}</span>
            <span className="text-bgc-text text-xs" style={{ fontFamily: "'Courier New', monospace" }}>{row.hours}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
