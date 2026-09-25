/* ============================================================
   Care Note Builder
   A phrase-bank daily-note builder for any care setting. No network,
   no model, no storage beyond this browser. Every sentence traces to
   a ticked input. The field names in TASKS[].nf match the dropdowns
   most care record systems use; edit them to match yours.
   ============================================================ */
"use strict";

const { cap, hashStr, toMins, esc } = GSN.core;
const {
  COMM, FLAGS, RESP, HOW, CONSENT, SKIN, MOOD, WELL, RISK, OUTCOME, OUT_SCOPE, SLOTS, LEVELS, TASKS, ACT_SETTING,
  COURSES, RESP_COLLEGE, RESP_SCOPE, LEARN, COMMBANK, RESPBANK, HOWBANK, CONSENTBANK, SKINBANK, MOODBANK,
  WELLBANK, RISKBANK, OUTBANK, DAYS, DIGNITY, CONT_OBS, SLEEP_OBS, BEHAVIOUR, FOLLOWUP, STAFFING, RISK_SCOPE,
  JOURNEY, DURING, ACT_INFO, ENJOY, BENEFIT
} = GSN.data;
const { PROFILE_SECTIONS, normalizeProfile, contextSummary } = GSN.profiles;

const $  = id => document.getElementById(id);

/* ============================================================
   State + persistence (this browser only)
   ============================================================ */
const KEY = "gsn.v1";
let store = {};
try { store = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch(e){ store = {}; }
const save = () => { try{ localStorage.setItem(KEY, JSON.stringify(store)); }catch(e){} };

/* The provider's settings, checked again on every load - storage can be
   edited by hand - then laid over the built-in lists before the page builds
   a single choice from them. */
store.config = GSN.validation.validateConfig(store.config || {}).value;
const CONFIG = GSN.config.apply(store.config);
const RULES = GSN.rules.CARE_RULES.concat(CONFIG.customRules);
const careSystem = () => CONFIG.terms.careSystem && CONFIG.terms.careSystem !== "care system" ? CONFIG.terms.careSystem : "your care system";

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
  onScreen = {};
}

function histKey(){ return (state().initials||"_") + "|" + $("kind").value; }

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
    initials: GSN.profiles.cleanInitials($("initials").value.trim()),
    pronoun:  $("pronoun").value,
    ratio:    $("ratio").value,
    comm:     checked("comm"),
    flags:    checked("flags"),
    kind:     $("kind").value,
    slot:     $("slot").value,
    setting:  one("setting") || "community",
    sessionTo: $("sessionTo").value,
    learn:    checked("learn"),
    during:   checked("during"),
    enjoy:    one("enjoy"),
    benefit:  checked("benefit"),
    actOther: $("actOther").value.trim(),
    len:      $("len").value,
    time:     $("time").value,
    staffing: $("staffing").value,
    commUsed: checked("commUsed"),
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
    dignity:  checked("dignity"),
    contObs:  checked("contObs"),
    sleepObs: checked("sleepObs"),
    behaviour: checked("behaviour"),
    behaviourOther: $("behaviourOther").value.trim(),
    followup: checked("followup"),
    prompts:  Object.assign({}, promptAnswers),
    outcome:  one("outcome"),
    extra:    $("extra").value.trim(),
    handover: $("handover").value.trim(),
    attest:   $("attest").checked
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

/* ============================================================
   History on this device (optional, off until switched on)
   ============================================================ */
let historyCache = {};         // initials -> saved records, loaded when a person is opened
const newRecordId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
let recordId = newRecordId();  // the next entry to be saved
let lastSaved = null;          // { id, sig } of what the last copy saved
const recordSig = rec => JSON.stringify(Object.assign({}, rec, { id: "", savedAt: "" }));
/* Copying the same entry again updates its record rather than adding a second;
   anything different - the next drink, say - is a new record of its own. */
function entryId(s){
  if(lastSaved && recordSig(GSN.patterns.toRecord(s, { id: "" })) === lastSaved.sig) return lastSaved.id;
  return recordId;
}
const historyOn = () => !!(store.config && store.config.history && store.config.history.enabled);
const windowDays = () => (store.config && store.config.history && store.config.history.windowDays) || 14;

function loadHistory(person){
  if(!historyOn() || !person || historyCache[person]) return;
  historyCache[person] = [];
  GSN.storage.history.byPerson(person)
    .then(rs => { historyCache[person] = rs || []; render(); })
    .catch(() => { historyCache[person] = []; });
}

/* ============================================================
   Building the note - the wording lives in narrative.js
   ============================================================ */
