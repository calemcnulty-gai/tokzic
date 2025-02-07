/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#FF2D55',
        secondary: '#5856D6',
        background: {
          DEFAULT: '#000000',
          secondary: '#1C1C1E',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#8E8E93',
        },
      },
      spacing: {
        safe: 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
}; 