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

export const INSIGHT_SEVERITY = Object.freeze({
  NORMAL: "NORMAL",
  WATCH: "WATCH",
  ATTENTION: "ATTENTION",
  CRITICAL: "CRITICAL",
});

export const OPERATIONAL_BALANCE_STATUS = Object.freeze({
  BALANCED: "BALANCED",
  SLIGHTLY_UNBALANCED: "SLIGHTLY_UNBALANCED",
  UNBALANCED: "UNBALANCED",
});

export const INSIGHT_CONSUMPTION_SOURCES = Object.freeze([
  "Arena Metrics",
  "Event Metrics",
  "Tournament Metrics",
  "Arena Indexes",
  "Tournament Indexes",
  "Tournament Contract Definitions",
]);

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
/**
 * ============================================================
 * DEFINICIÓN CONTRACTUAL DE EVENTO
 * ============================================================
 */
/**
 * Define contractualmente un Evento creado bajo una licencia válida.
 *
 * El nombre del evento es un dato oficial y visible.
 * En el futuro podrá mostrarse en Public Screen, President Screen,
 * Arena Home, QR Access y Event Provisioning Panel.
 *
 * Esta función no crea documentos en Firestore.
 * No genera Arenas.
 * No genera rutas.
 * No modifica el runtime.
 */
export function createEventDefinition({
  licenseKey,
  eventId,
  eventName,
  eventType,
  status = "draft",
} = {}) {
  const cleanLicenseKey = cleanId(licenseKey);
  const cleanEventId = cleanId(eventId);
  const cleanEventName = cleanId(eventName);
  const cleanEventType = cleanId(eventType);
  const cleanStatus = cleanId(status);

  if (!cleanLicenseKey) {
    throw new Error("licenseKey is required to create an event definition");
  }

  if (!cleanEventId) {
    throw new Error("eventId is required to create an event definition");
  }

  if (!cleanEventName) {
    throw new Error("eventName is required to create an event definition");
  }

  if (!cleanEventType) {
    throw new Error("eventType is required to create an event definition");
  }

  if (!cleanStatus) {
    throw new Error("status is required to create an event definition");
  }

  return Object.freeze({
    contractVersion: EVENT_PROVISIONING_CONTRACT_VERSION,
    licenseKey: cleanLicenseKey,
    eventId: cleanEventId,
    eventName: cleanEventName,
    eventType: cleanEventType,
    status: cleanStatus,
  });
}
/**
 * ============================================================
 * MÉTRICAS CONTRACTUALES DE EVENTO
 * ============================================================
 */
/**
 * Construye una foto contractual de métricas de un Evento.
 *
 * El origen futuro de matches será el botón Close Match del President Screen.
 *
 * Esta función no escucha el runtime.
 * No modifica Firestore.
 * No consume créditos.
 * No factura.
 * No crea Matches.
 */
export function createEventMetricsSnapshot({
  eventId,
  arenas = 0,
  matches = 0,
  matchCreditsConsumed = 0,
} = {}) {
  const cleanEventId = cleanId(eventId);
  const cleanArenas = Number(arenas);
  const cleanMatches = Number(matches);
  const cleanMatchCreditsConsumed = Number(matchCreditsConsumed);

  if (!cleanEventId) {
    throw new Error("eventId is required to create an event metrics snapshot");
  }

  if (!Number.isInteger(cleanArenas) || cleanArenas < 0) {
    throw new Error("arenas must be a non-negative integer");
  }

  if (!Number.isInteger(cleanMatches) || cleanMatches < 0) {
    throw new Error("matches must be a non-negative integer");
  }

  if (
    !Number.isInteger(cleanMatchCreditsConsumed) ||
    cleanMatchCreditsConsumed < 0
  ) {
    throw new Error("matchCreditsConsumed must be a non-negative integer");
  }

  return Object.freeze({
    contractVersion: EVENT_PROVISIONING_CONTRACT_VERSION,
    eventId: cleanEventId,
    arenas: cleanArenas,
    matches: cleanMatches,
    matchCreditsConsumed: cleanMatchCreditsConsumed,
  });
}
/**
 * ============================================================
 * MÉTRICAS CONTRACTUALES DE ARENA
 * ============================================================
 */
/**
 * Construye una foto contractual de métricas de una Arena.
 *
 * El origen futuro de matches será el botón Close Match del President Screen.
 *
 * Esta función no escucha el runtime.
 * No modifica Firestore.
 * No consume créditos.
 * No factura.
 * No crea Matches.
 */
export function createArenaMetricsSnapshot({
  eventId,
  arenaId,
  matchesCompleted = 0,
  startedAt,
  lastActivityAt,
  elapsedMinutes = 0,
  idleMinutes = 0,
} = {}) {
  const cleanEventId = cleanId(eventId);
  const cleanArenaId = cleanId(arenaId);
  const cleanMatchesCompleted = Number(matchesCompleted);
  const cleanStartedAt = cleanId(startedAt);
  const cleanLastActivityAt = cleanId(lastActivityAt);
  const cleanElapsedMinutes = Number(elapsedMinutes);
  const cleanIdleMinutes = Number(idleMinutes);

  if (!cleanEventId) {
    throw new Error("eventId is required to create an arena metrics snapshot");
  }

  if (!cleanArenaId) {
    throw new Error("arenaId is required to create an arena metrics snapshot");
  }

  if (
    !Number.isInteger(cleanMatchesCompleted) ||
    cleanMatchesCompleted < 0
  ) {
    throw new Error("matchesCompleted must be a non-negative integer");
  }

  if (cleanStartedAt && !cleanLastActivityAt) {
    throw new Error(
      "lastActivityAt is required when startedAt is provided"
    );
  }

  if (
    !Number.isInteger(cleanElapsedMinutes) ||
    cleanElapsedMinutes < 0
  ) {
    throw new Error(
      "elapsedMinutes must be a non-negative integer"
    );
  }
  if (
    !Number.isInteger(cleanIdleMinutes) ||
    cleanIdleMinutes < 0
  ) {
    throw new Error(
      "idleMinutes must be a non-negative integer"
    );
  }
  return Object.freeze({
    contractVersion: EVENT_PROVISIONING_CONTRACT_VERSION,
    eventId: cleanEventId,
    arenaId: cleanArenaId,
    matchesCompleted: cleanMatchesCompleted,
    operationalContext: Object.freeze({
      startedAt: cleanStartedAt,
      lastActivityAt: cleanLastActivityAt,
      elapsedMinutes: cleanElapsedMinutes,
      idleMinutes: cleanIdleMinutes,
    }),
  });
}

