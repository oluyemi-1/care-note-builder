/* Wording checks on what staff type. Nothing is ever rewritten - a flagged
   word stays exactly as typed, and staff are asked what they actually saw.

   vague      says little ("fine", "good") - a quality suggestion
   judgement  labels the person rather than describing what happened
   phrase     institutional wording that puts staff in control of the person

   Providers can add their own terms in settings; these are the defaults. */
(function (G) {
"use strict";

const VAGUE = ["fine", "okay", "ok", "alright", "good", "bad", "normal", "nice", "as usual"];

const JUDGEMENT = ["difficult", "challenging", "naughty", "attention[- ]seeking", "non[- ]?compliant",
                   "uncooperative", "aggressive", "manipulative", "stubborn", "rude", "demanding",
                   "kicked off", "playing up", "tantrum", "outburst", "behaved", "badly behaved"];

const PHRASES = [
  { pattern: "allowed (?:him|her|them)? ?to", guidance: "“Allowed to” suggests staff give permission. Describe the person's choice instead, e.g. “chose to” or “was supported to”." },
  { pattern: "let (?:him|her|them)", guidance: "“Let” suggests staff give permission. Describe what the person chose or was supported to do." },
  { pattern: "made (?:him|her|them)", guidance: "“Made” suggests the person had no say. Describe what was offered and how they responded." },
  { pattern: "refused to cooperate", guidance: "Describe what the person did and said or showed, e.g. “declined and moved away”." },
  { pattern: "attention[- ]seeking", guidance: "Describe the behaviour and what the person may have been communicating." },
  { pattern: "non[- ]?compliant", guidance: "Describe what was offered and how the person responded." },
  { pattern: "(?:was|were|got|been) fed|fed (?:him|her|them)", guidance: "Describe how the person was supported to eat, e.g. “was supported to eat”." },
  { pattern: "toileted", guidance: "Describe the support, e.g. “was supported to use the toilet”." },
  { pattern: "put (?:him|her|them) to bed|put to bed", guidance: "Describe the support, e.g. “was supported to bed”." },
  { pattern: "wander(?:ed|ing|s)?", guidance: "Describe where the person walked and anything they said about it." },
  { pattern: "refused", guidance: "“Declined” is more neutral than “refused”, and says the same thing." },
  { pattern: "screamed|screaming", guidance: "Describe what you heard, e.g. “shouted” or “raised his voice”, and for how long." }
];

/* the observable alternatives offered when a vague or judgemental word turns up */
const OBSERVE_EXAMPLES = ["raised voice", "moved away from staff", "declined the activity", "pushed an item away",
                          "repeatedly asked to leave", "smiled or laughed", "said what they wanted"];

const rx = src => new RegExp("(^|[^\\w'])(" + src + ")(?=$|[^\\w'])", "gi");
const escRx = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");

/* extra: { vague:[...], judgement:[...], phrases:[{phrase, guidance}] } from provider settings */
function scan(fields, extra){
  extra = extra || {};
  const vague = VAGUE.map(t => ({ src: escRx(t), term: t, kind: "vague" }))
    .concat((extra.vague || []).map(t => ({ src: escRx(t), term: t, kind: "vague" })));
  const judge = JUDGEMENT.map(t => ({ src: t, kind: "judgement" }))
    .concat((extra.judgement || []).map(t => ({ src: escRx(t), term: t, kind: "judgement" })));
  const phrases = PHRASES.map(p => ({ src: p.pattern, kind: "phrase", guidance: p.guidance }))
    .concat((extra.phrases || []).map(p => ({ src: escRx(p.phrase), kind: "phrase", guidance: p.guidance })));

  const found = [];
  (fields || []).forEach(fd => {
    const text = String(fd.text || "");
    if(!text.trim()) return;
    const seen = new Set();
    /* phrases first: "attention seeking" and "refused to cooperate" are
       better explained by their own guidance than as a lone word */
    phrases.concat(judge, vague).forEach(w => {
      const re = rx(w.src);
      let m;
      while((m = re.exec(text))){
        const word = m[2];
        const start = m.index + m[1].length;
        if([...seen].some(r => start < r[1] && start + word.length > r[0])) continue;   // already inside a longer match
        seen.add([start, start + word.length]);
        found.push({ field: fd.id, fieldLabel: fd.label, term: word, kind: w.kind, guidance: w.guidance || "" });
      }
    });
  });
  return found;
}

G.language = { VAGUE, JUDGEMENT, PHRASES, OBSERVE_EXAMPLES, scan };
})(globalThis.GSN = globalThis.GSN || {});
