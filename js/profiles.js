/* The person-centred profile. It gives the app CONTEXT - which questions are
   worth asking, what to remind staff of - and nothing else. No field here is
   ever turned into a sentence in the note, and nothing is inferred from it:
   no diagnosis, no assumption about what happened today. */
(function (G) {
"use strict";

const { present } = G.core;
const { FLAGS, COMM, OVERALL_LEVELS } = G.data;

const MOBILITY = [["", "Not recorded"], ["independent", "Walks independently"], ["aid", "Walks with an aid"],
                  ["wheelchair", "Uses a wheelchair"], ["transfers", "Needs equipment for transfers"]];

/* Sections of the "more about this person" editor. type: text | textarea |
   select | number. Providers add their own fields in settings. */
const PROFILE_SECTIONS = [
  { title: "Communication", fields: [
    { id: "commApproach", label: "Preferred communication approach", type: "textarea",
      placeholder: "e.g. One option at a time; show the object; wait ten seconds for a response" }] },
  { title: "Sensory and mobility", fields: [
    { id: "sensory", label: "Sensory needs", type: "text", placeholder: "e.g. Sensitive to loud noise" },
    { id: "mobility", label: "Mobility", type: "select", options: MOBILITY },
    { id: "mobilityAid", label: "Mobility aid", type: "text", placeholder: "e.g. long cane, walking frame" }] },
  { title: "Eating and drinking", fields: [
    { id: "eatingSupport", label: "Eating and drinking support", type: "text", placeholder: "e.g. Adapted cutlery" },
    { id: "texture", label: "Prescribed diet or texture", type: "text", placeholder: "e.g. IDDSI Level 6 soft and bite-sized" },
    { id: "fluidTarget", label: "Daily fluid target (ml)", type: "number", min: 0, max: 5000, step: 50 }] },
  { title: "Continence", fields: [
    { id: "continenceSupport", label: "Continence support", type: "text", placeholder: "e.g. Prompt to use the toilet every two hours" }] },
  { title: "Wellbeing and routine", fields: [
    { id: "triggers", label: "Anxiety triggers and what helps", type: "textarea", placeholder: "e.g. Crowds and sudden noise; a quiet space and a familiar song help" },
    { id: "preferences", label: "Known preferences", type: "textarea", placeholder: "e.g. Likes a bath in the evening; tea with two sugars" },
    { id: "routines", label: "Routines", type: "textarea", placeholder: "e.g. Morning walk before breakfast" }] },
  { title: "Independence and community", fields: [
    { id: "usualLevel", label: "Usual level of independence", type: "select", options: [["", "Not recorded"]].concat(OVERALL_LEVELS) },
    { id: "communitySupport", label: "Community support requirements", type: "textarea", placeholder: "e.g. Needs support to cross roads; staff hold bank card" },
    { id: "interests", label: "Activities and interests", type: "text", placeholder: "e.g. Swimming, music, buses" }] },
  { title: "Individual risks", fields: [
    { id: "risks", label: "Individual risks (one per line)", type: "textarea", placeholder: "e.g. Tries to leave the building when anxious" }] }
];

const FIELD_IDS = PROFILE_SECTIONS.reduce((a, sec) => a.concat(sec.fields.map(f => f.id)), []);

/* initials as they are stored and written: O'B and J-P are fine, markup is not */
const cleanInitials = v => String(v || "").toUpperCase().replace(/[^A-Z0-9'-]/g, "").slice(0, 4);
const MAX_TEXT = 600;

/* a profile from any source - an old save, an import, the form - in one
   predictable shape; unknown keys other than custom fields are dropped */
function normalizeProfile(p, knownFlags, knownComm){
  p = p || {};
  const okFlag = new Set((knownFlags || FLAGS).map(f => f[0]));
  const okComm = new Set((knownComm || COMM).map(c => c[0]));
  const str = v => typeof v === "string" ? v.trim().slice(0, MAX_TEXT) : "";
  const out = {
    initials: cleanInitials(str(p.initials)),
    pronoun: ["he", "she", "they"].includes(p.pronoun) ? p.pronoun : "they",
    ratio: ["", "1:1", "2:1", "shared"].includes(p.ratio) ? p.ratio : "",
    comm: Array.isArray(p.comm) ? p.comm.filter(c => okComm.has(c)) : [],
    flags: Array.isArray(p.flags) ? p.flags.filter(f => okFlag.has(f)) : [],
    timetable: Array.isArray(p.timetable) ? p.timetable.filter(r => r && typeof r === "object").slice(0, 30).map(r => ({
      d: String(r.d || "").slice(0, 1), c: str(r.c).slice(0, 40), from: str(r.from).slice(0, 5), to: str(r.to).slice(0, 5) })) : [],
    custom: {}
  };
  FIELD_IDS.forEach(id => { out[id] = str(p[id]); });
  if(!MOBILITY.some(m => m[0] === out.mobility)) out.mobility = "";
  if(!OVERALL_LEVELS.some(l => l[0] === out.usualLevel)) out.usualLevel = "";
  const t = Number(p.fluidTarget);
  out.fluidTarget = present(p.fluidTarget) && Number.isFinite(t) && t > 0 && t <= 5000 ? String(Math.round(t)) : "";
  if(p.custom && typeof p.custom === "object")
    Object.keys(p.custom).slice(0, 40).forEach(k => { if(/^[a-z0-9_-]{1,40}$/i.test(k)) out.custom[k] = str(p.custom[k]); });
  return out;
}

/* short reminders for the top of the form - context, not claims */
function contextSummary(p, flagList){
  const out = [];
  const label = (list, id) => (list.find(x => x[0] === id) || ["", ""])[1];
  (p.flags || []).forEach(f => {
    if(f === "fluids" && p.fluidTarget) return;          // the amount below says it better
    const l = label(flagList || FLAGS, f); if(l) out.push(l);
  });
  if(p.texture) out.push("Texture: " + p.texture);
  if(p.fluidTarget) out.push("Fluid target " + Number(p.fluidTarget).toLocaleString("en-GB") + " ml a day");
  if(p.mobility) out.push(label(MOBILITY, p.mobility) + (p.mobilityAid ? " (" + p.mobilityAid + ")" : ""));
  else if(p.mobilityAid) out.push("Mobility aid: " + p.mobilityAid);
  if(p.usualLevel) out.push("Usually: " + label(OVERALL_LEVELS, p.usualLevel).toLowerCase());
  if(p.commApproach) out.push("Communication: " + p.commApproach);
  if(p.triggers) out.push("Triggers: " + p.triggers);
  return out;
}

G.profiles = { PROFILE_SECTIONS, FIELD_IDS, MOBILITY, normalizeProfile, contextSummary, cleanInitials };
})(globalThis.GSN = globalThis.GSN || {});
