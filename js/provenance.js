/* Fact provenance. Every sentence the narrative writes names the fields it
   came from; this module turns those names back into the values staff
   entered, checks each one really is filled in, and reduces a note to the
   set of facts it states - so a reworded note can be proved to say the same
   thing as the one before it.

   Source paths:
     time, resp, offerA ...        a plain field
     risk.crossing, mood.tired     one ticked choice in a group
     tasks.wash.level / .opt       one task row
     prompts.<rule>.<question>     an answer to a profile question
     explained.0                   a staff explanation of an inconsistency
     profile.texture               a profile value quoted in a sentence */
(function (G) {
"use strict";

const { present } = G.core;

const GROUPS = ["risk", "mood", "well", "how", "commUsed", "dignity", "contObs", "sleepObs", "behaviour", "followup", "learn", "during", "benefit", "med", "medIssues"];
const CHOICES = ["enjoy"];          // one-of fields addressed as field.value

function resolve(s, path){
  if(path.startsWith("prompts.")) return String((s.prompts || {})[path.slice(8)] || "");
  if(path.startsWith("explained.")) return String((s.explained || [])[Number(path.slice(10))] || "");
  const tt = /^profile\.timetable\.([\w-]+)\.chosen$/.exec(path);
  if(tt) return ((s.profile || {}).timetable || []).some(r => r.c === tt[1] && r.chosen) ? "yes" : "";
  if(path.startsWith("profile.")) return String((s.profile || {})[path.slice(8)] || "");
  const t = /^tasks\.([\w-]+)\.(level|opt)$/.exec(path);
  if(t){ const row = (s.tasks || []).find(x => x.id === t[1]); return row ? String(row[t[2]] || "") : ""; }
  const dot = path.indexOf(".");
  if(dot > 0 && CHOICES.includes(path.slice(0, dot))) return s[path.slice(0, dot)] === path.slice(dot + 1) ? path.slice(dot + 1) : "";
  if(dot > 0 && GROUPS.includes(path.slice(0, dot))){
    const v = path.slice(dot + 1);
    return (s[path.slice(0, dot)] || []).includes(v) ? v : "";
  }
  const v = s[path];
  return v == null ? "" : String(v);
}

/* problems with a built note: a sentence with no source, or a source that
   points at something nobody filled in. An empty list means every sentence
   is traceable to what staff actually entered. */
function verify(sentences, s){
  const problems = [];
  sentences.forEach(x => {
    if(!x.sources || !x.sources.length) problems.push({ sentence: x.text, problem: "has no source" });
    (x.sources || []).forEach(p => { if(!present(resolve(s, p))) problems.push({ sentence: x.text, problem: "source " + p + " is empty" }); });
  });
  return problems;
}

/* the facts a note states, as "field=value", sorted - wording-free */
function signature(sentences, s){
  const set = new Set();
  sentences.forEach(x => x.sources.forEach(p => set.add(p + "=" + resolve(s, p))));
  return [...set].sort();
}

const numbers = text => (String(text).match(/\d+(?::\d+)?/g) || []).sort();

/* Rewording may change sentence construction, order and phrasing. It may
   not change a fact, a number, a time, or anything staff typed. */
function sameFacts(a, b, s){
  const why = [];
  const sa = signature(a.sentences, s).join("\n"), sb = signature(b.sentences, s).join("\n");
  if(sa !== sb) why.push("the set of facts differs");
  if(numbers(a.text).join() !== numbers(b.text).join()) why.push("a number or time differs");
  ["extra", "declined", "behaviourOther", "handover", "whatAte", "chosen"].forEach(k => {
    /* case-blind: an opener may start "A shower was offered" where another says "offered a shower" */
    const v = String(s[k] || "").trim().replace(/[.!?]$/, "").toLowerCase();
    if(v && a.text.toLowerCase().includes(v) !== b.text.toLowerCase().includes(v)) why.push("staff's own words in " + k + " differ");
  });
  return { same: !why.length, why };
}

/* plain-English names for the developer view */
const LABELS = {
  initials: "Initials", pronoun: "Pronouns", time: "Time", date: "Date", staffing: "Staffing this time", kind: "Type of interaction",
  slot: "Which one", setting: "Activity setting", actOther: "Activity name", sessionTo: "Session ended",
  offerA: "Option offered", offerB: "Second option", resp: "Choice or response", chosen: "What they chose",
  declined: "How the refusal was respected", consent: "Consent", level: "Overall support", ate: "Amount eaten",
  whatAte: "What was eaten", offered: "Offered (ml)", drunk: "Drunk (ml)", drinkChoice: "Drink", skin: "Skin",
  skinDetail: "Skin detail", enjoy: "How much they enjoyed it", behaviourOther: "Behaviour (described)", extra: "Anything else", handover: "Handover", outcome: "Outcome"
};
const label = path => LABELS[path] || path;

G.provenance = { resolve, verify, signature, sameFacts, numbers, label, GROUPS };
})(globalThis.GSN = globalThis.GSN || {});
