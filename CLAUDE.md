# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Care Note Builder is an offline PWA for UK adult social care. Staff answer structured
questions about one interaction (personal care, eating and drinking, or an activity) and
the app writes a person-centred daily note, which they copy and paste into their
care-record system (the owner's service uses Nourish; the app must stay generic and
takes the system's name from Settings). Plain HTML/CSS/JS, no framework, no build step,
no runtime dependencies, no network calls of any kind.

It is deployed by GitHub Pages from `main`: https://oluyemi-1.github.io/care-note-builder/.
**Pushing `main` publishes to staff tablets.** Work on a branch, `merge --ff-only`, push,
then confirm `gh api repos/oluyemi-1/care-note-builder/pages/builds/latest` shows the new
commit as `built`. The service worker is cache-first, so a device shows the new version on
its *second* open.

The app was renamed from "Gold Standard Notes" on 2026-09-24 at the owner's request. Do not
reintroduce that phrase anywhere; the only permitted occurrence is the legacy backup id
accepted in `js/validation.js`.

## Commands

```bash
npm test                                            # all tests: Node's built-in runner, nothing to install
node --test tests/narrative.test.js                 # one file
node --test --test-name-pattern="rewording"         # tests whose name matches, across all files
open index.html                                     # the app straight from disk (must keep working)
python3 -m http.server 8765                         # serve it: needed for IndexedDB history; the service worker registers only on https
python3 tools/tutorials/build.py [--only tour,data] [--engine say] [--no-record]   # the narrated video guide
```

The video tool needs `npm install` inside `tools/tutorials/` (playwright-core), ffmpeg,
Pillow, and Chrome for Testing in `~/Library/Caches/ms-playwright`. Narration uses
ElevenLabs with the key at `~/.config/elevenlabs/api_key` (never in the project);
`--engine say` is a free offline draft. Re-run with `--only <id>` after changing any
screen a tutorial shows; `tools/tutorials/script.json` is the single source for narration,
captions and step titles, and `record.js` step ids must match it. The film lands on the
Desktop.

## Non-negotiable rules

**Prompt, don't presume.** A person's profile decides which questions are *asked*; only a
staff member's tick or answer may become a sentence. Never write follow-up nobody recorded
("handed over", "GP contacted", "body map completed"), never a diagnosis (say "change in
recorded pattern" and point to the care plan), never a number or time that was not entered.
`tests/narrative.test.js` enforces this over 400 seeded random interactions: every sentence
must trace to filled-in fields (`provenance.verify`), and the `GUARDS` list there requires
each fact-bearing word ("informed", "choking", "danced"...) to have its input. **When you
add wording that carries a fact, add a GUARD for it.**

Other rules the tests and the owner hold to:

- Rewording changes wording only. `provenance.sameFacts` must pass; `banks.test.js`
  requires every variant of a phrase-bank sentence to use the same fact tokens.
- Support level has no default. A ticked task with no level says nothing; Copy stays locked.
- Copy is gated: the organisation's seven audit checks (`quality.orgAudit`, provider can mark
  some optional), no unexplained contradiction, a recorded choking/seizure must be
  described in `extra` (always blocking), and the attestation tick.
- The copied note is one block of text (paragraphs are an opt-in provider setting) and the
  note card must say when a shorter length leaves out something recorded.
- Activity notes read in time order (task `phase` start/during/end); staff's own words go
  straight after what the person did.
- British English. Fictional people only in tests, fixtures and recordings.

## Architecture

Sixteen classic scripts share one global, `GSN`, each adding a namespace
(`GSN.core`, `.data`, `.profiles`, `.rules`, ...). They are deliberately **not ES modules**:
browsers refuse to load modules from a double-clicked `file://` page. Consequences:

- Load order in `index.html` is a dependency order (core → data → profiles → rules →
  contradictions → language → quality → patterns → smart-assist → storage → provenance →
  narrative → provider-config → validation → app → settings).
- Every file the page loads must be in `ASSETS` in `sw.js` (`offline-assets.test.js`
  checks). Bump `CACHE` there when changing what is cached.
- Only `app.js` and `settings.js` touch the DOM. Everything else is pure and runs in Node;
  `tests/helpers/load.js` requires the engine files in page order.

### The pipeline

`app.js` `render()` → `state()` reads the whole form into a flat object `s` →
`GSN.narrative.compose(ctx, opts)` where `ctx = { s, profile, explanations, history, rules,
language, auditOptional, auditExtra, recordId, now, windowDays }` → returns `{ sa, s, note }`.

- `smartAssist.collect(ctx)` runs `rules.evaluate`, `contradictions.detect`, `language.scan`,
  `quality.orgAudit`/`dimensions`/`independence`, `patterns.detect`, and returns ordered
  findings (critical, review, missing, suggestion; each with a `reason`), `blocking`,
  `contentOk`, `handovers`.
- `narrative.build(s, opts)` plans one item per recorded fact in `SECTIONS` order, selects by
  length (`pri` ≤ 1/2/3), aggregates same-level task runs and choice+how, realises wording via
  `pick` (steered away from recent history per person), and returns `sentences`, each with
  `sources` (field paths such as `tasks.wash.level`, `risk.crossing`, `prompts.<rule>.<q>`).
- `provenance.resolve/verify/signature/sameFacts` turn those sources back into values.

`rules.facts(ctx)` computes the shared facts (`out`, `college`, `travel`, `tags`,
`declinedAll`, `vars` for `{N} {s} {o} {p} {meal} {activity}`...). Rule conditions are the
`CONDITIONS` vocabulary in `rules.js`; an unknown key never matches.

### Where things live and how to extend them

- **Wording and options**: `js/data.js` only. Labels are HTML-entity text (`&mdash;`, `&amp;`):
  pass through `core.plain()` for text output, `core.esc()` for anything user-entered that
  goes into `innerHTML`. Person tokens: `{N} {s} {S} {o} {p} {P} {r} {vbe} {vhave}`; never put a
  he/she-only verb after `{s}` (they/them tests).
- **A rule**: add to `CARE_RULES` in `rules.js` (declarative: `appliesWhen`, `reason`,
  `suggest`, `highlight`, `important`, `handover`, `prompts` where `yes`/`no` is *exactly*
  the sentence a confirmed answer adds and `null` adds nothing). Prompt sentences may only
  use the tokens in `TOKEN_SRC`.
- **A contradiction**: add to `CONTRADICTIONS` in `contradictions.js`; return
  `{ message, reason, fields }` or null. Never auto-correct.
- **An activity**: `ACTS` + `ACT_INFO` (where it happens, tags) and, for its events,
  `DURING`/`DURINGBANK` keyed by tag. College courses share `ACT_INFO` keys.
- **A new tickable observation group** touches: `state()` and `SCOPED_CHIPS` in `app.js`,
  `plan()` in `narrative.js`, `GROUPS` in `provenance.js`, the `observed` checks in
  `quality.js`, `toRecord` in `patterns.js`, `validateRecord` in `validation.js`, and the
  test helpers (`tests/helpers/state.js` `BASE`, `fuzz.js`).
- **Provider settings** (`provider-config.js`) are laid *over* the built-in data at start-up;
  nothing built in is removed. Everything imported or configured goes through
  `validation.js`, which rebuilds from known keys, drops any entry with a fault whole, and
  refuses `<`/`>`. Custom ids are checked against `BUILT_IN` (captured before apply), so
  saved settings can be re-validated on every load.

### Storage

`localStorage["gsn.v1"]` holds `{ device, people, active, config, hist, last, dev }`;
IndexedDB `gsn-history` holds structured observation records (never the note text or free
text). **Keep these internal names** even though the app was renamed; changing them loses
staff data. Backup files carry `app: "care-note-builder"`; `"gold-standard-notes"` is still
accepted on restore.

### UI conventions in app.js

`chips(id, list, type)` builds a group whose inputs are `#<group>_<value>`; a hidden choice
must be unchecked (`showChip`/`showGroup`) so it can never reach the note. Smart Assist
findings are patched by id, not redrawn, so an open "Why am I seeing this?" or a half-typed
explanation survives re-render; the profile questions block is rebuilt only when its
signature changes. Switching person or interaction type clears the entry
(`resetInteraction`); that and a slot change start a new history `recordId`, while
re-copying an unchanged entry updates its record instead of adding one.
The care-record mirror (`#nf`) is built with `textContent`, never `innerHTML`.
