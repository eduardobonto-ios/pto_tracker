/** @type {import('tailwindcss').Config} */
// -----------------------------------------------------------------------------
// Valveman design tokens — single source of truth for the Valveman internal
// software suite palette (shared visual identity with the Technical Playbook).
// Mirrored in `src/lib/theme.ts` for use in TS (inline styles, charts, SVG).
// -----------------------------------------------------------------------------
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        /* Dark navy — sidebar surface + heading text */
        navy: {
          50: '#F3F6FB',
          100: '#E4EAF4',
          200: '#C6D2E6',
          300: '#9AACC9',
          400: '#6B80A3',
          500: '#4A5F82',
          600: '#334566',
          700: '#22314D',
          800: '#152238',
          900: '#0D1729',
          950: '#08101E',
        },
        /* Primary — light/mid blue application + action color */
        brand: {
          50: '#F0F7FE',
          100: '#DDEDFC',
          200: '#C1DEFA',
          300: '#96C7F4',
          400: '#6BAAE9',
          500: '#4A8CD8',
          600: '#356FBE',
          700: '#2B589A',
          800: '#274A7D',
          900: '#254068',
        },
        /* Cyan — icons, small accents, links, focus rings */
        accent: {
          50: '#ECFBFF',
          100: '#D2F4FE',
          200: '#ABEBFD',
          300: '#6FDDFB',
          400: '#2CC6F0',
          500: '#0FAAD8',
          600: '#0387B5',
          700: '#086C92',
          800: '#105976',
          900: '#134A64',
        },
        /* Neutral slate — body copy, borders, table chrome */
        slateish: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
        /* Semantic */
        success: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        danger: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
        },
        /* App surfaces */
        canvas: '#F5F8FC',
        tablehead: '#F1F6FC',
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(15, 30, 51, 0.04), 0 1px 3px 0 rgba(15, 30, 51, 0.06)',
        'card-hover': '0 4px 12px -2px rgba(15, 30, 51, 0.10), 0 2px 6px -2px rgba(15, 30, 51, 0.06)',
        pop: '0 20px 45px -12px rgba(11, 21, 36, 0.28)',
        'brand-sm': '0 1px 2px rgba(53, 111, 190, 0.24), 0 2px 8px -2px rgba(53, 111, 190, 0.32)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.985)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out',
        'scale-in': 'scale-in 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slide-in-right 260ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
