
(function(){
  'use strict';
  if(window.A·CEILProjectSchema) return;

  const CURRENT_VERSION = 3;
  const isObject = value => !!value && typeof value === 'object' && !Array.isArray(value);
  const clone = value => {
    if(typeof structuredClone === 'function') {
      try { return structuredClone(value); } catch(_){window.__diagSilent&&window.__diagSilent(_)}
    }
    try { return JSON.parse(JSON.stringify(value)); } catch(_) { return value; }
  };
  const toVersion = value => {
    const n = Number(value);
    return Number.isInteger(n) && n >= 0 ? n : 0;
  };
  const parseState = value => {
    if(isObject(value)) return { value, serialized:false, valid:true };
    if(typeof value !== 'string' || !value.trim()) return { value:{}, serialized:true, valid:true };
    try {
      const parsed = JSON.parse(value);
      return { value:isObject(parsed) ? parsed : {}, serialized:true, valid:isObject(parsed) };
    } catch(_) {
      return { value:{}, serialized:true, valid:false };
    }
  };
  const serializeState = (state, serialized) => serialized ? JSON.stringify(state) : state;

  function normalizeLocation(location, owner){
    let candidate = location;
    if(!candidate && owner) {
      const legacyUrl = owner.mapUrl || owner.googleMapsUrl || owner.googleMapsLink || owner.mapsUrl || '';
      const hasCoords = Number.isFinite(Number(owner.latitude)) && Number.isFinite(Number(owner.longitude));
      if(legacyUrl || hasCoords) candidate = {
        latitude: hasCoords ? Number(owner.latitude) : null,
        longitude: hasCoords ? Number(owner.longitude) : null,
        mapUrl: legacyUrl
      };
    }
    if(window.A·CEILLocation && typeof window.A·CEILLocation.normalize === 'function') {
      try { return window.A·CEILLocation.normalize(candidate); } catch(_){window.__diagSilent&&window.__diagSilent(_)}
    }
    if(!isObject(candidate)) return null;
    const lat = Number(candidate.latitude);
    const lng = Number(candidate.longitude);
    const latitude = Number.isFinite(lat) && lat >= -90 && lat <= 90 ? lat : null;
    const longitude = Number.isFinite(lng) && lng >= -180 && lng <= 180 ? lng : null;
    const mapUrl = typeof candidate.mapUrl === 'string' ? candidate.mapUrl.trim() : '';
    if(latitude === null && longitude === null && !mapUrl) return null;
    return Object.assign({}, candidate, { latitude, longitude, mapUrl });
  }

  const stateMigrations = {
    0(state){
      if(!Array.isArray(state.elemItems)) state.elemItems = [];
      if(!Array.isArray(state.elemGroups)) state.elemGroups = [];
      if(!Array.isArray(state.lightMarks)) state.lightMarks = [];
      if(!Array.isArray(state.wallMarks)) state.wallMarks = [];
      state.schemaVersion = 1;
      return state;
    },
    1(state){
      if(Array.isArray(state.rooms)) state.rooms = state.rooms.map(migrateRoom);
      state.schemaVersion = 2;
      return state;
    },
    2(state){
      const location = normalizeLocation(state.location, state);
      if(location) state.location = location;
      state.schemaVersion = 3;
      return state;
    }
  };

  const projectMigrations = {
    0(project){
      if(Array.isArray(project.rooms)) project.rooms = project.rooms.filter(isObject);
      project.schemaVersion = 1;
      return project;
    },
    1(project){
      if(Array.isArray(project.rooms)) project.rooms = project.rooms.map(migrateRoom);
      project.schemaVersion = 2;
      return project;
    },
    2(project){
      const location = normalizeLocation(project.location, project);
      if(location) project.location = location;
      project.schemaVersion = 3;
      return project;
    }
  };

  function runMigrations(target, migrations, label){
    if(!isObject(target)) return target;
    let version = toVersion(target.schemaVersion);
    let guard = 0;
    while(version < CURRENT_VERSION && guard++ < CURRENT_VERSION + 2){
      const migrate = migrations[version];
      if(typeof migrate !== 'function') throw new Error(label + ': відсутня міграція v' + version + '→v' + (version + 1));
      target = migrate(target) || target;
      const next = toVersion(target.schemaVersion);
      if(next <= version) throw new Error(label + ': міграція v' + version + ' не підвищила версію');
      version = next;
    }
    target.schemaVersion = CURRENT_VERSION;
    return target;
  }

  function migrateState(rawState){
    const parsed = parseState(rawState);
    if(!parsed.valid && typeof rawState === 'string' && rawState.trim()) return rawState;
    const migrated = runMigrations(parsed.value, stateMigrations, 'ProjectState');
    return serializeState(migrated, parsed.serialized);
  }

  function migrateRoom(room){
    if(!isObject(room)) return room;
    room = runMigrations(room, projectMigrations, 'Room');
    if(Object.prototype.hasOwnProperty.call(room, 'state')) room.state = migrateState(room.state);
    const location = normalizeLocation(room.location, room);
    if(location) room.location = location;
    return room;
  }

  function migrateProject(project){
    if(!isObject(project)) return project;
    project = runMigrations(project, projectMigrations, 'Project');
    if(Object.prototype.hasOwnProperty.call(project, 'state')) {
      project.state = migrateState(project.state);
      const parsed = parseState(project.state);
      if(parsed.valid && parsed.value.multiRoom && Array.isArray(parsed.value.rooms)) {
        parsed.value.rooms = parsed.value.rooms.map(migrateRoom);
        project.state = serializeState(parsed.value, parsed.serialized);
      }
    }
    if(Array.isArray(project.rooms)) project.rooms = project.rooms.map(migrateRoom);
    const location = normalizeLocation(project.location, project);
    if(location) project.location = location;
    return project;
  }

  function migrateProjects(projects){
    return Array.isArray(projects) ? projects.filter(isObject).map(migrateProject) : [];
  }

  function auditProject(project){
    const issues = [];
    if(!isObject(project)) return ['Проєкт не є об’єктом'];
    if(toVersion(project.schemaVersion) !== CURRENT_VERSION) issues.push('Невірна schemaVersion проєкту');
    const parsed = parseState(project.state);
    if(Object.prototype.hasOwnProperty.call(project,'state') && !parsed.valid) issues.push('Пошкоджений JSON у state');
    if(parsed.valid && toVersion(parsed.value.schemaVersion) !== CURRENT_VERSION) issues.push('Невірна schemaVersion state');
    if(project.multiRoom && !Array.isArray(project.rooms) && !(parsed.valid && Array.isArray(parsed.value.rooms))) issues.push('Багатокімнатний проєкт без rooms');
    return issues;
  }

  const api = Object.freeze({
    CURRENT_VERSION,
    migrateProject,
    migrateProjects,
    migrateState,
    migrateRoom,
    auditProject,
    clone
  });
  window.A·CEILProjectSchema = api;

  const originalGetProjects = typeof window.getProjects === 'function' ? window.getProjects : null;
  const originalSetProjects = typeof window.setProjects === 'function' ? window.setProjects : null;

  if(originalGetProjects){
    window.getProjects = function(){
      const raw = originalGetProjects.apply(this, arguments);
      const before = (()=>{ try{return JSON.stringify(raw);}catch(_){return '';} })();
      const migrated = migrateProjects(raw);
      const after = (()=>{ try{return JSON.stringify(migrated);}catch(_){return '';} })();
      if(originalSetProjects && before !== after){
        try { originalSetProjects.call(window, migrated); } catch(_){window.__diagSilent&&window.__diagSilent(_)}
      }
      return migrated;
    };
    try { getProjects = window.getProjects; } catch(_){window.__diagSilent&&window.__diagSilent(_)}
  }

  if(originalSetProjects){
    window.setProjects = function(projects){
      return originalSetProjects.call(this, migrateProjects(projects));
    };
    try { setProjects = window.setProjects; } catch(_){window.__diagSilent&&window.__diagSilent(_)}
  }

  const originalMerge = typeof window.A·CEILMergeCloudProjects === 'function' ? window.A·CEILMergeCloudProjects : null;
  if(originalMerge){
    window.A·CEILMergeCloudProjects = function(projects){
      const args = Array.from(arguments);
      args[0] = migrateProjects(projects);
      return originalMerge.apply(this, args);
    };
    try { A·CEILMergeCloudProjects = window.A·CEILMergeCloudProjects; } catch(_){window.__diagSilent&&window.__diagSilent(_)}
  }

  try {
    if(originalGetProjects && originalSetProjects) originalSetProjects(migrateProjects(originalGetProjects()));
  } catch(error) {
    console.warn('[A·CEILProjectSchema] Початкова міграція не виконана:', error);
  }
})();
