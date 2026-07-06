import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import react from '@vitejs/plugin-react'
import tailwind from 'tailwindcss'
import autoprefixer from 'autoprefixer'

// Standalone Vite config that serves ONLY the renderer as a plain web page.
// Used for browser-based debugging/preview of the UI without launching the full
// Electron shell (window.api is simply undefined, which the UI tolerates).
// Everything is absolute (relative to this file) so it works from any CWD.
const root = dirname(fileURLToPath(import.meta.url))

export default {
  root: resolve(root, 'src/renderer'),
  resolve: {
    alias: {
      '@renderer': resolve(root, 'src/renderer/src'),
      '@core': resolve(root, 'src/core')
    }
  },
  css: {
    // Pass the Tailwind config explicitly so it resolves regardless of CWD.
    postcss: {
      plugins: [tailwind(resolve(root, 'tailwind.config.js')), autoprefixer()]
    }
  },
  plugins: [react()],
  server: { port: 5199 }
}
