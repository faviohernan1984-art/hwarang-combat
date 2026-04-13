
import { useEffect, useMemo, useRef, useState } from "react";
import {
  onSnapshot,
  runTransaction,
  setDoc,
  getDoc,
  getDocs,
  query,
} from "firebase/firestore";
import { db, matchMetaRef, judgesColRef, judgeRef } from "./firebase";
import { QRCodeCanvas } from "qrcode.react";

if (typeof document !== "undefined" && !document.getElementById("winnerPulseStyle")) {
  const style = document.createElement("style");
  style.id = "winnerPulseStyle";
  style.innerHTML = `
    @keyframes winnerPulse {
      0% {
        transform: scale(1);
        filter: brightness(1);
      }
      100% {
        transform: scale(1.04);
        filter: brightness(1.35);
      }
    }
  `;
  document.head.appendChild(style);
}

const HONG = "Hong";
const CHONG = "Chong";
const MAX_JUDGES = 5;
const COMBAT_JUDGES = 4;
const BREAK_SECONDS = 30;

function getBaseURL() {
  return window.location.origin;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function vibrate(ms = 35) {
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch {}
}

let audioCtx = null;
function getAudioCtx() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

function playTone({
  frequency = 440,
  duration = 0.08,
  type = "square",
  gain = 0.03,
  sweepTo = null,
} = {}) {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state !== "running" && ctx.resume) ctx.resume();

    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    if (sweepTo) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(1, sweepTo),
        ctx.currentTime + duration
      );
    }

    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(g);
    g.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  } catch {}
}

function playButtonSound() {
  playTone({
    frequency: 720,
    duration: 0.05,
    type: "square",
    gain: 0.025,
    sweepTo: 620,
  });
}

function playStartAlarm() {
  playTone({ frequency: 700, duration: 0.12, type: "sawtooth", gain: 0.045 });
  setTimeout(() => playTone({ frequency: 950, duration: 0.12, type: "sawtooth", gain: 0.045 }), 140);
  setTimeout(() => playTone({ frequency: 1250, duration: 0.18, type: "sawtooth", gain: 0.05 }), 290);
}

function playEndAlarm() {
  playTone({ frequency: 900, duration: 0.12, type: "triangle", gain: 0.05 });
  setTimeout(() => playTone({ frequency: 700, duration: 0.14, type: "triangle", gain: 0.05 }), 160);
  setTimeout(() => playTone({ frequency: 500, duration: 0.2, type: "triangle", gain: 0.055 }), 340);
}

function playWinnerSound() {
  playTone({ frequency: 520, duration: 0.09, type: "square", gain: 0.04 });
  setTimeout(() => playTone({ frequency: 780, duration: 0.1, type: "square", gain: 0.04 }), 110);
  setTimeout(() => playTone({ frequency: 1040, duration: 0.18, type: "square", gain: 0.045 }), 240);
}

function tapFeedback({ vibrateMs = 30 } = {}) {
  vibrate(vibrateMs);
  playButtonSound();
}

function getBaseCombatant(label) {
  return {
    label,
    name: label.toUpperCase(),
    club: "",
  };
}

function GlobalAppStyle() {
  return (
    <style>{`
      html, body, #root {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: #000;
      }
      * { box-sizing: border-box; }
      body {
        font-family: Arial, sans-serif;
      }
      input, button, textarea, select {
        font-family: inherit;
      }

      @keyframes winnerPulse {
        0% {
          transform: scale(1);
          box-shadow: 0 0 0 rgba(255,255,255,0.0);
        }
        100% {
          transform: scale(1.02);
          box-shadow: 0 0 18px rgba(255,255,255,0.25);
        }
      }

    `}</style>
  );
}

function makeJudge(id) {
  return {
    id,
    hongPoints: 0,
    chongPoints: 0,
    history: [],
  };
}

function normalizeJudge(raw, id) {
  return {
    ...makeJudge(id),
    ...(raw || {}),
  };
}

function makeEmptyGoldenPoint() {
  return {
    active: false,
    mode: null,
    gpRound: 0,
    archive: null,
  };
}

function makeInitialMeta() {
  return {
    mode: "combat",

    config: {
      roundSeconds: 120,
      rounds: 2,
      breakSeconds: BREAK_SECONDS,
      medicalPreset: 300,
    },

    match: {
      round: 1,
      phase: "fight",
      status: "paused",
      timeLeft: 120,
      phaseStartedAt: null,
    },

    medicalPreset: 300,
    medicalActive: false,
    medicalSide: null,
    medicalRunning: false,
    medicalHong: 300,
    medicalChong: 300,
    medicalLast: 0,

    // compatibilidad temporal con lógica vieja
    round: 1,
    phase: "fight",
    status: "paused",
    pausedRemaining: 120,
    phaseStartedAt: null,

    hongWarnings: 0,
    chongWarnings: 0,
    hongFouls: 0,
    chongFouls: 0,

    hongLog: [],
    chongLog: [],

    hong: getBaseCombatant(HONG),
    chong: getBaseCombatant(CHONG),

    combatForcedWinner: null,
    publicSwapSides: false,
    presidentSwapSides: false,
    goldenPoint: makeEmptyGoldenPoint(),
    showResult: false,
    updatedAt: Date.now(),
  };
}


function ensureMetaShape(raw) {
  const base = makeInitialMeta();
  const current = raw || {};
  return {
    ...base,
    ...current,
    config: {
      ...base.config,
      ...(current.config || {}),
    },
    hong: {
      ...base.hong,
      ...(current.hong || {}),
    },
    chong: {
      ...base.chong,
      ...(current.chong || {}),
    },
    goldenPoint: {
      ...base.goldenPoint,
      ...(current.goldenPoint || {}),
    },
  };
}

function formatTime(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function ensureMedical(meta) {
  const preset = Math.min(300, Math.max(0, meta?.medicalPreset || 300));

  return {
    preset,
    active: meta?.medicalActive || false,
    side: meta?.medicalSide || null,
    running: meta?.medicalRunning || false,
    hong: meta?.medicalHong ?? preset,
    chong: meta?.medicalChong ?? preset,
    last: meta?.medicalLast || 0,
  };
}

function tickMedical(meta) {
  const m = ensureMedical(meta);
  if (!m.active || !m.running || !m.side) return meta;

  const now = Date.now();
  const diff = Math.floor((now - m.last) / 1000);
  if (diff <= 0) return meta;

  if (m.side === "hong") {
    const next = Math.max(0, m.hong - diff);
    return {
      ...meta,
      medicalHong: next,
      medicalLast: now,
      medicalRunning: next > 0,
      medicalActive: next > 0,
      medicalSide: next > 0 ? "hong" : null,
    };
  }

  if (m.side === "chong") {
    const next = Math.max(0, m.chong - diff);
    return {
      ...meta,
      medicalChong: next,
      medicalLast: now,
      medicalRunning: next > 0,
      medicalActive: next > 0,
      medicalSide: next > 0 ? "chong" : null,
    };
  }

  return meta;
}

function startMedical(meta, side) {
  const m = ensureMedical(meta);
  const now = Date.now();

  const remaining =
    side === "hong" ? m.hong : m.chong;

  return {
    ...meta,
    medicalActive: true,
    medicalRunning: true,
    medicalSide: side,
    medicalLast: now,
    medicalHong: side === "hong" ? remaining : m.hong,
    medicalChong: side === "chong" ? remaining : m.chong,
  };
}

function pauseMedical(meta) {
  const updated = tickMedical(meta);

  return {
    ...updated,
    medicalActive: false,
    medicalRunning: false,
    medicalSide: null,
    medicalLast: 0,
  };
}

function stopMedical(meta) {
  const current = ensureMedical(meta);

  return {
    ...meta,
    medicalActive: false,
    medicalRunning: false,
    medicalSide: null,
    medicalLast: 0,
    medicalHong: current.preset,
    medicalChong: current.preset,
  };
}

function getDerivedTime(meta, now = Date.now()) {
  if (!meta) return 0;
  if (meta.status !== "running" || !meta.phaseStartedAt) {
    return meta.pausedRemaining || 0;
  }
  const elapsed = Math.floor((now - meta.phaseStartedAt) / 1000);
  return Math.max(0, (meta.pausedRemaining || 0) - elapsed);
}

function syncLegacyClockFields(current) {
  if (!current.match) {
    current.match = {
      round: current.round ?? 1,
      phase: current.phase ?? "fight",
      status: current.status ?? "paused",
      timeLeft: current.pausedRemaining ?? current.config?.roundSeconds ?? 120,
      phaseStartedAt: current.phaseStartedAt ?? null,
    };
  }

  current.round = current.match.round;
  current.phase = current.match.phase;
  current.status = current.match.status;
  current.pausedRemaining = current.match.timeLeft;
  current.phaseStartedAt = current.match.phaseStartedAt;

  if (!current.config) current.config = {};
  if (current.config.medicalPreset == null && current.medicalPreset != null) {
    current.config.medicalPreset = current.medicalPreset;
  }
  if (current.medicalPreset == null && current.config.medicalPreset != null) {
    current.medicalPreset = current.config.medicalPreset;
  }

  return current;
}

function useClock(meta) {

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 300);
    return () => clearInterval(t);
  }, []);

  return getDerivedTime(meta, now);
}

function judgeNet(judge, meta) {
  const hongDiscount = Math.floor((meta.hongWarnings || 0) / 3);
  const chongDiscount = Math.floor((meta.chongWarnings || 0) / 3);
  return {
    hong: judge.hongPoints - hongDiscount,
    chong: judge.chongPoints - chongDiscount,
  };
}

function judgeVote(judge, meta) {
  if ((meta.hongFouls || 0) >= 3) return "chong";
  if ((meta.chongFouls || 0) >= 3) return "hong";
  const net = judgeNet(judge, meta);
  if (net.hong > net.chong) return "hong";
  if (net.chong > net.hong) return "chong";
  return "draw";
}

function summary(meta, judges) {
  const currentJudges = judges.slice(0, COMBAT_JUDGES);
  let hongVotes = 0;
  let chongVotes = 0;
  let draws = 0;

  currentJudges.forEach((j) => {
    const v = judgeVote(j, meta);
    if (v === "hong") hongVotes += 1;
    else if (v === "chong") chongVotes += 1;
    else draws += 1;
  });

  let winner = "en_curso";
  if ((meta.hongFouls || 0) >= 3) winner = "chong";
  else if ((meta.chongFouls || 0) >= 3) winner = "hong";
  else if (meta.phase === "finished") {
    if (meta.combatForcedWinner) winner = meta.combatForcedWinner;
    else if (hongVotes >= 2 && hongVotes > chongVotes) winner = "hong";
    else if (chongVotes >= 2 && chongVotes > hongVotes) winner = "chong";
    else winner = "draw";
  }

  return {
    hongVotes,
    chongVotes,
    draws,
    winner,
    hongDiscount: Math.floor((meta.hongWarnings || 0) / 3),
    chongDiscount: Math.floor((meta.chongWarnings || 0) / 3),
  };
}

function secondFoulWarning(meta) {
  const hongSecond = (meta.hongFouls || 0) === 2;
  const chongSecond = (meta.chongFouls || 0) === 2;

  if (hongSecond && chongSecond) {
    return "DOUBLE WARNING: Next grave foul = disqualification.";
  }
  if (hongSecond) {
    return "HONG WARNING: Next grave foul = disqualification.";
  }
  if (chongSecond) {
    return "CHONG WARNING: Next grave foul = disqualification.";
  }
  return "";
}

function preDecisionAdvantage(meta) {
  if ((meta.hongFouls || 0) >= 3 && !meta.showResult) {
    return "CHONG ADVANTAGE - DECISION PENDING";
  }
  if ((meta.chongFouls || 0) >= 3 && !meta.showResult) {
    return "HONG ADVANTAGE - DECISION PENDING";
  }
  return "";
}

function getDisplaySides(meta, context = "public") {
  const swap = context === "public" ? !!meta.publicSwapSides : !!meta.presidentSwapSides;

  const hong = {
    ...(meta.hong || getBaseCombatant(HONG)),
    pointsLabel: "hong",
    color: "hong",
    baseLabel: "HONG",
  };

  const chong = {
    ...(meta.chong || getBaseCombatant(CHONG)),
    pointsLabel: "chong",
    color: "chong",
    baseLabel: "CHONG",
  };

  if (!swap) {
    return {
      left: { ...chong, visualLabel: "CHONG" },
      right: { ...hong, visualLabel: "HONG" },
    };
  }

  return {
    left: { ...hong, visualLabel: "HONG" },
    right: { ...chong, visualLabel: "CHONG" },
  };
}

async function ensureInitialDocs() {
  const metaSnap = await getDoc(matchMetaRef);
  if (!metaSnap.exists()) {
    await setDoc(matchMetaRef, makeInitialMeta());
  }

  const existing = await getDocs(query(judgesColRef));
  const ids = new Set(existing.docs.map((d) => d.id));
  for (let i = 1; i <= MAX_JUDGES; i += 1) {
    if (!ids.has(String(i))) {
      await setDoc(judgeRef(i), makeJudge(i));
    }
  }
}

function useFightData() {
  const [meta, setMeta] = useState(null);
  const [judges, setJudges] = useState(
    Array.from({ length: MAX_JUDGES }, (_, i) => makeJudge(i + 1))
  );

  useEffect(() => {
  if (!meta?.medicalActive || !meta?.medicalRunning) return;

  const i = setInterval(() => {
    writeMeta((prev) => tickMedical(prev));
  }, 500);

  return () => clearInterval(i);
}, [meta?.medicalActive, meta?.medicalRunning]);
  
   useEffect(() => {
   ensureInitialDocs();

    const unsubMeta = onSnapshot(matchMetaRef, (snap) => {
      if (snap.exists()) setMeta(ensureMetaShape(snap.data())); else setMeta(makeInitialMeta());
    });

    const unsubJudges = onSnapshot(judgesColRef, (snap) => {
      const next = Array.from({ length: MAX_JUDGES }, (_, i) => makeJudge(i + 1));
      snap.docs.forEach((doc) => {
        const idx = Number(doc.id) - 1;
        if (idx >= 0 && idx < MAX_JUDGES) next[idx] = normalizeJudge(doc.data(), idx + 1);
      });
      setJudges(next);
    });

    return () => {
      unsubMeta();
      unsubJudges();
    };
  }, []);

  const writeMeta = async (mutator) => {
  const snap = await getDoc(matchMetaRef);
  const current = ensureMetaShape(snap.exists() ? snap.data() : makeInitialMeta());
  const draft = clone(current);
  const result = typeof mutator === "function" ? mutator(draft) : mutator;
  const next = ensureMetaShape(result ?? draft);
  next.updatedAt = Date.now();
  await setDoc(matchMetaRef, next);
};

  const writeJudge = async (id, mutator) => {
    const ref = judgeRef(id);
    const snap = await getDoc(ref);
    const current = snap.exists() ? normalizeJudge(snap.data(), id) : makeJudge(id);
    const draft = clone(current);
    const result = typeof mutator === "function" ? mutator(draft) : mutator;
    const next = result ?? draft;
    await setDoc(ref, next);
    return next;
  };

  const resetAll = async () => {
    await setDoc(matchMetaRef, makeInitialMeta());
    for (let i = 1; i <= MAX_JUDGES; i += 1) {
      await setDoc(judgeRef(i), makeJudge(i));
    }
  };

  return { meta, judges, writeMeta, writeJudge, resetAll };
}

function useRoute() {
  const [path, setPath] = useState(window.location.pathname || "/");

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname || "/");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = (p) => {
    window.history.pushState({}, "", p);
    setPath(p);
  };

  return { path, navigate };
}

const styles = {
  page: {
    background: "linear-gradient(180deg, #07111f 0%, #02060d 100%)",
    color: "white",
    width: "100%",
    height: "100%",
    minHeight: "100%",
    padding: 28,
    boxSizing: "border-box",
    fontFamily: "Arial, sans-serif",
  },
  frameBg: {
  background: "#020814",
  color: "white",
  height: "100vh",
  overflow: "hidden",
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  boxSizing: "border-box",
  fontFamily: "Arial, sans-serif",
},
  panel: {
    background: "#111",
    border: "1px solid #333",
    borderRadius: 16,
    padding: 16,
  },
  row: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  stat: {
    background: "#111",
    border: "1px solid #333",
    borderRadius: 14,
    padding: 16,
    minWidth: 180,
  },
  button: {
    padding: "14px 18px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
    boxShadow: "0 0 18px rgba(255,255,255,0.10), inset 0 0 12px rgba(255,255,255,0.05)",
    transition: "transform 0.08s ease, box-shadow 0.12s ease, filter 0.12s ease",
  },
  red: { background: "#b91c1c" },
  blue: { background: "#1d4ed8" },
  amber: { background: "#d97706" },
  green: { background: "#15803d" },
  purple: { background: "#a21caf" },
  gray: { background: "#444" },
  dangerRed: { background: "#7f1d1d" },
  dangerBlue: { background: "#1e3a8a" },
};

