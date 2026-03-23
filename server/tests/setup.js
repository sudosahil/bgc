// Use in-memory DB for tests
process.env.DB_PATH = ':memory:'
process.env.JWT_SECRET = 'test_secret_123'
process.env.JWT_EXPIRES_IN = '1h'
process.env.RAZORPAY_KEY_ID = 'rzp_test_dummy'
process.env.RAZORPAY_KEY_SECRET = 'dummy_secret'
process.env.NODE_ENV = 'test'
