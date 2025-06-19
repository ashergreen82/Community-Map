/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Add your custom colors here
        primary: '#1976d2',
        secondary: '#9c27b0',
        error: '#d32f2f',
        warning: '#ed6c02',
        info: '#0288d1',
        success: '#2e7d32',
      },
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
