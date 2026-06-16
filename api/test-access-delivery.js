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
    <div style="margin:0;padding:0;background:#050505;color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;line-height:1.55;">
      <div style="max-width:720px;margin:0 auto;padding:28px 14px;">
        <div style="background:#111111;border:1px solid #2a2a2a;border-radius:14px;overflow:hidden;">
          <div style="background:#080808;border-bottom:3px solid #8b0000;padding:30px 28px;text-align:center;">
            <div style="font-size:28px;font-weight:800;letter-spacing:0.5px;color:#f7d774;">Hwarang Scoring Universe™</div>
            <div style="margin-top:6px;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#b9b9b9;">Professional Event Scoring Technology</div>
          </div>

          <div style="padding:28px;">
            <div style="display:inline-block;background:#8b0000;color:#ffffff;border-radius:4px;padding:8px 12px;font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;">NOVA ACCESS READY</div>

            <h1 style="margin:22px 0 10px;font-size:26px;line-height:1.25;color:#ffffff;">Welcome to Hwarang Scoring Universe™</h1>
            <p style="margin:0 0 16px;color:#d7d7d7;font-size:15px;">Hello ${safeBuyerName},</p>
            <p style="margin:0 0 18px;color:#d7d7d7;font-size:15px;">Your Hwarang Scoring Universe license is active.</p>

            <p style="margin:0 0 22px;color:#c9c9c9;font-size:15px;">Hwarang Scoring Universe™ was created to help organizations deliver more professional, organized, and efficient events. Every tournament represents preparation, commitment, and passion. This platform was designed to support that effort and elevate the experience for athletes, coaches, officials, and spectators.</p>

            <div style="background:#191919;border:1px solid #333333;border-radius:10px;padding:18px 20px;margin:0 0 24px;">
              <div style="font-size:13px;text-transform:uppercase;letter-spacing:1.4px;color:#f7d774;font-weight:800;margin-bottom:12px;">License Details</div>
              <div style="font-size:14px;color:#e7e7e7;">
                <div style="padding:5px 0;border-bottom:1px solid #2a2a2a;"><strong style="color:#ffffff;">Product:</strong> ${safeProduct}</div>
                <div style="padding:5px 0;border-bottom:1px solid #2a2a2a;"><strong style="color:#ffffff;">Package:</strong> ${safePackage}</div>
                <div style="padding:5px 0;border-bottom:1px solid #2a2a2a;"><strong style="color:#ffffff;">Organization:</strong> ${safeOrganization}</div>
                <div style="padding:5px 0;"><strong style="color:#ffffff;">License Key:</strong> <span style="color:#f7d774;">${safeLicenseKey}</span></div>
              </div>
            </div>

            <div style="margin:0 0 22px;">
              <a href="${accessUrls.presidentUrl}" style="display:inline-block;background:#8b0000;color:#ffffff;text-decoration:none;border-radius:6px;padding:12px 18px;font-weight:800;margin:0 8px 10px 0;">President Access</a>
              <a href="${accessUrls.publicUrl}" style="display:inline-block;background:#2b2b2b;color:#f7d774;text-decoration:none;border:1px solid #4a4a4a;border-radius:6px;padding:12px 18px;font-weight:800;margin:0 0 10px 0;">Public TV Access</a>
            </div>

            <div style="background:#0d0d0d;border-left:4px solid #f7d774;padding:16px 18px;margin:0 0 22px;">
              <div style="font-size:13px;text-transform:uppercase;letter-spacing:1.4px;color:#f7d774;font-weight:800;margin-bottom:10px;">Judge Access</div>
              <div style="font-size:14px;color:#dcdcdc;">
                <div style="margin:6px 0;"><strong>Judge 1:</strong> <a href="${accessUrls.judge1Url}" style="color:#f7d774;text-decoration:none;">${accessUrls.judge1Url}</a></div>
                <div style="margin:6px 0;"><strong>Judge 2:</strong> <a href="${accessUrls.judge2Url}" style="color:#f7d774;text-decoration:none;">${accessUrls.judge2Url}</a></div>
                <div style="margin:6px 0;"><strong>Judge 3:</strong> <a href="${accessUrls.judge3Url}" style="color:#f7d774;text-decoration:none;">${accessUrls.judge3Url}</a></div>
                <div style="margin:6px 0;"><strong>Judge 4:</strong> <a href="${accessUrls.judge4Url}" style="color:#f7d774;text-decoration:none;">${accessUrls.judge4Url}</a></div>
              </div>
            </div>

            <p style="margin:0 0 8px;color:#c9c9c9;font-size:14px;">Judges can connect using the URLs provided above or by using the QR codes available inside the platform.</p>
            <p style="margin:0;color:#9f9f9f;font-size:14px;">Please keep this email for your event operations.</p>

            <div style="height:1px;background:#333333;margin:30px 0;"></div>

            <h1 style="margin:0 0 10px;font-size:24px;line-height:1.25;color:#ffffff;">Bienvenido a Hwarang Scoring Universe™</h1>
            <p style="margin:0 0 16px;color:#d7d7d7;font-size:15px;">Hola ${safeBuyerName},</p>
            <p style="margin:0 0 18px;color:#d7d7d7;font-size:15px;">Tu licencia de Hwarang Scoring Universe está activa.</p>

            <p style="margin:0 0 22px;color:#c9c9c9;font-size:15px;">Hwarang Scoring Universe™ fue desarrollado para ayudar a organizaciones de todo el mundo a crear eventos más profesionales, organizados y eficientes. Cada torneo representa preparación, compromiso y pasión. Esta plataforma fue diseñada para acompañar ese esfuerzo y elevar la experiencia de competidores, entrenadores, árbitros y espectadores.</p>

            <div style="background:#191919;border:1px solid #333333;border-radius:10px;padding:18px 20px;margin:0 0 24px;">
              <div style="font-size:13px;text-transform:uppercase;letter-spacing:1.4px;color:#f7d774;font-weight:800;margin-bottom:12px;">Datos de licencia</div>
              <div style="font-size:14px;color:#e7e7e7;">
                <div style="padding:5px 0;border-bottom:1px solid #2a2a2a;"><strong style="color:#ffffff;">Producto:</strong> ${safeProduct}</div>
                <div style="padding:5px 0;border-bottom:1px solid #2a2a2a;"><strong style="color:#ffffff;">Paquete:</strong> ${safePackage}</div>
                <div style="padding:5px 0;border-bottom:1px solid #2a2a2a;"><strong style="color:#ffffff;">Organización:</strong> ${safeOrganization}</div>
                <div style="padding:5px 0;"><strong style="color:#ffffff;">Licencia:</strong> <span style="color:#f7d774;">${safeLicenseKey}</span></div>
              </div>
            </div>

            <div style="margin:0 0 22px;">
              <a href="${accessUrls.presidentUrl}" style="display:inline-block;background:#8b0000;color:#ffffff;text-decoration:none;border-radius:6px;padding:12px 18px;font-weight:800;margin:0 8px 10px 0;">Acceso Presidente</a>
              <a href="${accessUrls.publicUrl}" style="display:inline-block;background:#2b2b2b;color:#f7d774;text-decoration:none;border:1px solid #4a4a4a;border-radius:6px;padding:12px 18px;font-weight:800;margin:0 0 10px 0;">Acceso Public TV</a>
            </div>

            <div style="background:#0d0d0d;border-left:4px solid #f7d774;padding:16px 18px;margin:0 0 22px;">
              <div style="font-size:13px;text-transform:uppercase;letter-spacing:1.4px;color:#f7d774;font-weight:800;margin-bottom:10px;">Acceso de jueces</div>
              <div style="font-size:14px;color:#dcdcdc;">
                <div style="margin:6px 0;"><strong>Juez 1:</strong> <a href="${accessUrls.judge1Url}" style="color:#f7d774;text-decoration:none;">${accessUrls.judge1Url}</a></div>
                <div style="margin:6px 0;"><strong>Juez 2:</strong> <a href="${accessUrls.judge2Url}" style="color:#f7d774;text-decoration:none;">${accessUrls.judge2Url}</a></div>
                <div style="margin:6px 0;"><strong>Juez 3:</strong> <a href="${accessUrls.judge3Url}" style="color:#f7d774;text-decoration:none;">${accessUrls.judge3Url}</a></div>
                <div style="margin:6px 0;"><strong>Juez 4:</strong> <a href="${accessUrls.judge4Url}" style="color:#f7d774;text-decoration:none;">${accessUrls.judge4Url}</a></div>
              </div>
            </div>

            <p style="margin:0 0 8px;color:#c9c9c9;font-size:14px;">Los jueces pueden conectarse mediante las URLs proporcionadas o utilizando los códigos QR disponibles dentro de la plataforma.</p>
            <p style="margin:0;color:#9f9f9f;font-size:14px;">Conserva este correo para la operación de tu evento.</p>
          </div>
        </div>
      </div>
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
