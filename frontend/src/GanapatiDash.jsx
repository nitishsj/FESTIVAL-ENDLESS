import { useEffect, useRef, useState, useCallback } from "react";
import { Game } from "./game/Game";
import { AudioEngine } from "./game/audio";
import { Storage } from "./game/storage";
import {
  Play,
  RotateCcw,
  Home,
  Trophy,
  Settings as SettingsIcon,
  HelpCircle,
  Volume2,
  VolumeX,
  Sparkles,
  Heart,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import "./game/game.css";

function autoQuality() {
  const cores = navigator.hardwareConcurrency || 4;
  const mobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (mobile) return cores >= 8 ? "medium" : "low";
  if (cores >= 8) return "high";
  if (cores >= 4) return "medium";
  return "low";
}

const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(
  typeof navigator !== "undefined" ? navigator.userAgent : ""
);

export default function GanapatiDash() {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const audioRef = useRef(null);
  const [screen, setScreen] = useState("loading");
  const [hud, setHud] = useState({
    score: 0,
    distance: 0,
    combo: 0,
    lives: 3,
    blessing: 0,
    blessingReady: false,
    blessingActive: false,
    multiplier: 1,
    golden: false,
    event: null,
    stage: "",
  });
  const [finalStats, setFinalStats] = useState(null);
  const [record, setRecord] = useState(Storage.get());
  const [isNewBest, setIsNewBest] = useState(false);
  const [toast, setToast] = useState(null);
  const [stageBanner, setStageBanner] = useState(null);
  const [panel, setPanel] = useState(null); // howto | scores | settings
  const [settings, setSettings] = useState(Storage.getSettings());
  const toastId = useRef(0);

  const showToast = useCallback((text, cls) => {
    toastId.current++;
    setToast({ text, cls, id: toastId.current });
  }, []);

  // build engine
  useEffect(() => {
    const audio = new AudioEngine();
    audioRef.current = audio;
    audio.init();
    audio.setMusicOn(settings.music);
    audio.setSfxOn(settings.sfx);

    const quality = settings.quality === "auto" ? autoQuality() : settings.quality;

    const game = new Game(containerRef.current, {
      audio,
      quality,
      onHud: (h) => setHud(h),
      onState: (s, data) => {
        if (s === "gameover") {
          const res = Storage.submit({
            score: data.score,
            combo: data.combo,
            distance: data.distance,
            modaks: data.modaks,
          });
          setFinalStats(data);
          setRecord(res.stats);
          setIsNewBest(res.isNewBest);
        }
        setScreen(s);
      },
      onEvent: (type, data) => {
        switch (type) {
          case "NEARMISS":
            showToast("NEAR MISS!  +25", "toast-near");
            break;
          case "COMBO":
            showToast(`COMBO x${data.combo}`, "toast-combo");
            break;
          case "GOLDEN":
            showToast("GOLDEN MODAK!  2x SCORE", "toast-gold");
            break;
          case "BLESSING":
            showToast("✦ GANESHA'S BLESSING ✦", "toast-bless");
            break;
          case "GOLDEN_END":
            break;
          case "HIT":
            showToast("OUCH!", "toast-hit");
            break;
          case "EVENT":
            showToast(
              data.type === "DHOL" ? "🥁 DHOL RUSH!" : "🌼 FLOWER SHOWER!",
              "toast-event"
            );
            break;
          case "STAGE":
            setStageBanner(data.name);
            setTimeout(() => setStageBanner(null), 3200);
            break;
          default:
            break;
        }
      },
    });
    gameRef.current = game;
    setTimeout(() => setScreen("menu"), 600);

    return () => game.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // auto-hide toast
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 1100);
    return () => clearTimeout(id);
  }, [toast]);

  // input handling
  useEffect(() => {
    const onKey = (e) => {
      const g = gameRef.current;
      if (!g) return;
      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          g.moveLeft();
          break;
        case "ArrowRight":
        case "d":
        case "D":
          g.moveRight();
          break;
        case "ArrowUp":
        case "w":
        case "W":
        case " ":
          e.preventDefault();
          g.jump();
          break;
        case "ArrowDown":
        case "s":
        case "S":
          g.duck();
          break;
        case "e":
        case "E":
          g.activateBlessing();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // swipe
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let sx = 0,
      sy = 0,
      st = 0,
      active = false;
    const onStart = (e) => {
      const t = e.touches[0];
      sx = t.clientX;
      sy = t.clientY;
      st = Date.now();
      active = true;
    };
    const onMove = (e) => {
      if (screen === "playing") e.preventDefault();
    };
    const onEnd = (e) => {
      if (!active) return;
      active = false;
      const g = gameRef.current;
      if (!g) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      const dist = Math.max(adx, ady);
      if (dist < 24) return; // tap, ignore
      if (adx > ady) {
        if (dx > 0) g.moveRight();
        else g.moveLeft();
      } else {
        if (dy < 0) g.jump();
        else g.duck();
      }
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, [screen]);

  const startGame = () => {
    audioRef.current?.resume();
    gameRef.current?.startRun();
    setPanel(null);
  };
  const backToMenu = () => {
    gameRef.current?.toMenu();
    setPanel(null);
  };

  const updateSettings = (next) => {
    const merged = { ...settings, ...next };
    setSettings(merged);
    Storage.saveSettings(merged);
    if (next.music !== undefined) audioRef.current?.setMusicOn(next.music);
    if (next.sfx !== undefined) audioRef.current?.setSfxOn(next.sfx);
    if (next.quality !== undefined) {
      const q = next.quality === "auto" ? autoQuality() : next.quality;
      gameRef.current?.setQuality(q);
    }
  };

  return (
    <div className="gmd-root" data-testid="game-root">
      <div ref={containerRef} className="gmd-canvas" data-testid="game-canvas" />

      {/* subtle vignette + top glow */}
      <div className="gmd-vignette" />

      {/* ===== HUD ===== */}
      {screen === "playing" && (
        <div className="gmd-hud" data-testid="hud">
          <div className="hud-top-left">
            <div className="hud-panel">
              <div className="hud-score" data-testid="hud-score">
                {hud.score.toLocaleString()}
              </div>
              <div className="hud-sub" data-testid="hud-distance">
                {hud.distance} m
              </div>
            </div>
            {hud.golden && (
              <div className="hud-badge gold" data-testid="hud-golden">
                2× GOLDEN
              </div>
            )}
            {hud.multiplier > 1 && !hud.golden && (
              <div className="hud-badge">{hud.multiplier}×</div>
            )}
          </div>

          <div className="hud-top-center">
            {hud.combo > 1 && (
              <div
                key={hud.combo}
                className="hud-combo"
                data-testid="hud-combo"
              >
                x{hud.combo}
                <span>COMBO</span>
              </div>
            )}
            {hud.event && (
              <div className={`hud-event ${hud.event === "DHOL" ? "ev-dhol" : "ev-flower"}`}>
                {hud.event === "DHOL" ? "DHOL RUSH" : "FLOWER SHOWER"}
              </div>
            )}
          </div>

          <div className="hud-top-right">
            <div className="hud-lives" data-testid="hud-lives">
              {[0, 1, 2].map((i) => (
                <Heart
                  key={i}
                  size={26}
                  className={i < hud.lives ? "life on" : "life off"}
                  fill={i < hud.lives ? "#ff5577" : "none"}
                />
              ))}
            </div>
            <div className="hud-stage">{hud.stage}</div>
          </div>

          <div className="hud-bottom">
            <div className="blessing-wrap" data-testid="blessing-meter">
              <div className="blessing-label">
                <Sparkles size={16} /> GANESHA'S BLESSING
              </div>
              <div className="blessing-bar">
                <div
                  className={`blessing-fill ${hud.blessingActive ? "active" : ""}`}
                  style={{ width: `${hud.blessing}%` }}
                />
              </div>
              {hud.blessingReady && (
                <button
                  className="blessing-btn"
                  data-testid="blessing-activate"
                  onClick={() => gameRef.current?.activateBlessing()}
                >
                  ACTIVATE (E)
                </button>
              )}
            </div>
          </div>

          {/* mobile touch controls */}
          {isMobile && settings.touchButtons && (
            <div className="touch-controls" data-testid="touch-controls">
              <div className="touch-row">
                <button
                  className="tc-btn"
                  data-testid="btn-left"
                  onTouchStart={() => gameRef.current?.moveLeft()}
                >
                  <ChevronLeft size={30} />
                </button>
                <div className="tc-mid">
                  <button
                    className="tc-btn up"
                    data-testid="btn-jump"
                    onTouchStart={() => gameRef.current?.jump()}
                  >
                    <ChevronUp size={30} />
                  </button>
                  <button
                    className="tc-btn down"
                    data-testid="btn-duck"
                    onTouchStart={() => gameRef.current?.duck()}
                  >
                    <ChevronDown size={30} />
                  </button>
                </div>
                <button
                  className="tc-btn"
                  data-testid="btn-right"
                  onTouchStart={() => gameRef.current?.moveRight()}
                >
                  <ChevronRight size={30} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== transient toast ===== */}
      {toast && screen === "playing" && (
        <div key={toast.id} className={`gmd-toast ${toast.cls}`} data-testid="game-toast">
          {toast.text}
        </div>
      )}

      {/* ===== stage banner ===== */}
      {stageBanner && (
        <div className="stage-banner" data-testid="stage-banner">
          <span>STAGE</span>
          {stageBanner}
        </div>
      )}

      {/* ===== LOADING ===== */}
      {screen === "loading" && (
        <div className="gmd-overlay center" data-testid="loading-screen">
          <div className="loader-om">ॐ</div>
          <div className="loader-text">Preparing the celebration…</div>
        </div>
      )}

      {/* ===== MAIN MENU ===== */}
      {screen === "menu" && (
        <div className="gmd-overlay menu" data-testid="main-menu">
          <div className="menu-content">
            <div className="menu-title">
              <span className="t1">GANAPATI</span>
              <span className="t2">MODAK DASH</span>
              <span className="t-sub">A joyful Ganesh Chaturthi run</span>
            </div>
            <div className="menu-buttons">
              <button className="btn btn-primary" data-testid="btn-play" onClick={startGame}>
                <Play size={22} fill="currentColor" /> PLAY
              </button>
              <button className="btn btn-ghost" data-testid="btn-howto" onClick={() => setPanel("howto")}>
                <HelpCircle size={20} /> HOW TO PLAY
              </button>
              <button className="btn btn-ghost" data-testid="btn-scores" onClick={() => setPanel("scores")}>
                <Trophy size={20} /> BEST SCORE
              </button>
              <button className="btn btn-ghost" data-testid="btn-settings" onClick={() => setPanel("settings")}>
                <SettingsIcon size={20} /> SETTINGS
              </button>
            </div>
            <div className="menu-best">
              <Trophy size={16} /> Best: {record.bestScore.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* ===== GAME OVER ===== */}
      {screen === "gameover" && finalStats && (
        <div className="gmd-overlay center" data-testid="gameover-screen">
          <div className="gameover-card">
            {isNewBest && (
              <div className="new-best" data-testid="new-best">
                ✦ NEW PERSONAL BEST! ✦
              </div>
            )}
            <h2 className="go-title">Run Complete</h2>
            <div className="go-stats">
              <div className="go-row"><span>Distance</span><b>{finalStats.distance} m</b></div>
              <div className="go-row"><span>Modaks Collected</span><b>{finalStats.modaks}</b></div>
              <div className="go-row"><span>Highest Combo</span><b>x{finalStats.combo}</b></div>
              <div className="go-row big"><span>Final Score</span><b>{finalStats.score.toLocaleString()}</b></div>
              <div className="go-row pb"><span>Personal Best</span><b>{record.bestScore.toLocaleString()}</b></div>
            </div>
            <div className="go-buttons">
              <button className="btn btn-primary" data-testid="btn-play-again" onClick={startGame}>
                <RotateCcw size={20} /> PLAY AGAIN
              </button>
              <button className="btn btn-ghost" data-testid="btn-main-menu" onClick={backToMenu}>
                <Home size={20} /> MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== PANELS ===== */}
      {panel && (
        <div className="gmd-overlay center panel-overlay" data-testid={`panel-${panel}`}>
          <div className="panel-card">
            <button className="panel-close" data-testid="panel-close" onClick={() => setPanel(null)}>
              <X size={22} />
            </button>
            {panel === "howto" && (
              <>
                <h3>How to Play</h3>
                <p className="panel-lead">Help Lord Ganesha dash through a grand Ganesh Chaturthi celebration with his companion Mushika!</p>
                <ul className="howto-list">
                  <li><b>Move</b> — A/D or ← → &nbsp;(swipe left/right)</li>
                  <li><b>Jump</b> — W / ↑ / Space &nbsp;(swipe up)</li>
                  <li><b>Duck</b> — S / ↓ &nbsp;(swipe down)</li>
                  <li><b>Blessing</b> — E &nbsp;(tap the meter when full)</li>
                  <li>🍬 Collect <b>Modaks</b> for score & combos</li>
                  <li>🌼 Collect <b>Marigolds</b> to charge the Blessing meter</li>
                  <li>✨ Grab the <b>Golden Modak</b> for 2× score</li>
                  <li>Dodge drums, carts & garlands — near misses earn bonus!</li>
                </ul>
              </>
            )}
            {panel === "scores" && (
              <>
                <h3>Local Records</h3>
                <div className="scores-grid">
                  <div className="score-cell"><span>Best Score</span><b>{record.bestScore.toLocaleString()}</b></div>
                  <div className="score-cell"><span>Highest Combo</span><b>x{record.bestCombo}</b></div>
                  <div className="score-cell"><span>Longest Distance</span><b>{record.bestDistance} m</b></div>
                  <div className="score-cell"><span>Total Modaks</span><b>{record.totalModaks}</b></div>
                  <div className="score-cell"><span>Runs Played</span><b>{record.gamesPlayed}</b></div>
                </div>
              </>
            )}
            {panel === "settings" && (
              <>
                <h3>Settings</h3>
                <div className="setting-row">
                  <span>Graphics Quality</span>
                  <div className="seg">
                    {["auto", "low", "medium", "high"].map((q) => (
                      <button
                        key={q}
                        data-testid={`quality-${q}`}
                        className={settings.quality === q ? "seg-btn on" : "seg-btn"}
                        onClick={() => updateSettings({ quality: q })}
                      >
                        {q.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="setting-row">
                  <span>Music</span>
                  <button
                    className="toggle"
                    data-testid="toggle-music"
                    onClick={() => updateSettings({ music: !settings.music })}
                  >
                    {settings.music ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    {settings.music ? "ON" : "OFF"}
                  </button>
                </div>
                <div className="setting-row">
                  <span>Sound Effects</span>
                  <button
                    className="toggle"
                    data-testid="toggle-sfx"
                    onClick={() => updateSettings({ sfx: !settings.sfx })}
                  >
                    {settings.sfx ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    {settings.sfx ? "ON" : "OFF"}
                  </button>
                </div>
                <div className="setting-row">
                  <span>On-screen Buttons (mobile)</span>
                  <button
                    className="toggle"
                    data-testid="toggle-touch"
                    onClick={() => updateSettings({ touchButtons: !settings.touchButtons })}
                  >
                    {settings.touchButtons ? "ON" : "OFF"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
