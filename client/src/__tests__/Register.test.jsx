import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import Register from '../pages/Register'
import { AuthContext } from '../context/AuthContext'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderRegister(authValue = {}) {
  const defaultAuth = { user: null, loading: false, login: vi.fn(), register: vi.fn(), logout: vi.fn(), refreshUser: vi.fn(), ...authValue }
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={defaultAuth}>
        <Register />
      </AuthContext.Provider>
    </BrowserRouter>
  )
}

describe('Register Page', () => {
  beforeEach(() => { mockNavigate.mockClear() })

  it('renders all fields', () => {
    renderRegister()
    expect(screen.getByPlaceholderText(/Your name/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/10-digit mobile/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Min. 6 characters/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Re-enter/i)).toBeInTheDocument()
  })

  it('shows error when passwords do not match', async () => {
    renderRegister()
    fireEvent.change(screen.getByPlaceholderText(/Your name/i), { target: { value: 'Test User' } })
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByPlaceholderText(/10-digit mobile/i), { target: { value: '9876543210' } })
    fireEvent.change(screen.getByPlaceholderText(/Min. 6 characters/i), { target: { value: 'pass123' } })
    fireEvent.change(screen.getByPlaceholderText(/Re-enter/i), { target: { value: 'different' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument()
    })
  })

  it('calls register on valid form submission', async () => {
    const mockRegister = vi.fn().mockResolvedValue({ role: 'user' })
    renderRegister({ register: mockRegister })

    fireEvent.change(screen.getByPlaceholderText(/Your name/i), { target: { value: 'Test User' } })
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByPlaceholderText(/10-digit mobile/i), { target: { value: '9876543210' } })
    fireEvent.change(screen.getByPlaceholderText(/Min. 6 characters/i), { target: { value: 'pass123' } })
    fireEvent.change(screen.getByPlaceholderText(/Re-enter/i), { target: { value: 'pass123' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({ name: 'Test User', email: 'test@test.com', phone: '9876543210', password: 'pass123' })
    })
  })

  it('has link to login page', () => {
    renderRegister()
    expect(screen.getByText(/Sign in/i)).toBeInTheDocument()
  })
})
