import { createRequire } from 'module'
import { PassThrough } from 'stream'

// fluent-ffmpeg and ffmpeg-static are CommonJS; load them through createRequire
// so this ESM module can use them while electron-vite keeps them external.
const require = createRequire(import.meta.url)
const ffmpeg = require('fluent-ffmpeg')
const ffmpegStatic = require('ffmpeg-static')

// In a packaged Electron app the ffmpeg binary is unpacked out of the asar
// archive (see `asarUnpack` in package.json), but ffmpeg-static still reports
// the in-asar path. Rewrite it to the real, executable location; otherwise
// spawning ffmpeg fails with ENOENT. The regex only matches "app.asar" followed
// by a path separator, so it won't double-apply to an already-unpacked path.
// In dev (no asar) the path is unchanged.
const ffmpegPath = ffmpegStatic
  ? ffmpegStatic.replace(/app\.asar([\\/])/, 'app.asar.unpacked$1')
  : ffmpegStatic

// Point fluent-ffmpeg at the bundled static binary (no system ffmpeg needed).
ffmpeg.setFfmpegPath(ffmpegPath)

// ---------------------------------------------------------------------------
// Stream raw RGBA frames straight into ffmpeg's stdin as they're rendered.
//
// The previous approach wrote each frame as a PNG to a temp folder and pointed
// ffmpeg at the folder afterwards — that meant paying PNG compression on every
// frame, hundreds of small disk writes, and ffmpeg re-reading them all back.
// Piping raw, uncompressed frames removes the PNG codec and the disk round
// trip entirely, which is the actual bottleneck for export speed.
//
// Two output modes:
//   - Opaque MP4 (H.264, yuv420p) — universally compatible for TikTok/YouTube.
//   - Transparent MOV (QuickTime Animation / qtrle) — preserves the alpha
//     channel for compositing over other footage.
// ---------------------------------------------------------------------------

/**
 * Start a streaming encode session.
 * @param {object}   opts
 * @param {number}   opts.width
 * @param {number}   opts.height
 * @param {number}   opts.fps
 * @param {boolean}  opts.transparent
 * @param {string}   opts.outputPath
 * @param {number}   opts.totalFrames  Used to report accurate progress.
 * @param {(pct:number)=>void} [opts.onProgress]
 * @returns {{ write:(buf:Buffer)=>Promise<void>, finish:()=>Promise<string> }}
 */
export function startRawEncode({
  width,
  height,
  fps,
  transparent,
  outputPath,
  totalFrames,
  onProgress
}) {
  // Buffer a few frames' worth before backpressure kicks in, so the renderer
  // doesn't stall on every single write while still bounding memory use.
  const input = new PassThrough({ highWaterMark: width * height * 4 * 3 })

  const command = ffmpeg(input)
    .inputFormat('rawvideo')
    .inputOptions([
      '-pixel_format',
      'rgba',
      '-video_size',
      `${width}x${height}`,
      '-framerate',
      String(fps)
    ])

  if (transparent) {
    command.videoCodec('qtrle').outputOptions(['-pix_fmt', 'argb']).format('mov')
  } else {
    command
      .videoCodec('libx264')
      .outputOptions([
        '-pix_fmt',
        'yuv420p',
        '-crf',
        '18',
        // 'veryfast' cuts encode time ~25% vs 'medium' for near-identical file
        // size at this quality level — these are short social clips, not
        // archival masters, so the extra compression effort isn't worth it.
        '-preset',
        'veryfast',
        // High profile + explicit level and no B-frames: Premiere Pro's
        // Windows decoder is known to mis-decode/duplicate frames on some
        // B-frame-reordered H.264 streams (symptom: "error retrieving frame N,
        // replacing with frame N-1" on a regular pattern of frames). Piped
        // rawvideo input has no real timestamps of its own, which makes that
        // reordering more fragile than a normal capture — disabling B-frames
        // removes the reordering entirely, at a negligible size cost for
        // clips this short.
        '-profile:v',
        'high',
        '-level',
        '4.1',
        '-bf',
        '0',
        '-g',
        String(fps),
        '-movflags',
        '+faststart',
        '-r',
        String(fps)
      ])
      .format('mp4')
  }

  const done = new Promise((resolve, reject) => {
    command
      .on('progress', (p) => {
        if (!onProgress) return
        const framesDone = typeof p.frames === 'number' ? p.frames : 0
        const pct = totalFrames > 0 ? Math.min(100, (framesDone / totalFrames) * 100) : 0
        onProgress(pct)
      })
      .on('end', () => {
        onProgress?.(100)
        resolve(outputPath)
      })
      .on('error', (err) => reject(err))
      .save(outputPath)
  })

  /** Write one raw RGBA frame; resolves once ffmpeg can accept more (backpressure). */
  function write(buffer) {
    return new Promise((resolve, reject) => {
      const ok = input.write(buffer, (err) => {
        if (err) reject(err)
      })
      if (ok) resolve()
      else input.once('drain', resolve)
    })
  }

  /** Signal no more frames; resolves with the output path once encoding finishes. */
  function finish() {
    input.end()
    return done
  }

  return { write, finish }
}
