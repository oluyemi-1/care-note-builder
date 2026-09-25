/* What the care record's daily-note box asks of an activity note: how the
   person chose it, how they were supported, how much they enjoyed it, and how
   it met their wishes and outcomes. */
const test = require("node:test");
const assert = require("node:assert/strict");
const G = require("./helpers/load");
const { makeState, makeCtx } = require("./helpers/state");
const P = require("./fixtures/profiles");

const compose = (s, profile, salt) => G.narrative.compose({ s, profile }, { salt: salt || 1 });
const tt = chosen => ({ initials: "TN", pronoun: "he", flags: [], comm: [], timetable: [{ d: "4", c: "music", from: "10:00", to: "12:00", chosen }] });

test("a course the person chose at enrolment is said to be their choice", () => {
  const s = makeState({ initials: "TN", pronoun: "he", kind: "activity", setting: "college", slot: "music", time: "10:00", resp: "keen" });
  for(let salt = 0; salt < 9; salt++){
    const r = compose(s, tt(true), salt);
    assert.match(r.note.text, /music class (?:himself|is a course he picked himself)|picked his music class from the courses offered/, r.note.text);
    const sent = r.note.sentences.find(x => x.key === "enrol");
    assert.ok(sent.sources.includes("profile.timetable.music.chosen"));
    assert.deepEqual(G.provenance.verify(r.note.sentences, r.s), []);
  }
  assert.doesNotMatch(compose(s, tt(false)).note.text, /courses|start of the/, "not ticked: nothing is presumed");
  assert.doesNotMatch(compose(Object.assign({}, s, { resp: "declinedgo", consent: "no" }), tt(true)).note.text, /chose his music class/, "a session they did not go to");
});

test("Smart Assist asks how the course was chosen only when the timetable does not say", () => {
  const s = makeState({ initials: "TN", pronoun: "he", kind: "activity", setting: "college", slot: "music", resp: "keen" });
  assert.ok(G.smartAssist.collect(makeCtx(s, tt(false))).items.some(i => i.id === "q:enrolment"));
  assert.ok(!G.smartAssist.collect(makeCtx(s, tt(true))).items.some(i => i.id === "q:enrolment"));
  assert.ok(G.smartAssist.collect(makeCtx(s, tt(true))).passes.includes("How they chose the course recorded"));
});

test("enjoyment and benefit each add one sentence, and the outcome is not repeated", () => {
  const s = makeState({ kind: "activity", slot: "walk", enjoy: "parts", benefit: ["asked", "goal"], outcome: "settled", len: "full" });
  const t = compose(s, P.none).note.text;
  assert.match(t, /enjoyed? (?:parts of it|some parts)/);
  assert.match(t, /had asked to do/);
  assert.match(t, /support plan/);
  const both = makeState({ kind: "activity", slot: "walk", enjoy: "throughout", outcome: "enjoyed", len: "full" });
  const r = compose(both, P.none);
  assert.equal((r.note.text.match(/enjoy/gi) || []).length, 1, r.note.text);
  assert.ok(r.note.sentences.find(x => x.key === "out").sources.includes("enjoy"));
  assert.deepEqual(G.provenance.verify(r.note.sentences, r.s), []);
});

test("enjoyment and benefit are asked for on an activity note, not on personal care", () => {
  const walk = G.smartAssist.collect(makeCtx(makeState({ kind: "activity", slot: "walk", resp: "agreed" }), P.none));
  assert.ok(walk.items.some(i => i.id === "q:enjoyment") && walk.items.some(i => i.id === "q:benefit"));
  const wash = G.smartAssist.collect(makeCtx(makeState({ kind: "personal" }), P.none));
  assert.ok(!wash.items.some(i => i.id === "q:enjoyment" || i.id === "q:benefit"));
  const declined = G.smartAssist.collect(makeCtx(makeState({ kind: "activity", slot: "walk", resp: "declined" }), P.none));
  assert.ok(!declined.items.some(i => i.id === "q:enjoyment"), "nothing to enjoy if they declined");
});

test("not enjoying it and an outcome of enjoying it cannot both be true", () => {
  const s = makeState({ kind: "activity", slot: "walk", enjoy: "notmuch", outcome: "enjoyed" });
  assert.ok(G.contradictions.detect(makeCtx(s, P.none)).some(c => c.id === "not-enjoyed-but-enjoyed"));
  assert.ok(!G.contradictions.detect(makeCtx(makeState({ kind: "activity", slot: "walk", enjoy: "parts", outcome: "enjoyed" }), P.none)).some(c => c.id === "not-enjoyed-but-enjoyed"));
});

test("a goal in the profile prompts the benefit tick, and clears once anything is ticked there", () => {
  const profile = Object.assign({}, P.none, { goals: "to cook a meal each week" });
  const s = makeState({ kind: "activity", slot: "cooking" });
  const sa = G.smartAssist.collect(makeCtx(s, profile));
  const g = sa.items.find(i => i.id === "r:goals-activity");
  assert.ok(g && /to cook a meal each week/.test(g.title));
  s.benefit = ["goal"];
  assert.ok(!G.smartAssist.collect(makeCtx(s, profile)).items.some(i => i.id === "r:goals-activity"));
});

test("the timetable keeps which courses were the person's own choice", () => {
  const p = G.profiles.normalizeProfile({ initials: "TN", timetable: [{ d: "4", c: "music", from: "10:00", to: "12:00", chosen: true }, { d: "2", c: "art", from: "13:00", to: "15:00" }] });
  assert.deepEqual(p.timetable.map(r => r.chosen), [true, false]);
});
