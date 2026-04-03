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

const MODES = {
  COMBAT: "combat",
  PATTERN: "pattern",
};

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
    if (ctx.state === "suspended") ctx.resume();

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
  playTone({
    frequency: 700,
    duration: 0.12,
    type: "sawtooth",
    gain: 0.045,
  });
  setTimeout(
    () =>
      playTone({
        frequency: 950,
        duration: 0.12,
        type: "sawtooth",
        gain: 0.045,
      }),
    140
  );
  setTimeout(
    () =>
      playTone({
        frequency: 1250,
        duration: 0.18,
        type: "sawtooth",
        gain: 0.05,
      }),
    290
  );
}

function playEndAlarm() {
  playTone({
    frequency: 900,
    duration: 0.12,
    type: "triangle",
    gain: 0.05,
  });
  setTimeout(
    () =>
      playTone({
        frequency: 700,
        duration: 0.14,
        type: "triangle",
        gain: 0.05,
      }),
    160
  );
  setTimeout(
    () =>
      playTone({
        frequency: 500,
        duration: 0.2,
        type: "triangle",
        gain: 0.055,
      }),
    340
  );
}

function playWinnerSound() {
  playTone({ frequency: 520, duration: 0.09, type: "square", gain: 0.04 });
  setTimeout(
    () => playTone({ frequency: 780, duration: 0.1, type: "square", gain: 0.04 }),
    110
  );
  setTimeout(
    () => playTone({ frequency: 1040, duration: 0.18, type: "square", gain: 0.045 }),
    240
  );
}

function tapFeedback({ vibrateMs = 30 } = {}) {
  vibrate(vibrateMs);
  playButtonSound();
}

function makeJudge(id) {
  return {
    id,
    hongPoints: 0,
    chongPoints: 0,
    history: [],
    pattern: {
      hong: { tech: 0, power: 0, rhythm: 0, zero: false },
      chong: { tech: 0, power: 0, rhythm: 0, zero: false },
      sent: false,
    },
  };
}

function normalizeJudge(raw, id) {
  const base = makeJudge(id);
  if (!raw) return base;

  return {
    ...base,
    ...raw,
    pattern: {
      ...base.pattern,
      ...(raw.pattern || {}),
      hong: {
        ...base.pattern.hong,
        ...(raw.pattern?.hong || {}),
      },
      chong: {
        ...base.pattern.chong,
        ...(raw.pattern?.chong || {}),
      },
    },
  };
}

function makeEmptyPatternResult() {
  return {
    hong: 0,
    chong: 0,
    sent: 0,
    completed: false,
    winner: "en_curso",
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
    mode: MODES.COMBAT,
    config: {
      roundSeconds: 120,
      rounds: 2,
      patternJudges: 3,
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
    combatForcedWinner: null,
    goldenPoint: makeEmptyGoldenPoint(),
    patternResult: makeEmptyPatternResult(),
    updatedAt: Date.now(),
  };
}

function activeJudgeCount(meta) {
  return meta.mode === MODES.COMBAT
    ? COMBAT_JUDGES
    : meta.config?.patternJudges === 5
    ? 5
    : 3;
}

function activeJudges(meta, judges) {
  return judges.slice(0, activeJudgeCount(meta));
}

function formatTime(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getDerivedTime(meta, now = Date.now()) {
  if (!meta) return 0;
  if (meta.status !== "running" || !meta.phaseStartedAt) {
    return meta.pausedRemaining || 0;
  }
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

// ---------- COMBATE ----------

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
    if (v === "hong") hongVotes++;
    else if (v === "chong") chongVotes++;
    else draws++;
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
  if ((meta.hongFouls || 0) === 2) {
    return `${HONG}: a la próxima falta grave será descalificación`;
  }
  if ((meta.chongFouls || 0) === 2) {
    return `${CHONG}: a la próxima falta grave será descalificación`;
  }
  return "";
}

function goldenPointADeclaredWinner(meta, judges) {
  const s = summary({ ...meta, phase: "fight" }, judges);
  if (s.hongVotes >= 2) return "hong";
  if (s.chongVotes >= 2) return "chong";
  return null;
}

// ---------- FORMAS ----------

function patternTotalsForJudge(judge) {
  const hongZero = !!judge.pattern?.hong?.zero;
  const chongZero = !!judge.pattern?.chong?.zero;

  const hong = hongZero
    ? 0
    : (judge.pattern?.hong?.tech || 0) +
      (judge.pattern?.hong?.power || 0) +
      (judge.pattern?.hong?.rhythm || 0);

  const chong = chongZero
    ? 0
    : (judge.pattern?.chong?.tech || 0) +
      (judge.pattern?.chong?.power || 0) +
      (judge.pattern?.chong?.rhythm || 0);

  return { hong, chong };
}

function patternSummary(meta, judges) {
  const currentJudges = judges.slice(0, COMBAT_JUDGES);

  let hong = 0;
  let chong = 0;
  let sent = 0;

  currentJudges.forEach((j) => {
    if (j.pattern?.sent) {
      sent += 1;
      const totals = patternTotalsForJudge(j);
      hong += totals.hong;
      chong += totals.chong;
    }
  });

  let winner = "en_curso";
  if (meta.patternResult?.completed && meta.patternResult?.winner) {
    winner = meta.patternResult.winner;
  } else if (sent === currentJudges.length) {
    if (hong > chong) winner = "hong";
    else if (chong > hong) winner = "chong";
    else winner = "draw";
  }

  return { hong, chong, sent, winner };
}

// ---------- FIREBASE ----------

async function ensureInitialDocs() {
  const metaSnap = await getDoc(matchMetaRef);

  if (!metaSnap.exists()) {
    await setDoc(matchMetaRef, makeInitialMeta());
  }

  const existing = await getDocs(query(judgesColRef));
  const ids = new Set(existing.docs.map((d) => d.id));

  for (let i = 1; i <= MAX_JUDGES; i++) {
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
      if (snap.exists()) setMeta(snap.data());
    });

    const unsubJudges = onSnapshot(judgesColRef, (snap) => {
      const next = Array.from({ length: MAX_JUDGES }, (_, i) =>
        makeJudge(i + 1)
      );
      snap.docs.forEach((doc) => {
        const idx = Number(doc.id) - 1;
        if (idx >= 0 && idx < MAX_JUDGES) {
          next[idx] = normalizeJudge(doc.data(), idx + 1);
        }
      });
      setJudges(next);
    });

    return () => {
      unsubMeta();
      unsubJudges();
    };
  }, []);

  const writeMeta = async (mutator) => {
    await runTransaction(db, async (t) => {
      const snap = await t.get(matchMetaRef);
      const current = snap.exists() ? snap.data() : makeInitialMeta();
      const next = mutator(clone(current));
      next.updatedAt = Date.now();
      t.set(matchMetaRef, next);
    });
  };

  const writeJudge = async (id, mutator) => {
    let out = null;

    await runTransaction(db, async (t) => {
      const ref = judgeRef(id);
      const snap = await t.get(ref);
      const current = snap.exists()
        ? normalizeJudge(snap.data(), id)
        : makeJudge(id);
      const next = mutator(clone(current));
      t.set(ref, next);
      out = next;
    });

    return out;
  };

  const resetAll = async () => {
    await setDoc(matchMetaRef, makeInitialMeta());
    for (let i = 1; i <= MAX_JUDGES; i++) {
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

// ---------- UI ----------

const styles = {
  page: {
    background: "#050505",
    color: "white",
    minHeight: "100vh",
    padding: 20,
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
  frame16x9: {
    position: "relative",
    background: "#061529",
    color: "white",
    width: "100vw",
    height: "calc(100vw * 9 / 16)",
    maxWidth: "calc(100vh * 16 / 9)",
    maxHeight: "100vh",
    aspectRatio: "16 / 9",
    boxSizing: "border-box",
    overflow: "hidden",
    border: "2px solid rgba(120,160,255,0.25)",
    boxShadow: "0 0 40px rgba(0,0,0,0.45), 0 0 30px rgba(29,78,216,0.18) inset",
  },
  frameInner: {
    position: "absolute",
    inset: 0,
    padding: 20,
    boxSizing: "border-box",
    overflow: "auto",
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
    padding: "12px 16px",
    borderRadius: 12,
    border: "none",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
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
  return (
    <div style={styles.frameBg}>
      <div style={styles.frame16x9}>
        <div style={styles.frameInner}>{children}</div>
      </div>
    </div>
  );
}

function AppButton({ children, style = {}, onClick, ...props }) {
  return (
    <button
      {...props}
      onClick={(e) => {
        tapFeedback();
        onClick?.(e);
      }}
      style={{
        ...styles.button,
        ...style,
      }}
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


function LogoHeader({ subtitle = "" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 14, flexDirection: "column" }}>
      <img src="/logo.png" alt="Hwarang Scoring Universe" style={{ height: 68, width: "auto", objectFit: "contain", filter: "drop-shadow(0 0 10px rgba(255,215,0,0.18))" }} />
      {subtitle ? (
        <div style={{ fontSize: 12, letterSpacing: 3, color: "#d7d7d7", fontWeight: 700, textTransform: "uppercase" }}>{subtitle}</div>
      ) : null}
    </div>
  );
}

function WinnerFullScreen({ winner, zIndex = 50 }) {
  if (winner === "draw") {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex,
          background: "#3b3b3b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "5vw",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "92vw",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: "clamp(20px, 5vw, 56px)",
              fontWeight: 700,
              letterSpacing: "0.16em",
              lineHeight: 1,
            }}
          >
            RESULTADO
          </div>

          <div
            style={{
              marginTop: "2.5vh",
              fontSize: "clamp(42px, 13vw, 150px)",
              fontWeight: 900,
              lineHeight: 0.95,
              textTransform: "uppercase",
              wordBreak: "keep-all",
            }}
          >
            EMPATE
          </div>
        </div>
      </div>
    );
  }

  if (winner !== "hong" && winner !== "chong") return null;

  const isHong = winner === "hong";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex,
        background: isHong ? "#b91c1c" : "#1d4ed8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "5vw",
        animation: "winnerPulse 1.2s infinite",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "92vw",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: "clamp(20px, 5vw, 56px)",
            fontWeight: 700,
            letterSpacing: "0.16em",
            opacity: 0.92,
            lineHeight: 1,
          }}
        >
          WINNER
        </div>

        <div
          style={{
            marginTop: "2.5vh",
            fontSize: "clamp(48px, 15vw, 170px)",
            fontWeight: 900,
            lineHeight: 0.95,
            textTransform: "uppercase",
            wordBreak: "keep-all",
          }}
        >
          {isHong ? "HONG" : "CHONG"}
        </div>
      </div>

      <style>{`
        @keyframes winnerPulse {
          0% { opacity: 1; }
          50% { opacity: 0.75; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ---------- COMBATE UI ----------

function JudgeScoreButton({ label, color, glow, onClick }) {
  return (
    <button
      onClick={(e) => {
        tapFeedback({ vibrateMs: 40 });
        onClick?.(e);
      }}
      style={{
        minHeight: 82,
        borderRadius: 18,
        border: `2px solid ${glow}`,
        background: color,
        color: "white",
        fontWeight: 900,
        fontSize: 28,
        cursor: "pointer",
        boxShadow: `0 0 0px ${glow}, 0 0 18px ${glow}`,
        transition: "transform 0.08s ease, box-shadow 0.12s ease, filter 0.12s ease",
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = "scale(0.985)";
        e.currentTarget.style.boxShadow = `0 0 28px ${glow}, 0 0 36px ${glow}`;
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = `0 0 0px ${glow}, 0 0 18px ${glow}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = `0 0 0px ${glow}, 0 0 18px ${glow}`;
      }}
    >
      {label}
    </button>
  );
}

