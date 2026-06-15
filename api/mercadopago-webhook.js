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
    throw new Error(
      `Mercado Pago payment fetch failed: ${JSON.stringify(data)}`
    );
  }

  return data;
}

function buildLicenseDocument({ checkout, checkoutId, payment }) {
  const now = new Date().toISOString();
  const activationPlan = checkout.activationPlan || {};

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

    await db.runTransaction(async (transaction) => {
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
    });

    return res.status(200).json({
      ok: true,
      paymentId,
      checkoutId,
      status: "approved",
    });
  } catch (error) {
    console.error("MERCADO_PAGO_WEBHOOK_ERROR", error);

    return res.status(500).json({
      error: "Webhook processing failed",
      detail: error.message,
    });
  }
}
