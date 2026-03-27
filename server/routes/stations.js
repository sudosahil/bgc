const express = require('express')
const { getDb } = require('../db/database')
const authMiddleware = require('../middleware/auth')

const router = express.Router()

const VALID_STATUSES = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE']

// GET /api/stations — all active stations with live status + summary
router.get('/', (req, res) => {
  const db = getDb()
  const { type } = req.query
  let query = 'SELECT * FROM stations WHERE is_active = 1'
  const params = []
  if (type) {
    query += ' AND type = ?'
    params.push(type)
  }
  query += ' ORDER BY type, name'
  const stations = db.prepare(query).all(...params)

  const all = params.length
    ? db.prepare('SELECT * FROM stations WHERE is_active = 1 ORDER BY type, name').all()
    : stations
  const summary = {
    pc:          { free: 0, total: 0 },
    playstation: { free: 0, total: 0 },
    pool:        { free: 0, total: 0 },
  }
  for (const s of all) {
    if (!summary[s.type]) continue
    summary[s.type].total++
    if (s.status === 'AVAILABLE') summary[s.type].free++
  }

  res.json({ stations, summary, updatedAt: new Date().toISOString() })
})

// GET /api/stations/availability
router.get('/availability', (req, res) => {
  const { type, date, start_time, duration } = req.query
  if (!type || !date || !start_time || !duration) {
    return res.status(400).json({ error: 'type, date, start_time, duration are required' })
  }
  const dur = parseFloat(duration)
  if (isNaN(dur) || dur < 1 || dur > 8) {
    return res.status(400).json({ error: 'Duration must be between 1 and 8 hours' })
  }
  const startISO = `${date}T${start_time}:00`
  const startDate = new Date(startISO)
  if (isNaN(startDate.getTime())) return res.status(400).json({ error: 'Invalid date or time' })
  const endISO = new Date(startDate.getTime() + dur * 3600 * 1000).toISOString().slice(0, 19)

  const db = getDb()
  const bookedIds = db.prepare(`
    SELECT DISTINCT station_id FROM bookings
    WHERE status IN ('confirmed','pending_final','pending_cash')
    AND NOT (end_time <= ? OR start_time >= ?)
  `).all(startISO, endISO).map(r => r.station_id)

  const walkinIds = db.prepare(`
    SELECT DISTINCT station_id FROM walkins
    WHERE NOT (datetime(start_time,'+'||CAST(duration_hours AS TEXT)||' hours') <= ? OR start_time >= ?)
  `).all(startISO, endISO).map(r => r.station_id)

  const blocked = [...new Set([...bookedIds, ...walkinIds])]
  let q = 'SELECT * FROM stations WHERE is_active = 1 AND type = ?'
  const p = [type]
  if (blocked.length) { q += ` AND id NOT IN (${blocked.map(() => '?').join(',')})`; p.push(...blocked) }
  q += ' ORDER BY name'

  res.json({ available: db.prepare(q).all(...p), startTime: startISO, endTime: endISO })
})

// PATCH /api/stations/:id — admin only
router.patch('/:id', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' })
  const { status } = req.body
  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` })
  }
  const db = getDb()
  const station = db.prepare('SELECT * FROM stations WHERE id = ?').get(req.params.id)
  if (!station) return res.status(404).json({ error: 'Station not found' })
  db.prepare('UPDATE stations SET status = ? WHERE id = ?').run(status, req.params.id)
  res.json({ station: db.prepare('SELECT * FROM stations WHERE id = ?').get(req.params.id) })
})

module.exports = router
