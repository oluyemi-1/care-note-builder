/* Anything from outside the source - the settings screen or an imported
   file - is rebuilt from known parts only, and nothing in it is ever run. */
const test = require("node:test");
const assert = require("node:assert/strict");
const G = require("./helpers/load");
const V = G.validation;

const backup = data => JSON.stringify({ app: "gold-standard-notes", format: 1, kind: "all", data });

test("a file that is not a backup is refused with a plain reason", () => {
  assert.equal(V.validateBackup("not json {").ok, false);
  assert.match(V.validateBackup("not json {").errors[0], /not valid JSON/);
  assert.equal(V.validateBackup(JSON.stringify({ app: "something-else", format: 1, data: {} })).ok, false);
  assert.equal(V.validateBackup(JSON.stringify({ app: "gold-standard-notes", format: 99, data: {} })).ok, false, "a newer format is not guessed at");
  assert.equal(V.validateBackup(backup({})).ok, false, "an empty backup has nothing to import");
  assert.equal(V.validateBackup("x".repeat(21 * 1024 * 1024)).ok, false, "oversized files are refused");
});

test("unknown keys are dropped and nothing is executed", () => {
  const evil = "(function(){ globalThis.PWNED = true; })()";
  const r = V.validateBackup(backup({
    config: { org: { name: "Oak House" }, __proto__: { polluted: true }, onload: evil, terms: { staff: "carers" } },
    people: { AB: { initials: "ab", pronoun: "she", flags: ["vision"], script: evil, toString: evil } }
  }));
  assert.equal(r.ok, true);
  assert.equal(globalThis.PWNED, undefined);
  assert.equal(r.value.config.org.name, "Oak House");
  assert.equal(r.value.config.onload, undefined);
  assert.equal(({}).polluted, undefined);
  assert.equal(r.value.people.AB.script, undefined);
  assert.equal(typeof r.value.people.AB.toString, "function", "the profile is a plain rebuilt object");
});

test("text with markup is refused rather than stored", () => {
  const r = V.validateConfig({ org: { name: "<img src=x onerror=alert(1)>" }, customFlags: [{ label: "<b>Falls</b>" }] });
  assert.ok(r.errors.some(e => /must not contain < or >/.test(e)));
});

test("history records are checked field by field", () => {
  const good = { id: "abc123", person: "AB", date: "2026-09-20", time: "12:30", kind: "eating", slot: "lunch",
                 food: { amount: "Most", pct: 3 }, fluid: { offered: 250, drunk: 200 }, mood: ["settled"], tasks: [{ id: "eat", level: "prompt" }] };
  const r = V.validateBackup(backup({ history: [good,
    { id: "x", person: "AB", date: "yesterday", kind: "eating" },                    // bad date
    { id: "y", person: "<script>", date: "2026-09-20", kind: "eating" },             // bad person
    Object.assign({}, good, { id: "z", fluid: { offered: -5, drunk: 99999 } }),      // bad amounts dropped, record kept
    "not a record"] }));
  assert.equal(r.value.history.length, 2);
  assert.equal(r.value.history[0].food.pct, 75, "the percentage is recomputed, not trusted");
  assert.equal(r.value.history[1].fluid, null);
  assert.match(r.errors.join(" "), /3 history record\(s\) were not valid/);
});

test("custom activities, methods and observations need wording that uses known placeholders only", () => {
  const r = V.validateConfig({
    customActivities: [{ label: "Library", noun: "a trip to the library", did: "went to the library", where: "out" }, { id: "walk", label: "Walk" }],
    customComm: [{ label: "BSL", sentences: ["Staff used British Sign Language with {o}."] }, { label: "Bad", sentences: ["Staff used {weapon}."] }],
    customObservations: [{ label: "Humming", group: "mood", sentences: ["{S} hummed."] }, { label: "Odd", group: "elsewhere", sentences: ["{S} did."] }]
  });
  assert.equal(r.value.customActivities[0].id, "c-library");
  assert.ok(r.errors.some(e => /\u201cwalk\u201d is already used/.test(e)), "a custom activity may not clash with a built-in id");
  assert.equal(V.validateConfig({ customActivities: [{ label: "Walk" }] }).value.customActivities[0].id, "c-walk", "generated ids never clash");
  assert.ok(r.errors.some(e => /unknown placeholder \{weapon\}/.test(e)));
  assert.ok(r.errors.some(e => /group must be mood, well or behaviour/.test(e)));
  assert.deepEqual(r.value.customComm.map(m => m.label), ["BSL"]);
});

