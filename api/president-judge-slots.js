import { getFirestore } from "firebase-admin/firestore";
import { getFirebaseAdminApp } from "./firebaseAdmin.js";

const VISIBLE_SLOT_FIELDS = Object.freeze([
  "judgeId", "name", "status", "signal", "joinedAt", "lastSeen",
  "exitedAt", "releasedAt", "releasedBy",
]);

function validRoomId(value) {
  return /^[A-Za-z0-9_-]{3,120}$/.test(String(value || ""));
}

export function sanitizeJudgeSlot(raw = {}, fallbackJudgeId = null) {
  const safe = {};
  for (const field of VISIBLE_SLOT_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(raw, field)) safe[field] = raw[field];
  }
  safe.judgeId = Number.isInteger(Number(safe.judgeId))
    ? Number(safe.judgeId)
    : Number(fallbackJudgeId);
  return safe;
}

export async function readSanitizedJudgeSlots(db, roomId) {
  const matchRef = db.collection("matches").doc(roomId);
  const matchSnapshot = await matchRef.get();
  if (!matchSnapshot.exists || matchSnapshot.data()?.mode !== "combat") {
    return { code: "ROOM_NOT_FOUND", slots: [] };
  }

  const snapshot = await matchRef.collection("judgeSlots").get();
  return {
    code: "OK",
    slots: snapshot.docs.map((doc) => sanitizeJudgeSlot(doc.data(), doc.id)),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
  }
  try {
    const roomId = String(req.body?.roomId || "");
    if (!validRoomId(roomId)) {
      return res.status(400).json({ ok: false, code: "INVALID_REQUEST" });
    }
    getFirebaseAdminApp();
    const result = await readSanitizedJudgeSlots(getFirestore(), roomId);
    if (result.code === "ROOM_NOT_FOUND") {
      return res.status(404).json({ ok: false, code: result.code });
    }
    return res.status(200).json({ ok: true, slots: result.slots });
  } catch (error) {
    console.error("PRESIDENT_JUDGE_SLOTS_ERROR", error?.message);
    return res.status(500).json({ ok: false, code: "SERVICE_UNAVAILABLE" });
  }
}