let lastBuild = null;          // sentences + sources of the note on screen
let lastState = null;          // the state it was built from

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

  const profile = profileFromForm();
  loadHistory(s.initials);
  const { sa, s: built, note } = GSN.narrative.compose({ s, profile, explanations,
      history: historyOn() ? (historyCache[s.initials] || []) : null, recordId: entryId(s), now: new Date(), windowDays: windowDays(),
      rules: RULES, language: CONFIG.language, auditOptional: CONFIG.audit.optional, auditExtra: CONFIG.audit.extra },
    { salt, hist: ((store.hist || {})[histKey()]) || {}, avoid: onScreen, terms: CONFIG.terms, layout: CONFIG.noteLayout });
  /* an answer belongs to the question as it was asked; if the question has
     since changed (say the profile's mobility aid was edited), the answer goes */
  const stale = [];
  sa.rules.forEach(r => r.prompts.forEach(p => { if(p.answer && promptAsked[p.key] && promptAsked[p.key] !== p.text) stale.push(p.key); }));
  if(stale.length){ stale.forEach(k => { delete promptAnswers[k]; delete promptAsked[k]; }); return render(); }
  chosenIdx = note.chosen;
  lastBuild = note; lastState = built;
  noteText = note.text;

  const out = $("out");
  /* Show whatever has been answered so far. Requiring a response before
     showing anything meant a half-filled entry looked like a broken app. */
  const filled = noteText.trim().length > 0;
  out.textContent = filled ? noteText : "Fill in the steps and the note builds itself here.";
  out.classList.toggle("empty", !filled);

  /* the pasted note is the record, so a length that drops something staff
     ticked says so - with a one-tap way to put it back */
  const left = note.omitted.length;
  $("omit").hidden = !left;
  if(left) setText($("omitText"), "This length leaves out " + left + (left === 1 ? " thing" : " things") +
    " you recorded (" + note.omitted.map(omittedLabel).join(", ") + ").");

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
  const a = sa.audit, passed = sa.auditPassed;
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

  renderSmartAssist(sa);
  renderPrompts(sa.rules, s.initials);
  renderProvenance();
  renderPatterns(built, profile);
  renderSuggest(s);
  renderCollegeHint(s, profile);
  renderContext(profile);

  /* record field mirror */
  renderFields(s);

  /* copy gate: the content checks, no unexplained inconsistency, and the attestation */
  const contentOk = sa.contentOk;
  const ready = contentOk && !sa.blocking && $("attest").checked && filled;
  $("copy").disabled = !ready;
  $("dockCopy").disabled = !ready;
  setText($("why"), ready ? "Ready to paste into the daily note box in " + careSystem() + "."
    : !filled ? "The note fills in as you answer the steps."
    : !contentOk ? "Clear the outstanding audit checks in Smart Assist before copying."
    : sa.requiredMissing ? "Complete what Smart Assist marks as required before copying."
    : sa.blocking ? "Correct or explain the inconsistency flagged in Smart Assist before copying."
    : "Tick the confirmation above to unlock the copy button.");
}

/* ============================================================
   The person's recent pattern, from this device's history
   ============================================================ */
let patSig = "";
function renderPatterns(s, profile){
  const P = GSN.patterns, on = historyOn() && !!s.initials;
  const recs = on ? (historyCache[s.initials] || []) : [];
  const ft = $("fluidToday");
  ft.hidden = !(s.kind === "eating" && (on || profile.fluidTarget));
  if(!ft.hidden){
    const t = on ? P.fluidToday(recs, P.toRecord(s, { id: entryId(s) })) : null;
    setText(ft, on ? "Recorded today on this device: " + t.total + " ml" + (profile.fluidTarget ? " of the " + profile.fluidTarget + " ml target" : "") + "."
                   : "Turn on history in Settings & data to count today\u2019s drinks against the " + profile.fluidTarget + " ml target.");
  }
  $("patCard").hidden = !on;
  if(!on) return;
  const sig = s.initials + "|" + windowDays() + "|" + recs.map(r => r.id + r.savedAt).join(",");
  if(sig === patSig) return;
  patSig = sig;
  const b = P.baseline(recs, { windowDays: windowDays() });
  setText($("patWindow"), "Last " + b.windowDays + " days");
  const lines = [];
  if(b.food.meals) lines.push("Food: usually about " + b.food.avgPct + "% of a meal (" + b.food.meals + " meals)");
  if(b.fluid.days) lines.push("Fluids: about " + b.fluid.avgDaily.toLocaleString("en-GB") + " ml a day (" + b.fluid.days + " days)");
  if(b.participation.activities) lines.push("Activities: took part in " + (b.participation.activities - b.participation.declined) + " of " + b.participation.activities);
  if(b.sleep.nights) lines.push("Sleep: unsettled or poor on " + b.sleep.unsettled + " of " + b.sleep.nights + " nights");
  Object.keys(b.support).slice(0, 4).forEach(id => {
    const m = b.support[id], kind = (recs.find(r => r.tasks.some(t => t.id === id)) || {}).kind;
    lines.push(GSN.rules.taskLabel(kind, id) + ": usually " + GSN.quality.LEVEL_PHRASE[m.value] + " (" + m.count + " of " + m.of + ")");
  });
  const latest = recs.slice().sort((a, c) => (c.date + c.time).localeCompare(a.date + a.time)).slice(0, 12);
  $("patBody").innerHTML =
    (b.records < GSN.patterns.MIN_FOR_BASELINE ? '<p>Not enough history yet to show a usual pattern (' + b.records + ' record' + (b.records === 1 ? '' : 's') + ' in this window). Keep copying notes and it will build up.</p>' : "") +
    (lines.length ? '<ul>' + lines.map(l => '<li>' + esc(l) + '</li>').join("") + '</ul>' : "") +
    (latest.length ? '<details><summary>Saved records for ' + esc(s.initials) + ' (' + recs.length + ')</summary><ul class="recs">' +
      latest.map(r => '<li><span>' + esc(r.date + " " + r.time + " \u00b7 " + r.kind + " \u00b7 " + r.slot) + '</span>' +
        '<button type="button" data-del="' + esc(r.id) + '" aria-label="Delete the record from ' + esc(r.date + " " + r.time) + '">Delete</button></li>').join("") +
      '</ul></details>' : "");
}
$("patBody").addEventListener("click", e => {
  const b = e.target.closest("[data-del]");
  if(!b || !confirm("Delete this saved record? This cannot be undone.")) return;
  const person = state().initials;
  GSN.storage.history.remove(b.dataset.del).then(() => {
    historyCache[person] = (historyCache[person] || []).filter(r => r.id !== b.dataset.del);
    patSig = ""; render();
  });
});

/* ============================================================
   "Suggest this as a tick option" - how the tick options grow from real use.
   A staff member offers one of their own sentences; it is kept on this device,
   as a template with the person's initials and pronouns replaced, until a
   manager adds it under Settings & data or removes it. Nothing is stored
   unless the button is pressed.
   ============================================================ */
