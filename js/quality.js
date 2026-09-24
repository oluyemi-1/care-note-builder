/* What the note evidences, judged only on what applies to this interaction.
   There is no score to chase: a field that does not apply is not counted,
   and adding more words never raises anything. */
(function (G) {
"use strict";

const { taskLabel } = G.rules;

/* ---------- the organisation's audit checks (gate the Copy button) ---------- */
function orgAudit(f, extra){
  const s = f.s;
  /* answering a profile safety question is a risk control in its own right */
  const answered = !!(extra && extra.answered);
  const declined = s.resp === "declined" || s.resp === "delayed" || s.consent === "no";
  /* someone who declined outright had no support to grade, so asking for a
     level would force staff to record one that did not happen */
  const noSupport = f.declinedAll && !s.tasks.some(t => t.level && t.level !== "declined");
  return [
    {id:"interaction", field:"kind", ok: !!s.kind && !!s.slot, t:"Correct interaction selected", need:"the type of interaction", fix:"Pick the type of interaction in step 1."},
    {id:"response", field: s.resp ? "consent" : "resp", ok: !!s.resp && !!s.consent, t:"Choice, consent or response recorded", need:"their response and consent", fix:"Record their response and consent in step 2."},
    {id:"support", field: s.tasks.some(t => !t.level) ? "tasks." + s.tasks.find(t => !t.level).id + ".level" : s.level ? "tasks" : "level", ok: noSupport || (!!s.level && (s.tasks.some(t => t.level) || declined) && s.tasks.every(t => t.level)),
     t:"Independence and support level clear",
     need: s.tasks.some(t => !t.level) ? "how much support on each task you ticked" : "what you supported in step 3",
     fix: s.tasks.some(t => !t.level)
       ? "One or more ticked tasks in step 3 still need a support level."
       : "Set the overall support level and tick what you supported in step 3."},
    {id:"observation", field:"mood", ok: s.mood.length > 0 || s.well.length > 0 || (s.kind==="personal" && !!s.skin) || (s.kind==="activity" && (s.risk.length > 0 || s.learn.length > 0 || (s.during || []).length > 0)) || (s.kind==="eating" && (!!s.ate || !!s.drunk)) ||
                           answered || (s.behaviour || []).length > 0 || (s.contObs || []).length > 0 || (s.sleepObs || []).length > 0,
     t:"Relevant risk controls and observations included", need:"an observation", fix:"Add at least one observation in step 4."},
    {id:"outcome", field:"outcome", ok: !!s.outcome, t:"Meaningful outcome recorded", need:"how it ended for them", fix:"Choose an outcome in step 5."},
    {id:"refusal", field:"declined", ok: !declined || !!s.declined, t:"Refusal or non-engagement respected", need:"how you respected the refusal", fix:"Say what you did to respect the refusal in step 2."},
    {id:"attest", ok: !!s.attest, t:"Entry reflects what actually happened", fix:"Tick the confirmation under the note."}
  ];
}

/* ---------- independence evidence ---------- */
const ORDER = ["ind", "prompt", "min", "part", "full", "declined"];
const PHRASE = { ind:"done themselves", prompt:"with prompting", min:"with minimal help",
                 part:"part-supported", full:"done by staff", declined:"declined" };

function independence(f){
  const by = {};
  ORDER.forEach(l => { by[l] = []; });
  f.tasks.forEach(t => { if(t.level && by[t.level]) by[t.level].push(taskLabel(f.kind, t.id)); });
  const total = ORDER.reduce((n, l) => n + by[l].length, 0);
  const own = by.ind.length + by.prompt.length + by.min.length;
  const lines = ORDER.filter(l => by[l].length).map(l =>
    by[l].length + (by[l].length === 1 ? " task " : " tasks ") + PHRASE[l]);
  /* the rows say it more precisely than the overall level, so they decide
     whenever there are any; the overall level speaks only when there are none */
  return { by, total, own, lines,
           evidenced: own > 0 || (!total && ["ind", "prompt", "min"].includes(f.s.level)),
           allStaff: total > 0 && by.full.length === total };
}

/* ---------- evidence dimensions ----------
   status: "strong" | "ok" | "gap" | null (does not apply). A gap carries the
   plain-English feedback shown to staff. */
function dimensions(f, extra){
  extra = extra || {};
  const s = f.s, V = f.vars;
  const ind = independence(f);
  const d = [];
  const add = (id, label, status, message) => d.push({ id, label, status, message: message || "" });

  if(!f.college){
    add("offer", "Offer", s.offerA ? "ok" : f.kind === "activity" ? "gap" : null,
        "What was offered has not been recorded.");
    const twoOptions = !!(s.offerA && s.offerB);
    add("choice", "Choice",
        !s.resp ? "gap"
        : ["choseA", "choseB"].includes(s.resp) && twoOptions ? "strong"
        : s.resp === "noresp" ? "gap" : "ok",
        !s.resp ? "The person's choice or response has not been recorded."
        : "No clear response was recorded. If " + V.N + " responded in any way, record how.");
  } else {
    add("choice", "Response", s.resp ? "ok" : "gap", "How " + V.N + " felt about going has not been recorded.");
  }

  add("staffComm", "Staff communication", (s.commUsed || []).length ? "ok" : "gap",
      "How staff communicated with " + V.N + " has not been recorded.");

  if(s.resp && s.resp !== "noresp")
    add("communication", "Communication", s.how.length ? "ok" : "gap",
        "How " + V.N + " communicated " + V.p + " decision has not been recorded.");

  add("consent", "Consent", s.consent ? "ok" : "gap", "Consent has not been recorded.");

  const supportApplies = !(f.declinedAll && !s.tasks.some(t => t.level && t.level !== "declined"));
  if(supportApplies){
    add("support", "Support", s.level || s.tasks.some(t => t.level) ? "ok" : "gap",
        "The support given has not been recorded.");
    add("independence", "Independence",
        ind.evidenced ? (ind.own >= 2 ? "strong" : "ok") : ind.allStaff ? "gap" : null,
        "Every task is recorded as done by staff. If " + V.N + " contributed in any way - held something, made a choice, did one step - record it. If not, this is fine.");
  }

  if(s.kind === "personal" && supportApplies)
    add("dignity", "Dignity", (s.dignity || []).length ? "ok" : "gap", "How privacy and dignity were maintained has not been recorded.");

  const observed = s.mood.length || s.well.length || (s.kind === "personal" && s.skin) || (s.behaviour || []).length ||
                   (s.contObs || []).length || (s.sleepObs || []).length ||
                   (s.kind === "activity" && (s.risk.length || s.learn.length || (s.during || []).length)) || (s.kind === "eating" && (s.ate || s.drunk));
  add("observation", "Observation", observed ? "ok" : "gap", "Nothing observed has been recorded yet.");
  add("outcome", "Outcome", s.outcome ? "ok" : "gap", "An outcome has not yet been documented.");
  if(extra.handoverNeeded)
    add("followup", "Follow-up", s.handover || (s.followup || []).length ? "ok" : "gap",
        "Something worth handing over was recorded, and no follow-up has been recorded yet.");
  if(["declined", "delayed", "declinedgo", "reluctant"].includes(s.resp) || s.consent === "no")
    add("refusal", "Refusal respected", s.declined ? "ok" : "gap", "What staff did to respect the refusal has not been recorded.");
  return d;
}

/* one line of honest praise, only when it is earned */
function strengths(dims){
  const strong = dims.filter(x => x.status === "strong").map(x => x.label.toLowerCase());
  if(!strong.length) return "";
  return "Strong evidence of " + (strong.length === 1 ? strong[0] : strong.slice(0, -1).join(", ") + " and " + strong[strong.length - 1]) + ".";
}

G.quality = { orgAudit, independence, dimensions, strengths, LEVEL_ORDER: ORDER, LEVEL_PHRASE: PHRASE };
})(globalThis.GSN = globalThis.GSN || {});
