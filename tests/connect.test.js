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
