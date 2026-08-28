import { getFirestore } from "firebase-admin/firestore";
import { getFirebaseAdminApp } from "./firebaseAdmin.js";

function isValidRoomId(value) {
  return /^[A-Za-z0-9_-]{3,120}$/.test(String(value || ""));
}

function isValidSessionId(value) {
  return /^[A-Za-z0-9-]{16,80}$/.test(String(value || ""));
}

export async function reserveJudgeSlot(db, { roomId, judgeId, name, sessionId, now = Date.now() }) {
  const matchRef = db.collection("matches").doc(roomId);
  const slotRef = matchRef.collection("judgeSlots").doc(String(judgeId));

  return db.runTransaction(async (transaction) => {
    const matchSnapshot = await transaction.get(matchRef);
    if (!matchSnapshot.exists) return { code: "ROOM_NOT_FOUND" };

    const slotSnapshot = await transaction.get(slotRef);
    const slot = slotSnapshot.exists ? slotSnapshot.data() : null;
    if (slot?.status === "online" && Number(slot?.signal) === 1) {
      if (slot.sessionId === sessionId) return { code: "JOINED" };
      return { code: "SLOT_OCCUPIED" };
    }

    transaction.set(slotRef, {
      name,
      status: "online",
      signal: 1,
      sessionId,
      joinedAt: now,
      lastSeen: now,
      exitedAt: null,
      releasedAt: null,
      releasedBy: null,
      role: "judge",
      judgeId,
    }, { merge: true });

    return { code: "JOINED" };
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  try {
    const { roomId, judgeId, name, sessionId } = req.body || {};
    const cleanName = String(name || "").trim();
    const cleanJudgeId = Number(judgeId);

    if (
      !isValidRoomId(roomId) ||
      !Number.isInteger(cleanJudgeId) ||
      cleanJudgeId < 1 ||
      cleanJudgeId > 4 ||
      !cleanName ||
      cleanName.length > 80 ||
      !isValidSessionId(sessionId)
    ) {
      return res.status(400).json({ ok: false, code: "INVALID_REQUEST" });
    }

    getFirebaseAdminApp();
    const db = getFirestore();
    const result = await reserveJudgeSlot(db, {
      roomId,
      judgeId: cleanJudgeId,
      name: cleanName,
      sessionId,
    });

    if (result.code === "ROOM_NOT_FOUND") {
      return res.status(404).json({ ok: false, code: result.code });
    }
    if (result.code === "SLOT_OCCUPIED") {
      return res.status(409).json({ ok: false, code: result.code });
    }
    return res.status(200).json({ ok: true, code: "JOINED" });
  } catch (error) {
    console.error("JOIN_JUDGE_ERROR", error?.message);
    const configurationError = error?.message === "FIREBASE_ADMIN_NOT_CONFIGURED";
    const permissionDenied = error?.code === 7 || error?.code === "permission-denied";
    return res.status(500).json({
      ok: false,
      code: configurationError
        ? "SERVICE_CONFIGURATION_ERROR"
        : permissionDenied
        ? "PERMISSION_DENIED"
        : "SERVICE_UNAVAILABLE",
    });
  }
}
