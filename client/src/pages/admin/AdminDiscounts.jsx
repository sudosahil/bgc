import { useState, useEffect, useRef, useCallback } from 'react'
import { Tag, Plus, Search, Trash2, Edit2, Check, X, RefreshCw, ChevronDown } from 'lucide-react'
import api from '../../api/axios'
import dayjs from 'dayjs'

/* ── helpers ── */
const fmt = (d) => d ? dayjs(d).format('DD MMM YYYY HH:mm') : '—'
const fmtShort = (d) => d ? dayjs(d).format('DD MMM') : null

function genCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const rand5 = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return 'BGC' + rand5
}

const APPLIES_LABELS = { ALL: 'ALL STATIONS', PC: 'PC ONLY', PS5: 'PS5 ONLY', POOL: 'POOL ONLY' }

function statusPill(d) {
  const now = new Date()
  if (d.valid_until && new Date(d.valid_until) < now) return <span className="badge badge-error">EXPIRED</span>
  if (!d.is_active) return <span className="badge badge-muted">INACTIVE</span>
  return <span className="badge badge-success">ACTIVE</span>
}

/* ── Preview card ── */
function PreviewCard({ form }) {
  const discLabel = form.type === 'PERCENTAGE'
    ? `${form.value || 0}% OFF`
    : `₹${form.value || 0} OFF`
  const expiryText = form.validUntilEnabled && form.valid_until
    ? `Ends ${fmtShort(form.valid_until) || '—'}`
    : 'No expiry'
  const usesText = form.maxUsesEnabled && form.max_uses
    ? `0 / ${form.max_uses} uses`
    : '∞ uses'

  return (
    <div style={{
      background: '#12121A',
      border: '1px solid rgba(196,0,106,0.2)',
      borderTop: '2px solid #ff1a6b',
      padding: 24,
      borderRadius: 2,
      minWidth: 260,
    }}>
      <div style={{
        display: 'inline-block',
        background: 'rgba(255,26,107,0.12)',
        color: '#ff1a6b',
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        padding: '2px 8px',
        borderRadius: 2,
        marginBottom: 12,
      }}>
        {APPLIES_LABELS[form.applies_to] || 'ALL STATIONS'}
      </div>
      <div style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: 48,
        color: '#ff1a6b',
        lineHeight: 1,
        marginBottom: 8,
        textShadow: '0 0 20px rgba(255,26,107,0.4)',
      }}>
        {discLabel}
      </div>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 700,
        fontSize: 18,
        color: '#f0e8f0',
        marginBottom: 4,
      }}>
        {form.label || 'Discount Label'}
      </div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12,
        color: '#7a5f7a',
        marginBottom: 16,
      }}>
        {form.description || 'Discount description appears here'}
      </div>
      <div style={{ borderTop: '1px solid rgba(196,0,106,0.2)', paddingTop: 12, marginBottom: 12 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#7a5f7a' }}>
          Min. ₹{form.min_booking || 0}
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#7a5f7a' }}>
          {expiryText}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#7a5f7a' }}>
          {usesText}
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#7a5f7a' }}>
          {form.per_user_limit}x per user
        </span>
      </div>
      <div style={{ borderTop: '1px solid rgba(196,0,106,0.2)', paddingTop: 12, textAlign: 'center' }}>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 18,
          color: '#ff1a6b',
          letterSpacing: '0.1em',
          marginBottom: 2,
        }}>
          {form.code || 'YOURCODE'}
        </div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 12,
          color: '#7a5f7a',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          TAP TO COPY CODE
        </div>
      </div>
    </div>
  )
}

/* ── Create / Edit Form ── */
const EMPTY_FORM = {
  code: '', label: '', description: '',
  type: 'PERCENTAGE', value: '',
  min_booking: '', applies_to: 'ALL',
  maxUsesEnabled: false, max_uses: '',
  per_user_limit: 1,
  valid_from: dayjs().format('YYYY-MM-DDTHH:mm'),
  validUntilEnabled: false, valid_until: '',
  is_active: true,
}

