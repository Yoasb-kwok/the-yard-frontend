// ============================================
// CENTRAL THEME CONFIGURATION
// ============================================
// 
// To change the primary color across the entire application:
// 1. Update the 'primary' color value below
// 2. Update the same value in tailwind.config.js (line 8)
// 3. Optionally adjust the dark/light/lighter variants
//
// The application uses Tailwind CSS classes like:
// - bg-primary, text-primary, border-primary
// - bg-primary-dark, bg-primary-light, bg-primary-lighter
//
// ============================================

export const theme = {
  colors: {
    primary: '#007257', // Main brand color - CHANGE THIS to update all primary colors
    primaryDark: '#005a44', // Darker shade for hover states
    primaryLight: '#008a6a', // Lighter shade
    primaryLighter: '#e6f5f2', // Very light shade for backgrounds
  },
};

// Helper function to get primary color variants
export const getPrimaryColor = (variant: 'default' | 'dark' | 'light' | 'lighter' = 'default') => {
  const variants = {
    default: theme.colors.primary,
    dark: theme.colors.primaryDark,
    light: theme.colors.primaryLight,
    lighter: theme.colors.primaryLighter,
  };
  return variants[variant];
};

