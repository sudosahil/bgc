import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

const STATUS = {
  AVAILABLE:   { label: 'Available',   color: '#00ff88', bg: 'rgba(0,255,136,0.08)',   border: 'rgba(0,255,136,0.28)' },
  OCCUPIED:    { label: 'Occupied',    color: '#ff1a6b', bg: 'rgba(255,26,107,0.08)',  border: 'rgba(255,26,107,0.28)' },
  RESERVED:    { label: 'Reserved',    color: '#c4006a', bg: 'rgba(196,0,106,0.08)',   border: 'rgba(196,0,106,0.28)' },
  MAINTENANCE: { label: 'Maintenance', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.28)' },
}

const POLL_INTERVAL = 60 // seconds

function StatusPill({ status }) {
  const cfg = STATUS[status] || STATUS.AVAILABLE
  return (
    <span style={{
      display: 'inline-block',
      background: cfg.bg,
      color: cfg.color,
      border: `1px solid ${cfg.border}`,
      borderRadius: 4,
      padding: '2px 8px',
      fontSize: 10,
      fontFamily: "'Barlow Condensed', sans-serif",
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    }}>
      {cfg.label}
    </span>
  )
}

function SummaryPill({ label, free, total }) {
  const pct = total > 0 ? free / total : 1
  const color = pct === 0 ? '#ff1a6b' : pct < 0.5 ? '#f59e0b' : '#00ff88'
  return (
    <div style={{
      background: '#1a1025',
      border: `1px solid ${color}33`,
      borderRadius: 12,
      padding: '14px 20px',
      minWidth: 120,
      flex: '1 0 auto',
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: 36,
        lineHeight: 1,
        color,
        marginBottom: 4,
      }}>
        {free} <span style={{ fontSize: 20, color: '#7a5f7a' }}>/ {total}</span>
      </div>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: '#7a5f7a',
      }}>
        {label} FREE
      </div>
    </div>
  )
}

function StationTile({ station, onClick }) {
  const cfg = STATUS[station.status] || STATUS.AVAILABLE
  const isAvailable = station.status === 'AVAILABLE'
  return (
    <div
      onClick={isAvailable ? onClick : undefined}
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 10,
        padding: 14,
        cursor: isAvailable ? 'pointer' : 'default',
        transition: 'all 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minHeight: 70,
        justifyContent: 'space-between',
      }}
      onMouseEnter={e => { if (isAvailable) e.currentTarget.style.borderColor = 'rgba(0,255,136,0.6)' }}
      onMouseLeave={e => { if (isAvailable) e.currentTarget.style.borderColor = cfg.border }}
    >
      <span style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: 18,
        color: '#f0e8f0',
        letterSpacing: '0.04em',
        lineHeight: 1,
      }}>
        {station.name}
      </span>
      <StatusPill status={station.status} />
    </div>
  )
}

function PoolTile({ station, onClick }) {
  const cfg = STATUS[station.status] || STATUS.AVAILABLE
  const isAvailable = station.status === 'AVAILABLE'
  return (
    <div
      onClick={isAvailable ? onClick : undefined}
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 12,
        padding: '20px 24px',
        cursor: isAvailable ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        transition: 'all 0.15s',
      }}
    >
      <div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: '#f0e8f0', marginBottom: 6 }}>
          {station.name}
        </div>
        {station.specs && (
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, color: '#7a5f7a', letterSpacing: '0.04em' }}>
            {station.specs}
          </div>
        )}
      </div>
      <StatusPill status={station.status} />
    </div>
  )
}

export default function AvailabilityBoard() {
  const [data, setData] = useState(null)
  const [secondsSince, setSecondsSince] = useState(0)
  const lastFetch = useRef(null)
  const navigate = useNavigate()

  const fetchData = () => {
    api.get('/stations').then(r => {
      setData(r.data)
      lastFetch.current = Date.now()
      setSecondsSince(0)
    }).catch(() => {})
  }

  useEffect(() => {
    fetchData()
    const poll = setInterval(fetchData, POLL_INTERVAL * 1000)
    const tick = setInterval(() => {
      if (lastFetch.current) setSecondsSince(Math.floor((Date.now() - lastFetch.current) / 1000))
    }, 1000)
    return () => { clearInterval(poll); clearInterval(tick) }
  }, [])

  const handleTileClick = (type) => {
    navigate(`/stations?type=${type}`)
  }

  const grouped = { pc: [], playstation: [], pool: [] }
  if (data?.stations) {
    data.stations.forEach(s => { if (grouped[s.type] !== undefined) grouped[s.type].push(s) })
  }

  return (
    <section className="py-10 lg:py-[72px]" style={{ background: 'transparent' }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10">

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{
              fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
              letterSpacing: '0.15em', textTransform: 'uppercase', color: '#7a5f7a',
            }}>
              // LIVE AVAILABILITY
            </span>
            {/* LIVE badge */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)',
              borderRadius: 20, padding: '2px 10px',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700,
              letterSpacing: '0.1em', color: '#00ff88', textTransform: 'uppercase',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: '#00ff88',
                animation: 'dotBlink 1.4s ease-in-out infinite',
                display: 'inline-block',
              }} />
              LIVE · {secondsSince < 60 ? `${secondsSince}s ago` : 'just updated'}
            </span>
          </div>
          <h2 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(3rem, 6vw, 5.5rem)',
            color: '#f0e8f0', lineHeight: 1, margin: 0,
          }}>
            RIGS RIGHT NOW
          </h2>
        </div>

        {/* Summary pills */}
        {data?.summary && (
          <div style={{ display: 'flex', gap: 16, marginBottom: 48, flexWrap: 'wrap' }}>
            <SummaryPill label="Gaming PCs"   free={data.summary.pc.free}          total={data.summary.pc.total} />
            <SummaryPill label="PlayStation 5" free={data.summary.playstation.free} total={data.summary.playstation.total} />
            <SummaryPill label="Pool Table"    free={data.summary.pool.free}         total={data.summary.pool.total} />
          </div>
        )}

        {!data ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <div className="w-8 h-8 rounded-full border-2 border-bgc-border border-t-bgc-pink animate-spin" />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>

            {/* PC Grid */}
            {grouped.pc.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: '#f0e8f0', letterSpacing: '0.05em' }}>
                    GAMING PCs
                  </span>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, color: '#7a5f7a' }}>
                    {grouped.pc.length} stations · click AVAILABLE to book
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                  {grouped.pc.map(s => (
                    <StationTile key={s.id} station={s} onClick={() => handleTileClick('pc')} />
                  ))}
                </div>
              </div>
            )}

            {/* PS5 Grid */}
            {grouped.playstation.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: '#f0e8f0', letterSpacing: '0.05em' }}>
                    PLAYSTATION 5
                  </span>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, color: '#7a5f7a' }}>
                    {grouped.playstation.length} stations
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, maxWidth: 500 }}>
                  {grouped.playstation.map(s => (
                    <StationTile key={s.id} station={s} onClick={() => handleTileClick('playstation')} />
                  ))}
                </div>
              </div>
            )}

            {/* Pool */}
            {grouped.pool.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: '#f0e8f0', letterSpacing: '0.05em' }}>
                    POOL TABLE
                  </span>
                </div>
                <div style={{ maxWidth: 480 }}>
                  {grouped.pool.map(s => (
                    <PoolTile key={s.id} station={s} onClick={() => handleTileClick('pool')} />
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </section>
  )
}
