import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, collection, connectFirestoreEmulator } from "firebase/firestore";

const localEmulatorAddress = import.meta.env.VITE_FIRESTORE_EMULATOR_HOST;
const canUseLocalEmulator =
  import.meta.env.DEV &&
  import.meta.env.VITE_HSU_LOCAL_ISOLATED_TEST === "1" &&
  /^(localhost|127\.0\.0\.1):\d+$/.test(localEmulatorAddress || "");
const localEmulatorPort = Number(localEmulatorAddress?.split(":")[1]);

const firebaseConfig = {
  apiKey: "AIzaSyAW61pILTbrcmGl2uX4h9LsoxuyZxaCwe4",
  authDomain: "hwarang-combat-production.firebaseapp.com",
  projectId: canUseLocalEmulator ? "hwarang-local-test" : "hwarang-combat-production",
  storageBucket: "hwarang-combat-production.firebasestorage.app",
  messagingSenderId: "436925023564",
  appId: "1:436925023564:web:9d3bd5fdcf622433b2bbe9"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);

if (canUseLocalEmulator) {
  connectFirestoreEmulator(db, window.location.hostname, localEmulatorPort);
}

// COMBAT por sala / universo
export const getMatchMetaRef = (roomId = "combat") =>
  doc(db, "matches", roomId);

export const getJudgesColRef = (roomId = "combat") =>
  collection(db, "matches", roomId, "judges");

export const getJudgeRef = (roomId = "combat", id) =>
  doc(db, "matches", roomId, "judges", String(id));
