/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Vision X 2.0 — Soft Dawn system. Warm paper, deep plum ink,
        // Electric Violet (brand), Lime spark, warm semantics.
        void: "#F6F2EA",
        paper: "#F6F2EA",
        cream: "#EFE8D9",
        surface: "#FFFFFF",
        elevated: "#FFFDF7",
        card: "#FFFFFF",
        line: "#E7DFD0",
        ink: {
          DEFAULT: "#1D152E",
          soft: "#5C546E",
          muted: "#8F87A3",
        },
        accent: {
          DEFAULT: "#6C4CF1",
          soft: "#A78BFA",
          dim: "#E8E0FF",
          deep: "#4A2FD6",
        },
        violet: {
          50: "#F2EDFF",
          100: "#E8E0FF",
          500: "#6C4CF1",
          600: "#5A38E0",
          700: "#4A2FD6",
        },
        lime: "#D9F450",
        limedeep: "#9DBE1A",
        mint: "#1E9E6A",
        mintbg: "#DDF5E7",
        gold: "#B45309",
        goldbg: "#FDEFD4",
        danger: "#D93A4E",
        dangerbg: "#FDE4E6",
        sky: "#2563EB",
        skybg: "#E1ECFE",
        // Legacy aliases remapped to light theme so old classes keep working
        brand: {
          50: "#F2EDFF",
          100: "#E8E0FF",
          600: "#6C4CF1",
          700: "#5A38E0",
          800: "#4A2FD6",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "Roboto", '"Helvetica Neue"', "Arial", "sans-serif"],
        mono: ['"Cutive Mono"', '"Courier New"', "monospace"],
        display: ['"Bricolage Grotesque"', "Inter", "-apple-system", '"Segoe UI"', "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(29,21,46,0.05), 0 12px 32px -12px rgba(29,21,46,0.14)",
        pop: "0 2px 6px rgba(29,21,46,0.06), 0 24px 48px -16px rgba(76,45,214,0.22)",
        px: "0 3px 0 rgba(29,21,46,0.9)",
        soft: "0 12px 32px -12px rgba(29,21,46,0.14)",
      },
      borderRadius: {
        xl2: "1.4rem",
        xl3: "1.75rem",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "none" },
        },
        "px-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.25" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        drift: {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "50%": { transform: "translate(12px,-14px) scale(1.04)" },
        },
      },
      animation: {
        "fade-up": "fade-up 240ms cubic-bezier(.22,1,.36,1) both",
        "px-blink": "px-blink 1.1s steps(2, jump-none) infinite",
        float: "float 6s ease-in-out infinite",
        drift: "drift 12s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
