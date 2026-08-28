const MAX_JUDGES = 5;
const DEMO_LIMIT_MS = 10 * 60 * 1000;

export function makeInitialJudge(id) {
  return {
    id,
    hongPoints: 0,
    chongPoints: 0,
    gpDecision: null,
    history: [],
  };
}

export function makeInitialMatch(now = Date.now()) {
  return {
    mode: "combat",
    config: {
      roundSeconds: 120,
      rounds: 2,
      breakSeconds: 30,
      medicalPreset: 300,
    },
    match: {
      round: 1,
      phase: "fight",
      status: "paused",
      timeLeft: 120,
      phaseStartedAt: null,
    },
    medicalPreset: 300,
    medicalActive: false,
    medicalSide: null,
    medicalRunning: false,
    medicalHong: 300,
    medicalChong: 300,
    medicalLast: 0,
    medicalOverlay: {
      active: false,
      side: null,
      startedAt: null,
      durationMs: null,
      paused: false,
      remainingMs: null,
      status: "idle",
    },
    medicalV2: {
      preset: 300,
      activeSide: null,
      hong: { remaining: 300, running: false, expired: false },
      chong: { remaining: 300, running: false, expired: false },
      pendingDecision: false,
      expiredSide: null,
      suggestedWinner: null,
      inputsLocked: false,
    },
    round: 1,
    phase: "fight",
    status: "paused",
    pausedRemaining: 120,
    phaseStartedAt: null,
    hongWarnings: 0,
    chongWarnings: 0,
    hongFouls: 0,
    chongFouls: 0,
    hongLog: [],
    chongLog: [],
    hong: { label: "Hong", name: "HONG", club: "" },
    chong: { label: "Chong", name: "CHONG", club: "" },
    combatForcedWinner: null,
    publicSwapSides: false,
    presidentSwapSides: false,
    demoLimit: {
      totalMs: DEMO_LIMIT_MS,
      usedMs: 0,
      startedAt: null,
      expired: false,
    },
    goldenPoint: {
      active: false,
      mode: null,
      state: "idle",
      result: null,
      gpRound: 0,
      archive: null,
    },
    disqualification: {
      pending: false,
      disqualifiedSide: null,
      suggestedWinner: null,
      decisionType: null,
      inputsLocked: false,
      resolved: false,
    },
    showResult: false,
    updatedAt: now,
  };
}

export async function ensureCommercialRoom(db, licenseKey, now = Date.now()) {
  const matchRef = db.collection("matches").doc(licenseKey);
  const judgeRefs = Array.from({ length: MAX_JUDGES }, (_, index) =>
    matchRef.collection("judges").doc(String(index + 1))
  );

  return db.runTransaction(async (transaction) => {
    const [matchSnapshot, ...judgeSnapshots] = await Promise.all([
      transaction.get(matchRef),
      ...judgeRefs.map((judgeRef) => transaction.get(judgeRef)),
    ]);

    let created = false;
    if (!matchSnapshot.exists) {
      transaction.create(matchRef, makeInitialMatch(now));
      created = true;
    }

    judgeSnapshots.forEach((snapshot, index) => {
      if (!snapshot.exists) {
        transaction.create(judgeRefs[index], makeInitialJudge(index + 1));
      }
    });

    return { created };
  });
}
