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

/**
 * ============================================================
 * GENERACIÓN DE PAQUETES DE RUTAS DE ARENA
 * ============================================================
 */

/**
 * Construye el paquete operativo de rutas para una Arena de evento.
 *
 * Esta función es solo contractual.
 * No crea documentos en Firestore.
 * No genera QR.
 * No crea estado de runtime.
 * No crea Matches.
 * No valida permisos comerciales.
 */
export function createArenaRoutePackage({
  eventId,
  arenaNumber,
  judgeCount = 4,
} = {}) {
  const cleanEventId = cleanId(eventId);
  const cleanArenaNumber = Number(arenaNumber);
  const cleanJudgeCount = Number(judgeCount);

  if (!cleanEventId) {
    throw new Error("eventId is required to create an arena route package");
  }

  if (!Number.isInteger(cleanArenaNumber) || cleanArenaNumber < 1) {
    throw new Error("arenaNumber must be a positive integer");
  }

  if (!Number.isInteger(cleanJudgeCount) || cleanJudgeCount < 1) {
    throw new Error("judgeCount must be a positive integer");
  }

  const arenaId = `${cleanEventId}-A${cleanArenaNumber}`;

  return Object.freeze({
    contractVersion: EVENT_PROVISIONING_CONTRACT_VERSION,
    eventId: cleanEventId,
    arenaId,
    routes: Object.freeze({
      president: `/president/${arenaId}`,
      public: `/public/${arenaId}`,
      judges: Object.freeze(
        Array.from({ length: cleanJudgeCount }, (_, index) => {
          const judgeId = index + 1;
          return `/judge/${arenaId}/${judgeId}`;
        })
      ),
    }),
  });
}

/**
 * ============================================================
 * DEFINICIÓN CONTRACTUAL DE ARENA
 * ============================================================
 */
/**
 * Define contractualmente una Arena dentro de un evento.
 *
 * Esta función no crea rutas.
 * No crea documentos en Firestore.
 * No crea Matches.
 * No genera QR.
 * No modifica el runtime.
 */
export function createArenaDefinition({
  eventId,
  arenaNumber,
  status = "draft",
} = {}) {
  const cleanEventId = cleanId(eventId);
  const cleanArenaNumber = Number(arenaNumber);
  const cleanStatus = cleanId(status);

  if (!cleanEventId) {
    throw new Error("eventId is required to create an arena definition");
  }

  if (!Number.isInteger(cleanArenaNumber) || cleanArenaNumber < 1) {
    throw new Error("arenaNumber must be a positive integer");
  }

  if (!cleanStatus) {
    throw new Error("status is required to create an arena definition");
  }

  const arenaId = `${cleanEventId}-A${cleanArenaNumber}`;

  return Object.freeze({
    contractVersion: EVENT_PROVISIONING_CONTRACT_VERSION,
    eventId: cleanEventId,
    arenaId,
    arenaNumber: cleanArenaNumber,
    status: cleanStatus,
  });
}