let suggestSig = "";
function renderSuggest(s){
  const box = $("suggestBox");
  const sents = GSN.match.sentences(s.extra).filter(t => t.split(/\s+/).length >= 3);
  const sig = sents.join("\u0001");
  if(sig !== suggestSig){
    suggestSig = sig;
    const short = t => t.length > 48 ? t.slice(0, 45).replace(/\s+\S*$/, "") + "\u2026" : t;
    box.innerHTML = sents.length ? '<span>Useful as a tick option next time?</span>' +
      sents.map((t, i) => '<button type="button" class="tog" data-suggest="' + i + '">Suggest \u201c' + esc(short(t)) + '\u201d</button>').join("") : "";
    $("suggestMsg").hidden = true;
  }
  box.hidden = !sents.length;
}
$("suggestBox").addEventListener("click", e => {
  const b = e.target.closest("[data-suggest]");
  if(!b) return;
  const s = state();
  const sents = GSN.match.sentences(s.extra).filter(t => t.split(/\s+/).length >= 3);
  const text = sents[Number(b.dataset.suggest)];
  if(!text) return;
  const sg = GSN.match.suggestion(text, GSN.rules.facts({ s, profile: profileFromForm() }));
  store.config.suggestions = (store.config.suggestions || []).concat([sg]);
  save();
  b.disabled = true; b.textContent = "Suggested";
  const msg = $("suggestMsg");
  msg.hidden = false;
  setText(msg, "Thank you. A manager can add \u201c" + sg.label + "\u201d as a tick option under Settings & data \u2192 Observations. Your note is unchanged.");
});

/* ============================================================
   Questions from the person's profile
   ============================================================ */
let promptAnswers = {};        // "rule.prompt" -> "yes" | "no"
let promptAsked = {};          // "rule.prompt" -> the question as it read when answered
let promptSig = "";

/* Rebuilt only when the set of questions changes, so an answer in progress
   is never wiped; otherwise just the pressed state is brought up to date. */
function renderPrompts(rules, initials){
  const box = $("prompts");
  const withQs = rules.filter(r => r.prompts.length);
  const sig = withQs.map(r => r.id + ":" + r.prompts.map(p => p.key + "=" + p.text).join(",")).join("|");
  if(sig !== promptSig){
    promptSig = sig;
    box.innerHTML = withQs.length ? '<h3>Questions for ' + esc(initials || "this person") + '</h3>' +
      '<p>Raised by ' + (initials ? esc(initials) + "&rsquo;s" : "their") + ' profile. Answer only what you know &mdash; nothing is written until you do, and a question left alone adds nothing.</p>' +
      withQs.map(r => '<div class="pgroup"><h4>' + esc(r.title) + '</h4><p class="preason">Why: ' + esc(r.reason) + '</p>' +
        r.prompts.map(p => {
          const qid = "pq_" + p.key.replace(/\W/g, "_");
          return '<div class="prow" role="group" aria-labelledby="' + qid + '"><span id="' + qid + '">' + esc(p.text) + '</span>' +
            '<span class="pbtns">' + ["yes", "no"].map(a =>
              '<button type="button" class="pbtn" data-key="' + esc(p.key) + '" data-ans="' + a + '" aria-pressed="false">' + (a === "yes" ? "Yes" : "No") + '</button>').join("") +
            '</span></div>';
        }).join("") + '</div>').join("") : "";
  }
  box.hidden = !withQs.length;
  box.querySelectorAll(".pbtn").forEach(b => b.setAttribute("aria-pressed", promptAnswers[b.dataset.key] === b.dataset.ans ? "true" : "false"));
}
$("prompts").addEventListener("click", e => {
  const b = e.target.closest(".pbtn");
  if(!b) return;
  const k = b.dataset.key;
  /* pressing the chosen answer again takes it back */
  promptAnswers[k] = promptAnswers[k] === b.dataset.ans ? "" : b.dataset.ans;
  promptAsked[k] = b.closest(".prow").querySelector("span").textContent;
  render();
});

function renderContext(profile){
  const items = contextSummary(profile, FLAGS).concat(CONFIG.customProfileFields
    .filter(f => profile.custom[f.id]).map(f => f.label + ": " + profile.custom[f.id]));
  const el = $("ctxLine");
  el.hidden = !items.length || !profile.initials;
  const html = '<b>From ' + esc(profile.initials) + '&rsquo;s profile</b>' + items.map(t => '<span>' + esc(t) + '</span>').join("");
  if(el.innerHTML !== html) el.innerHTML = html;
  /* the person's usual ways of communicating, marked and one tap away */
  const usual = profile.comm || [];
  document.querySelectorAll("#commUsed .chip").forEach(ch => {
    const v = ch.querySelector("input").value, span = ch.querySelector("span");
    const want = GSN.core.plain((COMM.find(c => c[0] === v) || ["", ""])[1]) + (usual.includes(v) ? " (usual)" : "");
    setText(span, want);
  });
  const btn = $("commUsual");
  btn.hidden = !usual.length || usual.every(v => $("commUsed_" + v) && $("commUsed_" + v).checked);
  btn.textContent = "Used " + (profile.initials || "their") + (profile.initials ? "\u2019s" : "") + " usual methods";
}
$("commUsual").addEventListener("click", () => {
  (profileFromForm().comm || []).forEach(v => { const el = $("commUsed_" + v); if(el) el.checked = true; });
  render();
});

/* ============================================================
   Smart Assist panel
   ============================================================ */
let explanations = {};         // contradiction id -> what the staff member wrote
let saOpen = false;            // "show more" expanded
const SA_VISIBLE = 6;

/* Findings are patched in place by id rather than redrawn, so an open
   "Why am I seeing this?" or a half-typed explanation survives each keystroke. */