/**
 * ============================================================
 * MATCH CREDIT LEDGER CONTRACT
 * ============================================================
 */
/**
 * Construye una foto contractual del consumo de Match Credits de un Evento.
 *
 * Regla comercial V1:
 * 1 match completado = 1 Match Credit consumido.
 *
 * Esta función no procesa pagos.
 * No modifica Firestore.
 * No crea licencias.
 * No crea recargas.
 * No aplica descuentos.
 * No aplica reembolsos.
 */
export function createMatchCreditLedgerSnapshot({
  eventId,
  matchesCompleted = 0,
  matchCreditsConsumed = matchesCompleted,
} = {}) {
  const cleanEventId = cleanId(eventId);
  const cleanMatchesCompleted = Number(matchesCompleted);
  const cleanMatchCreditsConsumed = Number(matchCreditsConsumed);

  if (!cleanEventId) {
    throw new Error(
      "eventId is required to create a match credit ledger snapshot"
    );
  }

  if (!Number.isInteger(cleanMatchesCompleted) || cleanMatchesCompleted < 0) {
    throw new Error("matchesCompleted must be a non-negative integer");
  }

  if (
    !Number.isInteger(cleanMatchCreditsConsumed) ||
    cleanMatchCreditsConsumed < 0
  ) {
    throw new Error("matchCreditsConsumed must be a non-negative integer");
  }

  return Object.freeze({
    contractVersion: EVENT_PROVISIONING_CONTRACT_VERSION,
    eventId: cleanEventId,
    matchesCompleted: cleanMatchesCompleted,
    matchCreditsConsumed: cleanMatchCreditsConsumed,
  });
}
/**
 * ============================================================
 * DEFINICIÓN CONTRACTUAL DE MATCH
 * ============================================================
 */
/**
 * Define contractualmente un Match dentro de una Arena de evento.
 *
 * Esta función no inicia combates.
 * No escucha Close Match.
 * No modifica Firestore.
 * No consume créditos.
 * No calcula resultados.
 * No altera el runtime actual.
 */
export function createMatchDefinition({
  eventId,
  arenaId,
  matchId,
  status = "draft",
} = {}) {
  const cleanEventId = cleanId(eventId);
  const cleanArenaId = cleanId(arenaId);
  const cleanMatchId = cleanId(matchId);
  const cleanStatus = cleanId(status);

  if (!cleanEventId) {
    throw new Error("eventId is required to create a match definition");
  }

  if (!cleanArenaId) {
    throw new Error("arenaId is required to create a match definition");
  }

  if (!cleanMatchId) {
    throw new Error("matchId is required to create a match definition");
  }

  if (!cleanStatus) {
    throw new Error("status is required to create a match definition");
  }

  return Object.freeze({
    contractVersion: EVENT_PROVISIONING_CONTRACT_VERSION,
    eventId: cleanEventId,
    arenaId: cleanArenaId,
    matchId: cleanMatchId,
    status: cleanStatus,
  });
}
/**
 * ============================================================
 * MATCH COMPLETION RECORD CONTRACT
 * ============================================================
 */
/**
 * Registra contractualmente la finalización de un Match.
 *
 * Este contrato representa el evento que en el futuro será
 * generado por Close Match desde President Screen.
 *
 * Esta función no modifica Firestore.
 * No consume créditos.
 * No actualiza métricas.
 * No altera el runtime.
 */
export function createMatchCompletionRecord({
  eventId,
  arenaId,
  matchId,
  completedAt,
  status = "completed",
} = {}) {
  const cleanEventId = cleanId(eventId);
  const cleanArenaId = cleanId(arenaId);
  const cleanMatchId = cleanId(matchId);
  const cleanCompletedAt = cleanId(completedAt);
  const cleanStatus = cleanId(status);

  if (!cleanEventId) {
    throw new Error(
      "eventId is required to create a match completion record"
    );
  }

  if (!cleanArenaId) {
    throw new Error(
      "arenaId is required to create a match completion record"
    );
  }

  if (!cleanMatchId) {
    throw new Error(
      "matchId is required to create a match completion record"
    );
  }

  if (!cleanCompletedAt) {
    throw new Error(
      "completedAt is required to create a match completion record"
    );
  }

  if (!cleanStatus) {
    throw new Error(
      "status is required to create a match completion record"
    );
  }

  return Object.freeze({
    contractVersion: EVENT_PROVISIONING_CONTRACT_VERSION,
    eventId: cleanEventId,
    arenaId: cleanArenaId,
    matchId: cleanMatchId,
    completedAt: cleanCompletedAt,
    status: cleanStatus,
  });
}
/**
 * ============================================================
 * CONSOLIDACIÓN CONTRACTUAL DE MÉTRICAS DE EVENTO
 * ============================================================
 */
/**
 * Consolida las métricas de todas las Arenas pertenecientes a un Evento.
 *
 * Todas las Arenas definidas deben formar parte del resultado,
 * incluso si aún no registran actividad.
 *
 * Esta función no modifica Firestore.
 * No consume créditos.
 * No altera el runtime.
 * No crea Matches.
 */
