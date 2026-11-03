// ==UserScript==
// @name         Frost Reaper - TitanHelper module
// @namespace    frost-reaper
// @version      0.5.35
// @description  Niezależny moduł TitanHelper dla Frost Reaper (natywne okno Margonem).
// @match        *://*.margonem.pl/*
// @match        *://margonem.pl/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/marasko95/FrostReaper/main/FrostReaper_TitanHelper.user.js
// @downloadURL  https://raw.githubusercontent.com/marasko95/FrostReaper/main/FrostReaper_TitanHelper.user.js
// ==/UserScript==

(() => {
  'use strict';
  if (window.__FROST_REAPER_TITAN__) return;

  const KEY = 'frostReaperTitanSettings';
  const defaults = {
    highlightOwnEffects: true,
    showExactHealth: true,
    showTurnQueue: false,
    showTeamEffects: true,
    showCriticalInfo: true,
    showHealingCounters: true,
    showEnemyArmor: false,
    showEnemyResources: false,
    settingsOpen: false,
    expandedQueue: false
  };
  let settings = { ...defaults };
  try { settings = { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (_) {}
  const state = { active: false, warriors: {}, queue: [], ownTeam: null, enemyTeam: null, turn: 0, time: 0 };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const save = () => localStorage.setItem(KEY, JSON.stringify(settings));
  const css = `
    .frost-reaper-window > .collapse{left:auto!important;right:7px!important;top:3px!important;position:absolute!important;transform:none!important;z-index:1000!important}
    .fr-th{color:#f4ead0;font:12px/1.4 Arial,sans-serif;min-width:300px}
    .fr-th *{box-sizing:border-box;color:inherit}
    .fr-th .gold{color:#d9b66d;font-weight:bold}
    .fr-th .muted{color:#b8aa91}
    .fr-th .section{border-top:1px solid rgba(205,169,100,.35);padding:7px 0}
    .fr-th .row{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
    .fr-th .fr-header{justify-content:space-between;flex-wrap:nowrap}
    .fr-th .fr-settings-panel{margin-top:5px}
    .fr-th .pill{border:1px solid rgba(205,169,100,.4);border-radius:4px;padding:2px 5px;margin:2px 2px 2px 0;display:inline-block}
    .fr-th .ally{border-color:#6aab83}.fr-th .enemy{border-color:#c87979}
    .fr-th .own{color:#f1c96f;text-decoration:underline}
    .fr-th .warn{color:#ff9b86;font-weight:bold}
    .fr-th button{background:#342b20;border:1px solid #a88a55;border-radius:3px;padding:4px 7px;cursor:pointer}
    .fr-th label{display:block;margin:5px 0;color:#e8d7b2}
    .fr-th .checkbox-custom.c-checkbox{display:flex!important;align-items:center;gap:7px;margin:5px 0;position:relative}
    .fr-th .checkbox-custom.c-checkbox input[type="checkbox"]{position:absolute!important;opacity:0!important;width:1px!important;height:1px!important;pointer-events:none!important;appearance:none!important}
    .fr-th .checkbox-custom.c-checkbox label.c-checkbox__label{display:inline-flex!important;align-items:center;gap:7px;position:static!important;color:#e8d7b2!important;cursor:pointer;margin:0!important;background:none!important;box-shadow:none!important}
    /* Margonem draws its own green checkbox on the label. Disable only that decoration. */
    .fr-th .checkbox-custom.c-checkbox label.c-checkbox__label::before,
    .fr-th .checkbox-custom.c-checkbox label.c-checkbox__label::after{content:none!important;display:none!important;background:none!important;border:0!important;box-shadow:none!important}
    .fr-th .checkbox-custom.c-checkbox .fr-checkmark{display:inline-flex!important;align-items:center;justify-content:center;flex:none;width:15px;height:15px;border:1px solid #aa8953;border-radius:2px;background:linear-gradient(#4a3a25,#2a2218)!important;box-shadow:inset 0 1px 2px #120d07!important;color:#f5d78d;font-size:12px;line-height:1}
    .fr-th .checkbox-custom.c-checkbox .fr-checkmark::before{content:none!important;display:none!important}
    .fr-th .checkbox-custom.c-checkbox input[type="checkbox"]:checked + label .fr-checkmark::after{content:"✔"!important;display:block!important}
    .fr-th .checkbox-custom.c-checkbox input[type="checkbox"]:not(:checked) + label .fr-checkmark::after{content:none!important;display:none!important}
    .fr-th .checkbox-custom.c-checkbox input[type="checkbox"]:focus-visible + label .fr-checkmark{outline:2px solid #e3bc6b;outline-offset:2px}
  `;
  let win = null, root = null, renderQueued = false, collapsed = false;
  function moveCollapseToRight(el) {
    if (!el) return;
    // Ważne: sam right:7px nie działa, gdy .collapse siedzi wewnątrz
    // lewego kontenera nagłówka. Przenosimy przycisk do samego okna.
    const controls = [...el.querySelectorAll('.collapse')].filter(button =>
      !button.closest('#fr-th-body') && !button.classList.contains('fr-native-gear'));
    for (const button of controls) {
      if (button.parentElement !== el) el.appendChild(button);
      button.style.setProperty('position', 'absolute', 'important');
      button.style.setProperty('left', 'auto', 'important');
      button.style.setProperty('right', '7px', 'important');
      button.style.setProperty('top', '3px', 'important');
      button.style.setProperty('z-index', '1000', 'important');
      button.style.setProperty('transform', 'none', 'important');
      button.style.setProperty('margin', '0', 'important');
    }
  }
  function mountGear(el) {
    moveCollapseToRight(el);
    if (!el) return;
    if (el.querySelector('.fr-native-gear')) return;
    // Minutnik Margonem: mała jasna zębatka po lewej stronie paska tytułu.
    // Przycisk jest bezpośrednim dzieckiem okna, nie zawartości przewijanej.
    const gear = document.createElement('button');
    gear.type = 'button';
    gear.className = 'fr-native-gear';
    gear.setAttribute('aria-label', 'Ustawienia TH');
    gear.title = 'Ustawienia TH';
    gear.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" fill="currentColor"><path d="M19.14 12.94a7.4 7.4 0 0 0 .05-1.88l2-1.55-2-3.46-2.35.95a7.4 7.4 0 0 0-1.63-.94L14.85 3h-4l-.36 3.06a7.4 7.4 0 0 0-1.63.94l-2.35-.95-2 3.46 2 1.55a7.4 7.4 0 0 0 0 1.88l-2 1.55 2 3.46 2.35-.95c.5.4 1.05.71 1.63.94L10.85 21h4l.36-3.06c.58-.23 1.13-.54 1.63-.94l2.35.95 2-3.46-2.05-1.55ZM12.85 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"/></svg>';
    gear.style.cssText = 'position:absolute!important;left:24px!important;top:3px!important;width:17px!important;height:18px!important;padding:1px!important;margin:0!important;border:0!important;background:transparent!important;box-shadow:none!important;color:#c9c8c9!important;display:flex!important;align-items:center!important;justify-content:center!important;z-index:999!important;cursor:pointer!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important;';
    gear.addEventListener('click', event => {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      settings.settingsOpen = !settings.settingsOpen;
      save(); scheduleRender();
      gear.setAttribute('aria-expanded', String(settings.settingsOpen));
    }, true);
    gear.setAttribute('aria-expanded', String(settings.settingsOpen));
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.appendChild(gear);
  }
  function installControls() {
    const el = document.querySelector('#fr-th-body')?.closest('.c-window');
    if (!el) return;
    root = el;
    mountGear(el);
    moveCollapseToRight(el);
    if (el.dataset.frControlsReady) return;
    el.dataset.frControlsReady = '1';
    const opacityGuard = () => {
      if (el.getAttribute('data-opacity-lvl') === '0') el.setAttribute('data-opacity-lvl', '1');
    };
    opacityGuard();
    new MutationObserver(opacityGuard).observe(el, {attributes:true, attributeFilter:['data-opacity-lvl']});
    el.addEventListener('click', event => {
      const toggle = event.target.closest('.collapse');
      if (!toggle || !el.contains(toggle)) return;
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      collapsed = !collapsed;
      const content = el.querySelector('.content');
      if (content) content.style.display = collapsed ? 'none' : '';
    }, true);
    el.addEventListener('click', event => {
      const gear = event.target.closest('[data-fr-settings-toggle]');
      if (!gear || !el.contains(gear)) return;
      event.preventDefault();
      settings.settingsOpen = !settings.settingsOpen;
      save();
      scheduleRender();
    });
    el.addEventListener('change', event => {
      const input = event.target.closest('input[data-setting]');
      if (!input || !el.contains(input)) return;
      settings[input.dataset.setting] = input.checked;
      save();
      scheduleRender();
    }, true);
  }


  // Niezależne przesuwanie i trwały zapis pozycji, również po F5.
  function rememberWindowPosition(element, key) {
    if (!element || element.dataset.frPersistentDrag === '1') return;
    element.dataset.frPersistentDrag = '1';
    let active = null;
    const apply = (x,y) => {
      const left=Math.max(0,Math.min(x,Math.max(0,innerWidth-80)));
      const top=Math.max(0,Math.min(y,Math.max(0,innerHeight-40)));
      for(const [k,v] of Object.entries({position:'fixed',left:left+'px',top:top+'px',right:'auto',bottom:'auto',transform:'none'}))
        element.style.setProperty(k,v,'important');
    };
    let saved=null;
    try {const p=JSON.parse(localStorage.getItem(key)||'null');
      if(Number.isFinite(p?.left)&&Number.isFinite(p?.top))saved=p;
    }catch(_){}
    if(saved){
      apply(saved.left,saved.top);
      requestAnimationFrame(()=>{if(!active)apply(saved.left,saved.top)});
      setTimeout(()=>{if(!active)apply(saved.left,saved.top)},250);
      setTimeout(()=>{if(!active)apply(saved.left,saved.top)},1000);
    }
    const header=[...element.querySelectorAll('.window-header,.header,.title,.window-title,.c-window-header,.name-window')]
      .find(node=>!node.closest('.content'))||element;
    header.style.setProperty('touch-action','none','important');
    const blocked=t=>t?.closest?.('button,input,select,textarea,a,.collapse,.fr-native-gear,.fr-as-gear,.content');
    const start=(e,x,y,type)=>{
      if(blocked(e.target)||(e.button!==undefined&&e.button!==0))return;
      const r=element.getBoundingClientRect();
      active={x,y,left:r.left,top:r.top,type};
      e.preventDefault();e.stopImmediatePropagation();
    };
    const move=(e,x,y,type)=>{
      if(!active||active.type!==type)return;
      apply(active.left+x-active.x,active.top+y-active.y);
      e.preventDefault();e.stopImmediatePropagation();
    };
    const finish=type=>{
      if(!active||active.type!==type)return;
      active=null;
      const r=element.getBoundingClientRect();
      try{localStorage.setItem(key,JSON.stringify({left:Math.round(r.left),top:Math.round(r.top)}))}catch(_){}
    };
    header.addEventListener('mousedown',e=>start(e,e.clientX,e.clientY,'mouse'),true);
    document.addEventListener('mousemove',e=>move(e,e.clientX,e.clientY,'mouse'),true);
    document.addEventListener('mouseup',()=>finish('mouse'),true);
    header.addEventListener('touchstart',e=>{
      if(e.touches.length===1)start(e,e.touches[0].clientX,e.touches[0].clientY,'touch');
    },{capture:true,passive:false});
    document.addEventListener('touchmove',e=>{
      if(active?.type==='touch'&&e.touches.length)move(e,e.touches[0].clientX,e.touches[0].clientY,'touch');
    },{capture:true,passive:false});
    document.addEventListener('touchend',()=>finish('touch'),true);
    window.addEventListener('blur',()=>{finish('mouse');finish('touch')});
  }

  function nativeWindow() {
    const E = window.Engine;
    if (!E?.windowManager || !E?.windowsData || !E?.interface) return false;
    const wm = E.windowManager;
    if (wm.getList?.().FROST_REAPER_TITAN?.length) {
      win = wm.getWndByNameAndId('FROST_REAPER_TITAN', 0);
      installControls();
      rememberWindowPosition(document.querySelector('.frost-reaper-window'), 'fr_th_window_position');
      return !!win;
    }
    E.windowsData.name.FROST_REAPER_TITAN = 'FROST_REAPER_TITAN';
    const content = `<div class="fr-th"><div id="fr-th-body">Ładowanie modułu…</div></div>`;
    win = wm.add({
      name: 'FROST_REAPER_TITAN',
      nameWindow: 'FROST_REAPER_TITAN',
      title: 'Frost Reaper • TitanHelper',
      content,
      type: E.windowsData.type?.TRANSPARENT,
      manageOpacity: 3,
      closeable: false,
      manageCollapse: true,
      draggable: true,
      className: 'frost-reaper-window'
    });
    if (!win) return false;
    win.addToAlertLayer();
    if (localStorage.getItem('fr_manager_th_visible') !== 'false') win.show();
    else win.hide?.();
    root = document.querySelector('.c-window.border-window.frost-reaper-window:last-of-type') ||
           document.querySelector('.c-window.border-window[name="FROST_REAPER_TITAN"]');
    const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
    installControls();
    rememberWindowPosition(root || document.querySelector('.frost-reaper-window'), 'fr_th_window_position');
    render();
    return true;
  }

  function normalizeEffect(e) {
    return {
      id: e.id ?? e.name ?? e.friendlyName ?? 'effect',
      name: e.name ?? e.friendlyName ?? 'Efekt',
      friendlyName: e.friendlyName ?? e.name ?? 'Efekt',
      elapsed: Number(e.elapsed ?? 0),
      maxDuration: Number(e.maxDuration ?? e.duration ?? 0),
      casterId: e.casterId ?? e.caster?.id ?? e.caster?.d?.id ?? null,
      casterTeam: e.casterTeam ?? e.caster?.team ?? e.caster?.d?.team ?? null
    };
  }

  // Adapter wejściowy: Frost Reaper może przekazać tu pakiet walki lub znormalizowany snapshot.
  // Obsługiwane pola: {init, close, turns_warriors, w, m}; snapshot: {warriors, queue, ownTeam}.
  function ingest(packet) {
    if (!packet || typeof packet !== 'object') return;
    if (packet.close) { state.active = false; state.warriors = {}; state.queue = []; effectState.clear(); healCounters.clear(); lastActionMarkers.clear(); recentTurnLogs.length = 0; pendingAreaEffects.length = 0; scheduleRender(); return; }
    if (packet.init === '1' || packet.init === 1) { if (!state.active) { effectState.clear(); healCounters.clear(); } state.active = true; }
    else if (packet.warriors) state.active = true;
    if (packet.ownTeam !== undefined) state.ownTeam = packet.ownTeam;
    if (packet.enemyTeam !== undefined) state.enemyTeam = packet.enemyTeam;
    if (packet.turn !== undefined) state.turn = Number(packet.turn) || 0;
    if (packet.time !== undefined) state.time = Number(packet.time) || 0;
    if (packet.turns_warriors) state.queue = Object.values(packet.turns_warriors);
    const source = packet.warriors || packet.w;
    if (source && typeof source === 'object') {
      for (const [id, raw] of Object.entries(source)) {
        if (!raw || typeof raw !== 'object') continue;
        const prev = state.warriors[id] || {};
        const data = raw.d || raw;
        const effects = raw.effects || raw.activeEffects || prev.effects || [];
        state.warriors[id] = {
          ...prev, id: String(data.id ?? id), name: data.nick ?? data.name ?? prev.name ?? `#${id}`,
          team: data.team ?? prev.team ?? null, hp: data.hp ?? prev.hp ?? null,
          sa: data.sa ?? prev.sa, at: data.at ?? prev.at,
          armor: data.ac ?? data.armor ?? raw.ac ?? raw.armor ?? prev.armor ?? null,
          mana: data.mana ?? data.mp ?? raw.mana ?? raw.mp ?? prev.mana ?? null,
          energy: data.energy ?? data.en ?? raw.energy ?? raw.en ?? prev.energy ?? null,
          combo: data.combo ?? prev.combo, frenzy: data.frenzy ?? prev.frenzy,
          isNpc: Boolean(data.npc ?? data.isNpc ?? prev.isNpc),
          disabled: Boolean(raw.disabled ?? raw.isDisabled ?? prev.disabled),
          disableSource: raw.disableSource ?? prev.disableSource ?? '',
          stunned: Number(raw.stunned ?? raw.isStunnedCount ?? prev.stunned ?? 0),
          prepared: raw.preparedSupercast ?? raw.prepared ?? prev.prepared ?? '',
          effects: effectState.has(String(id)) ? prev.effects || [] : (Array.isArray(effects) ? effects.map(normalizeEffect) : Object.values(effects).flat().map(normalizeEffect))
        };
      }
    }
    if (pendingAreaEffects.length && Object.keys(state.warriors).length) {
      for (let i=pendingAreaEffects.length-1;i>=0;i--) {
        const {caster,spec}=pendingAreaEffects[i], casterTeam=state.warriors[caster]?.team;
        if (casterTeam == null) continue;
        const targets=Object.values(state.warriors).filter(w => w.team != null && String(w.team)!==String(casterTeam));
        if (!targets.length) continue;
        for (const w of targets) setEffect(w.id,caster,spec.key,true);
        pendingAreaEffects.splice(i,1);
      }
    }
    if (Array.isArray(packet.m)) {
      for (const line of packet.m) consumeLog(line);
    }
    publishEffects();
    scheduleRender();
  }

  // Parser zgodny ze składnią logów TitanHelpera: id=id;klucz=wartość;txt=...
  function parseLog(line) {
    const out = { values: {}, casterId: null, targetId: null };
    for (const part of String(line).split(';')) {
      const i = part.indexOf('=');
      if (i < 0) { out.values[part] = 'true'; continue; }
      const k = part.slice(0, i).trim(), v = part.slice(i + 1);
      if (/^-?\d+$/.test(k)) {
        if (out.casterId == null) out.casterId = k;
        else if (out.targetId == null) out.targetId = k;
      } else out.values[k] = v;
    }
    if (out.targetId == null) out.targetId = out.casterId;
    return out;
  }
  // Niezależny stan efektów. Mechanika: TitanHelper+ Warrior.overwriteEffect,
  // advanceEffects, consumeTurnAction i VStrikeEffect.process.
  const effectState = new Map();
  const healCounters = new Map();
  function healingRecord(id) {
    id = String(id);
    if (!healCounters.has(id)) healCounters.set(id, {single:0, group:0, bandage:0, lastRescue:false});
    return healCounters.get(id);
  }
  // Identyfikatory i rodzaje leczenia odczytane z definicji skilli TitanHelper+.
  const healingSkills = {
    78:'single', 79:'group', 81:'bandage', 199:'group',
    237:'bandage', 248:'single', 294:'single'
  };
  function recordHealing(log) {
    const v = log.values;
    const caster = log.casterId;
    if (caster != null && v.skillId != null && v.tcustom == null) {
      const kind = healingSkills[Number(v.skillId)];
      if (kind) healingRecord(caster)[kind]++;
    }
    if (v.legbon_lastheal !== undefined) {
      const value = String(v.legbon_lastheal);
      const names = value.split(',').map(part => part.replace(/\([^)]*\)/g, '').trim()).filter(Boolean);
      const warrior = Object.values(state.warriors).find(w => names.includes(w.name));
      // Lastheal dotyczy uzdrowionej postaci, nie przeciwnika z drugiego ID logu.
      // Gdy log nie podaje nicku, użyj pierwszego ID (wykonawcy zdarzenia).
      const targetId = warrior?.id ?? (log.casterId != null ? String(log.casterId) : null);
      if (targetId != null) {
        healingRecord(targetId).lastRescue = true;
        if (state.warriors[String(targetId)]) state.warriors[String(targetId)].usedLastHeal = true;
      }
    }
  }

  const effectsById = new Map();
  const effectNames = {
    legbon_anguish: ['Krwawa udręka', 5],
    curse_status: ['Klątwa', 1],
    blind_status: ['Oślepienie', 1],
    disturb_status: ['Wytrącenie z równowagi', 1]
  };
  const lastActionMarkers = new Map();
  const recentTurnLogs = [];
  function ensureEffectWarrior(id) {
    id = String(id);
    if (!effectState.has(id)) effectState.set(id, {turn:0, effects:new Map()});
    return effectState.get(id);
  }
  function publishEffects() {
    for (const [id, data] of effectState) {
      const warrior = state.warriors[id];
      if (!warrior) continue;
      warrior.effects = [...data.effects.values()].map(e => ({
        ...e, elapsed: Math.max(0,e.duration - e.remaining), maxDuration:e.duration, remaining:e.remaining
      }));
    }
  }
  // Każde rzucenie efektu obszarowego to osobna instancja. Nie nadpisuj
  // poprzedniej instancji (także przy ponownym rzuceniu przez tę samą osobę).
  let effectSequence = 0;
  function setEffect(targetId, casterId, key, stack = false) {
    if (targetId == null) return;
    const spec = areaEffectAttrs[key];
    const info = effectNames[key] || (spec && [spec.name,spec.duration]);
    if (!info) return;
    const [friendlyName, duration] = info;
    const entry = ensureEffectWarrior(targetId);
    // Ten sam rzucający odnawia swój efekt; inny rzucający ma osobną instancję.
    // Klucz stabilny po (efekt, rzucający), więc nie gromadzimy starych Piętn.
    if (key.endsWith('_status')) {
      for (const old of ['curse_status','blind_status','disturb_status']) entry.effects.delete(old);
    }
    const instanceKey = stack ? `${key}#caster:${String(casterId ?? 'unknown')}` : key;
    entry.effects.set(instanceKey, {
      id:instanceKey, name:key, friendlyName, duration: key.endsWith('_status') ? null : duration, remaining:key.endsWith('_status') ? null : duration,
      casterId: casterId == null ? null : String(casterId),
      casterTeam: state.warriors[String(casterId)]?.team ?? null
    });
    publishEffects();
  }
  function advanceEffects(id, preserveDisable = false) {
    if (id == null) return;
    const entry = ensureEffectWarrior(id);
    if (!entry.effects.size) return;
    entry.turn++;
    for (const [key,e] of entry.effects) {
      if (e.duration == null) { if (!preserveDisable) entry.effects.delete(key); continue; }
      e.remaining--;
      if (e.remaining <= 0) entry.effects.delete(key);
    }
    publishEffects();
  }
  const pendingAreaEffects = [];
  // Identyfikatory i atrybuty zweryfikowane w oryginalnej bazie umiejętności TitanHelper+.
  const skillEffects = {
    123: {name:'Szadź', key:'allslow_per', duration:8, all:true},
    264: {name:'Piętno bestii', key:'taken_dmg_per-all', duration:8, all:true}
  };
  const areaEffectAttrs = {
    'allslow_per': skillEffects[123],
    'taken_dmg_per-all': skillEffects[264],
    'taken_dmg_per-row': {name:'Piętno bestii',key:'taken_dmg_per-row',duration:8,all:true},
    'spell-taken_dmg-all': skillEffects[264],
    'spell-allslow_per': skillEffects[123]
  };
  function addAreaEffect(caster, spec, directTarget = null) {
    if (caster == null || !spec) return;
    const casterTeam = state.warriors[String(caster)]?.team;
    const targets = Object.values(state.warriors).filter(w =>
      casterTeam != null && w.team != null && String(w.team) !== String(casterTeam));
    if (directTarget != null && String(directTarget) !== String(caster) && !targets.some(w => String(w.id) === String(directTarget))) {
      const direct = state.warriors[String(directTarget)];
      if (direct) targets.push(direct);
    }
    if (!targets.length) {
      if (!pendingAreaEffects.some(p => p.caster === String(caster) && p.spec.key === spec.key))
        pendingAreaEffects.push({caster:String(caster),spec});
      return;
    }
    for (const w of targets) setEffect(w.id,caster,spec.key,true);
  }
  let lastNpcTspellCaster = null;
  function applyBattleEffects(log) {
    const caster = log.casterId, target = log.targetId;
    const v = log.values;
    // TitanHelper+: strike = log obrażeń z broni; osobno step, tspell,
    // skillId bez SUM, prepare i komunikat o utracie tury.
    const strikeKeys = ['+dmg','-dmg','+dmgf','-dmgf','+dmgl','-dmgl',
                        '+dmgc','-dmgc','+dmgd','-dmgd'];
    const strike = strikeKeys.some(k => v[k] !== undefined);
    const npcOther = Number(caster) < 0 && v['+oth_dmg'] !== undefined;
    const lost = / - utrata tury/i.test(String(v.txt || ''));
    const step = v.step !== undefined;
    const spell = v.tspell !== undefined;
    const skill = v.skillId !== undefined;
    const prepare = v.prepare !== undefined;
    const action = !lost && (step || strike || npcOther || spell || skill || prepare);
    if (action && caster != null) {
      // W oryginale tspell NPC może poprzedzać jego zwykły atak.
      // Taki drugi log nie jest kolejną turą.
      const npcDuplicate = String(caster) === lastNpcTspellCaster &&
        !spell && (strike || npcOther);
      lastNpcTspellCaster = spell && !skill ? String(caster) : null;
      if (!npcDuplicate) {
        lastActionMarkers.set(String(caster), (lastActionMarkers.get(String(caster)) || 0) + 1);
        advanceEffects(caster);
      }
    }
    // Bonus klątwy nakłada pominięcie następnej akcji, nie wieloturowy debuff.
    if (v['+legbon_curse'] !== undefined || v['+mcurse'] !== undefined)
      setEffect(target,caster,'curse_status');
    if (v['+distract'] !== undefined && v['-evade'] === undefined)
      setEffect(target,caster,'disturb_status');
    if (v['-legbon_glare'] !== undefined) {
      setEffect(caster,caster,'blind_status');
    }
    if (v['-legbon_disturb'] !== undefined) {
      setEffect(caster,caster,'disturb_status');
    }
    if (v['+legbon_anguish'] !== undefined) setEffect(target,caster,'legbon_anguish');
    if (v['-legbon_cleanse'] !== undefined && target != null) {
      ensureEffectWarrior(target).effects.delete('legbon_anguish');
      publishEffects();
    }


    if (v['+stun'] !== undefined || v['+freeze'] !== undefined || v['+stun2'] !== undefined) {
      if (state.warriors[String(target)]) state.warriors[String(target)].stunned = v['+stun2'] !== undefined ? 2 : 1;
    }
    if (v['-legbon_cleanse'] !== undefined) {
      const entry = ensureEffectWarrior(target);
      for (const k of [...entry.effects.keys()]) if (k === 'legbon_anguish' || k.startsWith('allslow_per')) entry.effects.delete(k);
      publishEffects();
    }
    // Jeden log = jedno nałożenie. Wcześniej skillId, atrybut i tspell
    // wywoływały addAreaEffect osobno i resetowały licznik do 8.
    const spellName = String(v.tspell || '').toLocaleLowerCase('pl');
    const isPietno = Number(v.skillId) === 264 || spellName === 'piętno bestii' ||
      v['+spell-taken_dmg-all'] !== undefined || v['+taken_dmg_per-all'] !== undefined;
    const isSzadz = Number(v.skillId) === 123 || spellName === 'szadź' ||
      v['+spell-allslow_per'] !== undefined || v['+allslow_per'] !== undefined;
    const castText = String(v.txt || '');
    const castSpec = isPietno || /wykonuje\s+Piętno bestii\s*[.!]/i.test(castText)
      ? skillEffects[264]
      : isSzadz || /wykonuje\s+Szadź\s*[.!]/i.test(castText) ? skillEffects[123] : null;
    if (castSpec && caster != null) addAreaEffect(caster,castSpec,target);
    // W oryginale akcja zużywa turę; dodatkowe ataki i SUM wymagają
    // definicji skilli, więc nie odliczamy ich na ślepo.
  }
  let receivedLogs = 0;
  const observedLogKeys = new Map();
  const observedSkillIds = new Map();
  const recentEffectLogs = [];
  function consumeLog(line) {
    receivedLogs++;
    const log = parseLog(line), txt = log.values.txt || '';
    if (/piętno|pietno|szadź|szadz|kląt|oslep|oślep|legbon_glare|legbon_curse|mcurse|skillId=264|skillId=123/i.test(String(line))) {
      recentEffectLogs.push(String(line).slice(0,1200));
      if (recentEffectLogs.length > 30) recentEffectLogs.shift();
    }
    for (const k of Object.keys(log.values)) if (k !== "txt") observedLogKeys.set(k, (observedLogKeys.get(k) || 0) + 1);
    if (log.values.skillId !== undefined) observedSkillIds.set(String(log.values.skillId), (observedSkillIds.get(String(log.values.skillId)) || 0) + 1);
    if (log.values.step !== undefined || log.values.tspell !== undefined || log.values.skillId !== undefined || /(?:\+|-)(?:dmg|dmgf|dmgl|dmgc|dmgd)=|utrata tury/i.test(String(line))) {
      recentTurnLogs.push({caster:log.casterId, target:log.targetId, keys:Object.keys(log.values).slice(0,12), raw:String(line).slice(0,350)});
      if (recentTurnLogs.length > 35) recentTurnLogs.shift();
    }
    const loss = String(txt).match(/^(.*?)\s+-\s+utrata tury/i);
    if (loss) {
      const who = Object.values(state.warriors).find(w => w.name === loss[1].trim());
      if (who) {
        const entry = ensureEffectWarrior(who.id);
        // Najpierw ogłuszenie, potem curse/glare/distract.
        const wasStunned = Number(who.stunned) > 0;
        if (wasStunned) who.stunned--;
        else for (const k of ['curse_status','blind_status','disturb_status']) entry.effects.delete(k);
        lastActionMarkers.set(String(who.id),(lastActionMarkers.get(String(who.id))||0)+1);
        advanceEffects(who.id, wasStunned);
      }
    }
    recordHealing(log);
    applyBattleEffects(log);
    const turn = txt.match(/Turn:(\d+) \/ Time:(.*?) \/ WrrTurn:(\d+) \/ (.*) \//);
    if (turn) { state.turn = Number(turn[1]); state.time = Number(turn[2]) || 0; }
    // Sam parser logu nie odtwarza efektów bez pełnych danych wojowników i definicji skilli.
    // Nie zgadujemy czasu trwania efektów z tekstu komunikatu.
  }

  function teamEffects(team) {
    const members = Object.values(state.warriors).filter(w => team == null || String(w.team) === String(team));
    const found = [];
    for (const w of members) for (const ef of (w.effects || [])) {
      found.push({ ...ef, warriorName: w.name, own: settings.highlightOwnEffects &&
        String(ef.casterId) === String(window.hero?.d?.id ?? window.hero?.id ?? '') });
    }
    return found;
  }

  function render() {
    if (!win) return;
    const body = document.querySelector('.fr-th #fr-th-body') || root?.querySelector?.('#fr-th-body');
    if (!body) return;
    mountGear(body.closest('.c-window'));
    const warriors = state.warriors;
    const me = warriors[String(window.hero?.d?.id ?? window.hero?.id ?? '')];
    const queue = state.queue.map(id => warriors[String(id)]).filter(Boolean);
    // Hero team is authoritative; packet.myteam can be missing or stale.
    const ownTeam = me?.team ?? state.ownTeam;
    const heroId = String(window.hero?.d?.id ?? window.hero?.id ?? '');
    const inferredEnemy = state.enemyTeam ?? Object.values(warriors).find(w => ownTeam != null && w.team != null && String(w.team) !== String(ownTeam))?.team;
    const ally = [], enemy = [];
    const allyRescue = [], enemyRescue = [];
    const myId = String(window.hero?.d?.id ?? window.hero?.id ?? '');
    const belongsToAlly = (id, w) => {
      if (String(id) === myId) return true;
      if (ownTeam != null && w?.team != null) return String(w.team) === String(ownTeam);
      if (inferredEnemy != null && w?.team != null) return String(w.team) !== String(inferredEnemy);
      // For solo battles the player is the only ally. Do not infer from caster.
      return false;
    };
    for (const [id,w] of Object.entries(warriors)) {
      const tracked = effectState.get(String(id));
      const list = tracked ? [...tracked.effects.values()] : (w.effects || []);
      const output = belongsToAlly(id,w) ? ally : enemy;
      for (const ef of list) {
        if (/legbon_holytouch|dotyk anioła/i.test(`${ef.name || ''} ${ef.friendlyName || ''}`)) continue;
        output.push({...ef, targetId:id, warriorName:w.name,
        own:String(ef.casterId) === myId,
        maxDuration:ef.duration ?? ef.maxDuration,
        remaining:ef.remaining ?? ((ef.maxDuration ?? 0) - (ef.elapsed ?? 0))});
      }
      const rescue = healCounters.get(String(id))?.lastRescue || w.usedLastHeal;
      if (rescue) {
        w.usedLastHeal = true;
        const rescueOutput = belongsToAlly(id,w) ? allyRescue : enemyRescue;
        rescueOutput.push({id:'legbon_lastheal_used', friendlyName:'Ostatni ratunek — wykorzystany',
          targetId:id, warriorName:w.name, maxDuration:0, remaining:null, own:false});
      }
    }
    // Ostatni ratunek jest stanem zużycia, a nie efektem z czasem trwania.
    // Show a character only after their first actual healing action.
    // Never call healingRecord() while rendering: it would create empty rows.
    const healingHtml = (isAlly) => {
      const rows = Object.entries(warriors).filter(([id,w]) => {
        if (belongsToAlly(id,w) !== isAlly) return false;
        const h = healCounters.get(String(id));
        return h && (h.single > 0 || h.group > 0 || h.bandage > 0);
      });
      return rows.map(([id,w]) => {
        const h = healCounters.get(String(id));
        const used = [h.single && `leczenia ${h.single}`, h.group && `grupowe ${h.group}`, h.bandage && `bandaże ${h.bandage}`].filter(Boolean);
        return `<div><span class="gold">${esc(w.name)}</span>: ${used.join(' · ')}</div>`;
      }).join('');
    };
    const allyHealing = healingHtml(true), enemyHealing = healingHtml(false);

    const critical = [];
    const prepared = Object.values(warriors).find(w => w.prepared);
    if (prepared) critical.push(`<div class="warn">${esc(prepared.prepared)}</div>`);
    if (me?.disabled) critical.push(`<div class="warn">Utrata tury (${esc(me.disableSource)})</div>`);

    if (me?.stunned) critical.push(`<div class="warn">Stun: ${me.stunned}</div>`);
    const queueHtml = queue.map(w => `<span class="pill ${w.team===ownTeam?'ally':'enemy'}">${esc(w.name)}</span>`).join('') || '<span class="muted">Brak danych kolejki</span>';
    const effectHtml = (list) => list.map(e => `<div><span class="gold">${esc(e.warriorName)}:</span> <span class="${e.own?'own':''}">${esc(e.friendlyName || e.name)}</span>${e.maxDuration ? ` <span class="muted">(${Math.max(0,Number(e.remaining ?? (e.maxDuration-e.elapsed)))} tur)</span>` : ''}</div>`).join('') || '<span class="muted">Brak rozpoznanych efektów</span>';
    body.innerHTML = `
      <div class="row fr-header"><span class="gold">TitanHelper</span></div>
      
      ${settings.showCriticalInfo?`<div class="section"><div class="gold">Ważne informacje</div>${critical.join('')||'<span class="muted">Brak</span>'}</div>`:''}
      ${settings.showTeamEffects?`<div class="section"><div class="gold">Efekty Twojej drużyny</div>${effectHtml(ally)}</div><div class="section"><div class="gold">Efekty przeciwników</div>${effectHtml(enemy)}</div>`:''}
      ${state.active && (allyRescue.length || enemyRescue.length) ? `<div class="section"><div class="gold">Ostatni ratunek — wykorzystany</div>${allyRescue.length ? `<div class="gold">Twoja drużyna</div>${effectHtml(allyRescue)}` : ''}${enemyRescue.length ? `<div class="gold">Przeciwnicy</div>${effectHtml(enemyRescue)}` : ''}</div>` : ''}
      ${settings.showHealingCounters && allyHealing ? `<div class="section"><div class="gold">Leki Twojej drużyny</div>${allyHealing}</div>` : ''}
      ${settings.showHealingCounters && enemyHealing ? `<div class="section"><div class="gold">Leki drużyny przeciwnej</div>${enemyHealing}</div>` : ''}
      ${settings.settingsOpen ? `<div class="section fr-settings-panel"><div class="gold">Ustawienia</div>
        ${[['showCriticalInfo','Ważne informacje'],['showTeamEffects','Efekty drużyn'],['showHealingCounters','Liczniki leczenia'],['highlightOwnEffects','Podświetl moje efekty'],['showExactHealth','Dokładne HP'],['showEnemyArmor','Pancerz przeciwników'],['showEnemyResources','Mana i energia przeciwników']].map(([k,l])=>`<div class="checkbox-custom c-checkbox"><input type="checkbox" id="fr-th-${k}" data-setting="${k}" ${settings[k]?'checked':''}><label class="c-checkbox__label" for="fr-th-${k}"><span class="fr-checkmark" aria-hidden="true"></span>${l}</label></div>`).join('')}
      </div>` : ''}`;

  }
  function scheduleRender() {
    if (renderQueued) return; renderQueued = true;
    requestAnimationFrame(() => { renderQueued = false; render(); });
  }

  const api = {
    ingest,
    parseLog,
    getDiagnostics: () => ({receivedLogs, trackedWarriors:effectState.size, trackedEffects:[...effectState.values()].reduce((n,v)=>n+v.effects.size,0), logKeys:[...observedLogKeys.entries()].sort((a,b)=>b[1]-a[1]).slice(0,25)}),
    getHealingCounters: () => [...healCounters.entries()].map(([id,v])=>({id,...v})),
    getEffectDebug: () => ({version:'0.5.34',recentEffectLogs:[...recentEffectLogs],skillIds:[...observedSkillIds],turnActions:recentTurnLogs.slice(-15),actionCounts:[...lastActionMarkers],warriors:Object.values(state.warriors).map(w=>({id:w.id,name:w.name,team:w.team}))}),
    getTrackedEffects: () => [...effectState.entries()].map(([id,v]) => ({id, effects:[...v.effects.values()]})),
    getState: () => typeof structuredClone === "function" ? structuredClone(state) : JSON.parse(JSON.stringify(state)),
    open: () => { localStorage.setItem('fr_manager_th_visible','true'); if (!win) nativeWindow(); else win.show?.(); render(); },
    close: () => { localStorage.setItem('fr_manager_th_visible','false'); win?.hide?.(); },
    version: '0.5.34'
  };
  window.__FROST_REAPER_TITAN__ = api;
  window.FrostReaperTitan = api;

  // Dane walki w oryginalnym TitanHelper+ pochodzą z komunikatu `f`.
  // Wersja samodzielna korzysta z gry, nie z Gargonem.
  const seen = new WeakSet();
  // Ten sam pakiet może przejść przez updateData i update; nie naliczaj tur podwójnie.
  const recentLogs = new Set();
  let logDedupScheduled = false;
  function acceptLogsOnce(fight) {
    if (!Array.isArray(fight.m) || !fight.m.length) return fight;
    if (!logDedupScheduled) {
      logDedupScheduled = true;
      setTimeout(() => { recentLogs.clear(); logDedupScheduled = false; }, 120);
    }
    const fresh = fight.m.filter(line => {
      const key = String(line);
      if (recentLogs.has(key)) return false;
      recentLogs.add(key);
      return true;
    });
    return { ...fight, m: fresh };
  }
  function forwardFight(payload) {
    if (!payload || typeof payload !== 'object') return;
    let fight = payload.f || payload;
    if (!fight || typeof fight !== 'object') return;
    if (!('w' in fight) && !('m' in fight) && !('turns_warriors' in fight) && !('init' in fight) && !('close' in fight)) return;
    try {
      if (fight.myteam !== undefined) state.ownTeam = Number(fight.myteam);
      if (state.ownTeam === 1 || state.ownTeam === 2) state.enemyTeam = state.ownTeam === 1 ? 2 : 1;
      if (fight.w && typeof fight.w === 'object') {
        const normalized = {};
        for (const [id, data] of Object.entries(fight.w)) {
          if (!data || typeof data !== 'object') continue;
          normalized[id] = { ...data, id, name: data.name || data.nick, team: Number(data.team), hp: data.hp };
        }
        fight = { ...fight, w: normalized };
      }
      ingest(acceptLogsOnce(fight));
    } catch (err) { console.warn('[Frost Reaper Titan] Nie udało się przetworzyć danych walki:', err); }
  }
  function hookMethod(object, name, packetIndex = 0) {
    if (!object || typeof object[name] !== 'function') return false;
    const original = object[name];
    if (original.__frTitanHook) return true;
    const wrapped = function(...args) {
      const result = original.apply(this, args);
      try { forwardFight(args[packetIndex]); } catch (_) {}
      return result;
    };
    wrapped.__frTitanHook = true;
    try { object[name] = wrapped; return object[name] === wrapped; } catch (_) { return false; }
  }
  function hookFight() {
    const E = window.Engine;
    if (!E) return;
    // Najbardziej bezpośrednia ścieżka w Margonem NI.
    hookMethod(E.battle, 'updateData');
    // Starsze warianty udostępniają callback odbierający pakiety `f`.
    hookMethod(E.battle, 'update');
    // Nie przechwytujemy fetch, XHR ani żądań uwierzytelniania.
    // Jeśli gra udostępnia aktualny snapshot, pobieramy go również po wejściu w walkę.
    const current = E.battle?.getData?.() || E.battle?.data;
    if (current && typeof current === 'object' && current !== lastSnapshot) {
      lastSnapshot = current;
      forwardFight(current);
    }
  }
  let lastSnapshot = null;
  setInterval(hookFight, 350);
  window.FrostReaperTitan.forwardFight = forwardFight;

  // TitanHelper+ source: get(warrior) + tooltip injection for #troopID / .other-id-battle-ID .canvas-warrior-icon.
  // Independent implementation: uses only game DOM and our own warrior snapshot.
  const tooltipStyle = document.createElement('style');
  tooltipStyle.textContent = `
    .fr-th-tooltip{color:#f5e9ce!important;font:12px/1.45 Arial,sans-serif!important;
      padding:5px 7px;border-top:1px solid #a88a55;white-space:normal;max-width:270px}
    .fr-th-tooltip .fr-gold{color:#e8c16b!important;font-weight:bold}
    .fr-th-tooltip .fr-good{color:#83df92!important}
    .fr-th-tooltip .fr-bad{color:#ff9797!important}
    .fr-th-tooltip *{color:inherit}
  `;
  document.head.appendChild(tooltipStyle);

  function findWarriorIcon(id) {
    const safe = String(id).replace(/[^0-9-]/g, '');
    if (!safe) return null;
    return document.querySelector(`.other-id-battle-${safe} .canvas-warrior-icon`) ||
           document.getElementById(`troop${safe}`) ||
           document.querySelector(`.other-id-battle-${safe}`);
  }
  function statsHtml(w) {
    const parts = [];
    const hp = w.hp;
    if (settings.showExactHealth && hp != null) {
      if (typeof hp === 'object') {
        const cur = hp.cur ?? hp.current;
        const max = hp.max ?? hp.maximum;
        if (cur != null && max != null) parts.push(`<div class="fr-gold">Życie: ${esc(cur)} / ${esc(max)}</div>`);
        if (hp.hpp != null) parts.push(`<div>HP: ${esc(hp.hpp)}%</div>`);
      } else if (Number.isFinite(Number(hp))) parts.push(`<div class="fr-gold">HP: ${esc(hp)}</div>`);
    }
    if (settings.showEnemyArmor) {
      const hero = state.warriors[String(window.hero?.d?.id ?? window.hero?.id ?? '')];
      const myTeam = hero?.team ?? state.ownTeam;
      if (String(w.id) !== String(window.hero?.d?.id ?? window.hero?.id ?? '') &&
          (myTeam == null || String(w.team) !== String(myTeam))) {
        const armor = typeof w.armor === 'object' && w.armor !== null
          ? (w.armor.current ?? w.armor.cur ?? w.armor.value) : w.armor;
        if (armor != null && Number.isFinite(Number(armor))) parts.push(`<div class="fr-gold">Pancerz: ${esc(armor)}</div>`);
      }
    }
    if (settings.showEnemyResources) {
      const hero = state.warriors[String(window.hero?.d?.id ?? window.hero?.id ?? '')];
      const myTeam = hero?.team ?? state.ownTeam;
      const isEnemy = String(w.id) !== String(window.hero?.d?.id ?? window.hero?.id ?? '') &&
        myTeam != null && w.team != null && String(w.team) !== String(myTeam);
      if (isEnemy) {
        for (const [label, resource] of [['Mana',w.mana],['Energia',w.energy]]) {
          if (resource == null) continue;
          if (typeof resource === 'object') {
            const current = resource.current ?? resource.cur ?? resource.value;
            const max = resource.max ?? resource.maximum;
            if (current != null && Number.isFinite(Number(current)))
              parts.push(`<div class="fr-gold">${label}: ${esc(current)}${max != null ? ` / ${esc(max)}` : ''}</div>`);
          } else if (Number.isFinite(Number(resource))) {
            parts.push(`<div class="fr-gold">${label}: ${esc(resource)}</div>`);
          }
        }
      }
    }
    const extra = [['sa','SA'],['at','AT'],['combo','Kombinacja'],['frenzy','Szał']];
    for (const [key,label] of extra) if (w[key] != null && typeof w[key] !== 'object')
      parts.push(`<div>${label}: <span class="fr-gold">${esc(w[key])}</span></div>`);
    if (w.stunned > 0) parts.push(`<div class="fr-bad">Stun: ${esc(w.stunned)}</div>`);
    if (w.disabled) parts.push(`<div class="fr-bad">Utrata tury ${esc(w.disableSource || '')}</div>`);
    if (w.prepared) parts.push(`<div class="fr-bad">${esc(w.prepared)}</div>`);
    if (settings.showTeamEffects) {
      const tracked = effectState.get(String(w.id));
      const effects = tracked ? [...tracked.effects.values()] : (w.effects || []);
      for (const e of effects) {
        if (/legbon_holytouch|dotyk anioła/i.test(`${e.name || ''} ${e.friendlyName || ''}`)) continue;
        const cls = e.casterTeam != null && w.team != null && String(e.casterTeam) === String(w.team) ? 'fr-good' : 'fr-bad';
        const remaining = e.remaining ?? (e.maxDuration != null ? e.maxDuration - (e.elapsed || 0) : null);
        parts.push(`<div class="${cls}">${esc(e.friendlyName || e.name)}${remaining != null ? ` (${Math.max(0, Number(remaining))} tur)` : ''}</div>`);
      }
    }
    return parts.join('');
  }
  // Tak jak w TitanHelper+: modyfikujemy dane tipa przypięte do portretu,
  // a NIE szukamy osobnego, widocznego kontenera tooltip.
  const tipBase = new WeakMap();
  function updateWarriorTooltips() {
    const jq = window.$;
    for (const w of Object.values(state.warriors)) {
      const el = findWarriorIcon(w.id);
      if (!el) continue;
      const $el = typeof jq === 'function' ? jq(el) : null;
      let original = '';
      try { original = $el?.getTipData?.() || ''; } catch (_) {}
      if (typeof original !== 'string') original = String(original || '');
      if (!original) original = el.getAttribute('tip') || el.getAttribute('data-tip') || '';
      if (!original && !tipBase.has(el)) continue;
      // W razie ponownego użycia DOM przez grę aktualizuj bazową treść.
      if (original && !original.includes('<frostReaperEffects>')) tipBase.set(el, original);
      const base = (tipBase.get(el) || original).replace(/<frostReaperEffects>[\s\S]*?<\/frostReaperEffects>/g, '');
      const tracked = effectState.get(String(w.id));
      const effects = tracked ? [...tracked.effects.values()] : (w.effects || []);
      const lines = effects.filter(e => !/legbon_holytouch|dotyk anioła/i.test(`${e.name || ''} ${e.friendlyName || ''}`)).map(e => {
        const remaining = e.remaining ?? (e.maxDuration != null ? e.maxDuration - (e.elapsed || 0) : null);
        return `<div style="color:#e8c16b">${esc(e.friendlyName || e.name)}${remaining != null ? ` — ${Math.max(0,Number(remaining))} tur` : ''}</div>`;
      });
      const h = healCounters.get(String(w.id));
      if (h?.lastRescue || w.usedLastHeal) lines.push('<div style="color:#ff9797">Ostatni ratunek: wykorzystany</div>');
      if (h && (h.single || h.group || h.bandage)) lines.push(`<div>Leczenia: ${h.single} · grupowe: ${h.group} · bandaże: ${h.bandage}</div>`);
      const tip = base + (lines.length ? `<frostReaperEffects>${lines.join('')}</frostReaperEffects>` : '');
      if (tip === original) continue;
      try {
        if ($el?.tip) $el.tip(tip);
        else { el.setAttribute('data-tip',tip); el.setAttribute('tip',tip); }
      } catch (_) { el.setAttribute('data-tip',tip); }
    }
  }
  setInterval(updateWarriorTooltips, 300);

  const boot = () => {
    if (nativeWindow()) {
      const observer = new MutationObserver(() => { if (!document.querySelector('.fr-th #fr-th-body')) return; installControls(); });
      observer.observe(document.body, { childList: true, subtree: true });
    } else setTimeout(boot, 1000);
  };
  boot();
})();
