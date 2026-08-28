import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
const projectId = "hwarang-local-test";
const roomId = "demo-hsu-local01";
const db = getFirestore(initializeApp({ projectId }, "local-seed"));
const batch = db.batch();

batch.set(db.collection("matches").doc(roomId), {
  mode: "combat",
  status: "paused",
  localFixture: true,
  createdAt: Date.now(),
  demoLimit: { totalMs: 600000, usedMs: 0, expired: false },
});

for (let judgeId = 1; judgeId <= 4; judgeId += 1) {
  batch.set(
    db.collection("matches").doc(roomId).collection("judgeSlots").doc(String(judgeId)),
    {
      name: null,
      status: "released",
      signal: 0,
      sessionId: null,
      role: null,
      joinedAt: null,
      lastSeen: null,
      exitedAt: null,
      releasedAt: null,
      releasedBy: "local-seed",
      judgeId,
    }
  );
}

for (let judgeId = 1; judgeId <= 5; judgeId += 1) {
  batch.set(
    db.collection("matches").doc(roomId).collection("judges").doc(String(judgeId)),
    { id: judgeId, hongPoints: 0, chongPoints: 0, gpDecision: null, history: [] }
  );
}

await batch.commit();
console.log(`Local Firestore fixture ready: ${roomId}`);
process.exit(0);
