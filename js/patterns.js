/* Local history, the person's own baseline, and changes from it.

   What is kept is structured observation only - amounts, levels, ticked
   choices - never the written note and never anything typed freehand. A
   person is only ever compared with their own recent records, never with
   anyone else, and a difference is described as a "change in recorded
   pattern": this is documentation, not diagnosis. */
(function (G) {
"use strict";

const { RANK, DECLINED_RESP } = G.rules;

const PCT = { "All": 100, "Most": 75, "About half": 50, "A small amount": 25, "None": 0 };
const num = v => v === "" || v == null || Number.isNaN(Number(v)) ? null : Number(v);
const DAY = 86400000;
const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

/* ---------- a note, reduced to what it observed ---------- */
function toRecord(s, meta){
  meta = meta || {};
  const now = meta.now || new Date();
  const tasks = (s.tasks || []).filter(t => t.level).map(t => ({ id: t.id, level: t.level }));
  const engage = tasks.find(t => t.id === "engage");
  return {
    v: 1,
    id: meta.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)),
    person: s.initials,
    date: meta.date || iso(now),
    time: s.time || "",
    savedAt: now.toISOString(),
    kind: s.kind, slot: s.slot,
    setting: s.kind === "activity" ? (s.setting || "community") : "",
    response: s.resp || "", consent: s.consent || "", level: s.level || "",
    declined: DECLINED_RESP.includes(s.resp) || s.consent === "no" || !!(engage && engage.level === "declined"),
    tasks,
    food: s.kind === "eating" && s.ate ? { amount: s.ate, pct: PCT[s.ate] } : null,
    fluid: s.kind === "eating" && (num(s.drunk) !== null || num(s.offered) !== null) ? { offered: num(s.offered), drunk: num(s.drunk) } : null,
    mood: (s.mood || []).slice(), wellbeing: (s.well || []).slice(), behaviour: (s.behaviour || []).filter(b => b !== "other"),
    during: (s.during || []).slice(),
    skin: s.kind === "personal" ? (s.skin || "") : "",
    sleep: (s.sleepObs || []).slice(), continence: (s.contObs || []).slice(),
    prompts: Object.assign({}, s.prompts || {}),
    outcome: s.outcome || "",
    followup: (s.followup || []).slice(),
    handover: !!s.handover
  };
}

/* records for one person within the window, oldest first, the one being
   written left out. Someone else's records never count, even if passed in. */
