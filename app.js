'use strict';

const STORE_KEY = 'clinicalTracker.encounters.v1';
const LISTS_KEY = 'clinicalTracker.lists.v1';
const EQUIP_KEY = 'clinicalTracker.equipment.v1';
const EQUIP_SETTINGS_KEY = 'clinicalTracker.equipmentSettings.v1';
const NOTIFIED_KEY = 'clinicalTracker.equipmentNotified.v1';

const AGE_BANDS = ['0–9', '10–19', '20–29', '30–39', '40–49', '50–59', '60–69', '70–79', '80–89', '90+'];
const SEXES = ['Female', 'Male', 'Other / not stated'];

const DEFAULT_INTERVENTIONS = [
  'History & assessment',
  'Vital signs / observations',
  'Medication review',
  'Medication administered',
  'Prescription issued',
  'Injection / vaccination',
  'Wound care / dressing',
  'Suturing / wound closure',
  'Bloods taken',
  'ECG',
  'Cannulation',
  'Splinting / immobilisation',
  'Manual therapy',
  'Exercise prescription',
  'Patient education / advice',
  'Imaging requested',
  'Referral',
  'Follow-up arranged',
  'Safeguarding concern raised',
];

const DEFAULT_CONDITIONS = [
  'Respiratory',
  'Cardiovascular',
  'Musculoskeletal',
  'Injury / trauma',
  'Neurological',
  'Gastrointestinal',
  'Genitourinary',
  'Skin / wound',
  'Infection',
  'Diabetes / endocrine',
  'Mental health',
  'Pain',
  'ENT',
  'Eye',
  "Women's health / pregnancy",
  'Chronic disease review',
  'Medication query',
];

// ---------- storage ----------
function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    toast('Could not save — storage unavailable');
    return false;
  }
}

let encounters = load(STORE_KEY, []);
let lists = load(LISTS_KEY, { interventions: DEFAULT_INTERVENTIONS, conditions: DEFAULT_CONDITIONS });

let equipment = load(EQUIP_KEY, []);
let equipSettings = load(EQUIP_SETTINGS_KEY, { warnDays: 30 });

const persist = () => save(STORE_KEY, encounters);
const persistEquipment = () => save(EQUIP_KEY, equipment);

// ---------- helpers ----------
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
const todayIso = () => isoDate(new Date());

function prettyDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ---------- tabs ----------
document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => showView(btn.dataset.view));
});
function showView(name) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === name));
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${name}`));
  if (name === 'stats') renderStats();
  if (name === 'history') renderHistory();
  if (name === 'equipment') renderEquipment();
  if (name === 'settings') renderSettings();
  renderEquipAlerts();
  window.scrollTo(0, 0);
}

// ---------- log form ----------
function renderRadios(container, name, options) {
  container.innerHTML = options
    .map((o) => `<label><input type="radio" name="${name}" value="${esc(o)}"><span>${esc(o)}</span></label>`)
    .join('');
}
function renderChecks(container, name, options) {
  container.innerHTML = options
    .map((o) => `<label><input type="checkbox" name="${name}" value="${esc(o)}"><span>${esc(o)}</span></label>`)
    .join('');
}

function renderForm() {
  renderRadios($('#f-age'), 'age', AGE_BANDS);
  renderRadios($('#f-sex'), 'sex', SEXES);
  renderChecks($('#f-conditions'), 'condition', lists.conditions);
  renderChecks($('#f-interventions'), 'intervention', lists.interventions);
}

function checkedValues(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);
}
function radioValue(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : '';
}

function resetForm() {
  $('#encounter-form').reset();
  $('#edit-id').value = '';
  $('#f-date').value = todayIso();
  $('#btn-save').textContent = 'Save patient';
}

$('#btn-clear').addEventListener('click', resetForm);

$('#encounter-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const conditions = checkedValues('condition');
  const interventions = checkedValues('intervention');
  const otherC = $('#f-condition-other').value.trim();
  const otherI = $('#f-intervention-other').value.trim();
  if (otherC) conditions.push(otherC);
  if (otherI) interventions.push(otherI);

  const age = radioValue('age');
  if (!age) {
    toast('Please choose an age band');
    return;
  }

  const editId = $('#edit-id').value;
  const record = {
    id: editId || uid(),
    date: $('#f-date').value || todayIso(),
    age,
    sex: radioValue('sex'),
    conditions,
    interventions,
    notes: $('#f-notes').value.trim(),
    createdAt: new Date().toISOString(),
  };

  if (editId) {
    const idx = encounters.findIndex((r) => r.id === editId);
    if (idx >= 0) {
      record.createdAt = encounters[idx].createdAt;
      encounters[idx] = record;
    }
  } else {
    encounters.push(record);
  }
  if (!persist()) return;
  toast(editId ? 'Patient updated' : `Saved — ${interventions.length} intervention${interventions.length === 1 ? '' : 's'}`);
  resetForm();
  renderToday();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

function editEncounter(id) {
  const r = encounters.find((x) => x.id === id);
  if (!r) return;
  showView('log');
  resetForm();
  $('#edit-id').value = r.id;
  $('#f-date').value = r.date;
  const setChecked = (name, value) => {
    const el = [...document.querySelectorAll(`input[name="${name}"]`)].find((i) => i.value === value);
    if (el) el.checked = true;
    return !!el;
  };
  setChecked('age', r.age);
  setChecked('sex', r.sex);
  // values not in the current checklist go into the "other" box
  const extraC = r.conditions.filter((c) => !setChecked('condition', c));
  const extraI = r.interventions.filter((i) => !setChecked('intervention', i));
  $('#f-condition-other').value = extraC.join(', ');
  $('#f-intervention-other').value = extraI.join(', ');
  $('#f-notes').value = r.notes || '';
  $('#btn-save').textContent = 'Update patient';
}

function deleteEncounter(id) {
  if (!confirm('Delete this patient record?')) return;
  encounters = encounters.filter((r) => r.id !== id);
  persist();
  renderHistory();
  renderToday();
  toast('Deleted');
}

function renderToday() {
  const t = todayIso();
  const todays = encounters.filter((r) => r.date === t);
  $('#today-patients').textContent = todays.length;
  $('#today-interventions').textContent = todays.reduce((n, r) => n + r.interventions.length, 0);
}

// ---------- stats ----------
function rangeBounds() {
  const mode = $('#s-range').value;
  const now = new Date();
  const t = isoDate(now);
  switch (mode) {
    case 'today':
      return [t, t];
    case 'week': {
      const d = new Date(now);
      const offset = (d.getDay() + 6) % 7; // Monday start
      d.setDate(d.getDate() - offset);
      return [isoDate(d), t];
    }
    case 'month':
      return [isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), t];
    case 'year':
      return [`${now.getFullYear()}-01-01`, t];
    case 'custom':
      return [$('#s-from').value || '0000-01-01', $('#s-to').value || '9999-12-31'];
    default:
      return ['0000-01-01', '9999-12-31'];
  }
}

function countBy(records, fn) {
  const m = new Map();
  for (const r of records) {
    for (const k of [].concat(fn(r))) {
      if (!k) continue;
      m.set(k, (m.get(k) || 0) + 1);
    }
  }
  return m;
}

function renderBars(el, map, { order, sort = true } = {}) {
  let entries = order ? order.map((k) => [k, map.get(k) || 0]) : [...map.entries()];
  if (sort && !order) entries.sort((a, b) => b[1] - a[1]);
  if (!entries.length || entries.every(([, v]) => v === 0)) {
    el.innerHTML = '<p class="empty">No data for this period.</p>';
    return;
  }
  const max = Math.max(...entries.map(([, v]) => v));
  el.innerHTML = entries
    .map(([k, v]) => `
      <div class="row">
        <span class="name" title="${esc(k)}">${esc(k)}</span>
        <span class="track"><span class="fill" style="width:${max ? (v / max) * 100 : 0}%"></span></span>
        <span class="val">${v}</span>
      </div>`)
    .join('');
}

function renderStats() {
  $('#s-custom').hidden = $('#s-range').value !== 'custom';
  const [from, to] = rangeBounds();
  const recs = encounters.filter((r) => r.date >= from && r.date <= to);
  const totalIv = recs.reduce((n, r) => n + r.interventions.length, 0);
  const days = new Set(recs.map((r) => r.date));

  $('#k-patients').textContent = recs.length;
  $('#k-interventions').textContent = totalIv;
  $('#k-avg').textContent = recs.length ? (totalIv / recs.length).toFixed(1) : '0';
  $('#k-days').textContent = days.size;

  renderBars($('#c-interventions'), countBy(recs, (r) => r.interventions));
  renderBars($('#c-conditions'), countBy(recs, (r) => r.conditions));
  renderBars($('#c-age'), countBy(recs, (r) => r.age), { order: AGE_BANDS });
  renderBars($('#c-sex'), countBy(recs, (r) => r.sex || 'Not recorded'));

  const perDay = countBy(recs, (r) => r.date);
  const dayOrder = [...perDay.keys()].sort().reverse().slice(0, 31);
  const labelled = new Map(dayOrder.map((d) => [prettyDate(d), perDay.get(d)]));
  renderBars($('#c-days'), labelled, { order: [...labelled.keys()] });
}

['#s-range', '#s-from', '#s-to'].forEach((s) => $(s).addEventListener('change', renderStats));

// ---------- history ----------
function renderHistory() {
  const q = $('#h-search').value.trim().toLowerCase();
  const list = $('#h-list');
  let recs = [...encounters].sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
  if (q) {
    recs = recs.filter((r) =>
      [r.age, r.sex, r.notes, ...r.conditions, ...r.interventions].join(' ').toLowerCase().includes(q));
  }
  if (!recs.length) {
    list.innerHTML = `<p class="empty card">${encounters.length ? 'No matching records.' : 'No patients logged yet.'}</p>`;
    return;
  }
  let html = '';
  let lastDate = null;
  for (const r of recs) {
    if (r.date !== lastDate) {
      const n = recs.filter((x) => x.date === r.date).length;
      html += `<div class="day-head">${esc(prettyDate(r.date))} · ${n} patient${n === 1 ? '' : 's'}</div>`;
      lastDate = r.date;
    }
    html += `
      <div class="card entry">
        <div class="meta">Age ${esc(r.age)}${r.sex ? ' · ' + esc(r.sex) : ''} · ${r.interventions.length} intervention${r.interventions.length === 1 ? '' : 's'}</div>
        <div class="tags">${r.conditions.map((c) => `<span class="tag">${esc(c)}</span>`).join('')}</div>
        <div class="tags">${r.interventions.map((i) => `<span class="tag iv">${esc(i)}</span>`).join('')}</div>
        ${r.notes ? `<div class="note">${esc(r.notes)}</div>` : ''}
        <div class="ops">
          <button data-edit="${esc(r.id)}">Edit</button>
          <button data-del="${esc(r.id)}" class="danger">Delete</button>
        </div>
      </div>`;
  }
  list.innerHTML = html;
}

$('#h-search').addEventListener('input', renderHistory);
$('#h-list').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.edit) editEncounter(b.dataset.edit);
  if (b.dataset.del) deleteEncounter(b.dataset.del);
});

// ---------- equipment ----------
function daysUntil(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(y, m - 1, d) - today) / 86400000);
}

// Items are usable up to and including their expiry date.
function equipStatus(item) {
  const n = daysUntil(item.expiry);
  if (n < 0) return 'expired';
  if (n <= equipSettings.warnDays) return 'due';
  return 'ok';
}

function dueText(n) {
  if (n < 0) return `Expired ${-n} day${n === -1 ? '' : 's'} ago`;
  if (n === 0) return 'Expires today';
  if (n === 1) return 'Expires tomorrow';
  return `Expires in ${n} days`;
}

function equipGroups() {
  const g = { expired: [], due: [], ok: [] };
  for (const item of [...equipment].sort((a, b) => a.expiry.localeCompare(b.expiry))) g[equipStatus(item)].push(item);
  return g;
}

function renderEquipAlerts() {
  const { expired, due } = equipGroups();
  const n = expired.length + due.length;
  const badge = $('#equip-badge');
  badge.hidden = !n;
  badge.textContent = n;

  const alert = $('#equip-alert');
  const onEquipView = $('#view-equipment').classList.contains('active');
  alert.hidden = !n || onEquipView;
  alert.classList.toggle('has-expired', expired.length > 0);
  const parts = [];
  if (expired.length) parts.push(`${expired.length} item${expired.length === 1 ? '' : 's'} expired`);
  if (due.length) parts.push(`${due.length} due within ${equipSettings.warnDays} days`);
  alert.textContent = `⚠ Equipment: ${parts.join(', ')} — tap to review`;
}

$('#equip-alert').addEventListener('click', () => showView('equipment'));

function renderEquipment() {
  const g = equipGroups();
  $('#e-count-expired').textContent = g.expired.length;
  $('#e-count-due').textContent = g.due.length;
  $('#e-count-ok').textContent = g.ok.length;
  $('#e-due-label').textContent = `due in ≤ ${equipSettings.warnDays} days`;

  const filterEl = $('#e-filter');
  const current = radioValue('efilter') || 'all';
  const filters = [['all', 'All', equipment.length], ['expired', 'Expired', g.expired.length], ['due', 'Due soon', g.due.length], ['ok', 'In date', g.ok.length]];
  filterEl.innerHTML = filters
    .map(([v, label, n]) => `<label><input type="radio" name="efilter" value="${v}"${v === current ? ' checked' : ''}><span>${label} (${n})</span></label>`)
    .join('');

  const q = $('#e-search').value.trim().toLowerCase();
  let items = current === 'all' ? [...g.expired, ...g.due, ...g.ok] : g[current];
  if (q) {
    items = items.filter((i) => [i.name, i.category, i.location, i.lot, i.notes].join(' ').toLowerCase().includes(q));
  }

  const list = $('#e-list');
  if (!items.length) {
    list.innerHTML = `<p class="empty card">${equipment.length ? 'No matching equipment.' : 'No equipment yet. Tap “Add equipment” to start tracking expiry dates.'}</p>`;
    return;
  }
  list.innerHTML = items
    .map((i) => {
      const st = equipStatus(i);
      const details = [i.category, i.location, `Qty ${i.qty ?? 1}`, i.lot ? `Lot ${i.lot}` : ''].filter(Boolean).map(esc).join(' · ');
      return `
      <div class="card entry equip ${st}">
        <div class="equip-head">
          <span class="meta">${esc(i.name)}</span>
          <span class="badge ${st}">${dueText(daysUntil(i.expiry))}</span>
        </div>
        <div class="sub">${details}</div>
        <div class="sub">Expiry: ${esc(prettyDate(i.expiry))}</div>
        ${i.notes ? `<div class="note">${esc(i.notes)}</div>` : ''}
        <div class="ops">
          <button data-eq-edit="${esc(i.id)}">Edit</button>
          <button data-eq-replace="${esc(i.id)}">Replaced</button>
          <button data-eq-del="${esc(i.id)}" class="danger">Delete</button>
        </div>
      </div>`;
    })
    .join('');
}

$('#e-search').addEventListener('input', renderEquipment);
$('#e-filter').addEventListener('change', renderEquipment);

function fillDatalist(el, values) {
  el.innerHTML = [...new Set(values.filter(Boolean))].sort().map((v) => `<option value="${esc(v)}">`).join('');
}

function openEquipForm(item, { replacing = false } = {}) {
  const form = $('#equip-form');
  form.reset();
  fillDatalist($('#eq-category-list'), equipment.map((i) => i.category));
  fillDatalist($('#eq-location-list'), equipment.map((i) => i.location));
  $('#eq-id').value = item ? item.id : '';
  if (item) {
    $('#eq-name').value = item.name;
    $('#eq-category').value = item.category || '';
    $('#eq-location').value = item.location || '';
    $('#eq-qty').value = item.qty ?? 1;
    $('#eq-notes').value = item.notes || '';
    // a replacement is new stock: keep the description, ask for the new expiry and lot
    if (!replacing) {
      $('#eq-expiry').value = item.expiry;
      $('#eq-lot').value = item.lot || '';
    }
  }
  $('#equip-form-title').textContent = replacing ? 'Replaced — enter the new expiry date' : item ? 'Edit equipment' : 'Add equipment';
  $('#btn-equip-save').textContent = replacing ? 'Save replacement' : item ? 'Update equipment' : 'Save equipment';
  form.hidden = false;
  $('#btn-equip-add').hidden = true;
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  (replacing ? $('#eq-expiry') : $('#eq-name')).focus({ preventScroll: true });
}

function closeEquipForm() {
  $('#equip-form').hidden = true;
  $('#btn-equip-add').hidden = false;
}

$('#btn-equip-add').addEventListener('click', () => openEquipForm(null));
$('#btn-equip-cancel').addEventListener('click', closeEquipForm);

$('#equip-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = $('#eq-id').value;
  const qty = parseInt($('#eq-qty').value, 10);
  const record = {
    id: id || uid(),
    name: $('#eq-name').value.trim(),
    category: $('#eq-category').value.trim(),
    location: $('#eq-location').value.trim(),
    qty: Number.isFinite(qty) && qty >= 0 ? qty : 1,
    lot: $('#eq-lot').value.trim(),
    expiry: $('#eq-expiry').value,
    notes: $('#eq-notes').value.trim(),
    createdAt: new Date().toISOString(),
  };
  if (!record.name || !record.expiry) {
    toast('Name and expiry date are required');
    return;
  }
  const idx = equipment.findIndex((i) => i.id === id);
  if (idx >= 0) {
    record.createdAt = equipment[idx].createdAt;
    equipment[idx] = record;
  } else {
    equipment.push(record);
  }
  if (!persistEquipment()) return;
  toast(`${idx >= 0 ? 'Updated' : 'Saved'} — ${dueText(daysUntil(record.expiry)).toLowerCase()}`);
  closeEquipForm();
  renderEquipment();
  renderEquipAlerts();
});

$('#e-list').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const id = b.dataset.eqEdit || b.dataset.eqReplace || b.dataset.eqDel;
  const item = equipment.find((i) => i.id === id);
  if (!item) return;
  if (b.dataset.eqEdit) openEquipForm(item);
  if (b.dataset.eqReplace) openEquipForm(item, { replacing: true });
  if (b.dataset.eqDel) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    equipment = equipment.filter((i) => i.id !== id);
    persistEquipment();
    renderEquipment();
    renderEquipAlerts();
    toast('Deleted');
  }
});

// ---------- notifications ----------
// Browsers can't run this page in the background without a server, so a system
// notification is shown (at most once a day) whenever the app is opened.
// The calendar export covers reminders while the app is closed.
const notifySupported = () => 'Notification' in window;

function renderNotifStatus() {
  const el = $('#notif-status');
  const btn = $('#btn-notify');
  if (!notifySupported()) {
    el.textContent = 'This browser does not support notifications — use the calendar export below for reminders.';
    btn.hidden = true;
    return;
  }
  const p = Notification.permission;
  btn.hidden = p === 'granted';
  el.textContent =
    p === 'granted' ? 'Notifications are on: you will be alerted once a day, when you open the app, if anything is expired or due.'
    : p === 'denied' ? 'Notifications are blocked. Allow them in your browser/site settings, or use the calendar export.'
    : 'Turn on notifications to get an alert when equipment is expired or due.';
}

async function notifyDueEquipment(force = false) {
  if (!notifySupported() || Notification.permission !== 'granted') return;
  const { expired, due } = equipGroups();
  const items = [...expired, ...due];
  if (!items.length) return;
  if (!force && load(NOTIFIED_KEY, '') === todayIso()) return;
  const parts = [];
  if (expired.length) parts.push(`${expired.length} expired`);
  if (due.length) parts.push(`${due.length} due within ${equipSettings.warnDays} days`);
  const names = items.slice(0, 3).map((i) => i.name).join(', ') + (items.length > 3 ? '…' : '');
  const opts = { body: `${parts.join(', ')}: ${names}`, icon: 'icon.svg', tag: 'equipment-expiry', data: { url: './#equipment' } };
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (reg) await reg.showNotification('Equipment expiry', opts);
    else new Notification('Equipment expiry', opts);
    save(NOTIFIED_KEY, todayIso());
  } catch {
    // some mobile browsers only allow notifications via an installed service worker
  }
}

$('#btn-notify').addEventListener('click', async () => {
  const p = await Notification.requestPermission();
  renderNotifStatus();
  if (p === 'granted') {
    const { expired, due } = equipGroups();
    if (expired.length || due.length) notifyDueEquipment(true);
    else toast('Notifications on — nothing is due right now');
  }
});

// ---------- calendar export ----------
const icsText = (s) => String(s).replace(/[\;,]/g, (c) => '\\' + c).replace(/\r?\n/g, '\\n');
// RFC 5545 lines must be folded at 75 octets; 70 chars keeps a margin for multi-byte text
const icsFold = (line) => line.match(/.{1,70}/gu).join('\r\n ');
const icsDate = (iso) => iso.replace(/-/g, '');

$('#btn-export-ics').addEventListener('click', () => {
  const upcoming = equipment.filter((i) => daysUntil(i.expiry) >= 0);
  if (!upcoming.length) {
    toast('No upcoming expiry dates to export');
    return;
  }
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const warn = equipSettings.warnDays;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Clinical Tracker//Equipment expiry//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const i of upcoming) {
    const [y, m, d] = i.expiry.split('-').map(Number);
    const detail = [i.location && `Location: ${i.location}`, i.lot && `Lot: ${i.lot}`, `Qty: ${i.qty ?? 1}`, i.notes].filter(Boolean).join('\n');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${i.id}-${icsDate(i.expiry)}@clinical-tracker`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(i.expiry)}`,
      `DTEND;VALUE=DATE:${icsDate(isoDate(new Date(y, m - 1, d + 1)))}`,
      `SUMMARY:${icsText(`Expires: ${i.name}`)}`,
      `DESCRIPTION:${icsText(detail)}`,
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(`${i.name} expires in ${warn} days`)}`, `TRIGGER:-P${warn}D`, 'END:VALARM',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(`${i.name} expires today`)}`, 'TRIGGER:PT9H', 'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  download(`equipment-expiry-${todayIso()}.ics`, lines.map(icsFold).join('\r\n') + '\r\n', 'text/calendar');
  toast(`Exported ${upcoming.length} expiry date${upcoming.length === 1 ? '' : 's'}`);
});

// ---------- settings ----------
function renderSettings() {
  $('#set-interventions').value = lists.interventions.join('\n');
  $('#set-conditions').value = lists.conditions.join('\n');
  $('#set-warn-days').value = equipSettings.warnDays;
  renderNotifStatus();
}

$('#btn-save-warn').addEventListener('click', () => {
  const n = parseInt($('#set-warn-days').value, 10);
  if (!(n >= 1 && n <= 365)) {
    toast('Enter a number of days between 1 and 365');
    return;
  }
  equipSettings = { ...equipSettings, warnDays: n };
  save(EQUIP_SETTINGS_KEY, equipSettings);
  renderEquipAlerts();
  toast(`You will be warned ${n} days before expiry`);
});

const parseLines = (s) => [...new Set(s.split('\n').map((l) => l.trim()).filter(Boolean))];

$('#btn-save-lists').addEventListener('click', () => {
  const iv = parseLines($('#set-interventions').value);
  const co = parseLines($('#set-conditions').value);
  if (!iv.length || !co.length) {
    toast('Each checklist needs at least one item');
    return;
  }
  lists = { interventions: iv, conditions: co };
  save(LISTS_KEY, lists);
  renderForm();
  resetForm();
  toast('Checklists saved');
});

$('#btn-reset-lists').addEventListener('click', () => {
  if (!confirm('Restore the default checklists? Your custom items will be removed from the lists (existing records are unaffected).')) return;
  lists = { interventions: DEFAULT_INTERVENTIONS, conditions: DEFAULT_CONDITIONS };
  save(LISTS_KEY, lists);
  renderSettings();
  renderForm();
  resetForm();
  toast('Defaults restored');
});

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

$('#btn-export-csv').addEventListener('click', () => {
  const allIv = [...new Set([...lists.interventions, ...encounters.flatMap((r) => r.interventions)])];
  const allCo = [...new Set([...lists.conditions, ...encounters.flatMap((r) => r.conditions)])];
  const cell = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const header = ['Date', 'Age', 'Sex', 'Intervention count', ...allCo.map((c) => `Condition: ${c}`), ...allIv.map((i) => `Intervention: ${i}`), 'Notes'];
  const rows = [...encounters]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => [
      r.date, r.age, r.sex, r.interventions.length,
      ...allCo.map((c) => (r.conditions.includes(c) ? 1 : 0)),
      ...allIv.map((i) => (r.interventions.includes(i) ? 1 : 0)),
      r.notes || '',
    ]);
  const csv = [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');
  download(`clinical-tracker-${todayIso()}.csv`, csv, 'text/csv');
});

$('#btn-export-equip-csv').addEventListener('click', () => {
  const cell = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const header = ['Name', 'Category', 'Location', 'Quantity', 'Lot / batch / serial', 'Expiry', 'Days remaining', 'Status', 'Notes'];
  const label = { expired: 'Expired', due: 'Due soon', ok: 'In date' };
  const rows = [...equipment]
    .sort((a, b) => a.expiry.localeCompare(b.expiry))
    .map((i) => [i.name, i.category, i.location, i.qty ?? 1, i.lot, i.expiry, daysUntil(i.expiry), label[equipStatus(i)], i.notes || '']);
  const csv = [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');
  download(`equipment-${todayIso()}.csv`, csv, 'text/csv');
});

$('#btn-export-json').addEventListener('click', () => {
  const data = { app: 'clinical-tracker', version: 2, exportedAt: new Date().toISOString(), lists, encounters, equipment, equipSettings };
  download(`clinical-tracker-backup-${todayIso()}.json`, JSON.stringify(data, null, 2), 'application/json');
});

$('#file-import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.encounters) && !Array.isArray(data.equipment)) throw new Error('bad file');
    const valid = (data.encounters || []).filter((r) =>
      r && typeof r.id === 'string' && typeof r.date === 'string' && Array.isArray(r.conditions) && Array.isArray(r.interventions));
    const existing = new Set(encounters.map((r) => r.id));
    const added = valid.filter((r) => !existing.has(r.id));
    const existingEq = new Set(equipment.map((i) => i.id));
    const addedEq = (data.equipment || []).filter((i) =>
      i && typeof i.id === 'string' && typeof i.name === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(i.expiry) && !existingEq.has(i.id));
    if (!confirm(`Restore backup? ${added.length} new patient record(s) and ${addedEq.length} equipment item(s) will be added (duplicates skipped).`)) return;
    encounters = encounters.concat(added);
    persist();
    equipment = equipment.concat(addedEq);
    persistEquipment();
    if (data.equipSettings && data.equipSettings.warnDays >= 1) {
      equipSettings = { warnDays: Math.min(365, Math.round(data.equipSettings.warnDays)) };
      save(EQUIP_SETTINGS_KEY, equipSettings);
    }
    renderEquipAlerts();
    if (data.lists && Array.isArray(data.lists.interventions) && Array.isArray(data.lists.conditions)) {
      lists = data.lists;
      save(LISTS_KEY, lists);
      renderSettings();
      renderForm();
    }
    renderToday();
    toast(`Restored ${added.length} patient record(s), ${addedEq.length} equipment item(s)`);
  } catch {
    toast('That file is not a valid backup');
  }
});

$('#btn-wipe').addEventListener('click', () => {
  if (!confirm('Permanently delete ALL patient records on this device?')) return;
  if (!confirm('Are you sure? Export a backup first if you might need this data.')) return;
  encounters = [];
  persist();
  renderToday();
  toast('All data deleted');
});

// ---------- init ----------
renderForm();
resetForm();
renderToday();
renderEquipAlerts();

function openFromHash() {
  if (location.hash === '#equipment') showView('equipment');
}
window.addEventListener('hashchange', openFromHash);
openFromHash();

// re-check expiry status when the app comes back to the foreground (e.g. the next day)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  renderEquipAlerts();
  if ($('#view-equipment').classList.contains('active')) renderEquipment();
  notifyDueEquipment();
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(() => notifyDueEquipment()).catch(() => {});
} else {
  notifyDueEquipment();
}
