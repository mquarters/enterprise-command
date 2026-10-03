/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Dark-mode native platform
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          base: 'var(--surface-base)',
          card: 'var(--surface-card)',
          overlay: 'var(--surface-overlay)',
          elevated: 'var(--surface-elevated)',
          hover: 'var(--surface-hover)',
        },
        ink: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        scrim: 'var(--scrim)',
        // Named border colors: makes `border-border-subtle` / `border-border-strong`
        // resolve to real values instead of falling back to preflight's #e5e7eb.
        border: {
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
        status: {
          critical: {
            fg: 'var(--status-critical-fg)',
            bg: 'var(--status-critical-bg)',
            border: 'var(--status-critical-border)',
          },
          warning: {
            fg: 'var(--status-warning-fg)',
            bg: 'var(--status-warning-bg)',
            border: 'var(--status-warning-border)',
          },
          healthy: {
            fg: 'var(--status-healthy-fg)',
            bg: 'var(--status-healthy-bg)',
            border: 'var(--status-healthy-border)',
          },
          unknown: {
            fg: 'var(--status-unknown-fg)',
            bg: 'var(--status-unknown-bg)',
            border: 'var(--status-unknown-border)',
          },
        },
      },
      fontSize: {
        'tv-hero': ['var(--font-size-tv-hero)', { lineHeight: '1' }],
        'tv-title': ['var(--font-size-tv-title)', { lineHeight: '1.2' }],
        'tv-sub': ['var(--font-size-tv-sub)', { lineHeight: '1.3' }],
        'desk-title': ['var(--font-size-desk-title)', { lineHeight: '1.4' }],
        'desk-body': ['var(--font-size-desk-body)', { lineHeight: '1.5' }],
        'console': ['var(--font-size-console)', { lineHeight: '1.4' }],
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      boxShadow: {
        'glow-critical': '0 0 25px var(--status-critical-glow)',
        'glow-warning': '0 0 20px var(--status-warning-glow)',
        'glow-healthy': '0 0 15px var(--status-healthy-glow)',
      },
    },
  },
  plugins: [],
};