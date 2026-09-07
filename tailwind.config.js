/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Lora', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          50: '#f8f8f7',
          100: '#eeede9',
          200: '#d8d6cf',
          300: '#b8b5ac',
          400: '#8c887e',
          500: '#6b6759',
          600: '#4d4a40',
          700: '#36342d',
          800: '#24231e',
          900: '#161512',
        },
      },
    },
  },
  plugins: [],
};
