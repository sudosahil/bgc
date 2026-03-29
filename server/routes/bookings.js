const express = require('express')
const crypto = require('crypto')
const { getDb, transaction, lastId } = require('../db/database')
const authMiddleware = require('../middleware/auth')
const { validateDiscount } = require('./discounts')
const email = require('../utils/email')
const { syncStationStatuses } = require('../jobs/bookingCron')
const { logActivity } = require('../utils/activityLogger')

const router = express.Router()
router.use(authMiddleware)

// POST /api/bookings
router.post('/', (req, res) => {
  const { station_id, start_time, duration_hours, payment_method = 'wallet', notes, discount_code } = req.body
  if (!station_id || !start_time || !duration_hours) {
    return res.status(400).json({ error: 'station_id, start_time, duration_hours are required' })
  }
  const dur = parseFloat(duration_hours)
  if (isNaN(dur) || dur < 1 || dur > 8) {
    return res.status(400).json({ error: 'Duration must be 1–8 hours' })
  }
  // Treat input as UTC if no timezone specified (append Z if needed)
  const timeStr = start_time.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(start_time) ? start_time : start_time + 'Z'
  const startDate = new Date(timeStr)
  if (isNaN(startDate.getTime()) || startDate <= new Date()) {
    return res.status(400).json({ error: 'start_time must be a valid future datetime' })
  }
  const endDate = new Date(startDate.getTime() + dur * 3600 * 1000)
  const startISO = startDate.toISOString().slice(0, 19)
  const endISO = endDate.toISOString().slice(0, 19)

  const db = getDb()
  const station = db.prepare('SELECT * FROM stations WHERE id = ? AND is_active = 1').get(station_id)
  if (!station) return res.status(404).json({ error: 'Station not found' })

  const conflict = db.prepare(`
    SELECT id FROM bookings
    WHERE station_id = ? AND status IN ('confirmed','pending_final','pending_cash')
    AND NOT (end_time <= ? OR start_time >= ?)
  `).get(station_id, startISO, endISO)
  if (conflict) return res.status(409).json({ error: 'Station is already booked for this time' })

  const walkinConflict = db.prepare(`
    SELECT id FROM walkins WHERE station_id = ?
    AND NOT (datetime(start_time, '+' || CAST(duration_hours AS TEXT) || ' hours') <= ? OR start_time >= ?)
  `).get(station_id, startISO, endISO)
  if (walkinConflict) return res.status(409).json({ error: 'Station is occupied (walk-in) during this time' })

  const subtotal = station.hourly_rate * dur

  // Validate discount if provided
  let discountData = null
  if (discount_code) {
    const result = validateDiscount(discount_code, station.type, subtotal, req.user.id, db)
    if (result.error) return res.status(422).json({ error: result.error, errorCode: result.errorCode })
    discountData = result
  }

  const discountAmount = discountData ? discountData.discountAmount : 0
  const total = subtotal - discountAmount
  const deposit = Math.ceil(total * 0.5)
  const final = total - deposit

  if (payment_method === 'wallet') {
    const currentUser = db.prepare('SELECT wallet_balance FROM users WHERE id = ?').get(req.user.id)
    if (currentUser.wallet_balance < deposit) {
      return res.status(402).json({ error: `Insufficient wallet balance. Need ₹${deposit}, have ₹${currentUser.wallet_balance}` })
    }
  }

  const bookingId = transaction(() => {
    const result = db.prepare(`
      INSERT INTO bookings (user_id, station_id, start_time, end_time, duration_hours,
        total_amount, deposit_amount, final_amount, payment_method, status, notes,
        deposit_paid, final_paid, discount_id, discount_amount, discount_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id, station_id, startISO, endISO, dur,
      total, deposit, final, payment_method,
      payment_method === 'wallet' ? 'confirmed' : 'pending_cash',
      notes || null,
      payment_method === 'wallet' ? 1 : 0, 0,
      discountData ? discountData.discount.id : null,
      discountAmount,
      discountData ? discountData.discount.code : null
    )
    const bId = lastId(result)
    if (payment_method === 'wallet') {
      db.prepare('UPDATE users SET wallet_balance = wallet_balance - ?, points = points + ? WHERE id = ?')
        .run(deposit, Math.floor(deposit), req.user.id)
      db.prepare(`INSERT INTO transactions (user_id, booking_id, amount, type, description) VALUES (?, ?, ?, 'deposit', ?)`)
        .run(req.user.id, bId, deposit, `Deposit for ${station.name} on ${startISO.slice(0, 10)}`)
    }
    // Record discount use
    if (discountData) {
      db.prepare('INSERT INTO discount_uses (discount_id, user_id, booking_id) VALUES (?, ?, ?)').run(discountData.discount.id, req.user.id, bId)
      db.prepare('UPDATE discounts SET uses_so_far = uses_so_far + 1 WHERE id = ?').run(discountData.discount.id)
    }
    return bId
  })

  const booking = db.prepare(`
    SELECT b.*, s.name as station_name, s.type as station_type, s.hourly_rate
    FROM bookings b JOIN stations s ON b.station_id = s.id WHERE b.id = ?
  `).get(bookingId)

  email.bookingConfirmed({ user: req.user, booking }).catch(() => {})
  try { syncStationStatuses() } catch (_) {}

  res.status(201).json({ booking })
})

// POST /api/bookings/multi — book multiple stations in one transaction
router.post('/multi', (req, res) => {
  const { station_ids, start_time, duration_hours, payment_method = 'wallet', discount_code } = req.body
  if (!station_ids || !Array.isArray(station_ids) || station_ids.length === 0) {
    return res.status(400).json({ error: 'station_ids array is required' })
  }
  if (station_ids.length > 10) return res.status(400).json({ error: 'Max 10 stations per booking' })
  if (!start_time || !duration_hours) return res.status(400).json({ error: 'start_time and duration_hours are required' })

  const dur = parseFloat(duration_hours)
  if (isNaN(dur) || dur < 1 || dur > 8) return res.status(400).json({ error: 'Duration must be 1–8 hours' })

  const timeStr = start_time.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(start_time) ? start_time : start_time + 'Z'
  const startDate = new Date(timeStr)
  if (isNaN(startDate.getTime()) || startDate <= new Date()) {
    return res.status(400).json({ error: 'start_time must be a valid future datetime' })
  }
  const endDate = new Date(startDate.getTime() + dur * 3600 * 1000)
  const startISO = startDate.toISOString().slice(0, 19)
  const endISO = endDate.toISOString().slice(0, 19)

  const db = getDb()

  // Validate all stations exist and are active
  const stations = station_ids.map(id => {
    const s = db.prepare('SELECT * FROM stations WHERE id = ? AND is_active = 1').get(id)
    if (!s) throw Object.assign(new Error(`Station ${id} not found`), { status: 404 })
    return s
  })

  // Check conflicts for each station
  for (const s of stations) {
    const conflict = db.prepare(`SELECT id FROM bookings
      WHERE station_id = ? AND status IN ('confirmed','pending_final','pending_cash')
      AND NOT (end_time <= ? OR start_time >= ?)`).get(s.id, startISO, endISO)
    if (conflict) return res.status(409).json({ error: `${s.name} is already booked for this time slot` })

    const wConflict = db.prepare(`SELECT id FROM walkins WHERE station_id = ?
      AND NOT (datetime(start_time,'+'||CAST(duration_hours AS TEXT)||' hours') <= ? OR start_time >= ?)`
    ).get(s.id, startISO, endISO)
    if (wConflict) return res.status(409).json({ error: `${s.name} is occupied (walk-in) during this time` })
  }

  // Calculate totals
  const subtotal = stations.reduce((sum, s) => sum + s.hourly_rate * dur, 0)

  // Validate discount (only ALL-type discounts apply to mixed bookings)
  let discountData = null
  if (discount_code) {
    const result = validateDiscount(discount_code, 'all', subtotal, req.user.id, db)
    if (result.error) return res.status(422).json({ error: result.error, errorCode: result.errorCode })
    discountData = result
  }

  const discountAmount = discountData ? discountData.discountAmount : 0
  const total = subtotal - discountAmount
  const deposit = Math.ceil(total * 0.5)
  const finalAmt = total - deposit

  if (payment_method === 'wallet') {
    const currentUser = db.prepare('SELECT wallet_balance FROM users WHERE id = ?').get(req.user.id)
    if (currentUser.wallet_balance < deposit) {
      return res.status(402).json({ error: `Insufficient wallet balance. Need ₹${deposit}, have ₹${currentUser.wallet_balance}` })
    }
  }

  // Per-station amounts (split evenly)
  const perStationTotal = parseFloat((total / stations.length).toFixed(2))
  const perStationDeposit = Math.ceil(perStationTotal * 0.5)
  const perStationFinal = perStationTotal - perStationDeposit

  const bookingIds = transaction(() => {
    const ids = []
    for (const s of stations) {
      const result = db.prepare(`INSERT INTO bookings
        (user_id, station_id, start_time, end_time, duration_hours,
         total_amount, deposit_amount, final_amount, payment_method, status, notes,
         deposit_paid, final_paid, discount_id, discount_amount, discount_code)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        req.user.id, s.id, startISO, endISO, dur,
        perStationTotal, perStationDeposit, perStationFinal,
        payment_method,
        payment_method === 'wallet' ? 'confirmed' : 'pending_cash',
        null,
        payment_method === 'wallet' ? 1 : 0, 0,
        discountData ? discountData.discount.id : null,
        discountAmount / stations.length,
        discountData ? discountData.discount.code : null
      )
      ids.push(Number(result.lastInsertRowid))
    }

    if (payment_method === 'wallet') {
      db.prepare('UPDATE users SET wallet_balance = wallet_balance - ?, points = points + ? WHERE id = ?')
        .run(deposit, Math.floor(deposit), req.user.id)
      db.prepare(`INSERT INTO transactions (user_id, amount, type, description) VALUES (?, ?, 'deposit', ?)`)
        .run(req.user.id, deposit, `Deposit for ${stations.length} station(s) on ${startISO.slice(0, 10)}`)
    }

    if (discountData) {
      db.prepare('INSERT INTO discount_uses (discount_id, user_id, booking_id) VALUES (?, ?, ?)').run(discountData.discount.id, req.user.id, ids[0])
      db.prepare('UPDATE discounts SET uses_so_far = uses_so_far + 1 WHERE id = ?').run(discountData.discount.id)
    }

    return ids
  })

  const bookings = bookingIds.map(id =>
    db.prepare(`SELECT b.*, s.name as station_name, s.type as station_type, s.hourly_rate
      FROM bookings b JOIN stations s ON b.station_id = s.id WHERE b.id = ?`).get(id)
  )

  try { syncStationStatuses() } catch (_) {}

  const stationNames = stations.map(s => s.name).join(', ')
  logActivity(db, {
    userId: req.user.id, userName: req.user.name, role: req.user.role,
    action: 'booking_created',
    details: `Booked ${stations.length} station(s): ${stationNames} on ${startISO.slice(0,10)} ${startISO.slice(11,16)} for ${dur}h`
  })

  res.status(201).json({ bookings, summary: { total, deposit, finalAmt, station_count: stations.length } })
})

