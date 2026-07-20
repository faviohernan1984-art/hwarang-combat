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

export const OPERATIONAL_ALERT_AUTHORIZED_SOURCES = Object.freeze([
  "TOURNAMENT_OPERATIONAL_ANALYTICS",
  "HWARANG_OPERATIONAL_INTELLIGENCE",
]);

const HOI_EXPECTED_INSIGHT_TYPES = Object.freeze([
  "OPERATIONAL_BALANCE",
  "TOURNAMENT_FLOW",
  "ARENA_ATTENTION",
]);

const OFFICIAL_TOA_INSIGHT_STATUS_SEVERITY = Object.freeze({
  OPERATIONAL_BALANCE: Object.freeze({
    BALANCED: INSIGHT_SEVERITY.NORMAL,
    SLIGHTLY_UNBALANCED: INSIGHT_SEVERITY.WATCH,
    UNBALANCED: INSIGHT_SEVERITY.ATTENTION,
  }),
  TOURNAMENT_FLOW: Object.freeze({
    FLOWING: INSIGHT_SEVERITY.NORMAL,
    UNKNOWN: INSIGHT_SEVERITY.WATCH,
    NOT_STARTED: INSIGHT_SEVERITY.WATCH,
    PARTIALLY_FLOWING: INSIGHT_SEVERITY.ATTENTION,
  }),
  ARENA_ATTENTION: Object.freeze({
    CLEAR: INSIGHT_SEVERITY.NORMAL,
    ATTENTION_REQUIRED: INSIGHT_SEVERITY.ATTENTION,
  }),
});

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function cleanId(value) {
  return isNonEmptyString(value) ? value.trim() : null;
}

