/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        display: ["Outfit", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        flash: "flash 0.8s ease-in-out infinite",
        "slide-in": "slide-in 0.3s ease-out",
      },
      keyframes: {
        flash: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        "slide-in": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
