/* Validation for anything that comes from outside the source: the settings
   screen, and files imported to restore or share a setup. Everything is
   rebuilt from known keys only - unknown keys are dropped, text is length-
   capped, numbers are range-checked, ids are simple slugs, and sentence
   templates may only use known tokens. Nothing is ever run as code, and
   every label is escaped wherever it is shown. */
(function (G) {
"use strict";

const D = G.data;
const ID_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/;
const LEVEL_IDS = ["ind", "prompt", "min", "part", "full", "declined"];
const AUDIT_IDS = ["interaction", "response", "support", "observation", "outcome", "refusal"];
const PERSON_TOKENS = ["N", "s", "S", "o", "p", "P", "r", "vbe", "vhave"];
/* a confirmed answer's sentence can quote these, because each has a source */
const PROMPT_TOKENS = PERSON_TOKENS.concat(["meal", "activity", "textureNote", "aid"]);
/* rule text that never reaches the note may use any fact the rules know */
const RULE_TEXT_TOKENS = PROMPT_TOKENS.concat(["targetNote", "triggersNote", "usualLevel", "ateLower", "drunk", "offered", "skinDetail"]);
const MAX_IMPORT = 20 * 1024 * 1024;
const INITIALS_RE = /^[A-Z0-9'-]{1,4}$/;
/* built-in ids, captured before a provider's items are added to the same
   lists, so re-checking saved settings never trips over its own entries */
const BUILT_IN = {
  acts: D.ACTS.map(a => a[0]), comm: D.COMM.map(x => x[0]), flags: D.FLAGS.map(x => x[0]),
  obs: [].concat(D.MOOD, D.WELL, D.BEHAVIOUR).map(x => x[0])
};

const slug = s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 36);
const isObj = v => v && typeof v === "object" && !Array.isArray(v);

function collector(){
  const errors = [];
  return {
    errors,
    err: (where, msg) => errors.push(where + ": " + msg),
    text(v, max, where, required){
      if(v == null || v === "") { if(required) errors.push(where + ": is required"); return ""; }
      if(typeof v !== "string"){ errors.push(where + ": must be text"); return ""; }
      const t = v.trim();
      if(t.length > max) errors.push(where + ": is longer than " + max + " characters");
      if(/[<>]/.test(t)){ errors.push(where + ": must not contain < or >"); return ""; }
      return t.slice(0, max);
    },
    template(v, allowed, where, required){
      const t = this.text(v, 300, where, required);
      (t.match(/\{(\w+)\}/g) || []).forEach(m => {
        if(!allowed.includes(m.slice(1, -1))) errors.push(where + ": unknown placeholder " + m);
      });
      if(/[{}]/.test(t.replace(/\{\w+\}/g, ""))) errors.push(where + ": has a stray { or }");
      return t;
    },
    id(v, where, taken){
      if(typeof v !== "string" || !ID_RE.test(v)){ errors.push(where + ": id must be lower-case letters, numbers and dashes"); return ""; }
      if(taken && taken.has(v)){ errors.push(where + ": id “" + v + "” is already used"); return ""; }
      if(taken) taken.add(v);
      return v;
    },
    /* run fn; an entry that raised any error is left out entirely, so an
       import can never carry half-valid wording into a note */
    clean(fn){
      const before = errors.length;
      const out = fn();
      return errors.length > before ? null : out;
    },
    list(v, max, where){
      if(v == null) return [];
      if(!Array.isArray(v)){ errors.push(where + ": must be a list"); return []; }
      if(v.length > max) errors.push(where + ": more than " + max + " entries");
      return v.slice(0, max);
    }
  };
}

/* ---------- rules ---------- */
function validCondition(c, cond, where, depth){
  const out = {};
  if(!isObj(cond)){ c.err(where, "must be a condition object"); return out; }
  if(depth > 5){ c.err(where, "is nested too deeply"); return out; }
  const known = G.rules.CONDITIONS;
  Object.keys(cond).forEach(k => {
    const v = cond[k], w = where + "." + k;
    if(!known[k]){ c.err(w, "is not a known condition"); return; }
    if(k === "any" || k === "all"){
      out[k] = c.list(v, 20, w).map((x, i) => validCondition(c, x, w + "[" + i + "]", depth + 1));
    } else if(k === "not"){
      out[k] = validCondition(c, v, w, depth + 1);
    } else if(["field", "includes", "answer", "taskOpt"].includes(k)){
      if(!isObj(v)){ c.err(w, "must map names to values"); return; }
      out[k] = {};
      Object.keys(v).slice(0, 20).forEach(n => {
        if(!/^[\w.-]{1,80}$/.test(n)){ c.err(w, "bad name " + n); return; }
        out[k][n] = Array.isArray(v[n]) ? v[n].slice(0, 30).map(x => String(x).slice(0, 60)) : String(v[n]).slice(0, 60);
      });
    } else if(typeof v === "boolean"){
      out[k] = v;
    } else if(typeof v === "string" || Array.isArray(v)){
      out[k] = Array.isArray(v) ? v.slice(0, 30).map(x => String(x).slice(0, 60)) : v.slice(0, 60);
    } else c.err(w, "has a value of the wrong kind");
  });
  return out;
}

function validTrigger(c, t, where){
  if(t == null) return undefined;
  if(!isObj(t)){ c.err(where, "must be an object"); return undefined; }
  const severity = ["critical", "review", "suggestion"].includes(t.severity) ? t.severity : (c.err(where + ".severity", "must be critical, review or suggestion"), "review");
  return { severity, message: c.template(t.message, RULE_TEXT_TOKENS, where + ".message", true),
           handover: t.handover ? c.template(t.handover, RULE_TEXT_TOKENS, where + ".handover") : "" };
}

function validateRule(r, where, c, taken){
  if(!isObj(r)){ c.err(where, "must be an object"); return null; }
  const id = c.id(r.id, where + ".id", taken);
  const out = {
    id, title: c.text(r.title, 80, where + ".title") || id,
    appliesWhen: validCondition(c, r.appliesWhen, where + ".appliesWhen", 0),
    reason: c.template(r.reason, RULE_TEXT_TOKENS, where + ".reason", true)
  };
  if(!Object.keys(out.appliesWhen).length) c.err(where + ".appliesWhen", "needs at least one condition, or the rule would apply to everyone");
  if(r.suggest) out.suggest = c.template(r.suggest, RULE_TEXT_TOKENS, where + ".suggest");
  if(r.handover) out.handover = c.template(r.handover, RULE_TEXT_TOKENS, where + ".handover");
  if(r.watch) out.watch = c.list(r.watch, 10, where + ".watch").filter(x => /^[a-zA-Z]{1,30}$/.test(x));
  if(r.highlight) out.highlight = c.list(r.highlight, 10, where + ".highlight").filter(x => /^[a-zA-Z]+\.[a-z0-9_-]+$/.test(x));
  if(r.important) out.important = c.list(r.important, 10, where + ".important").map((i, n) => ({
    field: /^[a-zA-Z]{1,30}$/.test(i && i.field) ? i.field : (c.err(where + ".important[" + n + "].field", "is not a field name"), ""),
    message: c.template(i && i.message, RULE_TEXT_TOKENS, where + ".important[" + n + "].message", true),
    severity: i && i.severity === "suggestion" ? "suggestion" : "missing"
  })).filter(i => i.field);
  if(r.prompts){
    const pTaken = new Set();
    out.prompts = c.list(r.prompts, 12, where + ".prompts").map((p, n) => {
      const w = where + ".prompts[" + n + "]";
      if(!isObj(p)){ c.err(w, "must be an object"); return null; }
      const q = {
        id: c.id(p.id, w + ".id", pTaken),
        text: c.template(p.text, RULE_TEXT_TOKENS, w + ".text", true),
        yes: p.yes == null ? null : c.template(p.yes, PROMPT_TOKENS, w + ".yes"),
        no: p.no == null ? null : c.template(p.no, PROMPT_TOKENS, w + ".no"),
        pri: [1, 2, 3].includes(p.pri) ? p.pri : 2
      };
      if(q.text && !/\?$/.test(q.text)) c.err(w + ".text", "must be asked as a question, ending with ?");
      if(p.showIf) q.showIf = validCondition(c, p.showIf, w + ".showIf", 0);
      const y = validTrigger(c, p.onYes, w + ".onYes"), no = validTrigger(c, p.onNo, w + ".onNo");
      if(y) q.onYes = y;
      if(no) q.onNo = no;
      return q;
    }).filter(Boolean);
  }
  return out;
}

/* ---------- provider configuration ---------- */
function validateConfig(raw){
  const c = collector();
  const cfg = G.config.withDefaults({});
  if(!isObj(raw)) return { value: cfg, errors: ["Settings must be an object"] };

  if(isObj(raw.org)){
    cfg.org.name = c.text(raw.org.name, 80, "Organisation name");
    cfg.org.service = G.config.SERVICE_TYPES.some(t => t[0] === raw.org.service) ? raw.org.service : "";
  }
  if(isObj(raw.terms)){
    ["staff", "person", "careSystem"].forEach(k => {
      const t = c.text(raw.terms[k], 40, "Word for " + k);
      if(t && !/^[A-Za-z][A-Za-z '-]*$/.test(t)) c.err("Word for " + k, "letters, spaces, hyphens and apostrophes only");
      else if(t) cfg.terms[k] = t;
    });
  }
  cfg.noteLayout = raw.noteLayout === "paragraphs" ? "paragraphs" : "block";
  if(isObj(raw.levels)) Object.keys(raw.levels).forEach(id => {
    if(!LEVEL_IDS.includes(id) || !isObj(raw.levels[id])) return;
    const label = c.text(raw.levels[id].label, 40, "Support level " + id), record = c.text(raw.levels[id].record, 40, "Record value " + id);
    if(label || record) cfg.levels[id] = { label, record };
  });
  if(isObj(raw.fieldNames)) Object.keys(raw.fieldNames).forEach(key => {
    const [kind, id] = key.split(".");
    if(!(D.TASKS[kind] || []).some(t => t.id === id)) return;
    const v = c.text(raw.fieldNames[key], 80, "Field name for " + key);
    if(v) cfg.fieldNames[key] = v;
  });

  const taken = new Set(BUILT_IN.acts);
  cfg.customActivities = c.list(raw.customActivities, 100, "Activities").map((a, i) => c.clean(() => {
    const w = "Activity " + (i + 1);
    if(!isObj(a)) return null;
    const label = c.text(a.label, 60, w + " name", true);
    if(!label) return null;
    const noun = c.text(a.noun, 80, w + " (how it reads)") || label;      // as typed: lower-casing would spoil a name
    return { id: c.id(a.id || "c-" + slug(label), w + " id", taken), label, noun,
             did: c.text(a.did, 100, w + " (what they did)") || "took part in " + noun,
             where: ["home", "out", "either"].includes(a.where) ? a.where : "either",
             tags: c.list(a.tags, 5, w + " tags").filter(t => ID_RE.test(t)) };
  })).filter(a => a && a.id);

  const commTaken = new Set(BUILT_IN.comm);
  cfg.customComm = c.list(raw.customComm, 30, "Communication methods").map((m, i) => c.clean(() => {
    const w = "Communication method " + (i + 1);
    if(!isObj(m)) return null;
    const label = c.text(m.label, 60, w + " name", true);
    if(!label) return null;
    const sentences = c.list(m.sentences, 3, w + " wording").map((t, n) => c.template(t, PERSON_TOKENS, w + " wording " + (n + 1), true)).filter(Boolean);
    if(!sentences.length) c.err(w, "needs at least one sentence for the note");
    return { id: c.id(m.id || "c-" + slug(label), w + " id", commTaken), label, sentences };
  })).filter(m => m && m.id && m.sentences.length);

  const flagTaken = new Set(BUILT_IN.flags);
  cfg.customFlags = c.list(raw.customFlags, 50, "Needs and risks").map((f, i) => c.clean(() => {
    if(!isObj(f)) return null;
    const label = c.text(f.label, 60, "Need " + (i + 1) + " name", true);
    return label ? { id: c.id(f.id || "c-" + slug(label), "Need " + (i + 1) + " id", flagTaken), label } : null;
  })).filter(f => f && f.id);

  const obsTaken = new Set(BUILT_IN.obs);
  cfg.customObservations = c.list(raw.customObservations, 60, "Observations").map((o, i) => c.clean(() => {
    const w = "Observation " + (i + 1);
    if(!isObj(o)) return null;
    const label = c.text(o.label, 60, w + " name", true);
    if(!label) return null;
    if(!["mood", "well", "behaviour"].includes(o.group)){ c.err(w, "group must be mood, well or behaviour"); return null; }
    const sentences = c.list(o.sentences, 3, w + " wording").map((t, n) => c.template(t, PERSON_TOKENS, w + " wording " + (n + 1), true)).filter(Boolean);
    if(!sentences.length){ c.err(w, "needs at least one sentence for the note"); return null; }
    return { id: c.id(o.id || "c-" + slug(label), w + " id", obsTaken), label, group: o.group, sentences };
  })).filter(o => o && o.id);

  const pfTaken = new Set();
  cfg.customProfileFields = c.list(raw.customProfileFields, 30, "Profile fields").map((f, i) => c.clean(() => {
    if(!isObj(f)) return null;
    const label = c.text(f.label, 60, "Profile field " + (i + 1) + " name", true);
    return label ? { id: c.id(f.id || slug(label), "Profile field " + (i + 1) + " id", pfTaken), label } : null;
  })).filter(f => f && f.id);

  if(isObj(raw.audit)){
    cfg.audit.optional = c.list(raw.audit.optional, 6, "Audit").filter(x => AUDIT_IDS.includes(x));
    cfg.audit.extra = c.list(raw.audit.extra, 5, "Audit").filter(x => G.config.EXTRA_CHECKS.some(e => e[0] === x));
  }
  if(isObj(raw.language)){
    ["vague", "judgement"].forEach(k => {
      cfg.language[k] = c.list(raw.language[k], 100, "Language " + k).map(t => c.text(t, 40, "Language " + k)).filter(Boolean);
    });
    cfg.language.phrases = c.list(raw.language.phrases, 100, "Language phrases").map((p, i) => isObj(p) ? {
      phrase: c.text(p.phrase, 60, "Phrase " + (i + 1), true), guidance: c.text(p.guidance, 200, "Guidance " + (i + 1)) } : null)
      .filter(p => p && p.phrase);
  }

  const ruleTaken = new Set(G.rules.CARE_RULES.map(r => r.id));
  cfg.customRules = c.list(raw.customRules, 100, "Custom rules").map((r, i) => c.clean(() => validateRule(r, "Rule " + (i + 1), c, ruleTaken))).filter(r => r && r.id);

  if(isObj(raw.history)){
    cfg.history.enabled = raw.history.enabled === true;
    cfg.history.windowDays = [7, 14, 28, 56].includes(raw.history.windowDays) ? raw.history.windowDays : 14;
  }
  return { value: cfg, errors: c.errors };
}

/* ---------- saved history records ---------- */
const PCT_KEYS = Object.keys(G.patterns.PCT);
function validateRecord(r){
  if(!isObj(r)) return null;
  const idish = v => typeof v === "string" && /^[A-Za-z0-9_:-]{0,40}$/.test(v) ? v : "";
  const ids = (v, max) => Array.isArray(v) ? v.slice(0, max).filter(x => typeof x === "string" && /^[a-z0-9_-]{1,40}$/.test(x)) : [];
  const ml = v => v === null || v === undefined ? null : (typeof v === "number" && v >= 0 && v <= 5000 ? v : undefined);
  const realDay = /^\d{4}-\d{2}-\d{2}$/.test(r.date || "") && G.patterns.iso(new Date(r.date + "T12:00:00")) === r.date;
  if(!/^[A-Za-z0-9_-]{1,40}$/.test(r.id || "") || !INITIALS_RE.test(r.person || "") || !realDay ||
     !["personal", "eating", "activity"].includes(r.kind)) return null;
  const out = {
    v: 1, id: r.id, person: r.person, date: r.date,
    time: /^(\d{2}:\d{2})?$/.test(r.time || "") ? (r.time || "") : "",
    savedAt: typeof r.savedAt === "string" && !Number.isNaN(Date.parse(r.savedAt)) ? r.savedAt : new Date(r.date).toISOString(),
    kind: r.kind, slot: idish(r.slot), setting: r.setting === "college" ? "college" : r.kind === "activity" ? "community" : "",
    response: idish(r.response), consent: idish(r.consent), level: idish(r.level), declined: r.declined === true,
    tasks: Array.isArray(r.tasks) ? r.tasks.slice(0, 40).filter(t => isObj(t) && /^[a-z0-9_-]{1,40}$/.test(t.id || "") && LEVEL_IDS.includes(t.level))
                                   .map(t => ({ id: t.id, level: t.level })) : [],
    food: isObj(r.food) && PCT_KEYS.includes(r.food.amount) ? { amount: r.food.amount, pct: G.patterns.PCT[r.food.amount] } : null,
    fluid: null,
    mood: ids(r.mood, 20), wellbeing: ids(r.wellbeing, 20), behaviour: ids(r.behaviour, 20), during: ids(r.during, 20),
    skin: ["", "clear", "concern", "none"].includes(r.skin) ? r.skin : "",
    sleep: ids(r.sleep, 10), continence: ids(r.continence, 10), prompts: {},
    outcome: idish(r.outcome), followup: ids(r.followup, 10), handover: r.handover === true
  };
  if(isObj(r.fluid)){
    const off = ml(r.fluid.offered), dr = ml(r.fluid.drunk);
    if(off !== undefined && dr !== undefined) out.fluid = { offered: off, drunk: dr };
  }
  if(isObj(r.prompts)) Object.keys(r.prompts).slice(0, 60).forEach(k => {
    if(/^[a-z0-9_.-]{1,80}$/.test(k) && ["yes", "no"].includes(r.prompts[k])) out.prompts[k] = r.prompts[k];
  });
  return out;
}

/* ---------- a whole backup file ---------- */
function validateBackup(text){
  const errors = [];
  if(typeof text !== "string" || text.length > MAX_IMPORT) return { ok: false, errors: ["The file is empty or larger than 20 MB."] };
  let raw;
  try { raw = JSON.parse(text); } catch(e){ return { ok: false, errors: ["This is not a Gold Standard Notes file (it is not valid JSON)."] }; }
  if(!isObj(raw) || raw.app !== "gold-standard-notes" || raw.format !== 1 || !isObj(raw.data))
    return { ok: false, errors: ["This is not a Gold Standard Notes backup, or it came from a newer version."] };
  const value = {}, summary = [];
  if("config" in raw.data){
    const r = validateConfig(raw.data.config);
    errors.push.apply(errors, r.errors);
    value.config = r.value;
    summary.push("provider settings");
  }
  if("people" in raw.data){
    if(!isObj(raw.data.people)) errors.push("Profiles must be an object keyed by initials.");
    else {
      const flags = D.FLAGS.concat(((value.config || {}).customFlags || []).map(f => [f.id, f.label]));
      const comm = D.COMM.concat(((value.config || {}).customComm || []).map(m => [m.id, m.label]));
      value.people = {};
      Object.keys(raw.data.people).slice(0, 500).forEach(k => {
        const p = G.profiles.normalizeProfile(raw.data.people[k], flags, comm);
        if(INITIALS_RE.test(p.initials)) value.people[p.initials] = p;
        else errors.push("A profile without valid initials was skipped.");
      });
      summary.push(Object.keys(value.people).length + " profile(s)");
    }
  }
  if("history" in raw.data){
    if(!Array.isArray(raw.data.history)) errors.push("History must be a list.");
    else {
      const recs = raw.data.history.slice(0, 50000).map(validateRecord);
      const bad = recs.filter(r => !r).length;
      value.history = recs.filter(Boolean);
      if(bad) errors.push(bad + " history record(s) were not valid and were skipped.");
      summary.push(value.history.length + " history record(s)");
    }
  }
  if(!summary.length) return { ok: false, errors: ["The file contains nothing to import."] };
  return { ok: true, value, errors, summary };
}

G.validation = { validateConfig, validateRule, validateRecord, validateBackup, ID_RE, PERSON_TOKENS, PROMPT_TOKENS, slug };
})(globalThis.GSN = globalThis.GSN || {});
