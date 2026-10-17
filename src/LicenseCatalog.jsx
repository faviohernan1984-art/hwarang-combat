import { Fragment, useState } from "react";
import { patternsCommercialLinks } from "./patternsCommercialLinks.js";
import "./LicenseCatalog.css";
import "./components/HomeFirstLayer.css";
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

export default function LicenseCatalog({ product = null, view = null, onCombatDiscover, onNavigate,
  sceneFrame, embedded = false, patternsOrigin = import.meta.env?.VITE_PATTERNS_APP_ORIGIN,
  patternsDemoEnabled = import.meta.env?.VITE_PATTERNS_DEMO_ENABLED === "true" }) {
  const [language, setLanguage] = useState(readLanguage);
  const t = copy[language];
  const accessText = language === "es" ? {
    discoverTitle: "ELEGÍ TU DEMO", enter: "ENTRAR A DISCOVER", unavailable: "DEMO NO DISPONIBLE",
    discover: "25 decisiones oficiales · Roles Presidente, Jueces y Público · Marca de agua HSU.",
    event: "Licencia para un evento.", annual: "Licencia anual.",
    pending: "Precios y condiciones pendientes de aprobación. Contratación deshabilitada.",
    checkout: "CONTRATACIÓN NO DISPONIBLE", privateTitle: "ACCESO INSTITUCIONAL PRIVADO",
    privateNote: "Independiente del checkout. Requiere identidad autorizada y validación de seguridad.",
    privateLink: "IR AL ACCESO PRIVADO", privateUnavailable: "ACCESO PRIVADO NO DISPONIBLE",
    back: "VOLVER AL CATÁLOGO",
  } : {
    discoverTitle: "CHOOSE YOUR DEMO", enter: "ENTER DISCOVER", unavailable: "DEMO UNAVAILABLE",
    discover: "25 official decisions · President, Judges and Public roles · HSU watermark.",
    event: "License for one event.", annual: "Annual license.",
    pending: "Pricing and conditions await approval. Purchasing is disabled.",
    checkout: "PURCHASING UNAVAILABLE", privateTitle: "PRIVATE INSTITUTIONAL ACCESS",
    privateNote: "Separate from checkout. Requires an authorized identity and security verification.",
    privateLink: "OPEN PRIVATE ACCESS", privateUnavailable: "PRIVATE ACCESS UNAVAILABLE",
    back: "BACK TO CATALOG",
  };
  const patternsLinks = patternsCommercialLinks(patternsOrigin, { development: import.meta.env?.DEV === true });
  // UI availability only: Firebase/backend controls remain mandatory at destination.
  const demoAvailable = Boolean(patternsLinks && patternsDemoEnabled === true);
  const discoverAction = demoAvailable
    ? <a className="catalog-access-action" href={patternsLinks.demo} referrerPolicy="no-referrer">{accessText.enter}</a>
    : <button className="catalog-access-action" type="button" disabled>{accessText.unavailable}</button>;

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
  function navigateWithinScene(event) {
    if (
      event.defaultPrevented || event.button !== 0 ||
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
      typeof onNavigate !== "function"
    ) return;
    event.preventDefault();
    onNavigate(event.currentTarget.getAttribute("href"));
  }
  const centralContent = (<>
        {view === "discover" ? (
          <section className="catalog-discover-section" aria-labelledby="discover-systems-title">
            <h2 className="catalog-section" id="discover-systems-title">{accessText.discoverTitle}</h2>
            <div className="catalog-access-grid catalog-access-grid--discover">
              <article className="catalog-card combat"><div><h2>COMBAT PRO</h2><p>{t.combat}</p>
                <button className="catalog-access-action" type="button" onClick={onCombatDiscover}
                  disabled={typeof onCombatDiscover !== "function"}>{accessText.enter}</button>
              </div></article>
              <article className="catalog-card gup"><div><h2>PATTERNS GUP PRO</h2><p>{accessText.discover}</p>{discoverAction}</div></article>
            </div>
            <a className="catalog-access-back" href="/license" onClick={navigateWithinScene}>{accessText.back}</a>
          </section>
        ) : product === "patterns" ? (
          <section className="catalog-patterns-section" aria-labelledby="patterns-commercial-title">
            <h2 className="catalog-section" id="patterns-commercial-title">PATTERNS GUP PRO</h2>
            <div className="catalog-access-grid catalog-access-grid--patterns">
              <article className="catalog-card gup"><div><h2>DISCOVER</h2><p>{accessText.discover}</p>{discoverAction}</div></article>
              <article className="catalog-card catalog-access-sirius"><div><h2>SIRIUS LICENSE</h2><p>{accessText.event}</p>
                <p>{accessText.pending}</p><button className="catalog-access-action" type="button" disabled>{accessText.checkout}</button>
              </div></article>
              <article className="catalog-card catalog-access-nebula"><div><h2>NEBULA LICENSE</h2><p>{accessText.annual}</p>
                <p>{accessText.pending}</p><button className="catalog-access-action" type="button" disabled>{accessText.checkout}</button>
              </div></article>
            </div>
            <aside className="catalog-institutional-entry" aria-labelledby="patterns-private-title">
              <h3 id="patterns-private-title">{accessText.privateTitle}</h3><p>{accessText.privateNote}</p>
              {patternsLinks ? <a href={patternsLinks.institutional} referrerPolicy="no-referrer">{accessText.privateLink}</a>
                : <span role="status">{accessText.privateUnavailable}</span>}
            </aside>
            <a className="catalog-access-back" href="/license">{accessText.back}</a>
          </section>
        ) : product ? (
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
  </>);
  const SceneFrame = sceneFrame || Fragment;
  if ((embedded || sceneFrame) && !product) return (
    <SceneFrame>
      <div className="license-catalog hsu-first-layer-catalog" lang={language}>
        <div className="hsu-first-layer-body">{centralContent}</div>
        <div className="hsu-first-layer-controls">
          <a href="/" onClick={navigateWithinScene}>← HOME</a>
          <label>{t.language}<select aria-label={t.language} value={language} onChange={changeLanguage}>
            <option value="es">ES</option><option value="en">EN</option>
          </select></label>
        </div>
      </div>
    </SceneFrame>
  );
  return (
    <div className="license-catalog" lang={language}>
      <CatalogLicenseHeaderFrame language={language} onLanguageChange={changeLanguage} />
      <main className="catalog-main">
        <div className="catalog-eyebrow">{t.eyebrow}</div>
        <h1>HWARANG SCORING <span>UNIVERSE<sup className="catalog-registered">®</sup></span></h1>
        <p className="catalog-sub">{t.subtitle}</p>
        {centralContent}
        <footer className="catalog-footer">{t.footer}</footer>
      </main>
    </div>
  );
}
