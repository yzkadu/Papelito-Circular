/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        serif: ['"Instrument Serif"', '"Times New Roman"', 'serif'],
      },
      colors: {
        ink: { DEFAULT: '#111111', soft: '#2b2b2b' },
        paper: { DEFAULT: '#f7f6f2', line: '#e6e3da' },
        brand: {
          50: '#effaf5', 100: '#d8f2e6', 200: '#b3e4cf', 300: '#7fcfb1', 400: '#48b38e',
          500: '#259873', 600: '#187a5d', 700: '#14624c', 800: '#134e3e', 900: '#114034',
        },
        accent: { 400: '#f58a4b', 500: '#f26b1d', 600: '#d95312' },
      },
      boxShadow: { card: '0 1px 2px rgba(17,17,17,0.04), 0 1px 1px rgba(17,17,17,0.03)' },
    },
  },
  plugins: [],
};
