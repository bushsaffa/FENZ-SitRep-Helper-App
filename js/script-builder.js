/* script-builder.js: one template per incident, only says what it was told */

const PSTAT = {
  'status zero': 'Status Zero, deceased', 'status one': 'Status One, critical', 'status two': 'Status Two, serious',
  'status three': 'Status Three, moderate', 'status four': 'Status Four, minor'
};

function buildScript(type, g, pats) {
  const v = id => (g(id) || '').trim();
  const nl = id => v(id).toLowerCase() === 'nil';
  const has = id => !!v(id);
  const its = id => splitItems(v(id)).filter(x => x.toLowerCase() !== 'nil');
  const lst = id => joinList(its(id).map(fmt));
  const cs = v('callsign') || '[callsign]';
  const out = [];
  const add = s => { if (s) out.push(s); };
  const prep = s => /^(?:at|on|in|along|near|by|behind|ahead|within|adjacent|beside|above|below|across)\b/i.test(s) ? s : 'at ' + s;
  const loc = v('location');

  // Shared lines
  const hazardsLine = () => nl('hazards') ? 'No hazards identified at this time.' : has('hazards') ? 'Current hazards include ' + lst('hazards') + '.' : '';
  const probLine = (id, what) => nl(id) ? 'No ' + what + ' problems.' : has(id) ? cap(what) + ' problems include ' + fmt(v(id)) + '.' : '';
  const posLine = () => has('crewpos') ? 'Crew is positioned ' + prep(v('crewpos')) + '.' : '';
  const crewOf = () => has('personnel') ? 'Crew of ' + numw(v('personnel')) + '.' : '';
  const equipLine = () => has('equipment') ? 'Equipment in use includes ' + lst('equipment') + '.' : '';
  const tail = () => {
    add(hazardsLine());
    add(probLine('supprob', 'suppression'));
    add(probLine('ctrlprob', 'control'));
    add(has('crewcond') ? 'Crew and equipment condition is ' + lst('crewcond') + '.' : '');
    add(nl('safety') ? 'No safety concerns.' : has('safety') ? 'Safety concerns include ' + lst('safety') + '.' : '');
    add(nl('resources') ? 'No additional resources required.' : has('resources') ? 'We require ' + lst('resources') + '.' : '');
    const s = v('crewstatus').toLowerCase();
    add(!s ? '' : s === 'safety maintained' ? 'Crew safety maintained.' : 'Crew is ' + s + '.');
    add('Further SITREP to follow.');
    add(cs + ' out.');
  };
  // Each patient is reported separately, with their own status, condition and injuries
  const patientLines = () => {
    if (nl('patients')) { add('There are no patients.'); return; }
    const info = p => [
      p.desc,
      p.status && (PSTAT[p.status.toLowerCase()] || cap(p.status)),
      p.cond && joinList(splitItems(p.cond)),
      p.inj && 'suspected ' + p.inj,
      p.trapped && (p.trapped === 'trapped' ? 'currently trapped' : 'not trapped')
    ].filter(Boolean);
    if (!pats || !pats.length) return;
    if (pats.length === 1) { const a = info(pats[0]); add('We have one patient' + (a.length ? ', ' + a.join(', ') : '') + '.'); return; }
    add('We have ' + numw(String(pats.length)) + ' patients.');
    pats.forEach((p, i) => { const a = info(p); if (a.length) add('Patient ' + numw(String(i + 1)) + ', ' + a.join(', ') + '.'); });
  };
  // Crew actions: treatment is always reported "within training and operational guidelines"
  const actionParts = () => {
    const a = its('actions');
    return { treat: a.some(x => /first response treatment/i.test(x)), rest: a.filter(x => !/first response treatment/i.test(x)) };
  };
  const actionLines = () => {
    const { treat, rest } = actionParts();
    if (treat) add('Crew is providing first response treatment within training and operational guidelines.');
    if (rest.length) add('Crew is undertaking ' + joinList(rest) + '.');
  };

  add('FireCom, this is ' + cs + (v('role') ? ', ' + title(v('role')) : '') + ', SITREP.');

  if (type === 'vegetation') {
    const dist = v('dist'), lmk = v('landmark');
    // A distance with no landmark is kept, with a visible placeholder (like [callsign]) so it can't go out half-said
    const near = lmk ? (dist ? 'approximately ' + dist + ' from ' + lmk : 'near ' + lmk) : dist ? 'approximately ' + dist + ' from [landmark]' : '';
    const where = [loc && 'located at ' + loc, near].filter(Boolean).join(', ');
    add('We have a vegetation fire' + (where ? ' ' + where : '') + '.');
    add(has('mapref') ? 'Map reference ' + v('mapref') + '.' : '');

    const Le = v('length'), W = v('width'), area = v('area'), fuel = lst('fuel'), terr = v('terrain');
    const dims = (Le && W) ? Le + ' by ' + W + ' metres' : '';
    const sz = dims ? 'approximately ' + dims + (area ? ', or ' + area + ' hectares' : '') : area ? 'approximately ' + area + ' hectares' : '';
    const inv = fuel ? 'involving ' + fuel + ' fuel' : '', tt = terr ? 'on ' + terr + ' terrain' : '';
    if (sz) add('The fire is ' + sz + (inv ? ', ' + inv : '') + (tt ? ' ' + tt : '') + '.');
    else if (fuel) add('The fire involves ' + fuel + ' fuel' + (tt ? ' ' + tt : '') + '.');
    else if (terr) add('The fire is on ' + terr + ' terrain.');

    const wd = v('winddir'), ws = v('windspeed'), beh = v('behav');
    const wind = wd ? 'wind from the ' + wd + (ws ? ' at approximately ' + ws + ' knots' : '') : ws ? 'wind speed approximately ' + ws + ' knots' : '';
    add(beh ? 'Fire behaviour is ' + beh + (wind ? ', with ' + wind : '') + '.' : wind ? cap(wind) + '.' : '');
    const rf = [has('ros') && 'rate of spread is ' + v('ros'), has('flameh') && 'flame height is approximately ' + v('flameh') + ' metres'].filter(Boolean);
    add(rf.length ? cap(rf.join(' and ')) + '.' : '');
    add(has('local') ? 'Local conditions: ' + v('local') + '.' : '');

    const sp = v('spots').toLowerCase(), stt = v('status');
    const spot = sp ? ((sp === 'no' || sp === 'nil') ? 'no spot fires' : numw(sp) + ' spot fire' + pl(sp)) + ' observed' : '';
    add(stt ? 'The fire is currently ' + stt + (spot ? ', with ' + spot : '') + '.' : spot ? cap(spot) + '.' : '');

    add(nl('threat') ? 'There is no immediate threat to property or other values.' : has('threat') ? 'Values at risk include ' + lst('threat') + '.' : '');
    const acc = v('access');
    add(acc ? 'Access is ' + (/^(?:via|by|on|from|through|along|off|across)\b/i.test(acc) ? '' : 'via ') + acc + '.' : '');

    const p = v('personnel'), eq = lst('equipment');
    if (p) add('Crew is deploying ' + numw(p) + ' personnel' + (eq ? ' utilising ' + eq : '') + '.');
    else if (eq) add('Crew is utilising ' + eq + '.');
    add(posLine());
    add(has('control') ? 'We are establishing ' + lst('control') + ' and working to contain the fire.' : '');
    tail();
  }

  else if (type === 'structure') {
    const bld = [v('floors'), v('strtype')].filter(Boolean).join(' ');
    add('We are on scene' + (loc ? ' at ' + loc : '') + ' with a structural fire' + (bld ? ' involving ' + an(bld) : '') + '.');
    add(v('blength') && v('bwidth') ? 'Building area is approximately ' + v('blength') + ' by ' + v('bwidth') + ' metres.' : '');
    add(has('flocation') ? 'Fire location is ' + v('flocation') + '.' : '');
    const c = v('strcond').toLowerCase();
    add(c === 'fully involved' ? 'The structure is fully involved.' : c === 'well involved' ? 'The fire is well involved.' : c ? 'We have ' + c + '.' : '');
    add(has('smokefrom') ? 'Smoke is issuing from ' + v('smokefrom') + '.' : '');
    add(has('spread') ? 'The fire is currently ' + v('spread') + '.' : '');
    const oc = v('occupants').toLowerCase();
    add(oc === 'nil' ? 'There are no occupants.' : oc ? 'Occupant status is ' + oc + '.' : '');
    patientLines();
    add(nl('threat') ? 'No exposures are threatened.' : has('threat') ? 'The fire is threatening ' + lst('threat') + '.' : '');
    add(crewOf());
    const { treat, rest } = actionParts();
    const parts = [];
    if (has('mode')) parts.push('establishing ' + v('mode') + ' operations');
    if (has('hoselines')) parts.push('deploying ' + numw(v('hoselines')) + ' hose line' + pl(v('hoselines')));
    if (rest.length) parts.push('undertaking ' + joinList(rest));
    add(parts.length ? 'Crew is ' + joinList(parts) + '.' : '');
    if (treat) add('Crew is providing first response treatment within training and operational guidelines.');
    add(equipLine());
    add(posLine());
    tail();
  }

  else if (type === 'mva') {
    const veh = v('vehicles'), lmk = v('landmark'), vp = lst('vehpos');
    let hd = veh ? cap(numw(veh)) + ' vehicle MVA' : 'Motor vehicle accident';   // (not "head": that is a helper in helpers.js)
    hd += (loc ? ' at ' + loc : '') + (lmk ? ', near ' + lmk : '');
    if (vp) hd += ', ' + (veh && !isOne(veh) ? 'vehicles ' + vp.replace(/\bits\b/g, 'their') : 'vehicle ' + vp);
    add(hd + '.');
    add(has('occcount') ? cap(numw(v('occcount'))) + ' occupant' + pl(v('occcount')) + ' identified.' : '');
    patientLines();
    add(crewOf());
    actionLines();
    add(equipLine());
    add(posLine());
    add(has('ambulance') ? 'Ambulance is ' + v('ambulance') + '.' : '');
    tail();
  }

  else if (type === 'medical') {
    add('We have a medical incident' + (loc ? ' at ' + loc : '') + '.');
    patientLines();
    add(crewOf());
    actionLines();
    add(posLine());
    add(has('ambulance') ? 'Ambulance is ' + v('ambulance') + '.' : '');
    tail();
  }
  return out.map(cap);
}