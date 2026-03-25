const express = require('express')
const { randomUUID } = require('crypto')
const { getDb, transaction, lastId } = require('../db/database')
const authMiddleware = require('../middleware/auth')
const adminOnly = require('../middleware/adminOnly')

const router = express.Router()
router.use(authMiddleware, adminOnly)

// GET /api/admin/overview
router.get('/overview', (req, res) => {
  const db = getDb()
  const today = new Date().toISOString().slice(0, 10)

  const todayRevenue = db.prepare(`
    SELECT COALESCE(SUM(t.amount), 0) as total
    FROM transactions t
    WHERE DATE(t.created_at) = ? AND t.type IN ('deposit','final_payment','walkin_credit')
  `).get(today)

  const activeBookings = db.prepare(`
    SELECT COUNT(*) as cnt FROM bookings
    WHERE status IN ('confirmed','pending_final') AND date(start_time) >= ?
  `).get(today)

  const pendingFinal = db.prepare(`
    SELECT COUNT(*) as cnt FROM bookings
    WHERE status = 'pending_final' AND final_paid = 0
  `).get()

  const pendingCash = db.prepare(`
    SELECT COUNT(*) as cnt FROM bookings WHERE status = 'pending_cash'
  `).get()

  const totalUsers = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'user'").get()

  const todayWalkins = db.prepare(`
    SELECT COUNT(*) as cnt FROM walkins WHERE DATE(created_at) = ?
  `).get(today)

  const stationUtilization = db.prepare(`
    SELECT s.type, COUNT(b.id) as bookings_today
    FROM stations s
    LEFT JOIN bookings b ON s.id = b.station_id
      AND DATE(b.start_time) = ?
      AND b.status NOT IN ('cancelled')
    GROUP BY s.type
  `).all(today)

  res.json({
    todayRevenue: todayRevenue.total,
    activeBookings: activeBookings.cnt,
    pendingFinal: pendingFinal.cnt,
    pendingCash: pendingCash.cnt,
    totalUsers: totalUsers.cnt,
    todayWalkins: todayWalkins.cnt,
    stationUtilization,
  })
})

// GET /api/admin/bookings
router.get('/bookings', (req, res) => {
  const db = getDb()
  const { status, type, date, limit = 100, offset = 0 } = req.query
  let query = `
    SELECT b.*, u.name as user_name, u.phone as user_phone, u.email as user_email,
           s.name as station_name, s.type as station_type
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    JOIN stations s ON b.station_id = s.id
    WHERE 1=1
  `
  const params = []
  if (status) { query += ' AND b.status = ?'; params.push(status) }
  if (type)   { query += ' AND s.type = ?'; params.push(type) }
  if (date)   { query += ' AND DATE(b.start_time) = ?'; params.push(date) }
  query += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?'
  params.push(parseInt(limit), parseInt(offset))

  const bookings = db.prepare(query).all(...params)
  res.json({ bookings })
})

// PUT /api/admin/bookings/:id — update status
router.put('/bookings/:id', (req, res) => {
  const { status } = req.body
  const allowed = ['confirmed', 'cancelled', 'completed', 'pending_cash']
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' })
  }
  const db = getDb()
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id)
  if (!booking) return res.status(404).json({ error: 'Booking not found' })

  transaction(() => {
    db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, booking.id)

    // If admin confirms cash booking
    if (status === 'confirmed' && booking.status === 'pending_cash') {
      db.prepare('UPDATE bookings SET deposit_paid = 1, final_paid = 1 WHERE id = ?').run(booking.id)
    }

    // If admin cancels a wallet booking, refund deposit
    if (status === 'cancelled' && booking.payment_method === 'wallet' && booking.deposit_paid) {
      db.prepare('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?').run(booking.deposit_amount, booking.user_id)
      db.prepare(`
        INSERT INTO transactions (user_id, booking_id, amount, type, description)
        VALUES (?, ?, ?, 'refund', ?)
      `).run(booking.user_id, booking.id, booking.deposit_amount, `Admin refund for booking #${booking.id}`)
    }
  })
  res.json({ message: 'Booking updated' })
})

