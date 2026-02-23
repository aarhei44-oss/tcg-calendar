/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        midnight: {
          950: "#0a1a2f", // primary background for left nav
        },
        storm: {
          600: "#4b5563", // secondary / labels
        },
        // playful accents (used sparingly)
        brandAccent: {
          DEFAULT: "#7c3aed", // violet-600
          50: "#f5f3ff",
          600: "#7c3aed",
          700: "#6d28d9",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.06), 0 1px 3px 1px rgb(0 0 0 / 0.04)",
      },
      borderRadius: {
        card: "0.75rem", // ~rounded-xl
      },
    },
  },
  plugins: [],
};
