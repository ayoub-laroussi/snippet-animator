// ---------------------------------------------------------------------------
// Pure reveal math: given the animation clock (`elapsed` ms) it decides what is
// visible. No React, no DOM — so the live preview and the canvas exporter can
// share the exact same logic and stay pixel/timing identical (WYSIWYG).
// ---------------------------------------------------------------------------

// How long a single line takes to fade + slide into place (line-by-line mode).
export const LINE_ANIM_MS = 320
// Vertical travel of a line as it slides up into place (px).
export const LINE_SLIDE_PX = 10
// Hold the fully revealed frame this long before the preview loops.
export const LOOP_PAUSE_MS = 1400

/** Total characters to type (line text + one unit per line break). */
export function countChars(lines) {
  let total = 0
  for (let i = 0; i < lines.length; i++) {
    for (const token of lines[i]) total += token.content.length
    if (i < lines.length - 1) total += 1 // the newline counts as one beat
  }
  return total
}

/**
 * Total duration of one full reveal for the given mode/settings.
 * @param {'line'|'char'} mode
 */
export function revealDuration(mode, lines, lineSpeed, charSpeed) {
  if (mode === 'char') {
    return Math.max(1, countChars(lines) * charSpeed)
  }
  // Line mode: last line starts at (n-1)*lineSpeed and then animates in.
  const n = Math.max(1, lines.length)
  return (n - 1) * lineSpeed + LINE_ANIM_MS
}

/**
 * Per-line visual state in line-by-line mode.
 * @returns {{ opacity:number, translateY:number }}
 */
export function lineState(index, elapsed, lineSpeed) {
  const start = index * lineSpeed
  // Local progress of this line's own fade/slide, eased for a soft finish.
  const raw = clamp((elapsed - start) / LINE_ANIM_MS, 0, 1)
  const p = easeOutCubic(raw)
  return {
    opacity: p,
    translateY: (1 - p) * LINE_SLIDE_PX
  }
}

/**
 * Character-by-character state: how many characters of each line are revealed,
 * plus which line currently hosts the typing caret.
 * @returns {{ revealedCols:number[], caretLine:number }}
 */
export function charState(lines, elapsed, charSpeed) {
  const revealedTotal = Math.floor(elapsed / charSpeed)
  const revealedCols = new Array(lines.length).fill(0)
  let caretLine = 0

  let remaining = revealedTotal

  for (let i = 0; i < lines.length; i++) {
    const lineLen = lineLength(lines[i])
    const shown = clamp(remaining, 0, lineLen)
    revealedCols[i] = shown
    if (shown > 0) caretLine = i

    remaining -= shown

    // Consume the newline beat between lines before the next line can start.
    if (i < lines.length - 1) {
      if (remaining > 0) remaining -= 1
      else break
    }
    if (remaining <= 0 && shown < lineLen) break
  }

  return { revealedCols, caretLine, done: revealedTotal >= totalUnits(lines) }
}

/** Number of visible characters in a tokenized line. */
export function lineLength(line) {
  let n = 0
  for (const token of line) n += token.content.length
  return n
}

function totalUnits(lines) {
  return countChars(lines)
}

// --- small math helpers ----------------------------------------------------
export function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}
