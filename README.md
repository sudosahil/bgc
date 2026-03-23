# Bombay Gaming Company — Website

Full-stack booking platform for Bombay Gaming Company, Ghatkopar, Mumbai.

## Quick Start

### 1. Install dependencies

```bash
# Server
cd server && npm install

# Client
cd ../client && npm install
```

### 2. Configure environment

The server `.env` file is pre-configured for development. To use Razorpay, update:
```
RAZORPAY_KEY_ID=rzp_test_your_key
RAZORPAY_KEY_SECRET=your_secret
```

### 3. Run

```bash
# Terminal 1 — Start server (port 5000)
cd server && npm start

# Terminal 2 — Start client (port 5173)
cd client && npm run dev
```

Open http://localhost:5173

---

## Demo Accounts

| Role  | Email              | Password  |
|-------|--------------------|-----------|
| Player | player@bgc.com    | player123 |
| Admin  | admin@bgc.com     | admin123  |

---

## Features

### Booking System
- Choose station type (PC / PlayStation / Pool Table)
- Pick date, time, duration (1–8 hrs)
- See live station availability
- Pay via Wallet or Cash at Counter
- 50% deposit locks the slot; remaining 50% due 2 hours before start
- Auto-cancel with wallet refund if final payment missed

### Digital Wallet
- Top up via Razorpay (or mock top-up in dev mode)
- Earn 1 point per ₹1 spent
- Redeem 100 points for ₹10 wallet credit
- Full transaction history

### Admin Dashboard
- Overview: today's revenue, active bookings, utilization
- Manage all bookings (confirm, cancel, complete)
- Create walk-in entries for cash customers
- User management (view, activate/deactivate)
- Analytics with revenue charts (7/30/90 day views)

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Express.js + Node.js |
| Database | SQLite (better-sqlite3) |
| Auth | JWT + bcryptjs |
| Payments | Razorpay |
| Scheduler | node-cron (auto-cancellation) |
| Charts | Recharts |

---

## Tests

```bash
# Server tests (Jest + supertest)
cd server && npm test

# Client tests (Vitest + Testing Library)
cd client && npm test
```

---

## Stations

| Type | Count | Rate |
|------|-------|------|
| Gaming PC | 20 | ₹50/hr |
| PlayStation 5 | 3 | ₹150/hr |
| Pool Table | 1 | ₹450/hr |

---

## Location
Ghatkopar West, Mumbai – 400086
Open daily 10:00 AM – 11:00 PM
