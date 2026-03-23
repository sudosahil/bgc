/**
 * Client-side discount validation logic
 * Mirrors server-side rules from routes/discounts.js
 * Used for pre-flight checks before API calls
 */

/**
 * @typedef {Object} Discount
 * @property {boolean} is_active
 * @property {string} valid_from - ISO datetime
 * @property {string|null} valid_until - ISO datetime or null
 * @property {number|null} max_uses
 * @property {number} uses_so_far
 * @property {number} per_user_limit
 * @property {string} applies_to - 'ALL' | 'PC' | 'PS5' | 'POOL'
 * @property {number} min_booking
 * @property {string} type - 'PERCENTAGE' | 'FLAT'
 * @property {number} value
 * @property {string} code
 * @property {string} label
 */

/**
 * @typedef {Object} ValidationContext
 * @property {string} stationType - 'PC' | 'PS5' | 'POOL'
 * @property {number} bookingSubtotal
 * @property {number} userPastUses
 */

const STATION_LABELS = { PC: 'PC Gaming', PS5: 'PlayStation 5', POOL: 'Pool Table' }

/**
 * Validates a discount object against a booking context.
 * Returns { valid: true } or { valid: false, error: string }
 */
export function validateDiscount(discount, context) {
  // Rule 1: Active check
  if (!discount.is_active) {
    return { valid: false, error: 'This code is no longer active.' }
  }

  // Rule 2: Date window
  const now = new Date()
  const validFrom = new Date(discount.valid_from)
  if (now < validFrom) {
    return {
      valid: false,
      error: `This code is valid from ${validFrom.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`,
    }
  }
  if (discount.valid_until) {
    const validUntil = new Date(discount.valid_until)
    if (now > validUntil) {
      return {
        valid: false,
        error: `This code expired on ${validUntil.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`,
      }
    }
  }

  // Rule 3: Max uses
  if (discount.max_uses !== null && discount.uses_so_far >= discount.max_uses) {
    return { valid: false, error: 'This code has been fully redeemed.' }
  }

  // Rule 4: Per-user limit
  if (context.userPastUses >= discount.per_user_limit) {
    return {
      valid: false,
      error: `You've already used this code ${context.userPastUses} time(s).`,
    }
  }

  // Rule 5: Station type match
  if (discount.applies_to !== 'ALL' && discount.applies_to !== context.stationType) {
    return {
      valid: false,
      error: `This code is only valid for ${STATION_LABELS[discount.applies_to]} sessions.`,
    }
  }

  // Rule 6: Minimum booking
  if (context.bookingSubtotal < discount.min_booking) {
    return {
      valid: false,
      error: `Minimum booking of ₹${discount.min_booking} required for this code.`,
    }
  }

  return { valid: true }
}

/**
 * Calculates the discount amount and final total.
 * Returns { discountAmount, finalTotal }
 */
export function applyDiscount(discount, context) {
  let discountAmount
  if (discount.type === 'PERCENTAGE') {
    discountAmount = Math.round(context.bookingSubtotal * discount.value / 100)
  } else {
    // FLAT: cap so minimum payable is ₹1
    discountAmount = Math.min(discount.value, context.bookingSubtotal - 1)
  }
  return {
    discountAmount,
    finalTotal: context.bookingSubtotal - discountAmount,
  }
}
