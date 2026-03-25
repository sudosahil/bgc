import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Tag, Copy, Check, Zap } from 'lucide-react'
import dayjs from 'dayjs'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import api from '../api/axios'

const APPLIES_LABELS = { ALL: 'All Stations', PC: 'PC Only', PS5: 'PS5 Only', POOL: 'Pool Only' }

function DiscountCard({ d }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(d.code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const discLabel = d.type === 'PERCENTAGE' ? `${d.value}% OFF` : `₹${d.value} OFF`
  const expiryText = d.valid_until
    ? `Ends ${dayjs(d.valid_until).format('DD MMM YYYY')}`
    : 'No expiry'
  const usesLeft = d.max_uses != null ? `${d.max_uses - d.uses_so_far} uses left` : '∞ uses'

  return (
    <div className="bg-bgc-surface border border-bgc-border rounded-xl overflow-hidden hover:border-bgc-pink/30 transition-colors"
      style={{ borderTop: '2px solid #ff1a6b' }}>
      <div className="p-5">
        {/* Applies to badge */}
        <span className="inline-block bg-bgc-pink/10 text-bgc-pink text-xs font-bold px-2 py-0.5 rounded mb-3"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em' }}>
          {APPLIES_LABELS[d.applies_to]}
        </span>

        {/* Value */}
        <div className="text-bgc-pink mb-1"
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, lineHeight: 1, textShadow: '0 0 20px rgba(255,26,107,0.35)' }}>
          {discLabel}
        </div>

        {/* Label + description */}
        <p className="font-heading text-bgc-text font-bold text-base mb-1">{d.label}</p>
        <p className="text-bgc-muted text-xs mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>{d.description}</p>

        {/* Meta */}
        <div className="border-t border-bgc-border/60 pt-3 mb-4 flex justify-between text-xs text-bgc-muted"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          <span>Min ₹{d.min_booking}</span>
          <span>{usesLeft}</span>
          <span>{expiryText}</span>
        </div>

        {/* Code + copy */}
        <button onClick={copy}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-bgc-pink/30 bg-bgc-pink/5 hover:bg-bgc-pink/10 transition-colors group">
          <span className="font-mono text-bgc-pink font-bold tracking-widest text-sm">{d.code}</span>
          <span className="text-bgc-muted group-hover:text-bgc-pink transition-colors">
            {copied ? <Check size={14} className="text-bgc-success" /> : <Copy size={14} />}
          </span>
        </button>
        {copied && (
          <p className="text-center text-xs text-bgc-success mt-1.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            Copied!
          </p>
        )}
      </div>
    </div>
  )
}

export default function Discounts() {
  const [discounts, setDiscounts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/discounts')
      .then(r => setDiscounts(r.data.discounts))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-bgc-base">
      <Navbar />
      <div className="flex-1 pt-24 pb-16 px-4 sm:px-6 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Tag size={18} className="text-bgc-pink" />
            <span className="text-bgc-pink text-xs font-bold tracking-widest uppercase"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Active Offers</span>
          </div>
          <h1 className="font-heading text-4xl font-bold text-bgc-text mb-2">Discounts & Offers</h1>
          <p className="text-bgc-muted text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
            Copy a code and apply it at checkout to save on your booking.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 rounded-full border-2 border-bgc-border border-t-bgc-pink animate-spin" />
          </div>
        ) : discounts.length === 0 ? (
          <div className="text-center py-24">
            <Tag size={40} className="text-bgc-border mx-auto mb-4" />
            <p className="text-bgc-muted text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
              No active offers right now. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {discounts.map(d => <DiscountCard key={d.id} d={d} />)}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 bg-bgc-pink/8 border border-bgc-pink/20 rounded-xl px-5 py-3 mb-4">
            <Zap size={14} className="text-bgc-pink" />
            <span className="text-bgc-muted text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
              Earn <span className="text-bgc-text font-semibold">1 BGC Point</span> per ₹1 spent. 100 pts = ₹10 wallet credit.
            </span>
          </div>
          <div>
            <Link to="/book" className="btn-primary inline-flex items-center gap-2 px-8">
              Book Now
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
