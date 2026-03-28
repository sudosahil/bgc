import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Monitor, Gamepad2, Circle, ChevronRight, Zap, Shield, Clock, MapPin, Phone, Trophy } from 'lucide-react'
import dayjs from 'dayjs'
import { HeroGeometric } from '@/components/ui/shape-landing-hero'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import api from '../api/axios'

/* ── Data ── */
const stationCards = [
  {
    icon: Monitor, type: 'PC Gaming', count: 20, rate: '₹50', unit: '/hr',
    color: 'from-bgc-purp/20 to-bgc-surface', border: 'border-bgc-purp/30', iconColor: 'text-bgc-neonB',
    features: ['RTX Gaming GPUs', '144Hz Displays', 'Mechanical Keyboards', 'All Latest Titles'],
  },
  {
    icon: Gamepad2, type: 'PlayStation 5', count: 3, rate: '₹150', unit: '/hr',
    color: 'from-bgc-pink/20 to-bgc-magenta/10', border: 'border-bgc-pink/30', iconColor: 'text-bgc-pink',
    features: ['PlayStation 5 Console', '4K HDR Display', 'DualSense Controllers', 'PS5 Game Library'],
    featured: true,
  },
  {
    icon: Circle, type: 'Pool Table', count: 1, rate: '₹450', unit: '/hr',
    color: 'from-bgc-magenta/15 to-bgc-surface', border: 'border-bgc-magenta/25', iconColor: 'text-bgc-neonB',
    features: ['Professional 7-ft Table', 'Quality Cues & Balls', 'Chalk & Equipment', 'Ideal for Groups'],
  },
]

const steps = [
  { n: '01', title: 'Create Account', desc: 'Register with your email or mobile number in under a minute.' },
  { n: '02', title: 'Top Up Wallet', desc: 'Add funds via Razorpay. Your balance stays for future bookings.' },
  { n: '03', title: 'Book Your Slot', desc: 'Pick your station, date & time. Pay 50% to confirm instantly.' },
  { n: '04', title: 'Game On!', desc: 'Show up and play. Final 50% is due 2 hours before your slot.' },
]

const TICKER_TEXT = 'BOOK ONLINE ✦ 20 HIGH-END PCs ✦ 3 PLAYSTATION 5s ✦ POOL TABLE ✦ EARN REWARD POINTS ✦ GHATKOPAR, MUMBAI ✦ WALLET PAYMENTS ✦ NO QUEUE WHEN YOU BOOK ✦\u00A0\u00A0'

const PANEL_TABS = ['pc', 'ps5', 'pool']
const PANEL_DATA = {
  pc:   { tab: 'PC SETUP', name: 'High-Performance PC', price: '₹99', specs: ['RTX 4070', '240Hz', '32GB RAM', 'Mech KB'], count: 20 },
  ps5:  { tab: 'PS5',      name: 'PlayStation 5',       price: '₹150', specs: ['4K HDR', 'DualSense', '55″ TV', 'PS5 Slim'], count: 3 },
  pool: { tab: 'POOL',     name: 'Pro Pool Table',      price: '₹200', specs: ['Full Size', 'Pro Cues', 'Tournament Felt'], count: 1 },
}

const REVIEWS = [
  { quote: 'Best gaming setup in Mumbai.', name: 'Arjun M.' },
  { quote: 'PS5 sessions are insane value.', name: 'Shreya K.' },
  { quote: 'Booked online, zero wait time.', name: 'Rahul D.' },
]

/* ── Offer strip CSS icons ── */
function PcTowerIcon() {
  return (
    <div style={{ width: 48, height: 48, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5 }}>
      {[40, 28, 20].map((w, i) => (
        <div key={i} style={{ width: w, height: 4, borderRadius: 2, background: '#ff1a6b' }} />
      ))}
    </div>
  )
}

function OfferGamepadIcon() {
  return (
    <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 44, height: 28, border: '2px solid #ff1a6b', borderRadius: 14, position: 'relative' }}>
        <div style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)' }}>
          <div style={{ width: 8, height: 2, background: '#ff1a6b', position: 'absolute', top: 3, left: 0 }} />
          <div style={{ width: 2, height: 8, background: '#ff1a6b', position: 'absolute', top: 0, left: 3 }} />
        </div>
        <div style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', display: 'grid', gridTemplateColumns: '5px 5px', gap: 2 }}>
          {[0, 1, 2, 3].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff1a6b' }} />)}
        </div>
      </div>
    </div>
  )
}

