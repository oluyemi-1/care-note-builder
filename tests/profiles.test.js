const test = require("node:test");
const assert = require("node:assert/strict");
const G = require("./helpers/load");

test("an old saved profile is carried over into the full shape", () => {
  const old = { initials: "ma", pronoun: "he", ratio: "1:1", comm: ["verbal"], flags: ["skin"], timetable: [{ d: "1", c: "music", from: "10:00", to: "12:00" }] };
  const p = G.profiles.normalizeProfile(old);
  assert.equal(p.initials, "MA");
  assert.deepEqual(p.comm, ["verbal"]);
  assert.deepEqual(p.flags, ["skin"]);
  assert.equal(p.timetable[0].c, "music");
  for(const id of G.profiles.FIELD_IDS) assert.equal(typeof p[id], "string", id + " is present");
});

test("unknown flags, communication methods and junk are dropped", () => {
  const p = G.profiles.normalizeProfile({ initials: "AB", flags: ["vision", "<script>"], comm: ["telepathy"], mobility: "flying", usualLevel: "sometimes", pronoun: "xe" });
  assert.deepEqual(p.flags, ["vision"]);
  assert.deepEqual(p.comm, []);
  assert.equal(p.mobility, "");
  assert.equal(p.usualLevel, "");
  assert.equal(p.pronoun, "they", "an unknown pronoun falls back to they/them, never a guess");
});

test("fluid target must be a sensible number of millilitres", () => {
  const n = v => G.profiles.normalizeProfile({ fluidTarget: v }).fluidTarget;
  assert.equal(n("1500"), "1500");
  assert.equal(n(1499.6), "1500");
  assert.equal(n("-5"), "");
  assert.equal(n("lots"), "");
  assert.equal(n("99999"), "");
});

test("the context summary is reminders only, drawn from what the profile holds", () => {
  const p = G.profiles.normalizeProfile({ initials: "TV", flags: ["vision", "fluids"], fluidTarget: "1500", mobility: "aid", mobilityAid: "long cane" });
  assert.deepEqual(G.profiles.contextSummary(p), ["Visual impairment", "Fluid target 1,500 ml a day", "Walks with an aid (long cane)"]);
  assert.deepEqual(G.profiles.contextSummary(G.profiles.normalizeProfile({ initials: "TN" })), []);
});

test("initials keep letters, numbers, apostrophes and hyphens only", () => {
  assert.equal(G.profiles.normalizeProfile({ initials: "o'b" }).initials, "O'B");
  assert.equal(G.profiles.normalizeProfile({ initials: "<b>x" }).initials, "BX");
});
