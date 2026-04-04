
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
    },
    round: 1,
    phase: "fight",
    status: "paused",
    pausedRemaining: 120,
    phaseStartedAt: null,
    hongWarnings: 0,
    chongWarnings: 0,
    hongFouls: 0,
    chongFouls: 0,
    hong: getBaseCombatant(HONG),
    chong: getBaseCombatant(CHONG),
    combatForcedWinner: null,
    publicSwapSides: false,
    presidentSwapSides: false,
    goldenPoint: makeEmptyGoldenPoint(),
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

function getDerivedTime(meta, now = Date.now()) {
  if (!meta) return 0;
  if (meta.status !== "running" || !meta.phaseStartedAt) return meta.pausedRemaining || 0;
  const elapsed = Math.floor((now - meta.phaseStartedAt) / 1000);
  return Math.max(0, (meta.pausedRemaining || 0) - elapsed);
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
  if ((meta.hongFouls || 0) === 2) return `${HONG}: a la próxima falta grave será descalificación`;
  if ((meta.chongFouls || 0) === 2) return `${CHONG}: a la próxima falta grave será descalificación`;
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
    minHeight: "100vh",
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
      const next = Math.min(window.innerWidth / baseWidth, window.innerHeight / baseHeight);
      setScale(next);
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

function WinnerFullScreen({ winner, zIndex = 50 }) {
  if (winner === "draw") {
    return (
      <div style={{ position: "absolute", inset: 0, zIndex, background: "#3b3b3b", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "5vw" }}>
        <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontSize: 62, fontWeight: 800, letterSpacing: "0.16em", lineHeight: 1 }}>RESULTADO</div>
          <div style={{ marginTop: 28, fontSize: 210, fontWeight: 900, lineHeight: 0.92 }}>EMPATE</div>
        </div>
      </div>
    );
  }

  if (winner !== "hong" && winner !== "chong") return null;
  const isHong = winner === "hong";

  return (
    <div style={{ position: "absolute", inset: 0, zIndex, background: isHong ? "#b91c1c" : "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "5vw", animation: "winnerPulse 1.2s infinite" }}>
      <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize: 62, fontWeight: 800, letterSpacing: "0.16em", opacity: 0.92, lineHeight: 1 }}>WINNER</div>
        <div style={{ marginTop: 28, fontSize: 220, fontWeight: 900, lineHeight: 0.92 }}>{isHong ? "HONG" : "CHONG"}</div>
      </div>
      <style>{`@keyframes winnerPulse {0%{opacity:1;}50%{opacity:0.76;}100%{opacity:1;}}`}</style>
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
  return (
    <div style={styles.panel}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontWeight: "bold" }}>
        <span>Juez {judge.id}</span>
        <span>Voto: {vote === "draw" ? "Empate" : vote === "hong" ? "Hong" : "Chong"}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ ...styles.panel, background: "#2a0606", border: "1px solid #631010" }}>
          <div style={{ fontWeight: "bold" }}>{HONG}</div>
          <div>Bruto: <strong>{judge.hongPoints}</strong></div>
          <div>Neto: <strong>{net.hong}</strong></div>
        </div>
        <div style={{ ...styles.panel, background: "#07172f", border: "1px solid #174a9c" }}>
          <div style={{ fontWeight: "bold" }}>{CHONG}</div>
          <div>Bruto: <strong>{judge.chongPoints}</strong></div>
          <div>Neto: <strong>{net.chong}</strong></div>
        </div>
      </div>
    </div>
  );
}

