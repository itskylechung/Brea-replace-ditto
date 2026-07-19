import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#fa520f",
        "primary-deep": "#cc3a05",
        sunshine: {
          300: "#ffd06a",
          500: "#ffb83e",
          700: "#ffa110",
          800: "#ff8105",
          900: "#ff8a00",
        },
        yellow: "#ffd900",
        cream: "#fff8e0",
        "cream-light": "#fffaeb",
        "cream-deeper": "#fff0c2",
        beige: "#e6d5a8",
        ink: "#1f1f1f",
        "ink-tint": "#3d3d3d",
        charcoal: "#2c2c2c",
        slate: "#4a4a4a",
        steel: "#6a6a6a",
        stone: "#8a8a8a",
        muted: "#a8a8a8",
        hairline: "#e5e5e5",
        "hairline-soft": "#ededed",
        "hairline-strong": "#c7c7c7",
        canvas: "#ffffff",
        surface: "#fafafa",
        "surface-code": "#1c1c1e",
        "on-dark-muted": "#a8a8a8",
        signal: "#b42318",
        success: "#287a4b",
      },
      boxShadow: {
        subtle: "0 1px 2px rgba(0, 0, 0, 0.04)",
        card: "0 4px 12px rgba(0, 0, 0, 0.04)",
        mockup: "0 12px 24px -4px rgba(0, 0, 0, 0.08)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        editorial: ["PP Editorial Old", "Iowan Old Style", "Times New Roman", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