function DiscountForm({ initial, onSaved, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY_FORM)
  const [codeStatus, setCodeStatus] = useState(null) // 'checking' | 'available' | 'taken'
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const debounceRef = useRef(null)
  const isEdit = !!initial?.id

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  // Debounced code availability check
  const checkCode = useCallback((code) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!code || code.length < 6) { setCodeStatus(null); return }
    setCodeStatus('checking')
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get('/admin/discounts/check-code', { params: { code } })
        setCodeStatus(res.data.available ? 'available' : 'taken')
      } catch { setCodeStatus(null) }
    }, 500)
  }, [])

  const handleCode = (raw) => {
    const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
    set('code', cleaned)
    if (!isEdit) checkCode(cleaned)
  }

  const handleGenerate = () => {
    const code = genCode()
    set('code', code)
    if (!isEdit) checkCode(code)
  }

  const validate = () => {
    const e = {}
    if (!form.code || !/^[A-Z0-9]{6,12}$/.test(form.code)) e.code = '6–12 alphanumeric characters'
    if (!isEdit && codeStatus === 'taken') e.code = 'Code already taken'
    if (!form.label) e.label = 'Required'
    if (!form.description) e.description = 'Required'
    if (!form.value || isNaN(form.value)) e.value = 'Required'
    if (form.type === 'PERCENTAGE' && (form.value < 1 || form.value > 80)) e.value = '1–80%'
    if (form.type === 'FLAT' && (form.value < 10 || form.value > 500)) e.value = '₹10–₹500'
    if (!form.min_booking || isNaN(form.min_booking)) e.min_booking = 'Required'
    if (form.type === 'PERCENTAGE' && form.min_booking < 100) e.min_booking = 'Min ₹100 for percentage discounts'
    if (form.type === 'FLAT' && parseFloat(form.min_booking) <= parseFloat(form.value)) {
      e.min_booking = 'Must exceed the discount amount'
    }
    if (form.maxUsesEnabled && (!form.max_uses || isNaN(form.max_uses) || form.max_uses < 1)) e.max_uses = 'Enter a valid number'
    if (form.validUntilEnabled && form.valid_until) {
      const from = new Date(form.valid_from), until = new Date(form.valid_until)
      if (until <= from) e.valid_until = 'Must be after valid from'
      if (until - from < 3600 * 1000) e.valid_until = 'Must be at least 1 hour after valid from'
    }
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    setErrors({})
    try {
      const payload = {
        code: form.code,
        label: form.label,
        description: form.description,
        type: form.type,
        value: parseFloat(form.value),
        min_booking: parseFloat(form.min_booking),
        applies_to: form.applies_to,
        max_uses: form.maxUsesEnabled ? parseInt(form.max_uses) : null,
        per_user_limit: form.per_user_limit,
        valid_from: form.valid_from,
        valid_until: form.validUntilEnabled && form.valid_until ? form.valid_until : null,
        is_active: form.is_active,
      }
      if (isEdit) {
        await api.put(`/admin/discounts/${initial.id}`, payload)
      } else {
        await api.post('/admin/discounts', payload)
      }
      onSaved()
    } catch (err) {
      setErrors({ submit: err.response?.data?.error || 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  const untilDate = form.validUntilEnabled && form.valid_until ? new Date(form.valid_until) : null
  const fromDate  = new Date(form.valid_from)
  const hoursUntilExpiry = untilDate ? (untilDate - fromDate) / 3600000 : null
  const warnExpiry = hoursUntilExpiry !== null && hoursUntilExpiry < 24 && hoursUntilExpiry > 0

  const savePreview = form.value && form.min_booking
    ? `Customer saves ${form.type === 'PERCENTAGE' ? `${form.value}%` : `₹${form.value}`} on a ₹${form.min_booking} booking`
    : null

  const Err = ({ k }) => errors[k] ? <p className="text-red-400 text-xs mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{errors[k]}</p> : null

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-8 items-start">
      {/* Left: form fields */}
      <div className="space-y-5">
        {/* Code */}
        <div>
          <label className="label">Discount Code</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                className="input pr-8 font-mono tracking-widest"
                value={form.code}
                onChange={e => handleCode(e.target.value)}
                placeholder="BGCWELCOME20"
                maxLength={12}
              />
              {!isEdit && form.code.length >= 6 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {codeStatus === 'checking' && <div className="w-3 h-3 border border-bgc-muted border-t-bgc-pink rounded-full animate-spin" />}
                  {codeStatus === 'available' && <Check size={13} className="text-green-400" />}
                  {codeStatus === 'taken' && <X size={13} className="text-red-400" />}
                </div>
              )}
            </div>
            <button type="button" onClick={handleGenerate}
              className="btn-outline text-xs px-3 whitespace-nowrap">
              GENERATE
            </button>
          </div>
          <Err k="code" />
        </div>

        {/* Label */}
        <div>
          <label className="label">Label <span className="text-bgc-muted ml-1">{form.label.length}/40</span></label>
          <input className="input" value={form.label} maxLength={40}
            onChange={e => set('label', e.target.value)} placeholder="Weekend Special" />
          <Err k="label" />
        </div>

        {/* Description */}
        <div>
          <label className="label">Description <span className="text-bgc-muted ml-1">{form.description.length}/100</span></label>
          <input className="input" value={form.description} maxLength={100}
            onChange={e => set('description', e.target.value)} placeholder="20% off all PC sessions" />
          <Err k="description" />
        </div>

        {/* Type toggle */}
        <div>
          <label className="label">Discount Type</label>
          <div className="flex gap-2">
            {[['PERCENTAGE', '% PERCENTAGE'], ['FLAT', '₹ FLAT AMOUNT']].map(([t, l]) => (
              <button key={t} type="button"
                onClick={() => set('type', t)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                  form.type === t
                    ? 'border-bgc-pink bg-bgc-pink/10 text-bgc-pink'
                    : 'border-bgc-border text-bgc-muted hover:border-bgc-pink/30'
                }`}
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14 }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Value */}
        <div>
          <label className="label">
            {form.type === 'PERCENTAGE' ? 'Percentage Off' : 'Flat Amount Off'}
          </label>
          <div className="relative">
            {form.type === 'FLAT' && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-bgc-muted text-sm">₹</span>
            )}
            <input
              type="number"
              className={`input ${form.type === 'FLAT' ? 'pl-7' : ''} ${form.type === 'PERCENTAGE' ? 'pr-7' : ''}`}
              value={form.value}
              onChange={e => set('value', e.target.value)}
              placeholder={form.type === 'PERCENTAGE' ? '20' : '50'}
              min={form.type === 'PERCENTAGE' ? 1 : 10}
              max={form.type === 'PERCENTAGE' ? 80 : 500}
            />
            {form.type === 'PERCENTAGE' && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-bgc-muted text-sm">%</span>
            )}
          </div>
          {savePreview && (
            <p className="text-xs text-bgc-muted mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {savePreview}
            </p>
          )}
          <Err k="value" />
        </div>

        {/* Min booking */}
        <div>
          <label className="label">Minimum Booking Value</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-bgc-muted text-sm">₹</span>
            <input type="number" className="input pl-7" value={form.min_booking}
              onChange={e => set('min_booking', e.target.value)} placeholder="200" min={1} />
          </div>
          <Err k="min_booking" />
        </div>

        {/* Applies to */}
        <div>
          <label className="label">Applies To</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(APPLIES_LABELS).map(([val, lbl]) => (
              <button key={val} type="button" onClick={() => set('applies_to', val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  form.applies_to === val
                    ? 'border-bgc-pink bg-bgc-pink/10 text-bgc-pink'
                    : 'border-bgc-border text-bgc-muted hover:border-bgc-pink/30'
                }`}
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.05em' }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Max uses */}
        <div>
          <label className="label">Max Uses</label>
          <div className="flex gap-2 mb-2">
            {[false, true].map(v => (
              <button key={String(v)} type="button" onClick={() => set('maxUsesEnabled', v)}
                className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                  form.maxUsesEnabled === v
                    ? 'border-bgc-pink bg-bgc-pink/10 text-bgc-pink'
                    : 'border-bgc-border text-bgc-muted hover:border-bgc-pink/30'
                }`}
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14 }}>
                {v ? 'SET LIMIT' : 'UNLIMITED'}
              </button>
            ))}
          </div>
          {form.maxUsesEnabled && (
            <>
              <input type="number" className="input" value={form.max_uses} min={1}
                onChange={e => set('max_uses', e.target.value)} placeholder="100" />
              {form.max_uses && <p className="text-xs text-bgc-muted mt-1">{form.max_uses} uses remaining</p>}
              <Err k="max_uses" />
            </>
          )}
        </div>

        {/* Per user limit */}
        <div>
          <label className="label">Per User Limit</label>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => set('per_user_limit', Math.max(1, form.per_user_limit - 1))}
              className="w-8 h-8 rounded-lg border border-bgc-border text-bgc-muted hover:border-bgc-pink/30 flex items-center justify-center text-lg">−</button>
            <span className="font-mono text-bgc-text w-4 text-center">{form.per_user_limit}</span>
            <button type="button" onClick={() => set('per_user_limit', Math.min(5, form.per_user_limit + 1))}
              className="w-8 h-8 rounded-lg border border-bgc-border text-bgc-muted hover:border-bgc-pink/30 flex items-center justify-center text-lg">+</button>
            <span className="text-bgc-muted text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
              Each customer can use this code {form.per_user_limit} time{form.per_user_limit > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Valid from */}
        <div>
          <label className="label">Valid From</label>
          <input type="datetime-local" className="input" value={form.valid_from}
            onChange={e => set('valid_from', e.target.value)} />
        </div>

        {/* Valid until */}
        <div>
          <label className="label">Valid Until</label>
          <div className="flex gap-2 mb-2">
            {[false, true].map(v => (
              <button key={String(v)} type="button" onClick={() => set('validUntilEnabled', v)}
                className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                  form.validUntilEnabled === v
                    ? 'border-bgc-pink bg-bgc-pink/10 text-bgc-pink'
                    : 'border-bgc-border text-bgc-muted hover:border-bgc-pink/30'
                }`}
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14 }}>
                {v ? 'SET EXPIRY DATE' : 'NO EXPIRY'}
              </button>
            ))}
          </div>
          {form.validUntilEnabled && (
            <>
              <input type="datetime-local" className="input" value={form.valid_until}
                onChange={e => set('valid_until', e.target.value)} />
              {warnExpiry && (
                <p className="text-yellow-400 text-xs mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  ⚠ This discount expires very soon.
                </p>
              )}
              <Err k="valid_until" />
            </>
          )}
        </div>

        {/* Status */}
        <div>
          <label className="label">Status</label>
          <div className="flex gap-2">
            {[[true, 'ACTIVE'], [false, 'INACTIVE']].map(([v, l]) => (
              <button key={l} type="button" onClick={() => set('is_active', v)}
                className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                  form.is_active === v
                    ? v ? 'border-bgc-success bg-bgc-success/10 text-bgc-success' : 'border-bgc-error bg-bgc-error/10 text-bgc-error'
                    : 'border-bgc-border text-bgc-muted hover:border-bgc-pink/30'
                }`}
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14 }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {errors.submit && (
          <div className="bg-bgc-error/10 border border-bgc-error/30 rounded-xl p-3 text-bgc-error text-sm">
            {errors.submit}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={handleSubmit} disabled={saving}
            className="btn-primary flex items-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={14} />}
            {isEdit ? 'SAVE CHANGES' : 'CREATE DISCOUNT'}
          </button>
          <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
        </div>
      </div>

      {/* Right: live preview */}
      <div className="sticky top-6">
        <p className="text-xs font-semibold tracking-widest uppercase text-bgc-muted mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
          PREVIEW
        </p>
        <PreviewCard form={form} />
      </div>
    </div>
  )
}

/* ── List ── */
function DiscountsList({ onEdit, refresh, refreshKey }) {
  const [discounts, setDiscounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [deleteModal, setDeleteModal] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/discounts')
      setDiscounts(res.data.discounts)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load, refreshKey])

  const getEffectiveStatus = (d) => {
    const now = new Date()
    if (d.valid_until && new Date(d.valid_until) < now) return 'EXPIRED'
    if (!d.is_active) return 'INACTIVE'
    return 'ACTIVE'
  }

  const filtered = discounts.filter(d => {
    const st = getEffectiveStatus(d)
    if (filter !== 'ALL' && st !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return d.code.toLowerCase().includes(q) || d.label.toLowerCase().includes(q)
    }
    return true
  })

  const handleToggle = async (d) => {
    try {
      await api.put(`/admin/discounts/${d.id}`, { is_active: !d.is_active })
      load()
    } catch { /* ignore */ }
  }

  const handleDelete = async () => {
    if (!deleteModal) return
    try {
      await api.delete(`/admin/discounts/${deleteModal.id}`)
      setDeleteModal(null)
      load()
    } catch { /* ignore */ }
  }

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-bgc-border border-t-bgc-pink rounded-full animate-spin" /></div>

  return (
    <div>
      {/* Filters + search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-1">
          {['ALL', 'ACTIVE', 'INACTIVE', 'EXPIRED'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                filter === f ? 'border-bgc-pink bg-bgc-pink/10 text-bgc-pink' : 'border-bgc-border text-bgc-muted hover:border-bgc-pink/30'
              }`}
              style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.05em' }}>
              {f}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs ml-auto">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-bgc-muted" />
          <input className="input pl-8 py-1.5 text-xs" placeholder="Search code or label..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-bgc-muted text-sm">No discounts found.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-bgc-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bgc-border bg-bgc-elevated">
                {['Code', 'Label', 'Type + Value', 'Applies To', 'Uses', 'Valid Until', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-bgc-muted uppercase tracking-wider whitespace-nowrap"
                    style={{ fontFamily: 'Inter, sans-serif' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => (
                <tr key={d.id}
                  className={`border-b border-bgc-border/50 hover:bg-bgc-elevated/50 transition-colors ${i % 2 === 0 ? '' : 'bg-bgc-surface/30'}`}>
                  <td className="px-4 py-3 font-mono text-bgc-pink text-xs tracking-widest font-bold">{d.code}</td>
                  <td className="px-4 py-3 text-bgc-text text-xs max-w-[140px] truncate">{d.label}</td>
                  <td className="px-4 py-3 text-bgc-text text-xs whitespace-nowrap">
                    {d.type === 'PERCENTAGE' ? `${d.value}% off` : `₹${d.value} off`}
                    <span className="ml-1 text-bgc-muted">(min ₹{d.min_booking})</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-bgc-muted whitespace-nowrap">{APPLIES_LABELS[d.applies_to]}</td>
                  <td className="px-4 py-3 text-xs text-bgc-muted whitespace-nowrap">
                    {d.uses_so_far} / {d.max_uses ?? '∞'}
                  </td>
                  <td className="px-4 py-3 text-xs text-bgc-muted whitespace-nowrap">
                    {d.valid_until ? fmt(d.valid_until) : 'No expiry'}
                  </td>
                  <td className="px-4 py-3">{statusPill(d)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => onEdit(d)}
                        className="p-1.5 rounded-lg text-bgc-muted hover:text-bgc-pink hover:bg-bgc-pink/10 transition-colors"
                        title="Edit">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => handleToggle(d)}
                        className={`p-1.5 rounded-lg transition-colors text-xs font-bold whitespace-nowrap ${
                          d.is_active
                            ? 'text-bgc-muted hover:text-bgc-warning hover:bg-bgc-warning/10'
                            : 'text-bgc-muted hover:text-bgc-success hover:bg-bgc-success/10'
                        }`}
                        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                        title={d.is_active ? 'Deactivate' : 'Activate'}>
                        {d.is_active ? 'DEACTIVATE' : 'ACTIVATE'}
                      </button>
                      <button onClick={() => setDeleteModal(d)}
                        className="p-1.5 rounded-lg text-bgc-muted hover:text-bgc-error hover:bg-bgc-error/10 transition-colors"
                        title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-bgc-surface border border-bgc-border rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="font-heading text-lg text-bgc-text mb-3">Delete Discount</h3>
            <p className="text-bgc-muted text-sm mb-5" style={{ fontFamily: 'Inter, sans-serif' }}>
              This will permanently delete code{' '}
              <span className="text-bgc-pink font-mono">{deleteModal.code}</span>.
              Bookings that used this code will not be affected.
            </p>
            <div className="flex gap-3">
              <button onClick={handleDelete} className="btn-primary bg-bgc-error hover:bg-bgc-error/80 flex-1 flex items-center justify-center gap-2 text-sm">
                <Trash2 size={13} /> Delete
              </button>
              <button onClick={() => setDeleteModal(null)} className="btn-ghost flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Main page ── */
export default function AdminDiscounts() {
  const [view, setView] = useState('list') // 'list' | 'create' | 'edit'
  const [editDiscount, setEditDiscount] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [successMsg, setSuccessMsg] = useState('')

  const handleSaved = () => {
    setSuccessMsg(view === 'create' ? 'Discount created!' : 'Discount updated!')
    setView('list')
    setEditDiscount(null)
    setRefreshKey(k => k + 1)
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const handleEdit = (d) => {
    setEditDiscount({
      ...d,
      is_active: !!d.is_active,
      maxUsesEnabled: d.max_uses !== null,
      max_uses: d.max_uses ?? '',
      validUntilEnabled: !!d.valid_until,
      valid_from: d.valid_from ? dayjs(d.valid_from).format('YYYY-MM-DDTHH:mm') : '',
      valid_until: d.valid_until ? dayjs(d.valid_until).format('YYYY-MM-DDTHH:mm') : '',
    })
    setView('edit')
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Tag size={16} className="text-bgc-pink" />
            <span className="section-label" style={{ marginBottom: 0 }}>DISCOUNTS</span>
          </div>
          <h2 className="font-heading text-2xl text-bgc-text">
            {view === 'list' ? 'Manage Discounts' : view === 'create' ? 'Create Discount' : 'Edit Discount'}
          </h2>
        </div>
        {view === 'list' ? (
          <button onClick={() => { setView('create'); setEditDiscount(null) }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={14} /> New Discount
          </button>
        ) : (
          <button onClick={() => { setView('list'); setEditDiscount(null) }}
            className="btn-ghost flex items-center gap-2 text-sm">
            ← Back to List
          </button>
        )}
      </div>

      {successMsg && (
        <div className="mb-4 bg-bgc-success/10 border border-bgc-success/30 rounded-xl p-3 text-bgc-success text-sm flex items-center gap-2">
          <Check size={14} /> {successMsg}
        </div>
      )}

      {view === 'list' && (
        <DiscountsList onEdit={handleEdit} refreshKey={refreshKey} />
      )}
      {view === 'create' && (
        <DiscountForm onSaved={handleSaved} onCancel={() => setView('list')} />
      )}
      {view === 'edit' && editDiscount && (
        <DiscountForm initial={editDiscount} onSaved={handleSaved} onCancel={() => setView('list')} />
      )}
    </div>
  )
}