function cleanText(value) {
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

  if (!Object.values(INSIGHT_SEVERITY).includes(cleanSeverity)) {
    throw new Error(
      "severity must be a known INSIGHT_SEVERITY value to create an insight contract"
    );
  }

  const officialStatusSeverity =
    OFFICIAL_TOA_INSIGHT_STATUS_SEVERITY[cleanInsightType];

  if (
    officialStatusSeverity &&
    officialStatusSeverity[cleanStatus] !== cleanSeverity
  ) {
    throw new Error(
      "status and severity must match the official TOA insight contract"
    );
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

  if (tournamentOperationalAnalyticsSnapshot.insights.length === 0) {
    throw new Error(
      "HOI V1 requires exactly one insight for each expected insight type"
    );
  }

  const insightIds = new Set();
  const insightTypes = new Set();

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

      if (!HOI_EXPECTED_INSIGHT_TYPES.includes(cleanInsightType)) {
        throw new Error(
          "insightType must be one of the expected HOI V1 insight types"
        );
      }

      if (insightIds.has(cleanInsightId)) {
        throw new Error("insightId must be unique inside insights");
      }

      if (insightTypes.has(cleanInsightType)) {
        throw new Error("insightType must be unique inside insights");
      }

      insightIds.add(cleanInsightId);
      insightTypes.add(cleanInsightType);

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

  const missingExpectedInsightTypes = Object.freeze(
    HOI_EXPECTED_INSIGHT_TYPES.filter(
      (insightType) => !insightTypes.has(insightType)
    )
  );

  if (missingExpectedInsightTypes.length > 0) {
    throw new Error(
      "HOI V1 requires complete expected insight coverage"
    );
  }

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

  const severityConvergenceRatio =
    correlatedInsights.length > 0
      ? elevatedSignals / correlatedInsights.length
      : 0;

  const expectedInsightTypes = HOI_EXPECTED_INSIGHT_TYPES;

  const availableInsightTypes = new Set(
    correlatedInsights.map((insight) => insight.insightType)
  );

  const availableExpectedInsightTypes = Object.freeze(
    expectedInsightTypes.filter((insightType) =>
      availableInsightTypes.has(insightType)
    )
  );

  const evidenceCoverageRatio =
    availableExpectedInsightTypes.length / expectedInsightTypes.length;

  const confidence = evidenceCoverageRatio;

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
      severityConvergenceRatio,
      expectedInsightTypes,
      availableExpectedInsightTypes,
      missingExpectedInsightTypes,
      evidenceCoverageRatio,
    }),
    interpretation,
    limitations: Object.freeze([
      "This intelligence is limited to the insights currently produced by Tournament Operational Analytics.",
      "This intelligence evaluates evidence convergence and does not emit operational recommendations.",
      "Confidence represents coverage of the insight types expected by HOI V1.",
      "Confidence does not represent severity or the number of problematic operational conditions.",
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

  const operationalCorrelationConfidence = Number(
    operationalCorrelationIntelligence.confidence
  );
  const severityConvergenceRatio = Number(
    operationalCorrelationIntelligence.evidenceMap
      ?.severityConvergenceRatio
  );

  if (
    !Number.isFinite(operationalCorrelationConfidence) ||
    operationalCorrelationConfidence < 0 ||
    operationalCorrelationConfidence > 1
  ) {
    throw new Error(
      "operational correlation confidence must be a finite number between 0 and 1"
    );
  }

  if (
    !Number.isFinite(severityConvergenceRatio) ||
    severityConvergenceRatio < 0 ||
    severityConvergenceRatio > 1
  ) {
    throw new Error(
      "severityConvergenceRatio must be a finite number between 0 and 1"
    );
  }

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
      confidence: operationalCorrelationConfidence,
      severityConvergenceRatio,
      basis: "EXPECTED_INSIGHT_COVERAGE",
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
  const continuityConfidence = Math.min(
    previousConfidence,
    currentConfidence
  );

  let status = "STABLE";

  if (currentSeverityScore > previousSeverityScore) {
    status = "DETERIORATING";
  } else if (currentSeverityScore < previousSeverityScore) {
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
    confidence: continuityConfidence,
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
 * OPERATIONAL ASSISTANT EXECUTIVE BRIEFING CONTRACT
 * ============================================================
 */
/**
 * Construye el contrato base de un Executive Briefing.
 *
 * El Executive Briefing representa la lectura operacional inmediata
 * destinada al Director del Evento.
 *
 * Esta función no consume snapshots.
 * No reconstruye contexto operacional.
 * No recalcula métricas.
 * No recalcula índices.
 * No recalcula Insights.
 * No recalcula inteligencia operacional.
 * No emite recomendaciones.
 * No reemplaza el criterio del Director del Evento.
 */
export function createExecutiveBriefing({
  status,
  severity = INSIGHT_SEVERITY.NORMAL,
  headline,
  summary,
  confidence = 0,
} = {}) {
  const cleanStatus = cleanId(status);
  const cleanSeverity = cleanId(severity);
  const cleanHeadline = cleanId(headline);
  const cleanSummary = cleanId(summary);
  const cleanConfidence = Number(confidence);

  if (!cleanStatus) {
    throw new Error(
      "status is required to create an executive briefing"
    );
  }

  if (!cleanSeverity) {
    throw new Error(
      "severity is required to create an executive briefing"
    );
  }

  if (!Object.values(INSIGHT_SEVERITY).includes(cleanSeverity)) {
    throw new Error(
      "severity must be a known INSIGHT_SEVERITY value"
    );
  }

  if (!cleanHeadline) {
    throw new Error(
      "headline is required to create an executive briefing"
    );
  }

  if (!cleanSummary) {
    throw new Error(
      "summary is required to create an executive briefing"
    );
  }

  if (
    !Number.isFinite(cleanConfidence) ||
    cleanConfidence < 0 ||
    cleanConfidence > 1
  ) {
    throw new Error(
      "confidence must be a finite number between 0 and 1"
    );
  }

  return Object.freeze({
    contractVersion: EVENT_PROVISIONING_CONTRACT_VERSION,
    status: cleanStatus,
    severity: cleanSeverity,
    headline: cleanHeadline,
    summary: cleanSummary,
    confidence: cleanConfidence,
  });
}

/**
 * ============================================================
 * OPERATIONAL ASSISTANT OPERATIONAL SUMMARY CONTRACT
 * ============================================================
 */
/**
 * Construye el contrato base de un Operational Summary.
 *
 * El Operational Summary organiza una lectura breve y estructurada
 * del estado general del torneo para el Director del Evento.
 *
 * Esta función no consume snapshots.
 * No reconstruye contexto operacional.
 * No recalcula métricas.
 * No recalcula índices.
 * No recalcula Insights.
 * No recalcula inteligencia operacional.
 * No emite recomendaciones.
 * No reemplaza el criterio del Director del Evento.
 */
export function createOperationalSummary({
  tournamentStatus,
  operationalFlow,
  operationalBalance,
  leadingArena,
  arenasRequiringAttention = 0,
  summary,
} = {}) {
  const cleanTournamentStatus = cleanId(tournamentStatus);
  const cleanOperationalFlow = cleanId(operationalFlow);
  const cleanOperationalBalance = cleanId(operationalBalance);
  const cleanLeadingArena = cleanId(leadingArena);
  const cleanArenasRequiringAttention = Number(
    arenasRequiringAttention
  );
  const cleanSummary = cleanId(summary);

  if (!cleanTournamentStatus) {
    throw new Error(
      "tournamentStatus is required to create an operational summary"
    );
  }

  if (!cleanOperationalFlow) {
    throw new Error(
      "operationalFlow is required to create an operational summary"
    );
  }

  if (!cleanOperationalBalance) {
    throw new Error(
      "operationalBalance is required to create an operational summary"
    );
  }

  if (
    !Number.isInteger(cleanArenasRequiringAttention) ||
    cleanArenasRequiringAttention < 0
  ) {
    throw new Error(
      "arenasRequiringAttention must be a non-negative integer"
    );
  }

  if (!cleanSummary) {
    throw new Error(
      "summary is required to create an operational summary"
    );
  }

  return Object.freeze({
    contractVersion: EVENT_PROVISIONING_CONTRACT_VERSION,
    tournamentStatus: cleanTournamentStatus,
    operationalFlow: cleanOperationalFlow,
    operationalBalance: cleanOperationalBalance,
    leadingArena: cleanLeadingArena,
    arenasRequiringAttention: cleanArenasRequiringAttention,
    summary: cleanSummary,
  });
}

/**
 * ============================================================
 * OPERATIONAL ASSISTANT OPERATIONAL HIGHLIGHTS CONTRACT
 * ============================================================
 */
/**
 * Construye el contrato base de Operational Highlights.
 *
 * Operational Highlights organiza los aspectos operacionales
 * más relevantes para una lectura ejecutiva rápida.
 *
 * Esta función no consume snapshots.
 * No selecciona evidencia operacional.
 * No prioriza Insights.
 * No reconstruye contexto operacional.
 * No recalcula métricas.
 * No recalcula índices.
 * No recalcula Insights.
 * No recalcula inteligencia operacional.
 * No emite recomendaciones.
 * No reemplaza el criterio del Director del Evento.
 */
export function createOperationalHighlights({
  status,
  highlights = [],
  summary,
} = {}) {
  const cleanStatus = cleanId(status);
  const cleanSummary = cleanId(summary);

  if (!cleanStatus) {
    throw new Error(
      "status is required to create operational highlights"
    );
  }

  if (!Array.isArray(highlights)) {
    throw new Error(
      "highlights must be an array"
    );
  }

  if (!cleanSummary) {
    throw new Error(
      "summary is required to create operational highlights"
    );
  }

  const cleanHighlights = Object.freeze(
    highlights.map((highlight) => {
      const cleanHighlightId = cleanId(highlight.highlightId);
      const cleanHighlightType = cleanId(highlight.highlightType);
      const cleanSeverity = cleanId(highlight.severity);
      const cleanHeadline = cleanId(highlight.headline);
      const cleanDetail = cleanId(highlight.detail);
      const cleanSource = cleanId(highlight.source);

      if (!cleanHighlightId) {
        throw new Error(
          "highlightId is required inside operational highlights"
        );
      }

      if (!cleanHighlightType) {
        throw new Error(
          "highlightType is required inside operational highlights"
        );
      }

      if (
        !cleanSeverity ||
        !Object.values(INSIGHT_SEVERITY).includes(cleanSeverity)
      ) {
        throw new Error(
          "severity must be a known INSIGHT_SEVERITY value inside operational highlights"
        );
      }

      if (!cleanHeadline) {
        throw new Error(
          "headline is required inside operational highlights"
        );
      }

      if (!cleanDetail) {
        throw new Error(
          "detail is required inside operational highlights"
        );
      }

      if (!cleanSource) {
        throw new Error(
          "source is required inside operational highlights"
        );
      }

      return Object.freeze({
        highlightId: cleanHighlightId,
        highlightType: cleanHighlightType,
        severity: cleanSeverity,
        headline: cleanHeadline,
        detail: cleanDetail,
        source: cleanSource,
      });
    })
  );

  return Object.freeze({
    contractVersion: EVENT_PROVISIONING_CONTRACT_VERSION,
    status: cleanStatus,
    highlights: cleanHighlights,
    highlightCount: cleanHighlights.length,
    summary: cleanSummary,
  });
}

/**
 * ============================================================
 * OPERATIONAL ASSISTANT RECOMMENDATIONS CONTRACT
 * ============================================================
 */
/**
 * Construye el contrato base de Recommendations.
 *
 * Recommendations organiza sugerencias operacionales no vinculantes
 * destinadas a respaldar el criterio del Director del Evento.
 *
 * Esta función no consume snapshots.
 * No reconstruye contexto operacional.
 * No selecciona evidencia.
 * No recalcula métricas.
 * No recalcula índices.
 * No recalcula Insights.
 * No recalcula inteligencia operacional.
 * No emite órdenes obligatorias.
 * No modifica el torneo.
 * No reemplaza el criterio del Director del Evento.
 */
export function createRecommendations({
  status,
  recommendations = [],
  summary,
} = {}) {
  const cleanStatus = cleanId(status);
  const cleanSummary = cleanId(summary);

  if (!cleanStatus) {
    throw new Error(
      "status is required to create recommendations"
    );
  }

  if (!Array.isArray(recommendations)) {
    throw new Error(
      "recommendations must be an array"
    );
  }

  if (!cleanSummary) {
    throw new Error(
      "summary is required to create recommendations"
    );
  }

  const cleanRecommendations = Object.freeze(
    recommendations.map((recommendation) => {
      const cleanRecommendationId = cleanId(
        recommendation.recommendationId
      );
      const cleanRecommendationType = cleanId(
        recommendation.recommendationType
      );
      const cleanPriority = cleanId(recommendation.priority);
      const cleanMessage = cleanId(recommendation.message);
      const cleanRationale = cleanId(recommendation.rationale);
      const cleanSource = cleanId(recommendation.source);

      if (!cleanRecommendationId) {
        throw new Error(
          "recommendationId is required inside recommendations"
        );
      }

      if (!cleanRecommendationType) {
        throw new Error(
          "recommendationType is required inside recommendations"
        );
      }

      if (
        !cleanPriority ||
        !Object.values(INSIGHT_SEVERITY).includes(cleanPriority)
      ) {
        throw new Error(
          "priority must be a known INSIGHT_SEVERITY value inside recommendations"
        );
      }

      if (!cleanMessage) {
        throw new Error(
          "message is required inside recommendations"
        );
      }

      if (!cleanRationale) {
        throw new Error(
          "rationale is required inside recommendations"
        );
      }

      if (!cleanSource) {
        throw new Error(
          "source is required inside recommendations"
        );
      }

      return Object.freeze({
        recommendationId: cleanRecommendationId,
        recommendationType: cleanRecommendationType,
        priority: cleanPriority,
        message: cleanMessage,
        rationale: cleanRationale,
        source: cleanSource,
        advisoryOnly: true,
      });
    })
  );

  return Object.freeze({
    contractVersion: EVENT_PROVISIONING_CONTRACT_VERSION,
    status: cleanStatus,
    recommendations: cleanRecommendations,
    recommendationCount: cleanRecommendations.length,
    advisoryOnly: true,
    summary: cleanSummary,
  });
}

/**
 * ============================================================
 * OPERATIONAL ASSISTANT OPERATIONAL ALERTS CONTRACT
 * ============================================================
 */
/**
 * Construye el contrato base de Operational Alerts.
 *
 * Operational Alerts organiza condiciones que requieren
 * conciencia inmediata por parte del Director del Evento.
 *
 * Esta función no consume snapshots.
 * No detecta condiciones operacionales.
 * No selecciona evidencia.
 * No reconstruye contexto operacional.
 * No recalcula métricas.
 * No recalcula índices.
 * No recalcula Insights.
 * No recalcula inteligencia operacional.
 * No emite recomendaciones.
 * No ejecuta acciones.
 * No reemplaza el criterio del Director del Evento.
 */
export function createOperationalAlerts({
  status,
  alerts = [],
  summary,
} = {}) {
  const cleanStatus = cleanId(status);
  const cleanSummary = cleanId(summary);

  if (!cleanStatus) {
    throw new Error(
      "status is required to create operational alerts"
    );
  }

  if (!Array.isArray(alerts)) {
    throw new Error(
      "alerts must be an array"
    );
  }

  if (!cleanSummary) {
    throw new Error(
      "summary is required to create operational alerts"
    );
  }

  const cleanAlerts = Object.freeze(
    alerts.map((alert) => {
      const cleanAlertId = cleanId(alert.alertId);
      const cleanAlertType = cleanId(alert.alertType);
      const cleanSeverity = cleanId(alert.severity);
      const cleanPriority = cleanId(alert.priority);
      const cleanMessage = cleanText(alert.message);
      const cleanTrigger = cleanText(alert.trigger);
      const cleanSource = cleanId(alert.source);

      if (!cleanAlertId) {
        throw new Error(
          "alertId is required inside operational alerts"
        );
      }

      if (!cleanAlertType) {
        throw new Error(
          "alertType is required inside operational alerts"
        );
      }

      if (
        !cleanSeverity ||
        !Object.values(INSIGHT_SEVERITY).includes(cleanSeverity)
      ) {
        throw new Error(
          "severity must be a known INSIGHT_SEVERITY value inside operational alerts"
        );
      }

      if (cleanSeverity === INSIGHT_SEVERITY.NORMAL) {
        throw new Error(
          "operational alerts cannot use NORMAL severity"
        );
      }

      if (
        !cleanPriority ||
        !Object.values(OPERATIONAL_ALERT_PRIORITY).includes(
          cleanPriority
        )
      ) {
        throw new Error(
          "priority must be a known OPERATIONAL_ALERT_PRIORITY value inside operational alerts"
        );
      }

      if (!cleanMessage) {
        throw new Error(
          "message is required inside operational alerts"
        );
      }

      if (!cleanTrigger) {
        throw new Error(
          "trigger is required inside operational alerts"
        );
      }

      if (!cleanSource) {
        throw new Error(
          "source is required inside operational alerts"
        );
      }

      if (!OPERATIONAL_ALERT_AUTHORIZED_SOURCES.includes(cleanSource)) {
        throw new Error(
          "source must be authorized for operational alerts"
        );
      }

      return Object.freeze({
        alertId: cleanAlertId,
        alertType: cleanAlertType,
        severity: cleanSeverity,
        priority: cleanPriority,
        message: cleanMessage,
        trigger: cleanTrigger,
        source: cleanSource,
        awarenessOnly: true,
      });
    })
  );

  const alertIds = new Set();

  cleanAlerts.forEach((alert) => {
    if (alertIds.has(alert.alertId)) {
      throw new Error(
        "alertId must be unique inside operational alerts"
      );
    }

    alertIds.add(alert.alertId);
  });

  if (cleanStatus === "CLEAR" && cleanAlerts.length > 0) {
    throw new Error(
      "CLEAR operational alerts cannot contain active alerts"
    );
  }

  if (
    cleanStatus === "ACTIVE_ALERTS" &&
    cleanAlerts.length === 0
  ) {
    throw new Error(
      "ACTIVE_ALERTS operational alerts must contain at least one alert"
    );
  }

  return Object.freeze({
    contractVersion: EVENT_PROVISIONING_CONTRACT_VERSION,
    status: cleanStatus,
    alerts: cleanAlerts,
    alertCount: cleanAlerts.length,
    awarenessOnly: true,
    summary: cleanSummary,
  });
}

/**
 * ============================================================
 * OPERATIONAL ASSISTANT CHANGE DETECTION CONTRACT
 * ============================================================
 */
/**
 * Construye el contrato base de Change Detection.
 *
 * Change Detection organiza cambios operacionales ya identificados
 * entre estados consolidados y autorizados.
 *
 * Esta función no consume snapshots.
 * No compara estados operacionales.
 * No detecta cambios.
 * No reconstruye contexto operacional.
 * No recalcula métricas.
 * No recalcula índices.
 * No recalcula Insights.
 * No recalcula inteligencia operacional.
 * No evalúa gravedad, urgencia, impacto ni prioridad.
 * No genera alertas.
 * No emite recomendaciones.
 * No ejecuta acciones.
 * No reemplaza el criterio del Director del Evento.
 */
export function createChangeDetection({
  status,
  changes = [],
  summary,
} = {}) {
  const cleanStatus = cleanId(status);
  const cleanSummary = cleanId(summary);

  if (!cleanStatus) {
    throw new Error(
      "status is required to create change detection"
    );
  }

  if (!Array.isArray(changes)) {
    throw new Error(
      "changes must be an array"
    );
  }

  if (!cleanSummary) {
    throw new Error(
      "summary is required to create change detection"
    );
  }

  const allowedDirections = Object.freeze([
    "STABLE",
    "IMPROVING",
    "DETERIORATING",
    "CHANGED",
  ]);

  const cleanChanges = Object.freeze(
    changes.map((change) => {
      const cleanChangeId = cleanId(change.changeId);
      const cleanChangeType = cleanId(change.changeType);
      const cleanDirection = cleanId(change.direction);
      const cleanPreviousValue = cleanId(change.previousValue);
      const cleanCurrentValue = cleanId(change.currentValue);
      const cleanMessage = cleanText(change.message);
      const cleanSource = cleanId(change.source);

      if (!cleanChangeId) {
        throw new Error(
          "changeId is required inside change detection"
        );
      }

      if (!cleanChangeType) {
        throw new Error(
          "changeType is required inside change detection"
        );
      }

      if (
        !cleanDirection ||
        !allowedDirections.includes(cleanDirection)
      ) {
        throw new Error(
          "direction must be a known change direction inside change detection"
        );
      }

      if (!cleanPreviousValue) {
        throw new Error(
          "previousValue is required inside change detection"
        );
      }

      if (!cleanCurrentValue) {
        throw new Error(
          "currentValue is required inside change detection"
        );
      }

      if (!cleanMessage) {
        throw new Error(
          "message is required inside change detection"
        );
      }

      if (!cleanSource) {
        throw new Error(
          "source is required inside change detection"
        );
      }

      return Object.freeze({
        changeId: cleanChangeId,
        changeType: cleanChangeType,
        direction: cleanDirection,
        previousValue: cleanPreviousValue,
        currentValue: cleanCurrentValue,
        message: cleanMessage,
        source: cleanSource,
      });
    })
  );

  if (
    cleanStatus === "NO_CHANGES" &&
    cleanChanges.length > 0
  ) {
    throw new Error(
      "NO_CHANGES cannot contain operational changes"
    );
  }

  if (
    cleanStatus === "CHANGES_DETECTED" &&
    cleanChanges.length === 0
  ) {
    throw new Error(
      "CHANGES_DETECTED must contain at least one operational change"
    );
  }

  return Object.freeze({
    contractVersion: EVENT_PROVISIONING_CONTRACT_VERSION,
    status: cleanStatus,
    changes: cleanChanges,
    changeCount: cleanChanges.length,
    summary: cleanSummary,
  });
}

/**
 * ============================================================
 * OPERATIONAL ASSISTANT EVIDENCE SUMMARY CONTRACT
 * ============================================================
 */

export const EVIDENCE_SUMMARY_AUTHORIZED_SOURCES = Object.freeze([
  "TOURNAMENT_OPERATIONAL_ANALYTICS",
  "HWARANG_OPERATIONAL_INTELLIGENCE",
  "CHANGE_DETECTION",
]);

/**
 * Construye el contrato base de Evidence Summary.
 *
 * Evidence Summary organiza evidencia operacional previamente
 * consolidada y autorizada para respaldar la comunicación
 * destinada al Director del Evento.
 *
 * Esta función no consume snapshots.
 * No selecciona evidencia.
 * No interpreta evidencia.
 * No reconstruye contexto operacional.
 * No recalcula métricas.
 * No recalcula índices.
 * No recalcula Insights.
 * No recalcula inteligencia operacional.
 * No genera conclusiones.
 * No genera alertas.
 * No emite recomendaciones.
 * No ejecuta acciones.
 * No reemplaza el criterio del Director del Evento.
 */
export function createEvidenceSummary({
  status,
  evidenceItems = [],
  summary,
} = {}) {
  const cleanStatus = cleanId(status);
  const cleanSummary = cleanId(summary);

  if (!cleanStatus) {
    throw new Error(
      "status is required to create an evidence summary"
    );
  }

  if (!Array.isArray(evidenceItems)) {
    throw new Error(
      "evidenceItems must be an array"
    );
  }

  if (!cleanSummary) {
    throw new Error(
      "summary is required to create an evidence summary"
    );
  }

  const cleanEvidenceItems = Object.freeze(
    evidenceItems.map((evidenceItem) => {
      const cleanEvidenceId = cleanId(
        evidenceItem.evidenceId
      );
      const cleanEvidenceType = cleanId(
        evidenceItem.evidenceType
      );
      const cleanSeverity = cleanId(
        evidenceItem.severity
      );
      const cleanStatement = cleanId(
        evidenceItem.statement
      );
      const cleanSource = cleanId(
        evidenceItem.source
      );
      const cleanSourceReference = cleanId(
        evidenceItem.sourceReference
      );

      if (!cleanEvidenceId) {
        throw new Error(
          "evidenceId is required inside evidence summary"
        );
      }

      if (!cleanEvidenceType) {
        throw new Error(
          "evidenceType is required inside evidence summary"
        );
      }

      if (
        cleanSeverity &&
        !Object.values(INSIGHT_SEVERITY).includes(cleanSeverity)
      ) {
        throw new Error(
          "severity must be a known INSIGHT_SEVERITY value inside evidence summary"
        );
      }

      if (!cleanStatement) {
        throw new Error(
          "statement is required inside evidence summary"
        );
      }

      if (
        !cleanSource ||
        !EVIDENCE_SUMMARY_AUTHORIZED_SOURCES.includes(cleanSource)
      ) {
        throw new Error(
          "source must be an authorized Evidence Summary source"
        );
      }

      if (!cleanSourceReference) {
        throw new Error(
          "sourceReference is required inside evidence summary"
        );
      }

      const cleanEvidenceItem = {
        evidenceId: cleanEvidenceId,
        evidenceType: cleanEvidenceType,
        statement: cleanStatement,
        source: cleanSource,
        sourceReference: cleanSourceReference,
      };

      if (cleanSeverity) {
        cleanEvidenceItem.severity = cleanSeverity;
      }

      return Object.freeze(cleanEvidenceItem);
    })
  );

  if (
    cleanStatus === "NO_EVIDENCE_AVAILABLE" &&
    cleanEvidenceItems.length > 0
  ) {
    throw new Error(
      "NO_EVIDENCE_AVAILABLE cannot contain evidence items"
    );
  }

  if (
    cleanStatus === "EVIDENCE_AVAILABLE" &&
    cleanEvidenceItems.length === 0
  ) {
    throw new Error(
      "EVIDENCE_AVAILABLE must contain at least one evidence item"
    );
  }

  return Object.freeze({
    contractVersion: EVENT_PROVISIONING_CONTRACT_VERSION,
    status: cleanStatus,
    evidenceItems: cleanEvidenceItems,
    evidenceCount: cleanEvidenceItems.length,
    authorizedSources: EVIDENCE_SUMMARY_AUTHORIZED_SOURCES,
    summary: cleanSummary,
  });
}

export const DECISION_CONFIDENCE_LEVEL = Object.freeze({
  VERY_LOW: "VERY_LOW",
  LOW: "LOW",
  MODERATE: "MODERATE",
  HIGH: "HIGH",
  VERY_HIGH: "VERY_HIGH",
});

export const OPERATIONAL_ALERT_PRIORITY = Object.freeze({
  IMMEDIATE: "IMMEDIATE",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
});

/**
 * ============================================================
 * OPERATIONAL ASSISTANT DECISION CONFIDENCE SUPPORT CONTRACT
 * ============================================================
 */

/**
 * Confidence qualifies explanations.
 * It never qualifies facts.
 */

/**
 * Construye el contrato base de Decision Confidence Support.
 *
 * Decision Confidence Support comunica el nivel de confianza
 * asociado al informe generado por Operational Assistant.
 *
 * Esta función no consume snapshots.
 * No recalcula métricas.
 * No recalcula índices.
 * No recalcula Insights.
 * No recalcula inteligencia operacional.
 * No genera evidencia.
 * No genera conclusiones.
 * No modifica recomendaciones.
 * No modifica alertas.
 * No reemplaza el criterio del Director del Evento.
 */
export function createDecisionConfidenceSupport({
  status,
  overallConfidence,
  confidenceFactors = [],
  limitations = [],
  summary,
} = {}) {
  const cleanStatus = cleanId(status);
  const cleanOverallConfidence = cleanId(overallConfidence);
  const cleanSummary = cleanId(summary);

  if (!cleanStatus) {
    throw new Error(
      "status is required to create decision confidence support"
    );
  }

  if (
    !cleanOverallConfidence ||
    !Object.values(DECISION_CONFIDENCE_LEVEL).includes(
      cleanOverallConfidence
    )
  ) {
    throw new Error(
      "overallConfidence must be a known DECISION_CONFIDENCE_LEVEL value"
    );
  }

  if (!Array.isArray(confidenceFactors)) {
    throw new Error(
      "confidenceFactors must be an array"
    );
  }

  if (!Array.isArray(limitations)) {
    throw new Error(
      "limitations must be an array"
    );
  }

  if (!cleanSummary) {
    throw new Error(
      "summary is required to create decision confidence support"
    );
  }

  const cleanConfidenceFactors = Object.freeze(
    confidenceFactors.map((factor) => {
      const cleanConfidenceId = cleanId(
        factor.confidenceId
      );
      const cleanConfidenceType = cleanId(
        factor.confidenceType
      );
      const cleanConfidenceLevel = cleanId(
        factor.confidenceLevel
      );
      const cleanRationale = cleanId(
        factor.rationale
      );
      const cleanSource = cleanId(
        factor.source
      );

      if (!cleanConfidenceId) {
        throw new Error(
          "confidenceId is required inside decision confidence support"
        );
      }

      if (!cleanConfidenceType) {
        throw new Error(
          "confidenceType is required inside decision confidence support"
        );
      }

      if (
        !cleanConfidenceLevel ||
        !Object.values(DECISION_CONFIDENCE_LEVEL).includes(
          cleanConfidenceLevel
        )
      ) {
        throw new Error(
          "confidenceLevel must be a known DECISION_CONFIDENCE_LEVEL value"
        );
      }

      if (!cleanRationale) {
        throw new Error(
          "rationale is required inside decision confidence support"
        );
      }

      if (!cleanSource) {
        throw new Error(
          "source is required inside decision confidence support"
        );
      }

      return Object.freeze({
        confidenceId: cleanConfidenceId,
        confidenceType: cleanConfidenceType,
        confidenceLevel: cleanConfidenceLevel,
        rationale: cleanRationale,
        source: cleanSource,
      });
    })
  );

  return Object.freeze({
    contractVersion: EVENT_PROVISIONING_CONTRACT_VERSION,
    status: cleanStatus,
    overallConfidence: cleanOverallConfidence,
    confidenceFactors: cleanConfidenceFactors,
    confidenceFactorCount: cleanConfidenceFactors.length,
    limitations: Object.freeze(limitations),
    summary: cleanSummary,
  });
}

/**
 * ============================================================
 * OPERATIONAL ALERTS BUILDER
 * ============================================================
 */

/**
 * Construye Operational Alerts utilizando exclusivamente
 * componentes consolidados del Operational Assistant.
 *
 * Esta función no recalcula métricas.
 * No interpreta Insights.
 * No genera inteligencia.
 * No emite recomendaciones.
 * No decide acciones.
 * Únicamente ordena condiciones por prioridad de atención.
 */
export function buildOperationalAlerts({
  hoiAssessment,
  hoiAssessmentSummary,
  operationalInsights,
  changeDetection,
} = {}) {
  if (!hoiAssessment) {
    throw new Error(
      "hoiAssessment is required to build operational alerts"
    );
  }

  if (!Array.isArray(operationalInsights)) {
    throw new Error(
      "operationalInsights must be an array"
    );
  }

  if (
    changeDetection &&
    !Array.isArray(changeDetection.changes)
  ) {
    throw new Error(
      "changeDetection.changes must be an array"
    );
  }

  const cleanAssessmentStatus = cleanId(hoiAssessment.status);
  const cleanAssessmentSeverity = cleanId(hoiAssessment.severity);
  const cleanAssessmentSummary = cleanText(hoiAssessmentSummary);

  if (!cleanAssessmentStatus) {
    throw new Error(
      "hoiAssessment.status is required to build operational alerts"
    );
  }

  if (
    !cleanAssessmentSeverity ||
    !Object.values(INSIGHT_SEVERITY).includes(cleanAssessmentSeverity)
  ) {
    throw new Error(
      "hoiAssessment.severity must be a known INSIGHT_SEVERITY value to build operational alerts"
    );
  }

  if (!cleanAssessmentSummary) {
    throw new Error(
      "hoiAssessmentSummary is required to build operational alerts"
    );
  }

  const requiresExplicitAttention = (severity) =>
    severity === INSIGHT_SEVERITY.CRITICAL ||
    severity === INSIGHT_SEVERITY.ATTENTION;

  const communicationPriorityFor = (severity) =>
    severity === INSIGHT_SEVERITY.CRITICAL
      ? OPERATIONAL_ALERT_PRIORITY.IMMEDIATE
      : OPERATIONAL_ALERT_PRIORITY.HIGH;

  const temporalContextByType = new Map();

  (changeDetection?.changes || []).forEach((change) => {
    const cleanChangeType = cleanId(change.changeType);
    const cleanChangeMessage = cleanText(change.message);

    if (!cleanChangeType || !cleanChangeMessage) {
      return;
    }

    const messages = temporalContextByType.get(cleanChangeType) || [];
    messages.push(cleanChangeMessage);
    temporalContextByType.set(cleanChangeType, messages);
  });

  const triggerWithTemporalContext = (conditionType, trigger) => {
    const cleanTrigger = cleanText(trigger);
    const temporalContext = temporalContextByType.get(conditionType);

    return temporalContext?.length > 0
      ? `${cleanTrigger} Temporal context: ${temporalContext.join(" ")}`
      : cleanTrigger;
  };

  const alerts = [];

  if (requiresExplicitAttention(cleanAssessmentSeverity)) {
    alerts.push({
      alertId: "hoi-assessment",
      alertType: "HOI_ASSESSMENT",
      severity: cleanAssessmentSeverity,
      priority: communicationPriorityFor(cleanAssessmentSeverity),
      message:
        `The tournament assessment is currently ${cleanAssessmentStatus}.`,
      trigger: triggerWithTemporalContext(
        "HOI_ASSESSMENT",
        cleanAssessmentSummary
      ),
      source: "HWARANG_OPERATIONAL_INTELLIGENCE",
    });
  }

  operationalInsights.forEach((insight) => {
    const cleanInsightId = cleanId(insight.insightId);
    const cleanInsightType = cleanId(insight.insightType);
    const cleanInsightStatus = cleanId(insight.status);
    const cleanInsightSeverity = cleanId(insight.severity);
    const cleanInsightSummary = cleanText(insight.summary);

    if (!cleanInsightId) {
      throw new Error(
        "insightId is required inside operationalInsights to build operational alerts"
      );
    }

    if (!cleanInsightType) {
      throw new Error(
        "insightType is required inside operationalInsights to build operational alerts"
      );
    }

    if (!cleanInsightStatus) {
      throw new Error(
        "status is required inside operationalInsights to build operational alerts"
      );
    }

    if (
      !cleanInsightSeverity ||
      !Object.values(INSIGHT_SEVERITY).includes(cleanInsightSeverity)
    ) {
      throw new Error(
        "severity must be a known INSIGHT_SEVERITY value inside operationalInsights to build operational alerts"
      );
    }

    if (!cleanInsightSummary) {
      throw new Error(
        "summary is required inside operationalInsights to build operational alerts"
      );
    }

    if (requiresExplicitAttention(cleanInsightSeverity)) {
      alerts.push({
        alertId: `toa-${cleanInsightId}`,
        alertType: cleanInsightType,
        severity: cleanInsightSeverity,
        priority: communicationPriorityFor(cleanInsightSeverity),
        message:
          `${cleanInsightType} is currently ${cleanInsightStatus}.`,
        trigger: triggerWithTemporalContext(
          cleanInsightType,
          cleanInsightSummary
        ),
        source: "TOURNAMENT_OPERATIONAL_ANALYTICS",
      });
    }
  });

  const priorityOrder = Object.freeze({
    [OPERATIONAL_ALERT_PRIORITY.IMMEDIATE]: 0,
    [OPERATIONAL_ALERT_PRIORITY.HIGH]: 1,
    [OPERATIONAL_ALERT_PRIORITY.MEDIUM]: 2,
    [OPERATIONAL_ALERT_PRIORITY.LOW]: 3,
  });

  const prioritizedAlerts = [...alerts].sort(
    (leftAlert, rightAlert) =>
      priorityOrder[leftAlert.priority] -
      priorityOrder[rightAlert.priority]
  );

  return createOperationalAlerts({
    status:
      prioritizedAlerts.length > 0
        ? "ACTIVE_ALERTS"
        : "CLEAR",
    alerts: prioritizedAlerts,
    summary:
      prioritizedAlerts.length > 0
        ? `${prioritizedAlerts.length} operational alerts require prioritized attention.`
        : "No operational conditions currently require prioritized attention.",
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

  const hoiAssessment =
    hwarangOperationalIntelligenceSnapshot.assessment;

  if (!hoiAssessment) {
    throw new Error(
      "hwarangOperationalIntelligenceSnapshot.assessment is required to create an operational assistant briefing"
    );
  }

  const assessmentStatus = cleanId(hoiAssessment.status);
  const assessmentSeverity = cleanId(hoiAssessment.severity);
  const assessmentConfidence = Number(hoiAssessment.confidence);

  if (!assessmentStatus) {
    throw new Error(
      "assessment.status is required to create an operational assistant briefing"
    );
  }

  if (
    !assessmentSeverity ||
    !Object.values(INSIGHT_SEVERITY).includes(assessmentSeverity)
  ) {
    throw new Error(
      "assessment.severity must be a known INSIGHT_SEVERITY value"
    );
  }

  if (
    !Number.isFinite(assessmentConfidence) ||
    assessmentConfidence < 0 ||
    assessmentConfidence > 1
  ) {
    throw new Error(
      "assessment.confidence must be a finite number between 0 and 1"
    );
  }

  const executiveHeadline =
    assessmentSeverity === INSIGHT_SEVERITY.CRITICAL
      ? "The tournament requires immediate operational attention."
      : assessmentSeverity === INSIGHT_SEVERITY.ATTENTION
        ? "The tournament shows operational conditions requiring attention."
        : assessmentSeverity === INSIGHT_SEVERITY.WATCH
          ? "The tournament shows operational conditions that should be monitored."
          : "The tournament maintains a stable operational condition.";

  const executiveBriefing = createExecutiveBriefing({
    status: assessmentStatus,
    severity: assessmentSeverity,
    headline: executiveHeadline,
    summary:
      hwarangOperationalIntelligenceSnapshot
        .operationalCorrelationIntelligence?.summary,
    confidence: assessmentConfidence,
  });

  const operationalInsights =
    tournamentOperationalAnalyticsSnapshot.insights;

  if (!Array.isArray(operationalInsights)) {
    throw new Error(
      "tournamentOperationalAnalyticsSnapshot.insights must be an array"
    );
  }

  const tournamentFlowInsight = operationalInsights.find(
    (insight) => insight.insightType === "TOURNAMENT_FLOW"
  );

  const operationalBalanceInsight = operationalInsights.find(
    (insight) => insight.insightType === "OPERATIONAL_BALANCE"
  );

  const arenaAttentionInsight = operationalInsights.find(
    (insight) => insight.insightType === "ARENA_ATTENTION"
  );

  if (!tournamentFlowInsight) {
    throw new Error(
      "TOURNAMENT_FLOW insight is required to create an operational assistant briefing"
    );
  }

  if (!operationalBalanceInsight) {
    throw new Error(
      "OPERATIONAL_BALANCE insight is required to create an operational assistant briefing"
    );
  }

  if (!arenaAttentionInsight) {
    throw new Error(
      "ARENA_ATTENTION insight is required to create an operational assistant briefing"
    );
  }

  const operationalFlow = cleanId(tournamentFlowInsight.status);
  const operationalBalance = cleanId(
    operationalBalanceInsight.status
  );

  if (!operationalFlow) {
    throw new Error(
      "TOURNAMENT_FLOW insight status is required to create an operational assistant briefing"
    );
  }

  if (!operationalBalance) {
    throw new Error(
      "OPERATIONAL_BALANCE insight status is required to create an operational assistant briefing"
    );
  }

  const arenaPerformanceRanking =
    tournamentOperationalAnalyticsSnapshot.indexes
      ?.arenaPerformanceRanking;

  if (!Array.isArray(arenaPerformanceRanking)) {
    throw new Error(
      "tournamentOperationalAnalyticsSnapshot.indexes.arenaPerformanceRanking must be an array"
    );
  }

  const leadingArena =
    cleanId(arenaPerformanceRanking[0]?.arenaId) || "UNAVAILABLE";

  const arenasRequiringAttention = Number(
    arenaAttentionInsight.evidence?.attentionCount
  );

  if (
    !Number.isInteger(arenasRequiringAttention) ||
    arenasRequiringAttention < 0
  ) {
    throw new Error(
      "ARENA_ATTENTION insight evidence.attentionCount must be a non-negative integer"
    );
  }

  const attentionSummary =
    arenasRequiringAttention === 0
      ? "No arenas currently require operational attention."
      : arenasRequiringAttention === 1
        ? "One arena currently requires operational attention."
        : `${arenasRequiringAttention} arenas currently require operational attention.`;

  const operationalSummary = createOperationalSummary({
    tournamentStatus: assessmentStatus,
    operationalFlow,
    operationalBalance,
    leadingArena,
    arenasRequiringAttention,
    summary:
      `The tournament is currently classified as ${assessmentStatus}. ` +
      `Operational flow is ${operationalFlow} and operational balance is ${operationalBalance}. ` +
      `The leading arena is ${leadingArena}. ${attentionSummary}`,
  });

  const operationalHighlightItems = [
    {
      highlightId: "hoi-assessment",
      highlightType: "HOI_ASSESSMENT",
      severity: assessmentSeverity,
      headline:
        `The tournament assessment is currently ${assessmentStatus}.`,
      detail:
        hwarangOperationalIntelligenceSnapshot
          .operationalCorrelationIntelligence?.summary,
      source: "HOI_ASSESSMENT",
    },
    {
      highlightId: "tournament-flow",
      highlightType: "TOURNAMENT_FLOW",
      severity: tournamentFlowInsight.severity,
      headline:
        `Tournament flow is currently ${operationalFlow}.`,
      detail: tournamentFlowInsight.summary,
      source: "TOURNAMENT_FLOW_INSIGHT",
    },
    {
      highlightId: "operational-balance",
      highlightType: "OPERATIONAL_BALANCE",
      severity: operationalBalanceInsight.severity,
      headline:
        `Operational balance is currently ${operationalBalance}.`,
      detail: operationalBalanceInsight.summary,
      source: "OPERATIONAL_BALANCE_INSIGHT",
    },
    {
      highlightId: "arena-attention",
      highlightType: "ARENA_ATTENTION",
      severity: arenaAttentionInsight.severity,
      headline:
        arenasRequiringAttention === 0
          ? "No arenas currently require operational attention."
          : arenasRequiringAttention === 1
            ? "One arena currently requires operational attention."
            : `${arenasRequiringAttention} arenas currently require operational attention.`,
      detail: arenaAttentionInsight.summary,
      source: "ARENA_ATTENTION_INSIGHT",
    },
    {
      highlightId: "leading-arena",
      highlightType: "ARENA_PERFORMANCE",
      severity:
        leadingArena === "UNAVAILABLE"
          ? INSIGHT_SEVERITY.WATCH
          : INSIGHT_SEVERITY.NORMAL,
      headline:
        leadingArena === "UNAVAILABLE"
          ? "The leading arena is currently unavailable."
          : `${leadingArena} currently leads arena performance.`,
      detail:
        leadingArena === "UNAVAILABLE"
          ? "The current arena performance ranking does not contain a leading arena."
          : `${leadingArena} holds the first position in the current arena performance ranking.`,
      source: "ARENA_PERFORMANCE_RANKING",
    },
  ];

  const operationalHighlights = createOperationalHighlights({
    status: "EVALUATED",
    highlights: operationalHighlightItems,
    summary:
      "Operational highlights were evaluated and are explicitly available for all primary operational dimensions.",
  });

  const assessmentRecommendationMessage =
    assessmentSeverity === INSIGHT_SEVERITY.CRITICAL
      ? "Consider prioritizing an immediate human review of the current operational assessment."
      : assessmentSeverity === INSIGHT_SEVERITY.ATTENTION
        ? "Consider reviewing the current operational assessment and its supporting evidence."
        : assessmentSeverity === INSIGHT_SEVERITY.WATCH
          ? "Consider maintaining closer monitoring of the current operational assessment."
          : "Consider maintaining the current operational approach while continuing regular monitoring.";

  const flowRecommendationMessage =
    tournamentFlowInsight.severity === INSIGHT_SEVERITY.NORMAL
      ? "Consider maintaining the current tournament flow while continuing regular monitoring."
      : "Consider reviewing the current distribution of tournament activity across registered arenas.";

  const balanceRecommendationMessage =
    operationalBalanceInsight.severity === INSIGHT_SEVERITY.NORMAL
      ? "Consider maintaining the current operational distribution while continuing regular balance monitoring."
      : "Consider reviewing the current operational load distribution across arenas.";

  const arenaAttentionRecommendationMessage =
    arenasRequiringAttention === 0
      ? "No immediate arena-specific intervention is currently suggested; consider continuing regular monitoring."
      : arenasRequiringAttention === 1
        ? "Consider reviewing the arena currently identified by the Arena Attention Insight."
        : `Consider reviewing the ${arenasRequiringAttention} arenas currently identified by the Arena Attention Insight.`;

  const leadingArenaRecommendationMessage =
    leadingArena === "UNAVAILABLE"
      ? "Consider confirming that sufficient arena performance information is available before using the ranking for operational reference."
      : `Consider using ${leadingArena} as contextual evidence when reviewing current arena performance patterns.`;

  const recommendationItems = [
    {
      recommendationId: "review-hoi-assessment",
      recommendationType: "OPERATIONAL_ASSESSMENT",
      priority: assessmentSeverity,
      message: assessmentRecommendationMessage,
      rationale:
        `The current HOI Assessment is classified as ${assessmentStatus} with ${assessmentSeverity} severity.`,
      source: "HOI_ASSESSMENT",
    },
    {
      recommendationId: "review-tournament-flow",
      recommendationType: "FLOW_MONITORING",
      priority: tournamentFlowInsight.severity,
      message: flowRecommendationMessage,
      rationale:
        `Tournament Flow is currently classified as ${operationalFlow}.`,
      source: "TOURNAMENT_FLOW_INSIGHT",
    },
    {
      recommendationId: "review-operational-balance",
      recommendationType: "BALANCE_REVIEW",
      priority: operationalBalanceInsight.severity,
      message: balanceRecommendationMessage,
      rationale:
        `Operational Balance is currently classified as ${operationalBalance}.`,
      source: "OPERATIONAL_BALANCE_INSIGHT",
    },
    {
      recommendationId: "review-arena-attention",
      recommendationType:
        arenasRequiringAttention === 0
          ? "NO_IMMEDIATE_ARENA_ACTION"
          : "ARENA_REVIEW",
      priority: arenaAttentionInsight.severity,
      message: arenaAttentionRecommendationMessage,
      rationale:
        arenasRequiringAttention === 0
          ? "The Arena Attention Insight currently reports no arenas requiring operational attention."
          : `The Arena Attention Insight currently reports ${arenasRequiringAttention} arena${arenasRequiringAttention === 1 ? "" : "s"} requiring operational attention.`,
      source: "ARENA_ATTENTION_INSIGHT",
    },
    {
      recommendationId: "review-leading-arena",
      recommendationType:
        leadingArena === "UNAVAILABLE"
          ? "RANKING_AVAILABILITY_REVIEW"
          : "ARENA_PERFORMANCE_REFERENCE",
      priority:
        leadingArena === "UNAVAILABLE"
          ? INSIGHT_SEVERITY.WATCH
          : INSIGHT_SEVERITY.NORMAL,
      message: leadingArenaRecommendationMessage,
      rationale:
        leadingArena === "UNAVAILABLE"
          ? "The current Arena Performance Ranking does not contain an available leading arena."
          : `${leadingArena} currently holds the first position in the Arena Performance Ranking.`,
      source: "ARENA_PERFORMANCE_RANKING",
    },
  ];

  const recommendations = createRecommendations({
    status: "EVALUATED",
    recommendations: recommendationItems,
    summary:
      "Operational recommendations were evaluated and are explicitly available for all primary operational dimensions.",
  });

  const operationalContinuityIntelligence =
    hwarangOperationalIntelligenceSnapshot
      .operationalContinuityIntelligence;

  let changeDetection;

  if (!operationalContinuityIntelligence) {
    changeDetection = createChangeDetection({
      status: "UNAVAILABLE",
      changes: [],
      summary:
        "Change detection is currently unavailable because Operational Continuity Intelligence was not provided by the HOI snapshot.",
    });
  } else {
    const continuityStatus = cleanId(
      operationalContinuityIntelligence.status
    );

    const continuityEvidence =
      operationalContinuityIntelligence.evidenceMap;

    if (
      !continuityStatus ||
      !["STABLE", "IMPROVING", "DETERIORATING"].includes(
        continuityStatus
      )
    ) {
      throw new Error(
        "operational continuity status must be STABLE, IMPROVING, or DETERIORATING"
      );
    }

    if (
      !continuityEvidence ||
      typeof continuityEvidence !== "object" ||
      Array.isArray(continuityEvidence)
    ) {
      throw new Error(
        "operational continuity evidenceMap is required to create change detection"
      );
    }

    const previousSeverity = cleanId(
      continuityEvidence.previousSeverity
    );
    const currentSeverity = cleanId(
      continuityEvidence.currentSeverity
    );
    const previousConfidence = Number(
      continuityEvidence.previousConfidence
    );
    const currentConfidence = Number(
      continuityEvidence.currentConfidence
    );

    if (
      !previousSeverity ||
      !Object.values(INSIGHT_SEVERITY).includes(previousSeverity)
    ) {
      throw new Error(
        "previousSeverity must be a known INSIGHT_SEVERITY value inside operational continuity evidence"
      );
    }

    if (
      !currentSeverity ||
      !Object.values(INSIGHT_SEVERITY).includes(currentSeverity)
    ) {
      throw new Error(
        "currentSeverity must be a known INSIGHT_SEVERITY value inside operational continuity evidence"
      );
    }

    if (!Number.isFinite(previousConfidence)) {
      throw new Error(
        "previousConfidence must be a finite number inside operational continuity evidence"
      );
    }

    if (!Number.isFinite(currentConfidence)) {
      throw new Error(
        "currentConfidence must be a finite number inside operational continuity evidence"
      );
    }

    if (continuityStatus === "STABLE") {
      changeDetection = createChangeDetection({
        status: "NO_CHANGES",
        changes: [],
        summary:
          "Change detection completed. No operational changes were identified.",
      });
    } else {
      const direction =
        continuityStatus === "IMPROVING"
          ? "IMPROVING"
          : "DETERIORATING";

      const changeMessage =
        continuityStatus === "IMPROVING"
          ? "The current HOI Assessment shows an improving operational condition compared with the previous snapshot."
          : "The current HOI Assessment shows a deteriorating operational condition compared with the previous snapshot.";

      changeDetection = createChangeDetection({
        status: "CHANGES_DETECTED",
        changes: [
          {
            changeId: "hoi-assessment-continuity",
            changeType: "HOI_ASSESSMENT",
            direction,
            severity: currentSeverity,
            previousValue:
              `${previousSeverity} | confidence ${previousConfidence}`,
            currentValue:
              `${currentSeverity} | confidence ${currentConfidence}`,
            message: changeMessage,
            source: "OPERATIONAL_CONTINUITY_INTELLIGENCE",
          },
        ],
        summary:
          "One operational change was identified from Operational Continuity Intelligence.",
      });
    }
  }

  const evidenceItems = [];

  operationalInsights.forEach((insight) => {
    const cleanInsightId = cleanId(insight.insightId);
    const cleanInsightType = cleanId(insight.insightType);
    const cleanInsightSeverity = cleanId(insight.severity);
    const cleanInsightSummary = cleanText(insight.summary);

    if (!cleanInsightId) {
      throw new Error(
        "insightId is required to create operational assistant evidence summary"
      );
    }

    if (!cleanInsightType) {
      throw new Error(
        "insightType is required to create operational assistant evidence summary"
      );
    }

    if (
      !cleanInsightSeverity ||
      !Object.values(INSIGHT_SEVERITY).includes(
        cleanInsightSeverity
      )
    ) {
      throw new Error(
        "insight severity must be a known INSIGHT_SEVERITY value to create operational assistant evidence summary"
      );
    }

    if (!cleanInsightSummary) {
      throw new Error(
        "insight summary is required to create operational assistant evidence summary"
      );
    }

    evidenceItems.push({
      evidenceId: `toa-${cleanInsightId}`,
      evidenceType: cleanInsightType,
      severity: cleanInsightSeverity,
      statement: cleanInsightSummary,
      source: "TOURNAMENT_OPERATIONAL_ANALYTICS",
      sourceReference: cleanInsightId,
    });
  });

  const cleanHoiAssessmentBasis = cleanId(
    hoiAssessment.basis
  );

  const cleanHoiAssessmentSummary = cleanId(
    hwarangOperationalIntelligenceSnapshot
      .operationalCorrelationIntelligence?.summary
  );

  if (!cleanHoiAssessmentBasis) {
    throw new Error(
      "assessment.basis is required to create operational assistant evidence summary"
    );
  }

  if (!cleanHoiAssessmentSummary) {
    throw new Error(
      "operational correlation summary is required to create operational assistant evidence summary"
    );
  }

  evidenceItems.push({
    evidenceId: "hoi-current-assessment",
    evidenceType: "HOI_ASSESSMENT",
    severity: assessmentSeverity,
    statement: cleanHoiAssessmentSummary,
    source: "HWARANG_OPERATIONAL_INTELLIGENCE",
    sourceReference: cleanHoiAssessmentBasis,
  });

  changeDetection.changes.forEach((change) => {
    evidenceItems.push({
      evidenceId: `change-${change.changeId}`,
      evidenceType: change.changeType,
      statement: change.message,
      source: "CHANGE_DETECTION",
      sourceReference: change.changeId,
    });
  });

  const evidenceSummary = createEvidenceSummary({
    status:
      evidenceItems.length > 0
        ? "EVIDENCE_AVAILABLE"
        : "NO_EVIDENCE_AVAILABLE",
    evidenceItems,
    summary:
      evidenceItems.length > 0
        ? `${evidenceItems.length} authorized evidence items support the current Operational Assistant briefing.`
        : "No authorized evidence is currently available to support the Operational Assistant briefing.",
  });

  const assessmentConfidenceLevel =
    assessmentConfidence >= 0.90
      ? DECISION_CONFIDENCE_LEVEL.VERY_HIGH
      : assessmentConfidence >= 0.75
        ? DECISION_CONFIDENCE_LEVEL.HIGH
        : assessmentConfidence >= 0.50
          ? DECISION_CONFIDENCE_LEVEL.MODERATE
          : assessmentConfidence >= 0.25
            ? DECISION_CONFIDENCE_LEVEL.LOW
            : DECISION_CONFIDENCE_LEVEL.VERY_LOW;

  const confidenceFactors = [
    {
      confidenceId: "hoi-assessment",
      confidenceType: "HOI_ASSESSMENT",
      confidenceLevel: assessmentConfidenceLevel,
      rationale:
        `HOI assessment confidence is ${assessmentConfidence}, representing Expected Insight Coverage and classified as ${assessmentConfidenceLevel}.`,
      source: "HWARANG_OPERATIONAL_INTELLIGENCE",
    },
  ];

  const decisionConfidenceSupport =
    createDecisionConfidenceSupport({
      status: "AVAILABLE",
      overallConfidence: assessmentConfidenceLevel,
      confidenceFactors,
      limitations: [
        "Confidence qualifies explanations. It never qualifies facts.",
        "Confidence represents evidential coverage authorized by the HOI assessment.",
        "Confidence does not represent severity, certainty, decision validity, operational urgency, or future outcomes.",
        "Final operational decisions remain under the authority of the Event Director.",
      ],
      summary:
        "Decision confidence reflects the Expected Insight Coverage authorized by the current HOI assessment.",
    });

  const operationalAlerts = buildOperationalAlerts({
    hoiAssessment,
    hoiAssessmentSummary:
      hwarangOperationalIntelligenceSnapshot
        .operationalCorrelationIntelligence?.summary,
    operationalInsights,
    changeDetection,
  });

  return Object.freeze({
    contractVersion: EVENT_PROVISIONING_CONTRACT_VERSION,
    eventId: cleanEventId,
    generatedAt: cleanGeneratedAt,
    executiveBriefing,
    operationalSummary,
    operationalHighlights,
    recommendations,
    changeDetection,
    evidenceSummary,
    decisionConfidenceSupport,
    operationalAlerts,
  });
}