test("custom rules must use the engine's own condition vocabulary", () => {
  const rule = { id: "falls-walk", title: "Falls risk", appliesWhen: { profileFlag: "c-falls", kind: "activity", out: true },
    reason: "A falls risk is recorded in {N}'s profile.",
    prompts: [{ id: "route", text: "Was the route checked for trip hazards?", yes: "Staff checked the route for trip hazards.", no: null,
                onNo: { severity: "review", message: "The route was not checked.", handover: "Route not checked for trip hazards." } }] };
  const ok = V.validateConfig({ customRules: [rule] });
  assert.deepEqual(ok.errors, []);
  assert.equal(ok.value.customRules[0].prompts[0].yes, "Staff checked the route for trip hazards.");

  const bad = V.validateConfig({ customRules: [
    Object.assign({}, rule, { id: "a", appliesWhen: { profilFlag: "x" } }),                          // unknown condition
    Object.assign({}, rule, { id: "b", appliesWhen: {} }),                                          // would apply to everyone
    Object.assign({}, rule, { id: "vision-community" }),                                            // clashes with a built-in
    Object.assign({}, rule, { id: "c", prompts: [{ id: "q", text: "Checked the route", yes: "Staff {did} it." }] })  // not a question; unknown token
  ] });
  const e = bad.errors.join("\n");
  assert.match(e, /profilFlag: is not a known condition/);
  assert.match(e, /needs at least one condition/);
  assert.match(e, /vision-community.*already used/);
  assert.match(e, /must be asked as a question/);
  assert.match(e, /unknown placeholder \{did\}/);
});

test("a valid custom rule then works like a built-in one", () => {
  const cfg = V.validateConfig({ customFlags: [{ id: "c-falls", label: "Falls risk" }], customRules: [{
    id: "falls-walk", appliesWhen: { profileFlag: "c-falls", kind: "activity", out: true }, reason: "A falls risk is recorded.",
    prompts: [{ id: "route", text: "Was the route checked for trip hazards?", yes: "Staff checked the route for trip hazards." }] }] }).value;
  const { makeState } = require("./helpers/state");
  const s = makeState({ initials: "TF", kind: "activity", slot: "walk", prompts: { "falls-walk.route": "yes" } });
  const res = G.narrative.compose({ s, profile: { initials: "TF", pronoun: "he", flags: ["c-falls"] },
                                    rules: G.rules.CARE_RULES.concat(cfg.customRules) }, { salt: 1 });
  assert.match(res.note.text, /Staff checked the route for trip hazards\./);
  assert.deepEqual(G.provenance.verify(res.note.sentences, res.s), []);
});

test("stored settings are re-checked on every load, so a hand-edited value cannot slip through", () => {
  const r = V.validateConfig({ history: { enabled: "yes please", windowDays: 3650 }, noteLayout: "<marquee>", terms: { staff: "st@ff!" } });
  assert.equal(r.value.history.enabled, false);
  assert.equal(r.value.history.windowDays, 14);
  assert.equal(r.value.noteLayout, "block");
  assert.equal(r.value.terms.staff, "staff");
});

test("an imported entry with any fault is left out whole, never half-kept", () => {
  const r = V.validateBackup(backup({ config: {
    customComm: [{ label: "BSL", sentences: ["Staff used BSL."] }, { label: "Bad", sentences: ["Staff used {weapon}."] }],
    customRules: [{ id: "half", appliesWhen: { kind: "eating", bogus: 1 }, reason: "x" }]
  } }));
  assert.equal(r.ok, true);
  assert.deepEqual(r.value.config.customComm.map(m => m.label), ["BSL"]);
  assert.deepEqual(r.value.config.customRules, []);
  assert.ok(r.errors.length >= 2, "and the person restoring is told what was left out");
});

test("text containing markup is dropped, not kept alongside an error", () => {
  const r = V.validateBackup(backup({ config: { org: { name: "<img src=x onerror=alert(1)>" },
    levels: { part: { record: "<img src=x onerror=document.title=1>" } }, fieldNames: { "personal.wash": "<b>x</b>" },
    language: { vague: ["<script>"] } } }));
  const c = r.value.config;
  assert.equal(c.org.name, "");
  assert.equal(c.levels.part, undefined);
  assert.equal(c.fieldNames["personal.wash"], undefined);
  assert.deepEqual(c.language.vague, []);
  assert.doesNotMatch(JSON.stringify(c), /[<>]/);
});

test("an impossible date in an imported record is rejected, not a crash", () => {
  const r = V.validateBackup(backup({ history: [{ id: "a1", person: "AB", date: "2024-13-45", kind: "eating" }] }));
  assert.equal(r.ok, true);
  assert.equal(r.value.history.length, 0);
});

test("initials with an apostrophe or hyphen survive a backup and restore", () => {
  const r = V.validateBackup(backup({ people: { "O'B": { initials: "O'B", pronoun: "he" } },
    history: [{ id: "a1", person: "O'B", date: "2026-09-20", kind: "eating" }] }));
  assert.deepEqual(Object.keys(r.value.people), ["O'B"]);
  assert.equal(r.value.history.length, 1);
});
