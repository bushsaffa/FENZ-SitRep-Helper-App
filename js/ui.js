/* ui.js: state, patient rows, field rows, script display, copy, download and clear */

let type = 'vegetation', manual = {}, pm = [], px = [], ex = {}, optOpen = false, vitalOpen = false, heardOpen = false, plainScript = '', pendingType = null, pendingTimer = null;
const slot = id => Object.assign({}, SLOTS[id], (OVR[type] || {})[id]);
// A field's value: typed or chip-selected (manual) wins over what was heard (extracted)
const lookup = (man, exr, id) => id === 'callsign' ? $('callsign').value.trim() : (id in man ? man[id] : (exr[id] || ''));
const val = id => lookup(manual, ex, id);
const optVal = o => o === 'None' ? 'nil' : o.toLowerCase();
const hasEdits = (man, pmArr) => Object.keys(man || {}).length > 0 || (pmArr || []).some(x => x && Object.keys(x).length);
const active = () => !isEmptyReport(snapshot());   // isEmptyReport and snapshot live in reports.js

// ----- Patients: each one has their own status, condition, injuries -----
const PFLD = {
  status:  { label: 'Status', opts: ['Status One', 'Status Two', 'Status Three', 'Status Four', 'Status Zero'] },
  trapped: { label: 'Trapped?', opts: ['Trapped', 'Not trapped'] },
  desc:    { label: 'Description (e.g. approximately 35-year-old male)' },
  cond:    { label: 'Condition', opts: ['Conscious', 'Unconscious', 'Compromised breathing', 'Not breathing', 'Cardiac arrest', 'Ambulatory'], multi: true },
  inj:     { label: 'Suspected injuries (e.g. lower limb injuries)' }
};
const PORDER = { structure: ['status', 'desc', 'cond', 'inj'], mva: ['status', 'trapped', 'desc', 'cond', 'inj'], medical: ['status', 'desc', 'cond', 'inj'] };
const PVITAL = ['status', 'trapped'];
const patientValue = (pmArr, pxArr, i, f) => (pmArr[i] && f in pmArr[i]) ? pmArr[i][f] : ((pxArr[i] || {})[f] || '');
const pval = (i, f) => patientValue(pm, px, i, f);
// Shared by the live screen and by saved reports (see reports.js)
function countPatients(c, manualSet, pxLen) {
  c = String(c || '').toLowerCase();
  if (c === 'nil' || c === 'no') return 0;
  const n = c ? (toNum(c) || 0) : 0;
  return Math.min(6, (manualSet && c) ? n : Math.max(n, pxLen));
}
function buildPatients(c, manualSet, pmArr, pxArr) {
  const pv = (i, f) => patientValue(pmArr, pxArr, i, f);
  return Array.from({ length: countPatients(c, manualSet, pxArr.length) }, (_, i) => ({
    status: pv(i, 'status'), trapped: pv(i, 'trapped'), desc: pv(i, 'desc'), cond: pv(i, 'cond'), inj: pv(i, 'inj')
  }));
}
const patientCount = () => countPatients(val('patients'), 'patients' in manual, px.length);

// Shared by the live screen and saved reports: transcript -> heard fields and patients, then the script
function heardFields(text, t) {
  const raw = extract(text, t), f = {};
  idsFor(t).forEach(id => { if (raw[id]) f[id] = raw[id]; });
  return { ex: f, px: raw._patients || [] };
}
function scriptFor(t, man, exr, pmArr, pxArr) {
  const g = id => lookup(man, exr, id);
  return buildScript(t, g, buildPatients(g('patients'), 'patients' in man, pmArr, pxArr));
}

// ----- Rows -----
const fieldSpec = id => {
  const s = slot(id), heard = () => ex[id] || '';
  return { label: s.label, opts: s.opts || [], multi: !!s.multi, rerender: id === 'patients', get: () => val(id), heard,
    set: v => { if (v === '' && !heard()) delete manual[id]; else manual[id] = v; },
    reset: () => { delete manual[id]; } };
};
const patSpec = (i, f) => {
  const d = PFLD[f], heard = () => (px[i] || {})[f] || '';
  return { label: d.label, opts: d.opts || [], multi: !!d.multi, get: () => pval(i, f), heard,
    set: v => { const o = (pm[i] = pm[i] || {}); if (v === '' && !heard()) delete o[f]; else o[f] = v; },
    reset: () => { if (pm[i]) delete pm[i][f]; } };
};

