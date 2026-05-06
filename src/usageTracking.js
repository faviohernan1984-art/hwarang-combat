import { addDoc, collection } from "firebase/firestore";
import { db } from "./firebase";

export function getScreenFromPath(path = window.location.pathname) {
  if (path.includes("/president")) return "president";
  if (path.includes("/public")) return "public";
  if (path.includes("/judge")) return "judge";
  return "home";
}

export async function trackVisit() {
  try {
    await addDoc(collection(db, "visits"), {
      roomId: "combat",
      path: window.location.pathname,
      screen: getScreenFromPath(window.location.pathname),
      createdAt: Date.now(),
      userAgent: navigator.userAgent,
    });
  } catch (error) {
    console.error("Visit tracking error:", error);
  }
}