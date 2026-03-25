import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Calendar, Users, ChevronRight, Zap } from 'lucide-react'
import dayjs from 'dayjs'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import api from '../api/axios'

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

const FORMAT_CONFIG = {
  SOLO: { label: 'SOLO', className: 'bg-bgc-elevated text-bgc-muted border border-bgc-border' },
  DUO:  { label: 'DUO',  className: 'bg-bgc-elevated text-bgc-muted border border-bgc-border' },
  TEAM: { label: 'TEAM', className: 'bg-bgc-elevated text-bgc-muted border border-bgc-border' },
}

const fmtDate = (d) => dayjs(d).format('D MMM YYYY, h:mm A')

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold tracking-wider ${cfg.className}`}
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

function FormatBadge({ format }) {
  const cfg = FORMAT_CONFIG[format] || FORMAT_CONFIG.SOLO
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold tracking-wider border ${cfg.className}`}
      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
      {cfg.label}
    </span>
  )
}

function TournamentCard({ t }) {
  const spotsLeft = t.max_participants - (t.registration_count || 0)
  const isFull = spotsLeft <= 0
  const regOpen = t.status === 'open' && new Date() <= new Date(t.registration_end)

  return (
    <div className="bg-bgc-surface border border-bgc-border rounded-xl overflow-hidden hover:border-bgc-pink/30 transition-all card-hover"
      style={{ borderTop: '2px solid #ff1a6b' }}>
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-heading text-xl text-bgc-text leading-tight mb-1">{t.title}</h3>
            <div className="flex flex-wrap gap-1.5">
              <GameTypeBadge type={t.game_type} />
              <FormatBadge format={t.format} />
              <StatusPill status={t.status} />
            </div>
          </div>
          <div className="text-right shrink-0">
            {t.entry_fee > 0 ? (
              <div>
                <div className="font-heading text-bgc-pink text-xl leading-none">₹{t.entry_fee}</div>
                <div className="text-bgc-muted text-xs mt-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>entry fee</div>
              </div>
            ) : (
              <div className="bg-bgc-success/10 text-bgc-success border border-bgc-success/30 px-2 py-1 rounded text-xs font-bold"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                FREE
              </div>
            )}
          </div>
        </div>

        {/* Prize pool */}
        {t.prize_pool && (
          <div className="flex items-center gap-2 mb-3 bg-bgc-pink/5 border border-bgc-pink/15 rounded-lg px-3 py-2">
            <Trophy size={14} className="text-bgc-pink shrink-0" />
            <span className="text-bgc-text text-sm font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>{t.prize_pool}</span>
          </div>
        )}

        {/* Info rows */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-xs text-bgc-muted" style={{ fontFamily: 'Inter, sans-serif' }}>
            <Calendar size={12} className="shrink-0" />
            <span>Tournament: <span className="text-bgc-text">{fmtDate(t.tournament_date)}</span></span>
          </div>
          <div className="flex items-center gap-2 text-xs text-bgc-muted" style={{ fontFamily: 'Inter, sans-serif' }}>
            <Zap size={12} className="shrink-0" />
            <span>Reg. closes: <span className="text-bgc-text">{fmtDate(t.registration_end)}</span></span>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
            <Users size={12} className={`shrink-0 ${isFull ? 'text-bgc-error' : 'text-bgc-muted'}`} />
            <span className={isFull ? 'text-bgc-error font-semibold' : 'text-bgc-muted'}>
              {isFull ? 'FULL' : `${spotsLeft} spots left`}
              <span className="text-bgc-muted ml-1">/ {t.max_participants}</span>
            </span>
          </div>
        </div>

        {/* Registration progress */}
        <div className="mb-4">
          <div className="h-1.5 bg-bgc-elevated rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, ((t.registration_count || 0) / t.max_participants) * 100)}%`,
                background: isFull ? '#ef4444' : '#ff1a6b',
              }}
            />
          </div>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-2">
          {t.is_registered && (
            <span className="text-bgc-success text-xs font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
              ✓ Registered
            </span>
          )}
          <Link to={`/tournaments/${t.id}`}
            className={`ml-auto flex items-center gap-1.5 text-sm font-medium ${
              regOpen && !isFull && !t.is_registered
                ? 'btn-primary py-2 px-4'
                : 'btn-outline py-2 px-4'
            }`}>
            {regOpen && !isFull && !t.is_registered ? 'Register' : 'View Details'}
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  )
}

const FILTER_TABS = [
  { key: 'all',       label: 'All' },
  { key: 'open',      label: 'Open' },
  { key: 'upcoming',  label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
]

export default function Tournaments() {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    api.get('/tournaments')
      .then(r => setTournaments(r.data.tournaments))
      .catch(() => setError('Failed to load tournaments'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = tournaments.filter(t => {
    if (filter === 'all') return true
    if (filter === 'open') return t.status === 'open'
    if (filter === 'upcoming') return ['draft', 'closed'].includes(t.status) || (t.status === 'open' && new Date(t.registration_start) > new Date())
    if (filter === 'completed') return ['completed', 'cancelled'].includes(t.status)
    return true
  })

  return (
    <div className="min-h-screen flex flex-col bg-bgc-base">
      <Navbar />

      <main className="flex-1 pt-20">
        {/* Page header */}
        <div className="bg-bgc-surface border-b border-bgc-border">
          <div className="max-w-6xl mx-auto px-6 py-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-pink flex items-center justify-center">
                <Trophy size={20} className="text-white" />
              </div>
              <span className="section-label">// TOURNAMENTS</span>
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl text-bgc-text mb-2">Compete &amp; Win</h1>
            <p className="text-bgc-muted text-sm max-w-xl" style={{ fontFamily: 'Inter, sans-serif' }}>
              Join official BGC tournaments. Register your spot, compete against the best, and walk away with prizes.
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex gap-2 flex-wrap mb-6">
            {FILTER_TABS.map(tab => (
              <button key={tab.key} onClick={() => setFilter(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === tab.key
                    ? 'bg-bgc-pink text-white'
                    : 'bg-bgc-surface border border-bgc-border text-bgc-muted hover:text-bgc-text hover:border-bgc-pink/30'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-bgc-pink border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="bg-bgc-error/10 border border-bgc-error/30 rounded-xl p-4 text-bgc-error text-sm text-center">
              {error}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="text-center py-20">
              <Trophy size={48} className="text-bgc-muted mx-auto mb-4 opacity-40" />
              <p className="text-bgc-muted text-lg font-heading">No tournaments found</p>
              <p className="text-bgc-muted text-sm mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                Check back soon for upcoming tournaments.
              </p>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(t => <TournamentCard key={t.id} t={t} />)}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
