import { getFirestore } from "firebase-admin/firestore";
import { getFirebaseAdminApp } from "./firebaseAdmin.js";

export async function updateJudgeSession(db, { action, roomId, judgeId, sessionId, now = Date.now() }) {
  const slotRef = db.collection("matches").doc(roomId).collection("judgeSlots").doc(String(judgeId));
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(slotRef);
    const slot = snapshot.exists ? snapshot.data() : null;
    const ownsActiveSlot =
      slot?.status === "online" && Number(slot?.signal) === 1 && slot?.sessionId === sessionId;

    if (!ownsActiveSlot) return { code: "SESSION_INVALID" };
    if (action === "status") {
      transaction.set(slotRef, { lastSeen: now }, { merge: true });
      return { code: "SESSION_ACTIVE" };
    }

    transaction.set(slotRef, {
      name: null, status: "released", signal: 0, sessionId: null, role: null,
      joinedAt: null, lastSeen: null, exitedAt: now, releasedAt: now,
      releasedBy: "judge", judgeId,
    }, { merge: true });
    return { code: "SESSION_RELEASED" };
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
  try {
    const { action, roomId, judgeId, sessionId } = req.body || {};
    const cleanJudgeId = Number(judgeId);
    if (
      !["status", "release"].includes(action) ||
      !/^[A-Za-z0-9_-]{3,120}$/.test(String(roomId || "")) ||
      !Number.isInteger(cleanJudgeId) || cleanJudgeId < 1 || cleanJudgeId > 4 ||
      !/^[A-Za-z0-9-]{16,80}$/.test(String(sessionId || ""))
    ) {
      return res.status(400).json({ ok: false, code: "INVALID_REQUEST" });
    }

    getFirebaseAdminApp();
    const result = await updateJudgeSession(getFirestore(), {
      action, roomId, judgeId: cleanJudgeId, sessionId,
    });
    if (result.code === "SESSION_INVALID") {
      return res.status(409).json({ ok: false, code: result.code });
    }
    return res.status(200).json({ ok: true, code: result.code });
  } catch (error) {
    console.error("JUDGE_SESSION_ERROR", error?.message);
    return res.status(500).json({ ok: false, code: "SERVICE_UNAVAILABLE" });
  }
}
