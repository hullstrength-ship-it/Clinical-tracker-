# Clinical Tracker

A simple, private app for tracking the patients you see, the clinical interventions you perform,
and the expiry dates of your medical equipment.

## Features

- **Log patient** – tap-to-select age decade (0–9 … 90+), sex, presenting problem/condition
  checkboxes, intervention checkboxes, plus "other" free text and optional notes.
- **Today counter** – patients and interventions logged today, always visible.
- **Stats** – totals for today / this week / month / year / all time / custom range:
  patients, interventions, interventions per patient, days worked, and breakdowns by
  intervention, condition, age, sex and patients per day.
- **History** – searchable list grouped by day, with edit and delete.
- **Equipment** – record each item (name, expiry date, category, location, quantity,
  lot/batch/serial, notes). Items are colour-coded **expired / due soon / in date**, sorted by
  expiry, filterable and searchable. "Replaced" keeps the item details and asks for the new
  expiry date and lot.
- **Expiry alerts** – a badge on the Equipment tab and a banner across the app whenever anything
  is expired or due within your warning window (default 30 days, change it in Settings).
  - **Notifications**: turn them on in Settings to get a system notification (at most once a
    day) when you open the app and something is expired or due.
  - **Calendar reminders**: "Add expiry dates to calendar" downloads an `.ics` file. Open it on
    your phone/computer to add an event on each expiry date, with a reminder N days before and
    on the day. This works even when the app is closed, so re-export after adding items.
- **Settings** – customise the intervention and condition checklists to match your practice.
- **Export** – CSV (one row per patient, a 0/1 column per condition and intervention — ready
  for Excel), an equipment CSV, and a JSON backup (patients and equipment) that can be
  restored on another device.
- **Works offline** and can be installed to your phone's home screen.

## Privacy

All data stays on your device in the browser's local storage — nothing is sent to a server.
The app records no names or identifiers; avoid entering identifiable details in the notes field.
Clearing your browser data deletes the records, so export a backup regularly.

Because there is no server, the app can't push notifications while it is closed; use the
calendar export for reminders you can't miss. Each device keeps its own data, so a team
sharing one equipment list should use one device (or restore backups between devices).

## Running it

No build step. Either:

- Open `index.html` directly in a browser, or
- Serve the folder (e.g. `python3 -m http.server`) and visit `http://localhost:8000`, or
- Host it on GitHub Pages (Settings → Pages → deploy from branch) to use it on your phone,
  then use "Add to Home Screen".
