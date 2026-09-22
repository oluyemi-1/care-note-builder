/* Rewording may change sentence construction, order and phrasing - never a
   quantity, time, support level, observation, consent, choice, risk,
   outcome, person or activity. */
const test = require("node:test");
const assert = require("node:assert/strict");
const G = require("./helpers/load");
const { randomInteraction, compose } = require("./helpers/fuzz");

test("rewording keeps every fact, number and time", () => {
  let changed = 0;
  for(let seed = 1; seed <= 400; seed++){
    const x = randomInteraction(seed);
    const a = compose(x, seed * 13);
    for(const salt of [seed * 31 + 1, seed * 97 + 5]){
      const b = compose(x, salt, a.note.chosen);        // steer away from the wording on screen
      const check = G.provenance.sameFacts(a.note, b.note, a.s);
      assert.ok(check.same, "seed " + seed + " salt " + salt + ": " + check.why.join("; ") + "\nA: " + a.note.text + "\nB: " + b.note.text);
      if(a.note.text !== b.note.text) changed++;
    }
  }
  assert.ok(changed > 500, "rewording changed the wording only " + changed + " times");
});

test("the fact check notices a dropped or altered fact", () => {
  const x = randomInteraction(42);
  x.s.kind = "eating"; x.s.slot = "lunch"; x.s.offered = "250"; x.s.drunk = "200"; x.s.len = "full";
  const a = compose(x, 1);
  const dropped = { text: a.note.text, sentences: a.note.sentences.filter(s => s.key !== "fluid") };
  assert.equal(G.provenance.sameFacts(a.note, dropped, a.s).same, false);
  const renumbered = { text: a.note.text.replace("200ml", "220ml"), sentences: a.note.sentences };
  assert.equal(G.provenance.sameFacts(a.note, renumbered, a.s).same, false);
});

test("staff's own words survive rewording exactly", () => {
  const x = randomInteraction(7);
  Object.assign(x.s, { extra: "He waved at the bus driver", behaviour: ["other"], behaviourOther: "tapped the table twice", len: "full" });
  for(let salt = 0; salt < 30; salt++){
    const t = compose(x, salt).note.text;
    assert.ok(t.includes("He waved at the bus driver.") && t.includes("Tapped the table twice."), t);
  }
});
