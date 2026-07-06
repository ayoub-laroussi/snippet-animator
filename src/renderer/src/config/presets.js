// ---------------------------------------------------------------------------
// Central catalogue of user-facing options: background presets, code themes,
// fonts, languages and animation modes. Keeping these as plain data makes the
// config panel declarative and gives later steps (Shiki, ffmpeg export) a
// single source of truth.
// ---------------------------------------------------------------------------

/**
 * Background presets. Each one bundles the three things that define the
 * "ray.so card" look:
 *   - background: the soft, colorful gradient behind the code window
 *   - shadow:     the realistic drop shadow that lifts the window off the bg
 *   - padding:    breathing room (px) between the gradient edge and the window
 *
 * Colors are deliberately soft/harmonious — no harsh neon.
 */
export const BACKGROUND_PRESETS = [
  {
    id: 'sunset',
    name: 'Sunset',
    background: 'linear-gradient(135deg, #ff8a5c 0%, #ff5f7e 45%, #a86bff 100%)',
    // Structured form (angle + stops) so the canvas exporter reproduces the
    // exact same gradient. `shadowColor`/`shadowBlur` mirror the CSS box-shadow.
    stops: [
      { color: '#ff8a5c', at: 0 },
      { color: '#ff5f7e', at: 0.45 },
      { color: '#a86bff', at: 1 }
    ],
    shadow: '0 30px 70px -15px rgba(168, 60, 90, 0.55)',
    shadowColor: 'rgba(168, 60, 90, 0.55)',
    padding: 72,
    swatch: ['#ff8a5c', '#ff5f7e', '#a86bff']
  },
  {
    id: 'ocean',
    name: 'Ocean',
    background: 'linear-gradient(135deg, #1a5fb4 0%, #1c9dc4 55%, #12c7c0 100%)',
    stops: [
      { color: '#1a5fb4', at: 0 },
      { color: '#1c9dc4', at: 0.55 },
      { color: '#12c7c0', at: 1 }
    ],
    shadow: '0 30px 70px -15px rgba(10, 60, 90, 0.6)',
    shadowColor: 'rgba(10, 60, 90, 0.6)',
    padding: 80,
    swatch: ['#1a5fb4', '#1c9dc4', '#12c7c0']
  },
  {
    id: 'midnight',
    name: 'Midnight',
    background: 'linear-gradient(135deg, #232649 0%, #2b2f66 50%, #3a2f7a 100%)',
    stops: [
      { color: '#232649', at: 0 },
      { color: '#2b2f66', at: 0.5 },
      { color: '#3a2f7a', at: 1 }
    ],
    shadow: '0 30px 70px -15px rgba(0, 0, 0, 0.7)',
    shadowColor: 'rgba(0, 0, 0, 0.7)',
    padding: 88,
    swatch: ['#232649', '#2b2f66', '#3a2f7a']
  },
  {
    id: 'candy',
    name: 'Candy',
    background: 'linear-gradient(135deg, #f857a6 0%, #b34bff 55%, #7a5cff 100%)',
    stops: [
      { color: '#f857a6', at: 0 },
      { color: '#b34bff', at: 0.55 },
      { color: '#7a5cff', at: 1 }
    ],
    shadow: '0 30px 70px -15px rgba(150, 40, 130, 0.55)',
    shadowColor: 'rgba(150, 40, 130, 0.55)',
    padding: 68,
    swatch: ['#f857a6', '#b34bff', '#7a5cff']
  },
  {
    id: 'forest',
    name: 'Forest',
    background: 'linear-gradient(135deg, #0f6b4a 0%, #128a7a 55%, #12557a 100%)',
    stops: [
      { color: '#0f6b4a', at: 0 },
      { color: '#128a7a', at: 0.55 },
      { color: '#12557a', at: 1 }
    ],
    shadow: '0 30px 70px -15px rgba(6, 50, 40, 0.6)',
    shadowColor: 'rgba(6, 50, 40, 0.6)',
    padding: 84,
    swatch: ['#0f6b4a', '#128a7a', '#12557a']
  },
  {
    id: 'ember',
    name: 'Ember',
    // Warm red, à la ray.so — bright coral-red fading into a deep crimson.
    background: 'linear-gradient(135deg, #ff6a5c 0%, #e11d48 52%, #7f1029 100%)',
    stops: [
      { color: '#ff6a5c', at: 0 },
      { color: '#e11d48', at: 0.52 },
      { color: '#7f1029', at: 1 }
    ],
    shadow: '0 30px 70px -15px rgba(140, 20, 40, 0.6)',
    shadowColor: 'rgba(140, 20, 40, 0.6)',
    padding: 72,
    swatch: ['#ff6a5c', '#e11d48', '#7f1029']
  },
  {
    id: 'custom-gradient',
    name: 'Custom',
    // Special preset: a user-defined 2-stop gradient (colors + angle live in
    // settings). `background`/`stops` here are just an initial fallback.
    background: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)',
    stops: [
      { color: '#6a11cb', at: 0 },
      { color: '#2575fc', at: 1 }
    ],
    shadow: '0 30px 70px -15px rgba(0, 0, 0, 0.55)',
    shadowColor: 'rgba(0, 0, 0, 0.55)',
    padding: 76,
    isCustomGradient: true,
    swatch: ['#6a11cb', '#2575fc']
  },
  {
    id: 'solid',
    name: 'Solid color',
    // Special preset: the background is driven by a user-picked flat color.
    // `background` here is only a fallback used before the picker is touched.
    background: '#1e1e2e',
    stops: null,
    shadow: '0 30px 70px -15px rgba(0, 0, 0, 0.55)',
    shadowColor: 'rgba(0, 0, 0, 0.55)',
    padding: 80,
    isSolid: true,
    swatch: ['#1e1e2e']
  }
]

