import React from "react";
import {
  ShieldCheck,
  Globe,
  Trophy,
  Smartphone,
  Lock,
  Zap,
  Crown,
  CalendarDays,
Clock,
Monitor,
Cloud,
ShoppingCart,
Mail,
KeyRound,
BadgeCheck,
CreditCard,
} from "lucide-react";




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
<Feature
  icon={<ShieldCheck size={18} style={styles.lucideIcon} />}
  title="OFFICIAL STANDARD"
  text="Professional system built to ITF standards"
/>

<Feature
  icon={<Zap size={18} style={styles.lucideIcon} />}
  title="REAL-TIME SYSTEM"
  text="Instant synchronization across all devices"
/>

<Feature
  icon={<Globe size={18} style={styles.lucideIcon} />}
  title="CLOUD PLATFORM"
  text="Your data always secure and accessible"
/>

<Feature
  icon={<Smartphone size={18} style={styles.lucideIcon} />}
  title="PREMIUM SUPPORT"
  text="Dedicated technical assistance"
/>
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
    <ShieldCheck size={18} style={styles.bottomLucideIcon} />
    TRUSTED BY<br />
    PROFESSIONAL ORGANIZATIONS WORLDWIDE
  </div>

  <div style={styles.statItem}>
    <Trophy size={18} style={styles.bottomLucideIcon} />
    OFFICIAL SYSTEM USED IN<br />
    NATIONAL & INTERNATIONAL EVENTS
  </div>

  <div style={styles.statItem}>
    <Globe size={18} style={styles.bottomLucideIcon} />
    ENGINEERED BY EXPERTS IN<br />
    ITF TAEKWONDO & COMPETITIVE TECHNOLOGY
  </div>
</div>

</section>

        <aside style={styles.checkout}>
  <h2 style={styles.checkoutTitle}>YOUR ORDER</h2>

  <div style={styles.selectedBox}>
    <div style={styles.trophyBox}>
      <Trophy size={34} style={styles.checkoutMainIcon} />
    </div>

    <div style={{ flex: 1 }}>
      <div style={styles.muted}>SELECTED LICENSE</div>
      <div style={styles.selectedTitle}>SINGLE EVENT</div>
      <div style={styles.muted}>Single-event license</div>
    </div>

    <div style={styles.priceSide}>USD 49</div>
  </div>

  <div style={styles.detailList}>
    <Row icon={<CalendarDays size={18} style={styles.rowIcon} />} label="Validity" value="1 event" />
    <Row icon={<Clock size={18} style={styles.rowIcon} />} label="Duration" value="Unlimited" />
    <Row icon={<Monitor size={18} style={styles.rowIcon} />} label="Devices" value="Unlimited" />
    <Row icon={<Cloud size={18} style={styles.rowIcon} />} label="Storage" value="Included" />
  </div>

  <div style={styles.totalRow}>
    <span>TOTAL</span>
    <strong>USD 49</strong>
  </div>

  <button style={styles.buyBtn}>
    <Lock size={18} style={styles.buyIcon} />
    BUY NOW
  </button>

  <div style={styles.secure}>
    <ShieldCheck size={16} style={styles.secureIcon} />
    100% secure payment
  </div>

  <div style={styles.payments}>
    <div style={styles.payTitle}>PAYMENT METHODS</div>

    <div style={styles.payLogos}>
  <div style={styles.payCard}>VISA</div>
  <div style={styles.payCard}>MC</div>
  <div style={styles.payCard}>AMEX</div>
  <div style={styles.payCard}>PayPal</div>
  <div style={styles.payCard}>MP</div>
</div>

    <p style={{ marginTop: 5 }}>
  Your license is automatically activated after payment confirmation.
