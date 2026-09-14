# Chord Explorer

A tiny, self-contained chord audition tool. Open `index.html` in a modern browser and click a chord to enable audio. No installation or build step required.

## Play

- Hold **1–6**, or hold a chord button, to play. Release to fade out.
- Switch between synthesized **Piano** and a stereo **Supersaw**.
- Choose E, F, F♯, G, or D minor.
- Toggle the low root note and adjust volume.
- Press **Escape** to stop all notes.
- Recent history shows the last 24 chord presses; it does not record audio or timing and resets on reload.

The six buttons map to i, VI, III, VII, iv, and v. Try **1 → 2 → 3 → 4** or **1 → 3 → 4 → 2**.

## How it works

HTML, CSS, and JavaScript live in one file. The Web Audio API generates every note locally with oscillators. No sample downloads, dependencies, analytics, or backend. The piano is a piano-like synthesized tone, not a sampled acoustic piano.

For local hosting, optionally run `python3 -m http.server 8768` and open http://localhost:8768.