export function calculateEventMetricsSnapshot({
  eventId,
  arenaDefinitions = [],
  arenaMetricsSnapshots = [],
} = {}) {
  const cleanEventId = cleanId(eventId);

  if (!cleanEventId) {
    throw new Error(
      "eventId is required to calculate an event metrics snapshot"
    );
  }

  const metricsByArena = new Map(
    arenaMetricsSnapshots.map((snapshot) => [
      snapshot.arenaId,
      snapshot,
    ])
  );

  const arenaMetrics = arenaDefinitions.map((arena) => {
    const arenaSnapshot = metricsByArena.get(arena.arenaId);
    const matchesCompleted =
      Number(arenaSnapshot?.matchesCompleted) || 0;

    return Object.freeze({
      arenaId: arena.arenaId,
      matchesCompleted,
      operationalContext: Object.freeze({
        startedAt: arenaSnapshot?.operationalContext?.startedAt ?? null,
        lastActivityAt:
          arenaSnapshot?.operationalContext?.lastActivityAt ?? null,
        elapsedMinutes:
          Number(arenaSnapshot?.operationalContext?.elapsedMinutes) || 0,
        idleMinutes:
          Number(arenaSnapshot?.operationalContext?.idleMinutes) || 0,
      }),
    });
  });

  const arenas = arenaMetrics.length;

  const activeArenas = arenaMetrics.filter(
    (arena) => arena.matchesCompleted > 0
  ).length;

  const inactiveArenas = arenas - activeArenas;

  const matches = arenaMetrics.reduce(
    (total, arena) => total + arena.matchesCompleted,
    0
  );

  return Object.freeze({
    contractVersion: EVENT_PROVISIONING_CONTRACT_VERSION,
    eventId: cleanEventId,
    arenas,
    activeArenas,
    inactiveArenas,
    matches,
    arenaMetrics: Object.freeze(arenaMetrics),
  });
}
/**
 * ============================================================
 * TOURNAMENT CONTROL TOWER CONTRACT
 * ============================================================
 */
/**
 * Construye una foto contractual del estado operacional del torneo.
 *
 * Esta función representa la base futura de la Tournament Control Tower.
 *
 * Esta función no modifica Firestore.
 * No escucha el runtime.
 * No consume créditos.
 * No altera President Screen.
 * No altera Public Screen.
 * No crea Matches.
 */
export function createTournamentControlTowerSnapshot({
  eventId,
  eventMetricsSnapshot,
  generatedAt,
} = {}) {
  const cleanEventId = cleanId(eventId);
  const cleanGeneratedAt = cleanId(generatedAt);

  if (!cleanEventId) {
    throw new Error(
      "eventId is required to create a tournament control tower snapshot"
    );
  }

  if (!eventMetricsSnapshot) {
    throw new Error(
      "eventMetricsSnapshot is required to create a tournament control tower snapshot"
    );
  }

  if (!cleanGeneratedAt) {
    throw new Error(
      "generatedAt is required to create a tournament control tower snapshot"
    );
  }

  if (!Array.isArray(eventMetricsSnapshot.arenaMetrics)) {
    throw new Error(
      "eventMetricsSnapshot.arenaMetrics must be an array"
    );
  }

  const arenaOperationalStatus = eventMetricsSnapshot.arenaMetrics.map(
    (arena) => {
      const matchesCompleted = Number(arena.matchesCompleted);

      if (!cleanId(arena.arenaId)) {
        throw new Error(
          "arenaId is required inside arenaMetrics"
        );
      }

      if (
        !Number.isInteger(matchesCompleted) ||
        matchesCompleted < 0
      ) {
        throw new Error(
          "matchesCompleted must be a non-negative integer inside arenaMetrics"
        );
      }

      return Object.freeze({
        arenaId: arena.arenaId,
        matchesCompleted,
        operationalContext: Object.freeze({
          startedAt: arena.operationalContext?.startedAt ?? null,
          lastActivityAt: arena.operationalContext?.lastActivityAt ?? null,
          elapsedMinutes: Number(arena.operationalContext?.elapsedMinutes) || 0,
          idleMinutes: Number(arena.operationalContext?.idleMinutes) || 0,
        }),
        status: matchesCompleted > 0 ? "active" : "inactive",
      });
    }
  );

  return Object.freeze({
    contractVersion: EVENT_PROVISIONING_CONTRACT_VERSION,
    eventId: cleanEventId,
    generatedAt: cleanGeneratedAt,
    arenas: eventMetricsSnapshot.arenas,
    activeArenas: eventMetricsSnapshot.activeArenas,
    inactiveArenas: eventMetricsSnapshot.inactiveArenas,
    matches: eventMetricsSnapshot.matches,
    arenaOperationalStatus: Object.freeze(arenaOperationalStatus),
    operationalRecommendations: Object.freeze([]),
  });
}
/**
 * ============================================================
 * HOI INSIGHT CONTRACT
 * ============================================================
 */
/**
 * Construye un contrato base de Insight operacional.
 *
 * Un Insight interpreta métricas e índices autorizados.
 *
 * Esta función no modifica Firestore.
 * No escucha el runtime.
 * No consume créditos.
 * No altera President Screen.
 * No altera Public Screen.
 * No crea Matches.
 * No emite recomendaciones operativas.
 */
export function createInsightContract({
  insightId,
  insightType,
  status,
  severity = INSIGHT_SEVERITY.NORMAL,
  summary,
  evidence = {},
  reasoningChain = [],
} = {}) {
  const cleanInsightId = cleanId(insightId);
  const cleanInsightType = cleanId(insightType);
  const cleanStatus = cleanId(status);
  const cleanSeverity = cleanId(severity);
  const cleanSummary = cleanId(summary);

  if (!cleanInsightId) {
    throw new Error("insightId is required to create an insight contract");
  }

  if (!cleanInsightType) {
    throw new Error("insightType is required to create an insight contract");
  }

  if (!cleanStatus) {
    throw new Error("status is required to create an insight contract");
  }

  if (!cleanSeverity) {
    throw new Error("severity is required to create an insight contract");
  }

  if (!cleanSummary) {
    throw new Error("summary is required to create an insight contract");
  }

  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    throw new Error("evidence must be an object");
  }

  if (!Array.isArray(reasoningChain)) {
    throw new Error("reasoningChain must be an array");
  }

  return Object.freeze({
    contractVersion: EVENT_PROVISIONING_CONTRACT_VERSION,
    insightId: cleanInsightId,
    insightType: cleanInsightType,
    status: cleanStatus,
    severity: cleanSeverity,
    summary: cleanSummary,
    evidence: Object.freeze(evidence),
    reasoningChain: Object.freeze(reasoningChain),
    consumptionSources: INSIGHT_CONSUMPTION_SOURCES,
  });
}
/**
 * Construye el Insight contractual de balance operacional del torneo.
 *
 * Este Insight interpreta si la carga operativa se encuentra distribuida
 * de forma equilibrada entre las Arenas.
 *
 * Esta función no modifica Firestore.
 * No escucha el runtime.
 * No consume créditos.
 * No altera President Screen.
 * No altera Public Screen.
 * No crea Matches.
 * No emite recomendaciones operativas.
 */
