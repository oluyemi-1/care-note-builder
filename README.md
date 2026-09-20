# Gold Standard Notes

A daily care-note builder for residential and supported-living services.

Staff answer what actually happened on the shift; the app writes a complete,
person-centred note in fresh wording every time, so entries stop reading like a
paste of the previous day's.

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
- **No personal data.** Initials only. Nothing is transmitted; the only storage is
  `localStorage` on the device, used to remember recent phrasing so notes vary.
- **It never records what you didn't.** Every sentence traces to a ticked input.
  Skin is not mentioned unless skin was observed.
- **Copy stays locked** until the audit checks pass *and* the staff member confirms
  the note reflects what actually happened. Accountability stays with the human.

## Use

Open `index.html`. No build step, no dependencies, no server.

To run it fully offline on a work tablet, save the file to the device and add it
to the home screen. The only external request the page makes is for its fonts.

## Adapting it to your service

- Field names in `TASKS[].nf` mirror the dropdowns common to UK care record
  systems. Edit them to match yours.
- Sentence banks are plain arrays near the top of the script. Add wording your
  service prefers, or remove wording it doesn't. Everything the app can say is
  readable in the source, so a manager can approve it before rollout.
- Wording is British English (mls, MAR chart, Makaton, Now and Next, 1:1 / 2:1).

## Licence

MIT.
