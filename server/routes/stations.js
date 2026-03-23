const express = require('express')
const { getDb } = require('../db/database')

const router = express.Router()

// GET /api/stations — all active stations
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
  res.json({ stations })
})

// GET /api/stations/availability?type=pc&date=2024-03-15&start_time=14:00&duration=2
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
  if (isNaN(startDate.getTime())) {
    return res.status(400).json({ error: 'Invalid date or time' })
  }

  const endDate = new Date(startDate.getTime() + dur * 60 * 60 * 1000)
  const endISO = endDate.toISOString().slice(0, 19)

  const db = getDb()
  const bookedStationIds = db.prepare(`
    SELECT DISTINCT station_id FROM bookings
    WHERE status IN ('confirmed','pending_final','pending_cash')
    AND NOT (end_time <= ? OR start_time >= ?)
  `).all(startISO, endISO).map(r => r.station_id)

  const walkinStationIds = db.prepare(`
    SELECT DISTINCT station_id FROM walkins
    WHERE NOT (
      datetime(start_time, '+' || CAST(duration_hours AS TEXT) || ' hours') <= ?
      OR start_time >= ?
    )
  `).all(startISO, endISO).map(r => r.station_id)

  const allBlockedIds = [...new Set([...bookedStationIds, ...walkinStationIds])]

  let query = 'SELECT * FROM stations WHERE is_active = 1 AND type = ?'
  const params = [type]
  if (allBlockedIds.length > 0) {
    query += ` AND id NOT IN (${allBlockedIds.map(() => '?').join(',')})`
    params.push(...allBlockedIds)
  }
  query += ' ORDER BY name'

  const available = db.prepare(query).all(...params)
  res.json({ available, startTime: startISO, endTime: endISO })
})

module.exports = router
