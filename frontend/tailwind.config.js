/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: "#04060d",
          base: "#04060d",
          surface: "#090d1a",
          card: "rgba(12, 17, 34, 0.72)",
        },
        lime: {
          neon: "#ccff00",
          glow: "rgba(204, 255, 0, 0.35)",
        },
        cyan: {
          cyber: "#00f0ff",
          glow: "rgba(0, 240, 255, 0.35)",
        },
        crimson: {
          tactical: "#ff3366",
        },
        amber: {
          vault: "#ffb800",
        },
        cyber: {
          bg: "#04060d",
          card: "rgba(12, 17, 34, 0.72)",
          border: "rgba(0, 240, 255, 0.2)",
          cyan: "#00f0ff",
          blue: "#2563eb",
          indigo: "#6366f1",
          amber: "#ffb800",
          lime: "#ccff00",
        }
      },
      boxShadow: {
        'bento-card': '0 20px 50px -15px rgba(0, 0, 0, 0.85), inset 0 1px 1px 0 rgba(255, 255, 255, 0.15)',
        'lime-glow': '0 0 25px -4px rgba(204, 255, 0, 0.5)',
        'cyan-glow': '0 0 25px -4px rgba(0, 240, 255, 0.45)',
        'cyber-card': '0 20px 50px -15px rgba(2, 6, 23, 0.85), 0 0 25px -8px rgba(0, 240, 255, 0.15)',
        'cyber-glow': '0 0 30px -4px rgba(0, 240, 255, 0.45)',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'fluid': 'cubic-bezier(0.16, 1, 0.3, 1)',
      }
    },
  },
  plugins: [],
}
