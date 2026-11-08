/* extract.js: turns free speech into field values */

function extract(raw, type) {
  const o = {};
  const t = stripFillers(String(raw || '').replace(/[’‘]/g, "'").replace(/[“”]/g, '"'));
  if (!t) return o;
  const segs = segment(t);
  const L = re => lastMatch(t, re);
  let m;
  // Only work out the fields this incident type actually uses (heardFields discards the rest anyway)
  const want = id => idsFor(type).includes(id);
  const NIL = /^(?:none|nil|no|nothing|n\/a)$/i;   // "hazards are none" must read as "no hazards", not as a hazard called "none"

  const loc = findLocation(t);
  if (loc) o.location = loc.name;
  // Remove the street name so words inside it ("Alford Forest road") don't trigger fuel, landmark etc.
  const rest = loc ? t.replace(loc.span, ' ') : t;
  const R = re => lastMatch(rest, re);

  // Role
  if ((m = L(/\b(crew leader|officer in charge|sector supervisor|incident controller)\b/gi))) o.role = m[1].toLowerCase();

  // Dimensions (fire for vegetation, building for structure)
  // "100 by 50", "100 x 50" and "100x50". There is no word boundary around the x in "100x50", so N can't be used here:
  // a boundary is accepted after the first number OR straight before an x or m/metres unit, and the second number may carry a unit too.
  if ((m = R(new RegExp('\\b(' + NP + ')(?:\\b|(?=[x×]|m\\b|metres?\\b|meters?\\b))\\s*(?:m|metres?|meters?)?\\s*(?:by|x|×)\\s*(' + NP + ')(?:\\s*(?:m|metres?|meters?)\\b|\\b)', 'gi')))) {
    const a = String(toNum(m[1])), b = String(toNum(m[2]));
    if (type === 'structure') { o.blength = a; o.bwidth = b; } else { o.length = a; o.width = b; }
  }
  if (want('area')) {
    if ((m = R(new RegExp('(' + N + ')\\s*(?:hectares?|ha)\\b', 'gi')))) o.area = String(toNum(m[1]));
    if (/\bhalf an? (?:hectare|ha)\b/i.test(rest)) o.area = '0.5';
  }

  // Distance and landmark
  const LMK = '((?:[A-Za-z\'-]+\\s+){0,3}?[A-Za-z\'-]+)(?=\\s+(?:and|with|wind|winds|we|it|the|crew|fire|about|approximately|currently|there|looking|i|grass|scrub|gorse|flat|rolling|steep|spreading|burning|heading|uncontained|contained|not|under|is|are|has|in|on|at|from|to|car|cars|truck|trucks|ute|utes|van|vans|bus|bike|motorbike|motorcycle|vehicle|vehicles|trailer|tractor)\\b|\\s+\\d|\\s+(?:' + NUMW + '|' + TENS + ')\\b|[.;,]|$)';
  if (want('landmark')) {
    if ((m = R(new RegExp('(' + N + ')\\s*(km|kilometres?|kilometers?|metres?|meters?)\\s*(' + DIR + ')\\s*(?:of|from)\\s*(?:the\\s+)?' + LMK, 'gi')))) {
      o.dist = toNum(m[1]) + ' ' + (/^k/i.test(m[2]) ? 'kilometres' : 'metres') + ' ' + nd(m[3]);
      o.landmark = title(m[4].trim());
    } else if ((m = R(new RegExp('\\b(?:near|next to|beside|opposite|behind|adjacent to)\\s+(?:the\\s+)?' + LMK, 'gi')))) {
      o.landmark = title(m[1].trim());
    }
  }

  if (type === 'vegetation') {
    // Fuel and terrain
    const fuels = [];
    if (/\b(?:grass|grassland|pasture|tussock)\b/i.test(rest)) fuels.push('grass');
    if (/\b(?:scrub|gorse|manuka|kanuka|broom)\b/i.test(rest)) fuels.push('scrub');
    if (/\b(?:forestry|forest|pine|pines|plantation|radiata)\b/i.test(rest)) fuels.push('forestry');
    if (/\b(?:hedge|hedges|hedgerow|hedgerows)\b/i.test(rest)) fuels.push('hedge');
    if (fuels.length) o.fuel = fuels.join(', ');
    if ((m = R(/\b(flat|rolling|steep)\b/gi))) o.terrain = m[1].toLowerCase();

    // Fire behaviour, rate of spread, flame height
    if ((m = R(/\b(low|moderate|high|extreme)\s+(?:fire\s+)?behaviou?r\b/gi) || R(/\bbehaviou?r\s+(?:is\s+|of\s+)?(?:currently\s+)?(low|moderate|high|extreme)\b/gi))) o.behav = m[1].toLowerCase();
    if ((m = R(/\b(?:rate of spread|spreading|spread)\s+(?:is\s+|of\s+)?(slowly|slow|moderately|moderate|rapidly|rapid|quickly|quick|fast)\b/gi) || R(/\b(slow|moderate|rapid|fast|quick)\s+(?:rate of )?spread\b/gi))) {
      const w = m[1].toLowerCase();
      o.ros = w.startsWith('slow') ? 'slow' : w.startsWith('moderate') ? 'moderate' : 'rapid';
    }
    if ((m = R(new RegExp('\\bflames?(?:\\s+height)?\\s+(?:is\\s+|are\\s+|of\\s+|up to\\s+|about\\s+|approximately\\s+)*(' + N + ')\\s*(?:m|metres?|meters?)\\b', 'gi'))
          || R(new RegExp('(' + N + ')\\s*(?:m|metre|meter)s?\\s+(?:high\\s+)?flames\\b', 'gi')))) o.flameh = String(toNum(m[1]));

    // Wind. The gap between "wind" and "from" must not contain the crew ("wind is light, crew working from the west flank").
    m = /\bwinds?\b/i.test(t) ? R(new RegExp('\\b(?:sorry|correction|i mean|make that|actually)\\s*,?\\s*(?:it\'s\\s+)?(?:from\\s+)?(?:the\\s+)?(' + DIR + ')(?:erly|ern|er)?\\b', 'gi')) : null;
    m = m || R(new RegExp('\\bwinds?\\b(?:(?!\\b(?:crew|crews|we|i)\\b)[^.;]){0,45}?\\bfrom\\s+(?:the\\s+)?(' + DIR + ')(?:erly|ern|er)?\\b', 'gi'))
      || R(new RegExp('\\b(' + DIR + ')(?:erly|ern|er)?\\s+winds?\\b', 'gi'))
      || R(new RegExp('\\bwinds?\\s+(?:is\\s+|are\\s+)?(' + DIR + ')(?:erly|ern|er)?\\b', 'gi'));
    if (m) o.winddir = nd(m[1]);
    // Wind speed is reported in km/h: "25km/h", "25 kph", "25 kilometres per hour". (No word boundary before the unit: "25km/h" has none.)
    if ((m = L(new RegExp('\\b(' + NP + ')\\s*(?:km\\s*/\\s*h(?:r|our)?|kmh|kph|k\\s*/\\s*h|(?:km|kilomet(?:re|er)s?)\\s*(?:per|an|a)\\s*hour)(?![a-z])', 'gi')))) o.windspeed = String(toNum(m[1]));

    // Local weather factors: humidity and temperature ("low humidity", "high temperatures", "humidity is low")
    const lw = [], addLw = x => { if (!lw.includes(x)) lw.push(x); };
    const noun = w => /^humid/i.test(w) ? 'humidity' : /s$/i.test(w) ? 'temperatures' : 'temperature';
    for (const mm of t.matchAll(/\b(?:(very|extremely)\s+)?(low|high)\s+(?:relative\s+)?(humidity|temperatures?|temps?)\b/gi)) addLw((mm[1] ? mm[1].toLowerCase() + ' ' : '') + mm[2].toLowerCase() + ' ' + noun(mm[3]));
    for (const mm of t.matchAll(/\b(?:relative\s+)?(humidity|temperatures?|temps?)\s+(?:is\s+|are\s+|of\s+)?(?:(very|extremely)\s+)?(low|high)\b/gi)) addLw((mm[2] ? mm[2].toLowerCase() + ' ' : '') + mm[3].toLowerCase() + ' ' + noun(mm[1]));
    if (lw.length) o.local = lw.join(', ');

    // Control and containment are two separate things, and either may be said alone:
    // "uncontrolled but contained", "controlled and uncontained", "not controlled or contained"...
    const NOT = "(?:not|isn'?t|hasn'?t|haven'?t|wasn'?t|never)\\s+(?:(?:yet|fully|been|being|properly)\\s+)*", CTRL = '(?:controlled|under control)';
    if (new RegExp('\\b(?:uncontrolled|out of control|getting away|escalating|no longer ' + CTRL + '|' + NOT + '(?:contained\\s+(?:or|nor)\\s+)?' + CTRL + ')\\b', 'i').test(t)) o.status = 'not under control';
    else if (new RegExp('\\b' + CTRL + '\\b', 'i').test(t)) o.status = 'under control';
    if (new RegExp('\\b(?:uncontained|un-contained|no longer contained|' + NOT + '(?:' + CTRL + '\\s+(?:or|nor)\\s+)?contained)\\b', 'i').test(t)) o.contain = 'not contained';
    else if (/\bcontained\b/i.test(t)) o.contain = 'contained';

    // Spot fires
    if ((m = L(new RegExp('\\b(\\d+|no|nil|zero|a|an|' + NUMW + ')\\s+spot\\s*fires?\\b', 'gi')))) {
      const w = m[1].toLowerCase();
      o.spots = /^(?:no|nil|zero)$/.test(w) ? 'no' : /^an?$/.test(w) ? '1' : w;
    } else if (/\bno spotting\b/i.test(t)) o.spots = 'no';
  }

  // Crew numbers
  m = L(new RegExp('\\bcrew\\s+of\\s+(' + COUNT + ')\\b', 'gi'))
    || L(new RegExp('\\b(' + COUNT + ')\\s+of us\\b', 'gi'))
    || L(new RegExp('\\b(' + COUNT + ')\\s+(?:personnel|firefighters|crew members?)\\b', 'gi'))
    || L(new RegExp('\\b(' + COUNT + ')\\s+(?:guys|blokes|boys)\\b(?!\\s+(?:trapped|entrapped|injured|hurt|inside|in))', 'gi'));
  if (m) o.personnel = m[1].toLowerCase();

  // Equipment (vocabulary depends on incident type)
  if (EQ[type]) {
    const one = '(?:\\w+\\s+){0,2}?(?:' + EQ[type] + ')';
    const re = new RegExp('\\b(?:with|using|utili[sz]ing|deploying|running|operating|got|have|has)\\s+(' + one + '(?:(?:\\s*,\\s*|\\s+and\\s+)' + one + ')*)\\b', 'gi');
    const found = [];
    for (const mm of rest.matchAll(re)) splitItems(mm[1]).forEach(x => { if (!found.includes(x.toLowerCase())) found.push(x.toLowerCase()); });
    const eqf = type === 'structure' ? found.filter(x => !/hose/.test(x)) : found;
    if (eqf.length) o.equipment = eqf.join(', ');
  }

  // Hazards: vocabulary on the whole text, plus explicit "hazards include ..." statements
  const hz = [];
  HAZ.forEach(([re, lab]) => {
    const mm = t.match(re);
    if (mm && !/\b(?:no|not|without|nil)\s+(?:\w+\s+)?$/i.test(t.slice(Math.max(0, mm.index - 14), mm.index))) hz.push(lab || mm[0].toLowerCase());
  });

  // Statement-level fields
  const resList = [];
  let resNil = false;
  // "Hay shed in possible danger", "the house is at risk", "the barn could be threatened": the thing at risk comes first
  const AT_RISK = /([^,;]+?)\s+(?:(?:is|are|could be|may be|might be|looks to be|appears to be)\s+)?(?:in|at|under)\s+(?:(?:possible|potential|immediate|imminent|serious|some|significant|great|real|direct|any|further)\s+)*(?:danger|risk|threat|jeopardy)\b/i;
  const THREATENED = /([^,;]+?)\s+(?:is|are|could be|may be|might be)\s+(?:being\s+|possibly\s+|potentially\s+)?(?:threatened|endangered)\b/i;
  const NEG_RISK = /\b(?:no|not|nil|without|never)\b[^.;]{0,15}\b(?:danger|risk|threat)/i;   // "no danger to the house" must not become a threat
  const CREW_MOVING = /\b(?:we|i|crews?|appliances?|trucks?|units?|ambulance|police)(?:'re|'m|'ve)?\b[^.;]{0,20}\b(?:heading|moving|running|approaching|advancing)\b/i;
  // "No additional resources", "nothing further required" count; "no further hazards" does not
  const NO_RES = /\b(?:no|nil|nothing)\s+(?:(?:additional|further|more|other)\s+)?(?:resources?|appliances?|units?|crews?|help|assistance|support|backup)\b|\b(?:no|nothing)\s+(?:additional|further|more|else)\s+(?:is\s+)?(?:needed|required|necessary)\b/i;
  for (const s of segs) {
    // Values at risk / exposures
    if (/\bno (?:immediate )?(?:threats?|values at risk|exposures?)\b/i.test(s)) o.threat = 'nil';
    else {
      m = s.match(/\b(?:spreading|heading|moving|running|burning|advancing|approaching)\s+(?:quickly\s+|slowly\s+)?(?:towards?|to|into)\s+(.+)$/i)
        || s.match(/\b(?:threatening|threat to|risk to|danger to|endangering|exposing)\s+(.+)$/i);
      let v = null;
      // "we're heading to the fire" is the crew moving, not the fire threatening something
      if (m && !CREW_MOVING.test(s) && !NEG_RISK.test(s)) v = clean(m[1].split(/\s*,\s*(?=(?:spot|no|we|it|the|crew|wind|fire|access|need|hazards?)\b)/i)[0]);
      else if (!NEG_RISK.test(s) && (m = s.match(AT_RISK) || s.match(THREATENED))) {
        // Drop anything said before it ("fire uncontrolled and uncontained hay shed in danger") and lower-case the capital that only came from starting a sentence
        v = clean(m[1].replace(/^.*\b(?:uncontrolled|uncontained|under control|contained|controlled)\s+(?:and\s+(?:uncontrolled|uncontained)\s+)?/i, '').replace(/^(?:and|also|plus|but|so|with)\s+/i, ''));
        v = v.charAt(0).toLowerCase() + v.slice(1);
      }
      if (v && !DIRONLY.test(v.replace(/^(?:the|a|an)\s+/i, ''))) o.threat = v;
    }
    // Access
    if ((m = s.match(/\b(?:only way in|way in|access)\s+(?:is\s+(?:only\s+)?|will be\s+)?(.+)$/i))) {
      const v = clean(m[1]);
      if (v && !/^(?:issues?|problems?)\b/i.test(v)) o.access = v;
    }
    // Control lines (vegetation)
    if ((m = s.match(/\b(?:establishing|setting up|constructing|cutting|putting in|building|forming)\s+(.+)$/i))) {
      const v = clean(m[1].replace(/\s+(?:with|using)\b.*$/i, ''));
      if (v && /(?:control|containment|anchor|fire\s?break|\bline|flank)/i.test(v)) o.control = head(v);
    }
    // Crew position
    if ((m = s.match(/\bcrew(?:'s|\s+(?:is|are))\s+(?:currently\s+)?(?:(?:positioned|located|working|based|stationed|operating|patrolling|holding|mopping\s+up)\s+)?((?:at|on|in|along)\s+.+)$/i))
      || (m = s.match(/\bwe(?:'re| are)\s+(?:currently\s+)?(?:positioned\s+)?(on the [a-z\s]*?(?:flank|head|heel|edge|corner|boundary|fence\s?line|side))\b/i))) o.crewpos = head(clean(m[1]));
    // Hazards listed explicitly
    if ((m = s.match(/\bhazards?\s+(?:include|includes|are|is|being)\s+(.+)$/i))) splitItems(clean(m[1])).filter(x => !NIL.test(x)).forEach(x => { const h = HAZ.find(([re]) => re.test(x)); hz.push(h ? (h[1] || x.toLowerCase()) : x.toLowerCase()); });
    // Resources
    if (NO_RES.test(s)) resNil = true;
    if ((m = s.match(/\b(?:we(?:'re| are)?\s+(?:going\s+to\s+)?need|we(?:'ll| will)\s+need|need|needs|requesting|request|requiring|require|requires|send(?:\s+us)?|(?:can )?we get|get us)\s+(.+)$/i))) {
      const v = clean(m[1]);
      if (v && !/^to\b/i.test(v) && RESKW.test(v)) splitRes(v).filter(x => RESKW.test(x)).forEach(x => { if (!resList.includes(x.toLowerCase())) resList.push(x.toLowerCase()); });
    }
    // Problems
    if (/\bno suppression problems?\b/i.test(s)) o.supprob = 'nil';
    else if ((m = s.match(/\bsuppression problems?\s+(?:include|are|is)\s+(.+)$/i))) { const v = head(clean(m[1])); o.supprob = NIL.test(v) ? 'nil' : v; }
    if (/\bno control problems?\b/i.test(s)) o.ctrlprob = 'nil';
    else if ((m = s.match(/\bcontrol problems?\s+(?:include|are|is)\s+(.+)$/i))) { const v = head(clean(m[1])); o.ctrlprob = NIL.test(v) ? 'nil' : v; }
    // Safety concerns
    if (/\bno safety concerns?\b/i.test(s)) o.safety = 'nil';
    else if ((m = s.match(/\bsafety concerns?\s+(?:include|are|is)\s+(.+)$/i))) {
      const items = splitItems(clean(m[1])).map(x => x.toLowerCase()).filter(x => !NIL.test(x));
      o.safety = items.length ? items.join(', ') : 'nil';
    }
  }
  // "Downed power lines" already covers "overhead lines"
  const hzOut = [...new Set(hz)].filter(x => !(x === 'overhead lines' && hz.includes('downed power lines')));
  if (hzOut.length) o.hazards = hzOut.join(', ');
  else if (/\bno (?:other |further |known )?hazards?\b|\bhazards? (?:are |is )?(?:nil|none)\b/i.test(t)) o.hazards = 'nil';
  if (resList.length) o.resources = resList.join(', ');
  else if (resNil) o.resources = 'nil';

  // Crew status and condition
  // The crew must be the one described as safe ("crew is safe", "we're all accounted for"),
  // so "occupant not accounted for" or "safe access route" don't count.
  // "Everyone" only means the crew on a vegetation fire; elsewhere it could be occupants or patients.
  if (/\b(?:crew(?: members)?|crews|we|all (?:crew|personnel|firefighters))(?:'re|\s+are|\s+is)?\s+(?:all\s+)?(?:currently\s+)?(?:safe|accounted for)\b/i.test(t)
      || (type === 'vegetation' && /\b(?:everyone|everybody)(?:'s| is| are)?\s+(?:safe|accounted for|okay|ok|fine|all good)\b/i.test(t))
      || /\b(?:all of us|we(?:'re| are) all)\s+(?:are\s+)?(?:safe|accounted for|okay|ok|fine)\b/i.test(t)) o.crewstatus = 'safe and accounted for';
  else if (/\bcrew safety\b[^.;]{0,20}\bmaintained\b|\bsafety (?:is )?(?:currently )?maintained\b/i.test(t)) o.crewstatus = 'safety maintained';
  const cc = [];
  if (/\b(?:crew|crews|equipment|everything)\s+(?:and\s+equipment\s+)?(?:is\s+|are\s+)?(?:in\s+)?(?:good|great)(?:\s+(?:condition|shape|order))?\b/i.test(t)) cc.push('good');
  if (/\b(?:fatigued|tired|exhausted)\b/i.test(t)) cc.push('fatigued');
  if (/\blow on water\b|\bshort of water\b/i.test(t)) cc.push('low on water');
  if (/\blow on fuel\b/i.test(t)) cc.push('low on fuel');
  if (cc.length) o.crewcond = cc.join(', ');

  // ----- Structure -----
  if (type === 'structure') {
  if ((m = L(/\b(single|one|two|double|three|\d)[\s-]*(?:storey|story|level)\b/gi))) {
    const w = m[1].toLowerCase();
    o.floors = /^(?:single|one|1)$/.test(w) ? 'single-storey' : /^(?:two|double|2)$/.test(w) ? 'two-storey' : /^(?:three|3)$/.test(w) ? 'three-storey' : numw(w) + '-storey';
  }
  let best = null;
  for (const [re, lab] of STRTYPES) { const mm = rest.match(re); if (mm && (!best || mm.index < best.i)) best = { i: mm.index, lab }; }
  if (best) o.strtype = best.lab;
  if ((m = L(/\b(fully involved|well involved|smoke showing|flames showing|visible flames|heavy smoke|fire showing)\b/gi))) {
    const w = m[1].toLowerCase();
    o.strcond = w === 'visible flames' || w === 'fire showing' ? 'flames showing' : w === 'heavy smoke' ? 'smoke showing' : w;
  }
  const PART = '(?:roof\\s?space|roof|windows?|eaves|vents?|doors?|chimney|walls?|front|rear|back|side|garage|building)';
  const smokeRe = new RegExp('smoke\\s+(?:is\\s+)?(?:issuing|coming|pouring|venting|showing)\\s+from\\s+(?:the\\s+)?(' + PART + '(?:(?:\\s*,\\s*|\\s+and\\s+)(?:the\\s+)?' + PART + ')*)\\b', 'gi');
  if ((m = L(smokeRe))) o.smokefrom = m[1].trim();
  const noSmoke = t.replace(smokeRe, ' ');
  { const fl = [...new Set([...noSmoke.matchAll(/\b(?:in|on|from|at)\s+the\s+((?:ground|first|second|top|upper|lower)\s+floor|roof\s?space|roof|attic|kitchen|bedroom|lounge|garage|basement|front|rear|back|side|eaves)\b/gi)].map(x => x[1].toLowerCase()))]; if (fl.length) o.flocation = fl.join(' and '); }
  if (/\bcontained to (?:the )?(?:room|compartment)\b/i.test(t)) o.spread = 'contained to room of origin';
  else if (/\bspreading through\b/i.test(t)) o.spread = 'spreading through the structure';
  else if (/\binvolving the roof\b/i.test(t)) o.spread = 'involving the roof';
  if ((m = L(/\b(offensive|defensive)\b/gi))) o.mode = m[1].toLowerCase();
  if ((m = L(new RegExp('\\b(' + COUNT + ')\\s+(?:hose\\s?lines?|hoses|jets?|branches)\\b', 'gi')))) o.hoselines = m[1].toLowerCase();

  // Occupants (structure)
  if (/\b(?:no occupants|nobody (?:is )?inside|no one (?:is )?inside|building (?:is )?empty|unoccupied)\b/i.test(t)) o.occupants = 'nil';
  else if (/\b(?:persons?|people|occupants?|residents?|someone|somebody)\b[^.;]{0,30}\b(?:missing|unaccounted|not (?:yet )?(?:all )?accounted for|still (?:inside|in the)|reported inside|trapped inside|possibly inside)\b/i.test(t)) o.occupants = 'persons reported missing';
  else if (/\b(?:occupants?|residents?|people|persons?)\b[^.;]{0,30}\b(?:being evacuated|evacuating)\b/i.test(t)) o.occupants = 'occupants being evacuated';
  // (No lookbehind here: Safari before 16.4 can't even parse one. Capture an optional "not" and reject the match instead.)
  else if (/\beveryone(?:'s| is)? out\b/i.test(t)
        || ((m = t.match(/\b(?:all\s+)?(?:occupants?|residents?|people|persons?)\b[^.;]{0,30}?\b(not\s+)?(?:accounted for|are out|is out|evacuated|safe)\b/i)) && !m[1])) o.occupants = 'all persons accounted for';
  }

  // ----- MVA / medical -----
  if (type === 'mva') {
    const VN = 'vehicles?|cars?|bikes?|trucks?|utes?|vans?|sedans?|suvs?|hatchbacks?|wagons?|buses|bus|motorbikes?|motorcycles?|trailers?|tractors?';
    // Our own appliances ("we have two trucks on scene") are not vehicles involved in the crash
    const tv = t.replace(/\b(?:we(?:'ve| have)(?: got)?|we(?:'re| are) (?:with|using)|our|crews? (?:has|have)|brigade has)\s+(?:\w+\s+){0,2}?(?:fire\s+)?(?:trucks?|appliances?|tankers?|pumps?)\b/gi, ' ');
    const num = tv.match(new RegExp('\\b(two|three|four|five|\\d+|one|single)\\s+(?:\\w+\\s+)?(?:' + VN + ')\\b', 'i'));
    const versus = new RegExp('\\b(?:' + VN + ')\\s+(?:versus|vs|v)\\s+(?:(?:a|an|the)\\s+)?(?:\\w+\\s+)?(?:' + VN + ')\\b', 'i').test(tv);
    if (num) { const w = num[1].toLowerCase(); o.vehicles = w === 'single' ? '1' : w; }
    else if (versus) o.vehicles = '2';
    else {
      const kinds = new Set([...tv.matchAll(new RegExp('\\b(?:a|an)\\s+(?:\\w+\\s+)?(' + VN + ')\\b', 'gi'))].map(x => x[1].toLowerCase().replace(/s$/, '')));
      if (kinds.size) o.vehicles = String(kinds.size);
    }
  }
  const vp = []; VP.forEach(([re, lab]) => { if (re.test(t)) vp.push(lab); });
  if (vp.length) o.vehpos = vp.join(', ');
  if (/roof|side/.test(o.vehpos || '') && /\brolled\b/.test(o.vehpos)) o.vehpos = o.vehpos.replace(/,?\s*rolled\b/, '').replace(/^,\s*/, '');
  if ((m = L(new RegExp('\\b(' + COUNT + ')\\s+(?:occupants?|people|persons?)\\b(?!\\s+(?:are\\s+|is\\s+)?(?:trapped|entrapped|injured|hurt))', 'gi')))) o.occcount = m[1].toLowerCase();

  // Number of patients (the details of each patient are read by extractPatients)
  if (/\bno (?:patients|casualties|injuries|injured)\b/i.test(t)) o.patients = 'nil';
  else if ((m = L(new RegExp('\\b(' + COUNT + '|a|an|single)\\s+(?:(?:people|persons|guys|blokes)\\s+)?(?:patients?|casualt(?:y|ies)|injured|hurt)\\b', 'gi')))) {
    const w = m[1].toLowerCase(); o.patients = /^(?:a|an|single)$/.test(w) ? '1' : w;
  }
  if ((m = L(/\bambulance\s+(?:is\s+|has\s+)?(?:been\s+)?(on scene|en route|enroute|on route|on the way|coming|responding|requested|arrived|here)\b/gi))) {
    const w = m[1].toLowerCase();
    o.ambulance = /^(?:on scene|arrived|here)$/.test(w) ? 'on scene' : w === 'requested' ? 'requested' : 'en route';
  }
  if (!o.patients && type === 'medical' && /\b(?:bloke|fella|fellow|guy|man|woman|lady|girl|boy|baby|toddler|teenager|child|kid|someone|somebody|patient|person|elderly)\b/i.test(t)) o.patients = '1';

  // Crew actions by incident type
  if (ACT[type]) {
    const acts = []; ACT[type].forEach(([re, lab]) => { if (re.test(t) && !acts.includes(lab)) acts.push(lab); });
    if (acts.length) o.actions = acts.join(', ');
  }

  // Each patient's own status, condition, injuries
  if (TYPES[type].pat) o._patients = extractPatients(t);
  const CNT = new RegExp('^(?:\\d+|' + ONES + ')$', 'i');
  ['personnel', 'vehicles', 'occcount', 'patients', 'hoselines', 'spots'].forEach(k => {
    if (o[k] && CNT.test(o[k])) o[k] = String(toNum(o[k]));
  });
  return o;
}