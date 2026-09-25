const test = require("node:test");
const assert = require("node:assert/strict");
const G = require("./helpers/load");
const { makeState } = require("./helpers/state");
const P = require("./fixtures/profiles");

test("Connect & communication is an activity at home or out, and a college course, with its own events", () => {
  const D = G.data;
  assert.ok(D.ACTS.some(a => a[0] === "connect") && D.COURSES.some(c => c[0] === "connect"));
  assert.equal(D.ACTS[D.ACTS.length - 1][0], "other", "Something else stays last");
  assert.deepEqual(D.ACT_INFO.connect.tags, ["communication"]);
  assert.ok(D.DURING.communication.length >= 5);
  const s = makeState({ initials: "TT", pronoun: "she", kind: "activity", setting: "college", slot: "connect", time: "13:00", resp: "keen",
                        tasks: [{ id: "engage", level: "prompt", opt: "" }], during: ["comm-aid", "comm-turns"], len: "full" });
  const r = G.narrative.compose({ s, profile: P.none }, { salt: 2 });
  assert.match(r.note.text, /Connect and Communication session/);
  assert.match(r.note.text, /communication aid/);
  assert.match(r.note.text, /turn/);
  assert.deepEqual(G.provenance.verify(r.note.sentences, r.s), []);
  const home = G.narrative.compose({ s: makeState({ kind: "activity", setting: "community", slot: "connect", time: "14:00" }), profile: P.none }, { salt: 1 });
  assert.match(home.note.text, /Connect and Communication session/);
});

test("the service's other activities are there, with saved timetables unaffected by the renames", () => {
  const D = G.data;
  const courseLabels = D.COURSES.map(c => c[1]);
  for(const l of ["Cookery class", "Art class", "Playing Pop", "Table tennis"]) assert.ok(courseLabels.includes(l), l + " as a course");
  assert.ok(D.COURSES.some(c => c[0] === "cooking" && c[1] === "Cookery class"), "same id as before, so a timetable saved as 'cooking' still works");
  const actLabels = D.ACTS.map(a => a[1]);
  for(const l of ["Playing Pop", "Table tennis", "Gateway Club"]) assert.ok(actLabels.includes(l), l + " as an activity");
  assert.equal(D.ACTS[D.ACTS.length - 1][0], "other");
  for(const [slot, setting, expect] of [["cooking", "college", /cookery class/], ["pop", "college", /Playing Pop session/], ["tabletennis", "community", /table tennis/], ["gateway", "community", /Gateway Club/]]){
    const s = makeState({ initials: "TT", pronoun: "they", kind: "activity", setting, slot, time: "18:00", resp: setting === "college" ? "keen" : "agreed",
                          tasks: [{ id: "engage", level: "ind", opt: "" }], during: slot === "gateway" ? ["social-friends"] : [], len: "full" });
    const r = G.narrative.compose({ s, profile: P.none }, { salt: 3 });
    assert.match(r.note.text, expect, r.note.text);
    assert.deepEqual(G.provenance.verify(r.note.sentences, r.s), []);
  }
  assert.ok(G.rules.timetabled(makeState({ kind: "activity", setting: "community", slot: "pop" }), { timetable: [{ d: "1", c: "pop", from: "10:00", to: "12:00" }] }, new Date(2026, 8, 21)).sameActivity);
});
