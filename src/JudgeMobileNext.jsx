
import { useEffect, useState } from "react";
import { useWakeLock } from "./useWakeLock";
export default function JudgeMobileNext({ meta, judges, writeJudge, judgeId, roomId, time, mobileWarningText }) {
  useWakeLock();
  
  useEffect(() => {
  const keepAwake = async () => {
    try {
      if ("wakeLock" in navigator) {
        await navigator.wakeLock.request("screen");
      }
    } catch {}
  };

  keepAwake();

  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      keepAwake();
    }
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("focus", keepAwake);

  return () => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("focus", keepAwake);
  };
}, []);

  const gpBannerText =
  meta?.goldenPoint?.active
    ? meta?.goldenPoint?.mode === "A"
      ? "GOLDEN POINT A"
      : `GOLDEN POINT B · ROUND ${meta?.goldenPoint?.gpRound || 1}`
    : null;

  const showGoldenPointFinalDraw =
  meta?.goldenPoint?.active &&
  meta?.phase === "finished" &&
  (
    meta?.goldenPoint?.result === "draw" ||
    meta?.goldenPoint?.result === "noDecision" ||
    meta?.combatForcedWinner === "draw"
  );

  const showCallJudgesBanner =
  meta?.goldenPoint?.active &&
  meta?.goldenPoint?.mode === "A" &&
  meta?.goldenPoint?.state === "judging";

  const showNoDecisionBanner =
  meta?.goldenPoint?.active &&
  (meta?.goldenPoint?.mode === "A" || meta?.goldenPoint?.mode === "B") &&
  (
    meta?.goldenPoint?.state === "noDecision" ||
    meta?.goldenPoint?.result === "noDecision"
  );  

  const judgeBackgrounds = {
  1: "/backgrounds/judge-red.jpg",
  2: "/backgrounds/judge-blue.jpg",
  3: "/backgrounds/judge-green.jpg",
  4: "/backgrounds/judge-gold.jpg",
};

const judgeStatusLabel =
  meta?.phase === "finished"
    ? "FINISHED"
    : meta?.phase === "break"
    ? "BREAK"
    : meta?.status === "running"
    ? "FIGHT"
    : "PAUSED";

const activeBg =
  judgeBackgrounds[Number(judgeId)] || "/backgrounds/judge-red.jpg";

const inputsLocked =
  meta?.phase === "break" ||
  meta?.phase === "finished";
  
/*============================== MEDICAL EMERGENCY DETECTOR / JUDGE ==============================*/

const medicalRunningSide =
  meta?.medicalV2Display?.hongRunning
    ? "hong"
    : meta?.medicalV2Display?.chongRunning
    ? "chong"
    : null;

const medicalEmergencySide =
  meta?.medicalV2Display?.hongSeconds === 0 &&
  !meta?.medicalV2Display?.hongRunning
    ? "hong"
    : meta?.medicalV2Display?.chongSeconds === 0 &&
      !meta?.medicalV2Display?.chongRunning
    ? "chong"
    : null;

  /*============================== MEDICAL EXPIRED OVERLAY STATE ==============================*/

const [medicalExpiredOverlay, setMedicalExpiredOverlay] = useState(false);





const btn = {
  background: "rgba(0,0,0,0.35)",
  borderRadius: 12,
  padding: "0",
  height: 80,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
  fontSize: 28,
  cursor: "pointer",
  transition: "0.1s",
};

const vibrateJudge = () => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([40, 20, 40]);
  }
};

const pressFx = {
  onMouseDown: (e) => (e.currentTarget.style.transform = "scale(0.95)"),
  onMouseUp: (e) => (e.currentTarget.style.transform = "scale(1)"),
  onMouseLeave: (e) => (e.currentTarget.style.transform = "scale(1)"),
  onTouchStart: (e) => {
  e.currentTarget.style.transform = "scale(0.95)";
  vibrateJudge();
},
  onTouchEnd: (e) => (e.currentTarget.style.transform = "scale(1)"),
};

const isGPA =
  meta?.goldenPoint?.active &&
  meta?.goldenPoint?.mode === "A";

const handlePoint = (side, value) => {
  writeJudge(judgeId, (j) => {
    const before = structuredClone(j);
    const next = structuredClone(j);

    next.history = [...(j.history || []), before];

    if (side === "hong") next.hongPoints += value;
    if (side === "chong") next.chongPoints += value;

    return next;
  });
};

