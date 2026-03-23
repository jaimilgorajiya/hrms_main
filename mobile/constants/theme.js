export const COLORS = {
  // Brand Colors (Meta/SaaS level)
  primary: '#3B82F6',        // Vibrant Blue
  primaryDark: '#6366F1',    // Indigo
  primaryLight: '#EFF6FF',   // Very soft blue
  
  // Semantic Accents (Modern & Soft)
  success: '#22C55E',        // Emerald Green
  successLight: '#F0FDF4',
  warning: '#F59E0B',        // Amber/Orange
  warningLight: '#FFFBEB',
  danger: '#EF4444',         // Rose/Red
  dangerLight: '#FEF2F2',
  purple: '#8B5CF6',         // Violet/Purple
  purpleLight: '#F5F3FF',
  
  // Backgrounds (Avoid Pure White for full screen)
  bgMain: '#F8FAFC',         // Main background (Cool slate)
  bgSection: '#F1F5F9',      // Section background
  bgCard: '#FFFFFF',         // Pure white for cards
  
  // Borders & Dividers
  border: '#E2E8F0',
  borderLight: '#F1F5F9',

  // Typography (Clean hierarchy)
  textDark: '#0F172A',       // Slate 900
  textMain: '#334155',       // Slate 700
  textLight: '#64748B',      // Slate 500
  textMuted: '#94A3B8',      // Slate 400
  textPlaceholder: '#CBD5E1',

  white: '#FFFFFF',
  black: '#000000',
};

export const GRADIENTS = {
  primary: ['#3B82F6', '#6366F1'],
  danger: ['#EF4444', '#F87171'],
  warning: ['#F59E0B', '#FB923C'],
  purple: ['#8B5CF6', '#6366F1'],
};

export const FONTS = {
  regular: 'System',         // Prefer Inter if loaded
  medium: 'System',
  semiBold: 'System',
  bold: 'System',
  mono: 'Courier',           // For the timer (Monospace)
};

export const SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  huge: 36,
};

export const RADIUS = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 36,
  full: 999,
};

export const SHADOW = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  premium: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  }
};
