/* A college day: staff told the person it was college today, how they told
   them, and how the person showed they would go - before the journey. */
const test = require("node:test");
const assert = require("node:assert/strict");
const G = require("./helpers/load");
const { makeState } = require("./helpers/state");
const P = require("./fixtures/profiles");

const compose = (s, salt) => G.narrative.compose({ s, profile: P.hearing }, { salt: salt || 1 });
const keys = note => note.sentences.flatMap(x => x.members || [x.key]);
const base = { initials: "TH", pronoun: "he", kind: "activity", setting: "college", slot: "music", time: "10:00", sessionTo: "12:00",
               commUsed: ["makaton"], resp: "keen", how: ["nodded"], consent: "implied",
               tasks: [{ id: "travel", level: "prompt", opt: "by cab" }, { id: "engage", level: "prompt", opt: "" }], len: "full" };

test("the note says staff told him it was college today, how, and how he showed he would go - then the journey", () => {
  for(let salt = 0; salt < 12; salt++){
    const r = compose(makeState(base), salt);
    const t = r.note.text;
    assert.match(t, /That morning, staff (?:told|let|explained to) TH .*college today.*music class.*using Makaton alongside speech\./, t);
    assert.match(t, /nodd/, t);
    assert.doesNotMatch(t, /Staff (?:used|signed in) Makaton/, "the method is in the telling sentence, not a second one");
    assert.doesNotMatch(t, /what he wanted|his choice/, "college wording, not choosing wording");
    const k = keys(r.note);
    assert.ok(k.indexOf("tell") < k.indexOf("resp") && k.indexOf("resp") < k.indexOf("task_travel"), k.join(", "));
    assert.deepEqual(G.provenance.verify(r.note.sentences, r.s), []);
  }
});

test("the time of day follows the session time, and no method means no telling sentence", () => {
  assert.match(compose(makeState(Object.assign({}, base, { time: "13:30", sessionTo: "15:00" }))).note.text, /Earlier that day, staff/);
  assert.match(compose(makeState(Object.assign({}, base, { time: "", sessionTo: "" }))).note.text, /Before setting off, staff/);
  const none = compose(makeState(Object.assign({}, base, { commUsed: [] }))).note;
  assert.ok(!keys(none).includes("tell"));
  assert.doesNotMatch(none.text, /told TH|college today/);
});

test("two methods make one clause; a method with no clause keeps its own sentence", () => {
  const t = compose(makeState(Object.assign({}, base, { commUsed: ["makaton", "pictures"] }))).note.text;
  assert.match(t, /using Makaton alongside speech and using his picture-based communication book/);
  const D = G.data;
  D.COMMBANK.__x = ["Staff used the __x method."]; D.COMM.push(["__x", "X"]);
  const t2 = compose(makeState(Object.assign({}, base, { commUsed: ["makaton", "__x"] }))).note.text;
  assert.match(t2, /using Makaton alongside speech/); assert.match(t2, /Staff used the __x method\./);
  D.COMM.pop(); delete D.COMMBANK.__x;
});

test("a home or community activity is unchanged", () => {
  const t = compose(makeState({ kind: "activity", setting: "community", slot: "walk", commUsed: ["makaton"], resp: "agreed", how: ["nodded"], len: "full" })).note.text;
  assert.match(t, /Makaton/); assert.doesNotMatch(t, /college today/);
  assert.match(t, /nodded to show (?:his|their) choice|nodded when the option|nodding to show (?:his|their) choice/);
});

test("a session they declined to attend is not told as a going-to-college morning", () => {
  const t = compose(makeState(Object.assign({}, base, { resp: "declinedgo", consent: "no", declined: "said he wanted to stay home" }))).note.text;
  assert.doesNotMatch(t, /staff told TH that it was college today/);
});

test("the college telling and response wording reads correctly for they/them", () => {
  const t = compose(makeState(Object.assign({}, base, { initials: "TT", pronoun: "they", how: ["said"] }))).note.text;
  assert.doesNotMatch(t, /\bthey was\b|\bthey is\b/);
  assert.match(t, /they were happy to go|they wanted to go|telling staff so/);
});