const handleUndo = () => {
  writeJudge(judgeId, (j) => {
    if (!j.history?.length) return j;
    return j.history[j.history.length - 1];
  });
};

const handleGPDecision = (side) => {
  writeJudge(judgeId, (j) => {
    const before = structuredClone(j);
    const next = structuredClone(j);

    next.history = [...(j.history || []), before];
    next.gpDecision = side;

    return next;
  });
};

// ===== GPA / GPB / RESULT =====

const judge =
  (judges || []).find((j) => j.id === Number(judgeId)) ||
  makeJudge(Number(judgeId));

const isGPB =
  meta?.goldenPoint?.active &&
  meta?.goldenPoint?.mode === "B";

const isGoldenPoint =
  meta?.goldenPoint?.active &&
  (meta?.goldenPoint?.mode === "A" || meta?.goldenPoint?.mode === "B");

const isGoldenPointDraw =
  meta?.goldenPoint?.active &&
  (
    meta?.goldenPoint?.state === "noDecision" ||
    meta?.goldenPoint?.result === "noDecision"
  );

const gpJudgeWinner =
  isGoldenPoint && meta?.goldenPoint?.result === "hongWinner"
    ? "hong"
    : isGoldenPoint && meta?.goldenPoint?.result === "chongWinner"
    ? "chong"
    : null;

const gpJudgeDraw = null;

const judgeWinner =
  gpJudgeWinner ||
  gpJudgeDraw ||
  meta?.combatForcedWinner ||
  meta?.judgeWinner ||
  null;

