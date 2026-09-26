/* Smart Assist: gathers what every engine noticed into one ordered list.

   CRITICAL    a safety event staff recorded - used sparingly
   REVIEW      answers that disagree, or wording that judges the person
   MISSING     something the note has to evidence and does not yet
   SUGGESTION  a person-centred opportunity or optional improvement
   PASS        evidence already in place

   Every finding carries a reason, so nothing is a black box. */
(function (G) {
"use strict";

const SEVERITY = {
  critical:   { rank: 0, label: "Critical",   icon: "‼" },
  review:     { rank: 1, label: "Review",     icon: "?" },
  missing:    { rank: 2, label: "Missing",    icon: "!" },
  suggestion: { rank: 3, label: "Suggestion", icon: "i" },
  pass:       { rank: 4, label: "Pass",       icon: "✓" }
};

/* the free-text boxes worth reading for wording */
function textFields(s, explanations){
  const f = [
    { id: "extra",      label: "Anything else",                 text: s.extra },
    { id: "declined",   label: "How the refusal was respected",  text: s.declined },
    { id: "handover",   label: "Handover",                       text: s.handover },
    { id: "skinDetail", label: "What you saw on the skin",       text: s.skinDetail },
    { id: "whatAte",    label: "What was eaten",                 text: s.whatAte },
    { id: "actOther",   label: "Name the activity",              text: s.actOther },
    { id: "behaviourOther", label: "What you observed",              text: s.behaviourOther }
  ];
  Object.keys(explanations || {}).forEach(k => f.push({ id: "explain:" + k, label: "Your explanation", text: explanations[k] }));
  return f;
}

const quote = s => "“" + s + "”";
const squash = s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function collect(ctx){
  const f = G.rules.facts(ctx);
  ctx = Object.assign({}, ctx, { f });
  const V = f.vars;
  const explanations = ctx.explanations || {};
  const items = [];
  const push = it => items.push(it);

  /* ---- rules that apply to this person and interaction ---- */
  const rules = G.rules.evaluate(ctx, ctx.rules);
  const escalate = G.core.fill(G.rules.ESCALATE, V);
  const handoverText = squash(f.s.handover);
  const handedOver = (f.s.followup || []).includes("handover");
  const inHandover = t => !!t && handoverText.includes(squash(t));
  const handovers = [];              // lines staff might want to hand over
  const coveredFields = new Set();
  rules.forEach(r => {
    r.important.forEach(imp => {
      coveredFields.add(imp.field);
      if(G.core.present(f.s[imp.field])) return;
      if(imp.field === "commUsed" && (ctx.auditExtra || []).includes("staffComm")) return;   // raised below as a requirement
      push({ id: "r:" + r.id + ":" + imp.field, severity: imp.severity || "missing", group: "rule",
             title: imp.message, reason: r.reason, fields: [imp.field] });
    });
    const addressed = r.prompts.some(p => p.answer) || r.watch.some(k => G.core.present(f.s[k])) ||
      r.highlight.some(h => { const [g, v] = h.split("."); return (f.s[g] || []).includes(v); });
    if(r.suggest && !addressed)
      push({ id: "r:" + r.id, severity: "suggestion", group: "rule", rank: 0,
             title: r.suggest, reason: r.reason,
             fields: r.prompts.length ? ["prompt:" + r.prompts[0].key] : r.highlight.map(h => h.split(".")[0]).concat(r.watch) });

    /* a safety answer staff gave: say so plainly, and offer a handover line */
    r.prompts.forEach(p => {
      if(!p.trigger) return;
      const said = p.answer === "yes" ? "Yes" : "No";
      push({ id: "p:" + p.key, severity: p.trigger.severity, group: "prompt", title: p.trigger.message,
             reason: "You answered " + quote(said) + " to " + quote(p.text) + " " + escalate,
             fields: ["prompt:" + p.key], handover: inHandover(p.trigger.handover) ? "" : p.trigger.handover });
      if(p.trigger.handover) handovers.push(p.trigger.handover);
      /* a safety event recorded without a word about it is not a note anyone
         can act on, so copying waits until it is described */
      if(p.trigger.require && !G.core.present(f.s[p.trigger.require.field]))
        push({ id: "p:" + p.key + ":detail", severity: "missing", group: "prompt", title: p.trigger.require.message,
               reason: "A safety event was recorded, so the note must describe it in the staff member's own words before it can be copied.",
               fields: [p.trigger.require.field], blocking: true, required: true });
    });

    if(r.handover){
      handovers.push(r.handover);
      if(!inHandover(r.handover) && !handedOver)
        push({ id: "h:" + r.id, severity: "suggestion", group: "handover", rank: -1,
               title: "Consider a handover entry: " + quote(r.handover),
               reason: r.reason + " " + escalate + " Nothing is added unless you choose to.",
               fields: ["handover"], handover: r.handover });
    }
  });

  /* ---- changes from the person's own recorded pattern (history is optional) ---- */
  if(ctx.history && f.s.initials){
    const current = G.patterns.toRecord(f.s, { id: ctx.recordId, now: ctx.now });
    G.patterns.detect(ctx.history, current, {
      now: ctx.now, windowDays: ctx.windowDays, initials: V.N, fluidTarget: (ctx.profile || {}).fluidTarget,
      taskLabel: id => G.rules.taskLabel(f.kind, id)
    }).forEach(p => {
      if(inHandover(p.handover)) p.handover = "";
      push(p);
    });
  }

  /* ---- an activity that is on the person's college timetable ---- */
  const tt = G.rules.timetabled(f.s, ctx.profile, ctx.now);
  if(tt){
    const when = tt.today ? "today" : "on " + tt.dayName + "s";
    const times = tt.from ? " (" + tt.from + (tt.to ? "\u2013" + tt.to : "") + ")" : "";
    push({ id: "tt:college", severity: "suggestion", group: "context", rank: -1,
           title: tt.sameActivity ? V.N + "'s timetable has " + tt.courseLabel + " as a college course " + when + times + ". Was this the college session?"
                                  : V.N + " has " + tt.courseLabel + " at college today" + times + ". Is this note about that session?",
           reason: "Choosing College course records it as the arranged session - the journey there, the class and what " + V.s +
                   " gained - rather than as an activity offered at home today. Nothing changes unless you choose it.",
           fields: ["setting"] });
  }

  /* ---- contradictions ---- */
  const contra = G.contradictions.detect(ctx);
  contra.forEach(c => {
    const why = (explanations[c.id] || "").trim();
    push({ id: "c:" + c.id, severity: "review", group: "contradiction", title: c.message, reason: c.reason,
           fields: c.fields, explain: c.id, explained: !!why, blocking: !why });
  });

  /* ---- wording ---- */
  const standing = {};
  contra.forEach(c => { if(explanations[c.id]) standing[c.id] = explanations[c.id]; });
  G.language.scan(textFields(f.s, standing), ctx.language).forEach(w => {
    const eg = G.language.OBSERVE_EXAMPLES.slice(0, 5).join(", ");
    const field = w.field.startsWith("explain:") ? null : w.field;
    if(w.kind === "vague")
      push({ id: "l:" + w.field + ":" + w.term.toLowerCase(), severity: "suggestion", group: "language", rank: 2,
             title: quote(w.term) + " in " + w.fieldLabel + " - what did you observe?",
             reason: quote(w.term) + " does not say what staff saw. Describe what " + V.N + " said, did or how " + V.s +
                     " looked - for example: " + eg + ". The wording you typed is never changed for you.",
             fields: field ? [field] : [] });
    else
      push({ id: "l:" + w.field + ":" + w.term.toLowerCase(), severity: "review", group: "language",
             title: quote(w.term) + " in " + w.fieldLabel + (w.kind === "judgement"
               ? " describes a judgement rather than what happened." : " may read as institutional."),
             reason: (w.guidance || "Words like this label the person rather than describing what happened. Record what you observed - for example: " + eg + ".") +
                     " The wording you typed is never changed for you.",
             fields: field ? [field] : [] });
  });

  /* ---- what the free text already says that could be a tick ---- */
  const cands = G.match.candidates(f);
  const saidIn = {};
  [["extra", f.s.extra], ["behaviourOther", (f.s.behaviour || []).includes("other") ? f.s.behaviourOther : ""]].forEach(([field, text]) => {
    if(!text) return;
    G.match.find(text, cands).forEach(m => {
      const key = m.group + "." + m.id;
      if(saidIn[key]) return;
      saidIn[key] = field;
      const cur = f.s[m.group];
      if(Array.isArray(cur) ? cur.includes(m.id) : cur === m.id) return;   // already ticked; the note says it once, in the staff member's words
      push({ id: "m:" + key, severity: "suggestion", group: "match", rank: 1,
             title: "Your words say this - tick " + quote(m.label) + " to record it as a fact?",
             reason: "You wrote " + quote(m.sentence) + ". Ticking " + quote(m.label) + " records the same thing in a form that counts in " +
                     V.N + "'s history and record fields. Your own words stay in the note, and it will not say this twice.",
             fields: [m.group], tick: key });
    });
  });

  /* ---- the organisation's audit ---- */
  const audit = G.quality.orgAudit(f, { answered: rules.some(r => r.prompts.some(p => p.answer)) });
  const optional = ctx.auditOptional || [], extra = ctx.auditExtra || [];
  audit.forEach(a => {
    if(a.ok || a.id === "attest") return;
    const opt = optional.includes(a.id);
    push({ id: "a:" + a.id, severity: opt ? "suggestion" : "missing", group: "audit", title: a.fix,
           reason: "One of your organisation's audit checks: " + quote(a.t) + "." + (opt ? " Your organisation has made this one optional." : ""),
           fields: a.field ? [a.field] : [] });
  });
  /* the checks that must pass before the note can be copied */
  const contentOk = audit.every(a => a.ok || a.id === "attest" || optional.includes(a.id));

  /* ---- evidence the audit does not already cover ---- */
  const dims = G.quality.dimensions(f, { handoverNeeded: handovers.length > 0 });
  const ind = G.quality.independence(f);
  dims.forEach(d => {
    if(d.status !== "gap") return;
    /* a provider can make these two requirements of its own */
    const req = extra.includes(d.id);
    const ask = req ? { severity: "missing", blocking: true, required: true } : { severity: "suggestion" };
    const why = req ? " Your organisation requires this before a note is copied." : "";
    if(d.id === "staffComm" && (req || !coveredFields.has("commUsed")))
      push(Object.assign({ id: "q:staffComm", group: "quality", rank: 1, title: d.message,
             reason: "How staff communicated shows the person was given information in a way that works for them." + why, fields: ["commUsed"] }, ask));
    if(d.id === "dignity")
      push(Object.assign({ id: "q:dignity", group: "quality", rank: 2, title: d.message,
             reason: "This is personal care, where privacy and dignity are part of the evidence." + why, fields: ["dignity"] }, ask));
    if(d.id === "communication" && !coveredFields.has("how"))
      push({ id: "q:communication", severity: "suggestion", group: "quality", rank: 1, title: d.message,
             reason: "Recording how the person let staff know keeps their voice in the note.", fields: ["how"] });
    if(d.id === "independence")
      push({ id: "q:independence", severity: "suggestion", group: "quality", rank: 3, title: d.message,
             reason: "Notes should show what the person did, not only what staff did.", fields: ["tasks"] });
    if(d.id === "choice" && f.s.resp === "noresp")
      push({ id: "q:choice", severity: "suggestion", group: "quality", rank: 1, title: d.message,
             reason: "Even small signs - looking toward something, pushing it away - show the person's response.", fields: ["resp"] });
    if(d.id === "medTold" || d.id === "medLabel" || d.id === "medGiven")
      push({ id: "q:" + d.id, severity: "suggestion", group: "quality", rank: 0, title: d.message,
             reason: d.id === "medLabel" ? "The care record asks whether the label was checked against the MAR chart. Tick it only if you did."
                   : d.id === "medTold" ? "Telling the person what they are taking, and why, is part of consent. Tick it only if you did."
                   : "The care record asks whether the medication was administered as prescribed.", fields: [d.id === "medGiven" ? "med" : "med"] });
    if(d.id === "enjoyment")
      push({ id: "q:enjoyment", severity: "suggestion", group: "quality", rank: 2, title: d.message,
             reason: "The care record asks for the level of enjoyment. One tick under How much they enjoyed it covers it; the behaviour options say what showed it.", fields: ["enjoy"] });
    if(d.id === "benefit")
      push({ id: "q:benefit", severity: "suggestion", group: "quality", rank: 2, title: d.message,
             reason: "The care record asks how the activity benefited the person in meeting their wishes and outcomes.", fields: ["benefit"] });
    if(d.id === "enrolment")
      push({ id: "q:enrolment", severity: "suggestion", group: "quality", rank: 1, title: d.message,
             reason: "The care record asks how the person chose the activity. A college course is chosen once, at the start of the year; ticking it on the timetable says so in every note for that course.", fields: ["tt"] });
    if(d.id === "offer")
      push({ id: "q:offer", severity: "suggestion", group: "quality", rank: 1, title: d.message,
             reason: "Recording what was offered shows the person had a choice.", fields: ["offerA"] });
  });

  items.sort((a, b) => (SEVERITY[a.severity].rank - SEVERITY[b.severity].rank) || ((a.rank || 0) - (b.rank || 0)));

  /* ---- what is already in place ---- */
  const passes = [];
  const passFor = { choice: d => d.status === "strong" ? "Choice evidenced between two options" : f.college ? "Response recorded" : "Choice or response recorded",
                    communication: () => "Their communication recorded", staffComm: () => "Staff communication recorded",
                    consent: () => "Consent recorded", dignity: () => "Dignity and privacy evidenced", followup: () => "Follow-up recorded",
                    enjoyment: () => "Enjoyment recorded", benefit: () => "Benefit to them recorded", enrolment: () => "How they chose the course recorded",
                    medTold: () => "Told what it was and why", medLabel: () => "MAR label check recorded", medGiven: () => "Given as prescribed recorded",
                    independence: () => "Independence evidenced", observation: () => "Observation recorded",
                    outcome: () => "Outcome recorded", refusal: () => "Refusal respected" };
  dims.forEach(d => { if((d.status === "ok" || d.status === "strong") && passFor[d.id]) passes.push(passFor[d.id](d)); });
  if(!contra.length) passes.push("No logical contradictions detected");

  const counts = {};
  Object.keys(SEVERITY).forEach(k => { counts[k] = items.filter(i => i.severity === k && !i.explained).length; });
  counts.explained = items.filter(i => i.explained).length;
  return {
    items, passes, counts, audit, dims, independence: ind, rules, contradictions: contra, handovers,
    strengths: G.quality.strengths(dims),
    auditPassed: audit.filter(a => a.ok).length,
    contentOk,
    blocking: items.some(i => i.blocking),
    requiredMissing: items.some(i => i.required)
  };
}

G.smartAssist = { SEVERITY, collect, textFields };
})(globalThis.GSN = globalThis.GSN || {});
