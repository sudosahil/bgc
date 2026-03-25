import { useState, useEffect, useCallback } from 'react'
import { Trophy, Plus, Edit2, Trash2, Users, ChevronDown, X, AlertCircle, CheckCircle, Eye } from 'lucide-react'
import dayjs from 'dayjs'
import api from '../../api/axios'

const fmtDate = (d) => d ? dayjs(d).format('D MMM YYYY HH:mm') : '—'
const fmtInput = (d) => d ? dayjs(d).format('YYYY-MM-DDTHH:mm') : ''

const GAME_TYPES = ['ALL', 'PC', 'PS5', 'POOL']
const FORMATS    = ['SOLO', 'DUO', 'TEAM']
const STATUSES   = ['draft', 'open', 'closed', 'ongoing', 'completed', 'cancelled']

const STATUS_COLORS = {
  draft:     'bg-bgc-muted/20 text-bgc-muted',
  open:      'bg-bgc-success/15 text-bgc-success',
  closed:    'bg-yellow-500/15 text-yellow-400',
  ongoing:   'bg-yellow-500/15 text-yellow-400',
  completed: 'bg-bgc-muted/20 text-bgc-muted',
  cancelled: 'bg-bgc-error/15 text-bgc-error',
}

const GAME_TYPE_COLORS = {
  ALL:  'bg-bgc-pink/10 text-bgc-pink',
  PC:   'bg-blue-500/10 text-blue-400',
  PS5:  'bg-bgc-pink/10 text-bgc-pink',
  POOL: 'bg-purple-500/10 text-purple-400',
}

const EMPTY_FORM = {
  title: '',
  description: '',
  game_type: 'ALL',
  format: 'SOLO',
  entry_fee: 0,
  prize_pool: '',
  max_participants: 32,
  rules: '',
  registration_start: '',
  registration_end: '',
  tournament_date: '',
  status: 'draft',
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold tracking-wider ${STATUS_COLORS[status] || STATUS_COLORS.draft}`}
      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
      {status.toUpperCase()}
    </span>
  )
}

function ToggleGroup({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all ${
            value === opt
              ? 'bg-bgc-pink text-white'
              : 'bg-bgc-elevated border border-bgc-border text-bgc-muted hover:text-bgc-text hover:border-bgc-pink/30'
          }`}
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          {opt}
        </button>
      ))}
    </div>
  )
}

function TournamentForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || EMPTY_FORM)
  const [errors, setErrors] = useState({})

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const validate = () => {
    const e = {}
    if (!form.title.trim()) e.title = 'Required'
    if (!form.description.trim()) e.description = 'Required'
    if (!form.registration_start) e.registration_start = 'Required'
    if (!form.registration_end) e.registration_end = 'Required'
    if (!form.tournament_date) e.tournament_date = 'Required'
    if (form.registration_start && form.registration_end && form.registration_start >= form.registration_end) {
      e.registration_end = 'Must be after registration start'
    }
    if (form.registration_end && form.tournament_date && form.registration_end >= form.tournament_date) {
      e.tournament_date = 'Must be after registration end'
    }
    if (parseFloat(form.entry_fee) < 0) e.entry_fee = 'Cannot be negative'
    if (parseInt(form.max_participants) < 2) e.max_participants = 'Minimum 2'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    onSave({
      ...form,
      entry_fee: parseFloat(form.entry_fee) || 0,
      max_participants: parseInt(form.max_participants) || 32,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="label">Title <span className="text-bgc-error">*</span></label>
          <input className={`input w-full ${errors.title ? 'border-bgc-error' : ''}`}
            value={form.title} onChange={e => set('title', e.target.value)} placeholder="Tournament title" />
          {errors.title && <p className="text-bgc-error text-xs mt-1">{errors.title}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="label">Description <span className="text-bgc-error">*</span></label>
          <textarea className={`input w-full min-h-[80px] resize-y ${errors.description ? 'border-bgc-error' : ''}`}
            value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="Describe the tournament..." />
          {errors.description && <p className="text-bgc-error text-xs mt-1">{errors.description}</p>}
        </div>

        <div>
          <label className="label">Game Type</label>
          <ToggleGroup options={GAME_TYPES} value={form.game_type} onChange={v => set('game_type', v)} />
        </div>

        <div>
          <label className="label">Format</label>
          <ToggleGroup options={FORMATS} value={form.format} onChange={v => set('format', v)} />
        </div>

        <div>
          <label className="label">Entry Fee (₹)</label>
          <input type="number" min="0" step="1" className={`input w-full ${errors.entry_fee ? 'border-bgc-error' : ''}`}
            value={form.entry_fee} onChange={e => set('entry_fee', e.target.value)} />
          {errors.entry_fee && <p className="text-bgc-error text-xs mt-1">{errors.entry_fee}</p>}
          <p className="text-bgc-muted text-xs mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>0 = Free entry</p>
        </div>

        <div>
          <label className="label">Prize Pool</label>
          <input className="input w-full" value={form.prize_pool}
            onChange={e => set('prize_pool', e.target.value)} placeholder="e.g. ₹5000 + Trophy" />
        </div>

        <div>
          <label className="label">Max Participants</label>
          <input type="number" min="2" className={`input w-full ${errors.max_participants ? 'border-bgc-error' : ''}`}
            value={form.max_participants} onChange={e => set('max_participants', e.target.value)} />
          {errors.max_participants && <p className="text-bgc-error text-xs mt-1">{errors.max_participants}</p>}
        </div>

        <div>
          <label className="label">Status</label>
          <select className="input w-full" value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Registration Opens <span className="text-bgc-error">*</span></label>
          <input type="datetime-local" className={`input w-full ${errors.registration_start ? 'border-bgc-error' : ''}`}
            value={form.registration_start} onChange={e => set('registration_start', e.target.value)} />
          {errors.registration_start && <p className="text-bgc-error text-xs mt-1">{errors.registration_start}</p>}
        </div>

        <div>
          <label className="label">Registration Closes <span className="text-bgc-error">*</span></label>
          <input type="datetime-local" className={`input w-full ${errors.registration_end ? 'border-bgc-error' : ''}`}
            value={form.registration_end} onChange={e => set('registration_end', e.target.value)} />
          {errors.registration_end && <p className="text-bgc-error text-xs mt-1">{errors.registration_end}</p>}
        </div>

        <div>
          <label className="label">Tournament Date <span className="text-bgc-error">*</span></label>
          <input type="datetime-local" className={`input w-full ${errors.tournament_date ? 'border-bgc-error' : ''}`}
            value={form.tournament_date} onChange={e => set('tournament_date', e.target.value)} />
          {errors.tournament_date && <p className="text-bgc-error text-xs mt-1">{errors.tournament_date}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="label">Rules</label>
          <textarea className="input w-full min-h-[100px] resize-y"
            value={form.rules} onChange={e => set('rules', e.target.value)}
            placeholder="Enter tournament rules, one per line..." />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-ghost text-sm px-5">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary text-sm px-6 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Tournament'}
        </button>
      </div>
    </form>
  )
}

function RegistrationsModal({ tournament, onClose }) {
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/admin/tournaments/${tournament.id}/registrations`)
      .then(r => setRegistrations(r.data.registrations))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tournament.id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-bgc-surface border border-bgc-border rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-bgc-border">
          <div>
            <h3 className="font-heading text-xl text-bgc-text">{tournament.title}</h3>
            <p className="text-bgc-muted text-xs mt-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>
              {registrations.length} registration{registrations.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-bgc-muted hover:text-bgc-text transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-bgc-pink border-t-transparent rounded-full animate-spin" />
            </div>
          ) : registrations.length === 0 ? (
            <div className="text-center py-12 text-bgc-muted" style={{ fontFamily: 'Inter, sans-serif' }}>
              No registrations yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-bgc-elevated text-bgc-muted text-xs" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                <tr>
                  <th className="text-left px-4 py-2.5">#</th>
                  <th className="text-left px-4 py-2.5">NAME</th>
                  <th className="text-left px-4 py-2.5">EMAIL</th>
                  <th className="text-left px-4 py-2.5">PHONE</th>
                  <th className="text-left px-4 py-2.5">TEAM</th>
                  <th className="text-left px-4 py-2.5">PAYMENT</th>
                  <th className="text-left px-4 py-2.5">REGISTERED</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bgc-border">
                {registrations.map((r, i) => (
                  <tr key={r.id} className="hover:bg-bgc-elevated/50 transition-colors">
                    <td className="px-4 py-3 text-bgc-muted" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {String(i + 1).padStart(2, '0')}
                    </td>
                    <td className="px-4 py-3 text-bgc-text font-medium">{r.name}</td>
                    <td className="px-4 py-3 text-bgc-muted text-xs">{r.email}</td>
                    <td className="px-4 py-3 text-bgc-muted text-xs">{r.phone}</td>
                    <td className="px-4 py-3 text-bgc-muted text-xs">{r.team_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        r.payment_status === 'paid' ? 'bg-bgc-success/15 text-bgc-success' :
                        r.payment_status === 'refunded' ? 'bg-bgc-muted/20 text-bgc-muted' :
                        'bg-bgc-elevated text-bgc-muted'
                      }`} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                        {r.payment_status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-bgc-muted text-xs">{dayjs(r.created_at).format('D MMM HH:mm')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function DeleteModal({ tournament, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md bg-bgc-surface border border-bgc-border rounded-2xl p-6 shadow-2xl">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-bgc-error/15 flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-bgc-error" />
          </div>
          <div>
            <h3 className="font-heading text-xl text-bgc-text">Delete Tournament</h3>
            <p className="text-bgc-muted text-sm mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
              Delete <span className="text-bgc-text font-semibold">{tournament.title}</span>?
              All registrations will be removed and paid entry fees will be refunded.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 btn-ghost text-sm">Cancel</button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 bg-bgc-error text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-bgc-error/90 transition-colors disabled:opacity-50">
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminTournaments() {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [view, setView] = useState('list') // list | create | edit
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [regsTarget, setRegsTarget] = useState(null)

  const flash = (msg, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(''), 4000) }
    else { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }
  }

  const fetchTournaments = useCallback(() => {
    setLoading(true)
    api.get('/admin/tournaments')
      .then(r => setTournaments(r.data.tournaments))
      .catch(() => flash('Failed to load tournaments', true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchTournaments() }, [fetchTournaments])

  const handleCreate = async (formData) => {
    setSaving(true)
    try {
      await api.post('/admin/tournaments', formData)
      flash('Tournament created!')
      setView('list')
      fetchTournaments()
    } catch (err) {
      flash(err.response?.data?.error || 'Failed to create tournament', true)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (formData) => {
    setSaving(true)
    try {
      await api.put(`/admin/tournaments/${editing.id}`, formData)
      flash('Tournament updated!')
      setView('list')
      setEditing(null)
      fetchTournaments()
    } catch (err) {
      flash(err.response?.data?.error || 'Failed to update tournament', true)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/admin/tournaments/${deleteTarget.id}`)
      flash('Tournament deleted and fees refunded.')
      setDeleteTarget(null)
      fetchTournaments()
    } catch (err) {
      flash(err.response?.data?.error || 'Failed to delete', true)
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const handleStatusChange = async (id, status) => {
    try {
      await api.put(`/admin/tournaments/${id}/status`, { status })
      setTournaments(prev => prev.map(t => t.id === id ? { ...t, status } : t))
      flash('Status updated.')
    } catch (err) {
      flash(err.response?.data?.error || 'Failed to update status', true)
    }
  }

  const startEdit = (t) => {
    setEditing({
      ...t,
      registration_start: fmtInput(t.registration_start),
      registration_end: fmtInput(t.registration_end),
      tournament_date: fmtInput(t.tournament_date),
    })
    setView('edit')
  }

  if (view === 'create' || view === 'edit') {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setView('list'); setEditing(null) }}
            className="text-bgc-muted hover:text-bgc-text transition-colors text-sm">
            ← Tournaments
          </button>
          <span className="text-bgc-border">/</span>
          <span className="font-heading text-xl text-bgc-text">{view === 'create' ? 'Create Tournament' : 'Edit Tournament'}</span>
        </div>

        {error && (
          <div className="mb-4 bg-bgc-error/10 border border-bgc-error/30 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle size={15} className="text-bgc-error mt-0.5 shrink-0" />
            <p className="text-bgc-error text-sm">{error}</p>
          </div>
        )}

        <div className="bg-bgc-surface border border-bgc-border rounded-2xl p-6">
          <TournamentForm
            initial={view === 'edit' ? editing : EMPTY_FORM}
            onSave={view === 'edit' ? handleEdit : handleCreate}
            onCancel={() => { setView('list'); setEditing(null) }}
            saving={saving}
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-bgc-pink/15 flex items-center justify-center">
            <Trophy size={18} className="text-bgc-pink" />
          </div>
          <div>
            <h1 className="font-heading text-2xl text-bgc-text">Tournaments</h1>
            <p className="text-bgc-muted text-xs mt-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>
              {tournaments.length} tournament{tournaments.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button onClick={() => setView('create')} className="btn-primary text-sm flex items-center gap-2">
          <Plus size={15} /> New Tournament
        </button>
      </div>

      {/* Flash messages */}
      {success && (
        <div className="mb-4 bg-bgc-success/10 border border-bgc-success/30 rounded-xl p-3 flex items-start gap-2">
          <CheckCircle size={15} className="text-bgc-success mt-0.5 shrink-0" />
          <p className="text-bgc-success text-sm">{success}</p>
        </div>
      )}
      {error && (
        <div className="mb-4 bg-bgc-error/10 border border-bgc-error/30 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle size={15} className="text-bgc-error mt-0.5 shrink-0" />
          <p className="text-bgc-error text-sm">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-bgc-surface border border-bgc-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-bgc-pink border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-16">
            <Trophy size={40} className="text-bgc-muted mx-auto mb-3 opacity-40" />
            <p className="text-bgc-muted font-heading text-lg">No tournaments yet</p>
            <p className="text-bgc-muted text-sm mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
              Create your first tournament to get started.
            </p>
            <button onClick={() => setView('create')} className="btn-primary text-sm mt-4">
              Create Tournament
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-bgc-elevated text-bgc-muted text-xs border-b border-bgc-border"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                <tr>
                  <th className="text-left px-4 py-3">TOURNAMENT</th>
                  <th className="text-left px-4 py-3">TYPE / FORMAT</th>
                  <th className="text-left px-4 py-3">ENTRY / PRIZE</th>
                  <th className="text-left px-4 py-3">DATE</th>
                  <th className="text-left px-4 py-3">SLOTS</th>
                  <th className="text-left px-4 py-3">STATUS</th>
                  <th className="text-right px-4 py-3">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bgc-border">
                {tournaments.map(t => (
                  <tr key={t.id} className="hover:bg-bgc-elevated/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-bgc-text font-semibold">{t.title}</p>
                      <p className="text-bgc-muted text-xs mt-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>
                        Created {dayjs(t.created_at).format('D MMM')}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex w-fit items-center px-1.5 py-0.5 rounded text-xs font-bold ${GAME_TYPE_COLORS[t.game_type] || ''}`}
                          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                          {t.game_type}
                        </span>
                        <span className="text-bgc-muted text-xs" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                          {t.format}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className={`font-semibold text-xs ${t.entry_fee > 0 ? 'text-bgc-pink' : 'text-bgc-success'}`}>
                        {t.entry_fee > 0 ? `₹${t.entry_fee}` : 'FREE'}
                      </p>
                      {t.prize_pool && (
                        <p className="text-bgc-muted text-xs mt-0.5 truncate max-w-[120px]" style={{ fontFamily: 'Inter, sans-serif' }}>
                          {t.prize_pool}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-bgc-text text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {dayjs(t.tournament_date).format('D MMM YYYY')}
                      </p>
                      <p className="text-bgc-muted text-xs">{dayjs(t.tournament_date).format('HH:mm')}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Users size={12} className="text-bgc-muted" />
                        <span className="text-bgc-text text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {t.registration_count || 0}/{t.max_participants}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={t.status}
                        onChange={e => handleStatusChange(t.id, e.target.value)}
                        className="bg-bgc-elevated border border-bgc-border rounded-lg px-2 py-1 text-xs text-bgc-text appearance-none cursor-pointer hover:border-bgc-pink/40 transition-colors"
                        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                        {STATUSES.map(s => (
                          <option key={s} value={s}>{s.toUpperCase()}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setRegsTarget(t)}
                          title="View Registrations"
                          className="p-2 text-bgc-muted hover:text-bgc-text hover:bg-bgc-elevated rounded-lg transition-colors">
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => startEdit(t)}
                          title="Edit"
                          className="p-2 text-bgc-muted hover:text-bgc-pink hover:bg-bgc-pink/10 rounded-lg transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(t)}
                          title="Delete"
                          className="p-2 text-bgc-muted hover:text-bgc-error hover:bg-bgc-error/10 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {regsTarget && (
        <RegistrationsModal tournament={regsTarget} onClose={() => setRegsTarget(null)} />
      )}

      {deleteTarget && (
        <DeleteModal
          tournament={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  )
}
