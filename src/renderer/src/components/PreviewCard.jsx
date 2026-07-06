import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BACKGROUND_PRESETS,
  CODE_FONTS,
  ASPECT_RATIOS,
  MIN_WINDOW_WIDTH,
  MAX_WINDOW_WIDTH,
  MAX_MANUAL_WINDOW_WIDTH,
  BOLD_FONT_WEIGHT,
  indentFor
} from '../config/presets'
import { useReveal } from '../hooks/useReveal'
import { resolveBackground, backgroundToCss } from '../lib/background'
import { handleEditorKeyDown } from '../lib/editorKeys'
import {
  revealDuration,
  lineState,
  charState,
  clamp,
  LOOP_PAUSE_MS
} from '../lib/reveal'

// ---------------------------------------------------------------------------
// PreviewCard — the ray.so-style floating code window, now animated AND fully
// editable in place: the code, the window title, and even the window's width
// (via drag handles) can all be changed directly here — no separate editor
// panel needed.
//
// A single animation clock (useReveal) reports `elapsed` ms; the pure reveal
// math (lib/reveal) turns that into per-line / per-character visibility. The
// preview loops forever so the user can judge the pacing, and Replay simply
// bumps `replayNonce` to restart the clock.
//
// The stage is boxed to the export's aspect ratio and the window auto-sizes to
// its longest line (unless manually stretched), then the whole (window +
// padding) group is scaled to fit the stage — mirroring canvasRenderer's
// layout math so the preview always matches what gets exported.
//
// When paused, the code is shown fully revealed and becomes directly editable
// via a transparent textarea overlaid on the syntax-highlighted text. Clicking
// into the code while playing pauses automatically.
// ---------------------------------------------------------------------------

/** Faux macOS traffic-light window controls. */
function TrafficLights() {
  return (
    <div className="flex items-center gap-2">
      <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
      <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
      <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
    </div>
  )
}

/** The window title, editable in place (click it and type). */
function EditableTitle({ title, onChange }) {
  const ref = useRef(null)

  // Sync external changes (e.g. from a future settings import) into the DOM
  // without touching it while the user is actively typing/has focus.
  useEffect(() => {
    const el = ref.current
    if (el && document.activeElement !== el && el.textContent !== title) {
      el.textContent = title
    }
  }, [title])

  return (
    <span
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onInput={(e) => onChange(e.currentTarget.textContent)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          e.currentTarget.blur()
        }
      }}
      className="cursor-text rounded px-1 outline-none hover:bg-white/5 focus:bg-white/10"
    />
  )
}

/** A colored token span (shared by both animation modes). */
function tokenStyle(token, glow) {
  return {
    color: token.color,
    fontStyle: token.italic ? 'italic' : undefined,
    fontWeight: token.bold ? BOLD_FONT_WEIGHT : undefined,
    textDecoration: token.underline ? 'underline' : undefined,
    // Glow uses the token's own color so it reads like neon syntax.
    textShadow: glow > 0 ? `0 0 ${glow}px ${token.color}` : undefined
  }
}

/** Full, opaque line — used in line-by-line mode. */
function FullLine({ tokens, glow }) {
  return (
    <>
      {tokens.map((token, i) => (
        <span key={i} style={tokenStyle(token, glow)}>
          {token.content}
        </span>
      ))}
    </>
  )
}

/**
 * Typewriter line: characters up to `revealed` are colored; the rest are
 * rendered transparent so they still reserve their exact space (the window
 * never resizes as text types in). A caret marks the current typing position.
 */
function TypedLine({ tokens, revealed, showCaret, caretColor, glow }) {
  const parts = []
  let col = 0
  let caretPlaced = false

  tokens.forEach((token, ti) => {
    const len = token.content.length
    const start = col
    const visibleCount = clamp(revealed - start, 0, len)

    if (visibleCount > 0) {
      parts.push(
        <span key={`v${ti}`} style={tokenStyle(token, glow)}>
          {token.content.slice(0, visibleCount)}
        </span>
      )
    }

    // Caret sits at the reveal boundary when it falls inside this token.
    if (showCaret && !caretPlaced && revealed >= start && revealed < start + len) {
      parts.push(
        <span
          key={`c${ti}`}
          className="type-caret"
          style={{ backgroundColor: caretColor }}
        />
      )
      caretPlaced = true
    }

    const hiddenCount = len - visibleCount
    if (hiddenCount > 0) {
      parts.push(
        <span key={`h${ti}`} style={{ color: 'transparent' }}>
          {token.content.slice(visibleCount)}
        </span>
      )
    }
    col += len
  })

  // Boundary sits at the very end of the line's text.
  if (showCaret && !caretPlaced) {
    parts.push(
      <span key="c-end" className="type-caret" style={{ backgroundColor: caretColor }} />
    )
  }

  return <>{parts}</>
}

