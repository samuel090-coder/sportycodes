import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
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
        bet: {
          red: "hsl(var(--bet-red))",
          "red-dark": "hsl(var(--bet-red-dark))",
          dark: "hsl(var(--bet-dark))",
          card: "hsl(var(--bet-card))",
          border: "hsl(var(--bet-border))",
          success: "hsl(var(--bet-success))",
          warning: "hsl(var(--bet-warning))",
        },
        cyber: {
          "neon-green": "hsl(var(--cyber-neon-green))",
          "neon-cyan": "hsl(var(--cyber-neon-cyan))",
          "neon-purple": "hsl(var(--cyber-neon-purple))",
          "neon-red": "hsl(var(--cyber-neon-red))",
          dark: "hsl(var(--cyber-dark))",
          panel: "hsl(var(--cyber-panel))",
          border: "hsl(var(--cyber-border))",
        },
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-card': 'var(--gradient-card)',
        'gradient-cyber': 'var(--gradient-cyber)',
        'gradient-neon': 'var(--gradient-neon)',
      },
      boxShadow: {
        'bet': 'var(--shadow-bet)',
        'card': 'var(--shadow-card)',
        'neon-green': 'var(--shadow-neon-green)',
        'neon-cyan': 'var(--shadow-neon-cyan)',
        'neon-red': 'var(--shadow-neon-red)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "float-up": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(-50px)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px hsl(var(--bet-red) / 0.3)" },
          "50%": { boxShadow: "0 0 40px hsl(var(--bet-red) / 0.6)" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "neon-pulse": {
          "0%, 100%": { 
            opacity: "1",
            filter: "brightness(1)"
          },
          "50%": { 
            opacity: "0.8",
            filter: "brightness(1.2)"
          },
        },
        "scan-line": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        "glitch": {
          "0%, 100%": { transform: "translate(0)" },
          "20%": { transform: "translate(-2px, 2px)" },
          "40%": { transform: "translate(-2px, -2px)" },
          "60%": { transform: "translate(2px, 2px)" },
          "80%": { transform: "translate(2px, -2px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
        "float-up": "float-up 1s ease-out forwards",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "spin-slow": "spin-slow 3s linear infinite",
        "neon-pulse": "neon-pulse 2s ease-in-out infinite",
        "scan-line": "scan-line 8s linear infinite",
        "glitch": "glitch 0.3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
