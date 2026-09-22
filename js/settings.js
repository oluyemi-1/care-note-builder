/* Settings & data: the provider's configuration screen, the history
   controls, and backup and restore. Loaded after app.js and uses only what
   it hands over through GSN.app. Nothing here sends anything anywhere: a
   backup is a file made in the browser, and a restore reads a file the
   person chose, checks every part of it, and only then keeps it. */
(function (G) {
"use strict";

const A = G.app, D = G.data, V = G.validation;
const $ = id => document.getElementById(id);
const esc = G.core.esc, plain = G.core.plain;
const CFG = A.config;
const store = A.store;

/* ---------- the service's own words on the page ---------- */
(function terms(){
  const org = [CFG.org.name, (G.config.SERVICE_TYPES.find(t => t[0] === CFG.org.service) || ["", ""])[1]].filter(Boolean).join(" · ");
  $("orgLine").hidden = !org;
  $("orgLine").textContent = org;
  if(CFG.terms.person && CFG.terms.person !== "person") $("personHead").textContent = "The " + CFG.terms.person;
  if(CFG.terms.careSystem && CFG.terms.careSystem !== "care system") $("nfHead").textContent = "Set these in " + CFG.terms.careSystem;
})();

/* ---------- building the form ---------- */
const val = v => esc(v == null ? "" : v);
const field = (id, label, input, wide) => '<div class="f' + (wide ? ' wide' : '') + '"><label for="' + id + '">' + esc(label) + '</label>' + input + '</div>';
const text = (id, v, ph, max) => '<input type="text" id="' + id + '" value="' + val(v) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + ' maxlength="' + (max || 80) + '" autocomplete="off">';
const select = (id, v, opts) => '<select id="' + id + '">' + opts.map(o => '<option value="' + esc(o[0]) + '"' + (o[0] === v ? ' selected' : '') + '>' + esc(plain(o[1])) + '</option>').join("") + '</select>';
const section = (title, help, body, open) => '<details class="cfg"' + (open ? ' open' : '') + '><summary>' + esc(title) + '</summary>' +
  (help ? '<p class="note-inline">' + help + '</p>' : '') + body + '</details>';

/* a list the provider can add to and remove from; each column is one input */
const LISTS = {
  customActivities: { title: "Activities", noun: "activity", cols: [
    { k: "label", label: "Name", ph: "e.g. Library" }, { k: "noun", label: "How it reads in a note", ph: "e.g. a trip to the library" },
    { k: "did", label: "What they did", ph: "e.g. went to the library" },
    { k: "where", label: "Where", options: [["either", "Home or out"], ["home", "At home"], ["out", "Out in the community"]] }] },
  customComm: { title: "Communication methods", noun: "method", cols: [
    { k: "label", label: "Name", ph: "e.g. British Sign Language" },
    { k: "sentence", label: "Sentence for the note", ph: "e.g. Staff communicated using BSL." }] },
  customFlags: { title: "Needs and risks", noun: "need", cols: [{ k: "label", label: "Name", ph: "e.g. Falls risk" }] },
  customObservations: { title: "Observations", noun: "observation", cols: [
    { k: "label", label: "Name", ph: "e.g. Humming" },
    { k: "group", label: "Where it goes", options: [["mood", "How they presented"], ["well", "Wellbeing"], ["behaviour", "Behaviour observed"]] },
    { k: "sentence", label: "Sentence for the note", ph: "e.g. {S} hummed while {s} worked." }] },
  customProfileFields: { title: "Profile fields", noun: "field", cols: [{ k: "label", label: "Name", ph: "e.g. Key worker" }] },
  phrases: { title: "Phrases to question", noun: "phrase", cols: [
    { k: "phrase", label: "Phrase", ph: "e.g. service user" }, { k: "guidance", label: "What to say instead", ph: "e.g. Use the person's initials." }] }
};
let rowSeq = 0;
function row(list, r){
  const n = ++rowSeq;
  return '<div class="cfg-row" data-id="' + val(r.id) + '">' + LISTS[list].cols.map(c => {
    const id = "r" + n + "_" + c.k, v = r[c.k] == null ? "" : r[c.k];
    return field(id, c.label, c.options ? select(id, v || c.options[0][0], c.options) : text(id, v, c.ph, c.k === "sentence" || c.k === "guidance" ? 300 : 100));
  }).join("") + '<button type="button" class="tog" data-remove-row aria-label="Remove this ' + LISTS[list].noun + '">Remove</button></div>';
}
function rowsBlock(list, rows){
  return '<div class="cfg-rows" data-list="' + list + '">' + rows.map(r => row(list, r)).join("") + '</div>' +
    '<button type="button" class="tog" data-add="' + list + '">+ Add ' + LISTS[list].noun + '</button>';
}

function buildForm(){
  const c = CFG, L = c.levels;
  const lvls = D.LEVELS.filter(l => l[0]);
  const REC = { ind: "Independent", prompt: "Prompted", min: "Minimal assistance", part: "Assisted", full: "Full support", declined: "Declined" };
  const html = [
    section("Organisation and wording", "", '<div class="grid">' +
      field("c_org", "Organisation or service name", text("c_org", c.org.name, "", 80)) +
      field("c_service", "Type of service", select("c_service", c.org.service, G.config.SERVICE_TYPES)) +
      field("c_staff", "Word for staff in notes", text("c_staff", c.terms.staff, "e.g. support workers", 40)) +
      field("c_person", "Word for the person on this form", text("c_person", c.terms.person, "e.g. resident, tenant", 40)) +
      field("c_care", "Name of your care-record system", text("c_care", c.terms.careSystem === "care system" ? "" : c.terms.careSystem, "e.g. Nourish", 40)) +
      field("c_layout", "Note layout when pasted", select("c_layout", c.noteLayout, [["block", "One block of text (safe for any system)"], ["paragraphs", "Paragraphs"]])) +
      '</div>', true),
    section("Support levels", "The words staff pick from on each task, and the value to set in your care-record system. The meaning of each level cannot be changed.",
      lvls.map(l => '<div class="grid cfg-pair">' +
        field("c_lv_" + l[0], plain(D.LEVELS.find(x => x[0] === l[0])[1]) + " — label on the form", text("c_lv_" + l[0], (L[l[0]] || {}).label || "", plain(l[1]), 40)) +
        field("c_lr_" + l[0], "Value in your care-record system", text("c_lr_" + l[0], (L[l[0]] || {}).record || "", REC[l[0]], 40)) + '</div>').join("")),
    section("Care-record field names", "The field each task row fills in your care-record system.",
      Object.keys(D.TASKS).map(kind => '<fieldset class="cfg-kind"><legend>' + esc({ personal: "Personal care", eating: "Eating and drinking", activity: "Activities" }[kind]) + '</legend><div class="grid">' +
        D.TASKS[kind].map(t => field("c_nf_" + kind + "_" + t.id, plain(t.label), text("c_nf_" + kind + "_" + t.id, c.fieldNames[kind + "." + t.id] || "", plain(t.nf), 80))).join("") +
        '</div></fieldset>').join("")),
    section("Activities", "Add your service's own activities. <b>How it reads</b> completes “He was offered …”; <b>what they did</b> completes “He … without any support.”",
      rowsBlock("customActivities", c.customActivities)),
    section("Communication methods", "Each new method needs one sentence for the note, written in the past tense. Use {S} or {s} for he/she/they, {o} for him/her/them and {p} for his/her/their.",
      rowsBlock("customComm", c.customComm.map(m => ({ id: m.id, label: m.label, sentence: m.sentences[0] })))),
    section("Needs and risks", "Added to the standing needs a profile can record. They shape which questions are asked when you add a rule for them; on their own they never write anything.",
      rowsBlock("customFlags", c.customFlags)),
    section("Observations", "Extra choices for how someone presented, their wellbeing, or what they did. Each needs one sentence for the note; use {S}, {s}, {o}, {p} and {vbe} (was/were).",
      rowsBlock("customObservations", c.customObservations.map(o => ({ id: o.id, label: o.label, group: o.group, sentence: o.sentences[0] })))),
    section("Profile fields", "Extra things a profile can hold. They are shown as context and never written into a note.",
      rowsBlock("customProfileFields", c.customProfileFields)),
    section("Audit requirements", "Your organisation's seven checks are always shown. Untick one to stop it blocking the Copy button.",
      '<div class="cfg-checks">' + G.quality.orgAudit(G.rules.facts({ s: { tasks: [], mood: [], well: [], risk: [], learn: [] } })).filter(a => a.id !== "attest").map(a =>
        '<label class="switch"><input type="checkbox" data-audit-req="' + a.id + '"' + (c.audit.optional.includes(a.id) ? '' : ' checked') + '> <span>Must pass: ' + esc(a.t) + '</span></label>').join("") +
      G.config.EXTRA_CHECKS.map(e => '<label class="switch"><input type="checkbox" data-audit-extra="' + e[0] + '"' + (c.audit.extra.includes(e[0]) ? ' checked' : '') + '> <span>Also require: ' + esc(e[1]) + '</span></label>').join("") + '</div>'),
    section("Wording checks", "Words and phrases Smart Assist questions in what staff type, on top of the built-in list. Nothing staff type is ever changed.",
      '<div class="grid">' + field("c_vague", "Vague words (comma separated)", text("c_vague", c.language.vague.join(", "), "e.g. grumpy, lovely", 1000), true) +
      field("c_judge", "Judgemental words (comma separated)", text("c_judge", c.language.judgement.join(", "), "e.g. kicked off", 1000), true) + '</div>' +
      rowsBlock("phrases", c.language.phrases)),
    section("Custom rules", "Advanced. Rules in the same declarative format as the built-in ones, as JSON. A rule asks questions; only a staff member's answer ever reaches the note. Rules are checked before they are saved.",
      field("c_rules", "Rules (JSON)", '<textarea id="c_rules" rows="10" spellcheck="false">' + esc(c.customRules.length ? JSON.stringify(c.customRules, null, 2) : "") + '</textarea>', true) +
      '<button type="button" class="tog" id="c_rulesCheck">Check rules</button> <span id="c_rulesMsg" class="note-inline" role="status"></span>')
  ];
  $("cfgBody").innerHTML = html.join("");
}

/* ---------- reading it back ---------- */
function readRows(list){
  return [...document.querySelectorAll('[data-list="' + list + '"] .cfg-row')].map(r => {
    const o = r.dataset.id ? { id: r.dataset.id } : {};
    LISTS[list].cols.forEach((c, i) => { o[c.k] = r.querySelectorAll("input, select")[i].value.trim(); });
    return o;
  }).filter(o => LISTS[list].cols.some(c => !c.options && o[c.k]));
}
function readForm(){
  const v = id => ($(id) ? $(id).value.trim() : "");
  const levels = {}, fieldNames = {};
  D.LEVELS.filter(l => l[0]).forEach(l => {
    const label = v("c_lv_" + l[0]), record = v("c_lr_" + l[0]);
    if(label || record) levels[l[0]] = { label, record };
  });
  Object.keys(D.TASKS).forEach(k => D.TASKS[k].forEach(t => { const n = v("c_nf_" + k + "_" + t.id); if(n) fieldNames[k + "." + t.id] = n; }));
  let rules = [], rulesError = "";
  if(v("c_rules")) try { rules = JSON.parse(v("c_rules")); } catch(e){ rulesError = "Custom rules: this is not valid JSON (" + e.message + ")."; }
  const words = s => s.split(",").map(x => x.trim()).filter(Boolean);
  return { rulesError, raw: {
    org: { name: v("c_org"), service: v("c_service") },
    terms: { staff: v("c_staff") || "staff", person: v("c_person") || "person", careSystem: v("c_care") || "care system" },
    noteLayout: v("c_layout"), levels, fieldNames,
    customActivities: readRows("customActivities"),
    customComm: readRows("customComm").map(m => ({ id: m.id, label: m.label, sentences: [m.sentence] })),
    customFlags: readRows("customFlags"),
    customObservations: readRows("customObservations").map(o => ({ id: o.id, label: o.label, group: o.group, sentences: [o.sentence] })),
    customProfileFields: readRows("customProfileFields"),
    audit: { optional: [...document.querySelectorAll("[data-audit-req]")].filter(x => !x.checked).map(x => x.dataset.auditReq),
             extra: [...document.querySelectorAll("[data-audit-extra]")].filter(x => x.checked).map(x => x.dataset.auditExtra) },
    language: { vague: words(v("c_vague")), judgement: words(v("c_judge")), phrases: readRows("phrases") },
    customRules: rules,
    history: store().config.history
  }};
}

function showErrors(list){
  const box = $("cfgErrors");
  box.hidden = !list.length;
  box.innerHTML = list.length ? '<b>Not saved — please fix:</b><ul>' + list.slice(0, 30).map(e => '<li>' + esc(e) + '</li>').join("") + '</ul>' : "";
  if(list.length) box.scrollIntoView({ block: "nearest" });
}

$("cfgBody").addEventListener("click", e => {
  const add = e.target.closest("[data-add]");
  if(add){
    const list = add.dataset.add, box = document.querySelector('[data-list="' + list + '"]');
    box.insertAdjacentHTML("beforeend", row(list, {}));
    box.lastElementChild.querySelector("input").focus();
    return;
  }
  const rm = e.target.closest("[data-remove-row]");
  if(rm){ rm.closest(".cfg-row").remove(); return; }
  if(e.target.id === "c_rulesCheck"){
    const { raw, rulesError } = readForm();
    if(rulesError){ $("c_rulesMsg").textContent = rulesError; return; }
    const r = V.validateConfig({ customRules: raw.customRules });
    $("c_rulesMsg").textContent = r.errors.length ? r.errors.slice(0, 5).join(" · ")
      : r.value.customRules.length + (r.value.customRules.length === 1 ? " rule is" : " rules are") + " valid.";
  }
});

$("cfgForm").addEventListener("submit", e => {
  e.preventDefault();
  const { raw, rulesError } = readForm();
  const r = V.validateConfig(raw);
  const errors = (rulesError ? [rulesError] : []).concat(r.errors);
  showErrors(errors);
  if(errors.length) return;
  if(!confirm("Save these settings? The page reloads to apply them, and anything not yet copied is cleared.")) return;
  store().config = r.value;
  A.save();
  location.reload();
});
$("cfgReset").addEventListener("click", () => {
  if(!confirm("Go back to the built-in settings? Your service's activities, wording and rules are removed from this device. Profiles and history are kept.")) return;
  store().config = G.config.withDefaults({ history: store().config.history });
  A.save();
  location.reload();
});

/* ---------- history ---------- */
function refreshDataPanel(){
  const h = store().config.history || {};
  $("histOn").checked = !!h.enabled;
  $("histWindow").value = String(h.windowDays || 14);
  const who = A.state().initials;
  $("delPersonHist").textContent = who ? "Delete " + who + "’s history" : "Delete this person’s history";
  $("delPersonHist").disabled = !who;
  $("devOn").checked = !!store().dev;
  G.storage.history.count()
    .then(n => { $("histCount").textContent = n + (n === 1 ? " record" : " records") + " saved on this device."; })
    .catch(() => { $("histCount").textContent = "History is not available in this browser."; });
}
function setHistory(change){
  store().config.history = Object.assign({}, store().config.history, change);
  A.save(); A.forgetHistory(); A.render();
}
$("openSettings").addEventListener("click", () => { buildForm(); showErrors([]); refreshDataPanel(); $("settings").showModal(); });
$("closeSettings").addEventListener("click", () => $("settings").close());
$("histOn").addEventListener("change", e => { setHistory({ enabled: e.target.checked }); if(e.target.checked) G.storage.persist(); });
$("histWindow").addEventListener("change", e => setHistory({ windowDays: Number(e.target.value) || 14 }));
$("delPersonHist").addEventListener("click", () => {
  const who = A.state().initials;
  if(!who || !confirm("Delete all saved history for " + who + "? Their profile is kept. This cannot be undone.")) return;
  G.storage.history.deletePerson(who).then(() => { A.forgetHistory(who); A.render(); refreshDataPanel(); });
});
$("delAllHist").addEventListener("click", () => {
  if(!confirm("Delete all saved history for everyone on this device? Profiles are kept. This cannot be undone.")) return;
  G.storage.history.clear().then(() => { A.forgetHistory(); A.render(); refreshDataPanel(); });
});
$("clearAll").addEventListener("click", () => {
  if(!confirm("Clear ALL data on this device - every profile, all history and all settings? This cannot be undone. Download a backup first if you need one.")) return;
  G.storage.history.clear().catch(() => {}).then(() => {
    try{ localStorage.removeItem(A.key); }catch(e){}
    location.reload();
  });
});
$("devOn").addEventListener("change", e => { store().dev = e.target.checked; A.save(); A.renderProvenance(); });

/* ---------- backup and restore ---------- */
$("expGo").addEventListener("click", () => {
  const what = $("expWhat").value, data = {}, st = store();
  if(what === "all" || what === "config") data.config = st.config;
  if(what === "all" || what === "people") data.people = st.people || {};
  const withHistory = what === "all" || what === "history"
    ? G.storage.history.all().then(h => { data.history = h || []; }).catch(() => { data.history = []; }) : Promise.resolve();
  withHistory.then(() => {
    const file = { app: "gold-standard-notes", format: 1, kind: what, exportedAt: new Date().toISOString(), data };
    const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = "gold-standard-notes-" + what + "-" + G.patterns.iso(new Date()) + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  });
});

let pending = null;
$("impFile").addEventListener("change", e => {
  const file = e.target.files && e.target.files[0], box = $("impResult");
  pending = null;
  if(!file) return;
  const r = new FileReader();
  r.onload = () => {
    const res = V.validateBackup(String(r.result));
    box.hidden = false;
    if(!res.ok){ box.innerHTML = '<p class="bad">' + esc(res.errors.join(" ")) + '</p>'; return; }
    pending = res.value;
    box.innerHTML = '<p>This file contains <b>' + esc(res.summary.join(", ")) + '</b>.</p>' +
      (res.errors.length ? '<p class="bad">Some parts will be left out:</p><ul>' + res.errors.slice(0, 20).map(x => '<li>' + esc(x) + '</li>').join("") + '</ul>' : '') +
      '<p class="note-inline">Settings in the file replace this device’s settings. Profiles replace any with the same initials. History records are added.</p>' +
      '<button type="button" class="btn primary" id="impGo">Restore now</button>';
  };
  r.onerror = () => { box.hidden = false; box.textContent = "The file could not be read."; };
  r.readAsText(file);
});
$("impResult").addEventListener("click", e => {
  if(e.target.id !== "impGo" || !pending) return;
  if(!confirm("Restore from this file? The page reloads afterwards.")) return;
  const st = store(), v = pending;
  if(v.config) st.config = v.config;
  if(v.people) st.people = Object.assign(st.people || {}, v.people);
  A.save();
  (v.history && v.history.length ? G.storage.history.putAll(v.history) : Promise.resolve())
    .then(() => location.reload(), () => { $("impResult").textContent = "The history could not be saved in this browser; settings and profiles were restored."; });
});
})(globalThis.GSN);
