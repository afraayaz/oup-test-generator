/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./{app,components,libs,pages,hooks}/**/*.{html,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        'noto-nastaliq': ['Noto Nastaliq Urdu', 'serif'],
        'nastaleeq': ['Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', 'serif'],
      },
    },
  },
  plugins: [],
}

