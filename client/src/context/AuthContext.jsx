import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api/axios'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bgc_user')) } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('bgc_token')
    if (!token) { setLoading(false); return }
    try {
      const res = await api.get('/auth/me')
      setUser(res.data.user)
      localStorage.setItem('bgc_user', JSON.stringify(res.data.user))
    } catch {
      localStorage.removeItem('bgc_token')
      localStorage.removeItem('bgc_user')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMe() }, [fetchMe])

  const login = async (identifier, password) => {
    const res = await api.post('/auth/login', { identifier, password })
    localStorage.setItem('bgc_token', res.data.token)
    localStorage.setItem('bgc_user', JSON.stringify(res.data.user))
    setUser(res.data.user)
    return res.data.user
  }

  const register = async (data) => {
    const res = await api.post('/auth/register', data)
    localStorage.setItem('bgc_token', res.data.token)
    localStorage.setItem('bgc_user', JSON.stringify(res.data.user))
    setUser(res.data.user)
    return res.data.user
  }

  const logout = () => {
    localStorage.removeItem('bgc_token')
    localStorage.removeItem('bgc_user')
    setUser(null)
    window.location.href = '/'
  }

  const refreshUser = () => fetchMe()

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
