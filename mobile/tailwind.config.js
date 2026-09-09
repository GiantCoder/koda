/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Mirrors the CSS custom properties the web app uses (app/globals.css)
        // so the two clients read as the same product -- values taken
        // directly from web's :root / html.dark / html.light blocks.
        //
        // Phase 8 fix: mobile's `primary` had drifted to an unrelated blue
        // (#208AEF, likely a placeholder from early scaffolding that was
        // never corrected) instead of the real Koda Cricket brand red. Also
        // added a `-dark` variant of every token that actually changes
        // between web's light/dark themes, for use with NativeWind's
        // `dark:` className variant (see src/hooks/useAppTheme.ts). Web's
        // --primary/--primary-hover/--cricket-green do NOT change between
        // themes, so there's no dark variant for those.
        primary: "#E63946",
        "primary-hover": "#C1121F",
        surface: "#FFFFFF",
        "surface-dark": "#1A1D27",
        "surface-secondary": "#F5F0E8",
        "surface-secondary-dark": "#252836",
        "text-primary": "#1A1A2E",
        "text-primary-dark": "#F0F0F0",
        "text-secondary": "#6B7280",
        "text-secondary-dark": "#9CA3AF",
        danger: "#EF4444",
        "danger-dark": "#F87171",
        success: "#10B981",
        "success-dark": "#34D399",
        warning: "#F59E0B",
        "warning-dark": "#FBBF24",
        "cricket-green": "#2D6A4F",
      },
    },
  },
  plugins: [],
};
