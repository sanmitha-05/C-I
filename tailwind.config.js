/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Raptee.HV brand colors
        raptee: {
          50: '#e6f7f5',
          100: '#b3e8e1',
          200: '#80d9cd',
          300: '#4dcab9',
          400: '#26bba8',
          500: '#00897B',  // Primary teal
          600: '#007d70',
          700: '#006b5f',
          800: '#005a4f',
          900: '#003d35',
        },
        sidebar: {
          DEFAULT: '#0f1923',
          hover: '#1a2836',
          active: '#1e3a4a',
          border: '#1e2d3d',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
