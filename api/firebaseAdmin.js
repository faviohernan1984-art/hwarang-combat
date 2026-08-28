/* global process */
import { cert, getApps, initializeApp } from "firebase-admin/app";

export function isIsolatedLocalTest() {
  return (
    process.env.VERCEL_ENV === "development" &&
    process.env.HSU_LOCAL_ISOLATED_TEST === "1" &&
    Boolean(process.env.FIRESTORE_EMULATOR_HOST)
  );
}

export function getFirebaseAdminApp() {
  if (getApps().length) return getApps()[0];

  if (isIsolatedLocalTest()) {
    return initializeApp({
      projectId: "hwarang-local-test",
    });
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (projectId !== "hwarang-scoring" || !clientEmail || !privateKey) {
    throw new Error("FIREBASE_ADMIN_NOT_CONFIGURED");
  }

  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}
