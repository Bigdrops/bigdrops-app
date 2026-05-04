/** @type {import('tailwindcss').Config} */
import animate from "tailwindcss-animate"

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // BigDrops Semantic Tokens
        "bd-app-bg": "hsl(var(--bd-app-bg))",
        "bd-surface": "hsl(var(--bd-surface))",
        "bd-surface-muted": "hsl(var(--bd-surface-muted))",
        "bd-border": "hsl(var(--bd-border))",
        "bd-border-strong": "hsl(var(--bd-border-strong))",
        "bd-text": "hsl(var(--bd-text))",
        "bd-text-muted": "hsl(var(--bd-text-muted))",
        "bd-text-soft": "hsl(var(--bd-text-soft))",
        "bd-input-bg": "hsl(var(--bd-input-bg))",
        "bd-input-border": "hsl(var(--bd-input-border))",
        "bd-input-focus": "hsl(var(--bd-input-focus))",
        "bd-card-bg": "hsl(var(--bd-card-bg))",
        "bd-card-border": "hsl(var(--bd-card-border))",
        "bd-button-primary-bg": "hsl(var(--bd-button-primary-bg))",
        "bd-button-primary-text": "hsl(var(--bd-button-primary-text))",
        "bd-status-success-bg": "hsl(var(--bd-status-success-bg))",
        "bd-status-success-text": "hsl(var(--bd-status-success-text))",
        "bd-status-success-border": "hsl(var(--bd-status-success-border))",
        "bd-status-warning-bg": "hsl(var(--bd-status-warning-bg))",
        "bd-status-warning-text": "hsl(var(--bd-status-warning-text))",
        "bd-status-warning-border": "hsl(var(--bd-status-warning-border))",
        "bd-status-danger-bg": "hsl(var(--bd-status-danger-bg))",
        "bd-status-danger-text": "hsl(var(--bd-status-danger-text))",
        "bd-status-danger-border": "hsl(var(--bd-status-danger-border))",
        "bd-status-info-bg": "hsl(var(--bd-status-info-bg))",
        "bd-status-info-text": "hsl(var(--bd-status-info-text))",
        "bd-status-info-border": "hsl(var(--bd-status-info-border))",
        "bd-nav-active-bg": "hsl(var(--bd-nav-active-bg))",
        "bd-nav-active-text": "hsl(var(--bd-nav-active-text))",
        "bd-nav-active-icon": "hsl(var(--bd-nav-active-icon))",
        "bd-surface-action": "hsl(var(--bd-surface-action))",
        "bd-surface-action-hover": "hsl(var(--bd-surface-action-hover))",
        "bd-surface-action-border": "hsl(var(--bd-surface-action-border))",
        "bd-action-icon-bg": "hsl(var(--bd-action-icon-bg))",
        "bd-action-icon-text": "hsl(var(--bd-action-icon-text))",
        "bd-fab-bg": "hsl(var(--bd-fab-bg))",
        "bd-fab-text": "hsl(var(--bd-fab-text))",
      },

      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [animate],
}