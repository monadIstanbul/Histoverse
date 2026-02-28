/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'cinzel': ['Cinzel', 'serif'],
        'rajdhani': ['Rajdhani', 'sans-serif'],
        'playfair': ['Playfair Display', 'serif'],
      },
      colors: {
        'void': '#0d0805',
        'panel': 'rgba(22,14,8,0.97)',
        'border': 'rgba(180,145,85,0.25)',
        'glow': '#c4a265',
        'gold': '#d4a520',
        'green': '#7a9e4a',
        'purple': '#8b5e3c',
        'red': '#a83232',
        'text': '#d4c4a8',
        'dim': '#6b5a45',
        'parchment': '#e8d5b0',
        'sepia': '#a67c28',
        'ink': '#2a1810',
      },
      animation: {
        'pulse-soft': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%, 100%': { boxShadow: '0 0 5px currentColor' },
          '50%': { boxShadow: '0 0 20px currentColor, 0 0 30px currentColor' },
        }
      }
    },
  },
  plugins: [],
}