const showJudgeWinner =
  (
    meta?.showResult === true ||
    !!gpJudgeWinner ||
    !!gpJudgeDraw
  ) &&
  judgeWinner &&
  judgeWinner !== "en_curso";

  return (
  <div
    style={{
      height: "100svh",
      minHeight: "100svh",
      maxHeight: "100svh",
      background: "#050505",
      color: "white",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
    }}
  >
      <style>
        {`

          @keyframes statusPulse {
  0% { transform: scale(1); box-shadow: 0 0 0 rgba(255,255,255,0); }
  50% { transform: scale(1.06); box-shadow: 0 0 22px rgba(255,255,255,0.45); }
  100% { transform: scale(1); box-shadow: 0 0 0 rgba(255,255,255,0); }
}

@keyframes callPulse {
  0% { opacity: 0.7; transform: scale(0.98); }
  50% { opacity: 1; transform: scale(1.02); }
  100% { opacity: 0.7; transform: scale(0.98); }
}

@keyframes decisionPulse {
  0% { opacity: 0.75; transform: scale(0.98); }
  50% { opacity: 1; transform: scale(1); }
  100% { opacity: 0.75; transform: scale(0.98); }
}

          @keyframes neonLinePulse {
            0% { opacity: 0.35; transform: scaleX(0.92); }
            50% { opacity: 0.75; transform: scaleX(1); }
            100% { opacity: 0.35; transform: scaleX(0.92); }
          }
            @keyframes medicalEmergencyPulse {
  0% { filter: brightness(1); }
  50% { filter: brightness(1.35); }
  100% { filter: brightness(1); }
}
        `}
           

        
      </style>

      {/* CONTENEDOR GENERAL / MARCO MOBILE */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          height: "100svh",
          maxHeight: 900,
          position: "relative",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.55)),
            url('${activeBg}')
          `,
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          boxShadow: "0 0 55px rgba(255, 0, 0, 0.61), 0 0 110px rgba(255,0,0,0.18)",
        }}
      >
        {/*============================== MEDICAL EXPIRED OVERLAY ==============================*/}

{/*============================== MEDICAL RUNNING OVERLAY / JUDGE ==============================*/}

{medicalRunningSide && !medicalEmergencySide && (
  <div
    style={{
      position: "absolute",
      inset: 0,
      zIndex: 70,
      background:
        medicalRunningSide === "hong"
          ? "radial-gradient(circle, rgba(90,0,0,0.86), rgba(0,0,0,0.90))"
          : "radial-gradient(circle, rgba(0,28,95,0.86), rgba(0,0,0,0.90))",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
      fontFamily: "'Orbitron', sans-serif",
      textAlign: "center",
      letterSpacing: "0.08em",
      animation: "medicalEmergencyPulse 1.8s ease-in-out infinite",
      pointerEvents: "auto",
    }}
  >
    <div
      style={{
        fontSize: 19,
        marginBottom: 16,
        color: "#facc15",
        fontWeight: 900,
      }}
    >
      MEDICAL TIME
    </div>

    <div
      style={{
        fontSize: 42,
        fontWeight: 900,
        color: medicalRunningSide === "hong" ? "#ff2a2a" : "#2f7cff",
        textShadow:
          medicalRunningSide === "hong"
            ? "0 0 22px rgba(255,0,0,0.9)"
            : "0 0 22px rgba(47,124,255,0.9)",
      }}
    >
      {medicalRunningSide === "hong" ? "HONG" : "CHONG"}
    </div>

    <div
      style={{
        fontSize: 29,
        fontWeight: 900,
        marginTop: 8,
      }}
    >
      IN PROGRESS
    </div>

    <div
      style={{
        marginTop: 20,
        fontSize: 17,
        lineHeight: 1.35,
        color: "rgba(255,255,255,0.82)",
      }}
    >
      INPUTS LOCKED
      <br />
      MEDICAL TIME RUNNING
    </div>
  </div>
)}

{/*============================== MEDICAL FORCED EXIT OVERLAY / JUDGE ==============================*/}

{medicalEmergencySide && (
  <div
    style={{
      position: "absolute",
      inset: 0,
      zIndex: 80,
      background:
        medicalEmergencySide === "hong"
          ? `
            radial-gradient(circle at center,
              rgba(160,0,0,0.95) 0%,
              rgba(55,0,0,0.96) 42%,
              rgba(0,0,0,0.98) 100%)
          `
          : `
            radial-gradient(circle at center,
              rgba(0,55,160,0.95) 0%,
              rgba(0,16,70,0.96) 42%,
              rgba(0,0,0,0.98) 100%)
          `,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
      fontFamily: "'Orbitron', sans-serif",
      textAlign: "center",
      letterSpacing: "0.08em",
      animation: "medicalEmergencyPulse 0.9s ease-in-out infinite",
      pointerEvents: "auto",
      padding: 22,
      boxSizing: "border-box",
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: 340,
        borderRadius: 26,
        overflow: "hidden",
        padding: "30px 18px",
        background:
          "linear-gradient(180deg, rgba(20,12,2,0.92), rgba(0,0,0,0.96))",
        border: "2px solid rgba(255,215,90,0.95)",
        boxShadow: `
          0 0 24px rgba(255,215,0,0.62),
          0 0 62px rgba(255,190,0,0.28),
          inset 0 0 28px rgba(255,215,0,0.12)
        `,
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 900,
          letterSpacing: "0.24em",
          color: "#f5c542",
          marginBottom: 18,
          textShadow: "0 0 12px rgba(245,197,66,0.85)",
        }}
      >
        ⚖ FORCED MEDICAL EXIT
      </div>

      <div
        style={{
          fontSize: 42,
          lineHeight: 0.95,
          fontWeight: 900,
          color: medicalEmergencySide === "hong" ? "#ff2a2a" : "#2f7cff",
          textShadow:
            medicalEmergencySide === "hong"
              ? "0 0 18px rgba(255,0,0,0.95)"
              : "0 0 18px rgba(47,124,255,0.95)",
        }}
      >
        {medicalEmergencySide === "hong" ? "HONG" : "CHONG"}
      </div>

      <div
        style={{
          fontSize: 31,
          lineHeight: 1,
          fontWeight: 900,
          marginTop: 8,
          color: "#ffffff",
          textShadow: "0 0 14px rgba(255,255,255,0.45)",
        }}
      >
        TIME EXPIRED
      </div>

      <div
        style={{
          width: "72%",
          height: 2,
          margin: "22px auto 18px",
          background:
            "linear-gradient(90deg, transparent, rgba(255,215,90,0.95), transparent)",
          boxShadow: "0 0 12px rgba(255,215,90,0.75)",
        }}
      />

      <div
        style={{
          fontSize: 18,
          fontWeight: 900,
          letterSpacing: "0.12em",
          color: "#fff7cc",
          lineHeight: 1.25,
        }}
      >
        REGULATION
        <br />
        DECISION REQUIRED
      </div>

      <div
        style={{
          marginTop: 18,
          fontSize: 13,
          lineHeight: 1.45,
          color: "rgba(255,255,255,0.72)",
          fontWeight: 800,
          letterSpacing: "0.08em",
        }}
      >
        INPUTS LOCKED
        <br />
        WAIT FOR PRESIDENT
      </div>
    </div>
  </div>
)}
        {/* HOME */}
<div
  style={{
    position: "absolute",
    top: 10,
    left: 16,
    display: "flex",
    justifyContent: "flex-start",
    zIndex: 10,
  }}
>
  <div
    style={{
      padding: "6px 18px",
      borderRadius: 999,
      border: "3px solid rgba(255, 3, 3, 0.38)",
      background: "rgba(0,0,0,0.35)",
      backdropFilter: "blur(6px)",
      fontWeight: 700,
      fontSize: 14,
      letterSpacing: 1,
      cursor: "pointer",
    }}
    {...pressFx}
  >
    HOME
  </div>
</div>
        {/* WATERMARK - CAPA 1 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "flex-start",
            paddingTop: 133,
            justifyContent: "center",
            pointerEvents: "auto",
            zIndex: 1,
          }}
        >
          <img
            src="/logoooo.png"
            alt="Hwarang"
            style={{
              width: "93%",
              maxWidth: 290,
              opacity: 0.2,
              filter: "grayscale(100%)",
            }}
          />
        </div>

        {/* CONTENIDO REAL - CAPA 2 */}
        <div
          style={{
            width: "100%",
            minHeight: "100dvh",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            padding: 16,
            boxSizing: "border-box",
            position: "relative",
            zIndex: 2,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 18,
              left: "39%",
              transform: "translateX(50%)",
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: 2,
              lineHeight: 1,
              zIndex: 5,
            }}
          >
            JUDGE {judgeId}
          </div>

          {/* TIME / STATUS */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 40,
            }}
          >
            <div style={statBox}>
              TIME
              <div style={statValue}>
  {Math.floor(time / 60)}:{String(time % 60).padStart(2, "0")}
</div>
            </div>

            <div
  key={`status-${judgeStatusLabel}`}
  style={{
    ...statBox,
    animation: "statusPulse 0.35s ease-out",
  }}
>
  STATUS
  <div style={statValue}>{judgeStatusLabel}</div>
</div>
          </div>

          {/* BANNERS */}
{(gpBannerText || mobileWarningText || meta?.phase === "break") && (
  <div
    style={{
      position: "absolute",
      top: 140,
      left: 16,
      right: 16,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      zIndex: 3,
    }}
  >
    {gpBannerText && (
      <div style={gpBanner}>
        {gpBannerText}
      </div>
    )}

    {mobileWarningText && (
      <div style={warnBanner}>
        {mobileWarningText}
      </div>
    )}

    {(meta?.phase === "break" || showNoDecisionBanner || showCallJudgesBanner) && (
  <div style={showCallJudgesBanner ? callJudgesBanner : decisionBanner}>
    {meta?.phase === "break"
      ? "BREAK · DO NOT OPERATE"
      : showCallJudgesBanner
      ? "JUDGES · SELECT WINNER"
      : "NO DECISION"}
  </div>
)}
  </div>
)}
          

          {/* NEON LINE - CAPA 2 */}
          <div
            style={{
              position: "absolute",
              left: "14%",
              right: "14%",
              top: 350,
              height: 3,
              borderRadius: 999,
              background: "linear-gradient(90deg, transparent, #ff0000, transparent)",
              boxShadow: "0 0 8px rgba(255,255,255,0.5)",
              opacity: 0.6,
              animation: "neonLinePulse 1.6s ease-in-out infinite",
              pointerEvents: "none",
              zIndex: 2,
            }}
          />

          {/* JOYSTICK */}
<div
  style={{
    marginTop: "auto",
    paddingBottom: 8,
    flexShrink: 0,
    position: "relative",
    zIndex: 4,
  }}
>
  {/* HUMO / BASE VISUAL */}
  <div
    style={{
      position: "absolute",
      left: -18,
      right: -18,
      top: -28,
      bottom: -18,
      background:
        "radial-gradient(circle at center, rgba(0, 0, 0, 0.93) 0%, rgba(0, 0, 0, 0.48) 38%, rgba(0, 0, 0, 0.12) 72%, transparent 100%)",
      filter: "blur(14px)",
      borderRadius: 34,
      pointerEvents: "none",
      zIndex: -1,
    }}
  />
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

    {/* HONG */}
    <div style={hongBox}>
      HONG

      <div style={score}>
        {isGPA ? (judge.gpDecision === "hong" ? "✓" : "—") : judge.hongPoints}
      </div>

      {isGPA ? (
        <div
          style={{ ...btn, height: 100, fontSize: 24 }}
          onClick={() => handleGPDecision("hong")}
          {...pressFx}
        >
          SELECT
        </div>
      ) : (
        <div style={grid}>
          {[1, 2, 3, 4].map((v, i) => (
            <div
              key={i}
              style={btn}
              onClick={() => {
  if (inputsLocked) return;
  handlePoint("hong", v);
}}
              {...pressFx}
            >
              +{v}
            </div>
          ))}
        </div>
      )}
    </div>

    {/* CHONG */}
    <div style={chongBox}>
      CHONG

      <div style={score}>
        {isGPA ? (judge.gpDecision === "chong" ? "✓" : "—") : judge.chongPoints}
      </div>

      {isGPA ? (
        <div
          style={{ ...btn, height: 100, fontSize: 24 }}
          onClick={() => {
  if (inputsLocked) return;
  handleGPDecision("chong");
}}
          {...pressFx}
        >
          SELECT
        </div>
      ) : (
        <div style={grid}>
          {[1, 2, 3, 4].map((v, i) => (
            <div
              key={i}
              style={btn}
              onClick={() => {
  if (inputsLocked) return;
  handlePoint("chong", v);
}}
              {...pressFx}
            >
              +{v}
            </div>
          ))}
        </div>
      )}
    </div>
  </div>

  <div style={{ marginTop: 14, display: "flex", justifyContent: "center" }}>
    <div style={undoBtn} onClick={handleUndo} {...pressFx}>
      UNDO
    </div>
  </div>
</div>
        </div>
      </div>
      
{showJudgeWinner && judgeWinner !== "draw" && (
  
  <div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      background: "rgba(0,0,0,0.92)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: 420,
        borderRadius: 24,
        marginTop: -50,
        border:
          judgeWinner === "hong"
            ? "4px solid #ff1a1a"
            : "4px solid #0602e0",
        background: "#050505",
        color: judgeWinner === "hong" ? "#ff1a1a" : "#0602e0",
        textAlign: "center",
        padding: "36px 20px",
        fontWeight: 900,
        boxShadow:
          judgeWinner === "hong"
            ? `
              0 0 14px rgba(255, 26, 26, 0.65),
              0 0 32px rgba(255, 26, 26, 0.35)
            `
            : `
              0 0 14px rgba(6, 2, 224, 0.65),
              0 0 32px rgba(6, 2, 224, 0.35)
            `,
        animation:
          judgeWinner === "hong"
            ? "winnerEnter 0.45s ease-out, winnerPulsePro 1.6s ease-in-out 0.6s infinite, winnerBorderPulseRed 1.8s ease-in-out infinite"
            : "winnerEnter 0.45s ease-out, winnerPulsePro 1.6s ease-in-out 0.6s infinite, winnerBorderPulseBlue 1.8s ease-in-out infinite",
      }}
    >
      <div
        style={{
          fontSize: 16,
          letterSpacing: "0.28em",
          marginBottom: 16,
          color: "rgba(255,255,255,0.75)",
          fontWeight: 800,
        }}
      >
        HWARANG SCORING UNIVERSE<span style={{ fontSize: 10, verticalAlign: "super" }}>™</span>
      </div>

      <div
        style={{
          fontSize: 58,
          lineHeight: 0.95,
          textShadow: "none",
          letterSpacing: "0.04em",
        }}
      >
        {judgeWinner === "hong" ? "HONG" : "CHONG"}
      </div>

      <div
        style={{
          fontSize: 44,
          lineHeight: 0.95,
          textShadow: "none",
          letterSpacing: "0.06em",
          marginTop: 6,
        }}
      >
        WINNER
      </div>

      <div
        style={{
          fontSize: 12,
          marginTop: 18,
          color: "rgba(255,255,255,0.5)",
          letterSpacing: 2,
          fontWeight: 800,
        }}
      >
        {isGoldenPointDraw ? "NO DECISION" : "WWW.HWARANGSCORING.ORG"}
      </div>
    </div>
  </div>
)}
{((showJudgeWinner && judgeWinner === "draw" && !meta?.goldenPoint?.active) || showGoldenPointFinalDraw) && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      background: "rgba(0,0,0,0.92)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: 420,
        borderRadius: 24,
        marginTop: -36,
        border: "4px solid #fff200",
        background: "#050505",
        color: "#fff200",
        textAlign: "center",
        padding: "36px 20px",
        fontWeight: 900,
        boxShadow: `
          0 0 18px rgba(255, 242, 0, 0.65),
          0 0 42px rgba(255, 242, 0, 0.35)
        `,
        animation:
          "winnerEnter 0.45s ease-out, winnerPulsePro 1.6s ease-in-out 0.6s infinite, winnerBorderPulseYellow 1.8s ease-in-out infinite",
      }}
    >
      <div
        style={{
          fontSize: 16,
          letterSpacing: "0.28em",
          marginBottom: 16,
          color: "rgba(255,255,255,0.75)",
          fontWeight: 800,
        }}
      >
        {meta?.goldenPoint?.active
  ? "GOLDEN POINT"
  : <>
      HWARANG SCORING UNIVERSE
      <span style={{ fontSize: 10, verticalAlign: "super" }}>™</span>
    </>
}
      </div>

      <div style={{ fontSize: 56, lineHeight: 1 }}>
        DRAW
      </div>

      

      <div
        style={{
          fontSize: 12,
          marginTop: 18,
          color: "rgba(255,255,255,0.5)",
          letterSpacing: 2,
          fontWeight: 800,
        }}
      >
        {meta?.goldenPoint?.active ? "NO DECISION" : "WWW.HWARANGSCORING.ORG"}
      </div>
    </div>
  </div>
)}
    </div>
  );
}

/* estilos auxiliares */
const statBox = {
  background: "rgba(0,0,0,0.42)",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: 14,
  padding: "10px 8px",
  textAlign: "center",
  fontWeight: 800,
};

const statValue = {
  marginTop: 5,
  fontSize: 22,
  fontWeight: 900,
};

const gpBanner = {
  padding: 10,
  borderRadius: 14,
  background: "linear-gradient(90deg,#7c3aedbb,#4c1d95)",
  textAlign: "center",
  fontWeight: 900,
};

const warnBanner = {
  padding: 12,
  borderRadius: 14,
  background: "linear-gradient(90deg,#b91c1ca4,#7f1d1d)",
  textAlign: "center",
  fontWeight: 900,
};

const callJudgesBanner = {
  padding: 10,
  borderRadius: 14,
  border: "2px solid #00e5ff",
  background: "#001a1f",
  color: "#00e5ff",
  textAlign: "center",
  fontWeight: 900,
  letterSpacing: 2,
  boxShadow: "0 0 18px rgba(0,229,255,0.45)",
  animation: "callPulse 0.9s ease-in-out infinite",
};

const decisionBanner = {
  padding: 10,
  borderRadius: 14,
  border: "2px solid #FFD700",
  background: "#000000",
  color: "#FFD700",
  textAlign: "center",
  fontWeight: 900,
  letterSpacing: 2,
  boxShadow: "0 0 18px rgba(255,215,0,0.45)",
  animation: "decisionPulse 1.2s ease-in-out infinite",
};

const hongBox = {
  background: "linear-gradient(180deg,#dc2626,#7f1d1d)",
  borderRadius: 16,
  padding: 10,
  textAlign: "center",
  fontWeight: 900,
};

const chongBox = {
  background: "linear-gradient(180deg,#3b82f6,#1e3a8a)",
  borderRadius: 16,
  padding: 10,
  textAlign: "center",
  fontWeight: 900,
};

const score = {
  margin: "8px 0",
  fontSize: 36,
  fontWeight: 800,
};

const grid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 4,
};

const undoBtn = {
  width: "70%",
  padding: "12px 0",
  borderRadius: 999,
  border: "4px solid rgba(255,5,5,0.44)",
  background: "rgba(0,0,0,0.45)",
  textAlign: "center",
  fontWeight: 900,
};