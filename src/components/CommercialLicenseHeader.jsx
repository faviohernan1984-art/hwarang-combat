import { commercialHeaderStyles as styles } from "./commercialLicenseHeaderStyles.js";
import "./CommercialLicenseHeader.css";

function showComingSoon(message) {
  window.alert(message);
}

function navClickFx(event) {
  const target = event.currentTarget;
  target.style.transform = "scale(0.94)";
  setTimeout(() => {
    target.style.transform = "translateY(-1px)";
  }, 90);
}

// Defaults preserve the existing Combat header. Catalog pages provide their
// existing ES/EN preference without changing Combat's placeholder controls.
export default function CommercialLicenseHeader({ language, onLanguageChange }) {
  return (
      <header
  className={language ? "commercial-license-header commercial-license-header--responsive" : "commercial-license-header"}
  style={{
    ...styles.navbar,
    position: "relative",
    zIndex: 9999,
    pointerEvents: "auto",
  }}
>
        <div style={styles.brand}>
          <div style={styles.logoOrb}>
  <style>{`
    @keyframes licenseOrbSpin {
      0% {
        transform: rotate(0deg);
      }

      100% {
        transform: rotate(360deg);
      }
    }
  `}</style>

  <div style={styles.logoOrbRing} />

  <div style={styles.logoOrbCore}>
    H
  </div>
</div>
          <div>
            <div style={styles.brandTitle}>HWARANG</div>
            <div style={styles.brandSub}>SCORING UNIVERSE<sup style={{ fontSize: "0.42em", lineHeight: 0, marginLeft: "0.08em" }}>®</sup></div>
          </div>
        </div>

        {/* ======================================================
LICENSE PAGE
NAV LINKS INTERACTION
====================================================== */}
<nav style={styles.navLinks}>
  <span
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateY(-1px)";
      e.currentTarget.style.color = "#60a5fa";
      e.currentTarget.style.textShadow = "0 0 10px rgba(96,165,250,0.45)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.color = "#ffffff";
      e.currentTarget.style.textShadow = "none";
    }}
    onMouseDown={(e) => navClickFx(e)}
    onClick={() => (window.location.href = "/")}
    style={{
      cursor: "pointer",
      transition: "transform 0.12s ease, color 0.16s ease, text-shadow 0.16s ease",
    }}
  >
    HOME
  </span>

  <span
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateY(-1px)";
      e.currentTarget.style.color = "#60a5fa";
      e.currentTarget.style.textShadow = "0 0 14px rgba(96,165,250,0.65)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.color = "#60a5fa";
      e.currentTarget.style.textShadow = "0 0 8px rgba(96,165,250,0.35)";
    }}
    onMouseDown={(e) => navClickFx(e)}
    onClick={language ? () => (window.location.href = "/license") : undefined}
    style={{
      ...styles.activeNav,
      cursor: "default",
      transition: "transform 0.12s ease, color 0.16s ease, text-shadow 0.16s ease",
      textShadow: "0 0 8px rgba(96,165,250,0.35)",
    }}
  >
    LICENSE
  </span>
</nav>

        <div style={styles.navActions}>
          {language ? (
  <div className="commercial-license-language-control">
  <select className="commercial-license-language" style={styles.langBtn} aria-label={language === "es" ? "Idioma" : "Language"} value={language} onChange={onLanguageChange}>
    <option value="es">ES</option><option value="en">EN</option>
  </select>
  <span className="commercial-license-language-arrow" aria-hidden="true">⌄</span>
  </div>
) : (
<button
  style={styles.langBtn}
  onClick={() => showComingSoon("Language selector coming soon.")}
>
  ES⌄
</button>
)}

<button
  style={styles.loginBtn}
  onClick={() => showComingSoon("Client Access coming soon.")}
>
  SIGN IN
</button>
        </div>
      </header>
  );
}
