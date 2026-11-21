/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f5fa',
          100: '#e1ecf5',
          200: '#c3d9eb',
          300: '#94bde0',
          400: '#5e9cd1',
          500: '#387ec1',
          600: '#2563a6',
          700: '#1f4f86',
          800: '#173b64',
          900: '#0f2744',
          950: '#0a192f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(15, 39, 68, 0.08), 0 1px 2px -1px rgba(15, 39, 68, 0.08)',
        'card-hover': '0 10px 15px -3px rgba(15, 39, 68, 0.08), 0 4px 6px -4px rgba(15, 39, 68, 0.05)',
        'elevation': '0 20px 25px -5px rgba(15, 39, 68, 0.1), 0 8px 10px -6px rgba(15, 39, 68, 0.08)',
      }
    },
  },
  plugins: [],
}
