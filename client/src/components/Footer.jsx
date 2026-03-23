import { Link } from 'react-router-dom'
import { MapPin, Clock, Phone, Instagram, Youtube, Twitter } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-bgc-surface border-t border-bgc-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-2 h-2 rounded-full bg-bgc-pink shrink-0 animate-dot-blink"
                    style={{ boxShadow: '0 0 6px #ff1a6b' }} />
              <img src="/logo.png" alt="BGC" height="30"
                   style={{ height: 30, width: 'auto' }}
                   onError={e => { e.currentTarget.style.display = 'none' }} />
              <span className="text-bgc-text leading-none tracking-[0.05em]"
                    style={{ fontFamily: "'Bebas Neue', 'Rajdhani', sans-serif", fontSize: 18 }}>
                BOMBAY GAMING CO.
              </span>
            </div>
            <p className="text-bgc-muted text-sm leading-relaxed">
              Ghatkopar's premier gaming destination. Book PCs, PlayStations, and Pool online.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a href="#" className="w-8 h-8 rounded-lg bg-bgc-elevated flex items-center justify-center text-bgc-muted hover:text-bgc-pink hover:bg-bgc-pink/10 transition-colors">
                <Instagram size={15} />
              </a>
              <a href="#" className="w-8 h-8 rounded-lg bg-bgc-elevated flex items-center justify-center text-bgc-muted hover:text-bgc-pink hover:bg-bgc-pink/10 transition-colors">
                <Youtube size={15} />
              </a>
              <a href="#" className="w-8 h-8 rounded-lg bg-bgc-elevated flex items-center justify-center text-bgc-muted hover:text-bgc-pink hover:bg-bgc-pink/10 transition-colors">
                <Twitter size={15} />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-heading font-bold text-bgc-text text-sm tracking-wider uppercase mb-4">Explore</h4>
            <ul className="space-y-2.5">
              {[['/', 'Home'], ['/stations', 'Our Stations'], ['/pricing', 'Pricing'], ['/book', 'Book Now']].map(([to, label]) => (
                <li key={to}>
                  <Link to={to} className="text-bgc-muted text-sm hover:text-bgc-pink transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="font-heading font-bold text-bgc-text text-sm tracking-wider uppercase mb-4">Account</h4>
            <ul className="space-y-2.5">
              {[['/login', 'Sign In'], ['/register', 'Create Account'], ['/dashboard', 'My Dashboard']].map(([to, label]) => (
                <li key={to}>
                  <Link to={to} className="text-bgc-muted text-sm hover:text-bgc-pink transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading font-bold text-bgc-text text-sm tracking-wider uppercase mb-4">Find Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <MapPin size={15} className="text-bgc-pink mt-0.5 shrink-0" />
                <span className="text-bgc-muted text-sm">Shop No. XX, LBS Marg,<br />Ghatkopar West,<br />Mumbai – 400086</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Clock size={15} className="text-bgc-pink shrink-0" />
                <span className="text-bgc-muted text-sm">Daily: 10:00 AM – 11:00 PM</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone size={15} className="text-bgc-pink shrink-0" />
                <a href="tel:+919999999999" className="text-bgc-muted text-sm hover:text-bgc-pink transition-colors">
                  +91 99999 99999
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="divider mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-bgc-muted text-xs">
            © {new Date().getFullYear()} Bombay Gaming Company. All rights reserved.
          </p>
          <p className="text-bgc-muted text-xs">
            Ghatkopar, Mumbai, Maharashtra
          </p>
        </div>
      </div>
    </footer>
  )
}
