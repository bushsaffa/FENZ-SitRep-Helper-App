/* script-builder.js: one template per incident, only says what it was told.
   Output is one short radio call in the FENZ style:
   "FireCom – <callsign> – <role> – <key points, comma separated>. <Needs>." */

const PSTAT = {
  'status zero': 'Status Zero, deceased', 'status one': 'Status One, critical', 'status two': 'Status Two, serious',
  'status three': 'Status Three, moderate', 'status four': 'Status Four, minor'
};
// How a crew action is said on the radio. Anything not listed is said as "undertaking <action>".
const ACTTXT = {
  'cpr': 'CPR in progress',
  'first response treatment': 'providing first response treatment',
  'traffic management': 'traffic control',
  'lift assist': 'assisting ambulance with lift'
};

function buildScript(type, g, pats) {
  const v = id => (g(id) || '').trim();
  const nl = id => v(id).toLowerCase() === 'nil';
  const has = id => !!v(id);
  const its = id => splitItems(v(id)).filter(x => x.toLowerCase() !== 'nil');
  const lst = id => joinList(its(id).map(fmt));
  const cs = v('callsign') || '[callsign]';
  const main = [], extra = [];
  const put = s => { if (s) main.push(s); };                       // a key point, joined with commas
  const say = s => { if (s) extra.push(cap(s) + '.'); };           // a sentence of its own
  const prep = s => /^(?:at|on|in|along|near|by|behind|ahead|within|adjacent|beside|above|below|across)\b/i.test(s) ? s : 'at ' + s;
  const loc = v('location');

  // Shared key points
  const wherePart = () => put(loc ? 'at ' + loc : '');
  const hazardsPart = () => nl('hazards') ? 'no hazards' : has('hazards') ? 'hazards include ' + lst('hazards') : '';
  const probPart = (id, what) => nl(id) ? 'no ' + what + ' problems' : has(id) ? what + ' problems include ' + fmt(v(id)) : '';
  const exposurePart = () => nl('threat') ? 'no exposures at risk' : has('threat') ? 'exposures at risk include ' + lst('threat') : '';
  const posPart = () => has('crewpos') ? 'crew positioned ' + prep(v('crewpos')) : '';
  // "crew of four using high pressure delivery"
  const equipPart = () => {
    const c = has('personnel') ? 'crew of ' + numw(v('personnel')) : '', e = lst('equipment');
    return c && e ? c + ' using ' + e : e ? 'using ' + e : c;
  };
  const tail = () => {
    put(hazardsPart());
    put(probPart('supprob', 'suppression'));
    put(probPart('ctrlprob', 'control'));
    put(has('crewcond') ? 'crew and equipment condition is ' + lst('crewcond') : '');
    put(nl('safety') ? 'no safety concerns' : has('safety') ? 'safety concerns include ' + lst('safety') : '');
    const s = v('crewstatus').toLowerCase();
    put(!s ? '' : s === 'safety maintained' ? 'crew safety maintained' : 'crew is ' + s);
    // Needs go last, as their own sentence
    say(nl('resources') ? 'No additional resources required' : has('resources') ? 'Requesting ' + lst('resources') : '');
  };
  // Each patient is reported separately, with their own status, condition and injuries
  const patientParts = () => {
    if (nl('patients')) { put('no patients'); return; }
    const info = p => [
      p.desc,
      p.status && (PSTAT[p.status.toLowerCase()] || cap(p.status)),
      p.cond && joinList(splitItems(p.cond)),
      p.inj && 'suspected ' + p.inj,
      p.trapped && (p.trapped === 'trapped' ? 'currently trapped' : 'not trapped')
    ].filter(Boolean);
    if (!pats || !pats.length) return;
    if (pats.length === 1) { const a = info(pats[0]); put('one patient' + (a.length ? ', ' + a.join(', ') : '')); return; }
    put(numw(String(pats.length)) + ' patients');
    pats.forEach((p, i) => { const a = info(p); if (a.length) say('Patient ' + numw(String(i + 1)) + ', ' + a.join(', ')); });
  };
  const actionParts = () => {
    const mapped = [], rest = [];
    its('actions').forEach(x => { const k = x.toLowerCase(); if (ACTTXT[k]) mapped.push(ACTTXT[k]); else rest.push(x); });
    mapped.forEach(put);
    if (rest.length) put('undertaking ' + joinList(rest));
  };
  // Ambulance and police: "police and ambulance on scene" when they agree
  const servicesParts = () => {
    const a = v('ambulance').toLowerCase(), p = v('police').toLowerCase();
    if (a && p && a === p) { put('police and ambulance ' + a); return; }
    if (p) put('police ' + p);
    if (a) put('ambulance ' + a);
  };

  const role = v('role') ? title(v('role')) : '';

  if (type === 'vegetation') {
    // Fire: fuel and size ("fire in forestry 50x50m")
    const Le = v('length'), W = v('width'), area = v('area'), fuel = lst('fuel'), terr = v('terrain');
    let base = fuel ? 'fire in ' + fuel : 'vegetation fire';
    if (Le && W) base += ' ' + Le + 'x' + W + 'm' + (area ? ', ' + area + ' hectares' : '');
    else if (area) base += ', approximately ' + area + ' hectares';
    put(base);
    wherePart();
    // A distance with no landmark is kept, with a visible placeholder (like [callsign]) so it can't go out half-said
    const dist = v('dist'), lmk = v('landmark');
    put(lmk ? (dist ? 'approximately ' + dist + ' from ' + lmk : 'near ' + lmk) : dist ? 'approximately ' + dist + ' from [landmark]' : '');
    put(has('mapref') ? 'map reference ' + v('mapref') : '');
    put(terr ? terr + ' terrain' : '');
    const acc = v('access');
    put(acc ? 'access ' + (/^(?:via|by|on|from|through|along|off|across)\b/i.test(acc) ? '' : 'via ') + acc : '');

    // Fire behaviour and wind
    const wd = v('winddir'), ws = v('windspeed'), beh = v('behav');
    put(beh ? (beh.toLowerCase() === 'crowning' ? 'currently crowning' : beh + ' fire behaviour') : '');
    const wnum = /^\d+(?:\.\d+)?$/.test(ws);
    let wind = '';
    if (ws && !wnum) wind = ws + ' wind' + (wd && !/^(?:nil|calm)$/i.test(ws) ? ' from the ' + wd : '');
    else if (wd) wind = 'wind from the ' + wd + (ws ? ' at approximately ' + ws + ' km/h' : '');
    else if (ws) wind = 'wind speed approximately ' + ws + ' km/h';
    put(wind);
    put(has('ros') ? 'rate of spread is ' + v('ros') : '');
    put(has('flameh') ? 'flame height approximately ' + v('flameh') + ' metres' : '');
    put(has('local') ? 'local conditions include ' + lst('local') : '');

    // Control and containment are separate: "not under control but contained", "under control and contained",
    // "not under control and not contained"... "but" when one is good news and the other is not, "and" when they agree.
    const sp = v('spots').toLowerCase(), ctl = v('status').toLowerCase(), con = v('contain').toLowerCase();
    const spot = sp ? ((sp === 'no' || sp === 'nil') ? 'no spot fires' : numw(sp) + ' spot fire' + pl(sp)) + ' observed' : '';
    const bad = x => /^not\b/.test(x);
    const state = ctl && con ? ctl + (bad(ctl) === bad(con) ? ' and ' : ' but ') + con : ctl || con;
    put(state ? 'fire is ' + state : '');
    put(spot);

    put(exposurePart());
    put(equipPart());
    put(posPart());
    put(has('control') ? 'establishing ' + lst('control') + ' and working to contain the fire' : '');
    tail();
  }

  else if (type === 'structure') {
    // HAULET: Height, Area, Used as, Location of fire, Equipment, Tactical mode
    const bld = [v('floors'), v('strtype')].filter(Boolean).join(' ');
    put('structure fire' + (bld ? ' involving ' + an(bld) : ''));
    wherePart();
    const c = v('strcond').toLowerCase();
    put(c);
    put(has('flocation') ? 'fire in ' + v('flocation') : '');
    put(has('smokefrom') ? 'smoke issuing from ' + v('smokefrom') : '');
    put(has('spread') ? 'fire ' + v('spread') : '');
    put(v('blength') && v('bwidth') ? v('blength') + 'x' + v('bwidth') + 'm' : '');
    const oc = v('occupants').toLowerCase();
    put(oc === 'nil' ? 'no occupants' : oc);
    patientParts();
    put(exposurePart());
    put(has('hoselines') ? numw(v('hoselines')) + ' hose line' + pl(v('hoselines')) + ' deployed' : '');
    put(equipPart());
    actionParts();
    put(has('mode') ? v('mode').toLowerCase() + ' mode' : '');
    put(posPart());
    tail();
  }

  else if (type === 'carfire') {
    const veh = v('vehicles');
    put(veh ? numw(veh) + ' vehicle fire' + pl(veh) : 'vehicle fire');
    wherePart();
    put(v('strcond').toLowerCase());
    put(has('rego') ? 'registration number ' + v('rego') : '');
    put(exposurePart());
    put(equipPart());
    put(posPart());
    tail();
  }

  else if (type === 'mva') {
    const veh = v('vehicles'), lmk = v('landmark'), vp = lst('vehpos');
    put(veh ? numw(veh) + ' vehicle' + pl(veh) + ' involved' : 'MVC');
    wherePart();
    put(lmk ? 'near ' + lmk : '');
    if (vp) put((veh && !isOne(veh) ? 'vehicles ' + vp.replace(/\bits\b/g, 'their') : 'vehicle ' + vp));
    put(has('occcount') ? numw(v('occcount')) + ' occupant' + pl(v('occcount')) : '');
    // Entrapment summary, so FireCom can decide on a second rescue tender
    if (pats && pats.length) {
      const tr = pats.filter(p => p.trapped === 'trapped').length, nt = pats.filter(p => p.trapped === 'not trapped').length;
      put(tr ? numw(String(tr)) + ' person' + pl(String(tr)) + ' trapped' : nt === pats.length ? 'no persons trapped' : '');
    }
    patientParts();
    actionParts();
    put(equipPart());
    put(posPart());
    servicesParts();
    tail();
  }

  else if (type === 'medical') {
    if (!nl('patients') && !(pats && pats.length)) put('medical incident');
    wherePart();
    patientParts();
    put(has('personnel') ? 'crew of ' + numw(v('personnel')) : '');
    actionParts();
    servicesParts();
    put(posPart());
    tail();
  }

  const head = ['FireCom', cs, role].filter(Boolean).join(' – ');
  return [head + (main.length ? ' – ' + main.join(', ') : '') + '.' + (extra.length ? ' ' + extra.join(' ') : '')];
}