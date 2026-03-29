const { EventEmitter } = require('events')

// SSE clients listening for real-time activity
const activityClients = new Set()
const activityEmitter = new EventEmitter()

activityEmitter.on('new', (entry) => {
  const payload = `data: ${JSON.stringify(entry)}\n\n`
  for (const res of activityClients) {
    try { res.write(payload) } catch (_) { activityClients.delete(res) }
  }
})

function logActivity(db, { userId, userName, role = 'user', action, details = '' }) {
  try {
    const result = db.prepare(
      `INSERT INTO activity_log (user_id, user_name, role, action, details) VALUES (?, ?, ?, ?, ?)`
    ).run(userId || null, userName || 'Guest', role, action, details)

    const entry = db.prepare('SELECT * FROM activity_log WHERE id = ?').get(Number(result.lastInsertRowid))
    activityEmitter.emit('new', entry)
    return entry
  } catch (_) {}
}

module.exports = { logActivity, activityClients, activityEmitter }
