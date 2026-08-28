import assert from "node:assert/strict";
import { deleteApp as deleteClientApp, initializeApp } from "firebase/app";
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getFirestore as getClientFirestore,
  onSnapshot,
  setDoc,
  terminate,
} from "firebase/firestore";
import { deleteApp as deleteAdminApp, initializeApp as initializeAdminApp } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";

const projectId = "hwarang-local-test";
const roomId = "demo-hsu-local01";
const lanHost = process.env.HSU_LAN_HOST || "127.0.0.1";
const baseUrl = `http://${lanHost}:3000`;
process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";

function waitForSnapshot(subscribe, predicate, label) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error(`Timed out waiting for ${label}`));
    }, 10000);
    const unsubscribe = subscribe((snapshot) => {
      if (!predicate(snapshot)) return;
      clearTimeout(timeout);
      unsubscribe();
      resolve(snapshot);
    }, reject);
  });
}

const clientApp = initializeApp({ projectId, apiKey: "local-test" }, "local-realtime-client");
const clientDb = getClientFirestore(clientApp);
connectFirestoreEmulator(clientDb, lanHost, 8080);
const adminApp = initializeAdminApp({ projectId }, "local-realtime-admin");
const adminDb = getAdminFirestore(adminApp);

const sessionId = `local-realtime-${Date.now()}`;
const slotRef = doc(clientDb, "matches", roomId, "judgeSlots", "1");
const connectedSlot = waitForSnapshot(
  (next, error) => onSnapshot(slotRef, next, error),
  (snapshot) => snapshot.data()?.sessionId === sessionId && snapshot.data()?.status === "online",
  "Judge 1 connection"
);

const joinResponse = await fetch(`${baseUrl}/api/join-judge`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ roomId, judgeId: 1, name: "Judge LAN Test", sessionId }),
});
assert.equal(joinResponse.status, 200);
await connectedSlot;

const judgeRef = doc(clientDb, "matches", roomId, "judges", "1");
const presidentSawPoints = waitForSnapshot(
  (next, error) => onSnapshot(collection(clientDb, "matches", roomId, "judges"), next, error),
  (snapshot) => snapshot.docs.some((item) => item.id === "1" && item.data()?.hongPoints === 2),
  "President points listener"
);
await setDoc(judgeRef, { id: 1, hongPoints: 2, chongPoints: 0, gpDecision: null, history: [] });
await presidentSawPoints;

const adminJudge = await adminDb.collection("matches").doc(roomId).collection("judges").doc("1").get();
assert.equal(adminJudge.data()?.hongPoints, 2);

const releasedSlot = waitForSnapshot(
  (next, error) => onSnapshot(slotRef, next, error),
  (snapshot) => snapshot.data()?.status === "released" && snapshot.data()?.sessionId === null,
  "Judge 1 release"
);
const releaseResponse = await fetch(`${baseUrl}/api/judge-session`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "release", roomId, judgeId: 1, sessionId }),
});
assert.equal(releaseResponse.status, 200);
await releasedSlot;

await terminate(clientDb);
await deleteClientApp(clientApp);
await deleteAdminApp(adminApp);
console.log(`Realtime LAN synchronization passed: ${baseUrl}`);
console.log(`Project: ${projectId}; room: ${roomId}; Judge 1 released`);
