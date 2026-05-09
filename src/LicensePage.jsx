import React from "react";




export default function LicensePage() {
  return (
    <div style={styles.page}>
      <header style={styles.navbar}>
        <div style={styles.brand}>
          <div style={styles.logoBox}>H</div>
          <div>
            <div style={styles.brandTitle}>HWARANG</div>
            <div style={styles.brandSub}>SCORING UNIVERSE™</div>
          </div>
        </div>

        <nav style={styles.navLinks}>
          <span>HOME</span>
          <span>FEATURES</span>
          <span>DEMO</span>
          <span>PRICING</span>
          <span style={styles.activeNav}>LICENSE</span>
        </nav>

        <div style={styles.navActions}>
          <button style={styles.langBtn}>ES⌄</button>
          <button style={styles.loginBtn}>SIGN IN</button>
        </div>
      </header>

      <main style={styles.main}>
        <section style={styles.leftPanel}>
        <div style={styles.leftContent}>
          <div style={styles.hero}>
            <div style={styles.heroGlow} />
            <div style={styles.kicker}>GET YOUR PROFESSIONAL LICENSE</div>
            <h1 style={styles.title}>
              HWARANG SCORING <span style={styles.blueText}>
  UNIVERSE
  <span style={styles.tm}>™</span>
</span>
            </h1>
            <p style={styles.subtitle}>
              The professional real-time scoring system for ITF Taekwon-Do competitions.
              Reliable, accurate and designed for tournaments of all levels.
            </p>
          </div>

          <div style={styles.features}>
            <Feature icon={<span style={styles.svgIcon}>♢</span>} title="OFFICIAL STANDARD" text="Professional system built to ITF standards" />
<Feature icon={<span style={styles.svgIcon}>ϟ</span>} title="REAL-TIME SYSTEM" text="Instant synchronization across all devices" />
<Feature icon={<span style={styles.svgIcon}>☁</span>} title="CLOUD PLATFORM" text="Your data always secure and accessible" />
<Feature icon={<span style={styles.svgIcon}>◔</span>} title="PREMIUM SUPPORT" text="Dedicated technical assistance" />
          </div>

          <div style={styles.sectionTitle}>CHOOSE YOUR LICENSE PLAN</div>

          <div style={styles.cards}>
            <PlanCard
            tone="cyan"
            title="DEMO"
            desc="Ideal for testing and evaluation"
            price="FREE"
            items={[
            "20-minute demo session",
            "Maximum 2 rounds",
            "Basic scoring features"
            ]}
            button="TRY DEMO"
            variant="outline"
            buttonOffset={25}
            />

            <PlanCard
              tone="blue"
              title="SINGLE EVENT"
              desc="Designed for official tournaments and events"
              price="USD 49"
              small="per event"
              items={["Unlimited match duration", "Unlimited rounds", "Full PRO feature access", "Technical support included"]}
              button="BUY NOW"
              featured
            />

            <PlanCard
              tone="gold"
              title="CLUB / ANNUAL"
              desc="For academies and organizations"
              price="USD 199"
              small="per year"
              items={["Unlimited tournaments", "Full PRO feature access", "Statistics dashboard", "Priority support"]}
              button="SELECT PLAN"
              variant="outline"
            />
          </div>

          <div style={styles.note}>
            All licenses include continuous updates and platform improvements.
          </div>
          </div>

<div style={styles.statsStrip}>
  <div style={styles.statItem}>
  <span style={styles.bottomMonoIcon}>◉</span>
  TRUSTED BY<br />
  PROFESSIONAL ORGANIZATIONS WORLDWIDE
</div>

<div style={styles.statItem}>
  <span style={styles.bottomMonoIcon}>◈</span>
  OFFICIAL SYSTEM USED IN<br />
  NATIONAL & INTERNATIONAL EVENTS
</div>

<div style={styles.statItem}>
  <span style={styles.bottomMonoIcon}>⬡</span>
  ENGINEERED BY EXPERTS IN<br />
  ITF TAEKWONDO & COMPETITIVE TECHNOLOGY
</div>
</div>

</section>

        <aside style={styles.checkout}>
          <h2 style={styles.checkoutTitle}>YOUR ORDER</h2>

          <div style={styles.selectedBox}>
            <div style={styles.trophyBox}>🏆</div>
            <div style={{ flex: 1 }}>
              <div style={styles.muted}>Selected license</div>
              <div style={styles.selectedTitle}>SINGLE EVENT</div>
              <div style={styles.muted}>Single-event license</div>
            </div>
            <div style={styles.priceSide}>USD 49</div>
          </div>

          <div style={styles.detailList}>
            <Row label="Validity" value="1 event" />
            <Row label="Duration" value="Unlimited" />
            <Row label="Devices" value="Unlimited" />
            <Row label="Storage" value="Included" />
          </div>

          <div style={styles.totalRow}>
            <span>TOTAL</span>
            <strong>USD 49</strong>
          </div>

          <button style={styles.buyBtn}>🔒 BUY NOW</button>

          <div style={styles.secure}>🛡 100% secure payment</div>

          <div style={styles.payments}>
            <div style={styles.payTitle}>PAYMENT METHODS</div>
            <div style={styles.payLogos}>
              <span>VISA</span>
              <span>MC</span>
              <span>AMEX</span>
              <span>PayPal</span>
              <span>MP</span>
            </div>
            <p>Your license is automatically activated after payment confirmation.</p>
          </div>

          <div style={styles.howBox}>
            <h3>HOW IT WORKS?</h3>
            <ol>
              <li>Complete your purchase securely</li>
              <li>Your license will be delivered instantly by email</li>
              <li>Enter your license code in the platform</li>
              <li>Your system will be fully activated</li>
            </ol>
          </div>
        </aside>
      </main>
    </div>
  );
}

