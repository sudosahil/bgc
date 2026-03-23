const request = require('supertest')

// Reset module cache so DB_PATH = ':memory:' takes effect
jest.resetModules()
const app = require('../index')

describe('Auth Routes', () => {
  describe('POST /api/auth/register', () => {
    it('registers a new user successfully', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Test User',
        email: 'test@example.com',
        phone: '9123456789',
        password: 'pass123',
      })
      expect(res.status).toBe(201)
      expect(res.body).toHaveProperty('token')
      expect(res.body.user.email).toBe('test@example.com')
      expect(res.body.user.role).toBe('user')
    })

    it('rejects duplicate email', async () => {
      await request(app).post('/api/auth/register').send({
        name: 'User A', email: 'dup@test.com', phone: '9000000001', password: 'pass123',
      })
      const res = await request(app).post('/api/auth/register').send({
        name: 'User B', email: 'dup@test.com', phone: '9000000002', password: 'pass123',
      })
      expect(res.status).toBe(409)
    })

    it('rejects invalid phone number', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Bad Phone', email: 'phone@test.com', phone: '123', password: 'pass123',
      })
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/mobile number/)
    })

    it('rejects short password', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Short', email: 'short@test.com', phone: '9000000003', password: '123',
      })
      expect(res.status).toBe(400)
    })

    it('rejects missing fields', async () => {
      const res = await request(app).post('/api/auth/register').send({ name: 'Only Name' })
      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/auth/login', () => {
    beforeAll(async () => {
      await request(app).post('/api/auth/register').send({
        name: 'Login User', email: 'login@test.com', phone: '9111111111', password: 'mypass123',
      })
    })

    it('logs in with email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        identifier: 'login@test.com', password: 'mypass123',
      })
      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('token')
    })

    it('logs in with phone number', async () => {
      const res = await request(app).post('/api/auth/login').send({
        identifier: '9111111111', password: 'mypass123',
      })
      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('token')
    })

    it('rejects wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        identifier: 'login@test.com', password: 'wrongpass',
      })
      expect(res.status).toBe(401)
    })

    it('rejects non-existent user', async () => {
      const res = await request(app).post('/api/auth/login').send({
        identifier: 'nobody@test.com', password: 'pass123',
      })
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/auth/me', () => {
    let token

    beforeAll(async () => {
      const regRes = await request(app).post('/api/auth/register').send({
        name: 'Me User', email: 'me@test.com', phone: '9222222222', password: 'mypass123',
      })
      token = regRes.body.token
    })

    it('returns current user with valid token', async () => {
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body.user.email).toBe('me@test.com')
    })

    it('rejects request without token', async () => {
      const res = await request(app).get('/api/auth/me')
      expect(res.status).toBe(401)
    })

    it('rejects invalid token', async () => {
      const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer bad.token')
      expect(res.status).toBe(401)
    })
  })
})
