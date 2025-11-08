/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        'background-light': '#F9FAFB',
        'background-dark': '#111827',
      },
    },
  },
  plugins: [],
  darkMode: 'class'
}

