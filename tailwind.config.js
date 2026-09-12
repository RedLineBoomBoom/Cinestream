/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        'xs': '480px',
        '3xl': '1920px',
        '4xl': '2560px',
      },
      colors: {
        netflix: {
          red: '#E50914',
          redHover: '#F40612',
          redDark: '#B80710',
          dark: '#141414',
          black: '#0B0B0B',
          card: '#181818',
          cardHover: '#242424',
          muted: '#808080',
          border: 'rgba(255, 255, 255, 0.1)',
        },
        cinema: {
          950: '#141414',
          900: '#181818',
          850: '#1f1f1f',
          800: '#262626',
          700: '#2f2f2f',
          600: '#404040',
        },
        brand: {
          red: '#E50914',
          gold: '#E50914',
          champagne: '#ffffff',
          amber: '#E50914',
          crimson: '#E50914',
          burgundy: '#B80710',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Bebas Neue', 'Inter', 'Montserrat', 'sans-serif'],
        heading: ['Inter', 'Montserrat', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'glow-red': '0 0 35px -5px rgba(229, 9, 20, 0.45)',
        'glow-white': '0 0 25px -5px rgba(255, 255, 255, 0.3)',
        'glow-gold': '0 0 35px -8px rgba(229, 9, 20, 0.45)',
        'glow-crimson': '0 0 35px -8px rgba(229, 9, 20, 0.4)',
        'glass-luxury': '0 12px 40px 0 rgba(0, 0, 0, 0.8)',
        'netflix-card': '0 10px 30px rgba(0, 0, 0, 0.85)',
      },
      letterSpacing: {
        'cinema': '0.15em',
        'grand': '0.2em',
        'tight-title': '-0.02em',
      }
    },
  },
  plugins: [],
}
