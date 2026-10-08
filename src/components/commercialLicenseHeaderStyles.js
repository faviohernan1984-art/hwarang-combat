export const commercialHeaderStyles = {
  navbar: {
    height: 88,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 52px",
    borderBottom: "1px solid rgba(148,163,184,0.16)",
    background: "rgba(1, 1, 29, 0.82)",
    backdropFilter: "blur(14px)",
  },
  brand: { display: "flex", alignItems: "center", gap: 14 },
  logoOrb: {
  position: "relative",
  width: 54,
  height: 54,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
},

logoOrbRing: {
  position: "absolute",
  inset: 0,
  borderRadius: "50%",
  border: "3px solid rgba(245,197,66,0.22)",
  borderTop: "3px solid #ff0000",
  boxShadow: "0 0 28px rgb(255,253,253)",
  animation: "licenseOrbSpin 2.8s linear infinite",
},

logoOrbCore: {
  position: "relative",
  color: "#ff0000",
  fontSize: 28,
  fontWeight: 1000,
  textShadow: `
    0 0 12px rgba(245,197,66,1),
    0 0 28px rgba(245,197,66,0.75)
  `,
  zIndex: 2,
},

  brandTitle: {
    fontSize: 24,
    fontWeight: 900,
    letterSpacing: 5,
    color: "#ffffff",
  },
  brandSub: {
  fontSize: 9,
  letterSpacing: 2.2,
  color: "#d6dee9",
},
  navLinks: { display: "flex", gap: 36, fontSize: 14, fontWeight: 600 },
  activeNav: {
    color: "#60a5fa",
    borderBottom: "3px solid #3b82f6",
    paddingBottom: 14,
    minWidth: 72,
textAlign: "center",
display: "inline-block",
  },
  navActions: { display: "flex", gap: 16 },
  langBtn: {
    background: "rgba(6, 3, 37, 0.8)",
    color: "white",
    border: "1px solid rgba(148,163,184,0.25)",
    borderRadius: 8,
    padding: "10px 18px",
    fontWeight: 800,
  },
  loginBtn: {
    background: "linear-gradient(90deg,#2563eb,#0284c7)",
    color: "white",
    border: "none",
    borderRadius: 8,
    padding: "5px 10px",
    fontWeight: 900,
  },
};
