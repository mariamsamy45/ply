/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bone: "rgb(var(--bone) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        cobalt: "rgb(var(--cobalt) / <alpha-value>)",
        tangerine: "rgb(var(--tangerine) / <alpha-value>)",
        sage: "rgb(var(--sage) / <alpha-value>)",
        clay: "rgb(var(--clay) / <alpha-value>)",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Space Grotesk", "sans-serif"],
      },
      borderRadius: {
        none: "0px",
        card: "6px",
      },
    },
  },
  plugins: [],
};