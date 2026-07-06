import { useState, useCallback, useMemo, useEffect } from 'react'
import PreviewCard from './components/PreviewCard'
import ConfigPanel from './components/ConfigPanel'
import TransportControls from './components/TransportControls'
import { useHighlighter } from './hooks/useHighlighter'
import { useExport } from './hooks/useExport'
import { tokenize } from './lib/tokenize'
import { revealDuration, LOOP_PAUSE_MS } from './lib/reveal'
import {
  DEFAULT_CODE,
  LINE_SPEED,
  CHAR_SPEED,
  GLOW,
  GRADIENT_ANGLE,
  CODE_FONTS,
  BACKGROUND_PRESETS,
  ASPECT_RATIOS
} from './config/presets'

// ---------------------------------------------------------------------------
// App — top-level layout and the single source of truth for all settings.
//
//   [           Preview stage           ] [ Config panel ]
//
// Code is edited directly inside the preview (title, code text, and window
// width are all editable in place) — there's no separate code panel. All
// child panels are controlled by this one `settings` object, so the preview
// and the eventual export stay perfectly in sync (WYSIWYG).
// ---------------------------------------------------------------------------

const DEFAULT_PRESET = BACKGROUND_PRESETS.find((p) => p.id === 'candy')

const INITIAL_SETTINGS = {
  // Code
  code: DEFAULT_CODE,
  language: 'javascript',
  theme: 'dark-plus',
  fontId: 'jetbrains-mono',
  fontSize: 16,
  title: 'greet.js',
  showLineNumbers: true,
  padding: DEFAULT_PRESET.padding,
  glow: GLOW.default,
  // null = auto-fit to the longest line; a number overrides it (drag handles).
  manualWidth: null,

  // Background
  presetId: 'candy',
  solidColor: '#1e1e2e',
  // Custom gradient (used by the "Custom" preset)
  gradientFrom: '#6a11cb',
  gradientTo: '#2575fc',
  gradientAngle: GRADIENT_ANGLE.default,
  // Off shows a transparent checkerboard in the preview and exports with an
  // alpha channel — one toggle covers both, instead of two separate settings.
  showBackground: true,

  // Animation
  animationMode: 'line',
  lineSpeed: LINE_SPEED.default,
  charSpeed: CHAR_SPEED.default,

  // Export
  aspectRatio: '16:9',
  fps: '30'
}

// Settings persist across restarts under this key so the app never "resets"
// on relaunch. Loading merges over INITIAL_SETTINGS so new fields added in
// later versions still get a sane default even if an older save is loaded.
const SETTINGS_KEY = 'snippet-animator:settings'

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return INITIAL_SETTINGS
    return { ...INITIAL_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return INITIAL_SETTINGS
  }
}

export default function App() {
  const [settings, setSettings] = useState(loadSettings)

  // Persist on every change so relaunching the app picks up where you left off.
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      // Storage can fail (quota, private mode); losing persistence isn't fatal.
    }
  }, [settings])

  // Bumping this nonce restarts the preview animation from the beginning.
  const [replayNonce, setReplayNonce] = useState(0)
  const replay = useCallback(() => setReplayNonce((n) => n + 1), [])

  // Pausing freezes the preview on the fully-revealed frame and makes the code
  // directly editable inside the window itself (see PreviewCard).
  const [playing, setPlaying] = useState(true)
  const togglePlaying = useCallback(() => setPlaying((p) => !p), [])
  const pause = useCallback(() => setPlaying(false), [])

  // Keyboard shortcut: press "R" to replay the preview (ignored while typing).
  useEffect(() => {
    const onKey = (e) => {
      const el = e.target
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')
      if (!typing && (e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey) {
        replay()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [replay])

  // Merge a partial patch into settings. Memoized so child panels don't
  // re-render needlessly while the user drags a slider.
  const update = useCallback((patch) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  // Tokenize the code once, here, so the live preview and the video exporter
  // render from the exact same colored tokens (guarantees WYSIWYG).
  const highlighter = useHighlighter()
  const tokenized = useMemo(() => {
    if (!highlighter) return null
    return tokenize(highlighter, settings.code, settings.language, settings.theme)
  }, [highlighter, settings.code, settings.language, settings.theme])

  // Export state machine (progress, chosen folder, result).
  const exp = useExport()

  // A lightweight estimate of the exported clip (length, frames, resolution) so
  // the user knows what they'll get before starting.
  const exportInfo = useMemo(() => {
    if (!tokenized || !tokenized.lines.length) return null
    const fps = Number(settings.fps) || 30
    const duration = revealDuration(
      settings.animationMode,
      tokenized.lines,
      settings.lineSpeed,
      settings.charSpeed
    )
    const totalMs = duration + LOOP_PAUSE_MS
    const ratio = ASPECT_RATIOS.find((a) => a.id === settings.aspectRatio)
    return {
      seconds: totalMs / 1000,
      frames: Math.max(1, Math.round((totalMs / 1000) * fps)),
      width: ratio.width,
      height: ratio.height
    }
  }, [
    tokenized,
    settings.fps,
    settings.animationMode,
    settings.lineSpeed,
    settings.charSpeed,
    settings.aspectRatio
  ])

  // Gather everything the exporter needs and kick it off.
  // `kind`: 'video' renders the full animated clip; 'image' saves one
  // fully-revealed frame as a PNG.
  const handleExport = useCallback(
    (kind) => {
      if (!tokenized) return
      const preset = BACKGROUND_PRESETS.find((p) => p.id === settings.presetId)
      const ratio = ASPECT_RATIOS.find((a) => a.id === settings.aspectRatio)
      const font = CODE_FONTS.find((f) => f.id === settings.fontId) ?? CODE_FONTS[0]
      exp.start(kind, {
        settings,
        preset,
        tokenized,
        fontStack: font.stack,
        width: ratio.width,
        height: ratio.height
      })
    },
    [tokenized, settings, exp]
  )

  return (
    <div className="flex h-screen w-screen flex-col bg-panel text-ink">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-panel-border px-4">
        <div className="flex items-center gap-2.5">
          <div className="h-5 w-5 rounded-md bg-gradient-to-br from-accent to-pink-500" />
          <span className="text-[13px] font-semibold tracking-tight">
            Snippet Animator
          </span>
          <span className="rounded bg-panel-input px-1.5 py-0.5 text-[10px] font-medium text-ink-faint">
            v0.1
          </span>
        </div>
      </header>

      {/* Two-column workspace: the preview IS the editor now. */}
      <div className="flex min-h-0 flex-1">
        {/* Preview stage — subtle checker-free neutral backdrop so the
            colorful card clearly detaches from the app chrome. */}
        <main className="relative flex min-w-0 flex-1 flex-col bg-panel">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,108,255,0.06),transparent_60%)]" />
          <div className="relative min-h-0 flex-1">
            <PreviewCard
              settings={settings}
              tokenized={tokenized}
              replayNonce={replayNonce}
              playing={playing}
              onPause={pause}
              update={update}
            />
          </div>

          {/* Transport controls repeated at the bottom, next to the editing
              surface itself, since there's no separate code panel anymore. */}
          <div className="relative flex shrink-0 justify-center pb-4">
            <TransportControls playing={playing} onTogglePlay={togglePlaying} onReplay={replay} />
          </div>
        </main>

        <ConfigPanel
          settings={settings}
          update={update}
          exp={exp}
          onExport={handleExport}
          exportInfo={exportInfo}
        />
      </div>
    </div>
  )
}
