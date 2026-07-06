import { useCallback, useState } from 'react'
import { runExport, runImageExport } from '../lib/exporter'

// ---------------------------------------------------------------------------
// useExport — owns the export UI state machine (idle → running → done/error)
// and the chosen destination folder. Wraps lib/exporter so components only deal
// with a small, declarative surface. Supports both 'video' and 'image' exports
// through the same state machine.
// ---------------------------------------------------------------------------

const IDLE = {
  status: 'idle', // idle | running | done | error
  percent: 0,
  phase: null, // rendering | encoding | done
  outputPath: null,
  error: null
}

export function useExport() {
  const [state, setState] = useState(IDLE)
  const [outDir, setOutDir] = useState(null)

  const available = typeof window !== 'undefined' && !!window.api?.export

  // Prompt the OS folder picker; remembers the choice for next time.
  const chooseFolder = useCallback(async () => {
    if (!window.api?.chooseFolder) return null
    const dir = await window.api.chooseFolder()
    if (dir) setOutDir(dir)
    return dir
  }, [])

  const showFile = useCallback((filePath) => {
    window.api?.showItemInFolder?.(filePath)
  }, [])

  /**
   * Start an export. Requires a destination folder; if none is set yet, the
   * folder picker is opened first.
   * @param {'video'|'image'} kind
   */
  const start = useCallback(
    async (kind, { settings, preset, tokenized, fontStack, width, height }) => {
      if (!available) {
        setState({ ...IDLE, status: 'error', error: 'Export is only available inside the app.' })
        return
      }

      let dir = outDir
      if (!dir) {
        dir = await chooseFolder()
        if (!dir) return // user cancelled
      }

      setState({ status: 'running', percent: 0, phase: 'rendering', outputPath: null, error: null })

      const run = kind === 'image' ? runImageExport : runExport

      try {
        const result = await run(
          { settings, preset, tokenized, fontStack, width, height, outDir: dir },
          (p) => setState((s) => ({ ...s, percent: p.percent, phase: p.phase }))
        )
        if (result.ok) {
          setState({ status: 'done', percent: 100, phase: 'done', outputPath: result.outputPath, error: null })
        } else {
          setState({ status: 'error', percent: 0, phase: null, outputPath: null, error: result.error })
        }
      } catch (err) {
        setState({ status: 'error', percent: 0, phase: null, outputPath: null, error: String(err?.message || err) })
      }
    },
    [available, outDir, chooseFolder]
  )

  const reset = useCallback(() => setState(IDLE), [])

  return { ...state, available, outDir, chooseFolder, showFile, start, reset }
}
