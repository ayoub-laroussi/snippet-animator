import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

// electron-vite orchestrates three separate build pipelines:
// - main:     the Electron main process (window lifecycle, IPC, ffmpeg access)
// - preload:  the secure bridge exposed to the renderer via contextBridge
// - renderer: the React + Tailwind UI
export default defineConfig({
  main: {
    // Keep Node dependencies (ffmpeg-static, fluent-ffmpeg) external so they are
    // required from node_modules at runtime instead of being bundled.
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve('src/main/index.js') }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve('src/preload/index.js') }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    build: {
      rollupOptions: {
        input: { index: resolve('src/renderer/index.html') }
      }
    },
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@core': resolve('src/core')
      }
    },
    plugins: [react()]
  }
})
