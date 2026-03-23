/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bgc: {
          base:     '#0a060d',   /* near-black, purple undertone */
          surface:  '#110b18',   /* card surfaces — deep purple-black */
          elevated: '#1a1025',   /* elevated panels */
          border:   '#2d1030',   /* magenta-tinted border */
          pink:     '#ff1a6b',   /* hot pink — primary CTAs */
          magenta:  '#c4006a',   /* deep magenta — hover, borders */
          purp:     '#6b0d5a',   /* dark purple — glows, bg blobs */
          neonB:    '#ff6eb4',   /* soft pink-white — secondary links */
          text:     '#f0e8f0',   /* slightly pink-tinted white */
          muted:    '#7a5f7a',   /* muted mauve — descriptions */
          success:  '#22C55E',
          warning:  '#F59E0B',
          error:    '#EF4444',
        }
      },
      fontFamily: {
        heading: ['Bebas Neue', 'Rajdhani', 'sans-serif'],
        sub:     ['Rajdhani', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
        display: ['Bebas Neue', 'sans-serif'],
        ui:      ['Barlow Condensed', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #ff1a6b 0%, #c4006a 45%, #6b0d5a 100%)',
        'gradient-pink':  'linear-gradient(135deg, #ff1a6b 0%, #c4006a 45%, #6b0d5a 100%)',
        'gradient-dark':  'linear-gradient(135deg, #110b18, #0a060d)',
        'grid-pattern': `
          linear-gradient(rgba(255,26,107,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,26,107,0.04) 1px, transparent 1px)
        `,
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      boxShadow: {
        'pink-sm':  '0 0 12px rgba(255,26,107,0.25)',
        'pink-md':  '0 0 24px rgba(255,26,107,0.35)',
        'pink-lg':  '0 0 40px rgba(255,26,107,0.4)',
        'card':     '0 4px 24px rgba(0,0,0,0.5)',
        'brand':    '0 0 0 1px #ff1a6b, 0 0 20px rgba(255,26,107,0.18)',
      },
      animation: {
        'glow-pulse':  'glowPulse 2s ease-in-out infinite',
        'logo-pulse':  'logoPulse 1.8s ease-in-out infinite',
        'slide-up':    'slideUp 0.3s ease-out',
        'fade-in':     'fadeIn 0.4s ease-out',
        'dot-blink':   'dotBlink 1.4s ease-in-out infinite',
        'spotlight':   'spotlight 2s ease .75s 1 forwards',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 12px rgba(255,26,107,0.25)' },
          '50%':      { boxShadow: '0 0 30px rgba(255,26,107,0.5)' },
        },
        logoPulse: {
          '0%, 100%': { filter: 'drop-shadow(0 0 8px rgba(255,26,107,0.4))' },
          '50%':      { filter: 'drop-shadow(0 0 24px rgba(255,26,107,0.7))' },
        },
        dotBlink: {
          '0%, 100%': { opacity: 1 },
          '50%':      { opacity: 0.2 },
        },
        slideUp: {
          from: { opacity: 0, transform: 'translateY(12px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: 0 },
          to:   { opacity: 1 },
        },
        spotlight: {
          '0%':   { opacity: 0, transform: 'translate(-72%, -62%) scale(0.5)' },
          '100%': { opacity: 1, transform: 'translate(-50%, -40%) scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
