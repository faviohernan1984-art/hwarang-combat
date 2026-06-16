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

function buildAccessUrls(licenseKey) {
  const baseUrl = "https://www.hwarangscoring.org";
  const roomId = licenseKey;

  return {
    presidentUrl: `${baseUrl}/president/${roomId}`,
    publicUrl: `${baseUrl}/public/${roomId}`,
    judge1Url: `${baseUrl}/join/${roomId}/judge/1`,
    judge2Url: `${baseUrl}/join/${roomId}/judge/2`,
    judge3Url: `${baseUrl}/join/${roomId}/judge/3`,
    judge4Url: `${baseUrl}/join/${roomId}/judge/4`,
  };
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildAccessDeliveryEmail({ checkout, accessUrls }) {
  const buyerName = checkout.buyerName || "Hwarang client";
  const organization = checkout.organization || "your organization";
  const licenseKey = checkout.licenseKey;
  const product = checkout.product || "Hwarang Scoring Universe";
  const selectedPackage = checkout.package || "Standard";

  const text = `
Welcome to Hwarang Scoring Universe™

Hello ${buyerName},

Your Hwarang Scoring Universe license is active.

Hwarang Scoring Universe™ was created to help organizations deliver more professional, organized, and efficient events. Every tournament represents preparation, commitment, and passion. This platform was designed to support that effort and elevate the experience for athletes, coaches, officials, and spectators.

Product: ${product}
Package: ${selectedPackage}
Organization: ${organization}
License Key: ${licenseKey}

Official access URLs:
President Access: ${accessUrls.presidentUrl}
Public TV Access: ${accessUrls.publicUrl}
Judge 1: ${accessUrls.judge1Url}
Judge 2: ${accessUrls.judge2Url}
Judge 3: ${accessUrls.judge3Url}
Judge 4: ${accessUrls.judge4Url}

Judges can connect using the URLs provided above or by using the QR codes available inside the platform.

Please keep this email for your event operations.

---

Bienvenido a Hwarang Scoring Universe™

Hola ${buyerName},

Tu licencia de Hwarang Scoring Universe está activa.

Hwarang Scoring Universe™ fue desarrollado para ayudar a organizaciones de todo el mundo a crear eventos más profesionales, organizados y eficientes. Cada torneo representa preparación, compromiso y pasión. Esta plataforma fue diseñada para acompañar ese esfuerzo y elevar la experiencia de competidores, entrenadores, árbitros y espectadores.

Producto: ${product}
Paquete: ${selectedPackage}
Organización: ${organization}
Licencia: ${licenseKey}

URLs oficiales de acceso:
Acceso Presidente: ${accessUrls.presidentUrl}
Acceso Public TV: ${accessUrls.publicUrl}
Juez 1: ${accessUrls.judge1Url}
Juez 2: ${accessUrls.judge2Url}
Juez 3: ${accessUrls.judge3Url}
Juez 4: ${accessUrls.judge4Url}

Los jueces pueden conectarse mediante las URLs proporcionadas o utilizando los códigos QR disponibles dentro de la plataforma.

Conserva este correo para la operación de tu evento.
`.trim();

  const safeBuyerName = escapeHtml(buyerName);
  const safeOrganization = escapeHtml(organization);
  const safeLicenseKey = escapeHtml(licenseKey);
  const safeProduct = escapeHtml(product);
  const safePackage = escapeHtml(selectedPackage);

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.55;">
      <h1>Welcome to Hwarang Scoring Universe™</h1>
      <p>Hello ${safeBuyerName},</p>
      <p>Your Hwarang Scoring Universe license is active.</p>

      <p>Hwarang Scoring Universe™ was created to help organizations deliver more professional, organized, and efficient events. Every tournament represents preparation, commitment, and passion. This platform was designed to support that effort and elevate the experience for athletes, coaches, officials, and spectators.</p>

      <p><strong>Product:</strong> ${safeProduct}<br />
      <strong>Package:</strong> ${safePackage}<br />
      <strong>Organization:</strong> ${safeOrganization}<br />
      <strong>License Key:</strong> ${safeLicenseKey}</p>

      <h2>Official access URLs</h2>
      <ul>
        <li><strong>President Access:</strong> <a href="${accessUrls.presidentUrl}">${accessUrls.presidentUrl}</a></li>
        <li><strong>Public TV Access:</strong> <a href="${accessUrls.publicUrl}">${accessUrls.publicUrl}</a></li>
        <li><strong>Judge 1:</strong> <a href="${accessUrls.judge1Url}">${accessUrls.judge1Url}</a></li>
        <li><strong>Judge 2:</strong> <a href="${accessUrls.judge2Url}">${accessUrls.judge2Url}</a></li>
        <li><strong>Judge 3:</strong> <a href="${accessUrls.judge3Url}">${accessUrls.judge3Url}</a></li>
        <li><strong>Judge 4:</strong> <a href="${accessUrls.judge4Url}">${accessUrls.judge4Url}</a></li>
      </ul>

      <p>Judges can connect using the URLs provided above or by using the QR codes available inside the platform.</p>
      <p>Please keep this email for your event operations.</p>

      <hr />

      <h1>Bienvenido a Hwarang Scoring Universe™</h1>
      <p>Hola ${safeBuyerName},</p>
      <p>Tu licencia de Hwarang Scoring Universe está activa.</p>

      <p>Hwarang Scoring Universe™ fue desarrollado para ayudar a organizaciones de todo el mundo a crear eventos más profesionales, organizados y eficientes. Cada torneo representa preparación, compromiso y pasión. Esta plataforma fue diseñada para acompañar ese esfuerzo y elevar la experiencia de competidores, entrenadores, árbitros y espectadores.</p>

      <p><strong>Producto:</strong> ${safeProduct}<br />
      <strong>Paquete:</strong> ${safePackage}<br />
      <strong>Organización:</strong> ${safeOrganization}<br />
      <strong>Licencia:</strong> ${safeLicenseKey}</p>

      <h2>URLs oficiales de acceso</h2>
      <ul>
        <li><strong>Acceso Presidente:</strong> <a href="${accessUrls.presidentUrl}">${accessUrls.presidentUrl}</a></li>
        <li><strong>Acceso Public TV:</strong> <a href="${accessUrls.publicUrl}">${accessUrls.publicUrl}</a></li>
        <li><strong>Juez 1:</strong> <a href="${accessUrls.judge1Url}">${accessUrls.judge1Url}</a></li>
        <li><strong>Juez 2:</strong> <a href="${accessUrls.judge2Url}">${accessUrls.judge2Url}</a></li>
        <li><strong>Juez 3:</strong> <a href="${accessUrls.judge3Url}">${accessUrls.judge3Url}</a></li>
        <li><strong>Juez 4:</strong> <a href="${accessUrls.judge4Url}">${accessUrls.judge4Url}</a></li>
      </ul>

      <p>Los jueces pueden conectarse mediante las URLs proporcionadas o utilizando los códigos QR disponibles dentro de la plataforma.</p>
      <p>Conserva este correo para la operación de tu evento.</p>
    </div>
  `;

  return {
    subject: "Welcome to Hwarang Scoring Universe™ | Bienvenido a Hwarang Scoring Universe™",
    text,
    html,
  };
}

async function sendAccessDeliveryEmail({ checkout, accessUrls }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  if (!process.env.RESEND_FROM_EMAIL) {
    throw new Error("RESEND_FROM_EMAIL is not configured");
  }

  const email = buildAccessDeliveryEmail({ checkout, accessUrls });
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: checkout.email,
      subject: email.subject,
      text: email.text,
      html: email.html,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Resend email failed: ${JSON.stringify(data)}`);
  }

  return data;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { licenseKey, token } = req.body || {};
    const expectedToken = process.env.TEST_ACCESS_DELIVERY_TOKEN;
    const receivedToken = req.headers?.["x-test-access-delivery-token"] || token;

    if (!expectedToken) {
      return res.status(500).json({
        error: "TEST_ACCESS_DELIVERY_TOKEN is not configured",
      });
    }

    if (receivedToken !== expectedToken) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    if (!licenseKey) {
      return res.status(400).json({
        error: "licenseKey is required",
      });
    }

    getFirebaseAdminApp();
    const db = getFirestore();
    const licenseSnapshot = await db.collection("licenses").doc(licenseKey).get();

    if (!licenseSnapshot.exists) {
      return res.status(404).json({
        error: "License not found",
      });
    }

    const license = licenseSnapshot.data();
    const checkout = {
      ...license,
      licenseKey: license.licenseKey || licenseKey,
    };
    const accessUrls = buildAccessUrls(checkout.licenseKey);

    await sendAccessDeliveryEmail({
      checkout,
      accessUrls,
    });

    return res.status(200).json({
      ok: true,
    });
  } catch (error) {
    console.error("TEST_ACCESS_DELIVERY_ERROR", error);

    return res.status(500).json({
      error: "Test access delivery failed",
      detail: error.message,
    });
  }
}
