import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Cascadia Code", "monospace"],
      },
      colors: {
        atlas: {
          bg: "#0a0a0f",
          surface: "#12121a",
          border: "#1e1e2e",
          muted: "#2a2a3e",
          accent: "#6366f1",
          "accent-dim": "#4f46e5",
          success: "#22c55e",
          warning: "#f59e0b",
          error: "#ef4444",
          text: "#e2e8f0",
          "text-dim": "#94a3b8",
        },
      },
    },
  },
  plugins: [],
};

export default config;
