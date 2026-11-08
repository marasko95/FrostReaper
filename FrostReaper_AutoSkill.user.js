// ==UserScript==
// @name         Frost Reaper - Auto Skill PvP
// @namespace    https://autoskill-pvp.local/
// @version      2.6.4
// @description  AutoSkill PvP — Frost Reaper Gothic Edition + Group Build
// @match        https://*.margonem.pl/*
// @match        https://*.margonem.com/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/marasko95/FrostReaper/main/FrostReaper_AutoSkill.user.js
// @downloadURL  https://raw.githubusercontent.com/marasko95/FrostReaper/main/FrostReaper_AutoSkill.user.js
// ==/UserScript==

(function () {
    "use strict";

    if (window.autoSkillPvPLoaded) return;

    let gameStartAttempts = 0;

    const gameStartTimer = setInterval(function () {
        gameStartAttempts++;

        const E = window.Engine;

        const isGameReady =
            E &&
            E.hero &&
            E.hero.d &&
            E.buildsManager &&
            E.others;

        if (isGameReady) {
            clearInterval(gameStartTimer);

            if (window.autoSkillPvPLoaded) return;

            window.autoSkillPvPLoaded = true;
            startAutoSkillPvP();
            return;
        }

        if (gameStartAttempts >= 240) {
            clearInterval(gameStartTimer);
        }
    }, 500);

    function startAutoSkillPvP() {

    const professions = [
        "Wojownik",
        "Paladyn",
        "Tancerz ostrzy",
        "Mag",
        "Łowca",
        "Tropiciel"
    ];

    const professionCodes = {
        w: "Wojownik",
        p: "Paladyn",
        b: "Tancerz ostrzy",
        m: "Mag",
        h: "Łowca",
        t: "Tropiciel"
    };

    // Konfiguracja osobna dla każdej postaci (i konta/świata).
    // Stary klucz pozostaje nietknięty jako kopia zapasowa.
    const LEGACY_CONFIG_KEY = "autoskill_pvp_config";
    const MIGRATION_OWNER_KEY = "autoskill_pvp_config_migration_owner_v259";
    const heroIdentity = window.Engine?.hero?.d || {};
    const characterId = String(heroIdentity.id ?? "").trim();
    const accountId = String(heroIdentity.account ?? "").trim();
    const worldId = String(window.Engine?.world?.name ?? window.Engine?.world?.d?.name ?? location.hostname).trim();
    if (!characterId) {
        console.error("[AutoSkill PvP] Brak ID postaci — nie można bezpiecznie zapisać ustawień.");
        return;
    }
    const CONFIG_KEY = LEGACY_CONFIG_KEY + ":v2:" + encodeURIComponent(worldId) + ":" + encodeURIComponent(accountId || "unknown-account") + ":" + encodeURIComponent(characterId);
    const UI_KEY = "autoskill_pvp_ui";
    const SOCIAL_KEY = "ll:social-relations:state";

    const DETECTION_RADIUS = 4; // wielu przeciwnikow na mapie; jeden: cala mapa
    const CROWDED_DETECTION_RADIUS = 4; // wielu przeciwnikow na mapie
    const DETECTION_INTERVAL = 100;
    const PARTY_CHECK_INTERVAL = 500;

    function readStoredConfig(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || "null");
            return value && typeof value === "object" && !Array.isArray(value) ? value : null;
        } catch (error) {
            console.warn("[AutoSkill PvP] Uszkodzone ustawienia:", key, error);
            return null;
        }
    }

    let config = readStoredConfig(CONFIG_KEY);
    if (!config) {
        // Migracja starego, wspólnego zapisu tylko do PIERWSZEJ postaci.
        // Nie kopiujemy go do kolejnych postaci, bo przypisania mogą być inne.
        const migrationOwner = localStorage.getItem(MIGRATION_OWNER_KEY);
        const legacy = readStoredConfig(LEGACY_CONFIG_KEY);
        if (legacy && !migrationOwner) {
            config = structuredCloneSafe(legacy);
            localStorage.setItem(MIGRATION_OWNER_KEY, CONFIG_KEY);
            console.info("[AutoSkill PvP] Przeniesiono stary zapis na bieżącą postać. Stary zapis zachowany jako kopia.");
        } else {
            config = {};
        }
    }

    function structuredCloneSafe(value) {
        return JSON.parse(JSON.stringify(value));
    }

    config.enabled = config.enabled !== false;
    config.blockInParty = config.blockInParty !== false;
    config.mappings = config.mappings && typeof config.mappings === "object" && !Array.isArray(config.mappings) ? config.mappings : {};
    config.groupBuild = Number(config.groupBuild);
    if (!Number.isInteger(config.groupBuild) || config.groupBuild < 0 || config.groupBuild > 9) {
        config.groupBuild = 0;
    }

    function save() {
        try {
            localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
        } catch (error) {
            console.error("[AutoSkill PvP] Nie udało się zapisać ustawień postaci:", error);
        }
    }
    console.info("[AutoSkill PvP] Konfiguracja postaci:", {worldId, accountId, characterId, key: CONFIG_KEY});

    function getProfession(value) {
        if (!value) return null;
        if (professions.includes(value)) return value;
        return professionCodes[String(value).toLowerCase()] || null;
    }

    // =====================================================
    // PvP — TRZY RODZAJE MAP
    // 0 = ZIELONA: brak PvP
    // 1 = ŻÓŁTA: wymagane consent === 1
    // 2 = CZERWONA: bezwarunkowe PvP
    // =====================================================

    function canAutoSwitchForPvP() {
        try {
            const E = window.Engine;

            if (!E?.map?.d || !E?.hero?.d) return false;

            const mapPvP = Number(E.map.d.pvp);
            const consent = Number(E.hero.d.pvp);

            if (mapPvP === 2) return true;

            if (mapPvP === 1 && consent === 1) {
                return true;
            }

            return false;
        } catch (e) {
            return false;
        }
    }

    function getPvPMapType() {
        const value = Number(window.Engine?.map?.d?.pvp);

        if (value === 0) return "Zielona";
        if (value === 1) return "Żółta";
        if (value === 2) return "Czerwona";

        return "Nieznana";
    }

    // =====================================================
    // RELACJE SPOŁECZNE
    // =====================================================

    function readSocialState() {
        try {
            const raw = localStorage.getItem(SOCIAL_KEY);

            if (!raw) return null;

            const parsed = JSON.parse(raw);

            if (!parsed || typeof parsed !== "object") {
                return null;
            }

            return parsed.state || null;
        } catch (e) {
            console.warn(
                "[AutoSkill PvP] Nie udało się odczytać relacji:",
                e
            );
            return null;
        }
    }

    function parseRelationKey(key) {
        try {
            const parsed = JSON.parse(key);

            if (!Array.isArray(parsed)) return null;

            return parsed.map(String);
        } catch (e) {
            return null;
        }
    }

    function getSocialContext() {
        const E = window.Engine;
        const hero = E?.hero?.d;

        if (!hero) return null;

        const accountId = String(hero.account ?? "");
        const characterId = String(hero.id ?? "");
        const ownClanId = String(hero.clan?.id ?? "");

        if (!accountId || !characterId) return null;

        const social = readSocialState();

        if (!social) return null;

        const characters = social.characters || {};
        const clans = social.clans || {};

        const matchingCharacters = [];

        for (const [key, value] of Object.entries(characters)) {
            const parts = parseRelationKey(key);

            if (!parts || parts.length < 3) continue;

            const [world, account, character] = parts;

            if (
                account === accountId &&
                character === characterId
            ) {
                matchingCharacters.push({
                    world,
                    data: value
                });
            }
        }

        const characterContext =
            matchingCharacters.length === 1
                ? matchingCharacters[0]
                : null;

        let ownClanRelations = null;

        if (ownClanId && characterContext) {
            const clanKey = JSON.stringify([
                characterContext.world,
                ownClanId
            ]);

            ownClanRelations = clans[clanKey] || null;
        }

        return {
            ownClanId,
            character: characterContext?.data || null,
            clanRelations: ownClanRelations
        };
    }

    function hasRelationEntry(collection, playerId) {
        if (!collection || !playerId) return false;

        if (Array.isArray(collection)) {
            return collection.some(
                value => String(value) === String(playerId)
            );
        }

        if (typeof collection === "object") {
            return collection[String(playerId)] === true;
        }

        return false;
    }

    function normalizePlayerData(playerData) {
        if (!playerData) return {};

        const outer = playerData;
        const inner = playerData.d || {};

        const data = {
            ...outer,
            ...inner
        };

        if (!data.id && outer.id != null) {
            data.id = outer.id;
        }

        if (!data.clan && outer.clan) {
            data.clan = outer.clan;
        }

        if (
            data.clan &&
            typeof data.clan !== "object"
        ) {
            data.clan = { id: data.clan };
        }

        return data;
    }

    function isFriendlyPlayer(playerData) {
        try {
            if (!playerData) return false;

            const E = window.Engine;
            const hero = E?.hero?.d;

            if (!hero) return false;

            const data = normalizePlayerData(playerData);

            const targetId = String(data.id ?? "");
            const targetClanId = String(data.clan?.id ?? "");
            const ownClanId = String(hero.clan?.id ?? "");

            if (!targetId) return false;

            if (targetId === String(hero.id)) {
                return true;
            }

            if (
                ownClanId &&
                targetClanId &&
                targetClanId === ownClanId
            ) {
                return true;
            }

            const context = getSocialContext();

            if (!context) return false;

            const character = context.character;
            const clanRelations = context.clanRelations;

            // Wróg ma pierwszeństwo przed znajomym.
            const isEnemy = hasRelationEntry(
                character?.enemies,
                targetId
            );

            if (isEnemy) return false;

            const isFriend = hasRelationEntry(
                character?.friends,
                targetId
            );

            if (isFriend) return true;

            if (
                targetClanId &&
                clanRelations &&
                clanRelations[targetClanId] === "ally"
            ) {
                return true;
            }

            return false;

        } catch (e) {
            console.warn(
                "[AutoSkill PvP] Błąd sprawdzania relacji:",
                e
            );
            return false;
        }
    }

    // =====================================================
    // NAZWY ZESTAWÓW
    // =====================================================

    function getBuildNames() {
        try {
            const C = window.Engine?.buildsManager?.getBuildsCommons?.();
            return C?.getBuildsName?.() || {};
        } catch (e) {
            console.warn("[AutoSkill PvP] Błąd pobierania nazw:", e);
            return {};
        }
    }

    function getBuildName(id) {
        const entry = getBuildNames()?.[String(id)];

        if (entry && typeof entry.name === "string" && entry.name.trim()) {
            return entry.name.trim();
        }

        return "Zestaw " + id;
    }

    function getBuildLabel(id) {
        return getBuildName(id) + " (ID " + id + ")";
    }

    // =====================================================
    // GRUPA
    // =====================================================

    function getPartyInfo() {
        try {
            const E = window.Engine;
            const party = E?.party;

            if (!party || typeof party.getMembers !== "function") {
                return { inParty: false, count: 1 };
            }

            const members = party.getMembers();

            if (!members) {
                return { inParty: false, count: 1 };
            }

            const ownId = String(E?.hero?.d?.id ?? "");
            let memberIds = [];

            if (members instanceof Map) {
                memberIds = Array.from(members.keys()).map(String);
            } else if (Array.isArray(members)) {
                memberIds = members.map(member =>
                    String(member?.id ?? member?.d?.id ?? member)
                );
            } else if (typeof members === "object") {
                memberIds = Object.keys(members).map(String);
            }

            const otherMembers = ownId
                ? memberIds.filter(id => id !== ownId)
                : memberIds.length > 1 ? memberIds : [];

            const inParty = otherMembers.length > 0;

            return {
                inParty,
                count: inParty
                    ? Math.min(10, otherMembers.length + (ownId ? 1 : 0))
                    : 1
            };
        } catch (e) {
            console.warn("[AutoSkill PvP] Błąd sprawdzania grupy:", e);
            return { inParty: false, count: 1 };
        }
    }

    function isPartyBlocked() {
        return config.blockInParty && getPartyInfo().inParty;
    }


    // =====================================================
    // FROST REAPER AS — NATYWNE OKNO MARGONEM
    // =====================================================
    const AS_VISIBLE_KEY = 'fr_manager_as_visible';
    const AS_POSITION_KEY = 'fr_as_window_position';
    const AS_UI_KEY = 'fr_as_native_ui';
    let asUI = {};
    try { asUI = JSON.parse(localStorage.getItem(AS_UI_KEY) || '{}'); } catch (_) {}
    const saveASUI = () => localStorage.setItem(AS_UI_KEY,JSON.stringify(asUI));
    const style = document.createElement('style');
    style.textContent = `
      .fr-as-window {min-width:270px!important}
      .fr-as-window .fr-as{min-width:245px;color:#e8d7b2;font:11px/1.35 Arial,sans-serif;padding:3px 5px}
      .fr-as-window .as-row{display:flex;align-items:center;justify-content:space-between;gap:7px;padding:5px 6px;margin:3px 0;background:rgba(49,39,26,.55);border:1px solid rgba(175,139,79,.28);border-radius:3px;min-height:26px}
      .fr-as-window .as-row:first-child label{white-space:nowrap}
      .fr-as-window .as-status-text{font-size:10px;text-align:right;max-width:70%;overflow-wrap:anywhere}
      .fr-as-window .as-settings .as-row:has(.as-title){background:none;border:0;border-bottom:1px solid #725b37;border-radius:0;margin:6px 0 4px;padding:3px 2px;min-height:18px}
      .fr-as-window .as-professions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;margin-top:5px}
      .fr-as-window .as-prof-row{display:flex;flex-direction:column;align-items:stretch;gap:3px;padding:5px;background:linear-gradient(145deg,#382d20,#211c16);border:1px solid #6b5435;border-radius:4px;min-width:0;box-shadow:inset 0 1px rgba(255,222,159,.07)}
      .fr-as-window .as-title{color:#d9b66d;font-weight:bold;font-size:11px}
      .fr-as-window .as-note{font-size:10px;color:#b6a58c}
      .fr-as-window .as-prof-name{font-size:10px;color:#e5d4b5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .fr-as-window select{background:#282118;color:#e8d7b2;border:1px solid #80633d;border-radius:2px;width:100%;max-width:145px;min-width:0;box-sizing:border-box;height:23px;padding:2px 4px;font-size:10px}
      .fr-as-window .as-group-build{width:125px}
      .fr-as-window input[type=checkbox]{accent-color:#caa45c}
      .fr-as-window .as-settings[hidden]{display:none!important}
      .fr-as-window .as-settings{max-height:330px;overflow-y:auto;scrollbar-width:thin}
      .fr-as-window > .collapse{left:auto!important;right:7px!important;top:3px!important;position:absolute!important;transform:none!important;z-index:1000!important}
    `;
    document.head.appendChild(style);
    const gearSVG = '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" fill="currentColor"><path d="M19.14 12.94a7.4 7.4 0 0 0 .05-1.88l2-1.55-2-3.46-2.35.95a7.4 7.4 0 0 0-1.63-.94L14.85 3h-4l-.36 3.06a7.4 7.4 0 0 0-1.63.94l-2.35-.95-2 3.46 2.35.95c.5.4 1.05.71 1.63.94L10.85 21h4l.36-3.06c.58-.23 1.13-.54 1.63-.94l2.35.95 2-3.46-2.05-1.55ZM12.85 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"/></svg>';
    let asWindow = null, asElement = null;
    function setASVisible(visible){
      localStorage.setItem(AS_VISIBLE_KEY,String(visible));
      if(!asElement)return;
      asElement.style.setProperty('display',visible?'':'none',visible?'':'important');
      if(visible)asWindow?.show?.();
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
    // Margonem po zmianie postaci / ponownym show() potrafi nadpisać left/top.
    // Lekki watchdog jednego okna (bez MutationObserver całej gry).
    // Odczytujemy pozycję z localStorage za każdym razem, więc Reset pozycji nadal działa.
    const frPositionWatch = setInterval(() => {
      if (!element.isConnected) { clearInterval(frPositionWatch); return; }
      if (active) return;
      let p;
      try { p = JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { return; }
      if (!Number.isFinite(p?.left) || !Number.isFinite(p?.top)) return;
      const r = element.getBoundingClientRect();
      const maxX = Math.max(0, innerWidth - (element.classList.contains('fr-manager-compact') ? 42 : 80));
      const maxY = Math.max(0, innerHeight - (element.classList.contains('fr-manager-compact') ? 32 : 40));
      const x = Math.max(0, Math.min(p.left, maxX));
      const y = Math.max(0, Math.min(p.top, maxY));
      if (Math.abs(r.left - x) > 3 || Math.abs(r.top - y) > 3) apply(p.left, p.top);
    }, 1200);
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
    function mountASWindow(){
      const E=window.Engine;
      if(!E?.windowManager||!E?.windowsData||!E?.interface)return false;
      if(!asWindow){
        E.windowsData.name.FROST_REAPER_AS='FROST_REAPER_AS';
        asWindow=E.windowManager.add({
          name:'FROST_REAPER_AS',nameWindow:'FROST_REAPER_AS',title:'Frost Reaper • Auto Skill',
          content:'<div id="autoskill-pvp"></div>',
          type:E.windowsData.type?.TRANSPARENT,manageOpacity:3,
          closeable:false,manageCollapse:true,draggable:true,className:'fr-as-window'
        });
        if(!asWindow)return false;
        asWindow.addToAlertLayer();
        asWindow.show();
      }
      const body=document.getElementById('autoskill-pvp');
      if(!body)return false;
      asElement=body.closest('.c-window')||body.closest('.fr-as-window');
      if(!asElement)return false;
      asElement.classList.add('fr-as-window');
      rememberWindowPosition(asElement,AS_POSITION_KEY);
      if(!asElement.dataset.frASBound){
        asElement.dataset.frASBound='1';
        const collapse=[...asElement.querySelectorAll('.collapse')].find(b=>!b.closest('#autoskill-pvp'));
        if(collapse){
          if(collapse.parentElement!==asElement)asElement.appendChild(collapse);
          for(const [prop,val] of Object.entries({position:'absolute',left:'auto',right:'7px',top:'3px',zIndex:'1000',transform:'none',margin:'0'}))
            collapse.style.setProperty(prop,val,'important');
          asElement.addEventListener('click',e=>{
            if(!e.target.closest('.collapse'))return;
            e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
            asUI.collapsed=!asUI.collapsed;saveASUI();
            const content=asElement.querySelector('.content');
            if(content)content.style.display=asUI.collapsed?'none':'';
          },true);
        }
        const gear=document.createElement('button');
        gear.type='button';gear.className='fr-as-gear';gear.title='Ustawienia AS';
        gear.innerHTML=gearSVG;
        gear.style.cssText='position:absolute!important;left:24px!important;top:3px!important;width:17px!important;height:18px!important;padding:1px!important;border:0!important;background:transparent!important;color:#c9c8c9!important;display:flex!important;align-items:center!important;justify-content:center!important;z-index:999!important;cursor:pointer!important';
        gear.addEventListener('click',e=>{
          e.preventDefault();e.stopPropagation();
          asUI.settingsOpen=!asUI.settingsOpen;saveASUI();
          const settings=body.querySelector('.as-settings');
          if(settings)settings.hidden=!asUI.settingsOpen;
        },true);
        asElement.appendChild(gear);
      }
      const content=asElement.querySelector('.content');
      if(content)content.style.display=asUI.collapsed?'none':'';
      setASVisible(localStorage.getItem(AS_VISIBLE_KEY)!=='false');
      return true;
    }
    let asAttempts=0;
    const asBoot=setInterval(()=>{if(mountASWindow()||++asAttempts>35)clearInterval(asBoot)},500);
    const panel=document.createElement('div');
    panel.className='fr-as';
    panel.innerHTML=`
      <div class="as-row"><span class="as-title">Auto Skill PvP</span><label><input class="as-enabled" type="checkbox"> Automatyzacja</label></div>
      <div class="as-row"><span class="as-note">Status</span><span class="as-status-text">Gotowy</span></div>
      <div class="as-settings" ${asUI.settingsOpen?'':'hidden'}>
        <div class="as-row"><span class="as-title">Ustawienia AS</span></div>
        <div class="as-row"><span>Blokuj zmianę w grupie</span><input class="as-party-block" type="checkbox"></div>
        <div class="as-row"><span>Build grupowy</span><select class="as-group-build"></select></div>
        <div class="as-row"><span class="as-title">Zestawy według profesji</span></div>
        <div class="as-professions"></div>
      </div>`;
    // Wstrzyknięcie do natywnego okna po jego utworzeniu.
    const attachTimer=setInterval(()=>{
      const body=document.getElementById('autoskill-pvp');
      if(!body)return;
      if(!body.querySelector('.fr-as'))body.appendChild(panel);
      clearInterval(attachTimer);
    },100);
    const checkbox=panel.querySelector('.as-enabled');
    const partyCheckbox=panel.querySelector('.as-party-block');
    const professionsContainer=panel.querySelector('.as-professions');
    const groupBuildSelect=panel.querySelector('.as-group-build');
    const status=panel.querySelector('.as-status-text');
    checkbox.checked=config.enabled;
    partyCheckbox.checked=config.blockInParty;
    function setStatus(message){status.textContent=message;}
    // =====================================================
    // LISTY ZESTAWÓW
    // =====================================================

    professions.forEach(function (profession) {
        const row = document.createElement("div");
        row.className = "as-prof-row";

        const name = document.createElement("span");
        name.className = "as-prof-name";
        name.textContent = profession;

        const select = document.createElement("select");
        select.dataset.profession = profession;

        for (let i = 1; i <= 9; i++) {
            const option = document.createElement("option");
            option.value = String(i);
            option.textContent = "Zestaw " + i;
            select.appendChild(option);
        }

        select.value = String(config.mappings[profession] || 1);

        select.addEventListener("change", function () {
            config.mappings[profession] = Number(select.value);
            save();

            setStatus(
                "Zapisano: " + profession + " → " +
                getBuildLabel(select.value)
            );
        });

        row.appendChild(name);
        row.appendChild(select);
        professionsContainer.appendChild(row);
    });

    // =====================================================
    // WYBÓR BUILD UŻYWANEGO W GRUPIE
    // =====================================================

    function refreshGroupBuildOptions() {
        const names = getBuildNames();
        const selectedValue = String(config.groupBuild || 0);

        groupBuildSelect.innerHTML = "";

        const disabledOption = document.createElement("option");
        disabledOption.value = "0";
        disabledOption.textContent = "Nie ustawiaj";
        groupBuildSelect.appendChild(disabledOption);

        for (let i = 1; i <= 9; i++) {
            const option = document.createElement("option");
            option.value = String(i);

            const name = names?.[String(i)]?.name;

            option.textContent =
                name && String(name).trim()
                    ? String(name).trim()
                    : "Zestaw " + i;

            groupBuildSelect.appendChild(option);
        }

        groupBuildSelect.value = selectedValue;

        if (groupBuildSelect.value !== selectedValue) {
            groupBuildSelect.value = "0";
        }
    }

    groupBuildSelect.addEventListener("change", function () {
        config.groupBuild = Number(groupBuildSelect.value) || 0;
        save();

        if (config.groupBuild === 0) {
            setStatus("Build grupowy wyłączony.");
        } else {
            setStatus(
                "Zapisano build grupowy: " +
                getBuildLabel(config.groupBuild) + "."
            );

            // Jeżeli już jesteśmy w grupie, zastosuj nowy wybór od razu.
            applyGroupBuild();
        }
    });

    let lastBuildNamesSignature = null;
    function refreshBuildOptions(force = false) {
        const names = getBuildNames();

        const hasNames = Object.values(names).some(
            entry => entry &&
                typeof entry.name === "string" &&
                entry.name.trim()
        );

        if (!hasNames) return false;
        const signature = JSON.stringify(names);
        if (!force && signature === lastBuildNamesSignature) return true;
        lastBuildNamesSignature = signature;

        professionsContainer.querySelectorAll("select").forEach(select => {
            const selectedValue = select.value;
            select.innerHTML = "";

            for (let i = 1; i <= 9; i++) {
                const option = document.createElement("option");
                option.value = String(i);

                const name = names?.[String(i)]?.name;

                option.textContent =
                    name && String(name).trim()
                        ? String(name).trim()
                        : "Zestaw " + i;

                select.appendChild(option);
            }

            select.value = selectedValue;
        });

        refreshGroupBuildOptions();

        console.log("[AutoSkill PvP] Nazwy zestawów odświeżone:", names);
        return true;
    }

    refreshGroupBuildOptions();

    let buildNamesAttempts = 0;

    const buildNamesTimer = setInterval(() => {
        buildNamesAttempts++;

        if (refreshBuildOptions() || buildNamesAttempts >= 40) {
            clearInterval(buildNamesTimer);
        }
    }, 500);
    // Nazwy zestawów mogą zmienić się po załadowaniu postaci lub edycji buildów.
    setInterval(() => refreshBuildOptions(), 5000);

    // =====================================================
    // USTAWIENIA
    // =====================================================

    let lastNearbyPlayer = null;

    checkbox.addEventListener("change", function () {
        config.enabled = checkbox.checked;
        save();

        if (!config.enabled) {
            lastNearbyPlayer = null;
            setStatus("Automatyzacja wyłączona.");
            return;
        }

        setStatus("Automatyzacja aktywna. Skanowanie otoczenia...");

        // Po ponownym włączeniu sprawdź, czy jesteśmy w grupie.
        applyGroupBuild();
    });

    partyCheckbox.addEventListener("change", function () {
        config.blockInParty = partyCheckbox.checked;
        save();

        const party = getPartyInfo();

        if (config.blockInParty && party.inParty) {
            setStatus("Blokada PvP aktywna — grupa (" + party.count + "/10).");
        } else {
            setStatus(
                config.blockInParty
                    ? "Blokada grupy aktywna."
                    : "Blokada grupy wyłączona."
            );
        }

        lastNearbyPlayer = null;
    });

    // =====================================================
    // NISKOPZIOMOWA ZMIANA ZESTAWU
    // Bez bramki PvP — używana przez tryb grupowy.
    // =====================================================

    function setBuildDirect(id, reason) {
        id = Number(id);

        try {
            if (!Number.isInteger(id) || id < 1 || id > 9) {
                setStatus("Nieprawidłowe ID zestawu.");
                return false;
            }

            // Zestaw grupowy jest zarezerwowany WYŁĄCZNIE dla rzeczywistej grupy.
            // Dotyczy też przywracania po PvP i po opuszczeniu grupy.
            const reservedGroupId = Number(config.groupBuild);
            if (reservedGroupId >= 1 && id === reservedGroupId && !getPartyInfo().inParty) {
                console.warn('[AutoSkill PvP] Zablokowano zestaw grupowy poza grupą:', {id, reason});
                setStatus('Zablokowano zestaw grupowy poza grupą: ' + getBuildLabel(id));
                return false;
            }

            const B = window.Engine?.buildsManager;

            if (!B) {
                setStatus("Nie znaleziono managera zestawów.");
                return false;
            }

            const C = B.getBuildsCommons();
            const R = B.getBuildsRequests();

            if (!C.checkBuildExist(id)) {
                setStatus("Nie znaleziono " + getBuildLabel(id) + ".");
                return false;
            }

            if (Number(C.getCurrentId()) === id) {
                return true;
            }

            // Nie wysyłaj tej samej prośby kilkanaście razy zanim gra ją potwierdzi.
            const now = Date.now();
            if (lastBuildRequest.id === id && now - lastBuildRequest.at < BUILD_RETRY_MS) return true;
            R.setCurrentBuildId(id);
            lastBuildRequest = {id,at:now};

            console.log("[AutoSkill PvP] Zmiana zestawu:", {
                id,
                reason: reason || "normal"
            });

            return true;
        } catch (e) {
            console.error("[AutoSkill PvP] Błąd zmiany zestawu:", e);
            setStatus("Błąd zmiany zestawu. Sprawdź konsolę.");
            return false;
        }
    }

    // =====================================================
    // AUTOMATYCZNY BUILD GRUPOWY
    // Działa niezależnie od koloru mapy i zgody PvP.
    // =====================================================

    let groupBuildLastApplied = null;
    let wasInParty = false;
    let prePartyBuild = null;
    let pendingRestoreBuild = null;
    let lastBuildRequest = {id:null,at:0};
    const BUILD_RETRY_MS = 850;
    // PvP nigdy nie przywraca zestawu. Powrot jest dozwolony tylko po rozpadzie grupy.
    let pvpTargetKey = null;
    let pvpTargetStableSince = 0;
    let battleTargetLockUntil = 0;
    const BATTLE_TARGET_LOCK_MS = 2500;
    const PVP_TARGET_STABILITY_MS = 350;

    function currentBuildId(){
        try {return Number(window.Engine?.buildsManager?.getBuildsCommons?.()?.getCurrentId?.()) || null;}
        catch (_) {return null;}
    }

    function applyGroupBuild() {
        try {
            const party = getPartyInfo();
            if (!party.inParty) {
                if (wasInParty) {
                    wasInParty = false;
                    groupBuildLastApplied = null;
                    pendingRestoreBuild = prePartyBuild;
                    prePartyBuild = null;
                    lastNearbyPlayer = null;
                    setStatus('Grupa opuszczona — przywracanie poprzedniego zestawu...');
                }
                if (pendingRestoreBuild != null) {
                    if (window.Engine?.battle?.show) return false;
                    const restoreId = pendingRestoreBuild;
                    if (Number(config.groupBuild) === restoreId && restoreId > 0) {
                        pendingRestoreBuild = null;
                        setStatus('Pominięto przywrócenie zestawu grupowego poza grupą.');
                        return false;
                    }
                    if (currentBuildId() === restoreId) {
                        pendingRestoreBuild = null;
                        setStatus('Przywrócono zestaw sprzed grupy: ' + getBuildLabel(restoreId));
                        return true;
                    }
                    if (!config.enabled) return false;
                    if (setBuildDirect(restoreId,'restore-after-party')) {
                        setStatus('Przywracanie zestawu sprzed grupy: ' + getBuildLabel(restoreId));
                        return true;
                    }
                }
                return false;
            }
            if (!wasInParty) {
                // Zapis tylko przy pierwszym wejściu, nigdy podczas kolejnych odświeżeń.
                prePartyBuild = currentBuildId();
                pendingRestoreBuild = null;
                wasInParty = true;
                lastNearbyPlayer = null;
            }
            if (!config.enabled) return false;
            const groupBuild = Number(config.groupBuild);
            if (!Number.isInteger(groupBuild) || groupBuild < 1 || groupBuild > 9) {
                setStatus('Grupa (' + party.count + '/10) — nie wybrano buildu grupowego.');
                return false;
            }
            if (currentBuildId() === groupBuild) {
                groupBuildLastApplied = groupBuild;
                return true;
            }
            const success = setBuildDirect(groupBuild,'group');
            if (success) {
                groupBuildLastApplied = groupBuild;
                setStatus('GRUPA (' + party.count + '/10) — ' + getBuildLabel(groupBuild));
            }
            return success;
        } catch (e) {
            console.error('[AutoSkill PvP] Błąd buildu grupowego:',e);
            return false;
        }
    }

    // Stan grupy monitorujemy także przy wyłączonej automatyzacji,
    // aby nie zgubić momentu opuszczenia grupy.
    const partyBuildTimer = setInterval(() => {
        const party = getPartyInfo();
        if (party.inParty || wasInParty || pendingRestoreBuild != null) applyGroupBuild();
    }, PARTY_CHECK_INTERVAL);

    // =====================================================
    // ZMIANA ZESTAWU PvP — CENTRALNE ZABEZPIECZENIA
    // =====================================================

    function changeBuild(id, playerData, confirmedBattle = false) {
        id = Number(id);

        try {
            if (!Number.isInteger(id) || id < 1 || id > 9) {
                setStatus("Nieprawidłowe ID zestawu.");
                return false;
            }

            // Tryb grupowy ma pierwszeństwo nad PvP.
            if (getPartyInfo().inParty) {
                applyGroupBuild();

                setStatus(
                    "Jesteś w grupie — aktywny jest tryb buildu grupowego."
                );

                return false;
            }

            if (!confirmedBattle && !canAutoSwitchForPvP()) {
                setStatus(
                    "Zmiana zablokowana — brak aktywnego PvP."
                );
                return false;
            }

            if (playerData && isFriendlyPlayer(playerData)) {
                setStatus(
                    "Zmiana zablokowana — gracz jest znajomym lub sojusznikiem."
                );
                return false;
            }

            if (isPartyBlocked()) {
                const party = getPartyInfo();

                setStatus(
                    "Zmiana zablokowana — grupa (" + party.count + "/10)."
                );
                return false;
            }

            if (Number(config.groupBuild) === id && id > 0) {
                setStatus('Zestaw PvP wskazuje build grupowy — wybierz inny zestaw dla tej profesji.');
                return false;
            }

            const success = setBuildDirect(id, "pvp");
            if (success) {
                setStatus("Zmiana zestawu: " + getBuildLabel(id) + ".");
            }

            return success;

        } catch (e) {
            console.error("[AutoSkill PvP] Błąd zmiany zestawu:", e);
            setStatus("Błąd zmiany zestawu. Sprawdź konsolę.");
            return false;
        }
    }

    // =====================================================
    // WYKRYWANIE PRZECIWNIKA
    // =====================================================

    function opponentDetected(professionValue, nick, playerData, confirmedBattle = false) {
        if (!config.enabled) return;

        // Jeśli jesteśmy w grupie, nie dobieramy buildu przeciwnika.
        // Build grupowy ma zawsze pierwszeństwo.
        if (getPartyInfo().inParty) {
            applyGroupBuild();
            return;
        }

        if (!confirmedBattle && !canAutoSwitchForPvP()) return;

        if (playerData && isFriendlyPlayer(playerData)) {
            setStatus(
                (nick ? nick + " — " : "") +
                "znajomy / sojusznik. Zmiana zestawu zablokowana."
            );
            return;
        }

        const profession = getProfession(professionValue);

        if (!profession) {
            setStatus("Nie rozpoznano profesji gracza.");
            return;
        }

        const set = Number(config.mappings[profession] || 1);

        if (isPartyBlocked()) {
            const party = getPartyInfo();

            setStatus(
                "Wykryto " + (nick ? nick + " — " : "") +
                profession + ". Zmiana zablokowana — grupa " +
                party.count + "/10."
            );
            return;
        }

        setStatus(
            (nick ? nick + " — " : "") +
            profession + " → " + getBuildLabel(set)
        );

        console.log("[AutoSkill PvP] Wykryto gracza:", {
            nick: nick || "",
            profession,
            set,
            mapPvP: window.Engine?.map?.d?.pvp,
            mapType: getPvPMapType()
        });

        changeBuild(set, playerData, confirmedBattle);
    }

    // =====================================================
    // WYKRYWANIE GRACZY W PROMIENIU 2 PÓL
    // =====================================================

    function checkNearbyPlayers() {
        try {
            if (!config.enabled) return;

            // W grupie nie skanujemy przeciwników do zmiany buildu PvP.
            if (getPartyInfo().inParty) {
                applyGroupBuild();
                lastNearbyPlayer = null;
                return;
            }

            if (!canAutoSwitchForPvP()) {
                lastNearbyPlayer = null;
                pvpTargetKey = null;
                return;
            }

            const Engine = window.Engine;

            if (!Engine?.hero?.d) return;
            if (Engine.battle?.show || Date.now() < battleTargetLockUntil) {
                return;
            }

            const myX = Number(Engine.hero.d.x);
            const myY = Number(Engine.hero.d.y);

            if (!Number.isFinite(myX) || !Number.isFinite(myY)) return;

            const players = Engine.others?.getDrawableList?.() || [];

            const onMap = players
                .filter(p =>
                    p &&
                    p.isPlayer &&
                    typeof p.getProf === "function" &&
                    typeof p.getNick === "function"
                )
                .map(function (p) {
                    const x = Number(p.d?.x);
                    const y = Number(p.d?.y);

                    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

                    const distance = Math.abs(myX - x) + Math.abs(myY - y);
                    const profession = getProfession(p.getProf());
                    const nick = p.getNick();

                    if (!profession || !nick) return null;

                    return {
                        id: String(p.d?.id ?? nick),
                        nick,
                        profession,
                        distance,
                        playerData: p.d || p
                    };
                })
                .filter(Boolean)
                .sort((a, b) => a.distance - b.distance);

            // Nie przełączaj umiejętności od samego widoku wroga na drugim końcu mapy.
            // Po E2/PvP często zostają widoczne postacie, które nie są celem walki.
            const mapEnemies = onMap.filter(p => !isFriendlyPlayer(p.playerData));
            // Jeden przeciwnik na calej mapie: zmien od razu, bez limitu dystansu.
            // Wielu przeciwnikow: wybierz najblizszego w promieniu 4 pol.
            const soloEnemy = mapEnemies.length === 1;
            const radius = soloEnemy ? Infinity : CROWDED_DETECTION_RADIUS;
            const candidates = mapEnemies.filter(p => p.distance <= radius);
            if (!candidates.length) {
                lastNearbyPlayer = null;
                pvpTargetKey = null;
                return;
            }
            const target = candidates[0];
            // Przy rownej odleglosci nie wybieraj losowo celu/profesji.
            if (candidates.length > 1 && candidates[1].distance === target.distance) {
                lastNearbyPlayer = null;
                pvpTargetKey = null;
                setStatus('Kilku przeciwnikow rownie blisko — czekam na pewny cel.');
                return;
            }
            const targetKey = target.id + ":" + target.profession;

            if (targetKey !== pvpTargetKey) {
                pvpTargetKey = targetKey;
                pvpTargetStableSince = Date.now();
                lastNearbyPlayer = null;
                if (!soloEnemy) return;
            }
            if (!soloEnemy && Date.now() - pvpTargetStableSince < PVP_TARGET_STABILITY_MS) return;

            // Ponów, jeśli gra nie zastosowała poprzedniego zestawu.
            const desiredBuild = Number(config.mappings[target.profession] || 1);
            if (targetKey === lastNearbyPlayer && currentBuildId() === desiredBuild) return;

            lastNearbyPlayer = targetKey;

            console.log("[AutoSkill PvP] Cel PvP:", { ...target, soloEnemy, enemiesOnMap: mapEnemies.length });

            setStatus(
                "W pobliżu: " + target.nick +
                " (" + target.distance + " pól) — " +
                target.profession
            );

            opponentDetected(
                target.profession,
                target.nick,
                target.playerData
            );

        } catch (e) {
            console.error("[AutoSkill PvP] Błąd skanowania mapy:", e);
        }
    }

    const proximityTimer = setInterval(
        checkNearbyPlayers,
        DETECTION_INTERVAL
    );

    // =====================================================
    // ATAK WYCHODZĄCY: KLAWISZ X
    // =====================================================

    function installXHook() {
        const hero = window.Engine?.hero;

        if (!hero || typeof hero.atackNearPlayer !== "function") return false;
        if (hero.atackNearPlayer.__autoSkillPvP) return true;

        const original = hero.atackNearPlayer;

        function wrappedAttack() {
            try {
                if (config.enabled && canAutoSwitchForPvP()) {
                    if (getPartyInfo().inParty) {
                        applyGroupBuild();
                    } else {
                        const players =
                            window.Engine?.others?.getDrawableList?.() || [];

                        const targets = players.filter(p =>
                            p.isPlayer &&
                            p.getProf?.() &&
                            p.getNick?.()
                        );

                        if (targets.length === 1) {
                            const target = targets[0];

                            opponentDetected(
                                target.getProf(),
                                target.getNick(),
                                target.d || target
                            );
                        }
                    }
                }
            } catch (e) {
                console.error("[AutoSkill PvP] Błąd hooka X:", e);
            }

            return original.apply(this, arguments);
        }

        wrappedAttack.__autoSkillPvP = true;
        wrappedAttack.__autoSkillPvPOriginal = original;

        hero.atackNearPlayer = wrappedAttack;

        console.log("[AutoSkill PvP] Hook klawisza X aktywny.");
        return true;
    }

    const xHookTimer = setInterval(function () {
        if (installXHook()) clearInterval(xHookTimer);
    }, 500);

    setTimeout(() => clearInterval(xHookTimer), 60000);

    // =====================================================
    // ATAK WYCHODZĄCY: MENU „ATAKUJ”
    // =====================================================

    document.addEventListener("click", function (e) {
        const item = e.target.closest(".menu-item");

        if (!item || item.textContent.trim() !== "Atakuj") return;
        if (!config.enabled) return;

        if (getPartyInfo().inParty) {
            applyGroupBuild();
            return;
        }

        if (!canAutoSwitchForPvP()) return;

        const menu = item.closest(".popup-menu");

        const nick = menu
            ?.querySelector(".popup-menu__header")
            ?.textContent.trim();

        if (!nick) {
            setStatus("Nie udało się odczytać nicku przeciwnika.");
            return;
        }

        const list = window.Engine?.others?.getDrawableList?.() || [];

        const player = list.find(p =>
            p.isPlayer && p.getNick?.() === nick
        );

        if (!player) {
            setStatus("Nie znaleziono danych gracza: " + nick);
            return;
        }

        opponentDetected(
            player.getProf?.(),
            nick,
            player.d || player
        );
    }, true);

    // =====================================================
    // ATAK PRZYCHODZĄCY
    // =====================================================

    function installIncomingHook() {
        const battle = window.Engine?.battle;

        if (!battle || typeof battle.updateData !== "function") return false;
        if (battle.updateData.__autoSkillPvP) return true;

        const originalUpdateData = battle.updateData;

        function wrappedUpdateData(r, i, a) {
            try {
                if (
                    config.enabled &&
                    getPartyInfo().inParty
                ) {
                    applyGroupBuild();
                } else if (
                    config.enabled &&
                    r &&
                    r.w &&
                    r.myteam != null
                ) {
                    const myId = String(
                        window.Engine?.hero?.d?.id ?? ""
                    );

                    const myTeam = Number(r.myteam);

                    const enemies = Object.entries(r.w)
                        .filter(([id, warrior]) => {
                            if (String(id) === myId) return false;
                            if (Number(warrior.team) === myTeam) return false;
                            if (!getProfession(warrior.prof)) return false;

                            const other =
                                window.Engine?.others?.getById?.(id);

                            // Wymagaj potwierdzenia, ze przeciwnik jest graczem.
                            // Bez tego E2/mob moglby wymusic build PvP.
                            if (!other || other.isPlayer !== true) return false;

                            return true;
                        });

                    // Nie wybieraj losowego uczestnika walki grupowej.
                    // Automatyczny dobór profesji tylko przy jednym wrogu.
                    if (enemies.length === 1) {
                        battleTargetLockUntil = Date.now() + BATTLE_TARGET_LOCK_MS;
                        const [enemyId, enemy] = enemies[0];

                        const other =
                            window.Engine?.others?.getById?.(enemyId);

                        const nick =
                            enemy.name ||
                            other?.getNick?.() ||
                            "";

                        const playerData = {
                            ...(other?.d || {}),
                            ...enemy,
                            id: enemyId,
                            clan: enemy.clan || other?.d?.clan
                        };

                        console.log("[AutoSkill PvP] Atak przychodzący:", {
                            ownId: myId,
                            ownTeam: myTeam,
                            enemyId,
                            nick,
                            profession: enemy.prof
                        });

                        opponentDetected(
                            enemy.prof,
                            nick,
                            playerData,
                            true
                        );
                    } else if (enemies.length > 1) {
                        battleTargetLockUntil = Date.now() + BATTLE_TARGET_LOCK_MS;
                        setStatus('Walka z wieloma przeciwnikami — nie zgaduję zestawu.');
                    }
                }
            } catch (e) {
                console.error("[AutoSkill PvP] Błąd wykrywania ataku:", e);
            }

            return originalUpdateData.call(this, r, i, a);
        }

        wrappedUpdateData.__autoSkillPvP = true;
        wrappedUpdateData.__autoSkillPvPOriginal = originalUpdateData;

        battle.updateData = wrappedUpdateData;

        console.log("[AutoSkill PvP] Wykrywanie ataku przychodzącego aktywne.");
        return true;
    }

    const incomingHookTimer = setInterval(function () {
        if (installIncomingHook()) clearInterval(incomingHookTimer);
    }, 500);

    setTimeout(() => clearInterval(incomingHookTimer), 60000);

    // =====================================================
    // PUBLICZNE API
    // =====================================================

    window.AutoSkillPvP = {
        opponentDetected,
        changeBuild,
        setBuildDirect,
        applyGroupBuild,
        installIncomingHook,
        checkNearbyPlayers,
        getPartyInfo,
        getBuildNames,
        refreshBuildOptions,
        canAutoSwitchForPvP,
        isFriendlyPlayer,
        getPvPMapType,

        showWidget: () => setASVisible(true),
        hideWidget: () => setASVisible(false),
        getConfig: function () {
            return JSON.parse(JSON.stringify(config));
        }
    };

    save();

    console.log("[AutoSkill PvP] Wersja 2.6.3 FROST REAPER załadowana.");
    console.log("[AutoSkill PvP] Nazwy zestawów:", getBuildNames());
    console.log("[AutoSkill PvP] Stan grupy:", getPartyInfo());
    console.log("[AutoSkill PvP] Build grupowy:", config.groupBuild);
    console.log("[AutoSkill PvP] Warunki PvP:", {
        map: window.Engine?.map?.d?.name,
        mapPvP: window.Engine?.map?.d?.pvp,
        mapType: getPvPMapType(),
        heroConsent: window.Engine?.hero?.d?.pvp,
        canSwitch: canAutoSwitchForPvP()
    });

    setStatus(
        config.enabled
            ? "Automatyzacja aktywna. Oczekiwanie na aktywne PvP..."
            : "Automatyzacja wyłączona."
    );

    // Jeśli skrypt startuje, gdy postać już jest w grupie.
    applyGroupBuild();

    } // koniec startAutoSkillPvP

})();