const request = require('supertest')
jest.resetModules()
const app = require('../index')
const { getDb } = require('../db/database')

let adminToken, userToken, userId

beforeAll(async () => {
  // Admin login (seeded in DB)
  const adminRes = await request(app).post('/api/auth/login').send({
    identifier: 'admin@bgc.com', password: 'admin123',
  })
  adminToken = adminRes.body.token

  // Register normal user
  const userRes = await request(app).post('/api/auth/register').send({
    name: 'Admin Test User', email: 'admintest@test.com', phone: '9500000001', password: 'pass123',
  })
  userToken = userRes.body.token
  userId = userRes.body.user.id
})

describe('Admin access control', () => {
  it('blocks non-admin from /api/admin/overview', async () => {
    const res = await request(app).get('/api/admin/overview').set('Authorization', `Bearer ${userToken}`)
    expect(res.status).toBe(403)
  })

  it('allows admin access', async () => {
    const res = await request(app).get('/api/admin/overview').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
  })
})

describe('GET /api/admin/overview', () => {
  it('returns overview stats', async () => {
    const res = await request(app).get('/api/admin/overview').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('todayRevenue')
    expect(res.body).toHaveProperty('activeBookings')
    expect(res.body).toHaveProperty('totalUsers')
  })
})

describe('GET /api/admin/users', () => {
  it('returns user list', async () => {
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.users)).toBe(true)
    expect(res.body.users.length).toBeGreaterThan(0)
  })
})

describe('POST /api/admin/walkins', () => {
  let stationId

  beforeAll(() => {
    const db = getDb()
    const station = db.prepare("SELECT id FROM stations WHERE type = 'pool' LIMIT 1").get()
    stationId = station.id
  })

  it('creates a walk-in entry', async () => {
    const startTime = new Date(Date.now() + 1000 * 60).toISOString().slice(0, 16)
    const res = await request(app)
      .post('/api/admin/walkins')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        station_id: stationId,
        customer_name: 'Walk-in Customer',
        customer_phone: '9000000099',
        start_time: startTime,
        duration_hours: 1,
        amount_paid: 450,
      })
    expect(res.status).toBe(201)
    expect(res.body.walkin.customer_name).toBe('Walk-in Customer')
  })

  it('blocks regular users from creating walk-ins', async () => {
    const res = await request(app)
      .post('/api/admin/walkins')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ station_id: stationId, customer_name: 'Test', start_time: new Date().toISOString(), duration_hours: 1, amount_paid: 450 })
    expect(res.status).toBe(403)
  })
})

describe('GET /api/admin/bookings', () => {
  it('returns all bookings', async () => {
    const res = await request(app).get('/api/admin/bookings').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.bookings)).toBe(true)
  })

  it('filters by status', async () => {
    const res = await request(app)
      .get('/api/admin/bookings?status=confirmed')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    res.body.bookings.forEach(b => expect(b.status).toBe('confirmed'))
  })
})

describe('GET /api/admin/analytics', () => {
  it('returns analytics data', async () => {
    const res = await request(app).get('/api/admin/analytics').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('dailyRevenue')
    expect(res.body).toHaveProperty('revenueByType')
    expect(res.body).toHaveProperty('popularStations')
  })
})
