import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Trophy, Calendar, Users, ChevronLeft, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import dayjs from 'dayjs'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

const fmtDate = (d) => dayjs(d).format('D MMM YYYY, h:mm A')

const STATUS_CONFIG = {
  open:      { label: 'OPEN',      className: 'bg-bgc-success/15 text-bgc-success border border-bgc-success/30' },
  closed:    { label: 'CLOSED',    className: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30' },
  ongoing:   { label: 'ONGOING',   className: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30' },
  completed: { label: 'COMPLETED', className: 'bg-bgc-muted/20 text-bgc-muted border border-bgc-border' },
  cancelled: { label: 'CANCELLED', className: 'bg-bgc-error/15 text-bgc-error border border-bgc-error/30' },
  draft:     { label: 'DRAFT',     className: 'bg-bgc-muted/20 text-bgc-muted border border-bgc-border' },
}

const GAME_TYPE_CONFIG = {
  ALL:  { label: 'ALL',  className: 'bg-bgc-pink/10 text-bgc-pink border border-bgc-pink/30' },
  PC:   { label: 'PC',   className: 'bg-blue-500/10 text-blue-400 border border-blue-500/30' },
  PS5:  { label: 'PS5',  className: 'bg-bgc-pink/10 text-bgc-pink border border-bgc-pink/30' },
  POOL: { label: 'POOL', className: 'bg-purple-500/10 text-purple-400 border border-purple-500/30' },
}

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded text-xs font-bold tracking-wider ${cfg.className}`}
      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
      {cfg.label}
    </span>
  )
}

function GameTypeBadge({ type }) {
  const cfg = GAME_TYPE_CONFIG[type] || GAME_TYPE_CONFIG.ALL
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold tracking-wider border ${cfg.className}`}
      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
      {cfg.label}
    </span>
  )
}

