import { getFirestore } from "firebase-admin/firestore";
import { getFirebaseAdminApp } from "./firebaseAdmin.js";
import { makeInitialJudge } from "./roomProvisioning.js";

const MAX_JUDGES = 5;
const DEMO_LIMIT_MS = 10 * 60 * 1000;

function validRoomId(value) {
  return /^[A-Za-z0-9_-]{3,120}$/.test(String(value || ""));
}

function preserveDemoLimit(current, next) {
  if (!String(current?.roomId || "").startsWith("demo-hsu-")) return next;
  const previous = current.data?.demoLimit || {};
  const proposed = next.demoLimit || {};
  next.demoLimit = {
    ...proposed,
    totalMs: DEMO_LIMIT_MS,
    usedMs: Math.max(Number(previous.usedMs || 0), Number(proposed.usedMs || 0)),
    startedAt: proposed.startedAt ?? null,
    expired: Boolean(previous.expired || proposed.expired),
  };
  return next;
}

async function ownsJudgeSlot(transaction, matchRef, judgeId, sessionId) {
  const slot = await transaction.get(matchRef.collection("judgeSlots").doc(String(judgeId)));
  const data = slot.exists ? slot.data() : null;
  return data?.status === "online" && Number(data?.signal) === 1 && data?.sessionId === sessionId;
}

export async function applyCombatState(db, payload, now = Date.now()) {
  const { action, roomId } = payload;
  const matchRef = db.collection("matches").doc(roomId);

  return db.runTransaction(async (transaction) => {
    const matchSnapshot = await transaction.get(matchRef);
    if (!matchSnapshot.exists) return { code: "ROOM_NOT_FOUND" };

    if (action === "ensure") {
      const judgeRefs = Array.from({ length: MAX_JUDGES }, (_, i) =>
        matchRef.collection("judges").doc(String(i + 1))
      );
      const snapshots = await Promise.all(judgeRefs.map((ref) => transaction.get(ref)));
      snapshots.forEach((snapshot, i) => {
        if (!snapshot.exists) transaction.create(judgeRefs[i], makeInitialJudge(i + 1));
      });
      return { code: "READY" };
    }

    if (action === "write-meta") {
      if (!payload.meta || typeof payload.meta !== "object" || Array.isArray(payload.meta)) {
        return { code: "INVALID_REQUEST" };
      }
      const next = preserveDemoLimit(
        { roomId, data: matchSnapshot.data() },
        { ...payload.meta, updatedAt: now }
      );
      transaction.set(matchRef, next);
      return { code: "UPDATED" };
    }

    if (action === "reset") {
      if (!payload.meta || typeof payload.meta !== "object" || Array.isArray(payload.meta)) {
        return { code: "INVALID_REQUEST" };
      }
      const next = preserveDemoLimit(
        { roomId, data: matchSnapshot.data() },
        { ...payload.meta, updatedAt: now }
      );
      transaction.set(matchRef, next);
      for (let i = 1; i <= MAX_JUDGES; i += 1) {
        transaction.set(matchRef.collection("judges").doc(String(i)), makeInitialJudge(i));
      }
      return { code: "RESET" };
    }

    const judgeId = Number(payload.judgeId);
    if (!Number.isInteger(judgeId) || judgeId < 1 || judgeId > MAX_JUDGES) {
      return { code: "INVALID_REQUEST" };
    }

    if (action === "write-judge") {
      if (payload.actor === "judge" && !await ownsJudgeSlot(transaction, matchRef, judgeId, payload.sessionId)) {
        return { code: "SESSION_INVALID" };
      }
      if (!payload.judge || typeof payload.judge !== "object" || Array.isArray(payload.judge)) {
        return { code: "INVALID_REQUEST" };
      }
      transaction.set(matchRef.collection("judges").doc(String(judgeId)), payload.judge);
      return { code: "UPDATED" };
    }

    if (action === "force-release") {
      transaction.set(matchRef.collection("judgeSlots").doc(String(judgeId)), {
        name: null, status: "released", signal: 0, sessionId: null, role: null,
        joinedAt: null, lastSeen: null, exitedAt: now, releasedAt: now,
        releasedBy: "president", judgeId,
      }, { merge: true });
      return { code: "RELEASED" };
    }

    return { code: "INVALID_REQUEST" };
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
  try {
    const payload = req.body || {};
    if (!validRoomId(payload.roomId) || !["ensure", "write-meta", "write-judge", "reset", "force-release"].includes(payload.action)) {
      return res.status(400).json({ ok: false, code: "INVALID_REQUEST" });
    }
    getFirebaseAdminApp();
    const result = await applyCombatState(getFirestore(), payload);
    const status = result.code === "ROOM_NOT_FOUND" ? 404
      : result.code === "SESSION_INVALID" ? 409
      : result.code === "INVALID_REQUEST" ? 400 : 200;
    return res.status(status).json({ ok: status === 200, code: result.code });
  } catch (error) {
    console.error("COMBAT_STATE_ERROR", error?.message);
    return res.status(500).json({ ok: false, code: "SERVICE_UNAVAILABLE" });
  }
}
