import { useEffect, useRef } from "react";

export function useWakeLock(enabled = true) {
  const wakeLockRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function requestWakeLock() {
      try {
        if (!("wakeLock" in navigator)) {
          console.log("Wake Lock no soportado en este navegador");
          return;
        }

        if (wakeLockRef.current) return;

        wakeLockRef.current = await navigator.wakeLock.request("screen");
        console.log("Wake Lock activo");

        wakeLockRef.current.addEventListener("release", () => {
          wakeLockRef.current = null;
          console.log("Wake Lock liberado");
        });
      } catch (err) {
        console.log("Wake Lock error:", err);
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && !cancelled) {
        requestWakeLock();
      }
    }

    requestWakeLock();

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, [enabled]);
}