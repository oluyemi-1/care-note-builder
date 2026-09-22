const test = require("node:test");
const assert = require("node:assert/strict");
const G = require("./helpers/load");
const { makeState } = require("./helpers/state");

const NOW = new Date(2026, 8, 22, 18, 0);          // 22 Sep 2026, 18:00
const day = n => G.patterns.iso(new Date(NOW.getTime() - n * 86400000));
const rec = (daysAgo, over) => Object.assign(G.patterns.toRecord(makeState(Object.assign({ initials: "TT" }, over)),
  { id: "r" + daysAgo + Math.random(), now: NOW, date: day(daysAgo) }), { time: (over && over.time) || "12:00" });
const meal = (daysAgo, ate, extra) => rec(daysAgo, Object.assign({ kind: "eating", slot: "lunch", ate }, extra));
const opts = { now: NOW, windowDays: 14, initials: "TT" };
const ids = (records, current, o) => G.patterns.detect(records, current, Object.assign({}, opts, o)).map(x => x.id);

test("a history record keeps structured observations, never free text", () => {
  const s = makeState({ initials: "TT", kind: "eating", slot: "lunch", ate: "Most", whatAte: "SECRET-FOOD", offered: "250", drunk: "200",
    extra: "SECRET-EXTRA", declined: "SECRET-DECLINED", handover: "SECRET-HANDOVER", behaviour: ["other"], behaviourOther: "SECRET-BEH",
    skinDetail: "SECRET-SKIN", chosen: "SECRET-CHOSEN", tasks: [{ id: "eat", level: "prompt", opt: "" }] });
  const r = G.patterns.toRecord(s, { now: NOW });
  assert.doesNotMatch(JSON.stringify(r), /SECRET/);
  assert.deepEqual(r.food, { amount: "Most", pct: 75 });
  assert.deepEqual(r.fluid, { offered: 250, drunk: 200 });
  assert.deepEqual(r.tasks, [{ id: "eat", level: "prompt" }]);
  assert.equal(r.handover, true, "that a handover was written is kept, not what it said");
});

test("baseline: usual food, daily fluids over complete days, and support per task", () => {
  const rs = [meal(1, "All", { drunk: "300" }), meal(1, "Most", { drunk: "200", time: "18:00" }), meal(2, "About half", { drunk: "400" }),
              meal(3, "Most"), meal(0, "None", { drunk: "900" }),
              rec(4, { kind: "personal", tasks: [{ id: "wash", level: "prompt" }] }), rec(5, { kind: "personal", tasks: [{ id: "wash", level: "prompt" }] }),
              rec(6, { kind: "personal", tasks: [{ id: "wash", level: "ind" }] })];
  const b = G.patterns.baseline(rs, opts);
  assert.equal(b.food.meals, 5);
  assert.equal(b.food.avgPct, Math.round((100 + 75 + 50 + 75 + 0) / 5));
  assert.equal(b.fluid.days, 2, "today is not a complete day");
  assert.equal(b.fluid.avgDaily, (500 + 400) / 2);
  assert.deepEqual(b.support.wash, { value: "prompt", count: 2, of: 3 });
});

test("the comparison window is configurable and old records fall out of it", () => {
  const rs = [meal(3, "Most"), meal(10, "All"), meal(20, "None")];
  assert.equal(G.patterns.baseline(rs, Object.assign({}, opts, { windowDays: 7 })).food.meals, 1);
  assert.equal(G.patterns.baseline(rs, Object.assign({}, opts, { windowDays: 14 })).food.meals, 2);
  assert.equal(G.patterns.baseline(rs, Object.assign({}, opts, { windowDays: 28 })).food.meals, 3);
});

test("three meals in a row well below their own usual is a change in pattern", () => {
  const usual = [meal(9, "Most"), meal(8, "All"), meal(7, "Most"), meal(6, "Most"), meal(5, "All"), meal(4, "Most")];
  const lowTwo = usual.concat([meal(2, "A small amount"), meal(1, "None")]);
  assert.ok(ids(lowTwo, meal(0, "A small amount")).includes("pat:food"));
  assert.ok(!ids(lowTwo, meal(0, "Most")).includes("pat:food"), "a good meal today breaks the run");
  assert.ok(!ids(usual.concat([meal(1, "None")]), meal(0, "None")).includes("pat:food"), "two low meals is not three");
});

test("no pattern is claimed without enough history", () => {
  assert.ok(!ids([meal(2, "Most"), meal(1, "None")], meal(0, "None")).includes("pat:food"));
});

