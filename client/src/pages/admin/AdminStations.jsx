import { useEffect, useState } from 'react'
import api from '../../api/axios'

const STATUS_OPTIONS = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE']

const STATUS_CFG = {
  AVAILABLE:   { label: 'Available',   color: '#00ff88', bg: 'rgba(0,255,136,0.08)',  border: 'rgba(0,255,136,0.28)' },
  OCCUPIED:    { label: 'Occupied',    color: '#ff1a6b', bg: 'rgba(255,26,107,0.08)', border: 'rgba(255,26,107,0.28)' },
  RESERVED:    { label: 'Reserved',    color: '#c4006a', bg: 'rgba(196,0,106,0.08)',  border: 'rgba(196,0,106,0.28)' },
  MAINTENANCE: { label: 'Maintenance', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.28)' },
}

function StationTile({ station, onStatusChange, updating }) {
  const cfg = STATUS_CFG[station.status] || STATUS_CFG.AVAILABLE
  return (
    <div style={{
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: 10,
      padding: 14,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <span style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: 18,
        color: '#f0e8f0',
        letterSpacing: '0.04em',
        lineHeight: 1,
      }}>
        {station.name}
      </span>
      <select
        value={station.status}
        disabled={updating === station.id}
        onChange={e => onStatusChange(station.id, e.target.value)}
        style={{
          background: '#110b18',
          border: `1px solid ${cfg.border}`,
          borderRadius: 6,
          color: cfg.color,
          fontSize: 11,
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          padding: '4px 8px',
          cursor: updating === station.id ? 'wait' : 'pointer',
          width: '100%',
        }}
      >
        {STATUS_OPTIONS.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  )
}

function StationGroup({ title, stations, onStatusChange, updating, cols = 4 }) {
  if (!stations.length) return null
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
        <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: '#f0e8f0', margin: 0, letterSpacing: '0.05em' }}>
          {title}
        </h3>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, color: '#7a5f7a' }}>
          {stations.filter(s => s.status === 'AVAILABLE').length} / {stations.length} available
        </span>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(100px, 1fr))`,
        gap: 10,
      }}>
        {stations.map(s => (
          <StationTile key={s.id} station={s} onStatusChange={onStatusChange} updating={updating} />
        ))}
      </div>
    </div>
  )
}

export default function AdminStations() {
  const [stations, setStations] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchStations = () => {
    api.get('/stations').then(r => {
      setStations(r.data.stations)
      setSummary(r.data.summary)
      setLastUpdated(new Date())
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchStations()
    const poll = setInterval(fetchStations, 30000)
    return () => clearInterval(poll)
  }, [])

  const handleStatusChange = async (id, status) => {
    setUpdating(id)
    try {
      const r = await api.patch(`/stations/${id}`, { status })
      setStations(prev => prev.map(s => s.id === id ? r.data.station : s))
      if (summary) fetchStations() // refresh summary counts
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status')
    } finally {
      setUpdating(null)
    }
  }

  const grouped = { pc: [], playstation: [], pool: [] }
  stations.forEach(s => { if (grouped[s.type]) grouped[s.type].push(s) })

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: '#f0e8f0', margin: '0 0 4px 0' }}>
            STATION STATUS
          </h2>
          <p style={{ color: '#7a5f7a', fontSize: 13, margin: 0 }}>
            Click any dropdown to change status instantly. Refreshes every 30s.
            {lastUpdated && ` · Last sync: ${lastUpdated.toLocaleTimeString('en-IN')}`}
          </p>
        </div>
        <button
          onClick={fetchStations}
          className="btn-outline text-sm py-2"
        >
          Refresh
        </button>
      </div>

      {/* Summary bar */}
      {summary && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 36, flexWrap: 'wrap' }}>
          {[
            { key: 'pc', label: 'PCs' },
            { key: 'playstation', label: 'PS5' },
            { key: 'pool', label: 'Pool' },
          ].map(({ key, label }) => {
            const { free, total } = summary[key] || { free: 0, total: 0 }
            const pct = total > 0 ? free / total : 1
            const color = pct === 0 ? '#ff1a6b' : pct < 0.5 ? '#f59e0b' : '#00ff88'
            return (
              <div key={key} style={{
                background: '#1a1025',
                border: `1px solid ${color}33`,
                borderRadius: 10,
                padding: '10px 20px',
                textAlign: 'center',
                minWidth: 110,
              }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color, lineHeight: 1 }}>
                  {free}<span style={{ fontSize: 16, color: '#7a5f7a' }}>/{total}</span>
                </div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#7a5f7a', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {label} free
                </div>
              </div>
            )
          })}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="w-8 h-8 rounded-full border-2 border-bgc-border border-t-bgc-pink animate-spin" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          <StationGroup title="GAMING PCs"    stations={grouped.pc}          onStatusChange={handleStatusChange} updating={updating} cols={5} />
          <StationGroup title="PLAYSTATION 5" stations={grouped.playstation}  onStatusChange={handleStatusChange} updating={updating} cols={3} />
          <StationGroup title="POOL TABLE"    stations={grouped.pool}         onStatusChange={handleStatusChange} updating={updating} cols={1} />
        </div>
      )}
    </div>
  )
}
