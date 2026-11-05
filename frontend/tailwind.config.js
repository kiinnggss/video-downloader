/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#050814",
          card: "rgba(14, 23, 47, 0.75)",
          border: "rgba(56, 189, 248, 0.22)",
          cyan: "#38bdf8",
          blue: "#2563eb",
          indigo: "#6366f1",
          amber: "#fbbf24",
        }
      },
      boxShadow: {
        'cyber-card': '0 20px 50px -15px rgba(2, 6, 23, 0.85), 0 0 25px -8px rgba(56, 189, 248, 0.15)',
        'cyber-glow': '0 0 30px -4px rgba(56, 189, 248, 0.45)',
        'cyber-fab': '0 12px 30px -4px rgba(37, 99, 235, 0.55), 0 0 20px 0 rgba(56, 189, 248, 0.45)',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'fluid': 'cubic-bezier(0.16, 1, 0.3, 1)',
      }
    },
  },
  plugins: [],
}
