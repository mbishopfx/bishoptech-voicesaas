import type { Config } from 'tailwindcss';

const config = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: {
        '2xl': '1440px',
      },
    },
    extend: {
      colors: {
        border: 'rgba(255,255,255,0.08)',
        input: 'rgba(255,255,255,0.08)',
        ring: '#9ca3af',
        background: '#101214',
        foreground: '#f5f5f5',
        primary: {
          DEFAULT: '#f3f4f6',
          foreground: '#111315',
        },
        secondary: {
          DEFAULT: '#1d2125',
          foreground: '#f3f4f6',
        },
        destructive: {
          DEFAULT: '#7f1d1d',
          foreground: '#fef2f2',
        },
        muted: {
          DEFAULT: '#17191c',
          foreground: '#9ca3af',
        },
        accent: {
          DEFAULT: '#20242a',
          foreground: '#f3f4f6',
        },
        popover: {
          DEFAULT: '#111315',
          foreground: '#f5f5f5',
        },
        card: {
          DEFAULT: '#14171a',
          foreground: '#f5f5f5',
        },
      },
      borderRadius: {
        lg: '0.875rem',
        md: '0.75rem',
        sm: '0.5rem',
      },
      boxShadow: {
        panel: '0 18px 42px rgba(0, 0, 0, 0.35)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;

export default config;
