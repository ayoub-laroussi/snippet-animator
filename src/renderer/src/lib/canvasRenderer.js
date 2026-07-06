import { lineState, charState, clamp } from './reveal'
import { resolveBackground, gradientCoords } from './background'
import {
  BOLD_FONT_WEIGHT,
  MIN_WINDOW_WIDTH,
  MAX_WINDOW_WIDTH,
  MAX_MANUAL_WINDOW_WIDTH
} from '../config/presets'

// ---------------------------------------------------------------------------
// canvasRenderer — draws ONE animation frame onto a 2D canvas.
//
// It re-creates the PreviewCard visuals (gradient stage, floating rounded code
// window with shadow + traffic lights, tokenized code) and applies the exact
// same reveal math (lib/reveal) at a given `elapsed` time. Because the preview
// and the export both call this same logic, the rendered video matches the
// preview frame-for-frame (WYSIWYG).
//
// Layout is computed in logical pixels — the window auto-sizes to fit its
// longest line — then uniformly scaled by `k` to fit the chosen output
// resolution, so text stays crisp and proportional whatever the aspect ratio.
// ---------------------------------------------------------------------------

const UI_FONT = "'Inter', system-ui, sans-serif"
const TITLE_BAR = 44 // logical px
const PAD_X = 20 // code body horizontal padding (px-5)
const PAD_TOP = 4 // pt-1
const PAD_BOTTOM = 20 // pb-5
const RADIUS = 12 // rounded-xl
const LINE_HEIGHT_RATIO = 1.6

/** Build the ctx.font string for a token. */
function fontFor(px, stack, { italic, weight }) {
  return `${italic ? 'italic ' : ''}${weight} ${px}px ${stack}`
}

/** Measure one tokenized line's rendered width at the given font size. */
function measureLineWidth(ctx, line, px, stack) {
  let w = 0
  for (const token of line) {
    ctx.font = fontFor(px, stack, {
      italic: token.italic,
      weight: token.bold ? BOLD_FONT_WEIGHT : 400
    })
    w += ctx.measureText(token.content).width
  }
  return w
}

/**
 * Compute the window layout + scale factor for the given output size.
 *
 * The window's width auto-fits the longest line (like ray.so) instead of a
 * fixed user-set value, so text is never cramped or clipped regardless of
 * what code is pasted in.
 */
function computeLayout(ctx, { width, height, settings, tokenized }) {
  const F = settings.fontSize
  const LH = F * LINE_HEIGHT_RATIO
  const lines = tokenized.lines
  const digits = String(lines.length).length

  // Monospace advance width, measured from the actual selected font.
  ctx.font = `400 ${F}px ${settings.fontStack}`
  const ch = ctx.measureText('0').width || F * 0.6
  const gutter = settings.showLineNumbers ? digits * ch + 16 : 0

  // A manually-stretched width (drag handles in the preview) overrides the
  // auto-fit calculation, with a more generous cap since it's a deliberate
  // choice rather than an accidental overflow.
  let WW
  if (settings.manualWidth != null) {
    WW = clamp(settings.manualWidth, MIN_WINDOW_WIDTH, MAX_MANUAL_WINDOW_WIDTH)
  } else {
    const maxLineWidth = lines.reduce(
      (max, line) => Math.max(max, measureLineWidth(ctx, line, F, settings.fontStack)),
      0
    )
    WW = clamp(gutter + maxLineWidth + 2 * PAD_X, MIN_WINDOW_WIDTH, MAX_WINDOW_WIDTH)
  }
  const contentH = lines.length * LH + PAD_TOP + PAD_BOTTOM
  const WH = TITLE_BAR + contentH

  const boxW = WW + 2 * settings.padding
  const boxH = WH + 2 * settings.padding

  // Scale so the window + its preset breathing room fits inside the frame.
  const k = Math.min(width / boxW, height / boxH)

  const winW = WW * k
  const winH = WH * k
  const winX = (width - winW) / 2
  const winY = (height - winH) / 2

  return { F, LH, ch, gutter, WW, WH, winW, winH, winX, winY, k, lines }
}

