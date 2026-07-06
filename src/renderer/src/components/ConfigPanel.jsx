import { useState } from 'react'
import {
  BACKGROUND_PRESETS,
  CODE_THEMES,
  CODE_FONTS,
  LANGUAGES,
  ANIMATION_MODES,
  ASPECT_RATIOS,
  LINE_SPEED,
  CHAR_SPEED,
  PADDING,
  PADDING_PRESETS,
  GLOW,
  GRADIENT_ANGLE
} from '../config/presets'
import { Section, Field, Select, Segmented, Slider, Toggle, TextInput } from './ui'

// ---------------------------------------------------------------------------
// ConfigPanel — the right-hand control surface. Every control is a controlled
// component driven by the `settings` object and the `update` setter from App.
// ---------------------------------------------------------------------------

/** Preview swatch for a preset tile (reflects live custom colors). */
function swatchFor(preset, settings) {
  if (preset.isSolid) return settings.solidColor
  if (preset.isCustomGradient) {
    return `linear-gradient(${settings.gradientAngle}deg, ${settings.gradientFrom}, ${settings.gradientTo})`
  }
  return preset.background
}

export default function ConfigPanel({ settings, update, exp, onExport, exportInfo }) {
  const currentPreset = BACKGROUND_PRESETS.find((p) => p.id === settings.presetId)
  const isCharMode = settings.animationMode === 'char'
  const speed = isCharMode ? CHAR_SPEED : LINE_SPEED

  // Video exports the whole animated clip; image saves one fully-revealed PNG.
  const [exportKind, setExportKind] = useState('video')

  const isExporting = exp.status === 'running'
  const hasCode = settings.code.trim().length > 0
  const canExport = exp.available && hasCode && !isExporting

  // Shorten a long folder path for display (keep the tail, which is what matters).
  const folderLabel = exp.outDir
    ? '…' + exp.outDir.slice(-28)
    : 'No folder selected'

  // Human-readable estimate shown under the controls.
  const estimateLabel = exportInfo
    ? `${exportInfo.seconds.toFixed(1)}s · ${exportInfo.frames} frames · ${exportInfo.width}×${exportInfo.height}`
    : null

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-l border-panel-border bg-panel-raised">
      <div className="flex items-center justify-between border-b border-panel-border px-4 py-3.5">
        <h2 className="text-[13px] font-semibold text-ink">Configuration</h2>
        <span className="text-[11px] text-ink-faint">Snippet Animator</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ---- Background --------------------------------------------------- */}
        <Section title="Background">
          <div className="grid grid-cols-3 gap-2">
            {BACKGROUND_PRESETS.map((preset) => {
              const active = preset.id === settings.presetId
              return (
                <button
                  key={preset.id}
                  type="button"
                  // Selecting a preset also adopts its breathing room; the user
                  // can still fine-tune padding afterwards.
                  onClick={() =>
                    update({ presetId: preset.id, padding: preset.padding })
                  }
                  className={
                    'group relative flex flex-col items-center gap-1.5 rounded-lg border p-2 transition ' +
                    (active
                      ? 'border-accent/70 ring-1 ring-accent/30'
                      : 'border-panel-border hover:border-panel-hover')
                  }
                >
                  <span
                    className="h-9 w-full rounded-md ring-1 ring-white/10"
                    style={{ background: swatchFor(preset, settings) }}
                  />
                  <span className="text-[10.5px] leading-tight text-ink-soft">
                    {preset.name}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="pt-0.5">
            <Toggle
              checked={settings.showBackground}
              onChange={(v) => update({ showBackground: v })}
              label="Show background"
            />
          </div>
          {!settings.showBackground && (
            <p className="text-[11px] text-ink-faint">
              Preview shows a transparency checkerboard; video exports as
              alpha .mov, images as transparent .png.
            </p>
          )}

          {/* Color picker only relevant for the solid preset. */}
          {currentPreset?.isSolid && (
            <Field label="Custom color">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.solidColor}
                  onChange={(e) => update({ solidColor: e.target.value })}
                  className="h-9 w-10 cursor-pointer rounded-lg border border-panel-border bg-panel-input"
                />
                <TextInput
                  value={settings.solidColor}
                  onChange={(v) => update({ solidColor: v })}
                  placeholder="#1e1e2e"
                />
              </div>
            </Field>
          )}

          {/* Two-stop gradient editor for the "Custom" preset. */}
          {currentPreset?.isCustomGradient && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Field label="From">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.gradientFrom}
                      onChange={(e) => update({ gradientFrom: e.target.value })}
                      className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-panel-border bg-panel-input"
                    />
                    <TextInput
                      value={settings.gradientFrom}
                      onChange={(v) => update({ gradientFrom: v })}
                    />
                  </div>
                </Field>
                <Field label="To">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.gradientTo}
                      onChange={(e) => update({ gradientTo: e.target.value })}
                      className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-panel-border bg-panel-input"
                    />
                    <TextInput
                      value={settings.gradientTo}
                      onChange={(v) => update({ gradientTo: v })}
                    />
                  </div>
                </Field>
              </div>
              <Field label="Angle" hint={`${settings.gradientAngle}°`}>
                <Slider
                  value={settings.gradientAngle}
                  onChange={(v) => update({ gradientAngle: v })}
                  min={GRADIENT_ANGLE.min}
                  max={GRADIENT_ANGLE.max}
                  step={5}
                  suffix="°"
                />
              </Field>
            </>
          )}

          <Field label="Padding" hint={`${settings.padding}px`}>
            <div className="mb-2 flex gap-1.5">
              {PADDING_PRESETS.map((v) => {
                const active = settings.padding === v
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => update({ padding: v })}
                    className={
                      'flex-1 rounded-md border py-1 text-[11.5px] font-medium transition ' +
                      (active
                        ? 'border-accent/70 bg-accent/20 text-ink'
                        : 'border-panel-border text-ink-faint hover:border-panel-hover hover:text-ink-soft')
                    }
                  >
                    {v}
                  </button>
                )
              })}
            </div>
            <Slider
              value={settings.padding}
              onChange={(v) => update({ padding: v })}
              min={PADDING.min}
              max={PADDING.max}
              step={2}
              suffix="px"
            />
          </Field>
        </Section>

        {/* ---- Code --------------------------------------------------------- */}
        <Section title="Code">
          <Field label="Language">
            <Select
              value={settings.language}
              onChange={(v) => update({ language: v })}
              options={LANGUAGES}
            />
          </Field>
          <Field label="Syntax theme">
            <Select
              value={settings.theme}
              onChange={(v) => update({ theme: v })}
              options={CODE_THEMES}
            />
          </Field>
          <Field label="Font">
            <Select
              value={settings.fontId}
              onChange={(v) => update({ fontId: v })}
              options={CODE_FONTS}
            />
          </Field>
          <Field label="Font size" hint={`${settings.fontSize}px`}>
            <Slider
              value={settings.fontSize}
              onChange={(v) => update({ fontSize: v })}
              min={11}
              max={30}
              suffix="px"
            />
          </Field>
          <Field label="Window title">
            <TextInput
              value={settings.title}
              onChange={(v) => update({ title: v })}
              placeholder="e.g. MAMANNNNNN"
            />
          </Field>
          <Field
            label="Text glow"
            hint={settings.glow > 0 ? `${settings.glow}px` : 'off'}
          >
            <Slider
              value={settings.glow}
              onChange={(v) => update({ glow: v })}
              min={GLOW.min}
              max={GLOW.max}
              suffix="px"
            />
          </Field>
          <div className="pt-0.5">
            <Toggle
              checked={settings.showLineNumbers}
              onChange={(v) => update({ showLineNumbers: v })}
              label="Show line numbers"
            />
          </div>
        </Section>

        {/* ---- Animation ---------------------------------------------------- */}
        <Section title="Animation">
          <Field label="Mode">
            <Segmented
              value={settings.animationMode}
              onChange={(v) => update({ animationMode: v })}
              options={ANIMATION_MODES}
            />
          </Field>
          <Field
            label={isCharMode ? 'Delay per character' : 'Delay per line'}
            hint={`${isCharMode ? settings.charSpeed : settings.lineSpeed}ms`}
          >
            <Slider
              value={isCharMode ? settings.charSpeed : settings.lineSpeed}
              onChange={(v) =>
                update(isCharMode ? { charSpeed: v } : { lineSpeed: v })
              }
              min={speed.min}
              max={speed.max}
              suffix="ms"
            />
          </Field>
        </Section>

        {/* ---- Export ------------------------------------------------------- */}
        <Section title="Export">
          <Field label="Format">
            <Segmented
              value={exportKind}
              onChange={setExportKind}
              options={[
                { id: 'video', name: 'Video' },
                { id: 'image', name: 'Image' }
              ]}
            />
          </Field>
          <Field label="Aspect ratio">
            <Select
              value={settings.aspectRatio}
              onChange={(v) => update({ aspectRatio: v })}
              options={ASPECT_RATIOS}
            />
          </Field>
          {exportKind === 'video' && (
            <Field label="Frame rate">
              <Segmented
                value={settings.fps}
                onChange={(v) => update({ fps: v })}
                options={[
                  { id: '30', name: '30 fps' },
                  { id: '60', name: '60 fps' }
                ]}
              />
            </Field>
          )}

          <Field label="Destination folder">
            <button
              type="button"
              onClick={exp.chooseFolder}
              disabled={isExporting}
              className="flex w-full items-center gap-2 rounded-lg border border-panel-border bg-panel-input px-3 py-2 text-left text-[12.5px] text-ink-soft transition hover:border-panel-hover disabled:opacity-60"
            >
              <svg className="h-4 w-4 shrink-0 text-ink-faint" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 5.5A1.5 1.5 0 013.5 4h4l1.5 2H16.5A1.5 1.5 0 0118 7.5v7a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 012 14.5v-9z" />
              </svg>
              <span className="truncate">{folderLabel}</span>
            </button>
          </Field>
        </Section>
      </div>

      {/* Export action + progress, pinned to the bottom. */}
      <div className="space-y-2 border-t border-panel-border p-3">
        {/* Progress bar (rendering frames, then encoding). */}
        {isExporting && (
          <div className="animate-[fadeIn_0.2s_ease]">
            <div className="mb-1 flex justify-between text-[11px] text-ink-faint">
              <span>
                {exp.phase === 'encoding'
                  ? exportKind === 'image'
                    ? 'Saving image…'
                    : 'Encoding video…'
                  : 'Rendering…'}
              </span>
              <span className="tabular-nums">{Math.round(exp.percent)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel-input">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-150"
                style={{ width: `${exp.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Result / error feedback. */}
        {exp.status === 'done' && (
          <button
            type="button"
            onClick={() => exp.showFile(exp.outputPath)}
            className="flex w-full animate-[fadeIn_0.25s_ease] items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-2 text-[12px] font-medium text-emerald-300 transition hover:bg-emerald-500/15"
          >
            ✓ Exported — reveal in folder
          </button>
        )}
        {exp.status === 'error' && (
          <p className="animate-[fadeIn_0.25s_ease] rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11.5px] text-red-300">
            {exp.error}
          </p>
        )}

        {/* Estimate of the resulting clip (video only — an image is instant). */}
        {!isExporting && exportKind === 'video' && estimateLabel && (
          <p className="text-center text-[11px] tabular-nums text-ink-faint">
            {estimateLabel}
          </p>
        )}

        <button
          type="button"
          onClick={() => onExport(exportKind)}
          disabled={!canExport}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-[13px] font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
          title={
            !exp.available
              ? 'Export is only available inside the desktop app'
              : !hasCode
                ? 'Paste some code first'
                : ''
          }
        >
          {isExporting && (
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
            </svg>
          )}
          {isExporting
            ? 'Exporting…'
            : exportKind === 'image'
              ? 'Export image'
              : 'Export video'}
        </button>
      </div>
    </aside>
  )
}
