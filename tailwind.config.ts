import type { Config } from 'tailwindcss';

export default {
  content: ['./src/app/**/*.{js,ts,jsx,tsx,mdx}', './src/components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'ui-serif', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Monochrome only. Everything is black, white, or a step between.
        canvas: '#FFFFFF', // page background
        card: '#FFFFFF', // surfaces
        ink: '#000000', // primary text
        muted: '#525252', // secondary text
        faint: '#8A8A8A', // tertiary text
        line: '#E5E5E5', // borders
        track: '#EFEFEF', // progress bar troughs
        fill: '#000000', // progress bar fill
      },
    },
  },
  plugins: [],
} satisfies Config;