function renderSmartAssist(sa){
  const SEV = GSN.smartAssist.SEVERITY;
  const list = $("saList");
  const focusInside = list.contains(document.activeElement);
  const have = new Map([...list.children].map(li => [li.dataset.id, li]));
  let prev = null;
  sa.items.forEach((f, i) => {
    let li = have.get(f.id);
    if(!li){ li = saItem(f); have.set(f.id, li); }
    const sev = f.explained ? "explained" : f.severity;
    li.className = "sa-item sev-" + sev;
    setText(li.querySelector(".sa-ic"), f.explained ? "\u2713" : SEV[f.severity].icon);
    setText(li.querySelector(".sa-lab"), f.explained ? "Explained" : SEV[f.severity].label);
    setText(li.querySelector(".sa-title"), f.title);
    setText(li.querySelector(".sa-reason"), f.reason);
    li.querySelector(".sa-go").hidden = !findField((f.fields || [])[0]);
    li.querySelector(".sa-go").dataset.field = (f.fields || [])[0] || "";
    li.querySelector(".sa-ho").hidden = !f.handover;
    li.querySelector(".sa-ho").dataset.text = f.handover || "";
    li.querySelector(".sa-tick").hidden = !f.tick;
    li.querySelector(".sa-tick").dataset.tick = f.tick || "";
    li.hidden = !saOpen && i >= SA_VISIBLE;
    if(!focusInside){
      const want = prev ? prev.nextSibling : list.firstChild;
      if(want !== li) list.insertBefore(li, want);
    } else if(!li.parentNode) list.appendChild(li);
    prev = li;
  });
  const live = new Set(sa.items.map(f => f.id));
  have.forEach((li, id) => { if(!live.has(id) && !li.contains(document.activeElement)) li.remove(); });

  const extra = sa.items.length - SA_VISIBLE;
  $("saMore").hidden = extra <= 0;
  $("saMore").textContent = saOpen ? "Show fewer" : "Show " + extra + " more";
  $("saMore").setAttribute("aria-expanded", saOpen ? "true" : "false");

  const c = sa.counts, parts = [];
  if(c.critical) parts.push(c.critical + " critical");
  if(c.review) parts.push(c.review + " to review");
  if(c.missing) parts.push(c.missing + " missing");
  if(c.suggestion) parts.push(c.suggestion + (c.suggestion === 1 ? " suggestion" : " suggestions"));
  if(c.explained) parts.push(c.explained + " explained");
  setText($("saSum"), parts.length ? parts.join(" \u00b7 ") : "Nothing needs your attention.");
  $("dockReview").textContent = c.critical + c.review ? " \u00b7 " + (c.critical + c.review) + " to review" : "";

  /* independence evidence */
  const ind = sa.independence, box = $("saInd");
  box.hidden = !ind.total;
  if(ind.total){
    const own = ind.by.ind.concat(ind.by.prompt, ind.by.min);
    box.innerHTML = '<h3>Independence evidence</h3><ul>' + ind.lines.map(l => '<li>' + esc(l) + '</li>').join("") + '</ul>' +
      (own.length ? '<p>What ' + esc(state().initials || "they") + ' did: <b>' + esc(own.join(", ")) + '</b></p>' : "");
  }

  $("saPass").innerHTML = sa.passes.map(p => '<li><span aria-hidden="true">\u2713</span> ' + esc(p) + '</li>').join("");
  $("saStrength").hidden = !sa.strengths;
  setText($("saStrength"), sa.strengths);

  /* choices a rule points to are marked on the form, with the reason on hover */
  document.querySelectorAll(".chip.sug").forEach(ch => { ch.classList.remove("sug"); ch.removeAttribute("title"); });
  sa.rules.forEach(r => r.highlight.forEach(h => {
    const el = $(h.replace(".", "_"));
    if(el && el.closest(".chip")){ el.closest(".chip").classList.add("sug"); el.closest(".chip").title = r.reason; }
  }));
}

function saItem(f){
  const li = document.createElement("li");
  li.dataset.id = f.id;
  li.innerHTML =
    '<span class="sa-sev"><span class="sa-ic" aria-hidden="true"></span><span class="sa-lab"></span></span>' +
    '<div class="sa-body"><p class="sa-title"></p>' +
    '<details class="sa-why"><summary>Why am I seeing this?</summary><p class="sa-reason"></p></details>' +
    '<div class="sa-acts"><button type="button" class="sa-go">Show me</button>' +
    '<button type="button" class="sa-ho" hidden>Add to handover</button>' +
    '<button type="button" class="sa-tick" hidden>Tick it</button>' +
    (f.explain ? '<button type="button" class="sa-exp-btn" aria-expanded="false">Explain</button>' : "") + '</div>' +
    (f.explain ? '<div class="sa-explain" hidden><label for="exp_' + f.explain + '">Explain what happened (added to the note word for word)</label>' +
                 '<textarea id="exp_' + f.explain + '" data-explain="' + f.explain + '" rows="2"></textarea></div>' : "") +
    '</div>';
  if(f.explain && explanations[f.explain]){
    li.querySelector("textarea").value = explanations[f.explain];
    li.querySelector(".sa-explain").hidden = false;
  }
  return li;
}

const setText = (el, t) => { if(el && el.textContent !== t) el.textContent = t; };

/* which numbered step a field lives in, so a finding can point staff there */
const STEP_OF = { kind: 1, slot: 1, time: 1, staffing: 1, commUsed: 1, offerA: 1, offerB: 1, setting: 1, sessionTo: 1, actOther: 1,
  resp: 2, how: 2, consent: 2, chosen: 2, declined: 2, level: 3, tasks: 3,
  mood: 4, well: 4, risk: 4, dignity: 4, contObs: 4, sleepObs: 4, skin: 4, skinDetail: 4, learn: 4, during: 4, behaviour: 4, behaviourOther: 4,
  ate: 4, whatAte: 4, drunk: 4, offered: 4, drinkChoice: 4, prompt: 4, outcome: 5, extra: 5, handover: 5, followup: 5, enjoy: 5, benefit: 5,
  tt: 0, comm: 0, flags: 0, initials: 0 };
