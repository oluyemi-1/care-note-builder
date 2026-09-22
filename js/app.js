/* ============================================================
   Gold Standard Notes
   A phrase-bank daily-note builder for any care setting. No network,
   no model, no storage beyond this browser. Every sentence traces to
   a ticked input. The field names in TASKS[].nf match the dropdowns
   most care record systems use; edit them to match yours.
   ============================================================ */
"use strict";

const { PRON, cap, hashStr, toMins, durText } = GSN.core;
const {
  COMM, FLAGS, RESP, HOW, CONSENT, SKIN, MOOD, WELL, RISK, OUTCOME, ACTS, OUT_SCOPE, SLOTS, LEVELS, TASKS, ACT_SETTING, COURSES, RESP_COLLEGE, RESP_SCOPE, LEARN, LEARNBANK, TRAVEL_RISK, OPEN_COLLEGE, OPEN_ACT, OPEN_PC, OPEN, COMMBANK, RESPBANK, HOWBANK, CONSENTBANK, SKINBANK, MOODBANK, WELLBANK, RISKBANK, OUTBANK, MEALWORD, DAYS
} = GSN.data;

const $  = id => document.getElementById(id);

/* ============================================================
   State + persistence (this browser only)
   ============================================================ */
const KEY = "gsn.v1";
let store = {};
try { store = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch(e){ store = {}; }
const save = () => { try{ localStorage.setItem(KEY, JSON.stringify(store)); }catch(e){} };

let chosenIdx = {};            // slot -> index used in the note now on screen
let onScreen = {};             // what the visible note used, so a reword moves off it
let salt = 0;   // set by reseed(); changes only on Reword / after Copy,
                // so the note stays still while you type
/* Two staff writing about the same person on the same day must not produce the
   same note. The seed therefore mixes a per-device id (random, never leaves the
   browser) with the person, the date and the shift \u2014 so wording differs between
   colleagues by construction, without any shared server. */
function reseed(){
  const d = new Date();
  const day = d.getFullYear() + "-" + (d.getMonth()+1) + "-" + d.getDate();
  salt = hashStr([store.device, $("initials").value.trim().toUpperCase(),
                  day, $("kind").value, $("slot").value].join("|"));
}

function histKey(){ return (state().initials||"_") + "|" + $("kind").value; }

/* pick a phrase, steering away from the ones recently used for this person */
function pick(bank, slot){
  if(!bank || !bank.length) return "";
  let hist = ((store.hist||{})[histKey()]||{})[slot] || [];
  if(slot in onScreen) hist = [onScreen[slot]].concat(hist.filter(x => x !== onScreen[slot]));
  let best = [], bestScore = Infinity;
  bank.forEach((_, i) => {
    const pos = hist.indexOf(i);
    const score = pos === -1 ? -1 : (hist.length - pos);
    if(score < bestScore){ bestScore = score; best = [i]; }
    else if(score === bestScore) best.push(i);
  });
  const i = best[hashStr(salt + "|" + slot) % best.length];
  chosenIdx[slot] = i;
  return bank[i];
}
function commitHistory(){
  store.hist = store.hist || {};
  const k = histKey();
  store.hist[k] = store.hist[k] || {};
  for(const slot in chosenIdx){
    const arr = store.hist[k][slot] || [];
    arr.unshift(chosenIdx[slot]);
    store.hist[k][slot] = arr.slice(0, 4);
  }
  save();
}

/* ============================================================
   Reading the form
   ============================================================ */
const checked = id => [...document.querySelectorAll('#'+id+' input:checked')].map(i => i.value);
const one     = id => (document.querySelector('#'+id+' input:checked')||{}).value || "";

function state(){
  return {
    initials: $("initials").value.trim().toUpperCase(),
    pronoun:  $("pronoun").value,
    ratio:    $("ratio").value,
    comm:     checked("comm"),
    flags:    checked("flags"),
    kind:     $("kind").value,
    slot:     $("slot").value,
    setting:  one("setting") || "community",
    sessionTo: $("sessionTo").value,
    learn:    checked("learn"),
    actOther: $("actOther").value.trim(),
    len:      $("len").value,
    time:     $("time").value,
    offerA:   $("offerA").value.trim(),
    offerB:   $("offerB").value.trim(),
    resp:     one("resp") || one("respc"),
    chosen:   $("chosen").value.trim(),
    how:      checked("how"),
    consent:  one("consent"),
    declined: $("declined").value.trim(),
    level:    $("level").value,
    tasks:    readTasks(),
    ate:      $("ate").value,
    whatAte:  $("whatAte").value.trim(),
    drinkChoice: $("drinkChoice").value.trim(),
    offered:  $("offered").value,
    drunk:    $("drunk").value,
    skin:     one("skin"),
    skinDetail: $("skinDetail").value.trim(),
    mood:     checked("mood"),
    well:     checked("well"),
    risk:     checked("risk"),
    outcome:  one("outcome"),
    extra:    $("extra").value.trim(),
    handover: $("handover").value.trim()
  };
}
function readTasks(){
  const out = [];
  document.querySelectorAll('#tasks .task').forEach(row => {
    if(row.hidden) return;
    const box = row.querySelector('input[type=checkbox]');
    if(!box.checked) return;
    const lvl = row.querySelector('select.lvl');
    const opt = row.querySelector('select.opt');
    out.push({ id: box.value, level: lvl ? lvl.value : "ind", opt: opt ? opt.value : "" });
  });
  return out;
}

/* ---------- template fill ---------- */
function actPhrase(s, i){
  if(s.kind !== "activity") return i === 3 ? "took part in the activity" : "the activity";
  if(s.setting === "college"){
    const c = COURSES.find(x => x[0] === s.slot);
    return c ? c[i] : (i === 3 ? "attended {p} class" : "{p} class");
  }
  if(s.slot === "other"){
    const n = s.actOther || "the activity";
    return i === 3 ? "took part in " + n : n;
  }
  const a = ACTS.find(x => x[0] === s.slot);
  return a ? a[i] : (i === 3 ? "took part in the activity" : "the activity");
}

function T(str, s, extra){
  if(!str) return "";
  const pr = PRON[s.pronoun];
  const map = Object.assign({
    N: s.initials || "[Initials]",
    s: pr.s, S: cap(pr.s), o: pr.o, p: pr.p, P: cap(pr.p), r: pr.r,
    vbe: pr.vbe, vhave: pr.vhave,
    time: s.time || "the agreed time",
    chosen: s.chosen || s.offerA || "what was offered",
    declined: s.declined ? (cap(s.declined).replace(/\.?$/, ".")) : "This was respected.",
    skinDetail: s.skinDetail || "a change to the skin",
    ratio: s.ratio && s.ratio !== "shared" ? " with " + s.ratio + " support" : "",
    meal:  (MEALWORD[s.slot]||["the meal","The meal"])[0],
    meal2: (MEALWORD[s.slot]||["the meal","The meal"])[1],
    opt: extra && extra.opt ? extra.opt : "",
    act: actPhrase(s,2), act2: cap(actPhrase(s,2)), did: actPhrase(s,3),
    offer: s.offerA || actPhrase(s,2), Offer: cap(s.offerA || actPhrase(s,2))
  }, extra || {});
  // resolve nested pronoun tokens inside substituted values (e.g. "{p} teeth")
  let outStr = str.replace(/\{(\w+)\}/g, (m,k) => (k in map) ? map[k] : m);
  return outStr.replace(/\{(\w+)\}/g, (m,k) => (k in map) ? map[k] : m);
}

/* ============================================================
   Building the note
   ============================================================ */
function buildNote(s){
  chosenIdx = {};
  const L = s.len === "short" ? 1 : s.len === "std" ? 2 : 3;
  const travelDone = [];
  const out = [];
  const add = (pri, text) => { if(pri <= L && text) out.push(text); };

  /* 1 OFFER */
  let openBank = (s.kind === "personal" && OPEN_PC[s.slot]) ? OPEN_PC[s.slot] : OPEN[s.kind];
  if(s.kind === "activity")
    openBank = s.setting === "college" ? OPEN_COLLEGE
             : (s.offerA && s.offerB) ? OPEN_ACT.choice : OPEN_ACT.single;
  add(1, T(pick(openBank, "open"), s));
  if(s.offerA && s.offerB) add(1, T("{S} {vbe} offered a choice of " + s.offerA + " or " + s.offerB + ".", s));
  else if(s.offerA && s.kind !== "activity") add(2, T("{S} {vbe} offered " + s.offerA + ".", s));
  /* a college course was chosen at enrolment; nothing is offered on the day */
  /* a single activity is already named by the opener above */
  if(s.kind === "activity" && s.setting === "college" && s.time && s.sessionTo && toMins(s.sessionTo) > toMins(s.time))
    add(2, T(pick([
      "{S} {vbe} at college from " + s.time + " until " + s.sessionTo + ".",
      "The session ran from " + s.time + " to " + s.sessionTo + ".",
      "The class lasted " + durText(s.time, s.sessionTo) + ", from " + s.time + " to " + s.sessionTo + "."
    ], "session"), s));
  if(s.comm.length) add(2, T(pick(COMMBANK[s.comm[0]], "comm"), s));
  if(s.comm.length > 1) add(3, T(pick(COMMBANK[s.comm[1]], "comm2"), s));

  /* 2 CHOICE OR RESPONSE */
  if(s.resp) add(1, T(pick(RESPBANK[s.resp], "resp"), s));
  if(s.how.length && s.resp !== "declined") add(2, T(pick(HOWBANK[s.how[0]], "how"), s));
  if(s.consent) add(1, T(pick(CONSENTBANK[s.consent], "consent"), s));

  /* 3 SUPPORT + 4 INDEPENDENCE */
  if(s.consent !== "no" && s.resp !== "declined"){
    if(s.level){
      const LV = {
        ind:   ["{S} completed this independently.","No hands-on support was needed.","{S} managed the whole interaction {r}."],
        prompt:["Support was limited to prompting; no hands-on help was needed.","Only verbal and gestural prompts were used.","{S} needed prompts alone, with no hands-on support."],
        min:   ["{S} {vbe} minimally supported throughout.","Support was kept to the minimum {s} needed.","Only minimal support was given, so {s} could do as much as possible {r}."],
        part:  ["{S} did what {s} could {r} and staff supported with the rest.","Support was shared \u2014 {s} led and staff filled the gaps."],
        full:  ["Staff provided full hands-on support throughout, explaining each step beforehand.","Full support was given by staff, with {p} dignity maintained at every stage."]
      }[s.level];
      /* only narrate the overall level when no rows were ticked - otherwise the
         rows say it more precisely and the two can disagree */
      if(!s.tasks.some(t => t.level)) add(2, T(pick(LV, "level"), s));
    }
    const bank = TASKS[s.kind];
    s.tasks.forEach((t, n) => {
      const def = bank.find(d => d.id === t.id);
      if(!def) return;
      if(!t.level) return;                 // ticked but not yet said how much support
      const arr = def[t.level];
      if(!arr || !arr.length) return;
      add(n < 2 ? 1 : n < 5 ? 2 : 3, T(pick(arr, "task_" + t.id), s, { opt: t.opt ? T(t.opt, s) : "" }));
      /* keep the journey and how it was kept safe together */
      if(s.kind === "activity" && t.id === "travel")
        s.risk.filter(r => TRAVEL_RISK.includes(r))
              .forEach((r, i) => { add(i < 3 ? 2 : 3, T(pick(RISKBANK[r], "risk_" + r), s)); travelDone.push(r); });
    });
  }

  /* 5 OBSERVATION */
  if(s.kind === "eating"){
    if(s.ate && s.whatAte)      add(1, T("{S} ate " + s.ate.toLowerCase() + " of " + s.whatAte + ".", s));
    else if(s.ate)              add(1, T("{S} ate " + s.ate.toLowerCase() + " of the meal.", s));
    else if(s.whatAte)          add(1, T("{S} had " + s.whatAte + ".", s));
    if(s.drunk && s.offered)    add(1, T("{S} {vbe} offered " + s.offered + "ml and drank " + s.drunk + "ml" + (s.drinkChoice ? " of " + s.drinkChoice : "") + ".", s));
    else if(s.drunk)            add(1, T("{S} drank " + s.drunk + "ml" + (s.drinkChoice ? " of " + s.drinkChoice : "") + ".", s));
    else if(s.drinkChoice)      add(2, T("{S} chose " + s.drinkChoice + " to drink.", s));
    if(s.flags.includes("diabetes"))    add(2, T("Portion size and sugar content were discussed with {o} to support {p} Type 2 diabetes.", s));
    if(s.flags.includes("cholesterol")) add(2, T("A lower-fat option was prepared to support {p} cholesterol management.", s));
    if(s.flags.includes("choking") || s.flags.includes("softdiet"))
      add(2, T("Food was prepared to {p} agreed consistency and no coughing or difficulty swallowing was seen.", s));
  }
  if(s.kind === "personal" && s.skin && s.skin !== "none")
    add(s.skin === "concern" ? 1 : 2, T(pick(SKINBANK[s.skin], "skin"), s));
  if(s.kind === "activity")
    s.risk.filter(r => !travelDone.includes(r))
          .forEach((r, i) => add(i < 3 ? 2 : 3, T(pick(RISKBANK[r], "risk_" + r), s)));
  if(s.kind === "activity" && s.flags.includes("deaf") && !s.risk.includes("road"))
    add(2, T("Near roads staff gained {p} attention first, as {s} cannot hear approaching vehicles.", s));
  if(s.kind === "activity") s.learn.forEach((l, i) => add(i < 2 ? 1 : 2, T(pick(LEARNBANK[l], "learn_" + l), s)));
  if(s.mood.length) add(2, T(pick(MOODBANK[s.mood[0]], "mood"), s));
  s.well.forEach(w => add(w === "nochange" ? 3 : 2, T(pick(WELLBANK[w], "well_" + w), s)));

  /* free text, word for word */
  if(s.extra) add(1, s.extra.replace(/\s*$/, "").replace(/([^.!?])$/, "$1."));

  /* 6 OUTCOME */
  if(s.outcome) add(1, T(pick(OUTBANK[s.outcome], "out"), s));
  if(s.handover) add(1, T("Handed over: " + s.handover.replace(/\.?$/, "") + ".", s));

  return out.filter(Boolean).join(" ")
    .replace(/&mdash;/g, "\u2014").replace(/&amp;/g, "&")
    .replace(/\s+([.,])/g, "$1").replace(/ {2,}/g, " ").trim();
}

/* ============================================================
   Audit checks (the org's 7)
   ============================================================ */
function audit(s){
  const declined = s.resp === "declined" || s.resp === "delayed" || s.consent === "no";
  return [
    {ok: !!s.kind && !!s.slot,                    t:"Correct interaction selected", need:"the type of interaction", fix:"Pick the type of interaction in step 1."},
    {ok: !!s.resp && !!s.consent,                 t:"Choice, consent or response recorded", need:"their response and consent", fix:"Record their response and consent in step 2."},
    {ok: !!s.level && (s.tasks.some(t => t.level) || declined) && s.tasks.every(t => t.level),
     t:"Independence and support level clear",
     need: s.tasks.some(t => !t.level) ? "how much support on each task you ticked" : "what you supported in step 3",
     fix: s.tasks.some(t => !t.level)
       ? "One or more ticked tasks in step 3 still need a support level."
       : "Set the overall support level and tick what you supported in step 3."},
    {ok: s.mood.length > 0 || s.well.length > 0 || (s.kind==="personal" && !!s.skin) || (s.kind==="activity" && (s.risk.length > 0 || s.learn.length > 0)) || (s.kind==="eating" && (!!s.ate || !!s.drunk)),
                                                  t:"Relevant risk controls and observations included", need:"an observation", fix:"Add at least one observation in step 4."},
    {ok: !!s.outcome,                             t:"Meaningful outcome recorded", need:"how it ended for them", fix:"Choose an outcome in step 5."},
    {ok: !declined || !!s.declined,               t:"Refusal or non-engagement respected", need:"how you respected the refusal", fix:"Say what you did to respect the refusal in step 2."},
    {ok: $("attest").checked,                     t:"Entry reflects what actually happened",     fix:"Tick the confirmation under the note."}
  ];
}

/* similarity against the last saved note for this person + interaction */
function trigrams(t){
  const w = t.toLowerCase().replace(/[^a-z0-9 ]/g," ").split(/\s+/).filter(Boolean);
  const set = new Set();
  for(let i=0;i<w.length-2;i++) set.add(w[i]+" "+w[i+1]+" "+w[i+2]);
  return set;
}
function overlap(a, b){
  if(!a || !b) return null;
  const A = trigrams(a), B = trigrams(b);
  if(!A.size || !B.size) return null;
  let hit = 0;
  A.forEach(g => { if(B.has(g)) hit++; });
  return Math.round(100 * hit / new Set([...A, ...B]).size);
}

/* ============================================================
   Render
   ============================================================ */
let noteText = "";

function render(){
  document.dispatchEvent(new Event("gsn:sync"));
  syncVisibility(state());   // unhide this interaction's rows first...
  const s = state();         // ...then read them

  noteText = buildNote(s);

  const out = $("out");
  /* Show whatever has been answered so far. Requiring a response before
     showing anything meant a half-filled entry looked like a broken app. */
  const filled = noteText.trim().length > 0;
  out.textContent = filled ? noteText : "Fill in the steps and the note builds itself here.";
  out.classList.toggle("empty", !filled);

  const words = filled ? noteText.trim().split(/\s+/).length : 0;
  $("wc").textContent = words;
  $("sc").textContent = filled ? (noteText.match(/[.!?](\s|$)/g) || []).length : 0;
  $("dockWords").textContent = words;

  /* freshness */
  const prev = ((store.last||{})[histKey()]) || "";
  const ov = filled ? overlap(noteText, prev) : null;
  $("ov").textContent = ov === null ? "—" : ov + "%";
  const fresh = $("fresh");
  if(ov === null){ fresh.className = "badge ok"; fresh.textContent = "Fresh wording"; }
  else if(ov < 45){ fresh.className = "badge ok"; fresh.textContent = "Clearly different"; }
  else if(ov < 65){ fresh.className = "badge warn"; fresh.textContent = "Some repetition"; }
  else { fresh.className = "badge miss"; fresh.textContent = "Too close to last — reword"; }

  /* audit */
  const a = audit(s), passed = a.filter(x => x.ok).length;
  const missing = a.slice(0, 6).filter(x => !x.ok).map(x => x.need || x.t.toLowerCase());
  const needs = $("needs");
  if(filled && missing.length){
    needs.hidden = false;
    needs.innerHTML = "Still to add: <b>" + missing.join("</b>, <b>") + "</b>.";
  } else needs.hidden = true;
  $("audit").innerHTML = a.map(x =>
    '<li class="' + (x.ok ? "pass" : "fail") + '"><span class="mk">' + (x.ok ? "✓" : "!") + '</span>' +
    '<span>' + x.t + (x.ok ? "" : '<em>' + x.fix + '</em>') + '</span></li>').join("");
  const ab = $("auditBadge");
  ab.textContent = passed + " / 7";
  ab.className = "badge " + (passed === 7 ? "ok" : passed >= 5 ? "warn" : "miss");
  $("dockScore").textContent = passed + " / 7";

  /* record field mirror */
  renderFields(s);

  /* copy gate: the five content checks, plus the attestation */
  const contentOk = a.slice(0,6).every(x => x.ok);
  const ready = contentOk && $("attest").checked && filled;
  $("copy").disabled = !ready;
  $("dockCopy").disabled = !ready;
  $("why").textContent = ready ? "Ready to paste into the daily note box in your care system."
    : !filled ? "The note fills in as you answer the steps."
    : !contentOk ? "Clear the outstanding audit checks below before copying."
    : "Tick the confirmation above to unlock the copy button.";
}

function renderFields(s){
  let rows = [];
  const bank = TASKS[s.kind];
  const LVLTEXT = {ind:"Independent", prompt:"Prompted", part:"Assisted", full:"Full support", declined:"Declined"};

  if(s.kind === "personal" && s.consent) rows.push(["Consent to personal care obtained?", s.consent === "no" ? "No" : "Yes"]);
  s.tasks.forEach(t => {
    const def = bank.find(d => d.id === t.id);
    if(!def || def.nf === "Daily note" || !t.level) return;
    let v = LVLTEXT[t.level];
    if(t.id === "wash" && t.opt) v = cap(t.opt.replace(/^an? /, "")) + " — " + v;
    rows.push([def.nf, v]);
  });
  if(s.kind === "eating"){
    if(s.offerA && s.offerB) rows.push(["Choices Offered", "Yes"]);
    if(s.offerA || s.offerB) rows.push(["What choices were offered", [s.offerA, s.offerB].filter(Boolean).join(" / ")]);
    if(s.ate) rows.push(["Amount Eaten (%)", s.ate]);
    if(s.whatAte) rows.push(["What was eaten", s.whatAte]);
    if(s.offered) rows.push(["Amount offered (mls)", s.offered]);
    if(s.drunk){ rows.push(["Fluid intake (mls)", s.drunk]); rows.push(["Amount drunk (Mls)", s.drunk]); }
    if(s.drinkChoice) rows.push(["Drink choice", s.drinkChoice]);
  }
  if(s.kind === "personal" && s.skin === "concern") rows.push(["Body Map", "Record the new mark"]);
  if(s.handover) rows.push(["Handover", "Tick the handover box"]);

  /* two tasks can map to the same field (night clothes and dressing both set
     "Choice of clothing made?"); show that field once, not twice */
  const seen = new Map();
  rows.forEach(([k, v]) => {
    if(!seen.has(k)) seen.set(k, v);
    else if(seen.get(k) !== v) seen.set(k, seen.get(k) + " / " + v);
  });
  rows = [...seen.entries()];

  const el = $("nf");
  el.innerHTML = rows.length
    ? rows.map(r => '<div class="nf-row"><span>' + r[0] + '</span><span>' + r[1] + '</span></div>').join("")
    : '<div class="nf-empty">Tick the tasks in step 3 and the matching record fields appear here.</div>';
}

/* show only the fields that belong to this interaction */
function syncVisibility(s){
  document.querySelectorAll('#tasks .task').forEach(row => { row.hidden = row.dataset.kind !== s.kind; });
  $("intakeWrap").hidden = !(s.kind === "eating" && s.slot !== "fluids");
  $("fluidWrap").hidden  = !(s.kind === "eating");
  $("riskWrap").hidden   = s.kind !== "activity";
  $("skinWrap").hidden   = s.skin !== "concern";
  const college = s.kind === "activity" && s.setting === "college";
  $("settingWrap").hidden = s.kind !== "activity";
  $("settingHint").textContent = !s.kind ? "" : college
    ? "Already arranged, so nothing is offered today \u2014 record the journey, the support and what they gained."
    : "Offered today and chosen from the options \u2014 record the choice, the support and how it went.";
  $("offerWrap").hidden = college;
  $("sessionToWrap").hidden = !college;
  $("learnWrap").hidden = s.kind !== "activity";
  $("actOtherWrap").hidden = !(s.kind === "activity" && s.slot === "other" && !college);
  /* only offer responses that make sense here */
  const ctx = college ? "college" : "offer";
  [...RESP, ...RESP_COLLEGE].forEach(o => {
    const el = $("resp_" + o[0]) || $("respc_" + o[0]);
    if(!el) return;
    const sc = RESP_SCOPE[o[0]] || "all";
    const ok = sc === "all" || sc === ctx;
    el.closest(".chip").hidden = !ok;
    if(!ok && el.checked) el.checked = false;
  });
  $("declWrap").hidden   = !["declined","delayed","declinedgo","reluctant"].includes(s.resp) && s.consent !== "no";
  $("chosenWrap").hidden = !(s.resp === "choseA" || s.resp === "choseB");
  document.querySelector('#skin').closest('fieldset').hidden = s.kind !== "personal";
  $("taskHint").innerHTML = college
    ? "Tick <b>Travelling there</b> and <b>Taking part</b> \u2014 the journey and the session are what a college note has to evidence."
    : s.kind === "activity"
    ? "Tick <b>Taking part</b> at least &mdash; without it the note never says what they actually did. Anything left unticked is not mentioned."
    : "Each row maps to a field in your care records system. Anything left unticked is not mentioned in the note.";
  OUTCOME.forEach(o => {
    const sc = OUT_SCOPE[o[0]] || {};
    const ok = (!sc.kinds || sc.kinds.includes(s.kind)) && (!sc.slots || sc.slots.includes(s.slot));
    const input = $("outcome_" + o[0]);
    if(!input) return;
    input.closest(".chip").hidden = !ok;
    if(!ok && input.checked) input.checked = false;   // never leave a hidden answer selected
  });
}

/* ============================================================
   People on this shift \u2014 profiles keyed by initials, on this device only
   ============================================================ */
const dayLabel = d => (DAYS.find(x => x[0] === String(d)) || ["","that day"])[1];
const courseLabel = c => (COURSES.find(x => x[0] === c) || ["","the class"])[1].replace(/&amp;/g,"&");

/* ---------- the person's weekly college timetable ---------- */
function ttRow(r){
  r = r || {};
  return '<div class="ttrow">' +
    '<select class="tt-d" aria-label="Day">' + DAYS.map(d =>
      '<option value="' + d[0] + '"' + (String(r.d) === d[0] ? ' selected' : '') + '>' + d[1] + '</option>').join("") + '</select>' +
    '<select class="tt-c" aria-label="Course">' + COURSES.map(c =>
      '<option value="' + c[0] + '"' + (r.c === c[0] ? ' selected' : '') + '>' + c[1] + '</option>').join("") + '</select>' +
    '<input type="time" class="tt-from" aria-label="Starts" value="' + (r.from || "") + '">' +
    '<input type="time" class="tt-to" aria-label="Ends" value="' + (r.to || "") + '">' +
    '<button type="button" class="tt-x" aria-label="Remove this session">&times;</button></div>';
}
function renderTT(list){
  $("tt").innerHTML = (list || []).map(ttRow).join("");
}
function readTT(){
  return [...document.querySelectorAll("#tt .ttrow")].map(row => ({
    d: row.querySelector(".tt-d").value, c: row.querySelector(".tt-c").value,
    from: row.querySelector(".tt-from").value, to: row.querySelector(".tt-to").value
  })).filter(r => r.from);
}
$("ttAdd").addEventListener("click", () => {
  $("tt").insertAdjacentHTML("beforeend", ttRow({ d: String(new Date().getDay()) }));
  syncPerson();
});
$("tt").addEventListener("click", e => {
  if(e.target.classList.contains("tt-x")){ e.target.closest(".ttrow").remove(); syncPerson(); render(); }
});

/* pick out today's session so staff do not go hunting for it */
function applyTodaySession(){
  const hint = $("ttHint");
  if($("kind").value !== "activity" || (one("setting") || "community") !== "college"){ hint.hidden = true; return; }
  const pr = (store.people || {})[store.active];
  const tt = (pr && pr.timetable) || [];
  const now = new Date(), today = String(now.getDay()), mins = now.getHours() * 60 + now.getMinutes();
  const todays = tt.filter(x => x.d === today && x.c).sort((a, b) => toMins(a.from) - toMins(b.from));
  if(!todays.length){
    hint.hidden = false;
    hint.textContent = tt.length
      ? "No college session on " + dayLabel(today) + "'s timetable \u2014 choose the course below if there was one."
      : "No timetable saved for this person yet. Add their weekly sessions under The person and they will fill in here.";
    return;
  }
  /* the one happening now, else the one closest to now */
  const cur = todays.find(x => mins >= toMins(x.from) - 60 && mins <= toMins(x.to) + 120) || todays[0];
  $("slot").value = cur.c;
  if(cur.from) $("time").value = cur.from;
  if(cur.to)   $("sessionTo").value = cur.to;
  hint.hidden = false;
  hint.textContent = "From the timetable: " + dayLabel(today) + " " + cur.from +
    (cur.to ? "\u2013" + cur.to : "") + ", " + courseLabel(cur.c) + ". Change it if today ran differently.";
}

const PROFILE_FIELDS = ["initials","pronoun","ratio"];

function profileFromForm(){
  return { initials: $("initials").value.trim().toUpperCase(), pronoun: $("pronoun").value,
           ratio: $("ratio").value, comm: checked("comm"), flags: checked("flags"),
           timetable: readTT() };
}
function applyProfile(pr){
  $("initials").value = pr.initials || "";
  $("pronoun").value  = pr.pronoun  || "he";
  $("ratio").value    = pr.ratio    || "";
  document.querySelectorAll('#comm input, #flags input').forEach(i => { i.checked = false; });
  (pr.comm  || []).forEach(v => { const el = $("comm_"  + v); if(el) el.checked = true; });
  (pr.flags || []).forEach(v => { const el = $("flags_" + v); if(el) el.checked = true; });
  renderTT(pr.timetable);
}
/* keep the store in step with the form, renaming rather than duplicating
   when someone edits the initials of the person they are already on */
function syncPerson(){
  store.people = store.people || {};
  const pr = profileFromForm();
  if(!pr.initials){ return; }
  if(store.active && store.active !== pr.initials && store.people[store.active]){
    delete store.people[store.active];
  }
  store.people[pr.initials] = pr;
  store.active = pr.initials;
  save();
}
function loadPerson(name){
  const pr = (store.people || {})[name];
  if(!pr) return;
  store.active = name; save();
  applyProfile(pr);
  applyTodaySession();
  reseed();
  if(!one("setting")) $("setting_community").checked = true;
  renderPeople();
  render();
}
function newPerson(){
  store.active = null; save();
  applyProfile({ pronoun: "he" });
  renderPeople();
  render();
  $("initials").focus();
}
function removePerson(name){
  if(!(store.people || {})[name]) return;
  delete store.people[name];
  const left = Object.keys(store.people);
  store.active = left[0] || null;
  save();
  if(store.active) applyProfile(store.people[store.active]); else applyProfile({ pronoun: "he" });
  reseed(); renderPeople(); render();
}
function renderPeople(){
  const names = Object.keys(store.people || {}).sort();
  const el = $("people");
  el.innerHTML = names.map(n =>
      '<button type="button" class="pchip' + (n === store.active ? ' on' : '') + '" data-person="' + n + '">' +
      n + (n === store.active ? '<span class="x" data-remove="' + n + '" role="button" aria-label="Remove ' + n + '">&times;</span>' : '') +
      '</button>').join("") +
    '<button type="button" class="pchip add" data-new="1">+ Add person</button>';
  el.title = names.length ? "Tap a person to load their details" : "";
}
$("people").addEventListener("click", e => {
  const rm = e.target.closest("[data-remove]");
  if(rm){ e.stopPropagation(); removePerson(rm.getAttribute("data-remove")); return; }
  const add = e.target.closest("[data-new]");
  if(add){ newPerson(); return; }
  const chip = e.target.closest("[data-person]");
  if(chip) loadPerson(chip.getAttribute("data-person"));
});

/* ============================================================
   Build the DOM bits that come from data
   ============================================================ */
function chips(id, list, type){
  $(id).innerHTML = list.map((o,i) =>
    '<label class="chip"><input type="' + type + '" name="' + id + '" value="' + o[0] + '" id="' + id + '_' + o[0] + '"><span>' + o[1] + '</span></label>'
  ).join("");
}
chips("comm", COMM, "checkbox");
chips("flags", FLAGS, "checkbox");
chips("resp", RESP, "radio");
chips("how", HOW, "checkbox");
chips("consent", CONSENT, "radio");
chips("skin", SKIN, "radio");
chips("mood", MOOD, "checkbox");
chips("well", WELL, "checkbox");
chips("risk", RISK, "checkbox");
chips("outcome", OUTCOME, "radio");
chips("setting", ACT_SETTING, "radio");
chips("learn", LEARN, "checkbox");
chips("respc", RESP_COLLEGE, "radio");

function buildTasks(){
  let html = "";
  for(const kind in TASKS){
    TASKS[kind].forEach(t => {
      const optSel = t.opts
        ? '<select class="opt" id="opt_' + kind + '_' + t.id + '" aria-label="Detail for ' + t.label + '">' +
          t.opts.map(o => '<option value="' + o + '">' + o.replace(/\{p\}/g, "their") + '</option>').join("") + '</select>'
        : "";
      html += '<div class="task" data-kind="' + kind + '" hidden>' +
        '<label class="tl" for="t_' + kind + '_' + t.id + '"><input type="checkbox" id="t_' + kind + '_' + t.id + '" value="' + t.id + '">' +
        '<span><b>' + t.label + '</b><span class="nf">' + t.nf + '</span></span></label>' +
        '<div class="ctl">' + optSel +
        '<select class="lvl" id="lvl_' + kind + '_' + t.id + '" aria-label="Support level for ' + t.label + '">' +
        LEVELS.map(l => '<option value="' + l[0] + '">' + l[1] + '</option>').join("") + '</select></div></div>';
    });
  }
  $("tasks").innerHTML = html;
  document.querySelectorAll('#tasks .task').forEach(row => {
    const box = row.querySelector('input[type=checkbox]');
    const lvl = row.querySelector("select.lvl");
    const sync = () => {
      const need = box.checked && lvl && !lvl.value;
      row.classList.toggle("on", box.checked && !need);
      row.classList.toggle("needlvl", need);
    };
    box.addEventListener("change", sync);
    if(lvl) lvl.addEventListener("change", sync);
    document.addEventListener("gsn:sync", sync);
    sync();
  });
}
buildTasks();

/* Everything below the person belongs to ONE interaction. Carrying it across
   produced notes like "offered the cooking ... he chose a shower", so switching
   type clears the entry and says so. */
const SCOPED_TEXT = ["offerA","offerB","chosen","declined","whatAte","drinkChoice",
                     "offered","drunk","skinDetail","extra","handover","actOther"];
const SCOPED_CHIPS = ["resp","how","consent","skin","mood","well","risk","outcome"];

function resetInteraction(){
  SCOPED_TEXT.forEach(id => { $(id).value = ""; });
  SCOPED_CHIPS.forEach(g => document.querySelectorAll('#'+g+' input').forEach(i => { i.checked = false; }));
  $("ate").value = ""; $("level").value = "";
  document.querySelectorAll('#tasks .task').forEach(row => {
    const box = row.querySelector('input[type=checkbox]');
    box.checked = false; row.classList.remove("on");
    const lvl = row.querySelector('select.lvl'); if(lvl) lvl.value = "";
  });
  lastActPhrase = "";
  flash("Switched interaction \u2014 the previous entry was cleared.");
}

let flashTimer = null;
function flash(msg){
  const el = $("switchNote");
  el.textContent = msg; el.hidden = false;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { el.hidden = true; }, 5000);
}

