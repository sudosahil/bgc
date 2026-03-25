const express = require('express')
const { getDb, transaction, lastId } = require('../db/database')
const authMiddleware = require('../middleware/auth')
const { validateDiscount } = require('./discounts')
const email = require('../utils/email')

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

  res.status(201).json({ booking })
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

  res.json({ message: 'Booking cancelled. Deposit refunded to wallet.' })
})

module.exports = router
