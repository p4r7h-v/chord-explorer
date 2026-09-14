// UI state, keyboard input, and visual feedback.
(() => {
  const $ = (id) => document.getElementById(id);
  const { chordDefinitions, getNoteName } = ChordTheory;
  let active = new Map(),
    order = [],
    selected = 0;
  const chordVoicings = chordDefinitions.map(() => ({
    inv: 0,
    oct: 0,
    spread: false,
  }));
  const root = () => +$("root").value;
  const getChordName = (i) => ChordTheory.getChordName(i, root());
  const getChordPitches = (i) =>
    ChordTheory.getChordPitches(i, root(), chordVoicings[i]);
  const getVoicingLabel = (i) => ChordTheory.getVoicingLabel(chordVoicings[i]);
  function renderChordPads() {
    $("chords").replaceChildren(
      ...chordDefinitions.map((d, i) => {
        let b = document.createElement("button");
        b.className = "chord";
        b.dataset.index = i;
        b.setAttribute("aria-label", `${i + 1}: ${getChordName(i)}`);
        b.innerHTML = `<span class="key">${i + 1}</span><span class="roman">${d.degree}</span><strong class="name">${getChordName(i)}</strong><span class="notes">${getChordPitches(i).map(getNoteName).join(" · ")}<br>${getVoicingLabel(i)}</span>`;
        b.onpointerdown = (e) => {
          e.preventDefault();
          b.setPointerCapture(e.pointerId);
          play(i, "pointer" + e.pointerId);
        };
        b.onpointerup = (e) => release("pointer" + e.pointerId);
        b.onpointercancel = (e) => release("pointer" + e.pointerId);
        b.onkeydown = (e) => {
          if (e.code === "Enter") {
            e.preventDefault();
            if (!e.repeat) play(i, "button" + i);
          }
        };
        b.onkeyup = (e) => {
          if (e.code === "Enter") {
            e.preventDefault();
            release("button" + i);
          }
        };
        return b;
      }),
    );
    updateSelectionDisplay();
  }
  function updateLabels() {
    document
      .querySelectorAll(".chord")
      .forEach(
        (b, i) =>
          (b.querySelector(".notes").innerHTML =
            getChordPitches(i).map(getNoteName).join(" · ") +
            "<br>" +
            getVoicingLabel(i)),
      );
    updateSelectionDisplay();
  }
  function adjust(kind, delta = 0) {
    let v = chordVoicings[selected];
    if (kind === "inv") v.inv = (v.inv + delta + 3) % 3;
    if (kind === "oct") v.oct = Math.max(-2, Math.min(2, v.oct + delta));
    if (kind === "spread") v.spread = !v.spread;
    retuneSelectedChord();
    updateLabels();
  }
  function retuneSelectedChord() {
    let tokens = [...active.entries()]
      .filter(([t, e]) => e.i === selected)
      .map(([t]) => t);
    for (let t of tokens) {
      release(t);
      play(selected, t, false);
    }
  }
  function latch() {
    if (active.has("latch")) release("latch");
    else play(selected, "latch", false);
    updateSelectionDisplay();
  }
  // A token identifies each held keyboard key, pointer, or latched chord.
  async function play(i, token, remember = true) {
    if (active.has(token)) return;
    if (selected !== i && active.has("latch")) release("latch");
    selected = i;
    updateSelectionDisplay();
    let entry = { i, voices: [] };
    active.set(token, entry);
    try {
      await ChordAudio.initializeAudio(+$("volume").value);
      if (active.get(token) !== entry) return;
      const t = ChordAudio.currentTime();
      let pitches = getChordPitches(i);
      if ($("bass").checked)
        pitches.unshift(36 + root() + chordDefinitions[i].r);
      entry.voices = pitches.map((n, j) =>
        ChordAudio.createVoice(n, t + j * 0.003, $("sound").value),
      );
      if (remember) order.push(getChordName(i) + " · " + getVoicingLabel(i));
      order = order.slice(-24);
      $("history").replaceChildren(
        ...order.map((x) => {
          let s = document.createElement("span");
          s.className = "chip";
          s.textContent = x;
          return s;
        }),
      );
      $("status").textContent =
        `Playing ${getChordName(i)} · ${pitches.map(getNoteName).join(" / ")}`;
      updateSelectionDisplay();
    } catch (e) {
      active.delete(token);
      $("status").textContent =
        "Audio could not start. Click a chord and try again.";
    }
  }
  function release(token) {
    let entry = active.get(token);
    if (!entry) return;
    active.delete(token);
    ChordAudio.releaseVoices(entry.voices);
    updateSelectionDisplay();
    if (!active.size) $("status").textContent = "Ready for the next chord.";
  }
  // Visual keyboard and sounding-note feedback.
  function buildPiano() {
    let whites = [];
    for (let n = 24; n <= 108; n++)
      if (![1, 3, 6, 8, 10].includes(n % 12)) whites.push(n);
    let width = 100 / whites.length;
    let count = 0;
    for (let n = 24; n <= 108; n++) {
      let black = [1, 3, 6, 8, 10].includes(n % 12),
        key = document.createElement("div");
      key.className = "pkey" + (black ? " black" : "");
      key.dataset.midi = n;
      key.getChordName = getNoteName(n);
      key.textContent = getNoteName(n);
      key.style.left =
        (black ? count * width - width * 0.31 : count * width) + "%";
      key.style.width = (black ? width * 0.62 : width) + "%";
      $("piano").append(key);
      if (!black) count++;
    }
  }
  function updatePianoHighlights() {
    let upper = new Set(),
      bass = new Set();
    for (let entry of active.values()) {
      getChordPitches(entry.i).forEach((n) => upper.add(n));
      if ($("bass").checked)
        bass.add(36 + root() + chordDefinitions[entry.i].r);
    }
    document.querySelectorAll(".pkey").forEach((k) => {
      let n = +k.dataset.midi;
      k.classList.toggle("lit", upper.has(n));
      k.classList.toggle("low", bass.has(n));
    });
    let notes = [...new Set([...upper, ...bass])].sort((a, b) => a - b);
    $("piano-notes").textContent = notes.length
      ? notes.map(getNoteName).join(" · ")
      : "No notes held";
    $("piano").setAttribute(
      "aria-label",
      "Piano keyboard. " +
        (notes.length
          ? "Playing " + notes.map(getNoteName).join(", ")
          : "No notes held."),
    );
  }
  function updateSelectionDisplay() {
    updatePianoHighlights();
    document.querySelectorAll(".chord").forEach((b, i) => {
      b.classList.toggle(
        "active",
        [...active.values()].some((e) => e.i === i),
      );
      b.classList.toggle("selected", i === selected);
    });
    $("selection").textContent =
      getChordName(selected) + " / " + getVoicingLabel(selected);
    $("latch").innerHTML =
      "<kbd>Space</kbd> " + (active.has("latch") ? "Release" : "Hold");
    $("latch").setAttribute("aria-pressed", String(active.has("latch")));
    $("spread").setAttribute(
      "aria-pressed",
      String(chordVoicings[selected].spread),
    );
  }
  function stop() {
    [...active.keys()].forEach(release);
  }
  // Ignore shortcuts while editing controls or using browser modifier keys.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      stop();
      return;
    }
    if (
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)
    )
      return;
    let k = e.key.toLowerCase();
    if (/^[1-7]$/.test(k)) {
      e.preventDefault();
      if (!e.repeat) play(+k - 1, e.code);
      return;
    }
    if (["h", "l", "j", "k", "o", "b", "p", " "].includes(k)) {
      e.preventDefault();
      if (e.repeat) return;
      if (k === "h" || k === "l") adjust("inv", k === "h" ? -1 : 1);
      if (k === "j" || k === "k") adjust("oct", k === "j" ? -1 : 1);
      if (k === "o") adjust("spread");
      if (k === " ") latch();
      if (k === "b") {
        $("bass").checked = !$("bass").checked;
        retuneSelectedChord();
      }
      if (k === "p") {
        $("sound").value = $("sound").value === "piano" ? "supersaw" : "piano";
        retuneSelectedChord();
      }
    }
  });
  document.addEventListener("keyup", (e) => release(e.code));
  window.addEventListener("blur", stop);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
  });
  $("invdown").onclick = () => adjust("inv", -1);
  $("invup").onclick = () => adjust("inv", 1);
  $("octdown").onclick = () => adjust("oct", -1);
  $("octup").onclick = () => adjust("oct", 1);
  $("spread").onclick = () => adjust("spread");
  $("latch").onclick = latch;
  $("bass").onchange = retuneSelectedChord;
  $("stop").onclick = stop;
  $("clear").onclick = () => {
    order = [];
    $("history").replaceChildren();
  };
  $("root").onchange = () => {
    stop();
    renderChordPads();
    $("status").textContent =
      "Key changed. Earlier chord names remain in your history.";
  };
  $("sound").onchange = () => {
    stop();
    $("status").textContent =
      $("sound").value === "supersaw"
        ? "Supersaw ready. Hold a chord to hear it sustain."
        : "Piano ready.";
  };
  $("volume").oninput = () => ChordAudio.setVolume(+$("volume").value);
  buildPiano();
  renderChordPads();
  $("history").replaceChildren(
    ...order.map((x) => {
      let s = document.createElement("span");
      s.className = "chip";
      s.textContent = x;
      return s;
    }),
  );
})();
