/** @type {import('tailwindcss').Config} */
//
// Dancing Academy color palette (keep in sync with src/lib/theme.ts):
// #FFFEF6 cream (backgrounds) | #FEF003 accent (highlights) | #D26A17 primary | #68482F primary-dark | #956331 primary-light
//
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FFFEF6',   // Page/section backgrounds
        accent: '#FEF003',  // Yellow accent for highlights
        primary: {
          DEFAULT: '#D26A17', // Main brand (warm orange)
          dark: '#68482F',    // Dark brown (hover)
          light: '#956331',   // Medium brown
          lighter: '#FFFEF6', // Cream for soft backgrounds
        },
      },
    },
  },
  plugins: [],
};
