/* Behaviour (ABC chart) and incidents: what was happening before, what the
   person did, what staff did, how they responded, whether anyone was hurt -
   in that order, from ticks and staff's own words. The app records what
   happened and never why; there is no offer, choice or consent step. */
const test = require("node:test");
const assert = require("node:assert/strict");
const G = require("./helpers/load");
const { makeState, makeCtx } = require("./helpers/state");
const P = require("./fixtures/profiles");

const HE = { initials: "KD", pronoun: "he", flags: [], comm: [] };
const compose = (s, profile, salt) => G.narrative.compose({ s, profile: profile || P.none }, { salt: salt || 1 });
const keys = note => note.sentences.flatMap(x => x.members || [x.key]);
const abc = { initials: "KD", pronoun: "he", kind: "abc", slot: "verbal", time: "16:10", staffing: "1:1", where: "living", commUsed: ["verbal"],
              before: ["noise", "toldno"], beforeText: "The TV had just been turned off for tea.",
              behaviour: ["shouted", "threw"], behText: "He said he wanted the TV back on and pointed at it.", duration: "10",
              staffDid: ["reassured", "space", "quiet"], after: "gradual", impact: "none", outcome: "calmagain", followup: ["handover"], len: "full" };

test("an ABC note reads before, behaviour, staff response, how it ended, anyone hurt - in that order", () => {
  for(let salt = 0; salt < 10; salt++){
    const r = compose(makeState(abc), null, salt);
    const t = r.note.text;
    assert.match(t, /16:10/); assert.match(t, /living room/); assert.match(t, /1:1/);
    assert.match(t, /noisy and busy/); assert.match(t, /told no/);
    assert.match(t, /The TV had just been turned off for tea\./);
    assert.match(t, /shouted|swore/); assert.match(t, /threw/); assert.match(t, /about 10 minutes/);
    assert.match(t, /reassured/); assert.match(t, /space and time|stepped back/); assert.match(t, /quieter space/);
    assert.match(t, /gradually/); assert.match(t, /No one was hurt|Nobody was hurt/);
    assert.match(t, /settled and returned to his usual routine|settled again and went back to his usual routine/);
    const k = keys(r.note);
    const idx = key => k.findIndex(x => x.startsWith(key));
    assert.ok(idx("open") < idx("before_") && idx("before_") < idx("beh_") && idx("beh_") < idx("behText") && idx("behText") < idx("comm_")
              && idx("comm_") < idx("staff_") && idx("staff_") < idx("after") && idx("after") < idx("impact") && idx("impact") < idx("out"), k.join(", "));
    assert.equal(r.note.sentences.filter(x => (x.members || [x.key]).some(m => m.startsWith("comm_"))).length, 1, "communication said once");
    assert.doesNotMatch(t, /offered|chose|consent|agreed/i);
    assert.deepEqual(G.provenance.verify(r.note.sentences, r.s), []);
  }
});

test("staff's own words cover a tick they already describe, and nothing appears untucked", () => {
  const s = makeState(Object.assign({}, abc, { behText: "He shouted that he wanted the TV back on and threw the remote." }));
  const r = compose(s);
  const ks = keys(r.note);
  assert.ok(!ks.includes("beh_shouted") && !ks.includes("beh_threw"), "the ticks are covered by his own words: " + ks.join(", "));
  const bare = compose(makeState({ kind: "abc", slot: "distress", time: "09:00" })).note.text;
  assert.doesNotMatch(bare, /hurt|injur|reassur|police|incident form|PRN|hospital|cried/i);
});

test("nothing is inferred: no function, cause or diagnosis; triggers from the profile become a prompt, never a sentence", () => {
  const profile = Object.assign({}, HE, { triggers: "loud noise, being rushed" });
  const s = makeState(Object.assign({}, abc, { before: [], beforeText: "" }));
  const t = compose(s, profile).note.text;
  assert.doesNotMatch(t, /loud noise|being rushed|trigger|because|function|attention|sensory/i);
  const sa = G.smartAssist.collect(makeCtx(s, profile));
  const item = sa.items.find(i => i.id === "r:triggers-event");
  assert.ok(item && /loud noise, being rushed/.test(item.title), JSON.stringify(sa.items.map(i => i.id)));
});

