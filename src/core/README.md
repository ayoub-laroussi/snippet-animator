# /core — video export logic

This folder holds the framework-agnostic export pipeline (step 6):

- Frame-by-frame canvas rendering of the reveal animation.
- MP4 encoding via `ffmpeg-static` + `fluent-ffmpeg`, driven from the Electron
  main process over IPC.
- Optional transparent `.mov` (alpha) export with a solid-background fallback.

Kept separate from `/main` and `/renderer` so the encoding logic stays testable
and free of Electron/React concerns.