/* ---------- 2. picking an activity fills the offer in for you ---------- */
let lastActPhrase = "";
function prefillActivity(){
  if($("kind").value !== "activity"){ lastActPhrase = ""; return; }
  if((one("setting") || "community") === "college"){ lastActPhrase = ""; return; }
  const phrase = T(actPhrase(state(), 2), state());
  const a = $("offerA");
  if(!a.value.trim() || a.value.trim() === lastActPhrase) a.value = phrase;
  const resp = (document.querySelector('#resp input:checked')||{}).value;
  const c = $("chosen");
  if(resp === "choseA" && (!c.value.trim() || c.value.trim() === lastActPhrase)) c.value = phrase;
  lastActPhrase = phrase;
}

function fillSlots(){
  const k = $("kind").value;
  const keep = $("slot").value;            // a browser restoring the form on reload
  const college = k === "activity" && (one("setting") || "community") === "college";
  const list = college ? COURSES.map(c => [c[0], c[1]]) : SLOTS[k];
  $("slot").innerHTML = list.map(o => '<option value="' + o[0] + '">' + o[1] + '</option>').join("");
  if(keep && [...$("slot").options].some(o => o.value === keep)) $("slot").value = keep;
  $("slotWrap").querySelector("label").textContent =
    college ? "Course" : k === "activity" ? "Activity" : k === "eating" ? "Which meal" : "Which one";
  document.querySelector('label[for="offerA"]').textContent =
    k === "activity" ? "Activity offered" : k === "eating" ? "Meal offered" : "Option offered";
  document.querySelector('label[for="offerB"]').textContent =
    k === "activity" ? "Other activity offered" : k === "eating" ? "Other meal offered" : "Second option offered";
}
fillSlots();

