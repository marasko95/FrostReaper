// ==UserScript==
// @name         Frost Reaper - Menedzer dodatkow
// @namespace    frost-reaper
// @version      0.3.7
// @updateURL    https://raw.githubusercontent.com/marasko95/FrostReaper/main/FrostReaper_Manager.user.js
// @downloadURL  https://raw.githubusercontent.com/marasko95/FrostReaper/main/FrostReaper_Manager.user.js
// @description  Frost Reaper Manager z wbudowana Ulepszarka (jeden skrypt).
// @match        *://*.margonem.pl/*
// @match        *://margonem.pl/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
(() => {
  'use strict';
  if (window.__FROST_REAPER_MANAGER__) return;
  const KEY = 'fr_manager_settings';
  let settings; try { settings = { settingsOpen:false, addonsTab:'active', upgradeEnabled:true, ...JSON.parse(localStorage.getItem(KEY)||'{}') }; } catch (_) { settings = {settingsOpen:false,addonsTab:'active',upgradeEnabled:true}; }
  const save = () => localStorage.setItem(KEY,JSON.stringify(settings));
  // Podpisy kamieni: niezalezne od widocznosci KCS, domyslnie wylaczone.
  const TELEPORT_SHORT_LABELS = Object.freeze({
        'Źródło Narumi': 'MAZ',
        'Krater Uwięzienia': 'TELL',
        'Las Tropicieli': 'KOTO',
        'Przeklęta Strażnica': 'SHAE',
        'Schowek na Łupy': 'ZORG',
        'Podmokła Dolina': 'WŁAD',
        'Pieczara Kwiku': 'TYRT',
        'Skalne Turnie': 'TOL',
        'Stary Kupiecki Trakt': 'ALIAS',
        'Mokra Grota': 'AGAR',
        'Stare Wyrobisko': 'RAZIU',
        'Lazurytowa Grota': 'KOB',
        'Kopalnia Kapiącego Miodu': 'MATKA',
        'Jaskinia Gnollich Szamanów': 'KOZUG',
        'Kamienna Jaskinia': 'JOTUN',
        'Głębokie Skałki': 'TOLE',
        'Krypty Dusz Śniegu': 'LISZ',
        'Erem Czarnego Słońca': 'GRAB',
        'Firnowa Grota': 'STOPA',
        'Świątynia Andarum': 'ZBROJ',
        'Wylęgarnia Choukkerów': 'CHOUK',
        'Kopalnia Margorii': 'NADZO',
        'Margoria': 'MORTH',
        'Zapomniany Święty Gaj': 'WIDMO',
        'Grota Samotnych Dusz': 'OHYD',
        'Kamienna Strażnica': 'GOPA',
        'Zagrzybiałe Ścieżki': 'GNOM',
        'Dolina Centaurów': 'CENT',
        'Las Dziwów': 'KAMB',
        'Podziemia Zniszczonej Wieży': 'JERT',
        'Skalne Cmentarzysko': 'Ł.CZ',
        'Piramida Pustynnego Władcy': 'OZIR',
        'Opuszczony statek': 'KRAB',
        'Wulkan Politraki': 'ARC',
        'Ukryta Grota Morskich Diabłów': 'PIRAT',
        'Kuźnia Worundriela': 'WOREK',
        'Cenotaf Berserkerów': 'AMUNO',
        'Mała Twierdza': 'FODUG',
        'Lokum Złych Goblinów': 'GONS',
        'Laboratorium Adariel': 'ADA',
        'Grota Orczej Hordy': 'BUREK',
        'Grota Orczych Szamanów': 'SHEBA',
        'Nawiedzone Kazamaty': 'DWK',
        'Sala Rady Orków': 'SK',
        'Sala Królewska': 'GRUBA',
        'Ogrza Kawerna': 'OGR',
        'Drzewo Dusz': 'CHRYZ',
        'Krypty Bezsennych': 'TORKA',
        'Przysiółek Valmirów': 'BREH',
        'Szlamowe Kanały': 'MYSZ',
        'Przerażające Sypialnie': 'SADO',
        'Tajemnicza Siedziba': 'SEKTA',
        'Sale Rozdzierania': 'BERGA',
        'Sala Tysiąca Świec': 'ZUF',
        'Zalana Grota': 'FURB',
        'Arachnitopia': 'P5',
        'Ołtarz Pajęczej Bogini': 'MARLL',
        'Gnijące Topielisko': 'ARYT',
        'Jaszczurze Korytarze': 'MOCNY',
        'Gardziel Podgnitych Mchów': 'FANG',
        'Źródło Zakorzenionego Ludu': 'DENDR',
        'Złota Góra': 'TOLY',
        'Niecka Xiuh Atl': 'CIUT',
        'Potępione Zamczysko': 'SYBA',
        'Pustynne Katakumby - Komnata Gwałtownej Śmierci': 'CHOP',
        'Grobowiec Seta': 'SET',
        'Urwisko Vapora': 'TER',
        'Świątynia Hebrehotha - sala ofiary': 'VERA',
        'Świątynia Hebrehotha - sala czciciela': 'CHAE',
        'Świątynia Hebrehotha - przedsionek': 'PUST',
        'Drzewo Życia': 'NYMF',
        'Sala Lodowej Magii': 'ART',
        'Sala Mroźnych Strzał': 'FUR',
        'Sala Mroźnych Szeptów': 'ZOR'
    });
  const labelLookup = new Map(Object.entries(TELEPORT_SHORT_LABELS).map(([map, label]) => [map.replace(/\s+/g, ' ').trim().toLowerCase(), label.slice(0,5)]));
  const managedStoneLabels = new Set();
  function clearStoneLabels(){
    for (const item of managedStoneLabels) item.querySelector?.(':scope > .fr-manager-stone-label')?.remove();
    managedStoneLabels.clear();
    document.querySelectorAll('.fr-manager-stone-label').forEach(el => el.remove());
  }
  function getStoneMap(el){
    const sources = [el, ...el.querySelectorAll('[tip],[tip-id],[data-tip]')];
    for (const source of sources){
      const tipId = source.getAttribute('tip-id');
      const html = source.getAttribute('tip') || source.getAttribute('data-tip') || (tipId && window.TIPS?.allTips?.[tipId]);
      if (!html) continue;
      let text;
      try { text = new DOMParser().parseFromString(String(html), 'text/html').body.textContent || ''; }
      catch (_) { text = String(html).replace(/<[^>]*>/g,' '); }
      const match = text.replace(/\u00a0/g,' ').replace(/\s+/g,' ').match(/Teleportuje\s+Posta[cć]\s+na\s+map[eę]\s*:\s*(.+?)\s*\(\s*\d+\s*,\s*\d+\s*\)/i);
      if (match) return match[1].trim().toLowerCase();
    }
    return '';
  }
  function syncStoneLabels(){
    if (!settings.stoneLabelsEnabled){ clearStoneLabels(); return; }
    const found = new Set();
    const selectors = '.item[tip],.item[tip-id],.item[data-tip],.inventory-item,.inventory-grid [class*="item-id-"],.inventory-grid [tip-id],.inventory-grid [tip],.inventory-grid [data-tip],[data-window-name="inventory"] [tip-id],[data-window-name="inventory"] [tip],[data-window-name="inventory"] [data-tip]';
    const seen = new Set();
    for (const candidate of document.querySelectorAll(selectors)){
      const item = candidate.closest('.inventory-item,[class*="item-id-"],[data-item-id]') || candidate;
      if (seen.has(item) || item.closest('#e2-teleport-slot')) continue;
      seen.add(item);
      const label = labelLookup.get(getStoneMap(item));
      const own = item.querySelector(':scope > .fr-manager-stone-label');
      if (!label || item.querySelector('.custom-teleport-desc')){ own?.remove(); continue; }
      found.add(item);
      if (getComputedStyle(item).position === 'static') item.style.setProperty('position','relative');
      const node = own || document.createElement('span');
      if (!own){node.className='fr-manager-stone-label';item.appendChild(node);}
      if (node.textContent !== label) node.textContent = label;
    }
    for (const item of managedStoneLabels) if (!found.has(item)) item.querySelector(':scope > .fr-manager-stone-label')?.remove();
    managedStoneLabels.clear();
    for (const item of found) managedStoneLabels.add(item);
  }
  setInterval(syncStoneLabels,1200);
  window.addEventListener('focus',syncStoneLabels);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncStoneLabels();});

  let wnd, el;
  const css = document.createElement('style');
  css.textContent = `
    /* Podpisy kamieni sa osobnym dodatkiem zarzadzanym przez Managera. */
    .fr-manager-stone-label{position:absolute!important;top:0!important;left:0!important;right:0!important;width:100%!important;z-index:7!important;pointer-events:none!important;color:#fff!important;font:900 9px/11px Arial,sans-serif!important;overflow:hidden!important;text-align:center!important;white-space:nowrap!important;letter-spacing:-.4px!important;text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000,0 0 3px #000!important}

    .fr-manager-window{min-width:290px!important}
    .fr-manager-window .fr-mgr{font:12px/1.5 Arial,sans-serif;color:#e8d7b2;padding:4px 6px;min-width:260px}
    .fr-manager-window .fr-mgr-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 4px;border-bottom:1px solid rgba(205,169,100,.3)}
    .fr-manager-window .fr-mgr-title{color:#d9b66d;font-weight:bold}
    .fr-manager-window .fr-mgr-muted{color:#a99e8a;font-size:11px}
    .fr-manager-window .fr-mgr-toggle{appearance:none;width:32px;height:17px;border-radius:10px;background:#44392b;border:1px solid #9b7c48;cursor:pointer;position:relative;flex-shrink:0}
    .fr-manager-window .fr-mgr-toggle:before{content:'';position:absolute;top:2px;left:2px;width:11px;height:11px;border-radius:50%;background:#b3a28a;transition:left .15s}
    .fr-manager-window .fr-mgr-toggle:checked{background:#66502c}
    .fr-manager-window .fr-mgr-toggle:checked:before{left:17px;background:#efcf84}
    .fr-manager-window .fr-mgr-toggle:disabled{opacity:.35;cursor:not-allowed}
    .fr-manager-window .fr-mgr-reset{background:#453625;color:#e8d7b2;border:1px solid #9b7c48;padding:5px;cursor:pointer;margin-left:8px}
    .fr-manager-window > .collapse{left:auto!important;right:7px!important;top:3px!important;position:absolute!important;transform:none!important;z-index:1000!important}
    /* Zwinięty Manager = kwadrat 28x28 px i JEDYNY przycisk rozwijania.
       Ukrywamy całe wnętrze, a nie tylko znane klasy nagłówka. */
    .fr-manager-window.fr-manager-compact{
      position:fixed!important;
      width:42px!important;min-width:42px!important;max-width:42px!important;
      height:32px!important;min-height:32px!important;max-height:32px!important;
      padding:0!important;margin:0!important;box-sizing:border-box!important;
      overflow:hidden!important;
      background:linear-gradient(145deg,#35302a,#171b20)!important;
      border:2px solid #d9b56c!important;
      border-radius:7px!important;
      box-shadow:0 0 0 1px #18110a,0 0 12px rgba(237,184,75,.65),0 3px 9px rgba(0,0,0,.85)!important;
      cursor:grab!important;
    }
    .fr-manager-window.fr-manager-compact.fr-manager-dragging{cursor:grabbing!important}
    .fr-manager-window.fr-manager-compact > :not(.collapse){display:none!important}
    .fr-manager-window.fr-manager-compact::before{
      content:'FRM'!important;display:block!important;position:absolute!important;
      left:0!important;top:50%!important;width:100%!important;
      transform:translateY(-50%)!important;text-align:center!important;
      color:#ffe1a1!important;white-space:nowrap!important;
      font:700 12px/16px Georgia,'Times New Roman',serif!important;letter-spacing:.6px!important;
      text-shadow:0 1px 2px #000,0 0 5px rgba(245,198,104,.5)!important;
      pointer-events:none!important;z-index:1001!important;
    }
    .fr-manager-window.fr-manager-compact::after{content:none!important;display:none!important}
    /* Tylko złote tło/ramka: niewidoczny przycisk rozwijania po prawej.
       Lewa część nadal służy do przeciągania. */
    .fr-manager-window.fr-manager-compact > .collapse{
      display:block!important;position:absolute!important;
      width:20px!important;min-width:20px!important;max-width:20px!important;
      height:26px!important;min-height:26px!important;max-height:26px!important;
      left:auto!important;right:0!important;top:1px!important;bottom:auto!important;
      margin:0!important;padding:0!important;transform:none!important;
      background-image:initial!important;
      border:0!important;box-shadow:none!important;outline:0!important;
      color:inherit!important;font-size:inherit!important;
      opacity:1!important;visibility:visible!important;cursor:pointer!important;
      z-index:1000!important;
    }

    .fr-manager-window.fr-manager-compact::after{
      content:none!important;display:none!important;
    }


    /* Wbudowany moduł Ulepszarki — cały interfejs wewnątrz Managera. */
    .fr-manager-window:not(.fr-manager-compact){min-width:340px!important;max-width:min(92vw,510px)!important}
    .fr-manager-window .fr-mgr{min-width:0!important}
    .fr-manager-window #fr-manager-body{max-height:min(80vh,720px);overflow-y:auto;overflow-x:hidden}
    .fr-manager-window .fr-tabs{display:flex;gap:6px;padding:5px 0 9px;border-bottom:1px solid #9b7c48}
    .fr-manager-window .fr-tab{flex:1;background:#2d2925;border:1px solid #84673d;color:#e5cc93;padding:7px;cursor:pointer;border-radius:4px}
    .fr-manager-window .fr-tab.active{background:#604522;border-color:#d9b66d}
    .fr-manager-window .fr-mgr-action{background:#463524;border:1px solid #a8884f;color:#f2d8a1;border-radius:4px;padding:5px 8px;cursor:pointer}
    .fr-manager-window .fr-mgr-action:disabled{opacity:.45;cursor:not-allowed}
    .fr-manager-window .fr-mgr-note{font-size:11px;color:#b8a789;padding:9px 4px;line-height:1.5}
    .fr-manager-window .fr-upgrade-slot{padding:6px 0;min-width:0;overflow:visible}
    .fr-manager-window #garbaty-ulepszara.fr-upgrade-docked{
      position:relative!important;left:auto!important;top:auto!important;right:auto!important;bottom:auto!important;
      width:100%!important;max-width:100%!important;min-width:0!important;
      height:auto!important;max-height:none!important;margin:0!important;
      transform:none!important;z-index:auto!important;box-sizing:border-box!important;
    }
    .fr-manager-window #garbaty-ulepszara.fr-upgrade-docked .gu-header{cursor:default!important}
  `;
  document.head.appendChild(css);
  const gearSVG = '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" fill="currentColor"><path d="M19.14 12.94a7.4 7.4 0 0 0 .05-1.88l2-1.55-2-3.46-2.35.95a7.4 7.4 0 0 0-1.63-.94L14.85 3h-4l-.36 3.06a7.4 7.4 0 0 0-1.63.94l-2.35-.95-2 3.46 2 1.55a7.4 7.4 0 0 0 0 1.88l-2 1.55 2 3.46 2.35-.95c.5.4 1.05.71 1.63.94L10.85 21h4l.36-3.06c.58-.23 1.13-.54 1.63-.94l2.35.95 2-3.46-2.05-1.55ZM12.85 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"/></svg>';
  function syncCompactGear() {
    if (!el) return;
    const gear = el.querySelector('.fr-manager-gear');
    if (!gear) return;
    // Inline !important: starszy kod nadpisywał display:none z CSS.
    gear.style.setProperty('display', settings.collapsed ? 'none' : 'flex', 'important');
    gear.style.setProperty('visibility', settings.collapsed ? 'hidden' : 'visible', 'important');
    gear.style.setProperty('pointer-events', settings.collapsed ? 'none' : 'auto', 'important');
  }
  const addonNames = {th:'TitanHelper',as:'AutoSkill',kcs:'Szybki KCS'};
  function upgradeEnabled(){return settings.upgradeEnabled !== false;}
  function setUpgradeEnabled(enabled){
    settings.upgradeEnabled=Boolean(enabled);save();
    if(enabled){
      if(!window.FrostReaperUlepszarka) window.__FR_START_UPGRADE__?.();
    } else {
      window.FrostReaperUlepszarka?.destroy?.();
    }
    draw();
  }
  function setExternalVisible(id,visible){
    const api = id==='th'?window.FrostReaperTitan:id==='as'?window.AutoSkillPvP:window.FrostReaperKCS;
    localStorage.setItem('fr_manager_'+id+'_visible',String(visible));
    if(id==='th'){if(visible)api?.open?.();else api?.close?.();}
    else {if(visible)api?.showWidget?.();else api?.hideWidget?.();}
  }
  let upgradePanel = null;
  let upgradeObserver = null;
  function dockUlepszarka() {
    const slot = document.getElementById('fr-upgrade-slot');
    if (!slot) {
      const panel=document.getElementById('garbaty-ulepszara');
      if(panel) panel.style.setProperty('display','none','important');
      return;
    }
    const found = document.getElementById('garbaty-ulepszara');
    if (!found) {
      if (!slot.querySelector('.fr-mgr-muted')) {
        slot.innerHTML = '<div class="fr-mgr-muted">Ładowanie wbudowanej Ulepszarki…</div>';
      }
      slot.style.display = settings.upgradeOpen === false ? 'none' : 'block';
      return;
    }
    if (found.parentElement !== slot) {
      slot.replaceChildren(found);
    }
    upgradePanel = found;
    found.classList.add('fr-upgrade-docked');
    found.style.setProperty('position','relative','important');
    found.style.setProperty('left','auto','important');
    found.style.setProperty('top','auto','important');
    found.style.setProperty('right','auto','important');
    found.style.setProperty('bottom','auto','important');
    found.style.setProperty('transform','none','important');
    found.style.setProperty('display','block','important');
    slot.style.display = settings.upgradeOpen === false ? 'none' : 'block';
  }
  function draw(){
    const body = document.getElementById('fr-manager-body'); if (!body) return;
    const thOn = localStorage.getItem('fr_manager_th_visible') !== 'false';
    const asOn = localStorage.getItem('fr_manager_as_visible') !== 'false';
    const kcsOn = localStorage.getItem('fr_manager_kcs_visible') !== 'false';
    const kcs = window.FrostReaperKCS;
    // Zachowaj żywy DOM Ulepszarki: jego usunięcie zerwałoby nasłuchy i konfigurację.
    const existingUpgrade = document.getElementById('garbaty-ulepszara');
    if (existingUpgrade && existingUpgrade.parentElement?.id === 'fr-upgrade-slot') {
      document.body.appendChild(existingUpgrade);
    }
    const tab = settings.addonsTab === 'install' ? 'install' : 'active';
    const installed = {th:!!window.FrostReaperTitan,as:!!window.AutoSkillPvP,kcs:!!window.FrostReaperKCS};
    const moduleRow=(id,name,desc)=>`<div class="fr-mgr-row"><div><div class="fr-mgr-title">${name}</div><div class="fr-mgr-muted">${desc}</div></div><input class="fr-mgr-toggle" type="checkbox" data-fr-module="${id}" ${localStorage.getItem('fr_manager_'+id+'_visible')!=='false'?'checked':''} ${installed[id]?'':'disabled'} title="Widoczność okna"></div>`;
    const installRow=(id,name)=>`<div class="fr-mgr-row"><div><div class="fr-mgr-title">${name}</div><div class="fr-mgr-muted">${installed[id]?'Wykryto skrypt w grze':'Nie wykryto aktywnego skryptu'} • instalacja przez Tampermonkey</div></div><button class="fr-mgr-action" type="button" data-fr-action="install" data-fr-addon="${id}">Instaluj</button></div>`;
    body.innerHTML = `<div class="fr-mgr">
      <div class="fr-tabs"><button type="button" class="fr-tab ${tab==='active'?'active':''}" data-fr-action="tab" data-fr-tab="active">⚙ Dodatki</button><button type="button" class="fr-tab ${tab==='install'?'active':''}" data-fr-action="tab" data-fr-tab="install">↓ Instaluj</button></div>
      ${tab==='active'?`
        ${moduleRow('th','TitanHelper (TH)','Widoczność okna; działanie skryptu pozostaje aktywne')}
        ${moduleRow('as','Auto Skill (AS)','Widoczność okna; automat pozostaje aktywny')}
        <div class="fr-mgr-row"><div><div class="fr-mgr-title">Szybki KCS</div><div class="fr-mgr-muted">Widoczność kamienia; AUTO ustawiane osobno</div><button type="button" class="fr-mgr-reset" data-fr-action="kcs-settings" ${installed.kcs?'':'disabled'}>Ustawienia</button></div><input class="fr-mgr-toggle" type="checkbox" data-fr-module="kcs" ${localStorage.getItem('fr_manager_kcs_visible')!=='false'?'checked':''} ${installed.kcs?'':'disabled'}></div>
        <div class="fr-mgr-row"><div><div class="fr-mgr-title">Podpisy kamieni</div><div class="fr-mgr-muted">Krótkie skróty E2 w plecaku • bez miast</div></div><input class="fr-mgr-toggle" type="checkbox" data-fr-module="stone-labels" ${settings.stoneLabelsEnabled?'checked':''}></div>
        <div class="fr-mgr-row"><div><div class="fr-mgr-title">Ulepszarka</div><div class="fr-mgr-muted">${upgradeEnabled()?'Moduł uruchomiony':'Moduł wyłączony • bez automatu i nasłuchów'}</div></div><input class="fr-mgr-toggle" type="checkbox" data-fr-module="upgrade-enabled" ${upgradeEnabled()?'checked':''}></div>
        ${upgradeEnabled()?`<div class="fr-mgr-row"><div class="fr-mgr-title">Panel Ulepszarki</div><button type="button" class="fr-mgr-reset" data-fr-action="upgrade-toggle">${settings.upgradeOpen===false?'Rozwiń':'Zwiń'}</button></div><div id="fr-upgrade-slot" class="fr-upgrade-slot"></div>`:''}
        ${settings.settingsOpen?`<div class="fr-mgr-row"><div><div class="fr-mgr-title">KCS • AUTO</div><div class="fr-mgr-muted">${kcs?.isAutoRestricted?.()?'Niedostępne dla tej postaci':'Domyślnie wyłączone'}</div></div><input class="fr-mgr-toggle" type="checkbox" data-fr-module="kcs-auto" ${kcs?.getAutoEnabled?.()?'checked':''} ${!kcs||kcs?.isAutoRestricted?.()?'disabled':''}></div>
        <div class="fr-mgr-row"><div><div class="fr-mgr-title">KCS • Blokada pozycji</div></div><input class="fr-mgr-toggle" type="checkbox" data-fr-module="kcs-lock" ${kcs?.getLocked?.()?'checked':''} ${!kcs?'disabled':''}></div>
        <div class="fr-mgr-row"><div><div class="fr-mgr-title">KCS • Skrót klawiszowy</div><div class="fr-mgr-muted">${kcs?.getHotkey?.()||'Nie ustawiono'}</div></div><button type="button" class="fr-mgr-reset" data-fr-action="kcs-hotkey" ${kcs?'':'disabled'}>Ustaw</button></div>`:''}
      `:`
        <div class="fr-mgr-note">Instalator otwiera link do pliku .user.js w Tampermonkey. Sam Manager nie instaluje skryptów w tle. Podawaj tylko zaufane adresy.</div>
        ${installRow('th','TitanHelper (TH)')}
        ${installRow('as','Auto Skill (AS)')}
        ${installRow('kcs','Szybki KCS')}
        <div class="fr-mgr-row"><div><div class="fr-mgr-title">Ulepszarka</div><div class="fr-mgr-muted">Wbudowana w Managera • nie wymaga instalacji</div></div><span class="fr-mgr-muted">✓ Wbudowana</span></div>
      `}
      ${settings.settingsOpen?`<div class="fr-mgr-row"><div><div class="fr-mgr-title">Ustawienia menedżera</div><div class="fr-mgr-muted">Zewnętrzne skrypty wyłącza się całkowicie w Tampermonkey.</div><button type="button" data-fr-action="reset-positions" class="fr-mgr-reset">Reset pozycji okien</button></div></div>`:''}
    </div>`;
    dockUlepszarka();
  }

  // Własne przeciąganie nagłówka: natywny windowManager potrafi
  // nadpisywać pozycję po show() i nie zawsze emituje mouseup na oknie.
  function rememberWindowPosition(element, key) {
    if (!element || element.dataset.frPositionHook === '2') return;
    element.dataset.frPositionHook = '2';
    let active = null;
    let suppressCompactClick = false;
    const apply = (left, top) => {
      const x = Math.max(0, Math.min(left, Math.max(0, innerWidth - (element.classList.contains('fr-manager-compact') ? 42 : 80))));
      const y = Math.max(0, Math.min(top, Math.max(0, innerHeight - (element.classList.contains('fr-manager-compact') ? 32 : 40))));
      element.style.setProperty('position', 'fixed', 'important');
      element.style.setProperty('left', x + 'px', 'important');
      element.style.setProperty('top', y + 'px', 'important');
      element.style.setProperty('right', 'auto', 'important');
      element.style.setProperty('bottom', 'auto', 'important');
      element.style.setProperty('transform', 'none', 'important');
    };
    const saved = (() => {
      try {
        const v = JSON.parse(localStorage.getItem(key) || 'null');
        return Number.isFinite(v?.left) && Number.isFinite(v?.top) ? v : null;
      } catch (_) { return null; }
    })();
    if (saved) {
      apply(saved.left, saved.top);
      requestAnimationFrame(() => apply(saved.left, saved.top));
      setTimeout(() => { if (!active) apply(saved.left, saved.top); }, 250);
      setTimeout(() => { if (!active) apply(saved.left, saved.top); }, 1000);
    }
    const header = [...element.querySelectorAll('.window-header,.header,.title,.window-title,.c-window-header,.name-window')]
      .find(node => !node.closest('#fr-manager-body')) || element;
    header.style.setProperty('touch-action', 'none', 'important');
    const blocked = target => !element.classList.contains('fr-manager-compact') && target?.closest?.('button,input,select,textarea,a,.collapse,.fr-manager-gear,#fr-manager-body');
    const start = (event, x, y, type) => {
      if (blocked(event.target) || (event.button !== undefined && event.button !== 0)) return;
      const rect = element.getBoundingClientRect();
      active = {x,y,left:rect.left,top:rect.top,type};
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const move = (event, x, y, type) => {
      if (!active || active.type !== type) return;
      if (element.classList.contains('fr-manager-compact') && Math.hypot(x-active.x,y-active.y)>5) suppressCompactClick = true;
      apply(active.left + x - active.x, active.top + y - active.y);
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const finish = type => {
      if (!active || active.type !== type) return;
      active = null;
      element.classList.remove('fr-manager-dragging');
      const r = element.getBoundingClientRect();
      const pos = {left:Math.round(r.left),top:Math.round(r.top)};
      try { localStorage.setItem(key, JSON.stringify(pos)); } catch (_) {}
      if(suppressCompactClick){element.dataset.frCompactDragMoved='1';setTimeout(()=>{element.dataset.frCompactDragMoved='0'},350);}
    };
    // Zwinięte okno nie ma nagłówka. Przeciągaj jego tło/uchwyt „⋮”,
    // nie przechwytując kliknięcia w strzałkę rozwijania.
    element.addEventListener('mousedown', e => {
      if (!element.classList.contains('fr-manager-compact')) return;
      suppressCompactClick = false;
      start(e,e.clientX,e.clientY,'mouse');
      if (active) element.classList.add('fr-manager-dragging');
    }, true);
    element.addEventListener('touchstart', e => {
      suppressCompactClick = false;
      if (!element.classList.contains('fr-manager-compact') || e.touches.length !== 1) return;
      start(e,e.touches[0].clientX,e.touches[0].clientY,'touch');
      if (active) element.classList.add('fr-manager-dragging');
    }, {capture:true,passive:false});
    header.addEventListener('mousedown', e => start(e,e.clientX,e.clientY,'mouse'), true);
    document.addEventListener('mousemove', e => move(e,e.clientX,e.clientY,'mouse'), true);
    document.addEventListener('mouseup', () => finish('mouse'), true);
    header.addEventListener('touchstart', e => {
      if(e.touches.length===1)start(e,e.touches[0].clientX,e.touches[0].clientY,'touch');
    }, {capture:true,passive:false});
    document.addEventListener('touchmove', e => {
      if(active?.type==='touch' && e.touches.length)
        move(e,e.touches[0].clientX,e.touches[0].clientY,'touch');
    }, {capture:true,passive:false});
    document.addEventListener('touchend', () => finish('touch'), true);
    window.addEventListener('blur', () => {finish('mouse');finish('touch');});
  }

  function mount(){
    const E=window.Engine;
    if(!E?.windowManager||!E?.windowsData||!E?.interface)return false;
    const wm=E.windowManager;
    // Nie dodawaj kolejnego okna, jeśli gra już utworzyła poprzednie.
    const existingBody=document.getElementById('fr-manager-body');
    if(!existingBody){
      if(!wnd) {
        E.windowsData.name.FROST_REAPER_MANAGER='FROST_REAPER_MANAGER';
        wnd=wm.add({name:'FROST_REAPER_MANAGER',nameWindow:'FROST_REAPER_MANAGER',
          title:'Frost Reaper • Menedżer',content:'<div id="fr-manager-body"></div>',
          type:E.windowsData.type?.TRANSPARENT,manageOpacity:3,
          closeable:false,manageCollapse:true,draggable:true,className:'fr-manager-window'});
        if(!wnd)return false;
        wnd.addToAlertLayer();
        wnd.show();
      }
      // Okno mogło nie zostać jeszcze dołączone do DOM.
      if(!document.getElementById('fr-manager-body'))return false;
    }
    const body=document.getElementById('fr-manager-body');
    el=body.closest('.c-window') || body.closest('.fr-manager-window');
    if(!el)return false;
    el.classList.add('fr-manager-window');
    rememberWindowPosition(el,'fr_manager_window_position');
    // Identycznie jak w TH: używamy ORYGINALNEGO .collapse Margonem,
    // przenosimy go do samego okna i przechwytujemy kliknięcie w capture.
    const nativeCollapse=[...el.querySelectorAll('.collapse')].find(btn =>
      !btn.closest('#fr-manager-body'));
    if(nativeCollapse){
      if(nativeCollapse.parentElement!==el)el.appendChild(nativeCollapse);
      for(const [prop,value] of Object.entries({position:'absolute',left:'auto',right:'7px',top:'3px',
        'z-index':'1000',transform:'none',margin:'0',display:''})){
        nativeCollapse.style.setProperty(prop,value,'important');
      }
    }
    if(!el.dataset.frManagerCollapseReady){
      el.dataset.frManagerCollapseReady='1';
      el.addEventListener('click',event=>{
        const toggle=event.target.closest('.collapse');
        if(el.classList.contains('fr-manager-compact') && el.dataset.frCompactDragMoved==='1'){
          event.preventDefault();event.stopImmediatePropagation();
          el.dataset.frCompactDragMoved='0';return;
        }
        if(!toggle && !el.classList.contains('fr-manager-compact'))return;
        if(toggle && (!el.contains(toggle)||toggle.closest('#fr-manager-body')))return;
        event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
        settings.collapsed=!settings.collapsed;
        save();
        // Tak jak TH: zwijamy wyłącznie zawartość, nie całe okno.
        const content=el.querySelector('.content');
        if(content)content.style.display=settings.collapsed?'none':'';
        el.classList.toggle('fr-manager-compact',Boolean(settings.collapsed));
        syncCompactGear();
      },true);
    }
    const content=el.querySelector('.content');
    if(content)content.style.display=settings.collapsed?'none':'';
    el.classList.toggle('fr-manager-compact',Boolean(settings.collapsed));
    if(!el.querySelector('.fr-manager-gear')){
      const gear=document.createElement('button');
      gear.className='fr-manager-gear';gear.type='button';
      gear.title='Ustawienia menedżera';gear.setAttribute('aria-label','Ustawienia menedżera');
      gear.innerHTML=gearSVG;
      gear.style.cssText='position:absolute!important;left:24px!important;top:3px!important;width:17px!important;height:18px!important;padding:1px!important;border:0!important;background:transparent!important;color:#c9c8c9!important;display:flex!important;align-items:center!important;justify-content:center!important;z-index:999!important;cursor:pointer!important';
      gear.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();settings.settingsOpen=!settings.settingsOpen;save();draw();},true);
      el.appendChild(gear);
    }
    syncCompactGear();
    if(body.dataset.frManagerBound!=='1'){
      body.dataset.frManagerBound='1';
      body.addEventListener('change',ev=>{
        const module=ev.target?.dataset?.frModule;
        if(module==='stone-labels'){settings.stoneLabelsEnabled=Boolean(ev.target.checked);save();syncStoneLabels();return;}
        if(module==='upgrade-enabled'){setUpgradeEnabled(ev.target.checked);return;}
        if(module==='kcs'){
          const visible=ev.target.checked;
          localStorage.setItem('fr_manager_kcs_visible',String(visible));
          if(visible)window.FrostReaperKCS?.showWidget?.();
          else window.FrostReaperKCS?.hideWidget?.();
          return;
        }
        if(module==='kcs-auto'){
          window.FrostReaperKCS?.setAutoEnabled?.(ev.target.checked);
          draw();
          return;
        }
        if(module==='kcs-lock'){
          window.FrostReaperKCS?.setLocked?.(ev.target.checked);
          draw();
          return;
        }
        if(module==='as'){
          const visible=ev.target.checked;
          localStorage.setItem('fr_manager_as_visible',String(visible));
          if(visible)window.AutoSkillPvP?.showWidget?.();
          else window.AutoSkillPvP?.hideWidget?.();
          return;
        }
        if(module!=='th')return;
        const visible=ev.target.checked;
        localStorage.setItem('fr_manager_th_visible',String(visible));
        const th=window.FrostReaperTitan;
        if(visible)th?.open?.();else th?.close?.();
      });
      body.addEventListener('click',ev=>{
        const action=ev.target?.closest?.('[data-fr-action]');
        if(action?.dataset.frAction==='tab'){
          settings.addonsTab=action.dataset.frTab;save();draw();return;
        }
        if(action?.dataset.frAction==='install'){
          const id=action.dataset.frAddon;
          if(!addonNames[id])return;
          const key='fr_addon_install_url_'+id;
          const value=prompt('Adres HTTPS pliku .user.js dla '+addonNames[id]+' (zaufane źródło):',localStorage.getItem(key)||'');
          if(value===null)return;
          const url=value.trim();
          if(!/^https:\/\/[^\s]+\.user\.js(?:[?#][^\s]*)?$/i.test(url)){
            alert('Podaj pełny adres HTTPS prowadzący do pliku .user.js.');return;
          }
          localStorage.setItem(key,url);
          window.open(url,'_blank','noopener,noreferrer');return;
        }
        if(ev.target?.dataset?.frAction==='upgrade-toggle'){
          settings.upgradeOpen = settings.upgradeOpen === false;
          save(); draw(); return;
        }
        if(ev.target?.dataset?.frAction==='kcs-settings'){
          window.FrostReaperKCS?.openSettings?.();
          return;
        }
        if(ev.target?.dataset?.frAction==='kcs-hotkey'){
          window.FrostReaperKCS?.startHotkeyRecording?.();
          return;
        }
        if(ev.target?.dataset?.frAction!=='reset-positions')return;
        localStorage.removeItem('fr_manager_window_position');
        localStorage.removeItem('fr_th_window_position');
        localStorage.removeItem('fr_as_window_position');
        localStorage.removeItem('e2slot_pos');
        alert('Pozycje zapisane usunięte. Odśwież grę, aby ustawić okna ponownie.');
      });
    }
    draw();
    return true;
  }
  let bootAttempts=0;
  function boot(){
    if(mount())return;
    if(++bootAttempts<25)setTimeout(boot,600);
    else console.warn('[Frost Reaper Manager] Nie udało się podłączyć okna bez tworzenia duplikatów.');
  }
  boot();
  // Bez obserwatora całego DOM: poprzednio mutacja placeholdera
  // uruchamiała kolejną mutację i mogła zawiesić ładowanie gry.
  // Moduł sam zgłasza gotowość po stworzeniu panelu.
  window.addEventListener('frost-reaper:kcs-ready',draw);
  window.__FROST_REAPER_MANAGER__={open:()=>wnd?.show?.(),refresh:draw,openUpgrade:()=>{settings.upgradeOpen=true;save();draw();}};
})();