function Frame16x9({ children }) {
  const baseWidth = 1920;
  const baseHeight = 1080;
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const recalc = () => {
      const scaleX = window.innerWidth / baseWidth;
      const scaleY = window.innerHeight / baseHeight;
      setScale(Math.min(scaleX, scaleY));
    };
    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, []);

  return (
    <div style={styles.frameBg}>
      <div
        style={{
          width: baseWidth,
          height: baseHeight,
          position: "relative",
          background: "linear-gradient(180deg, #07111f 0%, #02060d 100%)",
          overflow: "hidden",
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function BrandHeaderLarge() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 30, marginBottom: 14 }}>
      <img src="/logo-universe.png" alt="Hwarang Universe" style={{ height: 220, maxWidth: 420, objectFit: "contain" }} />
      <img src="/logo-combat.png" alt="Hwarang Combat" style={{ height: 220, maxWidth: 420, objectFit: "contain" }} />
    </div>
  );
}

function BrandHeaderSmall() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14, margin: "8px 0 12px" }}>
      <img src="/logo-universe.png" alt="Hwarang Universe" style={{ height: 92, maxWidth: 240, objectFit: "contain" }} />
      <img src="/logo-combat.png" alt="Hwarang Combat" style={{ height: 92, maxWidth: 240, objectFit: "contain" }} />
    </div>
  );
}

function AppButton({ children, style = {}, onClick, feedback = "ui", ...props }) {
  const triggerFeedback = () => {
    if (feedback === "judge") tapFeedback();
    else if (feedback === "ui") playButtonSound();
    else if (feedback === "none") return;
  };

  return (
    <button
      {...props}
      onClick={(e) => {
        triggerFeedback();
        onClick?.(e);
      }}
      style={{ ...styles.button, ...style }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = "scale(0.985)";
        e.currentTarget.style.filter = "brightness(1.08)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.filter = "brightness(1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.filter = "brightness(1)";
      }}
    >
      {children}
    </button>
  );
}

function WinnerFullScreen({
  winner,
  zIndex = 50,
  onNextCombat,
  onResetTotal,
  onClose,
  mode = "public"
}) {
  const getBg = () => {
    if (winner === "hong") return "#8b0000";
    if (winner === "chong") return "#003a8c";
    return "#3b3b3b";
  };

  const getTitle = () => {
    if (winner === "hong") return "HONG WINNER";
    if (winner === "chong") return "CHONG WINNER";
    return "EMPATE";
  };

  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex,
        width: "min(1200px, 82vw)",
        minHeight: "340px",
        borderRadius: 28,
        background: getBg(),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "32px 28px 110px",
        color: "#fff",
        boxSizing: "border-box",
        boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
        pointerEvents: "auto",
        }}
    >
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontSize: 34,
            fontWeight: 800,
            letterSpacing: "0.16em",
            lineHeight: 1,
          }}
        >
          RESULTADO
        </div>

        <div
          style={{
            marginTop: 22,
            fontSize: "clamp(72px, 8vw, 150px)",
            fontWeight: 900,
            lineHeight: 0.92,
            animation: "winnerPulse 0.9s infinite alternate",
          }}
        >
          {getTitle()}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
          justifyContent: "center",
          width: "calc(100% - 40px)",
        }}
      >
        <AppButton style={styles.green} onClick={onNextCombat}>
          Next Combat
        </AppButton>

        <AppButton style={styles.red} onClick={onResetTotal}>
          Reset Total
        </AppButton>

        <AppButton style={styles.gray} onClick={onClose}>
          Cerrar
        </AppButton>
      </div>
    </div>
  );
}

function JudgePanel({ judge, onPoint, onUndo }) {
  const pointButton = (label, side, value, bg) => (
    <AppButton style={{ background: bg, minWidth: 130, fontSize: 22 }} onClick={() => onPoint(side, value)}>
      {label}
    </AppButton>
  );

  return (
    <div style={{ ...styles.panel, background: "#07111f", border: "1px solid #17304f" }}>
      <div style={{ fontWeight: 900, marginBottom: 16, fontSize: 28, textAlign: "center" }}>JUEZ {judge.id}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ ...styles.panel, background: "#2a0606", border: "1px solid #631010" }}>
          <div style={{ fontWeight: 900, marginBottom: 10, fontSize: 22 }}>{HONG}</div>
          <div style={{ fontSize: 54, fontWeight: 900, marginBottom: 16 }}>{judge.hongPoints}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {pointButton("+1", "hong", 1, "#991b1b")}
            {pointButton("+2", "hong", 2, "#b91c1c")}
            {pointButton("+3", "hong", 3, "#dc2626")}
          </div>
        </div>

        <div style={{ ...styles.panel, background: "#07172f", border: "1px solid #174a9c" }}>
          <div style={{ fontWeight: 900, marginBottom: 10, fontSize: 22 }}>{CHONG}</div>
          <div style={{ fontSize: 54, fontWeight: 900, marginBottom: 16 }}>{judge.chongPoints}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {pointButton("+1", "chong", 1, "#1e3a8a")}
            {pointButton("+2", "chong", 2, "#1d4ed8")}
            {pointButton("+3", "chong", 3, "#2563eb")}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <AppButton feedback="judge" style={{ ...styles.gray, boxShadow: "0 0 18px rgba(255,255,255,0.16)" }} onClick={onUndo}>Deshacer</AppButton>
      </div>
    </div>
  );
}

function JudgeReadOnlyCard({ judge, meta }) {
  const net = judgeNet(judge, meta);
  const vote = judgeVote(judge, meta);
  const { left, right } = getDisplaySides(meta, "president");

  const grossMap = {
    hong: judge.hongPoints,
    chong: judge.chongPoints,
  };

  const netMap = {
    hong: net.hong,
    chong: net.chong,
  };

  const renderJudgeSide = (fighter) => {
    const sideKey = fighter.pointsLabel;
    const isHongColor = fighter.color === "hong";

    return (
      <div
        style={{
          ...styles.panel,
          background: isHongColor ? "#2a0606" : "#07172f",
          border: isHongColor ? "1px solid #631010" : "1px solid #174a9c",
          padding: 10,
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: 6 }}>
          {fighter.visualLabel}
        </div>
        <div>
          Bruto: <strong>{grossMap[sideKey]}</strong>
        </div>
        <div>
          Neto: <strong>{netMap[sideKey]}</strong>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.panel}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 12,
          fontWeight: "bold",
        }}
      >
        <span>Juez {judge.id}</span>
        <span>
          Voto: {vote === "draw" ? "Empate" : vote === "hong" ? "Hong" : "Chong"}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        {renderJudgeSide(left)}
        {renderJudgeSide(right)}
      </div>
    </div>
  );
}

function QRSection() {
  const base = getBaseURL();

  const shortSide = Math.min(window.innerWidth, window.innerHeight);

  let judgeSize = 110;
  let centerSize = 125;
  let titleSize = 15;
  let gapSize = 12;
  let paddingSize = 8;

  if (shortSide >= 1400) {
    judgeSize = 170;
    centerSize = 190;
    titleSize = 20;
    gapSize = 20;
    paddingSize = 10;
  } else if (shortSide >= 1100) {
    judgeSize = 145;
    centerSize = 165;
    titleSize = 18;
    gapSize = 16;
    paddingSize = 9;
  } else if (shortSide >= 900) {
    judgeSize = 125;
    centerSize = 145;
    titleSize = 16;
    gapSize = 14;
    paddingSize = 8;
  }

  const box = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
    height: "100%",
  };

  const title = {
    fontSize: titleSize,
    fontWeight: 900,
    letterSpacing: "0.04em",
    textAlign: "center",
    lineHeight: 1.1,
  };

  const qrBox = {
    background: "white",
    padding: paddingSize,
    borderRadius: 14,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 6px 18px rgba(0,0,0,0.22)",
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        gap: gapSize,
        alignItems: "center",
        justifyItems: "center",
      }}
    >
      <div style={box}>
        <div style={title}>Juez 2</div>
        <div style={qrBox}>
          <QRCodeCanvas value={`${base}/judge/2`} size={judgeSize} />
        </div>
      </div>

      <div style={box}>
        <div style={title}>Presidente</div>
        <div style={qrBox}>
          <QRCodeCanvas value={`${base}/president`} size={centerSize} />
        </div>
      </div>

      <div style={box}>
        <div style={title}>Juez 3</div>
        <div style={qrBox}>
          <QRCodeCanvas value={`${base}/judge/3`} size={judgeSize} />
        </div>
      </div>

      <div style={box}>
        <div style={title}>Juez 1</div>
        <div style={qrBox}>
          <QRCodeCanvas value={`${base}/judge/1`} size={judgeSize} />
        </div>
      </div>

      <div style={box}>
        <div style={title}>Pantalla pública</div>
        <div style={qrBox}>
          <QRCodeCanvas value={`${base}/public`} size={centerSize} />
        </div>
      </div>

      <div style={box}>
        <div style={title}>Juez 4</div>
        <div style={qrBox}>
          <QRCodeCanvas value={`${base}/judge/4`} size={judgeSize} />
        </div>
      </div>
    </div>
  );
}

function Home({ navigate, meta }) {
  return (
    <Frame16x9>
      <div
        style={{
          ...styles.page,
          display: "grid",
          gridTemplateRows: "240px 120px 150px 1fr",
          alignContent: "start",
          gap: 14,
          padding: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <BrandHeaderLarge />
        </div>

        <div style={{ textAlign: "center", marginTop: -10 }}>
          <h1 style={{ margin: 0, fontSize: 58 }}>Hwarang Scoring Combat</h1>
          <p style={{ fontSize: 24, opacity: 0.9, marginTop: 10 }}>Elegí una pantalla</p>
        </div>

        <div
          style={{
            ...styles.panel,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.12)",
            padding: 16,
          }}
        >
          <div style={{ ...styles.row, gap: 14, justifyContent: "center" }}>
            <AppButton
              style={{ ...styles.green, boxShadow: "0 0 20px rgba(34,197,94,0.35)" }}
              onClick={() => navigate("/president")}
            >
              Presidente
            </AppButton>

            <AppButton
              style={{ ...styles.blue, boxShadow: "0 0 20px rgba(59,130,246,0.35)" }}
              onClick={() => navigate("/public")}
            >
              Pantalla pública
            </AppButton>

            {Array.from({ length: COMBAT_JUDGES }, (_, i) => i + 1).map((n) => (
              <AppButton
                key={n}
                style={{ ...styles.red, boxShadow: "0 0 20px rgba(239,68,68,0.35)" }}
                onClick={() => navigate(`/judge/${n}`)}
              >
                Juez {n}
              </AppButton>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "0.95fr 1.65fr",
            gap: 16,
            alignItems: "start",
            minHeight: 0,
          }}
        >
          <div
            style={{
              ...styles.panel,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Estado actual</h2>

            <div style={{ display: "grid", gap: 12 }}>
              <div style={styles.stat}>
                Round: <strong>{meta.round}</strong>
              </div>

              <div style={styles.stat}>
                Tiempo: <strong>{formatTime(meta.pausedRemaining)}</strong>
              </div>

              <div style={styles.stat}>
                Estado:{" "}
                <strong>
                  {meta.phase === "finished"
                    ? "Finalizado"
                    : meta.phase === "break"
                    ? "Descanso"
                    : meta.status === "running"
                    ? "En marcha"
                    : "Pausado"}
                </strong>
              </div>
            </div>
          </div>

          <div
            style={{
              ...styles.panel,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 14 }}>QR Conexión</h2>
            <QRSection />
          </div>
        </div>
      </div>
    </Frame16x9>
  );
}

function PublicFighterPanel({ title, fighter, score, warnings, fouls }) {
  const isHong = fighter.color === "hong";
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 34,
        background: isHong
          ? "linear-gradient(180deg, #d12626 0%, #771313 100%)"
          : "linear-gradient(180deg, #1554d3 0%, #0b2c75 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "34px 30px 28px 30px",
        boxSizing: "border-box",
        overflow: "hidden",
        boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.10)",
        textAlign: "center",
      }}
    >
      <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            width: "100%",
            fontSize: 26,
            fontWeight: 900,
            letterSpacing: "0.18em",
            lineHeight: 1,
            textAlign: "center",
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: 18,
            width: "100%",
            fontSize: 62,
            fontWeight: 900,
            lineHeight: 0.98,
            textTransform: "uppercase",
            wordBreak: "break-word",
            textAlign: "center",
          }}
        >
          {fighter.name || title}
        </div>
        <div
          style={{
            marginTop: 10,
            width: "100%",
            fontSize: 24,
            fontWeight: 600,
            lineHeight: 1.1,
            opacity: 0.95,
            wordBreak: "break-word",
            textAlign: "center",
          }}
        >
          {fighter.club || "ACADEMIA / EQUIPO"}
        </div>
      </div>

      <div style={{ flex: 1, width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            width: "100%",
            fontSize: 250,
            fontWeight: 900,
            lineHeight: 0.9,
            letterSpacing: "-0.04em",
            textShadow: "0 10px 30px rgba(0,0,0,0.35)",
            textAlign: "center",
          }}
        >
          {score}
        </div>
      </div>

      <div style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div
          style={{
            minHeight: 126,
            borderRadius: 24,
            background: "rgba(255,255,255,0.12)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: "12px 10px",
            boxSizing: "border-box",
            boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.08)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.05, letterSpacing: "0.05em", textAlign: "center" }}>ADVERTENCIAS</div>
          <div style={{ marginTop: 10, fontSize: 60, fontWeight: 900, lineHeight: 1, textAlign: "center" }}>{warnings}</div>
        </div>
        <div
          style={{
            minHeight: 126,
            borderRadius: 24,
            background: "rgba(255,255,255,0.12)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: "12px 10px",
            boxSizing: "border-box",
            boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.08)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.05, letterSpacing: "0.05em", textAlign: "center" }}>FALTAS</div>
          <div style={{ marginTop: 10, fontSize: 60, fontWeight: 900, lineHeight: 1, textAlign: "center" }}>{fouls}</div>
        </div>
      </div>
    </div>
  );
}

{/*==================================publicScreen===================*/}

