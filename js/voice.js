/* voice.js: Web Speech API (needs internet and Chrome, Edge or Safari) */

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, listening = false, base = '', quickEnds = 0, alive = false;

// Keep the screen awake while listening: a locked screen makes the phone cut the microphone.
// The lock is dropped by the browser whenever the app is hidden, so it is re-taken when the app comes back.
let wakeLock = null;
async function holdScreen() {
  try {
    if (!('wakeLock' in navigator) || wakeLock) return;
    const l = await navigator.wakeLock.request('screen');
    wakeLock = l;
    l.addEventListener('release', () => { if (wakeLock === l) wakeLock = null; });
  } catch (e) { /* not supported, or refused (e.g. battery saver): voice still works, the screen just may lock */ }
}
function releaseScreen() { try { wakeLock && wakeLock.release(); } catch (e) {} wakeLock = null; }
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !listening) return;
  holdScreen();
  // The phone stops the microphone while the app is hidden. Pick up again where we left off.
  if (!alive) { base = $('transcript').value.trim(); quickEnds = 0; try { startRec(); } catch (e) { stopVoice(); } }
});
const setMic = () => { $('micBtn').textContent = listening ? 'STOP VOICE' : 'START VOICE'; };
// Errors that will fail again straight away: restarting would loop forever
const FATAL = ['not-allowed', 'service-not-allowed', 'audio-capture', 'network', 'language-not-supported', 'bad-grammar'];

function stopVoice(msg) {
  listening = false; setMic(); releaseScreen();
  $('micStatus').textContent = msg || '';
  try { rec && rec.stop(); } catch (e) {}
}

function startRec() {
  const st = $('micStatus'), began = Date.now();
  try { rec && rec.abort(); } catch (e) {}   // never leave an older session running underneath
  const me = rec = new SR();   // handlers of an older session (after stop then quick start) check "me !== rec" and ignore themselves
  me.lang = 'en-NZ'; me.continuous = true; me.interimResults = true; me.maxAlternatives = 1;
  me.onstart = () => { if (me === rec) { alive = true; st.textContent = 'Listening... Speak clearly.'; } };
  me.onerror = e => {
    if (me !== rec) return;
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      stopVoice('Microphone blocked. Allow microphone access, or use your keyboard microphone key.');
    } else if (FATAL.includes(e.error)) {
      stopVoice('Voice error: ' + e.error + '. Voice stopped. You can still type.');
    } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
      st.textContent = 'Voice error: ' + e.error + '. You can still type.';
    }
  };
  // Browsers end a session after a pause. Restart it, keeping everything said so far.
  me.onend = () => {
    if (me !== rec) return;
    alive = false;
    if (!listening) { setMic(); if (!st.textContent.startsWith('Voice error') && !st.textContent.startsWith('Microphone')) st.textContent = ''; return; }
    // Sessions that die almost immediately with no result mean something is wrong; give up after a few instead of looping
    quickEnds = (Date.now() - began < 1500) ? quickEnds + 1 : 0;
    if (quickEnds >= 5) { stopVoice('Voice keeps stopping. Voice stopped. You can still type.'); return; }
    base = $('transcript').value.trim();
    setTimeout(() => { if (listening && me === rec) { try { startRec(); } catch (e) { stopVoice(); } } }, 250);
  };
  me.onresult = e => {
    if (me !== rec) return;
    quickEnds = 0;
    const t = Array.from(e.results).map(r => r[0].transcript.trim()).filter(Boolean).join(' ');
    $('transcript').value = (base + ' ' + stripFillers(t)).trim();
    refresh();
  };
  me.start();
}
$('micBtn').onclick = () => {
  const st = $('micStatus');
  if (!SR) { st.textContent = 'Voice is not supported in this browser. Use your keyboard microphone key.'; return; }
  if (listening) { stopVoice(); return; }
  listening = true; quickEnds = 0; base = $('transcript').value.trim(); setMic(); holdScreen();
  try { startRec(); } catch (e) { stopVoice(); }
};