/* The note never says anything staff did not record. These checks run the
   real pipeline over hundreds of seeded, varied interactions. */
const test = require("node:test");
const assert = require("node:assert/strict");
const G = require("./helpers/load");
const { makeState, makeCtx } = require("./helpers/state");
const { randomInteraction, compose } = require("./helpers/fuzz");
const P = require("./fixtures/profiles");

const SEEDS = Array.from({ length: 400 }, (_, i) => i + 1);
const has = (arr, v) => (arr || []).includes(v);
const answered = (s, suffix) => Object.keys(s.prompts || {}).some(k => k.endsWith(suffix) && s.prompts[k]);

test("every sentence of every note traces to something staff entered", () => {
  for(const seed of SEEDS){
    const x = randomInteraction(seed);
    const { s, note } = compose(x, seed * 7);
    const problems = G.provenance.verify(note.sentences, s);
    assert.deepEqual(problems, [], "seed " + seed + ": " + JSON.stringify(problems));
  }
});

/* words that carry a fact, and the input that must exist before the note may use them */
const GUARDS = [
  [/\binformed\b/i,              s => has(s.followup, "senior") || has(s.followup, "family")],
  [/\bcontacted\b/i,             s => has(s.followup, "health")],
  [/\bbody map\b/i,              s => has(s.followup, "bodymap")],
  [/\bMAR\b/,                    s => has(s.followup, "mar") || has(s.med, "label")],
  [/\bas prescribed\b/i,         s => has(s.med, "prescribed")],
  [/\bspat\b/i,                  s => has(s.medIssues, "spat")],
  [/\bswallow/i,                  s => has(s.medIssues, "swallow") || answered(s, ".swallowed")],
  [/\bwhat the medication was\b|\bwhat it was and what it is for\b/i, s => has(s.med, "explained")],
  [/\bincident form\b/i,         s => has(s.followup, "incident")],
  [/\bhanded (this )?over\b/i,   s => !!s.handover || has(s.followup, "handover")],
  [/\bmanager\b|\bGP\b/,         s => has(s.followup, "senior")],
  [/\bchok/i,                    s => answered(s, ".choke")],
  [/\bcough/i,                   s => has(s.well, "cough") || answered(s, ".cough") || answered(s, ".swallowed")],
  [/\bseizure/i,                 s => answered(s, "seizure") || answered(s, ".arrangements")],
  [/\btexture\b/i,               s => answered(s, ".texture")],
  [/\bupright\b/i,               s => answered(s, ".upright")],
  [/\borientation\b/i,           s => answered(s, ".orientation")],
  [/\bcare plan\b/i,             s => Object.keys(s.prompts || {}).some(k => s.prompts[k])],
  [/\bMakaton\b/,                s => has(s.commUsed, "makaton")],
  [/\bpicture/i,                 s => has(s.commUsed, "pictures") || has(s.during, "comm-symbols")],
  [/\bNow and Next\b/,           s => has(s.commUsed, "nownext")],
  [/\b[12]:1\b/,                 s => /^[12]:1$/.test(s.staffing)],
  [/\bprivacy\b/i,               s => has(s.dignity, "door")],
  [/\bcovered\b/i,               s => has(s.dignity, "covered")],
  [/\bknocked\b/i,               s => has(s.dignity, "knocked")],
  [/\bcrossings?\b/i,            s => has(s.risk, "crossing")],
  [/\bseatbelt\b/i,              s => has(s.risk, "seatbelt")],
  [/\bat the stop\b/i,           s => has(s.risk, "stop")],
  [/\btraffic side\b/i,          s => has(s.risk, "road")],
  [/\bdiscomfort\b|\bpain\b/i,   s => has(s.well, "pain")],
  [/\bincontinence\b/i,          s => has(s.contObs, "episode")],
  [/\bwashed (his|her|their) hands\b/i, s => has(s.during, "food-hands")],
  [/\bsupport plan\b/i,          s => has(s.benefit, "goal")],
  [/courses (?:on offer|offered)|start of the (?:college )?year|year's options/i, s => ((s.profile || {}).timetable || []).some(r => r.c === s.slot && r.chosen)],
  [/\benjoy/i,                    s => s.outcome === "enjoyed" || !!s.enjoy || /enjoy/i.test(s.extra + s.behaviourOther)],
  [/\bconfidence\b/i,            s => has(s.benefit, "confidence")],
  [/\bdanced\b/i,                s => has(s.during, "music-danced") || /danc/i.test(s.extra + s.behaviourOther)],
  [/\brecipe\b/i,                s => has(s.during, "food-recipe")],
  [/\bbowels\b/i,                s => has(s.contObs, "bowels")],
  [/\basleep\b/i,                s => has(s.sleepObs, "asleep") || s.outcome === "slept"],
  [/\btutor\b/i,                 s => has(s.learn, "instructions")],
  [/\bdignity\b|\btemperature\b|\bthoroughly\b|\bprogress\b|\blast time\b/i, () => false],
  [/\bthe agreed time\b/i,       () => false],
  [/\bthen agreed\b/i,           s => ["delayed", "reluctant", "hesitant"].includes(s.resp)]
];

test("fact-bearing words appear only when the input behind them exists", () => {
  for(const seed of SEEDS){
    const x = randomInteraction(seed);
    const { s, note } = compose(x, seed);
    for(const [re, ok] of GUARDS)
      if(re.test(note.text)) assert.ok(ok(s), "seed " + seed + ": " + re + " in: " + note.text);
  }
});

test("no number or time appears that was not entered", () => {
  for(const seed of SEEDS){
    const x = randomInteraction(seed);
    const { note } = compose(x, seed);
    const allowed = new Set(G.provenance.numbers(JSON.stringify(x.s) + JSON.stringify(x.profile)));
    for(const n of G.provenance.numbers(note.text)) assert.ok(allowed.has(n), "seed " + seed + ": invented " + n + " in " + note.text);
  }
});

test("they/them notes are grammatical", () => {
  const bad = /\b[Tt]hey (was|is|has|does|expects|prefers|knows|needs|wants)\b|\bthemself\b/;
  for(const seed of SEEDS){
    const x = randomInteraction(seed);
    x.s.pronoun = x.profile.pronoun = "they";
    const { note } = compose(x, seed);
    assert.doesNotMatch(note.text, bad, "seed " + seed + ": " + note.text);
  }
});

test("he/she/they each get their own pronouns and nobody else's", () => {
  const s = makeState({ kind: "personal", resp: "agreed", consent: "yes", tasks: [{ id: "shave", level: "ind", opt: "" }], outcome: "settled" });
  for(const [pr, own, other] of [["he", /\b(He|he|his|himself)\b/, /\b(she|her|herself|they|their|themselves)\b/i],
                                 ["she", /\b(She|she|her|herself)\b/, /\b(he|his|himself|they|their|themselves)\b/i],
                                 ["they", /\b(They|they|their|themselves)\b/, /\b(he|his|himself|she|her|herself)\b/i]]){
    const x = { s: Object.assign({}, s, { pronoun: pr }), profile: { initials: "TT", pronoun: pr } };
    for(let salt = 0; salt < 20; salt++){
      const text = compose(x, salt).note.text;
      assert.match(text, own); assert.doesNotMatch(text, other, pr + ": " + text);
    }
  }
});

test("the profile never writes a sentence on its own", () => {
  const rich = Object.assign({}, P.choking, { flags: G.data.FLAGS.map(f => f[0]), comm: ["makaton", "pictures"], ratio: "2:1",
    texture: "IDDSI Level 5 minced and moist", fluidTarget: "1800", mobilityAid: "walking frame",
    triggers: "Crowds", preferences: "Tea with two sugars", routines: "Morning walk", risks: "Leaves the building when anxious" });
  for(const kind of ["personal", "eating", "activity"]){
    const s = makeState({ kind, slot: kind === "eating" ? "lunch" : kind === "activity" ? "walk" : "am", resp: "agreed", consent: "yes", outcome: "settled" });
    for(let salt = 0; salt < 10; salt++){
      const text = compose({ s, profile: rich }, salt).note.text;
      assert.doesNotMatch(text, /Makaton|picture|IDDSI|texture|1800|frame|2:1|Crowds|sugar|Morning walk|choking|diabetes|epilepsy|cough|seizure|anxious|building/i, kind + ": " + text);
    }
  }
});

test("a college session the person did not go to never says they attended", () => {
  const s = makeState({ kind: "activity", setting: "college", slot: "music", time: "10:00", sessionTo: "12:00", resp: "declinedgo", consent: "no" });
  for(let salt = 0; salt < 30; salt++){
    const text = compose({ s, profile: P.none }, salt).note.text;
    assert.doesNotMatch(text, /\battended\b|was at college from|session ran|class lasted/, text);
    assert.match(text, /due/);
  }
});

test("with no time recorded the opener still reads properly", () => {
  for(const kind of ["personal", "eating", "activity"])
    for(let salt = 0; salt < 20; salt++){
      const s = makeState({ kind, slot: kind === "eating" ? "dinner" : kind === "activity" ? "walk" : "night", time: "" });
      const text = compose({ s, profile: P.none }, salt).note.text;
      assert.match(text, /^[A-Z]/, text);
      assert.doesNotMatch(text, /\{time\}|agreed time| at \.| ,/, text);
    }
});

test("the chosen option is the one staff picked, never the other", () => {
  const s = makeState({ offerA: "a shower", offerB: "a bath", resp: "choseB" });
  for(let salt = 0; salt < 20; salt++){
    const sent = compose({ s, profile: P.none }, salt).note.sentences.find(x => x.key === "resp");
    assert.match(sent.text, /a bath/); assert.doesNotMatch(sent.text, /a shower/);
  }
});

test("recorded support is not silently dropped when consent was not given", () => {
  const s = makeState({ consent: "no", tasks: [{ id: "shave", level: "full", opt: "" }] });
  const { sa, note } = compose({ s, profile: P.none }, 3);
  assert.ok(note.sentences.some(x => x.key === "task_shave" || (x.members || []).includes("task_shave")));
  assert.ok(sa.items.some(i => i.id === "c:no-consent-but-support" && i.blocking), "and it is flagged for review");
});

test("an explanation is in the note only while its inconsistency stands", () => {
  const s = makeState({ level: "ind", tasks: [{ id: "wash", level: "full", opt: "a shower" }] });
  const why = { "overall-independent-vs-hands-on": "Staff washed him because his wrist was sore." };
  assert.match(compose({ s, profile: P.none, explanations: why }, 1).note.text, /wrist was sore/);
  s.level = "full";
  assert.doesNotMatch(compose({ s, profile: P.none, explanations: why }, 1).note.text, /wrist was sore/);
});

test("a shorter note says fewer things, never different ones", () => {
  for(const seed of SEEDS.slice(0, 150)){
    const x = randomInteraction(seed);
    const at = len => { x.s.len = len; const r = compose(x, seed); return G.provenance.signature(r.note.sentences, r.s); };
    const short = at("short"), std = at("std"), full = at("full");
    for(const f of short) assert.ok(std.includes(f), "seed " + seed + " short fact missing from standard: " + f);
    for(const f of std) assert.ok(full.includes(f), "seed " + seed + " standard fact missing from full: " + f);
  }
});

test("the note is one block of text unless paragraphs are asked for", () => {
  const x = { s: makeState({ offerA: "a shower", offerB: "a bath", resp: "choseA", how: ["said"], consent: "yes", len: "full",
                             tasks: [{ id: "wash", level: "ind", opt: "a shower" }, { id: "oral", level: "part", opt: "{p} teeth" }],
                             mood: ["settled"], outcome: "ready" }), profile: P.none };
  for(let salt = 0; salt < 30; salt++) assert.doesNotMatch(compose(x, salt).note.text, /\n/);
  const split = [...Array(30).keys()].some(salt =>
    /\n\n/.test(G.narrative.compose({ s: x.s, profile: x.profile }, { salt, layout: "paragraphs" }).note.text));
  assert.ok(split, "paragraphs appear when the provider chooses them");
});

test("a shorter length reports what it leaves out", () => {
  const tasks = ["wash", "hair", "shave", "oral", "nails", "creams", "dress"].map(id => ({ id, level: "ind", opt: id === "wash" ? "a shower" : id === "oral" ? "{p} teeth" : "" }));
  const s = makeState({ tasks, len: "std" });
  const std = compose({ s, profile: P.none }, 1).note;
  assert.deepEqual(std.omitted, ["task_creams", "task_dress"]);
  s.len = "full";
  assert.deepEqual(compose({ s, profile: P.none }, 1).note.omitted, []);
});

test("the service's word for staff is used in our wording, never in staff's own", () => {
  const s = makeState({ kind: "activity", slot: "walk", commUsed: ["verbal"], extra: "Staff and TT chatted.", len: "full",
                        prompts: { "vision-community.orientation": "yes" } });
  const opts = { salt: 3, terms: { staff: "support workers" } };
  const text = G.narrative.compose({ s, profile: P.vision }, opts).note.text;
  assert.match(text, /Support workers (used|spoke|kept)/);
  assert.match(text, /Support workers gave (her|him|them) verbal orientation/);
  assert.match(text, /Staff and TT chatted\./, "typed words stay exactly as typed");
});

test("wording varies between notes", () => {
  const x = { s: makeState({ offerA: "a shower", offerB: "a bath", resp: "choseA", how: ["said"], consent: "yes",
                             tasks: [{ id: "wash", level: "ind", opt: "a shower" }, { id: "oral", level: "ind", opt: "{p} teeth" }], outcome: "ready" }),
              profile: P.none };
  const texts = new Set();
  for(let salt = 0; salt < 40; salt++) texts.add(compose(x, salt).note.text);
  assert.ok(texts.size > 10, "only " + texts.size + " different notes from 40 seeds");
});

/* keys of the sentences in a note, with a grouped sentence counting for each of its members */
const order = note => note.sentences.flatMap(x => x.members || [x.key]);
const before = (keys, a, b) => { assert.ok(keys.includes(a) && keys.includes(b), a + " and " + b + " in " + keys); assert.ok(keys.indexOf(a) < keys.indexOf(b), a + " should come before " + b + " in " + keys.join(", ")); };

test("an activity note reads in time order, whatever the level of support", () => {
  const s = makeState({ kind: "activity", setting: "college", slot: "music", time: "10:00", sessionTo: "12:00", resp: "keen", consent: "implied", len: "full",
    tasks: [{ id: "plan", level: "prompt", opt: "" }, { id: "travel", level: "part", opt: "by cab" }, { id: "engage", level: "prompt", opt: "" },
            { id: "money", level: "full", opt: "" }, { id: "finish", level: "full", opt: "" }],
    risk: ["seatbelt"], learn: ["instructions", "pride"], mood: ["cheerful"], outcome: "enjoyed",
    extra: "He danced with other attendees and joined in the drumming and karaoke." });
  for(let salt = 0; salt < 12; salt++){
    const keys = order(compose({ s, profile: P.none }, salt).note);
    before(keys, "task_plan", "task_travel");
    before(keys, "risk_seatbelt", "task_engage");        // the journey and its safety, then the class
    before(keys, "task_engage", "extra");                // what they did, then the staff member's own account of it
    before(keys, "extra", "learn_instructions");         // then the ticked skills and how they seemed
    before(keys, "learn_pride", "task_finish");          // finishing comes after everything that happened during
    before(keys, "mood_cheerful", "task_finish");
    before(keys, "task_finish", "out");                  // and just before the outcome
  }
});

test("the staff member's own words follow what the person did, before the ticked observations", () => {
  const s = makeState({ kind: "personal", tasks: [{ id: "wash", level: "ind", opt: "a shower" }], skin: "clear", mood: ["settled"],
                        extra: "He asked for the radio on while he washed.", outcome: "ready", len: "full" });
  const keys = order(compose({ s, profile: P.none }, 2).note);
  before(keys, "task_wash", "extra");
  before(keys, "extra", "skin");
  before(keys, "extra", "mood_settled");
});

test("what they did during an activity is offered for that kind of activity, and each tick is one sentence", () => {
  const cooking = makeState({ kind: "activity", slot: "cooking", during: ["food-hands", "food-recipe"], len: "full" });
  const text = compose({ s: cooking, profile: P.none }, 1).note.text;
  assert.match(text, /washed (his|her|their) hands/i);
  assert.match(text, /recipe/);
  assert.ok(G.data.DURING.food.some(d => d[0] === "food-hands"));
  assert.ok(!G.data.DURING.music.some(d => d[0] === "food-hands"));
  const walk = makeState({ kind: "activity", slot: "walk", len: "full" });
  assert.doesNotMatch(compose({ s: walk, profile: P.none }, 1).note.text, /hands|recipe/);
});

test("a tick the staff member's own words already say is not said twice, and stays traceable", () => {
  const s = makeState({ kind: "activity", setting: "college", slot: "music", during: ["music-danced", "music-sang"], mood: ["cheerful"],
                        extra: "He danced with everyone and was in good spirits all afternoon.", len: "full" });
  const r = compose({ s, profile: P.none }, 4);
  const keys = order(r.note);
  assert.ok(!keys.includes("during_music-danced"), "danced is already in the staff member's sentence");
  assert.ok(!keys.includes("mood_cheerful"), "so is good spirits");
  assert.ok(keys.includes("during_music-sang"), "singing is not, so it gets its sentence");
  const own = r.note.sentences.find(x => x.key === "extra");
  assert.deepEqual(own.sources.sort(), ["during.music-danced", "extra", "mood.cheerful"]);
  assert.deepEqual(G.provenance.verify(r.note.sentences, r.s), []);
  assert.equal((r.note.text.match(/danc/gi) || []).length, 1);
});

test("a negated sentence does not swallow a tick", () => {
  const s = makeState({ kind: "activity", slot: "music", during: ["music-danced"], extra: "He did not want to dance at first.", len: "full" });
  const keys = order(compose({ s, profile: P.none }, 1).note);
  assert.ok(keys.includes("during_music-danced"));
});
