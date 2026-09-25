/* The rules engine. A rule says WHEN it applies (a plain condition object),
   WHY (a sentence shown under "Why am I seeing this?"), and WHAT it does:
   questions to ask, choices worth a look, fields that now matter.

   PROMPT, DON'T PRESUME. A rule may ask "Was support given at crossings?".
   It never writes that support was given - only a staff member's answer
   can put a fact in the note.

   To add intelligence, add a rule. Nothing here touches the page. */
(function (G) {
"use strict";

const { fill, personVars, present, plain } = G.core;
const { TASKS, ACTS, ACT_INFO, COURSES, MEALWORD, OVERALL_LEVELS, DAYS } = G.data;

/* ---------- facts every rule and check leans on, worked out once ---------- */
const RANK = { ind:0, prompt:1, min:2, part:3, full:4 };
const HANDS_ON = ["min", "part", "full"];
const DECLINED_RESP = ["declined", "declinedgo"];

function taskLabel(kind, id){
  const t = (TASKS[kind] || []).find(x => x.id === id);
  return t ? plain(t.label) : id;
}

/* the activity as it reads in a sentence - "a walk", "his music class" */
function activityPhrase(s, acts){
  if(s.kind !== "activity") return "the activity";
  if(s.setting === "college"){ const c = COURSES.find(x => x[0] === s.slot); return c ? c[2] : "{p} class"; }
  if(s.slot === "other") return s.actOther || "the activity";
  const a = (acts || ACTS).find(x => x[0] === s.slot);
  return a ? a[2] : "the activity";
}

function activityName(s, acts){
  if(s.kind !== "activity") return "";
  if(s.setting === "college"){ const c = COURSES.find(x => x[0] === s.slot); return c ? plain(c[1]) + " (college)" : "college"; }
  if(s.slot === "other") return s.actOther || "the activity";
  const a = (acts || ACTS).find(x => x[0] === s.slot);
  return a ? plain(a[1]) : "the activity";
}

const num = v => v === "" || v == null ? null : Number(v);

function facts(ctx){
  const s = ctx.s || {};
  const profile = ctx.profile || {};
  const flags = profile.flags || s.flags || [];
  const tasks = s.tasks || [];
  const task = {};
  tasks.forEach(t => { task[t.id] = t; });
  const info = (ctx.actInfo || ACT_INFO)[s.slot] || {};
  const college = s.kind === "activity" && s.setting === "college";
  const travel = !!(task.travel && task.travel.level && task.travel.level !== "declined");
  const where = s.kind !== "activity" ? "" : college ? "out" : (info.where || "either");
  const ranks = tasks.map(t => RANK[t.level]).filter(r => r !== undefined);
  const off = num(s.offered), dr = num(s.drunk);
  const meal = s.kind === "eating" ? fill((MEALWORD[s.slot] || ["the meal"])[0], personVars(s.initials, s.pronoun)) : "";
  const usual = (OVERALL_LEVELS.find(l => l[0] === profile.usualLevel) || ["", ""])[1];
  return {
    s, profile, flags, tasks, task, college, travel, where,
    kind: s.kind, slot: s.slot,
    out: s.kind === "activity" && (where === "out" || travel),
    tags: s.kind === "activity" ? (info.tags || []) : [],
    declinedAll: DECLINED_RESP.includes(s.resp) || s.consent === "no",
    activity: activityName(s, ctx.acts),
    maxRank: ranks.length ? Math.max.apply(null, ranks) : (RANK[s.level] !== undefined ? RANK[s.level] : -1),
    lowDrink: off !== null && off > 0 && dr !== null && dr < off / 2,
    /* tokens rule text may use, on top of the person's own */
    vars: Object.assign(personVars(s.initials || profile.initials, s.pronoun || profile.pronoun), {
      activity: plain(fill(activityPhrase(s, ctx.acts), personVars(s.initials || profile.initials, s.pronoun || profile.pronoun))),
      meal: meal || "the meal",
      textureNote: profile.texture ? " (" + profile.texture + ")" : "",
      aid: profile.mobilityAid || "mobility aid",
      targetNote: profile.fluidTarget ? " of " + profile.fluidTarget + " ml" : "",
      triggersNote: profile.triggers ? ". Recorded triggers: " + profile.triggers.replace(/[.\s]+$/, "") : "",
      usualLevel: usual.toLowerCase() || "not recorded",
      goals: (profile.goals || "").replace(/[.\s]+$/, ""),
      ateLower: String(s.ate || "").toLowerCase(),
      drunk: s.drunk || "", offered: s.offered || "",
      skinDetail: s.skinDetail || "a new mark"
    })
  };
}

/* ---------- the condition vocabulary ----------
   Every key in a condition must hold (AND). A list value means "any of".
   Unknown keys never match, so a mistyped rule stays quiet instead of
   firing everywhere. */
const is = (want, have) => Array.isArray(want) ? want.includes(have) : want === have;
const list = v => [].concat(v);

const CONDITIONS = {
  profileFlag: (v, f) => list(v).some(x => f.flags.includes(x)),          // standing flag in the profile
  profileHas:  (v, f) => list(v).every(k => present(k.startsWith("custom.") ? (f.profile.custom || {})[k.slice(7)] : f.profile[k])),  // profile field filled in
  kind:        (v, f) => is(v, f.kind),                                    // personal / eating / activity
  slot:        (v, f) => is(v, f.slot),
  notSlot:     (v, f) => !is(v, f.slot),
  setting:     (v, f) => is(v, f.college ? "college" : "community"),
  out:         (v, f) => f.out === !!v,                                    // happening in the community
  where:       (v, f) => is(v, f.where),
  activityTag: (v, f) => list(v).some(t => f.tags.includes(t)),
  task:        (v, f) => list(v).some(id => f.task[id] && f.task[id].level !== "declined"),  // ticked, not declined
  taskOpt:     (v, f) => Object.keys(v).every(id => f.task[id] && f.task[id].level !== "declined" && is(v[id], f.task[id].opt)),
  field:       (v, f) => Object.keys(v).every(k => is(v[k], f.s[k])),     // e.g. {resp:"declined"}
  includes:    (v, f) => Object.keys(v).every(k => list(v[k]).some(x => (f.s[k] || []).includes(x))),
  filled:      (v, f) => list(v).every(k => present(f.s[k])),
  answer:      (v, f) => Object.keys(v).every(k => is(v[k], (f.s.prompts || {})[k] || "")),
  lowDrink:    (v, f) => f.lowDrink === !!v,                               // under half of what was offered
  moreSupportThanUsual: (v, f) => (f.profile.usualLevel in RANK && f.maxRank > RANK[f.profile.usualLevel]) === !!v,
  any:         (v, f) => v.some(c => matches(c, f)),
  all:         (v, f) => v.every(c => matches(c, f)),
  not:         (v, f) => !matches(v, f)
};

function matches(cond, f){
  return Object.keys(cond || {}).every(k => CONDITIONS[k] ? CONDITIONS[k](cond[k], f) : false);
}

/* ---------- the rules ----------
   title        heading for the rule's questions on the form
   appliesWhen  condition object (above)
   reason       why it applies - always shown on request
   suggest      a gentle question for Smart Assist, until it is answered
   watch        fields whose answer counts as answering the suggestion
   highlight    existing choices worth a look ("group.value")
   important    fields that must be filled while the rule applies
   prompts      yes/no questions. Only a staff member's answer produces a
                sentence: `yes`/`no` is exactly what that answer adds to the
                note, and null adds nothing. onYes/onNo raise a finding
                (and can offer a handover line) when that answer is given.
   handover     a line staff can choose to add to the handover */
const ESCALATE = "Consider whether this needs handover or escalation in line with {N}'s care plan and your organisation's procedure.";

const CARE_RULES = [
  /* ---- sensory and mobility ---- */
  {
    id: "vision-community", title: "Visual impairment · out in the community",
    appliesWhen: { profileFlag: "vision", kind: "activity", out: true },
    reason: "Visual impairment is recorded in {N}'s profile and this activity was out in the community.",
    suggest: "Visual impairment is recorded in {N}'s profile. Was orientation or mobility support needed?",
    highlight: ["risk.crossing", "risk.space"],
    prompts: [
      { id: "orientation", text: "Was verbal orientation to the surroundings given?",
        yes: "Staff gave {o} verbal orientation to {p} surroundings.", no: null },
      { id: "environment", text: "Was the environment described to {N} as you went?",
        yes: "Staff described the environment to {o} as they went.", no: null },
      { id: "alongside", text: "Did staff stay alongside {N} throughout?",
        yes: "Staff stayed alongside {o} throughout.", no: null }
    ]
  },
  {
    id: "vision-personal", title: "Visual impairment · personal care",
    appliesWhen: { profileFlag: "vision", kind: "personal" },
    reason: "Visual impairment is recorded in {N}'s profile and this is personal care.",
    highlight: ["dignity.explained"],
    prompts: [
      { id: "belongings", text: "Were {N}'s belongings left where {s} can find them?",
        yes: "Staff left {p} belongings where {s} can find them.", no: null }
    ]
  },
  {
    id: "hearing-community", title: "Hearing impairment · near traffic",
    appliesWhen: { profileFlag: "deaf", kind: "activity", out: true },
    reason: "A hearing impairment is recorded in {N}'s profile and this activity was out near roads or traffic.",
    suggest: "A hearing impairment is recorded. How was {N} kept safe near traffic?",
    highlight: ["risk.road", "risk.crossing"],
    prompts: [
      { id: "attention", text: "Did staff gain {N}'s attention before giving information near traffic?",
        yes: "Staff gained {p} attention before giving information near traffic.", no: null }
    ]
  },
  {
    id: "mobility-community", title: "Mobility aid · out in the community",
    appliesWhen: { profileHas: "mobilityAid", kind: "activity", out: true },
    reason: "{N}'s profile records {p} {aid}, and this activity was out in the community.",
    prompts: [
      { id: "aid", text: "Did {N} use {p} {aid}?",
        yes: "{S} used {p} {aid}.", no: "{S} did not use {p} {aid} on this occasion." }
    ]
  },

  /* ---- eating and drinking ---- */
  {
    id: "choking-meal", title: "Choking risk · meal",
    appliesWhen: { any: [{ profileFlag: ["choking", "softdiet"] }, { profileHas: "texture" }], kind: "eating", notSlot: "fluids" },
    reason: "A choking risk or prescribed texture{textureNote} is recorded in {N}'s profile and this is a meal.",
    suggest: "A choking risk or modified diet is recorded. Consider recording the texture, {p} position and anything observed while eating.",
    prompts: [
      { id: "texture", pri: 1, text: "Was the meal prepared to {N}'s prescribed texture{textureNote}?",
        yes: "The meal was prepared to {p} prescribed texture{textureNote}.",
        no: "The meal was not prepared to {p} prescribed texture.",
        onNo: { severity: "critical", message: "The meal was recorded as not prepared to {N}'s prescribed texture.",
                handover: "Meal not prepared to prescribed texture ({meal})." } },
      { id: "upright", text: "Was {N} sitting upright while eating?",
        yes: "{S} {vbe} sitting upright while eating.", no: "{S} {vbe} not sitting upright while eating.",
        onNo: { severity: "review", message: "{N} was recorded as not sitting upright while eating.",
                handover: "Not sitting upright while eating ({meal})." } },
      { id: "pace", text: "Was {N} supported to eat at a steady pace?",
        yes: "Staff supported {o} to eat at a steady pace.", no: null },
      { id: "cough", pri: 1, text: "Was any coughing observed?",
        yes: "Coughing was observed during {meal}.", no: "No coughing was observed during {meal}.",
        onYes: { severity: "review", message: "Coughing was recorded during {meal}.", handover: "Coughing observed during {meal}." } },
      { id: "choke", pri: 1, text: "Was any choking observed?",
        yes: "Choking was observed during {meal}.", no: "No choking was observed during {meal}.",
        onYes: { severity: "critical", message: "Choking was recorded during {meal}.", handover: "Choking observed during {meal}.",
                 require: { field: "extra", message: "Describe what was seen and what staff did in “Anything else”." } } }
    ]
  },
  {
    id: "choking-drink", title: "Choking risk · drinks",
    appliesWhen: { any: [{ profileFlag: ["choking", "softdiet"] }, { profileHas: "texture" }], kind: "eating", slot: "fluids" },
    reason: "A choking risk or modified diet is recorded in {N}'s profile and this is a drink.",
    prompts: [
      { id: "prepared", pri: 1, text: "Was the drink prepared as set out in {N}'s care plan (for example, thickened)?",
        yes: "The drink was prepared as set out in {p} care plan.", no: "The drink was not prepared as set out in {p} care plan.",
        onNo: { severity: "critical", message: "The drink was recorded as not prepared as set out in {N}'s care plan.",
                handover: "Drink not prepared as set out in the care plan." } },
      { id: "cough", pri: 1, text: "Was any coughing observed?",
        yes: "Coughing was observed while {s} {vbe} drinking.", no: "No coughing was observed while {s} {vbe} drinking.",
        onYes: { severity: "review", message: "Coughing was recorded while drinking.", handover: "Coughing observed while drinking." } }
    ]
  },
  {
    id: "fluid-target", title: "Fluid target",
    appliesWhen: { any: [{ profileFlag: "fluids" }, { profileHas: "fluidTarget" }], kind: "eating" },
    reason: "A daily fluid target{targetNote} is recorded in {N}'s profile, so each drink counts toward it.",
    important: [{ field: "drunk", message: "Amount drunk has not been recorded." },
                { field: "offered", severity: "suggestion", message: "Amount offered has not been recorded." }]
  },
  {
    id: "diabetes-meal", title: "Diabetes · meal",
    appliesWhen: { profileFlag: "diabetes", kind: "eating", notSlot: "fluids" },
    reason: "Diabetes is recorded in {N}'s profile and this is a meal.",
    prompts: [
      { id: "portion", text: "Were portion size and sugar content discussed with {N}?",
        yes: "Portion size and sugar content were discussed with {o}.", no: null }
    ]
  },
  {
    id: "cholesterol-meal", title: "Cholesterol management · meal",
    appliesWhen: { profileFlag: "cholesterol", kind: "eating", notSlot: "fluids" },
    reason: "Cholesterol management is recorded in {N}'s profile and this is a meal.",
    prompts: [
      { id: "lowerfat", text: "Was a lower-fat option offered?",
        yes: "A lower-fat option was offered to {o}.", no: null }
    ]
  },

  /* ---- epilepsy ---- */
  {
    id: "epilepsy-activity", title: "Epilepsy · activity",
    appliesWhen: { profileFlag: "epilepsy", kind: "activity" },
    reason: "Epilepsy is recorded in {N}'s profile and this is an activity.",
    suggest: "Epilepsy is recorded in {N}'s profile. Consider recording whether any seizure activity was observed.",
    prompts: [
      { id: "seizure", pri: 1, text: "Was any seizure activity observed?",
        yes: "Seizure activity was observed during {activity}.", no: "No seizure activity was observed.",
        onYes: { severity: "critical", message: "Seizure activity was recorded.", handover: "Seizure activity observed during {activity}.",
                 require: { field: "extra", message: "Describe the seizure in “Anything else”: the time, how long it lasted, what was seen and how {N} recovered." } } },
      { id: "recovery", showIf: { answer: { "epilepsy-activity.seizure": "yes" } }, text: "Was recovery support given?",
        yes: "Staff supported {o} during {p} recovery.", no: null },
      { id: "arrangements", text: "Were {N}'s seizure safety arrangements followed?",
        yes: "{P} seizure safety arrangements were followed.", no: "{P} seizure safety arrangements were not followed.",
        onNo: { severity: "review", message: "{N}'s seizure safety arrangements were recorded as not followed.",
                handover: "Seizure safety arrangements not followed during {activity}." } }
    ]
  },
  {
    id: "epilepsy-water", title: "Epilepsy · water",
    appliesWhen: { profileFlag: "epilepsy", kind: "activity", activityTag: "water" },
    reason: "Epilepsy is recorded in {N}'s profile and this is a water-based activity.",
    prompts: [
      { id: "supervised", pri: 1, text: "Was {N} supervised in the water as set out in {p} care plan?",
        yes: "Staff supervised {o} in the water as set out in {p} care plan.",
        no: "{S} {vbe} not supervised in the water as set out in {p} care plan.",
        onNo: { severity: "review", message: "Water supervision was recorded as not following {N}'s care plan.",
                handover: "Water supervision did not follow the care plan." } }
    ]
  },
  {
    id: "epilepsy-bathing", title: "Epilepsy · bathing",
    appliesWhen: { profileFlag: "epilepsy", kind: "personal", taskOpt: { wash: ["a shower", "a bath"] } },
    reason: "Epilepsy is recorded in {N}'s profile and {s} had a bath or shower.",
    prompts: [
      { id: "supervised", pri: 1, text: "Was bathing supervised as set out in {N}'s care plan?",
        yes: "Bathing was supervised as set out in {p} care plan.", no: "Bathing was not supervised as set out in {p} care plan.",
        onNo: { severity: "review", message: "Bathing was recorded as not supervised as set out in {N}'s care plan.",
                handover: "Bathing supervision did not follow the care plan." } },
      { id: "seizure", pri: 1, text: "Was any seizure activity observed?",
        yes: "Seizure activity was observed during personal care.", no: "No seizure activity was observed.",
        onYes: { severity: "critical", message: "Seizure activity was recorded.", handover: "Seizure activity observed during personal care.",
                 require: { field: "extra", message: "Describe the seizure in “Anything else”: the time, how long it lasted, what was seen and how {N} recovered." } } }
    ]
  },

  /* ---- personal care ---- */
  {
    id: "privacy-personal", title: "Same-gender care",
    appliesWhen: { profileFlag: "privacy", kind: "personal" },
    reason: "A preference for same-gender personal care is recorded in {N}'s profile.",
    prompts: [
      { id: "gender", text: "Was personal care given by staff of {N}'s preferred gender?",
        yes: "Personal care was given by staff of {p} preferred gender.",
        no: "Personal care was not given by staff of {p} preferred gender on this occasion.",
        onNo: { severity: "review", message: "Personal care was recorded as not given by staff of {N}'s preferred gender.",
                handover: "Personal care not given by staff of preferred gender." } }
    ]
  },
  {
    id: "skin-personal", title: "Skin integrity",
    appliesWhen: { profileFlag: "skin", kind: "personal" },
    reason: "Skin integrity monitoring is recorded in {N}'s profile and this is personal care.",
    important: [{ field: "skin", message: "Skin has not been recorded as observed or not observed." }]
  },
  {
    id: "continence-personal", title: "Continence",
    appliesWhen: { profileFlag: "continence", kind: "personal" },
    reason: "A continence plan is recorded in {N}'s profile and this is personal care.",
    suggest: "A continence plan is recorded. Consider recording continence observations.",
    watch: ["contObs"]
  },

  /* ---- out and about ---- */
  {
    id: "continence-community", title: "Continence · away from home",
    appliesWhen: { profileFlag: "continence", kind: "activity", out: true },
    reason: "A continence plan is recorded in {N}'s profile and this activity was away from home.",
    suggest: "A continence plan is recorded. Was toileting planned for the time away from home?",
    highlight: ["risk.toilet", "risk.accessible"]
  },
  {
    id: "anxiety-community", title: "Anxiety · out in the community",
    appliesWhen: { profileFlag: "anxiety", kind: "activity", out: true },
    reason: "Anxiety is recorded in {N}'s profile{triggersNote}.",
    suggest: "Anxiety is recorded in {N}'s profile. Consider recording how the plan was shared and how {N} presented.",
    highlight: ["risk.plan"],
    watch: ["mood"]
  },

  {
    id: "goals-activity", title: "What they are working towards",
    appliesWhen: { profileHas: "goals", kind: "activity" },
    reason: "{N}'s profile records what {s} is working towards: {goals}.",
    suggest: "{N} is working towards: {goals}. Did this activity work towards it? If so, tick it under How it met their wishes and outcomes.",
    highlight: ["benefit.goal"], watch: ["benefit"]
  },

  /* ---- communication ---- */
  {
    id: "communication-profile", title: "Communication",
    appliesWhen: { profileHas: "comm" },
    reason: "{N}'s profile records how {s} communicates, so how staff communicated and how {s} responded are part of the evidence.",
    important: [{ field: "commUsed", message: "How staff communicated with {N} has not been recorded." }]
  },
  {
    id: "communication-response", title: "Communication",
    appliesWhen: { profileHas: "comm", filled: "resp", not: { field: { resp: "noresp" } } },
    reason: "{N}'s profile records how {s} communicates, so how {s} let staff know is part of the evidence.",
    important: [{ field: "how", message: "How {N} communicated {p} decision has not been recorded." }]
  },

  /* ---- things worth handing over, whoever the person is ---- */
  {
    id: "new-skin-concern", title: "New skin concern",
    appliesWhen: { kind: "personal", field: { skin: "concern" } },
    reason: "A new skin concern was recorded.",
    important: [{ field: "skinDetail", message: "Describe what was seen on the skin and where." }],
    highlight: ["followup.bodymap"],
    handover: "New skin concern observed: {skinDetail}."
  },
  {
    id: "discomfort", title: "Discomfort",
    appliesWhen: { includes: { well: "pain" } },
    reason: "Signs of discomfort were recorded.",
    handover: "Signs of discomfort observed."
  },
  {
    id: "appetite-change", title: "Appetite",
    appliesWhen: { includes: { well: "appetite" } },
    reason: "A change in appetite was recorded.",
    handover: "Change in usual appetite noticed."
  },
  {
    id: "low-food", title: "Food intake",
    appliesWhen: { kind: "eating", field: { ate: ["A small amount", "None"] } },
    reason: "{N} ate {ateLower} of {meal}.",
    handover: "Ate {ateLower} of {meal}."
  },
  {
    id: "low-fluid", title: "Fluid intake",
    appliesWhen: { kind: "eating", lowDrink: true },
    reason: "{N} drank {drunk} ml of the {offered} ml offered - less than half.",
    handover: "Drank {drunk} ml of {offered} ml offered."
  },
  {
    id: "more-support-than-usual", title: "Support compared with usual",
    appliesWhen: { profileHas: "usualLevel", moreSupportThanUsual: true },
    reason: "{N}'s profile records {p} usual level of independence as “{usualLevel}”, and more support than that is recorded today.",
    suggest: "Support today was more than {N}'s usual level recorded in the profile. Was there a reason?",
    watch: ["extra"],
    handover: "Needed more support than usual today."
  }
];

/* the fields behind each token a confirmed answer's sentence can use */
const TOKEN_SRC = { N: ["initials"], s: ["pronoun"], S: ["pronoun"], o: ["pronoun"], p: ["pronoun"], P: ["pronoun"],
                    r: ["pronoun"], vbe: ["pronoun"], vhave: ["pronoun"], meal: ["slot"], activity: ["slot"],
                    textureNote: ["profile.texture"], aid: ["profile.mobilityAid"] };
function sourcesOf(template, key, f){
  const out = new Set(["prompts." + key]);
  (template.match(/\{(\w+)\}/g) || []).forEach(m => (TOKEN_SRC[m.slice(1, -1)] || []).forEach(x => {
    if(!x.startsWith("profile.") || present(f.profile[x.slice(8)])) out.add(x);
  }));
  return [...out];
}

/* The college course, if any, that a chosen activity is on this person's
   timetable: picking "Music" for someone whose Tuesday is a music class is
   most likely that class. Returns null when college is already chosen, there
   is no timetable, or nothing fits. `today` says the session is timetabled for
   today; `sameActivity` that the activity chosen is that course. */
const ACT_COURSE = { music: "music", cooking: "cooking", baking: "baking", exercise: "exercise", arts: "art", gardening: "allotment", connect: "connect", pop: "pop", tabletennis: "tabletennis" };
function timetabled(s, profile, now){
  const tt = ((profile && profile.timetable) || []).filter(r => r && r.c);
  if(!s || s.kind !== "activity" || s.setting === "college" || !tt.length) return null;
  const course = ACT_COURSE[s.slot] || null;
  const today = String((now || new Date()).getDay());
  const same = course ? tt.filter(r => r.c === course) : [];
  const pick = same.find(r => r.d === today) || same[0] || tt.find(r => r.d === today);
  if(!pick) return null;
  return { course: pick.c, courseLabel: plain((COURSES.find(c => c[0] === pick.c) || ["", "the class"])[1]),
           day: pick.d, dayName: (DAYS.find(d => d[0] === String(pick.d)) || ["", "that day"])[1], from: pick.from || "", to: pick.to || "",
           today: pick.d === today, sameActivity: !!course && pick.c === course };
}

/* which rules apply now, with their text filled in for this person */
function evaluate(ctx, rules){
  const f = ctx.f || facts(ctx);
  const answers = f.s.prompts || {};
  const T = str => fill(str, f.vars);
  return (rules || CARE_RULES).filter(r => matches(r.appliesWhen, f)).map(r => ({
    id: r.id, rule: r,
    title: T(r.title || r.id),
    reason: T(r.reason),
    suggest: r.suggest ? T(r.suggest) : "",
    watch: r.watch || [],
    highlight: r.highlight || [],
    important: (r.important || []).map(i => Object.assign({}, i, { message: T(i.message) })),
    handover: r.handover ? T(r.handover) : "",
    prompts: (r.prompts || []).filter(p => !p.showIf || matches(p.showIf, f)).map(p => {
      const key = r.id + "." + p.id;
      const answer = answers[key] === "yes" || answers[key] === "no" ? answers[key] : "";
      const trig = answer === "yes" ? p.onYes : answer === "no" ? p.onNo : null;
      return {
        id: p.id, key, pri: p.pri || 2, answer,
        text: T(p.text),
        sentence: answer && p[answer] ? T(p[answer]) : "",
        sources: answer && p[answer] ? sourcesOf(p[answer], key, f) : [],
        trigger: trig ? { severity: trig.severity, message: T(trig.message), handover: trig.handover ? T(trig.handover) : "",
                          require: trig.require ? { field: trig.require.field, message: T(trig.require.message) } : null } : null
      };
    })
  }));
}

G.rules = { CARE_RULES, CONDITIONS, RANK, HANDS_ON, DECLINED_RESP, ESCALATE, ACT_COURSE, facts, matches, evaluate, taskLabel, activityName, timetabled };
})(globalThis.GSN = globalThis.GSN || {});