function JudgePanel({ judge, meta, onPoint, onUndo }) {
  const net = judgeNet(judge, meta);
  const vote = judgeVote(judge, meta);

  return (
    <div
      style={{
        ...styles.panel,
        background: "#07111f",
        border: "1px solid #17304f",
        boxShadow: "0 0 24px rgba(29,78,216,0.15) inset",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
          fontWeight: "bold",
          fontSize: 22,
        }}
      >
        <span>Juez {judge.id}</span>
        <span>
          {vote === "hong" ? HONG : vote === "chong" ? CHONG : "Empate"}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div
          style={{
            ...styles.panel,
            background: "#2a0606",
            border: "1px solid #8b1f1f",
            boxShadow: "0 0 18px rgba(239,68,68,0.22) inset",
          }}
        >
          <div style={{ fontWeight: "bold" }}>{HONG}</div>
          <div style={{ fontSize: 42, fontWeight: 900 }}>{judge.hongPoints}</div>
          <div style={{ color: "#fca5a5", fontWeight: 700 }}>Neto: {net.hong}</div>
        </div>

        <div
          style={{
            ...styles.panel,
            background: "#07172f",
            border: "1px solid #2563eb",
            boxShadow: "0 0 18px rgba(59,130,246,0.22) inset",
          }}
        >
          <div style={{ fontWeight: "bold" }}>{CHONG}</div>
          <div style={{ fontSize: 42, fontWeight: 900 }}>{judge.chongPoints}</div>
          <div style={{ color: "#93c5fd", fontWeight: 700 }}>Neto: {net.chong}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
        <div>
          <div style={{ marginBottom: 10, fontWeight: "bold", fontSize: 20 }}>{HONG}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[1, 2, 3, 4].map((n) => (
              <JudgeScoreButton
                key={n}
                label={`+${n}`}
                color="#b91c1c"
                glow="rgba(248,113,113,0.9)"
                onClick={() => onPoint("hong", n)}
              />
            ))}
          </div>
        </div>

        <div>
          <div style={{ marginBottom: 10, fontWeight: "bold", fontSize: 20 }}>{CHONG}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[1, 2, 3, 4].map((n) => (
              <JudgeScoreButton
                key={n}
                label={`+${n}`}
                color="#1d4ed8"
                glow="rgba(96,165,250,0.95)"
                onClick={() => onPoint("chong", n)}
              />
            ))}
          </div>
        </div>
      </div>

      <AppButton
        style={{
          ...styles.gray,
          width: "100%",
          marginTop: 16,
          minHeight: 56,
          fontSize: 18,
          boxShadow: "0 0 14px rgba(255,255,255,0.08)",
        }}
        onClick={onUndo}
      >
        Borrar última acción
      </AppButton>
    </div>
  );
}

