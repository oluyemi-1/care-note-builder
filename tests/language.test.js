const test = require("node:test");
const assert = require("node:assert/strict");
const G = require("./helpers/load");

const scan = (text, extra) => G.language.scan([{ id: "extra", label: "Anything else", text }], extra);
const terms = (text, extra) => scan(text, extra).map(x => x.kind + ":" + x.term.toLowerCase());

test("vague words are flagged as vague", () => {
  assert.deepEqual(terms("He was fine and seemed okay."), ["vague:fine", "vague:okay"]);
});

test("judgemental words and institutional phrases are flagged", () => {
  assert.deepEqual(terms("She was aggressive and non-compliant."), ["phrase:non-compliant", "judgement:aggressive"]);
  assert.deepEqual(terms("Staff allowed him to go out."), ["phrase:allowed him to"]);
  assert.deepEqual(terms("They refused to cooperate"), ["phrase:refused to cooperate"]);
  assert.deepEqual(terms("Made her sit down"), ["phrase:made her"]);
});

test("a phrase is reported once, not again as a word inside it", () => {
  assert.deepEqual(terms("attention seeking all morning"), ["phrase:attention seeking"]);
});

test("words inside other words are not flagged", () => {
  assert.deepEqual(terms("We defined the plan together and he had goodness knows how many."), []);
  assert.deepEqual(terms("Chose the fine-grain bread"), ["vague:fine"], "a hyphenated word is still the word");
});

test("scanning never changes the text", () => {
  const f = [{ id: "extra", label: "Anything else", text: "He was difficult" }];
  G.language.scan(f);
  assert.equal(f[0].text, "He was difficult");
});

test("provider-added terms are checked too", () => {
  assert.deepEqual(terms("He was a little grumpy", { vague: ["grumpy"] }), ["vague:grumpy"]);
  assert.deepEqual(terms("Service user was seen", { phrases: [{ phrase: "service user", guidance: "Use the person's initials." }] }), ["phrase:service user"]);
});

test("the note's own phrase banks pass the checks they apply to staff", () => {
  const D = G.data, found = [];
  const banks = [D.RESPBANK, D.HOWBANK, D.CONSENTBANK, D.SKINBANK, D.MOODBANK, D.WELLBANK, D.RISKBANK, D.OUTBANK, D.COMMBANK, D.LEARNBANK];
  const texts = [];
  banks.forEach(b => Object.values(b).forEach(arr => arr.forEach(t => texts.push(t))));
  for(const kind in D.TASKS) D.TASKS[kind].forEach(t => D.LEVELS.forEach(([l]) => (t[l] || []).forEach(x => texts.push(x))));
  texts.forEach(t => scan(t).filter(x => x.kind !== "vague").forEach(x => found.push(x.term + " <- " + t)));
  assert.deepEqual(found, []);
});