/** Syntax color themes — all bundled with Shiki, no network fetch needed. */
export const CODE_THEMES = [
  { id: 'dark-plus', name: 'VS Code Dark+' },
  { id: 'dracula', name: 'Dracula' },
  { id: 'one-dark-pro', name: 'One Dark Pro' },
  { id: 'monokai', name: 'Monokai' },
  { id: 'nord', name: 'Nord' },
  { id: 'github-dark', name: 'GitHub Dark' },
  { id: 'tokyo-night', name: 'Tokyo Night' },
  { id: 'night-owl', name: 'Night Owl' },
  { id: 'solarized-dark', name: 'Solarized Dark' },
  { id: 'material-theme-darker', name: 'Material Darker' },
  { id: 'catppuccin-mocha', name: 'Catppuccin Mocha' },
  { id: 'ayu-dark', name: 'Ayu Dark' },
  { id: 'synthwave-84', name: 'Synthwave \'84' },
  { id: 'rose-pine', name: 'Rosé Pine' }
]

/** Monospace fonts offered for the code window. */
export const CODE_FONTS = [
  { id: 'fira-code', name: 'Fira Code', stack: "'Fira Code', monospace" },
  { id: 'jetbrains-mono', name: 'JetBrains Mono', stack: "'JetBrains Mono', monospace" },
  { id: 'cascadia-code', name: 'Cascadia Code', stack: "'Cascadia Code', monospace" },
  { id: 'geist-mono', name: 'Geist Mono', stack: "'Geist Mono', monospace" }
]

/** Languages for syntax highlighting (subset; expanded with Shiki later). */
export const LANGUAGES = [
  { id: 'javascript', name: 'JavaScript' },
  { id: 'typescript', name: 'TypeScript' },
  { id: 'jsx', name: 'JSX / React' },
  { id: 'python', name: 'Python' },
  { id: 'rust', name: 'Rust' },
  { id: 'go', name: 'Go' },
  { id: 'csharp', name: 'C#' },
  { id: 'lua', name: 'Lua' },
  { id: 'html', name: 'HTML' },
  { id: 'css', name: 'CSS' },
  { id: 'json', name: 'JSON' },
  { id: 'bash', name: 'Shell / Bash' }
]

/**
 * Indent unit used by the in-preview code editor's Tab key and auto-indent on
 * Enter, matched to each language's usual convention.
 */
export const LANGUAGE_INDENT = {
  javascript: '  ',
  typescript: '  ',
  jsx: '  ',
  python: '    ',
  rust: '    ',
  go: '\t',
  csharp: '    ',
  lua: '  ',
  html: '  ',
  css: '  ',
  json: '  ',
  bash: '  '
}

/** Indent string to use for Tab/auto-indent for a given language id. */
export function indentFor(languageId) {
  return LANGUAGE_INDENT[languageId] ?? '  '
}

// Fixed weight applied to bold syntax tokens (keywords, types…). Exposing this
// as a user control turned out to be confusing (many themes barely use bold
// tokens at all), so it's a constant now instead of a setting.
export const BOLD_FONT_WEIGHT = '700'

/** Animation modes for the reveal effect. */
export const ANIMATION_MODES = [
  { id: 'line', name: 'Line by line', hint: 'Fade + slide up per line' },
  { id: 'char', name: 'Character by character', hint: 'Typewriter effect' }
]

/**
 * Export aspect ratios (matters for vertical vs. landscape video). Each carries
 * the output pixel resolution used by the frame renderer + ffmpeg encoder.
 */
export const ASPECT_RATIOS = [
  { id: '16:9', name: '16:9 — Landscape', width: 1920, height: 1080 },
  { id: '9:16', name: '9:16 — Vertical', width: 1080, height: 1920 },
  { id: '1:1', name: '1:1 — Square', width: 1080, height: 1080 }
]

// Speed slider bounds (ms), per the spec.
export const LINE_SPEED = { min: 50, max: 800, default: 220 }
export const CHAR_SPEED = { min: 10, max: 100, default: 35 }

// The code window auto-sizes to fit its longest line (like ray.so) instead of
// a manually-adjusted "block width". MIN keeps very short snippets from
// looking like a razor-thin sliver; MAX stops one pathologically long,
// unwrapped line from forcing the whole layout to shrink to fit it (the line
// itself just clips instead — a much better trade-off).
export const MIN_WINDOW_WIDTH = 320
export const MAX_WINDOW_WIDTH = 960
// Dragging the window's resize handles opts out of the auto-width cap above —
// the user is explicitly asking for a specific size, so honor it up to this
// much more generous ceiling.
export const MAX_MANUAL_WINDOW_WIDTH = 1600

// Breathing room (px) between the gradient edge and the code window. Each
// preset sets a sensible default when selected, but the automatic value isn't
// always enough — this stays a manual slider so it can be fine-tuned per shot.
export const PADDING = { min: 16, max: 200, default: 72 }
// One-click common values, ray.so-style, shown alongside the slider.
export const PADDING_PRESETS = [16, 32, 64, 128]

// Text glow intensity (blur px); 0 disables the effect.
export const GLOW = { min: 0, max: 24, default: 0 }

// Custom gradient angle (deg).
export const GRADIENT_ANGLE = { min: 0, max: 360, default: 135 }

// A friendly default snippet so the preview never looks empty.
export const DEFAULT_CODE = `function greet(name) {
  const message = \`Hello, \${name}!\`
  console.log(message)
  return message
}

greet('world')`
