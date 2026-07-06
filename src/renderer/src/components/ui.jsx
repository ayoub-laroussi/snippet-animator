// ---------------------------------------------------------------------------
// Small, reusable control primitives for the config panel. They all share the
// neutral dark styling so the panel reads as one calm surface. Building them
// once keeps ConfigPanel declarative and consistent.
// ---------------------------------------------------------------------------

/** A titled group of related controls. */
export function Section({ title, children }) {
  return (
    <section className="border-b border-panel-border/70 px-4 py-4">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
        {title}
      </h3>
      <div className="space-y-3.5">{children}</div>
    </section>
  )
}

/** A labelled row wrapping a single control. */
export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[13px] text-ink-soft">{label}</span>
        {hint != null && <span className="text-[11px] text-ink-faint">{hint}</span>}
      </div>
      {children}
    </label>
  )
}

/** Native <select> styled to match the dark panel. */
export function Select({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-panel-border bg-panel-input px-3 py-2 pr-9 text-[13px] text-ink outline-none transition hover:border-panel-border/80 focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
      >
        {options.map((opt) => (
          <option key={opt.id} value={opt.id} className="bg-panel-input text-ink">
            {opt.name}
          </option>
        ))}
      </select>
      {/* Custom chevron since we hide the native one. */}
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

/** Segmented control for small, mutually exclusive choices (e.g. anim mode). */
export function Segmented({ value, onChange, options }) {
  return (
    <div className="flex rounded-lg border border-panel-border bg-panel-input p-1">
      {options.map((opt) => {
        const active = opt.id === value
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={
              'flex-1 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium transition ' +
              (active
                ? 'bg-accent/90 text-white shadow-sm'
                : 'text-ink-soft hover:text-ink')
            }
          >
            {opt.name}
          </button>
        )
      })}
    </div>
  )
}

/** Slider with a live numeric readout. */
export function Slider({ value, onChange, min, max, step = 1, suffix = '' }) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="w-16 shrink-0 text-right text-[12px] tabular-nums text-ink-soft">
        {value}
        {suffix}
      </span>
    </div>
  )
}

/** On/off toggle switch. */
export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between"
    >
      <span className="text-[13px] text-ink-soft">{label}</span>
      <span
        className={
          'relative h-5 w-9 rounded-full transition ' +
          (checked ? 'bg-accent' : 'bg-panel-input border border-panel-border')
        }
      >
        <span
          className={
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ' +
            (checked ? 'left-[18px]' : 'left-0.5')
          }
        />
      </span>
    </button>
  )
}

/** Text input styled for the dark panel. */
export function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-panel-border bg-panel-input px-3 py-2 text-[13px] text-ink outline-none transition placeholder:text-ink-faint hover:border-panel-border/80 focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
    />
  )
}
