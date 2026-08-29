import { randomBytes } from "node:crypto";
import { getFirestore } from "firebase-admin/firestore";
import { getFirebaseAdminApp } from "./firebaseAdmin.js";
import { createDemoRoom } from "./roomProvisioning.js";

function makeDemoRoomId() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(5);
  return `demo-hsu-${Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("")}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  try {
    getFirebaseAdminApp();
    const db = getFirestore();
    const requestedRoomId = String(req.body?.roomId || "");

    if (/^demo-hsu-[a-z0-9]{5}$/.test(requestedRoomId)) {
      const existing = await db.collection("matches").doc(requestedRoomId).get();
      const existingData = existing.exists ? existing.data() : null;
      if (
        existingData?.mode === "combat" &&
        Number(existingData?.demoLimit?.totalMs) === 10 * 60 * 1000
      ) {
        const result = await createDemoRoom(db, requestedRoomId);
        if (result.compatible) {
          return res.status(200).json({ ok: true, roomId: requestedRoomId, created: false });
        }
      }
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const roomId = makeDemoRoomId();
      const result = await createDemoRoom(db, roomId);
      if (result.created) return res.status(201).json({ ok: true, roomId, created: true });
    }

    return res.status(503).json({ ok: false, code: "DEMO_PROVISIONING_FAILED" });
  } catch (error) {
    console.error("CREATE_DEMO_ERROR", error?.message);
    return res.status(500).json({ ok: false, code: "SERVICE_UNAVAILABLE" });
  }
}
