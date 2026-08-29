import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { sanitizeJudgeSlot } from "../api/president-judge-slots.js";

test("President slot projection excludes credentials and unknown fields", () => {
  const result = sanitizeJudgeSlot({
    judgeId: 2, name: "Judge", status: "online", signal: 1,
    sessionId: "secret", token: "secret", claims: { role: "judge" }, internal: true,
  }, "2");
  assert.deepEqual(result, { judgeId: 2, name: "Judge", status: "online", signal: 1 });
  assert.equal("sessionId" in result, false);
});

test("hybrid Rules allow only provisioned Combat reads and keep sensitive paths closed", async () => {
  const rules = await readFile(new URL("../firestore.local.rules", import.meta.url), "utf8");
  assert.match(rules, /isProvisionedCombat\(matchId, resource\.data\)/);
  assert.match(rules, /exists\(\/databases\/\$\(database\)\/documents\/licenses\/\$\(matchId\)\)/);
  assert.match(rules, /demoLimit\.totalMs == 600000/);
  assert.match(rules, /matchId\.matches\('\^demo-hsu-\[a-z0-9\]\{5\}\$'\)/);
  assert.match(rules, /match \/judges\/\{judgeId\}[\s\S]*allow read: if isCombatMatch\(matchId\)/);
  assert.match(rules, /match \/\{document=\*\*\} \{\s*allow read, write: if false;/);
  assert.doesNotMatch(rules, /allow read, write: if true/);
});
