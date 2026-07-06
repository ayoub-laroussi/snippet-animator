// ---------------------------------------------------------------------------
// TransportControls — the Play/Pause + Replay button pair. Shown both in the
// top header and again near the preview stage, since editing now happens
// directly in the preview and the controls should be reachable from there too.
// ---------------------------------------------------------------------------

export default function TransportControls({ playing, onTogglePlay, onReplay, className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Pause freezes on the full code and makes it directly editable in the
          preview; Play restarts the loop. */}
      <button
        type="button"
        onClick={onTogglePlay}
        title={playing ? 'Pause preview to edit code inline' : 'Resume preview'}
        className="flex items-center gap-1.5 rounded-lg border border-panel-border bg-panel-input px-3 py-1.5 text-[12.5px] font-medium text-ink-soft transition hover:border-panel-hover hover:text-ink active:scale-95"
      >
        {playing ? (
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6 4h3v12H6V4zm5 0h3v12h-3V4z" />
          </svg>
        ) : (
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6 4l10 6-10 6V4z" />
          </svg>
        )}
        {playing ? 'Pause' : 'Play'}
      </button>

      {/* Restart the looping preview animation on demand. */}
      <button
        type="button"
        onClick={onReplay}
        title="Replay preview (R)"
        className="flex items-center gap-1.5 rounded-lg border border-panel-border bg-panel-input px-3 py-1.5 text-[12.5px] font-medium text-ink-soft transition hover:border-panel-hover hover:text-ink active:scale-95"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 3a7 7 0 105.66 2.87l1.1-1.1V9h-4.24l1.6-1.6A5 5 0 1015 10h1.5A6.5 6.5 0 1110 3z" />
        </svg>
        Replay
      </button>
    </div>
  )
}
