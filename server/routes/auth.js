const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { getDb, lastId } = require('../db/database')
const authMiddleware = require('../middleware/auth')
const { logActivity } = require('../utils/activityLogger')

const router = express.Router()

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, email, phone, password } = req.body
  if (!name || !email || !phone || !password) {
    return res.status(400).json({ error: 'All fields are required' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }
  const phoneStripped = phone.replace(/[\s-]+/g, '')
  const phoneClean = phoneStripped.length > 10 ? phoneStripped.replace(/^(\+91|91)/, '') : phoneStripped
  if (!/^\d{10}$/.test(phoneClean)) {
    return res.status(400).json({ error: 'Enter a valid 10-digit mobile number' })
  }
  const db = getDb()
  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR phone = ?').get(email.toLowerCase(), phoneClean)
  if (existing) {
    return res.status(409).json({ error: 'Email or phone already registered' })
  }
  const hash = bcrypt.hashSync(password, 10)
  const result = db.prepare(
    'INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)'
  ).run(name.trim(), email.toLowerCase(), phoneClean, hash)
  const user = db.prepare('SELECT id, name, email, phone, role, wallet_balance, points FROM users WHERE id = ?').get(lastId(result))
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN })
  logActivity(db, { userId: user.id, userName: user.name, role: user.role, action: 'user_register', details: `New account registered` })
  res.status(201).json({ token, user })
})

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { identifier, password } = req.body
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Identifier and password required' })
  }
  const db = getDb()
  const stripped = identifier.trim().toLowerCase().replace(/[\s-]+/g, '')
  const clean = stripped.length > 10 ? stripped.replace(/^(\+91|91)/, '') : stripped
  const user = db.prepare('SELECT * FROM users WHERE email = ? OR phone = ?').get(clean, clean)
  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }
  const match = bcrypt.compareSync(password, user.password_hash)
  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN })
  const { password_hash, ...safeUser } = user
  logActivity(db, { userId: user.id, userName: user.name, role: user.role, action: 'user_login', details: `Logged in via ${/^\d{10}$/.test(clean) ? 'phone' : 'email'}` })
  res.json({ token, user: safeUser })
})

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user })
})

module.exports = router
