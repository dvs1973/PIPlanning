import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:             '#0f1117',
        surface:        '#1a1d27',
        'surface-2':    '#232735',
        'surface-3':    '#2c3040',
        border:         '#333847',
        accent:         '#6c8cff',
        'accent-light': '#8ba5ff',
        'cap-green':    '#4ade80',
        'cap-orange':   '#fb923c',
        'cap-red':      '#f87171',
        purple:         '#a78bfa',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
