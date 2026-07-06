import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { mkdir, writeFile } from 'fs/promises'
import { randomUUID } from 'crypto'
import { startRawEncode } from '../core/ffmpeg.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

let mainWindow = null

/**
 * Create the main application window.
 *
 * Node integration stays off and context isolation on; anything the renderer
 * needs from the OS (folder dialog, ffmpeg export) goes through the preload
 * bridge and the IPC handlers registered below.
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1080,
    minHeight: 720,
    show: false,
    backgroundColor: '#0e0f13',
    autoHideMenuBar: true,
    title: 'Snippet Animator',
    icon: join(__dirname, '../../build/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ---------------------------------------------------------------------------
// Video export IPC
//
// The renderer draws each frame on a canvas and streams the raw RGBA pixels
// here; we pipe them directly into ffmpeg's stdin (see core/ffmpeg.js) as they
// arrive — no PNG encoding, no temp files. Splitting the work this way keeps
// Shiki/fonts/canvas in the renderer while ffmpeg (a native binary) runs in the
// main process.
// ---------------------------------------------------------------------------

// Active encode sessions, keyed by an id handed back to the renderer.
const encodeSessions = new Map()

function registerExportHandlers() {
  // Let the user pick an output folder.
  ipcMain.handle('dialog:choose-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Choose export folder',
      properties: ['openDirectory', 'createDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // Start a streaming ffmpeg encode; returns a session id for subsequent calls.
  ipcMain.handle(
    'export:begin',
    async (_event, { width, height, fps, transparent, outDir, fileName, totalFrames }) => {
      await mkdir(outDir, { recursive: true })

      const ext = transparent ? 'mov' : 'mp4'
      const safeName = (fileName || 'snippet').replace(/[\\/:*?"<>|]+/g, '_')
      const outputPath = join(outDir, `${safeName}.${ext}`)

      const session = startRawEncode({
        width,
        height,
        fps,
        transparent,
        outputPath,
        totalFrames,
        onProgress: (pct) => {
          mainWindow?.webContents.send('export:progress', {
            phase: 'encoding',
            percent: pct
          })
        }
      })

      const sessionId = randomUUID()
      encodeSessions.set(sessionId, session)
      return sessionId
    }
  )

  // Feed one raw RGBA frame into the encoder. Resolves once ffmpeg's input
  // buffer has room again, which naturally throttles the renderer to encode
  // speed instead of piling frames up in memory.
  ipcMain.handle('export:write-frame', async (_event, { sessionId, data }) => {
    const session = encodeSessions.get(sessionId)
    if (!session) throw new Error('Unknown export session')
    await session.write(Buffer.from(data))
    return true
  })

  // Signal the end of the frame stream and wait for ffmpeg to finish writing.
  ipcMain.handle('export:encode', async (_event, { sessionId }) => {
    const session = encodeSessions.get(sessionId)
    if (!session) return { ok: false, error: 'Unknown export session' }
    try {
      const outputPath = await session.finish()
      return { ok: true, outputPath }
    } catch (err) {
      return { ok: false, error: String(err?.message || err) }
    } finally {
      encodeSessions.delete(sessionId)
    }
  })

  // Save a single rendered frame as a PNG — no ffmpeg involved.
  ipcMain.handle('export:save-image', async (_event, { data, outDir, fileName }) => {
    await mkdir(outDir, { recursive: true })
    const safeName = (fileName || 'snippet').replace(/[\\/:*?"<>|]+/g, '_')
    const outputPath = join(outDir, `${safeName}.png`)
    try {
      await writeFile(outputPath, Buffer.from(data))
      return { ok: true, outputPath }
    } catch (err) {
      return { ok: false, error: String(err?.message || err) }
    }
  })

  // Reveal the finished file in the OS file manager.
  ipcMain.handle('shell:show-item', async (_event, filePath) => {
    shell.showItemInFolder(filePath)
    return true
  })
}

app.whenReady().then(() => {
  registerExportHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
