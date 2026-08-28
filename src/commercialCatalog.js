export const NOVA_PACKAGES = Object.freeze({
  starter: Object.freeze({
    product: "nova",
    package: "starter",
    name: "Starter",
    priceUsd: 99,
    currency: "USD",
    durationDays: 1,
    validityType: "single-event",
    creditsTotal: null,
  }),
  regional: Object.freeze({
    product: "nova",
    package: "regional",
    name: "Regional",
    priceUsd: 199,
    currency: "USD",
    durationDays: 1,
    validityType: "single-event",
    creditsTotal: null,
  }),
  championship: Object.freeze({
    product: "nova",
    package: "championship",
    name: "Championship",
    priceUsd: 399,
    currency: "USD",
    durationDays: 1,
    validityType: "single-event",
    creditsTotal: null,
  }),
  "grand-championship": Object.freeze({
    product: "nova",
    package: "grand-championship",
    name: "Grand Championship",
    priceUsd: 799,
    currency: "USD",
    durationDays: 1,
    validityType: "single-event",
    creditsTotal: null,
  }),
});

export const PULSAR_BASE_PACKAGES = Object.freeze([500, 1000, 2000, 5000]);

export function getPulsarDiscountPercent(credits) {
  if (credits >= 5000) return 15;
  if (credits >= 2000) return 10;
  if (credits >= 1000) return 5;
  return 0;
}

export function resolveCommercialProduct(product, selectedPackage) {
  if (product === "nova") {
    const plan = NOVA_PACKAGES[selectedPackage];
    return plan ? { ...plan, discountPercent: 0, regularPriceUsd: plan.priceUsd } : null;
  }

  if (product !== "pulsar") return null;

  const match = /^(\d+)-credits$/.exec(String(selectedPackage || ""));
  if (!match) return null;

  const credits = Number(match[1]);
  if (!Number.isInteger(credits) || credits < 500 || credits % 50 !== 0) {
    return null;
  }

  const discountPercent = getPulsarDiscountPercent(credits);
  const discountAmount = Math.round((credits * discountPercent) / 100);

  return {
    product: "pulsar",
    package: `${credits}-credits`,
    name: `${credits} Match Credits`,
    priceUsd: credits - discountAmount,
    regularPriceUsd: credits,
    discountPercent,
    currency: "USD",
    durationDays: 365,
    validityType: "annual",
    creditsTotal: credits,
  };
}

export function buildActivationPlan(plan, now = new Date()) {
  const expires = new Date(now);

  if (plan.product === "nova") {
    expires.setDate(expires.getDate() + plan.durationDays);
  } else {
    expires.setFullYear(expires.getFullYear() + 1);
  }

  return {
    product: plan.product,
    validityType: plan.validityType,
    activationStatus: "pending-payment",
    requestedActivationDate: now.toISOString(),
    estimatedExpirationDate: expires.toISOString(),
    durationDays: plan.durationDays,
    ...(plan.creditsTotal === null
      ? {}
      : {
          creditsTotal: plan.creditsTotal,
          creditsUsed: 0,
          creditsRemaining: plan.creditsTotal,
        }),
  };
}
