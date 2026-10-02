/* Staff feedback: the note must read in the order care happens - knock,
   offer, choice, consent, door closed and steps explained, then the care -
   and must not keep saying the same thing. */
const test = require("node:test");
const assert = require("node:assert/strict");
const G = require("./helpers/load");
const { makeState } = require("./helpers/state");
const { randomInteraction } = require("./helpers/fuzz");

const HE = { initials: "MA", pronoun: "he", flags: [], comm: ["verbal"] };
const keys = note => note.sentences.map(x => (x.members || [x.key]).join("+"));
const shower = { initials: "MA", pronoun: "he", kind: "personal", slot: "am", time: "07:45", offerA: "a shower", offerB: "a bath",
  resp: "choseA", chosen: "a shower", how: ["said"], consent: "yes", commUsed: ["verbal"],
  tasks: [{ id: "wash", level: "part", opt: "a shower" }, { id: "dress", level: "part" }], level: "part",
  dignity: ["knocked", "door", "covered", "explained"], skin: "clear", outcome: "ready", len: "full" };

test("personal care reads knock, offer, choice, consent, privacy, then the care", () => {
  for(let salt = 0; salt < 12; salt++){
    const k = keys(G.narrative.compose({ s: makeState(shower), profile: HE }, { salt }).note);
    const at = p => k.findIndex(x => x.startsWith(p));
    const care = Math.min(...["task_", "group_"].map(at).filter(i => i >= 0));
    assert.ok(at("open") < at("dig_knocked") && at("dig_knocked") < at("offer"), k.join(", "));
    assert.ok(at("consent") < at("dig_door") && at("dig_door") < care, k.join(", "));
    ["dig_covered", "dig_explained"].forEach(d => assert.ok(at("consent") < at(d) && at(d) < care, d + ": " + k.join(", ")));
  }
});

test("in random notes, consent and dignity are never said after the care", () => {
  for(let seed = 1; seed <= 400; seed++){
    const x = randomInteraction(seed);
    const k = keys(G.narrative.compose(x, { salt: seed }).note);
    const care = k.findIndex(x => /task_|group_/.test(x));
    if(care < 0) continue;
    k.forEach((x, i) => { if(/^consent$|dig_/.test(x)) assert.ok(i < care, "seed " + seed + ": " + k.join(", ")); });
  }
});

test("tasks at the same level are said once, not with the level phrase repeated", () => {
  const s = makeState(Object.assign({}, shower, { tasks: [{ id: "hair", level: "min" }, { id: "shave", level: "min" }, { id: "nails", level: "min" }] }));
  for(let salt = 0; salt < 8; salt++){
    const t = G.narrative.compose({ s, profile: HE }, { salt }).note.text;
    assert.ok((t.match(/hands-on help|little help/g) || []).length <= 1, t);
  }
});

test("back-to-back observations at the same time become one sentence, keeping every source", () => {
  const s = makeState({ initials: "MA", pronoun: "he", kind: "eating", slot: "lunch", time: "12:30", well: ["pain", "cough"], len: "full" });
  for(let salt = 0; salt < 6; salt++){
    const note = G.narrative.compose({ s, profile: HE }, { salt }).note;
    const lines = note.sentences.filter(x => /observed during/.test(x.text));
    if(lines.length === 0) continue;                                   // a wording that does not say "observed during"
    assert.equal(lines.length, 1, note.text);
    if(/ and /.test(lines[0].text)) assert.deepEqual([...lines[0].sources].sort(), ["well.cough", "well.pain"], lines[0].text);
    assert.deepEqual(G.provenance.verify(note.sentences, s), []);
  }
});

test("wording repeats far less than once per note", () => {
  let repeated = 0, staffRuns = 0;
  for(let seed = 1; seed <= 300; seed++){
    const ss = G.narrative.compose(randomInteraction(seed), { salt: seed }).note.sentences;
    const seen = {};
    ss.forEach((x, i) => {
      const w = x.text.toLowerCase().replace(/[^a-z ]/g, "").split(" ");
      for(let j = 0; j + 3 <= w.length; j++){ const g = w.slice(j, j + 3).join(" "); (seen[g] = seen[g] || new Set()).add(i); }
      if(i && x.text.startsWith("Staff ") && ss[i - 1].text.startsWith("Staff ")) staffRuns++;
    });
    repeated += Object.values(seen).filter(v => v.size > 1).length;
  }
  assert.ok(repeated < 150, "repeated phrases across 300 notes: " + repeated);
  assert.ok(staffRuns < 120, "back-to-back sentences starting Staff: " + staffRuns);
});

test("pressing Reword it again moves on to wording not yet seen, instead of bouncing back", () => {
  const s = makeState(shower);
  let avoid = {}, note = G.narrative.compose({ s, profile: HE }, { salt: 3, avoid }).note;
  const texts = [note.text];
  for(let press = 0; press < 2; press++){
    const old = avoid;
    avoid = Object.keys(note.chosen).reduce((o, k) =>
      Object.assign(o, { [k]: [note.chosen[k]].concat([].concat(old[k] === undefined ? [] : old[k]).filter(x => x !== note.chosen[k])) }), {});
    note = G.narrative.compose({ s, profile: HE }, { salt: 1000 + press, avoid }).note;
    texts.push(note.text);
  }
  assert.equal(new Set(texts).size, 3, texts.join("\n---\n"));
});