function JudgeReadOnlyCard({ judge, meta }) {
  const net = judgeNet(judge, meta);
  const vote = judgeVote(judge, meta);

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
          {vote === "hong" ? HONG : vote === "chong" ? CHONG : "Empate"}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ ...styles.panel, background: "#2a0606", border: "1px solid #631010" }}>
          <div style={{ fontWeight: "bold" }}>{HONG}</div>
          <div style={{ fontSize: 34, fontWeight: 900 }}>{judge.hongPoints}</div>
          <div style={{ color: "#fca5a5" }}>Neto: {net.hong}</div>
        </div>

        <div style={{ ...styles.panel, background: "#07172f", border: "1px solid #174a9c" }}>
          <div style={{ fontWeight: "bold" }}>{CHONG}</div>
          <div style={{ fontSize: 34, fontWeight: 900 }}>{judge.chongPoints}</div>
          <div style={{ color: "#93c5fd" }}>Neto: {net.chong}</div>
        </div>
      </div>
    </div>
  );
}

// ---------- FORMAS UI ----------

function ScoreChoice({ selected, value, onClick, disabled }) {
  return (
    <button
      onClick={() => {
        tapFeedback({ vibrateMs: 35 });
        onClick();
      }}
      disabled={disabled}
      style={{
        padding: "12px 15px",
        borderRadius: 12,
        border: "none",
        cursor: disabled ? "default" : "pointer",
        fontWeight: 900,
        color: "white",
        background: selected === value ? "#15803d" : "#444",
        marginRight: 8,
        marginBottom: 8,
        minWidth: 54,
        minHeight: 52,
        fontSize: 22,
        boxShadow: selected === value ? "0 0 18px rgba(34,197,94,0.45)" : "none",
      }}
    >
      {value}
    </button>
  );
}

function ZeroAbsoluteButton({ active, disabled, onClick, label, bg }) {
  return (
    <button
      onClick={() => {
        tapFeedback({ vibrateMs: 45 });
        onClick();
      }}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "16px 16px",
        borderRadius: 14,
        border: "2px solid rgba(255,255,255,0.15)",
        background: active ? "#dc2626" : bg,
        color: "white",
        fontWeight: 900,
        fontSize: 16,
        cursor: disabled ? "default" : "pointer",
        marginBottom: 12,
        boxShadow: active ? "0 0 20px rgba(248,113,113,0.55)" : "none",
      }}
    >
      {active ? `${label} ACTIVADO` : label}
    </button>
  );
}

function JudgePatternColorPanel({
  judge,
  onSelectValue,
  onSave,
  onToggleZeroSide,
}) {
  const locked = !!judge.pattern.sent;

  const hongZero = !!judge.pattern.hong.zero;
  const chongZero = !!judge.pattern.chong.zero;

  const hongTech = judge.pattern.hong.tech || 0;
  const hongPower = judge.pattern.hong.power || 0;
  const hongRhythm = judge.pattern.hong.rhythm || 0;

  const chongTech = judge.pattern.chong.tech || 0;
  const chongPower = judge.pattern.chong.power || 0;
  const chongRhythm = judge.pattern.chong.rhythm || 0;

  const totals = patternTotalsForJudge(judge);

  const toggleValue = (side, field, value) => {
    if (locked) return;
    if (side === "hong" && hongZero) return;
    if (side === "chong" && chongZero) return;

    const current = judge.pattern[side][field] || 0;
    const next = current === value ? 0 : value;
    onSelectValue(side, field, next);
  };

  return (
    <div
      style={{
        ...styles.panel,
        background: "#07111f",
        border: "1px solid #17304f",
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 16, fontSize: 28, textAlign: "center" }}>
        JUEZ {judge.id}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ ...styles.panel, background: "#2a0606", border: "1px solid #631010" }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>{HONG}</div>

          <ZeroAbsoluteButton
            active={hongZero}
            disabled={locked}
            onClick={() => onToggleZeroSide("hong")}
            label="CERO ABSOLUTO HONG"
            bg="#7f1d1d"
          />

          <div style={{ marginBottom: 8 }}>Contenido técnico</div>
          <div>
            {[1, 2, 3, 4, 5].map((n) => (
              <ScoreChoice
                key={`ht-${n}`}
                selected={hongTech}
                value={n}
                disabled={locked || hongZero}
                onClick={() => toggleValue("hong", "tech", n)}
              />
            ))}
          </div>

          <div style={{ margin: "12px 0 8px" }}>Poder</div>
          <div>
            {[1, 2, 3].map((n) => (
              <ScoreChoice
                key={`hp-${n}`}
                selected={hongPower}
                value={n}
                disabled={locked || hongZero}
                onClick={() => toggleValue("hong", "power", n)}
              />
            ))}
          </div>

          <div style={{ margin: "12px 0 8px" }}>Ritmo</div>
          <div>
            {[1, 2, 3].map((n) => (
              <ScoreChoice
                key={`hr-${n}`}
                selected={hongRhythm}
                value={n}
                disabled={locked || hongZero}
                onClick={() => toggleValue("hong", "rhythm", n)}
              />
            ))}
          </div>

          <div style={{ marginTop: 12, fontWeight: 900 }}>Total: {totals.hong}</div>
        </div>

        <div style={{ ...styles.panel, background: "#07172f", border: "1px solid #174a9c" }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>{CHONG}</div>

          <ZeroAbsoluteButton
            active={chongZero}
            disabled={locked}
            onClick={() => onToggleZeroSide("chong")}
            label="CERO ABSOLUTO CHONG"
            bg="#1e3a8a"
          />

          <div style={{ marginBottom: 8 }}>Contenido técnico</div>
          <div>
            {[1, 2, 3, 4, 5].map((n) => (
              <ScoreChoice
                key={`ct-${n}`}
                selected={chongTech}
                value={n}
                disabled={locked || chongZero}
                onClick={() => toggleValue("chong", "tech", n)}
              />
            ))}
          </div>

          <div style={{ margin: "12px 0 8px" }}>Poder</div>
          <div>
            {[1, 2, 3].map((n) => (
              <ScoreChoice
                key={`cp-${n}`}
                selected={chongPower}
                value={n}
                disabled={locked || chongZero}
                onClick={() => toggleValue("chong", "power", n)}
              />
            ))}
          </div>

          <div style={{ margin: "12px 0 8px" }}>Ritmo</div>
          <div>
            {[1, 2, 3].map((n) => (
              <ScoreChoice
                key={`cr-${n}`}
                selected={chongRhythm}
                value={n}
                disabled={locked || chongZero}
                onClick={() => toggleValue("chong", "rhythm", n)}
              />
            ))}
          </div>

          <div style={{ marginTop: 12, fontWeight: 900 }}>Total: {totals.chong}</div>
        </div>
      </div>

      <AppButton
        style={{
          ...styles.green,
          width: "100%",
          marginTop: 16,
          minHeight: 60,
          fontSize: 18,
          boxShadow: "0 0 18px rgba(34,197,94,0.35)",
        }}
        disabled={locked}
        onClick={onSave}
      >
        {locked ? "Enviado" : "Enviar"}
      </AppButton>
    </div>
  );
}

function JudgePatternReadOnlyCard({ judge }) {
  const totals = patternTotalsForJudge(judge);

  const statusHong = judge.pattern.hong.zero ? " / Hong cero" : "";
  const statusChong = judge.pattern.chong.zero ? " / Chong cero" : "";

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
          {judge.pattern.sent ? `Enviado${statusHong}${statusChong}` : "Pendiente"}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ ...styles.panel, background: "#2a0606", border: "1px solid #631010" }}>
          <div style={{ fontWeight: "bold" }}>{HONG}</div>
          <div style={{ fontSize: 34, fontWeight: 900 }}>{totals.hong}</div>
        </div>

        <div style={{ ...styles.panel, background: "#07172f", border: "1px solid #174a9c" }}>
          <div style={{ fontWeight: "bold" }}>{CHONG}</div>
          <div style={{ fontSize: 34, fontWeight: 900 }}>{totals.chong}</div>
        </div>
      </div>
    </div>
  );
}

