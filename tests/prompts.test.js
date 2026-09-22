/* PROMPT, DON'T PRESUME: a question from the profile adds nothing to the note
   until a staff member answers it, and then only what they answered. */
const test = require("node:test");
const assert = require("node:assert/strict");
const G = require("./helpers/load");
const { makeState, makeCtx } = require("./helpers/state");
const P = require("./fixtures/profiles");

const rule = (s, profile, id) => G.rules.evaluate(makeCtx(s, profile)).find(r => r.id === id);
const lunch = extra => makeState(Object.assign({ kind: "eating", slot: "lunch" }, extra));

test("an unanswered question produces no sentence and no finding", () => {
  const r = rule(lunch(), P.choking, "choking-meal");
  assert.ok(r.prompts.length >= 5);
  for(const p of r.prompts){ assert.equal(p.sentence, ""); assert.equal(p.trigger, null); }
});

test("a yes and a no each produce exactly their own sentence", () => {
  const r = rule(lunch({ prompts: { "choking-meal.cough": "no", "choking-meal.upright": "yes" } }), P.choking, "choking-meal");
  const by = id => r.prompts.find(p => p.id === id);
  assert.equal(by("cough").sentence, "No coughing was observed during lunch.");
  assert.equal(by("upright").sentence, "They were sitting upright while eating.");
  assert.equal(by("pace").sentence, "", "unanswered stays silent");
});

test("a 'no' with nothing to say adds nothing", () => {
  const r = rule(lunch({ prompts: { "choking-meal.pace": "no" } }), P.choking, "choking-meal");
  assert.equal(r.prompts.find(p => p.id === "pace").sentence, "");
});

test("safety answers raise findings at the right level", () => {
  const r = rule(lunch({ prompts: { "choking-meal.choke": "yes", "choking-meal.cough": "yes", "choking-meal.texture": "no" } }), P.choking, "choking-meal");
  const by = id => r.prompts.find(p => p.id === id).trigger;
  assert.equal(by("choke").severity, "critical");
  assert.equal(by("texture").severity, "critical");
  assert.equal(by("cough").severity, "review");
  assert.equal(by("choke").handover, "Choking observed during lunch.");
});

test("critical is used sparingly: 'no choking observed' raises nothing", () => {
  const sa = G.smartAssist.collect(makeCtx(lunch({ prompts: { "choking-meal.choke": "no", "choking-meal.cough": "no" } }), P.choking));
  assert.equal(sa.counts.critical, 0);
});

test("the prescribed texture from the profile is quoted, not invented", () => {
  const withTexture = Object.assign({}, P.choking, { texture: "IDDSI Level 5 minced and moist" });
  const r = rule(lunch({ prompts: { "choking-meal.texture": "yes" } }), withTexture, "choking-meal");
  assert.equal(r.prompts.find(p => p.id === "texture").sentence, "The meal was prepared to their prescribed texture (IDDSI Level 5 minced and moist).");
  const bare = rule(lunch({ prompts: { "choking-meal.texture": "yes" } }), P.choking, "choking-meal");
  assert.equal(bare.prompts.find(p => p.id === "texture").sentence, "The meal was prepared to their prescribed texture.");
});

test("a follow-up question only appears after the answer it depends on", () => {
  const walk = extra => makeState(Object.assign({ kind: "activity", slot: "walk" }, extra));
  assert.ok(!rule(walk(), P.epilepsy, "epilepsy-activity").prompts.some(p => p.id === "recovery"));
  assert.ok(rule(walk({ prompts: { "epilepsy-activity.seizure": "yes" } }), P.epilepsy, "epilepsy-activity").prompts.some(p => p.id === "recovery"));
});

test("an answer names the activity the way a sentence would", () => {
  const walk = rule(makeState({ kind: "activity", slot: "walk", prompts: { "epilepsy-activity.seizure": "yes" } }), P.epilepsy, "epilepsy-activity");
  assert.equal(walk.prompts.find(p => p.id === "seizure").sentence, "Seizure activity was observed during a walk.");
  const college = rule(makeState({ kind: "activity", setting: "college", slot: "music", prompts: { "epilepsy-activity.seizure": "yes" } }), P.epilepsy, "epilepsy-activity");
  assert.equal(college.prompts.find(p => p.id === "seizure").sentence, "Seizure activity was observed during his music class.");
});

