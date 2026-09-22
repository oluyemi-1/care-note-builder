/* The phrase banks themselves. Every variant of a sentence must state the
   same facts, so choosing a different variant can only change wording. */
const test = require("node:test");
const assert = require("node:assert/strict");
const G = require("./helpers/load");
const D = G.data;

/* tokens that carry a fact (person tokens are the subject, not a fact) */
const FACT = { chosen: "chosen", declined: "declined", skinDetail: "skinDetail", opt: "opt", act: "activity", act2: "activity",
  did: "activity", offer: "offer", Offer: "offer", offerA: "offerA", offerB: "offerB", time: "time", ratio: "staffing",
  sessionTo: "sessionTo", duration: "time sessionTo", meal: "meal", meal2: "meal", ate: "ate", whatAte: "whatAte",
  offered: "offered", drunk: "drunk", drink: "drink", ofDrink: "drink", list: "list", nouns: "list" };
const facts = t => [...new Set((t.match(/\{(\w+)\}/g) || []).flatMap(m => (FACT[m.slice(1, -1)] || "").split(" ").filter(Boolean)))].sort().join(",");

function banks(){
  const out = [];
  const addAll = (name, obj) => Object.keys(obj).forEach(k => Array.isArray(obj[k]) && out.push([name + "." + k, obj[k]]));
  ["OPEN_PC", "OPEN", "OPEN_ACT", "COMMBANK", "RESPBANK", "HOWBANK", "CONSENTBANK", "SKINBANK", "MOODBANK", "WELLBANK",
   "RISKBANK", "OUTBANK", "LEARNBANK", "DIGNITYBANK", "CONTBANK", "SLEEPBANK", "BEHAVIOURBANK", "FOLLOWBANK", "DURINGBANK",
   "GROUPBANK", "LEVELBANK", "OFFERBANK", "INTAKEBANK"].forEach(n => addAll(n, D[n]));
  out.push(["OPEN_COLLEGE", D.OPEN_COLLEGE], ["OPEN_COLLEGE_DECLINED", D.OPEN_COLLEGE_DECLINED], ["SESSIONBANK", D.SESSIONBANK]);
  for(const kind in D.TASKS) D.TASKS[kind].forEach(t => D.LEVELS.forEach(([l]) => l && out.push(["TASKS." + kind + "." + t.id + "." + l, t[l]])));
  return out;
}

test("every variant of a sentence states the same facts", () => {
  for(const [name, list] of banks()){
    const first = facts(list[0]);
    list.forEach(t => assert.equal(facts(t), first, name + ": \"" + t + "\" states different facts from \"" + list[0] + "\""));
  }
});

test("a task with options names the option in every sentence", () => {
  for(const kind in D.TASKS) D.TASKS[kind].filter(t => t.opts).forEach(t =>
    D.LEVELS.forEach(([l]) => l && t[l].forEach(x => assert.match(x, /\{opt\}/, kind + "." + t.id + "." + l + ": " + x))));
});

test("every opener carries the time, liftable when none was recorded, and the staffing", () => {
  const openers = [].concat(D.OPEN_COLLEGE, D.OPEN_COLLEGE_DECLINED, ...Object.values(D.OPEN_ACT), ...Object.values(D.OPEN_PC), ...Object.values(D.OPEN));
  for(const t of openers){
    assert.equal((t.match(/\{time\}/g) || []).length, 1, t);
    assert.ok(t.startsWith("At {time}, ") || t.includes(" at {time}"), t);
    assert.match(t, /\{ratio\}/, t);
    assert.doesNotMatch(G.narrative.stripTime(t), /\{time\}|^[a-z]/, t);
  }
});

test("no sentence puts a he/she-only verb after a pronoun", () => {
  for(const [name, list] of banks()) list.forEach(t =>
    assert.doesNotMatch(t, /\{[sS]\} (was|is|has|does|expects|prefers|knows|needs|wants|likes|seems)\b/, name + ": " + t));
});

test("the banks carry none of the unrecorded detail that used to creep in", () => {
  const banned = /temperature|outside the door|steady progress|than last time|took it home|waited for the signal|every crossing|quieter than usual|thoroughly|demonstration|weather-appropriate|two clean|agreed time|on arrival|signed for|body map|MAR chart|handed over|reported|in line with|risk assessment|support plan|without distress.*and|gently/i;
  for(const [name, list] of banks()){
    if(name.startsWith("FOLLOWBANK") || name.startsWith("OUTBANK.resettled")) continue;   // follow-up is exactly where these belong
    list.forEach(t => assert.doesNotMatch(t, banned, name + ": " + t));
  }
});

test("every task has wording for every level, including minimal help", () => {
  for(const kind in D.TASKS) for(const t of D.TASKS[kind])
    for(const [l] of D.LEVELS) if(l) assert.ok(t[l] && t[l].length, kind + "." + t.id + "." + l);
});