// GET /api/bookings/my
router.get('/my', (req, res) => {
  const db = getDb()
  const bookings = db.prepare(`
    SELECT b.*, s.name as station_name, s.type as station_type, s.hourly_rate
    FROM bookings b JOIN stations s ON b.station_id = s.id
    WHERE b.user_id = ? ORDER BY b.start_time DESC
  `).all(req.user.id)
  res.json({ bookings })
})

// GET /api/bookings/:id
router.get('/:id', (req, res) => {
  const db = getDb()
  const booking = db.prepare(`
    SELECT b.*, s.name as station_name, s.type as station_type, s.hourly_rate
    FROM bookings b JOIN stations s ON b.station_id = s.id
    WHERE b.id = ? AND b.user_id = ?
  `).get(req.params.id, req.user.id)
  if (!booking) return res.status(404).json({ error: 'Booking not found' })
  res.json({ booking })
})

// POST /api/bookings/:id/pay-final
router.post('/:id/pay-final', (req, res) => {
  const db = getDb()
  const booking = db.prepare(`
    SELECT b.*, s.name as station_name FROM bookings b
    JOIN stations s ON b.station_id = s.id WHERE b.id = ? AND b.user_id = ?
  `).get(req.params.id, req.user.id)
  if (!booking) return res.status(404).json({ error: 'Booking not found' })
  if (booking.final_paid) return res.status(400).json({ error: 'Final payment already made' })
  if (!['confirmed', 'pending_final'].includes(booking.status)) {
    return res.status(400).json({ error: 'Cannot pay for this booking' })
  }
  if (booking.payment_method !== 'wallet') {
    return res.status(400).json({ error: 'Cash bookings are paid at the counter' })
  }
  const user = db.prepare('SELECT wallet_balance FROM users WHERE id = ?').get(req.user.id)
  if (user.wallet_balance < booking.final_amount) {
    return res.status(402).json({ error: `Insufficient balance. Need ₹${booking.final_amount}` })
  }
  transaction(() => {
    db.prepare("UPDATE bookings SET final_paid = 1, status = 'confirmed' WHERE id = ?").run(booking.id)
    db.prepare('UPDATE users SET wallet_balance = wallet_balance - ?, points = points + ? WHERE id = ?')
      .run(booking.final_amount, Math.floor(booking.final_amount), req.user.id)
    db.prepare(`INSERT INTO transactions (user_id, booking_id, amount, type, description) VALUES (?, ?, ?, 'final_payment', ?)`)
      .run(req.user.id, booking.id, booking.final_amount, `Final payment for ${booking.station_name}`)
  })
  const updated = db.prepare('SELECT b.*, s.name as station_name, s.type as station_type FROM bookings b JOIN stations s ON b.station_id = s.id WHERE b.id = ?').get(booking.id)
  res.json({ booking: updated })
})