function stepOf(field){
  if(!field) return -1;
  const k = field.split(/[.:]/)[0];
  return k in STEP_OF ? STEP_OF[k] : -1;
}
let hlTimer = null;
function goToStep(n){
  const step = document.querySelectorAll("main .step")[n];   // the person's card is index 0
  if(!step) return;
  step.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  document.querySelectorAll(".step.hl").forEach(x => x.classList.remove("hl"));
  step.classList.add("hl");
  clearTimeout(hlTimer);
  hlTimer = setTimeout(() => step.classList.remove("hl"), 2200);
}

/* the input to jump to for a field name used by the engines */
function findField(name){
  if(!name) return null;
  const k = $("kind").value;
  const m = /^tasks\.(\w+)\.level$/.exec(name);
  if(m) return $("lvl_" + k + "_" + m[1]);
  if(name === "tasks") return document.querySelector('#tasks .task:not([hidden]) input');
  if(name.startsWith("prompt:")) return document.querySelector('.pbtn[data-key="' + name.slice(7) + '"]');
  if(name === "resp") return document.querySelector('#resp .chip:not([hidden]) input, #respc .chip:not([hidden]) input');
  const el = $(name);
  if(!el) return null;
  if(/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return el.closest("[hidden]") ? null : el;
  return el.querySelector('.chip:not([hidden]) input') || el.querySelector("input, select, textarea");
}

/* opening "Why am I seeing this?" also takes staff to the step it is about */
$("saList").addEventListener("toggle", e => {
  const d = e.target;
  if(!d.classList || !d.classList.contains("sa-why") || !d.open) return;
  const go = d.closest("li").querySelector(".sa-go");
  const n = stepOf(go && go.dataset.field);
  if(n >= 0) goToStep(n);
}, true);
$("saList").addEventListener("input", e => {
  const id = e.target.dataset && e.target.dataset.explain;
  if(id) explanations[id] = e.target.value;
});
$("saList").addEventListener("click", e => {
  const go = e.target.closest(".sa-go");
  if(go){
    const el = findField(go.dataset.field);
    if(el){ el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" }); el.focus({ preventScroll: true }); }
    return;
  }
  /* staff choose to add a factual line; nothing is added for them */
  const ho = e.target.closest(".sa-ho");
  if(ho){
    const box = $("handover"), line = ho.dataset.text;
    box.value = box.value.trim() ? box.value.trim().replace(/([^.!?])$/, "$1.") + " " + line : line;
    box.dispatchEvent(new Event("input", { bubbles: true }));
    box.focus();
    return;
  }
  /* staff tick the option themselves; the button only saves them the scroll */
  const tk = e.target.closest(".sa-tick");
  if(tk){
    const [g, id] = tk.dataset.tick.split(".");
    const el = $(g + "_" + id);
    if(el && !el.checked){
      el.checked = true;
      el.focus({ preventScroll: true });          // focus goes with the tick, so the finding can leave the list
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return;
  }
  const ex = e.target.closest(".sa-exp-btn");
  if(ex){
    const box = ex.closest(".sa-body").querySelector(".sa-explain");
    box.hidden = !box.hidden;
    ex.setAttribute("aria-expanded", box.hidden ? "false" : "true");
    if(!box.hidden) box.querySelector("textarea").focus();
  }
});
$("saMore").addEventListener("click", () => { saOpen = !saOpen; render(); });

function renderFields(s){
  let rows = [];
  const bank = TASKS[s.kind];
  const LVLTEXT = {ind:"Independent", prompt:"Prompted", min:"Minimal assistance", part:"Assisted", full:"Full support", declined:"Declined"};
  Object.keys(LVLTEXT).forEach(l => { LVLTEXT[l] = GSN.config.recordValue(CONFIG, l, LVLTEXT[l]); });

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
  if(s.kind === "activity"){
    const where = s.setting === "college" ? "College" : ((ACT_INFO[s.slot] || {}).where || "either");
    rows.push(["Location activity took place", where === "College" ? "College" : where === "home" ? "At home"
             : where === "out" || s.tasks.some(t => t.id === "travel" && t.level && t.level !== "declined") ? "In the community" : "At home"]);
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

  /* built as text, so nothing typed or configured is ever read as markup */
  const el = $("nf");
  el.replaceChildren(...(rows.length ? rows.map(r => {
    const row = document.createElement("div"), k = document.createElement("span"), v = document.createElement("span");
    row.className = "nf-row"; k.textContent = GSN.core.plain(r[0]); v.textContent = GSN.core.plain(r[1]);
    row.append(k, v);
    return row;
  }) : [Object.assign(document.createElement("div"), { className: "nf-empty", textContent: "Tick the tasks in step 3 and the matching record fields appear here." })]));
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
  if(s.kind === "activity" && !one("setting")) $("setting_community").checked = true;
  $("settingHint").textContent = !s.kind ? "" : college
    ? "Already arranged, so nothing is offered today \u2014 record the journey, the support and what they gained."
    : "Offered today and chosen from the options \u2014 record the choice, the support and how it went.";
  $("offerWrap").hidden = college;
  setText($("commUsedHead"), college ? "How staff told them it was college today" : "How staff communicated this time");
  setText($("howHead"), college ? "How they let you know they\u2019d go" : "How they let you know");
  $("sessionToWrap").hidden = !college;
  $("learnWrap").hidden = s.kind !== "activity";
  showGroup("enjoyWrap", s.kind === "activity");
  showGroup("benefitWrap", s.kind === "activity");
  syncDuring(s);
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

  /* safety choices that belong to a journey appear only with that journey;
     the task rows were only just unhidden, so read them afresh */
  const tasksNow = readTasks();
  const f = GSN.rules.facts({ s: Object.assign({}, s, { tasks: tasksNow }), profile: { flags: s.flags } });
  const travelOpt = (f.task.travel || {}).opt || "";
  let journeyHidden = false;
  RISK.forEach(([id]) => {
    const sc = RISK_SCOPE[id] || "all";
    const ok = sc === "all" || (sc === "out" ? f.out
             : (f.travel && JOURNEY[sc].includes(travelOpt)) || (sc === "vehicle" && s.slot === "drive") || ((sc === "stop" || sc === "fare") && s.slot === "bus"));
    if(!ok && f.out) journeyHidden = true;
    showChip("risk_" + id, ok);
  });
  $("riskHint").hidden = !(s.kind === "activity" && !f.travel && journeyHidden);
  const tick = id => tasksNow.some(t => t.id === id);
  showGroup("dignityWrap", s.kind === "personal");
  showGroup("contObsWrap", s.kind === "personal" && (s.slot === "continence" || tick("continence") || s.flags.includes("continence")));
  showGroup("sleepObsWrap", s.kind === "personal" && (s.slot === "night" || tick("sleepcheck") || tick("settle")));
  $("behOtherWrap").hidden = !s.behaviour.includes("other");
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

/* The things a person might do during THIS kind of activity - cooking has
   different events from a swim. The choices are rebuilt only when the
   activity's kind changes, so ticks survive every other edit; ticks for a
   different kind of activity go with it, as they no longer apply. */
let duringSig = "";
function syncDuring(s){
  const tags = s.kind === "activity" ? ((ACT_INFO[s.slot] || {}).tags || []) : [];
  const seen = new Set();
  const list = tags.flatMap(t => DURING[t] || []).filter(o => !seen.has(o[0]) && seen.add(o[0]));
  const sig = list.map(o => o[0]).join(",");
  if(sig !== duringSig){
    duringSig = sig;
    chips("during", list, "checkbox");
  }
  $("duringWrap").hidden = !list.length;
  if(list.length) setText($("duringHead"), "What they did during " + GSN.core.plain(GSN.rules.activityName(s)).replace(/ \(college\)$/, "") + " \u2014 tick what happened");
}

/* a hidden choice is never left selected, so it cannot reach the note */
function showChip(id, ok){
  const el = $(id);
  if(!el) return;
  el.closest(".chip").hidden = !ok;
  if(!ok && el.checked) el.checked = false;
}
function showGroup(id, ok){
  const el = $(id);
  el.hidden = !ok;
  if(!ok) el.querySelectorAll("input:checked").forEach(i => { i.checked = false; });
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
    '<input type="time" class="tt-from" aria-label="Starts" value="' + esc(r.from || "") + '">' +
    '<input type="time" class="tt-to" aria-label="Ends" value="' + esc(r.to || "") + '">' +
    '<label class="tt-ch" title="They chose this course themselves at the start of the college year"><input type="checkbox" class="tt-chosen"' + (r.chosen ? ' checked' : '') + '> Chose it</label>' +
    '<button type="button" class="tt-x" aria-label="Remove this session">&times;</button></div>';
}
function renderTT(list){
  $("tt").innerHTML = (list || []).map(ttRow).join("");
}
function readTT(){
  return [...document.querySelectorAll("#tt .ttrow")].map(row => ({
    d: row.querySelector(".tt-d").value, c: row.querySelector(".tt-c").value,
    from: row.querySelector(".tt-from").value, to: row.querySelector(".tt-to").value,
    chosen: row.querySelector(".tt-chosen").checked
  })).filter(r => r.from);
}
$("ttAdd").addEventListener("click", () => {
  $("tt").insertAdjacentHTML("beforeend", ttRow({ d: String(new Date().getDay()), chosen: true }));
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

/* When the activity chosen is a course on the person's timetable, say so and
   offer the switch. If it is that course TODAY, the switch is made for them
   the moment they pick it (see the slot handler) - a form default they can
   see and change, never a fact in the note. */
function renderCollegeHint(s, profile){
  const el = $("collegeHint");
  const tt = GSN.rules.timetabled(s, profile);
  el.hidden = !tt;
  if(!tt) return;
  const when = tt.today ? "today" : "on " + tt.dayName + "s";
  const times = tt.from ? " " + tt.from + (tt.to ? "\u2013" + tt.to : "") : "";
  const text = tt.sameActivity
    ? (profile.initials || "This person") + "\u2019s timetable has " + tt.courseLabel + " at college " + when + times + "."
    : (profile.initials || "This person") + " has " + tt.courseLabel + " at college today" + times + ".";
  const html = esc(text) + ' <button type="button" class="tog" data-college="' + esc(tt.course) + '">This was the college session</button>';
  if(el.innerHTML !== html) el.innerHTML = html;
}
function switchToCollege(course){
  $("setting_college").checked = true;
  fillSlots();
  $("slot").value = course;
  applyTodaySession();
  prefillActivity();
  reseed();
  render();
}
$("collegeHint").addEventListener("click", e => {
  const b = e.target.closest("[data-college]");
  if(b) switchToCollege(b.dataset.college);
});

/* the "more about this person" fields, built from the profile schema */
function renderProfileFields(){
  $("profileFields").innerHTML = PROFILE_SECTIONS.map(sec =>
    '<fieldset class="pf-sec"><legend>' + esc(sec.title) + '</legend><div class="grid">' + sec.fields.map(fd => {
      const id = "pf_" + fd.id, lab = '<label for="' + id + '">' + esc(fd.label) + '</label>';
      const ph = fd.placeholder ? ' placeholder="' + esc(fd.placeholder) + '"' : "";
      if(fd.type === "select")
        return '<div class="f">' + lab + '<select id="' + id + '">' + fd.options.map(o => '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>').join("") + '</select></div>';
      if(fd.type === "textarea")
        return '<div class="f" style="grid-column:1/-1">' + lab + '<textarea id="' + id + '" rows="2"' + ph + '></textarea></div>';
      if(fd.type === "number")
        return '<div class="f">' + lab + '<input type="number" id="' + id + '" min="' + fd.min + '" max="' + fd.max + '" step="' + fd.step + '" inputmode="numeric"' + ph + '></div>';
      return '<div class="f">' + lab + '<input type="text" id="' + id + '" autocomplete="off"' + ph + '></div>';
    }).join("") + '</div></fieldset>').join("");
}
renderProfileFields();

function profileFromForm(){
  const raw = { initials: $("initials").value, pronoun: $("pronoun").value,
                ratio: $("ratio").value, comm: checked("comm"), flags: checked("flags"),
                timetable: readTT() };
  GSN.profiles.FIELD_IDS.forEach(id => { raw[id] = $("pf_" + id).value; });
  raw.custom = {};
  CONFIG.customProfileFields.forEach(f => { raw.custom[f.id] = $("pf_custom." + f.id).value; });
  return normalizeProfile(raw, FLAGS, COMM);
}
function applyProfile(pr){
  pr = normalizeProfile(Object.assign({ pronoun: "he" }, pr), FLAGS, COMM);
  $("initials").value = pr.initials;
  $("pronoun").value  = pr.pronoun;
  $("ratio").value    = pr.ratio;
  document.querySelectorAll('#comm input, #flags input').forEach(i => { i.checked = false; });
  pr.comm.forEach(v => { const el = $("comm_"  + v); if(el) el.checked = true; });
  pr.flags.forEach(v => { const el = $("flags_" + v); if(el) el.checked = true; });
  GSN.profiles.FIELD_IDS.forEach(id => { $("pf_" + id).value = pr[id]; });
  CONFIG.customProfileFields.forEach(f => { $("pf_custom." + f.id).value = pr.custom[f.id] || ""; });
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
  /* tapping the person already open changes nothing; anyone else starts a clean entry */
  if(name !== store.active) resetInteraction("Switched to " + name + " \u2014 the previous entry was cleared.");
  store.active = name; save();
  applyProfile(pr);
  applyTodaySession();
  prefillActivity();
  reseed();
  if(!one("setting")) $("setting_community").checked = true;
  renderPeople();
  render();
}
function newPerson(){
  resetInteraction("New person \u2014 the previous entry was cleared.");
  store.active = null; save();
  applyProfile({ pronoun: "he" });
  renderPeople();
  render();
  $("initials").focus();
}
function removePerson(name){
  if(!(store.people || {})[name]) return;
  if(!confirm("Remove " + name + " from this device? Their profile" + (historyOn() ? " and saved history" : "") + " will be deleted. This cannot be undone.")) return;
  GSN.storage.history.deletePerson(name).catch(() => {});
  delete historyCache[name];
  delete store.people[name];
  const left = Object.keys(store.people);
  store.active = left[0] || null;
  save();
  resetInteraction(name + " was removed \u2014 the entry was cleared.");
  if(store.active) applyProfile(store.people[store.active]); else applyProfile({ pronoun: "he" });
  applyTodaySession(); prefillActivity();
  reseed(); renderPeople(); render();
}
function renderPeople(){
  const names = Object.keys(store.people || {}).sort();
  const el = $("people");
  el.innerHTML = names.map(n => '<span class="pwrap">' +
      '<button type="button" class="pchip' + (n === store.active ? ' on' : '') + '" data-person="' + esc(n) + '" aria-pressed="' + (n === store.active) + '">' + esc(n) + '</button>' +
      (n === store.active ? '<button type="button" class="px" data-remove="' + esc(n) + '" aria-label="Remove ' + esc(n) + ' from this device">&times;</button>' : '') +
      '</span>').join("") +
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
chips("commUsed", COMM, "checkbox");
chips("dignity", DIGNITY, "checkbox");
chips("contObs", CONT_OBS, "checkbox");
chips("sleepObs", SLEEP_OBS, "checkbox");
chips("behaviour", BEHAVIOUR, "checkbox");
chips("followup", FOLLOWUP, "checkbox");
chips("enjoy", ENJOY, "radio");
chips("benefit", BENEFIT, "checkbox");
$("staffing").innerHTML = STAFFING.map(o => '<option value="' + o[0] + '">' + o[1] + '</option>').join("");

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
                     "offered","drunk","skinDetail","extra","handover","actOther","behaviourOther","sessionTo"];
const SCOPED_CHIPS = ["resp","how","consent","skin","mood","well","risk","outcome","learn","during","enjoy","benefit",
                      "commUsed","dignity","contObs","sleepObs","behaviour","followup"];

/* Everything below the person belongs to one entry, for one person. It is
   cleared when the interaction type changes and when staff move on to
   someone else - the type, meal or activity and time stay, because the next
   person is often having the same lunch. The confirmation always goes: it
   vouches for one particular note. */
function resetInteraction(message){
  SCOPED_TEXT.forEach(id => { $(id).value = ""; });
  $("attest").checked = false;
  SCOPED_CHIPS.forEach(g => document.querySelectorAll('#'+g+' input').forEach(i => { i.checked = false; }));
  $("ate").value = ""; $("level").value = ""; $("staffing").value = "";
  document.querySelectorAll('#tasks .task').forEach(row => {
    const box = row.querySelector('input[type=checkbox]');
    box.checked = false; row.classList.remove("on");
    const lvl = row.querySelector('select.lvl'); if(lvl) lvl.value = "";
  });
  lastActPhrase = "";
  explanations = {};
  promptAnswers = {}; promptAsked = {};
  recordId = newRecordId();
  flash(message || "Switched interaction \u2014 the previous entry was cleared.");
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
  const st = state();
  const phrase = GSN.core.fill(GSN.core.plain(GSN.narrative.actPhrase(st, 2)), GSN.core.personVars(st.initials, st.pronoun));
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
  const isPerson = PERSON_INPUTS.has(t.id) || t.closest("#comm") || t.closest("#flags") || t.closest("#profileFields");
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
  if(e.target.id === "slot"){
    recordId = newRecordId();
    const tt = GSN.rules.timetabled(state(), profileFromForm());
    if(tt && tt.sameActivity && tt.today){
      switchToCollege(tt.course);
      flash("Set to College course from the timetable \u2014 " + tt.courseLabel + " " + tt.from + (tt.to ? "\u2013" + tt.to : "") + ". Change it if this was something else.");
      return;
    }
  }
  onEdit(e);
});

/* Reword changes the wording and nothing else. The new note's facts are
   compared with the old one's; a wording that changed any fact is thrown
   away and another tried, and if none holds the note stays as it was. */
let rewordCheck = "";
$("reword").addEventListener("click", () => {
  const before = lastBuild, oldSalt = salt, oldAvoid = onScreen;
  onScreen = Object.assign({}, chosenIdx);
  let check = { same: true, why: [] };
  for(let i = 0; i < 8; i++){
    salt = Math.floor(Math.random() * 1e9);
    render();
    check = before ? GSN.provenance.sameFacts(before, lastBuild, lastState) : check;
    if(check.same) break;
  }
  if(!check.same){ salt = oldSalt; onScreen = oldAvoid; render(); }
  rewordCheck = check.same ? "Reworded: every fact, number and time is unchanged."
                           : "Rewording was refused because " + check.why.join("; ") + ". The note was left as it was.";
  /* onScreen stays set, so later edits keep steering away from the old
     wording instead of drifting back to it; it resets with the next entry */
  renderProvenance();
});

/* developer view: each sentence, and the fields it was built from */
function renderProvenance(){
  const box = $("prov");
  box.hidden = !store.dev;
  $("devToggle").setAttribute("aria-pressed", store.dev ? "true" : "false");
  if(!store.dev || !lastBuild) return;
  const P = GSN.provenance, problems = P.verify(lastBuild.sentences, lastState);
  box.innerHTML = '<h3>Where each sentence came from</h3>' +
    '<p class="' + (problems.length ? "bad" : "good") + '">' + (problems.length
      ? esc(problems.length + " sentence(s) cannot be traced: " + problems.map(x => x.problem).join("; "))
      : "Every sentence traces to something entered on this form.") + '</p>' +
    (rewordCheck ? '<p class="good">' + esc(rewordCheck) + '</p>' : "") +
    '<ol>' + lastBuild.sentences.map(x => '<li><span>' + esc(x.text) + '</span><ul>' +
      x.sources.map(p => '<li><code>' + esc(p) + '</code> ' + esc(P.label(p)) + ' = <b>' + esc(P.resolve(lastState, p)) + '</b></li>').join("") +
      '</ul></li>').join("") + '</ol>';
}
$("devToggle").addEventListener("click", () => { store.dev = !store.dev; save(); renderProvenance(); });

function doCopy(){
  const txt = noteText;
  const done = () => {
    commitHistory();
    saveRecord();
    store.last = store.last || {};
    store.last[histKey()] = txt;
    syncPerson();
    salt = Math.floor(Math.random() * 1e9);
    onScreen = {};
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
/* a copied note is a finished one: keep what it observed, if history is on */
function saveRecord(){
  if(!historyOn() || !lastState || !lastState.initials) return;
  const id = entryId(lastState);
  const rec = GSN.patterns.toRecord(lastState, { id });
  const person = rec.person;
  lastSaved = { id, sig: recordSig(rec) };
  if(id === recordId) recordId = newRecordId();
  GSN.storage.history.put(rec).then(() => {
    historyCache[person] = (historyCache[person] || []).filter(r => r.id !== rec.id).concat([rec]);
    patSig = ""; render();
    setText($("why"), "Copied, and saved to this device\u2019s history.");
  }).catch(() => setText($("why"), "Copied. It could not be saved to history on this device."));
}

$("copy").addEventListener("click", doCopy);
$("dockCopy").addEventListener("click", doCopy);
$("dockJump").addEventListener("click", () => $("out").scrollIntoView({behavior:"smooth", block:"center"}));

$("theme").addEventListener("click", () => {
  const cur = document.documentElement.getAttribute("data-theme");
  const dark = cur ? cur === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.setAttribute("data-theme", dark ? "light" : "dark");
});

/* ============================================================
   What the settings screen (settings.js) needs from the page
   ============================================================ */
GSN.app = {
  key: KEY, store: () => store, save, render, state, config: CONFIG, historyOn,
  forgetHistory(person){ if(person) historyCache[person] = []; else historyCache = {}; patSig = ""; },
  renderProvenance
};

/* what a shorter note leaves out, in the words used on the form */
function omittedLabel(key){
  const [g, id] = key.split(/_(.+)/);
  const from = (list, v) => GSN.core.plain((list.find(x => x[0] === v) || ["", v])[1]).toLowerCase();
  if(g === "task") return GSN.rules.taskLabel($("kind").value, id).toLowerCase();
  const lists = { comm: COMM, how: HOW, risk: RISK, dig: DIGNITY, learn: LEARN, mood: MOOD, well: WELL, during: Object.values(DURING).flat(), ben: BENEFIT };
  if(g === "enjoy") return "how much they enjoyed it";
  if(g === "enrol") return "how they chose the course";
  if(lists[g]) return from(lists[g], id);
  return { session: "session times", offer: "the option offered", level: "the overall support level", fluid: "the drink chosen",
           skin: "the skin check", prompt: "an answer to a profile question" }[g] || "a detail";
}
$("includeAll").addEventListener("click", () => { $("len").value = "full"; render(); });

/* restore the person from last time, and open on a realistic worked example */
(function boot(){
  store.device = store.device || (Math.random().toString(36).slice(2) + Date.now().toString(36));
  store.people = store.people || {};
  store.config = store.config || {};
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
    $("commUsed_verbal").checked = true;
    $("dignity_door").checked = true;
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
    LEVELS.forEach(l => { if(l[0] && (!t[l[0]] || !t[l[0]].length)) console.warn("No wording for task " + t.id + "." + l[0]); }));

  if("serviceWorker" in navigator && location.protocol === "https:")
    navigator.serviceWorker.register("sw.js").catch(() => {});
})();
