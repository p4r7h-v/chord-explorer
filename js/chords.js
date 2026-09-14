// Pure music theory helpers. Loaded before app.js.
const ChordTheory = (() => {
  const names = [
    "C",
    "D♭",
    "D",
    "E♭",
    "E",
    "F",
    "F♯",
    "G",
    "A♭",
    "A",
    "B♭",
    "B",
  ];
  // Natural-minor triads; offsets are semitones above the scale root.
  const chordDefinitions = [
    { r: 0, q: "m", degree: "i", triad: [0, 3, 7] },
    { r: 2, q: "dim", degree: "ii°", triad: [0, 3, 6] },
    { r: 3, q: "", degree: "III", triad: [0, 4, 7] },
    { r: 5, q: "m", degree: "iv", triad: [0, 3, 7] },
    { r: 7, q: "m", degree: "v", triad: [0, 3, 7] },
    { r: 8, q: "", degree: "VI", triad: [0, 4, 7] },
    { r: 10, q: "", degree: "VII", triad: [0, 4, 7] },
  ];
  const getNoteName = (n) => names[(n + 120) % 12] + (Math.floor(n / 12) - 1);
  // Build upper voices independently from the optional bass root.
  function getChordPitches(i, rootNote, voicing) {
    let d = chordDefinitions[i],
      v = voicing,
      base = 60 + rootNote + d.r;
    while (base > 71) base -= 12;
    let notes = d.triad.map((n) => base + n + v.oct * 12);
    for (let j = 0; j < v.inv; j++) notes.push(notes.shift() + 12);
    if (v.spread) notes[1] += 12;
    return notes.sort((a, b) => a - b);
  }
  function getVoicingLabel(voicing) {
    let v = voicing;
    return (
      ["Root", "1st inversion", "2nd inversion"][v.inv] +
      (v.spread ? " · Spread" : "") +
      " · Oct " +
      (v.oct >= 0 ? "+" : "") +
      v.oct
    );
  }

  function getChordName(i, rootNote) {
    return (
      names[(rootNote + chordDefinitions[i].r) % 12] + chordDefinitions[i].q
    );
  }
  return {
    chordDefinitions,
    getChordPitches,
    getVoicingLabel,
    getNoteName,
    getChordName,
  };
})();