/* ============================================================
   Wiring
   ============================================================ */
const PERSON_INPUTS = new Set(["initials","pronoun","ratio"]);
function onEdit(e){
  const t = e.target;
  const isPerson = PERSON_INPUTS.has(t.id) || t.closest("#comm") || t.closest("#flags");
  if(isPerson){ syncPerson(); renderPeople(); }
  if(isPerson || t.id === "kind" || t.id === "slot") reseed();
  render();
}
document.addEventListener("input", e => { if(e.target.id === "actOther") prefillActivity(); onEdit(e); });
document.addEventListener("change", e => {
  if(e.target.id === "kind"){ fillSlots(); resetInteraction(); prefillActivity(); applyTodaySession(); }
  if(e.target.closest && e.target.closest("#tt")){ syncPerson(); }
  if(e.target.closest && e.target.closest("#setting")){ fillSlots(); prefillActivity(); applyTodaySession(); }
  if(e.target.id === "slot" || e.target.id === "actOther") prefillActivity();
  onEdit(e);
});

$("reword").addEventListener("click", () => {
  onScreen = Object.assign({}, chosenIdx);
  salt = Math.floor(Math.random() * 1e9);
  render();
  onScreen = {};
});

function doCopy(){
  const txt = noteText;
  const done = () => {
    commitHistory();
    store.last = store.last || {};
    store.last[histKey()] = txt;
    syncPerson();
    salt = Math.floor(Math.random() * 1e9);
    const b = $("copy"), d = $("dockCopy"), old = b.textContent;
    b.textContent = "Copied"; d.textContent = "Copied";
    setTimeout(() => { b.textContent = old; d.textContent = "Copy"; }, 1600);
    render();
  };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(done, fallback);
  } else fallback();
  function fallback(){
    const ta = document.createElement("textarea");
    ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try{ document.execCommand("copy"); }catch(e){}
    document.body.removeChild(ta); done();
  }
}
$("copy").addEventListener("click", doCopy);
$("dockCopy").addEventListener("click", doCopy);
$("dockJump").addEventListener("click", () => $("out").scrollIntoView({behavior:"smooth", block:"center"}));

