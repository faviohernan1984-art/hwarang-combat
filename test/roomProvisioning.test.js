import test from "node:test";
import assert from "node:assert/strict";
import {
  ensureCommercialRoom,
  ensureDemoRoom,
  makeInitialJudge,
  makeInitialMatch,
} from "../api/roomProvisioning.js";

function fakeFirestore(initialEntries = []) {
  const documents = new Map(initialEntries);
  let queue = Promise.resolve();

  const makeRef = (path) => ({
    path,
    collection(name) {
      return { doc: (id) => makeRef(`${path}/${name}/${id}`) };
    },
  });

  return {
    documents,
    collection(name) {
      return { doc: (id) => makeRef(`${name}/${id}`) };
    },
    runTransaction(callback) {
      const operation = queue.then(async () => {
        const creates = [];
        const transaction = {
          get: async (ref) => ({
            exists: documents.has(ref.path),
            data: () => documents.get(ref.path),
          }),
          create: (ref, value) => creates.push([ref.path, value]),
          set: (ref, value, options) => documents.set(
            ref.path,
            structuredClone(options?.merge ? { ...(documents.get(ref.path) || {}), ...value } : value)
          ),
        };
        const result = await callback(transaction);
        for (const [path, value] of creates) {
          if (documents.has(path)) throw new Error("ALREADY_EXISTS");
          documents.set(path, structuredClone(value));
        }
        return result;
      });
      queue = operation.catch(() => {});
      return operation;
    },
  };
}

test("commercial provisioning creates the exact room and five judges", async () => {
  const db = fakeFirestore();
  const result = await ensureCommercialRoom(db, "license-local-valid", 1234);

  assert.deepEqual(result, { created: true });
  assert.deepEqual(
    db.documents.get("matches/license-local-valid"),
    makeInitialMatch(1234)
  );
  for (let judgeId = 1; judgeId <= 5; judgeId += 1) {
    assert.deepEqual(
      db.documents.get(`matches/license-local-valid/judges/${judgeId}`),
      makeInitialJudge(judgeId)
    );
  }
});

test("commercial provisioning preserves an existing room and judges", async () => {
  const existingMatch = { status: "running", hongPoints: 99 };
  const existingJudge = { id: 1, hongPoints: 7 };
  const db = fakeFirestore([
    ["matches/license-local-existing", existingMatch],
    ["matches/license-local-existing/judges/1", existingJudge],
  ]);

  const result = await ensureCommercialRoom(db, "license-local-existing", 9999);

  assert.deepEqual(result, { created: false });
  assert.deepEqual(db.documents.get("matches/license-local-existing"), existingMatch);
  assert.deepEqual(db.documents.get("matches/license-local-existing/judges/1"), existingJudge);
  assert.equal(db.documents.size, 6);
});

test("two simultaneous provisioning requests are idempotent", async () => {
  const db = fakeFirestore();
  const results = await Promise.all([
    ensureCommercialRoom(db, "license-local-race", 100),
    ensureCommercialRoom(db, "license-local-race", 200),
  ]);

  assert.deepEqual(results, [{ created: true }, { created: false }]);
  assert.equal(db.documents.size, 6);
  assert.equal(db.documents.get("matches/license-local-race").updatedAt, 100);
});

test("demo provisioning only creates server-authorized IDs and preserves existing demos", async () => {
  const db = fakeFirestore();
  await assert.rejects(() => ensureDemoRoom(db, "demo-hsu-invented", 100), /INVALID_DEMO_ROOM_ID/);

  assert.deepEqual(await ensureDemoRoom(db, "demo-hsu-a2b3c", 100), { created: false, compatible: false });
  assert.equal(db.documents.has("matches/demo-hsu-a2b3c"), false);

  assert.deepEqual(
    await ensureDemoRoom(db, "demo-hsu-a2b3c", 100, { allowCreate: true }),
    { created: true, compatible: true }
  );
  const original = structuredClone(db.documents.get("matches/demo-hsu-a2b3c"));
  assert.equal(original.demoLimit.totalMs, 10 * 60 * 1000);
  assert.deepEqual(await ensureDemoRoom(db, "demo-hsu-a2b3c", 200), { created: false, compatible: true });
  assert.deepEqual(db.documents.get("matches/demo-hsu-a2b3c"), original);
});

test("existing demo without marker receives it without resetting combat or demo usage", async () => {
  const existing = {
    ...makeInitialMatch(100),
    status: "running",
    hongWarnings: 3,
    demoLimit: {
      totalMs: 10 * 60 * 1000,
      usedMs: 245000,
      startedAt: 123456,
      expired: false,
    },
  };
  const judge = { id: 1, hongPoints: 7, chongPoints: 4 };
  const db = fakeFirestore([
    ["matches/demo-hsu-b3c4d", structuredClone(existing)],
    ["matches/demo-hsu-b3c4d/judges/1", structuredClone(judge)],
  ]);

  assert.deepEqual(await ensureDemoRoom(db, "demo-hsu-b3c4d", 999), {
    created: false,
    compatible: true,
  });
  assert.deepEqual(db.documents.get("matches/demo-hsu-b3c4d"), {
    ...existing,
    demoProvisionedAt: 999,
  });
  assert.deepEqual(db.documents.get("matches/demo-hsu-b3c4d/judges/1"), judge);
});

test("expired demo receives the marker and remains expired", async () => {
  const existing = {
    ...makeInitialMatch(100),
    demoLimit: {
      totalMs: 10 * 60 * 1000,
      usedMs: 10 * 60 * 1000,
      startedAt: 123456,
      expired: true,
    },
  };
  const db = fakeFirestore([["matches/demo-hsu-c4d5e", structuredClone(existing)]]);

  assert.deepEqual(await ensureDemoRoom(db, "demo-hsu-c4d5e", 1000), {
    created: false,
    compatible: true,
  });
  assert.deepEqual(db.documents.get("matches/demo-hsu-c4d5e"), {
    ...existing,
    demoProvisionedAt: 1000,
  });
});