export function createOperationalBalanceInsight({
  arenaPerformanceIndex = [],
  tournamentPerformanceIndex = 0,
} = {}) {
  if (!Array.isArray(arenaPerformanceIndex)) {
    throw new Error("arenaPerformanceIndex must be an array");
  }

  const cleanTournamentPerformanceIndex = Number(tournamentPerformanceIndex);

  if (
    !Number.isFinite(cleanTournamentPerformanceIndex) ||
    cleanTournamentPerformanceIndex < 0
  ) {
    throw new Error(
      "tournamentPerformanceIndex must be a non-negative finite number"
    );
  }

  const performanceScores = arenaPerformanceIndex.map((arena) => {
    const cleanArenaId = cleanId(arena.arenaId);
    const performanceScore = Number(arena.performanceScore);

    if (!cleanArenaId) {
      throw new Error("arenaId is required inside arenaPerformanceIndex");
    }

    if (!Number.isFinite(performanceScore) || performanceScore < 0) {
      throw new Error(
        "performanceScore must be a non-negative finite number inside arenaPerformanceIndex"
      );
    }

    return Object.freeze({
      arenaId: cleanArenaId,
      performanceScore,
    });
  });

  const performanceValues = performanceScores.map(
    (arena) => arena.performanceScore
  );

  const highestPerformance =
    performanceValues.length > 0 ? Math.max(...performanceValues) : 0;
  const lowestPerformance =
    performanceValues.length > 0 ? Math.min(...performanceValues) : 0;
  const operationalSpread = highestPerformance - lowestPerformance;

  let status = OPERATIONAL_BALANCE_STATUS.BALANCED;
  let severity = INSIGHT_SEVERITY.NORMAL;

  if (operationalSpread > cleanTournamentPerformanceIndex * 0.5) {
    status = OPERATIONAL_BALANCE_STATUS.UNBALANCED;
    severity = INSIGHT_SEVERITY.ATTENTION;
  } else if (operationalSpread > cleanTournamentPerformanceIndex * 0.25) {
    status = OPERATIONAL_BALANCE_STATUS.SLIGHTLY_UNBALANCED;
    severity = INSIGHT_SEVERITY.WATCH;
  }

  const summary =
    status === OPERATIONAL_BALANCE_STATUS.BALANCED
      ? "The tournament maintains consistent operational balance based on homogeneous arena performance indexes."
      : status === OPERATIONAL_BALANCE_STATUS.SLIGHTLY_UNBALANCED
        ? "The tournament shows a slight operational imbalance due to observed dispersion across arena performance indexes."
        : "The tournament shows a significant operational imbalance due to high dispersion across arena performance indexes.";

  return createInsightContract({
    insightId: "operational-balance",
    insightType: "OPERATIONAL_BALANCE",
    status,
    severity,
    summary,
    evidence: Object.freeze({
      arenaPerformanceIndex: Object.freeze(performanceScores),
      tournamentPerformanceIndex: cleanTournamentPerformanceIndex,
      highestPerformance,
      lowestPerformance,
      operationalSpread,
    }),
    reasoningChain: Object.freeze([
      "Arena performance indexes were collected for all arenas.",
      "The difference between the highest and lowest performance index was calculated.",
      "The operational spread was compared against the tournament performance index.",
      `The operational balance status was classified as ${status}.`,
    ]),
  });
}
export function createTournamentFlowInsight({
  controlTowerSnapshot,
} = {}) {
  if (!controlTowerSnapshot) {
    throw new Error(
      "controlTowerSnapshot is required to create a tournament flow insight"
    );
  }

  if (!Array.isArray(controlTowerSnapshot.arenaOperationalStatus)) {
    throw new Error(
      "controlTowerSnapshot.arenaOperationalStatus must be an array"
    );
  }

  const arenas = Number(controlTowerSnapshot.arenas);
  const matches = Number(controlTowerSnapshot.matches);
  const activeArenas = Number(controlTowerSnapshot.activeArenas);
  const inactiveArenas = Number(controlTowerSnapshot.inactiveArenas);

  if (!Number.isInteger(arenas) || arenas < 0) {
    throw new Error("arenas must be a non-negative integer");
  }

  if (!Number.isInteger(matches) || matches < 0) {
    throw new Error("matches must be a non-negative integer");
  }

  if (!Number.isInteger(activeArenas) || activeArenas < 0) {
    throw new Error("activeArenas must be a non-negative integer");
  }

  if (!Number.isInteger(inactiveArenas) || inactiveArenas < 0) {
    throw new Error("inactiveArenas must be a non-negative integer");
  }

  let status = "FLOWING";
  let severity = INSIGHT_SEVERITY.NORMAL;

  if (arenas === 0) {
    status = "UNKNOWN";
    severity = INSIGHT_SEVERITY.WATCH;
  } else if (matches === 0) {
    status = "NOT_STARTED";
    severity = INSIGHT_SEVERITY.WATCH;
  } else if (inactiveArenas > 0) {
    status = "PARTIALLY_FLOWING";
    severity = INSIGHT_SEVERITY.ATTENTION;
  }

  const summary =
    status === "FLOWING"
      ? "The tournament flow is active across all registered arenas."
      : status === "PARTIALLY_FLOWING"
        ? "The tournament flow is active but not yet distributed across all registered arenas."
        : status === "NOT_STARTED"
          ? "The tournament flow has not started because no matches have been completed."
          : "The tournament flow cannot be fully evaluated because no arenas are registered.";

  return createInsightContract({
    insightId: "tournament-flow",
    insightType: "TOURNAMENT_FLOW",
    status,
    severity,
    summary,
    evidence: Object.freeze({
      arenas,
      matches,
      activeArenas,
      inactiveArenas,
    }),
    reasoningChain: Object.freeze([
      "Tournament Control Tower data was received as the authorized operational source.",
      "Registered arenas, completed matches, active arenas, and inactive arenas were evaluated.",
      "Tournament flow status was classified according to match completion distribution.",
      `The tournament flow status was classified as ${status}.`,
    ]),
  });
}
export function createArenaAttentionInsight({
  controlTowerSnapshot,
} = {}) {
  if (!controlTowerSnapshot) {
    throw new Error(
      "controlTowerSnapshot is required to create an arena attention insight"
    );
  }

  if (!Array.isArray(controlTowerSnapshot.arenaOperationalStatus)) {
    throw new Error(
      "controlTowerSnapshot.arenaOperationalStatus must be an array"
    );
  }

  const arenaAttentionSignals = Object.freeze(
    controlTowerSnapshot.arenaOperationalStatus.map((arena) => {
      const cleanArenaId = cleanId(arena.arenaId);
      const matchesCompleted = Number(arena.matchesCompleted);
      const elapsedMinutes =
        Number(arena.operationalContext?.elapsedMinutes) || 0;
      const idleMinutes =
        Number(arena.operationalContext?.idleMinutes) || 0;

      if (!cleanArenaId) {
        throw new Error(
          "arenaId is required inside arenaOperationalStatus"
        );
      }

      if (
        !Number.isInteger(matchesCompleted) ||
        matchesCompleted < 0
      ) {
        throw new Error(
          "matchesCompleted must be a non-negative integer inside arenaOperationalStatus"
        );
      }

      if (
        !Number.isInteger(elapsedMinutes) ||
        elapsedMinutes < 0
      ) {
        throw new Error(
          "elapsedMinutes must be a non-negative integer inside arenaOperationalStatus"
        );
      }

      if (!Number.isInteger(idleMinutes) || idleMinutes < 0) {
        throw new Error(
          "idleMinutes must be a non-negative integer inside arenaOperationalStatus"
        );
      }

      const idleRatio =
        elapsedMinutes > 0 ? idleMinutes / elapsedMinutes : 0;

      const requiresAttention =
        matchesCompleted === 0 || idleRatio >= 0.5;

      return Object.freeze({
        arenaId: cleanArenaId,
        matchesCompleted,
        elapsedMinutes,
        idleMinutes,
        idleRatio,
        requiresAttention,
      });
    })
  );

  const arenasRequiringAttention = Object.freeze(
    arenaAttentionSignals.filter((arena) => arena.requiresAttention)
  );

  let status = "CLEAR";
  let severity = INSIGHT_SEVERITY.NORMAL;

  if (arenasRequiringAttention.length > 0) {
    status = "ATTENTION_REQUIRED";
    severity = INSIGHT_SEVERITY.ATTENTION;
  }

  const summary =
    status === "CLEAR"
      ? "No arena attention signals were detected from authorized operational data."
      : "One or more arenas show attention signals based on match completion or idle time.";

  return createInsightContract({
    insightId: "arena-attention",
    insightType: "ARENA_ATTENTION",
    status,
    severity,
    summary,
    evidence: Object.freeze({
      arenaAttentionSignals,
      arenasRequiringAttention,
      attentionCount: arenasRequiringAttention.length,
    }),
    reasoningChain: Object.freeze([
      "Tournament Control Tower arena operational status was received as the authorized operational source.",
      "Each arena was evaluated for completed matches and idle time ratio.",
      "Arenas with zero completed matches or idle time equal to or above fifty percent were marked as requiring attention.",
      `The arena attention status was classified as ${status}.`,
    ]),
  });
}
/**
 * ============================================================
 * HWARANG OPERATIONAL INTELLIGENCE CONTRACT
 * ============================================================
 */
