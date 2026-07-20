import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'ui-serif', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Calm Cream palette
        canvas: '#F5F4EE',
        ink: '#26241F',
        card: '#FBFAF6',
        line: '#EAE5D8',
        divider: '#EFEBDF',
        track: '#E7E2D5',
        tint: '#EEEADF',
        muted: '#6B6760',
        faint: '#8A857A',
        hairline: '#A8A296',
        faintest: '#B0A99A',
        clay: {
          DEFAULT: '#B4552F',
          dark: '#8F3F1F',
          bright: '#E8895C',
          soft: '#F0E4DC',
          border: '#E6CDBD',
        },
        sage: {
          DEFAULT: '#7C8B6F',
          bright: '#8FA07B',
          soft: '#EAF0E6',
          track: '#E7EDE4',
        },
        ondark: {
          sub: '#C9C2B4',
          label: '#B99E86',
          track: '#3A372F',
        },
        carb: '#D3A15E',
        fatm: '#C97F63',
      },
      boxShadow: {
        fab: '0 10px 22px -4px rgba(180,85,47,.6)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
