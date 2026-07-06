import { drawFrame, renderStaticLayer } from './canvasRenderer'
import { revealDuration, LOOP_PAUSE_MS } from './reveal'
import { BOLD_FONT_WEIGHT } from '../config/presets'

// ---------------------------------------------------------------------------
// exporter — drives a full video export from the renderer.
//
//   1. Compute the frame count from the reveal duration + a trailing hold.
//   2. Render each frame on an offscreen canvas (drawFrame), matching the
//      preview exactly. The background/window-shell/shadow are pre-rendered
//      once (renderStaticLayer) since they never change between frames.
//   3. Read the frame's raw RGBA pixels and stream them straight to ffmpeg's
//      stdin (via main) — no PNG encoding, no temp files, no disk round trip.
//      Writes are pipelined (a few in flight at once) so drawing frame N+1
//      overlaps with the IPC transfer + ffmpeg encode of frame N instead of
//      waiting on it.
//   4. Ask main to finish the encode once every frame has been sent.
//
// Progress is reported as a single 0..100 value: the first ~half covers frame
// rendering, the second half covers ffmpeg encoding.
// ---------------------------------------------------------------------------

// How many frame writes may be in flight at once. Bounds memory (each frame is
// a full uncompressed RGBA buffer) while still letting rendering run ahead of
// the IPC/ffmpeg consumer instead of blocking on every single frame.
const WRITE_PIPELINE_DEPTH = 3

/** Make sure the code font (all weights we draw) is ready before rendering. */
async function ensureFonts(fontStack, fontSize) {
  await document.fonts.ready
  const px = Math.max(10, Math.round(fontSize))
  try {
    await Promise.all([
      document.fonts.load(`400 ${px}px ${fontStack}`),
      document.fonts.load(`${BOLD_FONT_WEIGHT} ${px}px ${fontStack}`),
      document.fonts.load(`italic 400 ${px}px ${fontStack}`),
      document.fonts.load(`500 12px 'Inter'`)
    ])
  } catch {
    // Non-fatal: canvas will fall back to monospace if a weight is missing.
  }
}

/** Turn a canvas into PNG bytes (Uint8Array), for the single-image export. */
function canvasToPngBytes(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) return reject(new Error('Canvas toBlob returned null'))
      resolve(new Uint8Array(await blob.arrayBuffer()))
    }, 'image/png')
  })
}

/**
 * Run the export.
 * @param {object} params
 * @param {object} params.settings     Full UI settings object.
 * @param {object} params.preset       Active background preset.
 * @param {object} params.tokenized    { lines, bg, fg } from Shiki.
 * @param {string} params.fontStack    Canvas-ready font-family for the code.
 * @param {number} params.width        Output width (px).
 * @param {number} params.height       Output height (px).
 * @param {string} params.outDir       Destination folder.
 * @param {(p:{phase:string,percent:number})=>void} onProgress
 * @returns {Promise<{ok:boolean, outputPath?:string, error?:string}>}
 */
export async function runExport(params, onProgress) {
  const { settings, preset, tokenized, fontStack, width, height, outDir } = params

  if (!window.api?.export) {
    return { ok: false, error: 'Export bridge unavailable (run inside the app).' }
  }
  if (!tokenized || !tokenized.lines.length) {
    return { ok: false, error: 'Nothing to export — the code is empty.' }
  }

  const fps = Number(settings.fps) || 30
  const duration = revealDuration(
    settings.animationMode,
    tokenized.lines,
    settings.lineSpeed,
    settings.charSpeed
  )
  // Hold the finished code on screen briefly so the clip ends cleanly.
  const totalMs = duration + LOOP_PAUSE_MS
  const totalFrames = Math.max(1, Math.round((totalMs / 1000) * fps))

  await ensureFonts(fontStack, settings.fontSize)

  // Self-contained settings for the canvas renderer (padding is user-driven).
  const drawSettings = { ...settings, fontStack }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  // willReadFrequently hints the browser to keep pixel data CPU-side, avoiding
  // a GPU readback stall on every getImageData() call below.
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  // Start the streaming encode session up front.
  const sessionId = await window.api.export.begin({
    width,
    height,
    fps,
    transparent: !settings.showBackground,
    outDir,
    fileName: settings.title || 'snippet',
    totalFrames
  })

  const unsubscribe = window.api.export.onProgress(({ percent }) => {
    onProgress?.({ phase: 'encoding', percent: 50 + percent / 2 })
  })

  // Pre-render the frame-invariant background/window-shell/shadow once; each
  // frame then only needs to draw the (cheap) animated code text on top.
  const staticLayer = renderStaticLayer({ width, height, settings: drawSettings, preset, tokenized })

  try {
    // Render + stream every frame as raw RGBA bytes. Writes are pipelined:
    // we kick off the IPC send for frame N and immediately move on to drawing
    // frame N+1 rather than awaiting it, only pausing once WRITE_PIPELINE_DEPTH
    // writes are outstanding.
    const inFlight = []
    for (let f = 0; f < totalFrames; f++) {
      const elapsed = Math.min((f / fps) * 1000, duration)
      drawFrame(
        ctx,
        { width, height, settings: drawSettings, preset, tokenized, elapsed },
        staticLayer
      )
      // getImageData copies the pixels out, so it's safe to keep drawing the
      // next frame on the same canvas while this buffer is still in transit.
      const { data } = ctx.getImageData(0, 0, width, height)
      inFlight.push(window.api.export.writeFrame(sessionId, data))
      if (inFlight.length >= WRITE_PIPELINE_DEPTH) {
        await inFlight.shift()
      }
      onProgress?.({
        phase: 'rendering',
        percent: ((f + 1) / totalFrames) * 50
      })
    }
    // Drain any writes still in flight before signalling end-of-stream.
    await Promise.all(inFlight)

    // Signal end-of-stream and wait for ffmpeg to finish writing the file.
    const result = await window.api.export.encode(sessionId)
    if (result.ok) onProgress?.({ phase: 'done', percent: 100 })
    return result
  } finally {
    unsubscribe()
  }
}

/**
 * Export a single PNG of the fully-revealed code — no ffmpeg involved, just a
 * one-off canvas render saved straight to disk.
 * @param {object} params Same shape as `runExport`'s params.
 * @returns {Promise<{ok:boolean, outputPath?:string, error?:string}>}
 */
export async function runImageExport(params, onProgress) {
  const { settings, preset, tokenized, fontStack, width, height, outDir } = params

  if (!window.api?.export) {
    return { ok: false, error: 'Export bridge unavailable (run inside the app).' }
  }
  if (!tokenized || !tokenized.lines.length) {
    return { ok: false, error: 'Nothing to export — the code is empty.' }
  }

  await ensureFonts(fontStack, settings.fontSize)

  const drawSettings = { ...settings, fontStack }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  const duration = revealDuration(
    settings.animationMode,
    tokenized.lines,
    settings.lineSpeed,
    settings.charSpeed
  )
  // Render the fully-revealed frame (the whole point of a still image).
  drawFrame(ctx, { width, height, settings: drawSettings, preset, tokenized, elapsed: duration })
  onProgress?.({ phase: 'rendering', percent: 50 })

  const data = await canvasToPngBytes(canvas)
  onProgress?.({ phase: 'encoding', percent: 80 })

  const result = await window.api.export.saveImage({
    data,
    outDir,
    fileName: settings.title || 'snippet'
  })
  if (result.ok) onProgress?.({ phase: 'done', percent: 100 })
  return result
}
