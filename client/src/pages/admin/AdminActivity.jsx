import { useEffect, useRef, useState } from 'react'
import api from '../../api/axios'

const ACTION_CFG = {
  user_login:             { label: 'Login',           color: '#60a5fa', icon: '→' },
  user_register:          { label: 'Registered',       color: '#a78bfa', icon: '✦' },
  booking_created:        { label: 'Booking',          color: '#00ff88', icon: '✓' },
  booking_cancelled:      { label: 'Cancelled',        color: '#ff1a6b', icon: '✕' },
  walkin_created:         { label: 'Walk-in',          color: '#f59e0b', icon: '↗' },
  station_status_changed: { label: 'Station',          color: '#f97316', icon: '⚙' },
}

function timeAgo(dateStr) {
  const secs = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function LogRow({ entry, isNew }) {
  const cfg = ACTION_CFG[entry.action] || { label: entry.action, color: '#7a5f7a', icon: '·' }
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      background: isNew ? 'rgba(0,255,136,0.04)' : 'transparent',
      transition: 'background 1.5s',
    }}>
      {/* Action badge */}
      <div style={{
        flexShrink: 0, width: 80, paddingTop: 1,
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <span style={{ fontSize: 11, color: cfg.color, fontWeight: 700, opacity: 0.8 }}>{cfg.icon}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {cfg.label}
        </span>
      </div>

      {/* User */}
      <div style={{ flexShrink: 0, width: 110 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: entry.role === 'admin' ? '#f59e0b' : '#e0d0f0' }}>
          {entry.user_name}
        </span>
        {entry.role === 'admin' && (
          <span style={{ fontSize: 9, color: '#f59e0b', marginLeft: 4, fontWeight: 700, opacity: 0.7 }}>ADMIN</span>
        )}
      </div>

      {/* Details */}
      <div style={{ flex: 1, fontSize: 12, color: '#7a5f7a', lineHeight: 1.5 }}>
        {entry.details}
      </div>

      {/* Time */}
      <div style={{ flexShrink: 0, fontSize: 11, color: '#4a3f5c', whiteSpace: 'nowrap', paddingTop: 1 }}>
        {timeAgo(entry.created_at)}
      </div>
    </div>
  )
}

export default function AdminActivity() {
  const [logs, setLogs] = useState([])
  const [connected, setConnected] = useState(false)
  const [newIds, setNewIds] = useState(new Set())
  const [filter, setFilter] = useState('all')
  const esRef = useRef(null)
  const logsRef = useRef([])

  useEffect(() => {
    // Fetch token for SSE auth — pass as query param since EventSource doesn't support headers
    const token = localStorage.getItem('bgc_token')
    const url = `/api/admin/activity/stream${token ? `?token=${token}` : ''}`

    const es = new EventSource(url)
    esRef.current = es

    es.onopen = () => setConnected(true)
    es.onerror = () => {
      setConnected(false)
      // Fallback to polling
      api.get('/admin/activity?limit=100').then(r => {
        logsRef.current = r.data.logs
        setLogs([...r.data.logs])
      }).catch(() => {})
    }
    es.onmessage = (e) => {
      const payload = JSON.parse(e.data)
      if (payload.type === 'init') {
        logsRef.current = payload.logs
        setLogs([...payload.logs])
      } else {
        // New single event pushed
        const updated = [payload, ...logsRef.current].slice(0, 200)
        logsRef.current = updated
        setLogs([...updated])
        setNewIds(prev => new Set([...prev, payload.id]))
        setTimeout(() => setNewIds(prev => { const n = new Set(prev); n.delete(payload.id); return n }), 3000)
      }
    }

    return () => { es.close(); setConnected(false) }
  }, [])

  const filtered = filter === 'all' ? logs : logs.filter(l => l.action === filter)

  const counts = {}
  for (const l of logs) counts[l.action] = (counts[l.action] || 0) + 1

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: '#e0d0f0', margin: 0, letterSpacing: '0.04em' }}>
            ACTIVITY LOG
          </h2>
          <p style={{ color: '#6b5c8a', fontSize: 12, marginTop: 2 }}>Real-time feed of everything happening on the platform</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: connected ? 'rgba(0,255,136,0.1)' : 'rgba(255,26,107,0.1)',
            border: `1px solid ${connected ? 'rgba(0,255,136,0.3)' : 'rgba(255,26,107,0.3)'}`,
            borderRadius: 20, padding: '3px 10px',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
            color: connected ? '#00ff88' : '#ff6eb4', textTransform: 'uppercase',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? '#00ff88' : '#ff6eb4', animation: connected ? 'dotBlink 1.4s ease-in-out infinite' : 'none', display: 'inline-block' }} />
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
          <span style={{ fontSize: 12, color: '#6b5c8a' }}>{logs.length} events</span>
        </div>
      </div>

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => setFilter('all')} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: filter === 'all' ? 'rgba(232,24,90,0.12)' : 'transparent', border: `1px solid ${filter === 'all' ? '#E8185A' : '#2d1f3d'}`, color: filter === 'all' ? '#ff6eb4' : '#6b5c8a' }}>
          All · {logs.length}
        </button>
        {Object.entries(ACTION_CFG).map(([key, cfg]) => counts[key] ? (
          <button key={key} onClick={() => setFilter(key)} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: filter === key ? `${cfg.color}18` : 'transparent', border: `1px solid ${filter === key ? cfg.color : '#2d1f3d'}`, color: filter === key ? cfg.color : '#6b5c8a' }}>
            {cfg.icon} {cfg.label} · {counts[key]}
          </button>
        ) : null)}
      </div>

      {/* Log feed */}
      <div style={{ background: '#12091c', border: '1px solid #2d1f3d', borderRadius: 12, overflow: 'hidden' }}>
        {/* Column headers */}
        <div style={{ display: 'flex', gap: 12, padding: '8px 16px', background: '#0f0a18', borderBottom: '1px solid #2d1f3d' }}>
          <span style={{ width: 80, fontSize: 9, fontWeight: 700, color: '#4a3f5c', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Action</span>
          <span style={{ width: 110, fontSize: 9, fontWeight: 700, color: '#4a3f5c', letterSpacing: '0.12em', textTransform: 'uppercase' }}>User</span>
          <span style={{ flex: 1, fontSize: 9, fontWeight: 700, color: '#4a3f5c', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Details</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#4a3f5c', letterSpacing: '0.12em', textTransform: 'uppercase' }}>When</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '48px 16px', textAlign: 'center', color: '#4a3f5c', fontSize: 13 }}>
            No activity yet. Actions on the platform will appear here in real time.
          </div>
        ) : (
          filtered.map(entry => (
            <LogRow key={entry.id} entry={entry} isNew={newIds.has(entry.id)} />
          ))
        )}
      </div>
    </div>
  )
}
