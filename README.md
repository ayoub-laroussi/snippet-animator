# Snippet Animator

A desktop app (Electron + React) for turning code snippets into stylish,
animated videos and images — perfect for TikTok/YouTube-style educational
content, ray.so-inspired code screenshots, and social posts.

## Features

- **Live, editable preview** — type code, edit the window title, and even
  drag-resize the code window directly inside the preview. No separate editor
  panel; what you see is what gets exported.
- **Syntax highlighting** via Shiki, with 14 built-in themes (VS Code Dark+,
  Dracula, Monokai, Nord, GitHub Dark, Tokyo Night, Night Owl, Solarized Dark,
  Material Darker, Catppuccin Mocha, Ayu Dark, Synthwave '84, Rosé Pine, One
  Dark Pro) and 12 languages (JS/TS/JSX, Python, Rust, Go, C#, Lua, HTML, CSS,
  JSON, Bash).
- **IDE-like editing** — Tab/Shift+Tab indent and outdent, Enter auto-indents
  based on the current language's convention.
- **Two reveal animations** — line-by-line (fade + slide) or
  character-by-character (typewriter), with adjustable speed.
- **Backgrounds** — 6 gradient presets, a fully custom two-stop gradient with
  angle control, a solid color option, or no background at all (transparent
  checkerboard preview, exports with alpha).
- **Auto-sizing window** — the code window always fits its longest line, with
  optional manual drag-to-stretch and a one-click reset back to auto.
- **Aspect-ratio-accurate preview** — the stage is boxed to the export
  resolution (16:9, 9:16, or 1:1), so framing and cropping are visible before
  you export, not just after.
- **Fast video export** — frames are streamed as raw pixels straight into
  ffmpeg (no intermediate PNGs or temp files), encoding to MP4 (H.264) or
  alpha-channel MOV.
- **Image export** — save a single fully-revealed frame as a PNG.
- **Settings persist** across restarts — the app never resets your work.

## Tech stack

Electron, Vite, React, Tailwind CSS, Shiki, fluent-ffmpeg + ffmpeg-static.

## Development

```bash
npm install
npm run dev        # start the app in development mode
npm run package     # build a Windows installer
```
