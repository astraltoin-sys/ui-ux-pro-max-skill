/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display SC"', "Georgia", "serif"],
        sans: ["Karla", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "Courier New", "monospace"],
      },
      colors: {
        espresso: {
          50: "#faf6f0",
          100: "#f5eee6",
          200: "#ebdccf",
          300: "#dcbeaa",
          400: "#ca9a81",
          500: "#ba7b60",
          600: "#ab664c",
          700: "#8e513d",
          800: "#744335",
          900: "#261e18",
          950: "#120e0b",
        },
        amber: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          950: "#451a03",
        },
      },
      animation: {
        flash: "flash 0.9s ease-in-out infinite",
        "slide-in": "slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        flash: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        "slide-in": {
          from: { transform: "translateY(100%)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