/**
 * Construye un contrato base de inteligencia operacional.
 *
 * HOI correlaciona evidencia operacional producida por
 * Tournament Operational Analytics.
 *
 * Esta función no modifica Firestore.
 * No escucha el runtime.
 * No consume créditos.
 * No altera President Screen.
 * No altera Public Screen.
 * No crea Matches.
 * No emite recomendaciones operativas.
 * No reemplaza el criterio del Director del Evento.
 */
export function createOperationalIntelligenceContract({
  intelligenceId,
  intelligenceType,
  status,
  confidence = 0,
  summary,
  correlatedInsights = [],
  evidenceMap = {},
  interpretation,
  limitations = [],
} = {}) {
  const cleanIntelligenceId = cleanId(intelligenceId);
  const cleanIntelligenceType = cleanId(intelligenceType);
  const cleanStatus = cleanId(status);
  const cleanSummary = cleanId(summary);
  const cleanInterpretation = cleanId(interpretation);
  const cleanConfidence = Number(confidence);

  if (!cleanIntelligenceId) {
    throw new Error(
      "intelligenceId is required to create an operational intelligence contract"
    );
  }

  if (!cleanIntelligenceType) {
    throw new Error(
      "intelligenceType is required to create an operational intelligence contract"
    );
  }

  if (!cleanStatus) {
    throw new Error(
      "status is required to create an operational intelligence contract"
    );
  }

  if (!Number.isFinite(cleanConfidence) || cleanConfidence < 0 || cleanConfidence > 1) {
    throw new Error(
      "confidence must be a finite number between 0 and 1"
    );
  }

  if (!cleanSummary) {
    throw new Error(
      "summary is required to create an operational intelligence contract"
    );
  }

  if (!Array.isArray(correlatedInsights)) {
    throw new Error("correlatedInsights must be an array");
  }

  if (
    !evidenceMap ||
    typeof evidenceMap !== "object" ||
    Array.isArray(evidenceMap)
  ) {
    throw new Error("evidenceMap must be an object");
  }

  if (!cleanInterpretation) {
    throw new Error(
      "interpretation is required to create an operational intelligence contract"
    );
  }

  if (!Array.isArray(limitations)) {
    throw new Error("limitations must be an array");
  }

  return Object.freeze({
    contractVersion: EVENT_PROVISIONING_CONTRACT_VERSION,
    intelligenceId: cleanIntelligenceId,
    intelligenceType: cleanIntelligenceType,
    status: cleanStatus,
    confidence: cleanConfidence,
    summary: cleanSummary,
    correlatedInsights: Object.freeze(correlatedInsights),
    evidenceMap: Object.freeze(evidenceMap),
    interpretation: cleanInterpretation,
    limitations: Object.freeze(limitations),
  });
}
export function createOperationalCorrelationIntelligence({
  tournamentOperationalAnalyticsSnapshot,
} = {}) {
  if (!tournamentOperationalAnalyticsSnapshot) {
    throw new Error(
      "tournamentOperationalAnalyticsSnapshot is required to create operational correlation intelligence"
    );
  }

  if (!Array.isArray(tournamentOperationalAnalyticsSnapshot.insights)) {
    throw new Error(
      "tournamentOperationalAnalyticsSnapshot.insights must be an array"
    );
  }

  const correlatedInsights = Object.freeze(
    tournamentOperationalAnalyticsSnapshot.insights.map((insight) => {
      const cleanInsightId = cleanId(insight.insightId);
      const cleanInsightType = cleanId(insight.insightType);
      const cleanStatus = cleanId(insight.status);
      const cleanSeverity = cleanId(insight.severity);

      if (!cleanInsightId) {
        throw new Error("insightId is required inside insights");
      }

      if (!cleanInsightType) {
        throw new Error("insightType is required inside insights");
      }

      if (!cleanStatus) {
        throw new Error("status is required inside insights");
      }

      if (!cleanSeverity) {
        throw new Error("severity is required inside insights");
      }

      return Object.freeze({
        insightId: cleanInsightId,
        insightType: cleanInsightType,
        status: cleanStatus,
        severity: cleanSeverity,
      });
    })
  );

  const severityWeights = Object.freeze({
    [INSIGHT_SEVERITY.NORMAL]: 0,
    [INSIGHT_SEVERITY.WATCH]: 1,
    [INSIGHT_SEVERITY.ATTENTION]: 2,
    [INSIGHT_SEVERITY.CRITICAL]: 3,
  });

  const severityScores = correlatedInsights.map((insight) => {
    if (!(insight.severity in severityWeights)) {
      throw new Error(
        "severity must be a known INSIGHT_SEVERITY value inside insights"
      );
    }

    return severityWeights[insight.severity];
  });

  const highestSeverityScore =
    severityScores.length > 0 ? Math.max(...severityScores) : 0;

  const elevatedSignals = severityScores.filter(
    (severityScore) => severityScore > 0
  ).length;

  const confidence =
    correlatedInsights.length > 0
      ? elevatedSignals / correlatedInsights.length
      : 0;

  let status = "CONSISTENT_OPERATION";

  if (elevatedSignals > 1) {
    status = "MULTI_SIGNAL_CONVERGENCE";
  } else if (elevatedSignals === 1) {
    status = "PARTIAL_CONVERGENCE";
  }

  const summary =
    status === "CONSISTENT_OPERATION"
      ? "Observed operational insights show no elevated severity convergence."
      : status === "PARTIAL_CONVERGENCE"
        ? "A single operational insight shows elevated severity without multi-signal convergence."
        : "Multiple operational insights show elevated severity convergence.";

  const interpretation =
    status === "CONSISTENT_OPERATION"
      ? "Current evidence does not show operational convergence requiring elevated attention."
      : status === "PARTIAL_CONVERGENCE"
        ? "Current evidence shows one elevated operational signal, but convergence is not yet established."
        : "Current evidence shows multiple independent operational signals converging toward elevated attention.";

  return createOperationalIntelligenceContract({
    intelligenceId: "operational-correlation",
    intelligenceType: "OPERATIONAL_CORRELATION",
    status,
    confidence,
    summary,
    correlatedInsights,
    evidenceMap: Object.freeze({
      severityScores: Object.freeze(severityScores),
      elevatedSignals,
      totalSignals: correlatedInsights.length,
      highestSeverityScore,
      correlationBasis: "INSIGHT_SEVERITY",
    }),
    interpretation,
    limitations: Object.freeze([
      "This intelligence is limited to the insights currently produced by Tournament Operational Analytics.",
      "This intelligence evaluates evidence convergence and does not emit operational recommendations.",
      "This intelligence does not yet evaluate expected pace, category congestion, resource allocation, or historical event patterns.",
    ]),
  });
}
/**
 * ============================================================
 * HWARANG OPERATIONAL INTELLIGENCE SNAPSHOT
 * ============================================================
 */
