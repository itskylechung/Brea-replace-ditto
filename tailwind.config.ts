import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17342d",
        forest: "#153b32",
        moss: "#4f6f61",
        cream: "#f4f1e8",
        paper: "#fffdf8",
        coral: "#ee7658",
        sun: "#f4c85d",
      },
      boxShadow: {
        card: "0 18px 50px rgba(36, 60, 50, 0.09)",
        button: "0 8px 20px rgba(238, 118, 88, 0.24)",
      },
      fontFamily: {
        sans: ["Avenir Next", "Avenir", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
