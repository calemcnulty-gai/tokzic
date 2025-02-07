/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: {
          primary: '#0A0A0F',
          secondary: '#12121A',
          glass: 'rgba(18, 18, 26, 0.8)',
        },
        neon: {
          green: '#00FF9D',
          pink: '#FF00E5',
          purple: '#9D00FF',
          blue: '#00E5FF',
        },
        text: {
          primary: '#FFFFFF',
          secondary: 'rgba(255, 255, 255, 0.7)',
          muted: 'rgba(255, 255, 255, 0.5)',
          accent: '#00FF9D',
        },
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.1)',
          focus: '#00FF9D',
          hover: 'rgba(0, 255, 157, 0.3)',
        },
        status: {
          success: '#00FF9D',
          error: '#FF3D71',
          warning: '#FFAA00',
          info: '#00E5FF',
        },
      },
      spacing: {
        safe: 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
}; 