/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        crystal: {
          light: "rgba(255, 255, 255, 0.65)",
          dark: "rgba(15, 23, 42, 0.75)",
          accent: "#22d3ee",
          amber: "#fbbf24",
        }
      },
      boxShadow: {
        'crystal': '0 20px 40px -15px rgba(0, 0, 0, 0.15)',
        'crystal-glow': '0 0 35px -5px rgba(34, 211, 238, 0.3)',
        'fab-glow': '0 10px 25px -3px rgba(251, 191, 36, 0.45)',
      }
    },
  },
  plugins: [],
}
