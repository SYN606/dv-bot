/**
 * Tailwind CSS v4 Configuration
 *
 * In Tailwind v4 with @tailwindcss/vite, the @theme block inside theme.css
 * is the authoritative source for design tokens (colors, fonts, spacing, etc.).
 *
 * This file is still required by the @tailwindcss/vite plugin to locate
 * source files for class scanning. Theme customization belongs in theme.css.
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
};
