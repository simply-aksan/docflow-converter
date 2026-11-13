/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Plus Jakarta Sans',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif'
        ],
        mono: [
          'JetBrains Mono',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace'
        ],
      },
      colors: {
        canvas: {
          subtle: '#f9fafb',
          muted: '#f3f4f6',
        },
        surface: {
          DEFAULT: '#ffffff',
          elevated: '#ffffff',
          border: '#e5e7eb',
        },
        accent: {
          DEFAULT: '#0f172a',
          hover: '#1e293b',
          highlight: '#2563eb',
        }
      },
      boxShadow: {
        'clean': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'lifted': '0 8px 30px rgba(0, 0, 0, 0.06)',
        'dock': '0 -4px 24px rgba(0, 0, 0, 0.08), 0 -1px 3px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}
