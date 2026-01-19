// ============================================
// CENTRAL THEME CONFIGURATION
// Dancing Academy palette: #FFFEF6 #FEF003 #D26A17 #68482F #956331
// ============================================
// Keep in sync with tailwind.config.js
//
// Tailwind: bg-primary, text-primary, bg-primary-dark, bg-primary-light, bg-primary-lighter
//           bg-cream, bg-accent, text-accent
// ============================================

export const theme = {
  colors: {
    cream: '#FFFEF6',
    accent: '#FEF003',
    primary: '#D26A17',
    primaryDark: '#68482F',
    primaryLight: '#956331',
    primaryLighter: '#FFFEF6',
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

