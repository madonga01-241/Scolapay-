import type { Config } from "tailwindcss";

// Palette : bleu nuit (confiance institutionnelle, proche des couleurs
// bancaires locales) + vert émeraude réservé exclusivement aux statuts
// "payé"/succès, pour que cette couleur garde tout son sens quand elle
// apparaît. Ambre pour "à venir/en attente", rouge terreux (pas un rouge
// alarmiste) pour "en retard" — un comptable regarde cet écran tous les
// jours, la couleur ne doit pas fatiguer l'œil.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0F1B2D",
        slate: {
          50: "#F6F7F9",
          100: "#EBEDF1",
          200: "#D7DBE3",
          400: "#8891A0",
          600: "#4B5468",
          800: "#1E293D",
        },
        brand: {
          DEFAULT: "#12345B",
          light: "#1E4C7A",
        },
        success: "#1F7A5C",
        warning: "#B5791B",
        danger: "#A8432F",
      },
      fontFamily: {
        display: ["'Source Serif 4'", "Georgia", "serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
