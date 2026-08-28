import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { resolveCommercialProduct } from "../src/commercialCatalog.js";

process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
const baseUrl = process.env.LOCAL_BASE_URL || "http://localhost:3000";
const projectId = "hwarang-local-test";
const roomId = "demo-hsu-local01";
const webhookSecret = process.env.HSU_LOCAL_WEBHOOK_SECRET;
if (!webhookSecret) {
  throw new Error("HSU_LOCAL_WEBHOOK_SECRET is required for local integration tests");
}
const db = getFirestore(initializeApp({ projectId }, "local-integration"));

async function jsonRequest(path, body, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  return { response, data };
}

function checkoutId(label) {
  return `checkout-${Date.now()}-${label}${Math.random().toString(36).slice(2, 8)}`.replace(/[^a-z0-9-]/g, "").slice(0, 48);
}

async function createCheckout(product, selectedPackage, options = {}) {
  const id = options.id || checkoutId(product);
  const result = await jsonRequest("/api/create-preference", {
    checkoutId: id,
    product,
    package: selectedPackage,
    price: 1,
    finalPrice: 1,
    buyerName: "Local Tester",
    organization: "Local Test Organization",
    country: "Argentina",
    email: "local-test@example.invalid",
    simulationScenario: options.scenario,
  });
  return { id, ...result };
}

function webhookHeaders(dataId, valid = true) {
  const requestId = `local-request-${dataId}`;
  const ts = String(Math.floor(Date.now() / 1000));
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const hash = createHmac("sha256", webhookSecret).update(manifest).digest("hex");
  return {
    "x-request-id": requestId,
    "x-signature": `ts=${ts},v1=${valid ? hash : "0".repeat(64)}`,
  };
}

async function sendWebhook(checkout, status, overrides = {}, validSignature = true) {
  const paymentId = overrides.id || `payment-${checkout.id}`;
  return jsonRequest("/api/mercadopago-webhook", {
    type: "payment",
    data: { id: paymentId },
    simulationPayment: {
      id: paymentId,
      status,
      status_detail: `local-${status}`,
      external_reference: checkout.id,
      transaction_amount: overrides.transactionAmount ?? checkout.data.priceArs,
      currency_id: overrides.currencyId || "ARS",
      date_approved: status === "approved" ? new Date().toISOString() : null,
    },
  }, webhookHeaders(paymentId, validSignature));
}

const joinA = await jsonRequest("/api/join-judge", {
  roomId, judgeId: 1, name: "Judge Local A", sessionId: "local-session-judge-a-001",
});
assert.equal(joinA.response.status, 200);

const occupied = await jsonRequest("/api/join-judge", {
  roomId, judgeId: 1, name: "Judge Local B", sessionId: "local-session-judge-b-002",
});
assert.equal(occupied.response.status, 409);
assert.equal(occupied.data.code, "SLOT_OCCUPIED");

const active = await jsonRequest("/api/judge-session", {
  action: "status", roomId, judgeId: 1, sessionId: "local-session-judge-a-001",
});
assert.equal(active.response.status, 200);

const released = await jsonRequest("/api/judge-session", {
  action: "release", roomId, judgeId: 1, sessionId: "local-session-judge-a-001",
});
assert.equal(released.response.status, 200);

const rejoined = await jsonRequest("/api/join-judge", {
  roomId, judgeId: 1, name: "Judge Local B", sessionId: "local-session-judge-b-002",
});
assert.equal(rejoined.response.status, 200);

const packages = [
  ["nova", "starter"], ["nova", "regional"], ["nova", "championship"],
  ["nova", "grand-championship"], ["pulsar", "500-credits"],
  ["pulsar", "1000-credits"], ["pulsar", "2000-credits"],
  ["pulsar", "5000-credits"],
  ["pulsar", "1050-credits"], // Existing 1000-credit package + one 50-credit top-up.
];

for (const [product, selectedPackage] of packages) {
  const checkout = await createCheckout(product, selectedPackage);
  assert.equal(checkout.response.status, 200, `${product}/${selectedPackage}`);
  assert.equal(checkout.data.simulated, true);
  const saved = (await db.collection("checkoutRequests").doc(checkout.id).get()).data();
  assert.equal(saved.finalPrice, resolveCommercialProduct(product, selectedPackage).priceUsd);
  assert.notEqual(saved.finalPrice, 1);
}

const duplicateId = checkoutId("duplicate");
const [first, second] = await Promise.all([
  createCheckout("nova", "starter", { id: duplicateId }),
  createCheckout("nova", "starter", { id: duplicateId }),
]);
assert.equal([first.response.status, second.response.status].includes(200), true);
assert.equal([200, 409].includes(first.response.status), true);
assert.equal([200, 409].includes(second.response.status), true);
const duplicateSaved = (await db.collection("checkoutRequests").doc(duplicateId).get()).data();
assert.equal(duplicateSaved.preferenceId, `local-pref-${duplicateId}`);
for (const result of [first, second]) {
  if (result.response.status === 200) {
    assert.equal(result.data.preferenceId, duplicateSaved.preferenceId);
  }
}

const providerFailure = await createCheckout("nova", "starter", { scenario: "provider-error" });
assert.equal(providerFailure.response.status, 502);

const pendingCheckout = await createCheckout("nova", "regional");
pendingCheckout.data = (await db.collection("checkoutRequests").doc(pendingCheckout.id).get()).data();
assert.equal((await sendWebhook(pendingCheckout, "pending")).data.status, "pending");

const rejectedCheckout = await createCheckout("nova", "championship");
rejectedCheckout.data = (await db.collection("checkoutRequests").doc(rejectedCheckout.id).get()).data();
assert.equal((await sendWebhook(rejectedCheckout, "rejected")).data.status, "rejected");

const approvedCheckout = await createCheckout("pulsar", "1000-credits");
approvedCheckout.data = (await db.collection("checkoutRequests").doc(approvedCheckout.id).get()).data();
const approved = await sendWebhook(approvedCheckout, "approved");
assert.equal(approved.response.status, 200);
assert.equal(approved.data.deliveryStatus, "simulated");
const duplicateWebhook = await sendWebhook(approvedCheckout, "approved");
assert.equal(duplicateWebhook.data.alreadyProcessed, true);

const wrongAmountCheckout = await createCheckout("nova", "starter");
wrongAmountCheckout.data = (await db.collection("checkoutRequests").doc(wrongAmountCheckout.id).get()).data();
assert.equal((await sendWebhook(wrongAmountCheckout, "approved", { transactionAmount: 1 })).response.status, 500);

const wrongCurrencyCheckout = await createCheckout("nova", "starter");
wrongCurrencyCheckout.data = (await db.collection("checkoutRequests").doc(wrongCurrencyCheckout.id).get()).data();
assert.equal((await sendWebhook(wrongCurrencyCheckout, "approved", { currencyId: "USD" })).response.status, 500);

const invalidSignatureCheckout = await createCheckout("nova", "starter");
invalidSignatureCheckout.data = (await db.collection("checkoutRequests").doc(invalidSignatureCheckout.id).get()).data();
assert.equal((await sendWebhook(invalidSignatureCheckout, "approved", {}, false)).response.status, 401);

for (const status of ["success", "failure", "pending"]) {
  const response = await fetch(`${baseUrl}/payment/${status}`);
  assert.equal(response.status, 200);
}

console.log(`Local integration passed against ${baseUrl}`);
console.log(`Judge room: ${roomId}`);
process.exit(0);
