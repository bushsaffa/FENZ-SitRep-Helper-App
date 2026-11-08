/* config.js: field definitions (SLOTS), per-incident overrides (OVR) and incident types (TYPES) */

const SLOTS = {
  role:       { label: 'Your role', opts: ['Crew leader', 'Officer in charge'] },
  location:   { label: 'Location (street name or address)' },
  mapref:     { label: 'Map reference' },
  dist:       { label: 'Distance and direction from landmark (e.g. 2 kilometres north)' },
  landmark:   { label: 'Landmark' },
  length:     { label: 'Fire length (metres)' },
  width:      { label: 'Fire width (metres)' },
  area:       { label: 'Area (hectares), if not length by width' },
  fuel:       { label: 'Fuel', opts: ['Grass', 'Scrub', 'Forestry', 'Hedge'], multi: true },
  terrain:    { label: 'Terrain', opts: ['Flat', 'Rolling', 'Steep'] },
  behav:      { label: 'Fire behaviour', opts: ['Low', 'Moderate', 'High', 'Extreme'] },
  ros:        { label: 'Rate of spread', opts: ['Slow', 'Moderate', 'Rapid'] },
  flameh:     { label: 'Flame height (metres)' },
  winddir:    { label: 'Wind from the...', opts: ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'] },
  windspeed:  { label: 'Wind speed (km/h)', opts: ['10', '20', '30', '40', '50'] },
  local:      { label: 'Local weather factors (gusting, wind change, temperature...)' },
  status:     { label: 'Fire control', opts: ['Under control', 'Not under control'] },
  contain:    { label: 'Fire containment', opts: ['Contained', 'Not contained'] },
  spots:      { label: 'Spot fires observed', opts: ['No', '1', '2', '3'] },
  threat:     { label: 'Values at risk (property, forestry, livestock, buildings, vehicles...)', opts: ['None', 'Property', 'Forestry', 'Livestock', 'Infrastructure', 'Buildings', 'Vehicles'], multi: true },
  access:     { label: 'Access (transport, directions, references)', opts: ['Via vehicle', 'On foot', 'Via helicopter'] },
  personnel:  { label: 'Number of personnel', opts: ['2', '3', '4', '5', '6'] },
  equipment:  { label: 'Equipment and suppression methods', opts: ['Knapsacks', 'Hose lines', 'High-pressure lines'], multi: true },
  control:    { label: 'Establishing (control lines, anchor point, containment lines)', opts: ['Anchor point', 'Control lines', 'Containment lines'], multi: true },
  crewpos:    { label: 'Position of your crew' },
  supprob:    { label: 'Suppression problems', opts: ['None'] },
  ctrlprob:   { label: 'Control problems', opts: ['None'] },
  hazards:    { label: 'Current hazards', opts: ['None', 'Wind change', 'Smoke', 'Overhead lines', 'Steep terrain'], multi: true },
  resources:  { label: 'Additional resources required', opts: ['None', 'Additional appliances', 'Forestry units', 'Helicopter', 'Heavy machinery'], multi: true },
  crewcond:   { label: 'Condition of crew and equipment', opts: ['Good', 'Fatigued', 'Low on water'], multi: true },
  safety:     { label: 'Safety concerns', opts: ['None', 'Smoke', 'Wind change', 'Fatigue'], multi: true },
  crewstatus: { label: 'Crew status', opts: ['Safe and accounted for', 'Safety maintained'] },
  // structure
  floors:     { label: 'Height (floors)', opts: ['Single-storey', 'Two-storey', 'Three-storey'] },
  strtype:    { label: 'Used as', opts: ['Residential dwelling', 'Commercial building', 'Industrial building', 'Shed', 'Garage'] },
  blength:    { label: 'Building length (metres)' },
  bwidth:     { label: 'Building breadth (metres)' },
  flocation:  { label: 'Location of fire (floor, room, roof, front, rear...)' },
  strcond:    { label: 'Fire conditions', opts: ['Smoke showing', 'Flames showing', 'Well involved', 'Fully involved'] },
  smokefrom:  { label: 'Smoke issuing from (roof space, windows...)' },
  spread:     { label: 'Fire is currently...', opts: ['Contained to room of origin', 'Spreading through the structure', 'Involving the roof'] },
  occupants:  { label: 'Occupant status', opts: ['None', 'All persons accounted for', 'Persons reported missing', 'Occupants being evacuated'] },
  mode:       { label: 'Operations', opts: ['Offensive', 'Defensive'] },
  hoselines:  { label: 'Hose lines deployed', opts: ['1', '2', '3', '4'] },
  actions:    { label: 'Crew actions', multi: true },   // options are set per incident in OVR
  // MVA / medical (patient details are handled per patient, see PFLD in the interface)
  vehicles:   { label: 'Vehicles involved', opts: ['1', '2', '3'] },
  vehpos:     { label: 'Vehicle position and damage', opts: ['Off the roadway', 'Resting on its side', 'Resting on its roof', 'Blocking the road'], multi: true },
  occcount:   { label: 'Number of occupants', opts: ['1', '2', '3', '4'] },
  patients:   { label: 'Number of patients', opts: ['None', '1', '2', '3'] },
  ambulance:  { label: 'Ambulance', opts: ['On scene', 'En route', 'Requested'] }
};

// Per-incident changes to labels and chip options
const OVR = {
  structure: {
    threat:    { label: 'Exposures threatened (adjacent buildings or properties)', opts: ['None', 'Adjacent property', 'Neighbouring buildings'] },
    hazards:   { opts: ['None', 'Potential roof collapse', 'Structural instability', 'Overhead lines', 'Gas supply', 'Smoke', 'Hazardous materials'] },
    resources: { opts: ['None', 'Additional appliance', 'Aerial appliance', 'Ambulance', 'Police'] },
    actions:   { opts: ['Fire attack', 'Exposure protection', 'Search operations', 'Ventilation'] },
    equipment: { label: 'Equipment in use', opts: ['Breathing apparatus', 'Thermal imaging camera', 'Ladders'] },
    patients:  { label: 'Number of casualties' },
    safety:    { opts: ['None', 'Structural collapse', 'Fatigue'] }
  },
  mva: {
    hazards:   { opts: ['None', 'Vehicle instability', 'Fuel leakage', 'Undeployed airbags', 'Downed power lines', 'Traffic'] },
    resources: { opts: ['None', 'Additional appliance', 'Ambulance', 'Police', 'Rescue unit'] },
    actions:   { opts: ['Vehicle stabilisation', 'Extrication preparation', 'Extrication', 'First response treatment', 'Traffic management'] },
    equipment: { label: 'Equipment in use', opts: ['Hydraulic rescue tools', 'Stabilisation struts'] },
    safety:    { opts: ['None', 'Traffic', 'Fatigue'] }
  },
  medical: {
    hazards:   { opts: ['None', 'Traffic', 'Electrical hazard', 'Hazardous materials'] },
    resources: { opts: ['None', 'Ambulance', 'Police', 'Additional appliance'] },
    actions:   { opts: ['First response treatment', 'CPR'] },
    safety:    { opts: ['None', 'Fatigue'] }
  }
};

// Groups follow FENZ: FREAN for vegetation (Fire, Risk, Environment, Actions, Needs), CAN for everything else.
// vital = must be reported first (shown above the radio script). Everything else is optional (shown below it).
const TYPES = {
  vegetation: {
    label: 'VEGETATION', name: 'Vegetation', pat: false,
    groups: [
      ['Who and where', ['role', 'location', 'mapref', 'dist', 'landmark']],
      ['Fire', ['length', 'width', 'area', 'fuel', 'terrain', 'behav', 'ros', 'flameh', 'spots', 'status', 'contain']],
      ['Risk', ['threat', 'hazards']],
      ['Environment', ['winddir', 'windspeed', 'local', 'access']],
      ['Actions', ['personnel', 'equipment', 'control', 'crewpos', 'supprob', 'ctrlprob']],
      ['Needs', ['resources', 'crewcond', 'safety', 'crewstatus']]
    ],
    vital: ['location', 'length', 'width', 'fuel', 'status', 'threat', 'winddir', 'resources'],
    alt: { length: ['area'], width: ['area'], status: ['contain'] }   // a vital field is not "missing" if one of these is given instead (control OR containment is enough)
  },
  structure: {
    label: 'STRUCTURE', name: 'Structure', pat: true,
    groups: [
      ['Who and where', ['role', 'location']],
      ['Conditions (HAULET)', ['floors', 'blength', 'bwidth', 'strtype', 'flocation', 'strcond', 'smokefrom', 'spread']],
      ['Life risk and exposures', ['occupants', 'patients', 'threat', 'hazards']],
      ['Actions', ['personnel', 'mode', 'hoselines', 'actions', 'equipment', 'crewpos']],
      ['Needs', ['resources', 'crewcond', 'safety', 'crewstatus']]
    ],
    vital: ['location', 'floors', 'strtype', 'strcond', 'occupants', 'patients', 'threat', 'resources']
  },
  mva: {
    label: 'MVA', name: 'MVA', pat: true,
    groups: [
      ['Who and where', ['role', 'location', 'landmark']],
      ['Conditions', ['vehicles', 'vehpos', 'occcount', 'patients', 'hazards']],
      ['Actions', ['personnel', 'actions', 'equipment', 'crewpos', 'ambulance']],
      ['Needs', ['resources', 'crewcond', 'safety', 'crewstatus']]
    ],
    vital: ['location', 'vehicles', 'patients', 'hazards', 'resources']
  },
  medical: {
    label: 'MEDICAL', name: 'Medical', pat: true,
    groups: [
      ['Who and where', ['role', 'location']],
      ['Conditions', ['patients', 'hazards']],
      ['Actions', ['personnel', 'actions', 'ambulance', 'crewpos']],
      ['Needs', ['resources', 'crewcond', 'safety', 'crewstatus']]
    ],
    vital: ['location', 'patients']
  }
};
const idsFor = t => TYPES[t].groups.flatMap(g => g[1]);