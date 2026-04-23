// Note: This project uses Tailwind CSS v4 which configures the theme via CSS (@theme in globals.css).
// This file is provided for reference and tooling compatibility.
// Brand palette is defined in src/app/globals.css under @theme inline.

import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: "#0a0a0a",
          red: "#dc2626",
          "red-hover": "#b91c1c",
          "red-active": "#991b1b",
          card: "#111111",
          "card-alt": "#1a1a1a",
          white: "#ffffff",
          muted: "#6b7280",
          border: "#222222",
        },
      },
    },
  },
  plugins: [],
}

export default config
