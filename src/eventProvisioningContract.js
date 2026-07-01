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
    }),

    insights: Object.freeze([]),
  });
}

