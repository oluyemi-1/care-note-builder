/* Every choice on screen must have wording behind it, or ticking it silently
   says nothing. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { data: D } = require("./helpers/load");

test("every option has a phrase bank", () => {
  const pairs = [[D.RESP, D.RESPBANK], [D.RESP_COLLEGE, D.RESPBANK], [D.HOW, D.HOWBANK], [D.CONSENT, D.CONSENTBANK],
                 [D.SKIN, D.SKINBANK], [D.MOOD, D.MOODBANK], [D.WELL, D.WELLBANK], [D.RISK, D.RISKBANK],
                 [D.OUTCOME, D.OUTBANK], [D.COMM, D.COMMBANK], [D.LEARN, D.LEARNBANK],
                 [Object.values(D.DURING).flat(), D.DURINGBANK], [D.ENJOY, D.ENJOYBANK], [D.BENEFIT, D.BENEFITBANK]];
  for (const [opts, bank] of pairs) for (const [id] of opts) {
    if (id === "none" || id === "noresp") continue;
    assert.ok(bank[id] && bank[id].length, "no wording for " + id);
  }
});

test("every task has wording for every support level", () => {
  for (const kind in D.TASKS) for (const t of D.TASKS[kind]) for (const [lvl] of D.LEVELS) {
    if (!lvl) continue;
    assert.ok(t[lvl] && t[lvl].length, "no wording for " + kind + "." + t.id + "." + lvl);
  }
});
