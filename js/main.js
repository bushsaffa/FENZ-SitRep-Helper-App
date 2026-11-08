/* main.js: wires up the inputs and starts the app */

$('transcript').oninput = () => {
  if (listening && rec) { base = $('transcript').value.trim(); try { rec.abort(); } catch (e) {} }  // restart with the edited text
  refresh();
};
$('callsign').value = store.get('sitrep.callsign') || '8671';
$('callsign').oninput = () => { store.set('sitrep.callsign', $('callsign').value.trim()); updateScript(); };
$('optDetails').addEventListener('toggle', () => { optOpen = $('optDetails').open; });
$('vitalDetails').addEventListener('toggle', () => { vitalOpen = $('vitalDetails').open; });
$('heardDetails').addEventListener('toggle', () => { heardOpen = $('heardDetails').open; });

restoreReports();
renderChips();
refresh();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
if (navigator.storage && navigator.storage.persist) navigator.storage.persist();