// DELETE /api/bookings/:id
router.delete('/:id', (req, res) => {
  const db = getDb()
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!booking) return res.status(404).json({ error: 'Booking not found' })
  if (['cancelled', 'completed'].includes(booking.status)) {
    return res.status(400).json({ error: 'Cannot cancel this booking' })
  }
  if (new Date(booking.start_time) <= new Date()) {
    return res.status(400).json({ error: 'Cannot cancel a booking that has already started' })
  }
  transaction(() => {
    db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(booking.id)
    if (booking.payment_method === 'wallet' && booking.deposit_paid) {
      db.prepare('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?').run(booking.deposit_amount, req.user.id)
      db.prepare(`INSERT INTO transactions (user_id, booking_id, amount, type, description) VALUES (?, ?, ?, 'refund', ?)`)
        .run(req.user.id, booking.id, booking.deposit_amount, `Refund for cancelled booking #${booking.id}`)
    }
  })

  email.bookingCancelled({ user: req.user, booking }).catch(() => {})
  try { syncStationStatuses() } catch (_) {}
  logActivity(db, { userId: req.user.id, userName: req.user.name, role: req.user.role, action: 'booking_cancelled', details: `Cancelled booking #${booking.id} (${booking.start_time.slice(0,16)})` })

  res.json({ message: 'Booking cancelled. Deposit refunded to wallet.' })
})