function allRows() {
  const T = TYPES[type], rows = [];
  T.groups.forEach(([g, ids]) => {
    ids.forEach(id => rows.push({ id, g, vital: T.vital.includes(id), sp: fieldSpec(id) }));
    if (T.pat && ids.includes('patients'))
      for (let i = 0; i < patientCount(); i++)
        PORDER[type].forEach(f => rows.push({ g: 'Patient ' + (i + 1), vital: PVITAL.includes(f), sp: patSpec(i, f) }));
  });
  return rows;
}

function toggleOpt(sp, o) {
  const v = optVal(o), whole = sp.get().toLowerCase();
  if (!sp.multi) { sp.set(whole === v ? '' : v); return; }   // tap again to clear
  if (v === 'nil') { sp.set(whole === 'nil' ? '' : 'nil'); return; }
  const cur = splitItems(whole).filter(x => x !== 'nil');
  sp.set((cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v]).join(', '));
}

// Switching incident type clears typed and selected values, so it asks for a second tap when there are any
function renderChips() {
  const box = $('typeChips'); box.innerHTML = '';
  if (pendingType === type) pendingType = null;
  Object.keys(TYPES).forEach(k => {
    const b = document.createElement('button');
    b.className = 'chip' + (k === type ? ' on' : ''); b.textContent = k === pendingType ? 'TAP AGAIN' : TYPES[k].label;
    b.onclick = () => {
      if (k === type) return;
      clearTimeout(pendingTimer);
      if (hasEdits(manual, pm) && pendingType !== k) {
        pendingType = k;
        pendingTimer = setTimeout(() => { pendingType = null; renderChips(); }, 3000);
        renderChips(); return;
      }
      pendingType = null; type = k; manual = {}; pm = []; renderChips(); refresh();
    };
    box.appendChild(b);
  });
}

function makeRow(sp) {
  const row = document.createElement('div'); row.className = 'gap';
  const lab = document.createElement('div'); lab.className = 'glabel'; lab.textContent = sp.label; row.appendChild(lab);
  const chips = document.createElement('div'); chips.className = 'chips';
  const input = document.createElement('input'); input.placeholder = 'Type here'; input.value = sp.get();
  const useHeard = document.createElement('button'); useHeard.className = 'chip'; useHeard.hidden = true;
  useHeard.onclick = () => { sp.reset(); input.value = sp.get(); if (sp.rerender) renderFields(); else sync(); updateScript(); };
  const sync = () => {
    const whole = sp.get().toLowerCase(), cur = splitItems(whole);
    row.classList.toggle('done', !!whole);
    chips.querySelectorAll('.chip').forEach(c => {
      const o = optVal(c.textContent);
      c.classList.toggle('on', sp.multi ? cur.includes(o) : whole === o);
    });
    const h = sp.heard ? sp.heard() : '';
    useHeard.hidden = !(h && whole !== h.toLowerCase());
    useHeard.textContent = 'USE HEARD: ' + h;
  };
  sp.opts.forEach(o => {
    const c = document.createElement('button'); c.className = 'chip'; c.textContent = o;
    c.onclick = () => { toggleOpt(sp, o); input.value = sp.get(); if (sp.rerender) renderFields(); else sync(); updateScript(); };
    chips.appendChild(c);
  });
  if (sp.opts.length) row.appendChild(chips);
  input.oninput = () => { sp.set(input.value.trim()); sync(); updateScript(); };
  input.onchange = () => { if (sp.rerender) renderFields(); };   // patient count changed: add or remove patient rows
  row.appendChild(input);
  row.appendChild(useHeard);
  sync();
  return row;
}

function addRows(box, list) {
  let g = null;
  list.forEach(r => {
    if (r.g !== g) { g = r.g; const h = document.createElement('div'); h.className = 'gtitle'; h.textContent = g; box.appendChild(h); }
    box.appendChild(makeRow(r.sp));
  });
}

