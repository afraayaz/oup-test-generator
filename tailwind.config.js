/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./{app,components,libs,pages,hooks}/**/*.{html,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        'noto-nastaliq': ['OUP Mehr Nastaliq', 'Noto Nastaliq Urdu', 'serif'],
        'nastaleeq': ['OUP Mehr Nastaliq', 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', 'serif'],
      },
    },
  },
  plugins: [],
}