function OfferPoolIcon() {
  return (
    <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 40, height: 24, border: '2px solid #ff1a6b', borderRadius: 4, position: 'relative' }}>
        {[{ top: -2, left: -2 }, { top: -2, right: -2 }, { bottom: -2, left: -2 }, { bottom: -2, right: -2 }].map((p, i) => (
          <div key={i} style={{ position: 'absolute', width: 4, height: 4, borderRadius: '50%', background: '#c4006a', ...p }} />
        ))}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 5, height: 5, borderRadius: '50%', background: '#ff1a6b' }} />
      </div>
    </div>
  )
}

function HexStarIcon() {
  return (
    <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: 40, height: 40 }}>
        <div style={{ position: 'absolute', inset: 0, clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', background: '#ff1a6b' }} />
        <div style={{ position: 'absolute', inset: 2, clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', background: '#0a060d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: '#ff1a6b', lineHeight: 1 }}>★</span>
        </div>
      </div>
    </div>
  )
}

/* ── SVG Illustrations for Station Panel ── */
function SvgPC() {
  return (
    <svg width="220" height="160" viewBox="0 0 220 160">
      <defs>
        <pattern id="scanlines" x="0" y="0" width="2" height="4" patternUnits="userSpaceOnUse">
          <rect width="2" height="1" fill="black"/>
        </pattern>
      </defs>
      <rect x="30" y="10" width="160" height="105" rx="6" fill="none" stroke="#ff1a6b" strokeWidth="1.5" opacity="0.9"/>
      <rect x="36" y="16" width="148" height="93" rx="3" fill="rgba(255,26,107,0.06)"/>
      <rect x="44" y="65" width="20" height="32" rx="1" fill="rgba(255,26,107,0.5)"/>
      <rect x="70" y="52" width="20" height="45" rx="1" fill="rgba(255,26,107,0.7)"/>
      <rect x="96" y="44" width="20" height="53" rx="1" fill="rgba(255,26,107,0.9)"/>
      <rect x="122" y="58" width="20" height="39" rx="1" fill="rgba(255,26,107,0.6)"/>
      <rect x="148" y="70" width="20" height="27" rx="1" fill="rgba(255,26,107,0.4)"/>
      <rect x="36" y="16" width="148" height="93" rx="3" fill="url(#scanlines)" opacity="0.3"/>
      <rect x="104" y="115" width="12" height="20" rx="1" fill="none" stroke="#ff1a6b" strokeWidth="1.5" opacity="0.7"/>
      <rect x="80" y="133" width="60" height="6" rx="3" fill="none" stroke="#ff1a6b" strokeWidth="1.5" opacity="0.7"/>
      <rect x="50" y="145" width="120" height="12" rx="2" fill="none" stroke="rgba(255,26,107,0.5)" strokeWidth="1"/>
      <line x1="55" y1="148" x2="165" y2="148" stroke="rgba(255,26,107,0.25)" strokeWidth="0.5"/>
      <line x1="55" y1="151" x2="165" y2="151" stroke="rgba(255,26,107,0.25)" strokeWidth="0.5"/>
      <line x1="55" y1="154" x2="165" y2="154" stroke="rgba(255,26,107,0.25)" strokeWidth="0.5"/>
      <circle cx="36" cy="16" r="2" fill="#ff1a6b" opacity="0.6"/>
      <circle cx="184" cy="16" r="2" fill="#ff1a6b" opacity="0.6"/>
    </svg>
  )
}

function SvgPS5() {
  return (
    <svg width="200" height="160" viewBox="0 0 200 160">
      <path d="M40 70 Q30 60 28 80 Q26 105 40 115 Q55 125 65 115 L75 95 L75 65 Z" fill="none" stroke="#ff1a6b" strokeWidth="1.5"/>
      <path d="M160 70 Q170 60 172 80 Q174 105 160 115 Q145 125 135 115 L125 95 L125 65 Z" fill="none" stroke="#ff1a6b" strokeWidth="1.5"/>
      <path d="M75 65 Q100 55 125 65 L125 95 Q100 100 75 95 Z" fill="rgba(255,26,107,0.06)" stroke="#ff1a6b" strokeWidth="1.5"/>
      <rect x="82" y="68" width="36" height="22" rx="4" fill="none" stroke="rgba(255,26,107,0.4)" strokeWidth="1"/>
      <circle cx="62" cy="85" r="10" fill="none" stroke="#ff1a6b" strokeWidth="1.5"/>
      <circle cx="62" cy="85" r="4" fill="rgba(255,26,107,0.3)"/>
      <circle cx="118" cy="85" r="10" fill="none" stroke="#ff1a6b" strokeWidth="1.5"/>
      <circle cx="118" cy="85" r="4" fill="rgba(255,26,107,0.3)"/>
      <circle cx="142" cy="72" r="4" fill="none" stroke="rgba(255,26,107,0.6)" strokeWidth="1"/>
      <circle cx="152" cy="80" r="4" fill="none" stroke="rgba(255,26,107,0.6)" strokeWidth="1"/>
      <circle cx="142" cy="88" r="4" fill="none" stroke="rgba(255,26,107,0.6)" strokeWidth="1"/>
      <circle cx="132" cy="80" r="4" fill="none" stroke="rgba(255,26,107,0.6)" strokeWidth="1"/>
      <rect x="49" y="70" width="6" height="16" rx="1" fill="rgba(255,26,107,0.4)"/>
      <rect x="43" y="76" width="18" height="6" rx="1" fill="rgba(255,26,107,0.4)"/>
      <ellipse cx="100" cy="125" rx="50" ry="6" fill="rgba(255,26,107,0.12)"/>
    </svg>
  )
}

function SvgPool() {
  return (
    <svg width="200" height="160" viewBox="0 0 200 160">
      <rect x="20" y="40" width="160" height="90" rx="8" fill="rgba(255,26,107,0.05)" stroke="#ff1a6b" strokeWidth="1.5"/>
      <rect x="30" y="50" width="140" height="70" rx="4" fill="none" stroke="rgba(255,26,107,0.3)" strokeWidth="0.5"/>
      <circle cx="30" cy="50" r="5" fill="rgba(255,26,107,0.15)" stroke="#ff1a6b" strokeWidth="1"/>
      <circle cx="170" cy="50" r="5" fill="rgba(255,26,107,0.15)" stroke="#ff1a6b" strokeWidth="1"/>
      <circle cx="30" cy="120" r="5" fill="rgba(255,26,107,0.15)" stroke="#ff1a6b" strokeWidth="1"/>
      <circle cx="170" cy="120" r="5" fill="rgba(255,26,107,0.15)" stroke="#ff1a6b" strokeWidth="1"/>
      <circle cx="100" cy="47" r="4" fill="rgba(255,26,107,0.15)" stroke="#ff1a6b" strokeWidth="1"/>
      <circle cx="100" cy="123" r="4" fill="rgba(255,26,107,0.15)" stroke="#ff1a6b" strokeWidth="1"/>
      <circle cx="80" cy="80" r="6" fill="rgba(255,26,107,0.8)" stroke="#ff1a6b" strokeWidth="0.5"/>
      <circle cx="100" cy="75" r="6" fill="rgba(255,26,107,0.4)" stroke="#ff1a6b" strokeWidth="0.5"/>
      <circle cx="120" cy="82" r="6" fill="rgba(255,26,107,0.6)" stroke="#ff1a6b" strokeWidth="0.5"/>
      <circle cx="92" cy="92" r="6" fill="rgba(255,26,107,0.3)" stroke="#ff1a6b" strokeWidth="0.5"/>
      <circle cx="112" cy="68" r="6" fill="rgba(255,26,107,0.7)" stroke="#ff1a6b" strokeWidth="0.5"/>
      <circle cx="55" cy="85" r="7" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.5)" strokeWidth="1"/>
      <line x1="15" y1="108" x2="62" y2="87" stroke="rgba(255,26,107,0.6)" strokeWidth="2" strokeLinecap="round"/>
      <ellipse cx="100" cy="135" rx="55" ry="5" fill="rgba(255,26,107,0.08)"/>
    </svg>
  )
}

const SVG_MAP = { pc: SvgPC, ps5: SvgPS5, pool: SvgPool }

/* ── Station Preview Panel (hero right column) ── */
function StationPanel({ activeTab, onTabClick, fadeState }) {
  const data = PANEL_DATA[activeTab]
  const SvgIllust = SVG_MAP[activeTab]

  return (
    <div className="station-panel">
      {/* Section A: Tab switcher */}
      <div className="station-tabs">
        {PANEL_TABS.map(key => (
          <button
            key={key}
            className={`station-tab ${activeTab === key ? 'active' : ''}`}
            onClick={() => onTabClick(key)}
          >
            {PANEL_DATA[key].tab}
          </button>
        ))}
      </div>

      {/* Section B: Main card */}
      <div className="station-card-main">
        {/* Layer 1: Background texture */}
        <div className="card-grid-bg" />
        <div className="card-glow" />

        {/* Layer 2: Visual display */}
        <div className={`card-visual ${fadeState}`}>
          <SvgIllust />
        </div>

        {/* Layer 3: Info bar */}
        <div className="card-info">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 22, color: '#f0e8f0' }}>
              {data.name}
            </span>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: '#ff1a6b', lineHeight: 1, display: 'block' }}>
                {data.price}
              </span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#7a5f7a', letterSpacing: '0.08em' }}>
                PER HOUR
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {data.specs.map(s => (
              <span key={s} className="spec-tag">{s}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Section C: Book CTA strip */}
      <div className="panel-cta">
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#7a5f7a', display: 'flex', alignItems: 'center' }}>
          <span className="live-dot" />
          {data.count} station{data.count > 1 ? 's' : ''} available now
        </span>
        <Link to="/book" className="panel-book-link">
          BOOK THIS →
        </Link>
      </div>
    </div>
  )
}

