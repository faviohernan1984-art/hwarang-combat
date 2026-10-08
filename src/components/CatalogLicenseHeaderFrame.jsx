import { useEffect, useState } from "react";
import CommercialLicenseHeader from "./CommercialLicenseHeader.jsx";

function readViewport() {
  return { width: window.innerWidth, height: window.innerHeight };
}

// Mirror only the reference navbar's frame. The five catalog cards keep their
// own responsive container and are never placed inside the cinematic transform.
export default function CatalogLicenseHeaderFrame({ language, onLanguageChange }) {
  const [viewport, setViewport] = useState(readViewport);

  useEffect(() => {
    const update = () => setViewport(readViewport());
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const { width, height } = viewport;
  const isNotebook = width >= 1200 && width <= 1600 && height >= 700 && height <= 900;
  const isMobile = width < 900;
  const header = <CommercialLicenseHeader language={language} onLanguageChange={onLanguageChange} />;

  // Combat currently hides its navbar in mobile. Keep the approved catalog's
  // usable mobile layout rather than reproduce an offscreen reference header.
  if (isNotebook || isMobile) return header;

  // Same base canvas, native-size condition, scaling and translateY as
  // CinematicAdaptiveShell wrapping /license-dev. Only the navbar is transformed.
  const scale = width >= 1800 && height >= 900
    ? 1
    : Math.min(width / 1920, height / 1080) * 1.08;
  const left = (width - 1920 * scale) / 2;
  const top = (height - 1080 * scale) / 2 + 62;

  return (
    <div style={{ position: "relative", height: Math.max(0, top + 88 * scale), overflow: "hidden" }}>
      <div style={{ position: "absolute", left, top, width: 1920, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        {header}
      </div>
    </div>
  );
}
