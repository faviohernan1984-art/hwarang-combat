import test from "node:test";
import assert from "node:assert/strict";
import {
  ensureCommercialRoom,
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