// POST /api/admin/walkins — create walk-in
router.post('/walkins', (req, res) => {
  const { station_id, customer_name, customer_phone, start_time, duration_hours, amount_paid, notes } = req.body
  if (!station_id || !customer_name || !start_time || !duration_hours || amount_paid === undefined) {
    return res.status(400).json({ error: 'station_id, customer_name, start_time, duration_hours, amount_paid required' })
  }
  const dur = parseFloat(duration_hours)
  if (isNaN(dur) || dur < 0.5) return res.status(400).json({ error: 'Duration must be at least 0.5 hours' })

  const db = getDb()
  const station = db.prepare('SELECT * FROM stations WHERE id = ? AND is_active = 1').get(station_id)
  if (!station) return res.status(404).json({ error: 'Station not found' })

  const startDate = new Date(start_time)
  const startISO = startDate.toISOString().slice(0, 19)
  const endISO = new Date(startDate.getTime() + dur * 3600 * 1000).toISOString().slice(0, 19)

  // Check conflicts
  const conflict = db.prepare(`
    SELECT id FROM bookings WHERE station_id = ?
    AND status IN ('confirmed','pending_final','pending_cash')
    AND NOT (end_time <= ? OR start_time >= ?)
  `).get(station_id, startISO, endISO)
  if (conflict) return res.status(409).json({ error: 'Station is booked during this time' })

  const total = station.hourly_rate * dur
  const result = db.prepare(`
    INSERT INTO walkins (station_id, customer_name, customer_phone, start_time, duration_hours, total_amount, amount_paid, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(station_id, customer_name.trim(), customer_phone || null, startISO, dur, total, parseFloat(amount_paid), notes || null, req.user.id)

  const walkin = db.prepare('SELECT w.*, s.name as station_name, s.type as station_type FROM walkins w JOIN stations s ON w.station_id = s.id WHERE w.id = ?').get(lastId(result))
  res.status(201).json({ walkin })
})

// GET /api/admin/walkins
router.get('/walkins', (req, res) => {
  const db = getDb()
  const { date } = req.query
  let query = `
    SELECT w.*, s.name as station_name, s.type as station_type, u.name as created_by_name
    FROM walkins w
    JOIN stations s ON w.station_id = s.id
    JOIN users u ON w.created_by = u.id
    WHERE 1=1
  `
  const params = []
  if (date) { query += ' AND DATE(w.start_time) = ?'; params.push(date) }
  query += ' ORDER BY w.created_at DESC LIMIT 200'
  const walkins = db.prepare(query).all(...params)
  res.json({ walkins })
})

// GET /api/admin/users
router.get('/users', (req, res) => {
  const db = getDb()
  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.wallet_balance, u.points, u.role, u.is_active, u.created_at,
           COUNT(DISTINCT b.id) as total_bookings
    FROM users u
    LEFT JOIN bookings b ON u.id = b.user_id AND b.status != 'cancelled'
    WHERE u.role = 'user'
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all()
  res.json({ users })
})

// GET /api/admin/users/:id — user detail
router.get('/users/:id', (req, res) => {
  const db = getDb()
  const user = db.prepare('SELECT id, name, email, phone, wallet_balance, points, role, is_active, created_at FROM users WHERE id = ?').get(req.params.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  const bookings = db.prepare(`
    SELECT b.*, s.name as station_name, s.type as station_type
    FROM bookings b JOIN stations s ON b.station_id = s.id
    WHERE b.user_id = ? ORDER BY b.created_at DESC LIMIT 20
  `).all(req.params.id)
  const transactions = db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 30').all(req.params.id)
  res.json({ user, bookings, transactions })
})

// PUT /api/admin/users/:id/toggle — activate/deactivate
router.put('/users/:id/toggle', (req, res) => {
  const db = getDb()
  const user = db.prepare('SELECT id, is_active FROM users WHERE id = ?').get(req.params.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(user.is_active ? 0 : 1, user.id)
  res.json({ message: `User ${user.is_active ? 'deactivated' : 'activated'}` })
})

// ── DISCOUNTS ─────────────────────────────────────────────

// GET /api/admin/discounts/check-code?code=XXX — real-time code availability
router.get('/discounts/check-code', (req, res) => {
  const { code } = req.query
  if (!code) return res.status(400).json({ error: 'code required' })
  const db = getDb()
  const existing = db.prepare('SELECT id FROM discounts WHERE code = ?').get(code.toUpperCase().trim())
  res.json({ available: !existing })
})

// GET /api/admin/discounts
router.get('/discounts', (req, res) => {
  const db = getDb()
  const discounts = db.prepare(`
    SELECT d.*, u.name as created_by_name
    FROM discounts d
    LEFT JOIN users u ON d.created_by = u.id
    ORDER BY d.created_at DESC
  `).all()
  res.json({ discounts })
})

// POST /api/admin/discounts — create
router.post('/discounts', (req, res) => {
  const {
    code, label, description, type, value, min_booking,
    applies_to = 'ALL', max_uses, per_user_limit = 1,
    valid_from, valid_until, is_active = true,
  } = req.body

  // Validate required fields
  if (!code || !label || !description || !type || value == null || min_booking == null || !valid_from) {
    return res.status(400).json({ error: 'code, label, description, type, value, min_booking, valid_from are required' })
  }

  const cleanCode = code.toUpperCase().trim()
  if (!/^[A-Z0-9]{6,12}$/.test(cleanCode)) {
    return res.status(400).json({ error: 'Code must be 6–12 alphanumeric characters' })
  }
  if (!['PERCENTAGE', 'FLAT'].includes(type)) {
    return res.status(400).json({ error: 'type must be PERCENTAGE or FLAT' })
  }

  const numValue = parseFloat(value)
  const numMinBooking = parseFloat(min_booking)

  if (type === 'PERCENTAGE') {
    if (numValue < 1 || numValue > 80) return res.status(400).json({ error: 'Percentage value must be 1–80' })
    if (numMinBooking < 100) return res.status(400).json({ error: 'PERCENTAGE discounts require min_booking >= ₹100' })
  } else {
    if (numValue < 10 || numValue > 500) return res.status(400).json({ error: 'Flat value must be ₹10–₹500' })
    if (numMinBooking <= numValue) return res.status(400).json({ error: 'Minimum booking must exceed the discount amount' })
  }

  if (!['ALL', 'PC', 'PS5', 'POOL'].includes(applies_to)) {
    return res.status(400).json({ error: 'applies_to must be ALL, PC, PS5, or POOL' })
  }

  const numPerUserLimit = parseInt(per_user_limit)
  if (numPerUserLimit < 1 || numPerUserLimit > 5) {
    return res.status(400).json({ error: 'per_user_limit must be 1–5' })
  }

  const fromDate = new Date(valid_from)
  if (isNaN(fromDate.getTime())) return res.status(400).json({ error: 'valid_from is invalid' })

  if (valid_until) {
    const untilDate = new Date(valid_until)
    if (isNaN(untilDate.getTime())) return res.status(400).json({ error: 'valid_until is invalid' })
    if (untilDate <= fromDate) return res.status(400).json({ error: 'valid_until must be after valid_from' })
    const diffMs = untilDate - fromDate
    if (diffMs < 3600 * 1000) return res.status(400).json({ error: 'valid_until must be at least 1 hour after valid_from' })
  }

  const db = getDb()
  const existing = db.prepare('SELECT id FROM discounts WHERE code = ?').get(cleanCode)
  if (existing) return res.status(409).json({ error: `Code ${cleanCode} is already in use` })

  const id = randomUUID()
  db.prepare(`
    INSERT INTO discounts
      (id, code, label, description, type, value, min_booking, applies_to,
       max_uses, per_user_limit, valid_from, valid_until, is_active, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, cleanCode, label.trim(), description.trim(), type, numValue, numMinBooking,
    applies_to, max_uses ? parseInt(max_uses) : null, numPerUserLimit,
    fromDate.toISOString().slice(0, 19),
    valid_until ? new Date(valid_until).toISOString().slice(0, 19) : null,
    is_active ? 1 : 0, req.user.id
  )

  const created = db.prepare('SELECT * FROM discounts WHERE id = ?').get(id)
  res.status(201).json({ discount: created })
})

// PUT /api/admin/discounts/:id — update
router.put('/discounts/:id', (req, res) => {
  const db = getDb()
  const discount = db.prepare('SELECT * FROM discounts WHERE id = ?').get(req.params.id)
  if (!discount) return res.status(404).json({ error: 'Discount not found' })

  const {
    label, description, type, value, min_booking, applies_to,
    max_uses, per_user_limit, valid_from, valid_until, is_active,
  } = req.body

  const cleanLabel = (label || discount.label).trim()
  const cleanDesc  = (description || discount.description).trim()
  const newType    = type || discount.type
  const numValue   = parseFloat(value ?? discount.value)
  const numMin     = parseFloat(min_booking ?? discount.min_booking)
  const newApplies = applies_to || discount.applies_to
  const numPerUser = parseInt(per_user_limit ?? discount.per_user_limit)
  const numMaxUses = max_uses !== undefined ? (max_uses === null ? null : parseInt(max_uses)) : discount.max_uses
  const newFrom    = valid_from ? new Date(valid_from).toISOString().slice(0, 19) : discount.valid_from
  const newUntil   = valid_until !== undefined ? (valid_until ? new Date(valid_until).toISOString().slice(0, 19) : null) : discount.valid_until
  const newActive  = is_active !== undefined ? (is_active ? 1 : 0) : discount.is_active

  db.prepare(`
    UPDATE discounts SET
      label=?, description=?, type=?, value=?, min_booking=?, applies_to=?,
      max_uses=?, per_user_limit=?, valid_from=?, valid_until=?, is_active=?
    WHERE id=?
  `).run(cleanLabel, cleanDesc, newType, numValue, numMin, newApplies,
         numMaxUses, numPerUser, newFrom, newUntil, newActive, discount.id)

  res.json({ discount: db.prepare('SELECT * FROM discounts WHERE id = ?').get(discount.id) })
})

// DELETE /api/admin/discounts/:id
router.delete('/discounts/:id', (req, res) => {
  const db = getDb()
  const discount = db.prepare('SELECT * FROM discounts WHERE id = ?').get(req.params.id)
  if (!discount) return res.status(404).json({ error: 'Discount not found' })
  // Nullify references in bookings then delete uses and discount
  db.prepare('UPDATE bookings SET discount_id = NULL WHERE discount_id = ?').run(discount.id)
  db.prepare('DELETE FROM discount_uses WHERE discount_id = ?').run(discount.id)
  db.prepare('DELETE FROM discounts WHERE id = ?').run(discount.id)
  res.json({ message: 'Discount deleted' })
})

// ── TOURNAMENTS ─────────────────────────────────────────────

// GET /api/admin/tournaments
router.get('/tournaments', (req, res) => {
  const db = getDb()
  const tournaments = db.prepare(`
    SELECT t.*, COUNT(r.id) as registration_count, u.name as created_by_name
    FROM tournaments t
    LEFT JOIN tournament_registrations r ON t.id = r.tournament_id
    LEFT JOIN users u ON t.created_by = u.id
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `).all()
  res.json({ tournaments })
})

// POST /api/admin/tournaments — create
router.post('/tournaments', (req, res) => {
  const {
    title, description, game_type = 'ALL', format = 'SOLO',
    entry_fee = 0, prize_pool = '', max_participants = 32,
    registration_start, registration_end, tournament_date,
    status = 'draft', rules = '',
  } = req.body

  if (!title || !description || !registration_start || !registration_end || !tournament_date) {
    return res.status(400).json({ error: 'title, description, registration_start, registration_end, tournament_date are required' })
  }

  const validGameTypes = ['ALL', 'PC', 'PS5', 'POOL']
  const validFormats = ['SOLO', 'DUO', 'TEAM']
  const validStatuses = ['draft', 'open', 'closed', 'ongoing', 'completed', 'cancelled']

  if (!validGameTypes.includes(game_type)) return res.status(400).json({ error: 'Invalid game_type' })
  if (!validFormats.includes(format)) return res.status(400).json({ error: 'Invalid format' })
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' })

  const regStart = new Date(registration_start)
  const regEnd = new Date(registration_end)
  const tourDate = new Date(tournament_date)

  if (isNaN(regStart.getTime())) return res.status(400).json({ error: 'registration_start is invalid' })
  if (isNaN(regEnd.getTime())) return res.status(400).json({ error: 'registration_end is invalid' })
  if (isNaN(tourDate.getTime())) return res.status(400).json({ error: 'tournament_date is invalid' })
  if (regStart >= regEnd) return res.status(400).json({ error: 'registration_start must be before registration_end' })
  if (regEnd >= tourDate) return res.status(400).json({ error: 'registration_end must be before tournament_date' })

  const numFee = parseFloat(entry_fee)
  const numMax = parseInt(max_participants)
  if (isNaN(numFee) || numFee < 0) return res.status(400).json({ error: 'entry_fee must be a non-negative number' })
  if (isNaN(numMax) || numMax < 2) return res.status(400).json({ error: 'max_participants must be at least 2' })

  const db = getDb()
  const id = randomUUID()

  db.prepare(`
    INSERT INTO tournaments
      (id, title, description, game_type, format, entry_fee, prize_pool, max_participants,
       rules, registration_start, registration_end, tournament_date, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, title.trim(), description.trim(), game_type, format,
    numFee, prize_pool.trim(), numMax,
    rules ? rules.trim() : '',
    regStart.toISOString().slice(0, 19),
    regEnd.toISOString().slice(0, 19),
    tourDate.toISOString().slice(0, 19),
    status, req.user.id
  )

  const created = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id)
  res.status(201).json({ tournament: created })
})

// PUT /api/admin/tournaments/:id — patch update
router.put('/tournaments/:id', (req, res) => {
  const db = getDb()
  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id)
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' })

  const {
    title, description, game_type, format, entry_fee, prize_pool,
    max_participants, rules, registration_start, registration_end, tournament_date, status,
  } = req.body

  const validGameTypes = ['ALL', 'PC', 'PS5', 'POOL']
  const validFormats = ['SOLO', 'DUO', 'TEAM']
  const validStatuses = ['draft', 'open', 'closed', 'ongoing', 'completed', 'cancelled']

  const newGameType = game_type || tournament.game_type
  const newFormat = format || tournament.format
  const newStatus = status || tournament.status

  if (!validGameTypes.includes(newGameType)) return res.status(400).json({ error: 'Invalid game_type' })
  if (!validFormats.includes(newFormat)) return res.status(400).json({ error: 'Invalid format' })
  if (!validStatuses.includes(newStatus)) return res.status(400).json({ error: 'Invalid status' })

  const newRegStart = registration_start ? new Date(registration_start) : new Date(tournament.registration_start)
  const newRegEnd = registration_end ? new Date(registration_end) : new Date(tournament.registration_end)
  const newTourDate = tournament_date ? new Date(tournament_date) : new Date(tournament.tournament_date)

  if (isNaN(newRegStart.getTime()) || isNaN(newRegEnd.getTime()) || isNaN(newTourDate.getTime())) {
    return res.status(400).json({ error: 'Invalid date value' })
  }
  if (newRegStart >= newRegEnd) return res.status(400).json({ error: 'registration_start must be before registration_end' })
  if (newRegEnd >= newTourDate) return res.status(400).json({ error: 'registration_end must be before tournament_date' })

  const numFee = entry_fee !== undefined ? parseFloat(entry_fee) : tournament.entry_fee
  const numMax = max_participants !== undefined ? parseInt(max_participants) : tournament.max_participants

  db.prepare(`
    UPDATE tournaments SET
      title=?, description=?, game_type=?, format=?, entry_fee=?, prize_pool=?,
      max_participants=?, rules=?, registration_start=?, registration_end=?,
      tournament_date=?, status=?
    WHERE id=?
  `).run(
    (title || tournament.title).trim(),
    (description || tournament.description).trim(),
    newGameType, newFormat, numFee,
    prize_pool !== undefined ? prize_pool.trim() : tournament.prize_pool,
    numMax,
    rules !== undefined ? rules.trim() : tournament.rules,
    newRegStart.toISOString().slice(0, 19),
    newRegEnd.toISOString().slice(0, 19),
    newTourDate.toISOString().slice(0, 19),
    newStatus, tournament.id
  )

  res.json({ tournament: db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournament.id) })
})

// DELETE /api/admin/tournaments/:id — delete with refunds
router.delete('/tournaments/:id', (req, res) => {
  const db = getDb()
  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id)
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' })

  transaction(() => {
    // Refund paid registrations
    const paidRegs = db.prepare(`
      SELECT r.*, u.id as uid FROM tournament_registrations r
      JOIN users u ON r.user_id = u.id
      WHERE r.tournament_id = ? AND r.payment_status = 'paid'
    `).all(tournament.id)

    for (const reg of paidRegs) {
      db.prepare('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?').run(tournament.entry_fee, reg.uid)
      db.prepare(`INSERT INTO transactions (user_id, amount, type, description) VALUES (?, ?, 'refund', ?)`).run(
        reg.uid, tournament.entry_fee, `Refund — tournament cancelled: ${tournament.title}`
      )
    }

    db.prepare('DELETE FROM tournament_registrations WHERE tournament_id = ?').run(tournament.id)
    db.prepare('DELETE FROM tournaments WHERE id = ?').run(tournament.id)
  })

  res.json({ message: 'Tournament deleted and entry fees refunded' })
})

// GET /api/admin/tournaments/:id/registrations
router.get('/tournaments/:id/registrations', (req, res) => {
  const db = getDb()
  const tournament = db.prepare('SELECT id, title FROM tournaments WHERE id = ?').get(req.params.id)
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' })

  const registrations = db.prepare(`
    SELECT r.id, r.tournament_id, r.user_id, u.name, u.email, u.phone,
           r.team_name, r.payment_status, r.created_at
    FROM tournament_registrations r
    JOIN users u ON r.user_id = u.id
    WHERE r.tournament_id = ?
    ORDER BY r.created_at ASC
  `).all(req.params.id)

  res.json({ tournament, registrations })
})

// PUT /api/admin/tournaments/:id/status — quick status update
router.put('/tournaments/:id/status', (req, res) => {
  const { status } = req.body
  const validStatuses = ['draft', 'open', 'closed', 'ongoing', 'completed', 'cancelled']
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'status must be one of: ' + validStatuses.join(', ') })
  }
  const db = getDb()
  const tournament = db.prepare('SELECT id FROM tournaments WHERE id = ?').get(req.params.id)
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' })
  db.prepare('UPDATE tournaments SET status = ? WHERE id = ?').run(status, tournament.id)
  res.json({ tournament: db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournament.id) })
})

// GET /api/admin/analytics
router.get('/analytics', (req, res) => {
  const db = getDb()
  const { period = '7' } = req.query
  const days = parseInt(period)

  const dailyRevenue = db.prepare(`
    SELECT DATE(created_at) as date, ROUND(SUM(amount), 2) as revenue
    FROM transactions
    WHERE type IN ('deposit','final_payment','walkin_credit')
    AND created_at >= datetime('now', ?)
    GROUP BY DATE(created_at)
    ORDER BY date
  `).all(`-${days} days`)

  const revenueByType = db.prepare(`
    SELECT s.type, ROUND(SUM(t.amount), 2) as revenue, COUNT(DISTINCT b.id) as bookings
    FROM transactions t
    JOIN bookings b ON t.booking_id = b.id
    JOIN stations s ON b.station_id = s.id
    WHERE t.type IN ('deposit','final_payment')
    AND t.created_at >= datetime('now', ?)
    GROUP BY s.type
  `).all(`-${days} days`)

  const popularStations = db.prepare(`
    SELECT s.name, s.type, COUNT(b.id) as bookings
    FROM stations s
    LEFT JOIN bookings b ON s.id = b.station_id AND b.status NOT IN ('cancelled')
    AND b.created_at >= datetime('now', ?)
    GROUP BY s.id
    ORDER BY bookings DESC
    LIMIT 10
  `).all(`-${days} days`)

  res.json({ dailyRevenue, revenueByType, popularStations })
})

module.exports = router
