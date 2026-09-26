/* Medication: told what it was and why, agreed to take it, label checked
   against the MAR chart, given as prescribed - and anything that did not go
   to plan. All from ticks; the app never suggests anything about a dose. */
const test = require("node:test");
const assert = require("node:assert/strict");
const G = require("./helpers/load");
const { makeState, makeCtx } = require("./helpers/state");
const P = require("./fixtures/profiles");

const SHE = { initials: "TM", pronoun: "she", flags: [], comm: [] };
const compose = (s, profile, salt) => G.narrative.compose({ s, profile: profile || P.none }, { salt: salt || 1 });
const keys = note => note.sentences.flatMap(x => x.members || [x.key]);
const base = { initials: "TM", pronoun: "she", kind: "medication", slot: "morning", time: "08:00", commUsed: ["verbal"],
               med: ["explained", "label", "water", "watched", "prescribed"], resp: "happy", how: ["nodded"], consent: "yes",
               tasks: [{ id: "medtake", level: "ind", opt: "{p} tablets" }], outcome: "nochangeout", followup: ["mar"], len: "full" };

test("a medication note follows the process: told, agreed, label checked, taken, given as prescribed", () => {
  for(let salt = 0; salt < 10; salt++){
    const r = compose(makeState(base), null, salt);
    const t = r.note.text;
    assert.match(t, /morning medication/);
    assert.match(t, /Staff (?:told|explained to) TM what (?:the medication|it) was and (?:what it is for|why she takes it), in short, clear sentences\.|Before giving it, staff told TM what it was and what it is for, in short, clear sentences\./, t);
    assert.match(t, /happy to take it|took it willingly/);
    assert.match(t, /MAR chart/);
    assert.match(t, /took her tablets herself|managed her tablets without support/);
    assert.match(t, /given as prescribed/i);
    assert.match(t, /MAR chart was signed|signed the MAR chart/);
    const k = keys(r.note);
    assert.ok(k.indexOf("medtell") < k.indexOf("resp"), "told before the response");
    assert.ok(k.indexOf("consent") < k.indexOf("med_label") && k.indexOf("med_label") < k.indexOf("task_medtake"), "consent, then the label check, then taking it: " + k.join(", "));
    assert.ok(k.indexOf("task_medtake") < k.indexOf("med_prescribed") && k.indexOf("med_prescribed") < k.indexOf("out"));
    assert.deepEqual(G.provenance.verify(r.note.sentences, r.s), []);
  }
});

test("nothing ticked, nothing said: no telling, label, prescribed or issue sentence appears on its own", () => {
  const s = makeState({ kind: "medication", slot: "night", time: "21:00", resp: "happy", consent: "implied" });
  const t = compose(s).note.text;
  assert.doesNotMatch(t, /MAR|prescribed|told TM|what it was|drink|stayed/);
  assert.match(t, /night medication/);
});

test("a declined dose: the note says so, and 'given as prescribed' alongside it is a contradiction", () => {
  const s = makeState(Object.assign({}, base, { resp: "declined", consent: "no", declined: "offered again in ten minutes", med: ["explained", "label"], tasks: [] }));
  const r = compose(s);
  assert.match(r.note.text, /declined/i);
  const sa = G.smartAssist.collect(makeCtx(s, SHE));
  assert.ok(sa.items.some(i => i.id === "h:medication-declined" || i.id === "r:medication-declined"), "handover and MAR recording are suggested");
  assert.ok(sa.handovers.some(h => /Declined her morning medication/.test(h)), sa.handovers.join(" | "));
  s.med = ["explained", "label", "prescribed"];
  assert.ok(G.contradictions.detect(makeCtx(s, SHE)).some(c => c.id === "declined-but-given-as-prescribed"));
});

test("issues are recorded as facts and offered for handover", () => {
  const s = makeState(Object.assign({}, base, { medIssues: ["swallow", "partial"], med: ["explained", "label"] }));
  const r = compose(s);
  assert.match(r.note.text, /difficulty swallowing|difficult to swallow/);
  assert.match(r.note.text, /only part of it|did not take all/);
  const sa = G.smartAssist.collect(makeCtx(s, SHE));
  assert.ok(sa.handovers.some(h => /Issue with her morning medication: difficulty swallowing it, took only part of it/.test(h)), sa.handovers.join(" | "));
});

test("Smart Assist asks for the parts of the process that are missing, as suggestions", () => {
  const s = makeState({ kind: "medication", slot: "lunchtime", resp: "happy", consent: "yes" });
  const ids = G.smartAssist.collect(makeCtx(s, P.none)).items.map(i => i.id);
  for(const id of ["q:medTold", "q:medLabel", "q:medGiven"]) assert.ok(ids.includes(id), id);
  const done = G.smartAssist.collect(makeCtx(makeState(base), P.none));
  assert.ok(!done.items.some(i => /^q:med/.test(i.id)));
  assert.ok(done.passes.includes("MAR label check recorded"));
});

test("a choking risk brings a swallowing question, never a statement", () => {
  const s = makeState(Object.assign({}, base, { med: ["explained"] }));
  const rule = G.rules.evaluate(makeCtx(s, P.choking)).find(r => r.id === "choking-medication");
  assert.ok(rule && rule.prompts[0].sentence === "");
  s.prompts = { "choking-medication.swallowed": "no" };
  const r = compose(s, P.choking);
  assert.match(r.note.text, /had difficulty swallowing it/);
  assert.ok(G.smartAssist.collect(makeCtx(s, P.choking)).handovers.some(h => /Difficulty swallowing/.test(h)));
  assert.ok(!G.rules.evaluate(makeCtx(makeState({ kind: "medication", slot: "morning" }), P.none)).some(r => r.id === "choking-medication"));
});

test("the medication responses fit the note, and they/them reads correctly", () => {
  const s = makeState(Object.assign({}, base, { initials: "TT", pronoun: "they", how: ["said"], tasks: [{ id: "medtake", level: "prompt", opt: "{p} inhaler" }] }));
  const t = compose(s).note.text;
  assert.doesNotMatch(t, /\bthey was\b|\bthey is\b|\bthey takes\b/);
  assert.match(t, /their inhaler/);
  assert.doesNotMatch(t, /what they wanted|their choice/);
});

test("record fields the care system needs can be derived: label check and administered as prescribed", () => {
  const D = G.data;
  assert.equal(D.TASKS.medication.find(t => t.id === "medtake").nf, "Support to take medication", "the yes/no field is derived from the ticks, not the support level");
  assert.ok(D.MED.some(m => m[0] === "label") && D.MED.some(m => m[0] === "prescribed"));
});
