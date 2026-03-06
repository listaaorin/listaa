export const Colors = {
  // Brand
  primary: '#7B1244',        // Deep berry — main CTAs, Arc button
  primaryLight: '#C2185B',   // Magenta — accents, borders, icons
  primaryPale: '#F7E8EF',    // Very light pink — selected state bg
  logoGradientStart: '#7B2D8B', // Purple — "Lista"
  logoGradientEnd: '#C2185B',   // Magenta — "a."

  // Backgrounds
  background: '#F2F0EE',     // App background
  surface: '#FFFFFF',        // Cards, inputs
  surfaceDim: '#E8E6E4',     // Dividers, inactive

  // Text
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textOnPrimary: '#FFFFFF',

  // Status
  statusOpen: '#C2185B',
  statusInProgress: '#F5A623',
  statusClosed: '#4CAF50',

  // Nav
  navActive: '#F5A623',      // Yellow-gold for active My Listaa's icon
  navInactive: '#999999',

  // Toggle (Food/Arc)
  toggleActive: '#1A1A1A',
  toggleInactive: '#999999',
  toggleBg: '#E8E6E4',

  // Utility
  black: '#000000',
  white: '#FFFFFF',
  border: '#E0DDD9',
  shadow: 'rgba(0,0,0,0.08)',
  overlay: 'rgba(0,0,0,0.5)',
  error: '#E53935',
  success: '#43A047',

  // Auth buttons (from design — black outline)
  authButtonBorder: '#1A1A1A',
  authButtonText: '#1A1A1A',
};

export const Typography = {
  // Serif for headlines (matches design)
  heading1: {
    fontFamily: 'Georgia',
    fontSize: 40,
    fontWeight: '400' as const,
    lineHeight: 48,
    color: Colors.textPrimary,
  },
  heading2: {
    fontFamily: 'Georgia',
    fontSize: 32,
    fontWeight: '400' as const,
    lineHeight: 40,
    color: Colors.textPrimary,
  },
  heading3: {
    fontFamily: 'Georgia',
    fontSize: 24,
    fontWeight: '400' as const,
    lineHeight: 32,
    color: Colors.textPrimary,
  },
  // Sans-serif for body
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    color: Colors.textPrimary,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    color: Colors.textTertiary,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
    color: Colors.textPrimary,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadow = {
  sm: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
};
