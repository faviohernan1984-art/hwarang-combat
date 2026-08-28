/* global process */
import { getFirestore } from "firebase-admin/firestore";
import { buildActivationPlan, resolveCommercialProduct } from "../src/commercialCatalog.js";
import { getFirebaseAdminApp, isIsolatedLocalTest } from "./firebaseAdmin.js";

const PRODUCTION_URL = "https://www.hwarangscoring.org";

function generateLicenseKey(product) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < 6; index += 1) code += chars[Math.floor(Math.random() * chars.length)];
  return `HSU-TKD-${product.toUpperCase()}-${new Date().getFullYear()}-${code}`;
}

function isValidCheckoutId(value) {
  return /^checkout-\d{10,}-[a-z0-9]{6,20}$/.test(String(value || ""));
}

function cleanRequiredText(value, maxLength) {
  const clean = String(value || "").trim();
  return clean && clean.length <= maxLength ? clean : null;
}

async function getUsdToArsRate() {
  let rate = Number(process.env.USD_TO_ARS_RATE || 0);
  let source = "env-fallback";
  try {
    const response = await fetch("https://dolarapi.com/v1/dolares/blue");
    const data = await response.json();
    if (response.ok && Number(data?.venta) > 0) {
      rate = Number(data.venta);
      source = "dolarapi-blue-venta";
    }
  } catch (error) {
    console.error("USD_TO_ARS_RATE_FETCH_ERROR", error?.message);
  }
  if (!Number.isFinite(rate) || rate <= 0) {
    rate = 1200;
    source = "hardcoded-fallback";
  }
  return { rate, source };
}

async function readJsonResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error("MERCADO_PAGO_INVALID_RESPONSE");
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { checkoutId, product, package: selectedPackage, email, buyerName, organization, country, simulationScenario } = req.body || {};
    const plan = resolveCommercialProduct(product, selectedPackage);
    const cleanBuyerName = cleanRequiredText(buyerName, 120);
    const cleanOrganization = cleanRequiredText(organization, 160);
    const cleanCountry = cleanRequiredText(country, 80);
    const cleanEmail = cleanRequiredText(email, 254);

    if (!isValidCheckoutId(checkoutId) || !plan) {
      return res.status(400).json({ error: "Invalid product or package" });
    }
    if (!cleanBuyerName || !cleanOrganization || !cleanCountry || !cleanEmail) {
      return res.status(400).json({ error: "Missing or invalid checkout data" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: "Invalid email address" });
    }
    const simulationEnabled =
      isIsolatedLocalTest() && process.env.HSU_PAYMENT_SIMULATION === "1";
    if (!simulationEnabled && !process.env.MP_ACCESS_TOKEN) {
      return res.status(500).json({ error: "Payment service is not configured" });
    }

    getFirebaseAdminApp();
    const db = getFirestore();
    const checkoutRef = db.collection("checkoutRequests").doc(checkoutId);
    const existing = await checkoutRef.get();
    if (existing.exists) {
      const saved = existing.data();
      if (saved.product !== plan.product || saved.package !== plan.package || saved.email !== cleanEmail) {
        return res.status(409).json({ error: "Checkout request conflict" });
      }
      if (saved.preferenceInitPoint) {
        return res.status(200).json({ preferenceId: saved.preferenceId, initPoint: saved.preferenceInitPoint });
      }
      return res.status(409).json({ error: "Checkout request is already processing" });
    }

    const licenseKey = generateLicenseKey(plan.product);
    const activationPlan = buildActivationPlan(plan);
    const { rate: usdToArsRate, source: exchangeRateSource } = simulationEnabled
      ? { rate: 1000, source: "local-simulation" }
      : await getUsdToArsRate();
    const priceArs = Math.round(plan.priceUsd * usdToArsRate);
    const now = new Date().toISOString();
    try {
      await checkoutRef.create({
        id: checkoutId, licenseKey, product: plan.product, package: plan.package,
        productName: plan.name, currency: plan.currency, regularPrice: plan.regularPriceUsd,
        discountPercent: plan.discountPercent, discountAmount: plan.regularPriceUsd - plan.priceUsd,
        finalPrice: plan.priceUsd, priceArs, usdToArsRate, exchangeRateSource,
        buyerName: cleanBuyerName, organization: cleanOrganization, country: cleanCountry,
        email: cleanEmail, status: "creating-preference", paymentStatus: "pending",
        licenseStatus: "not-created", activationStatus: "waiting-payment", activationPlan,
        createdAt: now, updatedAt: now,
      });
    } catch (error) {
      if (error?.code !== 6 && error?.code !== "already-exists") throw error;
      const concurrent = (await checkoutRef.get()).data();
      if (concurrent?.preferenceInitPoint) {
        return res.status(200).json({
          preferenceId: concurrent.preferenceId,
          initPoint: concurrent.preferenceInitPoint,
        });
      }
      return res.status(409).json({ error: "Checkout request is already processing" });
    }

    if (simulationEnabled) {
      if (simulationScenario === "provider-error") {
        await checkoutRef.set({ status: "preference-failed", updatedAt: new Date().toISOString() }, { merge: true });
        return res.status(502).json({ error: "Simulated payment provider error" });
      }

      const preferenceId = `local-pref-${checkoutId}`;
      const localOrigin = `http://${req.headers?.host || "localhost:3000"}`;
      const initPoint = `${localOrigin}/payment/pending?preference_id=${encodeURIComponent(preferenceId)}`;
      await checkoutRef.set({
        status: "pending", preferenceId, preferenceInitPoint: initPoint,
        simulation: true, updatedAt: new Date().toISOString(),
      }, { merge: true });
      return res.status(200).json({ preferenceId, initPoint, simulated: true });
    }

    const preferencePayload = {
      items: [{
        title: `Hwarang Scoring Universe - ${plan.product.toUpperCase()} ${plan.name}`,
        quantity: 1, currency_id: "ARS", unit_price: priceArs,
      }],
      payer: { name: cleanBuyerName, email: cleanEmail },
      external_reference: checkoutId,
      metadata: {
        checkout_id: checkoutId, license_key: licenseKey, product: plan.product,
        selected_package: plan.package, price_usd: plan.priceUsd, price_ars: priceArs,
        duration_days: plan.durationDays, credits_total: plan.creditsTotal,
      },
      back_urls: {
        success: `${PRODUCTION_URL}/payment/success`,
        failure: `${PRODUCTION_URL}/payment/failure`,
        pending: `${PRODUCTION_URL}/payment/pending`,
      },
      notification_url: `${PRODUCTION_URL}/api/mercadopago-webhook`,
      auto_return: "approved",
    };

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": checkoutId,
      },
      body: JSON.stringify(preferencePayload),
    });
    const data = await readJsonResponse(mpResponse);
    if (!mpResponse.ok || !data?.id || !data?.init_point) {
      await checkoutRef.set({ status: "preference-failed", updatedAt: new Date().toISOString() }, { merge: true });
      return res.status(502).json({ error: "Payment preference could not be created" });
    }

    await checkoutRef.set({
      status: "pending", preferenceId: data.id, preferenceInitPoint: data.init_point,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return res.status(200).json({ preferenceId: data.id, initPoint: data.init_point });
  } catch (error) {
    console.error("CREATE_PREFERENCE_ERROR", error?.message);
    return res.status(500).json({ error: "Server error creating payment preference" });
  }
}