function Feature({ icon, title, text }) {
  
  return (
    <div style={styles.feature}>
      <div style={styles.featureIcon}>{icon}</div>
      <strong>{title}</strong>
      <p style={styles.featureText}>{text}</p>
    </div>
  );
}

function PlanCard({ title, desc, price, small, items, button, featured, variant, tone = "blue", buttonOffset = 0 }) {
  const toneStyle =
    tone === "cyan"
      ? styles.demoCard
      : tone === "gold"
      ? styles.clubCard
      : styles.singleCard;

  const iconStyle =
    tone === "cyan"
      ? styles.iconCyan
      : tone === "gold"
      ? styles.iconGold
      : styles.iconBlue;

  const priceStyle =
    tone === "cyan"
      ? styles.priceCyan
      : tone === "gold"
      ? styles.priceGold
      : styles.priceBlue;

  const checkStyle =
    tone === "cyan"
      ? styles.checkCyan
      : tone === "gold"
      ? styles.checkGold
      : styles.checkBlue;

  return (
    <div style={{ ...styles.planCard, ...toneStyle }}>
      {featured && <div style={styles.badge}>MOST POPULAR</div>}

      <div style={{ ...styles.planIcon, ...iconStyle }}>
        {tone === "cyan" ? "◇" : tone === "gold" ? "◔" : "ϟ"}
      </div>

      <h3 style={styles.planTitle}>{title}</h3>
      <p style={styles.planDesc}>{desc}</p>

      <div style={{ ...styles.planPrice, ...priceStyle }}>{price}</div>
      {small && <div style={styles.planSmall}>{small}</div>}

      <ul style={styles.planList}>
        {items.map((item) => (
          <li
  key={item}
  style={{
    width: 220,
    margin: "0 auto 6px",
    display: "grid",
    gridTemplateColumns: "14px 1fr",
    columnGap: 8,
    alignItems: "start",
    textAlign: "left",
  }}
>
            <span style={checkStyle}>✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <button
        style={{
          ...(variant === "outline" ? styles.outlineBtn : styles.primaryBtn),
          ...(tone === "cyan" ? styles.cyanBtn : {}),
          ...(tone === "gold" ? styles.goldBtn : {}),
          marginTop: buttonOffset,
        }}
      >
        {button}
      </button>
            <div
        style={{
          ...styles.floorGlow,
          ...(tone === "cyan"
            ? styles.floorGlowCyan
            : tone === "gold"
            ? styles.floorGlowGold
            : styles.floorGlowBlue),
        }}
      />

            <div
        style={{
          ...styles.floorCore,
          ...(tone === "cyan"
            ? styles.floorGlowCyan
            : tone === "gold"
            ? styles.floorGlowGold
            : styles.floorGlowBlue),
        }}
      />
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={styles.row}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 20% 20%, rgba(37,99,235,0.25), transparent 30%), radial-gradient(circle at 70% 30%, rgba(14,165,233,0.22), transparent 26%), linear-gradient(135deg, #020617 0%, #07111f 48%, #020617 100%)",
    color: "#f8fafc",
    fontFamily: "Arial, sans-serif",
  },
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
  logoBox: {
    width: 44,
    height: 44,
    border: "2px solid #f6c36a",
    color: "#f6c36a",
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    boxShadow: "0 0 20px rgba(246,195,106,0.18)",
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
  navLinks: { display: "flex", gap: 36, fontSize: 14, fontWeight: 800 },
  activeNav: {
    color: "#60a5fa",
    borderBottom: "3px solid #3b82f6",
    paddingBottom: 14,
  },
  navActions: { display: "flex", gap: 16 },
  langBtn: {
    background: "rgba(6, 3, 37, 0.8)",
    color: "white",
    border: "1px solid rgba(148,163,184,0.25)",
    borderRadius: 8,
    padding: "12px 22px",
    fontWeight: 800,
  },
  loginBtn: {
    background: "linear-gradient(90deg,#2563eb,#0284c7)",
    color: "white",
    border: "none",
    borderRadius: 8,
    padding: "13px 24px",
    fontWeight: 900,
  },
  main: {
    background:
    "linear-gradient(180deg, #020617 0%, #000000 100%)",
    border: "1px solid rgba(246,195,106,0.28)",
    boxShadow:
    "inset 0 0 120px rgba(0,0,0,0.85)",
    display: "grid",
    gridTemplateColumns: "70% 30%",
    minHeight: "calc(100vh - 88px)",
  },
  leftPanel: {
    paddingTop: 24,
    left: 60,
    top: 12,
    position: "relative",
    width: "100%",
    
    overflow: "visible",
    maxHeight: 840,
    borderRadius: 18,
    
    padding: "20px 40px 18px 58px",
    leftPanel: {
  background:
    "radial-gradient(circle at top center, rgba(37,99,235,0.16) 0%, rgba(2,6,23,0.96) 42%, rgba(0,0,0,1) 100%)",
  boxShadow:
    "inset 0 0 140px rgba(37,99,235,0.08), inset 0 -80px 120px rgba(0,0,0,0.92)",
}
  },
  hero: {
  textAlign: "center",
  maxWidth: 900,
  margin: "0 auto",
  position: "relative",
},
heroGlow: {
  position: "absolute",
  width: 560,
  height: 220,
  left: "50%",
  top: 10,
  transform: "translateX(-90%)",
  transform: "translateY(90%)",
  background:
    "radial-gradient(circle, rgba(59,130,246,0.22) 0%, rgba(59,130,246,0.12) 36%, rgba(0,0,0,0) 74%)",
  filter: "blur(42px)",
  zIndex: 0,
  pointerEvents: "none",
},
  kicker: {
    color: "#c7d2e0",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 2.5,
    marginBottom: 9,
    textTransform: "uppercase",
  },
  title: {
    position: "relative",
zIndex: 2,
    fontSize: 42,
    margin: 0,
    letterSpacing: 1,
    fontWeight: 640,
    color: "#e5e7eb",
    textShadow:
  "0 3px 8px rgba(0,0,0,0.75)",
  },
  blueText: { color: "#3b82f6" },
  subtitle: {
    maxWidth: 760,
    margin: "14px auto 0",
    fontSize: 20,
    lineHeight: 1.45,
    color: "#e2e8f0",
    
  },
  tm: {
  fontSize: 16,
  verticalAlign: "top",
  marginLeft: 2,
  position: "relative",
top: -7,
},
  features: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 28,
    marginTop: 22,
  },
  feature: {
    textAlign: "center",
  },
  featureIcon: {
    width: 58,
    height: 58,
    margin: "0 auto 14px",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: "rgba(15,23,42,0.78)",
    border: "1px solid rgba(59,130,246,0.28)",
    boxShadow: "0 0 30px rgba(59,130,246,0.16)",
    fontSize: 24,
  },
  svgIcon: {
  color: "#4da3ff",
  fontSize: 25,
  fontWeight: 900,
  textShadow:
    "0 0 8px rgba(77,163,255,1), 0 0 20px rgba(0,102,255,0.65)",
},
  sectionTitle: {
    marginLeft: 10,
    marginTop: 18,
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: 2,
    color: "#cbd5e1",
    textTransform: "uppercase",
    fontFamily: "Arial, sans-serif",
  },
  featureText: {
    fontSize: 12,
    color: "#cbd5e1",
    lineHeight: 1.45,
    marginTop: 8,
  },
  cards: {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 14,
  paddingBottom: 50,
  overflow: "visible",
  alignItems: "flex-start",
  marginTop: 10,
  padding: "14px",
  borderRadius: 18,

  background:
    "linear-gradient(180deg, rgba(0,0,0,0.94) 0%, rgba(2,6,23,0.98) 100%)",

  border: "1px solid rgba(59,130,246,0.16)",
boxShadow:
    "0 0 60px rgba(0,0,0,0.75), inset 0 0 30px rgba(255,255,255,0.02)",

  
},
  planCard: {
  position: "relative",
  minHeight: 250,
  border: "1px solid rgba(148,163,184,0.20)",
  borderRadius: 8,
  padding: "18px 16px 14px",
  transform: "translateY(-6px)",
  overflow: "visible",
  background: "rgba(15,23,42,0.54)",
  boxShadow:
  "0 26px 55px rgba(0,0,0,0.55), 0 18px 38px rgba(37,99,235,0.16), inset 0 0 22px rgba(255,255,255,0.03)",
  textAlign: "center",
},
  featuredCard: {
    border: "1px solid rgba(59,130,246,0.9)",
    boxShadow: "0 0 34px rgba(59,130,246,0.35)",
  },
  badge: {
    position: "absolute",
    top: -14,
    left: "50%",
    transform: "translateX(-50%)",
    background: "linear-gradient(90deg,#2563eb,#3b82f6)",
    borderRadius: 7,
    padding: "7px 22px",
    fontSize: 12,
    fontWeight: 900,
  },
  planDesc: {
  color: "#cbd5e1",
  minHeight: 34,
  fontSize: 14,
  lineHeight: 1.35,
},
  planSmall: {
  color: "#94a3b8",
  marginBottom: 8,
  fontSize: 13,
},
planList: {
  textAlign: "justify",
  lineHeight: 1.48,
  color: "#e2e8f0",
  listStyle: "none",
  padding: 0,
  minHeight: 78,
  fontSize: 13,
},
  primaryBtn: {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 7,
  border: "none",
  background: "linear-gradient(90deg,#2563eb,#1d4ed8)",
  color: "white",
  fontWeight: 900,
},
  outlineBtn: {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 7,
  border: "1px solid rgba(59,130,246,0.75)",
  background: "rgba(2,6,23,0.24)",
  color: "#60a5fa",
  fontWeight: 900,
},
  note: { textAlign: "center", color: "#cbd5e1", marginTop: 18 },
  checkout: {
    width: 500,
    
    flexShrink: 0,
    zIndex: 5,
    position: "absolute",
    right: 33,
    top: 100,
    
    borderRadius: 18,
    overflow: "hidden",
    transform: "scale(0.84)",
    transformOrigin: "top center",
    borderLeft: "1px solid rgba(59,130,246,0.14)",
    padding: "18px 24px",
    background:
  "linear-gradient(180deg, rgba(26, 40, 73, 0.96) 0%, rgba(5, 13, 51, 0.98) 100%)",
    boxShadow:
      "-25px 0 60px rgba(0,0,0,0.42), inset 1px 0 rgba(59,130,246,0.06)",
  },
  checkoutTitle: {
  fontSize: 18,
  marginBottom: 12,
},
  selectedBox: {
    display: "flex",
    alignItems: "center",
    gap: 18,
    padding: "0px 0",
    borderTop: "1px solid rgba(148,163,184,0.22)",
    borderBottom: "1px solid rgba(148,163,184,0.22)",
  },
  trophyBox: {
    width: 74,
    height: 74,
    borderRadius: 8,
    border: "1px solid rgba(59,130,246,0.58)",
    display: "grid",
    placeItems: "center",
    fontSize: 30,
    background: "rgba(30,64,175,0.22)",
  },
  muted: { color: "#94a3b8", fontSize: 13 },
  selectedTitle: { fontWeight: 900, margin: "9px 0", fontSize: 18 },
  priceSide: { fontWeight: 900, fontSize: 20 },
  detailList: {
    padding: "5px 0",
    borderBottom: "1px solid rgba(148,163,184,0.22)",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    color: "#cbd5e1",
    padding: "9px 0",
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 24,
    fontWeight: 900,
    padding: "14px 0",
  },
  buyBtn: {
    width: "100%",
    padding: "17px",
    borderRadius: 7,
    border: "none",
    background: "linear-gradient(90deg,#2563eb,#2563eb,#1d4ed8)",
    color: "white",
    fontSize: 16,
    fontWeight: 900,
  },
  secure: { textAlign: "center", marginTop: 18, color: "#cbd5e1" },
  payments: {
    marginTop: 14,
    paddingTop: 12,
    borderTop: "1px solid rgba(148,163,184,0.22)",
    textAlign: "center",
    color: "#cbd5e1",
  },
  payTitle: { fontWeight: 800, color: "#cbd5e1", marginBottom: 14 },
  payLogos: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    fontWeight: 900,
    color: "#dbeafe",
  },
  howBox: {
    marginTop: 24,
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 8,
    padding: "18px",
    color: "#e2e8f0",
    lineHeight: 1.8,
  },
  leftContent: {  
  transform: "scale(0.88)",
transformOrigin: "top center",
  position: "relative",
  left: -10,
  top: -20,
},
demoCard: {
  background:
    "linear-gradient(180deg, rgba(0,28,42,0.98) 0%, rgba(0,6,14,1) 100%)",

  border: "1px solid rgba(0,238,255,1)",

  boxShadow:
    "0 0 1px rgba(0,238,255,1), 0 0 1px rgba(0,238,255,1), 0 0 3px rgba(0,170,255,0.65), 0 0 3px rgba(0,170,255,0.22), inset 0 0 5px rgba(0,238,255,0.10)",
},

singleCard: {
  background:
    "linear-gradient(180deg, rgba(0,18,120,0.98) 0%, rgba(0,6,38,1) 100%)",

  border: "2px solid rgba(45,110,255,1)",

  boxShadow:
    "0 0 1px rgb(0, 6, 19), 0 0 9px rgb(5, 66, 197), 0 0 3px rgba(0,68,255,0.88), 0 0 2px rgba(8, 65, 221, 0.34), inset 0 0 2px rgba(3, 56, 172, 0.14)",
},

clubCard: {
  background:
    "linear-gradient(180deg, rgba(70,46,0,0.98) 0%, rgba(12,8,2,1) 100%)",

  border: "1px solid rgba(255,196,56,1)",

  boxShadow:
    "0 0 1px rgba(255,196,56,1), 0 0 1px rgba(255,196,56,0.95), 0 0 2px rgba(255,174,0,0.65), 0 0 0px rgba(255,174,0,0.22), inset 0 0 58px rgba(255,196,56,0.10)",
},

planIcon: {
  width: 74,
  height: 74,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 28px",
  fontSize: 38,
  fontWeight: 700,
},

iconCyan: {
  color: "#00eeff",
  border: "1px solid rgba(0,238,255,0.95)",
  boxShadow:
    "0 0 10px rgba(0,238,255,1), 0 0 26px rgba(0,170,255,0.55)",
},

iconBlue: {
  color: "#4da3ff",
  border: "1px solid rgba(77,163,255,1)",

  boxShadow:
    "0 0 8px rgba(77,163,255,1), 0 0 18px rgba(0,102,255,1), 0 0 38px rgba(0,102,255,0.72)",
},

iconGold: {
  color: "#ffc438",
  border: "1px solid rgba(255,196,56,0.95)",
  boxShadow:
    "0 0 10px rgba(255,196,56,1), 0 0 26px rgba(255,174,0,0.58)",
},
floorGlow: {
  position: "absolute",
  left: "50%",
  bottom: -48,
  transform: "translateX(-50%)",
  width: "72%",
  height: 30,
  borderRadius: "50%",
  filter: "blur(8px)",
  opacity: 1,
  zIndex: -1,
},

floorGlowCyan: {
  background:
    "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,170,255,0.10) 10%, rgba(0,238,255,1) 30%, rgba(120,255,255,1) 50%, rgba(0,238,255,1) 70%, rgba(0,170,255,0.10) 90%, rgba(0,0,0,0) 100%)",
    width: "100%",
},

floorGlowBlue: {
  background:
    "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,68,255,0.08) 18%, rgba(45,110,255,1) 38%, rgba(120,180,255,1) 50%, rgba(45,110,255,1) 62%, rgba(0,68,255,0.08) 82%, rgba(0,0,0,0) 100%)",

  width: "140%",
},

floorGlowGold: {
  background:
    "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(255,196,56,0.18) 18%, rgba(255,215,90,1) 50%, rgba(255,196,56,0.18) 82%, rgba(0,0,0,0) 100%)",

  width: "100%",
},
floorCore: {
  position: "absolute",
  left: "50%",
  bottom: -35,
  transform: "translateX(-50%)",
  width: "54%",
  height: 5,
  borderRadius: "999px",
  filter: "blur(2px)",
  opacity: 1,
  zIndex: 0,
},
statsStrip: {
  position: "absolute",
  left: 133,
  bottom: 5,
  right: 133,
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 0,
  zIndex: 20,
},

statItem: {
  
  borderRadius: 12,
  padding: "12px 10px",
  top: 760,
  left: 30,
  textAlign: "justify",
  color: "#dbeafe",
  textShadow: "0 0 12px rgba(59,130,246,0.35)",
  color: "#cbd5e1",
  fontSize: 11,
  fontWeight: 800,
  lineHeight: 1.35,
  letterSpacing: 0.8,
  
},
goldBtn: {
  background: "linear-gradient(90deg,#d4a017,#f6c36a)",
  color: "#111827",
  border: "1px solid rgba(255,215,120,0.95)",
  boxShadow:
    "0 0 12px rgba(246,195,106,0.45), inset 0 0 12px rgba(255,255,255,0.12)",
},
cyanBtn: {
  background: "linear-gradient(90deg,#00b7ff,#00eeff)",
  color: "#02111b",
  border: "1px solid rgba(120,255,255,0.95)",
  boxShadow:
    "0 0 12px rgba(0,238,255,0.45), inset 0 0 12px rgba(255,255,255,0.10)",
},
bottomMonoIcon: {
  color: "#4da3ff",
  fontSize: 12,
  marginRight: 6,
  textShadow:
    "0 0 8px rgba(77,163,255,0.9), 0 0 18px rgba(37,99,235,0.55)",
},
};