/** Paint the full-frame background (gradient / solid / transparent). */
function drawBackground(ctx, { width, height, settings, preset }) {
  ctx.clearRect(0, 0, width, height)
  if (settings.showBackground === false) return // leave alpha transparent

  const bg = resolveBackground(settings, preset)
  if (bg.type === 'solid') {
    ctx.fillStyle = bg.color
    ctx.fillRect(0, 0, width, height)
    return
  }

  // Match the CSS gradient angle exactly via shared coordinate math.
  const { x0, y0, x1, y1 } = gradientCoords(bg.angle, width, height)
  const g = ctx.createLinearGradient(x0, y0, x1, y1)
  for (const stop of bg.stops) g.addColorStop(stop.at, stop.color)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, width, height)
}

/** Draw the code window shell (shadow, rounded body, title bar, dots, title). */
function drawWindowChrome(ctx, layout, { settings, preset, tokenized }) {
  const { winX, winY, winW, winH, k } = layout

  // Window body with a realistic drop shadow (shadow excluded from later text).
  ctx.save()
  ctx.shadowColor = preset.shadowColor || 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 60 * k
  ctx.shadowOffsetY = 24 * k
  ctx.beginPath()
  ctx.roundRect(winX, winY, winW, winH, RADIUS * k)
  ctx.fillStyle = tokenized.bg || '#1e1e2e'
  ctx.fill()
  ctx.restore()

  // Traffic lights.
  const dotR = 6 * k
  const dotY = winY + (TITLE_BAR * k) / 2
  const colors = ['#ff5f56', '#ffbd2e', '#27c93f']
  let cx = winX + PAD_X * k + dotR
  for (const c of colors) {
    ctx.beginPath()
    ctx.arc(cx, dotY, dotR, 0, Math.PI * 2)
    ctx.fillStyle = c
    ctx.fill()
    cx += 2 * dotR + 8 * k
  }

  // Centered window title (UI font, dim white).
  if (settings.title) {
    ctx.font = `500 ${12.5 * k}px ${UI_FONT}`
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(settings.title, winX + winW / 2, dotY)
  }
}

/** Draw one code row's line number (right-aligned, dim). */
function drawLineNumber(ctx, layout, index, rowCenterY, fg) {
  const { winX, gutter, F, k } = layout
  if (!gutter) return
  ctx.font = `400 ${F * k}px ${layout.stack}`
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = fg
  // Right edge of the number column (before its 16px margin-right).
  const rightX = winX + PAD_X * k + (gutter - 16) * k
  ctx.fillText(String(index + 1), rightX, rowCenterY)
}

/**
 * Render every code line for the current frame.
 * `settings.fontStack` must be a canvas-ready font-family string.
 */
function drawCode(ctx, layout, { settings, tokenized, elapsed }) {
  const { winX, winY, winW, winH, gutter, LH, F, k, lines } = layout
  const stack = settings.fontStack
  layout.stack = stack

  const codeTop = winY + TITLE_BAR * k + PAD_TOP * k
  const textLeft = winX + PAD_X * k + gutter * k
  const fg = tokenized.fg || '#cdd6f4'
  const boldWeight = BOLD_FONT_WEIGHT
  // Text glow blur, scaled to the output resolution (0 disables it).
  const glowPx = (settings.glow || 0) * k

  // Keep code inside the window's rounded rectangle.
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(winX, winY, winW, winH, RADIUS * k)
  ctx.clip()

  const info =
    settings.animationMode === 'char'
      ? charState(lines, elapsed, settings.charSpeed)
      : null

  for (let i = 0; i < lines.length; i++) {
    const rowCenterY = codeTop + i * LH * k + (LH * k) / 2

    if (settings.animationMode === 'line') {
      // Line-by-line: fade + slide up.
      const ls = lineState(i, elapsed, settings.lineSpeed)
      if (ls.opacity <= 0.001) continue
      const y = rowCenterY + ls.translateY * k

      ctx.shadowBlur = 0 // line numbers never glow
      ctx.globalAlpha = ls.opacity * 0.3
      drawLineNumber(ctx, layout, i, y, fg)

      ctx.globalAlpha = ls.opacity
      drawTokensFull(ctx, lines[i], textLeft, y, F * k, stack, boldWeight, glowPx)
    } else {
      // Character-by-character typewriter.
      ctx.shadowBlur = 0
      ctx.globalAlpha = 0.3
      drawLineNumber(ctx, layout, i, rowCenterY, fg)

      ctx.globalAlpha = 1
      const revealed = info.revealedCols[i]
      const caretX = drawTokensPartial(
        ctx,
        lines[i],
        textLeft,
        rowCenterY,
        F * k,
        stack,
        boldWeight,
        revealed,
        glowPx
      )
      if (info.caretLine === i && !info.done) {
        ctx.shadowBlur = 0
        ctx.fillStyle = fg
        ctx.fillRect(caretX, rowCenterY - F * k * 0.55, 2 * k, F * k * 1.05)
      }
    }
  }

  ctx.globalAlpha = 1
  ctx.restore()
}

