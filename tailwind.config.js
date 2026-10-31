/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      screens: { xs: '420px' },
      colors: {
        ink: {
          950: '#050608',
          900: '#07080B',
          850: '#0B0C10',
          800: '#101116',
          750: '#15161C',
          700: '#1A1B22',
        },
        line: {
          DEFAULT: '#202127',
          soft: '#2A2B33',
        },
        pulse: {
          DEFAULT: '#FF1024',
          600: '#E00D20',
          500: '#FF1024',
          400: '#FF3B4B',
          glow: '#FF2A38',
        },
        muted: '#A1A1AA',
        bone: '#F5F5F7',
      },
      fontFamily: {
        sans: ['Inter Variable', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 18px 60px -30px rgba(0,0,0,0.9)',
        redglow: '0 0 0 1px rgba(255,16,36,0.35), 0 10px 40px -12px rgba(255,16,36,0.45)',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        scan: {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(320%)' },
        },
        kenburns: {
          '0%': { transform: 'scale(1.02) translate3d(0,0,0)' },
          '100%': { transform: 'scale(1.12) translate3d(-1.2%, -1%, 0)' },
        },
        pulseDot: {
          '0%,100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.35', transform: 'scale(0.82)' },
        },
        floaty: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        marquee: 'marquee 38s linear infinite',
        'marquee-slow': 'marquee 70s linear infinite',
        scan: 'scan 4.5s ease-in-out infinite',
        kenburns: 'kenburns 18s ease-out forwards',
        pulseDot: 'pulseDot 1.6s ease-in-out infinite',
        floaty: 'floaty 6s ease-in-out infinite',
        shimmer: 'shimmer 6s linear infinite',
      },
    },
  },
  plugins: [],
};
