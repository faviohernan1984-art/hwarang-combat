import React from "react";

export default function LicenseComingSoon() {
  return (
    <div style={styles.page}>
      <div style={styles.glowBlue} />
      <div style={styles.glowGold} />

      <div style={styles.card}>
        <div style={styles.logo}>H</div>

        <div style={styles.kicker}>
          HWARANG SCORING UNIVERSE™
        </div>

        <h1 style={styles.title}>
          PROFESSIONAL LICENSE ACCESS
        </h1>

        <div style={styles.line} />

        <p style={styles.text}>
          Online checkout is currently being prepared.
        </p>

        <p style={styles.subtext}>
          For pricing, activation or event access,
          please contact the developer directly.
        </p>

        <div style={styles.actions}>
          <button
            style={styles.primaryBtn}
            onClick={() =>
              window.open(
                "https://wa.me/5493492611568?text=Hello%20Hwarang%20Scoring%20Universe,%20I%20would%20like%20information%20about%20professional%20licenses.",
                "_blank"
              )
            }
          >
            CONTACT DEVELOPER
          </button>

          <button
  style={styles.secondaryBtn}
  onClick={() => {
    navigator.clipboard.writeText(
      "faviohernan1984@gmail.com"
    );

    alert("Email copied");
  }}
>
  COPY EMAIL
</button>
        </div>

        <div style={styles.contact}>
          WhatsApp: +54 9 3492 61-1568
          <br />
          faviohernan1984@gmail.com
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#020202",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    fontFamily: "Arial, sans-serif",
    padding: 24,
  },

  glowBlue: {
    position: "absolute",
    width: 500,
    height: 500,
    borderRadius: "50%",
    background: "rgba(37,99,235,0.22)",
    filter: "blur(90px)",
    top: -180,
    left: -180,
  },

  glowGold: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: "50%",
    background: "rgba(245,197,66,0.18)",
    filter: "blur(90px)",
    bottom: -140,
    right: -120,
  },

  card: {
    width: "min(640px, 90vw)",
    borderRadius: 28,
    padding: "30px 20px",
    textAlign: "center",
    position: "relative",
    zIndex: 2,
    border: "1px solid rgba(245,197,66,0.28)",
    background:
      "linear-gradient(180deg, rgba(8,8,8,0.96), rgba(0,0,0,0.98))",
    boxShadow:
      "0 0 50px rgba(245,197,66,0.14), inset 0 0 60px rgba(37,99,235,0.06)",
  },

  logo: {
    width: 82,
    height: 82,
    borderRadius: 20,
    margin: "0 auto 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 38,
    fontWeight: 900,
    color: "#f5c542",
    border: "1px solid rgba(245,197,66,0.45)",
    background:
      "linear-gradient(180deg, rgba(30,30,30,0.95), rgba(0,0,0,1))",
    boxShadow: "0 0 26px rgba(245,197,66,0.22)",
  },

  kicker: {
    fontSize: 12,
    letterSpacing: "0.35em",
    color: "#f5c542",
    marginBottom: 18,
    fontWeight: 700,
  },

  title: {
    margin: 0,
    fontSize: "clamp(32px, 5vw, 58px)",
    lineHeight: 1,
    fontWeight: 900,
    color: "#ffffff",
textShadow: "0 0 24px rgba(37,99,235,0.25)",
  },

  line: {
    width: "min(320px, 70%)",
    height: 1,
    margin: "26px auto",
    background:
      "linear-gradient(90deg, transparent, rgba(245,197,66,1), transparent)",
  },

  text: {
    fontSize: "clamp(18px, 2vw, 26px)",
    fontWeight: 700,
    marginBottom: 12,
  },

  subtext: {
    maxWidth: 520,
    margin: "0 auto 32px",
    lineHeight: 1.6,
    color: "#cbd5e1",
  },

  actions: {
    display: "flex",
    justifyContent: "center",
    gap: 14,
    flexWrap: "wrap",
    marginBottom: 26,
  },

  primaryBtn: {
    padding: "16px 26px",
    borderRadius: 14,
    border: "1px solid rgba(245,197,66,0.7)",
    background:
      "linear-gradient(180deg,#b88916,#5c3b04)",
    color: "#fff",
    fontWeight: 900,
    letterSpacing: "0.05em",
    cursor: "pointer",
    boxShadow: "0 0 24px rgba(245,197,66,0.25)",
  },

  secondaryBtn: {
    padding: "16px 26px",
    borderRadius: 14,
    border: "1px solid rgba(59,130,246,0.45)",
    background: "#111827",
    color: "#fff",
    fontWeight: 900,
    letterSpacing: "0.05em",
    cursor: "pointer",
    boxShadow: "0 0 20px rgba(37,99,235,0.18)",
  },

  contact: {
    fontSize: 14,
    color: "#cbd5e1",
    lineHeight: 1.8,
  },
};