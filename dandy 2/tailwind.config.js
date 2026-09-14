/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0d0d0d",
        surface: "#171717",
        border: "#2a2a2a",
        accent: "#e8352b",
        accent2: "#f2c14e",
        accent3: "#1e6fd9",
        muted: "#9a9a9a",
        text: "#f5f5f5",
      },
    },
  },
  plugins: [],
};
