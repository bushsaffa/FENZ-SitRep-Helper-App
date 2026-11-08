/* vocab.js: location finder, speech segmenting and the word lists used by extract() */

// ---------- Location finder (street name, number optional) ----------
const LOC_SUFFIX = 'road|rd|street|st|lane|ln|drive|dr|avenue|ave|place|crescent|terrace|highway|hwy';
const LOC_STOP = new Set(('a an the at on in up down along off to from of near by onto into via and we were was it its is are our my this that fire grass scrub car crash accident shed house bloke fella he she they there here out over past just got have has heading crew truck appliance then now with for as towards toward side other back front uh um yeah ok okay so right flat rolling steep one two three four five six seven eight nine ten').split(' '));

function findLocation(text) {
  const sh = text.match(/\b(?:state highway|sh)\s*(\d+)\b/i);
  if (sh) return { name: 'State Highway ' + sh[1], span: sh[0] };
  const re = new RegExp('\\b(?:' + LOC_SUFFIX + ')\\b', 'gi');
  let m;
  while ((m = re.exec(text))) {
    const toks = [...text.slice(0, m.index).matchAll(/[A-Za-z0-9'’]+|[.,;!?]/g)];
    let start = -1, n = 0;
    for (let i = toks.length - 1; i >= 0 && n < 3; i--) {
      const w = toks[i][0], lw = w.toLowerCase().replace(/’/g, "'");
      if (/^\d+[a-z]?$/i.test(w)) {
        if (n && !/^(by|x)$/i.test((toks[i - 1] || [''])[0])) start = toks[i].index;
        break;
      }
      if (/^[.,;!?]$/.test(w) || LOC_STOP.has(lw) || /'(?:s|ll|re|ve|m|d)$/.test(lw)) break;
      start = toks[i].index; n++;
    }
    if (start >= 0) {
      const span = text.slice(start, m.index + m[0].length);
      return { name: title(span.replace(/\s+/g, ' ')), span };
    }
  }
  return null;
}

// ---------- Split continuous speech into statements ----------
// Speech recognition rarely adds punctuation, so we also split where a new topic starts.
const MARK = [
  "we(?:'re|'ve|'ll)?", "i(?:'m|'ve)?", "it(?:'s)?", "there(?:'s)?", "that(?:'s)?",
  'fire (?:is|has|behaviou?r|status|size|remains|looks)',
  'winds? (?:from|is|are|speed|direction|has|gusting|change)',
  'crew (?:is|are|of|has|status|position|safety)',
  'access', 'only way in', 'hazards?', 'ambulance (?:is|en route|on scene|requested)',
  'need', 'needs', 'requesting', 'request', 'requiring', 'require', 'send',
  'smoke (?:is|drifting|over|coming|issuing|showing)',
  "everyone(?:'s)?", "everybody(?:'s)?", 'patients?',
  'no (?:hazards?|threat|spot|further|additional|safety|suppression|control)',
  "(?:the )?fire's",
  'crew and equipment'
];
function segment(t) {
  const re = new RegExp('\\s+(?=(?:' + MARK.join('|') + ')\\b)', 'gi');
  return t.split(/[.!?;]+/).flatMap(p => p.split(re)).map(s => s.trim()).filter(Boolean);
}

// ---------- Vocabularies ----------
const HAZ = [
  [/\bsmoke\s+(?:is\s+)?(?:drifting|blowing|across|over|affecting|reducing|obscuring)\b|\bsmoke hazard\b|\b(?:poor|reduced) visibility\b/i, 'smoke'],
  [/\bdowned\s+(?:power\s*lines?|lines|wires?)\b|\bpower\s*lines?\s+down\b/i, 'downed power lines'],
  [/\b(?:overhead\s+(?:power\s+)?lines?|power\s*lines?|powerlines)\b/i, 'overhead lines'],
  [/\bgas\s+(?:bottles?|cylinders?|leak|supply)\b/i, null],
  [/\bfuel\s+(?:leak(?:age|ing)?|spill(?:age|s)?)\b/i, 'fuel leakage'],
  [/\broof(?:\s?space)?\s+collaps\w*\b|\bcollapse of the roof\b/i, 'potential roof collapse'],
  [/\b(?:structural|building|wall|floor)\s+(?:collapse|instability)\b|\bstructurally unstable\b/i, 'structural instability'],
  [/\bunstable (?:vehicle|car)\b|\bvehicle (?:is )?unstable\b|\bvehicle instability\b/i, 'vehicle instability'],
  [/\b(?:undeployed|live|unexploded)\s+airbags?\b/i, 'undeployed airbags'],
  [/\btraffic\s+(?:hazard|risk|concern)s?\b|\bbusy road\b/i, 'traffic'],
  [/\blive\s+(?:wires?|electrical)\b|\belectrical hazards?\b/i, 'electrical hazard'],
  [/\bhazardous\s+(?:materials?|substances?)\b|\basbestos\b|\bchemicals?\b/i, null],
  [/\bwind change\b|\bchange in (?:the )?wind\b/i, 'wind change'],
  [/\b(?:gusty|gusting)\s+winds?\b|\bwinds?\s+(?:is\s+|are\s+)?gusting\b/i, 'gusting wind']
];
const VP = [
  [/\boff the (?:road|roadway)\b/i, 'off the roadway'],
  [/\bon (?:its|their) side\b/i, 'resting on its side'],
  [/\bon (?:its|their) roof\b/i, 'resting on its roof'],
  [/\brolled\b/i, 'rolled'],
  [/\bin (?:a|the) ditch\b/i, 'in a ditch'],
  [/\bblocking (?:the )?(?:road|lane|both lanes)\b/i, 'blocking the road']
];
const CPR = /\bcpr\b|\bcompressions\b/i;
const FRT = /\bfirst response treatment\b|\bpatient care\b|\bfirst aid\b|\btreating\b/i;
const ACT = {
  structure: [
    [/\b(?:fire attack|attacking|knocking (?:it |the fire )?down)\b/i, 'fire attack'],
    [/\bexposure protection\b|\bprotecting (?:the )?(?:exposures?|neighbou?rs?|adjacent|neighbouring)\b/i, 'exposure protection'],
    [/\bsearch(?:ing)?\b/i, 'search operations'],
    [/\bventilat\w*/i, 'ventilation']
  ],
  mva: [
    [/\bstabili[sz]\w*/i, 'vehicle stabilisation'],
    [/\bprepar\w*\s+(?:for\s+)?extricat\w*|\bpreparing to extricate\b/i, 'extrication preparation'],
    [/\bextricating\b|\bcutting\s+(?:\w+\s+){0,3}?out\b/i, 'extrication'],
    [FRT, 'first response treatment'],
    [CPR, 'CPR'],
    [/\btraffic (?:management|control)\b|\b(?:managing|controlling) traffic\b/i, 'traffic management']
  ],
  medical: [
    [FRT, 'first response treatment'],
    [CPR, 'CPR']
  ]
};
const EQ = {
  vegetation: 'high[\\s-]?pressure\\s+lines?|hose\\s?lines?|hoses?|hose reels?|knapsacks?|backpack pumps?|hand tools?|pumps?|tankers?|blowers?|dozers?|rakes?|beaters?|drip torch(?:es)?',
  structure: 'breathing apparatus|ba sets?|thermal imaging cameras?|ladders?|hose\\s?lines?|hoses?|positive pressure (?:fans?|ventilation)|ventilation fans?',
  mva: 'hydraulic (?:rescue )?tools?|cutters?|spreaders?|rams?|stabili[sz]ation struts?|struts?|chocks?|rescue tools?',
  medical: ''
};
const RESKW = /\b(?:appliances?|tankers?|units?|helicopters?|helis?|ambulances?|police|rescue|crews?|brigades?|diggers?|dozers?|machinery|aerial|investigators?|support|backup|water|trucks?|pumps?|vehicles?|personnel|resources?|medics?|coastguard|power company|lines company|ladders?|tow|hazmat|command|supervisor|officer|strike team|standby|stand-by|defibs?|defibrillators?|aeds?)\b/i;
const STRTYPES = [
  [/\b(?:house|home|dwelling|residential)\b/i, 'residential dwelling'],
  [/\b(?:apartments?|flats)\b/i, 'apartment'],
  [/\b(?:shop|restaurant|office|commercial|business|supermarket)\b/i, 'commercial building'],
  [/\b(?:warehouse|factory|industrial)\b/i, 'industrial building'],
  [/\bshed\b/i, 'shed'],
  [/\bgarage\b/i, 'garage'],
  [/\bbarn\b/i, 'barn']
];
const DIRONLY = new RegExp('^(?:' + DIR + ')(?:ern|erly)?(?:\\s+(?:side|boundary|flank|corner))?$', 'i');