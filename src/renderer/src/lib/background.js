// ---------------------------------------------------------------------------
// Background resolution — single source of truth for what the stage looks like,
// used by BOTH the DOM preview (as a CSS string) and the canvas exporter (as
// gradient coordinates). Keeping the math here guarantees the preview and the
// exported video share the exact same background (WYSIWYG).
// ---------------------------------------------------------------------------

const DEFAULT_ANGLE = 135

/**
 * Normalize a preset + settings into a plain background descriptor.
 * @returns {{type:'solid',color:string} | {type:'gradient',angle:number,stops:{color:string,at:number}[]}}
 */
export function resolveBackground(settings, preset) {
  if (preset.isSolid) {
    return { type: 'solid', color: settings.solidColor }
  }
  if (preset.isCustomGradient) {
    return {
      type: 'gradient',
      angle: settings.gradientAngle ?? DEFAULT_ANGLE,
      stops: [
        { color: settings.gradientFrom, at: 0 },
        { color: settings.gradientTo, at: 1 }
      ]
    }
  }
  return {
    type: 'gradient',
    angle: preset.angle ?? DEFAULT_ANGLE,
    stops: preset.stops
  }
}

/** Turn a descriptor into a CSS `background` value for the DOM preview. */
export function backgroundToCss(bg) {
  if (bg.type === 'solid') return bg.color
  const stops = bg.stops
    .map((s) => `${s.color} ${Math.round(s.at * 100)}%`)
    .join(', ')
  return `linear-gradient(${bg.angle}deg, ${stops})`
}

/**
 * Convert a CSS gradient angle into canvas line endpoints for a w×h box.
 * Matches CSS semantics: 0deg points up, 90deg points right, 135deg → to
 * bottom-right. The line is sized so the gradient fully covers the box.
 */
export function gradientCoords(angleDeg, w, h) {
  const angle = (angleDeg * Math.PI) / 180
  const dx = Math.sin(angle)
  const dy = -Math.cos(angle)
  const cx = w / 2
  const cy = h / 2
  const len = Math.abs(w * dx) + Math.abs(h * dy)
  return {
    x0: cx - (dx * len) / 2,
    y0: cy - (dy * len) / 2,
    x1: cx + (dx * len) / 2,
    y1: cy + (dy * len) / 2
  }
}
