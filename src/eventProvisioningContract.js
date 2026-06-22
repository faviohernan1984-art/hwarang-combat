/**
 * Event Provisioning Engine V1 - contract draft.
 *
 * This module is intentionally isolated from the current runtime.
 * It does not import React, Firebase, routing, storage, or API code.
 *
 * Current legacy reality:
 *   licenseKey === legacyRoomId
 *   matches/{legacyRoomId}
 *
 * Future target:
 *   License -> Event -> Arena -> Match
 *
 * Domain terms:
 *   licenseKey: commercial entitlement.
 *   eventId: tournament/event provisioned under a license.
 *   arenaId: competition area, mat, court, or tatami inside an event.
 *   matchId: active combat/scoring instance.
 *   legacyRoomId: temporary alias used by the current matches/{roomId} runtime.
 */

export const EVENT_PROVISIONING_CONTRACT_VERSION =
  "event-provisioning-v1-draft";

export const COMBAT_CONTEXT_MODES = Object.freeze({
  LEGACY: "legacy",
  PROVISIONED: "provisioned",
});

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function cleanId(value) {
  return isNonEmptyString(value) ? value.trim() : null;
}

/**
 * Current compatibility context.
 *
 * The commercial license key is still used as the combat room id.
 * This mirrors production behavior today without touching the runtime.
 */
export function createLegacyCombatContext({ licenseKey } = {}) {
  const cleanLicenseKey = cleanId(licenseKey);

  if (!cleanLicenseKey) {
    throw new Error(
      "licenseKey is required to create a legacy combat context"
    );
  }

  return Object.freeze({
    contractVersion: EVENT_PROVISIONING_CONTRACT_VERSION,
    mode: COMBAT_CONTEXT_MODES.LEGACY,
    licenseKey: cleanLicenseKey,
    eventId: null,
    arenaId: null,
    matchId: null,
    legacyRoomId: cleanLicenseKey,
  });
}

/**
 * Identifies values that can represent the current matches/{roomId} key.
 *
 * This intentionally does not prove commercial validity. It only answers
 * whether the value is shaped like a legacy room alias.
 */
export function isLegacyRoomId(value) {
  return isNonEmptyString(value);
}

/**
 * True when a context contains the future License -> Event -> Arena -> Match
 * identity chain.
 */
export function isProvisionedCombatContext(context = {}) {
  return (
    context?.mode === COMBAT_CONTEXT_MODES.PROVISIONED &&
    isNonEmptyString(context.licenseKey) &&
    isNonEmptyString(context.eventId) &&
    isNonEmptyString(context.arenaId) &&
    isNonEmptyString(context.matchId)
  );
}

/**
 * Builds a future provisioning context without persisting anything.
 *
 * This is a draft contract only. It does not create Firestore documents,
 * routes, access URLs, or runtime state.
 */
export function buildEventProvisioningDraft({
  licenseKey,
  eventId,
  arenaId,
  matchId,
  legacyRoomId,
} = {}) {
  const cleanMatchId = cleanId(matchId);
  const cleanLegacyRoomId = cleanId(legacyRoomId);

  const draft = {
    contractVersion: EVENT_PROVISIONING_CONTRACT_VERSION,
    mode: COMBAT_CONTEXT_MODES.PROVISIONED,
    licenseKey: cleanId(licenseKey),
    eventId: cleanId(eventId),
    arenaId: cleanId(arenaId),
    matchId: cleanMatchId,
    legacyRoomId: cleanLegacyRoomId || cleanMatchId,
  };

  if (!isProvisionedCombatContext(draft)) {
    throw new Error(
      "licenseKey, eventId, arenaId, and matchId are required to build an event provisioning draft"
    );
  }

  return Object.freeze(draft);
}

/**
 * Resolves the current combat storage/routing alias from either context shape.
 *
 * Legacy context resolves to legacyRoomId.
 * Provisioned context resolves to legacyRoomId first, then matchId.
 */
export function resolveCombatRoomId(context = {}) {
  if (
    context.mode === COMBAT_CONTEXT_MODES.LEGACY &&
    isLegacyRoomId(context.legacyRoomId)
  ) {
    return context.legacyRoomId.trim();
  }

  if (isProvisionedCombatContext(context)) {
    return cleanId(context.legacyRoomId) || context.matchId.trim();
  }

  return null;
}