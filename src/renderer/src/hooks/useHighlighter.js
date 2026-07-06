import { useEffect, useState } from 'react'
import { createHighlighter } from 'shiki'
import { CODE_THEMES, LANGUAGES } from '../config/presets'

// ---------------------------------------------------------------------------
// Shiki highlighter setup.
//
// Shiki loads TextMate grammars + VS Code themes asynchronously. Creating a
// highlighter is relatively expensive, so we build ONE shared instance (a
// module-level promise) preloaded with every theme and language the app
// offers. Components then tokenize synchronously against it.
//
// We tokenize (rather than emit HTML) on purpose: token-level access is what
// lets the reveal animation in step 5 fade/type individual lines and
// characters while keeping their exact syntax colors. Same data feeds the
// preview and the ffmpeg export, guaranteeing WYSIWYG.
// ---------------------------------------------------------------------------

const THEME_IDS = CODE_THEMES.map((t) => t.id)
const LANG_IDS = LANGUAGES.map((l) => l.id)

let highlighterPromise = null

/** Lazily create (once) and return the shared Shiki highlighter. */
function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: THEME_IDS,
      langs: LANG_IDS
    })
  }
  return highlighterPromise
}

/**
 * React hook returning the shared highlighter once it has finished loading,
 * or `null` while still initializing. Consumers render a plain-text fallback
 * until it resolves.
 */
export function useHighlighter() {
  const [highlighter, setHighlighter] = useState(null)

  useEffect(() => {
    let active = true
    getHighlighter().then((hl) => {
      if (active) setHighlighter(hl)
    })
    return () => {
      active = false
    }
  }, [])

  return highlighter
}

// Shiki encodes font style as a bitmask; expose readable flags for renderers.
export const FONT_STYLE = {
  Italic: 1,
  Bold: 2,
  Underline: 4
}
