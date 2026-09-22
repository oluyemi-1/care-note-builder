/* Records the video tutorials by driving the real app in Chrome.

   Run by build.py, which first writes build/tutorials/narration.json - how
   long each step's voiceover lasts. Every step here waits for its own
   narration, so the footage and the voice line up.

   Each tutorial starts from its own prepared state: a fictional person or
   two in the device's storage, and sometimes answers filled in silently
   before the camera starts. A pointer and a soft spotlight are drawn into the
   page, because a screen recording has no mouse to follow.

   Output per tutorial, in build/tutorials/<id>/raw/: JPEG frames as Chrome
   paints them, and marks.json - when each frame and each step happened. */
"use strict";

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { chromium } = require("playwright-core");

const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(ROOT, "build", "tutorials");
const SCRIPT = JSON.parse(fs.readFileSync(path.join(__dirname, "script.json"), "utf8"));
const NARRATION = JSON.parse(fs.readFileSync(path.join(OUT, "narration.json"), "utf8"));
const PORT = 8777;
const VIEW = { width: 1440, height: 828 };      // a laptop or landscape tablet
const SCALE = 4 / 3;                              // frames come out 1920 x 1104
const PAD_MS = 450;                               // breath after each step's narration

/* ---------- a browser to drive ---------- */
function chromePath(){
  if(process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const mac = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const cache = path.join(process.env.HOME, "Library", "Caches", "ms-playwright");
  const found = fs.existsSync(cache) ? fs.readdirSync(cache).filter(d => /^chromium-\d+$/.test(d)).sort().reverse()
    .map(d => path.join(cache, d, "chrome-mac-arm64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"))
    .find(p => fs.existsSync(p)) : null;
  if(found) return found;
  if(fs.existsSync(mac)) return mac;
  throw new Error("No Chrome found. Set CHROME_PATH, or run: npx playwright install chromium");
}

/* ---------- the people in the recordings (fictional) ---------- */
const PEOPLE = {
  MA: { initials: "MA", pronoun: "he", comm: ["verbal"], flags: ["skin"] },
  JT: { initials: "JT", pronoun: "she", comm: ["pictures"], flags: ["choking"],
        texture: "IDDSI Level 6 soft and bite-sized", fluidTarget: "1500" },
  DK: { initials: "DK", pronoun: "she", comm: ["verbal"], flags: ["vision"] }
};
function storage(names, extra){
  const people = {};
  (names || []).forEach(n => { people[n] = PEOPLE[n]; });
  return Object.assign({ device: "tutorial-recording", people, active: (names || [])[0] || null,
                         config: { terms: { careSystem: "Nourish" }, history: { enabled: false, windowDays: 14 } } }, extra || {});
}

/* the pointer and spotlight, drawn into every page load */
function overlay(){
  const add = () => {
    if(document.getElementById("tp")) return;
    const st = document.createElement("style");
    st.textContent =
      "#tp{position:fixed;z-index:2147483647;left:-80px;top:-80px;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;" +
      "background:rgba(14,90,99,.28);border:3px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,.45);pointer-events:none;" +
      "transition:left .6s cubic-bezier(.3,.7,.3,1),top .6s cubic-bezier(.3,.7,.3,1),transform .12s}" +
      "#tp.down{transform:scale(.72)}" +
      ".tr{position:fixed;z-index:2147483646;border-radius:50%;border:3px solid rgba(20,134,143,.95);pointer-events:none;" +
      "width:70px;height:70px;margin:-35px 0 0 -35px;animation:tr .55s ease-out forwards}" +
      "@keyframes tr{from{transform:scale(.15);opacity:1}to{transform:scale(1);opacity:0}}" +
      "#tspot{position:fixed;z-index:2147483645;border:4px solid #E9A23B;border-radius:12px;pointer-events:none;opacity:0;" +
      "box-shadow:0 0 0 9999px rgba(8,20,22,.22);transition:opacity .35s,left .25s,top .25s,width .25s,height .25s}";
    document.head.appendChild(st);
    ["tspot", "tp"].forEach(id => { const d = document.createElement("div"); d.id = id; document.body.appendChild(d); });
    /* the spotlight stays on its target while anything scrolls */
    (function follow(){
      const s = document.getElementById("tspot"), t = window.__spotTarget;
      if(s && t){
        const r = t.getBoundingClientRect(), pad = window.__spotPad;
        Object.assign(s.style, { left: (r.left - pad) + "px", top: (r.top - pad) + "px", width: (r.width + pad * 2) + "px",
                                 height: Math.max(20, Math.min(r.height + pad * 2, window.innerHeight - r.top + pad - 6)) + "px" });
      }
      requestAnimationFrame(follow);
    })();
  };
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", add); else add();
}

/* ---------- moves ---------- */
function helpers(page){
  const wait = ms => page.waitForTimeout(ms);
  const loc = sel => typeof sel === "string" ? page.locator(sel).first() : sel;

  /* the overlay has to live inside an open dialog, which draws above everything else */
  const lift = () => page.evaluate(() => {
    const host = document.querySelector("dialog[open]") || document.body;
    ["tspot", "tp"].forEach(id => { const el = document.getElementById(id); if(el && el.parentNode !== host) host.appendChild(el); });
  });

  /* bring something into view: the note column scrolls on its own, the rest with the page */
  async function reveal(sel){
    for(let pass = 0; pass < 2; pass++){
      const moved = await loc(sel).evaluate(el => {
        const rail = el.closest(".rail");
        const r = el.getBoundingClientRect();
        if(rail && !document.querySelector("dialog[open]")){
          const box = rail.getBoundingClientRect();
          if(r.top >= box.top + 10 && r.bottom <= Math.min(box.bottom, window.innerHeight) - 10) return false;
          if(box.bottom > window.innerHeight + 2){       // scroll the page until the column is pinned and whole
            window.scrollTo({ top: window.scrollY + box.top - 18, behavior: "smooth" });
            return true;
          }
          rail.scrollTo({ top: rail.scrollTop + r.top - box.top - 24, behavior: "smooth" });
          return true;
        }
        if(r.top >= 70 && r.bottom <= window.innerHeight - 20) return false;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        return true;
      });
      if(!moved) return;
      await wait(800);
    }
  }
  /* put a section's heading near the top of the window */
  async function headTo(sel){
    await loc(sel).evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 24, behavior: "smooth" }));
    await wait(700);
  }
  async function point(sel){
    await lift();
    const b = await loc(sel).boundingBox();
    if(!b) throw new Error("nothing to point at: " + sel);
    await page.evaluate(([x, y]) => { const p = document.getElementById("tp"); p.style.left = x + "px"; p.style.top = y + "px"; },
                        [b.x + Math.min(b.width / 2, 60), b.y + b.height / 2]);
    await wait(650);
    return b;
  }
  async function press(sel){
    const b = await loc(sel).boundingBox();
    await page.evaluate(([x, y]) => {
      const p = document.getElementById("tp"); p.classList.add("down");
      const r = document.createElement("div"); r.className = "tr"; r.style.left = x + "px"; r.style.top = y + "px";
      p.parentNode.appendChild(r); setTimeout(() => { r.remove(); p.classList.remove("down"); }, 560);
    }, [b.x + Math.min(b.width / 2, 60), b.y + b.height / 2]);
  }
  async function tap(sel, opts){
    opts = opts || {};
    if(opts.reveal !== false) await reveal(sel);
    await point(sel);
    await press(sel);
    await loc(sel).click();
    await wait(opts.after || 350);
  }
  async function type(sel, text){
    await tap(sel, { after: 150 });
    await loc(sel).pressSequentially(text, { delay: 38 });
    await wait(300);
  }
  async function choose(sel, value){
    await tap(sel, { after: 180 });
    await loc(sel).selectOption(value);
    await wait(350);
  }
  async function fillTime(sel, value){
    await tap(sel, { after: 150 });
    await loc(sel).fill(value);
    await wait(400);
  }
  async function spot(sel, pad){
    await lift();
    await loc(sel).evaluate((el, p) => {
      window.__spotTarget = el; window.__spotPad = p;
      document.getElementById("tspot").style.opacity = "1";
    }, pad == null ? 8 : pad);
    await wait(500);
  }
  const unspot = () => page.evaluate(() => {
    const s = document.getElementById("tspot"); if(s) s.style.opacity = "0";
    setTimeout(() => { window.__spotTarget = null; }, 350);
  }).then(() => wait(380));
  const scrollTo = y => page.evaluate(v => window.scrollTo({ top: v === "end" ? document.body.scrollHeight : v, behavior: "smooth" }), y).then(() => wait(900));

  /* silent setup before the camera starts: set values the way the page expects */
  const silent = ops => page.evaluate(list => {
    const fire = (el, t) => el.dispatchEvent(new Event(t, { bubbles: true }));
    for(const [op, id, v] of list){
      const el = document.getElementById(id);
      if(!el) throw new Error("no #" + id);
      if(op === "set"){ el.value = v; fire(el, "input"); fire(el, "change"); }
      else { el.checked = true; fire(el, "change"); }
    }
  }, ops);

  const railTop = () => page.evaluate(() => { const r = document.querySelector(".rail"); if(r) r.scrollTo({ top: 0, behavior: "smooth" }); }).then(() => wait(700));

  return { page, wait, loc, reveal, headTo, railTop, point, tap, type, choose, fillTime, spot, unspot, scrollTo, silent };
}

