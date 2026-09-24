/* Provider configuration. A service adapts the builder to itself - its
   activities, communication methods, needs, observations, support-level
   wording, record-system field names, terminology, audit requirements and
   rules - from the settings screen or an imported file, without touching
   the source. Everything here sits ON TOP of the built-in data: nothing
   built in is removed, so a note always has wording behind every choice. */
(function (G) {
"use strict";

const D = G.data;
const E = s => G.core.esc(s);          // built-in labels are entity text; custom ones must match

const DEFAULT_CONFIG = {
  v: 1,
  org: { name: "", service: "" },
  terms: { staff: "staff", person: "person", careSystem: "care system" },
  noteLayout: "block",      // "block": one paragraph, safe to paste anywhere; "paragraphs": split by stage
  levels: {},               // ind|prompt|min|part|full|declined -> { label, record }
  fieldNames: {},           // "personal.wash" -> the field name in the provider's care system
  customActivities: [],     // { id, label, noun, did, where, tags }
  customComm: [],           // { id, label, sentences: [..] }
  customFlags: [],          // { id, label }
  customObservations: [],   // { id, label, group: mood|well|behaviour|learn|during, tags (during only), sentences: [..] }
  suggestions: [],          // sentences staff offered as tick options: { id, template, label, group, tags, kind, at }
  customProfileFields: [],  // { id, label }
  audit: { optional: [], extra: [] },   // org checks that do not block copying; extra checks that do
  language: { vague: [], judgement: [], phrases: [] },
  customRules: [],
  history: { enabled: false, windowDays: 14 }
};

const SERVICE_TYPES = [["", "Not stated"], ["residential", "Residential care home"], ["supported", "Supported living"],
  ["domiciliary", "Domiciliary / home care"], ["ld", "Learning-disability service"], ["autism", "Autism service"],
  ["elderly", "Elderly care"], ["day", "Day service"], ["respite", "Respite service"], ["other", "Other adult social care"]];

/* audit checks a provider may add on top of their own seven */
const EXTRA_CHECKS = [["staffComm", "How staff communicated is recorded"], ["dignity", "Privacy and dignity recorded for personal care"]];

const clone = o => JSON.parse(JSON.stringify(o));

/* a stored config, with any gaps filled from the defaults */
function withDefaults(cfg){
  const out = clone(DEFAULT_CONFIG);
  cfg = cfg || {};
  Object.keys(out).forEach(k => {
    if(!(k in cfg)) return;
    out[k] = (out[k] && typeof out[k] === "object" && !Array.isArray(out[k])) ? Object.assign(out[k], cfg[k]) : cfg[k];
  });
  return out;
}

/* Lay the provider's additions over the built-in data, in place, so every
   module that already holds a reference to a list sees them. Runs once at
   start-up, before the page builds its choices. */
function apply(cfg){
  cfg = withDefaults(cfg);
  cfg.customActivities.forEach(a => {
    D.ACTS.splice(D.ACTS.length - 1, 0, [a.id, E(a.label), E(a.noun), E(a.did)]);   // keep "Something else" last
    D.SLOTS.activity.splice(D.SLOTS.activity.length - 1, 0, [a.id, E(a.label)]);
    D.ACT_INFO[a.id] = { where: a.where || "either", tags: a.tags || [] };
  });
  cfg.customComm.forEach(c => { D.COMM.push([c.id, E(c.label)]); D.COMMBANK[c.id] = c.sentences.map(E); });
  cfg.customFlags.forEach(f => D.FLAGS.push([f.id, E(f.label)]));
  const groups = { mood: [D.MOOD, D.MOODBANK], well: [D.WELL, D.WELLBANK], behaviour: [D.BEHAVIOUR, D.BEHAVIOURBANK] };
  cfg.customObservations.forEach(o => {
    if(o.group === "learn"){ D.LEARN.push([o.id, E(o.label)]); D.LEARNBANK[o.id] = o.sentences.map(E); return; }
    if(o.group === "during"){
      (o.tags || []).forEach(t => { (D.DURING[t] = D.DURING[t] || []).push([o.id, E(o.label)]); });
      D.DURINGBANK[o.id] = o.sentences.map(E);
      return;
    }
    const [list, bank] = groups[o.group];
    if(o.group === "behaviour") list.splice(list.length - 1, 0, [o.id, E(o.label)]);   // keep "Other - describe" last
    else list.push([o.id, E(o.label)]);
    bank[o.id] = o.sentences.map(E);
  });
  Object.keys(cfg.levels).forEach(id => {
    const row = D.LEVELS.find(l => l[0] === id);
    if(row && cfg.levels[id].label) row[1] = E(cfg.levels[id].label);
  });
  Object.keys(cfg.fieldNames).forEach(key => {
    const [kind, id] = key.split(".");
    const t = (D.TASKS[kind] || []).find(x => x.id === id);
    if(t && cfg.fieldNames[key]) t.nf = E(cfg.fieldNames[key]);
  });
  if(cfg.customProfileFields.length)
    G.profiles.PROFILE_SECTIONS.push({ title: "Set by your service", custom: true,
      fields: cfg.customProfileFields.map(f => ({ id: "custom." + f.id, label: f.label, type: "text" })) });
  return cfg;
}

/* the value written in the care-record mirror for a support level */
function recordValue(cfg, level, fallback){
  const l = (cfg.levels || {})[level];
  return (l && l.record) || fallback;
}

G.config = { DEFAULT_CONFIG, SERVICE_TYPES, EXTRA_CHECKS, withDefaults, apply, recordValue };
})(globalThis.GSN = globalThis.GSN || {});
