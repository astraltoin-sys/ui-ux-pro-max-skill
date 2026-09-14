/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display SC"', 'Georgia', 'serif'],
        sans: ['Karla', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        // Paleta "Espresso & Amber" - casa noturna / bar
        ink: {
          950: '#0B0A0C',
          900: '#121015',
          850: '#17141B',
          800: '#1D1922',
          700: '#282231',
          600: '#3A3245',
          500: '#5A4E68',
          400: '#8B7F9B',
          300: '#B9AEC7',
          200: '#D6CFE0',
          100: '#F5F3F7',
          50: '#FBF9FC',
        },
        amber: {
          50: '#FFF8EB',
          100: '#FFEFC7',
          200: '#FFDF8A',
          300: '#FCD34D',
          400: '#F5B32B',
          500: '#E69511',
          600: '#C2740A',
          700: '#96570A',
        },
        status: {
          novo: '#F97316',
          preparando: '#38BDF8',
          pronto: '#34D399',
          pago: '#A78BFA',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(245,179,43,.35), 0 8px 30px -8px rgba(245,179,43,.35)',
        card: '0 1px 0 0 rgba(255,255,255,.04) inset, 0 10px 30px -12px rgba(0,0,0,.6)',
      },
      keyframes: {
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(.94)' },
          '60%': { opacity: '1', transform: 'scale(1.02)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'alert-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(249,115,22,.65)' },
          '50%': { boxShadow: '0 0 0 14px rgba(249,115,22,0)' },
        },
        'screen-flash': {
          '0%, 100%': { opacity: '0' },
          '50%': { opacity: '1' },
        },
        'marquee-in': {
          from: { opacity: '0', transform: 'translateY(-6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-up': 'slide-up .32s cubic-bezier(.22,1,.36,1) both',
        'pop-in': 'pop-in .28s cubic-bezier(.22,1,.36,1) both',
        'alert-pulse': 'alert-pulse 1.4s ease-out infinite',
        'screen-flash': 'screen-flash 1.1s ease-in-out 4',
        'marquee-in': 'marquee-in .25s ease-out both',
      },
    },
  },
  plugins: [],
};
