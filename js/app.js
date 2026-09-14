// Progression discovery, transport, and performance UI. Audio stays in audio.js.
(() => {
  const $ = (id) => document.getElementById(id);
  const theory = ChordTheory;
  const shortlist = [
    "U01",
    "U02",
    "D04",
    "D08",
    "D18",
    "V01",
    "V02",
    "V03",
    "V04",
    "V06",
    "V07",
    "V10",
  ];
  const moodGroups = {
    Epic: ["epic", "expansive", "sweeping", "grandeur", "bold", "anthemic"],
    Dark: ["dark", "brooding", "ominous", "uncanny"],
    Hopeful: ["hopeful", "uplifting", "lift", "bright release", "triumphant"],
    Dreamy: ["atmospheric", "floating", "spacious", "mysterious", "suspended"],
    Tender: [
      "wistful",
      "melancholy",
      "bittersweet",
      "tender",
      "nostalgic",
      "intimate",
    ],
    Tense: [
      "tense",
      "urgency",
      "anticipation",
      "anticipatory",
      "expectant",
      "unresolved",
    ],
    Warm: ["warm", "mellow", "grounded", "settled", "satisfying"],
  };
  let favorites = new Set();
  try {
    favorites = new Set(
      JSON.parse(localStorage.getItem("chord-favorites") || "[]"),
    );
  } catch {}
  let collection = "cinematic",
    mood = "",
    current = ProgressionLibrary.find((p) => p.id === "U01");
  let free = false,
    selected = 0,
    looping = false,
    timer,
    generation = 0;
  let nextTime = 0,
    pending = null;
  const active = new Map(),
    shapes = new Map(),
    pins = {};
  const root = () => +$("root").value;
  const symbols = () =>
    free
      ? ["i", "ii°", "bIII", "iv", "v", "bVI", "bVII"]
      : current.progression.split("–");
  const chords = () => symbols().map(theory.parse);
  const shapeKey = (i) => (free ? "free" : current.id) + ":" + i;
  function shape(i) {
    const key = shapeKey(i);
    if (!shapes.has(key)) shapes.set(key, { inv: 0, oct: 0, spread: false });
    return shapes.get(key);
  }
  const name = (i) => theory.chordName(chords()[i], root());
  const pitches = (i) => theory.pitches(chords()[i], root(), shape(i));
  const duration = () =>
    (60000 / Math.max(40, Math.min(240, +$("tempo").value || 140))) *
    +$("beats").value;
  const pretty = (s) => s.replaceAll("b", "♭");
  function filtered() {
    const query = $("search").value.toLowerCase();
    return ProgressionLibrary.filter(
      (p) =>
        (collection === "all" ||
          (collection === "start"
            ? shortlist.includes(p.id)
            : collection === "cinematic"
              ? p.collection === "cinematic"
              : favorites.has(p.id))) &&
        (!mood || p.tags.some((tag) => moodGroups[mood].includes(tag))) &&
        `${p.name} ${p.tags.join(" ")} ${p.progression} ${p.id}`
          .toLowerCase()
          .includes(query),
    );
  }
  function renderLibrary() {
    const list = filtered();
    $("count").textContent = list.length;
    $("library").replaceChildren(
      ...list.map((p) => {
        const button = document.createElement("button");
        button.className = "library-item";
        button.setAttribute(
          "aria-pressed",
          String(!free && current.id === p.id),
        );
        button.innerHTML = `<span><strong>${p.name}</strong><small>${p.tags.join(" · ")}</small></span><span class="formula">${pretty(p.progression)}</span>${favorites.has(p.id) ? '<span class="star">★</span>' : ""}`;
        button.onclick = () => choose(p);
        return button;
      }),
    );
    if (!list.length)
      $("library").textContent =
        "No matches. Try another feeling or collection.";
    document
      .querySelectorAll("[data-collection]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(b.dataset.collection === collection),
        ),
      );
    document
      .querySelectorAll("[data-mood]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.mood === mood)),
      );
  }
  function load(p) {
    releaseAll();
    current = p;
    free = false;
    selected = 0;
    render();
  }
  function choose(p) {
    if (looping) {
      pending = p;
      $("status").textContent = `Next chord boundary → ${p.name}`;
    } else load(p);
  }
  function browse(delta) {
    const list = filtered();
    if (!list.length) return;
    let index = list.findIndex((p) => p.id === (pending || current).id);
    choose(list[(index + delta + list.length) % list.length]);
  }
  function render() {
    $("title").textContent = free ? "Play your own" : current.name;
    $("evidence").textContent = free
      ? "NATURAL MINOR · 7 DEGREES"
      : current.evidence;
    $("feeling").textContent = free
      ? "Hold a number. Follow your ear."
      : current.tags.join(" / ");
    $("arc").textContent = free ? "" : current.arc || "";
    $("favorite").hidden = free;
    $("favorite").textContent = favorites.has(current.id) ? "★" : "☆";
    $("favorite").setAttribute(
      "aria-pressed",
      String(favorites.has(current.id)),
    );
    $("explore").setAttribute("aria-pressed", String(!free));
    $("free").setAttribute("aria-pressed", String(free));
    $("play").disabled = free;
    $("source").replaceChildren(document.createTextNode(current.detail + " "));
    if (current.source) {
      const a = document.createElement("a");
      a.href = current.source;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = "Read source ↗";
      $("source").append(a);
    }
    $("steps").replaceChildren(
      ...chords().map((chord, i) => {
        const button = document.createElement("button");
        button.className = "step";
        button.dataset.step = i;
        button.innerHTML = `<kbd>${i + 1}</kbd><small>${pretty(chord.symbol)}</small><strong>${name(i)}</strong>`;
        button.onpointerdown = (e) => {
          e.preventDefault();
          button.setPointerCapture(e.pointerId);
          pause();
          releaseAll();
          play(i, "pointer" + e.pointerId);
        };
        button.onpointerup = (e) => release("pointer" + e.pointerId);
        button.onpointercancel = (e) => release("pointer" + e.pointerId);
        button.onkeydown = (e) => {
          if (e.key === "Enter" && !e.repeat) {
            e.preventDefault();
            pause();
            releaseAll();
            play(i, "enter");
          }
        };
        button.onkeyup = (e) => {
          if (e.key === "Enter") release("enter");
        };
        return button;
      }),
    );
    renderLibrary();
    feedback();
  }
  async function play(i, token) {
    if (i >= chords().length || active.has(token)) return;
    selected = i;
    const entry = { i, voices: [], notes: pitches(i), bass: [] };
    if ($("bass").checked)
      entry.bass = [36 + ((root() + (chords()[i].bass ?? chords()[i].r)) % 12)];
    active.set(token, entry);
    feedback();
    try {
      await ChordAudio.initializeAudio(+$("volume").value);
      if (active.get(token) !== entry) return;
      entry.voices = [...entry.bass, ...entry.notes].map((n) =>
        ChordAudio.createVoice(n, ChordAudio.currentTime(), $("sound").value),
      );
      $("status").textContent = `Playing ${name(i)}`;
    } catch {
      active.delete(token);
      pause();
      feedback();
      $("status").textContent =
        "Audio could not start. Click a chord to retry.";
    }
  }
  function release(token) {
    const entry = active.get(token);
    if (!entry) return;
    active.delete(token);
    ChordAudio.releaseVoices(entry.voices);
    feedback();
  }
  function releaseAll() {
    [...active.keys()].forEach(release);
  }
  function pause() {
    looping = false;
    generation++;
    clearTimeout(timer);
    pending = null;
    release("loop");
    transportFeedback();
  }
  function stop() {
    pause();
    releaseAll();
    $("status").textContent = "Stopped";
  }
  function transportFeedback() {
    $("play").innerHTML =
      `<kbd>Space</kbd> ${looping ? "Pause loop" : "Play loop"}`;
    $("play").setAttribute("aria-pressed", String(looping));
    $("position").textContent = looping
      ? `${selected + 1} / ${chords().length}`
      : "";
  }
  async function toggleLoop() {
    if (free) {
      hold();
      return;
    }
    if (looping) {
      pause();
      return;
    }
    releaseAll();
    looping = true;
    const run = ++generation;
    try {
      await ChordAudio.initializeAudio(+$("volume").value);
    } catch {
      pause();
      $("status").textContent = "Click a chord to enable audio.";
      return;
    }
    if (!looping || run !== generation) return;
    let step = 0;
    nextTime = performance.now();
    function tick() {
      if (!looping || run !== generation) return;
      releaseAll();
      if (pending) {
        const p = pending;
        pending = null;
        load(p);
        step = 0;
      }
      play(step, "loop");
      transportFeedback();
      step = (step + 1) % chords().length;
      nextTime = Math.max(nextTime, performance.now() - 50) + duration();
      timer = setTimeout(tick, Math.max(0, nextTime - performance.now()));
    }
    tick();
  }
  function hold() {
    pause();
    if (active.has("hold")) release("hold");
    else {
      releaseAll();
      play(selected, "hold");
    }
  }
  function stepThrough(delta) {
    pause();
    releaseAll();
    play((selected + delta + chords().length) % chords().length, "hold");
  }
  function retune() {
    const entries = [...active].map(([token, e]) => [token, e.i]);
    releaseAll();
    entries.forEach(([token, i]) => play(i, token));
    feedback();
  }
  function adjust(kind, delta) {
    const v = shape(selected);
    if (kind === "inv")
      v.inv =
        (v.inv + delta + theory.intervals[chords()[selected].quality].length) %
        theory.intervals[chords()[selected].quality].length;
    if (kind === "oct") v.oct = Math.max(-2, Math.min(2, v.oct + delta));
    if (kind === "spread") v.spread = !v.spread;
    retune();
  }
  function feedback() {
    const notes = new Set(),
      bass = new Set();
    active.forEach((e) => {
      e.notes.forEach((n) => notes.add(n));
      e.bass.forEach((n) => bass.add(n));
    });
    document.querySelectorAll(".pkey").forEach((k) => {
      k.classList.toggle("lit", notes.has(+k.dataset.midi));
      k.classList.toggle("low", bass.has(+k.dataset.midi));
    });
    const all = [...new Set([...notes, ...bass])]
      .sort((a, b) => a - b)
      .map(theory.noteName)
      .join(" · ");
    $("piano-notes").textContent = all || "No notes held";
    $("piano").setAttribute(
      "aria-label",
      "Piano keyboard. " + (all || "No notes held"),
    );
    document.querySelectorAll("[data-step]").forEach((b) => {
      b.classList.toggle("selected", +b.dataset.step === selected);
      b.classList.toggle(
        "active",
        [...active.values()].some((e) => e.i === +b.dataset.step),
      );
    });
    const v = shape(selected);
    $("selection").textContent =
      `${name(selected)} · ${["Root", "1st inv", "2nd inv", "3rd inv"][v.inv]} · Oct ${v.oct > 0 ? "+" : ""}${v.oct}`;
    $("spread").setAttribute("aria-pressed", String(v.spread));
    $("hold").textContent = active.has("hold") ? "Release" : "Hold";
    $("hold").setAttribute("aria-pressed", String(active.has("hold")));
  }
  function buildPiano() {
    const whiteCount = Array.from({ length: 85 }, (_, i) => i + 24).filter(
      (n) => ![1, 3, 6, 8, 10].includes(n % 12),
    ).length;
    const width = 100 / whiteCount;
    let count = 0;
    for (let n = 24; n <= 108; n++) {
      const black = [1, 3, 6, 8, 10].includes(n % 12),
        key = document.createElement("div");
      key.className = "pkey" + (black ? " black" : "");
      key.dataset.midi = n;
      key.textContent = theory.noteName(n);
      key.style.left = count * width - (black ? width * 0.31 : 0) + "%";
      key.style.width = width * (black ? 0.62 : 1) + "%";
      $("piano").append(key);
      if (!black) count++;
    }
  }
  function saveFavorites() {
    try {
      localStorage.setItem("chord-favorites", JSON.stringify([...favorites]));
    } catch {
      $("status").textContent =
        "Saved for this session; browser storage unavailable.";
    }
  }
  $("root").replaceChildren(
    ...theory.names.map((n, i) => new Option(n, i, false, i === 4)),
  );
  $("moods").replaceChildren(
    ...["", ...Object.keys(moodGroups)].map((m) => {
      const b = document.createElement("button");
      b.textContent = m || "Any feeling";
      b.dataset.mood = m;
      b.onclick = () => {
        mood = m;
        renderLibrary();
      };
      return b;
    }),
  );
  $("collections").onclick = (e) => {
    const b = e.target.closest("[data-collection]");
    if (b) {
      collection = b.dataset.collection;
      renderLibrary();
    }
  };
  $("search").oninput = renderLibrary;
  $("favorite").onclick = () => {
    favorites.has(current.id)
      ? favorites.delete(current.id)
      : favorites.add(current.id);
    saveFavorites();
    render();
  };
  $("explore").onclick = () => {
    stop();
    free = false;
    selected = 0;
    render();
  };
  $("free").onclick = () => {
    stop();
    free = true;
    selected = 0;
    render();
  };
  $("play").onclick = toggleLoop;
  $("stop").onclick = stop;
  $("previous").onclick = () => browse(-1);
  $("next").onclick = () => browse(1);
  $("hold").onclick = hold;
  $("invdown").onclick = () => adjust("inv", -1);
  $("invup").onclick = () => adjust("inv", 1);
  $("octdown").onclick = () => adjust("oct", -1);
  $("octup").onclick = () => adjust("oct", 1);
  $("spread").onclick = () => adjust("spread");
  $("root").onchange = () => {
    stop();
    render();
  };
  $("sound").onchange = retune;
  $("bass").onchange = retune;
  $("volume").oninput = () => ChordAudio.setVolume(+$("volume").value);
  $("tempo").onchange = () => {
    $("tempo").value = Math.max(40, Math.min(240, +$("tempo").value || 140));
  };
  ["a", "b"].forEach((slot) => {
    $("pin-" + slot).onclick = () => {
      if (free) return;
      pins[slot] = {
        id: current.id,
        shapes: chords().map((_, i) => ({ ...shape(i) })),
      };
      $("recall-" + slot).disabled = false;
      $("recall-" + slot).textContent =
        slot.toUpperCase() + " · " + current.name;
    };
    $("recall-" + slot).onclick = () => {
      const pin = pins[slot];
      pin.shapes.forEach((v, i) => shapes.set(pin.id + ":" + i, { ...v }));
      choose(ProgressionLibrary.find((p) => p.id === pin.id));
    };
  });
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
    const key = e.key.toLowerCase();
    if (/^[1-9]$/.test(key)) {
      e.preventDefault();
      if (!e.repeat && +key <= chords().length) {
        pause();
        release("hold");
        play(+key - 1, e.code);
      }
      return;
    }
    const actions = {
      " ": toggleLoop,
      arrowleft: () => browse(-1),
      arrowright: () => browse(1),
      "[": () => stepThrough(-1),
      "]": () => stepThrough(1),
      h: () => adjust("inv", -1),
      l: () => adjust("inv", 1),
      j: () => adjust("oct", -1),
      k: () => adjust("oct", 1),
      o: () => adjust("spread"),
      p: () => {
        $("sound").value = $("sound").value === "piano" ? "supersaw" : "piano";
        retune();
      },
      b: () => {
        $("bass").checked = !$("bass").checked;
        retune();
      },
    };
    if (actions[key]) {
      e.preventDefault();
      if (!e.repeat) actions[key]();
    }
  });
  document.addEventListener("keyup", (e) => release(e.code));
  window.addEventListener("blur", stop);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
  });
  buildPiano();
  render();
})();
