import test from "node:test";
import assert from "node:assert/strict";
import createPreference from "../api/create-preference.js";
import joinJudge, { reserveJudgeSlot } from "../api/join-judge.js";
import judgeSession, { updateJudgeSession } from "../api/judge-session.js";
import { applyCombatState } from "../api/combat-state.js";

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("create-preference rejects unknown and cross-product packages before payment", async () => {
  for (const body of [
    { checkoutId: "checkout-1787851200000-abcdef", product: "nova", package: "500-credits" },
    { checkoutId: "checkout-1787851200000-abcdef", product: "pulsar", package: "starter" },
    { checkoutId: "checkout-1787851200000-abcdef", product: "unknown", package: "starter" },
  ]) {
    const res = responseRecorder();
    await createPreference({ method: "POST", body }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, "Invalid product or package");
  }
});

test("join endpoint rejects invalid room, judge and session data", async () => {
  const res = responseRecorder();
  await joinJudge({
    method: "POST",
    body: { roomId: "bad/room", judgeId: 7, name: "Judge", sessionId: "short" },
  }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.code, "INVALID_REQUEST");
});

test("state-changing endpoints reject unsupported methods", async () => {
  for (const handler of [createPreference, joinJudge, judgeSession]) {
    const res = responseRecorder();
    await handler({ method: "GET" }, res);
    assert.equal(res.statusCode, 405);
  }
});

test("judge session status refreshes lastSeen and release clears ownership", async () => {
  for (const action of ["status", "release"]) {
    const { db, writes } = fakeJudgeDatabase({ slot: {
      status: "online", signal: 1, sessionId: "session-123456789",
    } });
    const result = await updateJudgeSession(db, {
      action, roomId: "demo-hsu-test", judgeId: 1,
      sessionId: "session-123456789", now: 200,
    });
    assert.equal(result.code, action === "status" ? "SESSION_ACTIVE" : "SESSION_RELEASED");
    assert.equal(writes.length, 1);
    assert.equal(action === "status" ? writes[0][1].lastSeen : writes[0][1].sessionId, action === "status" ? 200 : null);
  }
});

test("judge session rejects a different device session", async () => {
  const { db, writes } = fakeJudgeDatabase({ slot: {
    status: "online", signal: 1, sessionId: "owner-session-123",
  } });
  const result = await updateJudgeSession(db, {
    action: "release", roomId: "demo-hsu-test", judgeId: 1,
    sessionId: "other-session-123", now: 200,
  });
  assert.equal(result.code, "SESSION_INVALID");
  assert.equal(writes.length, 0);
});

function fakeJudgeDatabase({ roomExists = true, slot = null } = {}) {
  const writes = [];
  const matchRef = { kind: "match", collection: () => ({ doc: () => ({ kind: "slot" }) }) };
  const db = {
    collection: () => ({ doc: () => matchRef }),
    runTransaction: async (callback) => callback({
      get: async (ref) => ref.kind === "match"
        ? { exists: roomExists }
        : { exists: Boolean(slot), data: () => slot },
      set: (...args) => writes.push(args),
    }),
  };
  return { db, writes };
}

test("judge reservation accepts a valid free or released slot", async () => {
  for (const slot of [null, { status: "released", signal: 0, sessionId: null }]) {
    const { db, writes } = fakeJudgeDatabase({ slot });
    const result = await reserveJudgeSlot(db, {
      roomId: "demo-hsu-test", judgeId: 1, name: "Judge", sessionId: "session-123456789", now: 100,
    });
    assert.equal(result.code, "JOINED");
    assert.equal(writes.length, 1);
    assert.equal(writes[0][1].sessionId, "session-123456789");
  }
});

test("judge reservation rejects missing rooms and occupied slots", async () => {
  const missing = fakeJudgeDatabase({ roomExists: false });
  assert.equal((await reserveJudgeSlot(missing.db, {
    roomId: "missing", judgeId: 1, name: "Judge", sessionId: "session-123456789",
  })).code, "ROOM_NOT_FOUND");
  assert.equal(missing.writes.length, 0);

  const occupied = fakeJudgeDatabase({ slot: { status: "online", signal: 1, sessionId: "other-session-123" } });
  assert.equal((await reserveJudgeSlot(occupied.db, {
    roomId: "demo-hsu-test", judgeId: 1, name: "Judge", sessionId: "session-123456789",
  })).code, "SLOT_OCCUPIED");
  assert.equal(occupied.writes.length, 0);
});

