import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Monitor, Gamepad2, Circle, ChevronRight, ChevronLeft, Check, Wallet, Coins, AlertCircle } from 'lucide-react'
import dayjs from 'dayjs'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

const TYPE_CONFIG = {
  pc:          { label: 'Gaming PC',     icon: Monitor,  color: 'text-bgc-neonB', bg: 'bg-bgc-purp/20',    border: 'border-bgc-purp/30',    rate: 50 },
  playstation: { label: 'PlayStation 5', icon: Gamepad2, color: 'text-bgc-pink',  bg: 'bg-bgc-pink/10',    border: 'border-bgc-pink/20',    rate: 150 },
  pool:        { label: 'Pool Table',    icon: Circle,   color: 'text-bgc-neonB', bg: 'bg-bgc-magenta/15', border: 'border-bgc-magenta/25', rate: 450 },
}

const HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]
const DURATIONS = [1, 1.5, 2, 2.5, 3, 4, 5, 6]

export default function Book() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [stationType, setStationType] = useState('')
  const [date, setDate] = useState(dayjs().add(1, 'day').format('YYYY-MM-DD'))
  const [startHour, setStartHour] = useState(14)
  const [duration, setDuration] = useState(2)
  const [paymentMethod, setPaymentMethod] = useState('wallet')
  const [availableStations, setAvailableStations] = useState([])
  const [selectedStation, setSelectedStation] = useState(null)
  const [wallet, setWallet] = useState(null)
  const [loading, setLoading] = useState(false)
  const [availLoading, setAvailLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [createdBooking, setCreatedBooking] = useState(null)
  // Discount state
  const [discountCode, setDiscountCode] = useState('')
  const [discountInput, setDiscountInput] = useState('')
  const [discountData, setDiscountData] = useState(null) // { discount, discountAmount, finalTotal }
  const [discountLoading, setDiscountLoading] = useState(false)
  const [discountError, setDiscountError] = useState('')

  useEffect(() => {
    api.get('/wallet').then(r => setWallet(r.data)).catch(() => {})
  }, [])

  const startTime = `${date}T${String(startHour).padStart(2, '0')}:00`
  const endTime = dayjs(startTime).add(duration, 'hour').format('YYYY-MM-DDTHH:mm')
  const subtotal = (TYPE_CONFIG[stationType]?.rate || 0) * duration
  const discountAmount = discountData ? discountData.discountAmount : 0
  const total = subtotal - discountAmount
  const deposit = Math.ceil(total * 0.5)
  const finalAmt = total - deposit

  const checkAvailability = async () => {
    setAvailLoading(true)
    setError('')
    setSelectedStation(null)
    try {
      const res = await api.get('/stations/availability', {
        params: { type: stationType, date, start_time: `${String(startHour).padStart(2, '0')}:00`, duration }
      })
      setAvailableStations(res.data.available)
      if (res.data.available.length === 0) {
        setError('No stations available for this time slot. Please try a different time.')
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Could not check availability')
    } finally {
      setAvailLoading(false)
    }
  }

  const applyDiscount = async () => {
    if (!discountInput.trim()) return
    setDiscountLoading(true)
    setDiscountError('')
    try {
      const res = await api.post('/discounts/validate', {
        code: discountInput.trim(),
        station_type: stationType,
        subtotal,
      })
      setDiscountData(res.data)
      setDiscountCode(discountInput.trim().toUpperCase())
    } catch (e) {
      setDiscountError(e.response?.data?.error || 'Invalid code')
      setDiscountData(null)
      setDiscountCode('')
    } finally {
      setDiscountLoading(false)
    }
  }

  const removeDiscount = () => {
    setDiscountData(null)
    setDiscountCode('')
    setDiscountInput('')
    setDiscountError('')
  }

  const handleConfirm = async () => {
    if (!selectedStation) { setError('Please select a station'); return }
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/bookings', {
        station_id: selectedStation.id,
        start_time: startTime,
        duration_hours: duration,
        payment_method: paymentMethod,
        discount_code: discountCode || undefined,
      })
      setCreatedBooking(res.data.booking)
      setSuccess(true)
      refreshUser()
      api.get('/wallet').then(r => setWallet(r.data)).catch(() => {})
    } catch (e) {
      setError(e.response?.data?.error || 'Booking failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD')
  const maxDate = dayjs().add(30, 'day').format('YYYY-MM-DD')

  if (success && createdBooking) {
    return (
      <div className="min-h-screen flex flex-col bg-bgc-base">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6 pt-24">
          <div className="max-w-md w-full text-center animate-slide-up">
            <div className="w-20 h-20 rounded-full bg-bgc-success/15 border border-bgc-success/30 flex items-center justify-center mx-auto mb-6">
              <Check size={36} className="text-bgc-success" />
            </div>
            <h2 className="font-heading text-3xl font-bold text-bgc-text mb-2">Booking Confirmed!</h2>
            <p className="text-bgc-muted mb-6">Your slot has been locked. See you at BGC!</p>
            <div className="card text-left mb-6">
              <div className="space-y-3">
                {[
                  ['Station', createdBooking.station_name],
                  ['Date', dayjs(createdBooking.start_time).format('DD MMM YYYY')],
                  ['Time', `${dayjs(createdBooking.start_time).format('h:mm A')} – ${dayjs(createdBooking.end_time).format('h:mm A')}`],
                  ['Duration', `${createdBooking.duration_hours}hr${createdBooking.duration_hours > 1 ? 's' : ''}`],
                  ['Deposit Paid', `₹${createdBooking.deposit_amount}`],
                  ['Final Due', createdBooking.payment_method === 'wallet' ? `₹${createdBooking.final_amount} (2hrs before)` : 'Pay at counter'],
                  ['Status', createdBooking.status],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-bgc-muted">{k}</span>
                    <span className="text-bgc-text font-medium capitalize">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setSuccess(false); setStep(1); setStationType(''); setSelectedStation(null) }}
                className="btn-outline flex-1">Book Another</button>
              <button onClick={() => navigate('/dashboard')} className="btn-primary flex-1">My Bookings</button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-bgc-base">
      <Navbar />
      <div className="flex-1 pt-20 pb-16">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 items-start pt-6">
          {/* ── Left column: booking wizard ── */}
          <div>
          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {['Station Type', 'Date & Time', 'Choose Station', 'Confirm'].map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step > i + 1 ? 'bg-bgc-success text-white' : step === i + 1 ? 'bg-gradient-pink text-white shadow-pink-sm' : 'bg-bgc-elevated border border-bgc-border text-bgc-muted'
                  }`}>
                    {step > i + 1 ? <Check size={14} /> : i + 1}
                  </div>
                  <span className={`text-xs hidden sm:block ${step === i + 1 ? 'text-bgc-pink' : 'text-bgc-muted'}`}>{label}</span>
                </div>
                {i < 3 && <div className={`w-8 sm:w-16 h-px mb-5 ${step > i + 1 ? 'bg-bgc-success' : 'bg-bgc-border'}`} />}
              </div>
            ))}
          </div>

          {/* Step 1: Choose type */}
          {step === 1 && (
            <div className="animate-slide-up">
              <h2 className="font-heading text-2xl font-bold text-bgc-text mb-2">Choose Station Type</h2>
              <p className="text-bgc-muted text-sm mb-6">Pick what you want to play today.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
                  const Icon = cfg.icon
                  return (
                    <button key={type} onClick={() => setStationType(type)}
                      className={`p-6 rounded-xl border text-left transition-all ${
                        stationType === type
                          ? `${cfg.border} ${cfg.bg} ring-1 ring-offset-0 ring-bgc-pink/40 shadow-pink-sm`
                          : 'border-bgc-border bg-bgc-surface hover:border-bgc-pink/20 hover:bg-bgc-elevated'
                      }`}>
                      <Icon size={28} className={`${cfg.color} mb-3`} />
                      <h3 className="font-heading text-lg font-bold text-bgc-text">{cfg.label}</h3>
                      <p className="text-bgc-muted text-sm mt-1">₹{cfg.rate}/hr</p>
                    </button>
                  )
                })}
              </div>
              <div className="flex justify-end mt-6">
                <button disabled={!stationType} onClick={() => setStep(2)} className="btn-primary flex items-center gap-2">
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Date & Time */}
          {step === 2 && (
            <div className="animate-slide-up">
              <h2 className="font-heading text-2xl font-bold text-bgc-text mb-2">Pick Date & Time</h2>
              <p className="text-bgc-muted text-sm mb-6">Cafe is open 10 AM – 11 PM daily.</p>
              <div className="card space-y-5">
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input" value={date} min={tomorrow} max={maxDate}
                    onChange={e => setDate(e.target.value)} />
                </div>
                <div>
                  <label className="label">Start Time</label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {HOURS.map(h => (
                      <button key={h} onClick={() => setStartHour(h)}
                        className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                          startHour === h ? 'bg-gradient-pink text-white shadow-pink-sm' : 'bg-bgc-elevated border border-bgc-border text-bgc-muted hover:text-bgc-text hover:border-bgc-pink/30'
                        }`}>
                        {h > 12 ? `${h - 12} PM` : h === 12 ? '12 PM' : `${h} AM`}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Duration</label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {DURATIONS.map(d => (
                      <button key={d} onClick={() => setDuration(d)}
                        className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                          duration === d ? 'bg-gradient-pink text-white shadow-pink-sm' : 'bg-bgc-elevated border border-bgc-border text-bgc-muted hover:text-bgc-text hover:border-bgc-pink/30'
                        }`}>
                        {d}hr{d > 1 ? 's' : ''}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-bgc-elevated rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-bgc-muted">Slot</span>
                    <span className="text-bgc-text font-medium">{dayjs(startTime).format('DD MMM, h:mm A')} – {dayjs(endTime).format('h:mm A')}</span></div>
                  <div className="flex justify-between"><span className="text-bgc-muted">Total Cost</span>
                    <span className="font-heading text-lg text-bgc-text font-bold">₹{subtotal}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-bgc-muted">Deposit now (50%)</span>
                    <span className="text-bgc-pink font-semibold">₹{Math.ceil(subtotal * 0.5)}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-bgc-muted">Final payment (2hrs before)</span>
                    <span className="text-bgc-muted">₹{subtotal - Math.ceil(subtotal * 0.5)}</span></div>
                </div>
              </div>
              <div className="flex gap-3 mt-6 justify-between">
                <button onClick={() => setStep(1)} className="btn-ghost flex items-center gap-1"><ChevronLeft size={16} /> Back</button>
                <button onClick={() => { setStep(3); checkAvailability() }} className="btn-primary flex items-center gap-2">
                  Check Availability <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Choose station */}
          {step === 3 && (
            <div className="animate-slide-up">
              <h2 className="font-heading text-2xl font-bold text-bgc-text mb-2">Select Station</h2>
              <p className="text-bgc-muted text-sm mb-6">
                Available {TYPE_CONFIG[stationType]?.label} stations for {dayjs(startTime).format('DD MMM, h:mm A')}
              </p>
              {availLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 rounded-full border-2 border-bgc-border border-t-bgc-pink animate-spin" />
                </div>
              ) : error ? (
                <div className="bg-bgc-error/10 border border-bgc-error/30 rounded-xl p-4 text-bgc-error text-sm flex items-center gap-2">
                  <AlertCircle size={16} /> {error}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {availableStations.map(s => {
                    const cfg = TYPE_CONFIG[s.type]
                    return (
                      <button key={s.id} onClick={() => setSelectedStation(s)}
                        className={`p-4 rounded-xl border text-center transition-all ${
                          selectedStation?.id === s.id
                            ? 'border-bgc-pink bg-bgc-pink/10 ring-1 ring-bgc-pink/40 shadow-pink-sm'
                            : 'border-bgc-border bg-bgc-surface hover:border-bgc-pink/20'
                        }`}>
                        <p className={`font-heading text-base font-bold ${cfg.color}`}>{s.name}</p>
                        <p className="text-bgc-muted text-xs mt-1">Available</p>
                        {selectedStation?.id === s.id && (
                          <div className="mt-2 flex justify-center">
                            <Check size={14} className="text-bgc-pink" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
              <div className="flex gap-3 mt-6 justify-between">
                <button onClick={() => setStep(2)} className="btn-ghost flex items-center gap-1"><ChevronLeft size={16} /> Back</button>
                <button disabled={!selectedStation} onClick={() => { setError(''); setStep(4) }}
                  className="btn-primary flex items-center gap-2">
                  Continue <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 4 && (
            <div className="animate-slide-up">
              <h2 className="font-heading text-2xl font-bold text-bgc-text mb-2">Confirm Booking</h2>
              <p className="text-bgc-muted text-sm mb-6">Review your booking details before paying.</p>

              <div className="card mb-4">
                <h3 className="font-semibold text-bgc-text text-sm mb-3">Booking Summary</h3>
                <div className="space-y-2.5 text-sm">
                  {[
                    ['Station', selectedStation?.name],
                    ['Type', TYPE_CONFIG[stationType]?.label],
                    ['Date', dayjs(startTime).format('dddd, DD MMM YYYY')],
                    ['Time', `${dayjs(startTime).format('h:mm A')} – ${dayjs(endTime).format('h:mm A')}`],
                    ['Duration', `${duration} hour${duration > 1 ? 's' : ''}`],
                    ['Total Amount', `₹${total}`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-bgc-muted">{k}</span>
                      <span className="text-bgc-text font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment method */}
              <div className="card mb-4">
                <h3 className="font-semibold text-bgc-text text-sm mb-3">Payment Method</h3>
                <div className="grid grid-cols-2 gap-3">
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

                {paymentMethod === 'wallet' && (
                  <div className="mt-4 bg-bgc-elevated rounded-xl p-4 space-y-2 text-sm">
                    {/* Order summary */}
                    <div className="flex justify-between">
                      <span className="text-bgc-muted">Subtotal</span>
                      <span className="text-bgc-text">₹{subtotal}</span>
                    </div>
                    {discountData && (
                      <div className="flex justify-between text-bgc-pink">
                        <span className="flex items-center gap-1">
                          Discount
                          <span className="font-mono text-xs">({discountCode})</span>
                        </span>
                        <span className="font-bold">− ₹{discountAmount}</span>
                      </div>
                    )}
                    <div className="border-t border-bgc-border pt-2 flex justify-between font-bold">
                      <span className="text-bgc-muted">Total</span>
                      <span className="text-bgc-text">₹{total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-bgc-muted">Deposit due now (50%)</span>
                      <span className="text-bgc-pink font-bold">₹{deposit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-bgc-muted">Final payment (2hrs before slot)</span>
                      <span className="text-bgc-text font-medium">₹{finalAmt}</span>
                    </div>
                    <div className="flex justify-between border-t border-bgc-border pt-2">
                      <span className="text-bgc-muted">Wallet after deposit</span>
                      <span className={`font-bold ${(wallet?.wallet_balance || 0) < deposit ? 'text-bgc-error' : 'text-bgc-success'}`}>
                        ₹{((wallet?.wallet_balance || 0) - deposit).toFixed(2)}
                      </span>
                    </div>
                    {(wallet?.wallet_balance || 0) < deposit && (
                      <div className="flex items-center gap-2 text-bgc-error text-xs mt-2">
                        <AlertCircle size={13} />
                        Insufficient balance. <a href="/dashboard" className="underline">Top up wallet</a>
                      </div>
                    )}
                  </div>
                )}

                {paymentMethod === 'cash' && (
                  <div className="mt-3 bg-bgc-success/5 border border-bgc-success/20 rounded-xl p-3 text-bgc-muted text-xs">
                    Your booking will be held as <strong>Pending Cash</strong>. An admin will confirm it when you arrive.
                  </div>
                )}
              </div>

              {/* Discount code input */}
              <div className="card mb-4">
                <h3 className="font-semibold text-bgc-text text-sm mb-3">Discount Code</h3>
                {discountData ? (
                  <div>
                    <div className="flex items-center justify-between bg-bgc-elevated rounded-xl px-4 py-3 border border-bgc-pink/30">
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-bgc-success" />
                        <span className="font-mono text-bgc-pink text-sm font-bold">{discountCode}</span>
                        <span className="text-xs" style={{ color: '#00ff88', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
                          applied — you save ₹{discountAmount}
                        </span>
                      </div>
                      <button onClick={removeDiscount} className="text-bgc-muted hover:text-bgc-error text-xs underline transition-colors">
                        REMOVE
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input
                        className="input flex-1 font-mono tracking-widest uppercase text-sm"
                        style={{ borderColor: discountError ? 'rgba(255,45,85,0.5)' : undefined }}
                        placeholder="ENTER CODE"
                        value={discountInput}
                        onChange={e => {
                          setDiscountInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                          setDiscountError('')
                        }}
                        onKeyDown={e => e.key === 'Enter' && applyDiscount()}
                        disabled={discountLoading}
                      />
                      <button
                        onClick={applyDiscount}
                        disabled={discountLoading || !discountInput.trim()}
                        className="px-4 py-2 rounded-lg border border-bgc-pink text-bgc-pink text-sm font-bold transition-colors hover:bg-bgc-pink/10 disabled:opacity-50"
                        style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {discountLoading
                          ? <div className="w-4 h-4 border-2 border-bgc-pink/30 border-t-bgc-pink rounded-full animate-spin" />
                          : 'APPLY'}
                      </button>
                    </div>
                    {discountError && (
                      <p className="text-xs mt-1.5" style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--neon-r, #ff2d55)' }}>
                        {discountError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-bgc-error/10 border border-bgc-error/30 rounded-xl p-3 text-bgc-error text-sm flex items-center gap-2 mb-4">
                  <AlertCircle size={15} /> {error}
                </div>
              )}

              <div className="flex gap-3 justify-between">
                <button onClick={() => setStep(3)} className="btn-ghost flex items-center gap-1"><ChevronLeft size={16} /> Back</button>
                <button onClick={handleConfirm} disabled={loading || (paymentMethod === 'wallet' && (wallet?.wallet_balance || 0) < deposit)}
                  className="btn-primary flex items-center gap-2 px-8">
                  {loading ? (
                    <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <><Check size={16} /> Confirm & Pay</>
                  )}
                </button>
              </div>
            </div>
          )}
          </div>{/* end wizard left col */}

          {/* ── Right column: info sidebar ── */}
          <BookSidebar />

        </div>{/* end grid */}
        </div>{/* end max-w container */}
      </div>
      <Footer />
    </div>
  )
}

function BookSidebar() {
  const today = new Date().getDay() // 0=Sun, 6=Sat
  const days = [
    { label: 'Mon – Fri', days: [1,2,3,4,5], hours: '10:00 AM – 11:00 PM' },
    { label: 'Sat – Sun', days: [0,6],       hours: '10:00 AM – 11:00 PM' },
  ]

  return (
    <div className="sticky top-24 space-y-4">
      {/* Why book online */}
      <div className="bg-bgc-surface border border-bgc-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-bgc-border bg-bgc-elevated">
          <p className="text-xs font-semibold tracking-widest uppercase text-bgc-muted" style={{ fontFamily: 'Inter, sans-serif' }}>
            Why Book Online?
          </p>
        </div>
        {[
          { icon: '⚡', text: 'Guaranteed rig — no walk-in queue' },
          { icon: '🎯', text: 'Choose your exact setup' },
          { icon: '💳', text: 'Pay 50% now, rest 2 hrs before' },
        ].map((row, i, arr) => (
          <div key={row.text}
            className={`flex items-center gap-3 px-5 py-3.5 ${i < arr.length - 1 ? 'border-b border-bgc-border/60' : ''}`}>
            <span className="text-base shrink-0 w-6 text-center">{row.icon}</span>
            <span className="text-bgc-text text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>{row.text}</span>
          </div>
        ))}
      </div>

      {/* Opening hours */}
      <div className="bg-bgc-surface border border-bgc-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-bgc-border bg-bgc-elevated">
          <p className="text-xs font-semibold tracking-widest uppercase text-bgc-muted" style={{ fontFamily: 'Inter, sans-serif' }}>
            Opening Hours
          </p>
        </div>
        {days.map(row => {
          const isToday = row.days.includes(today)
          return (
            <div key={row.label}
              className={`flex items-center justify-between px-5 py-3.5 border-b border-bgc-border/60 last:border-0 ${isToday ? 'bg-bgc-pink/5' : ''}`}>
              <div className="flex items-center gap-2">
                <span className="text-bgc-muted text-sm" style={{ fontFamily: "'Courier New', monospace" }}>{row.label}</span>
                {isToday && (
                  <span className="badge-pink text-xs px-1.5 py-0.5">TODAY</span>
                )}
              </div>
              <span className="text-bgc-text text-xs" style={{ fontFamily: "'Courier New', monospace" }}>{row.hours}</span>
            </div>
          )
        })}
      </div>

      {/* Points reminder */}
      <div className="bg-bgc-pink/8 border border-bgc-pink/20 rounded-xl px-5 py-4 flex items-start gap-3">
        <span className="text-bgc-pink text-base mt-0.5">⚡</span>
        <p className="text-bgc-muted text-xs leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
          Earn <span className="text-bgc-text font-semibold">1 BGC Point</span> for every ₹1 spent.
          100 pts = ₹10 wallet credit.
        </p>
      </div>
    </div>
  )
}