/** Draw all tokens of a line (opaque). */
function drawTokensFull(ctx, line, startX, y, px, stack, boldWeight, glowPx = 0) {
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  let x = startX
  for (const token of line) {
    ctx.font = fontFor(px, stack, {
      italic: token.italic,
      weight: token.bold ? boldWeight : 400
    })
    // Glow uses the token's own color for a neon-syntax look.
    if (glowPx > 0) {
      ctx.shadowColor = token.color
      ctx.shadowBlur = glowPx
    }
    ctx.fillStyle = token.color
    ctx.fillText(token.content, x, y)
    x += ctx.measureText(token.content).width
  }
}

/**
 * Draw only the first `revealed` characters of a line; returns the x position
 * of the reveal boundary (for the caret).
 */
function drawTokensPartial(ctx, line, startX, y, px, stack, boldWeight, revealed, glowPx = 0) {
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  let x = startX
  let col = 0
  let caretX = startX
  for (const token of line) {
    const len = token.content.length
    const visible = clamp(revealed - col, 0, len)
    ctx.font = fontFor(px, stack, {
      italic: token.italic,
      weight: token.bold ? boldWeight : 400
    })
    if (visible > 0) {
      const text = token.content.slice(0, visible)
      if (glowPx > 0) {
        ctx.shadowColor = token.color
        ctx.shadowBlur = glowPx
      }
      ctx.fillStyle = token.color
      ctx.fillText(text, x, y)
      x += ctx.measureText(text).width
    }
    if (revealed >= col && revealed <= col + len) caretX = x
    col += len
  }
  return caretX
}

/**
 * Pre-render the parts that never change between frames — background,
 * window body, drop shadow, traffic lights, title — onto an offscreen canvas.
 *
 * `ctx.shadowBlur` (the window's drop shadow) is one of the costliest Canvas2D
 * operations, and it was previously recomputed on every single exported frame
 * even though the window's position/size/shadow never actually changes during
 * the reveal animation. Rendering it once per export and compositing it back
 * with a cheap `drawImage` each frame removes that redundant work entirely.
 *
 * @param {object} opts Same shape as `drawFrame`'s opts (elapsed is unused).
 * @returns {{canvas: HTMLCanvasElement, layout: object|null}}
 */
export function renderStaticLayer(opts) {
  const { width, height } = opts
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  drawBackground(ctx, opts)
  if (!opts.tokenized || !opts.tokenized.lines.length) return { canvas, layout: null }

  const layout = computeLayout(ctx, opts)
  drawWindowChrome(ctx, layout, opts)
  return { canvas, layout }
}

/**
 * Public entry point: draw a complete frame.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} opts { width, height, settings, preset, tokenized, elapsed }
 *   `settings` must include `fontStack` (canvas font-family) and `padding`
 *   (the active preset's padding, copied in so layout is self-contained).
 * @param {{canvas: HTMLCanvasElement, layout: object|null}} [staticLayer]
 *   Optional cache from `renderStaticLayer`. When provided, the background and
 *   window chrome are composited from it instead of being redrawn — pass this
 *   during export, where the same frame is drawn many times in a row.
 */
export function drawFrame(ctx, opts, staticLayer) {
  if (staticLayer) {
    ctx.clearRect(0, 0, opts.width, opts.height)
    ctx.drawImage(staticLayer.canvas, 0, 0)
    if (!staticLayer.layout) return
    drawCode(ctx, staticLayer.layout, opts)
    return
  }

  // No cache: compute everything fresh (used for one-off, non-export draws).
  drawBackground(ctx, opts)
  if (!opts.tokenized || !opts.tokenized.lines.length) return
  const layout = computeLayout(ctx, opts)
  drawWindowChrome(ctx, layout, opts)
  drawCode(ctx, layout, opts)
}