function InfoGrid({ tournament }) {
  const spotsLeft = tournament.max_participants - (tournament.registration_count || 0)
  const items = [
    { label: 'Entry Fee', value: tournament.entry_fee > 0 ? `₹${tournament.entry_fee}` : 'FREE', highlight: tournament.entry_fee === 0 },
    { label: 'Prize Pool', value: tournament.prize_pool || '—' },
    { label: 'Tournament Date', value: fmtDate(tournament.tournament_date) },
    { label: 'Format', value: tournament.format },
    { label: 'Max Participants', value: tournament.max_participants },
    { label: 'Spots Left', value: spotsLeft <= 0 ? 'FULL' : spotsLeft, error: spotsLeft <= 0 },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map(item => (
        <div key={item.label} className="bg-bgc-elevated border border-bgc-border rounded-xl p-3">
          <p className="text-bgc-muted text-xs mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em' }}>
            {item.label.toUpperCase()}
          </p>
          <p className={`font-heading text-base ${item.highlight ? 'text-bgc-success' : item.error ? 'text-bgc-error' : 'text-bgc-text'}`}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  )
}

function RegistrationCTA({ tournament, registrations, onRegister, onCancel, loading }) {
  const { user } = useAuth()
  const [teamName, setTeamName] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [confirmVisible, setConfirmVisible] = useState(false)

  const now = new Date()
  const regEnd = new Date(tournament.registration_end)
  const regStart = new Date(tournament.registration_start)
  const spotsLeft = tournament.max_participants - (tournament.registration_count || 0)

  const isOpen = tournament.status === 'open'
  const regWindowActive = now >= regStart && now <= regEnd
  const isFull = spotsLeft <= 0
  const isRegistered = tournament.is_registered

  if (!user) {
    return (
      <div className="bg-bgc-surface border border-bgc-border rounded-xl p-5 text-center">
        <Trophy size={32} className="text-bgc-pink mx-auto mb-3" />
        <p className="text-bgc-text font-semibold mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>Want to compete?</p>
        <p className="text-bgc-muted text-sm mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>Log in to register for this tournament.</p>
        <Link to="/login" className="btn-primary text-sm">Login to Register</Link>
      </div>
    )
  }

  if (isRegistered) {
    return (
      <div className="bg-bgc-success/10 border border-bgc-success/30 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <CheckCircle size={20} className="text-bgc-success mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-bgc-success font-semibold mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>You're registered!</p>
            <p className="text-bgc-muted text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
              See you on {fmtDate(tournament.tournament_date)}.
            </p>
          </div>
        </div>
        {isOpen && regWindowActive && (
          <button onClick={onCancel} disabled={loading}
            className="mt-4 w-full btn-outline text-bgc-error border-bgc-error/40 hover:bg-bgc-error/10 text-sm py-2 disabled:opacity-50">
            {loading ? 'Cancelling…' : 'Cancel Registration'}
          </button>
        )}
      </div>
    )
  }

  if (!isOpen) {
    const reasons = {
      closed: 'Registration is closed.',
      ongoing: 'Tournament is currently ongoing.',
      completed: 'This tournament has ended.',
      cancelled: 'This tournament has been cancelled.',
      draft: 'This tournament is not yet open.',
    }
    return (
      <div className="bg-bgc-elevated border border-bgc-border rounded-xl p-5">
        <div className="flex items-start gap-3">
          <XCircle size={20} className="text-bgc-muted mt-0.5 shrink-0" />
          <p className="text-bgc-muted text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
            {reasons[tournament.status] || 'Registration unavailable.'}
          </p>
        </div>
      </div>
    )
  }

  if (!regWindowActive) {
    return (
      <div className="bg-bgc-elevated border border-bgc-border rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Clock size={20} className="text-bgc-muted mt-0.5 shrink-0" />
          <p className="text-bgc-muted text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
            {now < regStart
              ? `Registration opens ${fmtDate(tournament.registration_start)}`
              : 'Registration has closed.'}
          </p>
        </div>
      </div>
    )
  }

  if (isFull) {
    return (
      <div className="bg-bgc-error/10 border border-bgc-error/30 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-bgc-error mt-0.5 shrink-0" />
          <p className="text-bgc-error text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
            This tournament is full. No more registrations are being accepted.
          </p>
        </div>
      </div>
    )
  }

  // Can register
  const needsTeamName = tournament.format !== 'SOLO'

  const handleSubmit = () => {
    if (needsTeamName && !teamName.trim()) return
    onRegister(teamName.trim() || null)
    setShowForm(false)
    setConfirmVisible(false)
  }

  return (
    <div className="bg-bgc-surface border border-bgc-border rounded-xl p-5" style={{ borderTop: '2px solid #ff1a6b' }}>
      <div className="flex items-center gap-2 mb-3">
        <Trophy size={18} className="text-bgc-pink" />
        <p className="text-bgc-text font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>Register for this tournament</p>
      </div>

      {tournament.entry_fee > 0 && (
        <div className="bg-bgc-pink/5 border border-bgc-pink/20 rounded-lg px-3 py-2.5 mb-4 flex items-start gap-2">
          <AlertCircle size={14} className="text-bgc-pink mt-0.5 shrink-0" />
          <p className="text-bgc-muted text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
            Entry fee of <span className="text-bgc-pink font-semibold">₹{tournament.entry_fee}</span> will be deducted from your wallet.
            Current balance: <span className="text-bgc-text font-semibold">₹{user.wallet_balance?.toFixed(2)}</span>
          </p>
        </div>
      )}

      {!showForm ? (
        <button onClick={() => { setShowForm(true); setConfirmVisible(false) }}
          className="w-full btn-primary text-sm py-2.5">
          Register Now
        </button>
      ) : (
        <div className="space-y-3">
          {needsTeamName && (
            <div>
              <label className="label">Team Name <span className="text-bgc-error">*</span></label>
              <input
                type="text"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                placeholder={tournament.format === 'DUO' ? 'Enter duo team name' : 'Enter team name'}
                className="input w-full"
                maxLength={60}
              />
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => { setShowForm(false); setTeamName('') }}
              className="flex-1 btn-ghost text-sm py-2">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || (needsTeamName && !teamName.trim())}
              className="flex-1 btn-primary text-sm py-2 disabled:opacity-50">
              {loading ? 'Registering…' : 'Confirm'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TournamentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()

  const [tournament, setTournament] = useState(null)
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  const fetchData = () => {
    setLoading(true)
    api.get(`/tournaments/${id}`)
      .then(r => {
        setTournament(r.data.tournament)
        setRegistrations(r.data.registrations)
      })
      .catch(() => setError('Tournament not found'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [id])

  const handleRegister = async (teamName) => {
    setActionLoading(true)
    setActionError('')
    setActionSuccess('')
    try {
      await api.post(`/tournaments/${id}/register`, { team_name: teamName })
      setActionSuccess('Successfully registered! See you at the tournament.')
      if (refreshUser) refreshUser()
      fetchData()
    } catch (err) {
      setActionError(err.response?.data?.error || 'Registration failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!window.confirm('Cancel your registration for this tournament?')) return
    setActionLoading(true)
    setActionError('')
    setActionSuccess('')
    try {
      await api.delete(`/tournaments/${id}/register`)
      setActionSuccess('Registration cancelled.')
      if (refreshUser) refreshUser()
      fetchData()
    } catch (err) {
      setActionError(err.response?.data?.error || 'Cancellation failed')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-bgc-base">
        <Navbar />
        <main className="flex-1 flex items-center justify-center pt-16">
          <div className="w-8 h-8 border-2 border-bgc-pink border-t-transparent rounded-full animate-spin" />
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen flex flex-col bg-bgc-base">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center pt-16 gap-4">
          <Trophy size={48} className="text-bgc-muted opacity-40" />
          <p className="text-bgc-muted text-lg font-heading">Tournament not found</p>
          <Link to="/tournaments" className="btn-outline text-sm">Back to Tournaments</Link>
        </main>
        <Footer />
      </div>
    )
  }

  const spotsLeft = tournament.max_participants - (tournament.registration_count || 0)
  const progressPct = Math.min(100, ((tournament.registration_count || 0) / tournament.max_participants) * 100)

  return (
    <div className="min-h-screen flex flex-col bg-bgc-base">
      <Navbar />

      <main className="flex-1 pt-20">
        <div className="max-w-5xl mx-auto px-6 py-8">

          {/* Back button */}
          <Link to="/tournaments" className="inline-flex items-center gap-1.5 text-bgc-muted hover:text-bgc-text transition-colors text-sm mb-6">
            <ChevronLeft size={16} />
            Back to Tournaments
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">

              {/* Title & badges */}
              <div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <GameTypeBadge type={tournament.game_type} />
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold tracking-wider bg-bgc-elevated text-bgc-muted border border-bgc-border"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {tournament.format}
                  </span>
                  <StatusPill status={tournament.status} />
                </div>
                <h1 className="font-heading text-4xl sm:text-5xl text-bgc-text mb-2">{tournament.title}</h1>
                <p className="text-bgc-muted text-sm leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {tournament.description}
                </p>
              </div>

              {/* Info grid */}
              <InfoGrid tournament={tournament} />

              {/* Registration progress */}
              <div className="bg-bgc-surface border border-bgc-border rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <Users size={15} className="text-bgc-pink" />
                    <span className="text-bgc-text text-sm font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Participants
                    </span>
                  </div>
                  <span className="text-bgc-muted text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {tournament.registration_count || 0} / {tournament.max_participants}
                  </span>
                </div>
                <div className="h-2 bg-bgc-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${progressPct}%`,
                      background: spotsLeft <= 0 ? '#ef4444' : '#ff1a6b',
                    }}
                  />
                </div>
                {spotsLeft > 0 && (
                  <p className="text-bgc-muted text-xs mt-1.5" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} remaining
                  </p>
                )}
              </div>

              {/* Rules */}
              {tournament.rules && (
                <div className="bg-bgc-surface border border-bgc-border rounded-xl p-5">
                  <h3 className="font-heading text-lg text-bgc-text mb-3">Tournament Rules</h3>
                  <div className="text-bgc-muted text-sm leading-relaxed whitespace-pre-line" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {tournament.rules}
                  </div>
                </div>
              )}

              {/* Participants list */}
              {registrations.length > 0 && (
                <div className="bg-bgc-surface border border-bgc-border rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-bgc-border">
                    <h3 className="font-heading text-lg text-bgc-text">
                      Registered Participants <span className="text-bgc-pink ml-1">{registrations.length}</span>
                    </h3>
                  </div>
                  <div className="divide-y divide-bgc-border">
                    {registrations.map((r, i) => (
                      <div key={r.id} className="px-5 py-3 flex items-center gap-3">
                        <span className="text-bgc-muted text-xs w-6 shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div className="w-7 h-7 rounded-full bg-bgc-elevated border border-bgc-border flex items-center justify-center text-xs font-bold text-bgc-pink">
                          {r.name?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-bgc-text text-sm font-medium truncate">{r.name}</p>
                          {r.team_name && (
                            <p className="text-bgc-muted text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>{r.team_name}</p>
                          )}
                        </div>
                        <span className="text-bgc-muted text-xs shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {dayjs(r.created_at).format('D MMM')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Registration CTA */}
              <RegistrationCTA
                tournament={tournament}
                registrations={registrations}
                onRegister={handleRegister}
                onCancel={handleCancel}
                loading={actionLoading}
              />

              {/* Action messages */}
              {actionSuccess && (
                <div className="bg-bgc-success/10 border border-bgc-success/30 rounded-xl p-3 flex items-start gap-2">
                  <CheckCircle size={15} className="text-bgc-success mt-0.5 shrink-0" />
                  <p className="text-bgc-success text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>{actionSuccess}</p>
                </div>
              )}
              {actionError && (
                <div className="bg-bgc-error/10 border border-bgc-error/30 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle size={15} className="text-bgc-error mt-0.5 shrink-0" />
                  <p className="text-bgc-error text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>{actionError}</p>
                </div>
              )}

              {/* Date info card */}
              <div className="bg-bgc-surface border border-bgc-border rounded-xl p-4 space-y-3">
                <h4 className="text-bgc-muted text-xs font-bold tracking-wider" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  IMPORTANT DATES
                </h4>
                <div className="space-y-2">
                  {[
                    { label: 'Reg. Opens', value: fmtDate(tournament.registration_start) },
                    { label: 'Reg. Closes', value: fmtDate(tournament.registration_end) },
                    { label: 'Tournament', value: fmtDate(tournament.tournament_date) },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-2">
                      <Calendar size={12} className="text-bgc-pink mt-1 shrink-0" />
                      <div>
                        <p className="text-bgc-muted text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>{item.label}</p>
                        <p className="text-bgc-text text-xs font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