// POST /api/bookings/razorpay/create — create a Razorpay order for the booking deposit
router.post('/razorpay/create', (req, res) => {
  const { station_ids, start_time, duration_hours, discount_code } = req.body
  if (!station_ids || !Array.isArray(station_ids) || station_ids.length === 0) {
    return res.status(400).json({ error: 'station_ids array is required' })
  }
  if (!start_time || !duration_hours) return res.status(400).json({ error: 'start_time and duration_hours are required' })

  const dur = parseFloat(duration_hours)
  if (isNaN(dur) || dur < 1 || dur > 8) return res.status(400).json({ error: 'Duration must be 1–8 hours' })

  const timeStr = start_time.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(start_time) ? start_time : start_time + 'Z'
  const startDate = new Date(timeStr)
  if (isNaN(startDate.getTime()) || startDate <= new Date()) {
    return res.status(400).json({ error: 'start_time must be a valid future datetime' })
  }
  const endDate = new Date(startDate.getTime() + dur * 3600 * 1000)
  const startISO = startDate.toISOString().slice(0, 19)
  const endISO = endDate.toISOString().slice(0, 19)

  const db = getDb()
  const stations = []
  for (const id of station_ids) {
    const s = db.prepare('SELECT * FROM stations WHERE id = ? AND is_active = 1').get(id)
    if (!s) return res.status(404).json({ error: `Station ${id} not found` })
    const conflict = db.prepare(`SELECT id FROM bookings
      WHERE station_id = ? AND status IN ('confirmed','pending_final','pending_cash')
      AND NOT (end_time <= ? OR start_time >= ?)`).get(s.id, startISO, endISO)
    if (conflict) return res.status(409).json({ error: `${s.name} is already booked for this slot` })
    stations.push(s)
  }

  const subtotal = stations.reduce((sum, s) => sum + s.hourly_rate * dur, 0)
  let discountData = null
  if (discount_code) {
    const result = validateDiscount(discount_code, 'all', subtotal, req.user.id, db)
    if (result.error) return res.status(422).json({ error: result.error })
    discountData = result
  }
  const discountAmount = discountData ? discountData.discountAmount : 0
  const total = subtotal - discountAmount
  const deposit = Math.ceil(total * 0.5)

  // Dev mode: bypass real Razorpay when keys are missing/invalid
  const isDev = process.env.NODE_ENV !== 'production'
  const hasKeys = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET

  if (!hasKeys) {
    if (!isDev) return res.status(500).json({ error: 'Payment service not configured' })
    // Return a mock order for local testing
    const mockOrderId = `order_DEV_${Date.now()}`
    db.prepare('INSERT INTO razorpay_orders (user_id, order_id, amount) VALUES (?, ?, ?)').run(req.user.id, mockOrderId, deposit)
    return res.json({ order: { id: mockOrderId, amount: deposit * 100, currency: 'INR' }, key_id: 'rzp_test_dev', deposit, total, subtotal, discountAmount, dev: true })
  }

  try {
    const Razorpay = require('razorpay')
    const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
    razorpay.orders.create({
      amount: Math.round(deposit * 100),
      currency: 'INR',
      receipt: `bgc_bk_${req.user.id}_${Date.now()}`,
      notes: { user_id: req.user.id, purpose: 'booking_deposit' },
    }, (err, order) => {
      if (err) {
        const msg = err?.error?.description || err?.message || 'Could not create payment order'
        return res.status(500).json({ error: msg, ...(isDev && { razorpay_error: err }) })
      }
      db.prepare('INSERT INTO razorpay_orders (user_id, order_id, amount) VALUES (?, ?, ?)').run(req.user.id, order.id, deposit)
      res.json({ order, key_id: process.env.RAZORPAY_KEY_ID, deposit, total, subtotal, discountAmount })
    })
  } catch (e) {
    res.status(500).json({ error: e.message || 'Payment service unavailable' })
  }
})

