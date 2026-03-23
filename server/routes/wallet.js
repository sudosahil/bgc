const express = require('express')
const crypto = require('crypto')
const { getDb, transaction, lastId } = require('../db/database')
const authMiddleware = require('../middleware/auth')

const router = express.Router()
router.use(authMiddleware)

router.get('/', (req, res) => {
  const db = getDb()
  const user = db.prepare('SELECT wallet_balance, points FROM users WHERE id = ?').get(req.user.id)
  res.json({ wallet_balance: user.wallet_balance, points: user.points })
})

router.get('/transactions', (req, res) => {
  const db = getDb()
  const transactions = db.prepare(`
    SELECT t.*, b.start_time as booking_start FROM transactions t
    LEFT JOIN bookings b ON t.booking_id = b.id
    WHERE t.user_id = ? ORDER BY t.created_at DESC LIMIT 100
  `).all(req.user.id)
  res.json({ transactions })
})

router.post('/topup/create', (req, res) => {
  const { amount } = req.body
  const amt = parseFloat(amount)
  if (!amount || isNaN(amt) || amt < 50 || amt > 50000) {
    return res.status(400).json({ error: 'Amount must be between ₹50 and ₹50,000' })
  }
  try {
    const Razorpay = require('razorpay')
    const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
    razorpay.orders.create({
      amount: Math.round(amt * 100),
      currency: 'INR',
      receipt: `bgc_${req.user.id}_${Date.now()}`,
      notes: { user_id: req.user.id, purpose: 'wallet_topup' }
    }, (err, order) => {
      if (err) return res.status(500).json({ error: 'Could not create payment order' })
      const db = getDb()
      db.prepare('INSERT INTO razorpay_orders (user_id, order_id, amount) VALUES (?, ?, ?)').run(req.user.id, order.id, amt)
      res.json({ order, key_id: process.env.RAZORPAY_KEY_ID })
    })
  } catch {
    res.status(500).json({ error: 'Payment service unavailable' })
  }
})

router.post('/topup/verify', (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Payment verification data incomplete' })
  }
  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex')
  if (expectedSig !== razorpay_signature) {
    return res.status(400).json({ error: 'Payment verification failed' })
  }
  const db = getDb()
  const order = db.prepare('SELECT * FROM razorpay_orders WHERE order_id = ? AND user_id = ?').get(razorpay_order_id, req.user.id)
  if (!order || order.status === 'paid') {
    return res.status(400).json({ error: 'Order not found or already processed' })
  }
  transaction(() => {
    db.prepare("UPDATE razorpay_orders SET status = 'paid' WHERE order_id = ?").run(razorpay_order_id)
    db.prepare('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?').run(order.amount, req.user.id)
    db.prepare(`INSERT INTO transactions (user_id, amount, type, description, razorpay_payment_id, razorpay_order_id)
      VALUES (?, ?, 'topup', 'Wallet top-up via Razorpay', ?, ?)`)
      .run(req.user.id, order.amount, razorpay_payment_id, razorpay_order_id)
  })
  const updated = db.prepare('SELECT wallet_balance, points FROM users WHERE id = ?').get(req.user.id)
  res.json({ message: `₹${order.amount} added to wallet`, wallet_balance: updated.wallet_balance })
})

router.post('/topup/manual', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Manual top-up disabled in production' })
  }
  const { amount } = req.body
  const amt = parseFloat(amount)
  if (!amount || isNaN(amt) || amt < 50 || amt > 50000) {
    return res.status(400).json({ error: 'Amount must be between ₹50 and ₹50,000' })
  }
  const db = getDb()
  db.prepare('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?').run(amt, req.user.id)
  db.prepare(`INSERT INTO transactions (user_id, amount, type, description) VALUES (?, ?, 'topup', 'Manual wallet top-up (demo)')`)
    .run(req.user.id, amt)
  const updated = db.prepare('SELECT wallet_balance FROM users WHERE id = ?').get(req.user.id)
  res.json({ message: `₹${amt} added to wallet`, wallet_balance: updated.wallet_balance })
})

router.post('/redeem-points', (req, res) => {
  const { points } = req.body
  const pts = parseInt(points)
  if (!points || isNaN(pts) || pts < 100) {
    return res.status(400).json({ error: 'Minimum redemption is 100 points' })
  }
  if (pts % 100 !== 0) {
    return res.status(400).json({ error: 'Points must be redeemed in multiples of 100' })
  }
  const db = getDb()
  const user = db.prepare('SELECT wallet_balance, points FROM users WHERE id = ?').get(req.user.id)
  if (user.points < pts) {
    return res.status(400).json({ error: `Insufficient points. You have ${user.points}` })
  }
  const credit = (pts / 100) * 10
  transaction(() => {
    db.prepare('UPDATE users SET points = points - ?, wallet_balance = wallet_balance + ? WHERE id = ?').run(pts, credit, req.user.id)
    db.prepare(`INSERT INTO transactions (user_id, amount, type, description) VALUES (?, ?, 'points_redeem', ?)`)
      .run(req.user.id, credit, `Redeemed ${pts} points for ₹${credit}`)
  })
  const updated = db.prepare('SELECT wallet_balance, points FROM users WHERE id = ?').get(req.user.id)
  res.json({ message: `${pts} points redeemed for ₹${credit}`, wallet_balance: updated.wallet_balance, points: updated.points })
})

module.exports = router
