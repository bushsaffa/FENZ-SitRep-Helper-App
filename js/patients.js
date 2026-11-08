/* patients.js: each patient is read separately (status, description, condition, injuries, entrapment) */

const SNUM = { one: 0, two: 1, three: 2, four: 3, five: 4, first: 0, second: 1, third: 2, fourth: 3 };
function patientFields(s) {
  const o = {}; let m;
  if ((m = s.match(/\bstatus\s+(zero|one|two|three|four|[0-4])\b/i))) { const w = m[1].toLowerCase(); o.status = 'status ' + (/^\d$/.test(w) ? WORDS[+w] : w); }
  if ((m = s.match(new RegExp('(approximately|about|around|roughly)?\\s*(' + N + ')[\\s-]*(?:year[\\s-]*old|yo|y/o)\\s*(male|female|man|woman|boy|girl)?', 'i')))) {
    const g = (m[3] || '').toLowerCase();
    o.desc = (m[1] ? 'approximately ' : '') + toNum(m[2]) + '-year-old' + (g ? ' ' + ({ man: 'male', woman: 'female' }[g] || g) : '');
  }
  const pc = [];
  // "not conscious" means unconscious and "semi-conscious" is neither; only a bare "conscious" is conscious
  if (/\bunconscious\b|\b(?:not|isn'?t|no longer|non)[\s-]+(?:\w+\s+)?conscious\b/i.test(s)) pc.push('unconscious');
  else if (/\bsemi[\s-]?conscious\b/i.test(s)) pc.push('semi-conscious');
  else if (/\bconscious\b/i.test(s)) pc.push('conscious');
  if (/\bcompromised breathing\b|\bdifficulty breathing\b|\bbreathing difficult\w*|\bstruggling to breathe\b/i.test(s)) pc.push('compromised breathing');
  if (/\bnot breathing\b/i.test(s)) pc.push('not breathing');
  if (/\bcardiac arrest\b/i.test(s)) pc.push('cardiac arrest');
  if (/\b(?:non|not)[\s-]+ambulatory\b/i.test(s)) pc.push('non-ambulatory');
  else if (/\bambulatory\b/i.test(s)) pc.push('ambulatory');
  if (pc.length) o.cond = pc.join(', ');
  if ((m = s.match(/\bsuspected\s+((?:[a-z]+\s+){0,3}?(?:injur(?:y|ies)|fractures?))\b/i))) o.inj = m[1].toLowerCase();
  if (/\b(?:no entrapments?|no one(?:'s| is)?\s+trapped|nobody(?:'s| is)?\s+trapped|not (?:en)?trapped)\b/i.test(s)) o.trapped = 'not trapped';
  else if (/\b(?:trapped|entrapped)\b/i.test(s)) o.trapped = 'trapped';
  return o;
}
function extractPatients(t) {
  // "patient two", "second patient", "another patient" start a new patient
  const re = /\b(?:patient|casualty)\s+(?:number\s+)?(one|two|three|four|five|[1-5])\b|\b(first|second|third|fourth)\s+(?:patient|casualty|person|one)\b|\b(?:another|other|next)\s+(?:patient|casualty)\b/gi;
  const marks = []; let last = -1, m;
  while ((m = re.exec(t))) {
    const w = (m[1] || m[2] || '').toLowerCase();
    const idx = w ? (/^\d$/.test(w) ? +w - 1 : SNUM[w]) : last + 1;
    marks.push({ at: m.index, idx }); last = idx;
  }
  const out = [], put = (i, s) => { const f = patientFields(s); if (Object.keys(f).length) out[i] = Object.assign(out[i] || {}, f); };
  if (marks.length) {
    if (marks[0].idx > 0) put(0, t.slice(0, marks[0].at));   // "one patient status two... second patient status four"
    marks.forEach((k, j) => put(k.idx, t.slice(k.at, j + 1 < marks.length ? marks[j + 1].at : t.length)));
  } else {
    const all = [...t.matchAll(/\bstatus\s+(zero|one|two|three|four|[0-4])\b/gi)];
    if (all.length > 1) all.forEach((s, i) => put(i, (i === 0 ? t.slice(0, s.index) : '') + t.slice(s.index, i + 1 < all.length ? all[i + 1].index : t.length)));  // each status starts the next patient
    else put(0, t);
  }
  return Array.from(out, x => x || {});
}