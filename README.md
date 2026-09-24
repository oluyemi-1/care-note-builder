# Care Note Builder

A daily care-note builder for adult social care - residential homes, supported
living, home care, learning-disability, autism, elderly, day and respite services.

Staff answer what actually happened on the shift; the app writes a complete,
person-centred note in fresh wording every time, so entries stop reading like a
paste of the previous day's. Staff copy the finished note and paste it into the
daily note box of their care-record system.

## Why it exists

Most care record systems end each interaction with a free-text *daily note* box.
Under time pressure that box gets filled by copying yesterday's entry, which
evidences nothing. This tool asks the right questions instead, then assembles the
answers into a note that follows a recognised recording structure:

**Offer → Choice or response → Support → Independence → Observation → Outcome**

## Design rules

These are deliberate. Please keep them if you fork this.

- **No AI, no API, no network.** Notes come from a fixed phrase bank assembled by
  plain JavaScript. It cannot invent a care event, it works offline, and it costs
  nothing to run.
- **No personal data leaves the device.** Initials only. Nothing is transmitted;
  profiles and settings live in `localStorage`, and the optional history in
  IndexedDB, in that browser only.
- **Prompt, don't presume.** A person's profile decides which questions are
  *asked* - never what is *written*. Choking risk asks "Was any coughing
  observed?"; only a staff member's answer puts coughing, or its absence, in the
  note. Nothing about communication, staffing or diet is written from the profile.
- **It never records what you didn't.** Every sentence carries the fields it was
  built from, and the tests check that each of those fields was really filled in.
  Skin is not mentioned unless skin was observed; "handed over", "informed" or
  "body map" appear only when staff tick that it happened.
- **It never assumes independence.** Support level has no default: a ticked task
  with no level set says nothing at all, and the entry cannot be copied until
  every ticked task has one. Claiming someone managed unaided because a dropdown
  was left alone is the worst thing this tool could do.
- **Colleagues do not produce matching notes.** Wording is seeded from a random
  per-device id combined with the person, the date and the shift, so two staff
  writing about the same person on the same day diverge by construction — with
  no shared server and nothing leaving the device.
- **Rewording never changes a fact.** "Reword it" varies sentence choice,
  grouping and order, then proves the new note states exactly the same facts,
  numbers and times as the old one - or keeps the old one.
- **Copy stays locked** until the audit checks pass, any inconsistency is
  corrected or explained, *and* the staff member confirms the note reflects what
  actually happened. Accountability stays with the human.
- **Documentation, not diagnosis.** A change from someone's usual pattern is
  described as exactly that, with a prompt to consider handover in line with the
  care plan. The app never suggests a condition, a medicine or a treatment.

## Use

Open `index.html`. No build step, no dependencies, no server, and **no external
requests at all** — it uses fonts already on the device.

The copied note is one block of text, so it pastes cleanly into any care-record
system's note box, including ones that strip line breaks. If a length setting
(Short or Benchmark) would leave out something staff recorded, the note says
so and offers to include everything.

On a work tablet, open the site once and add it to the home screen. A service
worker caches it, so it opens instantly and keeps working with the wifi off,
which matters in houses with poor signal.

### Several people on one shift

Profiles are kept per person, keyed by initials, on that device only. Tap a name
to load them rather than retyping for each person you support. Moving to another
person clears the entry so nothing carries across; the interaction type, meal or
activity and time stay, since the next person is often having the same lunch. Beyond pronouns,
communication and standing needs, a profile can hold texture, fluid target,
mobility aid, triggers, preferences, routines and usual level of independence -
all context for the questions asked, none of it ever written into a note.

### Smart Assist

The panel beside the note lists, in order of importance: safety events staff
recorded (used sparingly), answers that contradict each other, what the note
still has to evidence, and person-centred suggestions. Every item says why it
is there. If staff record choking or a seizure, the note cannot be copied until
they describe it in their own words. It also questions vague or judgemental wording ("fine", "difficult",
"allowed to") without ever changing what staff typed, and shows what the person
did themselves. Your organisation's own audit checks sit inside it.

### History and patterns (optional)

Off until switched on in **Settings & data**. When a note is copied, what it
observed - amounts, support levels, ticked choices, never the written note or
anything typed freehand - is kept in this browser. The builder then compares
each person only with their own recent records: three low meals in a row, fluid
so far against their target, an activity declined again and again, sleep or
support unlike their usual. History needs the app opened from a web address
(or localhost) in some browsers. Clearing the browser's data deletes it, so
download a backup regularly.

### Two kinds of activity

Activities are not one thing, and recording them as one produced poor notes.

