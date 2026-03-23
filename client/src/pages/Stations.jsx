import { useEffect, useState } from 'react'
import { Monitor, Gamepad2, Circle } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { Link } from 'react-router-dom'
import api from '../api/axios'

const typeConfig = {
  pc: {
    label: 'Gaming PCs',
    icon: Monitor,
    color: 'text-bgc-neonB',
    bg: 'bg-bgc-purp/20',
    border: 'border-bgc-purp/30',
    dotColor: 'bg-bgc-neonB',
    specs: ['Intel Core i7 / Ryzen 7', 'NVIDIA RTX 3060+', '144Hz IPS Display', '16GB DDR4 RAM', 'High-Speed Fibre Internet'],
  },
  playstation: {
    label: 'PlayStation 5',
    icon: Gamepad2,
    color: 'text-bgc-pink',
    bg: 'bg-bgc-pink/10',
    border: 'border-bgc-pink/25',
    dotColor: 'bg-bgc-pink',
    specs: ['PlayStation 5 Console', '4K HDR 60fps', 'DualSense Controller', 'Full PS5 Library', '65" Sony Display'],
  },
  pool: {
    label: 'Pool Table',
    icon: Circle,
    color: 'text-bgc-neonB',
    bg: 'bg-bgc-magenta/15',
    border: 'border-bgc-magenta/25',
    dotColor: 'bg-bgc-neonB',
    specs: ['Professional 7-ft Table', 'Premium Cue Sticks', 'Tournament Balls', 'Chalk & Equipment', 'Great Lighting'],
  },
}

export default function Stations() {
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    api.get('/stations').then(r => setStations(r.data.stations)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const grouped = { pc: [], playstation: [], pool: [] }
  stations.forEach(s => { if (grouped[s.type]) grouped[s.type].push(s) })

  const types = filter === 'all' ? ['pc', 'playstation', 'pool'] : [filter]

  return (
    <div className="min-h-screen flex flex-col bg-bgc-base">
      <Navbar />
      <div className="pt-16">

        {/* Header */}
        <div className="bg-bgc-surface border-b border-bgc-border py-14">
          <div className="max-w-[1200px] mx-auto px-10 text-center w-full">
            <span className="section-label" style={{ display: 'block', textAlign: 'center' }}>// OUR SETUP</span>
            <h1 className="section-title mb-3">Premium Gaming Stations</h1>
            <p className="text-bgc-muted max-w-xl mx-auto text-sm">
              Every station is regularly maintained, cleaned, and upgraded. High-speed fibre internet on all PCs.
            </p>
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto px-10 py-[72px] w-full">

          {/* Filter tabs */}
          <div className="flex items-center gap-2 mb-8 flex-wrap">
            {['all', 'pc', 'playstation', 'pool'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                  filter === f
                    ? 'bg-gradient-pink text-white shadow-pink-sm'
                    : 'bg-bgc-surface border border-bgc-border text-bgc-muted hover:text-bgc-text hover:border-bgc-pink/30'
                }`}>
                {f === 'all' ? 'All Stations' : typeConfig[f]?.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 rounded-full border-2 border-bgc-border border-t-bgc-pink animate-spin" />
            </div>
          ) : (
            <div className="space-y-14">
              {types.map(type => {
                const cfg = typeConfig[type]
                const Icon = cfg.icon
                const list = grouped[type]
                if (!list.length) return null
                return (
                  <div key={type}>
                    {/* Section header */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center ${cfg.color}`}>
                        <Icon size={20} />
                      </div>
                      <div>
                        <h2 className="font-heading text-2xl text-bgc-text">{cfg.label}</h2>
                        <p className="text-bgc-muted text-sm">
                          {list.length} station{list.length > 1 ? 's' : ''} · ₹{list[0]?.hourly_rate}/hr
                        </p>
                      </div>
                      <div className="ml-auto">
                        <Link to="/book" className="btn-primary text-sm py-2">Book {cfg.label}</Link>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      {/* Specs */}
                      <div className={`card border ${cfg.border} col-span-1`}>
                        <h4 className="text-xs font-bold text-bgc-muted uppercase tracking-wider mb-3">Specifications</h4>
                        <ul className="space-y-2">
                          {cfg.specs.map(s => (
                            <li key={s} className="flex items-center gap-2 text-sm text-bgc-muted">
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor} shrink-0`} />
                              {s}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-4 pt-4 border-t border-bgc-border">
                          <span className="font-heading text-3xl text-bgc-text">₹{list[0]?.hourly_rate}</span>
                          <span className="text-bgc-muted text-sm ml-1">/ hour</span>
                        </div>
                      </div>

                      {/* Station grid */}
                      <div className="col-span-2 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                        {list.map(s => (
                          <div key={s.id}
                            className={`aspect-square rounded-lg border ${cfg.border} ${cfg.bg} flex flex-col items-center justify-center gap-1 cursor-pointer hover:shadow-pink-sm hover:border-bgc-pink/50 transition-all`}>
                            <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`}
                                  style={{ boxShadow: type === 'playstation' ? '0 0 6px #ff1a6b' : undefined }} />
                            <p className={`font-heading text-xs ${cfg.color} text-center leading-tight px-1`}>
                              {s.name}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}
