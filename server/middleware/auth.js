const jwt = require('jsonwebtoken')
const { getDb } = require('../db/database')

function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }
  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const db = getDb()
    const user = db.prepare('SELECT id, name, email, phone, role, wallet_balance, points, is_active FROM users WHERE id = ?').get(payload.id)
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User not found or inactive' })
    }
    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

module.exports = authMiddleware
