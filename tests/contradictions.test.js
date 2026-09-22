const test = require("node:test");
const assert = require("node:assert/strict");
const G = require("./helpers/load");
const { makeState, makeCtx } = require("./helpers/state");

const ids = s => G.contradictions.detect(makeCtx(s)).map(c => c.id);
const task = (id, level, opt) => ({ id, level, opt: opt || "" });

test("fully independent overall, but a task staff did", () => {
  const s = makeState({ level: "ind", tasks: [task("wash", "full"), task("oral", "ind")] });
  const hit = G.contradictions.detect(makeCtx(s)).find(c => c.id === "overall-independent-vs-hands-on");
  assert.ok(hit);
  assert.match(hit.message, /Fully independent/);
  assert.match(hit.message, /Washing/);
  assert.ok(hit.fields.includes("tasks.wash.level"));
  assert.ok(hit.reason.length > 20, "every contradiction explains itself");
});

test("consistent support levels raise nothing", () => {
  assert.deepEqual(ids(makeState({ level: "part", tasks: [task("wash", "full"), task("oral", "ind")] })), []);
  assert.deepEqual(ids(makeState({ level: "ind", tasks: [task("wash", "ind"), task("oral", "prompt")] })), []);
});

test("full hands-on overall, but every task done by the person", () => {
  assert.ok(ids(makeState({ level: "full", tasks: [task("wash", "ind"), task("oral", "prompt")] })).includes("overall-full-vs-independent"));
});

test("consent not given, but hands-on support recorded", () => {
  assert.ok(ids(makeState({ consent: "no", level: "full" })).includes("no-consent-but-support"));
  assert.ok(ids(makeState({ consent: "no", tasks: [task("wash", "part")] })).includes("no-consent-but-support"));
  assert.ok(!ids(makeState({ consent: "no", tasks: [task("wash", "declined")] })).includes("no-consent-but-support"));
});

test("drink quantities: more drunk than offered, negative and implausible", () => {
  const hit = G.contradictions.detect(makeCtx(makeState({ kind: "eating", slot: "lunch", offered: "250", drunk: "400" })));
  const c = hit.find(x => x.id === "drunk-more-than-offered");
  assert.ok(c);
  assert.equal(c.message, "400 ml was recorded as drunk, but only 250 ml was recorded as offered.");
  assert.deepEqual(ids(makeState({ kind: "eating", offered: "250", drunk: "250" })), []);
  assert.ok(ids(makeState({ kind: "eating", drunk: "-50" })).includes("negative-amount"));
  assert.ok(ids(makeState({ kind: "eating", offered: "2500", drunk: "2400" })).includes("implausible-amount"));
});

test("declined, but the outcome says they enjoyed it", () => {
  assert.ok(ids(makeState({ resp: "declined", outcome: "enjoyed" })).includes("declined-but-enjoyed"));
  assert.ok(!ids(makeState({ resp: "delayed", outcome: "enjoyed" })).includes("declined-but-enjoyed"),
    "declined at first, then agreed can still be enjoyed");
});

test("declined, but support or skills recorded as happening", () => {
  assert.ok(ids(makeState({ resp: "declined", tasks: [task("wash", "part")] })).includes("declined-but-supported"));
  assert.ok(ids(makeState({ kind: "activity", setting: "college", slot: "music", resp: "declinedgo", learn: ["skill"] })).includes("declined-but-supported"));
  assert.ok(!ids(makeState({ resp: "declined", tasks: [task("wash", "declined")] })).includes("declined-but-supported"));
});

test("an at-home activity with a bus journey", () => {
  const home = makeState({ kind: "activity", slot: "film", tasks: [task("travel", "prompt", "by bus")] });
  const c = G.contradictions.detect(makeCtx(home)).find(x => x.id === "home-activity-with-travel");
  assert.ok(c);
  assert.match(c.message, /by bus/);
  /* out in the community with a bus journey is exactly right */
  assert.ok(!ids(makeState({ kind: "activity", slot: "cinema", tasks: [task("travel", "prompt", "by bus")] })).includes("home-activity-with-travel"));
  /* "either" activities depend on the journey, so no clash */
  assert.ok(!ids(makeState({ kind: "activity", slot: "gardening", tasks: [task("travel", "prompt", "on foot")] })).includes("home-activity-with-travel"));
  assert.ok(ids(makeState({ kind: "activity", slot: "games", risk: ["seatbelt"] })).includes("home-activity-with-travel-safety"));
  assert.ok(ids(makeState({ kind: "activity", slot: "games", outcome: "home" })).includes("home-activity-with-travel-safety"));
});

test("a declined journey with journey safety recorded", () => {
  assert.ok(ids(makeState({ kind: "activity", slot: "cinema", tasks: [task("travel", "declined", "by bus")], risk: ["seatbelt"] })).includes("travel-declined-but-journey-safety"));
  assert.ok(!ids(makeState({ kind: "activity", slot: "cinema", tasks: [task("travel", "prompt", "by bus")], risk: ["stop"] })).includes("travel-declined-but-journey-safety"));
});

test("eating: nothing eaten vs eating recorded, declined vs eaten", () => {
  assert.ok(ids(makeState({ kind: "eating", ate: "None", tasks: [task("eat", "ind")] })).includes("ate-none-but-ate"));
  assert.ok(ids(makeState({ kind: "eating", ate: "None", whatAte: "toast" })).includes("ate-none-but-ate"));
  assert.ok(ids(makeState({ kind: "eating", ate: "Most", tasks: [task("eat", "declined")] })).includes("declined-meal-but-ate"));
  assert.ok(ids(makeState({ kind: "eating", drunk: "100", tasks: [task("drink", "declined")] })).includes("declined-drink-but-drank"));
});

test("wellbeing: no change alongside a change", () => {
  assert.ok(ids(makeState({ well: ["nochange", "pain"] })).includes("no-change-but-concern"));
  assert.deepEqual(ids(makeState({ well: ["nochange"] })), []);
});

test("choice: picked option disagrees with the choice named", () => {
  assert.ok(ids(makeState({ offerA: "a shower", offerB: "a bath", resp: "choseA", chosen: "a bath" })).includes("chose-option-mismatch"));
  assert.ok(!ids(makeState({ offerA: "a shower", offerB: "a bath", resp: "choseA", chosen: "A shower" })).includes("chose-option-mismatch"));
  assert.ok(ids(makeState({ offerA: "a shower", resp: "choseB" })).includes("chose-second-none-offered"));
});

test("college session ending before it starts", () => {
  assert.ok(ids(makeState({ kind: "activity", setting: "college", slot: "music", time: "14:00", sessionTo: "13:00" })).includes("session-ends-before-start"));
  assert.ok(!ids(makeState({ kind: "activity", setting: "college", slot: "music", time: "13:00", sessionTo: "14:00" })).includes("session-ends-before-start"));
});

test("an empty interaction raises no contradictions", () => {
  for(const kind of ["personal", "eating", "activity"]) assert.deepEqual(ids(makeState({ kind })), []);
});
