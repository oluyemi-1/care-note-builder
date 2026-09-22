/* Seeded random interactions - hundreds of different, often messy, entries -
   so the note-writing checks cover far more than hand-written cases. Same
   seed, same states: a failure can always be reproduced. */
const G = require("./load");
const { makeState } = require("./state");

function rng(seed){
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1);
                 t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function randomInteraction(seed){
  const r = rng(seed), D = G.data;
  const one = xs => xs[Math.floor(r() * xs.length)];
  const some = (xs, p) => xs.filter(() => r() < (p || 0.25));
  const maybe = (v, p) => r() < (p || 0.5) ? v : "";
  const ids = list => list.map(x => x[0]);

  const kind = one(["personal", "eating", "activity"]);
  const setting = kind === "activity" && r() < 0.3 ? "college" : "community";
  const slot = kind === "activity" ? (setting === "college" ? one(ids(D.COURSES)) : one(ids(D.ACTS)))
             : one(ids(D.SLOTS[kind]));
  const resps = ids(setting === "college" ? D.RESP_COLLEGE : D.RESP).concat(setting === "college" ? ["agreed", "declined"] : []);
  const levels = ["ind", "prompt", "min", "part", "full", "declined", ""];
  const tasks = some(D.TASKS[kind], 0.35).map(t => ({ id: t.id, level: one(levels), opt: t.opts ? one(t.opts) : "" }));
  const profile = {
    initials: one(["TA", "TB", "XY", "QZ"]), pronoun: one(["he", "she", "they"]),
    flags: some(ids(D.FLAGS), 0.3), comm: some(ids(D.COMM), 0.3), ratio: one(["", "1:1", "2:1"]),
    texture: maybe("IDDSI Level 6 soft and bite-sized", 0.3), fluidTarget: maybe("1500", 0.3),
    mobilityAid: maybe("long cane", 0.3), usualLevel: maybe(one(["ind", "prompt"]), 0.3)
  };
  const s = makeState({
    initials: profile.initials, pronoun: profile.pronoun, flags: profile.flags, comm: profile.comm,
    kind, slot, setting, len: one(["short", "std", "full"]),
    time: maybe(one(["07:30", "12:15", "19:45"]), 0.85), staffing: one(["", "1:1", "2:1", "shared"]),
    sessionTo: setting === "college" ? maybe("15:30", 0.6) : "",
    actOther: slot === "other" ? maybe("a trip to the library", 0.7) : "",
    offerA: maybe(one(["a shower", "pasta", "a walk"]), 0.6), offerB: maybe(one(["a bath", "soup", "the park"]), 0.4),
    resp: maybe(one(resps), 0.85), chosen: maybe(one(["a shower", "soup", "the park"]), 0.3),
    how: some(ids(D.HOW), 0.2), consent: maybe(one(ids(D.CONSENT)), 0.8),
    declined: maybe("gave her ten minutes and asked again", 0.3), level: maybe(one(["ind", "prompt", "min", "part", "full"]), 0.5),
    tasks, commUsed: some(ids(D.COMM), 0.25),
    ate: kind === "eating" ? maybe(one(["All", "Most", "About half", "A small amount", "None"]), 0.6) : "",
    whatAte: kind === "eating" ? maybe("cheese on toast", 0.4) : "",
    drinkChoice: kind === "eating" ? maybe("orange squash", 0.4) : "",
    offered: kind === "eating" ? maybe(one(["150", "250", "300"]), 0.5) : "",
    drunk: kind === "eating" ? maybe(one(["0", "100", "250"]), 0.5) : "",
    skin: kind === "personal" ? maybe(one(["clear", "concern", "none"]), 0.6) : "",
    skinDetail: maybe("a small red area on the left heel", 0.5),
    mood: some(ids(D.MOOD), 0.15), well: some(ids(D.WELL), 0.15),
    risk: kind === "activity" ? some(ids(D.RISK), 0.25) : [],
    learn: kind === "activity" ? some(ids(D.LEARN), 0.2) : [],
    during: kind === "activity" ? some(((D.ACT_INFO[slot] || {}).tags || []).flatMap(t => ids(D.DURING[t] || [])), 0.3) : [],
    dignity: kind === "personal" ? some(ids(D.DIGNITY), 0.3) : [],
    contObs: kind === "personal" ? some(ids(D.CONT_OBS), 0.2) : [],
    sleepObs: kind === "personal" ? some(ids(D.SLEEP_OBS), 0.2) : [],
    behaviour: some(ids(D.BEHAVIOUR), 0.12), behaviourOther: maybe("walked to the door and waited there", 0.5),
    outcome: maybe(one(ids(D.OUTCOME)), 0.8), extra: maybe("Walked to the shop and back.", 0.3),
    handover: maybe("Ask about the park next week.", 0.25), followup: some(ids(D.FOLLOWUP), 0.12),
    attest: r() < 0.5
  });
  /* answer some of the questions the profile raises, as staff would */
  const ctx = { s, profile };
  G.rules.evaluate(ctx).forEach(rule => rule.prompts.forEach(p => { if(r() < 0.5) s.prompts[p.key] = one(["yes", "no"]); }));
  return { s, profile, seed };
}

function compose(x, salt, avoid){
  return G.narrative.compose({ s: x.s, profile: x.profile, explanations: x.explanations || {} }, { salt, avoid });
}

module.exports = { rng, randomInteraction, compose };
