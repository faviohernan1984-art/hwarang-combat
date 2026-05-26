import React, { useEffect, useState } from "react";

const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;

export default function CinematicAdaptiveShell({ children }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const widthScale = viewportWidth / BASE_WIDTH;
      const heightScale = viewportHeight / BASE_HEIGHT;

      const isNative1920 =
  viewportWidth >= 1800 && viewportHeight >= 900;

      if (isNative1920) {
        setScale(1);
      } else {
        setScale(Math.min(widthScale, heightScale));
      }
    };

    updateScale();

    window.addEventListener("resize", updateScale);

    return () => {
      window.removeEventListener("resize", updateScale);
    };
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background:
  "radial-gradient(circle at center, #071426 0%, #020617 45%, #000000 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: BASE_WIDTH,
          height: BASE_HEIGHT,
          transform: `translateY(62px) scale(${scale})`,
          transformOrigin: "center center",
          flexShrink: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}