/**
 * Construye una foto contractual de Hwarang Operational Intelligence.
 *
 * HOI consolida la analítica operacional del torneo y la inteligencia
 * de correlación operacional en una única evaluación contextual.
 *
 * Esta función no modifica Firestore.
 * No escucha el runtime.
 * No consume créditos.
 * No altera President Screen.
 * No altera Public Screen.
 * No crea Matches.
 * No emite recomendaciones operativas.
 * No reemplaza el criterio del Director del Evento.
 */
export function createHwarangOperationalIntelligenceSnapshot({
  eventId,
  tournamentOperationalAnalyticsSnapshot,
  generatedAt,
} = {}) {
  const cleanEventId = cleanId(eventId);
  const cleanGeneratedAt = cleanId(generatedAt);

  if (!cleanEventId) {
    throw new Error(
      "eventId is required to create a hwarang operational intelligence snapshot"
    );
  }

  if (!tournamentOperationalAnalyticsSnapshot) {
    throw new Error(
      "tournamentOperationalAnalyticsSnapshot is required to create a hwarang operational intelligence snapshot"
    );
  }

  if (!cleanGeneratedAt) {
    throw new Error(
      "generatedAt is required to create a hwarang operational intelligence snapshot"
    );
  }

  const operationalCorrelationIntelligence =
    createOperationalCorrelationIntelligence({
      tournamentOperationalAnalyticsSnapshot,
    });

  return Object.freeze({
    contractVersion: EVENT_PROVISIONING_CONTRACT_VERSION,
    eventId: cleanEventId,
    generatedAt: cleanGeneratedAt,

    tournamentOperationalAnalyticsSnapshot,
    operationalCorrelationIntelligence,

    assessment: Object.freeze({
      status: operationalCorrelationIntelligence.status,
      severity:
        operationalCorrelationIntelligence.evidenceMap?.highestSeverityScore === 3
          ? INSIGHT_SEVERITY.CRITICAL
          : operationalCorrelationIntelligence.evidenceMap?.highestSeverityScore === 2
            ? INSIGHT_SEVERITY.ATTENTION
            : operationalCorrelationIntelligence.evidenceMap?.highestSeverityScore === 1
              ? INSIGHT_SEVERITY.WATCH
              : INSIGHT_SEVERITY.NORMAL,
      confidence: operationalCorrelationIntelligence.confidence,
      basis: "OPERATIONAL_EVIDENCE_CONVERGENCE",
    }),
  });
}
/**
 * ============================================================
 * OPERATIONAL CONTINUITY INTELLIGENCE
 * ============================================================
 */
