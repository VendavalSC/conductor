/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        conductor: {
          bg: "#06060b",
          "bg-raised": "#0a0a12",
          surface: "#0e0e18",
          "surface-2": "#131320",
          "surface-3": "#181828",
          "surface-4": "#1e1e30",
          border: "#1a1a2e",
          "border-subtle": "#121220",
          "border-hover": "#2a2a42",
          "border-active": "#3a3a55",
          text: "#eeeef4",
          "text-2": "#c0c0d4",
          dim: "#727289",
          muted: "#42425a",
          accent: "#00bfff",
          "accent-hover": "#33ccff",
          "accent-muted": "#0088bb",
          "accent-glow": "rgba(0, 191, 255, 0.15)",
          success: "#00e676",
          "success-dim": "#00c853",
          warning: "#ffab00",
          error: "#ff5252",
          "error-dim": "#d32f2f",
        },
      },
      fontFamily: {
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', '"Fira Code"', 'monospace'],
      },
      animation: {
        "fade-in": "fadeIn 0.15s ease-out",
        "scale-in": "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up": "slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-right": "slideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "spin-slow": "spin 1.5s linear infinite",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "breathe": "breathe 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.95) translateY(4px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          from: { opacity: "0", transform: "translateX(8px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        shimmer: {
          from: { backgroundPosition: "-200% 0" },
          to: { backgroundPosition: "200% 0" },
        },
        breathe: {
          "0%, 100%": { opacity: "0.5", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
        },
      },
      boxShadow: {
        "glow-accent": "0 0 24px rgba(0, 191, 255, 0.06), 0 0 8px rgba(0, 191, 255, 0.08)",
        "glow-success": "0 0 20px rgba(0, 230, 118, 0.06)",
        "glow-error": "0 0 20px rgba(255, 82, 82, 0.06)",
        "glow-warning": "0 0 20px rgba(255, 171, 0, 0.06)",
        "card": "0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.02)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)",
        "modal": "0 32px 64px -16px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255,255,255,0.04)",
        "inner-glow": "inset 0 1px 0 0 rgba(255,255,255,0.04)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "noise": "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.02'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};
