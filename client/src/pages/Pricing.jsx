import { Link } from 'react-router-dom'
import { Monitor, Gamepad2, Circle, Check, Star, Zap } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const plans = [
  {
    icon: Monitor, type: 'pc', label: 'Gaming PC',
    rate: 50, unit: 'per hour',
    borderClass: 'border-bgc-purp/30',
    iconBg: 'bg-bgc-purp/20',
    iconColor: 'text-bgc-neonB',
    features: [
      'High-performance gaming rig',
      '144Hz IPS display',
      'Mechanical keyboard & mouse',
      'All popular titles installed',
      'High-speed fibre internet',
    ],
  },
  {
    icon: Gamepad2, type: 'playstation', label: 'PlayStation 5',
    rate: 150, unit: 'per hour',
    featured: true,
    borderClass: 'border-bgc-pink/40',
    iconBg: 'bg-bgc-pink/10',
    iconColor: 'text-bgc-pink',
    features: [
      'PlayStation 5 console',
      '4K HDR 65" Sony display',
      'DualSense controllers',
      'Full PS5 game library',
      'Multiplayer setup',
    ],
  },
  {
    icon: Circle, type: 'pool', label: 'Pool Table',
    rate: 450, unit: 'per hour',
    borderClass: 'border-bgc-magenta/25',
    iconBg: 'bg-bgc-magenta/15',
    iconColor: 'text-bgc-neonB',
    features: [
      'Professional 7-ft table',
      'Premium cues provided',
      'Tournament-grade balls',
      'Chalk & accessories',
      'Great for groups of 2–4',
    ],
  },
]

export default function Pricing() {
  return (
    <div className="min-h-screen flex flex-col bg-bgc-base">
      <Navbar />
      <div className="pt-16">

        {/* Header */}
        <div className="bg-bgc-surface border-b border-bgc-border py-14">
          <div className="max-w-[1200px] mx-auto px-10 text-center w-full">
            <span className="section-label" style={{ textAlign: 'center', display: 'block' }}>// TRANSPARENT PRICING</span>
            <h1 className="section-title mb-3">Simple, Pay-as-You-Play</h1>
            <p className="text-bgc-muted max-w-xl mx-auto text-sm">
              No memberships required. Book any station by the hour, pay 50% upfront to lock your slot.
            </p>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="max-w-[1200px] mx-auto px-10 py-[72px] w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-14 items-start">
            {plans.map(plan => {
              const Icon = plan.icon
              return (
                <div key={plan.type}
                  className={`relative bg-bgc-surface border ${plan.borderClass} rounded-xl flex flex-col p-7 ${
                    plan.featured
                      ? 'ring-1 ring-bgc-pink/30 shadow-pink-sm pricing-featured'
                      : ''
                  }`}
                  style={plan.featured ? { transform: 'translateY(-12px)' } : undefined}>
                  {plan.featured && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 badge-pink px-4 py-1 flex items-center gap-1.5">
                      <Star size={10} fill="currentColor" />
                      Most Popular
                    </div>
                  )}
                  <div className={`w-12 h-12 rounded-xl ${plan.iconBg} flex items-center justify-center ${plan.iconColor} mb-4`}>
                    <Icon size={24} />
                  </div>
                  <h3 className="font-heading text-2xl text-bgc-text">{plan.label}</h3>
                  <div className="flex items-baseline gap-1 mt-3 mb-5">
                    <span className="font-heading text-4xl text-bgc-text">₹{plan.rate}</span>
                    <span className="text-bgc-muted text-sm">{plan.unit}</span>
                  </div>
                  <ul className="space-y-3 mb-6 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-bgc-muted">
                        <Check size={14} className="text-bgc-pink mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/book"
                    className={plan.featured ? 'btn-primary text-center' : 'btn-outline text-center'}>
                    Book Now
                  </Link>
                </div>
              )
            })}
          </div>

          {/* Separator */}
          <div className="flex items-center gap-3 mb-10 mt-4">
            <div className="flex-1 h-px bg-bgc-border" />
            <span className="text-bgc-pink text-lg">✦</span>
            <div className="flex-1 h-px bg-bgc-border" />
          </div>

          {/* Payment flow */}
          <div className="card mb-6">
            <h3 className="font-heading text-xl text-bgc-text mb-4">How Payment Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { step: '1', title: 'Pay 50% Deposit', desc: 'Lock your booking by paying half upfront from your BGC Wallet.' },
                { step: '2', title: 'Final Payment Due', desc: 'The remaining 50% is automatically due 2 hours before your slot.' },
                { step: '3', title: 'Auto-Refund on Cancel', desc: 'If no final payment is received, booking is cancelled and deposit is refunded to your wallet.' },
              ].map(item => (
                <div key={item.step} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-bgc-pink/15 flex items-center justify-center shrink-0">
                    <span className="gradient-text font-bold text-sm">{item.step}</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-bgc-text text-sm mb-1">{item.title}</h4>
                    <p className="text-bgc-muted text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Points banner */}
          <div className="bg-gradient-to-r from-bgc-purp/20 to-bgc-magenta/10 border border-bgc-pink/20 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-bgc-pink/20 flex items-center justify-center shrink-0">
                <Zap size={20} className="text-bgc-pink" />
              </div>
              <div>
                <h3 className="font-heading text-lg text-bgc-text mb-2">Earn BGC Points on Every Session</h3>
                <p className="text-bgc-muted text-sm mb-3">
                  Earn <strong className="text-bgc-text">1 point per ₹1 spent</strong>. Redeem{' '}
                  <strong className="text-bgc-text">100 points for ₹10</strong> wallet credit.
                </p>
                <div className="flex flex-wrap gap-3 text-sm">
                  {[
                    { label: '2hr PC Session', pts: '+100 pts' },
                    { label: '1hr PS5 Session', pts: '+150 pts' },
                    { label: '1hr Pool',        pts: '+450 pts' },
                  ].map(e => (
                    <div key={e.label} className="bg-bgc-surface rounded-lg px-3 py-2">
                      <p className="text-bgc-muted text-xs">{e.label}</p>
                      <p className="text-bgc-text font-semibold">{e.pts}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
