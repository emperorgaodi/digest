/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sf: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', '"SF Pro Display"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Driven by --accent-rgb (set from settings.accent at runtime).
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
      },
      borderRadius: { xl2: '1.25rem' },
    },
  },
  plugins: [],
}
