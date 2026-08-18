/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        agro: {
          navy: '#091b2e',
          navyLight: '#132c4a',
          navyBorder: '#162e4a',
          amber: '#df7b1b',
          amberHover: '#c86e18',
          ochre: '#d4984f',
          terracotta: '#c84b31',
          slateText: '#8fa3bf',
          primary: '#091b2e',
          accent: '#df7b1b'
        }
      }
    },
  },
  plugins: [],
}