// === Wbudowany moduł Frost Reaper Ulepszarka ===
window.__FR_START_UPGRADE__ = function(){
  if(localStorage.getItem('fr_manager_settings')){try{if(JSON.parse(localStorage.getItem('fr_manager_settings')).upgradeEnabled===false)return;}catch(_){}}
  if(window.FrostReaperUlepszarka)return;
(function () {
    'use strict';

    const W = window;
    const VERSION = '3.20.1-FR';
    const ITEM_IMAGE_BASE =
        'https://micc.garmory-cdn.cloud/obrazki/itemy/';
    const PANEL_ID = 'garbaty-ulepszara';
    const STYLE_ID = 'garbaty-ulepszara-style';
    const STORAGE_KEY = 'garbaty_ulepszara_v2';
    const STATS_KEY = 'garbaty_ulepszara_stats_v1';
    const DAILY_USAGE_CACHE_PREFIX =
        'garbaty_ulepszara_server_daily_v1';
    const SI_BATCH_SIZE = 10;
    const NI_BATCH_SIZE = 20;
    const DAILY_ITEM_LIMIT = 2000;
    const REQUEST_TIMEOUT_MS = 6500;
    const BETWEEN_BATCHES_MS = 100;
    const AUTOMATIC_COOLDOWN_MS = 1000;
    const ARTISANSHIP_LOCK = 'garbaty-ulepszara-artisanship';

    const ITEM_TYPES = Object.freeze({
        1: 'Jednoręczne',
        2: 'Dwuręczne',
        3: 'Półtoraręczne',
        4: 'Łuki',
        5: 'Pomocnicze',
        6: 'Różdżki',
        7: 'Orby',
        8: 'Zbroje',
        9: 'Hełmy',
        10: 'Buty',
        11: 'Rękawice',
        12: 'Pierścienie',
        13: 'Naszyjniki',
        14: 'Tarcze',
        29: 'Strzały'
    });

    const EVENT_ITEM_MARKERS = Object.freeze([
        'Wakacje',
        'Urodziny Margonem',
        'Wielkanoc',
        'Noc Kupały',
        'Szabat Czarownic',
        'Halloween',
        'Gwiazdka',
        'Licytacja'
    ]);

    const TARGET_GROUPS = Object.freeze({
        weapon: {
            label: 'Bronie',
            icon: '⚔',
            classes: [14, 5, 1, 3, 2, 6, 7, 29, 4]
        },
        armor: {
            label: 'Pancerze',
            icon: '🛡',
            classes: [8, 11, 10, 9]
        },
        jewelry: {
            label: 'Biżuteria',
            icon: '◉',
            classes: [13, 12]
        }
    });

    const DEFAULT_SETTINGS = Object.freeze({
        useCommon: false,
        useUnique: false,
        allowBound: false,
        allowedClasses: Object.fromEntries(
            Object.keys(ITEM_TYPES).map(itemClass => [itemClass, true])
        ),
        position: { left: 120, top: 110 },
        collapsed: false,
        targetByHero: {},
        targetsByHero: {},
        targetConfigsByHero: {},
        autoByMaterials: false,
        autoMaterialCount: 10,
        autoByFreeSlots: false,
        autoFreeSlots: 2
    });

    let settings = loadSettings();
    let activeHeroId = null;
    const delayedRefreshTimers = [];
    let panel = null;
    let statusNode = null;
    let targetNode = null;
    let compactTargetNode = null;
    let compactTargetIndex = 0;
    let materialCountNode = null;
    let dailyLimitNode = null;
    let progressInfoNode = null;
    let previewNode = null;
    let running = false;
    let destroyed = false;
    let selectingTarget = false;
    let selectingTargetGroup = null;
    let contextHookTimer = null;
    let originalShowPopupMenu = null;
    let movementTimer = null;
    let automationTimer = null;
    let dailyUsageRefreshTimer = null;
    let dailyUsageRequest = null;
    let lastDailyUsageRequestAt = 0;
    let dailyUsageFocusHandler = null;
    let dailyUsageDomObserver = null;
    let lastAutomaticRunAt = 0;
    let lastAutomationCheck = null;
    let initializedAt = 0;
    let automaticRetryBlockedUntil = 0;
    let automaticConditionSince = 0;
    let freeSlotsThresholdArmed = true;
    let freeSlotsCache = {
        checkedAt: 0,
        details: {
            freeSlots: null,
            source: 'unavailable',
            detectedBags: 0
        }
    };
    let lastHeroPosition = null;
    let lastMovementAt = 0;
    let lastForcedStop = null;
    let artisanshipOpenedAt = 0;
    let artisanshipLockActive = false;
    let pendingCraftingTargetId = null;
    let serverDailyUsage = null;
    let lastDomUsageScanAt = 0;
    let responseHookRestore = null;
    const responseInterceptors = new Map();
    let usageStats = loadUsageStats();

    if (W.FrostReaperUlepszarka?.destroy) {
        try { W.FrostReaperUlepszarka.destroy(); } catch (_) {}
    }
    // Stary samodzielny skrypt należy wyłączyć w Tampermonkey.

    function cloneDefaults() {
        return {
            ...DEFAULT_SETTINGS,
            allowedClasses: { ...DEFAULT_SETTINGS.allowedClasses },
            position: { ...DEFAULT_SETTINGS.position },
            targetByHero: {},
            targetsByHero: {},
            targetConfigsByHero: {}
        };
    }

    function loadSettings() {
        const defaults = cloneDefaults();

        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            return {
                ...defaults,
                ...saved,
                useCommon: saved.useCommon === true,
                useUnique: saved.useUnique === true,
                allowBound: saved.allowBound === true,
                collapsed: saved.collapsed === true,
                autoByMaterials: saved.autoByMaterials === true,
                autoMaterialCount: Math.max(
                    1,
                    safeNumber(saved.autoMaterialCount, 10)
                ),
                autoByFreeSlots: saved.autoByFreeSlots === true,
                autoFreeSlots: Math.max(
                    0,
                    safeNumber(saved.autoFreeSlots, 2)
                ),
                allowedClasses: {
                    ...defaults.allowedClasses,
                    ...(saved.allowedClasses || {})
                },
                position: {
                    left: safeNumber(saved.position?.left, defaults.position.left),
                    top: safeNumber(saved.position?.top, defaults.position.top)
                },
                targetByHero:
                    saved.targetByHero && typeof saved.targetByHero === 'object'
                        ? saved.targetByHero
                        : {},
                targetsByHero:
                    saved.targetsByHero &&
                    typeof saved.targetsByHero === 'object'
                        ? saved.targetsByHero
                        : {},
                targetConfigsByHero:
                    saved.targetConfigsByHero &&
                    typeof saved.targetConfigsByHero === 'object'
                        ? saved.targetConfigsByHero
                        : {}
            };
        } catch (_) {
            return defaults;
        }
    }

    function saveSettings() {
        try {
            const serialized = JSON.stringify(settings);
            localStorage.setItem(STORAGE_KEY, serialized);

            if (localStorage.getItem(STORAGE_KEY) !== serialized) {
                throw new Error('Weryfikacja zapisu nie powiodła się.');
            }
            return true;
        } catch (error) {
            console.error('[FR Ulepszarka] Nie zapisano ustawień:', error);
            return false;
        }
    }

    function loadUsageStats() {
        try {
            const saved = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
            return saved && typeof saved === 'object' ? saved : {};
        } catch (_) {
            return {};
        }
    }

    function saveUsageStats() {
        try {
            localStorage.setItem(STATS_KEY, JSON.stringify(usageStats));
            return true;
        } catch (error) {
            console.error('[FR Ulepszarka] Nie zapisano statystyk:', error);
            return false;
        }
    }

    function nextDailyResetTimestamp() {
        const now = new Date();
        const reset = new Date(now);
        reset.setHours(5, 45, 0, 0);
        if (reset.getTime() <= now.getTime()) {
            reset.setDate(reset.getDate() + 1);
        }
        return reset.getTime();
    }

    function getHeroUsage() {
        // Limit jest dzienny, więc licznik jest wspólny dla postaci
        // korzystających z panelu w tej przeglądarce.
        const id = 'global';
        const existing =
            usageStats[id] && typeof usageStats[id] === 'object'
                ? usageStats[id]
                : {};
        const resetAt = safeNumber(existing.resetAt, 0);

        if (!resetAt || Date.now() >= resetAt) {
            usageStats[id] = {
                burnedToday: 0,
                resetAt: nextDailyResetTimestamp(),
                progressByTarget:
                    existing.progressByTarget &&
                    typeof existing.progressByTarget === 'object'
                        ? existing.progressByTarget
                        : {}
            };
            saveUsageStats();
        } else {
            usageStats[id] = {
                ...existing,
                burnedToday: Math.max(
                    0,
                    safeNumber(existing.burnedToday, 0)
                ),
                resetAt,
                progressByTarget:
                    existing.progressByTarget &&
                    typeof existing.progressByTarget === 'object'
                        ? existing.progressByTarget
                        : {}
            };
        }

        return usageStats[id];
    }

    function saveTargetProgress(targetId, progress) {
        const id = normalizeId(targetId);
        if (!id || !progress) return;

        const usage = getHeroUsage();
        const previous = usage.progressByTarget[id] || {};
        const hasPointProgress = safeNumber(progress.max, 0) > 0;
        usage.progressByTarget[id] = {
            current: hasPointProgress
                ? safeNumber(progress.current, 0)
                : safeNumber(previous.current, 0),
            max: hasPointProgress
                ? safeNumber(progress.max, 0)
                : safeNumber(previous.max, 0),
            upgradeLevel:
                progress.upgradeLevel ?? previous.upgradeLevel ?? null,
            completed: progress.completed === true,
            updatedAt: Date.now()
        };
        saveUsageStats();
        refreshStatistics();
    }

    function recordOperation(stage, details = {}) {
        const usage = getHeroUsage();
        usage.lastOperation = {
            stage,
            at: Date.now(),
            interface: detectInterface(),
            ...details
        };
        saveUsageStats();
    }

    function safeNumber(value, fallback = 0) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function detectInterface() {
        if (W.Engine?.items) return 'NI';
        if (W.g?.item && typeof W.g.item === 'object') return 'SI';
        return 'unknown';
    }

    function batchSizeForInterface() {
        return detectInterface() === 'SI'
            ? SI_BATCH_SIZE
            : NI_BATCH_SIZE;
    }

    function readHeroPosition() {
        const source =
            W.Engine?.hero?.d ||
            W.hero ||
            W.g?.hero ||
            {};
        const x = Number(source.x);
        const y = Number(source.y);

        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

        const map =
            W.Engine?.map?.d?.id ??
            W.Engine?.map?.d?.name ??
            W.g?.map?.id ??
            W.g?.map?.name ??
            '';

        return `${map}:${x}:${y}`;
    }

    function sampleHeroMovement() {
        const position = readHeroPosition();
        if (!position) return;

        if (lastHeroPosition && position !== lastHeroPosition) {
            lastMovementAt = Date.now();
            if (!(running && artisanshipLockActive)) {
                artisanshipOpenedAt = 0;
                pendingCraftingTargetId = null;
                removeArtisanshipLock();
            }
        }

        lastHeroPosition = position;
    }

    function isHeroMoving() {
        sampleHeroMovement();
        return Date.now() - lastMovementAt < 250;
    }

    function releaseMovementKeys() {
        for (const key of ['a', 'w', 's', 'd', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight']) {
            const code = key.startsWith('Arrow')
                ? key
                : `Key${key.toUpperCase()}`;
            const event = new KeyboardEvent('keyup', {
                key,
                code,
                bubbles: true,
                cancelable: true
            });
            document.body?.dispatchEvent(event);
            W.dispatchEvent(new KeyboardEvent('keyup', {
                key,
                code,
                bubbles: true,
                cancelable: true
            }));
        }
    }

    function forceStopMovement() {
        const methods = [];
        const positionSource =
            W.Engine?.hero?.d ||
            W.hero ||
            W.g?.hero ||
            {};
        const x = Number(positionSource.x);
        const y = Number(positionSource.y);

        releaseMovementKeys();

        // SI trzyma kolejne kroki w tych kolejkach. Ich wyczyszczenie
        // zapobiega wznowieniu starej trasy po zamknięciu rzemiosła.
        for (const source of [W.hero, W.g?.hero]) {
            if (!source || typeof source !== 'object') continue;
            if (Array.isArray(source.ml)) source.ml.length = 0;
            if (Array.isArray(source.mts)) source.mts.length = 0;
        }

        const stopCandidates = [
            [W.Engine?.hero, 'stop'],
            [W.Engine?.hero, 'stopMovement'],
            [W.Engine?.hero, 'cancelMove'],
            [W.Engine?.hero, 'cancelPath'],
            [W.Engine?.hero, 'clearPath'],
            [W.hero, 'stop'],
            [W.hero, 'stopMovement'],
            [W.hero, 'cancelPath'],
            [W.hero, 'clearPath']
        ];

        for (const [owner, name] of stopCandidates) {
            if (typeof owner?.[name] !== 'function') continue;
            try {
                owner[name]();
                methods.push(name);
            } catch (_) {}
        }

        // cebgo/moveTo na aktualne pole anuluje trasę również w wersjach NI,
        // które nie wystawiają osobnej publicznej metody stop.
        if (Number.isFinite(x) && Number.isFinite(y)) {
            try {
                if (typeof W.hero?.cebgo === 'function') {
                    W.hero.cebgo(x, y);
                    methods.push('hero.cebgo(current)');
                } else if (typeof W.Engine?.hero?.moveTo === 'function') {
                    W.Engine.hero.moveTo(x, y);
                    methods.push('Engine.hero.moveTo(current)');
                }
            } catch (_) {}
        }

        // Blokada jest zakładana przed pierwszym żądaniem, aby następne
        // kliknięcie/ruch nie przerwały automatycznej serii.
        if (addArtisanshipLock()) methods.push('artisanship-lock');

        lastHeroPosition = readHeroPosition();
        lastMovementAt = 0;
        lastForcedStop = {
            at: Date.now(),
            interface: detectInterface(),
            position: lastHeroPosition,
            methods: [...methods]
        };
        return methods;
    }

    function automaticSafetyState() {
        const now = Date.now();

        if (!initializedAt || now - initializedAt < 2500) {
            return { safe: false, reason: 'game_starting' };
        }
        if (document.visibilityState !== 'visible') {
            return { safe: false, reason: 'page_hidden' };
        }
        if (now < automaticRetryBlockedUntil) {
            return { safe: false, reason: 'retry_blocked' };
        }
        if (!readHeroPosition()) {
            return { safe: false, reason: 'map_loading' };
        }

        return {
            safe: true,
            reason: null,
            moving: isHeroMoving()
        };
    }

    function readHeroId() {
        const value =
            W.Engine?.hero?.d?.id ??
            W.hero?.id ??
            W.g?.hero?.id;
        const id = String(value ?? '').trim();
        return /^\d+$/.test(id) && id !== '0' ? id : null;
    }

    function heroId() {
        return activeHeroId || readHeroId() || 'global';
    }

    function localDayKey() {
        // Dzienny limit gry resetuje się o 05:45, a nie o północy.
        const now = new Date(Date.now() - (5 * 60 + 45) * 60 * 1000);
        return [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0')
        ].join('-');
    }

    function readAccountId() {
        const candidates = [
            W.Engine?.hero?.d?.account,
            W.hero?.account,
            W.g?.hero?.account
        ];

        for (const candidate of candidates) {
            const id = String(candidate ?? '').trim();
            if (/^\d+$/.test(id) && id !== '0') return id;
        }

        return null;
    }

    function dailyUsageOwnerKey() {
        const accountId = readAccountId();
        if (accountId) return `account-${accountId}`;

        // Awaryjnie, tylko zanim silnik udostępni ID konta.
        return `hero-${heroId()}`;
    }

    function dailyUsageCacheKey() {
        return [
            DAILY_USAGE_CACHE_PREFIX,
            location.hostname,
            dailyUsageOwnerKey(),
            localDayKey()
        ].join(':');
    }

    function legacyDailyUsageCacheKey() {
        return [
            DAILY_USAGE_CACHE_PREFIX,
            location.hostname,
            heroId(),
            localDayKey()
        ].join(':');
    }

    function loadCachedServerDailyUsage() {
        try {
            const currentKey = dailyUsageCacheKey();
            let cached = normalizeServerUsage(
                localStorage.getItem(currentKey)
            );

            // Migracja licznika z v3.10, gdzie był zapisany osobno dla postaci.
            if (cached === null) {
                cached = normalizeServerUsage(
                    localStorage.getItem(legacyDailyUsageCacheKey())
                );
                if (cached !== null) {
                    localStorage.setItem(currentKey, String(cached));
                }
            }

            serverDailyUsage = cached;
            return cached !== null;
        } catch (_) {
            serverDailyUsage = null;
            return false;
        }
    }

    function saveCachedServerDailyUsage(value) {
        const normalized = normalizeServerUsage(value);
        if (normalized === null) return false;

        try {
            localStorage.setItem(
                dailyUsageCacheKey(),
                String(normalized)
            );
            return true;
        } catch (_) {
            return false;
        }
    }

    function migrateLastConfirmedBatchUsage() {
        if ((serverDailyUsage ?? 0) > 0) return false;

        const usage = getHeroUsage();
        const operation = usage?.lastOperation;
        const cycleStartedAt =
            safeNumber(usage?.resetAt, 0) - 24 * 60 * 60 * 1000;
        const materialCount = Math.max(
            0,
            Math.floor(Number(operation?.materialCount) || 0)
        );

        if (
            operation?.stage !== 'batch_received' ||
            safeNumber(operation?.at, 0) < cycleStartedAt ||
            materialCount <= 0
        ) {
            return false;
        }

        serverDailyUsage = materialCount;
        saveCachedServerDailyUsage(serverDailyUsage);
        return true;
    }

    function activateHeroStorage(id) {
        if (!id) return false;
        activeHeroId = String(id);

        const globalTarget = normalizeId(settings.targetByHero.global);
        if (
            globalTarget &&
            !normalizeId(settings.targetByHero[activeHeroId])
        ) {
            settings.targetByHero[activeHeroId] = globalTarget;
            delete settings.targetByHero.global;
            saveSettings();
        }

        loadCachedServerDailyUsage();
        migrateLastConfirmedBatchUsage();
        return true;
    }

    function normalizeId(value) {
        const id = String(value ?? '').trim();
        return /^\d+$/.test(id) && id !== '0' ? id : null;
    }

    function getTargetId() {
        return getTargetEntries()[0]?.id || null;
    }

    function groupedAllowedClasses(source = {}) {
        const grouped = Object.fromEntries(
            Object.keys(ITEM_TYPES).map(itemClassId => [itemClassId, false])
        );

        for (const definition of Object.values(TARGET_GROUPS)) {
            const enabled = definition.classes.some(
                itemClassId => source[String(itemClassId)] === true
            );

            for (const itemClassId of definition.classes) {
                grouped[String(itemClassId)] = enabled;
            }
        }

        return grouped;
    }

    function materialGroupEnabled(allowedClasses, definition) {
        return definition.classes.every(
            itemClassId => allowedClasses[String(itemClassId)] === true
        );
    }

    function defaultTargetAllowedClasses(item) {
        const type = Number(itemClass(item));
        const selectedGroup = Object.values(TARGET_GROUPS).find(
            definition => definition.classes.includes(type)
        );

        return Object.fromEntries(
            Object.keys(ITEM_TYPES).map(itemClassId => [
                itemClassId,
                Boolean(
                    selectedGroup?.classes.includes(Number(itemClassId))
                )
            ])
        );
    }

    function getTargetConfigs() {
        const configs = settings.targetConfigsByHero[heroId()];
        return Array.isArray(configs) ? configs : [];
    }

    function getTargetEntries() {
        return getTargetConfigs()
            .map((config, index) => ({
                index,
                id: normalizeId(config?.id),
                allowedClasses:
                    config?.allowedClasses &&
                    typeof config.allowedClasses === 'object'
                        ? groupedAllowedClasses(config.allowedClasses)
                        : {}
            }))
            .filter(entry => entry.id);
    }

    function setTargetId(value, requestedIndex = null) {
        const id = normalizeId(value);
        const configs = [...getTargetConfigs()];
        const numericIndex =
            requestedIndex !== null &&
            requestedIndex !== 'new' &&
            Number.isInteger(Number(requestedIndex))
            ? Number(requestedIndex)
            : null;

        if (id) {
            const existingIndex = configs.findIndex(
                config => normalizeId(config?.id) === id
            );
            const targetIndex = existingIndex >= 0
                ? existingIndex
                : numericIndex;
            const existing = targetIndex !== null
                ? configs[targetIndex]
                : null;
            const config = {
                id,
                allowedClasses:
                    existing?.allowedClasses ||
                    defaultTargetAllowedClasses(getItemById(id))
            };

            if (targetIndex !== null && targetIndex >= 0) {
                configs[targetIndex] = config;
            } else {
                configs.push(config);
            }
            settings.targetByHero[heroId()] = id;
        } else if (numericIndex !== null && numericIndex >= 0) {
            configs.splice(numericIndex, 1);
        } else if (!id) {
            configs.splice(0);
            delete settings.targetByHero[heroId()];
        }

        settings.targetConfigsByHero[heroId()] = configs;
        saveSettings();
        refreshView();
    }

    function setTargetMaterialGroup(index, groupId, enabled) {
        const configs = [...getTargetConfigs()];
        const definition = TARGET_GROUPS[groupId];
        if (!configs[index] || !definition) return;

        const allowedClasses = groupedAllowedClasses(
            configs[index].allowedClasses || {}
        );
        for (const itemClassId of definition.classes) {
            allowedClasses[String(itemClassId)] = enabled === true;
        }

        configs[index] = {
            ...configs[index],
            allowedClasses
        };
        settings.targetConfigsByHero[heroId()] = configs;
        saveSettings();
        refreshMaterials();
        refreshStatistics();
    }

    function migrateLegacyTarget() {
        if (getTargetEntries().length) return;
        const migrated = [];
        const oldTargets = settings.targetsByHero[heroId()] || {};

        for (const [group, definition] of Object.entries(TARGET_GROUPS)) {
            const id = normalizeId(oldTargets[group]);
            if (!id || migrated.some(config => config.id === id)) continue;
            migrated.push({
                id,
                allowedClasses: Object.fromEntries(
                    Object.keys(ITEM_TYPES).map(itemClassId => [
                        itemClassId,
                        definition.classes.includes(Number(itemClassId))
                    ])
                )
            });
        }

        const legacyId = normalizeId(settings.targetByHero[heroId()]);
        if (legacyId && !migrated.some(config => config.id === legacyId)) {
            migrated.push({
                id: legacyId,
                allowedClasses: defaultTargetAllowedClasses(
                    getItemById(legacyId)
                )
            });
        }

        if (migrated.length) {
            settings.targetConfigsByHero[heroId()] = migrated;
            saveSettings();
        }
    }

    function getBagItems() {
        try {
            const items = W.Engine?.items?.fetchLocationItems?.('g');
            if (Array.isArray(items)) return items.filter(Boolean);
            if (items && typeof items === 'object') {
                return Object.values(items).filter(Boolean);
            }
        } catch (_) {}

        if (W.g?.item && typeof W.g.item === 'object') {
            return Object.entries(W.g.item)
                .map(([fallbackId, item]) => (
                    item && item.id == null
                        ? { ...item, id: fallbackId }
                        : item
                ))
                .filter(item => item && (!item.loc || item.loc === 'g'));
        }

        return [];
    }

    function getItemById(value) {
        const id = normalizeId(value);
        if (!id) return null;

        try {
            return (
                W.Engine?.items?.getItemById?.(id) ||
                W.Engine?.items?.getItemById?.(Number(id)) ||
                W.g?.item?.[id] ||
                W.g?.item?.[Number(id)] ||
                getBagItems().find(item => String(item?.id) === id) ||
                null
            );
        } catch (_) {
            return (
                W.g?.item?.[id] ||
                W.g?.item?.[Number(id)] ||
                getBagItems().find(item => String(item?.id) === id) ||
                null
            );
        }
    }

    function parseStatsString(value) {
        const result = {};

        for (const rawPart of String(value || '').split(';')) {
            const part = rawPart.trim();
            if (!part) continue;

            const separator = part.indexOf('=');
            if (separator < 0) {
                result[part] = true;
                continue;
            }

            const key = part.slice(0, separator).trim();
            if (!key) continue;
            result[key] = part.slice(separator + 1).trim();
        }

        return result;
    }

    function cachedStats(item) {
        const stringStats = parseStatsString(item?.stat);
        const objectStats =
            item?.stats && typeof item.stats === 'object'
                ? item.stats
                : {};
        const niStats =
            item?._cachedStats && typeof item._cachedStats === 'object'
                ? item._cachedStats
                : {};

        return { ...stringStats, ...objectStats, ...niStats };
    }

    function itemLevel(item) {
        const stats = cachedStats(item);
        return safeNumber(item?.lvl ?? item?.level ?? stats.lvl, 0);
    }

    function itemClass(item) {
        return safeNumber(item?.cl ?? cachedStats(item).cl, 0);
    }

    function itemRarity(item) {
        const stats = cachedStats(item);

        if (Object.prototype.hasOwnProperty.call(stats, 'legendary')) {
            return 'legendary';
        }
        if (Object.prototype.hasOwnProperty.call(stats, 'heroic')) {
            return 'heroic';
        }
        if (Object.prototype.hasOwnProperty.call(stats, 'unique')) {
            return 'unique';
        }

        const value = stats.rarity ?? item?.rarity ?? '';
        const rarity = String(value).toLowerCase();

        if (!rarity || rarity === '0' || rarity === 'pospolity') return 'common';
        if (rarity === '1' || rarity === 'unikatowy') return 'unique';
        if (rarity === '2' || rarity === 'heroiczny') return 'heroic';
        if (rarity === '3' || rarity === 'legendarny') return 'legendary';
        return rarity;
    }

    function itemUpgradeLevel(item) {
        const stats = cachedStats(item);
        const value =
            stats.enhancement_upgrade_lvl ??
            stats.enhancementUpgradeLevel ??
            item?.enhancement_upgrade_lvl ??
            item?.enhancementUpgradeLevel;

        return value === undefined || value === null
            ? null
            : safeNumber(value, null);
    }

    function itemEnhancementPoints(item) {
        const stats = cachedStats(item);
        return Math.max(
            0,
            safeNumber(
                item?.enhancementPoints ??
                item?.enhancement_points ??
                stats.enhancementPoints ??
                stats.enhancement_points,
                0
            )
        );
    }

    function isBound(item) {
        let boundByMethod = false;

        try {
            boundByMethod = Boolean(
                item?.checkSoulbound?.() ||
                item?.checkPermbound?.()
            );
        } catch (_) {}

        const stats = cachedStats(item);
        return Boolean(
            boundByMethod ||
            Object.prototype.hasOwnProperty.call(stats, 'soulbound') ||
            Object.prototype.hasOwnProperty.call(stats, 'permbound') ||
            Object.prototype.hasOwnProperty.call(item || {}, 'soulbound') ||
            Object.prototype.hasOwnProperty.call(item || {}, 'permbound')
        );
    }

    function isCursed(item) {
        const stats = cachedStats(item);
        return Boolean(stats.cursed ?? item?.cursed ?? false);
    }

    function searchableItemText(value) {
        if (value === undefined || value === null) return '';

        let text;
        if (value instanceof Element) {
            text = value.textContent || value.getAttribute?.('tip') || '';
        } else if (typeof value === 'object') {
            text =
                value.text ??
                value.content ??
                value.description ??
                value.html ??
                '';
        } else {
            text = String(value);
        }

        if (/<[^>]+>|&[a-z#0-9]+;/i.test(String(text))) {
            try {
                text = new DOMParser()
                    .parseFromString(String(text), 'text/html')
                    .body.textContent || text;
            } catch (_) {}
        }

        return String(text)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLocaleLowerCase('pl-PL');
    }

    function isArtisanWorthless(item) {
        const stats = cachedStats(item);
        const sources = [stats, item || {}];

        const hasWorthlessFlag = sources.some(source => {
            if (!Object.prototype.hasOwnProperty.call(
                source,
                'artisan_worthless'
            )) return false;

            const value = source.artisan_worthless;
            return !(
                value === false ||
                value === 0 ||
                String(value).toLowerCase() === 'false'
            );
        });
        if (hasWorthlessFlag) return true;

        const textSources = [
            item?.tip,
            item?.tooltip,
            item?.description,
            item?.desc,
            item?._cachedTip,
            item?._cachedTooltip,
            item?.d?.tip,
            item?.d?.description,
            item?.stat
        ];

        if (typeof item?.getTipContent === 'function') {
            try {
                textSources.push(item.getTipContent());
            } catch (_) {}
        }

        const combinedText = textSources
            .map(searchableItemText)
            .filter(Boolean)
            .join(' ');

        return (
            combinedText.includes(
                'bezuzyteczny skladnik rzemieslniczy'
            ) ||
            (
                combinedText.includes('bezuzyteczny') &&
                combinedText.includes('skladnik') &&
                combinedText.includes('rzemieslniczy')
            )
        );
    }

    function isEventItem(item) {
        if (!item) return false;

        if (typeof item.getTipContent === 'function') {
            try {
                const text = String(item.getTipContent() || '')
                    .replace(/<[^>]+>/g, ' ');
                if (EVENT_ITEM_MARKERS.some(marker => text.includes(marker))) {
                    return true;
                }
            } catch (_) {}
        }

        const stats = cachedStats(item);
        return Boolean(stats.event || stats.event_item || stats.eventItem);
    }

    function isUsedInBuild(item) {
        try {
            return Boolean(
                W.Engine?.buildsManager &&
                Array.isArray(item?.builds) &&
                item.builds.length
            );
        } catch (_) {
            return false;
        }
    }

    function isValidTarget(item) {
        return Boolean(
            item &&
            ITEM_TYPES[itemClass(item)] &&
            itemLevel(item) >= 20 &&
            itemUpgradeLevel(item) !== 5
        );
    }

    function isAllowedMaterial(item, targetId, targetAllowedClasses = null) {
        if (!item || String(item.id) === String(targetId)) return false;

        const type = itemClass(item);
        const rarity = itemRarity(item);

        if (!ITEM_TYPES[type]) return false;
        if (
            targetAllowedClasses &&
            targetAllowedClasses[String(type)] !== true
        ) return false;
        if (itemLevel(item) < 20) return false;
        if (rarity === 'common' && !settings.useCommon) return false;
        if (rarity === 'unique' && !settings.useUnique) return false;
        if (rarity !== 'common' && rarity !== 'unique') return false;
        if (itemUpgradeLevel(item) !== null) return false;
        if (isCursed(item)) return false;
        if (isArtisanWorthless(item)) return false;
        if (isEventItem(item)) return false;
        if (isUsedInBuild(item)) return false;
        if (!settings.allowBound && isBound(item)) return false;

        return true;
    }

    function getMaterials(targetId = getTargetId(), targetIndex = null) {
        if (!targetId) return [];
        if (getHeroUsage().progressByTarget[targetId]?.completed) return [];
        const entry = getTargetEntries().find(candidate => (
            candidate.id === String(targetId) &&
            (targetIndex === null || candidate.index === Number(targetIndex))
        ));
        const allowedClasses = entry?.allowedClasses || null;

        return getBagItems()
            .filter(item => isAllowedMaterial(
                item,
                targetId,
                allowedClasses
            ))
            .sort((left, right) => {
                const rarityOrder =
                    Number(itemRarity(left) === 'unique') -
                    Number(itemRarity(right) === 'unique');
                return rarityOrder || itemLevel(left) - itemLevel(right);
            });
    }

    function getAllConfiguredMaterials() {
        const seen = new Set();
        const result = [];

        for (const { index, id } of getTargetEntries()) {
            for (const item of getMaterials(id, index)) {
                const itemId = String(item.id);
                if (seen.has(itemId)) continue;
                seen.add(itemId);
                result.push(item);
            }
        }
        return result;
    }

    function getEquippedItems() {
        try {
            const items = W.Engine?.items?.fetchLocationItems?.('e');
            if (Array.isArray(items)) return items.filter(Boolean);
            if (items && typeof items === 'object') {
                return Object.values(items).filter(Boolean);
            }
        } catch (_) {}

        if (W.g?.item && typeof W.g.item === 'object') {
            return Object.values(W.g.item).filter(item => (
                item &&
                [20, 21, 22].includes(safeNumber(item?.st, -1))
            ));
        }

        return [];
    }

    function getFreeBagSlotsFromItems() {
        // Lekki odczyt: tylko zawartość ekwipunku oraz trzy założone torby.
        // Nie skanujemy całego silnika gry ani DOM-u co kilka sekund.
        const bagItems = getBagItems();
        const equippedItems = getEquippedItems();
        const bagRanges = [
            { bagState: 20, from: 0, to: 5 },
            { bagState: 21, from: 6, to: 11 },
            { bagState: 22, from: 12, to: 17 }
        ];
        let total = 0;
        let detected = 0;

        for (const range of bagRanges) {
            const bag = equippedItems.find(item => (
                safeNumber(item?.st, -1) === range.bagState
            ));
            const bagStats = cachedStats(bag);
            const capacity = [
                bagStats.capacity,
                bagStats.slots,
                bagStats.bag,
                bag?.capacity,
                bag?.slots,
                bag?.bag
            ]
                .map(value => safeNumber(value, 0))
                .find(value => value > 0 && value <= 100) || 0;
            if (!capacity) continue;

            detected++;
            let occupied = 0;
            for (const item of bagItems) {
                const y = safeNumber(item?.y, -1);
                const state = safeNumber(item?.st, -1);
                if (
                    (state === 24 || state <= 0) &&
                    y >= range.from &&
                    y <= range.to
                ) {
                    occupied++;
                }
            }
            total += Math.max(0, capacity - occupied);
        }

        return detected
            ? {
                freeSlots: total,
                source: 'equipped-bags',
                detectedBags: detected
            }
            : null;
    }

    function getFreeBagSlotsFromVisibleBags() {
        const roots = new Set();
        const rootSelectors = [
            '#bags',
            '.bags',
            '.bag-list',
            '.bag-buttons',
            '.bag-switcher',
            '[class*="bags"]',
            '[class*="bag-list"]',
            '[class*="bag-switch"]'
        ];

        for (const selector of rootSelectors) {
            try {
                document.querySelectorAll(selector).forEach(element => {
                    if (
                        element instanceof Element &&
                        !panel?.contains(element) &&
                        !element.closest('.inventory-grid')
                    ) {
                        roots.add(element);
                    }
                });
            } catch (_) {}
        }

        const counters = [];
        const seen = new Set();

        for (const root of roots) {
            const rootRect = root.getBoundingClientRect();
            if (rootRect.width <= 0 || rootRect.height <= 0) continue;

            const leaves = root.querySelectorAll(
                'span, b, strong, small, [class*="amount"], ' +
                '[class*="count"], [class*="free"], [class*="slot"]'
            );

            for (const element of leaves) {
                if (
                    !(element instanceof Element) ||
                    element.children.length ||
                    element.closest('.inventory-grid') ||
                    panel?.contains(element)
                ) {
                    continue;
                }

                const text = String(element.textContent || '').trim();
                if (!/^\d{1,2}$/.test(text)) continue;

                const rect = element.getBoundingClientRect();
                if (rect.width <= 0 || rect.height <= 0) continue;

                const value = Number(text);
                const key = [
                    Math.round(rect.left),
                    Math.round(rect.top),
                    value
                ].join(':');
                if (seen.has(key)) continue;

                seen.add(key);
                counters.push({
                    value,
                    left: rect.left,
                    top: rect.top
                });
            }
        }

        if (counters.length < 2 || counters.length > 7) return null;

        counters.sort((left, right) => (
            left.left - right.left || left.top - right.top
        ));
        const values = counters.map(counter => counter.value);

        return {
            freeSlots: values.reduce((sum, value) => sum + value, 0),
            source: 'visible-bag-counters',
            detectedBags: values.length,
            counterValues: values
        };
    }

    function getFreeBagSlotsDetails() {
        const now = Date.now();
        if (now - freeSlotsCache.checkedAt < 500) {
            return freeSlotsCache.details;
        }

        const details = (
            getFreeBagSlotsFromVisibleBags() ||
            getFreeBagSlotsFromItems() ||
            {
                freeSlots: null,
                source: 'unavailable',
                detectedBags: 0
            }
        );
        freeSlotsCache = {
            checkedAt: now,
            details
        };
        return details;
    }

    function getFreeBagSlots() {
        return getFreeBagSlotsDetails().freeSlots;
    }

    function evaluateAutomaticRun() {
        const materialCount = getAllConfiguredMaterials().length;
        const freeSlotsDetails = getFreeBagSlotsDetails();
        const freeSlots = freeSlotsDetails.freeSlots;
        const safety = automaticSafetyState();
        const byMaterials =
            settings.autoByMaterials &&
            materialCount >= settings.autoMaterialCount;
        const bySlots =
            settings.autoByFreeSlots &&
            freeSlots !== null &&
            freeSlots <= settings.autoFreeSlots &&
            materialCount > 0;

        let reason = 'waiting';
        if (destroyed) reason = 'destroyed';
        else if (running) reason = 'running';
        else if (isBattleActive()) reason = 'battle';
        else if (!safety.safe) reason = safety.reason;
        else if (
            Date.now() - lastAutomaticRunAt < AUTOMATIC_COOLDOWN_MS
        ) reason = 'cooldown';
        else if (!settings.autoByMaterials && !settings.autoByFreeSlots) {
            reason = 'disabled';
        } else if (!getTargetEntries().length) reason = 'no_targets';
        else if (!materialCount) reason = 'no_materials';
        else if (settings.autoByFreeSlots && freeSlots === null) {
            reason = 'free_slots_unavailable';
        } else if (bySlots) reason = 'free_slots_threshold';
        else if (byMaterials) reason = 'materials_threshold';

        return {
            ready:
                !destroyed &&
                !running &&
                !isBattleActive() &&
                safety.safe &&
                Date.now() - lastAutomaticRunAt >= AUTOMATIC_COOLDOWN_MS &&
                (byMaterials || bySlots),
            reason,
            materialCount,
            freeSlots,
            freeSlotsSource: freeSlotsDetails.source,
            freeSlotsCounters:
                freeSlotsDetails.counterValues || null,
            autoFreeSlots: settings.autoFreeSlots,
            autoMaterialCount: settings.autoMaterialCount,
            byMaterials,
            bySlots,
            safety
        };
    }

    function shouldRunAutomatically() {
        lastAutomationCheck = evaluateAutomaticRun();
        return lastAutomationCheck.ready;
    }

    function automationTick() {
        lastAutomationCheck = evaluateAutomaticRun();

        if (
            lastAutomationCheck.freeSlots !== null &&
            lastAutomationCheck.freeSlots > settings.autoFreeSlots
        ) {
            freeSlotsThresholdArmed = true;
        }

        if (!lastAutomationCheck.ready) {
            automaticConditionSince = 0;
            return;
        }

        // Próg wolnych pól uruchamia jedną próbę. Kolejna jest możliwa
        // dopiero po faktycznym zwolnieniu miejsca ponad ustawiony próg.
        if (
            lastAutomationCheck.bySlots &&
            !lastAutomationCheck.byMaterials &&
            !freeSlotsThresholdArmed
        ) {
            automaticConditionSince = 0;
            return;
        }

        automaticConditionSince = 0;
        if (lastAutomationCheck.bySlots) {
            freeSlotsThresholdArmed = false;
        }
        lastAutomaticRunAt = Date.now();
        setStatus('Automat: zatrzymywanie postaci i start ulepszania…', 'working');
        forceStopMovement();
        void runUpgrade(true).finally(() => {
            // runUpgrade może zakończyć się przed wejściem do swojego bloku
            // finally, jeśli w tej samej chwili zniknął cel lub materiał.
            if (!running) removeArtisanshipLock();
        });
    }

    function automationReasonText(state) {
        return {
            destroyed: 'dodatek wyłączony',
            running: 'ulepszanie trwa',
            battle: 'oczekiwanie na koniec walki',
            game_starting: 'oczekiwanie na pełne uruchomienie gry',
            page_hidden: 'karta gry jest w tle',
            retry_blocked: 'wstrzymano kolejną próbę po błędzie',
            hero_moving: 'oczekiwanie, aż postać się zatrzyma',
            map_loading: 'oczekiwanie na załadowanie mapy',
            cooldown: 'krótka przerwa po ostatniej próbie',
            disabled: 'automat wyłączony',
            no_targets: 'brak ustawionego przedmiotu',
            no_materials: 'brak pasujących materiałów',
            free_slots_unavailable: 'nie udało się odczytać wolnych miejsc',
            free_slots_threshold: 'osiągnięto próg wolnych miejsc',
            materials_threshold: 'osiągnięto próg materiałów',
            waiting: 'próg nie został jeszcze osiągnięty'
        }[state?.reason] || 'oczekiwanie';
    }

    function getItemIdFromElement(element) {
        if (!(element instanceof Element)) return null;

        const itemElement = element.closest(
            '.item[class*="item-id-"], [data-item-id], [id^="item"]'
        );
        if (!itemElement) return null;

        const classMatch = String(itemElement.className || '')
            .match(/(?:^|\s)item-id-(\d+)(?:\s|$)/);
        const idMatch = String(itemElement.id || '').match(/^item(\d+)$/);

        return normalizeId(
            itemElement.dataset?.itemId ??
            classMatch?.[1] ??
            idMatch?.[1]
        );
    }

    function extractError(response) {
        const enhancement = response?.enhancement || {};
        const candidates = [
            enhancement.error,
            enhancement.err,
            enhancement.alert,
            response?.error,
            response?.err,
            response?.alert,
            response?.warning
        ];

        return candidates.find(value => (
            typeof value === 'string' && value.trim()
        )) || null;
    }

    function installResponseHook() {
        if (responseHookRestore) return true;

        const communication = W.Engine?.communication;
        const owner = typeof communication?.parseJSON === 'function'
            ? communication
            : W;
        const method = owner === communication ? 'parseJSON' : 'parseInput';
        const original = owner?.[method];

        if (typeof original !== 'function') return false;

        function wrappedResponse(response) {
            try {
                interceptResponseBeforeGame(response);
            } catch (error) {
                // Błąd dodatku nigdy nie może zatrzymać głównego parsera gry.
                console.error(
                    '[FR Ulepszarka] Błąd przechwytywania odpowiedzi:',
                    error
                );
            }

            const result = original.apply(this, arguments);
            setTimeout(() => {
                try {
                    syncServerDailyUsage();
                    refreshStatistics();
                } catch (error) {
                    console.warn(
                        '[FR Ulepszarka] Nie odświeżono statystyk:',
                        error
                    );
                }
            }, 0);
            return result;
        }

        wrappedResponse.__garbatyUlepszaraResponseHook = true;
        owner[method] = wrappedResponse;
        responseHookRestore = () => {
            if (owner[method] === wrappedResponse) {
                owner[method] = original;
            }
            responseHookRestore = null;
        };
        return true;
    }

    function interceptResponseBeforeGame(response) {
        if (!response || typeof response !== 'object') return;

        syncServerDailyUsage(response);

        if (response.f || response.town?.file) {
            artisanshipOpenedAt = 0;
            pendingCraftingTargetId = null;
            removeArtisanshipLock();
        }

        suppressTemporaryCraftingMove(response);

        for (const [key, waiters] of responseInterceptors) {
            if (!Object.prototype.hasOwnProperty.call(response, key)) {
                continue;
            }

            responseInterceptors.delete(key);
            const payload = response[key];

            for (const waiter of waiters) {
                clearTimeout(waiter.timer);
                waiter.resolve({ [key]: payload });
            }

            // Tak samo robi Priw8: odpowiedź trafia do Ulepszary, lecz nie do
            // zwykłego handlera gry, więc okno rzemiosła nie jest budowane.
            delete response[key];
        }
    }

    function suppressTemporaryCraftingMove(response) {
        const itemChanges = response.item;
        if (!itemChanges || typeof itemChanges !== 'object') return;

        if (pendingCraftingTargetId) {
            const temporaryKey = `-${pendingCraftingTargetId}`;
            const temporaryChange = itemChanges[temporaryKey];

            // Podczas ulepszania serwer chwilowo przenosi cel do lokacji "u"
            // (crafting). Zwykły handler gry podmienia wtedy ikonę/slot w torbie.
            if (temporaryChange?.loc === 'u') {
                delete itemChanges[temporaryKey];
                pendingCraftingTargetId = null;
            }
        }

    }

    function normalizeServerUsage(value) {
        const count = Number(value);
        return Number.isFinite(count) && count >= 0
            ? Math.floor(count)
            : null;
    }

    function findServerUsageInResponse(
        value,
        depth = 0,
        seen = new WeakSet(),
        path = ''
    ) {
        if (
            !value ||
            typeof value !== 'object' ||
            depth > 8 ||
            seen.has(value)
        ) {
            return null;
        }

        seen.add(value);

        for (const [key, child] of Object.entries(value)) {
            const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '');
            const childPath = path
                ? `${path}.${normalizedKey}`
                : normalizedKey;

            if (
                (
                    /enhance.*usag|usag.*enhance/.test(normalizedKey) ||
                    /usages?preview|previewusages?/.test(normalizedKey) ||
                    /daily.*usag|usag.*daily/.test(normalizedKey)
                ) &&
                child &&
                typeof child === 'object'
            ) {
                const direct = normalizeServerUsage(
                    child.count ?? child.used ?? child.current
                );
                if (direct !== null) return direct;
            }

            if (
                /enhance.*count|salvag.*count|daily.*count/.test(normalizedKey)
            ) {
                const direct = normalizeServerUsage(child);
                if (direct !== null) return direct;
            }

            // Najczęstsza odpowiedź gry:
            // enhancement.usages_preview.count
            if (
                normalizedKey === 'count' &&
                /enhancement|enhance|usages?|salvag|artisanship/.test(
                    childPath
                )
            ) {
                const direct = normalizeServerUsage(child);
                if (direct !== null) return direct;
            }

            // Część wersji interfejsu zwraca wyłącznie { count, limit }.
            if (
                child &&
                typeof child === 'object' &&
                normalizeServerUsage(child.limit) === DAILY_ITEM_LIMIT
            ) {
                const direct = normalizeServerUsage(
                    child.count ?? child.used ?? child.current
                );
                if (direct !== null) return direct;
            }
        }

        for (const [key, child] of Object.entries(value)) {
            const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '');
            const found = findServerUsageInResponse(
                child,
                depth + 1,
                seen,
                path ? `${path}.${normalizedKey}` : normalizedKey
            );
            if (found !== null) return found;
        }

        return null;
    }

    function syncServerDailyUsage(response = null) {
        // Akceptujemy wyłącznie licznik zawarty w prawdziwej odpowiedzi
        // serwera. Domyślne Engine.*.count = 0 bywa puste i wcześniej
        // nadpisywało poprawnie zapamiętane 25/2000.
        const found = response
            ? findServerUsageInResponse(response)
            : null;

        if (found !== null) {
            serverDailyUsage = found;
            saveCachedServerDailyUsage(found);
            return true;
        }

        return serverDailyUsage !== null;
    }

    function syncServerDailyUsageFromEngine() {
        // NI przechowuje ostatni licznik zwrócony przez serwer w jednym
        // z poniższych obiektów. Sam odczyt nie wysyła żadnego zapytania,
        // nie otwiera rzemiosła i nie zakłada blokady ruchu.
        const candidates = [
            W.Engine?.enhanceUsages?.count,
            W.Engine?.crafting?.enhanceUsages?.count,
            W.Engine?.crafting?.d?.enhanceUsages?.count,
            W.Engine?.artisanship?.enhanceUsages?.count,
            W.Engine?.artisanship?.d?.enhanceUsages?.count
        ]
            .map(normalizeServerUsage)
            .filter(value => value !== null && value > 0);

        if (!candidates.length) return false;

        const found = Math.max(...candidates);
        if (found === serverDailyUsage) return true;

        serverDailyUsage = found;
        saveCachedServerDailyUsage(found);
        return true;
    }

    function syncServerDailyUsageFromDom(force = false) {
        if (!document.body) return false;
        if (!force && Date.now() - lastDomUsageScanAt < 500) {
            return false;
        }
        lastDomUsageScanAt = Date.now();

        const roots = [
            document.querySelector('#artisanship'),
            document.querySelector('[data-window-name="artisanship"]'),
            document.querySelector('[class*="artisanship"]'),
            document.querySelector('[class*="enhancement"]'),
            document.body
        ].filter(Boolean);

        for (const root of roots) {
            const text = String(
                root.innerText ||
                root.textContent ||
                ''
            );
            const match = text.match(
                /Dzienny\s+limit\s*:?\s*(\d+)\s*\/\s*(\d+)/i
            );
            if (!match) continue;

            const used = normalizeServerUsage(match[1]);
            const limit = normalizeServerUsage(match[2]);
            if (used === null || limit !== DAILY_ITEM_LIMIT) continue;

            serverDailyUsage = used;
            saveCachedServerDailyUsage(used);
            return true;
        }

        return false;
    }

    function installDailyUsageDomObserver() {
        if (dailyUsageDomObserver || !document.body) return;

        dailyUsageDomObserver = new MutationObserver(mutations => {
            const containsDailyLimit = mutations.some(mutation => {
                const changedText = [
                    mutation.target?.textContent,
                    ...Array.from(mutation.addedNodes || [], node => (
                        node?.textContent || ''
                    ))
                ].join(' ');

                return /Dzienny\s+limit/i.test(changedText);
            });

            if (!containsDailyLimit) return;

            setTimeout(() => {
                if (
                    !destroyed &&
                    syncServerDailyUsageFromDom(true)
                ) {
                    refreshStatistics();
                }
            }, 0);
        });

        dailyUsageDomObserver.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    function confirmServerBatchUsage(materialCount, response) {
        // Jeśli serwer podał pełny licznik, używamy go bez żadnych obliczeń.
        const explicitUsage = response
            ? findServerUsageInResponse(response)
            : null;

        if (explicitUsage !== null && explicitUsage > 0) {
            serverDailyUsage = explicitUsage;
            saveCachedServerDailyUsage(explicitUsage);
            return explicitUsage;
        }

        // W przeciwnym razie poprawna odpowiedź "enhancement" nadal
        // potwierdza, że ta konkretna partia została przyjęta przez serwer.
        const confirmedCount = Math.max(
            0,
            Math.floor(Number(materialCount) || 0)
        );
        serverDailyUsage = Math.min(
            DAILY_ITEM_LIMIT,
            Math.max(0, serverDailyUsage ?? 0) + confirmedCount
        );
        saveCachedServerDailyUsage(serverDailyUsage);
        return serverDailyUsage;
    }

    async function fetchDailyUsageByPreview() {
        if (
            destroyed ||
            running ||
            isBattleActive() ||
            typeof W._g !== 'function'
        ) {
            return false;
        }

        const targetEntry = getTargetEntries().find(entry => (
            isValidTarget(getItemById(entry.id))
        ));
        if (!targetEntry) return false;

        const material = getMaterials(
            targetEntry.id,
            targetEntry.index
        )[0];

        const command = material
            ? `enhancement&action=progress_preview&item=${encodeURIComponent(targetEntry.id)}` +
              `&ingredients=${encodeURIComponent(material.id)}`
            : `enhancement&action=status&item=${encodeURIComponent(targetEntry.id)}`;

        const response = await gameRequest(
            command,
            'enhancement',
            REQUEST_TIMEOUT_MS
        );

        return syncServerDailyUsage(response);
    }

    function refreshDailyUsageFromGame(force = false) {
        // Bezpieczeństwo: odczyt licznika jest wyłącznie pasywny.
        // Nie otwieramy osobnej sesji rzemiosła i nie wysyłamy podglądu,
        // ponieważ na części wersji NI blokowało to ruch lub zatrzymywało grę.
        syncServerDailyUsageFromEngine();
        syncServerDailyUsage();
        refreshStatistics();
        return Promise.resolve(serverDailyUsage !== null);

        /*
        if (destroyed || running || typeof W._g !== 'function') {
            return Promise.resolve(false);
        }

        if (dailyUsageRequest) return dailyUsageRequest;
        if (!force && Date.now() - lastDailyUsageRequestAt < 60_000) {
            return Promise.resolve(serverDailyUsage !== null);
        }

        lastDailyUsageRequestAt = Date.now();
        dailyUsageRequest = gameRequest(
            'artisanship&action=open',
            'artisanship',
            REQUEST_TIMEOUT_MS
        )
            .then(async response => {
                // Pełna odpowiedź została już odczytana w hooku przed tym,
                // jak ukryliśmy część budującą okno rzemiosła.
                const usageFoundInArtisanship =
                    syncServerDailyUsage(response);

                // Na części wersji interfejsu samo otwarcie rzemiosła nie
                // zawiera licznika. Podgląd jednej partii zwraca z serwera
                // enhancement.usages_preview.count i niczego nie zużywa.
                if (!usageFoundInArtisanship) {
                    await fetchDailyUsageByPreview();
                }

                refreshStatistics();
                return serverDailyUsage !== null;
            })
            .catch(error => {
                console.warn(
                    '[FR Ulepszarka] Nie pobrano dziennego limitu:',
                    error?.message || error
                );
                return false;
            })
            .finally(() => {
                dailyUsageRequest = null;
            });

        return dailyUsageRequest;
        */
    }

    function waitForGameResponse(key, timeout = REQUEST_TIMEOUT_MS) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                const waiters = responseInterceptors.get(key) || [];
                const remaining = waiters.filter(waiter => waiter.resolve !== resolve);

                if (remaining.length) {
                    responseInterceptors.set(key, remaining);
                } else {
                    responseInterceptors.delete(key);
                }

                reject(new Error('Gra nie odpowiedziała na zapytanie.'));
            }, timeout);

            const waiters = responseInterceptors.get(key) || [];
            waiters.push({ resolve, reject, timer });
            responseInterceptors.set(key, waiters);
        });
    }

    function addArtisanshipLock() {
        if (artisanshipLockActive) return true;

        try {
            if (typeof W.Engine?.lock?.add === 'function') {
                W.Engine.lock.add(ARTISANSHIP_LOCK);
            } else if (typeof W.g?.lock?.add === 'function') {
                W.g.lock.add(ARTISANSHIP_LOCK);
            } else {
                return false;
            }

            artisanshipLockActive = true;
            return true;
        } catch (error) {
            console.warn('[FR Ulepszarka] Nie założono blokady:', error);
            return false;
        }
    }

    function removeArtisanshipLock() {
        if (!artisanshipLockActive) return;

        try {
            if (typeof W.Engine?.lock?.remove === 'function') {
                W.Engine.lock.remove(ARTISANSHIP_LOCK);
            } else if (typeof W.g?.lock?.remove === 'function') {
                W.g.lock.remove(ARTISANSHIP_LOCK);
            }
        } catch (_) {}

        artisanshipLockActive = false;
    }

    function gameRequest(command, responseKey, timeout = REQUEST_TIMEOUT_MS) {
        if (typeof W._g !== 'function') {
            return Promise.reject(
                new Error('Gra nie udostępnia funkcji wysyłania zapytań.')
            );
        }

        if (!installResponseHook()) {
            return Promise.reject(
                new Error('Nie udało się podpiąć odbioru odpowiedzi gry.')
            );
        }

        const responsePromise = waitForGameResponse(responseKey, timeout);

        try {
            // Bez callbacka: wynik odbieramy wcześniej, w parseJSON/parseInput.
            W._g(command);
        } catch (error) {
            const waiters = responseInterceptors.get(responseKey) || [];
            for (const waiter of waiters) clearTimeout(waiter.timer);
            responseInterceptors.delete(responseKey);
            return Promise.reject(error);
        }

        return responsePromise;
    }

    async function openArtisanship() {
        addArtisanshipLock();
        const response = await gameRequest(
            'artisanship&action=open',
            'artisanship'
        );
        const error = extractError(response);
        if (error) throw new Error(error);
        return response;
    }

    async function prepareArtisanshipInBackground() {
        // Blokada jest zakładana przed zapytaniem i natychmiast przejmuje
        // sesję rzemiosła. Nie czekamy, aż animacja/ruch postaci ustanie.
        setStatus('Przygotowywanie ulepszania w tle…', 'working');
        await openArtisanship();
        artisanshipOpenedAt = Date.now();
        await sleep(20);
        return true;
    }

    async function commitBatch(targetId, materialIds) {
        const ingredients = materialIds.join(',');
        pendingCraftingTargetId = String(targetId).replace(/^-/, '');
        recordOperation('batch_sent', {
            targetId: String(targetId),
            materialCount: materialIds.length
        });

        let response;
        try {
            response = await gameRequest(
                `enhancement&action=progress&item=${targetId}` +
                `&ingredients=${ingredients}` +
                '&answer1001012=1&answer1001015=1',
                'enhancement'
            );
            recordOperation('batch_received', {
                targetId: String(targetId),
                materialCount: materialIds.length
            });
        } catch (error) {
            recordOperation('batch_error', {
                targetId: String(targetId),
                materialCount: materialIds.length,
                error: String(error?.message || error)
            });
            throw error;
        }
        const error = extractError(response);
        if (error) throw new Error(error);
        if (response?.message?.[1801001]) {
            throw new Error('Osiągnięto dzienny limit ulepszania.');
        }
        confirmServerBatchUsage(materialIds.length, response);
        refreshStatistics();
        return response;
    }

    function enhancementResult(response) {
        const enhancement = response?.enhancement || response || {};
        const progress =
            enhancement.progressing ||
            enhancement.progress ||
            {};
        const current = safeNumber(progress.current, 0);
        const max = safeNumber(progress.max, 0);

        return {
            current,
            max,
            upgradeLevel:
                progress.upgradeLevel ??
                progress.upgrade_level ??
                null,
            completed: Boolean(enhancement.upgradable) ||
                (max > 0 && current >= max)
        };
    }

    function chunks(values, size) {
        const result = [];

        for (let index = 0; index < values.length; index += size) {
            result.push(values.slice(index, index + size));
        }

        return result;
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function isBattleActive() {
        try {
            return Boolean(
                W.Engine?.battle?.d?.id ||
                W.g?.battle ||
                document.querySelector('#fight:not([style*="display: none"])')
            );
        } catch (_) {
            return false;
        }
    }

    async function upgradeConfiguredTarget(targetIndex, targetId) {
        const target = getItemById(targetId);
        if (!target || !isValidTarget(target)) return 0;

        const targetEntry = getTargetEntries().find(entry => (
            entry.id === String(targetId) &&
            entry.index === Number(targetIndex)
        ));
        const allowedClasses = targetEntry?.allowedClasses || null;
        const materials = getMaterials(targetId, targetIndex);
        if (!materials.length) return 0;

        if (!artisanshipOpenedAt) {
            await prepareArtisanshipInBackground();
        }

        let used = 0;
        const batches = chunks(
            materials.map(item => String(item.id)),
            batchSizeForInterface()
        );

        for (let index = 0; index < batches.length; index++) {
            if (
                !artisanshipOpenedAt ||
                lastMovementAt >= artisanshipOpenedAt
            ) {
                await prepareArtisanshipInBackground();
            }

            // Kontrola jest wykonywana ponownie tuż przed wysłaniem.
            // Dzięki temu przedmiot z zabronionym dopiskiem nie trafi
            // do żądania nawet po zmianie danych/tooltipu w trakcie pracy.
            const batch = batches[index].filter(id => {
                const item = getItemById(id);
                return isAllowedMaterial(
                    item,
                    targetId,
                    allowedClasses
                );
            });
            if (!batch.length) continue;

            setStatus(
                `${target.name || `Cel ${targetIndex + 1}`}: partia ` +
                `${index + 1}/${batches.length} (${batch.length} szt.)…`,
                'working'
            );

            const response = await commitBatch(targetId, batch);
            const progress = enhancementResult(response);
            saveTargetProgress(targetId, progress);
            used += batch.length;

            if (progress.completed) break;
            if (index + 1 < batches.length) {
                await sleep(BETWEEN_BATCHES_MS);
            }
        }
        return used;
    }

    async function runUpgrade(automatic = false) {
        if (running || destroyed) return false;

        if (automatic) {
            const safety = automaticSafetyState();
            if (!safety.safe) return false;
        }

        const targets = getTargetEntries().filter(({ id }) => (
            isValidTarget(getItemById(id))
        ));
        if (!targets.length) {
            if (!automatic) {
                setStatus(
                    'Wybierz przynajmniej jeden przedmiot do ulepszania.',
                    'error'
                );
            }
            return false;
        }

        if (isBattleActive()) {
            if (!automatic) {
                setStatus('Nie można ulepszać podczas walki.', 'error');
            }
            return false;
        }

        const available = targets.reduce(
            (sum, entry) => sum +
                getMaterials(entry.id, entry.index).length,
            0
        );
        if (!available) {
            if (!automatic) {
                setStatus(
                    'Brak pasujących materiałów dla ustawionych celów.',
                    'error'
                );
            }
            return false;
        }

        running = true;
        refreshButtons();

        try {
            let totalUsed = 0;
            for (const { index, id } of targets) {
                totalUsed += await upgradeConfiguredTarget(index, id);
            }

            refreshView();
            if (totalUsed > 0) {
                setStatus(
                    `${automatic ? 'Automat: g' : 'G'}otowe. ` +
                    `Zużyto ${totalUsed} materiałów.`,
                    'success'
                );
                return true;
            }
            return false;
        } catch (error) {
            console.error('[FR Ulepszarka]', error);
            if (automatic) {
                automaticRetryBlockedUntil = Date.now() + 60_000;
            }
            setStatus(
                `Przerwano: ${error?.message || 'nieznany błąd gry'}`,
                'error'
            );
            return false;
        } finally {
            running = false;
            artisanshipOpenedAt = 0;
            pendingCraftingTargetId = null;
            removeArtisanshipLock();
            refreshButtons();
            setTimeout(() => {
                if (!destroyed) refreshDailyUsageFromGame(true);
            }, 250);
        }
    }

    function escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = String(value ?? '');
        return div.innerHTML;
    }

    function rarityColor(item) {
        return {
            common: '#d3d3d3',
            unique: '#e8d44d',
            heroic: '#5aa9ff',
            legendary: '#ff8838'
        }[itemRarity(item)] || '#d3d3d3';
    }

    function setStatus(text, type = 'info') {
        if (!statusNode) return;
        statusNode.textContent = text;
        statusNode.dataset.type = type;
    }

    function refreshTarget() {
        if (!targetNode) return;

        const usage = getHeroUsage();
        const entries = getTargetEntries();
        targetNode.innerHTML = entries
            .map(({ index, id, allowedClasses }) => {
                const target = getItemById(id);
                const progress = id
                    ? usage.progressByTarget[id]
                    : null;
                const progressText = progress?.max > 0
                    ? `${progress.current}/${progress.max}`
                    : 'brak postępu';

                return `
                    <div class="gu-target-wrapper">
                        <div class="gu-target-card">
                            <button
                                type="button"
                                class="gu-target-icon"
                                data-select-target="${index}"
                                data-icon-target="${id}"
                                title="Zmień ulepszany przedmiot"
                            >◆</button>
                            <div class="gu-target-card-text">
                                <strong style="color:${rarityColor(target)}">
                                    ${escapeHtml(
                                        target?.name || `Przedmiot ${id}`
                                    )}
                                </strong>
                                <small>
                                    lvl ${itemLevel(target)} • ${progressText}
                                </small>
                            </div>
                            <button type="button" class="gu-target-remove"
                                data-clear-target="${index}">×</button>
                        </div>
                        <details class="gu-target-types">
                            <summary>Jakimi grupami ulepszać ten przedmiot</summary>
                            <div>
                                ${Object.entries(TARGET_GROUPS)
                                    .map(([groupId, definition]) => `
                                        <label class="gu-material-group">
                                            <input type="checkbox"
                                                data-target-index="${index}"
                                                data-target-group="${groupId}"
                                                ${materialGroupEnabled(
                                                    allowedClasses,
                                                    definition
                                                ) ? 'checked' : ''}>
                                            <span>
                                                <b>${escapeHtml(definition.label)}</b>
                                                <small>${definition.classes
                                                    .map(itemClassId => ITEM_TYPES[itemClassId])
                                                    .join(', ')}</small>
                                            </span>
                                        </label>
                                    `).join('')}
                            </div>
                        </details>
                    </div>
                `;
            })
            .join('') + `
                <button type="button" class="gu-button secondary"
                    data-add-target>DODAJ KOLEJNY PRZEDMIOT</button>
                <small class="gu-target-priority">
                    Przy powtarzających się typach pierwszeństwo ma cel wyżej.
                </small>
            `;

        if (compactTargetNode) {
            compactTargetIndex = entries.length
                ? Math.min(compactTargetIndex, entries.length - 1)
                : 0;

            if (entries.length) {
                const { id, index } = entries[compactTargetIndex];
                const target = getItemById(id);
                const progress = usage.progressByTarget[id] || {};
                const current = safeNumber(progress.current, 0);
                const max = safeNumber(progress.max, 0);
                const level =
                    progress.upgradeLevel ??
                    itemUpgradeLevel(target) ??
                    0;
                const width = max > 0
                    ? Math.min(100, (current / max) * 100)
                    : 0;
                const navigation = entries.length > 1
                    ? `
                        <div class="gu-target-navigation">
                            <button type="button" data-compact-prev
                                title="Poprzedni przedmiot">‹</button>
                            <span>${compactTargetIndex + 1} / ${entries.length}</span>
                            <button type="button" data-compact-next
                                title="Następny przedmiot">›</button>
                        </div>
                    `
                    : '';

                compactTargetNode.innerHTML = `
                    <div class="gu-focus-target">
                        <button type="button" class="gu-focus-icon"
                            data-open-target-settings="${index}"
                            data-icon-target="${id}"
                            title="Otwórz ustawienia przedmiotu">◆</button>
                        <strong style="color:${rarityColor(target)}">
                            ${escapeHtml(target?.name || `Przedmiot ${id}`)}
                        </strong>
                        <small>
                            Poziom ulepszenia: +${escapeHtml(level)}
                        </small>
                        <div class="gu-focus-progress-text">
                            Progres:
                            <b>${max > 0 ? `${current} / ${max}` : 'brak danych'}</b>
                        </div>
                        <span class="gu-compact-progress">
                            <i style="width:${width}%"></i>
                        </span>
                        ${navigation}
                    </div>
                `;
            } else {
                compactTargetNode.innerHTML = `
                    <button type="button" class="gu-empty-targets"
                        data-open-settings>
                        Brak ulepszanych przedmiotów<br>
                        <small>Kliknij, aby przejść do ustawień</small>
                    </button>
                `;
            }

            compactTargetNode
                .querySelectorAll(
                    '[data-open-settings], [data-open-target-settings]'
                )
                .forEach(button => {
                    button.addEventListener(
                        'click',
                        () => setSettingsView(true)
                    );
                });

            compactTargetNode.querySelector('[data-compact-prev]')
                ?.addEventListener('click', () => {
                    compactTargetIndex =
                        (compactTargetIndex - 1 + entries.length) %
                        entries.length;
                    refreshTarget();
                });
            compactTargetNode.querySelector('[data-compact-next]')
                ?.addEventListener('click', () => {
                    compactTargetIndex =
                        (compactTargetIndex + 1) % entries.length;
                    refreshTarget();
                });
        }

        targetNode.querySelectorAll('[data-select-target]').forEach(button => {
            button.addEventListener('click', () => {
                selectingTarget = true;
                selectingTargetGroup = button.dataset.selectTarget;
                setStatus(
                    'Kliknij nowy ulepszany przedmiot w torbie.',
                    'working'
                );
            });
        });
        targetNode.querySelector('[data-add-target]')?.addEventListener(
            'click',
            () => {
                selectingTarget = true;
                selectingTargetGroup = 'new';
                setStatus(
                    'Kliknij przedmiot, który chcesz dodać do ulepszania.',
                    'working'
                );
            }
        );
        targetNode.querySelectorAll('[data-clear-target]').forEach(button => {
            button.addEventListener('click', () => {
                setTargetId(null, button.dataset.clearTarget);
            });
        });
        targetNode.querySelectorAll('[data-target-group]').forEach(input => {
            input.addEventListener('change', () => {
                setTargetMaterialGroup(
                    Number(input.dataset.targetIndex),
                    input.dataset.targetGroup,
                    input.checked
                );
            });
        });
        paintTargetIcons();
    }

    function itemIconValue(item) {
        const values = [
            item?.icon,
            item?.image,
            item?.img,
            item?.src,
            item?.d?.icon,
            item?.d?.image,
            item?._cachedIcon,
            item?._cachedStats?.icon,
            item?.tpl?.icon
        ];

        for (const value of values) {
            if (typeof value === 'string' && value.trim()) {
                return value.trim();
            }
            if (value && typeof value === 'object') {
                const nested = value.src || value.url || value.path;
                if (typeof nested === 'string' && nested.trim()) {
                    return nested.trim();
                }
            }
        }

        return '';
    }

    function itemImageCandidates(item) {
        const icon = itemIconValue(item);
        if (!icon) return [];

        if (/^(?:data:|blob:|https?:\/\/)/i.test(icon)) {
            return [icon];
        }

        const clean = icon
            .replace(/^https?:\/\/[^/]+/i, '')
            .replace(/^\/+/, '');
        const withoutItemPrefix = clean.replace(/^obrazki\/itemy\//i, '');
        const candidates = [
            `${ITEM_IMAGE_BASE}${withoutItemPrefix}`,
            `https://micc.garmory-cdn.cloud/${clean}`
        ];

        if (!/\.[a-z0-9]{2,5}(?:[?#]|$)/i.test(withoutItemPrefix)) {
            candidates.push(`${ITEM_IMAGE_BASE}${withoutItemPrefix}.gif`);
        }

        return [...new Set(candidates)];
    }

    function copyRenderedItemIcon(slot, source) {
        if (source instanceof HTMLCanvasElement) {
            const canvas = document.createElement('canvas');
            canvas.width = 32;
            canvas.height = 32;
            canvas.getContext('2d')?.drawImage(source, 0, 0, 32, 32);
            slot.replaceChildren(canvas);
            return true;
        }

        if (source instanceof HTMLImageElement && source.src) {
            const image = document.createElement('img');
            image.src = source.src;
            image.alt = '';
            image.draggable = false;
            slot.replaceChildren(image);
            return true;
        }

        return false;
    }

    function loadStoredItemIcon(slot, item) {
        const candidates = itemImageCandidates(item);
        if (!candidates.length) return;

        let candidateIndex = 0;
        const tryNext = () => {
            if (candidateIndex >= candidates.length) return;

            const image = document.createElement('img');
            image.alt = '';
            image.draggable = false;
            image.onload = () => {
                if (slot.isConnected) slot.replaceChildren(image);
            };
            image.onerror = tryNext;
            image.src = candidates[candidateIndex++];
        };

        tryNext();
    }

    function paintTargetIcons() {
        setTimeout(() => {
            panel?.querySelectorAll('[data-icon-target]').forEach(slot => {
                const id = normalizeId(slot.dataset.iconTarget);
                if (!id) return;

                const item = getItemById(id);
                const itemElement =
                    item?.domElement ||
                    item?.element ||
                    item?.el ||
                    null;
                const source =
                    itemElement?.querySelector?.('canvas, img') ||
                    document.querySelector(
                        `.item-id-${id} canvas.icon, ` +
                        `.item-id-${id} canvas.canvas-icon, ` +
                        `.item-id-${id} canvas, ` +
                        `.item-id-${id} img, ` +
                        `[data-item-id="${id}"] canvas, ` +
                        `[data-item-id="${id}"] img, ` +
                        `#item${id} canvas, ` +
                        `#item${id} img`
                    );

                if (!copyRenderedItemIcon(slot, source)) {
                    loadStoredItemIcon(slot, item);
                }
            });
        }, 0);
    }

    function refreshMaterials() {
        const materials = getAllConfiguredMaterials();

        if (materialCountNode) {
            materialCountNode.textContent =
                `Gotowe materiały: ${materials.length}`;
        }

        if (!previewNode || previewNode.hidden) return;

        previewNode.innerHTML = materials.length
            ? materials.slice(0, 30).map(item => `
                <div>
                    <span style="color:${rarityColor(item)}">
                        ${escapeHtml(item.name || `Przedmiot ${item.id}`)}
                    </span>
                    <small>lvl ${itemLevel(item)} • ${escapeHtml(ITEM_TYPES[itemClass(item)])}</small>
                </div>
            `).join('') +
              (materials.length > 30
                  ? `<div class="gu-muted">…i jeszcze ${materials.length - 30}</div>`
                  : '')
            : '<div class="gu-muted">Brak pasujących materiałów.</div>';
    }

    function refreshStatistics() {
        const usage = getHeroUsage();
        syncServerDailyUsageFromEngine();
        syncServerDailyUsageFromDom();
        syncServerDailyUsage();
        const burned = serverDailyUsage;
        const remainingDaily = burned === null
            ? null
            : Math.max(0, DAILY_ITEM_LIMIT - burned);

        if (dailyLimitNode) {
            dailyLimitNode.innerHTML = `
                <span>Spalono dzisiaj</span>
                <strong>
                    ${burned === null
                        ? `— / ${DAILY_ITEM_LIMIT}`
                        : `${burned} / ${DAILY_ITEM_LIMIT}`}
                </strong>
                <small>
                    ${remainingDaily === null
                        ? 'Oczekiwanie na dane serwera'
                        : `Pozostało ${remainingDaily} • dane serwera`}
                </small>
            `;
        }

        if (!progressInfoNode) return;

        const materials = getAllConfiguredMaterials();
        const knownPointMaterials = materials.filter(
            item => itemEnhancementPoints(item) > 0
        );
        const materialPoints = knownPointMaterials.reduce(
            (sum, item) => sum + itemEnhancementPoints(item),
            0
        );
        const batchSize = batchSizeForInterface();
        const batches = Math.ceil(materials.length / batchSize);
        progressInfoNode.innerHTML = `
            <div>
                <span>Gotowe materiały</span>
                <strong>${materials.length} szt. • ${batches} part.</strong>
                <small>
                    ${knownPointMaterials.length
                        ? `Łącznie ${materialPoints} pkt • partie po ${batchSize}`
                        : 'Gra nie podała wartości punktowej materiałów'}
                </small>
            </div>
        `;

        const freeSlotsNode = panel?.querySelector('[data-free-slots-info]');
        if (freeSlotsNode) {
            const automaticState = evaluateAutomaticRun();
            const freeSlots = automaticState.freeSlots;
            freeSlotsNode.innerHTML = freeSlots === null
                ? `Wolne miejsca: brak danych interfejsu<br>
                   Automat: ${escapeHtml(
                       automationReasonText(automaticState)
                   )}`
                : `Wolne miejsca w torbach: <b>${freeSlots}</b>
                   (próg: ≤ ${settings.autoFreeSlots})${
                       automaticState.freeSlotsCounters
                           ? `<br>Torby: ${
                               automaticState.freeSlotsCounters.join(' + ')
                           }`
                           : ''
                   }<br>
                   Automat: ${escapeHtml(
                       automationReasonText(automaticState)
                   )}`;
        }
    }

    function refreshView() {
        refreshTarget();
        refreshMaterials();
        refreshStatistics();
    }

    function refreshButtons() {
        if (!panel) return;
        const runButton = panel.querySelector('[data-action="run"]');

        if (runButton) {
            runButton.disabled = running;
            runButton.textContent = running
                ? 'TRWA ULEPSZANIE…'
                : 'ULEPSZ TERAZ';
        }
    }

    function installStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            #${PANEL_ID} {
                position: fixed;
                z-index: 2147483000;
                width: 326px;
                color: #d6d6d6;
                background: #111416;
                border: 1px solid #34393b;
                border-radius: 6px;
                box-shadow: 0 12px 35px rgba(0,0,0,.68);
                font: 12px Arial, sans-serif;
                overflow: hidden;
            }
            #${PANEL_ID} * { box-sizing: border-box; }
            #${PANEL_ID} .gu-header {
                height: 36px;
                display: flex;
                align-items: center;
                gap: 7px;
                padding: 0 9px;
                background: #181b1d;
                border-bottom: 1px solid #2b2f31;
                cursor: move;
                user-select: none;
            }
            #${PANEL_ID} .gu-title { color: #d8bc65; font-weight: 700; }
            #${PANEL_ID} .gu-version { color: #707578; font-size: 10px; }
            #${PANEL_ID} .gu-active-dot {
                width: 9px;
                height: 9px;
                flex: 0 0 9px;
                background: #31bd55;
                border: 1px solid #16722d;
                border-radius: 50%;
                box-shadow: 0 0 5px rgba(49,189,85,.55);
            }
            #${PANEL_ID} .gu-actions { margin-left: auto; display: flex; gap: 4px; }
            #${PANEL_ID} .gu-icon {
                width: 23px;
                height: 23px;
                padding: 0;
                color: #bbb;
                background: #222628;
                border: 1px solid #3c4143;
                border-radius: 3px;
                cursor: pointer;
            }
            #${PANEL_ID} .gu-body {
                padding: 9px;
                max-height: 610px;
                overflow: auto;
            }
            #${PANEL_ID}.collapsed .gu-body { display: none; }
            #${PANEL_ID} .gu-section {
                margin-bottom: 8px;
                padding: 8px;
                background: #171a1c;
                border: 1px solid #292d2f;
                border-radius: 4px;
            }
            #${PANEL_ID} .gu-section-title {
                margin-bottom: 6px;
                color: #c9ae59;
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
            }
            #${PANEL_ID} .gu-target {
                min-height: 39px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 6px;
                padding: 6px;
                background: #0d0f10;
                border: 1px solid #34383a;
                border-radius: 3px;
            }
            #${PANEL_ID} .gu-target-name {
                min-width: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                font-weight: 700;
            }
            #${PANEL_ID} .gu-target-name span {
                display: block;
                color: #73787a;
                font-size: 10px;
                font-weight: 400;
            }
            #${PANEL_ID} .gu-target button {
                color: #d77;
                background: transparent;
                border: 0;
                font-size: 18px;
                cursor: pointer;
            }
            #${PANEL_ID} .gu-row {
                min-height: 27px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
            }
            #${PANEL_ID} label { cursor: pointer; }
            #${PANEL_ID} .gu-types {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 4px 8px;
                margin-top: 7px;
            }
            #${PANEL_ID} details summary {
                color: #c9ae59;
                cursor: pointer;
            }
            #${PANEL_ID} .gu-button {
                width: 100%;
                min-height: 31px;
                margin-top: 6px;
                color: #eee;
                background: #292418;
                border: 1px solid #806c31;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 700;
                cursor: pointer;
            }
            #${PANEL_ID} .gu-button.secondary {
                color: #bbb;
                background: #212426;
                border-color: #414648;
            }
            #${PANEL_ID} .gu-button:disabled { opacity: .55; cursor: wait; }
            #${PANEL_ID} .gu-info {
                margin-top: 5px;
                color: #858a8d;
                font-size: 10px;
            }
            #${PANEL_ID} .gu-status {
                min-height: 34px;
                margin-top: 8px;
                padding: 7px;
                color: #afb4b6;
                background: #0d0f10;
                border-left: 3px solid #686d70;
                line-height: 1.35;
            }
            #${PANEL_ID} .gu-status[data-type="working"] { color: #ddc36e; border-color: #caaa48; }
            #${PANEL_ID} .gu-status[data-type="success"] { color: #7fd083; border-color: #63ad67; }
            #${PANEL_ID} .gu-status[data-type="error"] { color: #e37b7b; border-color: #c65252; }
            #${PANEL_ID} .gu-preview {
                max-height: 170px;
                overflow: auto;
                margin-top: 7px;
                padding: 6px;
                background: #0d0f10;
                border: 1px solid #2c3032;
            }
            #${PANEL_ID} .gu-preview > div {
                padding: 3px 0;
                border-bottom: 1px solid #222628;
            }
            #${PANEL_ID} .gu-preview small {
                display: block;
                color: #666c6e;
            }
            #${PANEL_ID} .gu-muted { color: #6f7476; }
            #${PANEL_ID} .gu-target {
                display: grid;
                gap: 5px;
            }
            #${PANEL_ID} .gu-target-card {
                display: grid;
                grid-template-columns: 38px 1fr 20px;
                align-items: center;
                gap: 7px;
                min-height: 40px;
                padding: 5px;
                background: #111415;
                border: 1px solid #34393b;
                border-left: 2px solid #806c31;
                border-radius: 3px;
            }
            #${PANEL_ID} .gu-target-icon {
                width: 36px;
                height: 36px;
                padding: 1px;
                color: #d6bd64;
                background: #080a0b;
                border: 1px solid #766329;
                border-radius: 3px;
                font-size: 20px;
                cursor: pointer;
            }
            #${PANEL_ID} .gu-target-icon canvas,
            #${PANEL_ID} .gu-target-icon img {
                display: block;
                width: 32px;
                height: 32px;
                object-fit: contain;
            }
            #${PANEL_ID} .gu-target-card-text {
                min-width: 0;
            }
            #${PANEL_ID} .gu-target-card-text strong,
            #${PANEL_ID} .gu-target-card-text small {
                display: block;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            #${PANEL_ID} .gu-target-card-text small {
                margin-top: 2px;
                color: #6f7577;
            }
            #${PANEL_ID} .gu-target-remove {
                color: #a66;
                background: transparent;
                border: 0;
                cursor: pointer;
            }
            #${PANEL_ID} .gu-target-wrapper {
                padding: 4px;
                background: #0d0f10;
                border: 1px solid #292d2f;
                border-radius: 4px;
            }
            #${PANEL_ID} .gu-target-types summary {
                margin: 5px 2px 1px;
                color: #8e9496;
                font-size: 10px;
                cursor: pointer;
            }
            #${PANEL_ID} .gu-target-types > div {
                display: grid;
                grid-template-columns: 1fr;
                gap: 3px;
                padding: 5px;
                color: #aeb3b5;
                font-size: 10px;
            }
            #${PANEL_ID} .gu-target-types label {
                display: flex;
                align-items: flex-start;
                gap: 5px;
                padding: 3px;
                border: 1px solid #24282a;
                border-radius: 3px;
                background: #121516;
            }
            #${PANEL_ID} .gu-material-group span {
                display: flex;
                min-width: 0;
                flex-direction: column;
                gap: 1px;
            }
            #${PANEL_ID} .gu-material-group b {
                color: #d0b65e;
                font-size: 10px;
            }
            #${PANEL_ID} .gu-material-group small {
                color: #777e80;
                font-size: 9px;
                line-height: 1.25;
            }
            #${PANEL_ID} .gu-target-priority {
                display: block;
                margin: 4px 2px 0;
                color: #666d70;
                font-size: 9px;
            }
            #${PANEL_ID} .gu-compact-targets {
                margin-bottom: 6px;
            }
            #${PANEL_ID} .gu-focus-target {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 8px 7px 6px;
                text-align: center;
            }
            #${PANEL_ID} .gu-focus-icon {
                width: 54px;
                height: 54px;
                margin-bottom: 5px;
                padding: 3px;
                color: #d5bd66;
                background: #090b0c;
                border: 2px ridge #737779;
                border-radius: 3px;
                box-shadow: inset 0 0 0 2px #202426;
                cursor: pointer;
            }
            #${PANEL_ID} .gu-focus-icon canvas,
            #${PANEL_ID} .gu-focus-icon img {
                display: block;
                width: 44px;
                height: 44px;
                object-fit: contain;
                image-rendering: pixelated;
            }
            #${PANEL_ID} .gu-focus-target > strong,
            #${PANEL_ID} .gu-focus-target > small {
                display: block;
                width: 100%;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            #${PANEL_ID} .gu-focus-target > strong {
                font-size: 12px;
                text-shadow: 0 1px #000;
            }
            #${PANEL_ID} .gu-focus-target > small {
                margin-top: 3px;
                color: #8c9294;
                font-size: 9px;
            }
            #${PANEL_ID} .gu-focus-progress-text {
                width: 100%;
                margin-top: 8px;
                color: #aeb2b4;
                font-size: 11px;
            }
            #${PANEL_ID} .gu-focus-progress-text b {
                color: #d2d5d6;
            }
            #${PANEL_ID} .gu-compact-progress {
                display: block;
                width: 100%;
                height: 3px;
                margin-top: 5px;
                overflow: hidden;
                background: #272b2d;
                border-radius: 2px;
            }
            #${PANEL_ID} .gu-compact-progress i {
                display: block;
                height: 100%;
                background: #b99b3c;
            }
            #${PANEL_ID} .gu-target-navigation {
                display: grid;
                grid-template-columns: 25px 1fr 25px;
                align-items: center;
                width: 100%;
                margin-top: 6px;
                color: #777d7f;
                font-size: 9px;
            }
            #${PANEL_ID} .gu-target-navigation button {
                height: 20px;
                padding: 0;
                color: #cdb45f;
                background: #1b1f20;
                border: 1px solid #3b4143;
                cursor: pointer;
            }
            #${PANEL_ID} .gu-empty-targets {
                width: 100%;
                padding: 13px;
                color: #999fa1;
                background: #101314;
                border: 1px dashed #555c5e;
                cursor: pointer;
            }
            #${PANEL_ID} .gu-settings-heading {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 7px;
                color: #d2d5d6;
            }
            #${PANEL_ID} .gu-settings-heading button {
                padding: 3px 8px;
                color: #cdb45f;
                background: #1c1f20;
                border: 1px solid #66582d;
                cursor: pointer;
            }
            #${PANEL_ID} .gu-type-settings summary {
                color: #b9bdbe;
                cursor: pointer;
            }
            #${PANEL_ID} .gu-type-settings .gu-types {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 3px;
                margin-top: 6px;
                font-size: 10px;
            }
            #${PANEL_ID} .gu-auto-settings label {
                display: flex;
                align-items: center;
                gap: 4px;
                margin-top: 5px;
                color: #aeb3b5;
                font-size: 10px;
            }
            #${PANEL_ID} .gu-auto-settings input[type="number"] {
                width: 42px;
                color: #ddd;
                background: #0c0e0f;
                border: 1px solid #414648;
            }
            #${PANEL_ID} .gu-auto-settings small {
                display: block;
                margin-top: 5px;
                color: #6f7577;
            }
            #${PANEL_ID}.gu-simple {
                width: 205px;
            }
            #${PANEL_ID}.gu-simple.settings-open {
                width: 326px;
            }
            #${PANEL_ID}.gu-simple .gu-body {
                padding: 7px;
                max-height: 560px;
            }
            #${PANEL_ID}.gu-simple .gu-section {
                margin-bottom: 6px;
                padding: 7px;
            }
            #${PANEL_ID}.gu-simple .gu-simple-target .gu-button {
                margin-top: 6px;
            }
            #${PANEL_ID}.gu-simple .gu-simple-filters {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 4px;
                color: #bfc3c4;
                font-size: 11px;
            }
            #${PANEL_ID}.gu-simple .gu-simple-filters label {
                display: flex;
                align-items: center;
                gap: 3px;
                white-space: nowrap;
            }
            #${PANEL_ID}.gu-simple .gu-simple-filters input {
                margin: 0;
            }
            #${PANEL_ID}.gu-simple .gu-simple-summary .gu-info {
                margin: 3px 0;
                text-align: center;
            }
            #${PANEL_ID}.gu-simple:not(.settings-open) .gu-simple-summary {
                padding: 7px 0;
                background: transparent;
                border-width: 1px 0;
                border-radius: 0;
            }
            #${PANEL_ID}.gu-simple:not(.settings-open) .gu-progress-info {
                display: none;
            }
            #${PANEL_ID} [data-daily-limit] {
                display: grid;
                grid-template-columns: 1fr auto;
                gap: 2px 8px;
                padding: 6px;
                color: #aeb3b5;
                background: #111415;
                border: 1px solid #303537;
                border-radius: 3px;
            }
            #${PANEL_ID} [data-daily-limit] strong {
                color: #d9c36d;
                font-size: 11px;
            }
            #${PANEL_ID} [data-daily-limit] small {
                grid-column: 1 / -1;
                color: #707679;
            }
            #${PANEL_ID}.gu-simple:not(.settings-open) [data-daily-limit] {
                margin-top: 6px;
                padding: 5px 2px;
                background: transparent;
                border: 0;
                border-top: 1px solid #353a3c;
                border-radius: 0;
                font-size: 11px;
            }
            #${PANEL_ID}.gu-simple:not(.settings-open) [data-daily-limit] small {
                display: none;
            }
            #${PANEL_ID} .gu-progress-info {
                display: grid;
                gap: 4px;
                margin-top: 5px;
            }
            #${PANEL_ID} .gu-progress-info > div {
                display: grid;
                grid-template-columns: 1fr auto;
                gap: 1px 7px;
                padding: 5px 6px;
                background: #111415;
                border-left: 2px solid #806c31;
            }
            #${PANEL_ID} .gu-progress-info span {
                color: #8f9597;
            }
            #${PANEL_ID} .gu-progress-info strong {
                color: #d8dcdd;
            }
            #${PANEL_ID} .gu-progress-info small {
                grid-column: 1 / -1;
                color: #6f7577;
            }
            #${PANEL_ID}.gu-simple .gu-simple-buttons {
                display: grid;
                grid-template-columns: .8fr 1.2fr;
                gap: 6px;
            }
            #${PANEL_ID}.gu-simple .gu-simple-buttons .gu-button {
                margin-top: 0;
            }
            #${PANEL_ID}.gu-simple .gu-status {
                min-height: 30px;
                margin-top: 6px;
                padding: 6px;
            }
            #${PANEL_ID}.gu-simple:not(.settings-open) .gu-status[data-type="info"] {
                display: none;
            }
            #${PANEL_ID}.gu-simple .gu-preview {
                max-height: 125px;
            }
        `;
        document.head.appendChild(style);
    }

    function createPanelLegacy() {
        installStyles();

        panel = document.createElement('div');
        panel.id = PANEL_ID;
        panel.style.left = `${Math.max(0, settings.position.left)}px`;
        panel.style.top = `${Math.max(0, settings.position.top)}px`;
        panel.classList.toggle('collapsed', settings.collapsed);
        panel.innerHTML = `
            <div class="gu-header">
                <span class="gu-active-dot" title="Frost Reaper Ulepszarka aktywna"></span>
                <span class="gu-title">Frost Reaper • Ulepszarka</span>
                <div class="gu-actions">
                    <button type="button" class="gu-icon" data-action="collapse">—</button>
                    <button type="button" class="gu-icon" data-action="close">×</button>
                </div>
            </div>
            <div class="gu-body">
                <div class="gu-section">
                    <div class="gu-section-title">Przedmiot ulepszany</div>
                    <div class="gu-target"></div>
                    <button type="button" class="gu-button secondary" data-action="select">
                        WYBIERZ PRZEDMIOT Z TORBY
                    </button>
                    <div class="gu-info">
                        Możesz też kliknąć przedmiot prawym i wybrać „Ulepsz ten przedmiot”.
                    </div>
                </div>

                <div class="gu-section">
                    <div class="gu-section-title">Materiały</div>
                    <div class="gu-row">
                        <label><input type="checkbox" data-setting="useCommon"> Pospolite</label>
                        <label><input type="checkbox" data-setting="useUnique"> Unikaty</label>
                    </div>
                    <div class="gu-row">
                        <label><input type="checkbox" data-setting="allowBound"> Pozwól na związane</label>
                    </div>
                    <div class="gu-info">
                        Heroiki, legendy, przedmioty ulepszone, eventowe i używane
                        w zestawach są zawsze pomijane.
                    </div>
                </div>

                <details class="gu-section">
                    <summary>Typy spalanych przedmiotów</summary>
                    <div class="gu-types">
                        ${Object.entries(ITEM_TYPES).map(([itemClass, label]) => `
                            <label>
                                <input
                                    type="checkbox"
                                    data-item-class="${itemClass}"
                                >
                                ${escapeHtml(label)}
                            </label>
                        `).join('')}
                    </div>
                </details>

                <div class="gu-section">
                    <div class="gu-info" data-material-count></div>
                    <div class="gu-info" data-daily-limit>
                        Dzienny limit gry pojawi się po pierwszym podglądzie.
                    </div>
                    <div class="gu-progress-info" data-progress-info></div>
                    <button type="button" class="gu-button secondary" data-action="preview">
                        POKAŻ MATERIAŁY
                    </button>
                    <div class="gu-preview" hidden></div>
                </div>

                <button type="button" class="gu-button" data-action="run">
                    ULEPSZ TERAZ
                </button>

                <div class="gu-status" data-type="info">
                    Wybierz przedmiot, zaznacz rodzaj materiałów i sprawdź listę.
                </div>
            </div>
        `;

        document.body.appendChild(panel);
        statusNode = panel.querySelector('.gu-status');
        targetNode = panel.querySelector('.gu-target');
        materialCountNode = panel.querySelector('[data-material-count]');
        dailyLimitNode = panel.querySelector('[data-daily-limit]');
        progressInfoNode = panel.querySelector('[data-progress-info]');
        previewNode = panel.querySelector('.gu-preview');

        bindPanelEvents();
        syncInputs();
        refreshView();
        makeDraggable(panel, panel.querySelector('.gu-header'));
    }

    function createPanel() {
        installStyles();

        panel = document.createElement('div');
        panel.id = PANEL_ID;
        panel.classList.add('gu-simple');
        panel.style.left = `${Math.max(0, settings.position.left)}px`;
        panel.style.top = `${Math.max(0, settings.position.top)}px`;
        panel.classList.remove('collapsed');
        settings.collapsed = false;
        panel.innerHTML = `
            <div class="gu-header">
                <span class="gu-title">Frost Reaper • Ulepszarka</span>
                <div class="gu-actions">
                    <button type="button" class="gu-icon"
                        data-action="settings" title="Ustawienia">⚙</button>
                </div>
            </div>
            <div class="gu-body">
                <div class="gu-main-view">
                    <div class="gu-compact-targets" data-compact-targets></div>

                    <div class="gu-section gu-simple-summary">
                        <div class="gu-info" data-material-count></div>
                        <div class="gu-info" data-daily-limit>
                            Oczekiwanie na dane serwera
                        </div>
                        <div class="gu-progress-info" data-progress-info></div>
                    </div>

                    <button type="button" class="gu-button" data-action="run">
                        ULEPSZ TERAZ
                    </button>

                </div>

                <div class="gu-settings-view" hidden>
                    <div class="gu-settings-heading">
                        <strong>Ustawienia ulepszania</strong>
                        <button type="button" data-action="settings-back">
                            WRÓĆ
                        </button>
                    </div>

                    <div class="gu-section gu-simple-target">
                        <div class="gu-target"></div>
                    </div>

                    <div class="gu-section gu-simple-filters">
                        <label><input type="checkbox" data-setting="useCommon"> Pospolite</label>
                        <label><input type="checkbox" data-setting="useUnique"> Unikaty</label>
                        <label><input type="checkbox" data-setting="allowBound"> Związane</label>
                    </div>

                    <div class="gu-section gu-auto-settings">
                        <div class="gu-section-title">Automatyczne ulepszanie</div>
                        <label>
                            <input type="checkbox" data-setting="autoByMaterials">
                            Po zebraniu
                            <input type="number" min="1" max="2000"
                                data-number-setting="autoMaterialCount">
                            materiałów
                        </label>
                        <label>
                            <input type="checkbox" data-setting="autoByFreeSlots">
                            Gdy zostanie
                            <input type="number" min="0" max="50"
                                data-number-setting="autoFreeSlots">
                            wolnych miejsc
                        </label>
                        <small data-free-slots-info></small>
                    </div>

                    <div class="gu-section">
                        <button type="button" class="gu-button secondary"
                            data-action="preview">PODGLĄD MATERIAŁÓW</button>
                        <div class="gu-preview" hidden></div>
                    </div>
                </div>

                <div class="gu-status" data-type="info">
                    Ulepszarka gotowa.
                </div>
            </div>
        `;

        const slot = document.getElementById('fr-upgrade-slot');
        (slot || document.body).appendChild(panel);
        if (slot) panel.classList.add('fr-upgrade-docked');
        statusNode = panel.querySelector('.gu-status');
        targetNode = panel.querySelector('.gu-target');
        compactTargetNode = panel.querySelector('[data-compact-targets]');
        materialCountNode = panel.querySelector('[data-material-count]');
        dailyLimitNode = panel.querySelector('[data-daily-limit]');
        progressInfoNode = panel.querySelector('[data-progress-info]');
        previewNode = panel.querySelector('.gu-preview');

        bindPanelEvents();
        syncInputs();
        refreshView();
    }

    function ensurePanelVisible() {
        if (!panel) return;

        requestAnimationFrame(() => {
            if (!panel) return;

            const rect = panel.getBoundingClientRect();
            const maxLeft = Math.max(0, W.innerWidth - Math.min(rect.width, W.innerWidth));
            const maxTop = Math.max(0, W.innerHeight - Math.min(rect.height, W.innerHeight));
            const left = Math.min(maxLeft, Math.max(0, safeNumber(rect.left, 0)));
            const top = Math.min(maxTop, Math.max(0, safeNumber(rect.top, 0)));

            panel.style.left = `${left}px`;
            panel.style.top = `${top}px`;
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';

            if (
                settings.position.left !== left ||
                settings.position.top !== top
            ) {
                settings.position = { left, top };
                saveSettings();
            }
        });
    }

    function setSettingsView(open) {
        if (!panel) return;
        panel.classList.toggle('settings-open', open);
        const mainView = panel.querySelector('.gu-main-view');
        const settingsView = panel.querySelector('.gu-settings-view');
        if (mainView) mainView.hidden = open;
        if (settingsView) settingsView.hidden = !open;
        if (open) refreshView();
    }

    function syncInputs() {
        if (!panel) return;

        for (const key of [
            'useCommon',
            'useUnique',
            'allowBound',
            'autoByMaterials',
            'autoByFreeSlots'
        ]) {
            const input = panel.querySelector(`[data-setting="${key}"]`);
            if (input) input.checked = settings[key] === true;
        }

        panel.querySelectorAll('[data-number-setting]').forEach(input => {
            input.value = settings[input.dataset.numberSetting];
        });

        panel.querySelectorAll('[data-item-class]').forEach(input => {
            input.checked =
                settings.allowedClasses[String(input.dataset.itemClass)] === true;
        });
    }

    function bindPanelEvents() {
        panel.querySelector('[data-action="close"]')?.addEventListener('click', () => {
            panel.style.display = 'none';
        });

        panel.querySelector('[data-action="collapse"]')?.addEventListener('click', () => {
            settings.collapsed = !settings.collapsed;
            panel.classList.toggle('collapsed', settings.collapsed);
            saveSettings();
        });

        panel.querySelector('[data-action="settings"]')?.addEventListener(
            'click',
            () => setSettingsView(
                !panel.classList.contains('settings-open')
            )
        );
        panel.querySelector('[data-action="settings-back"]')?.addEventListener(
            'click',
            () => setSettingsView(false)
        );

        panel.querySelector('[data-action="select"]')?.addEventListener('click', () => {
            selectingTarget = true;
            selectingTargetGroup = null;
            setStatus('Kliknij teraz przedmiot w torbie.', 'working');
        });

        panel.querySelector('[data-action="preview"]').addEventListener('click', () => {
            previewNode.hidden = !previewNode.hidden;
            refreshMaterials();
        });

        panel.querySelector('[data-action="run"]').addEventListener(
            'click',
            () => runUpgrade(false)
        );

        panel.querySelectorAll('[data-setting]').forEach(input => {
            input.addEventListener('change', () => {
                settings[input.dataset.setting] = input.checked;
                saveSettings();
                refreshView();
            });
        });

        panel.querySelectorAll('[data-number-setting]').forEach(input => {
            input.addEventListener('change', () => {
                const key = input.dataset.numberSetting;
                settings[key] = Math.max(
                    safeNumber(input.min, 0),
                    safeNumber(input.value, settings[key])
                );
                input.value = settings[key];
                saveSettings();
                refreshView();
            });
        });

        panel.querySelectorAll('[data-item-class]').forEach(input => {
            input.addEventListener('change', () => {
                settings.allowedClasses[String(input.dataset.itemClass)] =
                    input.checked;
                saveSettings();
                refreshMaterials();
            });
        });
    }

    function captureTargetClick(event) {
        if (!selectingTarget || panel?.contains(event.target)) return;

        const itemId = getItemIdFromElement(event.target);
        if (!itemId) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        selectingTarget = false;

        const item = getItemById(itemId);
        if (!isValidTarget(item)) {
            setStatus(
                'Ten przedmiot nie może być celem ulepszania.',
                'error'
            );
            return;
        }

        setTargetId(itemId, selectingTargetGroup);
        selectingTargetGroup = null;
        setStatus(`Wybrano: ${item.name || itemId}.`, 'success');
    }

    function installContextMenuHook() {
        if (destroyed) return;

        const gameInterface = W.Engine?.interface;
        if (!gameInterface || typeof gameInterface.showPopupMenu !== 'function') {
            if (detectInterface() === 'SI') return;
            contextHookTimer = setTimeout(installContextMenuHook, 500);
            return;
        }

        if (gameInterface.showPopupMenu.__garbatyUlepszaraHook) return;

        originalShowPopupMenu = gameInterface.showPopupMenu;

        const hooked = function (options, event) {
            const itemId = getItemIdFromElement(event?.currentTarget);
            const item = getItemById(itemId);

            if (!itemId || !isValidTarget(item)) {
                return originalShowPopupMenu.call(this, options, event);
            }

            const selectedEntry = getTargetEntries().find(
                entry => String(entry.id) === String(itemId)
            );
            const customOption = selectedEntry
                ? [
                    'Anuluj ulepszanie',
                    () => {
                        setTargetId(null, selectedEntry.index);
                        setStatus(`Usunięto cel: ${item.name || itemId}.`, 'info');
                    },
                    { button: { cls: 'menu-item--red' } }
                ]
                : [
                    'Ulepsz ten przedmiot',
                    () => {
                        setTargetId(itemId, 'new');
                        setStatus(`Wybrano: ${item.name || itemId}.`, 'success');
                    },
                    { button: { cls: 'menu-item--green' } }
                ];

            return originalShowPopupMenu.call(
                this,
                [customOption, ...(Array.isArray(options) ? options : [])],
                event
            );
        };

        hooked.__garbatyUlepszaraHook = true;
        gameInterface.showPopupMenu = hooked;
    }

    function makeDraggable(element, handle) {
        let dragging = false;
        let offsetX = 0;
        let offsetY = 0;

        handle.addEventListener('pointerdown', event => {
            if (event.target.closest('button')) return;
            dragging = true;
            offsetX = event.clientX - element.offsetLeft;
            offsetY = event.clientY - element.offsetTop;
            handle.setPointerCapture?.(event.pointerId);
        });

        handle.addEventListener('pointermove', event => {
            if (!dragging) return;

            const left = Math.max(
                0,
                Math.min(
                    innerWidth - element.offsetWidth,
                    event.clientX - offsetX
                )
            );
            const top = Math.max(
                0,
                Math.min(
                    innerHeight - 36,
                    event.clientY - offsetY
                )
            );

            element.style.left = `${left}px`;
            element.style.top = `${top}px`;
        });

        const stop = () => {
            if (!dragging) return;
            dragging = false;
            settings.position = {
                left: element.offsetLeft,
                top: element.offsetTop
            };
            saveSettings();
        };

        handle.addEventListener('pointerup', stop);
        handle.addEventListener('pointercancel', stop);
    }

    function openPanel() {
        if (!panel) createPanel();
        panel.style.display = '';
        panel.hidden = false;
        if (!panel.classList.contains('fr-upgrade-docked')) ensurePanelVisible();
        refreshView();
    }

    function destroy() {
        destroyed = true;
        pendingCraftingTargetId = null;
        removeArtisanshipLock();
        responseHookRestore?.();
        for (const waiters of responseInterceptors.values()) {
            for (const waiter of waiters) {
                clearTimeout(waiter.timer);
                waiter.reject(new Error('Ulepszarka została wyłączona.'));
            }
        }
        responseInterceptors.clear();
        clearTimeout(contextHookTimer);
        clearInterval(movementTimer);
        clearInterval(automationTimer);
        clearInterval(dailyUsageRefreshTimer);
        dailyUsageDomObserver?.disconnect();
        dailyUsageDomObserver = null;
        if (dailyUsageFocusHandler) {
            W.removeEventListener('focus', dailyUsageFocusHandler);
            dailyUsageFocusHandler = null;
        }
        for (const timer of delayedRefreshTimers.splice(0)) {
            clearTimeout(timer);
        }
        document.removeEventListener('click', captureTargetClick, true);

        if (
            originalShowPopupMenu &&
            W.Engine?.interface?.showPopupMenu?.__garbatyUlepszaraHook
        ) {
            W.Engine.interface.showPopupMenu = originalShowPopupMenu;
        }

        panel?.remove();
        document.getElementById(STYLE_ID)?.remove();
        delete W.FrostReaperUlepszarka;
    }

    let initAttempts = 0;
    function initialize() {
        if (destroyed || W.FrostReaperUlepszarka) return;
        try { if (JSON.parse(localStorage.getItem('fr_manager_settings')||'{}').upgradeEnabled===false) return; } catch (_) {}
        const loadedHeroId = readHeroId();

        if (
            !document.body ||
            detectInterface() === 'unknown' ||
            !loadedHeroId
        ) {
            if (++initAttempts <= 120) setTimeout(initialize, 1000);
            else console.warn('[FR Ulepszarka] Silnik gry nie był gotowy — moduł nie uruchomił się.');
            return;
        }

        activateHeroStorage(loadedHeroId);
        migrateLegacyTarget();
        initializedAt = Date.now();
        lastAutomaticRunAt = initializedAt;
        lastHeroPosition = readHeroPosition();
        movementTimer = setInterval(sampleHeroMovement, 100);
        automationTimer = setInterval(automationTick, 350);
        dailyUsageRefreshTimer = setInterval(
            () => refreshDailyUsageFromGame(false),
            2000
        );
        dailyUsageFocusHandler = () => {
            if (Date.now() - lastDailyUsageRequestAt >= 60_000) {
                refreshDailyUsageFromGame(true);
            }
        };
        W.addEventListener('focus', dailyUsageFocusHandler);
        createPanel();
        installDailyUsageDomObserver();
        installContextMenuHook();
        document.addEventListener('click', captureTargetClick, true);

        delayedRefreshTimers.push(setTimeout(() => {
            if (!destroyed) refreshDailyUsageFromGame(true);
        }, 700));

        for (const delay of [500, 1500, 3000]) {
            delayedRefreshTimers.push(setTimeout(() => {
                if (!destroyed) refreshView();
            }, delay));
        }

        W.FrostReaperUlepszarka = {
            version: VERSION,
            open: openPanel,
            run: runUpgrade,
            refreshDailyLimit: () => refreshDailyUsageFromGame(true),
            syncDailyLimitFromScreen: () => {
                const synced = syncServerDailyUsageFromDom(true);
                refreshStatistics();
                return {
                    synced,
                    serverDailyUsage
                };
            },
            setTarget: setTargetId,
            getMaterials: () => getAllConfiguredMaterials().map(item => ({
                id: String(item.id),
                name: item.name,
                level: itemLevel(item),
                itemClass: itemClass(item),
                type: ITEM_TYPES[itemClass(item)],
                rarity: itemRarity(item),
                bound: isBound(item)
            })),
            getState: () => ({
                version: VERSION,
                running,
                moving: isHeroMoving(),
                lastMovementAt,
                lastForcedStop,
                selectingTarget,
                targetId: getTargetId(),
                heroId: heroId(),
                target: getItemById(getTargetId()),
                materialCount: getAllConfiguredMaterials().length,
                freeBagSlots: getFreeBagSlots(),
                freeBagSlotsDetails: getFreeBagSlotsDetails(),
                automation: evaluateAutomaticRun(),
                lastAutomationCheck,
                targets: getTargetEntries(),
                serverDailyUsage,
                batchSize: batchSizeForInterface(),
                usage: JSON.parse(JSON.stringify(getHeroUsage())),
                settings: JSON.parse(JSON.stringify(settings)),
                interface: detectInterface(),
                senderAvailable: typeof W._g === 'function',
                storageSaved:
                    localStorage.getItem(STORAGE_KEY) ===
                    JSON.stringify(settings)
            }),
            destroy
        };

        // Samodzielny userscript nie ma przycisku otwierającego z głównego
        // Garbatego Panelu, dlatego po każdym uruchomieniu pokazuje okno sam.
        openPanel();
        W.__FROST_REAPER_MANAGER__?.refresh?.();

        console.log(`[Frost Reaper] Ulepszarka ${VERSION} uruchomiona.`);
    }

    setTimeout(initialize, 2500);
})();
};
window.__FR_START_UPGRADE__();
