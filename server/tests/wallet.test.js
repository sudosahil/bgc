const request = require('supertest')
jest.resetModules()
const app = require('../index')
const { getDb } = require('../db/database')

let token, userId

beforeAll(async () => {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Wallet Tester', email: 'wallet@test.com', phone: '9400000001', password: 'pass123',
  })
  token = res.body.token
  userId = res.body.user.id
})

describe('GET /api/wallet', () => {
  it('returns wallet balance and points', async () => {
    const res = await request(app).get('/api/wallet').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('wallet_balance')
    expect(res.body).toHaveProperty('points')
    expect(res.body.wallet_balance).toBe(0)
  })

  it('requires auth', async () => {
    const res = await request(app).get('/api/wallet')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/wallet/topup/manual', () => {
  it('credits wallet with valid amount', async () => {
    const res = await request(app)
      .post('/api/wallet/topup/manual')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 500 })
    expect(res.status).toBe(200)
    expect(res.body.wallet_balance).toBe(500)
  })

  it('rejects amount below 50', async () => {
    const res = await request(app)
      .post('/api/wallet/topup/manual')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 10 })
    expect(res.status).toBe(400)
  })

  it('rejects amount above 50000', async () => {
    const res = await request(app)
      .post('/api/wallet/topup/manual')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 99999 })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/wallet/redeem-points', () => {
  beforeAll(async () => {
    const db = getDb()
    db.prepare('UPDATE users SET points = 500 WHERE id = ?').run(userId)
  })

  it('redeems 100 points for ₹10', async () => {
    const before = await request(app).get('/api/wallet').set('Authorization', `Bearer ${token}`)
    const res = await request(app)
      .post('/api/wallet/redeem-points')
      .set('Authorization', `Bearer ${token}`)
      .send({ points: 100 })
    expect(res.status).toBe(200)
    expect(res.body.wallet_balance).toBe(before.body.wallet_balance + 10)
    expect(res.body.points).toBe(400)
  })

  it('rejects redemption below 100 points', async () => {
    const res = await request(app)
      .post('/api/wallet/redeem-points')
      .set('Authorization', `Bearer ${token}`)
      .send({ points: 50 })
    expect(res.status).toBe(400)
  })

  it('rejects redemption with non-multiple of 100', async () => {
    const res = await request(app)
      .post('/api/wallet/redeem-points')
      .set('Authorization', `Bearer ${token}`)
      .send({ points: 150 })
    expect(res.status).toBe(400)
  })

  it('rejects redemption when insufficient points', async () => {
    const db = getDb()
    db.prepare('UPDATE users SET points = 50 WHERE id = ?').run(userId)
    const res = await request(app)
      .post('/api/wallet/redeem-points')
      .set('Authorization', `Bearer ${token}`)
      .send({ points: 100 })
    expect(res.status).toBe(400)
  })
})

describe('GET /api/wallet/transactions', () => {
  it('returns transaction history', async () => {
    const res = await request(app)
      .get('/api/wallet/transactions')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.transactions)).toBe(true)
    expect(res.body.transactions.length).toBeGreaterThan(0)
  })
})
