// Procedural Web Audio engine for Ganapati Modak Dash.
// All sounds are synthesized in-browser (no external files, works offline).
// Asset slots for future royalty-free audio are marked below.
//
// FUTURE AUDIO ASSET SLOTS (drop royalty-free files here and wire them up):
//   /public/audio/music_festival.mp3   -> background loop
//   /public/audio/dhol_loop.mp3        -> Dhol Rush layer
//   /public/audio/bells.mp3            -> temple bells accent

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.noiseBuffer = null;
    this.muted = false;
    this.musicOn = true;
    this.sfxOn = true;
    this._musicTimer = null;
    this._step = 0;
    this._intensity = 1;
    this._nextNoteTime = 0;
    this._tempo = 132;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.32;
    this.musicGain.connect(this.master);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.6;
    this.sfxGain.connect(this.master);

    // noise buffer for percussive / whoosh sounds
    const len = this.ctx.sampleRate * 1.0;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;
  }

  resume() {
    if (!this.ctx) this.init();
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.9;
  }
  setMusicOn(v) {
    this.musicOn = v;
    if (this.musicGain) this.musicGain.gain.value = v ? 0.32 : 0;
  }
  setSfxOn(v) {
    this.sfxOn = v;
    if (this.sfxGain) this.sfxGain.gain.value = v ? 0.6 : 0;
  }

  _osc(type, freq, t, dur, gain, dest, glideTo) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest || this.sfxGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  _noise(t, dur, gain, filterFreq, dest) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const flt = this.ctx.createBiquadFilter();
    flt.type = "bandpass";
    flt.frequency.value = filterFreq || 800;
    flt.Q.value = 0.9;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt);
    flt.connect(g);
    g.connect(dest || this.sfxGain);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  play(name, opt = {}) {
    if (!this.ctx || this.muted || !this.sfxOn) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case "collect": {
        const base = 880 + (opt.pitch || 0) * 40;
        this._osc("triangle", base, t, 0.16, 0.5, null, base * 2);
        this._osc("sine", base * 1.5, t + 0.02, 0.14, 0.3);
        break;
      }
      case "flower":
        this._osc("sine", 660, t, 0.2, 0.35, null, 990);
        break;
      case "jump":
        this._osc("sine", 320, t, 0.22, 0.4, null, 720);
        break;
      case "land":
        this._noise(t, 0.14, 0.5, 220);
        this._osc("sine", 140, t, 0.14, 0.35, null, 80);
        break;
      case "duck":
        this._osc("sine", 300, t, 0.14, 0.25, null, 180);
        break;
      case "nearmiss":
        this._noise(t, 0.35, 0.32, 1600);
        this._osc("sine", 1200, t, 0.3, 0.18, null, 400);
        break;
      case "hit":
        this._noise(t, 0.35, 0.7, 300);
        this._osc("sawtooth", 160, t, 0.3, 0.4, null, 60);
        break;
      case "combo": {
        const p = 700 + (opt.level || 1) * 60;
        this._osc("triangle", p, t, 0.14, 0.4, null, p * 1.6);
        break;
      }
      case "powerup":
        [523, 659, 784, 1046].forEach((f, i) =>
          this._osc("triangle", f, t + i * 0.06, 0.2, 0.4)
        );
        break;
      case "blessing":
        [392, 523, 659, 784, 1046, 1318].forEach((f, i) =>
          this._osc("sine", f, t + i * 0.05, 0.6, 0.34)
        );
        this._noise(t, 0.8, 0.15, 3000);
        break;
      case "bell":
        this._osc("sine", 1568, t, 0.9, 0.3, null, 1560);
        this._osc("sine", 2093, t, 0.7, 0.15);
        break;
      case "ui":
        this._osc("square", 520, t, 0.06, 0.25, null, 660);
        break;
      case "gameover":
        [523, 494, 440, 392, 349].forEach((f, i) =>
          this._osc("triangle", f, t + i * 0.13, 0.3, 0.4)
        );
        break;
      case "event":
        [440, 554, 659, 880].forEach((f, i) =>
          this._osc("sawtooth", f, t + i * 0.05, 0.25, 0.3)
        );
        this._noise(t, 0.5, 0.25, 900);
        break;
      default:
        break;
    }
  }

  startMusic() {
    if (!this.ctx || this._musicTimer) return;
    this._step = 0;
    this._nextNoteTime = this.ctx.currentTime + 0.1;
    const scheduler = () => {
      while (this._nextNoteTime < this.ctx.currentTime + 0.2) {
        this._scheduleStep(this._step, this._nextNoteTime);
        const beat = 60 / (this._tempo * this._intensity) / 2;
        this._nextNoteTime += beat;
        this._step = (this._step + 1) % 16;
      }
    };
    this._musicTimer = setInterval(scheduler, 40);
  }

  stopMusic() {
    if (this._musicTimer) {
      clearInterval(this._musicTimer);
      this._musicTimer = null;
    }
  }

  setIntensity(v) {
    this._intensity = Math.max(0.85, Math.min(1.6, v));
  }

  // simple festive step sequencer: dhol-like kick, tabla, and a bright melody
  _scheduleStep(step, t) {
    if (this.muted || !this.musicOn) return;
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
    // kick on every 4th
    if (step % 4 === 0) {
      this._osc("sine", 90, t, 0.18, 0.5, this.musicGain, 45);
    }
    // tabla tap
    if (step % 2 === 1) {
      this._noise(t, 0.08, 0.18, 1200, this.musicGain);
    }
    // melody
    const melody = [0, 2, 4, 3, 4, 5, 4, 2, 0, 2, 3, 2, 4, 3, 2, 0];
    const note = scale[melody[step] % scale.length];
    this._osc("triangle", note * 2, t, 0.22, 0.16, this.musicGain);
    if (step % 8 === 0) this._osc("sine", note, t, 0.4, 0.1, this.musicGain);
  }
}
