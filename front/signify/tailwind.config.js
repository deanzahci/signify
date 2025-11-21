/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Neo-brutalist color palette
        'brutal-blue': '#0066FF',
        'brutal-blue-dark': '#0052CC',
        'brutal-black': '#000000',
        'brutal-white': '#FFFFFF',
        'brutal-gray': '#E5E5E5',
        'brutal-yellow': '#FFD93D',
        'brutal-red': '#FF3333',
        'brutal-green': '#00CC66',
        'brutal-purple': '#9933FF',
      },
      fontFamily: {
        'mono': ['Courier New', 'monospace'],
        'bold': ['Arial Black', 'sans-serif'],
      },
      boxShadow: {
        'brutal-sm': '2px 2px 0px #000000',
        'brutal': '4px 4px 0px #000000',
        'brutal-lg': '6px 6px 0px #000000',
        'brutal-xl': '8px 8px 0px #000000',
      },
      borderWidth: {
        'brutal': '3px',
      }
    },
  },
  plugins: [],
}