test("choking recorded must be described before the note can be copied", () => {
  const s = lunch({ prompts: { "choking-meal.choke": "yes" } });
  assert.equal(G.smartAssist.collect(makeCtx(s, P.choking)).blocking, true);
  s.extra = "She coughed hard for a few seconds; staff stayed with her and she recovered.";
  assert.equal(G.smartAssist.collect(makeCtx(s, P.choking)).blocking, false);
});

test("a seizure recorded asks for a description in staff's own words", () => {
  const s = makeState({ kind: "activity", slot: "walk", prompts: { "epilepsy-activity.seizure": "yes" } });
  const sa = G.smartAssist.collect(makeCtx(s, P.epilepsy));
  assert.ok(sa.items.some(i => i.id === "p:epilepsy-activity.seizure" && i.severity === "critical"));
  assert.ok(sa.items.some(i => i.id === "p:epilepsy-activity.seizure:detail" && i.severity === "missing"));
  assert.equal(sa.blocking, true, "the note cannot be copied until the seizure is described");
  s.extra = "At 14:05 he stopped walking and his arms stiffened for about 40 seconds.";
  const described = G.smartAssist.collect(makeCtx(s, P.epilepsy));
  assert.ok(!described.items.some(i => i.id.endsWith(":detail")));
  assert.equal(described.blocking, false);
});

test("profile-specific prompts appear only for the right person and interaction", () => {
  const swim = makeState({ kind: "activity", slot: "swim" });
  const ids = (s, p) => G.rules.evaluate(makeCtx(s, p)).filter(r => r.prompts.length).map(r => r.id);
  assert.deepEqual(ids(swim, P.epilepsy), ["epilepsy-activity", "epilepsy-water"]);
  assert.deepEqual(ids(makeState({ kind: "activity", slot: "film" }), P.epilepsy), ["epilepsy-activity"]);
  assert.deepEqual(ids(swim, P.none), []);
  assert.deepEqual(ids(lunch(), P.diabetes), ["diabetes-meal", "cholesterol-meal"]);
  assert.deepEqual(ids(makeState({ kind: "eating", slot: "fluids" }), P.diabetes), [], "no meal questions for a drink");
  assert.deepEqual(ids(makeState({ kind: "personal", tasks: [{ id: "wash", level: "ind", opt: "a shower" }] }), P.epilepsy), ["epilepsy-bathing"]);
  assert.deepEqual(ids(makeState({ kind: "personal", tasks: [{ id: "wash", level: "ind", opt: "a strip wash" }] }), P.epilepsy), []);
});

test("no question implies that something happened", () => {
  const all = [];
  G.rules.CARE_RULES.forEach(r => (r.prompts || []).forEach(p => all.push(p.text)));
  for(const q of all) assert.match(q, /^(Was|Were|Did|Do|Has|Have|Is|Are)\b.*\?$/, "asked as a question: " + q);
});

test("handover suggestions never claim anyone was informed", () => {
  const lines = [];
  G.rules.CARE_RULES.forEach(r => {
    if(r.handover) lines.push(r.handover);
    (r.prompts || []).forEach(p => ["onYes", "onNo"].forEach(k => p[k] && p[k].handover && lines.push(p[k].handover)));
  });
  assert.ok(lines.length > 5);
  for(const l of lines) assert.doesNotMatch(l, /informed|contacted|notified|told|GP|manager|family|called|reported/i, l);
});

test("a handover already written, or handed over, is not suggested again", () => {
  const s = makeState({ kind: "personal", skin: "concern", skinDetail: "a red area on the left heel" });
  const has = s2 => G.smartAssist.collect(makeCtx(s2, P.none)).items.some(i => i.id === "h:new-skin-concern");
  assert.ok(has(s));
  assert.ok(!has(Object.assign({}, s, { handover: "New skin concern observed: a red area on the left heel." })));
  assert.ok(!has(Object.assign({}, s, { followup: ["handover"] })));
});
