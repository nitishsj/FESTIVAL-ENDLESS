// Local leaderboard using localStorage. No backend.
const KEY = "ganapati_modak_dash_v1";

const DEFAULT = {
  bestScore: 0,
  bestCombo: 0,
  bestDistance: 0,
  totalModaks: 0,
  gamesPlayed: 0,
};

export const Storage = {
  get() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...DEFAULT };
      return { ...DEFAULT, ...JSON.parse(raw) };
    } catch (e) {
      return { ...DEFAULT };
    }
  },
  save(stats) {
    try {
      localStorage.setItem(KEY, JSON.stringify(stats));
    } catch (e) {}
  },
  // returns { stats, isNewBest }
  submit(run) {
    const s = this.get();
    const isNewBest = run.score > s.bestScore;
    const next = {
      bestScore: Math.max(s.bestScore, run.score),
      bestCombo: Math.max(s.bestCombo, run.combo),
      bestDistance: Math.max(s.bestDistance, run.distance),
      totalModaks: s.totalModaks + (run.modaks || 0),
      gamesPlayed: s.gamesPlayed + 1,
    };
    this.save(next);
    return { stats: next, isNewBest };
  },
  getSettings() {
    try {
      const raw = localStorage.getItem(KEY + "_settings");
      return raw
        ? JSON.parse(raw)
        : { quality: "auto", music: true, sfx: true, touchButtons: true };
    } catch (e) {
      return { quality: "auto", music: true, sfx: true, touchButtons: true };
    }
  },
  saveSettings(s) {
    try {
      localStorage.setItem(KEY + "_settings", JSON.stringify(s));
    } catch (e) {}
  },
};
