const express = require('express')
const { randomUUID } = require('crypto')
const { getDb, transaction, lastId } = require('../db/database')
const authMiddleware = require('../middleware/auth')

const router = express.Router()

// Optional auth helper — attaches req.user if valid token present, does NOT reject if missing
function optionalAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) return next()
  const jwt = require('jsonwebtoken')
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET)
    const db = getDb()
    const user = db.prepare('SELECT id, name, role, wallet_balance FROM users WHERE id = ? AND is_active = 1').get(payload.id)
    if (user) req.user = user
  } catch (_) {}
  next()
}

// GET /api/tournaments — public list (exclude drafts)
router.get('/', optionalAuth, (req, res) => {
  const db = getDb()
  const userId = req.user ? req.user.id : null

  const tournaments = db.prepare(`
    SELECT t.*,
           COUNT(r.id) as registration_count
    FROM tournaments t
    LEFT JOIN tournament_registrations r ON t.id = r.tournament_id
    WHERE t.status != 'draft'
    GROUP BY t.id
    ORDER BY t.tournament_date ASC
  `).all()

  const result = tournaments.map(t => ({
    ...t,
    is_registered: userId
      ? !!db.prepare('SELECT 1 FROM tournament_registrations WHERE tournament_id = ? AND user_id = ?').get(t.id, userId)
      : false,
  }))

  res.json({ tournaments: result })
})

// GET /api/tournaments/:id — public detail
router.get('/:id', optionalAuth, (req, res) => {
  const db = getDb()
  const userId = req.user ? req.user.id : null

  const tournament = db.prepare(`
    SELECT t.*,
           COUNT(r.id) as registration_count
    FROM tournaments t
    LEFT JOIN tournament_registrations r ON t.id = r.tournament_id
    WHERE t.id = ? AND t.status != 'draft'
    GROUP BY t.id
  `).get(req.params.id)

  if (!tournament) return res.status(404).json({ error: 'Tournament not found' })

  const registrations = db.prepare(`
    SELECT r.id, u.name, r.team_name, r.created_at
    FROM tournament_registrations r
    JOIN users u ON r.user_id = u.id
    WHERE r.tournament_id = ?
    ORDER BY r.created_at ASC
  `).all(req.params.id)

  const is_registered = userId
    ? !!db.prepare('SELECT 1 FROM tournament_registrations WHERE tournament_id = ? AND user_id = ?').get(req.params.id, userId)
    : false

  res.json({ tournament: { ...tournament, is_registered }, registrations })
})

// POST /api/tournaments/:id/register — protected
router.post('/:id/register', authMiddleware, (req, res) => {
  const { team_name } = req.body
  const db = getDb()

  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id)
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' })
  if (tournament.status !== 'open') return res.status(400).json({ error: 'Tournament is not open for registration' })

  const now = new Date()
  const regStart = new Date(tournament.registration_start)
  const regEnd = new Date(tournament.registration_end)
  if (now < regStart) return res.status(400).json({ error: 'Registration has not started yet' })
  if (now > regEnd) return res.status(400).json({ error: 'Registration window has closed' })

  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM tournament_registrations WHERE tournament_id = ?').get(tournament.id)
  if (countRow.cnt >= tournament.max_participants) return res.status(400).json({ error: 'Tournament is full' })

  const existing = db.prepare('SELECT 1 FROM tournament_registrations WHERE tournament_id = ? AND user_id = ?').get(tournament.id, req.user.id)
  if (existing) return res.status(409).json({ error: 'You are already registered for this tournament' })

  transaction(() => {
    let paymentStatus = 'free'

    if (tournament.entry_fee > 0) {
      const user = db.prepare('SELECT wallet_balance FROM users WHERE id = ?').get(req.user.id)
      if (user.wallet_balance < tournament.entry_fee) {
        throw Object.assign(new Error(`Insufficient wallet balance. Need ₹${tournament.entry_fee}, have ₹${user.wallet_balance}`), { status: 402 })
      }
      db.prepare('UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?').run(tournament.entry_fee, req.user.id)
      db.prepare(`INSERT INTO transactions (user_id, amount, type, description) VALUES (?, ?, 'deposit', ?)`).run(
        req.user.id, tournament.entry_fee, `Tournament entry fee: ${tournament.title}`
      )
      paymentStatus = 'paid'
    }

    db.prepare(`
      INSERT INTO tournament_registrations (tournament_id, user_id, team_name, payment_status)
      VALUES (?, ?, ?, ?)
    `).run(tournament.id, req.user.id, team_name ? team_name.trim() : null, paymentStatus)
  })

  const reg = db.prepare('SELECT * FROM tournament_registrations WHERE tournament_id = ? AND user_id = ?').get(tournament.id, req.user.id)
  res.status(201).json({ registration: reg, message: 'Successfully registered!' })
})

// DELETE /api/tournaments/:id/register — cancel registration
router.delete('/:id/register', authMiddleware, (req, res) => {
  const db = getDb()

  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id)
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' })

  if (tournament.status !== 'open') {
    return res.status(400).json({ error: 'Cannot cancel registration — tournament is no longer open' })
  }

  const now = new Date()
  const regEnd = new Date(tournament.registration_end)
  if (now > regEnd) {
    return res.status(400).json({ error: 'Registration window has passed — cancellation is no longer allowed' })
  }

  const reg = db.prepare('SELECT * FROM tournament_registrations WHERE tournament_id = ? AND user_id = ?').get(tournament.id, req.user.id)
  if (!reg) return res.status(404).json({ error: 'You are not registered for this tournament' })

  transaction(() => {
    db.prepare('DELETE FROM tournament_registrations WHERE tournament_id = ? AND user_id = ?').run(tournament.id, req.user.id)

    if (reg.payment_status === 'paid' && tournament.entry_fee > 0) {
      db.prepare('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?').run(tournament.entry_fee, req.user.id)
      db.prepare(`INSERT INTO transactions (user_id, amount, type, description) VALUES (?, ?, 'refund', ?)`).run(
        req.user.id, tournament.entry_fee, `Refund for tournament cancellation: ${tournament.title}`
      )
    }
  })

  res.json({ message: 'Registration cancelled successfully' })
})

module.exports = router
