// Chord roots use major-referenced semitone offsets, independent of key.
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
  const intervals = {
    minor6: [0, 3, 7, 9],
    major: [0, 4, 7],
    minor: [0, 3, 7],
    dim: [0, 3, 6],
    maj7: [0, 4, 7, 11],
    m7: [0, 3, 7, 10],
    seven: [0, 4, 7, 10],
  };
  const suffix = {
    minor6: "m6",
    major: "",
    minor: "m",
    dim: "dim",
    maj7: "maj7",
    m7: "m7",
    seven: "7",
  };
  function parse(symbol) {
    const [upper, bassSymbol] = symbol.split("/");
    const match = upper.match(/^(b?)([ivIV]+)(maj7|add6|7|°)?$/);
    if (!match) throw new Error("Unknown chord: " + symbol);
    const degree = ["I", "II", "III", "IV", "V", "VI", "VII"].indexOf(
      match[2].toUpperCase(),
    );
    if (degree < 0) throw new Error("Unknown degree: " + symbol);
    const minor = match[2] === match[2].toLowerCase();
    const quality =
      match[3] === "add6"
        ? "minor6"
        : match[3] === "°"
          ? "dim"
          : match[3] === "maj7"
            ? "maj7"
            : match[3] === "7"
              ? minor
                ? "m7"
                : "seven"
              : minor
                ? "minor"
                : "major";
    return {
      symbol,
      r: ([0, 2, 4, 5, 7, 9, 11][degree] - (match[1] ? 1 : 0) + 12) % 12,
      quality,
      bass: bassSymbol ? parse(bassSymbol).r : null,
    };
  }
  const noteName = (n) =>
    names[((n % 12) + 12) % 12] + (Math.floor(n / 12) - 1);
  const chordName = (chord, root) =>
    names[(root + chord.r) % 12] +
    suffix[chord.quality] +
    (chord.bass === null ? "" : "/" + names[(root + chord.bass) % 12]);
  function pitches(chord, root, shape) {
    const base = 60 + ((root + chord.r) % 12) + shape.oct * 12;
    const notes = intervals[chord.quality].map((n) => base + n);
    for (let i = 0; i < shape.inv % notes.length; i++)
      notes.push(notes.shift() + 12);
    if (shape.spread) notes[1] += 12;
    return notes.sort((a, b) => a - b);
  }
  return { names, intervals, parse, noteName, chordName, pitches };
})();
