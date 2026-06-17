import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getFirebaseAdminApp() {
  if (getApps().length) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin environment variables are not configured");
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

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

    return res.status(200).json({
      ok: true,
      status: "valid",
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