test("people are only compared with themselves", () => {
  /* someone else eats well every day; that is not TT's usual, so TT's low meals are not "below pattern" */
  const others = [9, 8, 7, 6, 5, 4].map(n => Object.assign(meal(n, "All", { drunk: "500" }), { person: "ZZ" }));
  const mine = [meal(2, "A small amount"), meal(1, "A small amount")];
  assert.ok(!ids(others.concat(mine), meal(0, "A small amount")).includes("pat:food"));
  assert.equal(G.patterns.fluidToday([Object.assign(meal(0, "All", { drunk: "900" }), { person: "ZZ" })], meal(0, "Most", { drunk: "100" }), { now: NOW }).total, 100);
});

test("fluids so far today against the target in the profile", () => {
  const today = [meal(0, "Most", { drunk: "300" }), meal(0, "Most", { drunk: "250" })];
  const now = meal(0, "Most", { drunk: "200" });
  assert.deepEqual(G.patterns.fluidToday(today, now, { now: NOW }), { total: 750, entries: 3 });
  const f = G.patterns.detect(today, now, Object.assign({}, opts, { fluidTarget: "1500" })).find(x => x.id === "pat:fluid-target");
  assert.match(f.reason, /750 ml has been recorded today/);
  assert.ok(!ids(today, meal(0, "Most", { drunk: "1000" }), { fluidTarget: "1500" }).includes("pat:fluid-target"));
});

test("an activity declined on three recent occasions", () => {
  const walk = (n, resp) => rec(n, { kind: "activity", slot: "walk", resp });
  const rs = [walk(5, "declined"), walk(4, "agreed"), walk(2, "declined")];
  const f = G.patterns.detect(rs, walk(0, "declined"), opts).find(x => x.id === "pat:declined-walk");
  assert.equal(f.title, "This activity has been declined on 3 recent occasions.");
  assert.ok(!ids(rs, walk(0, "agreed")).includes("pat:declined-walk"));
});

test("sleep unlike their own recent baseline", () => {
  const night = (n, obs) => rec(n, { kind: "personal", slot: "night", sleepObs: [obs] });
  const settled = [9, 8, 7, 6, 5, 4].map(n => night(n, "asleep"));
  assert.ok(ids(settled.concat([night(1, "awakeunsettled")]), night(0, "awakeunsettled")).includes("pat:sleep"));
  const oftenUnsettled = [9, 8, 7, 6, 5, 4].map(n => night(n, n % 2 ? "awakeunsettled" : "asleep"));
  assert.ok(!ids(oftenUnsettled.concat([night(1, "awakeunsettled")]), night(0, "awakeunsettled")).includes("pat:sleep"),
    "for someone often unsettled, it is their usual");
});

test("a task needing much more support than usual", () => {
  const wash = (n, level) => rec(n, { kind: "personal", tasks: [{ id: "wash", level }] });
  const rs = [wash(4, "ind"), wash(3, "ind"), wash(2, "ind"), wash(1, "prompt")];
  const f = G.patterns.detect(rs, wash(0, "full"), Object.assign({}, opts, { taskLabel: () => "Washing" })).find(x => x.id === "pat:support-wash");
  assert.ok(f);
  assert.match(f.reason, /usually recorded as “Did it themselves” \(3 of 4/);
  assert.ok(!ids(rs, wash(0, "prompt")).includes("pat:support-wash"), "one step more is not flagged");
});

test("pattern wording describes records, never a diagnosis", () => {
  const wash = (n, level) => rec(n, { kind: "personal", tasks: [{ id: "wash", level }], mood: n < 1 ? ["anxious"] : ["settled"] });
  const rs = [6, 5, 4, 3, 2, 1].map(n => wash(n, "ind")).concat([meal(9, "Most"), meal(8, "All"), meal(7, "Most"), meal(6, "Most"), meal(5, "All"), meal(2, "None"), meal(1, "None")]);
  const found = G.patterns.detect(rs, wash(0, "full"), Object.assign({}, opts, { fluidTarget: "1500" }))
    .concat(G.patterns.detect(rs, meal(0, "None"), Object.assign({}, opts, { fluidTarget: "1500" })));
  assert.ok(found.length >= 3);
  for(const f of found){
    assert.doesNotMatch(f.title + f.reason, /\b(ill|illness|infection|dehydrat|depress|diagnos|UTI|disease|indicates|proves|because of)\b/i, f.title);
    assert.match(f.reason, /handover or escalation in accordance with TT's care plan/);
  }
});