/* ---------- what each tutorial does, step by step ---------- */
const personalCareDone = [
  ["set", "kind", "personal"], ["set", "slot", "am"], ["set", "time", "08:00"], ["set", "offerA", "a shower"], ["set", "offerB", "a bath"],
  ["tick", "resp_choseA"], ["set", "chosen", "a shower"], ["tick", "how_said"], ["tick", "consent_yes"], ["tick", "commUsed_verbal"],
  ["tick", "dignity_door"], ["tick", "skin_clear"], ["tick", "mood_settled"], ["tick", "outcome_ready"]
];
const task = (id, level, kind) => [["tick", "t_" + (kind || "personal") + "_" + id], ["set", "lvl_" + (kind || "personal") + "_" + id, level]];

const TUTORIALS = {
  tour: {
    seed: storage([]),               // no people yet: the app opens on its worked example
    steps: {
      welcome: async h => { await h.spot(".mast", 14); await h.wait(2600); await h.spot(".privacy"); },
      person: async h => { await h.unspot(); await h.scrollTo(250); await h.spot("#people", 12); await h.point("#people .pchip"); },
      steps: async h => {
        await h.unspot();
        for(const n of [2, 3, 4, 5, 6]){
          const head = h.page.locator("main .step").nth(n - 1).locator("header");
          await h.headTo(head); await h.spot(head, 4);
        }
        await h.unspot(); await h.scrollTo(0);
      },
      note: async h => { await h.railTop(); await h.spot("#noteCard .out", 6); },
      assist: async h => { await h.unspot(); await h.reveal(".sa"); await h.spot(".sa", 6); },
      copy: async h => { await h.unspot(); await h.railTop(); await h.tap("#attest"); await h.tap("#copy"); await h.spot("#noteCard .acts", 4); }
    }
  },

  person: {
    seed: storage(["MA"]),
    steps: {
      add: async h => { await h.tap("#people [data-new]"); await h.type("#initials", "JT"); await h.choose("#pronoun", "she"); },
      comm: async h => { await h.tap("#comm_pictures"); await h.tap("#comm_gesture"); },
      needs: async h => { await h.tap("#flags_choking"); await h.tap("#flags_fluids"); await h.spot("#flags", 8); },
      more: async h => {
        await h.unspot();
        await h.tap("#profileMore > summary");
        await h.type("#pf_texture", "IDDSI Level 6 soft and bite-sized");
        await h.type("#pf_fluidTarget", "1500");
      },
      context: async h => { await h.scrollTo(0); await h.spot("#ctxLine", 8); }
    }
  },

  personal: {
    seed: storage(["MA"]),
    steps: {
      kind: async h => { await h.reveal("#kind"); await h.spot("#kind", 6); await h.wait(700); await h.unspot();
                         await h.choose("#slot", "am"); await h.fillTime("#time", "07:45"); },
      offer: async h => { await h.type("#offerA", "a shower"); await h.type("#offerB", "a bath"); },
      comm: async h => { await h.tap("#commUsual"); await h.spot("#commUsed", 8); },
      choice: async h => {
        await h.unspot();
        await h.tap("#resp_choseA"); await h.type("#chosen", "a shower");
        await h.tap("#how_said"); await h.tap("#consent_yes");
      },
      tasks: async h => {
        await h.tap("#t_personal_wash"); await h.choose("#lvl_personal_wash", "ind");
        await h.tap("#t_personal_oral"); await h.choose("#lvl_personal_oral", "prompt");
        await h.tap("#t_personal_dress"); await h.choose("#lvl_personal_dress", "part");
        await h.choose("#level", "part");
      },
      observe: async h => { await h.tap("#dignity_door"); await h.tap("#skin_clear"); await h.tap("#mood_settled"); },
      outcome: async h => { await h.tap("#outcome_ready"); },
      copy: async h => { await h.spot("#noteCard .out", 6); await h.wait(2200); await h.unspot(); await h.tap("#attest"); await h.tap("#copy"); }
    }
  },

  questions: {
    seed: storage(["JT"]),
    prepare: async h => h.silent([
      ["set", "kind", "eating"], ["set", "slot", "lunch"], ["set", "time", "12:30"], ["set", "offerA", "fish pie"], ["set", "offerB", "soup"],
      ["tick", "resp_choseA"], ["set", "chosen", "fish pie"], ["tick", "how_pointed"], ["tick", "consent_yes"], ["tick", "commUsed_pictures"],
      ...task("eat", "ind", "eating"), ["set", "level", "ind"], ["set", "ate", "Most"], ["tick", "outcome_settled"]
    ]),
    steps: {
      lunch: async h => { await h.spot("#kind", 6); await h.wait(900); await h.unspot(); await h.reveal("#prompts"); await h.spot("#prompts", 6); },
      why: async h => { await h.spot("#prompts .preason", 6); },
      answer: async h => {
        await h.unspot();
        await h.tap('.pbtn[data-key="choking-meal.texture"][data-ans="yes"]');
        await h.tap('.pbtn[data-key="choking-meal.upright"][data-ans="yes"]');
        await h.tap('.pbtn[data-key="choking-meal.cough"][data-ans="no"]');
        await h.spot("#noteCard .out", 6);
      },
      critical: async h => {
        await h.unspot();
        await h.tap('.pbtn[data-key="choking-meal.choke"][data-ans="yes"]');
        const item = '#saList li[data-id="p:choking-meal.choke"]';
        await h.reveal(item); await h.spot(item, 4); await h.wait(1800); await h.unspot();
        await h.tap(item + " .sa-ho"); await h.spot("#handover", 6);
      },
      describe: async h => {
        await h.unspot();
        await h.tap("#attest"); await h.spot("#why", 6); await h.wait(1200); await h.unspot();
        await h.type("#extra", "She coughed for a few seconds. Staff stayed with her and she recovered.");
        await h.reveal("#copy"); await h.spot("#noteCard .acts", 4);
      }
    }
  },

  review: {
    seed: storage(["MA"]),
    prepare: async h => h.silent(personalCareDone),
    steps: {
      flag: async h => {
        await h.tap("#t_personal_wash"); await h.choose("#lvl_personal_wash", "full");
        await h.choose("#level", "ind");
        await h.reveal('#saList li[data-id="c:overall-independent-vs-hands-on"]');
        await h.spot('#saList li[data-id="c:overall-independent-vs-hands-on"]', 4);
      },
      why: async h => { await h.unspot(); await h.tap('#saList li[data-id="c:overall-independent-vs-hands-on"] .sa-why summary'); },
      explain: async h => {
        await h.unspot();
        await h.tap('#saList li[data-id="c:overall-independent-vs-hands-on"] .sa-exp-btn');
        await h.type('#saList textarea[data-explain]', "MA asked staff to wash him today because his shoulder was sore.");
        await h.railTop(); await h.tap("#attest");
        await h.spot("#noteCard .out", 6);
      },
      words: async h => {
        await h.unspot();
        await h.type("#extra", "He was fine but a bit difficult at first.");
        await h.reveal("#saList"); await h.spot("#saList", 4);
      }
    }
  },

  activities: {
    seed: storage(["DK"]),
    prepare: async h => h.silent([["set", "time", "09:30"]]),
    steps: {
      walk: async h => {
        await h.choose("#kind", "activity"); await h.tap("#setting_community"); await h.choose("#slot", "walk");
        await h.reveal("#prompts"); await h.spot("#prompts", 6);
      },
      journey: async h => {
        await h.unspot();
        await h.tap("#t_activity_travel"); await h.choose("#opt_activity_travel", "by bus"); await h.choose("#lvl_activity_travel", "prompt");
        await h.reveal("#riskWrap"); await h.spot("#riskWrap", 6); await h.tap("#risk_stop");
      },
      timetable: async h => {
        await h.unspot();
        await h.tap("#ttAdd");
        await h.choose("#tt .ttrow:last-child .tt-c", "cooking");
        await h.fillTime("#tt .ttrow:last-child .tt-from", "10:00");
        await h.fillTime("#tt .ttrow:last-child .tt-to", "12:30");
      },
      college: async h => { await h.tap("#setting_college"); await h.spot("#settingWrap", 6); await h.wait(1500); await h.spot("#ttHint", 6); },
      skills: async h => {
        await h.unspot();
        await h.tap("#during_food-hands"); await h.tap("#during_food-recipe");
        await h.tap("#learn_skill"); await h.tap("#learn_conversation");
        await h.railTop(); await h.spot("#noteCard .out", 6);
      }
    }
  },

  wording: {
    seed: storage(["MA"]),
    prepare: async h => h.silent(personalCareDone.concat(
      task("wash", "ind"), task("hair", "ind"), task("shave", "prompt"), task("oral", "prompt"),
      task("nails", "part"), task("creams", "full"), task("dress", "prompt"), [["set", "level", "part"]])),
    steps: {
      reword: async h => { await h.railTop(); await h.spot("#noteCard .out", 6); await h.wait(900); await h.tap("#reword"); await h.wait(1600); await h.tap("#reword"); },
      length: async h => {
        await h.unspot();
        await h.choose("#len", "short"); await h.spot("#omit", 4); await h.wait(1600);
        await h.unspot(); await h.tap("#includeAll"); await h.spot("#noteCard .out", 6);
      },
      sources: async h => {
        await h.unspot(); await h.scrollTo("end");
        await h.tap("#devToggle"); await h.wait(500);
        await h.reveal("#prov"); await h.spot("#prov", 4);
      }
    }
  },

  data: {
    seed: storage(["MA"]),
    /* two weeks of fictional meals for MA, the last two low, so a change shows */
    prepare: async h => {
      await h.page.evaluate(async () => {
        const recs = [], today = new Date();
        for(let i = 13; i >= 1; i--){
          const d = new Date(today.getTime() - i * 86400000);
          const r = GSN.patterns.toRecord({ initials: "MA", kind: "eating", slot: "lunch", ate: i <= 2 ? "A small amount" : (i % 3 ? "Most" : "All"),
                                            drunk: "250", offered: "300", tasks: [{ id: "eat", level: "ind" }] },
                                          { id: "sample" + i, date: GSN.patterns.iso(d) });
          r.time = "12:30"; recs.push(r);
        }
        await GSN.storage.history.putAll(recs);
      });
      await h.silent([["set", "kind", "eating"], ["set", "slot", "lunch"], ["set", "time", "12:30"], ["tick", "resp_agreed"], ["tick", "consent_yes"],
                      ["tick", "commUsed_verbal"], ["tick", "how_said"], ...task("eat", "ind", "eating"), ["set", "level", "ind"],
                      ["set", "ate", "A small amount"], ["tick", "outcome_settled"]]);
    },
    steps: {
      settings: async h => { await h.tap("#openSettings"); await h.wait(500); await h.spot("#c_care", 8); },
      history: async h => {
        await h.unspot();
        await h.reveal("#histOn"); await h.tap("#histOn"); await h.spot("#histOn", 6); await h.wait(1200);
        await h.unspot(); await h.tap("#closeSettings");
      },
      pattern: async h => {
        await h.reveal('#saList li[data-id="pat:food"]'); await h.spot('#saList li[data-id="pat:food"]', 4); await h.wait(2600);
        await h.unspot(); await h.reveal("#patCard"); await h.spot("#patCard", 4);
      },
      backup: async h => {
        await h.unspot(); await h.scrollTo(0);
        await h.tap("#openSettings"); await h.wait(400);
        await h.reveal("#expGo"); await h.spot("#bakHead", 6); await h.wait(900);
        await h.tap("#expGo"); await h.wait(600); await h.unspot();
      }
    }
  }
};

