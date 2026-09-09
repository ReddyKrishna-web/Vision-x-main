/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Vision X identity — Deep Ink neutrals, controlled Electric Violet,
        // Acid Lime as a sparing signature, warm semantic accents.
        void: "#0B0D12",
        surface: "#11141C",
        elevated: "#171B25",
        line: "#292F3D",
        ink: {
          DEFAULT: "#F1F0EA",
          soft: "#8C92A1",
          muted: "#5C6272",
        },
        accent: {
          DEFAULT: "#8B5CF6",
          soft: "#A78BFA",
          dim: "#4C3A9E",
        },
        lime: "#C6FF4D",
        mint: "#55D68A",
        gold: "#F4B860",
        danger: "#F06A78",
        // Legacy aliases (kept so old classes keep compiling; remapped dark)
        paper: "#0B0D12",
        brand: {
          50: "#1B2030",
          100: "#262C42",
          600: "#8B5CF6",
          700: "#A78BFA",
          800: "#C4B5FD",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "Roboto", '"Helvetica Neue"', "Arial", "sans-serif"],
        // Technical monospace identity: labels, metadata, nav, timelines.
        mono: ['"Cutive Mono"', '"Courier New"', "monospace"],
        // Display resolves to the modern sans — no decorative mixing in headings.
        display: ["Inter", "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "Roboto", '"Helvetica Neue"', "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0, 0, 0, 0.4)",
        pop: "0 8px 24px rgba(0, 0, 0, 0.35)",
        px: "0 3px 0 rgba(0, 0, 0, 0.45)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "none" },
        },
        "px-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.25" },
        },
        "px-fill": {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up 200ms cubic-bezier(.22,1,.36,1) both",
        "px-blink": "px-blink 1.1s steps(2, jump-none) infinite",
      },
    },
  },
  plugins: [],
};
