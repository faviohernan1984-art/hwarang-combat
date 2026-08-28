import test from "node:test";
import assert from "node:assert/strict";
import {
  NOVA_PACKAGES,
  buildActivationPlan,
  resolveCommercialProduct,
} from "../src/commercialCatalog.js";
import { validateApprovedPayment } from "../api/mercadopago-webhook.js";

for (const [packageId, expectedPrice] of Object.entries({
  starter: 99,
  regional: 199,
  championship: 399,
  "grand-championship": 799,
})) {
  test(`Nova ${packageId} resolves from the canonical catalog`, () => {
    const plan = resolveCommercialProduct("nova", packageId);
    assert.equal(plan.priceUsd, expectedPrice);
    assert.equal(plan.durationDays, 1);
    assert.equal(plan.creditsTotal, null);
    assert.equal(NOVA_PACKAGES[packageId].priceUsd, expectedPrice);
  });
}

for (const [credits, discountPercent, finalPrice] of [
  [500, 0, 500],
  [1000, 5, 950],
  [2000, 10, 1800],
  [5000, 15, 4250],
]) {
  test(`Pulsar ${credits} credits resolves safely`, () => {
    const plan = resolveCommercialProduct("pulsar", `${credits}-credits`);
    assert.equal(plan.creditsTotal, credits);
    assert.equal(plan.discountPercent, discountPercent);
    assert.equal(plan.priceUsd, finalPrice);
    assert.equal(plan.durationDays, 365);
  });
}

test("Pulsar accepts the existing 1000-credit package plus one 50-credit top-up", () => {
  const plan = resolveCommercialProduct("pulsar", "1050-credits");
  assert.equal(plan.creditsTotal, 1050);
  assert.equal(plan.discountPercent, 5);
  assert.equal(plan.priceUsd, 997);
  assert.equal(plan.durationDays, 365);
});

test("invalid product/package combinations are rejected", () => {
  assert.equal(resolveCommercialProduct("nova", "500-credits"), null);
  assert.equal(resolveCommercialProduct("pulsar", "starter"), null);
  assert.equal(resolveCommercialProduct("unknown", "starter"), null);
  assert.equal(resolveCommercialProduct("pulsar", "525-credits"), null);
  assert.equal(resolveCommercialProduct("pulsar", "450-credits"), null);
});

test("activation plans preserve product duration and credits", () => {
  const now = new Date("2026-08-27T12:00:00.000Z");
  const nova = buildActivationPlan(resolveCommercialProduct("nova", "starter"), now);
  const pulsar = buildActivationPlan(resolveCommercialProduct("pulsar", "1000-credits"), now);
  assert.equal(nova.durationDays, 1);
  assert.equal(nova.creditsTotal, undefined);
  assert.equal(pulsar.durationDays, 365);
  assert.equal(pulsar.creditsTotal, 1000);
  assert.equal(pulsar.creditsRemaining, 1000);
});

test("webhook validation rejects amount, currency and credit tampering", () => {
  const plan = resolveCommercialProduct("pulsar", "1000-credits");
  const checkout = {
    product: plan.product,
    package: plan.package,
    finalPrice: plan.priceUsd,
    priceArs: 123456,
    activationPlan: buildActivationPlan(plan),
  };
  const payment = { transaction_amount: 123456, currency_id: "ARS" };
  assert.equal(validateApprovedPayment(checkout, payment), true);
  assert.equal(validateApprovedPayment({ ...checkout, finalPrice: 1 }, payment), false);
  assert.equal(validateApprovedPayment(checkout, { ...payment, transaction_amount: 1 }), false);
  assert.equal(validateApprovedPayment(checkout, { ...payment, currency_id: "USD" }), false);
  assert.equal(validateApprovedPayment({
    ...checkout,
    activationPlan: { ...checkout.activationPlan, creditsTotal: 5000 },
  }, payment), false);
});
