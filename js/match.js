/* Matching staff's own words to the options the form already has.

   Two jobs, both deterministic:
   - find(): which tick options a piece of free text already says, so Smart
     Assist can suggest the tick and the note need not say it twice;
   - toTemplate(): turn a sentence a staff member wrote into a phrase-bank
     template ({S} danced with the others.) so a manager can adopt it as a new
     tick option without the person's initials or pronouns baked in.

   Nothing here changes what staff typed, and nothing is ticked without them. */
(function (G) {
"use strict";

const D = G.data;

/* a sentence with a negation in it never matches: "did not want to dance" must
   not suggest "Danced" */
const NEGATED = /\b(?:not|no|none|nothing|nobody|never|didn't|don't|wasn't|weren't|couldn't|wouldn't|declined|refused|without|unable|n't)\b/i;
const sentences = text => String(text || "").split(/(?<=[.!?;])\s+|\n+/).map(x => x.trim()).filter(Boolean);
const compiled = {};
const rx = (id, i, src) => compiled[id + "|" + i] || (compiled[id + "|" + i] = new RegExp(src, "i"));

/* the options a match may point at for this interaction - the same ones the
   form shows, worked out from the facts rather than the page. A hidden option
   can never be ticked, so it must never be suggested. */
function candidates(f, extra){
  const s = f.s || {};
  const out = [];
  const add = (group, list, ok) => list.forEach(([id, label]) => { if(!ok || ok(id)) out.push({ group, id, label: G.core.plain(label) }); });
  if(f.kind === "activity"){
    (f.tags || []).forEach(t => add("during", D.DURING[t] || []));
    add("learn", D.LEARN);
    add("enjoy", D.ENJOY, id => id !== "notmuch" && id !== "unclear");   // negations never match, so only the positive ones
    add("benefit", D.BENEFIT);
    const opt = (f.task.travel || {}).opt || "";
    add("risk", D.RISK, id => {
      const sc = D.RISK_SCOPE[id] || "all";
      return sc === "all" || (sc === "out" ? f.out
           : (f.travel && D.JOURNEY[sc].includes(opt)) || (sc === "vehicle" && s.slot === "drive") || ((sc === "stop" || sc === "fare") && s.slot === "bus"));
    });
  }
  if(f.kind === "personal"){
    add("dignity", D.DIGNITY);
    const ticked = id => (s.tasks || []).some(t => t.id === id);
    if(s.slot === "continence" || ticked("continence") || (f.flags || []).includes("continence")) add("contObs", D.CONT_OBS);
    if(s.slot === "night" || ticked("sleepcheck") || ticked("settle")) add("sleepObs", D.SLEEP_OBS);
  }
  if(f.kind === "medication"){ add("med", D.MED); add("medIssues", D.MED_ISSUES); }
  add("mood", D.MOOD);
  add("well", D.WELL, id => id !== "nochange");
  add("behaviour", D.BEHAVIOUR, id => id !== "other" && id !== "declinedact");
  add("followup", D.FOLLOWUP);
  (extra || []).forEach(c => out.push(c));
  return out;
}

/* what `text` already says, among `cands`: [{ group, id, label, sentence }] */
function find(text, cands, patterns){
  const P = patterns || D.MATCH;
  const found = [], seen = new Set();
  sentences(text).forEach(sentence => {
    if(NEGATED.test(sentence)) return;
    cands.forEach(c => {
      const key = c.group + "." + c.id;
      if(seen.has(key)) return;
      const pats = c.match || P[c.id];
      if(pats && pats.some((src, i) => rx(key, i, src).test(sentence))){ seen.add(key); found.push({ group: c.group, id: c.id, label: c.label, sentence }); }
    });
  });
  return found;
}

/* the ticked options a note's free text already covers: "group.id" -> which field said it */
function covered(s, f){
  const out = {};
  const cands = candidates(f);
  [["extra", s.extra], ["behaviourOther", (s.behaviour || []).includes("other") ? s.behaviourOther : ""]].forEach(([field, text]) => {
    if(!text) return;
    find(text, cands).forEach(m => {
      const cur = s[m.group];
      const ticked = Array.isArray(cur) ? cur.includes(m.id) : cur === m.id;
      if(ticked && !out[m.group + "." + m.id]) out[m.group + "." + m.id] = field;
    });
  });
  return out;
}

/* ---------- a staff sentence as a template ---------- */
const POSSESSIVE_NEXT = /^(?:own|[a-z]+)$/i;
const AFTER_OBJECT = new Set(["to", "with", "for", "at", "in", "on", "by", "from", "and", "but", "as", "up", "down", "out", "off", "into", "through", "about", "again", "then", "there", "back", "home", "a", "an", "the", "some", "that", "this", "which", "when", "while", "if", "so"]);

function toTemplate(text, pronoun, initials){
  let t = String(text || "").trim().replace(/\s+/g, " ");
  if(!t) return "";
  const N = String(initials || "").trim();
  if(N) t = t.replace(new RegExp("(^|[^A-Za-z0-9'])" + N.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![A-Za-z0-9])", "gi"), (m, pre) => pre + (pre === "" ? "{S}" : "{o}"));
  const map = {
    he:   { he: "{s}", him: "{o}", his: "{p}", himself: "{r}" },
    she:  { she: "{s}", hers: "{p}", herself: "{r}" },
    they: { they: "{s}", them: "{o}", their: "{p}", theirs: "{p}", themselves: "{r}", themself: "{r}" }
  }[pronoun] || {};
  const words = t.split(" ");
  const out = words.map((w, i) => {
    const m = /^([("']*)([A-Za-z']+)([^A-Za-z']*)$/.exec(w);
    if(!m) return w;
    const [, pre, core, post] = m, low = core.toLowerCase();
    let rep = map[low];
    if(pronoun === "she" && low === "her"){
      const next = (words[i + 1] || "").replace(/[^A-Za-z]/g, "").toLowerCase();
      rep = !next || AFTER_OBJECT.has(next) || !POSSESSIVE_NEXT.test(next) ? "{o}" : "{p}";
    }
    if(low === "was" || low === "were") rep = "{vbe}";
    if(low === "has" || low === "have") rep = "{vhave}";
    return rep ? pre + rep + post : w;
  }).join(" ");
  let tpl = out.replace(/^\{s\}/, "{S}").replace(/^\{o\}/, "{S}");
  tpl = tpl.charAt(0) === "{" ? tpl : tpl.charAt(0).toUpperCase() + tpl.slice(1);
  return tpl.replace(/[.!?]*$/, ".");
}

/* a short label for the option, from the template */
function toLabel(template){
  const core = template.replace(/^\{[SN]\}\s*/, "").replace(/\{s\}/g, "they").replace(/\{o\}/g, "them").replace(/\{p\}/g, "their")
    .replace(/\{r\}/g, "themselves").replace(/\{vbe\}/g, "were").replace(/\{vhave\}/g, "have").replace(/\{N\}/g, "").replace(/\.$/, "").trim();
  const label = core.charAt(0).toUpperCase() + core.slice(1);
  return label.length > 60 ? label.slice(0, 57).replace(/\s+\S*$/, "") + "…" : label;
}

/* a suggestion record for a sentence, with a guess at where it belongs */
function suggestion(sentence, f){
  const s = f.s || {};
  const template = toTemplate(sentence, s.pronoun, s.initials);
  const tags = f.kind === "activity" ? (f.tags || []) : [];
  const group = f.kind === "activity" ? (tags.length ? "during" : "learn") : "behaviour";
  return { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), template, label: toLabel(template), group, tags,
           kind: f.kind, at: new Date().toISOString().slice(0, 10) };
}

G.match = { candidates, find, covered, toTemplate, toLabel, suggestion, sentences, NEGATED };
})(globalThis.GSN = globalThis.GSN || {});