function renderFields() {
  fieldsStale = false;
  const alt = TYPES[type].alt || {};
  const rows = allRows(), got = r => !!r.sp.get();
  const isVital = r => r.vital && !(r.id && (alt[r.id] || []).some(a => val(a)));   // e.g. area given, so length/width aren't critical
  const vm = rows.filter(r => isVital(r) && !got(r)), om = rows.filter(r => !isVital(r) && !got(r)), hd = rows.filter(got);
  const on = active();
  ['vitalList', 'optList', 'fields'].forEach(id => { $(id).innerHTML = ''; });
  addRows($('vitalList'), vm); addRows($('optList'), om); addRows($('fields'), hd);
  $('vitalBox').hidden = !on || !vm.length;
  $('vitalDetails').open = vitalOpen;
  $('vitalSummary').textContent = 'MISSING CRITICAL INFORMATION: ' + vm.length;
  $('scriptBox').hidden = !on;
  $('optBox').hidden = !on || !om.length;
  $('optDetails').open = optOpen;
  $('optSummary').textContent = 'ADDITIONAL INFORMATION (' + om.length + ')';
  $('heardBox').hidden = !on || !hd.length;
  $('heardDetails').open = heardOpen;
  $('heardSummary').textContent = 'INFORMATION HEARD (' + hd.length + ')';
}

function updateScript() {
  const out = $('script');
  out.innerHTML = '';
  const lines = scriptFor(type, manual, ex, pm, px);
  lines.forEach(l => { const d = document.createElement('div'); d.className = 'line'; d.textContent = l; out.appendChild(d); });
  plainScript = lines.join('\n');
  persist();
}

// Voice results arrive several times a second. Rebuilding the rows would drop focus from a field being typed in,
// so while one is focused the rebuild waits until it loses focus.
let fieldsStale = false;
const editingField = () => { const a = document.activeElement; return !!(a && a.tagName === 'INPUT' && a.closest && a.closest('#vitalList, #optList, #fields')); };
document.addEventListener('focusout', () => { if (fieldsStale) setTimeout(() => { if (fieldsStale && !editingField()) renderFields(); }, 300); });

function refresh() {
  ({ ex, px } = heardFields($('transcript').value, type));
  if (editingField()) fieldsStale = true; else renderFields();
  updateScript(); renderReports();
}

// ---------- Copy and download ----------
function copyText(s) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(s);
  return new Promise((res, rej) => {
    const ta = document.createElement('textarea');
    ta.value = s; ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    ok ? res() : rej();
  });
}
function flash(btn, text, back) { btn.textContent = text; setTimeout(() => btn.textContent = back, 1800); }

$('copyBtn').onclick = () => {
  const b = $('copyBtn');
  copyText(plainScript).then(() => flash(b, 'COPIED', 'COPY')).catch(() => flash(b, 'COPY FAILED', 'COPY'));
};

const pad2 = n => String(n).padStart(2, '0');
const fileStamp = () => { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + '_' + pad2(d.getHours()) + pad2(d.getMinutes()); };
const humanDate = () => { const d = new Date(); return d.toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ', ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()); };
// Header shared by DOWNLOAD CURRENT and DOWNLOAD ALL
function fileHeader(first, rule) {
  const cs = val('callsign');
  return [first, 'Date: ' + humanDate(), cs ? 'Callsign: ' + cs : null, 'Draft aid only. Not an official FENZ record.', rule, ''].filter(x => x !== null);
}
function downloadText(text, filename, btn, back) {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    flash(btn, 'SAVED', back);
  } catch (e) { flash(btn, 'FAILED', back); }
}

$('dlBtn').onclick = () => {
  if (!plainScript) return;
  const text = [
    ...fileHeader('SITREP DRAFT: ' + TYPES[type].name + ' incident' + (reports.length > 1 ? ' (report ' + (cur + 1) + ' of ' + reports.length + ')' : ''), '----------------------------------------'),
    plainScript,
    ''
  ].join('\n');
  downloadText(text, 'SITREP_' + type + '_' + fileStamp() + '.txt', $('dlBtn'), 'DOWNLOAD CURRENT');
};