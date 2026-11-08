/* voice.js: Web Speech API (needs internet and Chrome, Edge or Safari) */

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, listening = false, base = '', quickEnds = 0;
const setMic = () => { $('micBtn').textContent = listening ? 'STOP VOICE' : 'START VOICE'; };
// Errors that will fail again straight away: restarting would loop forever
const FATAL = ['not-allowed', 'service-not-allowed', 'audio-capture', 'network', 'language-not-supported', 'bad-grammar'];

function stopVoice(msg) {
  listening = false; setMic();
  $('micStatus').textContent = msg || '';
  try { rec && rec.stop(); } catch (e) {}
}

function startRec() {
  const st = $('micStatus'), began = Date.now();
  const me = rec = new SR();   // handlers of an older session (after stop then quick start) check "me !== rec" and ignore themselves
  me.lang = 'en-NZ'; me.continuous = true; me.interimResults = true; me.maxAlternatives = 1;
  me.onstart = () => { if (me === rec) st.textContent = 'Listening... Speak clearly.'; };
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
  listening = true; quickEnds = 0; base = $('transcript').value.trim(); setMic();
  try { startRec(); } catch (e) { stopVoice(); }
};
