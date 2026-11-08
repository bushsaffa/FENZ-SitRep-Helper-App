/* timer.js: 30 minute progress report timer (survives a page reload) */

let timerEnd = 0, timerInterval = null, alarmed = false, audioCtx = null;
function beep() {
  try {
    if (!audioCtx) return;
    for (let i = 0; i < 3; i++) {
      const o = audioCtx.createOscillator(), gn = audioCtx.createGain(), t0 = audioCtx.currentTime + i * 0.4;
      o.connect(gn); gn.connect(audioCtx.destination); o.frequency.value = 880;
      gn.gain.setValueAtTime(0.2, t0); o.start(t0); o.stop(t0 + 0.25);
    }
  } catch (e) {}
}
function updateTimer() {
  const left = Math.round((timerEnd - Date.now()) / 1000), tb = $('timerBox');
  if (left <= 0) {
    tb.textContent = '00:00'; tb.classList.add('due');
    clearInterval(timerInterval); timerInterval = null;
    if (!alarmed) { alarmed = true; beep(); try { navigator.vibrate && navigator.vibrate([300, 150, 300, 150, 300]); } catch (e) {} }
    return;
  }
  tb.textContent = String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0');
}
function runTimer() {
  alarmed = timerEnd <= Date.now();   // only stay quiet for a timer that had already run out before a reload
  $('timerBox').classList.remove('due');
  updateTimer();
  if (timerInterval) clearInterval(timerInterval);
  if (timerEnd > Date.now()) timerInterval = setInterval(updateTimer, 1000);
}
// Browsers only allow sound after a user gesture, so unlock audio on any tap (also after a reload)
document.addEventListener('pointerdown', () => {
  try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume && audioCtx.resume(); } catch (e) {}
});
$('timerBtn').onclick = () => {
  timerEnd = Date.now() + 30 * 60 * 1000;
  store.set('sitrep.timerEnd', String(timerEnd));
  runTimer();
};
$('timerStopBtn').onclick = () => {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  timerEnd = 0; alarmed = false; store.del('sitrep.timerEnd');
  const tb = $('timerBox'); tb.textContent = '--:--'; tb.classList.remove('due');
};
const savedEnd = parseInt(store.get('sitrep.timerEnd') || '0', 10);
if (savedEnd) { timerEnd = savedEnd; runTimer(); }   // survives a page reload