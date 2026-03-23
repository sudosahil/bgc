'use client'

import { Link } from 'react-router-dom'
import { SplineScene } from "@/components/ui/splite"
import { Card } from "@/components/ui/card"
import { Spotlight } from "@/components/ui/spotlight"

/**
 * SVG fallback for mobile (shown when 3D scene is hidden).
 * Simplified DualSense controller illustration matching the BGC brand.
 */
function SvgPS5Fallback() {
  return (
    <svg width="200" height="160" viewBox="0 0 200 160">
      <path d="M40 70 Q30 60 28 80 Q26 105 40 115 Q55 125 65 115 L75 95 L75 65 Z"
        fill="none" stroke="#c400ff" strokeWidth="1.5" />
      <path d="M160 70 Q170 60 172 80 Q174 105 160 115 Q145 125 135 115 L125 95 L125 65 Z"
        fill="none" stroke="#c400ff" strokeWidth="1.5" />
      <path d="M75 65 Q100 55 125 65 L125 95 Q100 100 75 95 Z"
        fill="rgba(196,0,255,0.06)" stroke="#c400ff" strokeWidth="1.5" />
      <rect x="82" y="68" width="36" height="22" rx="4"
        fill="none" stroke="rgba(196,0,255,0.4)" strokeWidth="1" />
      <circle cx="62" cy="85" r="10" fill="none" stroke="#c400ff" strokeWidth="1.5" />
      <circle cx="62" cy="85" r="4" fill="rgba(196,0,255,0.3)" />
      <circle cx="118" cy="85" r="10" fill="none" stroke="#c400ff" strokeWidth="1.5" />
      <circle cx="118" cy="85" r="4" fill="rgba(196,0,255,0.3)" />
      <circle cx="142" cy="72" r="4" fill="none" stroke="rgba(196,0,255,0.6)" strokeWidth="1" />
      <circle cx="152" cy="80" r="4" fill="none" stroke="rgba(196,0,255,0.6)" strokeWidth="1" />
      <circle cx="142" cy="88" r="4" fill="none" stroke="rgba(196,0,255,0.6)" strokeWidth="1" />
      <circle cx="132" cy="80" r="4" fill="none" stroke="rgba(196,0,255,0.6)" strokeWidth="1" />
      <rect x="49" y="70" width="6" height="16" rx="1" fill="rgba(196,0,255,0.4)" />
      <rect x="43" y="76" width="18" height="6" rx="1" fill="rgba(196,0,255,0.4)" />
      <ellipse cx="100" cy="135" rx="50" ry="6" fill="rgba(196,0,255,0.12)" />
    </svg>
  )
}

export function PS5ControllerCard() {
  return (
    <Card className="
      w-full h-auto md:h-[520px]
      bg-[#06040f]
      border border-purple-900/30
      relative overflow-hidden
    ">
      {/* Spotlight effect */}
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="#c400ff"
      />

      {/* Background grid */}
      <div className="
        absolute inset-0 z-0 pointer-events-none
        bg-[linear-gradient(rgba(196,0,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(196,0,255,0.04)_1px,transparent_1px)]
        bg-[size:48px_48px]
      " />

      {/* Background glow blob */}
      <div className="
        absolute right-0 top-1/2 -translate-y-1/2
        w-[420px] h-[420px] rounded-full
        bg-[radial-gradient(circle,rgba(196,0,255,0.15)_0%,rgba(140,0,255,0.06)_50%,transparent_70%)]
        pointer-events-none z-0
      " />

      <div className="flex flex-col md:flex-row h-full relative z-10">

        {/* ── LEFT: Text content ── */}
        <div className="flex-1 p-8 md:p-10 flex flex-col justify-center gap-5 md:gap-6">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 w-fit
            px-3 py-1.5
            border border-purple-500/30
            bg-purple-500/10
            text-purple-400 text-[11px]
            font-mono tracking-widest uppercase"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400
              animate-pulse shadow-[0_0_6px_#c400ff]" />
            PS5 Station Available
          </div>

          {/* Headline */}
          <div>
            <h2 className="
              text-5xl md:text-6xl font-black uppercase leading-[0.9]
              tracking-tight
              bg-clip-text text-transparent
              bg-gradient-to-b from-white via-white to-neutral-400
              font-display
            ">
              PlayStation
            </h2>
            <h2 className="
              text-5xl md:text-6xl font-black uppercase leading-[0.9]
              tracking-tight
              bg-clip-text text-transparent
              bg-gradient-to-r from-[#c400ff] via-[#ff2af0] to-[#00e5ff]
              drop-shadow-[0_0_24px_rgba(196,0,255,0.6)]
              font-display
            ">
              5 Setup
            </h2>
          </div>

          {/* Description */}
          <p className="text-neutral-400 text-sm font-mono
            leading-relaxed max-w-[320px]">
            4K HDR · DualSense haptics · 55″ Sony display.<br />
            3 stations. Book in seconds.
          </p>

          {/* Spec pills */}
          <div className="flex flex-wrap gap-2">
            {['4K 120Hz HDR', 'DualSense', '55″ TV', '50+ Titles'].map(spec => (
              <span key={spec} className="
                text-[11px] font-mono text-purple-300/70
                border border-purple-500/20
                bg-purple-500/5
                px-3 py-1
              ">
                {spec}
              </span>
            ))}
          </div>

          {/* Price + CTA */}
          <div className="flex items-center gap-5 mt-2">
            <div>
              <span className="
                font-display text-4xl
                text-[#c400ff] leading-none
                drop-shadow-[0_0_16px_rgba(196,0,255,0.5)]
              ">
                ₹150
              </span>
              <span className="text-[11px] font-mono text-neutral-500
                tracking-widest uppercase ml-2">
                / hour
              </span>
            </div>
            <Link
              to="/book"
              className="
                font-ui
                font-bold text-sm tracking-widest uppercase
                bg-gradient-to-r from-[#c400ff] to-[#ff2af0]
                text-white px-6 py-3
                hover:opacity-90 hover:-translate-y-0.5
                transition-all duration-200
                shadow-[0_4px_24px_rgba(196,0,255,0.3)]
                no-underline
              "
            >
              Book Now →
            </Link>
          </div>
        </div>

        {/* ── Mobile SVG fallback ── */}
        <div className="flex md:hidden items-center justify-center p-8">
          <SvgPS5Fallback />
        </div>

        {/* ── RIGHT: 3D PS5 Controller (desktop only) ── */}
        <div className="hidden md:flex flex-1 relative">
          <SplineScene
            scene="https://prod.spline.design/Kc6G4HxIiGDP8gGZ/scene.splinecode"
            className="w-full h-full"
          />

          {/* Floating label over 3D */}
          <div className="
            absolute bottom-6 left-1/2 -translate-x-1/2
            flex items-center gap-2
            border border-purple-500/20 bg-black/60
            backdrop-blur-md px-4 py-2
            font-mono text-[11px] text-purple-300/60
            tracking-widest uppercase whitespace-nowrap
          ">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400
              shadow-[0_0_6px_#00ff88] animate-pulse" />
            3 stations available now
          </div>
        </div>

      </div>
    </Card>
  )
}
