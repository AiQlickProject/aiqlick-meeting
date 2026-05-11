/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Matches aiqlick-frontend's --primary / --secondary / --light tokens
        // so the meeting chrome is visually continuous with the rest of the
        // product. Sourced from aiqlick-frontend/app/globals.css.
        primary: {
          DEFAULT: "#3D52A0",
          dark: "#2A3B7D",
          light: "#7091E6",
        },
        secondary: "#7091E6",
        brand: {
          light: "#ADBBDA",
          bg: "#EDE8F5",
        },
      },
      backdropBlur: {
        md: "12px",
      },
    },
  },
  plugins: [],
};
