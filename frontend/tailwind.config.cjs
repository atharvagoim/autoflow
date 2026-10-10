const path = require("path");

/** AutoFlow design tokens — black canvas, candy accents. */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [path.join(__dirname, "index.html"), path.join(__dirname, "src/**/*.{ts,tsx}")],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#060608",
          900: "#0C0C10",
          850: "#121218",
          800: "#18181F",
          750: "#1F1F28",
          700: "#2A2A35",
          600: "#3B3B48",
        },
        fog: "#F4F1F7",
        mute: "#A3A0AF",
        dim: "#6F6C7C",
        pink: { DEFAULT: "#F5A3CB", deep: "#E8579A", soft: "#FBD3E6" },
        lime: { DEFAULT: "#C6F27C", deep: "#97D63F" },
        butter: { DEFAULT: "#F6E59E", deep: "#E8C95A" },
        lilac: { DEFAULT: "#C9B8F6", deep: "#9B82EC" },
        danger: "#FF8A80",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"],
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,0.06), 0 20px 50px -20px rgba(0,0,0,0.8)",
        pink: "0 18px 50px -18px rgba(245,163,203,0.55)",
      },
      keyframes: {
        rise: { "0%": { opacity: 0, transform: "translateY(16px)" }, "100%": { opacity: 1, transform: "none" } },
        sheet: { "0%": { transform: "translateY(100%)" }, "100%": { transform: "none" } },
        pop: { "0%": { opacity: 0, transform: "scale(.96)" }, "100%": { opacity: 1, transform: "none" } },
        fade: { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        spin: { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        rise: "rise .7s cubic-bezier(.2,.8,.2,1) both",
        sheet: "sheet .32s cubic-bezier(.2,.8,.2,1) both",
        pop: "pop .2s ease-out both",
        fade: "fade .2s ease-out both",
        "spin-slow": "spin 24s linear infinite",
      },
    },
  },
  plugins: [],
};
