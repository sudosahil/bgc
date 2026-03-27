import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'

import Home       from './pages/Home'
import Stations   from './pages/Stations'
import Pricing    from './pages/Pricing'
import Login      from './pages/Login'
import Register   from './pages/Register'
import Dashboard  from './pages/Dashboard'
import Book       from './pages/Book'
import Discounts        from './pages/Discounts'
import Tournaments      from './pages/Tournaments'
import TournamentDetail from './pages/TournamentDetail'
import NotFound         from './pages/NotFound'

import AdminLayout    from './pages/admin/AdminLayout'
import AdminOverview  from './pages/admin/AdminOverview'
import AdminBookings  from './pages/admin/AdminBookings'
import AdminWalkIns   from './pages/admin/AdminWalkIns'
import AdminUsers     from './pages/admin/AdminUsers'
import AdminAnalytics from './pages/admin/AdminAnalytics'
import AdminDiscounts   from './pages/admin/AdminDiscounts'
import AdminTournaments from './pages/admin/AdminTournaments'
import AdminStations    from './pages/admin/AdminStations'

import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute     from './components/AdminRoute'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/"          element={<Home />} />
          <Route path="/stations"  element={<Stations />} />
          <Route path="/pricing"   element={<Pricing />} />
          <Route path="/login"     element={<Login />} />
          <Route path="/register"  element={<Register />} />

          <Route path="/discounts"      element={<Discounts />} />
          <Route path="/tournaments"     element={<Tournaments />} />
          <Route path="/tournaments/:id" element={<TournamentDetail />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/book"      element={<ProtectedRoute><Book /></ProtectedRoute>} />

          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index        element={<Navigate to="/admin/overview" replace />} />
            <Route path="overview"  element={<AdminOverview />} />
            <Route path="bookings"  element={<AdminBookings />} />
            <Route path="walkins"   element={<AdminWalkIns />} />
            <Route path="users"     element={<AdminUsers />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="discounts"   element={<AdminDiscounts />} />
            <Route path="tournaments" element={<AdminTournaments />} />
            <Route path="stations"   element={<AdminStations />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