/**
 * Construye inteligencia de continuidad operacional comparando
 * dos snapshots HOI consecutivos del mismo evento.
 *
 * Esta función no modifica Firestore.
 * No escucha el runtime.
 * No consume métricas crudas.
 * No consume Tournament Operational Analytics directamente.
 * No emite recomendaciones operativas.
 * No predice resultados futuros.
 */
export function createOperationalContinuityIntelligence({
  previousHwarangOperationalIntelligenceSnapshot,
  currentHwarangOperationalIntelligenceSnapshot,
} = {}) {
  if (!previousHwarangOperationalIntelligenceSnapshot) {
    throw new Error(
      "previousHwarangOperationalIntelligenceSnapshot is required to create operational continuity intelligence"
    );
  }

  if (!currentHwarangOperationalIntelligenceSnapshot) {
    throw new Error(
      "currentHwarangOperationalIntelligenceSnapshot is required to create operational continuity intelligence"
    );
  }

  if (
    previousHwarangOperationalIntelligenceSnapshot.eventId !==
    currentHwarangOperationalIntelligenceSnapshot.eventId
  ) {
    throw new Error(
      "operational continuity intelligence requires snapshots from the same event"
    );
  }

  const previousConfidence = Number(
    previousHwarangOperationalIntelligenceSnapshot.assessment?.confidence
  );
  const currentConfidence = Number(
    currentHwarangOperationalIntelligenceSnapshot.assessment?.confidence
  );

  if (!Number.isFinite(previousConfidence)) {
    throw new Error(
      "previous assessment confidence must be a finite number"
    );
  }

  if (!Number.isFinite(currentConfidence)) {
    throw new Error(
      "current assessment confidence must be a finite number"
    );
  }

  const severityWeights = Object.freeze({
    [INSIGHT_SEVERITY.NORMAL]: 0,
    [INSIGHT_SEVERITY.WATCH]: 1,
    [INSIGHT_SEVERITY.ATTENTION]: 2,
    [INSIGHT_SEVERITY.CRITICAL]: 3,
  });

  const previousSeverity =
    previousHwarangOperationalIntelligenceSnapshot.assessment?.severity;
  const currentSeverity =
    currentHwarangOperationalIntelligenceSnapshot.assessment?.severity;

  if (!(previousSeverity in severityWeights)) {
    throw new Error(
      "previous assessment severity must be a known INSIGHT_SEVERITY value"
    );
  }

  if (!(currentSeverity in severityWeights)) {
    throw new Error(
      "current assessment severity must be a known INSIGHT_SEVERITY value"
    );
  }

  const previousSeverityScore = severityWeights[previousSeverity];
  const currentSeverityScore = severityWeights[currentSeverity];

  let status = "STABLE";

  if (
    currentSeverityScore > previousSeverityScore ||
    currentConfidence > previousConfidence
  ) {
    status = "DETERIORATING";
  } else if (
    currentSeverityScore < previousSeverityScore ||
    currentConfidence < previousConfidence
  ) {
    status = "IMPROVING";
  }

  const summary =
    status === "STABLE"
      ? "Operational condition remained stable compared with the previous HOI snapshot."
      : status === "IMPROVING"
        ? "Operational condition improved compared with the previous HOI snapshot."
        : "Operational condition deteriorated compared with the previous HOI snapshot.";

  return createOperationalIntelligenceContract({
    intelligenceId: "operational-continuity",
    intelligenceType: "OPERATIONAL_CONTINUITY",
    status,
    confidence:
      previousSeverityScore !== currentSeverityScore ||
      previousConfidence !== currentConfidence
        ? 1
        : 0,
    summary,
    correlatedInsights: Object.freeze([]),
    evidenceMap: Object.freeze({
      previousGeneratedAt:
        previousHwarangOperationalIntelligenceSnapshot.generatedAt,
      currentGeneratedAt:
        currentHwarangOperationalIntelligenceSnapshot.generatedAt,
      previousSeverity,
      currentSeverity,
      previousSeverityScore,
      currentSeverityScore,
      previousConfidence,
      currentConfidence,
      confidenceDelta: currentConfidence - previousConfidence,
      continuityBasis: "HOI_SNAPSHOT_COMPARISON",
    }),
    interpretation:
      "Operational continuity reflects how the current HOI assessment changed compared with the previous HOI snapshot from the same event.",
    limitations: Object.freeze([
      "This intelligence compares only consecutive Hwarang Operational Intelligence snapshots from the same event.",
      "This intelligence does not consume raw metrics, arena data, tournament analytics, or external data sources.",
      "This intelligence does not emit operational recommendations or predictive forecasts.",
    ]),
  });
}
/**
 * ============================================================
 * TOURNAMENT OPERATIONAL ANALYTICS CONTRACT
 * ============================================================
 */
/**
 * Construye una foto contractual de analítica operacional del torneo.
 *
 * Esta capa no representa el estado bruto del torneo.
 * Recibe una Tournament Control Tower Snapshot y calcula indicadores.
 *
 * Esta función no modifica Firestore.
 * No escucha el runtime.
 * No consume créditos.
 * No altera President Screen.
 * No altera Public Screen.
 * No crea Matches.
 * No emite recomendaciones operativas.
 */