/**
 * Observe an element's rendered BORDER-BOX size (includes its own padding),
 * unaffected by any CSS transform applied to the element itself.
 *
 * ResizeObserver's default `contentRect` reports the CONTENT box, which
 * excludes padding — for the window+padding wrapper that's exactly the value
 * that must react to the padding slider, so content-box silently ignores
 * padding changes and the scale-to-fit math would freeze on a stale size.
 */
function useElementSize() {
  const ref = useRef(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const box = entries[0].borderBoxSize?.[0]
      if (box) {
        setSize({ w: box.inlineSize, h: box.blockSize })
      } else {
        // Older engines without borderBoxSize support: fall back to content-box.
        const cr = entries[0].contentRect
        setSize({ w: cr.width, h: cr.height })
      }
    })
    ro.observe(el, { box: 'border-box' })
    return () => ro.disconnect()
  }, [])

  return [ref, size]
}

/** CSS checkerboard pattern shown when the background is turned off. */
const CHECKERBOARD_STYLE = {
  backgroundColor: '#2a2a2a',
  backgroundImage:
    'linear-gradient(45deg, #3a3a3a 25%, transparent 25%), ' +
    'linear-gradient(-45deg, #3a3a3a 25%, transparent 25%), ' +
    'linear-gradient(45deg, transparent 75%, #3a3a3a 75%), ' +
    'linear-gradient(-45deg, transparent 75%, #3a3a3a 75%)',
  backgroundSize: '20px 20px',
  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
}

