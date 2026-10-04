# Clinical Tracker

A simple, private app for tracking the patients you see and the clinical interventions you perform.

## Features

- **Log patient** – tap-to-select age decade (0–9 … 90+), sex, presenting problem/condition
  checkboxes, intervention checkboxes, plus "other" free text and optional notes.
- **Today counter** – patients and interventions logged today, always visible.
- **Stats** – totals for today / this week / month / year / all time / custom range:
  patients, interventions, interventions per patient, days worked, and breakdowns by
  intervention, condition, age, sex and patients per day.
- **History** – searchable list grouped by day, with edit and delete.
- **Settings** – customise the intervention and condition checklists to match your practice.
- **Export** – CSV (one row per patient, a 0/1 column per condition and intervention — ready
  for Excel) and a JSON backup that can be restored on another device.
- **Works offline** and can be installed to your phone's home screen.

## Privacy

All data stays on your device in the browser's local storage — nothing is sent to a server.
The app records no names or identifiers; avoid entering identifiable details in the notes field.
Clearing your browser data deletes the records, so export a backup regularly.

## Running it

No build step. Either:

- Open `index.html` directly in a browser, or
- Serve the folder (e.g. `python3 -m http.server`) and visit `http://localhost:8000`, or
- Host it on GitHub Pages (Settings → Pages → deploy from branch) to use it on your phone,
  then use "Add to Home Screen".
