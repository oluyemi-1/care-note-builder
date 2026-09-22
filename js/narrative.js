/* The narrative planner. It writes the note in five controlled steps:

   1 plan       one item per recorded fact, in the recording order:
                context, offer, choice, how it was communicated, consent,
                what the person did, support given, observation, risk,
                outcome, follow-up
   2 select     keep the items the chosen length allows
   3 aggregate  maybe say several same-level tasks in one sentence, or a
                choice and how it was shown in one
   4 realise    pick wording from the phrase banks and fill it in
   5 assemble   one paragraph or several

   Wording varies; facts do not. Every sentence carries `sources` - the fields
   it was built from - and nothing is ever said without one. Selection comes
   before aggregation, so rewording can regroup sentences but never change
   which facts are in the note. */
(function (G) {
"use strict";

const { cap, fill, personVars, hashStr, toMins, plain, present } = G.core;
const D = G.data;

const SECTIONS = ["context", "offer", "choice", "consent", "independence", "support", "declinedTasks",
                  "observation", "risk", "explain", "outcome", "followup"];
/* sections that open a new paragraph when the note is split into paragraphs */
const PARA_START = { independence: 1, observation: 1 };

const sentence = t => String(t).replace(/\s*$/, "").replace(/([^.!?])$/, "$1.");
/* staff's own words: exactly as typed, given a capital and a full stop */
const verbatim = t => sentence(cap(String(t).trim()));
const stripTime = t => t.replace(/^At \{time\}, (.)/, (m, c) => c.toUpperCase()).replace(/ at \{time\}/, "");
const joinList = xs => xs.length < 2 ? xs.join("") : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1];
const ORDER_OWN = ["ind", "prompt", "min"];

function actPhrase(s, i, acts){
  if(s.kind !== "activity") return i === 3 ? "took part in the activity" : "the activity";
  if(s.setting === "college"){
    const c = D.COURSES.find(x => x[0] === s.slot);
    return c ? c[i] : (i === 3 ? "attended {p} class" : "{p} class");
  }
  if(s.slot === "other"){
    const n = s.actOther || "the activity";
    return i === 3 ? "took part in " + n : n;
  }
  const a = (acts || D.ACTS).find(x => x[0] === s.slot);
  return a ? a[i] : (i === 3 ? "took part in the activity" : "the activity");
}

/* every token a template can use, and the field(s) each one comes from.
   Our own phrases are pre-filled with the person's pronouns here, so the
   single fill pass later never reads tokens out of anything staff typed. */
function baseVars(s, opts){
  const V = {}, SRC = {};
  const set = (k, v, src) => { V[k] = v; SRC[k] = src; };
  const pv = personVars(s.initials, s.pronoun);
  Object.keys(pv).forEach(k => set(k, pv[k], k === "N" ? ["initials"] : ["pronoun"]));
  const pre = str => fill(str, pv);

  set("time", s.time, ["time"]);
  set("ratio", !s.staffing ? "" : s.staffing === "shared" ? " with shared staffing" : " with " + s.staffing + " support",
      s.staffing ? ["staffing"] : []);
  const meal = D.MEALWORD[s.slot] || ["the meal", "The meal"];
  set("meal", pre(meal[0]), ["slot"]); set("meal2", pre(meal[1]), ["slot"]);

  const actSrc = s.kind !== "activity" ? ["kind"] : s.setting === "college" ? ["setting", "slot"]
               : s.slot === "other" && s.actOther ? ["slot", "actOther"] : ["slot"];
  const act = pre(plain(actPhrase(s, 2, opts.acts)));
  set("act", act, actSrc); set("act2", cap(act), actSrc);
  set("did", pre(plain(actPhrase(s, 3, opts.acts))), actSrc);
  set("offer", s.offerA || act, s.offerA ? ["offerA"] : actSrc);
  set("Offer", cap(s.offerA || act), s.offerA ? ["offerA"] : actSrc);
  set("offerA", s.offerA, ["offerA"]); set("offerB", s.offerB, ["offerB"]);

  const picked = s.chosen || (s.resp === "choseA" ? s.offerA : s.resp === "choseB" ? s.offerB : "");
  set("chosen", picked || (s.resp === "choseB" ? "the second option" : "the first option"),
      s.chosen ? ["chosen"] : picked ? [s.resp === "choseA" ? "offerA" : "offerB"] : ["resp"]);
  set("declined", s.declined ? sentence(cap(s.declined)) : "", s.declined ? ["declined"] : []);
  set("skinDetail", s.skinDetail, ["skinDetail"]);

  set("sessionTo", s.sessionTo, ["sessionTo"]);
  set("ate", String(s.ate || "").toLowerCase(), ["ate"]);
  set("whatAte", s.whatAte, ["whatAte"]);
  set("offered", s.offered, ["offered"]); set("drunk", s.drunk, ["drunk"]);
  set("drink", s.drinkChoice, ["drinkChoice"]);
  set("ofDrink", s.drinkChoice ? " of " + s.drinkChoice : "", s.drinkChoice ? ["drinkChoice"] : []);
  return { V, SRC, pre };
}

/* ---------- 1 plan ---------- */
function plan(s, opts, pre){
  const items = [];
  const add = it => { items.push(Object.assign({ vars: {}, src: [] }, it)); };
  const college = s.kind === "activity" && s.setting === "college";
  const notGoing = college && s.resp === "declinedgo";

  /* context */
  let open = s.kind === "personal" && D.OPEN_PC[s.slot] ? D.OPEN_PC[s.slot] : D.OPEN[s.kind];
  if(s.kind === "activity")
    open = college ? (notGoing ? D.OPEN_COLLEGE_DECLINED : D.OPEN_COLLEGE)
         : (s.offerA && s.offerB) ? D.OPEN_ACT.choice : D.OPEN_ACT.single;
  add({ key: "open", section: "context", pri: 1, bank: s.time ? open : open.map(stripTime), src: ["kind", "slot"] });
  if(college && !notGoing && s.time && s.sessionTo && toMins(s.sessionTo) > toMins(s.time))
    add({ key: "session", section: "context", pri: 2, bank: D.SESSIONBANK });

  /* offer - a college course is not offered on the day, and a single
     activity is already named by the opener */
  if(!college){
    if(s.offerA && s.offerB) add({ key: "offer", section: "offer", pri: 1, bank: D.OFFERBANK.two });
    else if(s.offerA && s.kind !== "activity") add({ key: "offer", section: "offer", pri: 2, bank: D.OFFERBANK.one });
  }
  /* how staff communicated this time */
  (s.commUsed || []).forEach((c, i) => {
    if(D.COMMBANK[c]) add({ key: "comm_" + c, section: "offer", pri: i ? 3 : 2, bank: D.COMMBANK[c], src: ["commUsed." + c] });
  });

  /* choice or response, and how the person let staff know */
  if(s.resp && D.RESPBANK[s.resp]) add({ key: "resp", section: "choice", pri: 1, bank: D.RESPBANK[s.resp], src: ["resp"] });
  if(!["declined", "declinedgo", "noresp"].includes(s.resp))
    (s.how || []).forEach((h, i) => {
      if(D.HOWBANK[h]) add({ key: "how_" + h, section: "choice", pri: i ? 3 : 2, bank: D.HOWBANK[h], src: ["how." + h], how: h });
    });
  if(s.consent) add({ key: "consent", section: "consent", pri: 1, bank: D.CONSENTBANK[s.consent], src: ["consent"] });

  /* what the person did, then the support given, then what they declined */
  const bank = (opts.tasks || D.TASKS)[s.kind] || [];
  const withLevel = (s.tasks || []).map((t, n) => ({ t, n })).filter(x => x.t.level);
  const rank = l => ORDER_OWN.includes(l) ? 0 : l === "declined" ? 2 : 1;
  const lvlOrder = ["ind", "prompt", "min", "part", "full", "declined"];
  withLevel.sort((a, b) => (rank(a.t.level) - rank(b.t.level)) ||
                           (lvlOrder.indexOf(a.t.level) - lvlOrder.indexOf(b.t.level)) || (a.n - b.n));
  withLevel.forEach(({ t, n }) => {
    const def = bank.find(d => d.id === t.id);
    if(!def || !def[t.level] || !def[t.level].length) return;
    const src = ["tasks." + t.id + ".level"].concat(def.opts && t.opt ? ["tasks." + t.id + ".opt"] : []);
    const optVal = t.opt ? pre(t.opt) : "";
    add({ key: "task_" + t.id, section: rank(t.level) === 0 ? "independence" : t.level === "declined" ? "declinedTasks" : "support",
          pri: n < 2 ? 1 : n < 5 ? 2 : 3, bank: def[t.level], src, vars: { opt: optVal }, varSrc: { opt: src.slice(1) },
          task: { id: t.id, level: t.level, verb: def.verb, noun: def.opts ? "" : def.noun } });
    /* the journey and how it was kept safe stay together */
    if(s.kind === "activity" && t.id === "travel")
      (s.risk || []).filter(r => D.TRAVEL_RISK.includes(r) && D.RISKBANK[r]).forEach((r, i) =>
        add({ key: "risk_" + r, section: items[items.length - 1].section, pri: i < 3 ? 2 : 3, bank: D.RISKBANK[r],
              src: ["risk." + r], attach: "task_travel" }));
  });
  if(s.level && !(s.tasks || []).some(t => t.level) && D.LEVELBANK[s.level])
    add({ key: "level", section: "support", pri: 2, bank: D.LEVELBANK[s.level], src: ["level"] });
  if(s.kind === "personal")
    (s.dignity || []).forEach((d, i) => add({ key: "dig_" + d, section: "support", pri: i < 2 ? 2 : 3, bank: D.DIGNITYBANK[d], src: ["dignity." + d] }));

  /* observation */
  if(s.kind === "eating"){
    if(s.ate && s.whatAte) add({ key: "intake", section: "observation", pri: 1, bank: D.INTAKEBANK.ateWhat });
    else if(s.ate)         add({ key: "intake", section: "observation", pri: 1, bank: D.INTAKEBANK.ate });
    else if(s.whatAte)     add({ key: "intake", section: "observation", pri: 1, bank: D.INTAKEBANK.what });
    if(present(s.drunk) && present(s.offered)) add({ key: "fluid", section: "observation", pri: 1, bank: D.INTAKEBANK.offeredDrunk });
    else if(present(s.drunk))                  add({ key: "fluid", section: "observation", pri: 1, bank: D.INTAKEBANK.drunk });
    else if(s.drinkChoice)                     add({ key: "fluid", section: "observation", pri: 2, bank: D.INTAKEBANK.drink });
  }
  if(s.kind === "personal"){
    if(s.skin === "clear") add({ key: "skin", section: "observation", pri: 2, bank: D.SKINBANK.clear, src: ["skin"] });
    if(s.skin === "concern")
      add({ key: "skin", section: "observation", pri: 1, src: ["skin"],
            bank: s.skinDetail ? D.SKINBANK.concern : ["Something new was observed on {p} skin during care.", "Staff noticed something new on {p} skin during care."] });
    (s.contObs || []).forEach(c => add({ key: "cont_" + c, section: "observation", pri: 1, bank: D.CONTBANK[c], src: ["contObs." + c] }));
    (s.sleepObs || []).forEach(c => add({ key: "sleep_" + c, section: "observation", pri: 1, bank: D.SLEEPBANK[c], src: ["sleepObs." + c] }));
  }
  if(s.kind === "activity")
    (s.learn || []).forEach((l, i) => add({ key: "learn_" + l, section: "observation", pri: i < 2 ? 1 : 2, bank: D.LEARNBANK[l], src: ["learn." + l] }));
  (s.mood || []).forEach((m, i) => add({ key: "mood_" + m, section: "observation", pri: i ? 3 : 2, bank: D.MOODBANK[m], src: ["mood." + m] }));
  (s.well || []).forEach(w => add({ key: "well_" + w, section: "observation", pri: w === "nochange" ? 3 : 2, bank: D.WELLBANK[w], src: ["well." + w] }));
  (s.behaviour || []).filter(b => D.BEHAVIOURBANK[b]).forEach(b =>
    add({ key: "beh_" + b, section: "observation", pri: 1, bank: D.BEHAVIOURBANK[b], src: ["behaviour." + b] }));
  if((s.behaviour || []).includes("other") && s.behaviourOther)
    add({ key: "behOther", section: "observation", pri: 1, text: verbatim(s.behaviourOther), src: ["behaviour.other", "behaviourOther"] });
  if(s.extra) add({ key: "extra", section: "observation", pri: 1, text: verbatim(s.extra), src: ["extra"] });

  /* risk management staff confirmed: safety choices, then answers to the profile's questions */
  if(s.kind === "activity")
    (s.risk || []).filter(r => D.RISKBANK[r] && !items.some(it => it.key === "risk_" + r)).forEach((r, i) =>
      add({ key: "risk_" + r, section: "risk", pri: i < 3 ? 2 : 3, bank: D.RISKBANK[r], src: ["risk." + r] }));
  (s.promptLines || []).forEach(l => add({ key: "prompt_" + l.key, section: "risk", pri: l.pri, text: l.text, ours: true, src: l.sources }));

  /* an inconsistency the staff member explained, in their own words */
  (s.explained || []).forEach((t, i) => add({ key: "explain_" + i, section: "explain", pri: 1, text: verbatim(t), src: ["explained." + i] }));

  /* outcome, then what was actually done about anything */
  if(s.outcome && D.OUTBANK[s.outcome]) add({ key: "out", section: "outcome", pri: 1, bank: D.OUTBANK[s.outcome], src: ["outcome"], lead: true });
  if(s.handover) add({ key: "handover", section: "followup", pri: 1, text: "Handed over: " + s.handover.replace(/\.?\s*$/, "") + ".", src: ["handover"] });
  (s.followup || []).forEach(k => add({ key: "fu_" + k, section: "followup", pri: 1, bank: D.FOLLOWBANK[k], src: ["followup." + k] }));

  return items.map((it, i) => Object.assign(it, { order: i }))
    .sort((a, b) => (SECTIONS.indexOf(a.section) - SECTIONS.indexOf(b.section)) || (a.order - b.order));
}

/* ---------- the note ---------- */
function build(s, opts){
  opts = opts || {};
  const L = s.len === "short" ? 1 : s.len === "full" ? 3 : 2;
  const salt = opts.salt || 0;
  const hist = opts.hist || {}, avoid = opts.avoid || {};
  const chosen = {};
  const decide = (n, key) => hashStr(salt + "|" + key) % n;

  /* pick a phrase, steering away from the ones recently used for this person */
  function pick(bank, slot){
    if(!bank || !bank.length) return "";
    let h = hist[slot] || [];
    if(slot in avoid) h = [avoid[slot]].concat(h.filter(x => x !== avoid[slot]));
    let best = [], bestScore = Infinity;
    bank.forEach((_, i) => {
      const pos = h.indexOf(i);
      const score = pos === -1 ? -1 : (h.length - pos);
      if(score < bestScore){ bestScore = score; best = [i]; }
      else if(score === bestScore) best.push(i);
    });
    const i = best[hashStr(salt + "|" + slot) % best.length];
    chosen[slot] = i;
    return bank[i];
  }

  const { V, SRC, pre } = baseVars(s, opts);
  const staffWord = ((opts.terms || {}).staff || "").trim();

  /* the service's word for staff, in our own wording only - never in anything staff typed */
  const terms = t => staffWord && staffWord.toLowerCase() !== "staff"
    ? t.replace(/\bStaff\b/g, cap(staffWord)).replace(/\bstaff\b/g, staffWord) : t;

  /* fill a template once; the fields behind every token used become sources */
  function say(template, it){
    const t = terms(template);
    const src = new Set(it.src || []);
    const vars = Object.assign({}, V, it.vars);
    const text = t.replace(/\{(\w+)\}/g, (m, k) => {
      if(!(k in vars)) return m;
      ((it.varSrc && it.varSrc[k]) || SRC[k] || []).forEach(x => src.add(x));
      return vars[k];
    });
    return { text, sources: [...src] };
  }

  /* 2 select - and say what a shorter length leaves out, so a note pasted
     into the care record is never quietly missing something staff ticked */
  const planned = plan(s, opts, pre);
  const omitted = planned.filter(it => it.pri > L).map(it => it.key);
  let items = planned.filter(it => it.pri <= L);

  /* 3 aggregate: runs of same-level tasks that can be said together */
  const out = [];
  for(let i = 0; i < items.length; i++){
    const it = items[i];
    if(it.task && D.GROUPBANK[it.task.level]){
      const lvl = it.task.level, word = ORDER_OWN.includes(lvl) ? "verb" : "noun";
      const run = [it], trail = [];
      let j = i + 1;
      for(; j < items.length; j++){
        const nx = items[j];
        if(nx.attach){ trail.push(nx); continue; }
        if(!nx.task || nx.task.level !== lvl || nx.section !== it.section || !nx.task[word]) break;
        run.push(nx);
      }
      if(it.task[word] && run.length > 1 && decide(2, "group|" + lvl) === 0){
        const parts = run.map(r => say(r.task[word], r));
        const list = joinList(parts.map(x => x.text));
        out.push({ key: "group_" + lvl, section: it.section, bank: D.GROUPBANK[lvl],
                   vars: { list, nouns: list },
                   src: [].concat.apply([], parts.map(x => x.sources)), members: run.map(r => r.key) });
        trail.forEach(x => out.push(x));
        i = j - 1;
        continue;
      }
    }
    out.push(it);
  }
  items = out;

  /* a choice and how it was shown, sometimes as one sentence */
  const ri = items.findIndex(x => x.key === "resp");
  const hi = items.findIndex(x => x.how);
  if(ri > -1 && hi === ri + 1 && ["choseA", "choseB", "agreed"].includes(s.resp) && decide(2, "join|how") === 0){
    const r = items[ri], h = items[hi];
    r.join = D.HOW_JOIN[h.how];
    r.src = r.src.concat(h.src);
    items.splice(hi, 1);
  }

  /* 5 assemble - one block by default, because the note is pasted into another
     system and some strip line breaks; paragraphs only when a provider asks */
  const paras = opts.layout === "paragraphs" && L > 1 && items.length >= 6 && decide(2, "paras") === 0;
  let para = 0;
  const sentences = [];
  items.forEach((it, idx) => {
    if(paras && idx > 0 && PARA_START[it.section] && !PARA_START[items[idx - 1].section]) para++;
    const first = !sentences.some(x => x.para === para);
    let res;
    if(it.text) res = { text: it.ours ? terms(it.text) : it.text, sources: it.src.slice() };
    else {
      let t = pick(it.bank, it.key);
      /* a new paragraph names the person rather than starting "He ..." */
      if(first && para > 0 && t.startsWith("{S} ")) t = "{N} " + t.slice(4);
      if(it.join) t = t.replace(/\.$/, ", " + it.join + ".");
      if(it.lead && /^\{[SN]\} /.test(t) && !/afterwards|at the end|once|finished|by the end/i.test(t)){
        const lead = D.OUT_LEAD[decide(D.OUT_LEAD.length, "lead")];
        if(lead) t = lead + (t.startsWith("{S}") ? "{s}" + t.slice(3) : t);
      }
      res = say(t, it);
    }
    const text = plain(res.text).replace(/\s+([.,])/g, "$1").replace(/ {2,}/g, " ").trim();
    if(text) sentences.push({ key: it.key, section: it.section, para, text, sources: res.sources, members: it.members });
  });

  const text = [...new Set(sentences.map(x => x.para))]
    .map(p => sentences.filter(x => x.para === p).map(x => x.text).join(" ")).join("\n\n");
  return { sentences, text, chosen, omitted };
}

/* The whole pipeline in one place, so the page and the tests run the same
   thing: gather Smart Assist, then build the note from what staff entered -
   plus only the answers they confirmed and the explanations they wrote for
   inconsistencies that still stand. */
function compose(ctx, opts){
  const sa = G.smartAssist.collect(ctx);
  const explanations = ctx.explanations || {};
  const promptLines = [];
  sa.rules.forEach(r => r.prompts.forEach(p => {
    if(p.sentence) promptLines.push({ key: p.key, text: p.sentence, pri: p.pri, sources: p.sources });
  }));
  const s = Object.assign({}, ctx.s, {
    profile: ctx.profile || {},
    explained: sa.contradictions.map(c => (explanations[c.id] || "").trim()).filter(Boolean),
    promptLines
  });
  return { sa, s, note: build(s, opts) };
}

G.narrative = { build, plan, compose, actPhrase, stripTime, SECTIONS };
})(globalThis.GSN = globalThis.GSN || {});