export default function PreviewCard({ settings, tokenized, replayNonce, playing, onPause, update }) {
  const {
    code,
    title,
    presetId,
    fontId,
    fontSize,
    showLineNumbers,
    padding,
    glow,
    manualWidth,
    showBackground,
    animationMode,
    lineSpeed,
    charSpeed,
    language
  } = settings

  const preset =
    BACKGROUND_PRESETS.find((p) => p.id === presetId) ?? BACKGROUND_PRESETS[0]
  const font = CODE_FONTS.find((f) => f.id === fontId) ?? CODE_FONTS[0]
  const ratio = ASPECT_RATIOS.find((r) => r.id === settings.aspectRatio) ?? ASPECT_RATIOS[0]

  // Tokenized code is computed once in App and shared with the exporter.
  const lines = tokenized ? tokenized.lines : null

  // Drive the animation clock. Duration depends on the mode + speed; the clock
  // restarts whenever the content, timing, or Replay button changes. Pausing
  // freezes the clock at the fully-revealed frame (see useReveal).
  const duration = useMemo(() => {
    if (!lines) return 1
    return revealDuration(animationMode, lines, lineSpeed, charSpeed)
  }, [lines, animationMode, lineSpeed, charSpeed])

  const restartKey = `${animationMode}|${lineSpeed}|${charSpeed}|${code}|${language}|${settings.theme}|${replayNonce}`
  const elapsed = useReveal({ duration, pause: LOOP_PAUSE_MS, restartKey, playing })

  // Precompute char-mode reveal state once per frame.
  const charInfo = useMemo(() => {
    if (!lines || animationMode !== 'char') return null
    return charState(lines, elapsed, charSpeed)
  }, [lines, animationMode, elapsed, charSpeed])

  // Resolve the stage background (solid / preset gradient / custom gradient)
  // through the shared helper so the preview matches the exported video.
  const backgroundStyle = backgroundToCss(resolveBackground(settings, preset))
  const windowBg = tokenized?.bg ?? '#1e1e2e'
  const defaultFg = tokenized?.fg ?? '#cdd6f4'

  const plainLines = code.length ? code.split('\n') : ['']
  const lineCount = lines ? lines.length : plainLines.length
  const numberWidth = `${String(lineCount).length + 1}ch`

  // --- Aspect-ratio stage sizing -------------------------------------------
  // 1. `outerSize` = available preview area (drives the stage's contain-fit box).
  // 2. `contentSize` = the window+padding group's NATURAL (unscaled) size.
  // 3. `scale` fits that group into the stage, exactly mirroring canvasRenderer.
  const [outerRef, outerSize] = useElementSize()
  const [contentRef, contentSize] = useElementSize()
  const windowRef = useRef(null)

  let stageW = 0
  let stageH = 0
  if (outerSize.w > 0 && outerSize.h > 0) {
    const ratioValue = ratio.width / ratio.height
    if (outerSize.w / outerSize.h > ratioValue) {
      stageH = outerSize.h
      stageW = stageH * ratioValue
    } else {
      stageW = outerSize.w
      stageH = stageW / ratioValue
    }
  }

  const scale =
    contentSize.w > 0 && contentSize.h > 0 && stageW > 0 && stageH > 0
      ? Math.min(stageW / contentSize.w, stageH / contentSize.h)
      : 1

  // --- Manual width drag handles --------------------------------------------
  const dragRef = useRef(null) // { side, startX, startWidth } while dragging

  function beginDrag(side, e) {
    e.preventDefault()
    const startWidth = manualWidth ?? windowRef.current?.offsetWidth ?? MIN_WINDOW_WIDTH
    dragRef.current = { side, startX: e.clientX, startWidth }

    function onMove(ev) {
      const d = dragRef.current
      if (!d) return
      // Screen-pixel delta must be divided by `scale` to get a logical delta,
      // so dragging feels 1:1 with the mouse regardless of the stage's zoom.
      const screenDelta = ev.clientX - d.startX
      const logicalDelta = screenDelta / (scale || 1)
      // Dragging the right handle grows width with positive delta; the left
      // handle grows width when dragged left (negative delta).
      const signed = d.side === 'right' ? logicalDelta : -logicalDelta
      const next = clamp(d.startWidth + signed * 2, MIN_WINDOW_WIDTH, MAX_MANUAL_WINDOW_WIDTH)
      update({ manualWidth: Math.round(next) })
    }
    function onUp() {
      dragRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const windowWidthStyle =
    manualWidth != null
      ? { width: clamp(manualWidth, MIN_WINDOW_WIDTH, MAX_MANUAL_WINDOW_WIDTH) }
      : { minWidth: MIN_WINDOW_WIDTH, maxWidth: MAX_WINDOW_WIDTH }

  const indentUnit = indentFor(language)

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden p-6">
      <div ref={outerRef} className="flex h-full w-full items-center justify-center">
        {/* Stage: boxed to the export's aspect ratio, background fills it fully. */}
        <div
          className="relative overflow-hidden rounded-2xl"
          style={{
            width: stageW || '100%',
            height: stageH || '100%',
            aspectRatio: `${ratio.width} / ${ratio.height}`,
            maxWidth: '100%',
            maxHeight: '100%',
            ...(showBackground ? { background: backgroundStyle } : CHECKERBOARD_STYLE)
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Window + its padding, sized to content then scaled to fit the stage. */}
            <div
              ref={contentRef}
              style={{ padding, transform: `scale(${scale})`, transformOrigin: 'center' }}
            >
              {/* Floating code window. */}
              <div
                ref={windowRef}
                className="group relative overflow-hidden rounded-xl ring-1 ring-white/10"
                style={{
                  boxShadow: preset.shadow,
                  background: windowBg,
                  ...windowWidthStyle
                }}
              >
                {/* Drag handles to manually stretch the window's width. */}
                <div
                  onPointerDown={(e) => beginDrag('left', e)}
                  title="Drag to resize"
                  className="absolute inset-y-0 left-0 z-10 w-2 cursor-ew-resize opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-40"
                >
                  <div className="absolute inset-y-1/2 left-0.5 h-8 w-1 -translate-y-1/2 rounded-full bg-white/70" />
                </div>
                <div
                  onPointerDown={(e) => beginDrag('right', e)}
                  title="Drag to resize"
                  className="absolute inset-y-0 right-0 z-10 w-2 cursor-ew-resize opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-40"
                >
                  <div className="absolute inset-y-1/2 right-0.5 h-8 w-1 -translate-y-1/2 rounded-full bg-white/70" />
                </div>

                {/* Title bar. */}
                <div className="relative flex items-center px-4 py-3">
                  <TrafficLights />
                  <div className="pointer-events-none absolute inset-x-0 flex justify-center text-[12.5px] font-medium text-white/50">
                    <div className="pointer-events-auto">
                      <EditableTitle title={title} onChange={(v) => update({ title: v })} />
                    </div>
                  </div>
                </div>

                {/* Code body. */}
                <div
                  className="code-ligatures relative cursor-text px-5 pb-5 pt-1"
                  onMouseDown={() => {
                    if (playing) onPause()
                  }}
                  style={{ fontFamily: font.stack, fontSize, lineHeight: 1.6, color: defaultFg }}
                >
                  {/* Clip (don't scroll): the line-slide animation pokes a few px
                      past the edge, and the canvas exporter clips the same way, so
                      clipping here keeps the preview and the export identical. */}
                  <pre className="overflow-hidden">
                    <code className="block">
                      {!lines
                        ? // Fallback while Shiki loads: static plain text.
                          plainLines.map((line, i) => (
                            <div key={i} className="flex">
                              {showLineNumbers && (
                                <span
                                  className="mr-4 shrink-0 select-none text-right opacity-30"
                                  style={{ minWidth: numberWidth }}
                                >
                                  {i + 1}
                                </span>
                              )}
                              <span className="whitespace-pre">{line || ' '}</span>
                            </div>
                          ))
                        : lines.map((line, i) => {
                            // Per-line visibility depends on the animation mode.
                            const ls =
                              animationMode === 'line'
                                ? lineState(i, elapsed, lineSpeed)
                                : null
                            const rowStyle =
                              animationMode === 'line'
                                ? {
                                    opacity: ls.opacity,
                                    transform: `translateY(${ls.translateY}px)`
                                  }
                                : undefined

                            return (
                              <div key={i} className="flex" style={rowStyle}>
                                {showLineNumbers && (
                                  <span
                                    className="mr-4 shrink-0 select-none text-right opacity-30"
                                    style={{ minWidth: numberWidth }}
                                  >
                                    {i + 1}
                                  </span>
                                )}
                                <span className="whitespace-pre">
                                  {animationMode === 'line' ? (
                                    <FullLine tokens={line} glow={glow} />
                                  ) : (
                                    <TypedLine
                                      tokens={line}
                                      revealed={charInfo.revealedCols[i]}
                                      showCaret={charInfo.caretLine === i && !charInfo.done}
                                      caretColor={defaultFg}
                                      glow={glow}
                                    />
                                  )}
                                  {/* Keep empty lines from collapsing to zero height. */}
                                  {line.length === 0 && ' '}
                                </span>
                              </div>
                            )
                          })}
                    </code>
                  </pre>

                  {/* While paused, edit the code directly in place: a transparent
                      textarea sits on top of the highlighted text, sharing its
                      exact font metrics so the caret lines up with the glyphs. */}
                  {!playing && lines && (
                    <textarea
                      value={code}
                      onChange={(e) => update({ code: e.target.value })}
                      onKeyDown={(e) =>
                        handleEditorKeyDown(e, { value: code, indentUnit })
                      }
                      spellCheck={false}
                      wrap="off"
                      className="code-ligatures absolute inset-0 cursor-text resize-none overflow-hidden whitespace-pre bg-transparent outline-none"
                      style={{
                        fontFamily: font.stack,
                        fontSize,
                        lineHeight: 1.6,
                        color: 'transparent',
                        caretColor: defaultFg,
                        paddingTop: 4,
                        paddingBottom: 20,
                        paddingRight: 20,
                        paddingLeft: showLineNumbers
                          ? `calc(20px + ${numberWidth} + 16px)`
                          : 20
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* "Reset to auto width" — only shown once the window has been
              manually stretched. Positioned against the stage (not the scaled
              content group) so it stays a fixed, readable size. */}
          {manualWidth != null && (
            <div className="absolute inset-x-0 bottom-3 flex justify-center">
              <button
                type="button"
                onClick={() => update({ manualWidth: null })}
                className="rounded-full bg-black/40 px-3 py-1 text-[11px] text-white/70 backdrop-blur-sm transition hover:bg-black/60 hover:text-white"
              >
                Set to auto width
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
