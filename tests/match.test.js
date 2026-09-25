/* Matching staff's own words to tick options, and turning their sentences into
   templates a manager can adopt. Nothing typed is ever changed. */
const test = require("node:test");
const assert = require("node:assert/strict");
const G = require("./helpers/load");
const { makeState, makeCtx } = require("./helpers/state");
const P = require("./fixtures/profiles");

const facts = (over, profile) => G.rules.facts(makeCtx(makeState(over), profile || P.none));
const found = (text, over) => G.match.find(text, G.match.candidates(facts(over))).map(m => m.group + "." + m.id);

test("free text that says what an option says is matched to it", () => {
  const music = { kind: "activity", setting: "college", slot: "music" };
  assert.deepEqual(found("He danced with other attendees and participated in drumming and karaoke.", music).sort(),
                   ["during.music-danced", "during.music-instrument", "during.music-sang", "learn.alongside"]);
  assert.deepEqual(found("She washed her hands before handling food and followed the recipe.", { kind: "activity", slot: "cooking" }).sort(),
                   ["during.food-hands", "during.food-recipe"]);
  assert.deepEqual(found("Staff closed the door and he was calm throughout.", { kind: "personal" }).sort(), ["dignity.door", "mood.settled"]);
});

test("only options the form shows for this interaction can be suggested", () => {
  assert.deepEqual(found("He danced and washed his hands.", { kind: "activity", slot: "walk" }), []);           // no music or food options on a walk
  assert.deepEqual(found("He wore his seatbelt.", { kind: "activity", slot: "walk" }), []);                     // no vehicle on a walk
  assert.deepEqual(found("He wore his seatbelt.", { kind: "activity", slot: "walk", tasks: [{ id: "travel", level: "prompt", opt: "by cab" }] }), ["risk.seatbelt"]);
  assert.deepEqual(found("He passed urine.", { kind: "personal", slot: "am" }), []);
  assert.deepEqual(found("He passed urine.", { kind: "personal", slot: "continence" }), ["contObs.urine"]);
  assert.deepEqual(found("He was asleep when checked.", { kind: "personal", slot: "night" }), ["sleepObs.asleep"]);
});

test("a negated sentence never matches", () => {
  const music = { kind: "activity", slot: "music" };
  assert.deepEqual(found("He did not want to dance today.", music), []);
  assert.deepEqual(found("He didn't sing. He danced.", music), ["during.music-danced"], "only the negated sentence is skipped");
  assert.deepEqual(found("Staff handed over nothing; no concerns.", { kind: "personal" }), []);
});

test("covered() names the field that already says a ticked option", () => {
  const f = facts({ kind: "activity", slot: "music", during: ["music-danced", "music-sang"], extra: "He danced all afternoon." });
  assert.deepEqual(G.match.covered(f.s, f), { "during.music-danced": "extra" });
  const g = facts({ kind: "activity", slot: "music", during: [], extra: "He danced all afternoon." });
  assert.deepEqual(G.match.covered(g.s, g), {}, "an unticked option is a suggestion, not a cover");
});

test("a staff sentence becomes a template without the person in it", () => {
  const t = G.match.toTemplate;
  assert.equal(t("MA danced with the others and showed MA's card to staff.", "he", "MA"), "{S} danced with the others and showed {o}'s card to staff.");
  assert.equal(t("he washed his hands and dried them himself", "he", "MA"), "{S} washed {p} hands and dried them {r}.");
  assert.equal(t("She chose her own music and staff sat with her.", "she", "JT"), "{S} chose {p} own music and staff sat with {o}.");
  assert.equal(t("She showed her painting to her mum.", "she", "JT"), "{S} showed {p} painting to {p} mum.");
  assert.equal(t("They were proud of their work and they have kept it.", "they", "TT"), "{S} {vbe} proud of {p} work and {s} {vhave} kept it.");
  assert.equal(t("Staff walked with him.", "he", "MA"), "Staff walked with {o}.");
});

test("a template reads correctly for every pronoun", () => {
  const tpl = G.match.toTemplate("He was pleased with his work and showed it to his mum.", "he", "MA");
  for(const [pr, expect] of [["he", "He was pleased with his work and showed it to his mum."],
                             ["she", "She was pleased with her work and showed it to her mum."],
                             ["they", "They were pleased with their work and showed it to their mum."]])
    assert.equal(G.core.fill(tpl, G.core.personVars("XX", pr)), expect);
});

test("a suggestion guesses where the option belongs and never stores initials", () => {
  const f = facts({ kind: "activity", slot: "cooking" }, { initials: "MA", pronoun: "he", flags: [], comm: [] });
  const sg = G.match.suggestion("MA wiped the table down after he had finished.", f);
  assert.equal(sg.group, "during"); assert.deepEqual(sg.tags, ["food"]);
  assert.equal(sg.template, "{S} wiped the table down after {s} had finished.");
  assert.equal(sg.label, "Wiped the table down after they had finished");
  assert.doesNotMatch(JSON.stringify(sg), /\bMA\b/);
  assert.equal(G.match.suggestion("He hummed while he worked.", facts({ kind: "personal" })).group, "behaviour");
  assert.equal(G.match.suggestion("He helped set the table.", facts({ kind: "activity", slot: "cinema" })).group, "learn");
});

test("every MATCH entry points at a real option and every pattern compiles", () => {
  const D = G.data;
  const ids = new Set([].concat(Object.values(D.DURING).flat(), D.LEARN, D.DIGNITY, D.RISK, D.MOOD, D.WELL, D.BEHAVIOUR, D.FOLLOWUP, D.CONT_OBS, D.SLEEP_OBS, D.ENJOY, D.BENEFIT).map(o => o[0]));
  for(const id of Object.keys(D.MATCH)){
    assert.ok(ids.has(id), "MATCH." + id + " is not an option");
    for(const src of D.MATCH[id]) assert.doesNotThrow(() => new RegExp(src, "i"), id + ": " + src);
  }
});