/* ── Current Offers strip ── */
function OfferCard({ discount }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(discount.code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const discLabel = discount.type === 'PERCENTAGE'
    ? `${discount.value}% OFF`
    : `₹${discount.value} OFF`

  const appliesToLabel = { ALL: 'ALL STATIONS', PC: 'PC ONLY', PS5: 'PS5 ONLY', POOL: 'POOL ONLY' }

  const expiryText = discount.valid_until
    ? `Ends ${new Date(discount.valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
    : 'No expiry'

  return (
    <div
      onClick={handleCopy}
      style={{
        minWidth: 260,
        background: '#12121A',
        border: copied ? '1px solid #ff1a6b' : '1px solid rgba(196,0,106,0.2)',
        borderTop: '2px solid #ff1a6b',
        padding: 24,
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
        transform: copied ? 'translateY(-4px)' : undefined,
        boxShadow: copied ? '0 8px 32px rgba(255,26,107,0.15)' : undefined,
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#ff1a6b'
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(255,26,107,0.15)'
      }}
      onMouseLeave={e => {
        if (!copied) {
          e.currentTarget.style.borderColor = 'rgba(196,0,106,0.2)'
          e.currentTarget.style.transform = ''
          e.currentTarget.style.boxShadow = ''
        }
      }}
    >
      {/* Applies-to badge */}
      <div style={{
        display: 'inline-block',
        background: 'rgba(255,26,107,0.12)',
        color: '#ff1a6b',
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 11, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        padding: '2px 8px', borderRadius: 2, marginBottom: 12,
      }}>
        {appliesToLabel[discount.applies_to] || 'ALL STATIONS'}
      </div>

      {/* Discount value */}
      <div style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: 48, color: '#ff1a6b', lineHeight: 1,
        marginBottom: 8,
        textShadow: '0 0 20px rgba(255,26,107,0.4)',
      }}>
        {copied ? 'COPIED!' : discLabel}
      </div>

      {/* Label */}
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 700, fontSize: 18, color: '#f0e8f0', marginBottom: 4,
      }}>
        {discount.label}
      </div>

      {/* Description */}
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12, color: '#7a5f7a', marginBottom: 16,
      }}>
        {discount.description}
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid rgba(196,0,106,0.2)', marginBottom: 12 }} />

      {/* Bottom row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#7a5f7a' }}>
          Min. ₹{discount.min_booking}
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#7a5f7a' }}>
          {expiryText}
        </span>
      </div>

      {/* Code tap row */}
      <div style={{ borderTop: '1px solid rgba(196,0,106,0.2)', paddingTop: 12, textAlign: 'center' }}>
        {copied ? (
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 18, color: '#ff1a6b', letterSpacing: '0.1em',
          }}>
            {discount.code}
          </div>
        ) : (
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 12, color: '#7a5f7a',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            TAP TO COPY CODE
          </div>
        )}
      </div>
    </div>
  )
}

function CurrentOffers() {
  const [discounts, setDiscounts] = useState([])
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    api.get('/discounts').then(r => setDiscounts(r.data.discounts)).catch(() => {})
  }, [])

  if (discounts.length === 0) return null

  return (
    <div className="pt-12">
      <div className="px-4 sm:px-6 lg:px-20 pb-5">
        <span className="section-label">// CURRENT OFFERS</span>
      </div>
      <div
        className="offers-scroll px-4 sm:px-6 lg:px-20 pb-12"
        style={{
          display: 'flex',
          gap: 16,
          overflowX: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: '#3a1030 #110b18',
        }}>
        {discounts.map(d => (
          <OfferCard key={d.id} discount={d} />
        ))}
      </div>
    </div>
  )
}

/* ── Tournament Section ── */
const GAME_TYPE_COLORS_HOME = {
  ALL:  'bg-bgc-pink/10 text-bgc-pink',
  PC:   'bg-blue-500/10 text-blue-400',
  PS5:  'bg-bgc-pink/10 text-bgc-pink',
  POOL: 'bg-purple-500/10 text-purple-400',
}

function TournamentSection() {
  const [tournaments, setTournaments] = useState([])

  useEffect(() => {
    api.get('/tournaments').then(r => {
      const filtered = (r.data.tournaments || []).filter(t => ['open', 'ongoing'].includes(t.status))
      setTournaments(filtered.slice(0, 3))
    }).catch(() => {})
  }, [])

  if (tournaments.length === 0) return null

  return (
    <div className="w-full bg-bgc-surface border-t border-bgc-border">
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 py-10 lg:py-[72px] w-full">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
          <div>
            <span className="section-label">// TOURNAMENTS</span>
            <h2 className="section-title flex items-center gap-3">
              <Trophy size={32} className="text-bgc-pink" />
              Compete &amp; Win
            </h2>
            <p className="text-bgc-muted mt-2 text-sm max-w-md" style={{ fontFamily: 'Inter, sans-serif' }}>
              Join official BGC tournaments. Register your spot, compete, and claim the prize.
            </p>
          </div>
          <Link to="/tournaments" className="text-bgc-pink text-sm font-medium hover:underline sm:shrink-0"
            style={{ fontFamily: 'Inter, sans-serif' }}>
            See All Tournaments →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tournaments.map(t => {
            const spotsLeft = t.max_participants - (t.registration_count || 0)
            const isFull = spotsLeft <= 0
            return (
              <div key={t.id}
                className="bg-bgc-elevated border border-bgc-border rounded-xl overflow-hidden hover:border-bgc-pink/30 transition-all"
                style={{ borderTop: '2px solid #ff1a6b' }}>
                <div className="p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${GAME_TYPE_COLORS_HOME[t.game_type] || ''}`}
                      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {t.game_type}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-bgc-surface text-bgc-muted border border-bgc-border"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {t.format}
                    </span>
                  </div>
                  <h3 className="font-heading text-lg text-bgc-text mb-1 leading-tight">{t.title}</h3>
                  {t.prize_pool && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <Trophy size={11} className="text-bgc-pink" />
                      <span className="text-bgc-pink text-xs font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>{t.prize_pool}</span>
                    </div>
                  )}
                  <div className="space-y-1 mb-3">
                    <p className="text-bgc-muted text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {dayjs(t.tournament_date).format('D MMM YYYY, h:mm A')}
                    </p>
                    <p className={`text-xs font-semibold ${isFull ? 'text-bgc-error' : 'text-bgc-muted'}`} style={{ fontFamily: 'Inter, sans-serif' }}>
                      {isFull ? 'FULL' : `${spotsLeft} spots left`}
                      {!isFull && <span className="font-normal ml-1 text-bgc-muted">/ {t.max_participants}</span>}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold ${t.entry_fee > 0 ? 'text-bgc-pink' : 'text-bgc-success'}`}
                      style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                      {t.entry_fee > 0 ? `₹${t.entry_fee} ENTRY` : 'FREE ENTRY'}
                    </span>
                    <Link to={`/tournaments/${t.id}`}
                      className="text-bgc-pink text-xs font-medium hover:underline flex items-center gap-1"
                      style={{ fontFamily: 'Inter, sans-serif' }}>
                      View &amp; Register <ChevronRight size={12} />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-6 text-center">
          <Link to="/tournaments" className="btn-outline text-sm inline-flex items-center gap-2">
            See All Tournaments <ChevronRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  )
}

/* ══════════════════════════════ */
export default function Home() {
  const [activeTab, setActiveTab] = useState('pc')
  const [fadeState, setFadeState] = useState('fade-in')
  const [lastManual, setLastManual] = useState(0)

  // Tab switching with fade animation
  const switchTo = (key, manual = false) => {
    if (key === activeTab) return
    if (manual) setLastManual(Date.now())
    setFadeState('fade-out')
    setTimeout(() => {
      setActiveTab(key)
      setFadeState('fade-in')
    }, 200)
  }

  // Auto-cycle every 4s if no manual click in last 8s
  useEffect(() => {
    const id = setInterval(() => {
      if (Date.now() - lastManual < 8000) return
      setFadeState('fade-out')
      setTimeout(() => {
        setActiveTab(prev => {
          const idx = PANEL_TABS.indexOf(prev)
          return PANEL_TABS[(idx + 1) % PANEL_TABS.length]
        })
        setFadeState('fade-in')
      }, 200)
    }, 4000)
    return () => clearInterval(id)
  }, [lastManual])

  return (
    <div className="min-h-screen flex flex-col bg-bgc-base">
      <Navbar />

      {/* ── Hero: Animated geometric shapes ── */}
      <HeroGeometric
        badge="Now Open · Ghatkopar, Mumbai"
        title1="BOMBAY"
        title2="GAMING CO."
        description="Mumbai's sleekest gaming cafe. 20 high-end PCs, 3 PlayStation 5s, and a professional pool table. Book online, pay with your wallet, earn points."
      />

      {/* ── Ticker bar ── */}
      <div className="w-full overflow-hidden" style={{ height: 36, background: '#ff1a6b' }}>
        <div className="ticker-track h-full flex items-center">
          {[0, 1].map(i => (
            <span key={i} className="whitespace-nowrap px-4"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(13px, 2vw, 16px)', color: '#0a060d', letterSpacing: '0.06em' }}>
              {TICKER_TEXT}
            </span>
          ))}
        </div>
      </div>

      {/* ── What We Offer strip ── */}
      <div>
        <div className="px-4 sm:px-6 lg:px-20 pt-8">
          <span className="section-label">// WHAT WE OFFER</span>
        </div>
        <div className="offer-strip">
          {[
            { Icon: PcTowerIcon, title: '20 Gaming PCs', body: 'RTX 4000 series rigs. 240Hz monitors. Mechanical keyboards.' },
            { Icon: OfferGamepadIcon, title: '3 PS5 Setups', body: '4K HDR displays. DualSense controllers. Latest titles.' },
            { Icon: OfferPoolIcon, title: 'Pro Pool Table', body: 'Full-size professional table. Available to book by the hour.' },
          ].map(item => (
            <div key={item.title} className="offer-block">
              <item.Icon />
              <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 20, color: '#f0e8f0', margin: 0 }}>
                {item.title}
              </p>
              <p style={{ fontFamily: "'Courier New', monospace", fontSize: 12, color: '#7a5f7a', margin: 0, maxWidth: 200, lineHeight: 1.5 }}>
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Social Proof bar ── */}
      <div className="social-proof-bar">
        <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 13, letterSpacing: '0.1em', color: '#7a5f7a', textTransform: 'uppercase', whiteSpace: 'nowrap', margin: 0 }}>
          TRUSTED BY MUMBAI'S GAMERS
        </p>
        {REVIEWS.map((r, i) => (
          <div key={i} style={{ display: 'contents' }}>
            <div className="social-divider" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span style={{ fontSize: 12, color: '#ff1a6b', letterSpacing: 2 }}>★★★★★</span>
              <span style={{ fontFamily: "'Courier New', monospace", fontSize: 12, color: '#f0e8f0', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                "{r.quote}"
              </span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 11, color: '#7a5f7a' }}>
                {r.name}
              </span>
            </div>
          </div>
        ))}
        <div className="social-divider" />
        {/* Google rating */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: '#ff1a6b', lineHeight: 1 }}>4.8</span>
          <span style={{ fontSize: 12, color: '#ff1a6b', letterSpacing: 2 }}>★★★★★</span>
          <span style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: '#7a5f7a' }}>on Google</span>
        </div>
      </div>

      {/* ── Stations Preview ── */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 py-10 lg:py-[72px] w-full">
        <div className="mb-8">
          <span className="section-label">// 01 OUR SETUPS</span>
          <h2 className="section-title">Three Ways to Play</h2>
          <p className="text-bgc-muted mt-3 max-w-xl text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
            Premium hardware, comfortable seating, and high-speed internet — every station is ready for the next level.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stationCards.map(st => {
            const Icon = st.icon
            return (
              <div key={st.type}
                className={`relative card-hover bg-gradient-to-br ${st.color} border ${st.border} flex flex-col p-5 ${st.featured ? 'ring-1 ring-bgc-pink/40' : ''}`}>
                {st.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 badge-pink text-xs px-3 py-1 shadow-pink-sm">
                    ✦ Most Popular
                  </span>
                )}
                <div className={`w-10 h-10 rounded-lg bg-bgc-surface/80 flex items-center justify-center mb-3 ${st.iconColor}`}>
                  <Icon size={20} />
                </div>
                <h3 className="font-heading text-xl text-bgc-text">{st.type}</h3>
                <p className="text-bgc-muted text-xs mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {st.count} station{st.count > 1 ? 's' : ''} available
                </p>
                <ul className="space-y-1.5 mb-4 flex-1">
                  {st.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-bgc-muted" style={{ fontFamily: 'Inter, sans-serif' }}>
                      <span className="w-1 h-1 rounded-full bg-bgc-pink shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="flex items-end justify-between pt-3 border-t border-bgc-border/50">
                  <div>
                    <span className="font-heading text-2xl text-bgc-text">{st.rate}</span>
                    <span className="text-bgc-muted text-xs ml-1" style={{ fontFamily: 'Inter, sans-serif' }}>{st.unit}</span>
                  </div>
                  <Link to="/book" className="btn-outline text-xs py-1.5 px-3">Book Now</Link>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── How It Works ── */}
      <div className="w-full bg-bgc-surface border-y border-bgc-border">
        <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 py-10 lg:py-[72px] w-full">
          <div className="mb-8">
            <span className="section-label">// 02 PROCESS</span>
            <h2 className="section-title">How It Works</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {steps.map((step, i) => (
              <div key={i} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-full w-full h-px bg-gradient-to-r from-bgc-pink/30 to-transparent z-0" />
                )}
                <div className="relative z-10 p-4">
                  <span className="font-heading text-5xl gradient-text block mb-2">{step.n}</span>
                  <h3 className="font-heading text-lg text-bgc-text mb-1">{step.title}</h3>
                  <p className="text-bgc-muted text-xs leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Wallet & Points ── */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 py-10 lg:py-[72px] w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="section-label">// 03 REWARDS</span>
            <h2 className="section-title mb-4">Play More,<br />Earn More</h2>
            <p className="text-bgc-muted mb-5 leading-relaxed text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
              Every rupee you spend earns you BGC Points. Accumulate them and redeem for free
              gaming time. Cancelled bookings are automatically refunded to your wallet.
            </p>
            <ul className="space-y-3">
              {[
                { icon: Zap,    text: '1 Point earned per ₹1 spent on any booking' },
                { icon: '★',    text: '100 Points = ₹10 wallet credit, redeemable anytime' },
                { icon: Shield, text: 'Auto-refund to wallet if booking is cancelled' },
                { icon: Clock,  text: 'Simple 50/50 payment — lock your slot with just half the cost' },
              ].map(({ icon: Icon, text }, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-bgc-pink/10 flex items-center justify-center shrink-0">
                    {typeof Icon === 'string'
                      ? <span className="text-bgc-pink text-xs">{Icon}</span>
                      : <Icon size={14} className="text-bgc-pink" />}
                  </div>
                  <span className="text-bgc-muted text-sm pt-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>{text}</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-3 mt-6">
              <Link to="/register" className="btn-primary text-sm">Get Started Free</Link>
              <Link to="/pricing"  className="btn-ghost text-sm">View Pricing</Link>
            </div>
          </div>

          {/* Mock wallet card */}
          <div className="flex justify-center">
            <div className="w-full max-w-sm neon-border rounded-xl p-5 bg-bgc-surface">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-bgc-muted text-xs uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>BGC Wallet</p>
                  <p className="font-heading text-3xl text-bgc-text mt-0.5">₹1,250.00</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-gradient-pink flex items-center justify-center">
                  <span className="font-heading text-white text-lg">B</span>
                </div>
              </div>
              <div className="bg-bgc-elevated rounded-lg p-3 mb-3">
                <p className="text-bgc-muted text-xs mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>Points Balance</p>
                <div className="flex items-center justify-between">
                  <span className="font-heading text-xl gradient-text">2,450 pts</span>
                  <span className="badge-pink text-xs">≈ ₹245 value</span>
                </div>
                <div className="mt-2 h-1 bg-bgc-border rounded-full overflow-hidden">
                  <div className="h-full w-[49%] bg-gradient-pink rounded-full" />
                </div>
                <p className="text-bgc-muted text-xs mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>49 / 100 pts to next reward</p>
              </div>
              <div className="space-y-1.5">
                {[
                  { label: 'PC Session · 2hrs', amount: '-₹50',  type: 'debit' },
                  { label: 'Points Redeemed',   amount: '+₹30',  type: 'credit' },
                  { label: 'Wallet Top-up',      amount: '+₹500', type: 'credit' },
                ].map(tx => (
                  <div key={tx.label} className="flex justify-between items-center py-1.5 border-b border-bgc-border/40 last:border-0">
                    <span className="text-xs text-bgc-muted" style={{ fontFamily: 'Inter, sans-serif' }}>{tx.label}</span>
                    <span className={`text-xs font-semibold ${tx.type === 'credit' ? 'text-bgc-success' : 'text-bgc-error'}`}>
                      {tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Location ── */}
      <div className="w-full bg-bgc-surface border-t border-bgc-border">
        <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 py-10 lg:py-[72px] w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div>
              <span className="section-label">// 04 FIND US</span>
              <h2 className="section-title mb-5">Right in the Heart<br />of Ghatkopar</h2>
              <div className="space-y-4">
                {[
                  { Icon: MapPin, title: 'Address', body: 'Shop No. XX, LBS Marg, Ghatkopar West, Mumbai – 400086', href: null, googleMaps: true },
                  { Icon: Clock,  title: 'Hours',   body: 'Monday – Sunday · 10:00 AM to 11:00 PM', href: null },
                  { Icon: Phone,  title: 'Contact', body: '+91 99999 99999', href: 'tel:+919999999999' },
                ].map(({ Icon, title, body, href, googleMaps }) => (
                  <div key={title} className="flex items-start gap-3">
                    <Icon size={16} className="text-bgc-pink mt-0.5 shrink-0" />
                    <div>
                      <p className="text-bgc-text font-medium text-sm">{title}</p>
                      {href
                        ? <a href={href} className="text-bgc-muted text-sm mt-0.5 hover:text-bgc-pink transition-colors block" style={{ fontFamily: 'Inter, sans-serif' }}>{body}</a>
                        : <p className="text-bgc-muted text-sm mt-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>{body}</p>
                      }
                      {googleMaps && (
                        <a href="https://maps.google.com/?q=Bombay+Gaming+Co,Ghatkopar+Mumbai" target="_blank" rel="noreferrer"
                           className="text-bgc-pink text-xs mt-1 inline-block hover:underline" style={{ fontFamily: 'Inter, sans-serif' }}>
                          View on Google Maps →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/book" className="btn-primary mt-6 inline-flex items-center gap-2 text-sm">
                Book Online <ChevronRight size={15} />
              </Link>
            </div>
            <div className="h-64 md:h-72 rounded-lg overflow-hidden neon-border">
              <iframe title="Bombay Gaming Co. Location" width="100%" height="100%"
                style={{ border: 0, display: 'block' }} loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src="https://maps.google.com/maps?q=19.0742709,72.908231&z=17&output=embed" />
            </div>
          </div>
        </section>
      </div>

      <TournamentSection />

      <CurrentOffers />

      <Footer />
    </div>
  )
}