$("theme").addEventListener("click", () => {
  const cur = document.documentElement.getAttribute("data-theme");
  const dark = cur ? cur === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.setAttribute("data-theme", dark ? "light" : "dark");
});

/* restore the person from last time, and open on a realistic worked example */
(function boot(){
  store.device = store.device || (Math.random().toString(36).slice(2) + Date.now().toString(36));
  store.people = store.people || {};
  /* carry over the single person remembered by earlier versions */
  if(store.person && store.person.initials && !store.people[store.person.initials]){
    store.people[store.person.initials] = store.person;
    store.active = store.active || store.person.initials;
    delete store.person;
  }
  save();

  const first = store.active && store.people[store.active] ? store.people[store.active]
              : store.people[Object.keys(store.people)[0]];
  if(first){
    store.active = first.initials;
    applyProfile(first);
  } else {
    /* example entry, so the page opens showing what it does */
    $("initials").value = "MA";
    $("comm_verbal").checked = true;
    $("flags_skin").checked = true;
    $("time").value = "08:00";
    $("offerA").value = "a shower";
    $("offerB").value = "a strip wash";
    $("resp_choseA").checked = true;
    $("chosen").value = "a shower";
    $("how_said").checked = true;
    $("consent_yes").checked = true;
    $("level").value = "min";
    ["wash","oral","shave","dress"].forEach(id => {
      const box = $("t_personal_" + id); if(box){ box.checked = true; box.dispatchEvent(new Event("change")); }
    });
    $("lvl_personal_wash").value = "part";
    $("lvl_personal_oral").value = "prompt";
    $("lvl_personal_shave").value = "part";
    $("lvl_personal_dress").value = "prompt";
    $("skin_clear").checked = true;
    $("mood_settled").checked = true;
    $("well_nochange").checked = true;
    $("outcome_ready").checked = true;
    syncPerson();
  }
  renderPeople();
  if(!$("time").value){
    const d = new Date();
    $("time").value = String(d.getHours()).padStart(2,"0") + ":" + String(d.getMinutes()).padStart(2,"0");
  }
  /* the browser can restore the selects on reload without firing a change
     event, which left the labels and the prefill out of step */
  fillSlots();
  prefillActivity();

  /* open on the shift that matches the clock */
  const hr = new Date().getHours();
  if($("kind").value === "personal" && !store.active)
    $("slot").value = hr >= 20 || hr < 6 ? "night" : hr >= 14 ? "pm" : "am";
  reseed();
  render();

  /* self-check: every choice on screen must have a phrase bank behind it */
  [[RESP,RESPBANK,"RESP"],[HOW,HOWBANK,"HOW"],[CONSENT,CONSENTBANK,"CONSENT"],
   [SKIN,SKINBANK,"SKIN"],[MOOD,MOODBANK,"MOOD"],[WELL,WELLBANK,"WELL"],
   [RISK,RISKBANK,"RISK"],[OUTCOME,OUTBANK,"OUTCOME"],[COMM,COMMBANK,"COMM"]]
  .forEach(([opts, bank, name]) => opts.forEach(o => {
    if(o[0] === "none" || o[0] === "noresp") return;
    if(!bank[o[0]] || !bank[o[0]].length) console.warn("No wording for " + name + "." + o[0]);
  }));
  TASKS.personal.concat(TASKS.eating, TASKS.activity).forEach(t =>
    LEVELS.forEach(l => { if(!t[l[0]] || !t[l[0]].length) console.warn("No wording for task " + t.id + "." + l[0]); }));

  if("serviceWorker" in navigator && location.protocol === "https:")
    navigator.serviceWorker.register("sw.js").catch(() => {});
})();
