import { useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// useReveal — a single time-based animation clock.
//
// Rather than scheduling one timer per line/character (which drifts and is hard
// to keep in sync with an exported video), we run ONE requestAnimationFrame
// loop that reports `elapsed` milliseconds within the current cycle. The
// renderer derives exactly which lines/characters are visible from `elapsed`.
//
// This "elapsed → visible state" is a pure function of time, which is precisely
// what the frame-by-frame exporter (step 6) needs to reproduce the preview
// deterministically (true WYSIWYG).
//
// The clock plays `duration` ms, holds the finished frame for `pause` ms, then
// loops back to 0 — matching the spec's "preview qui rejoue en boucle".
// ---------------------------------------------------------------------------

/**
 * @param {object}  opts
 * @param {number}  opts.duration   Total reveal duration in ms.
 * @param {number}  opts.pause      Hold time on the completed frame before looping.
 * @param {*}       opts.restartKey Any value; changing it restarts the cycle from 0.
 * @param {boolean} [opts.playing]  When false the clock is pinned at full reveal.
 * @returns {number} elapsed ms, clamped to [0, duration].
 */
export function useReveal({ duration, pause, restartKey, playing = true }) {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(0)

  useEffect(() => {
    // When paused, show the fully revealed frame and stop the loop.
    if (!playing) {
      setElapsed(duration)
      return
    }

    let raf = 0
    const cycle = duration + pause
    startRef.current = performance.now()

    const tick = (now) => {
      let t = now - startRef.current
      if (t >= cycle) {
        // Start a new loop, keeping any overshoot so timing stays smooth.
        startRef.current = now - (t - cycle)
        t = t - cycle
      }
      // During the trailing `pause` we clamp to `duration` (frozen full frame).
      setElapsed(Math.min(t, duration))
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // Restart whenever timing or content (restartKey) changes.
  }, [duration, pause, restartKey, playing])

  return elapsed
}
