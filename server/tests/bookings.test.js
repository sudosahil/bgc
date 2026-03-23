const request = require('supertest')
jest.resetModules()
const app = require('../index')
const { getDb } = require('../db/database')

let userToken, userId, stationId

beforeAll(async () => {
  const reg = await request(app).post('/api/auth/register').send({
    name: 'Booking Tester', email: 'booker@test.com', phone: '9300000001', password: 'pass123',
  })
  userToken = reg.body.token
  userId = reg.body.user.id

  // Give the user wallet balance
  const db = getDb()
  db.prepare('UPDATE users SET wallet_balance = 2000 WHERE id = ?').run(userId)

  // Get a PC station id
  const station = db.prepare("SELECT id FROM stations WHERE type = 'pc' LIMIT 1").get()
  stationId = station.id
})

function futureTime(hoursFromNow = 5) {
  return new Date(Date.now() + hoursFromNow * 3600 * 1000).toISOString().slice(0, 16)
}

describe('POST /api/bookings', () => {
  it('creates a wallet booking and deducts deposit', async () => {
    const startTime = futureTime(5)
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ station_id: stationId, start_time: startTime, duration_hours: 2, payment_method: 'wallet' })

    expect(res.status).toBe(201)
    expect(res.body.booking.status).toBe('confirmed')
    expect(res.body.booking.deposit_paid).toBe(1)

    const db = getDb()
    const user = db.prepare('SELECT wallet_balance FROM users WHERE id = ?').get(userId)
    // deposit = 50 * 2 * 0.5 = 50
    expect(user.wallet_balance).toBe(1950)
  })

  it('creates a cash booking without wallet deduction', async () => {
    const startTime = futureTime(8)
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ station_id: stationId, start_time: startTime, duration_hours: 1, payment_method: 'cash' })

    expect(res.status).toBe(201)
    expect(res.body.booking.status).toBe('pending_cash')
    expect(res.body.booking.deposit_paid).toBe(0)
  })

  it('rejects booking in the past', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ station_id: stationId, start_time: '2020-01-01T10:00', duration_hours: 1 })
    expect(res.status).toBe(400)
  })

  it('rejects booking with insufficient wallet balance', async () => {
    const db = getDb()
    db.prepare('UPDATE users SET wallet_balance = 0 WHERE id = ?').run(userId)

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ station_id: stationId, start_time: futureTime(12), duration_hours: 1, payment_method: 'wallet' })
    expect(res.status).toBe(402)

    db.prepare('UPDATE users SET wallet_balance = 2000 WHERE id = ?').run(userId)
  })

  it('rejects double booking for same station and time', async () => {
    const startTime = futureTime(20)
    // First booking
    await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ station_id: stationId, start_time: startTime, duration_hours: 2, payment_method: 'wallet' })

    // Second booking same slot
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ station_id: stationId, start_time: startTime, duration_hours: 1, payment_method: 'wallet' })
    expect(res.status).toBe(409)
  })

  it('requires authentication', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({ station_id: stationId, start_time: futureTime(30), duration_hours: 1 })
    expect(res.status).toBe(401)
  })
})

describe('GET /api/bookings/my', () => {
  it('returns user bookings', async () => {
    const res = await request(app)
      .get('/api/bookings/my')
      .set('Authorization', `Bearer ${userToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.bookings)).toBe(true)
    expect(res.body.bookings.length).toBeGreaterThan(0)
  })
})

describe('DELETE /api/bookings/:id', () => {
  let bookingId

  beforeAll(async () => {
    const db = getDb()
    db.prepare('UPDATE users SET wallet_balance = 2000 WHERE id = ?').run(userId)

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ station_id: stationId, start_time: futureTime(40), duration_hours: 1, payment_method: 'wallet' })
    bookingId = res.body.booking.id
  })

  it('cancels booking and refunds deposit', async () => {
    const db = getDb()
    const before = db.prepare('SELECT wallet_balance FROM users WHERE id = ?').get(userId)

    const res = await request(app)
      .delete(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${userToken}`)
    expect(res.status).toBe(200)

    const after = db.prepare('SELECT wallet_balance FROM users WHERE id = ?').get(userId)
    expect(after.wallet_balance).toBeGreaterThan(before.wallet_balance)
  })

  it('cannot cancel already cancelled booking', async () => {
    const res = await request(app)
      .delete(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${userToken}`)
    expect(res.status).toBe(400)
  })
})