// ---------- HOME / QR ----------

function QRSection({ meta }) {
  const judgesToShow = 4;
  const base = getBaseURL();

  return (
    <div style={{ ...styles.panel, marginTop: 16 }}>
      <h2>QR Conexión</h2>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ marginBottom: 8 }}>Pantalla pública</div>
          <div style={{ background: "white", padding: 10, borderRadius: 12 }}>
            <QRCodeCanvas value={`${base}/public`} size={120} />
          </div>
        </div>

        {Array.from({ length: judgesToShow }, (_, i) => i + 1).map((n) => (
          <div key={n} style={{ textAlign: "center" }}>
            <div style={{ marginBottom: 8 }}>Juez {n}</div>
            <div style={{ background: "white", padding: 10, borderRadius: 12 }}>
              <QRCodeCanvas value={`${base}/judge/${n}`} size={120} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Home({ navigate, meta }) {
  const judgesToShow = 4;

  return (
    <div style={styles.page}>
      <LogoHeader subtitle="Hwarang Scoring Universe" />
      <h1>Hwarang Scoring</h1>
      <p>Elegí una pantalla:</p>

      <div style={styles.row}>
        <AppButton style={styles.green} onClick={() => navigate("/president")}>
          Presidente
        </AppButton>
        <AppButton style={styles.blue} onClick={() => navigate("/public")}>
          Pantalla pública
        </AppButton>
        {Array.from({ length: judgesToShow }, (_, i) => i + 1).map((n) => (
          <AppButton key={n} style={styles.red} onClick={() => navigate(`/judge/${n}`)}>
            Juez {n}
          </AppButton>
        ))}
      </div>

      <div style={{ ...styles.panel, marginTop: 16 }}>
        <h2>Modalidad actual</h2>
        <div style={{ fontSize: 28, fontWeight: 900 }}>
          "COMBATE"
        </div>
      </div>

      <QRSection meta={meta} />
    </div>
  );
}

// ---------- PUBLIC ----------

function CompetitorPublicCard({
  name,
  colorBg,
  borderColor,
  labelColor,
  votes,
  warnings,
  fouls,
  discount,
}) {
  return (
    <div
      style={{
        height: "100%",
        minWidth: 0,
        borderRadius: 28,
        background: colorBg,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        boxShadow: "inset 0 0 40px rgba(255,255,255,0.08)",
        padding: "22px 18px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          fontSize: "clamp(34px, 6vw, 86px)",
          fontWeight: 900,
          letterSpacing: 2,
          textTransform: "uppercase",
          lineHeight: 1,
        }}
      >
        {name}
      </div>

      <div
        style={{
          marginTop: 18,
          fontSize: "clamp(16px, 2.2vw, 30px)",
          fontWeight: 700,
          opacity: 0.95,
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        Jueces a favor
      </div>

      <div
        style={{
          marginTop: 8,
          fontSize: "clamp(70px, 12vw, 190px)",
          fontWeight: 900,
          lineHeight: 1,
        }}
      >
        {votes}
      </div>

      <div
        style={{
          marginTop: 22,
          width: "100%",
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0,1fr))",
          gap: 10,
        }}
      >
        <div
          style={{
            background: "rgba(0,0,0,0.18)",
            border: `1px solid ${borderColor}`,
            borderRadius: 16,
            padding: 12,
            textAlign: "center",
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: "clamp(10px, 1vw, 14px)",
              color: labelColor,
              fontWeight: 700,
            }}
          >
            ADVERT.
          </div>
          <div style={{ fontSize: "clamp(18px, 2.4vw, 34px)", fontWeight: 900 }}>
            {warnings}
          </div>
        </div>

        <div
          style={{
            background: "rgba(0,0,0,0.18)",
            border: `1px solid ${borderColor}`,
            borderRadius: 16,
            padding: 12,
            textAlign: "center",
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: "clamp(10px, 1vw, 14px)",
              color: labelColor,
              fontWeight: 700,
            }}
          >
            PUNTO MENOS
          </div>
          <div style={{ fontSize: "clamp(18px, 2.4vw, 34px)", fontWeight: 900 }}>
            -{discount}
          </div>
        </div>

        <div
          style={{
            background: "rgba(0,0,0,0.18)",
            border: `1px solid ${borderColor}`,
            borderRadius: 16,
            padding: 12,
            textAlign: "center",
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: "clamp(10px, 1vw, 14px)",
              color: labelColor,
              fontWeight: 700,
            }}
          >
            FALTAS
          </div>
          <div style={{ fontSize: "clamp(18px, 2.4vw, 34px)", fontWeight: 900 }}>
            {fouls}
          </div>
        </div>
      </div>
    </div>
  );
}

function PublicScreen({ meta, judges, navigate }) {
  const time = useClock(meta);
  const sum = useMemo(() => summary(meta, judges), [meta, judges]);
  const warning = secondFoulWarning(meta);

  const goldenLabel = meta.goldenPoint?.active
    ? meta.goldenPoint.mode === "A"
      ? "GOLDEN POINT A"
      : `GOLDEN POINT B - ROUND ${meta.goldenPoint.gpRound || 1}`
    : null;

  const phaseLabel =
    meta.goldenPoint?.active
      ? goldenLabel
      : meta.phase === "break"
      ? "DESCANSO"
      : meta.phase === "finished"
      ? "FINALIZADO"
      : `ROUND ${meta.round} / ${meta.config.rounds}`;

  if (false) {
    return (
      <Frame16x9>
        <AppButton
          style={{ ...styles.gray, position: "absolute", top: 14, left: 14, zIndex: 3 }}
          onClick={() => navigate("/")}
        >
          Inicio
        </AppButton>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(240px, 32%) minmax(0,1fr)",
            alignItems: "stretch",
            gap: 20,
            height: "100%",
          }}
        >
          <div
            style={{
              borderRadius: 28,
              background:
                "linear-gradient(180deg, rgba(185,28,28,0.95) 0%, rgba(80,7,7,0.98) 100%)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "22px 18px",
              minWidth: 0,
            }}
          >
            <div style={{ fontSize: "clamp(34px, 6vw, 86px)", fontWeight: 900 }}>{HONG}</div>
          </div>

          <div
            style={{
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 18,
            }}
          >
            <div
              style={{
                fontSize: "clamp(16px, 2vw, 24px)",
                letterSpacing: 4,
                fontWeight: 700,
                color: "#cfcfcf",
              }}
            >
              HWARANG SCORING
            </div>

            <div style={{ fontSize: "clamp(22px, 3vw, 36px)", fontWeight: 900, color: "#ffffff" }}>
              FORMAS GUP
            </div>

            <div
              style={{
                width: "100%",
                borderRadius: 28,
                background: "#0b0b0b",
                border: "2px solid #1f1f1f",
                padding: "28px 18px",
                textAlign: "center",
                boxShadow: "0 0 30px rgba(57,255,20,0.08)",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  color: "#39ff14",
                  fontSize: "clamp(56px, 9vw, 110px)",
                  fontWeight: 900,
                  lineHeight: 1,
                }}
              >
                {formatTime(time)}
              </div>

              <div
                style={{
                  marginTop: 14,
                  color: "#dddddd",
                  fontSize: "clamp(18px, 2.2vw, 30px)",
                  fontWeight: 900,
                }}
              >
                {meta.phase === "finished" ? "FINALIZADO" : "COMPITIENDO"}
              </div>

              {time <= 15 && meta.phase !== "finished" && (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: "clamp(16px, 2vw, 28px)",
                    fontWeight: 900,
                    color: "#39ff14",
                  }}
                >
                  JUECES PUNTUANDO
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              borderRadius: 28,
              background:
                "linear-gradient(180deg, rgba(29,78,216,0.95) 0%, rgba(7,23,47,0.98) 100%)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "22px 18px",
              minWidth: 0,
            }}
          >
            <div style={{ fontSize: "clamp(34px, 6vw, 86px)", fontWeight: 900 }}>{CHONG}</div>
          </div>
        </div>

        {meta.patternResult?.completed && (
          <WinnerFullScreen winner={meta.patternResult.winner} />
        )}
      </Frame16x9>
    );
  }

  return (
    <Frame16x9>
      <AppButton
        style={{ ...styles.gray, position: "absolute", top: 14, left: 14, zIndex: 3 }}
        onClick={() => navigate("/")}
      >
        Inicio
      </AppButton>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) minmax(260px, 34%) minmax(0,1fr)",
          alignItems: "stretch",
          gap: 20,
          height: "100%",
        }}
      >
        <CompetitorPublicCard
          name={HONG}
          colorBg="linear-gradient(180deg, rgba(185,28,28,0.95) 0%, rgba(80,7,7,0.98) 100%)"
          borderColor="#fca5a5"
          labelColor="#fca5a5"
          votes={sum.hongVotes}
          warnings={meta.hongWarnings}
          fouls={meta.hongFouls}
          discount={sum.hongDiscount}
        />

        <div
          style={{
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              fontSize: "clamp(16px, 2vw, 24px)",
              letterSpacing: 4,
              fontWeight: 700,
              color: "#cfcfcf",
            }}
          >
            HWARANG SCORING
          </div>

          <div
            style={{
              width: "100%",
              borderRadius: 28,
              background: "#0b0b0b",
              border: "2px solid #1f1f1f",
              padding: "28px 18px",
              textAlign: "center",
              boxShadow: "0 0 30px rgba(57,255,20,0.08)",
              minWidth: 0,
            }}
          >
            <div
              style={{
                color: "#39ff14",
                fontSize: "clamp(56px, 9vw, 110px)",
                fontWeight: 900,
                lineHeight: 1,
              }}
            >
              {formatTime(time)}
            </div>

            <div
              style={{
                marginTop: 14,
                color: "#dddddd",
                fontSize: "clamp(18px, 2.2vw, 30px)",
                fontWeight: 900,
                lineHeight: 1.1,
              }}
            >
              {phaseLabel}
            </div>

            {meta.phase === "break" && !meta.goldenPoint?.active && (
              <div
                style={{
                  marginTop: 8,
                  color: "#39ff14",
                  fontSize: "clamp(14px, 1.8vw, 22px)",
                  fontWeight: 800,
                }}
              >
                TIEMPO DE DESCANSO
              </div>
            )}
          </div>

          {!!warning && !meta.goldenPoint?.active && (
            <div
              style={{
                width: "100%",
                borderRadius: 18,
                background: "#7c2d12",
                border: "2px solid #f97316",
                color: "#ffedd5",
                textAlign: "center",
                padding: "14px 12px",
                fontSize: "clamp(14px, 1.8vw, 22px)",
                fontWeight: 900,
              }}
            >
              {warning}
            </div>
          )}

          <div
            style={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <div
              style={{
                background: "#161616",
                border: "1px solid #333",
                borderRadius: 16,
                padding: 12,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "clamp(10px, 1vw, 14px)", color: "#c8c8c8", fontWeight: 700 }}>
                EMPATES
              </div>
              <div style={{ fontSize: "clamp(24px, 3vw, 42px)", fontWeight: 900 }}>{sum.draws}</div>
            </div>

            <div
              style={{
                background: "#161616",
                border: "1px solid #333",
                borderRadius: 16,
                padding: 12,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "clamp(10px, 1vw, 14px)", color: "#c8c8c8", fontWeight: 700 }}>
                ROUND
              </div>
              <div style={{ fontSize: "clamp(24px, 3vw, 42px)", fontWeight: 900 }}>
                {meta.goldenPoint?.active
                  ? meta.goldenPoint.mode === "B"
                    ? meta.goldenPoint.gpRound || 1
                    : "GP"
                  : `${meta.round}/${meta.config.rounds}`}
              </div>
            </div>
          </div>
        </div>

        <CompetitorPublicCard
          name={CHONG}
          colorBg="linear-gradient(180deg, rgba(29,78,216,0.95) 0%, rgba(7,23,47,0.98) 100%)"
          borderColor="#93c5fd"
          labelColor="#93c5fd"
          votes={sum.chongVotes}
          warnings={meta.chongWarnings}
          fouls={meta.chongFouls}
          discount={sum.chongDiscount}
        />
      </div>

      {meta.phase === "finished" && <WinnerFullScreen winner={sum.winner} />}
    </Frame16x9>
  );
}

