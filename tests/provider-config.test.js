/* A provider adapts the builder without touching the source. Each test file
   runs in its own process, so laying settings over the data here is safe. */
const test = require("node:test");
const assert = require("node:assert/strict");
const G = require("./helpers/load");
const { makeState } = require("./helpers/state");

const cfg = G.validation.validateConfig({
  org: { name: "Oak House", service: "supported" },
  terms: { staff: "support workers", careSystem: "Nourish" },
  levels: { ind: { label: "On their own", record: "Independent (no support)" } },
  fieldNames: { "personal.wash": "Bathing method" },
  customActivities: [{ label: "Library", noun: "a trip to the library", did: "went to the library", where: "out" }],
  customComm: [{ label: "BSL", sentences: ["Staff used British Sign Language with {o}."] }],
  customFlags: [{ label: "Falls risk" }],
  customObservations: [{ label: "Humming", group: "mood", sentences: ["{S} hummed to {r}."] }],
  customProfileFields: [{ label: "Key worker" }]
}).value;
G.config.apply(cfg);

test("the provider's activity, method, need and observation join the built-in lists", () => {
  const D = G.data;
  assert.deepEqual(D.ACTS.find(a => a[0] === "c-library"), ["c-library", "Library", "a trip to the library", "went to the library"]);
  assert.equal(D.ACTS[D.ACTS.length - 1][0], "other", "“Something else” stays last");
  assert.ok(D.COMM.some(c => c[0] === "c-bsl"));
  assert.ok(D.FLAGS.some(f => f[0] === "c-falls-risk"));
  assert.ok(D.MOOD.some(m => m[0] === "c-humming"));
  assert.equal(D.LEVELS.find(l => l[0] === "ind")[1], "On their own");
  assert.equal(D.TASKS.personal.find(t => t.id === "wash").nf, "Bathing method");
  assert.equal(G.config.recordValue(cfg, "ind", "Independent"), "Independent (no support)");
  assert.equal(G.config.recordValue(cfg, "part", "Assisted"), "Assisted");
});

test("a note uses the provider's activity, wording and staff word - and stays traceable", () => {
  const s = makeState({ initials: "TL", pronoun: "they", kind: "activity", slot: "c-library", resp: "agreed", consent: "yes",
    commUsed: ["c-bsl"], mood: ["c-humming"], tasks: [{ id: "engage", level: "ind", opt: "" }], outcome: "home", len: "full" });
  const r = G.narrative.compose({ s, profile: { initials: "TL", pronoun: "they" } }, { salt: 2, terms: cfg.terms });
  assert.match(r.note.text, /a trip to the library/i);
  assert.match(r.note.text, /went to the library/);
  assert.match(r.note.text, /Support workers used British Sign Language with them\./);
  assert.match(r.note.text, /They hummed to themselves\./);
  assert.deepEqual(G.provenance.verify(r.note.sentences, r.s), []);
});

test("the provider's out-in-the-community activity brings community rules with it", () => {
  const s = makeState({ initials: "TV", kind: "activity", slot: "c-library" });
  const ids = G.rules.evaluate({ s, profile: { initials: "TV", flags: ["vision"] } }).map(r => r.id);
  assert.ok(ids.includes("vision-community"));
});

test("a custom profile field can drive a rule", () => {
  const f = G.rules.facts({ s: makeState(), profile: { custom: { "key-worker": "JB" } } });
  assert.ok(G.rules.matches({ profileHas: "custom.key-worker" }, f));
  assert.ok(!G.rules.matches({ profileHas: "custom.other" }, f));
});

test("audit checks can be made optional, and extra ones required", () => {
  const s = makeState({ kind: "personal", resp: "agreed", consent: "yes", level: "ind", mood: ["settled"], tasks: [{ id: "shave", level: "ind", opt: "" }] });
  const base = G.smartAssist.collect({ s, profile: {} });
  assert.equal(base.contentOk, false, "no outcome yet");
  const relaxed = G.smartAssist.collect({ s, profile: {}, auditOptional: ["outcome"] });
  assert.equal(relaxed.contentOk, true);
  assert.equal(relaxed.items.find(i => i.id === "a:outcome").severity, "suggestion");
  const strict = G.smartAssist.collect({ s, profile: {}, auditOptional: ["outcome"], auditExtra: ["dignity", "staffComm"] });
  assert.equal(strict.blocking, true);
  assert.equal(strict.requiredMissing, true);
  assert.equal(strict.items.find(i => i.id === "q:dignity").severity, "missing");
});

test("settings that already hold custom items can be checked and saved again", () => {
  /* the page re-checks the stored settings on every load, after they were applied once */
  const again = G.validation.validateConfig(cfg);
  assert.deepEqual(again.errors, []);
  assert.deepEqual(again.value.customActivities.map(a => a.id), ["c-library"]);
  assert.deepEqual(again.value.customComm.map(a => a.id), ["c-bsl"]);
  assert.deepEqual(again.value.customFlags.map(a => a.id), ["c-falls-risk"]);
  assert.deepEqual(again.value.customObservations.map(a => a.id), ["c-humming"]);
});

test("an apostrophe in a provider's wording reads as an apostrophe in the note", () => {
  const c2 = G.validation.validateConfig({ customActivities: [{ label: "Mary's club", noun: "Mary's garden club", did: "went to Mary's garden club", where: "out" }] }).value;
  G.config.apply(c2);
  const s = makeState({ initials: "TM", pronoun: "she", kind: "activity", slot: "c-mary-s-club", tasks: [{ id: "engage", level: "ind", opt: "" }] });
  const text = G.narrative.compose({ s, profile: { initials: "TM", pronoun: "she" } }, { salt: 1 }).note.text;
  assert.match(text, /Mary's garden club/);
  assert.doesNotMatch(text, /&#39;|&amp;/);
});
