/* helpers.js: number words, small string helpers, DOM and storage shortcuts */

const NUMW = 'one|two|three|four|five|six|seven|eight|nine|ten';
const ONES = 'zero|' + NUMW + '|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen';
const TENS = 'twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety';
// A spoken or typed number: 50, 15, fifteen, twenty five, a hundred, one hundred and fifty
const NP = '(?:\\d+(?:\\.\\d+)?|(?:a|' + NUMW + ')\\s+hundred(?:\\s+and\\s+(?:' + TENS + ')(?:[\\s-](?:' + NUMW + '))?)?|(?:' + TENS + ')(?:[\\s-](?:' + NUMW + '))?|' + ONES + ')';
const N = '\\b' + NP + '\\b';
const COUNT = '(?:\\d+|' + NUMW + ')';
const DIR = 'north[\\s-]?west|north[\\s-]?east|south[\\s-]?west|south[\\s-]?east|north|south|east|west';

const UNITS = { zero:0, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10, eleven:11, twelve:12, thirteen:13, fourteen:14, fifteen:15, sixteen:16, seventeen:17, eighteen:18, nineteen:19 };
const TENV = { twenty:20, thirty:30, forty:40, fifty:50, sixty:60, seventy:70, eighty:80, ninety:90 };
const WORDS = Object.keys(UNITS).slice(0, 11);   // zero..ten, in order

function toNum(s) {
  s = String(s).toLowerCase().trim();
  if (/^\d+(?:\.\d+)?$/.test(s)) return parseFloat(s);
  let total = 0, cur = 0;
  for (const w of s.replace(/-/g, ' ').split(/\s+/)) {
    if (w in UNITS) cur += UNITS[w];
    else if (w in TENV) cur += TENV[w];
    else if (w === 'a') cur = 1;
    else if (w === 'hundred') { total += (cur || 1) * 100; cur = 0; }
  }
  return total + cur;
}

const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const title = s => s.replace(/(^|\s)[a-z]/g, c => c.toUpperCase());
const joinList = a => a.length > 1 ? a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1] : (a[0] || '');
const an = w => (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w;
const nd = s => s.toLowerCase().replace(/[\s-]/g, '');
const numw = v => (/^\d+$/.test(v) && +v <= 10) ? WORDS[+v] : v;
const isOne = v => ['1', 'one', 'a', 'an', 'single'].includes(String(v).toLowerCase());
const pl = v => isOne(v) ? '' : 's';
const splitItems = s => String(s || '').split(/\s*(?:,|\band\b)\s*/i).map(x => x.trim()).filter(Boolean);
// Like splitItems, but also splits before "a"/"an" ("two appliances a helicopter")
const splitRes = s => splitItems(s).flatMap(x => x.split(/\s+(?=an?\s)/i)).map(x => x.trim()).filter(Boolean);
const fmt = s => s.replace(/high[\s]pressure/gi, 'high-pressure');
const clean = s => s.replace(/\s+(?:thanks|please|over|cheers|as well)$/i, '').replace(/[\s,;:.!?]+$/, '').trim();
const head = s => String(s).split(/\s*,\s*/)[0].trim();
const stripFillers = s => String(s).replace(/\b(?:uh|um|erm?|ah)\b/gi, ' ').replace(/\s+/g, ' ').trim();
const lastMatch = (text, re) => { const a = [...text.matchAll(re)]; return a.length ? a[a.length - 1] : null; };

// DOM and storage shortcuts (used by the interface files)
const $ = id => document.getElementById(id);
const store = {
  get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
  del: k => { try { localStorage.removeItem(k); } catch (e) {} }
};