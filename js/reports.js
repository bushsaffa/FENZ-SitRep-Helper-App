/* reports.js: several saved reports. Record next, tap back to an old one, clear and download. */

const REPORTS_KEY = 'sitrep.reports';
const blankReport = t => ({ text: '', type: t, manual: {}, pm: [] });
let reports = [blankReport('vegetation')], cur = 0;

const snapshot = () => ({ text: $('transcript').value, type, manual, pm });
const isEmptyReport = r => !String(r.text || '').trim() && !hasEdits(r.manual, r.pm);

// The current report is saved every time the screen updates (see updateScript in ui.js), so reports[cur] is
// always current and nothing else needs to call persist() before switching, recording next or downloading.
function persist() {
  reports[cur] = snapshot();
  store.set(REPORTS_KEY, JSON.stringify({ reports, cur }));
}

// One bad entry no longer throws away the rest. If the saved data can't be read at all, a copy is kept
// under REPORTS_KEY + '.bak' because the next persist() would otherwise overwrite it.
function restoreReports() {
  const raw = store.get(REPORTS_KEY);
  if (!raw) return;
  try {
    const d = JSON.parse(raw);
    if (!d || !Array.isArray(d.reports)) throw new Error('unexpected format');
    const want = parseInt(d.cur, 10) || 0, keep = []; let newCur = 0;
    d.reports.forEach((r, i) => {
      if (!r || !TYPES[r.type]) return;
      if (i === want) newCur = keep.length;
      keep.push({ text: String(r.text || ''), type: r.type, manual: r.manual || {}, pm: Array.isArray(r.pm) ? r.pm : [] });
    });
    if (!keep.length) return;
    reports = keep; cur = newCur;
    const r = reports[cur];
    type = r.type; manual = r.manual; pm = r.pm; $('transcript').value = r.text;
  } catch (e) { store.set(REPORTS_KEY + '.bak', raw); }
}

function renderReports() {
  const box = $('reportChips'); box.innerHTML = '';
  $('reportsBox').hidden = reports.length < 2;
  reports.forEach((r, i) => {
    const b = document.createElement('button');
    b.className = 'chip' + (i === cur ? ' on' : '');
    b.textContent = (i + 1) + ' ' + TYPES[r.type].name;
    b.onclick = () => { if (i !== cur) loadReport(i); };
    box.appendChild(b);
  });
}

function loadReport(i) {
  cur = i;
  const r = reports[i];
  type = r.type; manual = r.manual; pm = r.pm; optOpen = false;
  $('transcript').value = r.text;
  if (listening && rec) { try { rec.abort(); } catch (e) {} }   // voice restarts and carries on into this report
  renderChips();
  refresh();
}

// The script for any saved report (used by DOWNLOAD ALL)
function scriptForReport(r) {
  const h = heardFields(r.text, r.type);
  return scriptFor(r.type, r.manual, h.ex, r.pm, h.px);
}

// Clear buttons ask for a second tap so a stray touch can't wipe a report
function confirmTap(btn, label, fn) {
  let armed = false, timer = null;
  btn.onclick = () => {
    if (!armed) {
      armed = true; btn.textContent = 'TAP AGAIN';
      timer = setTimeout(() => { armed = false; btn.textContent = label; }, 3000);
      return;
    }
    clearTimeout(timer); armed = false; btn.textContent = label; fn();
  };
}

// RECORD NEXT: one tap. Saves this report and starts a fresh one.
$('nextBtn').onclick = () => {
  if (!active()) { flash($('nextBtn'), 'NOTHING TO SAVE', 'RECORD NEXT'); return; }
  reports.push(blankReport(type));
  loadReport(reports.length - 1);
};

confirmTap($('clearBtn'), 'CLEAR CURRENT', () => { reports[cur] = blankReport(type); loadReport(cur); });
confirmTap($('clearAllBtn'), 'CLEAR ALL', () => { reports = [blankReport(type)]; loadReport(0); });

$('dlAllBtn').onclick = () => {
  const list = reports.map((r, i) => ({ r, i })).filter(x => !isEmptyReport(x.r));
  if (!list.length) { flash($('dlAllBtn'), 'NOTHING TO SAVE', 'DOWNLOAD ALL'); return; }
  const parts = fileHeader('SITREP DRAFTS: ' + list.length + ' report' + (list.length > 1 ? 's' : ''), '========================================');
  list.forEach(({ r, i }) => parts.push('REPORT ' + (i + 1) + ': ' + TYPES[r.type].name + ' incident', '----------------------------------------', '', scriptForReport(r).join('\n'), ''));
  downloadText(parts.join('\n'), 'SITREP_all_' + fileStamp() + '.txt', $('dlAllBtn'), 'DOWNLOAD ALL');
};