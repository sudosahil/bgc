import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import Login from '../pages/Login'
import { AuthContext } from '../context/AuthContext'

// Mock react-router-dom navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate, useLocation: () => ({ state: null }) }
})

function renderLogin(authValue = {}) {
  const defaultAuth = { user: null, loading: false, login: vi.fn(), register: vi.fn(), logout: vi.fn(), refreshUser: vi.fn(), ...authValue }
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={defaultAuth}>
        <Login />
      </AuthContext.Provider>
    </BrowserRouter>
  )
}

describe('Login Page', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('renders login form', () => {
    renderLogin()
    expect(screen.getByPlaceholderText(/email or 10-digit/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows demo credentials', () => {
    renderLogin()
    expect(screen.getByText(/Demo Accounts/i)).toBeInTheDocument()
    expect(screen.getByText(/player@bgc.com/i)).toBeInTheDocument()
    expect(screen.getByText(/admin@bgc.com/i)).toBeInTheDocument()
  })

  it('calls login with form data on submit', async () => {
    const mockLogin = vi.fn().mockResolvedValue({ role: 'user' })
    renderLogin({ login: mockLogin })

    fireEvent.change(screen.getByPlaceholderText(/email or 10-digit/i), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'pass123' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'pass123')
    })
  })

  it('shows error on failed login', async () => {
    const mockLogin = vi.fn().mockRejectedValue({ response: { data: { error: 'Invalid credentials' } } })
    renderLogin({ login: mockLogin })

    fireEvent.change(screen.getByPlaceholderText(/email or 10-digit/i), { target: { value: 'bad@test.com' } })
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument()
    })
  })

  it('redirects admin to /admin after login', async () => {
    const mockLogin = vi.fn().mockResolvedValue({ role: 'admin' })
    renderLogin({ login: mockLogin })

    fireEvent.change(screen.getByPlaceholderText(/email or 10-digit/i), { target: { value: 'admin@bgc.com' } })
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'admin123' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin', { replace: true })
    })
  })

  it('has link to register page', () => {
    renderLogin()
    expect(screen.getByText(/Create one/i)).toBeInTheDocument()
  })

  it('toggles password visibility', () => {
    renderLogin()
    const passwordInput = screen.getByPlaceholderText(/password/i)
    expect(passwordInput.type).toBe('password')

    const toggleBtn = screen.getByRole('button', { name: '' }) // eye button
    fireEvent.click(toggleBtn)
    expect(passwordInput.type).toBe('text')
  })
})