function QRSection() {
  const base = getBaseURL();
  return (
    <div style={{ ...styles.panel, marginTop: 16 }}>
      <h2>QR Conexión</h2>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ marginBottom: 8 }}>Presidente</div>
          <div style={{ background: "white", padding: 10, borderRadius: 12 }}>
            <QRCodeCanvas value={`${base}/president`} size={150} />
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ marginBottom: 8 }}>Pantalla pública</div>
          <div style={{ background: "white", padding: 10, borderRadius: 12 }}>
            <QRCodeCanvas value={`${base}/public`} size={150} />
          </div>
        </div>
        {Array.from({ length: COMBAT_JUDGES }, (_, i) => i + 1).map((n) => (
          <div key={n} style={{ textAlign: "center" }}>
            <div style={{ marginBottom: 8 }}>Juez {n}</div>
            <div style={{ background: "white", padding: 10, borderRadius: 12 }}>
              <QRCodeCanvas value={`${base}/judge/${n}`} size={150} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Home({ navigate, meta }) {
  return (
    <Frame16x9>
      <div style={{ ...styles.page, display: "grid", gridTemplateRows: "260px auto 1fr", alignContent: "start" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <BrandHeaderLarge />
        </div>

        <div style={{ textAlign: "center", marginTop: -20 }}>
          <h1 style={{ margin: 0, fontSize: 64 }}>Hwarang Scoring Combat</h1>
          <p style={{ fontSize: 28, opacity: 0.9 }}>Elegí una pantalla</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24, alignItems: "start", marginTop: 20 }}>
          <div style={{ ...styles.panel, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <div style={{ ...styles.row, gap: 16 }}>
              <AppButton style={{ ...styles.green, boxShadow: "0 0 20px rgba(34,197,94,0.35)" }} onClick={() => navigate("/president")}>Presidente</AppButton>
              <AppButton style={{ ...styles.blue, boxShadow: "0 0 20px rgba(59,130,246,0.35)" }} onClick={() => navigate("/public")}>Pantalla pública</AppButton>
              {Array.from({ length: COMBAT_JUDGES }, (_, i) => i + 1).map((n) => (
                <AppButton key={n} style={{ ...styles.red, boxShadow: "0 0 20px rgba(239,68,68,0.35)" }} onClick={() => navigate(`/judge/${n}`)}>Juez {n}</AppButton>
              ))}
            </div>
          </div>

          <div style={{ ...styles.panel, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <h2 style={{ marginTop: 0 }}>Estado actual</h2>
            <div style={styles.row}>
              <div style={styles.stat}>Round: <strong>{meta.round}</strong></div>
              <div style={styles.stat}>Tiempo: <strong>{formatTime(meta.pausedRemaining)}</strong></div>
              <div style={styles.stat}>Estado: <strong>{meta.phase === "finished" ? "Finalizado" : meta.phase === "break" ? "Descanso" : meta.status === "running" ? "En marcha" : "Pausado"}</strong></div>
            </div>
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

function PublicScreen({ meta, judges, navigate }) {
  const time = useClock(meta);
  const s = summary(meta, judges);
  const { left, right } = getDisplaySides(meta, "public");

  const scoreMap = { hong: s.hongVotes, chong: s.chongVotes };
  const warningsMap = { hong: meta.hongWarnings || 0, chong: meta.chongWarnings || 0 };
  const foulsMap = { hong: meta.hongFouls || 0, chong: meta.chongFouls || 0 };

  const winner = meta.phase === "finished" ? s.winner : null;

  return (
    <Frame16x9>
      <AppButton
        style={{ ...styles.gray, position: "absolute", right: 34, bottom: 24, zIndex: 120, fontSize: 20, padding: "10px 20px", opacity: 0.78, boxShadow: "0 0 18px rgba(255,255,255,0.16)" }}
        onClick={() => navigate("/")}
      >
        Inicio
      </AppButton>

      <div style={{ width: "100%", height: "100%", display: "grid", gridTemplateRows: "190px 1fr 52px", padding: "18px 24px 10px 24px", boxSizing: "border-box" }}>
        <div style={{ display: "grid", gridTemplateColumns: "420px 1fr 420px", alignItems: "center" }}>
          <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center" }}>
            <img src="/logo-universe.png" alt="Hwarang Universe" style={{ maxWidth: 420, maxHeight: 190, width: "auto", height: "auto", objectFit: "contain", display: "block" }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "0.24em", lineHeight: 1, opacity: 0.92 }}>HWARANG SCORING</div>
            <div style={{ marginTop: 12, fontSize: 70, fontWeight: 900, lineHeight: 1, letterSpacing: "0.04em" }}>COMBAT</div>
            <div style={{ marginTop: 12, fontSize: 28, fontWeight: 800, letterSpacing: "0.10em", opacity: 0.92 }}>
              {meta.goldenPoint?.active ? (meta.goldenPoint.mode === "A" ? "GOLDEN POINT A" : `GOLDEN POINT B / ROUND ${meta.goldenPoint.gpRound || 1}`) : "COMBATE"}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
            <img src="/logo-combat.png" alt="Hwarang Combat" style={{ maxWidth: 420, maxHeight: 190, width: "auto", height: "auto", objectFit: "contain", display: "block" }} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px 1fr", gap: 20, minHeight: 0 }}>
          <div style={{ minHeight: 0, display: "flex" }}>
            <PublicFighterPanel title={left.visualLabel} fighter={left} score={scoreMap[left.pointsLabel]} warnings={warningsMap[left.pointsLabel]} fouls={foulsMap[left.pointsLabel]} />
          </div>

          <div style={{ minHeight: 0, display: "grid", gridTemplateRows: "290px 1fr 120px", gap: 18 }}>
            <div style={{ borderRadius: 34, background: "linear-gradient(180deg, #ffffff 0%, #dde4ec 100%)", color: "#111", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", boxShadow: "0 8px 24px rgba(0,0,0,0.30)" }}>
              <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "0.20em", lineHeight: 1 }}>
                {meta.phase === "break" ? "DESCANSO" : "TIME"}
              </div>
              <div style={{ marginTop: 18, fontSize: 122, fontWeight: 900, lineHeight: 0.9, letterSpacing: "-0.04em" }}>{formatTime(time)}</div>
              <div style={{ marginTop: 16, fontSize: 34, fontWeight: 900, letterSpacing: "0.08em", textAlign: "center" }}>
                {meta.phase === "break" ? "NO MANIPULAR" : `ROUND ${meta.round}`}
              </div>
            </div>

            <div style={{ borderRadius: 34, background: "rgba(255,255,255,0.06)", display: "flex", justifyContent: "center", alignItems: "center", boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 96, fontWeight: 900, lineHeight: 1, letterSpacing: "0.06em", opacity: 0.85 }}>VS</div>
            </div>

            <div style={{ borderRadius: 24, background: "rgba(255,255,255,0.08)", display: "flex", justifyContent: "center", alignItems: "center", boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: "0.08em", textAlign: "center" }}>
                {meta.phase === "finished" ? "FINALIZADO" : meta.phase === "break" ? "DESCANSO OFICIAL" : meta.status === "running" ? "EN CURSO" : "PAUSADO"}
              </div>
            </div>
          </div>

          <div style={{ minHeight: 0, display: "flex" }}>
            <PublicFighterPanel title={right.visualLabel} fighter={right} score={scoreMap[right.pointsLabel]} warnings={warningsMap[right.pointsLabel]} fouls={foulsMap[right.pointsLabel]} />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.82 }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.08em" }}>TORNEO / COMBATE</div>
        </div>
      </div>

      {winner && <WinnerFullScreen winner={winner} zIndex={140} />}
    </Frame16x9>
  );
}

function PresidentScreen({ meta, judges, writeMeta, writeJudge, resetAll, navigate }) {
  meta = ensureMetaShape(meta);
  const time = useClock(meta);
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
    setEditor((current) => (
      current.hongName === next.hongName &&
      current.hongClub === next.hongClub &&
      current.chongName === next.chongName &&
      current.chongClub === next.chongClub
    ) ? current : next);
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

  useEffect(() => () => {
    if (editorSaveTimeoutRef.current) clearTimeout(editorSaveTimeoutRef.current);
  }, []);

  useEffect(() => {
    const isRunning = meta.status === "running" && meta.phase === "fight";
    if (isRunning && !prevRunningRef.current) playStartAlarm();
    prevRunningRef.current = isRunning;
  }, [meta.status, meta.phase]);

  useEffect(() => {
    const isFinished = meta.phase === "finished";
    if (isFinished && !prevFinishedRef.current) {
      playEndAlarm();
      setTimeout(() => playWinnerSound(), 320);
    }
    prevFinishedRef.current = isFinished;
  }, [meta.phase]);

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
    await saveConfig();

    await writeMeta((current) => {
      if (current.status === "running") return current;
      if (current.phase === "finished") return current;

      const next = {
        ...current,
        status: "running",
        phaseStartedAt: Date.now(),
      };

      if (current.phase === "break" && (current.pausedRemaining || 0) <= 0) {
        next.phase = "fight";
        next.round = (current.round || 1) + 1;
        next.pausedRemaining = current.config?.roundSeconds || 120;
      }

      return next;
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
      return current;
    });
  };

  const applyCombatForcedWinner = async (winner) => {
    await writeMeta((current) => {
      current.combatForcedWinner = winner;
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
      current.config = { ...current.config, ...fresh.config };
      current.round = fresh.round;
      current.phase = fresh.phase;
      current.status = fresh.status;
      current.pausedRemaining = current.config.roundSeconds || fresh.pausedRemaining;
      current.phaseStartedAt = null;
      current.hongWarnings = 0;
      current.chongWarnings = 0;
      current.hongFouls = 0;
      current.chongFouls = 0;
      current.combatForcedWinner = null;
      current.goldenPoint = makeEmptyGoldenPoint();
      return current;
    });
  };

  const updateCombatant = async (side, field, value) => {
    await writeMeta((current) => {
      current[side] = current[side] || getBaseCombatant(side === "hong" ? HONG : CHONG);
      current[side][field] = value;
      return current;
    });
  };

  const modifyMetaNumber = async (field, delta) => {
    await writeMeta((current) => {
      current[field] = Math.max(0, (current[field] || 0) + delta);
      return current;
    });
  };

  const winner = meta.phase === "finished" ? s.winner : null;

  return (
    <Frame16x9>
      <div style={{ position: "absolute", inset: 0, overflow: "auto", padding: 22, boxSizing: "border-box" }}>
        <div style={{ position: "sticky", top: 0, zIndex: 120, display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12, paddingBottom: 6, background: "rgba(2,6,13,0.92)" }}>
          <AppButton style={{ ...styles.gray, boxShadow: "0 0 18px rgba(255,255,255,0.16)" }} onClick={() => navigate("/")}>Inicio</AppButton>
          <AppButton style={{ ...styles.green, boxShadow: "0 0 18px rgba(34,197,94,0.35)" }} onClick={prepareNextMatch}>Siguiente match</AppButton>
          <AppButton style={{ ...styles.gray, boxShadow: "0 0 18px rgba(255,255,255,0.16)" }} onClick={resetAll}>Reset total</AppButton>
        </div>

        <BrandHeaderLarge />

        <h1 style={{ margin: "0 0 16px 0", textAlign: "center", fontSize: "clamp(34px,4vw,64px)" }}>Presidente</h1>

        <div style={{ ...styles.panel, marginTop: 16 }}>
          <h2>Modalidad</h2>
          <div style={{ fontSize: 28, fontWeight: 900 }}>COMBATE</div>
        </div>

        <div style={styles.row}>
          <div style={styles.stat}>Tiempo: <strong>{formatTime(time)}</strong></div>
          <div style={styles.stat}>Round: <strong>{meta.round}/{meta.config.rounds}</strong></div>
          <div style={styles.stat}>Estado: <strong>{meta.phase === "finished" ? "Finalizado" : meta.phase === "break" ? "Descanso oficial" : meta.status === "running" ? "En marcha" : "Pausado"}</strong></div>
          <div style={styles.stat}>Hong votos: <strong>{s.hongVotes}</strong></div>
          <div style={styles.stat}>Chong votos: <strong>{s.chongVotes}</strong></div>
        </div>

        <div style={{ ...styles.panel, marginTop: 16 }}>
          <h2>Competidores</h2>
          <div style={{ marginBottom: 14, fontWeight: 700, opacity: 0.9 }}>Esta vista respeta el cambio de lado del presidente.</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[left, right].map((fighter, index) => {
              const side = fighter.color;
              return (
                <div key={`${side}-${index}`} style={{ ...styles.panel, background: side === "hong" ? "#2a0606" : "#07172f", border: side === "hong" ? "1px solid #631010" : "1px solid #174a9c" }}>
                  <div style={{ fontWeight: 900, marginBottom: 10, fontSize: 22 }}>
                    {index === 0 ? "Izquierda" : "Derecha"} · {fighter.visualLabel}
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    <input value={side === "hong" ? editor.hongName : editor.chongName} onFocus={() => { editorFocusRef.current = true; }} onChange={(e) => updateEditorField(side === "hong" ? "hongName" : "chongName", e.target.value)} onBlur={async () => { editorFocusRef.current = false; await commitEditor(editorDraftRef.current); }} placeholder={`Nombre ${side}`} style={{ width: "100%", padding: 12, borderRadius: 10 }} />
                    <input value={side === "hong" ? editor.hongClub : editor.chongClub} onFocus={() => { editorFocusRef.current = true; }} onChange={(e) => updateEditorField(side === "hong" ? "hongClub" : "chongClub", e.target.value)} onBlur={async () => { editorFocusRef.current = false; await commitEditor(editorDraftRef.current); }} placeholder={`Club ${side}`} style={{ width: "100%", padding: 12, borderRadius: 10 }} />
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.72 }}>Guardado automático</div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ ...styles.panel, marginTop: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
            <div>
              <label>Tiempo por round (segundos)</label>
              <input type="number" min="1" value={secondsInput} onChange={(e) => setSecondsInput(e.target.value)} style={{ width: "100%", padding: 10, marginTop: 6, borderRadius: 10 }} />
            </div>
            <div>
              <label>Cantidad de rounds</label>
              <input type="number" min="1" value={roundsInput} onChange={(e) => setRoundsInput(e.target.value)} style={{ width: "100%", padding: 10, marginTop: 6, borderRadius: 10 }} />
            </div>
            <div>
              <label>Tiempo de descanso (segundos)</label>
              <input type="number" min="1" value={breakSecondsInput} onChange={(e) => setBreakSecondsInput(e.target.value)} style={{ width: "100%", padding: 10, marginTop: 6, borderRadius: 10 }} />
            </div>
            <AppButton style={styles.blue} onClick={saveConfig}>Guardar configuración</AppButton>
          </div>

          <div style={{ ...styles.row, marginTop: 12 }}>
            {[60, 90, 120, 180, 300].map((s) => (
              <AppButton key={s} style={styles.gray} onClick={() => setSecondsInput(String(s))}>
                {s} segundos
              </AppButton>
            ))}
          </div>

          <div style={{ ...styles.row, marginTop: 12 }}>
            {[10, 20, 30, 45, 60].map((s) => (
              <AppButton key={`break-${s}`} style={styles.gray} onClick={() => setBreakSecondsInput(String(s))}>
                Descanso {s}s
              </AppButton>
            ))}
          </div>

          <div style={{ ...styles.row, marginTop: 16 }}>
            <AppButton style={{ ...styles.green, boxShadow: "0 0 18px rgba(34,197,94,0.35)" }} onClick={startTimer}>
              {meta.phase === "break" ? "Iniciar siguiente round" : "Iniciar"}
            </AppButton>
            <AppButton style={{ ...styles.amber, boxShadow: "0 0 18px rgba(245,158,11,0.35)" }} onClick={pauseTimer}>Pausar</AppButton>
            <AppButton style={{ ...styles.purple, boxShadow: "0 0 18px rgba(168,85,247,0.35)" }} onClick={finishMatch}>Finalizar</AppButton>
          </div>
        </div>

        {meta.phase === "break" && (
          <div style={{ ...styles.panel, marginTop: 16, background: "#78350f", border: "1px solid #f59e0b", color: "#fffbeb", fontWeight: 900, textAlign: "center" }}>
            DESCANSO OFICIAL EN CURSO · NO MANIPULAR
          </div>
        )}

        <div style={{ ...styles.panel, marginTop: 16 }}>
          <h2>Cambio de lado independiente</h2>
          <div style={styles.row}>
            <AppButton style={meta.publicSwapSides ? styles.green : styles.gray} onClick={() => writeMeta((c) => { c.publicSwapSides = !c.publicSwapSides; return c; })}>
              Pública: {meta.publicSwapSides ? "Invertida" : "Normal"}
            </AppButton>
            <AppButton style={meta.presidentSwapSides ? styles.green : styles.gray} onClick={() => writeMeta((c) => { c.presidentSwapSides = !c.presidentSwapSides; return c; })}>
              Presidente: {meta.presidentSwapSides ? "Invertida" : "Normal"}
            </AppButton>
          </div>

          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ ...styles.panel, background: "#091423" }}>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Vista presidente</div>
              <div>Izquierda: <strong>{left.visualLabel} - {left.name || left.visualLabel}</strong></div>
              <div>Derecha: <strong>{right.visualLabel} - {right.name || right.visualLabel}</strong></div>
            </div>
            <div style={{ ...styles.panel, background: "#091423" }}>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Vista pública</div>
              <div>Izquierda: <strong>{getDisplaySides(meta, "public").left.visualLabel} - {getDisplaySides(meta, "public").left.name || getDisplaySides(meta, "public").left.visualLabel}</strong></div>
              <div>Derecha: <strong>{getDisplaySides(meta, "public").right.visualLabel} - {getDisplaySides(meta, "public").right.name || getDisplaySides(meta, "public").right.visualLabel}</strong></div>
            </div>
          </div>
        </div>

        <div style={{ ...styles.panel, marginTop: 16 }}>
          <h2>Warnings / Faltas</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ ...styles.panel, background: "#2a0606", border: "1px solid #631010" }}>
              <div style={{ fontWeight: 900, marginBottom: 12 }}>Hong</div>
              <div style={styles.row}>
                <AppButton style={styles.red} onClick={() => modifyMetaNumber("hongWarnings", 1)}>+ Warning</AppButton>
                <AppButton style={styles.gray} onClick={() => modifyMetaNumber("hongWarnings", -1)}>- Warning</AppButton>
                <AppButton style={styles.red} onClick={() => modifyMetaNumber("hongFouls", 1)}>+ Falta</AppButton>
                <AppButton style={styles.gray} onClick={() => modifyMetaNumber("hongFouls", -1)}>- Falta</AppButton>
              </div>
              <div style={{ marginTop: 12 }}>Warnings: <strong>{meta.hongWarnings || 0}</strong></div>
              <div>Faltas: <strong>{meta.hongFouls || 0}</strong></div>
            </div>

            <div style={{ ...styles.panel, background: "#07172f", border: "1px solid #174a9c" }}>
              <div style={{ fontWeight: 900, marginBottom: 12 }}>Chong</div>
              <div style={styles.row}>
                <AppButton style={styles.blue} onClick={() => modifyMetaNumber("chongWarnings", 1)}>+ Warning</AppButton>
                <AppButton style={styles.gray} onClick={() => modifyMetaNumber("chongWarnings", -1)}>- Warning</AppButton>
                <AppButton style={styles.blue} onClick={() => modifyMetaNumber("chongFouls", 1)}>+ Falta</AppButton>
                <AppButton style={styles.gray} onClick={() => modifyMetaNumber("chongFouls", -1)}>- Falta</AppButton>
              </div>
              <div style={{ marginTop: 12 }}>Warnings: <strong>{meta.chongWarnings || 0}</strong></div>
              <div>Faltas: <strong>{meta.chongFouls || 0}</strong></div>
            </div>
          </div>

          {!!secondFoulWarning(meta) && (
            <div style={{ ...styles.panel, background: "#7c2d12", border: "1px solid #f97316", marginTop: 16, color: "#ffedd5", fontWeight: 900, textAlign: "center" }}>
              {secondFoulWarning(meta)}
            </div>
          )}
        </div>

        <QRSection />

        <div style={{ ...styles.panel, marginTop: 16 }}>
          <h2>Golden Point</h2>
          <div style={styles.row}>
            <AppButton style={meta.goldenPoint?.active && meta.goldenPoint?.mode === "A" ? styles.green : styles.blue} onClick={() => activateGoldenPoint("A")}>Activar GP A</AppButton>
            <AppButton style={meta.goldenPoint?.active && meta.goldenPoint?.mode === "B" ? styles.green : styles.blue} onClick={() => activateGoldenPoint("B")}>Activar GP B</AppButton>
          </div>
          {meta.goldenPoint?.active && (
            <div style={{ marginTop: 12 }}>
              Activo: <strong>{meta.goldenPoint.mode === "A" ? "Golden Point A" : `Golden Point B / Round ${meta.goldenPoint.gpRound || 1}`}</strong>
            </div>
          )}
        </div>

        <div style={{ ...styles.panel, marginTop: 16 }}>
          <h2>Fallo arbitral Combate</h2>
          <div style={styles.row}>
            <AppButton style={styles.red} onClick={() => applyCombatForcedWinner("hong")}>Ganador Rojo</AppButton>
            <AppButton style={styles.blue} onClick={() => applyCombatForcedWinner("chong")}>Ganador Azul</AppButton>
            <AppButton style={styles.gray} onClick={() => applyCombatForcedWinner("draw")}>Empate</AppButton>
          </div>
        </div>

        <div style={{ ...styles.panel, marginTop: 16 }}>
          <h2>Tarjetas de jueces (solo lectura)</h2>
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
            {judges.slice(0, COMBAT_JUDGES).map((j) => (
              <JudgeReadOnlyCard key={j.id} judge={j} meta={meta} />
            ))}
          </div>
        </div>

        {winner && <WinnerFullScreen winner={winner} zIndex={100} />}
      </div>
    </Frame16x9>
  );
}

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
      <div style={styles.page}>
        <AppButton style={{ ...styles.gray, boxShadow: "0 0 18px rgba(255,255,255,0.16)" }} onClick={() => navigate("/")}>Inicio</AppButton>
        <BrandHeaderSmall />
        <h1>Juez {judgeId}</h1>
        <div style={styles.panel}>Este juez no está activo en la modalidad actual.</div>
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
  const showJudgeWinner = meta.phase === "finished";

  return (
    <div style={{ ...styles.page, background: "#06101c", minHeight: "100vh" }}>
      <AppButton style={{ ...styles.gray, boxShadow: "0 0 18px rgba(255,255,255,0.16)" }} onClick={() => navigate("/")}>Inicio</AppButton>
      <BrandHeaderSmall />

      <h1>Juez {judgeId}</h1>

      <div style={styles.row}>
        <div style={styles.stat}>Tiempo: <strong>{formatTime(time)}</strong></div>
        <div style={styles.stat}>Modalidad: <strong>{meta.phase === "break" ? "DESCANSO" : "COMBATE"}</strong></div>
        {meta.goldenPoint?.active && (
          <div style={styles.stat}>
            <strong>
              {meta.goldenPoint.mode === "A" ? "GOLDEN POINT A" : `GOLDEN POINT B / ROUND ${meta.goldenPoint.gpRound || 1}`}
            </strong>
          </div>
        )}
      </div>

      {meta.phase === "break" && (
        <div style={{ ...styles.panel, background: "#7c2d12", border: "1px solid #f97316", marginTop: 16, color: "#ffedd5", fontWeight: 900, textAlign: "center" }}>
          DESCANSO · NO MANIPULAR
        </div>
      )}

      {!!warning && !meta.goldenPoint?.active && (
        <div style={{ ...styles.panel, background: "#7c2d12", border: "1px solid #f97316", marginTop: 16, color: "#ffedd5", fontWeight: 900, textAlign: "center" }}>
          {warning}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <JudgePanel judge={judge} onPoint={(side, value) => updateJudge("POINT", side, value)} onUndo={() => updateJudge("UNDO")} />
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
      <><GlobalAppStyle /><PresidentScreen
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
