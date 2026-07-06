// ---------------------------------------------------------------------------
// Lightweight "IDE-like" keyboard behavior for the plain <textarea> used to
// edit code directly in the preview:
//   - Tab / Shift+Tab indents or outdents the current line, or every line
//     touched by a selection.
//   - Enter carries the current line's leading whitespace onto the new line,
//     adding one extra indent level after an opening bracket.
// This gives the bare textarea the basic conveniences of a real code editor
// without pulling in a full editor component.
//
// Caret handling note: we mutate the textarea's DOM value + selection via the
// native property setter, THEN dispatch a real 'input' event so React's own
// onChange picks up the change. Doing it in this order (native value+caret
// first, React state update second) avoids the classic "caret jumps to the
// end" bug — when React later re-renders with a `value` prop that already
// matches the DOM, it leaves the selection alone; calling the React setter
// directly and restoring the caret via requestAnimationFrame instead races
// against that re-render and can lose.
// ---------------------------------------------------------------------------

const nativeValueSetter = Object.getOwnPropertyDescriptor(
  window.HTMLTextAreaElement.prototype,
  'value'
).set

function commit(el, nextValue, selStart, selEnd) {
  nativeValueSetter.call(el, nextValue)
  el.selectionStart = selStart
  el.selectionEnd = selEnd
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

function lineStartIndex(text, pos) {
  return text.lastIndexOf('\n', pos - 1) + 1
}

function lineEndIndex(text, pos) {
  const idx = text.indexOf('\n', pos)
  return idx === -1 ? text.length : idx
}

function leadingWhitespace(text, lineStart) {
  return /^[ \t]*/.exec(text.slice(lineStart))[0]
}

/** Regex matching one indent unit's worth of leading whitespace, for outdent. */
function outdentPattern(indentUnit) {
  if (indentUnit === '\t') return /^(\t| {1,4})/
  return new RegExp(`^( {1,${indentUnit.length}}|\\t)`)
}

/**
 * Handle Tab / Shift+Tab / Enter on a code textarea. When it handles the key
 * it calls `preventDefault` and commits the new value + caret directly to the
 * DOM (see `commit` above). Returns true if it handled the event, false if the
 * caller should let the browser do its default thing.
 */
export function handleEditorKeyDown(e, { value, indentUnit }) {
  const el = e.currentTarget
  const { selectionStart, selectionEnd } = el

  if (e.key === 'Tab') {
    e.preventDefault()
    const start = lineStartIndex(value, selectionStart)
    const end = lineEndIndex(value, selectionEnd)
    const before = value.slice(0, start)
    const block = value.slice(start, end)
    const after = value.slice(end)
    const lines = block.split('\n')

    if (e.shiftKey) {
      const re = outdentPattern(indentUnit)
      const removedFromFirst = lines[0].match(re)?.[0].length ?? 0
      const outdented = lines.map((line) => line.replace(re, ''))
      const joined = outdented.join('\n')
      const newStart = Math.max(start, selectionStart - removedFromFirst)
      const newEnd = Math.max(newStart, selectionEnd - (block.length - joined.length))
      commit(el, before + joined + after, newStart, newEnd)
    } else if (selectionStart === selectionEnd) {
      commit(
        el,
        value.slice(0, selectionStart) + indentUnit + value.slice(selectionEnd),
        selectionStart + indentUnit.length,
        selectionStart + indentUnit.length
      )
    } else {
      const indented = lines.map((line) => indentUnit + line)
      commit(
        el,
        before + indented.join('\n') + after,
        selectionStart + indentUnit.length,
        selectionEnd + indentUnit.length * lines.length
      )
    }
    return true
  }

  if (e.key === 'Enter' && selectionStart === selectionEnd) {
    const start = lineStartIndex(value, selectionStart)
    const currentLine = value.slice(start, selectionStart)
    const indent = leadingWhitespace(value, start)
    const opensBlock = /[{([]\s*$/.test(currentLine)
    e.preventDefault()
    const insert = '\n' + indent + (opensBlock ? indentUnit : '')
    const caret = selectionStart + insert.length
    commit(el, value.slice(0, selectionStart) + insert + value.slice(selectionEnd), caret, caret)
    return true
  }

  return false
}