function recent(records, opts){
  const now = opts.now || new Date();
  const since = iso(new Date(now.getTime() - (opts.windowDays || 14) * DAY));
  return (records || []).filter(r => r.date >= since && r.id !== opts.excludeId && (!opts.person || r.person === opts.person))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

/* ---------- the person's own usual ---------- */
const MIN_FOR_BASELINE = 5;           // below this there is not enough to call anything "usual"

function mode(list){
  const c = {};
  list.forEach(x => { c[x] = (c[x] || 0) + 1; });
  let best = null;
  Object.keys(c).forEach(k => { if(best === null || c[k] > c[best]) best = k; });
  return best === null ? null : { value: best, count: c[best], of: list.length };
}

function baseline(records, opts){
  opts = opts || {};
  const now = opts.now || new Date();
  const today = iso(now);
  const rs = recent(records, opts);
  const meals = rs.filter(r => r.food);
  const fluidDays = {};
  rs.filter(r => r.fluid && r.fluid.drunk !== null && r.date < today)
    .forEach(r => { fluidDays[r.date] = (fluidDays[r.date] || 0) + r.fluid.drunk; });
  const days = Object.keys(fluidDays);
  const acts = rs.filter(r => r.kind === "activity");
  const nights = rs.filter(r => r.sleep.length || r.slot === "night");
  const withMood = rs.filter(r => r.mood.length);
  const byTask = {};
  rs.forEach(r => r.tasks.forEach(t => { if(t.level in RANK) (byTask[t.id] = byTask[t.id] || []).push(t.level); }));
  const support = {};
  Object.keys(byTask).forEach(id => { if(byTask[id].length >= 3) support[id] = mode(byTask[id]); });
  const moodCount = {};
  withMood.forEach(r => r.mood.forEach(m => { moodCount[m] = (moodCount[m] || 0) + 1; }));
  return {
    windowDays: opts.windowDays || 14,
    records: rs.length,
    food: { meals: meals.length, avgPct: meals.length ? Math.round(meals.reduce((n, r) => n + r.food.pct, 0) / meals.length) : null },
    fluid: { days: days.length, avgDaily: days.length ? Math.round(days.reduce((n, d) => n + fluidDays[d], 0) / days.length) : null },
    participation: { activities: acts.length, declined: acts.filter(r => r.declined).length },
    support,
    sleep: { nights: nights.length, unsettled: nights.filter(r => r.sleep.includes("awakeunsettled") || r.wellbeing.includes("sleep")).length },
    mood: { records: withMood.length, counts: moodCount }
  };
}

/* ---------- today so far ---------- */
function fluidToday(records, current, opts){
  const today = iso((opts && opts.now) || new Date());
  const saved = (records || []).filter(r => r.date === today && r.fluid && r.fluid.drunk !== null && r.id !== (current && current.id) &&
                                            (!current || r.person === current.person));
  const total = saved.reduce((n, r) => n + r.fluid.drunk, 0) + (current && current.fluid && current.fluid.drunk !== null ? current.fluid.drunk : 0);
  return { total, entries: saved.length + (current && current.fluid && current.fluid.drunk !== null ? 1 : 0) };
}

/* ---------- changes in the recorded pattern ---------- */
const ESCALATE = "Consider whether this change requires handover or escalation in accordance with {N}'s care plan and your organisation's procedure.";
const LEVEL_WORD = { ind: "Did it themselves", prompt: "With prompting", min: "Minimal help", part: "Part-supported", full: "Staff did it" };

/* records: this person's saved history; current: toRecord() of the entry
   being written (or null). Returns findings in Smart Assist's shape. */
function detect(records, current, opts){
  opts = opts || {};
  const N = opts.initials || "this person";
  const esc = ESCALATE.replace("{N}", N);
  const only = Object.assign({}, opts, { excludeId: current && current.id, person: current ? current.person : opts.person });
  const rs = recent(records, only);
  const base = baseline(records, only);
  const all = current ? rs.concat([current]) : rs;
  const out = [];
  const add = (id, title, reason, handover) => out.push({ id: "pat:" + id, severity: "suggestion", group: "pattern", rank: -2,
    title, reason: reason + " " + esc, handover, fields: [] });

  /* food: the last three meals all well below their own usual */
  const meals = all.filter(r => r.food);
  if(base.food.meals >= MIN_FOR_BASELINE && meals.length >= 3){
    const last3 = meals.slice(-3);
    if(last3.every(r => r.food.pct <= base.food.avgPct - 25) && (!current || current.food))
      add("food", "Food intake has been below " + N + "'s recent pattern for three consecutive meals.",
          "The last three meals recorded were " + last3.map(r => r.food.amount.toLowerCase()).join(", ") +
          "; over the last " + base.windowDays + " days " + N + " has usually eaten about " + base.food.avgPct + "% of a meal (" + base.food.meals + " meals recorded).",
          "Change in recorded pattern: food intake below usual for three meals.");
  }

  /* fluids: today so far against the target in the profile */
  const target = num(opts.fluidTarget);
  if(target && current && current.kind === "eating"){
    const t = fluidToday(records, current, opts);
    if(t.total < target)
      add("fluid-target", "Fluid intake is currently below " + N + "'s recorded daily target.",
          t.total + " ml has been recorded today on this device (" + t.entries + (t.entries === 1 ? " entry" : " entries") +
          ") against a target of " + target + " ml. Only drinks saved on this device are counted.",
          "Fluid intake so far today " + t.total + " ml of " + target + " ml target.");
  }

  /* an activity declined again and again */
  if(current && current.kind === "activity" && current.declined){
    const same = all.filter(r => r.kind === "activity" && r.slot === current.slot && r.setting === current.setting);
    const declined = same.filter(r => r.declined).length;
    if(declined >= 3)
      add("declined-" + current.slot, "This activity has been declined on " + declined + " recent occasions.",
          "It was declined " + declined + " times out of " + same.length + " offers recorded in the last " + base.windowDays + " days.",
          "Activity declined " + declined + " times recently.");
  }

  /* sleep: recent nights unlike their own usual */
  const nights = all.filter(r => r.sleep.length || r.slot === "night");
  if(base.sleep.nights >= MIN_FOR_BASELINE && nights.length >= 3){
    const last3 = nights.slice(-3);
    const bad = last3.filter(r => r.sleep.includes("awakeunsettled") || r.wellbeing.includes("sleep")).length;
    if(bad >= 2 && base.sleep.unsettled / base.sleep.nights < 0.34)
      add("sleep", "Sleep observations have differed from " + N + "'s recent baseline.",
          bad + " of the last 3 night records note unsettled or poor sleep; over the last " + base.windowDays + " days that was recorded on " +
          base.sleep.unsettled + " of " + base.sleep.nights + " nights.",
          "Change in recorded pattern: sleep unsettled on recent nights.");
  }

  if(current){
    /* support: a task that usually needs little help needing much more */
    current.tasks.forEach(t => {
      const m = base.support[t.id];
      if(!m || !(t.level in RANK) || m.count < 3) return;
      if(RANK[t.level] - RANK[m.value] >= 2)
        add("support-" + t.id, "Change in recorded pattern: " + (opts.taskLabel ? opts.taskLabel(t.id) : t.id) + " needed more support than usual.",
            "It is usually recorded as “" + LEVEL_WORD[m.value] + "” (" + m.count + " of " + m.of + " recent records); today it is “" + LEVEL_WORD[t.level] + "”.",
            "Change in recorded pattern: " + (opts.taskLabel ? opts.taskLabel(t.id).toLowerCase() : t.id) + " needed more support than usual.");
    });
    /* presentation: something rarely recorded for them */
    ["anxious", "unsettled"].forEach(m => {
      if(!current.mood.includes(m) || base.mood.records < MIN_FOR_BASELINE) return;
      const seen = base.mood.counts[m] || 0;
      if(seen / base.mood.records < 0.2)
        add("mood-" + m, "Change in recorded pattern: “" + m + "” is rarely recorded for " + N + ".",
            "It appears in " + seen + " of " + base.mood.records + " recent records that note how " + N + " presented.",
            "Change in recorded pattern: presented as " + m + ".");
    });
  }
  return out;
}

G.patterns = { PCT, toRecord, recent, baseline, fluidToday, detect, iso, MIN_FOR_BASELINE };
})(globalThis.GSN = globalThis.GSN || {});
