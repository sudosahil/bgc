require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { getDb } = require('./db/database')
const { startCron } = require('./jobs/bookingCron')

const app = express()

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())

// Initialize DB
getDb()

// Routes
app.use('/api/auth',      require('./routes/auth'))
app.use('/api/stations',  require('./routes/stations'))
app.use('/api/bookings',  require('./routes/bookings'))
app.use('/api/wallet',    require('./routes/wallet'))
app.use('/api/admin',     require('./routes/admin'))
app.use('/api/discounts', require('./routes/discounts').router)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5000
  app.listen(PORT, () => {
    console.log(`BGC Server running on http://localhost:${PORT}`)
    startCron()
  })
}

module.exports = app
