/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        notion: {
          bg: '#ffffff',
          text: '#37352f',
          gray: '#9b9a97',
        }
      }
    },
  },
  plugins: [],
}