- **College courses** are already arranged, so nothing is offered on the day.
  The record covers whether the person was ready to go, the journey and how it
  was kept safe, the support given in the session, and what they gained from it.
  The app asks about readiness rather than choice, and never writes up a choice
  that was not offered. Enrolment is start-of-term paperwork and stays out of
  the daily note.
- **In-house and community activities** are genuinely offered and chosen on the
  day, so the choice, the support and the safeguarding are what the note carries.

Both record **what the person did during it** - the particular events of that
kind of activity, such as washing hands before handling food, following the
recipe, choosing the music, dancing, using garden tools - and **skills and
social outcomes**: practised a skill, followed the tutor, worked alongside
others, waited their turn, asked for help, finished a piece of work. An
activity note reads in time order: getting ready and the journey, taking part,
what happened and what was seen, then clearing up and coming home. Anything
staff write in their own words goes straight after what the person did.

Each person can hold a **weekly college timetable** - day, course, start and
end. Pick College on a day they have a class and the course and times fill in
themselves, with a line naming what was found so staff can correct it if the
day ran differently. Session times go into the note as fact, not as timetable
admin. Enrolment itself is start-of-term paperwork and stays out of the note.

Travel method (cab, bus, train, on foot, staff vehicle, minibus) and travel
safeguarding (seatbelt, escorted door to door, waited at the stop, supported at
crossings) sit with the journey in the finished note.

### Shifts

Personal care reads differently at 07:00 and 22:00. The app opens on the shift
that matches the clock and carries night-specific wording and tasks — settling,
repositioning, night checks, night clothes — with outcomes to match.

## Adapting it to your service

**Settings & data** lets a service adapt the builder without touching the code:
its name and type, its word for staff, the name of its care-record system,
support-level wording and record values, the care-record field each task fills,
its own activities, communication methods, needs, observations and profile
fields, which audit checks must pass before copying, extra wording to question,
and its own rules. **Backup and restore** copies a whole setup - or profiles and
history - to another tablet as a file; every part of a restored file is checked
before anything is kept, and nothing in it is ever run as code.

Everything the app can say is still readable in `js/data.js`, so a manager can
approve it before rollout. Wording is British English (mls, MAR chart, Makaton,
Now and Next, 1:1 / 2:1).

### Adding a rule

Rules are data, in `js/rules.js` or as JSON in settings:

```js
{
  id: "vision-community",
  appliesWhen: { profileFlag: "vision", kind: "activity", out: true },
  reason: "Visual impairment is recorded in {N}'s profile and this activity was out in the community.",
  prompts: [
    { id: "orientation", text: "Was verbal orientation to the surroundings given?",
      yes: "Staff gave {o} verbal orientation to {p} surroundings.", no: null }
  ]
}
```

`yes`/`no` is exactly what that answer adds to the note; `null` adds nothing.
The conditions a rule can use are listed in `CONDITIONS` in the same file.

## How it is built

Plain HTML, CSS and classic scripts - no framework, no build, no dependencies.
The scripts share one global, `GSN`, and only `app.js` and `settings.js` touch
the page, so everything else runs and is tested in Node.

| File | What it does |
| --- | --- |
| `js/data.js` | Every choice and every sentence the app can use |
| `js/profiles.js` | Profile fields, and bringing old saved profiles up to date |
| `js/rules.js` | The rules engine and the built-in rules |
| `js/contradictions.js` | Answers that cannot all be true |
| `js/language.js` | Vague, judgemental and institutional wording |
| `js/quality.js` | Evidence, independence, and the organisation's audit checks |
| `js/patterns.js` | Structured history records, baselines, changes in pattern |
| `js/smart-assist.js` | Gathers every finding into one ordered, explained list |
| `js/narrative.js` | Plans and words the note; every sentence carries its sources |
| `js/provenance.js` | Traces sentences to fields; proves rewording kept the facts |
| `js/provider-config.js`, `js/validation.js` | Service settings, and checking anything imported |
| `js/storage.js` | History in IndexedDB |
| `js/app.js`, `js/settings.js` | The page |

A **Developer view** (footer) shows each sentence under the note with the
fields it came from.

## Tests

```
npm test
```

Node's built-in test runner, nothing to install. Among other things the tests
generate hundreds of varied interactions and check that every sentence traces
to something entered, that no number appears that was not typed, that words
like "informed" or "choking" appear only when their input exists, that
rewording never changes a fact, that they/them notes are grammatical, that
questions appear only for the right people, and that imported files are
validated. Test profiles live in `tests/fixtures` and are fictional.

## Licence

MIT.
