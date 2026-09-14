// Web Audio synthesis and voice lifecycle. No DOM access.
const ChordAudio = (() => {
  let audioContext, masterGain;
  function initializeAudio(volume) {
    if (!audioContext) {
      audioContext = new AudioContext();
      masterGain = audioContext.createGain();
      masterGain.gain.value = (volume / 100) * 0.23;
      let limiter = audioContext.createDynamicsCompressor();
      limiter.threshold.value = -12;
      limiter.ratio.value = 8;
      masterGain.connect(limiter);
      limiter.connect(audioContext.destination);
    }
    return audioContext.resume();
  }
  // Independent phases reduce the synchronized swell of detuned oscillators.
  function createSupersawVoice(midi, t) {
    let envelope = audioContext.createGain(),
      filter = audioContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(5500, t);
    filter.Q.value = 0.55;
    filter.connect(envelope);
    envelope.connect(masterGain);
    envelope.gain.setValueAtTime(0, t);
    envelope.gain.linearRampToValueAtTime(0.3, t + 0.035);
    let oscillators = [];
    [-19, -12, -6, 0, 6, 12, 19].forEach((detune, i) => {
      let o = audioContext.createOscillator(),
        g = audioContext.createGain(),
        pan = audioContext.createStereoPanner();
      let phase = Math.random() * Math.PI * 2,
        real = new Float32Array(65),
        imag = new Float32Array(65);
      for (let h = 1; h < 65; h++) {
        real[h] = Math.sin(h * phase) / h;
        imag[h] = Math.cos(h * phase) / h;
      }
      o.setPeriodicWave(audioContext.createPeriodicWave(real, imag));
      o.frequency.value = 440 * 2 ** ((midi - 69) / 12);
      o.detune.value = detune;
      g.gain.value = 1 / 7;
      pan.pan.value = ((i - 3) / 3) * 0.8;
      o.connect(g);
      g.connect(pan);
      pan.connect(filter);
      o.start(t);
      oscillators.push(o);
    });
    return { envelope, oscillators, filter };
  }
  function createVoice(midi, t, sound) {
    if (sound === "supersaw") return createSupersawVoice(midi, t);
    let envelope = audioContext.createGain();
    envelope.connect(masterGain);
    envelope.gain.setValueAtTime(0, t);
    envelope.gain.linearRampToValueAtTime(0.36, t + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.13, t + 0.3);
    envelope.gain.exponentialRampToValueAtTime(0.018, t + 4);
    let oscillators = [];
    [1, 2, 3, 4, 6].forEach((h, j) => {
      let o = audioContext.createOscillator(),
        g = audioContext.createGain();
      o.type = "sine";
      o.frequency.value =
        440 * 2 ** ((midi - 69) / 12) * h * (1 + j * j * 0.00012);
      g.gain.value = [1, 0.35, 0.13, 0.06, 0.025][j];
      o.connect(g);
      g.connect(envelope);
      o.start(t);
      oscillators.push(o);
    });
    return { envelope, oscillators };
  }

  function releaseVoices(voices) {
    if (!audioContext) return;
    for (const voice of voices) {
      voice.envelope.gain.cancelAndHoldAtTime(audioContext.currentTime);
      voice.envelope.gain.setTargetAtTime(0, audioContext.currentTime, 0.12);
      voice.oscillators.forEach((oscillator) =>
        oscillator.stop(audioContext.currentTime + 0.9),
      );
      setTimeout(() => {
        voice.envelope.disconnect();
        if (voice.filter) voice.filter.disconnect();
      }, 1100);
    }
  }
  function setVolume(volume) {
    if (masterGain)
      masterGain.gain.setTargetAtTime(
        (volume / 100) * 0.23,
        audioContext.currentTime,
        0.02,
      );
  }
  return {
    initializeAudio,
    createVoice,
    releaseVoices,
    setVolume,
    currentTime: () => audioContext.currentTime,
  };
})();
