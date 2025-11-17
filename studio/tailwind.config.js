/** @type {import('tailwindcss').Config} */
// 
// IMPORTANT: To change the primary color, update the DEFAULT value below
// and also update src/lib/theme.ts to keep them in sync
//
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#007257', // Main brand color - CHANGE THIS to update all primary colors
          dark: '#005a44', // Darker shade for hover states
          light: '#008a6a', // Lighter shade
          lighter: '#e6f5f2', // Very light shade for backgrounds
        },
      },
    },
  },
  plugins: [],
};