function PublicScreen({ meta, judges, navigate }) {
  const time = useClock(meta);
  const displayTime =
    meta.status === "running"
      ? time
      : meta.remaining ?? time;

  const s = summary(meta, judges);
  const { left, right } = getDisplaySides(meta, "public");
  const medical = ensureMedical(meta);
  const warning = secondFoulWarning(meta);
  const preDecision = preDecisionAdvantage(meta);

  const medicalBanner = medical.active ? (
    <div
      style={{
        position: "absolute",
        top: 790,
        left: 20,
        right: 20,
        zIndex: 20,
        background: medical.side === "hong" ? "#b91c1c" : "#1d4ed8",
        borderRadius: 20,
        padding: 20,
        textAlign: "center",
        fontSize: 60,
        fontWeight: 900,
      }}
    >
      MEDICAL {medical.side?.toUpperCase()}{" "}
      {formatTime(medical.side === "hong" ? medical.hong : medical.chong)}
    </div>
  ) : null;

const foulWarningBanner =
  !medical.active &&
  !meta.showResult &&
  meta.phase !== "finished" &&
  (meta.hongFouls || 0) < 3 &&
  (meta.chongFouls || 0) < 3 &&
  secondFoulWarning(meta) ? (
    <div
      style={{
        position: "absolute",
        top: 790,
        left: 20,
        right: 20,
        zIndex: 19,
        background: "#7c2d12",
        border: "3px solid #f97316",
        borderRadius: 20,
        padding: 18,
        textAlign: "center",
        color: "#ffedd5",
        fontSize: 34,
        fontWeight: 900,
        lineHeight: 1.15,
        letterSpacing: "0.02em",
        textTransform: "uppercase",
      }}
    >
      {secondFoulWarning(meta)}
    </div>
  ) : null;

const preDecisionBanner =
  !medical.active && preDecision ? (
    <div
      style={{
        position: "absolute",
        top: 790,
        left: 20,
        right: 20,
        zIndex: 19,
        background: preDecision.includes("HONG") ? "#7f1d1d" : "#1e3a8a",
        border: "2px solid rgba(255,255,255,0.25)",
        borderRadius: 20,
        padding: 18,
        textAlign: "center",
        color: "white",
        fontSize: 34,
        fontWeight: 900,
        lineHeight: 1.15,
        letterSpacing: "0.02em",
        textTransform: "uppercase",

        animation: "winnerPulse 0.8s ease-in-out infinite alternate",
      }}
    >
      {preDecision}
    </div>
  ) : null;

  const scoreMap = { hong: s.hongVotes, chong: s.chongVotes };
  const warningsMap = {
    hong: meta.hongWarnings || 0,
    chong: meta.chongWarnings || 0,
  };
  const foulsMap = { hong: meta.hongFouls || 0, chong: meta.chongFouls || 0 };

  const winner = meta.showResult ? s.winner : null;

  const sideGradient = (color) =>
    color === "hong"
      ? "linear-gradient(180deg, rgba(185,28,28,0.95) 0%, rgba(80,7,7,0.98) 100%)"
      : "linear-gradient(180deg, rgba(29,78,216,0.95) 0%, rgba(14,35,86,0.98) 100%)";

  const renderSidePanel = (fighter) => {
    const colorKey = fighter.pointsLabel;
    const score = scoreMap[colorKey];
    const warnings = warningsMap[colorKey];
    const fouls = foulsMap[colorKey];

    return (
      <div
        style={{
          borderRadius: 28,
          background: sideGradient(fighter.color),
          display: "grid",
          gridTemplateRows: "auto auto auto 1fr auto",
          alignItems: "stretch",
          padding: "28px 24px",
          minHeight: 0,
          boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.10)",
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: "0.12em",
            textAlign: "center",
          }}
        >
          {fighter.visualLabel}
        </div>

        <div
          style={{
            marginTop: 18,
            fontSize: 70,
            fontWeight: 900,
            lineHeight: 0.95,
            textAlign: "center",
            textTransform: "uppercase",
            wordBreak: "break-word",
          }}
        >
          {fighter.name || fighter.visualLabel}
        </div>

        <div
          style={{
            marginTop: 10,
            fontSize: 26,
            opacity: 0.92,
            textAlign: "center",
            wordBreak: "break-word",
          }}
        >
          {fighter.club || "NAME / TEAM"}
        </div>

        <div
          style={{
            fontSize: 190,
            fontWeight: 900,
            textAlign: "center",
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {score}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
          }}
        >
          <div
            style={{
              borderRadius: 20,
              background: "rgba(255,255,255,0.12)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 112,
              boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: "0.05em",
                textAlign: "center",
              }}
            >
              WARNINGS
            </div>
            <div
              style={{
                marginTop: 10,
                fontSize: 46,
                fontWeight: 900,
                lineHeight: 1,
              }}
            >
              {warnings}
            </div>
          </div>

          <div
            style={{
              borderRadius: 20,
              background: "rgba(255,255,255,0.12)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 112,
              boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: "0.05em",
                textAlign: "center",
              }}
            >
              FOULS
            </div>
            <div
              style={{
                marginTop: 10,
                fontSize: 46,
                fontWeight: 900,
                lineHeight: 1,
              }}
            >
              {fouls}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Frame16x9>
      <AppButton
        style={{
          ...styles.gray,
          position: "absolute",
          right: 26,
          bottom: 18,
          zIndex: 20,
          fontSize: 18,
          padding: "10px 18px",
          opacity: 0.78,
          boxShadow: "0 0 18px rgba(255,255,255,0.16)",
        }}
        onClick={() => navigate("/")}
      >
        Inicio
      </AppButton>

      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "grid",
          gridTemplateRows: "190px 1fr 52px",
          padding: "12px 18px 8px 18px",
          boxSizing: "border-box",
        }}
      >
        {medicalBanner}
        {preDecisionBanner}
        {foulWarningBanner}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "420px 1fr 420px",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "center",
            }}
          >
            <img
              src="/logo-universe.png"
              alt="Hwarang Universe"
              style={{
                maxWidth: 420,
                maxHeight: 190,
                width: "auto",
                height: "auto",
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>

          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: "0.24em",
                lineHeight: 1,
                opacity: 0.92,
              }}
            >
              HWARANG SCORING
            </div>

            <div
              style={{
                marginTop: 12,
                fontSize: 70,
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: "0.04em",
              }}
            >
              COMBAT
            </div>

            <div
              style={{
                marginTop: 12,
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: "0.10em",
                opacity: 0.92,
              }}
            >
              {meta.goldenPoint?.active
                ? meta.goldenPoint.mode === "A"
                  ? "GOLDEN POINT A"
                  : `GOLDEN POINT B / ROUND ${meta.goldenPoint.gpRound || 1}`
                : "MATCH"}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <img
              src="/logo-combat.png"
              alt="Hwarang Combat"
              style={{
                maxWidth: 420,
                maxHeight: 190,
                width: "auto",
                height: "auto",
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 360px 1fr",
            gap: 20,
            minHeight: 0,
          }}
        >
          {renderSidePanel(left)}

          <div
            style={{
              minHeight: 0,
              display: "grid",
              gridTemplateRows: "290px 1fr 120px",
              gap: 18,
            }}
          >
            <div
              style={{
                borderRadius: 34,
                background: "linear-gradient(180deg, #ffffff 0%, #dde4ec 100%)",
                color: "#111",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                boxShadow: "0 8px 24px rgba(0,0,0,0.30)",
              }}
            >
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 900,
                  letterSpacing: "0.20em",
                  lineHeight: 1,
                }}
              >
                {meta.phase === "break" ? "BREAK" : "TIME"}
              </div>

              <div
                style={{
                  marginTop: 18,
                  fontSize: 122,
                  fontWeight: 900,
                  lineHeight: 0.9,
                  letterSpacing: "-0.04em",
                }}
              >
                {formatTime(time || meta.time || 0)}
              </div>

              <div
                style={{
                  marginTop: 16,
                  fontSize: 34,
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  textAlign: "center",
                }}
              >
                {meta.phase === "break"
                  ? "DO NOT OPERATE"
                  : meta.goldenPoint?.active
                  ? `GP ${meta.goldenPoint.mode === "A" ? "A" : "B"}`
                  : `ROUND ${meta.round}`}
              </div>
            </div>

            <div
              style={{
                borderRadius: 34,
                background: "rgba(255,255,255,0.06)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.08)",
              }}
            >
              <div
                style={{
                  fontSize: 58,
                  fontWeight: 900,
                  lineHeight: 1,
                  letterSpacing: "0.06em",
                  opacity: 0.9,
                }}
              >
                VS
              </div>
            </div>

            <div
              style={{
                borderRadius: 24,
                background: "rgba(255,255,255,0.08)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.08)",
              }}
            >
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  textAlign: "center",
                }}
              >
                {meta.phase === "finished"
                  ? "MATCH FINISHED"
                  : meta.phase === "break"
                  ? "BREAK TIME"
                  : meta.status === "running"
                  ? "IN PROGRESS"
                  : "MATCH PAUSED"}
              </div>
            </div>
          </div>

          {renderSidePanel(right)}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.82,
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "0.08em",
            }}
          >
            TOURNAMENT / SAPRRING
          </div>
        </div>
      </div>

      {winner && <WinnerFullScreen winner={winner} zIndex={100} mode="public" />}
    </Frame16x9>
  );
}
function MedicalPanel({ meta, writeMeta }) {
  const m = ensureMedical(meta);

  const activeTime =
    m.side === "hong" ? m.hong :
    m.side === "chong" ? m.chong : 0;

  const MedicalBadge = ({ active = false }) => (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: 999,
        background: "#b91c1c",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: active
          ? "0 0 0 4px rgba(239,68,68,0.18), 0 0 18px rgba(239,68,68,0.45)"
          : "0 0 10px rgba(0,0,0,0.22)",
        animation: active ? "medicalPulse 1.1s infinite" : "none",
        flexShrink: 0,
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <rect x="9" y="4" width="6" height="16" rx="1.4" fill="white" />
        <rect x="4" y="9" width="16" height="6" rx="1.4" fill="white" />
      </svg>
    </div>
  );

  return (
    <div
      style={{
        ...styles.panel,
        marginTop: 16,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.12)",
        overflow: "hidden",
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 12,
      }}
    >
      <style>{`
        @keyframes medicalPulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.82; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 style={{ marginTop: 0, marginBottom: 0 }}>Tiempo médico</h2>

        <div style={{ opacity: 0.88, fontWeight: 700 }}>
          Activate the medical time for Hong or Chong.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginTop: 12,
          marginBottom: 12,
        }}
      >
        <AppButton
          style={{
            ...styles.red,
            minHeight: 82,
            fontSize: 24,
            fontWeight: 900,
            boxShadow:
              m.side === "hong" && m.active
                ? "0 0 24px rgba(239,68,68,0.42)"
                : "0 0 20px rgba(239,68,68,0.32)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
          onClick={() => writeMeta((p) => startMedical(p, "hong"))}
        >
          <MedicalBadge active={m.side === "hong" && m.active} />
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
            <span>HONG</span>
            <span style={{ fontSize: 26 }}>{formatTime(m.hong)}</span>
          </span>
        </AppButton>

        <AppButton
          style={{
            ...styles.blue,
            minHeight: 82,
            fontSize: 24,
            fontWeight: 900,
            boxShadow:
              m.side === "chong" && m.active
                ? "0 0 24px rgba(59,130,246,0.42)"
                : "0 0 20px rgba(59,130,246,0.32)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
          onClick={() => writeMeta((p) => startMedical(p, "chong"))}
        >
          <MedicalBadge active={m.side === "chong" && m.active} />
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
            <span>CHONG</span>
            <span style={{ fontSize: 26 }}>{formatTime(m.chong)}</span>
          </span>
        </AppButton>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginTop: "auto",
        }}
      >
        <AppButton
          style={{
            ...styles.gray,
            minHeight: 56,
            fontSize: 20,
            fontWeight: 900,
          }}
          onClick={() => writeMeta((p) => pauseMedical(p))}
        >
          PAUSE SAVE MEDICAL TIME
        </AppButton>

        <AppButton
          style={{
            ...styles.gray,
            minHeight: 56,
            fontSize: 20,
            fontWeight: 900,
          }}
          onClick={() => writeMeta((p) => stopMedical(p))}
        >
          STOP RESET MEDICAL TIME
        </AppButton>
      </div>

      <div
        style={{
          marginTop: 12,
          minHeight: 38,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          fontWeight: 900,
          textAlign: "center",
          letterSpacing: "0.04em",
          color:
            m.side === "hong"
              ? "#fca5a5"
              : m.side === "chong"
              ? "#93c5fd"
              : "white",
        }}
      >
        {m.active
          ? `MEDICAL ${m.side?.toUpperCase()} · ${formatTime(activeTime)}`
          : "SIN TIEMPO MÉDICO"}
      </div>
    </div>
  );
}

function PresidentScreen({ meta, judges, writeMeta, writeJudge, resetAll, navigate }) {
  meta = ensureMetaShape(meta);
  const time = useClock({
  ...meta,
  startTime: meta.startTime || meta.lastStartTime,
});
  const s = summary(meta, judges);
  const prevRunningRef = useRef(false);
  const prevFinishedRef = useRef(false);

  const [secondsInput, setSecondsInput] = useState(String(meta.config.roundSeconds || 120));
  const [roundsInput, setRoundsInput] = useState(String(meta.config.rounds || 2));
  const [breakSecondsInput, setBreakSecondsInput] = useState(String(meta.config.breakSeconds || BREAK_SECONDS));

  const [editor, setEditor] = useState({
    hongName: meta.hong?.name || "",
    hongClub: meta.hong?.club || "",
    chongName: meta.chong?.name || "",
    chongClub: meta.chong?.club || "",
  });

  const editorFocusRef = useRef(false);
  const editorDraftRef = useRef({
    hongName: meta.hong?.name || "",
    hongClub: meta.hong?.club || "",
    chongName: meta.chong?.name || "",
    chongClub: meta.chong?.club || "",
  });
  const editorSaveTimeoutRef = useRef(null);

  const { left, right } = getDisplaySides(meta, "president");

  useEffect(() => {
    const next = {
      hongName: meta.hong?.name || "",
      hongClub: meta.hong?.club || "",
      chongName: meta.chong?.name || "",
      chongClub: meta.chong?.club || "",
    };
    editorDraftRef.current = next;
    if (editorFocusRef.current) return;
    setEditor((current) =>
      current.hongName === next.hongName &&
      current.hongClub === next.hongClub &&
      current.chongName === next.chongName &&
      current.chongClub === next.chongClub
        ? current
        : next
    );
  }, [meta.hong?.name, meta.hong?.club, meta.chong?.name, meta.chong?.club]);

  const commitEditor = async (nextEditor) => {
    const finalEditor = nextEditor || editorDraftRef.current;
    const unchanged =
      (meta.hong?.name || "") === finalEditor.hongName &&
      (meta.hong?.club || "") === finalEditor.hongClub &&
      (meta.chong?.name || "") === finalEditor.chongName &&
      (meta.chong?.club || "") === finalEditor.chongClub;

    if (unchanged) return;

    await writeMeta((current) => ({
      ...current,
      hong: {
        ...(current.hong || getBaseCombatant(HONG)),
        name: finalEditor.hongName,
        club: finalEditor.hongClub,
      },
      chong: {
        ...(current.chong || getBaseCombatant(CHONG)),
        name: finalEditor.chongName,
        club: finalEditor.chongClub,
      },
    }));
  };

  const queueEditorCommit = (nextEditor) => {
    if (editorSaveTimeoutRef.current) clearTimeout(editorSaveTimeoutRef.current);
    editorSaveTimeoutRef.current = setTimeout(() => {
      commitEditor(nextEditor);
    }, 250);
  };

  const updateEditorField = (field, value) => {
    setEditor((current) => {
      const next = { ...current, [field]: value };
      editorDraftRef.current = next;
      queueEditorCommit(next);
      return next;
    });
  };

  useEffect(() => {
    return () => {
      if (editorSaveTimeoutRef.current) clearTimeout(editorSaveTimeoutRef.current);
    };
  }, []);

  

  useEffect(() => {
    const isShowingResult = meta.showResult === true;
    if (isShowingResult && !prevFinishedRef.current) {
      playWinnerSound();
    }
    prevFinishedRef.current = isShowingResult;
  }, [meta.showResult]);

  useEffect(() => {
    setSecondsInput(String(meta.config.roundSeconds || 120));
    setRoundsInput(String(meta.config.rounds || 2));
    setBreakSecondsInput(String(meta.config.breakSeconds || BREAK_SECONDS));
  }, [meta.config.roundSeconds, meta.config.rounds, meta.config.breakSeconds]);

  useEffect(() => {
    if (meta.status !== "running") return;
    if (time > 0) return;

    const finishByTime = async () => {
      await writeMeta((current) => {
        if (current.status !== "running") return current;

        if (current.phase === "fight") {
          if (current.round < (current.config.rounds || 1)) {
            current.phase = "break";
            current.status = "paused";
            current.pausedRemaining = current.config.breakSeconds || BREAK_SECONDS;
            current.phaseStartedAt = null;
          } else {
            current.phase = "finished";
            current.status = "paused";
            current.pausedRemaining = 0;
            current.phaseStartedAt = null;
          }
        } else if (current.phase === "break") {
          current.phase = "fight";
          current.round += 1;
          current.status = "paused";
          current.pausedRemaining = current.config.roundSeconds || 120;
          current.phaseStartedAt = null;
        }

        return current;
      });
    };

    finishByTime();
  }, [meta.status, meta.phase, time, writeMeta]);

  const saveConfig = async () => {
    const roundSeconds = Math.max(1, parseInt(secondsInput, 10) || 120);
    const rounds = Math.max(1, parseInt(roundsInput, 10) || 2);
    const breakSeconds = Math.max(1, parseInt(breakSecondsInput, 10) || BREAK_SECONDS);

    await writeMeta((current) => ({
      ...current,
      config: {
        ...(current.config || {}),
        roundSeconds,
        rounds,
        breakSeconds,
      },
      pausedRemaining:
        current.status === "paused" && current.phase === "fight"
          ? roundSeconds
          : current.status === "paused" && current.phase === "break"
          ? breakSeconds
          : current.pausedRemaining,
    }));
  };

  const startTimer = async () => {
    await commitEditor(editorDraftRef.current);

    await writeMeta((current) => {
      if (current.status === "running") return current;
      if (current.phase === "finished") return current;

      const roundSeconds = Math.max(
        1,
        parseInt(secondsInput, 10) || current.config?.roundSeconds || 120
      );
      const rounds = Math.max(
        1,
        parseInt(roundsInput, 10) || current.config?.rounds || 2
      );
      const breakSeconds = Math.max(
        1,
        parseInt(breakSecondsInput, 10) || current.config?.breakSeconds || BREAK_SECONDS
      );

      current.config = {
        ...(current.config || {}),
        roundSeconds,
        rounds,
        breakSeconds,
      };

      if (!current.pausedRemaining || current.pausedRemaining < 0) {
        current.pausedRemaining =
          current.phase === "break" ? breakSeconds : roundSeconds;
      }

      if (current.phase === "break" && (current.pausedRemaining || 0) <= 0) {
        current.phase = "fight";
        current.round = (current.round || 1) + 1;
        current.pausedRemaining = roundSeconds;
      }

      current.status = "running";
      current.phaseStartedAt = Date.now();

      return current;
    });
  };

  const pauseTimer = async () => {
    await writeMeta((current) => {
      if (current.status !== "running") return current;
      current.pausedRemaining = getDerivedTime(current, Date.now());
      current.status = "paused";
      current.phaseStartedAt = null;
      return current;
    });
  };

  const finishMatch = async () => {
    await writeMeta((current) => {
      current.pausedRemaining = getDerivedTime(current, Date.now());
      current.status = "paused";
      current.phase = "finished";
      current.phaseStartedAt = null;
      current.showResult = false;
      return current;
    });
  };

  const closeMatch = async () => {
    await writeMeta((current) => {
      current.showResult = true;
      return current;
    });
  };

  const applyCombatForcedWinner = async (winnerSide) => {
    await writeMeta((current) => {
      current.combatForcedWinner = winnerSide;
      current.showResult = true;
      current.status = "paused";
      current.phase = "finished";
      current.pausedRemaining = 0;
      current.phaseStartedAt = null;
      return current;
    });
  };

  const activateGoldenPoint = async (mode) => {
    await writeMeta((current) => {
      current.goldenPoint.active = true;
      current.goldenPoint.mode = mode;
      if (mode === "B") current.goldenPoint.gpRound = (current.goldenPoint.gpRound || 0) + 1;
      current.combatForcedWinner = null;
      current.phase = "fight";
      current.status = "paused";
      current.pausedRemaining = current.config.roundSeconds || 120;
      current.phaseStartedAt = null;
      return current;
    });
  };

  const prepareNextMatch = async () => {
    for (let i = 1; i <= MAX_JUDGES; i += 1) {
      await writeJudge(i, () => makeJudge(i));
    }

    await writeMeta((current) => {
  const fresh = makeInitialMeta();

  current.mode = fresh.mode;
  current.config = { ...fresh.config, ...current.config };

  current.match = {
    round: 1,
    phase: "fight",
    status: "paused",
    timeLeft: current.config.roundSeconds ?? fresh.config.roundSeconds,
    phaseStartedAt: null,
  };

  current.hongWarnings = 0;
  current.chongWarnings = 0;
  current.hongFouls = 0;
  current.chongFouls = 0;

  current.combatForcedWinner = null;
  current.goldenPoint = makeEmptyGoldenPoint();
  current.showResult = false;

  current.medicalActive = false;
  current.medicalRunning = false;
  current.medicalSide = null;
  current.medicalLast = 0;
  current.medicalHong = current.medicalPreset || current.config.medicalPreset || 300;
  current.medicalChong = current.medicalPreset || current.config.medicalPreset || 300;

  return syncLegacyClockFields(current);
});
  };

  const modifyMetaNumber = async (field, delta) => {
    await writeMeta((current) => {
      current[field] = Math.max(0, (current[field] || 0) + delta);
      return current;
    });
  };

const handleInvertPublic = async () => {
  await commitEditor(editorDraftRef.current);

  await writeMeta((current) => ({
    ...current,
    publicSwapSides: !current.publicSwapSides,
  }));
};

const handleInvertPresident = async () => {
  await commitEditor(editorDraftRef.current);

  await writeMeta((current) => ({
    ...current,
    presidentSwapSides: !current.presidentSwapSides,
  }));
};
  
  
  const winner = meta.showResult ? s.winner : null;
const handleInvertSides = async () => {
  await commitEditor(editorDraftRef.current);

  await writeMeta((current) => ({
    ...current,
    publicSwapSides: !current.publicSwapSides,
    presidentSwapSides: !current.presidentSwapSides,
  }));
};

  const currentStatusLabel =
    meta.phase === "finished"
      ? "Finalizado"
      : meta.phase === "break"
      ? "Descanso"
      : meta.status === "running"
      ? "Combate en curso"
      : "Pausado";

  return (
    <Frame16x9>
      <div
        style={{
          width: "100%",
          height: "100%",
          padding: 12,
          boxSizing: "border-box",
          display: "grid",
          gridTemplateRows: "64px 86px 350px 400px 100px",
          gap: 8,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto auto auto auto auto 1fr",
            gap: 8,
            alignItems: "center",
          }}
        >
          <AppButton style={styles.gray} onClick={() => navigate("/")}>
            Home Page
          </AppButton>

          <AppButton style={styles.green} onClick={prepareNextMatch}>
            Next Combat
          </AppButton>

          <AppButton style={styles.red} onClick={resetAll}>
            Reset Total
          </AppButton>

          <AppButton style={styles.purple} onClick={handleInvertPublic}>
            Invest Public
          </AppButton>

          <AppButton style={styles.purple} onClick={handleInvertPresident}>
            Invest President
          </AppButton>

          <div
            style={{
              textAlign: "right",
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: "0.04em",
            }}
          >
            PRESIDENT SCREEN
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.15fr 2.7fr 1fr 1fr",
            gap: 8,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              ...styles.stat,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "6px 8px",
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.1 }}>
              Round
            </div>
            <strong style={{ fontSize: 24, lineHeight: 1.05 }}>
              {meta.round}/{meta.config.rounds}
            </strong>
          </div>

          <div
            style={{
              ...styles.stat,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "6px 8px",
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.1 }}>
              Estado
            </div>
            <strong style={{ fontSize: 21, lineHeight: 1.05 }}>
              {currentStatusLabel}
            </strong>
          </div>

          <div
            style={{
              ...styles.panel,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "4px 10px",
              background:
                meta.phase === "finished"
                  ? "linear-gradient(180deg, #141414 0%, #090909 100%)"
                  : meta.phase === "break"
                  ? "linear-gradient(180deg, #111827 0%, #0b1220 100%)"
                  : "linear-gradient(180deg, #121212 0%, #050505 100%)",
              border:
                meta.status === "running"
                  ? "1px solid rgba(255, 210, 64, 0.55)"
                  : "1px solid rgba(255,255,255,0.12)",
              boxShadow:
                meta.status === "running"
                  ? "inset 0 0 18px rgba(255, 210, 64, 0.12), 0 0 14px rgba(255, 210, 64, 0.10)"
                  : undefined,
            }}
          >
            <div
              style={{
                fontFamily: "'Orbitron', 'Courier New', monospace",
                fontVariantNumeric: "tabular-nums",
                fontSize: 60,
                fontWeight: 900,
                letterSpacing: "0.12em",
                color: meta.status === "running" ? "#ffd84d" : "#7df9ff",
                textShadow:
                  meta.status === "running"
                    ? "0 0 8px rgba(255, 216, 77, 0.45)"
                    : "0 0 8px rgba(125, 249, 255, 0.35)",
                lineHeight: 1,
              }}
            >
              {formatTime(displayTime)}
            </div>
          </div>

          <div
            style={{
              ...styles.stat,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "6px 8px",
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.1 }}>
              Hong Points
            </div>
            <strong style={{ fontSize: 25, lineHeight: 1.05 }}>{s.hongVotes}</strong>
          </div>

          <div
            style={{
              ...styles.stat,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "6px 8px",
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.1 }}>
              Chong Points
            </div>
            <strong style={{ fontSize: 25, lineHeight: 1.05 }}>{s.chongVotes}</strong>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "0.96fr 1.14fr 0.9fr",
            gap: 8,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              ...styles.panel,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              alignItems: "center",
              textAlign: "center",
              padding: 10,
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 8 }}>
              Time setting
            </div>

            <div
              style={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr auto",
                gap: 6,
                alignItems: "end",
              }}
            >
              <div style={{ display: "grid", gap: 4 }}>
                <label style={{ fontSize: 13, fontWeight: 700, textAlign: "center" }}>
                  Tiempo de combate
                </label>
                <input
                  value={secondsInput}
                  onChange={(e) => setSecondsInput(e.target.value)}
                  style={{
                    width: "100%",
                    textAlign: "center",
                    padding: 7,
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                />
              </div>

              <div style={{ display: "grid", gap: 4 }}>
                <label style={{ fontSize: 13, fontWeight: 700, textAlign: "center" }}>
                  Cantidad de rondas
                </label>
                <input
                  value={roundsInput}
                  onChange={(e) => setRoundsInput(e.target.value)}
                  style={{
                    width: "100%",
                    textAlign: "center",
                    padding: 7,
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                />
              </div>

              <div style={{ display: "grid", gap: 4 }}>
                <label style={{ fontSize: 13, fontWeight: 700, textAlign: "center" }}>
                  Tiempo de descanso
                </label>
                <input
                  value={breakSecondsInput}
                  onChange={(e) => setBreakSecondsInput(e.target.value)}
                  style={{
                    width: "100%",
                    textAlign: "center",
                    padding: 7,
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                />
              </div>

              <AppButton style={{ ...styles.blue, minHeight: 38, fontSize: 13 }} onClick={saveConfig}>
                Guardar
              </AppButton>
            </div>

            <div
              style={{
                display: "flex",
                gap: 6,
                marginTop: 8,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <AppButton style={{ ...styles.gray, minHeight: 34, fontSize: 13 }} onClick={() => setSecondsInput("60")}>
                1:00
              </AppButton>
              <AppButton style={{ ...styles.gray, minHeight: 34, fontSize: 13 }} onClick={() => setSecondsInput("90")}>
                1:30
              </AppButton>
              <AppButton style={{ ...styles.gray, minHeight: 34, fontSize: 13 }} onClick={() => setSecondsInput("120")}>
                2:00
              </AppButton>
            </div>

            <div
              style={{
                ...styles.row,
                marginTop: 8,
                justifyContent: "center",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              <AppButton style={{ ...styles.green, minHeight: 38, fontSize: 13 }} onClick={startTimer}>
                Iniciar
              </AppButton>
              <AppButton style={{ ...styles.amber, minHeight: 38, fontSize: 13 }} onClick={pauseTimer}>
                Pausar
              </AppButton>
              <AppButton style={{ ...styles.purple, minHeight: 38, fontSize: 13 }} onClick={finishMatch}>
                Finalizar
              </AppButton>
            </div>

            <AppButton
              style={{ ...styles.red, marginTop: 8, minHeight: 38, fontSize: 13 }}
              onClick={closeMatch}
            >
              Cerrar combate
            </AppButton>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              justifyContent: "center",
              minHeight: 0,
              height: "100%",
            }}
          >
            <MedicalPanel meta={meta} writeMeta={writeMeta} />
          </div>

          <div
            style={{
              ...styles.panel,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              alignItems: "center",
              textAlign: "center",
              padding: 10,
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 8 }}>
              Advertencias y faltas
            </div>

            <div
              style={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <div
                style={{
                  ...styles.panel,
                  background: "#2a0606",
                  border: "1px solid #631010",
                  padding: 8,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                }}
              >
                <div style={{ fontWeight: 900, marginBottom: 8, fontSize: 18 }}>Hong</div>

                <div style={{ ...styles.row, justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
                  <AppButton
                    style={{ ...styles.red, minHeight: 34, fontSize: 12 }}
                    onClick={() => modifyMetaNumber("hongWarnings", 1)}
                  >
                    + Advertencia
                  </AppButton>
                  <AppButton
                    style={{ ...styles.gray, minHeight: 34, fontSize: 12 }}
                    onClick={() => modifyMetaNumber("hongWarnings", -1)}
                  >
                    - Advertencia
                  </AppButton>
                </div>

                <div style={{ ...styles.row, justifyContent: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  <AppButton
                    style={{ ...styles.red, minHeight: 34, fontSize: 12 }}
                    onClick={() => modifyMetaNumber("hongFouls", 1)}
                  >
                    + Falta
                  </AppButton>
                  <AppButton
                    style={{ ...styles.gray, minHeight: 34, fontSize: 12 }}
                    onClick={() => modifyMetaNumber("hongFouls", -1)}
                  >
                    - Falta
                  </AppButton>
                </div>

                <div style={{ marginTop: 8, fontSize: 15 }}>
                  Advertencias: <strong>{meta.hongWarnings}</strong>
                </div>
                <div style={{ fontSize: 15 }}>
                  Faltas: <strong>{meta.hongFouls}</strong>
                </div>
              </div>

              <div
                style={{
                  ...styles.panel,
                  background: "#07172f",
                  border: "1px solid #174a9c",
                  padding: 8,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                }}
              >
                <div style={{ fontWeight: 900, marginBottom: 8, fontSize: 18 }}>Chong</div>

                <div style={{ ...styles.row, justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
                  <AppButton
                    style={{ ...styles.blue, minHeight: 34, fontSize: 12 }}
                    onClick={() => modifyMetaNumber("chongWarnings", 1)}
                  >
                    + Advertencia
                  </AppButton>
                  <AppButton
                    style={{ ...styles.gray, minHeight: 34, fontSize: 12 }}
                    onClick={() => modifyMetaNumber("chongWarnings", -1)}
                  >
                    - Advertencia
                  </AppButton>
                </div>

                <div style={{ ...styles.row, justifyContent: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  <AppButton
                    style={{ ...styles.blue, minHeight: 34, fontSize: 12 }}
                    onClick={() => modifyMetaNumber("chongFouls", 1)}
                  >
                    + Falta
                  </AppButton>
                  <AppButton
                    style={{ ...styles.gray, minHeight: 34, fontSize: 12 }}
                    onClick={() => modifyMetaNumber("chongFouls", -1)}
                  >
                    - Falta
                  </AppButton>
                </div>

                <div style={{ marginTop: 8, fontSize: 15 }}>
                  Advertencias: <strong>{meta.chongWarnings}</strong>
                </div>
                <div style={{ fontSize: 15 }}>
                  Faltas: <strong>{meta.chongFouls}</strong>
                </div>
              </div>
            </div>

            {!!secondFoulWarning(meta) && (
              <div
                style={{
                  marginTop: 8,
                  width: "100%",
                  padding: 8,
                  borderRadius: 10,
                  background: "#7c2d12",
                  border: "1px solid #f97316",
                  color: "#ffedd5",
                  fontWeight: 900,
                  textAlign: "center",
                  fontSize: 13,
                  lineHeight: 1.15,
                }}
              >
                {secondFoulWarning(meta)}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            ...styles.panel,
            padding: "2px 6px 4px 6px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            alignSelf: "start",
            height: 280,
            minHeight: 280,
            maxHeight: 280,
            marginTop: 120,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              fontWeight: 800,
              fontSize: 30,
              marginBottom: 2,
              textAlign: "center",
              lineHeight: 1,
              minHeight: 12,
              marginTop: 10,
            }}
          >
            JUDGES CARDS
          </div>

          <div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 4,
    alignItems: "start",
    flex: 1,
    minHeight: 0,
    height: "100%",
    overflow: "hidden",
    marginTop: 20,   // 👈 BAJA LAS 4 JUNTAS
  }}
>
            {judges.slice(0, COMBAT_JUDGES).map((j) => (
              <div
  key={j.id}
  style={{
    height: 200,          // 👈 ACHICA DESDE ABAJO
    minHeight: 200,
    display: "flex",
    alignItems: "flex-start",
  }}
>
  <JudgeReadOnlyCard judge={j} meta={meta} />
</div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
            alignItems: "stretch",
          }}
        >
          <AppButton
            style={{
              ...styles.red,
              minHeight: 40,
              fontSize: 14,
              fontWeight: 800,
              borderRadius: 10,
              paddingTop: 6,
              paddingBottom: 6,
            }}
            onClick={() => applyCombatForcedWinner("hong")}
          >
            Ganador Hong
          </AppButton>

          <AppButton
            style={{
              ...styles.gray,
              minHeight: 40,
              fontSize: 14,
              fontWeight: 800,
              borderRadius: 10,
              paddingTop: 6,
              paddingBottom: 6,
            }}
            onClick={() => applyCombatForcedWinner("draw")}
          >
            Empate
          </AppButton>

          <AppButton
            style={{
              ...styles.blue,
              minHeight: 40,
              fontSize: 14,
              fontWeight: 800,
              borderRadius: 10,
              paddingTop: 6,
              paddingBottom: 6,
            }}
            onClick={() => applyCombatForcedWinner("chong")}
          >
            Ganador Chong
          </AppButton>
        </div>

        {winner && (
  <WinnerFullScreen
    winner={winner}
    zIndex={100}
    onNextCombat={prepareNextMatch}
    onResetTotal={resetAll}
    onClose={() =>
      writeMeta((current) => ({
        ...current,
        showResult: false,
      }))
    }
  />
)}
      </div>
    </Frame16x9>
  );
}

{/*==============================PRESIDENTSCREENV2NUEVOOOOOOO=========================*/}

function PresidentScreenV2({ meta, judges, writeMeta, writeJudge, resetAll, navigate }) {
  meta = ensureMetaShape(meta);
  const time = useClock(meta);
  const s = summary(meta, judges);
  const presidentWinner = meta.showResult ? s.winner : null;
  const prevRunningRef = useRef(false);
  const prevFinishedRef = useRef(false);
  const inputsLocked = meta.phase === "finished";

  const [secondsInput, setSecondsInput] = useState(String(meta.config.roundSeconds || 120));
  const [roundsInput, setRoundsInput] = useState(String(meta.config.rounds || 2));
  const [breakSecondsInput, setBreakSecondsInput] = useState(String(meta.config.breakSeconds || BREAK_SECONDS));
  
  const [editor, setEditor] = useState({
    hongName: meta.hong?.name || "",
    hongClub: meta.hong?.club || "",
    chongName: meta.chong?.name || "",
    chongClub: meta.chong?.club || "",
  });

  const playButtonSound = () => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "square";
  osc.frequency.value = 800; // tono click
  gain.gain.value = 0.1;

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.05); // sonido corto tipo click
};

  const editorFocusRef = useRef(false);
  const editorDraftRef = useRef({
    hongName: meta.hong?.name || "",
    hongClub: meta.hong?.club || "",
    chongName: meta.chong?.name || "",
    chongClub: meta.chong?.club || "",
  });
  const editorSaveTimeoutRef = useRef(null);

  const { left, right } = getDisplaySides(meta, "president");

  useEffect(() => {
    const next = {
      hongName: meta.hong?.name || "",
      hongClub: meta.hong?.club || "",
      chongName: meta.chong?.name || "",
      chongClub: meta.chong?.club || "",
    };
    editorDraftRef.current = next;
    if (editorFocusRef.current) return;
    setEditor((current) =>
      current.hongName === next.hongName &&
      current.hongClub === next.hongClub &&
      current.chongName === next.chongName &&
      current.chongClub === next.chongClub
        ? current
        : next
    );
  }, [meta.hong?.name, meta.hong?.club, meta.chong?.name, meta.chong?.club]);

  const commitEditor = async (nextEditor) => {
    const finalEditor = nextEditor || editorDraftRef.current;
    const unchanged =
      (meta.hong?.name || "") === finalEditor.hongName &&
      (meta.hong?.club || "") === finalEditor.hongClub &&
      (meta.chong?.name || "") === finalEditor.chongName &&
      (meta.chong?.club || "") === finalEditor.chongClub;

    if (unchanged) return;

    await writeMeta((current) => ({
      ...current,
      hong: {
        ...(current.hong || getBaseCombatant(HONG)),
        name: finalEditor.hongName,
        club: finalEditor.hongClub,
      },
      chong: {
        ...(current.chong || getBaseCombatant(CHONG)),
        name: finalEditor.chongName,
        club: finalEditor.chongClub,
      },
    }));
  };

  const persistClockConfig = async ({
  roundSeconds,
  rounds,
  breakSeconds,
}) => {
  const safeRoundSeconds = Math.max(1, parseInt(roundSeconds, 10) || 120);
  const safeRounds = Math.max(1, parseInt(rounds, 10) || 2);
  const safeBreakSeconds = Math.max(
    1,
    parseInt(breakSeconds, 10) || BREAK_SECONDS
  );

  await writeMeta((current) => {
    const next = {
      ...current,
      config: {
        ...(current.config || {}),
        roundSeconds: safeRoundSeconds,
        rounds: safeRounds,
        breakSeconds: safeBreakSeconds,
      },
    };

    // 🔥 CLAVE ABSOLUTA
    // SI NO ESTÁ CORRIENDO → SINCRONIZAMOS EL RELOJ REAL
    if (current.status !== "running") {
      next.pausedRemaining =
        current.phase === "break"
          ? safeBreakSeconds
          : safeRoundSeconds;

      next.phaseStartedAt = null;
    }

    return next;
  });
};

  const applyRoundSeconds = async (value) => {
    const safe = Math.max(1, parseInt(value, 10) || 120);
    setSecondsInput(String(safe));
    await persistClockConfig({
      roundSeconds: safe,
      rounds: roundsInput,
      breakSeconds: breakSecondsInput,
    });
  };

  const applyBreakSeconds = async (value) => {
    const safe = Math.max(1, parseInt(value, 10) || BREAK_SECONDS);
    setBreakSecondsInput(String(safe));
    await persistClockConfig({
      roundSeconds: secondsInput,
      rounds: roundsInput,
      breakSeconds: safe,
    });
  };

  const applyRounds = async (value) => {
    const safe = Math.max(1, parseInt(value, 10) || 2);
    setRoundsInput(String(safe));
    await persistClockConfig({
      roundSeconds: secondsInput,
      rounds: safe,
      breakSeconds: breakSecondsInput,
    });
  };

  const startTimer = async () => {
  await writeMeta((current) => {
    if (current.status === "running") return current;
    if (current.phase === "finished") return current;

    const roundSeconds = Math.max(
      1,
      parseInt(current.config?.roundSeconds, 10) || 120
    );
    const rounds = Math.max(
      1,
      parseInt(current.config?.rounds, 10) || 2
    );
    const breakSeconds = Math.max(
      1,
      parseInt(current.config?.breakSeconds, 10) || BREAK_SECONDS
    );

    const phase = current.phase || "fight";
    const round = current.round || 1;
    const defaultPhaseSeconds =
      phase === "break" ? breakSeconds : roundSeconds;

    const shouldResume =
      current.status === "paused" &&
      current.phaseStartedAt == null &&
      typeof current.pausedRemaining === "number" &&
      current.pausedRemaining > 0 &&
      current.pausedRemaining < defaultPhaseSeconds;

    const pausedRemaining = shouldResume
      ? current.pausedRemaining
      : defaultPhaseSeconds;

    return {
      ...current,
      config: {
        ...(current.config || {}),
        roundSeconds,
        rounds,
        breakSeconds,
      },
      phase,
      round,
      pausedRemaining,
      status: "running",
      phaseStartedAt: Date.now(),
    };
  });
};

  const queueEditorCommit = (nextEditor) => {
    if (editorSaveTimeoutRef.current) clearTimeout(editorSaveTimeoutRef.current);
    editorSaveTimeoutRef.current = setTimeout(() => {
      commitEditor(nextEditor);
    }, 250);
  };

  const updateEditorField = (field, value) => {
    setEditor((current) => {
      const next = { ...current, [field]: value };
      editorDraftRef.current = next;
      queueEditorCommit(next);
      return next;
    });
  };

  useEffect(() => {
    return () => {
      if (editorSaveTimeoutRef.current) clearTimeout(editorSaveTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
  const isRunning = meta.status === "running" && meta.phase === "fight";
  
  prevRunningRef.current = isRunning;
}, [meta.status, meta.phase]);

  useEffect(() => {
    const isShowingResult = meta.showResult === true;
    if (isShowingResult && !prevFinishedRef.current) {
      playWinnerSound();
    }
    prevFinishedRef.current = isShowingResult;
  }, [meta.showResult]);

  useEffect(() => {
    setSecondsInput(String(meta.config.roundSeconds || 120));
    setRoundsInput(String(meta.config.rounds || 2));
    setBreakSecondsInput(String(meta.config.breakSeconds || BREAK_SECONDS));
  }, [meta.config.roundSeconds, meta.config.rounds, meta.config.breakSeconds]);

const skipAutoSaveRef = useRef(true);

useEffect(() => {
  if (skipAutoSaveRef.current) {
    skipAutoSaveRef.current = false;
    return;
  }

  const t = setTimeout(() => {
    saveConfig();
  }, 120);

  return () => clearTimeout(t);
}, [secondsInput, roundsInput, breakSecondsInput]);

  useEffect(() => {
    if (meta.status !== "running") return;
    if (time > 0) return;

    const finishByTime = async () => {
      await writeMeta((current) => {
        if (current.status !== "running") return current;

        if (current.phase === "fight") {
          if (current.round < (current.config.rounds || 1)) {
            current.phase = "break";
            current.status = "running";
            current.pausedRemaining = current.config.breakSeconds || BREAK_SECONDS;
            current.phaseStartedAt = Date.now();
          } else {
            current.phase = "finished";
            current.status = "paused";
            current.pausedRemaining = 0;
            current.phaseStartedAt = null;
          }
        } else if (current.phase === "break") {
          current.phase = "fight";
          current.round += 1;
          current.status = "paused";
          current.pausedRemaining = current.config.roundSeconds || 120;
          current.phaseStartedAt = null;
        }

        return current;
      });
    };

    finishByTime();
  }, [meta.status, meta.phase, time, writeMeta]);

  const saveConfig = async () => {
  await persistClockConfig({
    roundSeconds: secondsInput,
    rounds: roundsInput,
    breakSeconds: breakSecondsInput,
  });
};

  

  const pauseTimer = async () => {
    await writeMeta((current) => {
      if (current.status !== "running") return current;
      current.pausedRemaining = getDerivedTime(current, Date.now());
      current.status = "paused";
      current.phaseStartedAt = null;
      return current;
    });
  };

  const finishMatch = async () => {
    await writeMeta((current) => {
      current.pausedRemaining = getDerivedTime(current, Date.now());
      current.status = "paused";
      current.phase = "finished";
      current.phaseStartedAt = null;
      current.showResult = false;
      return current;
    });
  };

  const closeMatch = async () => {
    await writeMeta((current) => {
      current.showResult = true;
      return current;
    });
  };

  const applyCombatForcedWinner = async (winnerSide) => {
    await writeMeta((current) => {
      current.combatForcedWinner = winnerSide;
      current.showResult = true;
      current.status = "paused";
      current.phase = "finished";
      current.pausedRemaining = 0;
      current.phaseStartedAt = null;
      return current;
    });
  };

  const activateGoldenPoint = async (mode) => {
    await writeMeta((current) => {
      current.goldenPoint.active = true;
      current.goldenPoint.mode = mode;
      if (mode === "B") current.goldenPoint.gpRound = (current.goldenPoint.gpRound || 0) + 1;
      current.combatForcedWinner = null;
      current.phase = "fight";
      current.status = "paused";
      current.pausedRemaining = current.config.roundSeconds || 120;
      current.phaseStartedAt = null;
      return current;
    });
  };

  const prepareNextMatch = async () => {
  for (let i = 1; i <= MAX_JUDGES; i += 1) {
    await writeJudge(i, () => makeJudge(i));
  }

  await writeMeta((current) => {
    const fresh = makeInitialMeta();

    current.mode = fresh.mode;
    current.config = { ...fresh.config, ...current.config };

    current.round = fresh.round;
    current.phase = fresh.phase;
    current.status = fresh.status;
    current.pausedRemaining =
      current.config.roundSeconds || fresh.config.roundSeconds;

    current.phaseStartedAt = null;
    current.hongWarnings = 0;
    current.chongWarnings = 0;
    current.hongFouls = 0;
    current.chongFouls = 0;
    current.combatForcedWinner = null;
    current.goldenPoint = makeEmptyGoldenPoint();
    current.showResult = false;
    current.medicalActive = false;
    current.medicalRunning = false;
    current.medicalSide = null;
    current.medicalLast = 0;
    current.medicalHong = current.medicalPreset || 300;
    current.medicalChong = current.medicalPreset || 300;

    return current;
  });
};

  const modifyMetaNumber = async (field, delta) => {
    await writeMeta((current) => {
      current[field] = Math.max(0, (current[field] || 0) + delta);
      return current;
    });
  };

const handleInvertPublic = async () => {
  await commitEditor(editorDraftRef.current);

  await writeMeta((current) => ({
    ...current,
    publicSwapSides: !current.publicSwapSides,
  }));
};

const handleInvertPresident = async () => {
  await commitEditor(editorDraftRef.current);

  await writeMeta((current) => ({
    ...current,
    presidentSwapSides: !current.presidentSwapSides,
  }));
};

const handleMedicalBreak = async () => {
  await commitEditor(editorDraftRef.current);

  await writeMeta((current) => ({
    ...current,
    medicalActive: false,
    medicalRunning: false,
  }));
};
const handleWarningAdd = async (side) => {
  await commitEditor(editorDraftRef.current);

  await writeMeta((current) => ({
    ...current,
    hongWarnings:
      side === "hong"
        ? (current.hongWarnings || 0) + 1
        : current.hongWarnings || 0,
    chongWarnings:
      side === "chong"
        ? (current.chongWarnings || 0) + 1
        : current.chongWarnings || 0,
  }));
};
const handleFoulAdd = async (side) => {
  await commitEditor(editorDraftRef.current);

  await writeMeta((current) => {
    const nextHongFouls =
      side === "hong"
        ? (current.hongFouls || 0) + 1
        : current.hongFouls || 0;

    const nextChongFouls =
      side === "chong"
        ? (current.chongFouls || 0) + 1
        : current.chongFouls || 0;

    const hongReachedThird = nextHongFouls >= 3;
    const chongReachedThird = nextChongFouls >= 3;

    return {
      ...current,
      hongFouls: nextHongFouls,
      chongFouls: nextChongFouls,

      ...(hongReachedThird || chongReachedThird
        ? {
            phase: "finished",
            status: "paused",
            showResult: false,
            match: {
              ...(current.match || {}),
              phase: "finished",
              status: "paused",
            },
          }
        : {}),
    };
  });
};
const handleMedicalStart = async (side) => {
  
  await commitEditor(editorDraftRef.current);

  await writeMeta((current) => {
    const preset =
      current?.config?.medicalPreset ??
      current?.medicalPreset ??
      300;

    return {
      ...current,
      medicalActive: true,
      medicalRunning: true,
      medicalSide: side,
      medicalLast: Date.now(),
      medicalHong: side === "hong" ? (current.medicalHong ?? preset) : (current.medicalHong ?? preset),
      medicalChong: side === "chong" ? (current.medicalChong ?? preset) : (current.medicalChong ?? preset),
    };
  });
};
const winner = meta.showResult ? s.winner : null;
  const handleInvertSides = async () => {
  await commitEditor(editorDraftRef.current);

  await writeMeta((current) => ({
    ...current,
    publicSwapSides: !current.publicSwapSides,
    presidentSwapSides: !current.presidentSwapSides,
  }));
};

  const currentStatusLabel =
    meta.phase === "finished"
      ? "Finished"
      : meta.phase === "break"
      ? "Breack"
      : meta.status === "running"
      ? "Sparring in Progress"
      : "Match Paused";

const isSwapped = meta.presidentSwapSides;
const leftSide = isSwapped ? "chong" : "hong";
const rightSide = isSwapped ? "hong" : "chong";

  return (
  <Frame16x9>
    <div
      style={{
        width: "100%",
        height: "100%",
        padding: 12,
        boxSizing: "border-box",
        display: "grid",
        gridTemplateRows: "50px 120px 200px 170px 1fr 150px",
        gap: 8,
        overflow: "hidden",
        background: "#0b0f1a",
        position: "relative",
      }}
    >

      <div
  style={{
    
    borderRadius: 12,
    display: "grid",
    gridTemplateColumns: "repeat(5, auto) 1fr",
    gap: 13,
    alignItems: "center",
    padding: "4px 10px",
    minHeight: 0,
    height: "100%",
    overflow: "hidden",
    color: "white",
  }}
>
  <AppButton style={{ ...styles.gray, minHeight: 32, fontSize: 17 }} onClick={() => navigate("/")}>
    Home
  </AppButton>

  <AppButton style={{ ...styles.green, minHeight: 32, fontSize: 17 }} onClick={prepareNextMatch}>
    Next
  </AppButton>

  <AppButton style={{ ...styles.red, minHeight: 32, fontSize: 17 }} onClick={resetAll}>
    Reset
  </AppButton>

  <AppButton style={{ ...styles.purple, minHeight: 32, fontSize: 17 }} onClick={handleInvertPublic}>
    Invert Pub
  </AppButton>

  <AppButton style={{ ...styles.purple, minHeight: 32, fontSize: 17 }} onClick={handleInvertPresident}>
    Invert Pres
  </AppButton>

  <div
    style={{
      textAlign: "right",
      fontSize: 18,
      fontWeight: 900,
      letterSpacing: "0.04em",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    }}
  >
    HWARANG SOCORING UNIVERSE
  </div>
</div>



      <div
  style={{
    
    borderRadius: 12,
    display: "grid",
    gridTemplateColumns: "0.9fr 1.1fr 2.2fr 0.9fr 0.9fr",
    gap: 8,
    alignItems: "stretch",
    padding: 8,
    color: "white",
    minHeight: 0,
    height: "100%",
  }}
>
  <div
    style={{
      ...styles.stat,
      
      borderRadius: 10,
      border: "none",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "6px 8px",
      minWidth: 0,
      
    }}
  >
    <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>
      Round
    </div>
    <strong style={{ fontSize: 28, lineHeight: 1.05 }}>
      {meta.round}/{meta.config.rounds}
    </strong>
  </div>

  <div
    style={{
      ...styles.stat,
      
      borderRadius: 10,
      border: "none",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "6px 8px",
      minWidth: 0,
      
    }}
  >
    <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>
      Status
    </div>
    <strong style={{ fontSize: 22, lineHeight: 1.05 }}>
      {currentStatusLabel}
    </strong>
  </div>

  <div
    style={{
      ...styles.panel,
      borderRadius: 10,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "4px 10px",
      background:
        meta.phase === "finished"
          ? "linear-gradient(180deg, #141414 0%, #090909 100%)"
          : meta.phase === "break"
          ? "linear-gradient(180deg, #111827 0%, #0b1220 100%)"
          : "linear-gradient(180deg, #121212 0%, #050505 100%)",
      border: "none",
      boxShadow:
        meta.status === "running"
          ? "inset 0 0 18px rgba(255, 210, 64, 0.12), 0 0 14px rgba(255, 210, 64, 0.10)"
          : undefined,
      minWidth: 0,
    }}
  >
    <div
      style={{
        fontFamily: "Share Tech Mono, monospace",
        fontVariantNumeric: "tabular-nums",
        fontSize: 70,
        fontWeight: 900,
        letterSpacing: "0.12em",
        color: meta.status === "running" ? "#ffd84d" : "#7df9ff",
        textShadow:
          meta.status === "running"
            ? "0 0 8px rgba(255, 216, 77, 0.45)"
            : "0 0 8px rgba(125, 249, 255, 0.35)",
        lineHeight: 1,
      }}
    >
      {formatTime(meta.status === "running" ? time : meta.pausedRemaining || 0)}
    </div>
  </div>

  <div
    style={{
      ...styles.stat,
      background: isSwapped
  ? "linear-gradient(135deg, rgba(0,102,255,0.25), rgba(0,40,120,0.5))"
  : "linear-gradient(135deg, rgba(255,80,80,0.25), rgba(120,0,0,0.45))",
       
      borderRadius: 10,
      boxShadow: "inset 0 0 8px rgba(255,255,255,0.1)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "6px 8px",
      minWidth: 0,
    }}
  >
    <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>
      {isSwapped ? "Chong Points" : "Hong Points"}
    </div>
    <strong style={{ fontSize: 28, lineHeight: 1.05 }}>
      {isSwapped ? s.chongVotes : s.hongVotes}
    </strong>
  </div>

  <div
    style={{
      ...styles.stat,
      background: isSwapped
  ? "linear-gradient(135deg, rgba(255,80,80,0.25), rgba(120,0,0,0.45))"
  : "linear-gradient(135deg, rgba(0,102,255,0.25), rgba(0,40,120,0.5))",
      boxShadow: "inset 0 0 8px rgba(255,255,255,0.1)",
      borderRadius: 10,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "6px 8px",
      minWidth: 0,
    }}
  >
    <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>
  {isSwapped ? "Hong Points" : "Chong Points"}
</div>
    <strong style={{ fontSize: 28, lineHeight: 1.05 }}>
  {isSwapped ? s.hongVotes : s.chongVotes}
</strong>
  </div>
</div>

{/*===================2da FILA=======================*/}

      <div
  style={{
    
    borderRadius: 12,
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 8,
    padding: 8,
    color: "white",
    height: "100%",
    boxSizing: "border-box",
  }}
>
  <div
  style={{
    
    borderRadius: 10,
    display: "grid",
    gridTemplateRows: "15px auto 40px",
    gap: 8,
    fontWeight: 900,
    padding: 10,
    boxSizing: "border-box",
    minWidth: 0,
    minHeight: 0,
    overflow: "hidden",
  }}
>
  <div
    style={{
      fontSize: 20,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 0,
      overflow: "hidden",
      whiteSpace: "nowrap",
    }}
  >
    TIME SETTINGS
  </div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 8,
      minWidth: 0,
      minHeight: 0,
      overflow: "hidden",
    }}
  >
    <div
      style={{
        
        borderRadius: 8,
        padding: 8,
        boxSizing: "border-box",
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        display: "grid",
        gridTemplateRows: "24px 1fr",
        gap: 6,
      }}
    >
      <div
        style={{
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        COMBAT TIME
      </div>

      <div
        style={{
          
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          textAlign: "center",
          padding: 4,
          minWidth: 0,
          minHeight: 0,
        }}
      >
        <div
  style={{
    display: "grid",
    gridTemplateRows: "auto auto",
    gap: 6,
  }}
>
  <div
    style={{
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  flexWrap: "nowrap",
  minWidth: 0,
}}
  >
    <button
  onClick={() =>
    setSecondsInput(String(Math.max(1, (parseInt(secondsInput, 10) || 0) - 10)))
  }
  style={{ minWidth: 50, height: 25, fontWeight: 900 }}
>
  -
</button>

<div style={{ fontSize: 18, fontWeight: 900 }}>
  {formatTime(parseInt(secondsInput, 10) || 0)}
</div>

<button
  onClick={() =>
    setSecondsInput(String((parseInt(secondsInput, 10) || 0) + 10))
  }
  style={{ minWidth: 50, height: 25, fontWeight: 900 }}
>
  +
</button>
  </div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 4,
    }}
  >
    <button
  onClick={() => setSecondsInput("60")}
  style={{ height: 25, fontSize: 15, fontWeight: 900 }}
>
  1:00
</button>

<button
  onClick={() => setSecondsInput("90")}
  style={{ height: 25, fontSize: 15, fontWeight: 900 }}
>
  1:30
</button>

<button
  onClick={() => setSecondsInput("120")}
  style={{ height: 25, fontSize: 15, fontWeight: 900 }}
>
  2:00
</button>
  </div>
</div>
      </div>
    </div>

    <div
      style={{
        
        borderRadius: 8,
        padding: 8,
        boxSizing: "border-box",
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        display: "grid",
        gridTemplateRows: "24px 1fr",
        gap: 6,
      }}
    >
      <div
        style={{
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        BREAK TIME
      </div>

      <div
        style={{
          
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          textAlign: "center",
          padding: 4,
          minWidth: 0,
          minHeight: 0,
        }}
      >
        <div
  style={{
    display: "grid",
    gridTemplateRows: "auto auto",
    gap: 6,
  }}
>
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      flexWrap: "nowrap",
      minWidth: 0,
    }}
  >
    <button
  onClick={() =>
    setBreakSecondsInput(String(Math.max(1, (parseInt(breakSecondsInput, 10) || 0) - 5)))
  }
  style={{ minWidth: 50, height: 25, fontWeight: 900 }}
>
  -
</button>

<div style={{ fontSize: 18, fontWeight: 900 }}>
  {formatTime(parseInt(breakSecondsInput, 10) || 0)}
</div>

<button
  onClick={() =>
    setBreakSecondsInput(String((parseInt(breakSecondsInput, 10) || 0) + 5))
  }
  style={{ minWidth: 50, height: 25, fontWeight: 900 }}
>
  +
</button>
  </div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 4,
    }}
  >
    <button
  onClick={() => setBreakSecondsInput("30")}
  style={{ height: 26, fontSize: 15, fontWeight: 900 }}
>
  0:30
</button>

<button
  onClick={() => setBreakSecondsInput("45")}
  style={{ height: 26, fontSize: 15, fontWeight: 900 }}
>
  0:45
</button>

<button
  onClick={() => setBreakSecondsInput("60")}
  style={{ height: 26, fontSize: 15, fontWeight: 900 }}
>
  1:00
</button>
  </div>
</div>
      </div>
    </div>

    <div
      style={{
        
        borderRadius: 8,
        padding: 8,
        boxSizing: "border-box",
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        display: "grid",
        gridTemplateRows: "24px 1fr",
        gap: 6,
      }}
    >
      <div
        style={{
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        ROUNDS
      </div>

      <div
        style={{
          
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          textAlign: "center",
          padding: 4,
          minWidth: 0,
          minHeight: 0,
        }}
      >
        <div
  style={{
    display: "grid",
    gridTemplateRows: "auto auto",
    gap: 6,
  }}
>
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
    }}
  >
    <button
  onClick={() =>
    setRoundsInput(String(Math.max(1, (parseInt(roundsInput, 10) || 0) - 1)))
  }
  style={{ minWidth: 50, height: 25, fontWeight: 900 }}
>
  -
</button>

<div style={{ fontSize: 18, fontWeight: 900 }}>
  {parseInt(roundsInput, 10) || 1}
</div>

<button
  onClick={() =>
    setRoundsInput(String((parseInt(roundsInput, 10) || 0) + 1))
  }
  style={{ minWidth: 50, height: 25, fontWeight: 900 }}
>
  +
</button>
  </div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 4,
    }}
  >
    <button
  onClick={() => setRoundsInput("1")}
  style={{ height: 26, fontSize: 15, fontWeight: 900 }}
>
  1
</button>

<button
  onClick={() => setRoundsInput("2")}
  style={{ height: 26, fontSize: 15, fontWeight: 900 }}
>
  2
</button>

<button
  onClick={() => setRoundsInput("3")}
  style={{ height: 26, fontSize: 15, fontWeight: 900 }}
>
  3
</button>
  </div>
</div>
      </div>
    </div>
  </div>
<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 4,
    marginTop: 6,
  }}
>
  <AppButton
  feedback="none"
  style={{
    ...styles.green,
    height: 28,
    fontSize: 14,
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }}
  onClick={startTimer}
>
  START
</AppButton>

  <AppButton
    style={{
      ...styles.amber,
      height: 28,
      fontSize: 14,
      borderRadius: 4,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
    onClick={pauseTimer}
  >
    PAUSE
  </AppButton>

  <AppButton
    style={{
      ...styles.purple,
      height: 28,
      fontSize: 14,
      borderRadius: 4,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
    onClick={finishMatch}
  >
    FINISH
  </AppButton>

  <AppButton
    style={{
      ...styles.red,
      height: 28,
      fontSize: 14,
      borderRadius: 4,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
    onClick={closeMatch}
  >
    SET DECISION
  </AppButton>
</div>
</div>

{/*==============================caja medical time==============*/}

  <div
  style={{
    
    borderRadius: 10,
    display: "grid",
    gridTemplateRows: "32px 1fr",
    gap: 8,
    fontWeight: 900,
    padding: 10,
    boxSizing: "border-box",
    minWidth: 0,
    minHeight: 0,
    overflow: "hidden",
    
  }}
>
  <div
    style={{
      fontSize: 20,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 0,
      overflow: "hidden",
      whiteSpace: "nowrap",
    }}
  >
    MEDICAL TIME
  </div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      minWidth: 0,
      minHeight: 0,
      overflow: "hidden",
     
    }}
  >
    <div
      style={{
        
        borderRadius: 8,
        padding: 2,
        boxSizing: "border-box",
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        display: "grid",
        gridTemplateRows: "auto 1fr",
        gap: 2,
        background: "white",
        
      }}
    >
      <div
        style={{
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        
      </div>

      <div
        style={{
          
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          textAlign: "center",
          padding: 4,
          minWidth: 0,
          minHeight: 0,
        }}
      >
        <div
  style={{
    display: "grid",
    gridTemplateRows: "auto auto",
    gap: 6,
    height: "100%",
    width: "100%",
    
  }}
>
  <button
  onClick={() => {
    if (inputsLocked) return;
    playButtonSound();
    handleMedicalStart(leftSide);
  }}

  onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
  onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}

  style={{
    background: isSwapped ? "#1d4ed8" : "#c81e1e",
    border: "none",
    borderRadius: 10,
    color: "white",
    fontWeight: 900,
    fontSize: 16,
    padding: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    position: "relative",
    zIndex: 10,

    transform: "scale(1)",
    transition: "transform 0.05s ease",

    cursor: inputsLocked ? "not-allowed" : "pointer",
    opacity: inputsLocked ? 0.4 : 1,
    pointerEvents: inputsLocked ? "none" : "auto",
  }}
>
  <span
    style={{
      background: isSwapped ? "#1e3a8a" : "#a31212",
      borderRadius: "50%",
      width: 24,
      height: 24,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 16,
    }}
  >
    +
  </span>

  <span>{isSwapped ? "CHONG" : "HONG"}</span>

  <span style={{ fontSize: 18 }}>
    {formatTime(
      (isSwapped ? meta.medicalChong : meta.medicalHong) || 0
    )}
  </span>
</button>

  <button
  onClick={() => {
    if (inputsLocked) return;
    playButtonSound();
    handleMedicalBreak();
  }}

  onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
  onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}

  style={{
    background: "#3f3f3f",
    border: "none",
    borderRadius: 10,
    color: "white",
    fontWeight: 900,
    fontSize: 12,
    padding: 6,
    width: "100%",
    cursor: "pointer",

    transform: "scale(1)",
    transition: "transform 0.05s ease",

    opacity: inputsLocked ? 0.4 : 1,
    pointerEvents: inputsLocked ? "none" : "auto",
  }}
>
  MEDICAL TIME BREAK
</button>
</div>
      </div>
    </div>

    <div
      style={{
  borderRadius: 8,
  padding: 2,
  boxSizing: "border-box",
  minWidth: 0,
  minHeight: 0,
  overflow: "hidden",
  display: "grid",
  gridTemplateRows: "auto 1fr",
  gap: 2,
  background: "white",
}}
    >
      <div
        style={{
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        
      </div>

      <div
        style={{
          
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          textAlign: "center",
          padding: 4,
          minWidth: 0,
          minHeight: 0,
        }}
      >
        <div
  style={{
    display: "grid",
    gridTemplateRows: "auto auto",
    gap: 6,
    height: "100%",
    width: "100%",
  }}
>
  <button
  onClick={() => {
    if (inputsLocked) return;
    playButtonSound();
    handleMedicalStart(rightSide);
  }}

  onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
  onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}

  style={{
    background: isSwapped ? "#c81e1e" : "#1d4ed8",
    border: "none",
    borderRadius: 10,
    color: "white",
    fontWeight: 900,
    fontSize: 16,
    padding: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",

    transform: "scale(1)",
    transition: "transform 0.05s ease",

    opacity: inputsLocked ? 0.4 : 1,
    pointerEvents: inputsLocked ? "none" : "auto",
    cursor: inputsLocked ? "not-allowed" : "pointer",
  }}
>
  <span
    style={{
      background: isSwapped ? "#a31212" : "#1e3a8a",
      borderRadius: "50%",
      width: 24,
      height: 24,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 16,
    }}
  >
    +
  </span>

  <span>{isSwapped ? "HONG" : "CHONG"}</span>

  <span style={{ fontSize: 18 }}>
    {formatTime(
      (isSwapped ? meta.medicalHong : meta.medicalChong) || 0
    )}
  </span>
</button>

  <button
  onClick={() => {
    if (inputsLocked) return;
    playButtonSound();
    handleMedicalBreak();
  }}

  onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
  onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}

  style={{
    background: "#3f3f3f",
    border: "none",
    borderRadius: 10,
    color: "white",
    fontWeight: 900,
    fontSize: 12,
    padding: 6,
    width: "100%",

    transform: "scale(1)",
    transition: "transform 0.05s ease",

    cursor: inputsLocked ? "not-allowed" : "pointer",
    opacity: inputsLocked ? 0.4 : 1,
    pointerEvents: inputsLocked ? "none" : "auto",
  }}
>
  MEDICAL TIME BREAK
</button>
</div>
      </div>
    </div>
  </div>
</div>

{/*====================================CAJA GRANDE WARNINGS=======================*/}

  <div
  style={{
    
    borderRadius: 10,
    display: "grid",
    gridTemplateRows: "32px 1fr",
    gap: 8,
    fontWeight: 900,
    padding: 10,
    boxSizing: "border-box",
    minWidth: 0,
    minHeight: 0,
    overflow: "hidden",
    
  }}
>
  <div
    style={{
      fontSize: 20,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 0,
      overflow: "hidden",
      whiteSpace: "nowrap",
    }}
  >
    WARNINGS & FOULS
  </div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      minWidth: 0,
      minHeight: 0,
      overflow: "hidden",
    }}
  >
    <div
      style={{
        borderRadius: 8,
        padding: 2,
        boxSizing: "border-box",
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        display: "grid",
        gridTemplateRows: "auto 1fr",
        gap: 0,
        
      }}
    >
      <div></div>

      <div
        style={{
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          textAlign: "center",
          padding: 4,
          minWidth: 0,
          minHeight: 0,
        }}
      >
        <div
  style={{
    display: "grid",
    gridTemplateRows: "auto auto auto",
    gap: 6,
    height: "100%",
    width: "100%",
  }}
>
  <button
  onClick={() => {
  if (inputsLocked) return;
  playButtonSound();
  handleWarningAdd(leftSide);
}}
onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
  disabled={inputsLocked}
  style={{

   

    background: isSwapped ? "#1d4ed8" : "#c81e1e",
    border: "none",
    borderRadius: 10,
    color: "white",
    fontWeight: 900,
    fontSize: 16,
    padding: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    transform: "scale(1)",
    transition: "transform 0.05s ease",

    opacity: inputsLocked ? 0.4 : 1,
    pointerEvents: inputsLocked ? "none" : "auto",
  }}
>
  <span>WARNING</span>
  <span style={{ fontSize: 18 }}>
    {leftSide === "hong"
      ? meta.hongWarnings || 0
      : meta.chongWarnings || 0}
  </span>
</button>

  <button
  onClick={() => {
    if (inputsLocked) return;
    playButtonSound();
    handleFoulAdd(leftSide);
  }}

    onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}

  disabled={inputsLocked}
  style={{
    background: isSwapped ? "#1e3a8a" : "#a31212",
    border: "none",
    borderRadius: 10,
    color: "white",
    fontWeight: 900,
    fontSize: 14,
    padding: 6,
    width: "100%",

    transform: "scale(1)",
    transition: "transform 0.05s ease",

    opacity: inputsLocked ? 0.4 : 1,
    pointerEvents: inputsLocked ? "none" : "auto",
  }}
>
  <span>
    FOUL{" "}
    {leftSide === "hong"
      ? meta.hongFouls || 0
      : meta.chongFouls || 0}
  </span>
</button>

  <button
  onClick={async () => {
    if (inputsLocked) return;

    playButtonSound();

    await commitEditor(editorDraftRef.current);

    await writeMeta((current) => {
      let hongWarnings = current.hongWarnings || 0;
      let chongWarnings = current.chongWarnings || 0;
      let hongFouls = current.hongFouls || 0;
      let chongFouls = current.chongFouls || 0;

      if (leftSide === "hong") {
        if (hongFouls > 0) hongFouls -= 1;
        else if (hongWarnings > 0) hongWarnings -= 1;
      }

      if (leftSide === "chong") {
        if (chongFouls > 0) chongFouls -= 1;
        else if (chongWarnings > 0) chongWarnings -= 1;
      }

      return {
        ...current,
        hongWarnings,
        chongWarnings,
        hongFouls,
        chongFouls,
      };
    });
  }}

  onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
  onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}

  disabled={inputsLocked}
  style={{
    background: "#3f3f3f",
    border: "none",
    borderRadius: 10,
    color: "white",
    fontWeight: 900,
    fontSize: 12,
    padding: 6,
    width: "100%",
    cursor: inputsLocked ? "not-allowed" : "pointer",

    transform: "scale(1)",
    transition: "transform 0.05s ease",

    opacity: inputsLocked ? 0.4 : 1,
    pointerEvents: inputsLocked ? "none" : "auto",
  }}
>
  {isSwapped ? "DELETE CHONG" : "DELETE HONG"}
</button>
</div>
      </div>
    </div>

    <div
      style={{
        borderRadius: 8,
        padding: 2,
        boxSizing: "border-box",
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        display: "grid",
        gridTemplateRows: "auto 1fr",
        gap: 0,
        
      }}
    >
      <div></div>

      <div
        style={{
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          textAlign: "center",
          padding: 4,
          minWidth: 0,
          minHeight: 0,
        }}
      >
        <div
  style={{
    display: "grid",
    gridTemplateRows: "auto auto auto",
    gap: 6,
    height: "100%",
    width: "100%",
  }}
>
  <button
  onClick={() => {
  if (inputsLocked) return;
  playButtonSound();
  handleWarningAdd(rightSide);
}}
  onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
  onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
  disabled={inputsLocked}
  style={{
    background: isSwapped ? "#c81e1e" : "#1d4ed8",
    border: "none",
    borderRadius: 10,
    color: "white",
    fontWeight: 900,
    fontSize: 16,
    padding: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    transform: "scale(1)",
    transition: "transform 0.05s ease",

    opacity: inputsLocked ? 0.4 : 1,
    pointerEvents: inputsLocked ? "none" : "auto",
  }}
>
  <span>WARNING</span>
  <span style={{ fontSize: 18 }}>
    {rightSide === "hong"
      ? meta.hongWarnings || 0
      : meta.chongWarnings || 0}
  </span>
</button>

  <button
  onClick={() => {
    if (inputsLocked) return;
    playButtonSound();
    handleFoulAdd(rightSide);
  }}

  onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
  onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}

  disabled={inputsLocked}
  style={{
    background: isSwapped ? "#a31212" : "#1e3a8a",
    border: "none",
    borderRadius: 10,
    color: "white",
    fontWeight: 900,
    fontSize: 14,
    padding: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",

    transform: "scale(1)",
    transition: "transform 0.05s ease",

    opacity: inputsLocked ? 0.4 : 1,
    pointerEvents: inputsLocked ? "none" : "auto",
  }}
>
  <span>FOUL</span>
  <span style={{ fontSize: 16 }}>
    {rightSide === "hong"
      ? meta.hongFouls || 0
      : meta.chongFouls || 0}
  </span>
</button>

{/*==================================BOTONES WARNINGS & FOULS===========================*/}

  <button
  onClick={async () => {
    if (inputsLocked) return;

    playButtonSound();

    await commitEditor(editorDraftRef.current);

    await writeMeta((current) => {
      let hongWarnings = current.hongWarnings || 0;
      let chongWarnings = current.chongWarnings || 0;
      let hongFouls = current.hongFouls || 0;
      let chongFouls = current.chongFouls || 0;

      if (rightSide === "hong") {
        if (hongFouls > 0) hongFouls -= 1;
        else if (hongWarnings > 0) hongWarnings -= 1;
      }

      if (rightSide === "chong") {
        if (chongFouls > 0) chongFouls -= 1;
        else if (chongWarnings > 0) chongWarnings -= 1;
      }

      return {
        ...current,
        hongWarnings,
        chongWarnings,
        hongFouls,
        chongFouls,
      };
    });
  }}

  onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
  onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}

  disabled={inputsLocked}
  style={{
    background: "#3f3f3f",
    border: "none",
    borderRadius: 10,
    color: "white",
    fontWeight: 900,
    fontSize: 12,
    padding: 6,
    width: "100%",
    cursor: inputsLocked ? "not-allowed" : "pointer",

    transform: "scale(1)",
    transition: "transform 0.05s ease",

    opacity: inputsLocked ? 0.4 : 1,
    pointerEvents: inputsLocked ? "none" : "auto",
  }}
>
  {isSwapped ? "DELETE HONG" : "DELETE CHONG"}
</button>
</div>
      </div>
    </div>
  </div>
</div>
</div>

{/*==============================Caja Hong Data 4ta fila=====================*/}

      <div
        style={{
          
          borderRadius: 12,
          display: "grid",
          gridTemplateColumns: "1fr 0.7fr 1fr",
          gap: 8,
          padding: 8,
          color: "white",
        }}
      >
        <div
  style={{
    
    borderRadius: 10,
    display: "grid",
    gridTemplateRows: "32px 1fr",
    gap: 8,
    fontWeight: 900,
    padding: 8,
    boxSizing: "border-box",
    minWidth: 0,
    minHeight: 0,
    overflow: "hidden",
    background: isSwapped
  ? "linear-gradient(135deg, rgba(0,102,255,0.6), rgba(0,40,120,0.8))"
  : "linear-gradient(135deg, rgba(255,0,0,0.6), rgba(180,0,0,0.8))",
  }}
>
  <div
    style={{
      fontSize: 20,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      whiteSpace: "nowrap",
    }}
  >
    {isSwapped ? "CHONG DATA" : "HONG DATA"}
  </div>

  <div
  style={{
    borderRadius: 8,
    
    color: "black",
    display: "grid",
    gridTemplateRows: "1fr 1fr",
    gap: 6,
    padding: 0,
    boxSizing: "border-box",
    minWidth: 0,
    minHeight: 0,
  }}
>
  <input
    placeholder="NAME"
    style={{
      width: "100%",
      borderRadius: 50,
      border: isSwapped ? "2px solid #4da6ff" : "2px solid #ff4d4d",
      padding: 10,
      fontWeight: 900,
      textAlign: "center",
      fontSize: 16,
    }}
  />

  <input
    placeholder="TEAM"
    style={{
      width: "100%",
      borderRadius: 50,
      border: isSwapped ? "2px solid #4da6ff" : "2px solid #ff4d4d",
      padding: 10,
      fontWeight: 900,
      textAlign: "center",
      fontSize: 14,
    }}
  />
</div>
</div>

<div
  style={{
    
    borderRadius: 10,
    display: "grid",
    gridTemplateRows: "32px auto auto",
    gap: 8,
    fontWeight: 900,
    padding: 8,
    boxSizing: "border-box",
    minWidth: 0,
    minHeight: 0,
    overflow: "hidden",
    
    color: "white",
  }}
>
  <div
    style={{
      fontSize: 20,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      whiteSpace: "nowrap",
    }}
  >
    MED TIME SET
  </div>

  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <select
      style={{
        width: "100%",
        borderRadius: 50,
        border: "2px solid #cccccc",
        padding: 8,
        fontWeight: 900,
        textAlign: "center",
        fontSize: 16,
        background: "white",
        color: "black",
      }}
    >
      <option>00:30</option>
      <option>01:00</option>
      <option>01:30</option>
      <option>02:00</option>
      <option>02:30</option>
      <option>03:00</option>
      <option>03:30</option>
      <option>04:00</option>
      <option>04:30</option>
      <option>05:00</option>
    </select>
  </div>

  <button
    style={{
      width: "100%",
      border: "none",
      borderRadius: 999,
      background: "#3f3f3f",
      color: "white",
      fontWeight: 900,
      fontSize: 14,
      padding: 10,
    }}
  >
    ⟲ RESET MEDICAL TIME
  </button>
</div>
<div
  style={{
    
    borderRadius: 10,
    display: "grid",
    gridTemplateRows: "32px 1fr",
    gap: 8,
    fontWeight: 900,
    padding: 8,
    boxSizing: "border-box",
    minWidth: 0,
    minHeight: 0,
    overflow: "hidden",
    background: isSwapped
  ? "linear-gradient(135deg, rgba(255,0,0,0.6), rgba(180,0,0,0.8))"
  : "linear-gradient(135deg, rgba(0,102,255,0.6), rgba(0,40,120,0.8))",
  }}
>
  <div
    style={{
      fontSize: 20,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      whiteSpace: "nowrap",
    }}
  >
    {isSwapped ? "HONG DATA" : "CHONG DATA"}
  </div>

  <div
  style={{
    borderRadius: 8,
    color: "black",
    display: "grid",
    gridTemplateRows: "1fr 1fr",
    gap: 6,
    padding: 0,
    boxSizing: "border-box",
    minWidth: 0,
    minHeight: 0,
  }}
>
  <input
    placeholder="NAME"
    style={{
      width: "100%",
      borderRadius: 50,
      border: isSwapped ? "2px solid #ff4d4d" : "2px solid #4da6ff",
      padding: 10,
      fontWeight: 900,
      textAlign: "center",
      fontSize: 16,
    }}
  />

  <input
    placeholder="TEAM"
    style={{
      width: "100%",
      borderRadius: 50,
      border: isSwapped ? "2px solid #ff4d4d" : "2px solid #4da6ff",
      padding: 10,
      fontWeight: 900,
      textAlign: "center",
      fontSize: 14,
    }}
  />
</div>
</div>
      </div>

{/*==============================FILA NUMERO 5 GOLDEN POINTS===========*/}

      <div
        style={{
          
          borderRadius: 12,
          display: "grid",
          gridTemplateColumns: "1pr 0.50fr 1fr",
          gap: 8,
          padding: 8,
          minHeight: 0,
          color: "white",
        }}
      >
        <div
  style={{
    
    borderRadius: 12,
    display: "grid",
    gridTemplateRows: "50px 1fr 1fr",
    gap: 8,
    padding: 8,
    boxSizing: "border-box",
    
    color: "white",
    fontWeight: 900,
  }}
>
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 18,
    }}
  >
    GOLDEN POINT
  </div>

  <button
    style={{
      border: "none",
      borderRadius: 10,
      background: "linear-gradient(135deg, #FFD700, #B8860B)",
      color: "black",
      color: "black",
      fontWeight: 900,
      fontSize: 16,
      padding: 10,
    }}
  >
    GOLDEN POINT A
  </button>

  <button
    style={{
      border: "none",
      borderRadius: 10,
      background: "linear-gradient(135deg, #FFC300, #8B6508)",
      
      color: "black",
      color: "black",
      fontWeight: 900,
      fontSize: 16,
      padding: 10,
    }}
  >
    GOLDEN POINT B
  </button>
</div>

        <div
          style={{
            
            borderRadius: 10,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
            padding: 8,
            minHeight: 0,
          }}
        >
          <div
  style={{
    
    borderRadius: 10,
    display: "grid",
    gridTemplateRows: "28px 1fr",
    gap: 6,
    padding: 6,
    boxSizing: "border-box",
    
    color: "white",
    fontWeight: 900,
  }}
>
  {/*=====================TITULO JUEZ===================*/}
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 14,
    }}
  >
    JUDGE 1
  </div>

  {/* CONTENIDO */}
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 6,
    }}
  >
    {/* HONG */}
    <div
      style={{
        borderRadius: 8,
        background: isSwapped
  ? "linear-gradient(135deg, rgba(0,102,255,0.5), rgba(0,30,120,0.8))"
  : "linear-gradient(135deg, rgba(255,0,0,0.75), rgba(120,0,0,1))",
        boxShadow: "inset 0 0 12px rgba(255,0,0,0.6)",
        
        display: "grid",
        gridTemplateRows: "1fr 1fr 1fr",
        padding: 6,
        textAlign: "center",
        fontSize: 12,
      }}
    >
      <div>POINTS 0</div>
      <div>WARNING 0</div>
      <div>FOULS 0</div>
    </div>

    {/* CHONG */}
    <div
      style={{
        borderRadius: 8,
        background: isSwapped
  ? "linear-gradient(135deg, rgba(255,0,0,0.75), rgba(120,0,0,1))"
  : "linear-gradient(135deg, rgba(0,102,255,0.5), rgba(0,30,120,0.8))",
        display: "grid",
        gridTemplateRows: "1fr 1fr 1fr",
        padding: 6,
        textAlign: "center",
        fontSize: 12,
      }}
    >
      <div>POINTS 0</div>
      <div>WARNING 0</div>
      <div>FOULS 0</div>
    </div>
  </div>
</div>
          <div
  style={{
    
    borderRadius: 10,
    display: "grid",
    gridTemplateRows: "28px 1fr",
    gap: 6,
    padding: 6,
    boxSizing: "border-box",
    
    color: "white",
    fontWeight: 900,
  }}
>
  {/*=====================TITULO JUEZ===================*/}
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 14,
    }}
  >
    JUDGE 2
  </div>

  {/* CONTENIDO */}
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 6,
    }}
  >
    {/* HONG */}
    <div
      style={{
        borderRadius: 8,
        background: isSwapped
  ? "linear-gradient(135deg, rgba(0,102,255,0.5), rgba(0,30,120,0.8))"
  : "linear-gradient(135deg, rgba(255,0,0,0.75), rgba(120,0,0,1))",
        boxShadow: "inset 0 0 12px rgba(255,0,0,0.6)",
        
        display: "grid",
        gridTemplateRows: "1fr 1fr 1fr",
        padding: 6,
        textAlign: "center",
        fontSize: 12,
      }}
    >
      <div>POINTS 0</div>
      <div>WARNING 0</div>
      <div>FOULS 0</div>
    </div>

    {/* CHONG */}
    <div
      style={{
        borderRadius: 8,
        background: isSwapped
  ? "linear-gradient(135deg, rgba(255,0,0,0.75), rgba(120,0,0,1))"
  : "linear-gradient(135deg, rgba(0,102,255,0.5), rgba(0,30,120,0.8))",
        display: "grid",
        gridTemplateRows: "1fr 1fr 1fr",
        padding: 6,
        textAlign: "center",
        fontSize: 12,
      }}
    >
      <div>POINTS 0</div>
      <div>WARNING 0</div>
      <div>FOULS 0</div>
    </div>
  </div>
</div>
          <div
  style={{
    
    borderRadius: 10,
    display: "grid",
    gridTemplateRows: "28px 1fr",
    gap: 6,
    padding: 6,
    boxSizing: "border-box",
    
    color: "white",
    fontWeight: 900,
  }}
>
  {/*=====================TITULO JUEZ===================*/}
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 14,
    }}
  >
    JUDGE 3
  </div>

  {/* CONTENIDO */}
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 6,
    }}
  >
    {/* HONG */}
    <div
      style={{
        borderRadius: 8,
        background: isSwapped
  ? "linear-gradient(135deg, rgba(0,102,255,0.5), rgba(0,30,120,0.8))"
  : "linear-gradient(135deg, rgba(255,0,0,0.75), rgba(120,0,0,1))",
        boxShadow: "inset 0 0 12px rgba(255,0,0,0.6)",
        
        display: "grid",
        gridTemplateRows: "1fr 1fr 1fr",
        padding: 6,
        textAlign: "center",
        fontSize: 12,
      }}
    >
      <div>POINTS 0</div>
      <div>WARNING 0</div>
      <div>FOULS 0</div>
    </div>

    {/* CHONG */}
    <div
      style={{
        borderRadius: 8,
        background: isSwapped
  ? "linear-gradient(135deg, rgba(255,0,0,0.75), rgba(120,0,0,1))"
  : "linear-gradient(135deg, rgba(0,102,255,0.5), rgba(0,30,120,0.8))",
        display: "grid",
        gridTemplateRows: "1fr 1fr 1fr",
        padding: 6,
        textAlign: "center",
        fontSize: 12,
      }}
    >
      <div>POINTS 0</div>
      <div>WARNING 0</div>
      <div>FOULS 0</div>
    </div>
  </div>
</div>
          <div
  style={{
    
    borderRadius: 10,
    display: "grid",
    gridTemplateRows: "28px 1fr",
    gap: 6,
    padding: 6,
    boxSizing: "border-box",
    
    color: "white",
    fontWeight: 900,
  }}
>
  {/*=====================TITULO JUEZ===================*/}
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 14,
    }}
  >
    JUDGE 4
  </div>

  {/* CONTENIDO */}
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 6,
    }}
  >
    {/* HONG */}
    <div
      style={{
        borderRadius: 8,
        background: isSwapped
  ? "linear-gradient(135deg, rgba(0,102,255,0.5), rgba(0,30,120,0.8))"
  : "linear-gradient(135deg, rgba(255,0,0,0.75), rgba(120,0,0,1))",
        boxShadow: "inset 0 0 12px rgba(255,0,0,0.6)",
        
        display: "grid",
        gridTemplateRows: "1fr 1fr 1fr",
        padding: 6,
        textAlign: "center",
        fontSize: 12,
      }}
    >
      <div>POINTS 0</div>
      <div>WARNING 0</div>
      <div>FOULS 0</div>
    </div>

    {/* CHONG */}
    <div
      style={{
        borderRadius: 8,
        background: isSwapped
  ? "linear-gradient(135deg, rgba(255,0,0,0.75), rgba(120,0,0,1))"
  : "linear-gradient(135deg, rgba(0,102,255,0.5), rgba(0,30,120,0.8))",
        display: "grid",
        gridTemplateRows: "1fr 1fr 1fr",
        padding: 6,
        textAlign: "center",
        fontSize: 12,
      }}
    >
      <div>POINTS 0</div>
      <div>WARNING 0</div>
      <div>FOULS 0</div>
    </div>
  </div>
</div>
        </div>
      </div>

      <div
        style={{
          
          borderRadius: 12,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8,
          padding: 8,
          color: "white",
        }}
      >
        <div
  style={{
    
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: 22,
    padding: 12,
    boxSizing: "border-box",
    background: isSwapped
  ? "linear-gradient(135deg, rgba(0,102,255,0.65), rgba(0,45,140,0.95))"
  : "linear-gradient(135deg, rgba(255,0,0,0.65), rgba(140,0,0,0.95))",
    color: "white",
    boxShadow: isSwapped
  ? "inset 0 0 12px rgba(255,255,255,0.12), 0 0 14px rgba(0,102,255,0.35)"
  : "inset 0 0 12px rgba(255,255,255,0.12), 0 0 14px rgba(255,0,0,0.35)",
    transform: "scale(1)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  }}
>
  {isSwapped ? "CHONG WINNER" : "HONG WINNER"}
</div>

<div
  style={{
    
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: 22,
    padding: 12,
    boxSizing: "border-box",
    background: "linear-gradient(135deg, #e5e5e5, #8c8c8c)",
    color: "black",
    border: "3px solid #cccccc",
    color: "black",
    boxShadow: "inset 0 0 12px rgba(255,255,255,0.18), 0 0 14px rgba(255,215,0,0.35)",
    transform: "scale(1)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  }}
>
  DRAW
</div>

<div
  style={{
    
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: 22,
    padding: 12,
    boxSizing: "border-box",
    background: isSwapped
  ? "linear-gradient(135deg, rgba(255,0,0,0.65), rgba(140,0,0,0.95))"
  : "linear-gradient(135deg, rgba(0,102,255,0.65), rgba(0,45,140,0.95))",
    color: "white",
    boxShadow: isSwapped
  ? "inset 0 0 12px rgba(255,255,255,0.12), 0 0 14px rgba(255,0,0,0.35)"
  : "inset 0 0 12px rgba(255,255,255,0.12), 0 0 14px rgba(0,102,255,0.35)",
    transform: "scale(1)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  }}
>
  {isSwapped ? "HONG WINNER" : "CHONG WINNER"}
  {isSwapped ? "HONG WINNER" : "CHONG WINNER"}
</div>
      </div>
    </div>

    {presidentWinner && (
      <WinnerFullScreen
        winner={presidentWinner}
        onNextCombat={() => {}}
        onResetTotal={() => {}}
        onClose={() =>
          writeMeta((current) => ({
            ...current,
            showResult: false,
          }))
        }
      />
    )}

{secondFoulWarning(meta) &&
  meta.phase !== "finished" &&
  !meta.showResult && (
    <div
      style={{
        position: "absolute",
        top: 21,
        left: 650,
        zIndex: 30,
        width: 680,
        minHeight: 34,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#7c2d12",
        border: "1px solid #f97316",
        borderRadius: 8,
        color: "#ffedd5",
        fontWeight: 900,
        fontSize: 17,
        lineHeight: 1.1,
        padding: "4px 10px",
        boxSizing: "border-box",
        textAlign: "center",
      }}
    >
      {secondFoulWarning(meta)}
    </div>
)}

  </Frame16x9>
);
}

{/*=============================HASTA ACA ES FUNCTION PRESIDENTSCREENV2============================*/}

function JudgeScreen({ meta, judges, writeJudge, writeMeta, judgeId, navigate }) {
  const time = useClock(meta);
  const prevFinishedRef = useRef(false);

  useEffect(() => {
    const isFinished = meta.phase === "finished";
    if (isFinished && !prevFinishedRef.current) {
      playWinnerSound();
    }
    prevFinishedRef.current = isFinished;
  }, [meta.phase]);

  if (judgeId > COMBAT_JUDGES) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          width: "100%",
          background: "#020814",
          color: "white",
          padding: 12,
          boxSizing: "border-box",
          overflowX: "hidden",
          overflowY: "auto",
          fontFamily: "Arial, sans-serif",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div style={{ width: "100%", maxWidth: 560, margin: "0 auto" }}>
          <AppButton
            style={{
              ...styles.gray,
              boxShadow: "0 0 18px rgba(255,255,255,0.16)",
              width: "100%",
              minHeight: 54,
              fontSize: 18,
            }}
            onClick={() => navigate("/")}
          >
            Inicio
          </AppButton>

          <BrandHeaderSmall />

          <h1 style={{ textAlign: "center", fontSize: "clamp(28px, 6vw, 40px)", margin: "8px 0 14px" }}>
            Juez {judgeId}
          </h1>

          <div
            style={{
              background: "#07111f",
              border: "1px solid #17304f",
              borderRadius: 18,
              padding: 18,
              textAlign: "center",
              fontSize: "clamp(16px, 4vw, 20px)",
              fontWeight: 700,
            }}
          >
            Este juez no está activo en la modalidad actual.
          </div>
        </div>
      </div>
    );
  }

  const judge = judges.find((j) => j.id === judgeId) || makeJudge(judgeId);
  const warning = secondFoulWarning(meta);
  

  const updateJudge = async (kind, side = null, value = null) => {
    await writeJudge(judgeId, (j) => {
      if (kind === "UNDO") {
        if (!j.history?.length) return j;
        return j.history[j.history.length - 1];
      }

      const before = clone(j);
      const next = clone(j);
      next.history = [...(j.history || []), before];

      if (kind === "POINT") {
        if (side === "hong") next.hongPoints += value;
        else next.chongPoints += value;
      }
      return next;
    });

    if (kind === "POINT" && meta.goldenPoint?.active && meta.goldenPoint?.mode === "A") {
      const declaredSummary = summary(meta, judges);
      if (declaredSummary.hongVotes >= 2 || declaredSummary.chongVotes >= 2) {
        await writeMeta((current) => {
          current.combatForcedWinner = declaredSummary.hongVotes >= 2 ? "hong" : "chong";
          current.phase = "finished";
          current.status = "paused";
          current.pausedRemaining = 0;
          current.phaseStartedAt = null;
          return current;
        });
      }
    }
  };

  const judgeWinner = summary(meta, judges).winner;
  const showJudgeWinner = meta.showResult === true;
  const isSmallMobile = typeof window !== "undefined" && window.innerWidth <= 430;
  const isVerySmallMobile = typeof window !== "undefined" && window.innerWidth <= 390;

  const shellStyle = {
    minHeight: "100dvh",
    width: "100%",
    background: "linear-gradient(180deg, #06101c 0%, #020814 100%)",
    color: "white",
    padding: isVerySmallMobile ? 8 : isSmallMobile ? 10 : 12,
    boxSizing: "border-box",
    overflowX: "hidden",
    overflowY: "auto",
    fontFamily: "Arial, sans-serif",
    WebkitOverflowScrolling: "touch",
  };

  const wrapStyle = {
    width: "100%",
    maxWidth: isVerySmallMobile ? 760 : 900,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: isVerySmallMobile ? 8 : 12,
    paddingBottom: isVerySmallMobile ? 20 : 28,
    boxSizing: "border-box",
  };

  const cardStyle = {
    background: "#07111f",
    border: "1px solid #17304f",
    borderRadius: isVerySmallMobile ? 18 : 22,
    padding: isVerySmallMobile ? 12 : 14,
    boxSizing: "border-box",
    boxShadow: "0 12px 36px rgba(0,0,0,0.28)",
  };

  const statCardStyle = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: isVerySmallMobile ? 14 : 16,
    padding: isVerySmallMobile ? "10px 8px" : "12px 10px",
    textAlign: "center",
    minHeight: isVerySmallMobile ? 68 : 76,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    boxSizing: "border-box",
  };

  const sideBoxBase = {
    borderRadius: isVerySmallMobile ? 16 : 20,
    padding: isVerySmallMobile ? 10 : 14,
    display: "flex",
    flexDirection: "column",
    gap: isVerySmallMobile ? 8 : 12,
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
    boxSizing: "border-box",
    minWidth: 0,
  };

  const scoreStyle = {
    textAlign: "center",
    fontSize: isVerySmallMobile ? "clamp(44px, 10vw, 72px)" : "clamp(56px, 10vw, 96px)",
    fontWeight: 900,
    lineHeight: 0.95,
    letterSpacing: "-0.04em",
    textShadow: "0 10px 24px rgba(0,0,0,0.28)",
    margin: isVerySmallMobile ? "0 0 2px" : "4px 0 2px",
  };

  const buttonGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: isVerySmallMobile ? 8 : 10,
    width: "100%",
  };

  const touchBtnBase = {
    minHeight: isVerySmallMobile ? 68 : 82,
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: isVerySmallMobile ? 14 : 18,
    color: "white",
    fontWeight: 900,
    fontSize: isVerySmallMobile ? "clamp(20px, 5vw, 28px)" : "clamp(28px, 7vw, 38px)",
    cursor: "pointer",
    boxShadow: "0 0 18px rgba(255,255,255,0.10), inset 0 0 12px rgba(255,255,255,0.05)",
    width: "100%",
    minWidth: 0,
  };

  const sidesWrapStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: isVerySmallMobile ? 10 : 14,
    alignItems: "stretch",
  };

  return (
    <div style={shellStyle}>
      <div style={wrapStyle}>
        <AppButton
          style={{
            ...styles.gray,
            boxShadow: "0 0 18px rgba(255,255,255,0.16)",
            width: "100%",
            minHeight: isVerySmallMobile ? 50 : 54,
            fontSize: isVerySmallMobile ? 17 : 18,
          }}
          onClick={() => navigate("/")}
        >
          Inicio
        </AppButton>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <BrandHeaderSmall />
        </div>

        <div
          style={{
            ...cardStyle,
            paddingTop: isVerySmallMobile ? 12 : 16,
            paddingBottom: isVerySmallMobile ? 12 : 16,
          }}
        >
          <div
            style={{
              textAlign: "center",
              fontSize: isVerySmallMobile ? "clamp(26px, 6.5vw, 36px)" : "clamp(30px, 7vw, 42px)",
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: "0.04em",
            }}
          >
            JUEZ {judgeId}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: isVerySmallMobile ? 8 : 10,
          }}
        >
          <div style={statCardStyle}>
            <div style={{ fontSize: isVerySmallMobile ? 12 : 13, opacity: 0.85, fontWeight: 700, letterSpacing: "0.06em" }}>
              TIEMPO
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: isVerySmallMobile ? "clamp(20px, 4.8vw, 28px)" : "clamp(22px, 5vw, 30px)",
                fontWeight: 900,
              }}
            >
              {formatTime(time)}
            </div>
          </div>

          <div style={statCardStyle}>
            <div style={{ fontSize: isVerySmallMobile ? 12 : 13, opacity: 0.85, fontWeight: 700, letterSpacing: "0.06em" }}>
              ESTADO
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: isVerySmallMobile ? "clamp(16px, 4vw, 21px)" : "clamp(18px, 4.5vw, 24px)",
                fontWeight: 900,
              }}
            >
              {meta.phase === "break" ? "DESCANSO" : "COMBATE"}
            </div>
          </div>
        </div>

        {meta.goldenPoint?.active && (
          <div
            style={{
              ...cardStyle,
              background: "#4c1d95",
              border: "1px solid #8b5cf6",
              color: "#f5f3ff",
              textAlign: "center",
              fontWeight: 900,
              fontSize: isVerySmallMobile ? "clamp(15px, 3.8vw, 20px)" : "clamp(16px, 4vw, 22px)",
            }}
          >
            {meta.goldenPoint.mode === "A"
              ? "GOLDEN POINT A"
              : `GOLDEN POINT B / ROUND ${meta.goldenPoint.gpRound || 1}`}
          </div>
        )}

        {meta.phase === "break" && (
          <div
            style={{
              ...cardStyle,
              background: "#7c2d12",
              border: "1px solid #f97316",
              color: "#ffedd5",
              textAlign: "center",
              fontWeight: 900,
              fontSize: isVerySmallMobile ? "clamp(15px, 3.8vw, 20px)" : "clamp(16px, 4vw, 22px)",
            }}
          >
            DESCANSO · NO MANIPULAR
          </div>
        )}

        {!!warning && !meta.goldenPoint?.active && (
          <div
            style={{
              ...cardStyle,
              background: "#7c2d12",
              border: "1px solid #f97316",
              color: "#ffedd5",
              textAlign: "center",
              fontWeight: 900,
              fontSize: isVerySmallMobile ? "clamp(14px, 3.7vw, 18px)" : "clamp(15px, 4vw, 20px)",
            }}
          >
            {warning}
          </div>
        )}

        <div style={sidesWrapStyle}>
          <div
            style={{
              ...cardStyle,
              ...sideBoxBase,
              background: "linear-gradient(180deg, #991b1b 0%, #5f1010 100%)",
            }}
          >
            <div
              style={{
                textAlign: "center",
                fontSize: isVerySmallMobile ? "clamp(16px, 4vw, 22px)" : "clamp(20px, 5vw, 28px)",
                fontWeight: 900,
                letterSpacing: "0.08em",
              }}
            >
              HONG
            </div>

            <div style={scoreStyle}>{judge.hongPoints}</div>

            <div style={buttonGridStyle}>
              <AppButton
                feedback="judge"
                style={{ ...touchBtnBase, background: "#b91c1c" }}
                onClick={() => updateJudge("POINT", "hong", 1)}
              >
                +1
              </AppButton>
              <AppButton
                feedback="judge"
                style={{ ...touchBtnBase, background: "#dc2626" }}
                onClick={() => updateJudge("POINT", "hong", 2)}
              >
                +2
              </AppButton>
              <AppButton
                feedback="judge"
                style={{ ...touchBtnBase, background: "#ef4444" }}
                onClick={() => updateJudge("POINT", "hong", 3)}
              >
                +3
              </AppButton>
              <AppButton
                feedback="judge"
                style={{ ...touchBtnBase, background: "#f87171" }}
                onClick={() => updateJudge("POINT", "hong", 4)}
              >
                +4
              </AppButton>
            </div>
          </div>

          <div
            style={{
              ...cardStyle,
              ...sideBoxBase,
              background: "linear-gradient(180deg, #1d4ed8 0%, #132e7b 100%)",
            }}
          >
            <div
              style={{
                textAlign: "center",
                fontSize: isVerySmallMobile ? "clamp(16px, 4vw, 22px)" : "clamp(20px, 5vw, 28px)",
                fontWeight: 900,
                letterSpacing: "0.08em",
              }}
            >
              CHONG
            </div>

            <div style={scoreStyle}>{judge.chongPoints}</div>

            <div style={buttonGridStyle}>
              <AppButton
                feedback="judge"
                style={{ ...touchBtnBase, background: "#1d4ed8" }}
                onClick={() => updateJudge("POINT", "chong", 1)}
              >
                +1
              </AppButton>
              <AppButton
                feedback="judge"
                style={{ ...touchBtnBase, background: "#2563eb" }}
                onClick={() => updateJudge("POINT", "chong", 2)}
              >
                +2
              </AppButton>
              <AppButton
                feedback="judge"
                style={{ ...touchBtnBase, background: "#3b82f6" }}
                onClick={() => updateJudge("POINT", "chong", 3)}
              >
                +3
              </AppButton>
              <AppButton
                feedback="judge"
                style={{ ...touchBtnBase, background: "#60a5fa" }}
                onClick={() => updateJudge("POINT", "chong", 4)}
              >
                +4
              </AppButton>
            </div>
          </div>
        </div>

        <AppButton
          feedback="judge"
          style={{
            ...styles.gray,
            minHeight: isVerySmallMobile ? 56 : 62,
            fontSize: isVerySmallMobile ? "clamp(17px, 4.2vw, 22px)" : "clamp(18px, 4.5vw, 24px)",
            fontWeight: 900,
            boxShadow: "0 0 18px rgba(255,255,255,0.16)",
          }}
          onClick={() => updateJudge("UNDO")}
        >
          DESHACER
        </AppButton>
      </div>

      {showJudgeWinner && <WinnerFullScreen winner={judgeWinner} />}
    </div>
  );
}

export default function App() {
  const { meta, judges, writeMeta, writeJudge, resetAll } = useFightData();
  const { path, navigate } = useRoute();

  useEffect(() => {
    if (!meta) return;
    if (meta.mode !== "combat") {
      writeMeta((current) => {
        current.mode = "combat";
        current.config.rounds = current.config.rounds || 2;
        current.config.roundSeconds = current.config.roundSeconds || 120;
        current.config.breakSeconds = current.config.breakSeconds || BREAK_SECONDS;
        if (!current.pausedRemaining) current.pausedRemaining = current.config.roundSeconds;
        current.publicSwapSides = !!current.publicSwapSides;
        current.presidentSwapSides = !!current.presidentSwapSides;
        current.hong = current.hong || getBaseCombatant(HONG);
        current.chong = current.chong || getBaseCombatant(CHONG);
        return current;
      });
    }
  }, [meta, writeMeta]);

  if (!meta) {
    return <><GlobalAppStyle /><div style={styles.page}>Cargando...</div></>;
  }

  if (path === "/president") {
    return (
      <><GlobalAppStyle /><PresidentScreenV2
        meta={meta}
        judges={judges}
        writeMeta={writeMeta}
        writeJudge={writeJudge}
        resetAll={resetAll}
        navigate={navigate}
      /></> 
    );
  }

  if (path === "/public") {
    return <><GlobalAppStyle /><PublicScreen meta={meta} judges={judges} navigate={navigate} /></>;
  }

  if (path.startsWith("/judge/")) {
    const n = Number(path.split("/")[2]);
    if (n >= 1 && n <= COMBAT_JUDGES) {
      return (
        <><GlobalAppStyle /><JudgeScreen
          meta={meta}
          judges={judges}
          writeJudge={writeJudge}
          writeMeta={writeMeta}
          judgeId={n}
          navigate={navigate}
        /></>
      );
    }
  }

  return <><GlobalAppStyle /><Home navigate={navigate} meta={meta} /></>;
}
