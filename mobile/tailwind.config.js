/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Mirrors the CSS custom properties the web app uses (app/globals.css) so
        // the two clients read as the same product. Adjust here as the brand settles.
        primary: "#208AEF",
        "primary-hover": "#1a72c7",
        surface: "#FFFFFF",
        "surface-secondary": "#F3F4F6",
        "text-primary": "#111827",
        "text-secondary": "#6B7280",
        danger: "#DC2626",
        // Added in Phase 4: web's analysis/progress screens lean heavily on
        // success (high scores/strengths) and warning (needs-improvement)
        // colors (var(--success)/var(--warning) in app/globals.css) that
        // mobile didn't need until now.
        success: "#16a34a",
        warning: "#F59E0B",
      },
    },
  },
  plugins: [],
};
