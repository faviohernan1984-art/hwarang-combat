import { useState } from "react";
import "./LicenseCatalog.css";
import CatalogLicenseHeaderFrame from "./components/CatalogLicenseHeaderFrame.jsx";

const copy = {
  en: {
    eyebrow: "GET YOUR PROFESSIONAL LICENSE", subtitle: "Choose your competition system. One universe, multiple professional solutions.", choose: "CHOOSE YOUR SYSTEM",
    combat: "Professional real-time scoring for ITF Taekwon-Do combat.", gup: "Technical pattern evaluation. DISCOVER includes 25 official decisions.", suite: "Two professional systems. One combined commercial experience.", dan: "Advanced black belt pattern evaluation.", bracket: "Competition draws and bracket management.",
    explore: "EXPLORE LICENSES →", exploreSuite: "EXPLORE THE SUITE →", soon: "COMING SOON", future: "FUTURE PRODUCT", signIn: "SIGN IN", signInMessage: "Client Access coming soon.", language: "Language", back: "BACK TO CATALOG", footer: "HSU PRODUCT CATALOG",
    patternsPending: "Professional access is being prepared: DISCOVER with 25 official decisions, SIRIUS LICENSE and NEBULA LICENSE. Licensing is not available yet.", suitePending: "Combined access to Combat Pro and Patterns Gup Pro is being prepared. Packages and licenses are not available yet.",
  },
  es: {
    eyebrow: "OBTENÉ TU LICENCIA PROFESIONAL", subtitle: "Elegí tu sistema de competición. Un universo, múltiples soluciones profesionales.", choose: "ELEGÍ TU SISTEMA",
    combat: "Puntuación profesional en tiempo real para combate de Taekwon-Do ITF.", gup: "Evaluación técnica de formas. DISCOVER incluye 25 fallos oficiales.", suite: "Dos sistemas profesionales. Una experiencia comercial combinada.", dan: "Evaluación avanzada de formas para cinturones negros.", bracket: "Sorteos de competición y gestión de llaves.",
    explore: "EXPLORAR LICENCIAS →", exploreSuite: "EXPLORAR LA SUITE →", soon: "PRÓXIMAMENTE", future: "PRODUCTO FUTURO", signIn: "INICIAR SESIÓN", signInMessage: "El acceso de clientes estará disponible próximamente.", language: "Idioma", back: "VOLVER AL CATÁLOGO", footer: "CATÁLOGO DE PRODUCTOS HSU",
    patternsPending: "Estamos preparando el acceso profesional: DISCOVER con 25 fallos oficiales, SIRIUS LICENSE y NEBULA LICENSE. La contratación aún no está disponible.", suitePending: "Estamos preparando el acceso combinado a Combat Pro y Patterns Gup Pro. Los paquetes y las licencias aún no están disponibles.",
  },
};

// The commercial ES control is currently a placeholder. Share one preference
// across the catalog and future product pages without changing Combat.
function readLanguage() {
  try { return localStorage.getItem("hsu-commercial-language") === "es" ? "es" : "en"; }
  catch { return "en"; }
}

export default function LicenseCatalog({ product = null }) {
  const [language, setLanguage] = useState(readLanguage);
  const t = copy[language];
  const cards = [
    { key: "combat", title: "COMBAT PRO", href: "/license-dev", status: t.explore },
    { key: "gup", title: "PATTERNS GUP PRO", href: "/license-patterns", status: "DISCOVER · SIRIUS · NEBULA →" },
    { key: "suite", title: "COMBAT + PATTERNS", href: "/license-suite", status: t.exploreSuite },
    { key: "dan", title: "PATTERNS DAN PRO" },
    { key: "bracket", title: language === "es" ? "LLAVEO" : "BRACKETS" },
  ];
  function changeLanguage(event) {
    const next = event.target.value;
    setLanguage(next);
    try { localStorage.setItem("hsu-commercial-language", next); } catch { /* Storage may be unavailable. */ }
  }
  return (
    <div className="license-catalog" lang={language}>
      <CatalogLicenseHeaderFrame language={language} onLanguageChange={changeLanguage} />
      <main className="catalog-main">
        <div className="catalog-eyebrow">{t.eyebrow}</div>
        <h1>HWARANG SCORING <span>UNIVERSE<sup className="catalog-registered">®</sup></span></h1>
        <p className="catalog-sub">{t.subtitle}</p>
        {product ? (
          <section className="catalog-pending" aria-labelledby="pending-title">
            <h2 id="pending-title">{product === "patterns" ? "PATTERNS GUP PRO" : "COMBAT + PATTERNS"}</h2>
            <p>{product === "patterns" ? t.patternsPending : t.suitePending}</p>
            <span className="catalog-status">{t.soon}</span><a href="/license">{t.back}</a>
          </section>
        ) : (
          <><h2 className="catalog-section">{t.choose}</h2>
            <section className="catalog-dice" aria-label={t.choose}>
              {cards.map(({ key, title, href, status }) => {
                const content = <>{!href && <span className="catalog-pill">{t.soon}</span>}<span><h2>{title}</h2><p>{t[key]}</p><span className="catalog-status">{status || t.future}</span></span></>;
                return href ? <a key={key} className={`catalog-card ${key}`} href={href}>{content}</a> : <div key={key} className={`catalog-card ${key} disabled`} aria-disabled="true">{content}</div>;
              })}
            </section>
          </>
        )}
        <footer className="catalog-footer">{t.footer}</footer>
      </main>
    </div>
  );
}
