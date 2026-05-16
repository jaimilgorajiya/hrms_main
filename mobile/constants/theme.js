export const DARK_COLORS = {
  // Brand Colors (Premium Glass HRMS)
  primary: '#c3c0ff',        // Surface tint / vibrant text
  primaryDark: '#4338ca',    // Deep Indigo container
  primaryLight: 'rgba(195, 192, 255, 0.12)', // Refractive glass highlight
  
  // Semantic Accents (Modern & Premium)
  success: '#10b981',        // Emerald Green
  successLight: 'rgba(16, 185, 129, 0.12)',
  warning: '#f59e0b',        // Amber/Orange
  warningLight: 'rgba(245, 158, 11, 0.12)',
  danger: '#ffb4ab',         // Rose/Red error
  dangerLight: 'rgba(255, 180, 171, 0.12)',
  purple: '#bcc7de',         // Secondary accent
  purpleLight: 'rgba(188, 199, 222, 0.12)',
  
  // Backgrounds (Nocturnal layers)
  bgMain: '#13121b',         // Deep space background canvas
  bgSection: '#1b1b23',      // Section/container-low
  bgCard: '#1f1f27',         // Frosted glass card base
  bgCardElevated: '#2a2932', // Floating modal tier
  
  // Borders & Dividers
  border: '#464554',         // outline-variant
  borderLight: '#35343d',    // surface-variant

  // Typography (Sleek high contrast on dark)
  textDark: '#e4e1ed',       // Primary text (on-surface)
  textMain: '#c7c4d7',       // Secondary text (on-surface-variant)
  textLight: '#aeb9d0',      // Muted context
  textMuted: '#918fa0',      // Subtle metadata
  textPlaceholder: '#464554',

  white: '#FFFFFF',
  black: '#000000',
  statusBar: 'light',
};

export const LIGHT_COLORS = {
  // Brand Colors (Premium Professional HRMS)
  primary: '#4f46e5',        // Indigo 600
  primaryDark: '#3730a3',    // Indigo 800
  primaryLight: 'rgba(79, 70, 229, 0.08)', 
  
  // Semantic Accents
  success: '#059669',        // Emerald 600
  successLight: 'rgba(5, 150, 105, 0.08)',
  warning: '#d97706',        // Amber 600
  warningLight: 'rgba(217, 119, 6, 0.08)',
  danger: '#e11d48',         // Rose 600
  dangerLight: 'rgba(225, 29, 72, 0.08)',
  purple: '#7c3aed',         // Violet 600
  purpleLight: 'rgba(124, 58, 237, 0.08)',
  
  // Backgrounds (Clean & Airy)
  bgMain: '#f8fafc',         // Slate 50
  bgSection: '#f1f5f9',      // Slate 100
  bgCard: '#ffffff',         // White
  bgCardElevated: '#ffffff', // White
  
  // Borders & Dividers
  border: '#e2e8f0',         // Slate 200
  borderLight: '#f1f5f9',    // Slate 100

  // Typography (High contrast on light)
  textDark: '#0f172a',       // Slate 900
  textMain: '#334155',       // Slate 700
  textLight: '#64748b',      // Slate 500
  textMuted: '#94a3b8',      // Slate 400
  textPlaceholder: '#cbd5e1',

  white: '#FFFFFF',
  black: '#000000',
  statusBar: 'dark',
};

export const COLORS = DARK_COLORS; // Legacy export

export const DARK_GRADIENTS = {
  primary: ['#5148d7', '#4338ca'],
  success: ['#10b981', '#059669'],
  danger: ['#EF4444', '#B91C1C'],
  warning: ['#f59e0b', '#d97706'],
  purple: ['#4338ca', '#372abf'],
};

export const LIGHT_GRADIENTS = {
  primary: ['#6366f1', '#4f46e5'],
  success: ['#10b981', '#059669'],
  danger: ['#f87171', '#ef4444'],
  warning: ['#fbbf24', '#f59e0b'],
  purple: ['#8b5cf6', '#7c3aed'],
};

export const GRADIENTS = DARK_GRADIENTS; // Legacy export

export const FONTS = {
  regular: 'System',
  medium: 'System',
  semiBold: 'System',
  bold: 'System',
  mono: 'Courier',
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
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 4,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  premium: {
    shadowColor: '#c3c0ff',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  }
};