test("judge reservation is idempotent for the same session", async () => {
  const current = fakeJudgeDatabase({ slot: {
    status: "online", signal: 1, sessionId: "session-123456789",
  } });
  const result = await reserveJudgeSlot(current.db, {
    roomId: "demo-hsu-test", judgeId: 1, name: "Judge", sessionId: "session-123456789",
  });
  assert.equal(result.code, "JOINED");
  assert.equal(current.writes.length, 0);
});

function fakeCombatDatabase(initialMatch) {
  const match = structuredClone(initialMatch);
  const updates = [];
  const matchRef = { kind: "match" };
  const db = {
    collection: () => ({ doc: () => matchRef }),
    runTransaction: async (callback) => callback({
      get: async () => ({ exists: true, data: () => structuredClone(match) }),
      update: (_ref, patch) => {
        updates.push(structuredClone(patch));
        match.demoLimit = {
          ...match.demoLimit,
          startedAt: patch["demoLimit.startedAt"],
          usedMs: patch["demoLimit.usedMs"],
          expired: patch["demoLimit.expired"],
        };
      },
    }),
  };
  return { db, match, updates };
}

function fakeConcurrentCombatDatabase(initialMatch, concurrentSportUpdate) {
  const match = structuredClone(initialMatch);
  const committedUpdates = [];
  const matchRef = { kind: "match" };
  const runAttempt = async (callback, commit) => {
    const pendingUpdates = [];
    const result = await callback({
      get: async () => ({ exists: true, data: () => structuredClone(match) }),
      update: (_ref, patch) => pendingUpdates.push(structuredClone(patch)),
    });
    if (commit) {
      pendingUpdates.forEach((patch) => {
        committedUpdates.push(patch);
        Object.assign(match, patch);
      });
    }
    return result;
  };
  const db = {
    collection: () => ({ doc: () => matchRef }),
    runTransaction: async (callback) => {
      await runAttempt(callback, false);
      Object.assign(match, structuredClone(concurrentSportUpdate));
      return runAttempt(callback, true);
    },
  };
  return { db, match, committedUpdates };
}

test("demo tick transaction cannot overwrite a concurrent sport update", async () => {
  const initialMatch = {
    status: "running",
    phase: "fight",
    hongWarnings: 0,
    combatForcedWinner: null,
    showResult: false,
    demoLimit: {
      totalMs: 600000,
      usedMs: 1000,
      startedAt: 1000,
      expired: false,
    },
  };
  const concurrentSportUpdate = {
    status: "paused",
    phase: "finished",
    hongWarnings: 1,
    combatForcedWinner: "hong",
    showResult: true,
  };
  const { db, match, committedUpdates } = fakeConcurrentCombatDatabase(
    initialMatch,
    concurrentSportUpdate
  );

  const result = await applyCombatState(db, {
    action: "tick-demo",
    roomId: "demo-hsu-test",
  }, 3000);

  assert.equal(result.code, "UNCHANGED");
  assert.equal(committedUpdates.length, 0);
  assert.equal(match.status, "paused");
  assert.equal(match.phase, "finished");
  assert.equal(match.hongWarnings, 1);
  assert.equal(match.combatForcedWinner, "hong");
  assert.equal(match.showResult, true);
  assert.deepEqual(match.demoLimit, initialMatch.demoLimit);
});

test("demo tick accumulates usage through a demoLimit-only update", async () => {
  const { db, match, updates } = fakeCombatDatabase({
    status: "running",
    phase: "fight",
    hongWarnings: 1,
    combatForcedWinner: "hong",
    showResult: true,
    demoLimit: {
      totalMs: 600000,
      usedMs: 1000,
      startedAt: 1000,
      expired: false,
    },
  });

  const runningResult = await applyCombatState(db, {
    action: "tick-demo",
    roomId: "demo-hsu-test",
  }, 4000);

  assert.equal(runningResult.code, "UPDATED");
  assert.deepEqual(Object.keys(updates[0]).sort(), [
    "demoLimit.expired",
    "demoLimit.startedAt",
    "demoLimit.usedMs",
  ]);
  assert.equal(match.status, "running");
  assert.equal(match.phase, "fight");
  assert.equal(match.hongWarnings, 1);
  assert.equal(match.combatForcedWinner, "hong");
  assert.equal(match.showResult, true);
  assert.deepEqual(match.demoLimit, {
    totalMs: 600000,
    usedMs: 3000,
    startedAt: 1000,
    expired: false,
  });
});
