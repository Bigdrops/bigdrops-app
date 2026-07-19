/**
 * Invoice Workspace Design Tokens
 * Based on clinical blueprint on frosted paper design system
 * Monochromatic palette with single red accent for destructive actions
 */

export const designTokens = {
  colors: {
    canvas: '#f5f5f5',
    paper: '#ffffff',
    surfaceAlt: '#fafafa',
    ink: '#0a0a0a',
    inkSoft: '#171717',
    midGray: '#737373',
    hairline: '#e5e5e5',
    ember: '#e7000b',
  },
  typography: {
    fontFamily: {
      geist: "'Geist', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    sizes: {
      caption: '12px',
      body: '14px',
      bodyLg: '16px',
      subheading: '18px',
      headingSm: '24px',
      heading: '30px',
      headingLg: '36px',
      display: '48px',
    },
    weights: {
      regular: 400,
      medium: 500,
      semibold: 600,
    },
    lineHeights: {
      caption: 1.33,
      body: 1.43,
      bodyLg: 1.5,
      subheading: 1.56,
      headingSm: 1.33,
      heading: 1.2,
      headingLg: 1.11,
      display: 1.1,
    },
    letterSpacing: {
      caption: '0.6px',
      headingSm: '-0.6px',
      heading: '-0.75px',
      headingLg: '-0.9px',
      display: '-2.4px',
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    xxl: '24px',
    xxxl: '48px',
  },
  radius: {
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '18px', // interactive elements
    '2xl': '24px', // cards
  },
  shadows: {
    subtle:
      '0 0 0 1px rgba(23, 23, 23, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    none: 'none',
  },
} as const;

export type DesignTokens = typeof designTokens;
