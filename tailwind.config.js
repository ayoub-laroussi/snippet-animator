import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

// Resolve content globs against this file's location so Tailwind finds the
// templates regardless of the current working directory (electron-vite build,
// the standalone web-preview server, etc.).
const here = dirname(fileURLToPath(import.meta.url))

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    resolve(here, 'src/renderer/index.html'),
    resolve(here, 'src/renderer/src/**/*.{js,jsx}')
  ],
  theme: {
    extend: {
      colors: {
        // Neutral dark palette for the control UI itself.
        // Intentionally muted so the colorful code preview stays the focus.
        panel: {
          DEFAULT: '#0e0f13', // app background
          raised: '#16181f', // sidebars / cards
          input: '#1c1f27', // inputs, dropdowns
          border: '#262a35', // hairline borders
          hover: '#20242e'
        },
        ink: {
          DEFAULT: '#e7e9ee', // primary text
          soft: '#a2a8b6', // secondary text
          faint: '#6b7180' // labels / disabled
        },
        accent: {
          DEFAULT: '#7c6cff', // subtle violet accent
          soft: '#a99dff'
        }
      },
      fontFamily: {
        ui: ['Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        // Realistic floating-card shadow used by the code window in the preview.
        card: '0 24px 60px -12px rgba(0,0,0,0.55), 0 8px 24px -8px rgba(0,0,0,0.45)'
      }
    }
  },
  plugins: []
}
