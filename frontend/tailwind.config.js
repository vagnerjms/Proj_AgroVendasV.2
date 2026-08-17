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
          dark: '#173e27',
          sidebar: '#12311f',
          hover: '#1e4e32',
          primary: '#1d5a37',
          light: '#eaf4ee',
          border: '#cfe3d6',
          text: '#173e27',
          accent: '#2d7a4b'
        }
      }
    },
  },
  plugins: [],
}
