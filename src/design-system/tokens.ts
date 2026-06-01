export const C = {
  navy900:    '#050E22',
  navy800:    '#091C44', // Core Brand Dark
  navy700:    '#12244F',
  navy600:    '#1A2F5E',
  blue500:    '#38B6FF', // Core Brand Accent
  blue400:    '#5EC3FF',
  blue300:    '#8ADCFF',
  blue100:    '#E6F5FF', // Subtle blue tint
  bg:         '#FAF6F5', // Core Brand Background / Alabaster
  surface:    '#FFFFFF',
  border:     '#EAE6E5', // Warm light neutral border
  borderDark: '#D5CFCF',
  text:       '#091C44', // Text matching brand dark
  textSub:    '#2E3E5C', // Darker, highly legible brand slate-navy
  textLight:  '#999DAD',
  success:    '#38B6FF', // Map success to brand accent
  successBg:  '#E6F5FF',
  warning:    '#091C44', // Map warning to brand dark (minimizing yellow)
  warningBg:  '#FAF6F5',
  error:      '#E5474D', // Vibrant high-contrast alert red
  errorBg:    'rgba(229, 71, 77, 0.1)',
} as const

export const font = {
  family: "'Figtree', 'Helvetica Neue', Arial, sans-serif",
} as const

export const radius = {
  sm:   '10px',
  lg:   '16px',
  xl:   '24px',
  full: '9999px',
} as const

export const shadow = {
  sm: '0 1px 4px rgba(13,30,66,0.07), 0 1px 2px rgba(13,30,66,0.04)',
  md: '0 4px 14px rgba(13,30,66,0.09), 0 2px 4px rgba(13,30,66,0.05)',
  lg: '0 10px 30px rgba(13,30,66,0.11)',
  xl: '0 20px 50px rgba(13,30,66,0.16)',
} as const
