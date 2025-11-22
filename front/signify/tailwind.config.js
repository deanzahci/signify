/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Neo-brutalist color palette - Light mode
        'brutal-blue': '#0066FF',
        'brutal-blue-dark': '#0052CC',
        'brutal-black': '#000000',
        'brutal-white': '#FFFFFF',
        'brutal-gray': '#E5E5E5',
        'brutal-yellow': '#FFD93D',
        'brutal-red': '#FF3333',
        'brutal-green': '#00CC66',
        'brutal-purple': '#9933FF',

        // Dark mode specific colors
        'brutal-dark': {
          'blue': '#4D94FF',
          'blue-dark': '#3380FF',
          'black': '#FFFFFF',      // Inverted for borders
          'white': '#0A0A0A',       // Near-black background
          'gray': '#2A2A2A',
          'yellow': '#FFE066',
          'red': '#FF5555',
          'green': '#33DD77',
          'purple': '#AA66FF',
          'bg': '#0A0A0A',          // Main background
          'surface': '#1A1A1A',     // Card/surface background
          'border': '#FFFFFF',      // White borders in dark mode
          'shadow': '#4D94FF',      // Blue shadow color
          'text': '#FFFFFF',
          'text-secondary': '#B3B3B3',
        }
      },
      fontFamily: {
        'mono': ['Courier New', 'monospace'],
        'bold': ['Arial Black', 'sans-serif'],
      },
      boxShadow: {
        // Light mode shadows
        'brutal-sm': '2px 2px 0px #000000',
        'brutal': '4px 4px 0px #000000',
        'brutal-lg': '6px 6px 0px #000000',
        'brutal-xl': '8px 8px 0px #000000',

        // Dark mode shadows (with blue tint)
        'brutal-dark-sm': '2px 2px 0px #4D94FF',
        'brutal-dark': '4px 4px 0px #4D94FF',
        'brutal-dark-lg': '6px 6px 0px #4D94FF',
        'brutal-dark-xl': '8px 8px 0px #4D94FF',
      },
      borderWidth: {
        'brutal': '3px',
      }
    },
  },
  plugins: [],
}