export default function JudgeMobileNext({ meta, judges, writeJudge, judgeId, roomId }) {
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

  const pressFx = {
    onMouseDown: (e) => (e.currentTarget.style.transform = "scale(0.95)"),
    onMouseUp: (e) => (e.currentTarget.style.transform = "scale(1)"),
    onMouseLeave: (e) => (e.currentTarget.style.transform = "scale(1)"),
    onTouchStart: (e) => (e.currentTarget.style.transform = "scale(0.95)"),
    onTouchEnd: (e) => (e.currentTarget.style.transform = "scale(1)"),
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        backgroundImage: `
          linear-gradient(rgba(0,0,0,0.15), rgba(0,0,0,0.35)),
          url('/backgrounds/judge-red.jpg')
        `,
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
        color: "white",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <style>
        {`
          @keyframes neonLinePulse {
            0% { opacity: 0.35; transform: scaleX(0.92); }
            50% { opacity: 0.75; transform: scaleX(1); }
            100% { opacity: 0.35; transform: scaleX(0.92); }
          }
        `}
      </style>

      {/* HOME */}
      <div
        style={{
          position: "fixed",
          top: 10,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          zIndex: 3,
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

      {/* CONTENEDOR GENERAL */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          minHeight: "100dvh",
          position: "relative",
        }}
      >
        {/* WATERMARK - CAPA 1 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "flex-start",
            paddingTop: 170,
            justifyContent: "center",
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          <img
            src="/logoooo.png"
            alt="Hwarang"
            style={{
              width: "93%",
              maxWidth: 330,
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
          <div style={{ textAlign: "center", fontSize: 28, fontWeight: 900, marginTop: 42 }}>
            JUDGE
          </div>

          {/* TIME / STATUS */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={statBox}>TIME<div style={statValue}>02:00</div></div>
            <div style={statBox}>STATUS<div style={statValue}>FIGHT</div></div>
          </div>

          {/* BANNERS */}
          <div style={{ flex: 1, marginTop: -10, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={gpBanner}>GOLDEN POINT A</div>
            <div style={warnBanner}>HONG WARNING: Next grave foul = disqualification</div>
            <div style={decisionBanner}>NO DECISION</div>
          </div>

          {/* NEON LINE - CAPA 2 */}
          <div
            style={{
              position: "absolute",
              left: "14%",
              right: "14%",
              top: 417,
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
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={hongBox}>
                HONG
                <div style={score}>0</div>
                <div style={grid}>{["+1", "+2", "+3", "+4"].map((t, i) => <div key={i} style={btn} {...pressFx}>{t}</div>)}</div>
              </div>

              <div style={chongBox}>
                CHONG
                <div style={score}>0</div>
                <div style={grid}>{["+1", "+2", "+3", "+4"].map((t, i) => <div key={i} style={btn} {...pressFx}>{t}</div>)}</div>
              </div>
            </div>

            <div style={{ marginTop: 14, display: "flex", justifyContent: "center" }}>
              <div style={undoBtn} {...pressFx}>UNDO</div>
            </div>
          </div>
        </div>
      </div>
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

const decisionBanner = {
  padding: 10,
  borderRadius: 14,
  border: "1px solid rgba(255, 3, 3, 0.38)",
  background: "rgba(255,255,255,0.15)",
  textAlign: "center",
  fontWeight: 800,
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