import { describe, it, expect, vi } from 'vitest'
import { validateDiscount, applyDiscount } from '../../../lib/discount'

/* ───────────────────────────────────────────
   Fixtures
   ─────────────────────────────────────────── */
const validDiscount = {
  is_active: true,
  valid_from: '2024-01-01T00:00:00Z',
  valid_until: null,
  max_uses: null,
  uses_so_far: 0,
  per_user_limit: 5,
  applies_to: 'ALL',
  min_booking: 0,
  type: 'PERCENTAGE',
  value: 20,
  code: 'BGCWELCOME20',
  label: 'Welcome Drop',
}

const context = {
  stationType: 'PC',
  bookingSubtotal: 300,
  userPastUses: 0,
}

/* ───────────────────────────────────────────
   Discount Validation
   ─────────────────────────────────────────── */
describe('Discount Validation', () => {

  describe('RULE 1 — is_active check', () => {
    it('should reject inactive discount', () => {
      const discount = { ...validDiscount, is_active: false }
      expect(validateDiscount(discount, context)).toEqual({
        valid: false,
        error: 'This code is no longer active.',
      })
    })

    it('should accept active discount', () => {
      const discount = { ...validDiscount, is_active: true }
      expect(validateDiscount(discount, context).valid).toBe(true)
    })
  })

  describe('RULE 2 — expiry check', () => {
    it('should reject expired discount', () => {
      const discount = {
        ...validDiscount,
        valid_from: '2024-01-01T00:00:00Z',
        valid_until: '2024-01-02T00:00:00Z',
      }
      const result = validateDiscount(discount, context)
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/expired/i)
    })

    it('should accept discount with no expiry (null valid_until)', () => {
      const discount = { ...validDiscount, valid_until: null }
      expect(validateDiscount(discount, context).valid).toBe(true)
    })

    it('should reject discount not yet valid', () => {
      const discount = {
        ...validDiscount,
        valid_from: new Date(Date.now() + 86400000).toISOString(),
      }
      const result = validateDiscount(discount, context)
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/valid from/i)
    })
  })

  describe('RULE 3 — max uses exhausted', () => {
    it('should reject when uses_so_far >= max_uses', () => {
      const discount = { ...validDiscount, max_uses: 100, uses_so_far: 100 }
      expect(validateDiscount(discount, context)).toEqual({
        valid: false,
        error: 'This code has been fully redeemed.',
      })
    })

    it('should accept when max_uses is null (unlimited)', () => {
      const discount = { ...validDiscount, max_uses: null, uses_so_far: 9999 }
      expect(validateDiscount(discount, context).valid).toBe(true)
    })
  })

  describe('RULE 4 — per user limit', () => {
    it('should reject when user hit per_user_limit', () => {
      const discount = { ...validDiscount, per_user_limit: 1 }
      const ctx = { ...context, userPastUses: 1 }
      const result = validateDiscount(discount, ctx)
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/already used/i)
    })

    it('should accept when user under per_user_limit', () => {
      const discount = { ...validDiscount, per_user_limit: 3 }
      const ctx = { ...context, userPastUses: 2 }
      expect(validateDiscount(discount, ctx).valid).toBe(true)
    })
  })

  describe('RULE 5 — station match', () => {
    it('should reject PC-only code on PS5 booking', () => {
      const discount = { ...validDiscount, applies_to: 'PC' }
      const ctx = { ...context, stationType: 'PS5' }
      expect(validateDiscount(discount, ctx)).toEqual({
        valid: false,
        error: 'This code is only valid for PC Gaming sessions.',
      })
    })

    it('should accept ALL stations code on any booking', () => {
      const discount = { ...validDiscount, applies_to: 'ALL' }
      const ctx = { ...context, stationType: 'PS5' }
      expect(validateDiscount(discount, ctx).valid).toBe(true)
    })

    it('should accept matching station type', () => {
      const discount = { ...validDiscount, applies_to: 'PS5' }
      const ctx = { ...context, stationType: 'PS5' }
      expect(validateDiscount(discount, ctx).valid).toBe(true)
    })
  })

  describe('RULE 6 — minimum booking', () => {
    it('should reject when booking subtotal below min_booking', () => {
      const discount = { ...validDiscount, min_booking: 200 }
      const ctx = { ...context, bookingSubtotal: 150 }
      expect(validateDiscount(discount, ctx)).toEqual({
        valid: false,
        error: 'Minimum booking of ₹200 required for this code.',
      })
    })

    it('should accept when subtotal equals min_booking', () => {
      const discount = { ...validDiscount, min_booking: 300 }
      expect(validateDiscount(discount, context).valid).toBe(true)
    })
  })
})

/* ───────────────────────────────────────────
   Discount Calculation (applyDiscount)
   ─────────────────────────────────────────── */
describe('Discount Calculation', () => {

  describe('Percentage discount', () => {
    it('should calculate 20% off correctly', () => {
      const discount = { ...validDiscount, type: 'PERCENTAGE', value: 20 }
      const ctx = { ...context, bookingSubtotal: 300 }
      const result = applyDiscount(discount, ctx)
      expect(result.discountAmount).toBe(60)
      expect(result.finalTotal).toBe(240)
    })

    it('should round percentage discount to nearest integer', () => {
      const discount = { ...validDiscount, type: 'PERCENTAGE', value: 15 }
      const ctx = { ...context, bookingSubtotal: 199 }
      const result = applyDiscount(discount, ctx)
      // 199 * 15/100 = 29.85 → Math.round → 30
      expect(result.discountAmount).toBe(30)
      expect(result.finalTotal).toBe(169)
    })
  })

  describe('Flat discount', () => {
    it('should apply flat ₹50 off', () => {
      const discount = { ...validDiscount, type: 'FLAT', value: 50 }
      const ctx = { ...context, bookingSubtotal: 300 }
      const result = applyDiscount(discount, ctx)
      expect(result.discountAmount).toBe(50)
      expect(result.finalTotal).toBe(250)
    })

    it('should cap FLAT discount at subtotal - 1', () => {
      const discount = { ...validDiscount, type: 'FLAT', value: 500 }
      const ctx = { ...context, bookingSubtotal: 150 }
      const result = applyDiscount(discount, ctx)
      expect(result.discountAmount).toBe(149)
      expect(result.finalTotal).toBe(1)
    })
  })
})
