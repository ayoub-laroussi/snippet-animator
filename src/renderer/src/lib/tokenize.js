import { FONT_STYLE } from '../hooks/useHighlighter'

// ---------------------------------------------------------------------------
// Convert source code into themed token lines using a ready Shiki highlighter.
// Returns a normalized shape the renderer (and later the canvas exporter) can
// consume without knowing Shiki internals.
// ---------------------------------------------------------------------------

/**
 * @param {import('shiki').Highlighter} highlighter
 * @param {string} code
 * @param {string} lang   Shiki language id
 * @param {string} theme  Shiki theme id
 * @returns {{ lines: Array<Array<{content:string,color:string,italic:boolean,bold:boolean,underline:boolean}>>, bg:string, fg:string }}
 */
export function tokenize(highlighter, code, lang, theme) {
  const loadedLangs = highlighter.getLoadedLanguages()
  // Fall back to plain text if a grammar somehow isn't loaded, so the preview
  // never crashes on an unexpected language id.
  const safeLang = loadedLangs.includes(lang) ? lang : 'txt'

  const { tokens, fg, bg } = highlighter.codeToTokens(code, {
    lang: safeLang,
    theme
  })

  const lines = tokens.map((line) =>
    line.map((token) => ({
      content: token.content,
      color: token.color || fg,
      italic: (token.fontStyle & FONT_STYLE.Italic) !== 0,
      bold: (token.fontStyle & FONT_STYLE.Bold) !== 0,
      underline: (token.fontStyle & FONT_STYLE.Underline) !== 0
    }))
  )

  return { lines, bg, fg }
}