// ---------- PRESIDENTE ----------

function PresidentScreen({
  meta,
  judges,
  writeMeta,
  writeJudge,
  resetAll,
  navigate,
}) {
  const time = useClock(meta);
  const sum = useMemo(() => summary(meta, judges), [meta, judges]);
  const warning = secondFoulWarning(meta);
  const transitionLock = useRef("");
  const prevRunningRef = useRef(false);
  const prevFinishedRef = useRef(false);

  useEffect(() => {
    const isRunning = meta.status === "running" && meta.phase === "fight";
    if (isRunning && !prevRunningRef.current) {
      playStartAlarm();
    }
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

  const [secondsInput, setSecondsInput] = useState(String(meta.config.roundSeconds || 120));
  const [roundsInput, setRoundsInput] = useState(String(meta.config.rounds));

  useEffect(() => {
    setSecondsInput(String(meta.config.roundSeconds || 120));
    setRoundsInput(String(meta.config.rounds));
  }, [meta.config.roundSeconds, meta.config.rounds]);

  const resetJudgesOnly = async () => {
    for (let i = 1; i <= MAX_JUDGES; i++) {
      await writeJudge(i, () => makeJudge(i));
    }
  };

  useEffect(() => {
    if (meta.mode !== MODES.COMBAT) return;
    if (meta.status !== "running") return;
    if (meta.phase === "finished") return;
    if (time > 0) {
      transitionLock.current = "";
      return;
    }

    const key = `${meta.phase}-${meta.round}-${time}-${meta.goldenPoint?.active}-${meta.goldenPoint?.mode}-${meta.goldenPoint?.gpRound}`;
    if (transitionLock.current === key) return;
    transitionLock.current = key;

    const handleCombatTimerEnd = async () => {
      if (meta.goldenPoint?.active && meta.goldenPoint?.mode === "B" && meta.phase === "fight") {
        if (sum.winner === "draw") {
          await resetJudgesOnly();
          await writeMeta((current) => {
            current.status = "paused";
            current.phase = "fight";
            current.phaseStartedAt = null;
            current.pausedRemaining = current.config.roundSeconds || 120;
            current.hongWarnings = 0;
            current.chongWarnings = 0;
            current.hongFouls = 0;
            current.chongFouls = 0;
            current.combatForcedWinner = null;
            current.goldenPoint.gpRound = (current.goldenPoint.gpRound || 1) + 1;
            return current;
          });
        } else {
          await writeMeta((current) => {
            current.phase = "finished";
            current.status = "paused";
            current.pausedRemaining = 0;
            current.phaseStartedAt = null;
            return current;
          });
        }
        return;
      }

      if (meta.goldenPoint?.active && meta.goldenPoint?.mode === "A" && meta.phase === "fight") {
        await writeMeta((current) => {
          current.status = "paused";
          current.phase = "fight";
          current.phaseStartedAt = null;
          current.pausedRemaining = current.config.roundSeconds || 120;
          return current;
        });
        return;
      }

      await writeMeta((current) => {
        const live = getDerivedTime(current, Date.now());
        if (current.status !== "running") return current;
        if (current.phase === "finished") return current;
        if (live > 0) return current;

        if (current.phase === "fight") {
          if (current.round < current.config.rounds) {
            current.phase = "break";
            current.status = "running";
            current.pausedRemaining = BREAK_SECONDS;
            current.phaseStartedAt = Date.now();
          } else {
            current.phase = "finished";
            current.status = "paused";
            current.pausedRemaining = 0;
            current.phaseStartedAt = null;
          }
        } else if (current.phase === "break") {
          current.phase = "fight";
          current.status = "paused";
          current.round = Math.min(current.round + 1, current.config.rounds);
          current.pausedRemaining = current.config.roundSeconds || 120;
          current.phaseStartedAt = null;
        }

        return current;
      });
    };

    handleCombatTimerEnd();
  }, [meta, time, sum.winner, writeMeta, writeJudge]);

  const saveConfig = async () => {
    const roundSeconds = Math.max(1, parseInt(secondsInput, 10) || 120);
    const rounds = Math.max(1, parseInt(roundsInput, 10) || 1);

    tapFeedback({ vibrateMs: 45 });

    await writeMeta((current) => {
      current.config.roundSeconds = roundSeconds;
      current.config.rounds = rounds;
      if (current.round > rounds) current.round = rounds;

      if (current.status === "paused") {
        current.pausedRemaining = roundSeconds;
      }
      return current;
    });
  };

  const startTimer = async () => {
    tapFeedback({ vibrateMs: 50 });
    await writeMeta((current) => {
      if (current.phase === "finished") return current;
      if (current.status === "running") return current;
      current.status = "running";
      current.phaseStartedAt = Date.now();
      return current;
    });
  };

  const pauseTimer = async () => {
    tapFeedback({ vibrateMs: 50 });
    await writeMeta((current) => {
      if (current.status !== "running") return current;
      current.pausedRemaining = getDerivedTime(current, Date.now());
      current.status = "paused";
      current.phaseStartedAt = null;
      return current;
    });
  };

  const switchMode = async () => {
    tapFeedback({ vibrateMs: 55 });
    await resetJudgesOnly();

    await writeMeta((current) => {
      const roundSeconds = current.config.roundSeconds || 120;

      current.mode = MODES.COMBAT;
      current.status = "paused";
      current.phase = "fight";
      current.round = 1;
      current.phaseStartedAt = null;
      current.pausedRemaining = roundSeconds;

      current.hongWarnings = 0;
      current.chongWarnings = 0;
      current.hongFouls = 0;
      current.chongFouls = 0;
      current.combatForcedWinner = null;
      current.goldenPoint = makeEmptyGoldenPoint();
      current.patternResult = makeEmptyPatternResult();

      return current;
    });
  };

  const updateDiscipline = async (type, side) => {
    tapFeedback({ vibrateMs: 55 });

    if (type === "WARNING") {
      await writeMeta((current) => {
        if (side === "hong") current.hongWarnings += 1;
        else current.chongWarnings += 1;
        return current;
      });
      return;
    }

    if (type === "FOUL") {
      const judgeCount = activeJudgeCount(meta);
      for (let i = 1; i <= judgeCount; i++) {
        await writeJudge(i, (j) => {
          if (side === "hong") j.hongPoints -= 1;
          else j.chongPoints -= 1;
          return j;
        });
      }

      await writeMeta((current) => {
        if (side === "hong") current.hongFouls += 1;
        else current.chongFouls += 1;
        return current;
      });
    }
  };

  const setPatternJudgeCount = async (count) => {
    tapFeedback({ vibrateMs: 45 });
    await writeMeta((current) => {
      current.config.patternJudges = count;
      return current;
    });
  };

  const closePatternEvaluation = async () => {
    tapFeedback({ vibrateMs: 60 });
    const live = patternSummary(meta, judges);

    await writeMeta((current) => {
      current.patternResult = {
        hong: live.hong,
        chong: live.chong,
        sent: live.sent,
        completed: true,
        winner: live.winner,
      };

      current.status = "paused";
      current.phase = "finished";
      current.phaseStartedAt = null;
      current.pausedRemaining = 0;

      return current;
    });
  };

  const prepareNextMatch = async () => {
    tapFeedback({ vibrateMs: 65 });
    await resetJudgesOnly();

    await writeMeta((current) => {
      const roundSeconds = current.config.roundSeconds || 120;

      current.status = "paused";
      current.phase = "fight";
      current.round = 1;
      current.phaseStartedAt = null;
      current.pausedRemaining = roundSeconds;

      current.hongWarnings = 0;
      current.chongWarnings = 0;
      current.hongFouls = 0;
      current.chongFouls = 0;
      current.combatForcedWinner = null;
      current.goldenPoint = makeEmptyGoldenPoint();
      current.patternResult = makeEmptyPatternResult();

      if (current.mode === MODES.PATTERN) {
        current.config.rounds = 1;
        current.round = 1;
      }

      return current;
    });
  };

  const activateGoldenPoint = async (mode) => {
    tapFeedback({ vibrateMs: 65 });

    const archive = {
      meta: {
        round: meta.round,
        phase: meta.phase,
        status: meta.status,
        pausedRemaining: meta.pausedRemaining,
        hongWarnings: meta.hongWarnings,
        chongWarnings: meta.chongWarnings,
        hongFouls: meta.hongFouls,
        chongFouls: meta.chongFouls,
      },
      judges: clone(activeJudges(meta, judges)),
    };

    await resetJudgesOnly();

    await writeMeta((current) => {
      current.goldenPoint = {
        active: true,
        mode,
        gpRound: 1,
        archive,
      };
      current.phase = "fight";
      current.status = "paused";
      current.round = 1;
      current.phaseStartedAt = null;
      current.pausedRemaining = current.config.roundSeconds || 120;
      current.hongWarnings = 0;
      current.chongWarnings = 0;
      current.hongFouls = 0;
      current.chongFouls = 0;
      current.combatForcedWinner = null;
      return current;
    });
  };

  const applyCombatForcedWinner = async (winner) => {
    tapFeedback({ vibrateMs: 70 });
    await writeMeta((current) => {
      current.combatForcedWinner = winner;
      current.phase = "finished";
      current.status = "paused";
      current.pausedRemaining = 0;
      current.phaseStartedAt = null;
      return current;
    });
  };

  const applyPatternForcedWinner = async (winner) => {
    tapFeedback({ vibrateMs: 70 });
    await writeMeta((current) => {
      current.patternResult = {
        ...current.patternResult,
        completed: true,
        winner,
      };
      current.phase = "finished";
      current.status = "paused";
      current.pausedRemaining = 0;
      current.phaseStartedAt = null;
      return current;
    });
  };

  const currentJudges = judges.slice(0, COMBAT_JUDGES);
  const presidentWinner = sum.winner;
  const showPresidentWinner = meta.phase === "finished";

  return (
    <Frame16x9>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 120,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 12,
          paddingBottom: 6,
        }}
      >
        <AppButton style={styles.gray} onClick={() => navigate("/")}>
          Inicio
        </AppButton>
        <AppButton style={styles.green} onClick={prepareNextMatch}>
          Siguiente match
        </AppButton>
        <AppButton style={styles.gray} onClick={resetAll}>
          Reset total
        </AppButton>
      </div>

      <h1 style={{ margin: "0 0 16px 0", textAlign: "center", fontSize: "clamp(34px,4vw,64px)" }}>
        Presidente
      </h1>

      <div style={{ ...styles.panel, marginTop: 16 }}>
        <h2>Modalidad</h2>
        <div style={styles.row}>
          <AppButton
            style={{
              ...styles.green,
              boxShadow: "0 0 18px rgba(34,197,94,0.35)",
            }}
            onClick={() => switchMode()}
          >
            Combate
          </AppButton>
        </div>
      </div>

      <div style={styles.row}>
        <div style={styles.stat}>
          Tiempo: <strong>{formatTime(time)}</strong>
        </div>

        <div style={styles.stat}>
          {meta.mode === MODES.COMBAT ? (
            <>
              {meta.goldenPoint?.active ? (
                <>
                  Golden Point:{" "}
                  <strong>
                    {meta.goldenPoint.mode === "A"
                      ? "A"
                      : `B / R${meta.goldenPoint.gpRound || 1}`}
                  </strong>
                </>
              ) : (
                <>
                  Round: <strong>{meta.round}/{meta.config.rounds}</strong>
                </>
              )}
            </>
          ) : (
            <>
              Jueces: <strong>{meta.config.patternJudges}</strong>
            </>
          )}
        </div>

        <div style={styles.stat}>
          Estado:{" "}
          <strong>
            {meta.phase === "break"
              ? meta.status === "running"
                ? "Descanso"
                : "Listo para iniciar round"
              : meta.phase === "finished"
              ? "Finalizado"
              : meta.status === "running"
              ? "En marcha"
              : "Pausado"}
          </strong>
        </div>
      </div>

      <div style={{ ...styles.panel, marginTop: 16 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr auto",
            gap: 12,
            alignItems: "end",
          }}
        >
          <div>
            <label>Tiempo del round (segundos)</label>
            <input
              type="number"
              min="1"
              value={secondsInput}
              onChange={(e) => setSecondsInput(e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                marginTop: 6,
                borderRadius: 10,
              }}
            />
            <div style={{ ...styles.row, marginTop: 10 }}>
              {[60, 90, 120, 180, 300].map((s) => (
                <AppButton
                  key={s}
                  style={styles.gray}
                  onClick={() => setSecondsInput(String(s))}
                >
                  {s}s
                </AppButton>
              ))}
            </div>
          </div>

          <div>
              <label>Cantidad de rounds</label>
              <input
                type="number"
                min="1"
                value={roundsInput}
                onChange={(e) => setRoundsInput(e.target.value)}
                style={{
                  width: "100%",
                  padding: 10,
                  marginTop: 6,
                  borderRadius: 10,
                }}
              />
            </div>

          <AppButton style={styles.blue} onClick={saveConfig}>
            Guardar configuración
          </AppButton>
        </div>


        <div style={{ ...styles.row, marginTop: 16 }}>
          <AppButton
            style={{ ...styles.green, boxShadow: "0 0 18px rgba(34,197,94,0.35)" }}
            onClick={startTimer}
          >
            {meta.phase === "break" ? "Iniciar siguiente round" : "Iniciar"}
          </AppButton>

          <AppButton
            style={{ ...styles.amber, boxShadow: "0 0 18px rgba(245,158,11,0.35)" }}
            onClick={pauseTimer}
          >
            Pausar
          </AppButton>

          <AppButton
            style={{ ...styles.purple, boxShadow: "0 0 18px rgba(168,85,247,0.35)" }}
            onClick={() =>
              writeMeta((c) => {
                c.pausedRemaining = getDerivedTime(c, Date.now());
                c.status = "paused";
                c.phase = "finished";
                c.phaseStartedAt = null;
                return c;
              })
            }
          >
            Finalizar
          </AppButton>
        </div>
      </div>

      <QRSection meta={meta} />

      {meta.mode === MODES.COMBAT && (
        <>
          <div style={{ ...styles.panel, marginTop: 16 }}>
            <h2>Golden Point</h2>
            <div style={styles.row}>
              <AppButton
                style={
                  meta.goldenPoint?.active && meta.goldenPoint?.mode === "A"
                    ? styles.green
                    : styles.blue
                }
                onClick={() => activateGoldenPoint("A")}
              >
                Activar GP A
              </AppButton>

              <AppButton
                style={
                  meta.goldenPoint?.active && meta.goldenPoint?.mode === "B"
                    ? styles.green
                    : styles.blue
                }
                onClick={() => activateGoldenPoint("B")}
              >
                Activar GP B
              </AppButton>
            </div>

            {meta.goldenPoint?.active && (
              <div style={{ marginTop: 12 }}>
                Activo:{" "}
                <strong>
                  {meta.goldenPoint.mode === "A"
                    ? "Golden Point A"
                    : `Golden Point B / Round ${meta.goldenPoint.gpRound || 1}`}
                </strong>
              </div>
            )}
          </div>

          <div style={{ ...styles.panel, marginTop: 16 }}>
            <h2>Fallo arbitral Combate</h2>
            <div style={styles.row}>
              <AppButton style={styles.red} onClick={() => applyCombatForcedWinner("hong")}>
                Ganador Rojo
              </AppButton>
              <AppButton style={styles.blue} onClick={() => applyCombatForcedWinner("chong")}>
                Ganador Azul
              </AppButton>
              <AppButton style={styles.gray} onClick={() => applyCombatForcedWinner("draw")}>
                Empate
              </AppButton>
            </div>
          </div>

          {!!warning && !meta.goldenPoint?.active && (
            <div
              style={{
                ...styles.panel,
                background: "#7c2d12",
                border: "1px solid #f97316",
                marginTop: 16,
                color: "#ffedd5",
                fontWeight: 900,
                textAlign: "center",
              }}
            >
              {warning}
            </div>
          )}

          <div style={{ ...styles.panel, marginTop: 16 }}>
            <h2>Disciplina</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ ...styles.panel, background: "#2a0606", border: "1px solid #631010" }}>
                <div style={{ fontWeight: 900, marginBottom: 10 }}>{HONG}</div>
                <div style={styles.row}>
                  <AppButton style={styles.amber} onClick={() => updateDiscipline("WARNING", "hong")}>
                    Advertencia
                  </AppButton>
                  <AppButton style={styles.dangerRed} onClick={() => updateDiscipline("FOUL", "hong")}>
                    Falta grave
                  </AppButton>
                </div>
                <div style={{ marginTop: 12 }}>
                  Advertencias: <strong>{meta.hongWarnings}</strong>
                </div>
                <div>
                  Punto menos: <strong>-{sum.hongDiscount}</strong>
                </div>
                <div>
                  Faltas graves: <strong>{meta.hongFouls}</strong>
                </div>
              </div>

              <div style={{ ...styles.panel, background: "#07172f", border: "1px solid #174a9c" }}>
                <div style={{ fontWeight: 900, marginBottom: 10 }}>{CHONG}</div>
                <div style={styles.row}>
                  <AppButton style={styles.amber} onClick={() => updateDiscipline("WARNING", "chong")}>
                    Advertencia
                  </AppButton>
                  <AppButton style={styles.dangerBlue} onClick={() => updateDiscipline("FOUL", "chong")}>
                    Falta grave
                  </AppButton>
                </div>
                <div style={{ marginTop: 12 }}>
                  Advertencias: <strong>{meta.chongWarnings}</strong>
                </div>
                <div>
                  Punto menos: <strong>-{sum.chongDiscount}</strong>
                </div>
                <div>
                  Faltas graves: <strong>{meta.chongFouls}</strong>
                </div>
              </div>
            </div>
          </div>

          <div style={{ ...styles.panel, marginTop: 16 }}>
            <h2>Votación</h2>
            <div style={styles.row}>
              <div style={{ ...styles.stat, background: "#2a0606", border: "1px solid #631010" }}>
                Hong: <strong>{sum.hongVotes}</strong>
              </div>
              <div style={styles.stat}>
                Empates: <strong>{sum.draws}</strong>
              </div>
              <div style={{ ...styles.stat, background: "#07172f", border: "1px solid #174a9c" }}>
                Chong: <strong>{sum.chongVotes}</strong>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <h2>Puntaje de jueces (solo lectura)</h2>
            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 16,
              }}
            >
              {currentJudges.map((j) => (
                <JudgeReadOnlyCard key={j.id} judge={j} meta={meta} />
              ))}
            </div>
          </div>
        </>
      )}


      {showPresidentWinner && (
        <WinnerFullScreen winner={presidentWinner} zIndex={100} />
      )}
    </Frame16x9>
  );
}

