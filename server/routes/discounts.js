const express = require('express')
const { getDb } = require('../db/database')
const authMiddleware = require('../middleware/auth')

const router = express.Router()

const STATION_TYPE_MAP = { pc: 'PC', playstation: 'PS5', pool: 'POOL' }
const STATION_LABELS   = { PC: 'PC Gaming', PS5: 'PlayStation 5', POOL: 'Pool Table' }

// Shared validation logic — returns { discount, discountAmount } or { error, errorCode }
function validateDiscount(code, stationType, subtotal, userId, db) {
  const discount = db.prepare('SELECT * FROM discounts WHERE code = ?').get(code.toUpperCase().trim())
  if (!discount) return { error: "This code doesn't exist.", errorCode: 'NOT_FOUND' }

  if (!discount.is_active) return { error: 'This code is no longer active.', errorCode: 'INACTIVE' }

  const now = new Date()
  const validFrom = new Date(discount.valid_from)
  if (now < validFrom) {
    return { error: `This code is valid from ${validFrom.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`, errorCode: 'NOT_YET_VALID' }
  }
  if (discount.valid_until) {
    const validUntil = new Date(discount.valid_until)
    if (now > validUntil) {
      return { error: `This code expired on ${validUntil.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`, errorCode: 'EXPIRED' }
    }
  }

  if (discount.max_uses !== null && discount.uses_so_far >= discount.max_uses) {
    return { error: 'This code has been fully redeemed.', errorCode: 'EXHAUSTED' }
  }

  const userUses = db.prepare(
    'SELECT COUNT(*) as cnt FROM discount_uses WHERE discount_id = ? AND user_id = ?'
  ).get(discount.id, userId)
  if (userUses.cnt >= discount.per_user_limit) {
    return { error: `You've already used this code ${userUses.cnt} time(s).`, errorCode: 'PER_USER_LIMIT' }
  }

  if (discount.applies_to !== 'ALL' && discount.applies_to !== STATION_TYPE_MAP[stationType]) {
    return {
      error: `This code is only valid for ${STATION_LABELS[discount.applies_to]} sessions.`,
      errorCode: 'STATION_MISMATCH',
    }
  }

  if (subtotal < discount.min_booking) {
    return { error: `Minimum booking of ₹${discount.min_booking} required for this code.`, errorCode: 'MIN_NOT_MET' }
  }

  let discountAmount
  if (discount.type === 'PERCENTAGE') {
    discountAmount = Math.round(subtotal * discount.value / 100)
  } else {
    // FLAT: cap so minimum payable is ₹1
    discountAmount = Math.min(discount.value, subtotal - 1)
  }

  return { discount, discountAmount }
}

// GET /api/discounts — public, returns active + currently valid discounts for homepage
router.get('/', (req, res) => {
  const db = getDb()
  const now = new Date().toISOString().slice(0, 19)
  const discounts = db.prepare(`
    SELECT id, code, label, description, type, value, min_booking, applies_to,
           max_uses, uses_so_far, per_user_limit, valid_from, valid_until
    FROM discounts
    WHERE is_active = 1
      AND valid_from <= ?
      AND (valid_until IS NULL OR valid_until >= ?)
      AND (max_uses IS NULL OR uses_so_far < max_uses)
    ORDER BY created_at DESC
  `).all(now, now)
  res.json({ discounts })
})

// POST /api/discounts/validate — auth required, validates a code for a pending booking
router.post('/validate', authMiddleware, (req, res) => {
  const { code, station_type, subtotal } = req.body
  if (!code || !station_type || subtotal == null) {
    return res.status(400).json({ error: 'code, station_type, and subtotal are required' })
  }
  const db = getDb()
  const result = validateDiscount(code, station_type, Number(subtotal), req.user.id, db)
  if (result.error) {
    return res.status(422).json({ error: result.error, errorCode: result.errorCode })
  }
  const { discount, discountAmount } = result
  res.json({
    discount: {
      id: discount.id,
      code: discount.code,
      label: discount.label,
      type: discount.type,
      value: discount.value,
      applies_to: discount.applies_to,
    },
    discountAmount,
    finalTotal: Number(subtotal) - discountAmount,
  })
})

module.exports = { router, validateDiscount }