// POST /api/bookings/razorpay/verify — verify payment and create booking
router.post('/razorpay/verify', (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature,
          station_ids, start_time, duration_hours, discount_code, dev } = req.body
  if (!razorpay_order_id || !razorpay_payment_id) {
    return res.status(400).json({ error: 'Payment verification data incomplete' })
  }

  const isDev = process.env.NODE_ENV !== 'production'
  const isDevOrder = razorpay_order_id.startsWith('order_DEV_')

  // Skip signature verification for dev mock orders
  if (!isDevOrder || !isDev) {
    if (!razorpay_signature) return res.status(400).json({ error: 'Payment signature missing' })
    const expectedSig = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex')
    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed' })
    }
  }

  const db = getDb()
  const order = db.prepare('SELECT * FROM razorpay_orders WHERE order_id = ? AND user_id = ?').get(razorpay_order_id, req.user.id)
  if (!order || order.status === 'paid') return res.status(400).json({ error: 'Order not found or already processed' })

  const dur = parseFloat(duration_hours)
  const timeStr = start_time.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(start_time) ? start_time : start_time + 'Z'
  const startDate = new Date(timeStr)
  const endISO = new Date(startDate.getTime() + dur * 3600 * 1000).toISOString().slice(0, 19)
  const startISO = startDate.toISOString().slice(0, 19)

  const stations = station_ids.map(id => db.prepare('SELECT * FROM stations WHERE id = ? AND is_active = 1').get(id)).filter(Boolean)
  const subtotal = stations.reduce((sum, s) => sum + s.hourly_rate * dur, 0)
  let discountData = null
  if (discount_code) {
    const result = validateDiscount(discount_code, 'all', subtotal, req.user.id, db)
    if (!result.error) discountData = result
  }
  const discountAmount = discountData ? discountData.discountAmount : 0
  const total = subtotal - discountAmount
  const deposit = Math.ceil(total * 0.5)
  const finalAmt = total - deposit
  const perStationTotal = parseFloat((total / stations.length).toFixed(2))
  const perStationDeposit = Math.ceil(perStationTotal * 0.5)
  const perStationFinal = perStationTotal - perStationDeposit

  const bookingIds = transaction(() => {
    db.prepare("UPDATE razorpay_orders SET status = 'paid' WHERE order_id = ?").run(razorpay_order_id)
    const ids = []
    for (const s of stations) {
      const result = db.prepare(`INSERT INTO bookings
        (user_id, station_id, start_time, end_time, duration_hours,
         total_amount, deposit_amount, final_amount, payment_method, status,
         deposit_paid, final_paid, discount_id, discount_amount, discount_code,
         razorpay_payment_id, razorpay_order_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'wallet', 'confirmed', 1, 0, ?, ?, ?, ?, ?)`
      ).run(
        req.user.id, s.id, startISO, endISO, dur,
        perStationTotal, perStationDeposit, perStationFinal,
        discountData ? discountData.discount.id : null,
        discountAmount / stations.length,
        discountData ? discountData.discount.code : null,
        razorpay_payment_id, razorpay_order_id
      )
      ids.push(Number(result.lastInsertRowid))
    }
    db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(Math.floor(deposit), req.user.id)
    db.prepare(`INSERT INTO transactions (user_id, amount, type, description, razorpay_payment_id, razorpay_order_id)
      VALUES (?, ?, 'deposit', ?, ?, ?)`)
      .run(req.user.id, deposit, `Deposit for ${stations.length} station(s) on ${startISO.slice(0, 10)}`, razorpay_payment_id, razorpay_order_id)
    if (discountData) {
      db.prepare('INSERT INTO discount_uses (discount_id, user_id, booking_id) VALUES (?, ?, ?)').run(discountData.discount.id, req.user.id, ids[0])
      db.prepare('UPDATE discounts SET uses_so_far = uses_so_far + 1 WHERE id = ?').run(discountData.discount.id)
    }
    return ids
  })

  const bookings = bookingIds.map(id =>
    db.prepare(`SELECT b.*, s.name as station_name, s.type as station_type, s.hourly_rate
      FROM bookings b JOIN stations s ON b.station_id = s.id WHERE b.id = ?`).get(id)
  )
  try { syncStationStatuses() } catch (_) {}
  res.status(201).json({ bookings, summary: { total, deposit, finalAmt, station_count: stations.length } })
})

module.exports = router
