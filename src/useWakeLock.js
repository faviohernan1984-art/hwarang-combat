import { useEffect, useRef } from "react";

export function useWakeLock(enabled = true) {
  const wakeLockRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function requestWakeLock() {
      try {
        if (!("wakeLock" in navigator)) {
          console.log("Wake Lock no soportado");
          return;
        }

        if (wakeLockRef.current) {
          try {
            await wakeLockRef.current.release();
          } catch {}
          wakeLockRef.current = null;
        }

        const sentinel = await navigator.wakeLock.request("screen");

        wakeLockRef.current = sentinel;

        console.log("Wake Lock activo");

        sentinel.addEventListener("release", () => {
          console.log("Wake Lock liberado");
          wakeLockRef.current = null;

          if (
            document.visibilityState === "visible" &&
            !cancelled
          ) {
            requestWakeLock();
          }
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

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    window.addEventListener("focus", requestWakeLock);

    return () => {
      cancelled = true;

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      window.removeEventListener("focus", requestWakeLock);

      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [enabled]);
}