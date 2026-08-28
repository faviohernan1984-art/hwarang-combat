import assert from "node:assert/strict";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { makeInitialJudge } from "../api/roomProvisioning.js";

process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
const baseUrl = process.env.LOCAL_BASE_URL || "http://127.0.0.1:3000";
const db = getFirestore(initializeApp({ projectId: "hwarang-local-test" }, "room-provisioning-test"));
const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const runId = Date.now().toString(36);

async function post(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return { response, data };
}

async function seedLicense(licenseKey, overrides = {}) {
  await db.collection("licenses").doc(licenseKey).set({
    paymentStatus: "approved",
    activationStatus: "active",
    licenseStatus: "active",
    expiresAt: future,
    ...overrides,
  });
}

async function assertRoomMissing(roomId) {
  assert.equal((await db.collection("matches").doc(roomId).get()).exists, false);
}

const validRoom = `license-local-valid-${runId}`;
await seedLicense(validRoom);
const valid = await post("/api/validate-license-access", { licenseKey: validRoom });
assert.equal(valid.response.status, 200);
assert.deepEqual(valid.data, { ok: true, status: "valid", roomReady: true });
const validMatch = await db.collection("matches").doc(validRoom).get();
assert.equal(validMatch.exists, true);
for (let judgeId = 1; judgeId <= 5; judgeId += 1) {
  const judge = await db.collection("matches").doc(validRoom).collection("judges").doc(String(judgeId)).get();
  assert.deepEqual(judge.data(), makeInitialJudge(judgeId));
}

await validMatch.ref.update({ status: "running", preservedMarker: "keep" });
await validMatch.ref.collection("judges").doc("1").update({ hongPoints: 8 });
await post("/api/validate-license-access", { licenseKey: validRoom });
assert.equal((await validMatch.ref.get()).data().preservedMarker, "keep");
assert.equal((await validMatch.ref.collection("judges").doc("1").get()).data().hongPoints, 8);

const raceRoom = `license-local-race-${runId}`;
await seedLicense(raceRoom);
const race = await Promise.all([
  post("/api/validate-license-access", { licenseKey: raceRoom }),
  post("/api/validate-license-access", { licenseKey: raceRoom }),
]);
assert.deepEqual(race.map(({ response }) => response.status), [200, 200]);
assert.equal((await db.collection("matches").doc(raceRoom).collection("judges").get()).size, 5);

const expiredRoom = `license-local-expired-${runId}`;
await seedLicense(expiredRoom, { expiresAt: past });
const expired = await post("/api/validate-license-access", { licenseKey: expiredRoom });
assert.equal(expired.data.status, "expired");
await assertRoomMissing(expiredRoom);

const invalidRoom = `license-local-invalid-${runId}`;
await seedLicense(invalidRoom, { activationStatus: "inactive" });
const invalid = await post("/api/validate-license-access", { licenseKey: invalidRoom });
assert.equal(invalid.data.status, "invalid");
await assertRoomMissing(invalidRoom);

const inventedRoom = `invented-room-local-${runId}`;
const invented = await post("/api/join-judge", {
  roomId: inventedRoom,
  judgeId: 1,
  name: "Invented Judge",
  sessionId: "invented-session-0001",
});
assert.equal(invented.response.status, 404);
assert.equal(invented.data.code, "ROOM_NOT_FOUND");

const manualRoom = "license-local-iphone";
await db.recursiveDelete(db.collection("matches").doc(manualRoom));
await seedLicense(manualRoom);
await post("/api/validate-license-access", { licenseKey: manualRoom });
const firstJoin = await post("/api/join-judge", {
  roomId: manualRoom,
  judgeId: 1,
  name: "Judge Local A",
  sessionId: "local-iphone-session-0001",
});
assert.equal(firstJoin.response.status, 200);
const secondJoin = await post("/api/join-judge", {
  roomId: manualRoom,
  judgeId: 1,
  name: "Judge Local B",
  sessionId: "local-iphone-session-0002",
});
assert.equal(secondJoin.response.status, 409);

const judgeRef = db.collection("matches").doc(manualRoom).collection("judges").doc("1");
const realtimePoints = new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error("REALTIME_POINTS_TIMEOUT")), 5000);
  const unsubscribe = judgeRef.onSnapshot((snapshot) => {
    if (snapshot.data()?.hongPoints === 1) {
      clearTimeout(timeout);
      unsubscribe();
      resolve();
    }
  }, reject);
});
await judgeRef.update({ hongPoints: 1 });
await realtimePoints;

const released = await post("/api/judge-session", {
  action: "release",
  roomId: manualRoom,
  judgeId: 1,
  sessionId: "local-iphone-session-0001",
});
assert.equal(released.response.status, 200);
assert.equal(released.data.code, "SESSION_RELEASED");
const slot = await db.collection("matches").doc(manualRoom).collection("judgeSlots").doc("1").get();
assert.equal(slot.data().status, "released");
assert.equal(slot.data().sessionId, null);
await judgeRef.set(makeInitialJudge(1));

console.log("Local room provisioning integration passed");
console.log(`Manual room ready: ${manualRoom}`);
process.exit(0);
