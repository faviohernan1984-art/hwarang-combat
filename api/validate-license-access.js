import { getFirestore } from "firebase-admin/firestore";
import { getFirebaseAdminApp } from "./firebaseAdmin.js";
import { ensureCommercialRoom } from "./roomProvisioning.js";

function parseExpiresAt(expiresAt) {
  if (!expiresAt) return NaN;

  if (typeof expiresAt?.toDate === "function") {
    return expiresAt.toDate().getTime();
  }

  return new Date(expiresAt).getTime();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      status: "invalid",
      reason: "method-not-allowed",
    });
  }

  try {
    const { licenseKey } = req.body || {};

    if (!licenseKey || typeof licenseKey !== "string") {
      return res.status(400).json({
        ok: false,
        status: "invalid",
        reason: "missing-license-key",
      });
    }

    getFirebaseAdminApp();
    const db = getFirestore();
    const licenseSnapshot = await db.collection("licenses").doc(licenseKey).get();

    if (!licenseSnapshot.exists) {
      return res.status(200).json({
        ok: false,
        status: "invalid",
        reason: "not-found",
      });
    }

    const license = licenseSnapshot.data();
    const hasValidStatus =
      license?.paymentStatus === "approved" &&
      license?.activationStatus === "active" &&
      license?.licenseStatus === "active";

    if (!hasValidStatus) {
      return res.status(200).json({
        ok: false,
        status: "invalid",
        reason: "invalid-status",
      });
    }

    const expiresAtMs = parseExpiresAt(license?.expiresAt);

    if (!Number.isFinite(expiresAtMs)) {
      return res.status(200).json({
        ok: false,
        status: "invalid",
        reason: "invalid-expiration",
      });
    }

    if (expiresAtMs <= Date.now()) {
      return res.status(200).json({
        ok: false,
        status: "expired",
        reason: "expired",
      });
    }

    await ensureCommercialRoom(db, licenseKey);

    return res.status(200).json({
      ok: true,
      status: "valid",
      roomReady: true,
    });
  } catch (error) {
    console.error("VALIDATE_LICENSE_ACCESS_ERROR", error);

    return res.status(500).json({
      ok: false,
      status: "invalid",
      reason: "server-error",
    });
  }
}
