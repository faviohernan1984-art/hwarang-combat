import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, collection, connectFirestoreEmulator } from "firebase/firestore";

const localEmulatorAddress = import.meta.env.VITE_FIRESTORE_EMULATOR_HOST;
const canUseLocalEmulator =
  import.meta.env.DEV &&
  import.meta.env.VITE_HSU_LOCAL_ISOLATED_TEST === "1" &&
  /^(localhost|127\.0\.0\.1):\d+$/.test(localEmulatorAddress || "");
const localEmulatorPort = Number(localEmulatorAddress?.split(":")[1]);

const firebaseConfig = {
  apiKey: "AIzaSyCARTpTfP6_BCCIzQmWJDNCtUs5ATt1Y-8",
  authDomain: "hwarang-scoring.firebaseapp.com",
  projectId: canUseLocalEmulator ? "hwarang-local-test" : "hwarang-scoring",
  storageBucket: "hwarang-scoring.firebasestorage.app",
  messagingSenderId: "309913008618",
  appId: "1:309913008618:web:ae3277153f88a054641a93"
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
