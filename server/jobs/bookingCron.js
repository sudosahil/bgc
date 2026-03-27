const cron = require('node-cron')
const { getDb, transaction } = require('../db/database')

function runAutoCancel() {
  const db = getDb()
  const now = new Date()

  // Mark bookings as pending_final if within 2 hours of start
  const twoHoursFromNow = new Date(now.getTime() + 2 * 3600 * 1000).toISOString().slice(0, 19)
  const nowISO = now.toISOString().slice(0, 19)

  const markPending = db.prepare(`
    UPDATE bookings
    SET status = 'pending_final'
    WHERE status = 'confirmed'
    AND payment_method = 'wallet'
    AND final_paid = 0
    AND deposit_paid = 1
    AND start_time <= ?
    AND start_time > ?
  `)
  const pendingResult = markPending.run(twoHoursFromNow, nowISO)

  // Auto-cancel bookings past start time that haven't paid final
  const overduePending = db.prepare(`
    SELECT * FROM bookings
    WHERE status IN ('confirmed', 'pending_final')
    AND payment_method = 'wallet'
    AND final_paid = 0
    AND deposit_paid = 1
    AND start_time <= ?
  `).all(nowISO)

  if (overduePending.length > 0) {
    transaction(() => {
      for (const booking of overduePending) {
        db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(booking.id)
        db.prepare('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?')
          .run(booking.deposit_amount, booking.user_id)
        db.prepare(`
          INSERT INTO transactions (user_id, booking_id, amount, type, description)
          VALUES (?, ?, ?, 'refund', ?)
        `).run(booking.user_id, booking.id, booking.deposit_amount,
          `Auto-refund: final payment not received for booking #${booking.id}`)
      }
    })
    console.log(`[Cron] Auto-cancelled ${overduePending.length} booking(s) — deposits refunded`)
  }

  // Mark past confirmed bookings as completed
  db.prepare(`
    UPDATE bookings SET status = 'completed'
    WHERE status IN ('confirmed','pending_final')
    AND end_time <= ?
    AND (final_paid = 1 OR payment_method = 'cash')
  `).run(nowISO)

  if (pendingResult.changes > 0) {
    console.log(`[Cron] Marked ${pendingResult.changes} booking(s) as pending_final`)
  }
}

function syncStationStatuses() {
  const db = getDb()
  const now = new Date().toISOString().slice(0, 19)
  const soon = new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 19)

  // Stations with an active session right now → OCCUPIED
  const occupiedIds = db.prepare(`
    SELECT DISTINCT station_id FROM bookings
    WHERE status IN ('confirmed','pending_final','pending_cash')
    AND start_time <= ? AND end_time > ?
  `).all(now, now).map(r => r.station_id)

  // Stations with a booking starting within 30 min (not already occupied) → RESERVED
  const reservedIds = db.prepare(`
    SELECT DISTINCT station_id FROM bookings
    WHERE status IN ('confirmed','pending_cash')
    AND start_time > ? AND start_time <= ?
  `).all(now, soon).map(r => r.station_id).filter(id => !occupiedIds.includes(id))

  const busyIds = [...occupiedIds, ...reservedIds]

  if (occupiedIds.length) {
    db.prepare(`UPDATE stations SET status='OCCUPIED' WHERE id IN (${occupiedIds.map(() => '?').join(',')}) AND status != 'MAINTENANCE'`).run(...occupiedIds)
  }
  if (reservedIds.length) {
    db.prepare(`UPDATE stations SET status='RESERVED' WHERE id IN (${reservedIds.map(() => '?').join(',')}) AND status != 'MAINTENANCE'`).run(...reservedIds)
  }
  if (busyIds.length) {
    db.prepare(`UPDATE stations SET status='AVAILABLE' WHERE id NOT IN (${busyIds.map(() => '?').join(',')}) AND status != 'MAINTENANCE'`).run(...busyIds)
  } else {
    db.prepare(`UPDATE stations SET status='AVAILABLE' WHERE status != 'MAINTENANCE'`).run()
  }
}

function startCron() {
  cron.schedule('*/5 * * * *', () => {
    try {
      runAutoCancel()
      syncStationStatuses()
    } catch (err) {
      console.error('[Cron] Error:', err.message)
    }
  })
  console.log('[Cron] Booking auto-cancel + station sync started (every 5 minutes)')
}

module.exports = { startCron, runAutoCancel, syncStationStatuses }
