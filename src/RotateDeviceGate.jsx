export default function RotateDeviceGate({
  title = "Rotate Device",
  message = "Turn your phone vertically to continue.",
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        background:
          "radial-gradient(circle at center, rgba(245,197,66,0.10), #000 58%)",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 22,
        textAlign: "center",
        fontFamily: "Orbitron, Arial, sans-serif",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes rotateGateSpin {
          0% {
            transform: rotate(0deg);
          }

          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>

      <div
        style={{
          position: "absolute",
          inset: 18,
          border: "1px solid rgba(245,197,66,0.45)",
          borderRadius: 24,
          boxShadow: "0 0 28px rgba(245,197,66,0.18)",
        }}
      />

      <div
        style={{
          position: "relative",
          width: 70,
          height: 70,
          aspectRatio: "1 / 1",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "3px solid rgba(245,197,66,0.22)",
            borderTop: "3px solid #ff0000",
            boxShadow: "0 0 28px rgb(255,253,253)",
            animation: "rotateGateSpin 2.8s linear infinite",
          }}
        />

        <div
          style={{
            color: "#ff0000",
            fontSize: 33,
            fontWeight: 1000,
            textShadow: `
              0 0 12px rgba(245,197,66,1),
              0 0 28px rgba(245,197,66,0.75)
            `,
          }}
        >
          H
        </div>
      </div>

      <div
        style={{
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: "0.34em",
          color: "#f5c542",
        }}
      >
        HWARANG SCORING UNIVERSE™
      </div>

      <div
        style={{
          fontSize: 20,
          fontWeight: 1000,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          textShadow: "0 0 18px rgba(255,255,255,0.3)",
        }}
      >
        {title}
      </div>

      <div
        style={{
          maxWidth: 320,
          fontSize: 14,
          lineHeight: 1.45,
          color: "rgba(255,255,255,0.72)",
          fontWeight: 700,
          letterSpacing: "0.04em",
        }}
      >
        {message}
      </div>
    </div>
  );
}