// ---------------------------------------------------------------------------
// Bundled fonts (self-hosted via @fontsource — no network / cloud calls).
//
// We load weight 400 (regular) and 600 (for bold syntax tokens) for every code
// font, so the "bold" fontStyle from Shiki renders as a real weight instead of
// a synthesized faux-bold. Inter powers the neutral control UI.
//
// JetBrains Mono, Fira Code and Cascadia Code ship programming ligatures; they
// are enabled through `font-feature-settings` in index.css.
// ---------------------------------------------------------------------------

// Code fonts — load 400 (regular) plus 500/600/700 so the user-selected bold
// weight renders as a genuine weight instead of a synthesized faux-bold.
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/600.css'
import '@fontsource/jetbrains-mono/700.css'
import '@fontsource/fira-code/400.css'
import '@fontsource/fira-code/500.css'
import '@fontsource/fira-code/600.css'
import '@fontsource/fira-code/700.css'
import '@fontsource/geist-mono/400.css'
import '@fontsource/geist-mono/500.css'
import '@fontsource/geist-mono/600.css'
import '@fontsource/geist-mono/700.css'
import '@fontsource/cascadia-code/400.css'
import '@fontsource/cascadia-code/500.css'
import '@fontsource/cascadia-code/600.css'
import '@fontsource/cascadia-code/700.css'

// UI font
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
