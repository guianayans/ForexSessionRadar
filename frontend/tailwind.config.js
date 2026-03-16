/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1440px'
      }
    },
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace']
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        cardForeground: 'hsl(var(--card-foreground))',
        border: 'hsl(var(--border))',
        primary: 'hsl(var(--primary))',
        primaryForeground: 'hsl(var(--primary-foreground))',
        muted: 'hsl(var(--muted))',
        mutedForeground: 'hsl(var(--muted-foreground))',
        accent: 'hsl(var(--accent))',
        accentForeground: 'hsl(var(--accent-foreground))',
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        danger: 'hsl(var(--danger))',
        gold: 'hsl(var(--gold))',
        cyan: 'hsl(var(--cyan))'
      },
      boxShadow: {
        glow: '0 0 30px rgba(29, 209, 255, 0.18)',
        panel: '0 10px 30px rgba(2, 12, 32, 0.5)'
      },
      keyframes: {
        pulseBorder: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(29, 209, 255, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(29, 209, 255, 0)' }
        },
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        }
      },
      animation: {
        pulseBorder: 'pulseBorder 2.4s infinite',
        fadeUp: 'fadeUp .45s ease-out'
      }
    }
  },
  plugins: []
};