/* ---------- recording ---------- */
async function recordOne(browser, tut, number){
  const def = TUTORIALS[tut.id];
  if(!def) throw new Error("no moves for tutorial " + tut.id);
  const dir = path.join(OUT, tut.id, "raw");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: SCALE, acceptDownloads: true,
                                         permissions: ["clipboard-read", "clipboard-write"], colorScheme: "light", locale: "en-GB" });
  await ctx.addInitScript(([key, value]) => {
    if(!sessionStorage.getItem("seeded")){ localStorage.setItem(key, value); sessionStorage.setItem("seeded", "1"); }
  }, ["gsn.v1", JSON.stringify(def.seed)]);
  await ctx.addInitScript(overlay);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("dialog", d => d.accept());
  page.on("download", d => d.cancel().catch(() => {}));
  await page.goto("http://127.0.0.1:" + PORT + "/index.html", { waitUntil: "networkidle" });
  await page.evaluate(() => GSN.storage.history.clear().catch(() => {}));
  const h = helpers(page);
  if(def.prepare){ await def.prepare(h); await h.wait(300); }
  await page.evaluate(() => window.scrollTo(0, 0));
  await h.wait(400);

  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  let n = 0;
  cdp.on("Page.screencastFrame", f => {
    const file = "f" + String(++n).padStart(6, "0") + ".jpg";
    fs.writeFileSync(path.join(dir, file), Buffer.from(f.data, "base64"));
    frames.push({ file, t: f.metadata.timestamp });
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, everyNthFrame: 1,
                                           maxWidth: Math.round(VIEW.width * SCALE), maxHeight: Math.round(VIEW.height * SCALE) });
  await h.wait(700);

  const marks = {};
  for(const step of tut.steps){
    const move = def.steps[step.id];
    if(!move) throw new Error("no move for step " + tut.id + "." + step.id);
    const ms = NARRATION[tut.id + "." + step.id];
    const t0 = Date.now();
    marks[step.id] = t0 / 1000;
    await move(h);
    const left = t0 + ms + PAD_MS - Date.now();
    if(left > 0) await h.wait(left);
    else console.log("  note: " + tut.id + "." + step.id + " ran " + (-left) + " ms past its narration");
  }
  await h.wait(900);
  const end = Date.now() / 1000;
  await cdp.send("Page.stopScreencast");
  await h.wait(200);
  await ctx.close();

  fs.writeFileSync(path.join(dir, "marks.json"), JSON.stringify({ number, steps: marks, end, frames }, null, 1));
  console.log("recorded " + tut.id + ": " + frames.length + " frames" + (errors.length ? "  PAGE ERRORS: " + errors.join("; ") : ""));
  if(errors.length) process.exitCode = 1;
}

(async () => {
  const only = (process.argv.find(a => a.startsWith("--only=")) || "").slice(7).split(",").filter(Boolean);
  const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1", "--directory", ROOT], { stdio: "ignore" });
  try{
    await new Promise(r => setTimeout(r, 800));
    const browser = await chromium.launch({ executablePath: chromePath() });
    for(const [i, tut] of SCRIPT.tutorials.entries())
      if(!only.length || only.includes(tut.id)) await recordOne(browser, tut, i + 1);
    await browser.close();
  } finally {
    server.kill();
  }
})().catch(e => { console.error(e); process.exit(1); });
