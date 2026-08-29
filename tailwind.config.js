/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        hand: ['Kalam', 'Caveat', 'Architects Daughter', 'cursive'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        canvas: {
          light: '#ffffff',
          dark: '#121212',
        },
        brand: {
          50: '#f5f5fe',
          100: '#ececfc',
          200: '#dad9fa',
          500: '#6965db',
          600: '#5b5fc7',
          700: '#4b4fb0',
        }
      },
      boxShadow: {
        'panel': '0 4px 16px -1px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        'panel-dark': '0 4px 16px -1px rgba(0, 0, 0, 0.5), 0 2px 6px -1px rgba(0, 0, 0, 0.3)',
      }
    },
  },
  plugins: [],
}
