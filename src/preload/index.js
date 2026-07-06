import { contextBridge, ipcRenderer } from 'electron'

// The preload script is the only place with access to both Node and the DOM.
// We expose a small, explicit API for the video export flow — no raw ipcRenderer
// is handed to the renderer.
const api = {
  version: '0.1.0',

  // Open the OS folder picker; resolves to a path or null if cancelled.
  chooseFolder: () => ipcRenderer.invoke('dialog:choose-folder'),

  export: {
    // Start a streaming ffmpeg encode; returns a session id.
    begin: (opts) => ipcRenderer.invoke('export:begin', opts),

    // Send one raw RGBA frame (Uint8Array/Uint8ClampedArray) to the encoder.
    writeFrame: (sessionId, data) =>
      ipcRenderer.invoke('export:write-frame', { sessionId, data }),

    // Signal the end of the frame stream and wait for the video to finish.
    encode: (sessionId) => ipcRenderer.invoke('export:encode', { sessionId }),

    // Subscribe to encode progress. Returns an unsubscribe function.
    onProgress: (callback) => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('export:progress', listener)
      return () => ipcRenderer.removeListener('export:progress', listener)
    },

    // Save one rendered frame (PNG bytes) directly to disk.
    saveImage: (opts) => ipcRenderer.invoke('export:save-image', opts)
  },

  // Reveal a finished file in the OS file manager.
  showItemInFolder: (filePath) => ipcRenderer.invoke('shell:show-item', filePath)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('Failed to expose preload API:', error)
  }
} else {
  // Fallback when context isolation is disabled (not expected in this app).
  window.api = api
}