export function createTournamentOperationalAnalyticsSnapshot({
  eventId,
  controlTowerSnapshot,
  generatedAt,
} = {}) {
  const cleanEventId = cleanId(eventId);
  const cleanGeneratedAt = cleanId(generatedAt);

  if (!cleanEventId) {
    throw new Error(
      "eventId is required to create a tournament operational analytics snapshot"
    );
  }

  if (!controlTowerSnapshot) {
    throw new Error(
      "controlTowerSnapshot is required to create a tournament operational analytics snapshot"
    );
  }

  if (!cleanGeneratedAt) {
    throw new Error(
      "generatedAt is required to create a tournament operational analytics snapshot"
    );
  }

  const arenas = Number(controlTowerSnapshot.arenas);
  const matches = Number(controlTowerSnapshot.matches);
  const elapsedMinutes = Number(
    controlTowerSnapshot.arenaOperationalStatus?.reduce(
      (maxElapsedMinutes, arena) =>
        Math.max(
          maxElapsedMinutes,
          Number(arena.operationalContext?.elapsedMinutes) || 0
        ),
      0
    )
  );

  if (!Number.isInteger(arenas) || arenas < 0) {
    throw new Error("arenas must be a non-negative integer");
  }

  if (!Number.isInteger(matches) || matches < 0) {
    throw new Error("matches must be a non-negative integer");
  }

  const averageMatchesPerArena =
    arenas > 0 ? matches / arenas : 0;
  const averageMatchesPerHour =
    elapsedMinutes > 0 ? matches / (elapsedMinutes / 60) : 0;

  const arenaPerformanceIndex = Object.freeze(
    controlTowerSnapshot.arenaOperationalStatus.map((arena) => {
      const arenaElapsedMinutes =
        Number(arena.operationalContext?.elapsedMinutes) || 0;
      const arenaIdleMinutes =
        Number(arena.operationalContext?.idleMinutes) || 0;
      const arenaActiveMinutes = Math.max(
        arenaElapsedMinutes - arenaIdleMinutes,
        0
      );
      const arenaMatchesCompleted =
        Number(arena.matchesCompleted) || 0;

      return Object.freeze({
        arenaId: arena.arenaId,
        performanceScore:
          arenaActiveMinutes > 0
            ? arenaMatchesCompleted / (arenaActiveMinutes / 60)
            : 0,
      });
    })
  );

  const arenaPerformanceRanking = Object.freeze(
    [...arenaPerformanceIndex]
      .sort(
        (leftArena, rightArena) =>
          rightArena.performanceScore - leftArena.performanceScore
      )
      .map((arena, index) =>
        Object.freeze({
          position: index + 1,
          arenaId: arena.arenaId,
          performanceScore: arena.performanceScore,
        })
      )
  );

  const tournamentPerformanceIndex =
    arenaPerformanceIndex.length > 0
      ? arenaPerformanceIndex.reduce(
          (total, arena) => total + arena.performanceScore,
          0
        ) / arenaPerformanceIndex.length
      : 0;
  const operationalBalanceInsight = createOperationalBalanceInsight({
    arenaPerformanceIndex,
    tournamentPerformanceIndex,
  });

  const tournamentFlowInsight = createTournamentFlowInsight({
    controlTowerSnapshot,
  });

  const arenaAttentionInsight = createArenaAttentionInsight({
    controlTowerSnapshot,
  });

  return Object.freeze({
    contractVersion: EVENT_PROVISIONING_CONTRACT_VERSION,
    eventId: cleanEventId,
    generatedAt: cleanGeneratedAt,

    metrics: Object.freeze({
      arenas,
      matches,
      elapsedMinutes,
      averageMatchesPerArena,
      averageMatchesPerHour,
    }),

    indexes: Object.freeze({
      arenaPerformanceIndex,
      arenaPerformanceRanking,
      tournamentPerformanceIndex,
    }),

    insights: Object.freeze([
      operationalBalanceInsight,
      tournamentFlowInsight,
      arenaAttentionInsight,
    ]),
  });
}
/**
 * ============================================================
 * OPERATIONAL ASSISTANT BRIEFING CONTRACT
 * ============================================================
 */
/**
 * Construye el contrato base de comunicación operacional
 * destinado al Director del Evento.
 *
 * Operational Assistant reconstruye contexto operacional utilizando
 * exclusivamente snapshots consolidados y autorizados provenientes de:
 *
 * - Tournament Control Tower.
 * - Tournament Operational Analytics.
 * - Hwarang Operational Intelligence.
 *
 * Esta función no consume métricas crudas.
 * No consume datos primarios.
 * No recalcula métricas.
 * No recalcula índices.
 * No recalcula Insights.
 * No recalcula inteligencia operacional.
 * No modifica Firestore.
 * No escucha ni altera el runtime.
 * No reemplaza el criterio del Director del Evento.
 */
export function createOperationalAssistantBriefing({
  eventId,
  tournamentControlTowerSnapshot,
  tournamentOperationalAnalyticsSnapshot,
  hwarangOperationalIntelligenceSnapshot,
  generatedAt,
} = {}) {
  const cleanEventId = cleanId(eventId);
  const cleanGeneratedAt = cleanId(generatedAt);

  if (!cleanEventId) {
    throw new Error(
      "eventId is required to create an operational assistant briefing"
    );
  }

  if (!tournamentControlTowerSnapshot) {
    throw new Error(
      "tournamentControlTowerSnapshot is required to create an operational assistant briefing"
    );
  }

  if (!tournamentOperationalAnalyticsSnapshot) {
    throw new Error(
      "tournamentOperationalAnalyticsSnapshot is required to create an operational assistant briefing"
    );
  }

  if (!hwarangOperationalIntelligenceSnapshot) {
    throw new Error(
      "hwarangOperationalIntelligenceSnapshot is required to create an operational assistant briefing"
    );
  }

  if (!cleanGeneratedAt) {
    throw new Error(
      "generatedAt is required to create an operational assistant briefing"
    );
  }

  if (
    tournamentControlTowerSnapshot.eventId !== cleanEventId ||
    tournamentOperationalAnalyticsSnapshot.eventId !== cleanEventId ||
    hwarangOperationalIntelligenceSnapshot.eventId !== cleanEventId
  ) {
    throw new Error(
      "operational assistant briefing requires authorized snapshots from the same event"
    );
  }

  return Object.freeze({
    contractVersion: EVENT_PROVISIONING_CONTRACT_VERSION,
    eventId: cleanEventId,
    generatedAt: cleanGeneratedAt,
  });
}