// ---------- JUEZ ----------

function JudgeScreen({ meta, judges, writeJudge, writeMeta, judgeId, navigate }) {
  const time = useClock(meta);
  const currentJudges = COMBAT_JUDGES;
  const prevFinishedRef = useRef(false);

  useEffect(() => {
    const isFinished =
      meta.mode === MODES.COMBAT
        ? meta.phase === "finished"
        : !!meta.patternResult?.completed;
    if (isFinished && !prevFinishedRef.current) {
      playWinnerSound();
    }
    prevFinishedRef.current = isFinished;
  }, [meta.mode, meta.phase, meta.patternResult?.completed]);

  if (judgeId > currentJudges) {
    return (
      <div style={styles.page}>
      <LogoHeader subtitle="Combat" />
      <LogoHeader subtitle="Combat" />
        <AppButton style={styles.gray} onClick={() => navigate("/")}>
          Inicio
        </AppButton>
        <h1>Juez {judgeId}</h1>
        <div style={styles.panel}>Este juez no está activo en la modalidad actual.</div>
      </div>
    );
  }

  const judge = judges.find((j) => j.id === judgeId) || makeJudge(judgeId);
  const warning = secondFoulWarning(meta);

  const updateJudge = async (kind, side = null, value = null) => {
    const nextJudge = await writeJudge(judgeId, (j) => {
      if (kind === "UNDO") {
        if (j.history.length === 0) return j;
        return j.history[j.history.length - 1];
      }

      const before = clone(j);
      const next = clone(j);
      next.history = [...j.history, before];

      if (kind === "POINT") {
        if (side === "hong") next.hongPoints += value;
        else next.chongPoints += value;
      }

      return next;
    });

    if (kind === "POINT" && meta.goldenPoint?.active && meta.goldenPoint?.mode === "A") {
      const tempJudges = judges.map((j) => (j.id === judgeId ? nextJudge : j));
      const declared = goldenPointADeclaredWinner(meta, tempJudges);

      if (declared) {
        await writeMeta((current) => {
          current.combatForcedWinner = declared;
          current.phase = "finished";
          current.status = "paused";
          current.pausedRemaining = 0;
          current.phaseStartedAt = null;
          return current;
        });
      }
    }
  };

  const selectPatternValue = async (side, field, value) => {
    await writeJudge(judgeId, (j) => {
      j.pattern[side][field] = value;
      return j;
    });
  };

  const togglePatternZeroSide = async (side) => {
    await writeJudge(judgeId, (j) => {
      j.pattern[side].zero = !j.pattern[side].zero;

      if (j.pattern[side].zero) {
        j.pattern[side].tech = 0;
        j.pattern[side].power = 0;
        j.pattern[side].rhythm = 0;
      }

      return j;
    });
  };

  const savePattern = async () => {
    await writeJudge(judgeId, (j) => {
      j.pattern.sent = true;
      return j;
    });
  };

  const judgeWinner = summary(meta, judges).winner;
  const showJudgeWinner = meta.phase === "finished";

  return (
    <div
      style={{
        ...styles.page,
        background: "#06101c",
        minHeight: "100vh",
      }}
    >
      <AppButton style={styles.gray} onClick={() => navigate("/")}>
        Inicio
      </AppButton>

      <h1>Juez {judgeId}</h1>

      <div style={styles.row}>
        <div style={styles.stat}>
          Tiempo: <strong>{formatTime(time)}</strong>
        </div>
        <div style={styles.stat}>
          Modalidad: <strong>COMBATE</strong>
        </div>
        {meta.mode === MODES.COMBAT && meta.goldenPoint?.active && (
          <div style={styles.stat}>
            <strong>
              {meta.goldenPoint.mode === "A"
                ? "GOLDEN POINT A"
                : `GOLDEN POINT B / ROUND ${meta.goldenPoint.gpRound || 1}`}
            </strong>
          </div>
        )}
      </div>

          {!!warning && !meta.goldenPoint?.active && (
            <div
              style={{
                ...styles.panel,
                background: "#7c2d12",
                border: "1px solid #f97316",
                marginTop: 16,
                color: "#ffedd5",
                fontWeight: 900,
                textAlign: "center",
              }}
            >
              {warning}
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <JudgePanel
              judge={judge}
              meta={meta}
              onPoint={(side, value) => updateJudge("POINT", side, value)}
              onUndo={() => updateJudge("UNDO")}
            />
          </div>

      {showJudgeWinner && <WinnerFullScreen winner={judgeWinner} />}
    </div>
  );
}

// ---------- APP ----------

export default function App() {
  const { meta, judges, writeMeta, writeJudge, resetAll } = useFightData();
  const { path, navigate } = useRoute();


  useEffect(() => {
    if (!meta) return;
    if (meta.mode !== MODES.COMBAT) {
      writeMeta((current) => {
        current.mode = MODES.COMBAT;
        current.config.rounds = current.config.rounds || 1;
        current.config.roundSeconds = current.config.roundSeconds || ((current.config.minutes || 2) * 60);
        if (!current.pausedRemaining) current.pausedRemaining = current.config.roundSeconds;
        return current;
      });
    }
  }, [meta]);

  if (!meta) {
    return <div style={styles.page}>Cargando...</div>;
  }

  if (path === "/president") {
    return (
      <PresidentScreen
        meta={meta}
        judges={judges}
        writeMeta={writeMeta}
        writeJudge={writeJudge}
        resetAll={resetAll}
        navigate={navigate}
      />
    );
  }

  if (path === "/public") {
    return <PublicScreen meta={meta} judges={judges} navigate={navigate} />;
  }

  if (path.startsWith("/judge/")) {
    const n = Number(path.split("/")[2]);
    if (n >= 1 && n <= COMBAT_JUDGES) {
      return (
        <JudgeScreen
          meta={meta}
          judges={judges}
          writeJudge={writeJudge}
          writeMeta={writeMeta}
          judgeId={n}
          navigate={navigate}
        />
      );
    }
  }

  return <Home navigate={navigate} meta={meta} />;
}