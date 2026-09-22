const test = require("node:test");
const assert = require("node:assert/strict");
const G = require("./helpers/load");
const { makeState, makeCtx } = require("./helpers/state");
const P = require("./fixtures/profiles");

const active = (s, profile) => G.rules.evaluate(makeCtx(s, profile)).map(r => r.id);
const task = (id, level, opt) => ({ id, level, opt: opt || "" });

test("visual impairment + a community walk surfaces the orientation rule", () => {
  const r = G.rules.evaluate(makeCtx(makeState({ kind: "activity", slot: "walk" }), P.vision)).find(x => x.id === "vision-community");
  assert.ok(r);
  assert.equal(r.reason, "Visual impairment is recorded in TV's profile and this activity was out in the community.");
  assert.ok(r.highlight.includes("risk.crossing"));
});

test("visual impairment at home does not surface community prompts", () => {
  assert.ok(!active(makeState({ kind: "activity", slot: "film" }), P.vision).includes("vision-community"));
  assert.ok(!active(makeState({ kind: "personal", slot: "am" }), P.vision).includes("vision-community"));
});

test("an 'either' activity is in the community only when a journey is recorded", () => {
  assert.ok(!active(makeState({ kind: "activity", slot: "gardening" }), P.vision).includes("vision-community"));
  assert.ok(active(makeState({ kind: "activity", slot: "gardening", tasks: [task("travel", "ind", "on foot")] }), P.vision).includes("vision-community"));
  assert.ok(!active(makeState({ kind: "activity", slot: "gardening", tasks: [task("travel", "declined")] }), P.vision).includes("vision-community"),
    "a declined journey did not happen");
});

test("choking risk applies to meals, not to a drink on its own", () => {
  assert.ok(active(makeState({ kind: "eating", slot: "lunch" }), P.choking).includes("choking-meal"));
  assert.ok(!active(makeState({ kind: "eating", slot: "fluids" }), P.choking).includes("choking-meal"));
  assert.ok(!active(makeState({ kind: "personal", slot: "am" }), P.choking).includes("choking-meal"));
});

test("a person with no recorded needs gets no profile rules", () => {
  for(const s of [makeState({ kind: "eating", slot: "lunch" }), makeState({ kind: "activity", slot: "walk" }), makeState({ kind: "personal" })])
    assert.deepEqual(active(s, P.none), []);
});

test("rules only fire for the person whose profile carries the need", () => {
  const walk = makeState({ kind: "activity", slot: "walk" });
  assert.ok(active(walk, P.hearing).includes("hearing-community"));
  assert.ok(!active(walk, P.vision).includes("hearing-community"));
  assert.ok(active(walk, P.anxiety).includes("anxiety-community"));
  assert.ok(active(walk, P.anxiety).includes("continence-community"));
});

test("the condition vocabulary: any, not, unknown keys", () => {
  const f = G.rules.facts(makeCtx(makeState({ kind: "eating", slot: "lunch", resp: "declined" }), P.diabetes));
  assert.ok(G.rules.matches({ any: [{ kind: "activity" }, { kind: "eating" }] }, f));
  assert.ok(!G.rules.matches({ not: { kind: "eating" } }, f));
  assert.ok(G.rules.matches({ field: { resp: ["declined", "declinedgo"] } }, f));
  assert.ok(!G.rules.matches({ kidn: "eating" }, f), "a mistyped condition never matches");
  assert.ok(G.rules.matches({}, f), "an empty condition always applies");
});

test("rule text names the person and uses their pronouns", () => {
  const r = G.rules.evaluate(makeCtx(makeState({ kind: "eating", slot: "lunch" }), P.choking)).find(x => x.id === "choking-meal");
  assert.match(r.suggest, /their position/);
  const s = makeState({ kind: "activity", slot: "walk", resp: "agreed" });
  const c = G.rules.evaluate(makeCtx(s, P.hearing)).find(x => x.id === "communication-response");
  assert.equal(c.important[0].message, "How TH communicated his decision has not been recorded.");
});

test("every built-in rule is well formed", () => {
  const seen = new Set();
  for(const r of G.rules.CARE_RULES){
    assert.ok(/^[a-z0-9-]+$/.test(r.id) && !seen.has(r.id), "unique id " + r.id);
    seen.add(r.id);
    assert.ok(r.reason && r.reason.length > 10, r.id + " explains why it applies");
    for(const k of Object.keys(r.appliesWhen)) assert.ok(G.rules.CONDITIONS[k], r.id + " uses a known condition " + k);
  }
});
