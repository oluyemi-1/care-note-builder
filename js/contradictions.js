/* Answers that cannot all be true at once. Nothing here corrects anything:
   each check says what disagrees and why it matters, and the staff member
   either fixes whichever answer is wrong or explains what happened.

   A check returns null when all is well, or
   { message, reason, fields } - fields name the inputs involved. */
(function (G) {
"use strict";

const { toMins, plain } = G.core;
const { LEVELS, OVERALL_LEVELS, OUTCOME, TRAVEL_RISK } = G.data;
const { RANK, HANDS_ON, DECLINED_RESP, taskLabel } = G.rules;

const lvlName = id => plain((LEVELS.find(l => l[0] === id) || ["", id])[1]);
const overallName = id => plain((OVERALL_LEVELS.find(l => l[0] === id) || ["", id])[1]);
const outName = id => plain((OUTCOME.find(o => o[0] === id) || ["", id])[1]);
const num = v => v === "" || v == null ? null : Number(v);
const norm = v => String(v || "").trim().toLowerCase().replace(/^(a|an|the|some)\s+/, "");
const and = arr => arr.length < 2 ? arr.join("") : arr.slice(0, -1).join(", ") + " and " + arr[arr.length - 1];
const quote = s => "“" + s + "”";

/* tasks with a level set, grouped by a test on the level */
const tasksWhere = (f, test) => f.tasks.filter(t => t.level && test(t.level));
const names = (f, ts) => and(ts.map(t => taskLabel(f.kind, t.id)));

const CONTRADICTIONS = [
  {
    id: "overall-independent-vs-hands-on",
    test: f => {
      if(!["ind", "prompt"].includes(f.s.level)) return null;
      const hands = tasksWhere(f, l => HANDS_ON.includes(l));
      if(!hands.length) return null;
      return {
        message: "Overall support is " + quote(overallName(f.s.level)) + ", but " + names(f, hands) +
                 (hands.length > 1 ? " are" : " is") + " recorded as " + and([...new Set(hands.map(t => quote(lvlName(t.level))))]) + ".",
        reason: "An interaction without hands-on support cannot include a task where staff gave hands-on help. One of these answers is likely wrong.",
        fields: ["level"].concat(hands.map(t => "tasks." + t.id + ".level"))
      };
    }
  },
  {
    id: "overall-full-vs-independent",
    test: f => {
      if(f.s.level !== "full") return null;
      const done = tasksWhere(f, l => l !== "declined");
      if(!done.length || !done.every(t => RANK[t.level] <= RANK.prompt)) return null;
      return {
        message: "Overall support is " + quote(overallName("full")) + ", but every task is recorded as done by " +
                 "the person themselves or with prompting only.",
        reason: "Full hands-on support means staff carried out the care. None of the tasks recorded say so.",
        fields: ["level"].concat(done.map(t => "tasks." + t.id + ".level"))
      };
    }
  },
  {
    id: "no-consent-but-support",
    test: f => {
      if(f.s.consent !== "no") return null;
      const hands = tasksWhere(f, l => HANDS_ON.includes(l));
      if(!hands.length && !HANDS_ON.includes(f.s.level)) return null;
      return {
        message: "Consent is recorded as not given, but hands-on support is also recorded" +
                 (hands.length ? " (" + names(f, hands) + ")" : "") + ".",
        reason: "Hands-on support without consent needs to be looked at. Either the consent answer or the support recorded may be wrong - or, if consent was given later, say so.",
        fields: ["consent", "level"].concat(hands.map(t => "tasks." + t.id + ".level"))
      };
    }
  },
  {
    id: "declined-but-supported",
    test: f => {
      if(!DECLINED_RESP.includes(f.s.resp)) return null;
      const done = tasksWhere(f, l => l !== "declined");
      if(!done.length && !f.s.level && !(f.s.learn || []).length) return null;
      const what = done.length ? names(f, done) + " recorded as done"
                 : f.s.level ? "an overall support level of " + quote(overallName(f.s.level))
                 : "skills or social outcomes from the session";
      return {
        message: "The response is recorded as declined, but there is also " + what + ".",
        reason: "If the person declined, the note should not also say the support or activity took place. If they declined at first and then agreed, choose “Declined at first, then agreed”.",
        fields: ["resp"].concat(done.map(t => "tasks." + t.id + ".level"), f.s.level ? ["level"] : [], (f.s.learn || []).length ? ["learn"] : [])
      };
    }
  },
  {
    id: "drunk-more-than-offered",
    test: f => {
      const off = num(f.s.offered), dr = num(f.s.drunk);
      if(off === null || dr === null || dr <= off) return null;
      return {
        message: dr + " ml was recorded as drunk, but only " + off + " ml was recorded as offered.",
        reason: "A person cannot drink more than was offered in one sitting. If a top-up was given, record the total offered.",
        fields: ["offered", "drunk"]
      };
    }
  },
  {
    id: "negative-amount",
    test: f => {
      const bad = ["offered", "drunk"].filter(k => num(f.s[k]) !== null && (num(f.s[k]) < 0 || Number.isNaN(num(f.s[k]))));
      if(!bad.length) return null;
      return {
        message: "A fluid amount is below zero or not a number.",
        reason: "Amounts are recorded in millilitres and cannot be negative.",
        fields: bad
      };
    }
  },
  {
    id: "implausible-amount",
    test: f => {
      const big = ["offered", "drunk"].filter(k => num(f.s[k]) > 2000);
      if(!big.length) return null;
      return {
        message: "More than 2000 ml is recorded for a single drink.",
        reason: "That is far more than one sitting usually involves. Check the amount - it may have been a daily total or a typing slip.",
        fields: big
      };
    }
  },
  {
    id: "declined-but-enjoyed",
    test: f => {
      if(!(DECLINED_RESP.includes(f.s.resp) || f.s.consent === "no")) return null;
      if(!["enjoyed", "proud"].includes(f.s.outcome)) return null;
      return {
        message: "The person is recorded as declining, but the outcome is " + quote(outName(f.s.outcome)) + ".",
        reason: "An outcome about enjoying or being pleased with something does not fit an interaction they declined. If they did something else instead, record that.",
        fields: ["resp", "outcome"]
      };
    }
  },
  {
    id: "not-enjoyed-but-enjoyed",
    test: f => {
      if(f.s.enjoy !== "notmuch" || !["enjoyed", "proud"].includes(f.s.outcome)) return null;
      return {
        message: "\u201cDid not appear to enjoy it\u201d is recorded, but the outcome is " + quote(outName(f.s.outcome)) + ".",
        reason: "The note cannot say both. If they enjoyed part of it, choose \u201cEnjoyed parts of it\u201d.",
        fields: ["enjoy", "outcome"]
      };
    }
  },
  {
    id: "home-activity-with-travel",
    test: f => {
      if(f.kind !== "activity" || f.college || f.where !== "home" || !f.travel) return null;
      const opt = (f.task.travel || {}).opt;
      return {
        message: f.activity + " is set up as an at-home activity, but a journey" + (opt ? " " + opt : "") + " is recorded.",
        reason: "Travel does not usually go with an activity done at home. If it took place somewhere else, choose “Something else” and name it.",
        fields: ["slot", "tasks.travel.level"]
      };
    }
  },
  {
    id: "home-activity-with-travel-safety",
    test: f => {
      if(f.kind !== "activity" || f.college || f.where !== "home" || f.travel) return null;
      const r = (f.s.risk || []).filter(x => TRAVEL_RISK.includes(x) && x !== "road" && x !== "crossing");
      if(!r.length && f.s.outcome !== "home") return null;
      return {
        message: f.activity + " is set up as an at-home activity, but " +
                 (r.length ? "journey safety measures are" : "the outcome “Returned home safely” is") + " recorded.",
        reason: "Seatbelts, bus stops, fares and returning home belong to a journey, and no journey is recorded for an at-home activity.",
        fields: ["slot"].concat(r.length ? ["risk"] : ["outcome"])
      };
    }
  },
  {
    id: "travel-declined-but-journey-safety",
    test: f => {
      const t = f.task.travel;
      if(!t || t.level !== "declined") return null;
      const r = (f.s.risk || []).filter(x => ["seatbelt", "stop", "fare", "doortodoor"].includes(x));
      if(!r.length) return null;
      return {
        message: "Travelling there is recorded as declined, but journey safety measures are also recorded.",
        reason: "Seatbelts, bus stops, fares and door-to-door escorts belong to a journey that took place.",
        fields: ["tasks.travel.level", "risk"]
      };
    }
  },
  {
    id: "ate-none-but-ate",
    test: f => {
      if(f.s.ate !== "None") return null;
      const eat = f.task.eat;
      if(!(eat && eat.level && eat.level !== "declined") && !f.s.whatAte) return null;
      return {
        message: "Amount eaten is “None”, but " + (f.s.whatAte ? "what was eaten is filled in" : "eating is recorded as " + quote(lvlName(eat.level))) + ".",
        reason: "If nothing was eaten, the note cannot also say what was eaten or how eating was supported.",
        fields: ["ate"].concat(f.s.whatAte ? ["whatAte"] : ["tasks.eat.level"])
      };
    }
  },
  {
    id: "declined-meal-but-ate",
    test: f => {
      if(!f.s.ate || f.s.ate === "None") return null;
      const eat = f.task.eat;
      if(!(eat && eat.level === "declined") && f.s.resp !== "declined") return null;
      return {
        message: "The meal is recorded as declined, but the amount eaten is “" + f.s.ate + "”.",
        reason: "A declined meal and food eaten do not fit together. If an alternative was eaten, record that instead.",
        fields: ["ate", eat && eat.level === "declined" ? "tasks.eat.level" : "resp"]
      };
    }
  },
  {
    id: "declined-drink-but-drank",
    test: f => {
      const d = f.task.drink;
      if(!(d && d.level === "declined") || !(num(f.s.drunk) > 0)) return null;
      return {
        message: "Drinking is recorded as declined, but " + f.s.drunk + " ml was recorded as drunk.",
        reason: "If the drink was declined, an amount drunk does not fit.",
        fields: ["tasks.drink.level", "drunk"]
      };
    }
  },
  {
    id: "no-change-but-concern",
    test: f => {
      const w = f.s.well || [];
      if(!w.includes("nochange") || w.length < 2) return null;
      return {
        message: "“No change from usual” is recorded alongside a change in wellbeing.",
        reason: "The note cannot say nothing changed and also that something did.",
        fields: ["well"]
      };
    }
  },
  {
    id: "offer-later-but-went-ahead",
    test: f => {
      if(f.s.outcome !== "later") return null;
      if(!["agreed", "choseA", "choseB", "keen", "agreedgo", "delayed"].includes(f.s.resp)) return null;
      if(!tasksWhere(f, l => l !== "declined").length) return null;
      return {
        message: "The outcome is “Declined for now”, but the person agreed and support is recorded.",
        reason: "An interaction that went ahead would not also be left to offer again later.",
        fields: ["outcome", "resp"]
      };
    }
  },
  {
    id: "chose-option-mismatch",
    test: f => {
      const s = f.s;
      if(!["choseA", "choseB"].includes(s.resp) || !s.chosen) return null;
      const mine = s.resp === "choseA" ? s.offerA : s.offerB, other = s.resp === "choseA" ? s.offerB : s.offerA;
      if(!mine || norm(s.chosen) === norm(mine)) return null;
      if(norm(s.chosen) !== norm(other)) return null;   // chose something named differently - not a clash
      return {
        message: "“" + (s.resp === "choseA" ? "Chose the first option" : "Chose the second option") + "” is selected, but what they chose (" + s.chosen + ") is the other option.",
        reason: "The option picked and the choice named should agree.",
        fields: ["resp", "chosen"]
      };
    }
  },
  {
    id: "chose-second-none-offered",
    test: f => f.s.resp === "choseB" && !f.s.offerB && !f.college ? {
      message: "“Chose the second option” is selected, but no second option is recorded.",
      reason: "A choice between two options needs both options recorded.",
      fields: ["resp", "offerB"]
    } : null
  },
  {
    id: "session-ends-before-start",
    test: f => {
      if(!f.college || !f.s.time || !f.s.sessionTo || toMins(f.s.sessionTo) > toMins(f.s.time)) return null;
      return {
        message: "The session is recorded as ending at " + f.s.sessionTo + ", which is not after it started (" + f.s.time + ").",
        reason: "A session has to end after it starts.",
        fields: ["time", "sessionTo"]
      };
    }
  }
];

function detect(ctx, checks){
  const f = ctx.f || G.rules.facts(ctx);
  const out = [];
  (checks || CONTRADICTIONS).forEach(c => {
    const hit = c.test(f);
    if(hit) out.push(Object.assign({ id: c.id }, hit));
  });
  return out;
}

G.contradictions = { CONTRADICTIONS, detect };
})(globalThis.GSN = globalThis.GSN || {});
