import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { server } from '../mocks/server'

/* ─── MSW lifecycle ─── */
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

/* ───────────────────────────────────────────
   GET /api/discounts
   ─────────────────────────────────────────── */
describe('GET /api/discounts', () => {
  it('returns an array of discounts', async () => {
    const res = await fetch('/api/discounts')
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.discounts).toBeInstanceOf(Array)
    expect(data.discounts.length).toBeGreaterThan(0)
  })

  it('returns discounts with expected fields', async () => {
    const res = await fetch('/api/discounts')
    const data = await res.json()
    const discount = data.discounts[0]
    expect(discount).toHaveProperty('code')
    expect(discount).toHaveProperty('type')
    expect(discount).toHaveProperty('value')
    expect(discount).toHaveProperty('is_active', true)
  })
})

/* ───────────────────────────────────────────
   POST /api/discounts/validate
   ─────────────────────────────────────────── */
describe('POST /api/discounts/validate', () => {
  it('returns valid response for known code', async () => {
    const res = await fetch('/api/discounts/validate', {
      method: 'POST',
      body: JSON.stringify({ code: 'BGCWELCOME20', station_type: 'pc', subtotal: 300 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.discountAmount).toBe(60)
    expect(data.finalTotal).toBe(240)
  })

  it('returns 422 for unknown code', async () => {
    const res = await fetch('/api/discounts/validate', {
      method: 'POST',
      body: JSON.stringify({ code: 'FAKECODE', station_type: 'pc', subtotal: 300 }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(422)
    const data = await res.json()
    expect(data.error).toMatch(/doesn't exist/i)
  })

  it('returns 422 for expired code', async () => {
    const res = await fetch('/api/discounts/validate', {
      method: 'POST',
      body: JSON.stringify({ code: 'EXPIRED', station_type: 'pc', subtotal: 300 }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(422)
    const data = await res.json()
    expect(data.error).toMatch(/expired/i)
  })
})

/* ───────────────────────────────────────────
   POST /api/bookings
   ─────────────────────────────────────────── */
describe('POST /api/bookings', () => {
  it('creates booking and returns 201', async () => {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        station_id: 'st-1',
        start_time: '2025-06-15T10:00:00Z',
        duration_hours: 2,
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.booking.status).toBe('confirmed')
    expect(data.booking.id).toBe('booking-123')
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/required/i)
  })
})

/* ───────────────────────────────────────────
   GET /api/bookings/my
   ─────────────────────────────────────────── */
describe('GET /api/bookings/my', () => {
  it('returns user bookings array', async () => {
    const res = await fetch('/api/bookings/my')
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.bookings).toBeInstanceOf(Array)
    expect(data.bookings[0]).toHaveProperty('station_name')
  })
})