</p>
  </div>

  <div style={styles.howBox}>
    <h3>HOW IT WORKS?</h3>

    <div style={styles.howStep}>
      <ShoppingCart size={18} style={styles.howIcon} />
      <span style={styles.stepNumber}>1</span>
      <p>Complete your purchase securely</p>
    </div>

    <div style={styles.howStep}>
      <Mail size={18} style={styles.howIcon} />
      <span style={styles.stepNumber}>2</span>
      <p>Your license will be delivered instantly by email</p>
    </div>

    <div style={styles.howStep}>
      <KeyRound size={18} style={styles.howIcon} />
      <span style={styles.stepNumber}>3</span>
      <p>Enter your license code in the platform</p>
    </div>

    <div style={styles.howStep}>
      <BadgeCheck size={18} style={styles.howIcon} />
      <span style={styles.stepNumber}>4</span>
      <p>Your system will be fully activated</p>
    </div>
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
  {tone === "cyan" ? (
    <ShieldCheck size={20} style={styles.planLucideIcon} />
  ) : tone === "gold" ? (
    <Crown size={20} style={styles.planLucideIcon} />
  ) : (
    <Zap size={20} style={styles.planLucideIcon} />
  )}
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

function Row({ icon, label, value }) {
  return (
    <div style={styles.row}>
      <div style={styles.rowLabel}>
        {icon}
        <span>{label}</span>
      </div>
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
    fontWeight: 700,
    color: "#e5e7eb",
    textShadow:
  "0 3px 8px rgba(0,0,0,0.75)",
  },
  blueText: { color: "#3b82f6" },
  subtitle: {
    maxWidth: 760,
    margin: "14px auto 0",
    fontSize: 18,
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
lucideIcon: {
  color: "#e4e4eb",
  opacity: 0.98,
  transform: "scale(1.08)",
  filter:
    `
    drop-shadow(0 0 2px rgba(255,255,255,0.95))
    drop-shadow(0 0 8px rgba(120,180,255,0.95))
    drop-shadow(0 0 18px rgba(0,102,255,0.65))
    drop-shadow(0 0 34px rgba(0,102,255,0.28))
    `,
},
bottomLucideIcon: {
  color: "#60a5fa",
  minWidth: 18,
  marginTop: 2,
  filter:
    `
    drop-shadow(0 0 6px rgba(96,165,250,0.9))
    drop-shadow(0 0 16px rgba(37,99,235,0.45))
    `,
},
  sectionTitle: {
    marginBottom: 10,
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
    letterSpacing: 0.4,
    fontSize: 12,
    color: "#cbd5e1",
    lineHeight: 1.45,
    marginTop: 8,
  },
  cards: {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 50,
  paddingBottom: 0,
  overflow: "visible",
  alignItems: "flex-start",
  marginTop: 10,
  padding: "14px",
  borderRadius: 18,

  background: "rgba(255,0,0,0.18)",

background: "linear-gradient(180deg, rgba(0,0,0,0.94) 0%, rgba(2,6,23,0.98) 100%)", border: "1px solid rgba(59,130,246,0.16)",

  
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
  note: { textAlign: "center", color: "#cbd5e1", marginTop: 30 },
  checkout: {
  width: 600,
  flexShrink: 0,
  zIndex: 5,
  position: "absolute",
  right: -25,
  top: -230,

  borderRadius: 24,
  overflow: "hidden",

  transform: "scale(0.70",
  transformOrigin: "bottom center",

  padding: "18px 24px",

  border: "2.5px solid transparent",

background:
  `
  linear-gradient(180deg, rgba(3,8,20,0.98) 0%, rgba(2,6,23,1) 100%) padding-box,
  linear-gradient(180deg, rgba(0,170,255,0.95) 0%, rgba(6, 81, 243, 0.59) 45%, rgba(0,170,255,0.85) 100%) border-box
  `,

  boxShadow:
  `
  0 0 140px rgba(0,0,0,0.96),

  0 0 25px rgba(0,140,255,0.38),
  0 0 60px rgba(0,140,255,0.32),
  0 0 120px rgba(0,102,255,0.24),
  0 0 220px rgba(0,102,255,0.18),

  0 0 320px rgba(0,102,255,0.14),

  inset 0 0 90px rgba(37,99,235,0.08)
  `,
},
  checkoutTitle: {
  
  fontSize: 18,
  marginBottom: 12,
  color: "#c7d8f0", fontSize: 13
},
  selectedBox: {
  display: "flex",
  alignItems: "center",
  gap: 18,

  padding: "10px 12px",

  borderRadius: 18,

  border: "1px solid rgba(59,130,246,0.16)",

  background:
    "linear-gradient(180deg, rgba(8,15,35,0.95) 0%, rgba(2,6,23,0.98) 100%)",

  marginTop: 14,
  marginBottom: 10,
},
  trophyBox: {
    width: 58,
    height: 58,
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
  padding: "6px 0 18px",
  borderBottom: "1px solid rgba(148,163,184,0.16)",
},
  row: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",

  color: "#dbeafe",

  padding: "16px 0",

  borderBottom: "1px solid rgba(255,255,255,0.03)",
},
rowLabel: {
  display: "flex",
  alignItems: "center",
  gap: 16,
  color: "#e2e8f0",
},

rowIcon: {
  color: "#00aaff",
  filter:
    "drop-shadow(0 0 6px rgba(0,170,255,0.85)) drop-shadow(0 0 14px rgba(37,99,235,0.45))",
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
  height: 62,

  borderRadius: 14,

  border: "1px solid rgba(96,165,250,0.95)",

  background:
    "linear-gradient(90deg,#2563eb 0%, #2563eb 35%, #3b82f6 100%)",

  color: "white",

  fontSize: 18,
  fontWeight: 900,
  letterSpacing: 1,

  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,

  boxShadow:
    `
    0 0 20px rgba(37,99,235,0.45),
    0 0 40px rgba(37,99,235,0.22),
    inset 0 0 18px rgba(255,255,255,0.08)
    `,
},
  secure: {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,

  marginTop: 20,

  color: "#cbd5e1",

  fontSize: 15,
},
payments: {
  marginTop: 18,
  paddingTop: 14,
  borderTop: "1px solid rgba(148,163,184,0.10)",
  textAlign: "center",
  color: "#cbd5e1",
},
checkoutMainIcon: {
  color: "#00aaff",

  filter:
    `
    drop-shadow(0 0 6px rgb(0, 38, 255))
    drop-shadow(0 0 16px rgba(37,99,235,0.55))
    drop-shadow(0 0 34px rgba(0,102,255,0.28))
    `,
},
  payTitle: {
  fontWeight: 800,
  color: "#cbd5e1",
  marginBottom: 10,
  letterSpacing: 1.4,
  fontSize: 13,
},
  payLogos: {
  display: "flex",
  justifyContent: "space-between",
  gap: 6,
  alignItems: "center",
},
  payCard: {
  flex: 1,

  height: 40,

  borderRadius: 10,

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  background:
    "linear-gradient(180deg, rgba(8,15,35,0.96) 0%, rgba(2,6,23,1) 100%)",

  border: "1px solid rgba(59,130,246,0.18)",

  color: "#f8fafc",

  fontWeight: 900,
  fontSize: 13,

  letterSpacing: 0.3,

  boxShadow:
    `
    0 0 10px rgba(37,99,235,0.10),
    inset 0 0 12px rgba(255,255,255,0.03)
    `,
},
  howBox: {
  marginTop: 28,

  border: "1px solid rgba(59,130,246,0.14)",

  borderRadius: 18,

  padding: "22px 22px 10px",

  background:
    "linear-gradient(180deg, rgba(5,10,24,0.96) 0%, rgba(2,6,23,0.98) 100%)",

  color: "#e2e8f0",
},
howStep: {
  display: "grid",
  gridTemplateColumns: "48px 42px 1fr",
  alignItems: "center",
  gap: 14,
  marginBottom: 18,
},

howIcon: {
  width: 42,
  height: 42,
  padding: 10,
  borderRadius: "50%",
  color: "#00aaff",
  border: "1px solid rgba(0,170,255,0.45)",
  background: "rgba(0,40,90,0.20)",
  filter:
    "drop-shadow(0 0 8px rgba(0,170,255,0.85))",
},

stepNumber: {
  width: 36,
  height: 36,
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  color: "#3b82f6",
  border: "1px solid rgba(59,130,246,0.5)",
  background: "rgba(37,99,235,0.12)",
  fontSize: 22,
  fontWeight: 900,
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
  bottom: 30,
  right: 133,
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 0,
  zIndex: 20,
},

statItem: {
  borderRadius: 12,
  padding: "12px 18px",
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  textAlign: "left",
  color: "#cbd5e1",
  textShadow: "0 0 12px rgba(59,130,246,0.22)",
  fontSize: 9,
  fontWeight: 800,
  lineHeight: 1.45,
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