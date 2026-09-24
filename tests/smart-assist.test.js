const test = require("node:test");
const assert = require("node:assert/strict");
const G = require("./helpers/load");
const { makeState, makeCtx } = require("./helpers/state");
const P = require("./fixtures/profiles");

const task = (id, level, opt) => ({ id, level, opt: opt || "" });
const collect = (s, profile, extra) => G.smartAssist.collect(makeCtx(s, profile, extra));
const RANK = G.smartAssist.SEVERITY;

test("findings come out in priority order: critical, review, missing, suggestion", () => {
  const sa = collect(makeState({ kind: "activity", slot: "walk", level: "ind", tasks: [task("travel", "full", "on foot")], extra: "He was fine" }), P.vision);
  const ranks = sa.items.map(i => RANK[i.severity].rank);
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
  assert.equal(sa.items[0].severity, "review");
  assert.ok(sa.items.some(i => i.severity === "suggestion" && /Visual impairment/.test(i.title)));
});

test("every finding carries a reason", () => {
  const sa = collect(makeState({ kind: "eating", slot: "lunch", resp: "declined", offered: "100", drunk: "300", extra: "difficult" }), P.choking);
  assert.ok(sa.items.length > 3);
  for(const i of sa.items) assert.ok(i.reason && i.reason.length > 10, i.id + " has a reason");
});

test("an unexplained contradiction blocks copying; an explanation unblocks it", () => {
  const s = makeState({ level: "ind", tasks: [task("wash", "full")] });
  assert.equal(collect(s).blocking, true);
  const sa = collect(s, null, { explanations: { "overall-independent-vs-hands-on": "Washing was done by staff because of a hand injury." } });
  assert.equal(sa.blocking, false);
  assert.ok(sa.items.find(i => i.id === "c:overall-independent-vs-hands-on").explained);
  assert.equal(sa.counts.review, 0, "an explained inconsistency no longer counts as one to review");
});

test("no contradictions is stated as a pass", () => {
  const sa = collect(makeState({ resp: "agreed", consent: "yes", outcome: "settled" }));
  assert.ok(sa.passes.includes("No logical contradictions detected"));
  assert.ok(sa.passes.includes("Consent recorded"));
  assert.ok(sa.passes.includes("Outcome recorded"));
});

test("a profile suggestion clears once staff record something against it", () => {
  const s = makeState({ kind: "activity", slot: "walk" });
  assert.ok(collect(s, P.vision).items.some(i => i.id === "r:vision-community"));
  s.risk = ["crossing"];
  assert.ok(!collect(s, P.vision).items.some(i => i.id === "r:vision-community"));
});

test("communication is missing for someone whose profile records how they communicate", () => {
  const s = makeState({ resp: "agreed" });
  assert.equal(collect(s, P.hearing).items.find(i => i.fields && i.fields[0] === "how").severity, "missing");
  assert.equal(collect(makeState({ resp: "agreed" }), P.none).items.find(i => i.fields && i.fields[0] === "how").severity, "suggestion");
  assert.ok(!collect(makeState({ resp: "agreed", how: ["said"] }), P.hearing).items.some(i => i.fields && i.fields[0] === "how"));
});

test("irrelevant findings stay quiet", () => {
  /* a person with no recorded needs, having a meal: nothing about vision, choking or fluids */
  const sa = collect(makeState({ kind: "eating", slot: "lunch" }), P.none);
  assert.ok(!sa.items.some(i => /Visual|choking|fluid/i.test(i.title)));
});

test("independence evidence counts each support level", () => {
  const f = G.rules.facts(makeCtx(makeState({ tasks: [task("wash", "ind"), task("oral", "ind"), task("dress", "prompt"), task("shave", "part"), task("hair", "full")] })));
  const ind = G.quality.independence(f);
  assert.deepEqual(ind.lines, ["2 tasks done themselves", "1 task with prompting", "1 task part-supported", "1 task done by staff"]);
  assert.deepEqual(ind.by.ind, ["Washing", "Oral care"]);
  assert.equal(ind.evidenced, true);
});

test("the overall level speaks for independence only when no task says otherwise", () => {
  const onlyStaff = G.quality.independence(G.rules.facts(makeCtx(makeState({ level: "ind", tasks: [task("wash", "full")] }))));
  assert.equal(onlyStaff.evidenced, false);
  const noRows = G.quality.independence(G.rules.facts(makeCtx(makeState({ level: "prompt" }))));
  assert.equal(noRows.evidenced, true);
});

test("strengths are only claimed when earned", () => {
  const strong = collect(makeState({ offerA: "a shower", offerB: "a bath", resp: "choseA", chosen: "a shower",
                                     tasks: [task("wash", "ind"), task("oral", "prompt")] }));
  assert.equal(strong.strengths, "Strong evidence of choice and independence.");
  assert.equal(collect(makeState({ resp: "agreed" })).strengths, "");
});

test("someone who declined outright is not asked for a support level", () => {
  const s = makeState({ resp: "declined", consent: "no", declined: "Left and offered again later." });
  const support = G.quality.orgAudit(G.rules.facts(makeCtx(s))).find(a => a.id === "support");
  assert.equal(support.ok, true);
});

test("an explanation for an inconsistency that has gone is not checked for wording", () => {
  const s = makeState({ level: "part", tasks: [task("wash", "full")] });   // no contradiction any more
  const sa = collect(s, null, { explanations: { "overall-independent-vs-hands-on": "He was a bit difficult" } });
  assert.ok(!sa.items.some(i => i.id.startsWith("l:explain:")));
});

test("free text that says what an option says brings a 'tick it' suggestion, until it is ticked", () => {
  const s = makeState({ kind: "activity", setting: "college", slot: "music", extra: "He danced with other attendees." });
  const sa = collect(s, P.none);
  const m = sa.items.find(i => i.id === "m:during.music-danced");
  assert.ok(m && m.severity === "suggestion" && m.tick === "during.music-danced");
  assert.match(m.reason, /Your own words stay in the note/);
  s.during = ["music-danced"];
  assert.ok(!collect(s, P.none).items.some(i => i.id === "m:during.music-danced"));
});

test("a timetabled course chosen as a home activity is questioned, and audit items point at their step", () => {
  const profile = Object.assign({}, P.none, { timetable: [{ d: "2", c: "music", from: "10:00", to: "12:00" }] });
  const s = makeState({ kind: "activity", setting: "community", slot: "music" });
  const sa = G.smartAssist.collect(Object.assign(makeCtx(s, profile), { now: new Date(2026, 8, 26) }));
  const q = sa.items.find(i => i.id === "tt:college");
  assert.ok(q && q.severity === "suggestion");
  assert.match(q.title, /Music as a college course on Tuesdays \(10:00–12:00\)\. Was this the college session\?/);
  assert.deepEqual(q.fields, ["setting"]);
  for(const id of ["a:response", "a:support", "a:outcome"]){
    const it = sa.items.find(i => i.id === id);
    assert.ok(it && it.fields.length === 1, id + " points somewhere");
  }
});
