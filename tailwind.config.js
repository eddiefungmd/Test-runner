/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        nbme: {
          blue: '#1a3a6b',
          lightblue: '#2c5f9e',
          gray: '#f0f2f5',
          border: '#d1d5db',
          highlight: '#dbeafe',
          correct: '#16a34a',
          incorrect: '#dc2626',
          flag: '#d97706',
        },
      },
    },
  },
  plugins: [],
}
