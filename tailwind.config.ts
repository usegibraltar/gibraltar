import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#071426",
        ocean: "#0f4c81",
        skywash: "#e7f3ff",
      },
      boxShadow: {
        soft: "0 24px 70px rgba(15, 23, 42, 0.12)",
        card: "0 18px 48px rgba(15, 23, 42, 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
