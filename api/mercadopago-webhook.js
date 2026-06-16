import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

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

function removeUndefinedValues(value) {
  if (Array.isArray(value)) {
    return value.map(removeUndefinedValues);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([entryKey, entryValue]) => [
          entryKey,
          removeUndefinedValues(entryValue),
        ])
    );
  }

  return value;
}

function getPaymentId(req) {
  return (
    req.body?.data?.id ||
    req.body?.id ||
    req.query?.["data.id"] ||
    req.query?.id ||
    null
  );
}

function isPaymentNotification(req) {
  const notificationType = req.body?.type || req.body?.topic || req.query?.topic;
  return !notificationType || notificationType === "payment";
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

async function getMercadoPagoPayment(paymentId) {
  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/${paymentId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }

    throw new Error(
      `Mercado Pago payment fetch failed: ${JSON.stringify(data)}`
    );
  }

  return data;
}

function buildLicenseDocument({ checkout, checkoutId, payment }) {
  const now = new Date().toISOString();
  const activationPlan = checkout.activationPlan || {};
  const accessUrls = buildAccessUrls(checkout.licenseKey);

  return removeUndefinedValues({
    licenseKey: checkout.licenseKey,
    checkoutId,

    product: checkout.product,
    package: checkout.package,
    organization: checkout.organization,
    buyerName: checkout.buyerName,
    country: checkout.country,
    email: checkout.email,

    status: "active",
    paymentStatus: "approved",
    licenseStatus: "active",
    activationStatus: "active",

    validityType: activationPlan.validityType,
    durationDays: activationPlan.durationDays,
    activatedAt: now,
    createdAt: now,
    updatedAt: now,

    requestedActivationDate: activationPlan.requestedActivationDate,
    estimatedExpirationDate: activationPlan.estimatedExpirationDate,
    expiresAt: activationPlan.estimatedExpirationDate,

    creditsTotal: activationPlan.creditsTotal,
    creditsUsed: activationPlan.creditsUsed,
    creditsRemaining: activationPlan.creditsRemaining,

    deliveryMethod: "email",
    deliveryStatus: "pending",
    accessUrls,

    mercadoPago: {
      paymentId: String(payment.id),
      status: payment.status,
      statusDetail: payment.status_detail,
      externalReference: payment.external_reference,
      transactionAmount: payment.transaction_amount,
      currencyId: payment.currency_id,
      dateApproved: payment.date_approved,
    },
  });
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      endpoint: "mercadopago-webhook",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    if (!process.env.MP_ACCESS_TOKEN) {
      return res.status(500).json({
        error: "MP_ACCESS_TOKEN is not configured",
      });
    }

    if (!isPaymentNotification(req)) {
      return res.status(200).json({
        ok: true,
        ignored: true,
        reason: "Notification type is not payment",
      });
    }

    const paymentId = getPaymentId(req);

    if (!paymentId) {
      return res.status(200).json({
        ok: true,
        ignored: true,
        reason: "Payment id not found",
      });
    }

    const payment = await getMercadoPagoPayment(paymentId);

    if (!payment) {
      return res.status(200).json({
        ok: true,
        ignored: true,
        paymentId,
        reason: "Payment not found",
      });
    }

    if (payment.status !== "approved") {
      return res.status(200).json({
        ok: true,
        ignored: true,
        paymentId,
        status: payment.status,
      });
    }

    const checkoutId = payment.external_reference;

    if (!checkoutId) {
      return res.status(200).json({
        ok: true,
        ignored: true,
        reason: "External reference not found",
        paymentId,
      });
    }

    getFirebaseAdminApp();
    const db = getFirestore();

    const checkoutRef = db.collection("checkoutRequests").doc(checkoutId);

    const activation = await db.runTransaction(async (transaction) => {
      const checkoutSnapshot = await transaction.get(checkoutRef);

      if (!checkoutSnapshot.exists) {
        throw new Error(`Checkout request not found: ${checkoutId}`);
      }

      const checkout = checkoutSnapshot.data();

      if (!checkout.licenseKey) {
        throw new Error(`Checkout request has no license key: ${checkoutId}`);
      }

      const now = new Date().toISOString();
      const licenseRef = db.collection("licenses").doc(checkout.licenseKey);
      const licenseDocument = buildLicenseDocument({
        checkout,
        checkoutId,
        payment,
      });

      transaction.set(
        checkoutRef,
        removeUndefinedValues({
          status: "completed",
          paymentStatus: "approved",
          licenseStatus: "active",
          activationStatus: "active",
          paidAt: now,
          updatedAt: now,
          mercadoPagoPaymentId: String(payment.id),
          mercadoPagoStatus: payment.status,
          mercadoPagoStatusDetail: payment.status_detail,
          mercadoPagoDateApproved: payment.date_approved,
          webhookProcessedAt: FieldValue.serverTimestamp(),
        }),
        { merge: true }
      );

      transaction.set(licenseRef, licenseDocument, { merge: true });

      return {
        checkout,
        licenseKey: checkout.licenseKey,
      };
    });

    let deliveryStatus = "not-attempted";

    try {
      const accessUrls = buildAccessUrls(activation.licenseKey);
      await sendAccessDeliveryEmail({
        checkout: activation.checkout,
        accessUrls,
      });

      await db
        .collection("licenses")
        .doc(activation.licenseKey)
        .set(
          removeUndefinedValues({
            deliveryMethod: "email",
            deliveryStatus: "sent",
            deliverySentAt: new Date().toISOString(),
            deliveryError: null,
            accessUrls,
          }),
          { merge: true }
        );

      deliveryStatus = "sent";
    } catch (deliveryError) {
      console.error("ACCESS_DELIVERY_EMAIL_ERROR", deliveryError);

      deliveryStatus = "failed";

      try {
        await db
          .collection("licenses")
          .doc(activation.licenseKey)
          .set(
            removeUndefinedValues({
              deliveryMethod: "email",
              deliveryStatus: "failed",
              deliveryError: deliveryError.message,
              accessUrls: buildAccessUrls(activation.licenseKey),
            }),
            { merge: true }
          );
      } catch (deliveryTrackingError) {
        console.error("ACCESS_DELIVERY_TRACKING_ERROR", deliveryTrackingError);
      }
    }

    return res.status(200).json({
      ok: true,
      paymentId,
      checkoutId,
      status: "approved",
      deliveryStatus,
    });
  } catch (error) {
    console.error("MERCADO_PAGO_WEBHOOK_ERROR", error);

    return res.status(500).json({
      error: "Webhook processing failed",
      detail: error.message,
    });
  }
}