test("a fall with an injury: what happened, what staff did, the injury, and a prompt to follow it up", () => {
  const s = makeState({ initials: "KD", pronoun: "he", kind: "incident", slot: "fall", time: "07:45", where: "bathroom", commUsed: ["verbal"],
    before: ["nothing"], happened: ["fall-found"], behText: "He was sitting on the floor by the bath and said he had slipped.",
    staffDid: ["reassured", "stayed"], actions: ["checked", "firstaid", "nhsline"], after: "quick", impact: "hurt", impactWho: ["self"],
    injury: "injury", injuryType: ["graze", "bruise"], injuryWhere: "left elbow", injuryObs: ["painobs", "conscious"], outcome: "monitored", len: "full" });
  const r = compose(s);
  const t = r.note.text;
  assert.match(t, /a fall/i); assert.match(t, /bathroom/); assert.match(t, /found (?:him )?on the floor/);
  assert.match(t, /said he had slipped/); assert.match(t, /First aid was given|gave first aid/); assert.match(t, /non-emergency line/);
  assert.match(t, /injury was seen: graze and bruise to left elbow|saw an injury: graze and bruise to left elbow/);
  assert.match(t, /conscious and alert/); assert.match(t, /Someone was hurt/); assert.match(t, /He was hurt|He was the one hurt/);
  assert.match(t, /monitor/);
  assert.doesNotMatch(t, /ambulance|hospital|police|body map|incident form|GP/);
  assert.deepEqual(G.provenance.verify(r.note.sentences, r.s), []);
  const sa = G.smartAssist.collect(makeCtx(s, HE));
  assert.ok(sa.items.some(i => i.id === "r:event-hurt"), "incident form, body map and senior are suggested, not written");
  assert.ok(sa.handovers.some(h => /Incident at 07:45/.test(h)), sa.handovers.join(" | "));
  assert.ok(!sa.items.some(i => i.id === "inj:head"));
  s.injuryObs.push("head");
  const sa2 = G.smartAssist.collect(makeCtx(s, HE));
  const head = sa2.items.find(i => i.id === "inj:head");
  assert.ok(head && head.severity === "review" && /does not decide/.test(head.reason), "a head injury asks staff to consider advice per procedure");
});

test("the audit reads an event note by its own checks and blocks copy until they are met", () => {
  const empty = makeState({ kind: "abc", slot: "verbal", time: "10:00" });
  const a0 = G.quality.orgAudit(makeCtx(empty, HE));
  assert.equal(a0.length, 7);
  assert.ok(!a0.find(x => x.id === "response").ok && !a0.find(x => x.id === "support").ok && !a0.find(x => x.id === "observation").ok);
  const full = makeState(Object.assign({}, abc, { attest: true }));
  const a1 = G.quality.orgAudit(makeCtx(full, HE));
  assert.ok(a1.every(x => x.ok), JSON.stringify(a1.filter(x => !x.ok).map(x => x.id)));
  const hurt = makeState(Object.assign({}, abc, { attest: true, impact: "hurt", impactWho: ["staff"], followup: [] }));
  assert.ok(!G.quality.orgAudit(makeCtx(hurt, HE)).find(x => x.id === "refusal").ok, "someone hurt needs a follow-up or handover");
});

test("contradictions: no injury with injury details, no one hurt with an injury, an impossible duration", () => {
  const s = makeState({ kind: "incident", slot: "injury", time: "12:00", injury: "noinjury", injuryType: ["cut"], impact: "none", duration: "900" });
  const ids = G.contradictions.detect(makeCtx(s, HE)).map(c => c.id);
  assert.ok(ids.includes("no-injury-but-injury-details"), ids.join());
  assert.ok(ids.includes("duration-implausible"), ids.join());
  const s2 = makeState({ kind: "incident", slot: "injury", time: "12:00", injury: "injury", impact: "none" });
  assert.ok(G.contradictions.detect(makeCtx(s2, HE)).some(c => c.id === "no-one-hurt-but-hurt"));
  const ok = makeState({ kind: "incident", slot: "injury", time: "12:00", injury: "injury", injuryType: ["cut"], impact: "hurt", impactWho: ["self"], duration: "5" });
  assert.deepEqual(G.contradictions.detect(makeCtx(ok, HE)).map(c => c.id), []);
});

test("history keeps the structured event fields and a backup record round-trips them", () => {
  const s = makeState(Object.assign({}, abc, { impact: "damage" }));
  const rec = G.patterns.toRecord(s, { recordId: "r1", personId: "p1", now: new Date("2026-09-27T16:30:00") });
  assert.equal(rec.kind, "abc"); assert.equal(rec.where, "living"); assert.deepEqual(rec.before, ["noise", "toldno"]);
  assert.deepEqual(rec.staffDid, ["reassured", "space", "quiet"]); assert.equal(rec.after, "gradual"); assert.equal(rec.impact, "damage"); assert.equal(rec.duration, 10);
  assert.ok(!("behText" in rec) && !("beforeText" in rec) && !("others" in rec), "no free text in history");
  const back = G.validation.validateRecord(rec);
  assert.ok(back); assert.equal(back.kind, "abc"); assert.deepEqual(back.staffDid, rec.staffDid); assert.equal(back.duration, 10);
});
