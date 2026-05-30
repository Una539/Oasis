import { defineConfig, presetMini, presetAttributify } from "unocss";

export default defineConfig({
  presets: [
    presetAttributify(),
    presetMini({
      dark: {
        dark: '[data-theme="dark"]',
        light: '[data-theme="light"]',
        media: "media",
      },
    }),
  ],
  theme: {
    colors: {
      bg: "var(--bg)",
      surface: "var(--surface)",
      "surface-hover": "var(--surface-hover)",
      border: "var(--border)",
      text: "var(--text)",
      "text-secondary": "var(--text-secondary)",
      "text-muted": "var(--text-muted)",
      primary: "var(--primary)",
    },
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
    },
    borderRadius: {
      desktop: "10px",
      mobile: "16px",
    },
  },
});
