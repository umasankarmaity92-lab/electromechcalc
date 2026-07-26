/** @type {import('tailwindcss').Config} */
module.exports = {
  // IMPORTANT: point this at every HTML/JS file on the real site (all calculator
  // pages, /assets/site-nav.js, any header/footer partials), not just index.html.
  // Tailwind only generates CSS for class names it can literally find in these files.
  content: [
    "./**/*.html",
    "./assets/**/*.js",
    "./functions/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        brandDark: '#0B1220',
        brandPanel: '#111c2e',
        brandLine: '#1f2f47',
        brandBlue: '#0ea5e9',
        brandAmber: '#f59e0b',
        brandGreen: '#10b981'
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      }
    }
  },
  plugins: []
}
