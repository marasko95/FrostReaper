// ==UserScript==
// @name         Frost Reaper - Szybki KCS
// @namespace    frost-reaper
// @version      0.2.3
// @description  Slot z kamykiem na następną E2 przez publiczne API Lootloga, zatrzymywany po legendzie (SI+NI)
// @match        https://*.margonem.pl/*
// @grant        none
// @run-at       document-idle
// @noframes
// @updateURL    https://raw.githubusercontent.com/marasko95/FrostReaper/main/FrostReaper_KCS.user.js
// @downloadURL  https://raw.githubusercontent.com/marasko95/FrostReaper/main/FrostReaper_KCS.user.js
// ==/UserScript==

(function () {
    'use strict';

    // Safari/NI potrafi uruchamiać userscript także w ramkach dokumentu.
    // Tylko główna ramka może wybierać i używać kamienie.
    try {
        if (window.top && window.top !== window) return;
    } catch (_) {
        return;
    }

    const ADDON_VERSION = 'FR-KCS-0.2.0';
    const RUNTIME_KEY = '__garbatyTepeKamykiRuntime';
    const RUNTIME_ATTR = 'data-garbaty-tepekamyki-runtime';

    // Atrybut DOM jest wspólny również dla różnych kontekstów skryptów
    // (panel/Tampermonkey). Sama zmienna window nie zatrzymywała dwóch kopii,
    // które startowały jednocześnie i każda używała kamienia osobno.
    if (
        window[RUNTIME_KEY]?.started ||
        document.documentElement?.hasAttribute(RUNTIME_ATTR) ||
        document.getElementById('e2-teleport-slot')
    ) return;
    document.documentElement?.setAttribute(RUNTIME_ATTR, ADDON_VERSION);
    window[RUNTIME_KEY] = { started: true, version: ADDON_VERSION };

    function detectInterface() {
        try {
            const value = document.cookie.match(/(?:^|;\s*)interface=([^;]+)/i)?.[1];
            if (String(value || '').toLowerCase() === 'ni') return 'NI';
            if (String(value || '').toLowerCase() === 'si') return 'SI';
        } catch (_) {}

        return window.Engine?.hero || window.Engine?.communication ? 'NI' : 'SI';
    }

    // Interfejs nie zmienia się w trakcie życia strony. Stała zapobiega temu,
    // aby część jednego przebiegu wykonała ścieżkę SI, a druga NI.
    const INTERFACE = detectInterface();

    // Ustaw na true, żeby w konsoli (F12) zobaczyć dokładne nazwy map wyciągane
    // z tipów przedmiotów oraz informacje o nieudanych dopasowaniach.
    const DEBUG = false;
    const ITEM_IMAGE_BASE =
        'https://micc.garmory-cdn.cloud/obrazki/itemy/';

    // ════════════════════════════════════════════════════════════════════
    // LISTA: ID potwora → tablica możliwych nazw map (kilka respów = kilka wpisów)
    // ════════════════════════════════════════════════════════════════════
    const MONSTER_TO_MAPS = {
        '146914': ['Grota Dzikiego Kota'],
        '398424': ['Źródło Narumi'],
        '399621': ['Krater Uwięzienia'],
        '18984':  ['Las Tropicieli'],
        '222511': ['Przeklęta Strażnica'],
        '256372': ['Schowek na Łupy'],
        '264342': ['Podmokła Dolina'],
        '207860': ['Jaskinia Pogardy'],
        '160694': ['Pieczara Kwiku'],
        '235051': ['Skalne Turnie'],
        '62345':  ['Stary Kupiecki Trakt'],
        '190472': ['Mokra Grota'],
        '16818':  ['Stare Wyrobisko'],
        '80749':  ['Lazurytowa Grota'],
        '256374': ['Kopalnia Kapiącego Miodu'],
        '37049':  ['Jaskinia Gnollich Szamanów'],
        '76767':  ['Namiot Vari Krugera'],
        '268359': ['Kamienna Jaskinia'],
        '271630': ['Głębokie Skałki'],
        '271629': ['Głębokie Skałki'],
        '271623': ['Krypty Dusz Śniegu'],
        '271624': ['Erem Czarnego Słońca'],
        '271628': ['Firnowa Grota'],
        '271625': ['Świątynia Andarum'],
        '271626': ['Wylęgarnia Choukkerów'],
        '278128': ['Kopalnia Margorii'],
        '278129': ['Margoria'],
        '278190': ['Zapomniany Święty Gaj'],
        '122272': ['Grota Samotnych Dusz'],
        '32613':  ['Kamienna Strażnica'],
        '13324':  ['Zagrzybiałe Ścieżki'],
        '15835':  ['Dolina Centaurów'],
        '198558': ['Las Dziwów', 'Złowrogie Bagna'],
        '45696':  ['Podziemia Zniszczonej Wieży'],
        '273386': ['Zabłocona Jama p.2 - Sala Błotnistych Odmętów'],
        '273385': ['Zabłocona Jama p.2 - Sala Magicznego Błota'],
        '273384': ['Zabłocona Jama p.2 - Sala Duszącej Stęchlizny'],
        '296118': ['Skalne Cmentarzysko'],
        '296267': ['Piramida Pustynnego Władcy'],
        '318402': ['Jama Morskiej Macki'],
        '318548': ['Opuszczony statek'],
        '319132': ['Twierdza Rogogłowych'],
        '318758': ['Piaskowa Pułapka'],
        '296266': ['Wulkan Politraki'],
        '120472': ['Ukryta Grota Morskich Diabłów'],
        '296269': ['Ukryta Grota Morskich Diabłów'],
        '296270': ['Ukryta Grota Morskich Diabłów'],
        '318760': ['Piaszczysta Grota'],
        '192595': ['Kopalnia Żółtego Kruszcu'],
        '333058': ['Kuźnia Worundriela'],
        '319133': ['Chata wójta Fistuły'],
        '319134': ['Babi Wzgórek'],
        '333107': ['Cenotaf Berserkerów'],
        '333060': ['Mała Twierdza'],
        '333264': ['Lokum Złych Goblinów'],
        '154609': ['Laboratorium Adariel'],
        '320880': ['Grota Orczej Hordy'],
        '333108': ['Grota Orczych Szamanów'],
        '228348': ['Grota Orczych Szamanów'],
        '227363': ['Nawiedzone Kazamaty'],
        '227436': ['Sala Rady Orków'],
        '227435': ['Sala Rady Orków'],
        '227434': ['Sala Rady Orków'],
        '227417': ['Sala Królewska'],
        '320746': ['Kryształowa Grota'],
        '344659': ['Drzewo Dusz'],
        '344657': ['Drzewo Dusz'],
        '344679': ['Drzewo Dusz'],
        '342484': ['Ogrza Kawerna'],
        '241643': ['Krypty Bezsennych'],
        '345546': ['Skarpa Trzech Słów'],
        '58697':  ['Przysiółek Valmirów'],
        '342481': ['Starodrzew Przedwiecznych'],
        '342482': ['Szlamowe Kanały'],
        '234251': ['Przerażające Sypialnie'],
        '234424': ['Sala Skaryfikacji Grzeszników'],
        '234361': ['Sale Rozdzierania'],
        '234429': ['Tajemnicza Siedziba'],
        '234431': ['Tajemnicza Siedziba'],
        '234421': ['Sala Tysiąca Świec'],
        '52950':  ['Zalana Grota'],
        '25041':  ['Arachnitopia'],
        '25124':  ['Arachnitopia'],
        '360457': ['Erem Aldiphrina'],
        '365024': ['Ołtarz Pajęczej Bogini'],
        '368335': ['Gnijące Topielisko'],
        '368336': ['Jaszczurze Korytarze'],
        '379559': ['Gardziel Podgnitych Mchów'],
        '127762': ['Źródło Zakorzenionego Ludu'],
        '188257': ['Złota Góra'],
        '53398':  ['Chantli Cuaitla Citlalina', 'Niecka Xiuh Atl', 'Altepetl Mahoptekan'],
        '379560': ['Siedlisko Przyjemnej Woni', 'Siedlisko Przyjemnej Woni - źródło'],
        '383726': ['Potępione Zamczysko', 'Potępione Zamczysko - sala ofiarna'],
        '185508': ['Pustynne Katakumby - Komnata Gwałtownej Śmierci'],
        '60538':  ['Grobowiec Seta', 'Pustynne Katakumby - Grobowiec Seta'],
        '207430': ['Urwisko Vapora'],
        '115103': ['Świątynia Hebrehotha - przedsionek', 'Świątynia Hebrehotha - sala ofiary'],
        '115000': ['Świątynia Hebrehotha - przedsionek', 'Świątynia Hebrehotha - sala czciciela'],
        '240586': ['Drzewo Życia', 'Drzewo Życia p.2'],
        '398426': ['Szepczące Wyrwy p.3', 'Szepczące Wyrwy'],
        '63630':  ['Sala Lodowej Magii'],
        '63629':  ['Sala Mroźnych Strzał'],
        '63628':  ['Sala Mroźnych Szeptów'],
    };

    // Te same skróty, których używa dodatek „Podpisy Kamieni”. Najpierw
    // odczytujemy gotowy podpis z elementu przedmiotu, a ta tabela jest
    // zabezpieczeniem na wypadek, gdy drugi dodatek jeszcze się nie załadował.
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

    // ── Stałe i Pamięć lokalna ────────────────────────────────────────────────
    const STORAGE_KEY_POS     = 'e2slot_pos';
    const STORAGE_KEY_LOCK    = 'e2slot_locked';
    const STORAGE_KEY_HOTKEY  = 'e2slot_hotkey';
    const STORAGE_KEY_AUTO    = 'e2slot_auto_enabled_v1';
    const STORAGE_KEY_LEGENDARY_HOLD = 'e2slot_legendary_hold_v1';
    const STORAGE_KEY_LEGENDARY_ACK = 'e2slot_legendary_ack_v1';
    const STORAGE_KEY_SELECTED = 'e2slot_auto_selected_v1';
    const STORAGE_KEY_SLOT_SELECTED = 'e2slot_manual_selected_v1';
    const STORAGE_KEY_SKIP_MISSING = 'e2slot_skip_missing_stone_v1';
    const STORAGE_KEY_SHOW_AUTO_BUTTON = 'e2slot_show_auto_button_v1';
    const STORAGE_KEY_CATALOG = 'e2slot_auto_catalog_v1';
    const STORAGE_KEY_LOOTLOG_SOURCE = 'garbaty_lootlog_timer_source_v1';
    const STORAGE_KEY_LEGACY_MISSING_TIMERS = 'garbaty_missing_e2_lootlog_v2';
    const STORAGE_KEY_AUTO_GUARD = 'e2slot_auto_guard_v2';
    const STORAGE_KEY_USE_GUARD = 'e2slot_use_guard_v2';
    const STORAGE_KEY_RESP_CYCLE_GUARDS = 'e2slot_resp_cycle_guards_v1';
    const STORAGE_KEY_SHARED_TEMPLE_ROUTE = 'e2slot_shared_temple_route_v2';
    // Vaenra i Chaegd korzystają z tego samego wejścia do przedsionka.
    // Jeden kamień rozpoczyna całą, dwuetapową trasę; pomiędzy bossami
    // gracz przechodzi pieszo i AUTO nie może użyć drugiego kamienia.
    const SHARED_TEMPLE_PAIR_IDS = Object.freeze(['115103', '115000']);
    const SHARED_TEMPLE_PAIR_SET = new Set(SHARED_TEMPLE_PAIR_IDS);
    const SHARED_TEMPLE_ENTRY_MAP = 'Świątynia Hebrehotha - przedsionek';
    const SHARED_TEMPLE_ROUTE_MAX_AGE_MS = 6 * 60 * 60 * 1000;
    const SHARED_TEMPLE_MISSING_CONFIRM_MS = 5 * 1000;
    const SHARED_TEMPLE_MIN_PERSIST_STEP = 15;
    const USE_GUARD_MS = 12000;
    // Ręczne użycie omija blokadę cyklu AUTO. Ta krótka blokada zatrzymuje
    // jedynie podwójne wywołanie tego samego tapnięcia/kliknięcia.
    const MANUAL_USE_GUARD_MS = 1500;
    // Krótka blokada chroni tylko przed podwójnym użyciem tego samego kliknięcia.
    // Faktyczną dostępność każdego kolejnego kamienia sprawdza hasCooldown().
    const AUTO_USE_LOCK_MS = 15 * 1000;
    // Ta blokada nie wygasa po kilkunastu sekundach. Jest przypisana do E2
    // oraz przewidywanego momentu jej aktualnego respu i znika dopiero, gdy
    // timer wyraźnie przeskoczy na następny cykl.
    const RESP_CYCLE_SHIFT_MS = 120 * 1000;
    const RESP_CYCLE_MIN_LOCK_MS = 5 * 60 * 1000;
    const RESP_CYCLE_RESET_CONFIRM_MS = 10 * 1000;
    const RESP_CYCLE_ANCHOR_TOLERANCE_MS = 15 * 1000;
    const RESP_CYCLE_CLAIM_SETTLE_MS = 120;
    // Jeśli po wysłaniu komendy mapa się nie zmieniła, obserwujemy dokładnie
    // ten sam kamień również przez ewentualny cooldown. Gdy znów będzie gotowy
    // i mapa ani razu się nie zmieniła, AUTO może ponowić próbę tylko jeden raz.
    const AUTO_USE_EFFECT_CONFIRM_MS = 5 * 1000;
    const AUTO_USE_EFFECT_POLL_MS = 500;
    const AUTO_USE_EFFECT_WATCH_MAX_MS = 90 * 1000;
    const AUTO_USE_MAX_NO_EFFECT_RETRIES = 1;
    const GROUP_ACTION_QUIET_MS = 2500;
    const RESP_CYCLE_GUARD_MAX_AGE_MS = 24 * 60 * 60 * 1000;
    const RESP_GUARD_WAKEUP_GRACE_MS = 10 * 1000;
    const FALLBACK_RUN_MS = 3000;
    // Lekki, niezależny od Lootloga polling stanu kamieni. MutationObserver
    // nadal reaguje natychmiast, a ten zegar wyłapuje zmianę cooldownu także
    // wtedy, gdy silnik gry nie zmieni żadnego obserwowanego elementu DOM.
    const STONE_READINESS_POLL_MS = 1500;
    // Po przejściu kolejki na inną E2 całkowity czas do wysłania komendy jest
    // losowany raz. Zawiera także końcową kontrolę celu i blokadę wyścigu kart.
    const AUTO_NEXT_TARGET_DELAY_MIN_MS = 500;
    const AUTO_NEXT_TARGET_DELAY_MAX_MS = 2500;
    const AUTO_USE_RECHECK_DELAY_MS = 260;
    const RUN_DEBOUNCE_MS = 60;
    const ITEM_SCAN_CACHE_MS = 5000;
    const INVENTORY_OBSERVER_REBIND_MS = 5000;
    const FRESH_SELECTION_DELAY_MS = 80;
    const TOUCH_TAP_MAX_MOVE_PX = 12;
    const TOUCH_TAP_MAX_DURATION_MS = 650;
    const TOUCH_GHOST_CLICK_MS = 800;
    const LEGENDARY_CLAN_MESSAGE_MAX_AGE_MS = 30 * 1000;
    const LEGENDARY_CLAN_MESSAGE_FUTURE_GRACE_MS = 5 * 1000;
    const LEGENDARY_MESSAGE_DEDUPE_MS = 10 * 60 * 1000;
    const LEGENDARY_MESSAGE_DEDUPE_LIMIT = 256;
    const LEGENDARY_ACK_MAX_AGE_MS = 60 * 60 * 1000;
    const LEGENDARY_HOOK_PROBE_MS = 1000;
    let lastLegendaryDetection = null;
    const CD_SELECTOR_OVERLAY = '.item-cd-overlay, .cd-overlay, .cooldown-overlay, [class*="cooldown"]';

    function readStoredJson(key, fallback) {
        try {
            const value = JSON.parse(localStorage.getItem(key));
            return value ?? fallback;
        } catch (_) {
            return fallback;
        }
    }

    function getCharacterScope() {
        try {
            const fromHelper = window.getCookie?.('mchar_id');
            if (fromHelper) return String(fromHelper);
        } catch (_) {}

        try {
            const cookieMatch = document.cookie.match(/(?:^|;\s*)mchar_id=([^;]+)/);
            if (cookieMatch?.[1]) return decodeURIComponent(cookieMatch[1]);
        } catch (_) {}

        const fallback =
            window.Engine?.hero?.d?.id ||
            window.g?.hero?.id ||
            window.hero?.id ||
            window.char_id;
        return fallback ? String(fallback) : 'global';
    }

    function getRespCycleGuardStorageKey() {
        return `${STORAGE_KEY_RESP_CYCLE_GUARDS}:${getCharacterScope()}`;
    }

    function getSharedTempleRouteStorageKey() {
        return `${STORAGE_KEY_SHARED_TEMPLE_ROUTE}:${getCharacterScope()}`;
    }

    function getAutoEnabledStorageKey() {
        return `${STORAGE_KEY_AUTO}:${getCharacterScope()}`;
    }

    function getLegendaryHoldStorageKey() {
        return `${STORAGE_KEY_LEGENDARY_HOLD}:${getCharacterScope()}`;
    }

    function getLegendaryAckStorageKey() {
        return `${STORAGE_KEY_LEGENDARY_ACK}:${getCharacterScope()}`;
    }

    function isSharedTempleMonster(monsterId) {
        return SHARED_TEMPLE_PAIR_SET.has(String(monsterId || ''));
    }

    function getSharedTemplePartnerId(monsterId) {
        const currentId = String(monsterId || '');
        return SHARED_TEMPLE_PAIR_IDS.find(id => id !== currentId) || null;
    }

    function isSharedTempleEntryItem(item) {
        if (!item) return false;
        if (mapMatches(getMapForItem(item), SHARED_TEMPLE_ENTRY_MAP)) {
            return true;
        }
        return String(getTeleportShortLabel(item) || '').toUpperCase() === 'PUST';
    }

    function itemsAreTheSame(firstItem, secondItem) {
        if (!firstItem || !secondItem) return false;
        if (firstItem === secondItem) return true;
        const firstId = getItemGameId(firstItem);
        const secondId = getItemGameId(secondItem);
        return firstId !== null &&
            secondId !== null &&
            Number(firstId) === Number(secondId);
    }

    function sharedTempleUsesOnePhysicalItem(
        monsterId,
        item,
        itemSnapshot = null
    ) {
        if (
            !isSharedTempleMonster(monsterId) ||
            !isSharedTempleEntryItem(item)
        ) return false;

        const partnerId = getSharedTemplePartnerId(monsterId);
        if (!partnerId) return false;
        const snapshot = Array.isArray(itemSnapshot)
            ? itemSnapshot
            : buildTeleportItemSnapshot(true);
        const partnerItem = findAvailableItemForMonster(partnerId, snapshot);
        return itemsAreTheSame(item, partnerItem);
    }

    function clearSharedTempleRoute() {
        try {
            localStorage.removeItem(getSharedTempleRouteStorageKey());
        } catch (_) {}
    }

    function getSharedTempleRoute() {
        const route = readStoredJson(getSharedTempleRouteStorageKey(), null);
        if (
            !route ||
            typeof route !== 'object' ||
            !isSharedTempleMonster(route.entryId) ||
            !isSharedTempleMonster(route.partnerId) ||
            String(route.entryId) === String(route.partnerId) ||
            !['entry', 'walk-partner'].includes(route.phase) ||
            !Number.isFinite(Number(route.at)) ||
            Date.now() - Number(route.at) > SHARED_TEMPLE_ROUTE_MAX_AGE_MS
        ) {
            if (route) clearSharedTempleRoute();
            return null;
        }
        return route;
    }

    function saveSharedTempleRoute(route) {
        try {
            localStorage.setItem(
                getSharedTempleRouteStorageKey(),
                JSON.stringify(route)
            );
            return true;
        } catch (_) {
            return false;
        }
    }

    function getSharedTempleTimer(sortedTimers, monsterId) {
        return (Array.isArray(sortedTimers) ? sortedTimers : []).find(timer =>
            String(timer.id) === String(monsterId)
        ) || null;
    }

    function getFiniteTimerSeconds(timer, fallback = null) {
        const seconds = Number(timer?.seconds);
        return Number.isFinite(seconds) ? seconds : fallback;
    }

    function isStoredFiniteNumber(value) {
        return value !== null && value !== '' && Number.isFinite(Number(value));
    }

    function markSharedTempleRoute(monsterId, timerSeconds, sortedTimers = null) {
        if (!isSharedTempleMonster(monsterId)) return null;

        // Nie zmieniamy już rozpoczętej trasy, nawet jeśli drugi kontekst strony
        // niemal równocześnie zauważy użycie tego samego kamienia.
        const existing = getSharedTempleRoute();
        if (existing) return existing;

        const entryId = String(monsterId);
        const partnerId = getSharedTemplePartnerId(entryId);
        if (!partnerId) return null;

        const timers = Array.isArray(sortedTimers)
            ? sortedTimers
            : readTimers().sorted;
        const entryTimer = getSharedTempleTimer(timers, entryId);
        const partnerTimer = getSharedTempleTimer(timers, partnerId);
        const suppliedSeconds = Number(timerSeconds);
        const now = Date.now();
        const route = {
            entryId,
            partnerId,
            phase: 'entry',
            entryMinSeconds: isStoredFiniteNumber(timerSeconds)
                ? suppliedSeconds
                : getFiniteTimerSeconds(entryTimer),
            partnerMinSeconds: getFiniteTimerSeconds(partnerTimer),
            entryMissingSince: null,
            partnerMissingSince: null,
            at: now,
            updatedAt: now
        };
        saveSharedTempleRoute(route);
        return route;
    }

    function timerStartedNextCycle(timer, minSeconds) {
        const seconds = getFiniteTimerSeconds(timer);
        const previousMinimum = Number(minSeconds);
        return Number.isFinite(seconds) &&
            isStoredFiniteNumber(minSeconds) &&
            seconds > previousMinimum + KILL_TIMER_JUMP;
    }

    function getSharedTempleHold(sortedTimers, selected) {
        const route = getSharedTempleRoute();
        if (!route) return null;

        const timers = Array.isArray(sortedTimers) ? sortedTimers : [];
        // Pusty odczyt zdarza się podczas przeładowania mapy. Nie uznajemy go
        // za zbicie bossa i zachowujemy blokadę trasy.
        if (!timers.length) {
            return {
                route,
                timer: null,
                message: 'AUTO czeka — trwa przejście Vaenra/Chaegd'
            };
        }

        const now = Date.now();
        const selectedIds = selected instanceof Set ? selected : new Set(selected || []);
        const entryTimer = getSharedTempleTimer(timers, route.entryId);
        const partnerTimer = getSharedTempleTimer(timers, route.partnerId);

        if (route.phase === 'entry') {
            const entryFinishedByJump = timerStartedNextCycle(
                entryTimer,
                route.entryMinSeconds
            );

            if (entryTimer && !entryFinishedByJump) {
                const seconds = getFiniteTimerSeconds(entryTimer);
                if (
                    Number.isFinite(seconds) &&
                    (!isStoredFiniteNumber(route.entryMinSeconds) ||
                        seconds <= Number(route.entryMinSeconds) -
                            SHARED_TEMPLE_MIN_PERSIST_STEP)
                ) {
                    route.entryMinSeconds = seconds;
                    route.updatedAt = now;
                    saveSharedTempleRoute(route);
                }
                return {
                    route,
                    timer: entryTimer,
                    message: 'AUTO czeka — pierwszy boss Vaenra/Chaegd jest w toku'
                };
            }

            if (!entryTimer && !entryFinishedByJump) {
                if (!isStoredFiniteNumber(route.entryMissingSince)) {
                    route.entryMissingSince = now;
                    route.updatedAt = now;
                    saveSharedTempleRoute(route);
                }
                if (
                    now - Number(route.entryMissingSince) <
                    SHARED_TEMPLE_MISSING_CONFIRM_MS
                ) {
                    return {
                        route,
                        timer: partnerTimer,
                        message: 'AUTO czeka — potwierdzanie zbicia pierwszego bossa świątyni'
                    };
                }
            }

            // Jeśli druga E2 nie jest zaznaczona, wspólna trasa kończy się po
            // pierwszym bossie i AUTO może normalnie przejść do następnego celu.
            if (!selectedIds.has(String(route.partnerId))) {
                clearSharedTempleRoute();
                return null;
            }

            route.phase = 'walk-partner';
            route.entryMissingSince = null;
            route.partnerMissingSince = null;
            route.updatedAt = now;

            if (
                partnerTimer &&
                timerStartedNextCycle(partnerTimer, route.partnerMinSeconds)
            ) {
                clearSharedTempleRoute();
                return null;
            }
            if (
                partnerTimer &&
                !isStoredFiniteNumber(route.partnerMinSeconds)
            ) {
                route.partnerMinSeconds = getFiniteTimerSeconds(partnerTimer);
            }
            saveSharedTempleRoute(route);
        }

        if (!selectedIds.has(String(route.partnerId))) {
            clearSharedTempleRoute();
            return null;
        }

        const currentPartnerTimer = getSharedTempleTimer(timers, route.partnerId);
        if (timerStartedNextCycle(currentPartnerTimer, route.partnerMinSeconds)) {
            clearSharedTempleRoute();
            return null;
        }

        if (currentPartnerTimer) {
            const seconds = getFiniteTimerSeconds(currentPartnerTimer);
            let changed = false;
            if (
                Number.isFinite(seconds) &&
                (!isStoredFiniteNumber(route.partnerMinSeconds) ||
                    seconds <= Number(route.partnerMinSeconds) -
                        SHARED_TEMPLE_MIN_PERSIST_STEP)
            ) {
                route.partnerMinSeconds = seconds;
                changed = true;
            }
            if (route.partnerMissingSince !== null) {
                route.partnerMissingSince = null;
                changed = true;
            }
            if (changed) {
                route.updatedAt = now;
                saveSharedTempleRoute(route);
            }
        } else {
            if (!isStoredFiniteNumber(route.partnerMissingSince)) {
                route.partnerMissingSince = now;
                route.updatedAt = now;
                saveSharedTempleRoute(route);
            }
            if (
                now - Number(route.partnerMissingSince) >=
                SHARED_TEMPLE_MISSING_CONFIRM_MS
            ) {
                clearSharedTempleRoute();
                return null;
            }
        }

        const partnerName = getMonsterNameForId(route.partnerId) ||
            'drugiego bossa w Świątyni Hebrehotha';
        return {
            route,
            timer: currentPartnerTimer,
            message: `AUTO czeka — przejdź pieszo na ${partnerName}; kamień nie zostanie użyty`
        };
    }

    function getRespCycleGuards() {
        const guards = readStoredJson(getRespCycleGuardStorageKey(), {});
        return guards && typeof guards === 'object' && !Array.isArray(guards)
            ? guards
            : {};
    }

    function saveRespCycleGuards(guards) {
        try {
            localStorage.setItem(
                getRespCycleGuardStorageKey(),
                JSON.stringify(guards)
            );
            return true;
        } catch (_) {
            return false;
        }
    }

    // Drugi bezpiecznik działa wyłącznie w pamięci bieżącej strony. Dzięki
    // temu nawet błąd/zablokowanie localStorage nie pozwoli kolejnemu tickowi
    // AUTO ponownie użyć kamienia dla tej samej E2.
    const runtimeRespCycleGuards = new Map();

    function getRespCycleGuard(monsterId) {
        if (!monsterId) return null;
        const monsterKey = String(monsterId);
        // Zapis współdzielony ma pierwszeństwo. Jeżeli dwa konteksty Safari
        // zgłosiły próbę prawie równocześnie, oba widzą tego samego zwycięzcę.
        return getRespCycleGuards()[monsterKey] ||
            runtimeRespCycleGuards.get(monsterKey) ||
            null;
    }

    function getTimerSecondsForMonster(monsterId, sortedTimers = null) {
        if (!monsterId) return null;
        const timers = Array.isArray(sortedTimers)
            ? sortedTimers
            : readTimers().sorted;
        const timer = timers.find(entry =>
            String(entry.id) === String(monsterId)
        );
        return Number.isFinite(Number(timer?.seconds))
            ? Number(timer.seconds)
            : null;
    }

    function markRespCycleGuard(
        monsterId,
        item = null,
        source = 'slot',
        timerSeconds = null
    ) {
        if (!monsterId) return null;

        const at = Date.now();
        const seconds = timerSeconds !== null &&
            timerSeconds !== undefined &&
            Number.isFinite(Number(timerSeconds))
            ? Number(timerSeconds)
            : getTimerSecondsForMonster(monsterId);
        const attemptId = [
            at,
            String(monsterId),
            item ? getItemGameId(item) : 'none',
            Math.random().toString(36).slice(2)
        ].join(':');
        const guard = {
            monsterId: String(monsterId),
            itemId: item ? getItemGameId(item) : null,
            source,
            at,
            timerSecondsAtUse: Number.isFinite(seconds) ? seconds : null,
            minSecondsSeen: Number.isFinite(seconds) ? seconds : null,
            cycleSpawnAt: Number.isFinite(seconds)
                ? at + seconds * 1000
                : null,
            resetCandidateSince: null,
            resetCandidateSpawnAt: null,
            attemptId
        };
        const guards = getRespCycleGuards();
        runtimeRespCycleGuards.set(String(monsterId), guard);
        guards[String(monsterId)] = guard;
        guard.persisted = saveRespCycleGuards(guards);
        return guard;
    }

    function respCycleClaimIsOwned(monsterId, attemptId) {
        if (!monsterId || !attemptId) return false;
        const monsterKey = String(monsterId);
        const runtimeGuard = runtimeRespCycleGuards.get(monsterKey);
        if (
            String(runtimeGuard?.attemptId || '') !== String(attemptId)
        ) {
            return false;
        }

        const storedGuard = getRespCycleGuards()[monsterKey];
        if (!runtimeGuard.persisted && !storedGuard) {
            // localStorage jest niedostępny — nadal działa blokada bieżącej
            // strony i ochrona jednej głównej ramki.
            return true;
        }
        return String(storedGuard?.attemptId || '') === String(attemptId);
    }

    function dropRuntimeRespCycleClaim(monsterId, expectedAttemptId) {
        if (!monsterId || !expectedAttemptId) return false;
        const monsterKey = String(monsterId);
        const runtimeGuard = runtimeRespCycleGuards.get(monsterKey);
        if (
            String(runtimeGuard?.attemptId || '') !==
            String(expectedAttemptId)
        ) {
            return false;
        }
        runtimeRespCycleGuards.delete(monsterKey);
        return true;
    }

    function clearRespCycleGuard(monsterId, expectedAttemptId = null) {
        if (!monsterId) return false;
        const monsterKey = String(monsterId);
        const guards = getRespCycleGuards();
        const guard = guards[monsterKey] ||
            runtimeRespCycleGuards.get(monsterKey);
        if (!guard) return false;
        if (
            expectedAttemptId &&
            String(guard.attemptId || '') !== String(expectedAttemptId)
        ) {
            return false;
        }

        runtimeRespCycleGuards.delete(monsterKey);
        delete guards[monsterKey];
        saveRespCycleGuards(guards);
        return true;
    }

    let lastRespGuardReconcileAt = Date.now();
    let suppressRespGuardResetUntil = 0;

    function reconcileRespCycleGuards(sortedTimers) {
        const now = Date.now();

        // Po wybudzeniu telefonu timer może przez chwilę zawierać starą wartość.
        // Czekamy na jego synchronizację, żeby samo wznowienie karty nie zostało
        // uznane za nowy resp.
        if (now - lastRespGuardReconcileAt > 5000) {
            suppressRespGuardResetUntil = now + RESP_GUARD_WAKEUP_GRACE_MS;
        }
        lastRespGuardReconcileAt = now;

        const timerMap = new Map(
            (Array.isArray(sortedTimers) ? sortedTimers : []).map(timer => [
                String(timer.id),
                Number(timer.seconds)
            ])
        );
        const guards = getRespCycleGuards();
        let changed = false;

        // Jeżeli zapis trwały chwilowo się nie udał albo zakres postaci został
        // rozpoznany dopiero po starcie gry, pamięciowa blokada nadal wygrywa
        // i jest ponownie utrwalana pod aktualnym kluczem.
        for (const [monsterId, runtimeGuard] of runtimeRespCycleGuards) {
            const storedGuard = guards[monsterId];
            if (!storedGuard) {
                guards[monsterId] = runtimeGuard;
                changed = true;
            } else if (
                String(runtimeGuard?.attemptId || '') !==
                String(storedGuard?.attemptId || '')
            ) {
                // Ostatni zapis współdzielony rozstrzyga wyścig. Przegrany
                // kontekst przyjmuje cudzą blokadę i nie wysyła komendy.
                runtimeRespCycleGuards.set(monsterId, storedGuard);
            }
        }

        for (const [monsterId, guard] of Object.entries(guards)) {
            if (
                !guard ||
                typeof guard !== 'object' ||
                !Number.isFinite(Number(guard.at)) ||
                now - Number(guard.at) > RESP_CYCLE_GUARD_MAX_AGE_MS
            ) {
                runtimeRespCycleGuards.delete(monsterId);
                delete guards[monsterId];
                changed = true;
                continue;
            }

            const seconds = timerMap.get(String(monsterId));
            if (!Number.isFinite(seconds)) {
                if (
                    guard.resetCandidateSince !== null ||
                    guard.resetCandidateSpawnAt !== null
                ) {
                    guard.resetCandidateSince = null;
                    guard.resetCandidateSpawnAt = null;
                    changed = true;
                }
                runtimeRespCycleGuards.set(monsterId, guard);
                continue;
            }

            const storedMinimum = guard.minSecondsSeen !== null &&
                guard.minSecondsSeen !== undefined &&
                Number.isFinite(Number(guard.minSecondsSeen))
                ? Number(guard.minSecondsSeen)
                : guard.timerSecondsAtUse !== null &&
                    guard.timerSecondsAtUse !== undefined &&
                    Number.isFinite(Number(guard.timerSecondsAtUse))
                    ? Number(guard.timerSecondsAtUse)
                    : seconds;
            const minSecondsSeen = Math.min(storedMinimum, seconds);
            if (Number(guard.minSecondsSeen) !== minSecondsSeen) {
                guard.minSecondsSeen = minSecondsSeen;
                changed = true;
            }

            const canInspectReset =
                now >= suppressRespGuardResetUntil &&
                guard.cycleSpawnAt !== null &&
                guard.cycleSpawnAt !== undefined &&
                Number.isFinite(Number(guard.cycleSpawnAt));
            const currentCycleSpawnAt = now + seconds * 1000;
            const resetLooksPossible =
                canInspectReset &&
                now - Number(guard.at) >= RESP_CYCLE_MIN_LOCK_MS &&
                seconds > minSecondsSeen + RESP_CYCLE_SHIFT_MS / 1000 &&
                currentCycleSpawnAt >
                    Number(guard.cycleSpawnAt) + RESP_CYCLE_SHIFT_MS;

            if (!resetLooksPossible) {
                if (
                    guard.resetCandidateSince !== null ||
                    guard.resetCandidateSpawnAt !== null
                ) {
                    guard.resetCandidateSince = null;
                    guard.resetCandidateSpawnAt = null;
                    changed = true;
                }
                runtimeRespCycleGuards.set(monsterId, guard);
                continue;
            }

            const candidateSince = Number(guard.resetCandidateSince);
            const candidateSpawnAt = Number(guard.resetCandidateSpawnAt);
            if (
                guard.resetCandidateSince === null ||
                guard.resetCandidateSpawnAt === null ||
                !Number.isFinite(candidateSince) ||
                !Number.isFinite(candidateSpawnAt) ||
                Math.abs(currentCycleSpawnAt - candidateSpawnAt) >
                    RESP_CYCLE_ANCHOR_TOLERANCE_MS
            ) {
                guard.resetCandidateSince = now;
                guard.resetCandidateSpawnAt = currentCycleSpawnAt;
                runtimeRespCycleGuards.set(monsterId, guard);
                changed = true;
                continue;
            }

            if (now - candidateSince >= RESP_CYCLE_RESET_CONFIRM_MS) {
                runtimeRespCycleGuards.delete(monsterId);
                delete guards[monsterId];
                changed = true;
                continue;
            }

            runtimeRespCycleGuards.set(monsterId, guard);
        }

        if (changed) saveRespCycleGuards(guards);
        return guards;
    }

    function respCycleIsGuarded(monsterId) {
        return Boolean(getRespCycleGuard(monsterId));
    }

    // AUTO jest niedostępne dla wskazanych klanów. Ta kontrola jest częścią
    // głównej logiki dodatku — bez drugiej pętli manipulującej przyciskiem.
    const AUTO_RESTRICTED_CLANS = new Set(['zgarbieni', 'wyprostowani']);

    function normalizeAutoRestrictionText(value) {
        return String(value ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    function readAutoRestrictionHero() {
        const heroSources = [
            window.Engine?.hero?.d,
            window.Engine?.hero,
            window.g?.hero?.d,
            window.g?.hero,
            window.hero?.d,
            window.hero
        ].filter(source => source && typeof source === 'object');

        let nick = '';
        const clanCandidates = [];
        const pushClanCandidate = value => {
            if (value === null || value === undefined) return;
            if (typeof value === 'object') {
                for (const field of [
                    'name', 'title', 'nick', 'clanName', 'clanname',
                    'clan_name', 'guildName', 'guild_name'
                ]) {
                    if (value[field] !== undefined && value[field] !== null) {
                        clanCandidates.push(String(value[field]));
                    }
                }
                return;
            }
            const textValue = String(value).trim();
            if (textValue && !/^\d+$/.test(textValue)) {
                clanCandidates.push(textValue);
            }
        };

        for (const raw of heroSources) {
            const source = raw?.d && typeof raw.d === 'object'
                ? { ...raw, ...raw.d }
                : raw;

            if (!nick) {
                nick = String(
                    source.nick ??
                    source.name ??
                    source.n ??
                    source.characterName ??
                    source.character_name ??
                    ''
                ).trim();
            }

            for (const key of [
                'clanName', 'clanname', 'clan_name', 'guildName',
                'guild_name', 'cln', 'clan', 'guild'
            ]) {
                pushClanCandidate(source[key]);
            }

            // Zabezpieczenie na różnice SI/NI i zmiany nazw pól w silniku.
            // Czytamy tylko pola, których nazwa jawnie wskazuje na klan/gildię.
            for (const [key, value] of Object.entries(source)) {
                if (/clan|guild|cln/i.test(key)) pushClanCandidate(value);
            }
        }

        const nickEl = document.getElementById('nick');
        if (!nick) {
            nick = String(nickEl?.textContent || '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        const nickTip = String(
            nickEl?.getAttribute?.('tip') ||
            nickEl?.getAttribute?.('data-tip') ||
            ''
        );
        for (const match of nickTip.matchAll(/\[([^\]]+)]/g)) {
            pushClanCandidate(match[1]);
        }

        for (const candidate of [
            window.Engine?.clan?.d?.name,
            window.Engine?.clan?.name,
            window.Engine?.guild?.d?.name,
            window.Engine?.guild?.name,
            window.g?.clan?.d?.name,
            window.g?.clan?.name,
            window.g?.clanname,
            window.g?.guild?.d?.name,
            window.g?.guild?.name,
            window.clan?.d?.name,
            window.clan?.name,
            window.guild?.d?.name,
            window.guild?.name,
            document.querySelector(
                '#clan, .clan-name, [class*="clan-name"], [class*="guild-name"]'
            )?.textContent
        ]) {
            pushClanCandidate(candidate);
        }

        let clan = '';
        for (const candidate of clanCandidates) {
            const normalized = normalizeAutoRestrictionText(candidate)
                .replace(/^\[|\]$/g, '')
                .trim();
            if (AUTO_RESTRICTED_CLANS.has(normalized)) {
                clan = normalized;
                break;
            }
        }

        return { nick, clan };
    }

    function isAutoRestrictedForHero() {
        const { clan } = readAutoRestrictionHero();
        return AUTO_RESTRICTED_CLANS.has(
            normalizeAutoRestrictionText(clan)
        );
    }

    function enforceAutoRestrictionStorage() {
        if (!isAutoRestrictedForHero()) return false;
        const key = getAutoEnabledStorageKey();
        if (localStorage.getItem(key) !== 'false') {
            localStorage.setItem(key, 'false');
        }
        return true;
    }

    const AUTO_RESTRICTION_NOTICE_STORAGE_PREFIX =
        'e2slot_auto_restriction_notice_law_v1';
    const AUTO_RESTRICTION_NOTICE_ID = 'e2slot-auto-restriction-notice';

    function getAutoRestrictionNoticeKey() {
        const hero = readAutoRestrictionHero();
        const scope = getCharacterScope();
        const identity = scope && scope !== 'global'
            ? String(scope)
            : normalizeAutoRestrictionText(hero.nick) || 'global';
        return `${AUTO_RESTRICTION_NOTICE_STORAGE_PREFIX}:${identity}`;
    }

    function maybeShowAutoRestrictionNotice() {
        if (!isAutoRestrictedForHero()) return false;
        if (!document.body) return false;

        const storageKey = getAutoRestrictionNoticeKey();
        try {
            if (localStorage.getItem(storageKey) === 'shown') return false;
        } catch (_) {}

        if (document.getElementById(AUTO_RESTRICTION_NOTICE_ID)) return true;

        // Zapisujemy od razu po utworzeniu, żeby kilka kart tej samej postaci
        // nie wyświetliło komunikatu równocześnie.
        try {
            localStorage.setItem(storageKey, 'shown');
        } catch (_) {}

        const notice = document.createElement('div');
        notice.id = AUTO_RESTRICTION_NOTICE_ID;
        notice.setAttribute('role', 'alertdialog');
        notice.setAttribute('aria-live', 'assertive');
        Object.assign(notice.style, {
            position: 'fixed',
            top: '18px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: '1000005',
            width: 'min(430px, calc(100vw - 24px))',
            boxSizing: 'border-box',
            padding: '14px 15px 13px',
            border: '1px solid #80651f',
            borderRadius: '8px',
            background: 'linear-gradient(#20251d, #10140f)',
            color: '#e8e4d8',
            boxShadow: '0 8px 28px rgba(0,0,0,.75), inset 0 0 0 1px #292f25',
            fontFamily: 'Arial, sans-serif',
            lineHeight: '1.35'
        });

        notice.innerHTML = `
            <div style="color:#e5c04f;font-size:14px;font-weight:700;margin-bottom:7px;">
                📜 Nowa ustawa o zakazie autotepania
            </div>
            <div style="font-size:12px;margin-bottom:7px;">
                Automatyczny tepek został wyłączony dla graczy z klanów
                <strong>Zgarbieni</strong> i <strong>Wyprostowani</strong>.
            </div>
            <div style="font-size:12px;color:#c9c5bb;margin-bottom:10px;">
                Pozostaje ręczne tepanie: pod ustawiony przycisk / skrót oraz
                klikając myszką w okno kamyka.
            </div>
            <button type="button" data-action="close" style="
                width:100%;padding:7px 9px;border:1px solid #80651f;border-radius:5px;
                background:#181d17;color:#e5c04f;font-weight:700;cursor:pointer;
                font-family:Arial,sans-serif;font-size:11px;">
                Rozumiem
            </button>
        `;

        notice.querySelector('[data-action="close"]')?.addEventListener(
            'click',
            () => notice.remove()
        );
        document.body.appendChild(notice);
        return true;
    }

    // Migracja: stare AUTO=ON nie uruchamia się samo po instalacji Frost Reaper.
    function initializeFrostAutoDefault() {
        const scope = getCharacterScope();
        if (!scope || scope === 'global') return;
        const migrationKey = `fr_kcs_auto_default_v010:${scope}`;
        try {
            if (localStorage.getItem(migrationKey) === '1') return;
            localStorage.setItem(getAutoEnabledStorageKey(), 'false');
            localStorage.setItem(migrationKey, '1');
        } catch (_) {}
    }

    function getAutoEnabled() {
        if (getCharacterScope() === 'global') return false;
        initializeFrostAutoDefault();
        if (isAutoRestrictedForHero()) {
            enforceAutoRestrictionStorage();
            return false;
        }
        try {
            return localStorage.getItem(getAutoEnabledStorageKey()) === 'true';
        } catch (_) {
            return false;
        }
    }

    function setAutoEnabled(enabled) {
        const next = Boolean(enabled) && !isAutoRestrictedForHero();
        try {
            localStorage.setItem(getAutoEnabledStorageKey(), String(next));
        } catch (_) {}
        return next;
    }

    function getLegendaryHold() {
        const hold = readStoredJson(getLegendaryHoldStorageKey(), null);
        if (
            hold?.type === 'legendary-drop' &&
            Number.isFinite(Number(hold.at))
        ) {
            return hold;
        }
        const runtimeHold = lastLegendaryDetection;
        if (
            runtimeHold?.type !== 'legendary-drop' ||
            !Number.isFinite(Number(runtimeHold.at))
        ) {
            return null;
        }
        if (
            runtimeHold.fingerprint &&
            String(getLegendaryAck()?.fingerprint || '') ===
                String(runtimeHold.fingerprint)
        ) {
            lastLegendaryDetection = null;
            return null;
        }
        return runtimeHold;
    }

    function getLegendaryAck() {
        const ack = readStoredJson(getLegendaryAckStorageKey(), null);
        if (
            !ack?.fingerprint ||
            !Number.isFinite(Number(ack.at)) ||
            Date.now() - Number(ack.at) > LEGENDARY_ACK_MAX_AGE_MS
        ) {
            return null;
        }
        return ack;
    }

    function legendaryDetectionWasAcknowledged(fingerprint) {
        if (!fingerprint) return false;
        return String(getLegendaryAck()?.fingerprint || '') === String(fingerprint);
    }

    function clearLegendaryHold() {
        const hold = getLegendaryHold();
        if (hold?.fingerprint) {
            try {
                localStorage.setItem(
                    getLegendaryAckStorageKey(),
                    JSON.stringify({
                        at: Date.now(),
                        fingerprint: String(hold.fingerprint).slice(0, 300)
                    })
                );
            } catch (_) {}
        }
        lastLegendaryDetection = null;
        try {
            localStorage.removeItem(getLegendaryHoldStorageKey());
        } catch (_) {}
    }

    function getSkipMissingStone() {
        return localStorage.getItem(STORAGE_KEY_SKIP_MISSING) === 'true';
    }

    function setSkipMissingStone(enabled) {
        localStorage.setItem(STORAGE_KEY_SKIP_MISSING, String(Boolean(enabled)));
    }

    function getShowAutoButton() {
        const stored = localStorage.getItem(STORAGE_KEY_SHOW_AUTO_BUTTON);
        return stored === null ? true : stored !== 'false';
    }

    function setShowAutoButton(enabled) {
        localStorage.setItem(
            STORAGE_KEY_SHOW_AUTO_BUTTON,
            String(Boolean(enabled))
        );
    }

    function getSelectedMonsterIds() {
        const selected = readStoredJson(STORAGE_KEY_SELECTED, []);
        return new Set(Array.isArray(selected) ? selected.map(String) : []);
    }

    function saveSelectedMonsterIds(selected) {
        localStorage.setItem(STORAGE_KEY_SELECTED, JSON.stringify([...selected].map(String)));
    }

    function getSlotSelectedMonsterIds() {
        if (localStorage.getItem(STORAGE_KEY_SLOT_SELECTED) === null) {
            // Pierwsze uruchomienie po aktualizacji: zachowaj dotychczasową
            // konfigurację jako punkt startowy także dla ręcznego slotu.
            return new Set(getSelectedMonsterIds());
        }
        const selected = readStoredJson(STORAGE_KEY_SLOT_SELECTED, []);
        return new Set(Array.isArray(selected) ? selected.map(String) : []);
    }

    function saveSlotSelectedMonsterIds(selected) {
        localStorage.setItem(
            STORAGE_KEY_SLOT_SELECTED,
            JSON.stringify([...selected].map(String))
        );
    }

    function getTimerCatalog() {
        const catalog = readStoredJson(STORAGE_KEY_CATALOG, {});
        return catalog && typeof catalog === 'object' && !Array.isArray(catalog) ? catalog : {};
    }

    function saveTimerCatalog(catalog) {
        localStorage.setItem(STORAGE_KEY_CATALOG, JSON.stringify(catalog));
    }

    // ── Hotkey: pomocnicze ──────────────────────────────────────────────────
    function getHotkey() {
        return localStorage.getItem(STORAGE_KEY_HOTKEY) || '';
    }
    function setHotkey(key) {
        if (key) localStorage.setItem(STORAGE_KEY_HOTKEY, key);
        else localStorage.removeItem(STORAGE_KEY_HOTKEY);
    }
    function normalizeKey(key) {
        if (!key) return '';
        return key.length === 1 ? key.toLowerCase() : key;
    }
    function formatKeyLabel(key) {
        if (!key) return '–';
        if (key === ' ') return 'Spacja';
        return key.length === 1 ? key.toUpperCase() : key;
    }
    function isTypingContext() {
        const el = document.activeElement;
        if (!el) return false;
        const tag = el.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
    }

    // ── Odczyt nazwy mapy z tip (SI + NI) ─────────────────────────────────
    function extractMapFromHtml(html) {
        if (!html) return null;
        const match = String(html).match(
            /Teleportuje Postać na mapę:<br\s*\/?>(.*?)\s*\(\d+[, ]+\d+\)/i
        );
        if (!match) return null;

        // Wyciągnięty fragment potrafi zawierać resztki tagów HTML (np. <span class="...">)
        // owijające nazwę mapy oraz encje typu &nbsp; – to psuje ścisłe porównania nazw.
        let name = match[1]
            .replace(/<[^>]*>/g, '')      // usuń wszelkie tagi HTML
            .replace(/&nbsp;/gi, ' ')     // rozwiń &nbsp;
            .replace(/&amp;/gi, '&')      // rozwiń &amp;
            .replace(/\s+/g, ' ')         // zredukuj wielokrotne spacje
            .trim();

        return name || null;
    }

    function getTipSourceElement(el) {
        if (!el) return null;
        if (el.hasAttribute?.('tip') || el.hasAttribute?.('tip-id') || el.hasAttribute?.('data-tip')) return el;
        return el.querySelector?.('[tip], [tip-id], [data-tip]') || null;
    }

    // Normalizacja do porównań: małe litery + pojedyncze spacje, bez skrajnych białych znaków.
    function normalizeMapName(str) {
        if (!str) return '';
        return str
            .replace(/&nbsp;/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    function getMapForItem(el) {
        const tipSource = getTipSourceElement(el);
        if (!tipSource) return null;

        const tipAttr = tipSource.getAttribute('tip');
        if (tipAttr) return extractMapFromHtml(tipAttr);
        const tipId = tipSource.getAttribute('tip-id');
        if (tipId && window.TIPS && window.TIPS.allTips) {
            return extractMapFromHtml(window.TIPS.allTips[tipId]);
        }
        return null;
    }

    function getItemTipText(el) {
        const tipSource = getTipSourceElement(el);
        if (!tipSource) return '';

        const tipAttr = tipSource.getAttribute('tip') || tipSource.getAttribute('data-tip');
        if (tipAttr) return tipAttr;
        const tipId = tipSource.getAttribute('tip-id');
        if (tipId && window.TIPS && window.TIPS.allTips) {
            return window.TIPS.allTips[tipId] || '';
        }
        return '';
    }

    let teleportItemCache = {
        checkedAt: 0,
        items: []
    };
    let teleportSnapshotCache = {
        checkedAt: 0,
        items: []
    };

    function invalidateTeleportItemCache() {
        teleportItemCache.checkedAt = 0;
        teleportSnapshotCache.checkedAt = 0;
    }

    function getAllTeleportItems(force = false) {
        const now = Date.now();
        if (!force &&
            now - teleportItemCache.checkedAt < ITEM_SCAN_CACHE_MS &&
            teleportItemCache.items.every(el => el?.isConnected)) {
            return teleportItemCache.items;
        }

        const results = [];
        const seenElements = new Set();
        // Nie wymagamy słowa "teleport" w tipie: część kamieni ma tylko
        // informację "Przenosi na mapę" lub nazwę docelowej mapy.
        // Skan ograniczony do ekwipunku, bez skanowania całego DOM.
        const selector = INTERFACE === 'SI'
            ? '.item[tip], .item[tip-id], .item[data-tip]'
            : [
                '.inventory-item',
                '.inventory-grid [class*="item-id-"]',
                '.inventory-grid [tip-id]',
                '.inventory-grid [tip]',
                '.inventory-grid [data-tip]',
                '[data-window-name="inventory"] [tip-id]',
                '[data-window-name="inventory"] [tip]',
                '[data-window-name="inventory"] [data-tip]'
            ].join(',');

        document.querySelectorAll(selector).forEach(candidate => {
            const el = INTERFACE === 'NI'
                ? (candidate.closest?.('.inventory-item, [class*="item-id-"], [data-item-id]') || candidate)
                : candidate;
            if (seenElements.has(el)) return;
            const tip = String(getItemTipText(el) || '');
            if (!tip) return;
            // Bez mapy docelowej nie jest to rozpoznany kamień.
            const map = extractMapFromHtml(tip);
            if (!map) return;
            // Musi wskazywać na mapę jednego z obsługiwanych E2.
            const targets = Object.values(MONSTER_TO_MAPS).flat();
            if (!targets.some(target => mapMatches(map, target))) return;
            seenElements.add(el);
            results.push(el);
        });

        teleportItemCache = { checkedAt: now, items: results };
        return results;
    }

    function getCooldownSecondsFromTip(html) {
        if (!html) return 0;

        const match = String(html).match(
            /Gotowy do użycia za:\s*(?:<span[^>]*>)?([^<]*)/i
        );

        if (!match) return 0;

        const text = match[1].trim();
        let total = 0;

        const hours = text.match(/(\d+)\s*h/i);
        const minutes = text.match(/(\d+)\s*m/i);
        const seconds = text.match(/(\d+)\s*s/i);

        if (hours) total += parseInt(hours[1], 10) * 3600;
        if (minutes) total += parseInt(minutes[1], 10) * 60;
        if (seconds) total += parseInt(seconds[1], 10);

        if (total > 0) return total;

        const clock = text.match(/(?:(\d+):)?(\d+):(\d+)/);
        if (!clock) return 0;

        return (
            parseInt(clock[1] || '0', 10) * 3600 +
            parseInt(clock[2] || '0', 10) * 60 +
            parseInt(clock[3] || '0', 10)
        );
    }

    // ── Identyfikacja ID przedmiotu w silniku gry (SI + NI) ────────────────
    function getItemGameId(el) {
        const tipSource = getTipSourceElement(el);
        const classItemId = String(el?.className || '').match(
            /(?:^|\s)item-id-(\d+)(?:\s|$)/
        )?.[1];
        const raw = [
            el.id ? el.id.replace(/^item/i, '') : null,
            el.id ? el.id.replace(/^ni/i, '') : null,
            el.getAttribute('data-id'),
            el.getAttribute('data-item-id'),
            el.getAttribute('data-iid'),
            tipSource?.getAttribute?.('data-id'),
            tipSource?.getAttribute?.('data-item-id'),
            tipSource?.getAttribute?.('data-iid'),
            classItemId
        ];
        for (const r of raw) {
            if (!r) continue;
            const n = parseInt(r, 10);
            if (!isNaN(n)) return n;
        }
        return null;
    }

    function getGameItemById(itemId) {
        const id = Number(itemId);
        if (!Number.isFinite(id)) return null;

        const direct =
            window.g?.item?.[id] ||
            window.g?.item?.[String(id)] ||
            null;
        if (direct) return direct;

        const engineItems = window.Engine?.items;
        const stores = [
            engineItems,
            engineItems?.items,
            engineItems?.collection,
            engineItems?.objects,
            engineItems?.d
        ];

        for (const store of stores) {
            if (!store) continue;
            try {
                const item = typeof store.get === 'function'
                    ? (store.get(id) || store.get(String(id)))
                    : (store[id] || store[String(id)]);
                if (item) return item.d && typeof item.d === 'object'
                    ? { ...item, ...item.d }
                    : item;
            } catch (_) {}
        }

        return null;
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

    function itemImageCandidates(el) {
        const item = getGameItemById(getItemGameId(el));
        const icon = itemIconValue(item);
        if (!icon) return [];

        if (/^(?:data:|blob:|https?:\/\/)/i.test(icon)) {
            return [icon];
        }

        const clean = icon
            .replace(/^https?:\/\/[^/]+/i, '')
            .replace(/^\/+/, '');
        const withoutPrefix = clean.replace(/^obrazki\/itemy\//i, '');
        const candidates = [
            `${ITEM_IMAGE_BASE}${withoutPrefix}`,
            `https://micc.garmory-cdn.cloud/${clean}`
        ];

        if (!/\.[a-z0-9]{2,5}(?:[?#]|$)/i.test(withoutPrefix)) {
            candidates.push(`${ITEM_IMAGE_BASE}${withoutPrefix}.gif`);
        }

        return [...new Set(candidates)];
    }

    function getTeleportShortLabel(el) {
        const signedLabel = String(
            el?.querySelector?.('.custom-teleport-desc')?.textContent || ''
        ).trim();
        if (signedLabel) return signedLabel;

        const mapName = getMapForItem(el);
        const normalizedMap = normalizeMapName(mapName);
        if (!normalizedMap) return '';

        const matchingEntry = Object.entries(TELEPORT_SHORT_LABELS)
            .find(([destination]) => normalizedMap === normalizeMapName(destination));
        if (matchingEntry) return matchingEntry[1];

        // Ostateczny fallback nadal opisuje kamień/mapę, a nie nazwę e2.
        const ignored = new Set(['p', 'sala', 'komnata', 'przedsionek']);
        const words = String(mapName || '')
            .replace(/p\.\s*\d+/gi, ' ')
            .replace(/[^\p{L}\p{N}]+/gu, ' ')
            .trim()
            .split(/\s+/)
            .filter(word => word && !ignored.has(word.toLowerCase()));
        return words.slice(0, 2).map(word => word.slice(0, 3).toUpperCase()).join('.') || 'KCS';
    }

    function getMonsterTeleportShortLabel(monsterId) {
        const monsterName = getMonsterNameForId(String(monsterId));
        if (monsterName) {
            const compactName = String(monsterName)
                .replace(/[^\p{L}\p{N}]+/gu, '')
                .toUpperCase();
            if (compactName) return compactName.slice(0, 6);
        }

        const targetMaps = MONSTER_TO_MAPS[String(monsterId)] || [];
        for (const targetMap of targetMaps) {
            const normalizedTarget = normalizeMapName(targetMap);
            const matchingEntry = Object.entries(TELEPORT_SHORT_LABELS)
                .find(([destination]) => normalizedTarget === normalizeMapName(destination));
            if (matchingEntry) return matchingEntry[1];
        }

        const fallbackMap = targetMaps[0];
        if (!fallbackMap) return 'E2';
        const ignored = new Set(['p', 'sala', 'komnata', 'przedsionek']);
        const words = String(fallbackMap)
            .replace(/p\.\s*\d+/gi, ' ')
            .replace(/[^\p{L}\p{N}]+/gu, ' ')
            .trim()
            .split(/\s+/)
            .filter(word => word && !ignored.has(word.toLowerCase()));
        return words.slice(0, 2).map(word => word.slice(0, 3).toUpperCase()).join('.') || 'E2';
    }

    function getCooldownEntry(container, idNum) {
        if (!container || idNum === null) return undefined;
        if (typeof container.get === 'function') {
            return container.get(idNum) ?? container.get(String(idNum));
        }
        if (Object.prototype.hasOwnProperty.call(container, idNum)) {
            return container[idNum];
        }
        if (Object.prototype.hasOwnProperty.call(container, String(idNum))) {
            return container[String(idNum)];
        }
        return undefined;
    }

    const cooldownCountdownObservations = new Map();

    function parseDurationSeconds(value) {
        if (value === undefined || value === null) return null;
        if (typeof value === 'number') {
            return Number.isFinite(value) ? Math.max(0, value) : null;
        }

        const text = String(value).trim();
        if (!text) return null;
        if (/^\d+(?:[.,]\d+)?$/.test(text)) {
            return Math.max(0, Number(text.replace(',', '.')));
        }

        let total = 0;
        let matchedUnit = false;
        const hours = text.match(/(\d+(?:[.,]\d+)?)\s*h/i);
        const minutes = text.match(/(\d+(?:[.,]\d+)?)\s*m/i);
        const seconds = text.match(/(\d+(?:[.,]\d+)?)\s*s/i);
        if (hours) {
            total += Number(hours[1].replace(',', '.')) * 3600;
            matchedUnit = true;
        }
        if (minutes) {
            total += Number(minutes[1].replace(',', '.')) * 60;
            matchedUnit = true;
        }
        if (seconds) {
            total += Number(seconds[1].replace(',', '.'));
            matchedUnit = true;
        }
        if (matchedUnit) return Math.max(0, total);

        const clock = text.match(/^(?:(\d+):)?(\d+):(\d+)$/);
        if (!clock) return null;
        return (
            Number(clock[1] || 0) * 3600 +
            Number(clock[2] || 0) * 60 +
            Number(clock[3] || 0)
        );
    }

    function observeCountdownRemainingMs(key, reportedSeconds) {
        const seconds = Number(reportedSeconds);
        if (!Number.isFinite(seconds) || seconds <= 0) {
            cooldownCountdownObservations.delete(key);
            return 0;
        }

        const now = Date.now();
        const current = cooldownCountdownObservations.get(key);
        if (!current) {
            const created = {
                reportedSeconds: seconds,
                expiresAt: now + seconds * 1000,
                observedAt: now
            };
            cooldownCountdownObservations.set(key, created);
            return Math.max(0, created.expiresAt - now);
        }

        // Wzrost licznika oznacza nowy cooldown. Spadek pozwala skrócić
        // lokalną prognozę, natomiast nieruchoma wartość nie przedłuża jej.
        if (seconds > Number(current.reportedSeconds) + 0.5) {
            current.expiresAt = now + seconds * 1000;
        } else if (seconds < Number(current.reportedSeconds)) {
            current.expiresAt = Math.min(
                Number(current.expiresAt),
                now + seconds * 1000
            );
        }
        current.reportedSeconds = seconds;
        current.observedAt = now;
        cooldownCountdownObservations.set(key, current);
        return Math.max(0, Number(current.expiresAt) - now);
    }

    function resetCooldownObservationsForItem(itemId) {
        if (itemId === null || itemId === undefined) return;
        const marker = `:${String(itemId)}`;
        for (const key of cooldownCountdownObservations.keys()) {
            if (
                String(key).endsWith(marker) ||
                String(key).includes(`${marker}:`)
            ) {
                cooldownCountdownObservations.delete(key);
            }
        }
    }

    function absoluteTimestampRemainingMs(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric <= 0) return null;
        if (numeric >= 1e12) return numeric - Date.now();
        if (numeric >= 1e9) return numeric * 1000 - Date.now();
        return null;
    }

    function cooldownScalarRemainingMs(value, observationKey) {
        const absolute = absoluteTimestampRemainingMs(value);
        if (absolute !== null) return Math.max(0, absolute);
        const seconds = parseDurationSeconds(value);
        if (seconds === null) return 0;
        return observeCountdownRemainingMs(observationKey, seconds);
    }

    function cooldownEntryRemainingMs(entry, observationKey) {
        if (entry === undefined || entry === null || entry === false) return 0;
        if (typeof entry !== 'object') {
            return cooldownScalarRemainingMs(entry, observationKey);
        }

        const data = entry.d && typeof entry.d === 'object'
            ? { ...entry, ...entry.d }
            : entry;
        if (
            data.ready === true ||
            data.active === false ||
            data.onCooldown === false ||
            data.isActive === false
        ) return 0;

        for (const field of [
            'expiresAt', 'expireAt', 'endsAt', 'endAt', 'until',
            'cooldownEnd', 'cdEnd'
        ]) {
            const remaining = absoluteTimestampRemainingMs(data[field]);
            if (remaining !== null) return Math.max(0, remaining);
        }

        const startedAt = [
            data.startedAt,
            data.startAt,
            data.start
        ].map(absoluteTimestampRemainingMs).find(value => value !== null);
        const duration = parseDurationSeconds(
            data.duration ?? data.cooldownTime ?? data.cdTime
        );
        if (startedAt !== undefined && duration !== null) {
            // absoluteTimestampRemainingMs(start) zwraca start - teraz.
            return Math.max(0, startedAt + duration * 1000);
        }

        for (const field of ['remainingMs', 'timeLeftMs', 'milliseconds']) {
            const milliseconds = Number(data[field]);
            if (Number.isFinite(milliseconds)) {
                return observeCountdownRemainingMs(
                    `${observationKey}:${field}`,
                    milliseconds / 1000
                );
            }
        }

        for (const field of [
            'remaining', 'timeLeft', 'seconds', 'left', 'cd', 'cooldown'
        ]) {
            if (data[field] === undefined || data[field] === null) continue;
            return cooldownScalarRemainingMs(
                data[field],
                `${observationKey}:${field}`
            );
        }

        return data.active === true || data.onCooldown === true ? Infinity : 0;
    }

    function cooldownEntryIsActive(entry, observationKey) {
        return cooldownEntryRemainingMs(entry, observationKey) > 0;
    }

    function isVisibleCooldownElement(element) {
        if (!element) return false;
        const style = getComputedStyle(element);
        if (
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            Number(style.opacity || 1) <= 0.05
        ) {
            return false;
        }

        const text = String(element.textContent || '').trim();
        if (element.matches('.gargonem-stone-timer')) {
            return text !== '' &&
                !/^(?:0|0s|00:00|00:00:00)$/.test(text);
        }

        if (text !== '') {
            return !/^(?:0|0s|00:00|00:00:00)$/.test(text);
        }

        return element.matches(
            '.item-cd-overlay, .cd-overlay, .cooldown-overlay'
        );
    }

    // Lista cooldownów właściwa dla danego interfejsu jest rozstrzygająca.
    // Nie nadpisujemy jej już starym modelem itemu ani starym tipem. Liczbowe
    // czasy i nieruchome liczniki są lokalnie odliczane, więc SI nie wymaga
    // najechania myszką, aby kamień po wygaśnięciu stał się gotowy.
    function hasCooldown(el, knownTip = null) {
        const idNum = getItemGameId(el);

        if (idNum !== null) {
            const niList = window.Engine?.cooldowns?.cooldownsList;
            const siList = window.g?.cooldowns;

            if (INTERFACE === 'SI' && siList) {
                const entry = getCooldownEntry(siList, idNum);
                return entry === undefined
                    ? false
                    : cooldownEntryIsActive(entry, `si:${idNum}`);
            }
            if (INTERFACE === 'NI' && niList) {
                const entry = getCooldownEntry(niList, idNum);
                return entry === undefined
                    ? false
                    : cooldownEntryIsActive(entry, `ni:${idNum}`);
            }

            // Fallback między interfejsami tylko wtedy, gdy podstawowa lista
            // nie istnieje, ale druga rzeczywiście ma wpis dla tego itemu.
            if (niList) {
                const entry = getCooldownEntry(niList, idNum);
                if (entry !== undefined) {
                    return cooldownEntryIsActive(entry, `ni-fallback:${idNum}`);
                }
            }
            if (siList) {
                const entry = getCooldownEntry(siList, idNum);
                if (entry !== undefined) {
                    return cooldownEntryIsActive(entry, `si-fallback:${idNum}`);
                }
            }
        }

        // Fallback wizualny i tekstowy
        const tip = String(
            knownTip === null ? getItemTipText(el) : knownTip
        );
        const itemKey = idNum === null ? String(el?.id || 'unknown') : String(idNum);
        const tipReportsCooldown =
            /Gotowy do użycia za|Pozostały czas|Odnowienie za/i.test(tip);
        const genericTipTime = tip.match(
            /(?:Gotowy do użycia za|Pozostały czas|Odnowienie za)\s*:?\s*(?:<[^>]+>)*\s*([^<\n]+)/i
        )?.[1];
        const parsedGenericTipSeconds = parseDurationSeconds(genericTipTime);
        const tipSeconds = Math.max(
            getCooldownSecondsFromTip(tip),
            Number.isFinite(parsedGenericTipSeconds)
                ? parsedGenericTipSeconds
                : 0
        );
        if (tipReportsCooldown && tipSeconds > 0) {
            return observeCountdownRemainingMs(
                `tip:${itemKey}`,
                tipSeconds
            ) > 0;
        }
        if (
            tipReportsCooldown &&
            /(?:^|[^\d])(?:0\s*s|00:00(?::00)?)(?:[^\d]|$)/i.test(
                String(genericTipTime || '')
            )
        ) return false;

        const explicitlyReady =
            /Gotowy do użycia(?!\s+za)/i.test(tip);
        const hasOverlay = Array.from(
            el.querySelectorAll(CD_SELECTOR_OVERLAY)
        ).some(isVisibleCooldownElement);
        const stoneTimerText = String(
            el.querySelector('.gargonem-stone-timer div')?.textContent || ''
        ).trim();
        const stoneTimerSeconds = parseDurationSeconds(stoneTimerText);
        if (stoneTimerText !== '' && stoneTimerSeconds !== null) {
            return observeCountdownRemainingMs(
                `stone-timer:${itemKey}`,
                stoneTimerSeconds
            ) > 0;
        }

        let dimmed = false;
        const img = el.querySelector('img');
        if (img) {
            const s = img.style;
            if (s.opacity && parseFloat(s.opacity) < 0.6) dimmed = true;
            if (s.filter && s.filter.includes('grayscale')) dimmed = true;
        }
        const cssCooldownClass =
            el.classList.contains('cooldown') ||
            el.classList.contains('on-cooldown') ||
            el.matches('[data-cooldown]:not([data-cooldown="0"])');

        if (
            hasOverlay ||
            dimmed ||
            cssCooldownClass
        ) {
            return true;
        }

        if (explicitlyReady) return false;

        // Na NI opis gotowego kamienia nie zawsze zawiera osobny tekst
        // „Gotowy do użycia”. Brak jakiegokolwiek sygnału cooldownu oznacza,
        // że widoczny kamień teleportacyjny jest dostępny.
        if (DEBUG) {
            console.info('[e2slot] Brak sygnału cooldownu — kamień uznany za gotowy:', el);
        }
        return false;
    }

    function mapMatches(itemMap, targetMap) {
        if (!itemMap || !targetMap) return false;
        const a = normalizeMapName(itemMap);
        const b = normalizeMapName(targetMap);
        if (!a || !b) return false;
        // Identycznie jak w działającym dodatku „Podświetl kamyki”: nazwa
        // docelowa może być fragmentem pełnej nazwy z kamienia (np. p.2,
        // „- źródło”, „- sala ofiarna”). Dłuższa nazwa nie może jednak
        // dopasować się do całkiem innej krótszej mapy.
        return a.includes(b);
    }

    // NI i SI przechowują nazwę bieżącej mapy w innych obiektach. Najpierw
    // pytamy źródło właściwe dla wykrytego interfejsu, a pozostałe traktujemy
    // jako bezpieczne fallbacki na czas przełączania mapy.
    function getCurrentMapName() {
        const readers = INTERFACE === 'NI'
            ? [
                () => window.Engine?.map?.d?.name,
                () => window.map?.name,
                () => window.g?.map?.name,
                () => window.g?.map?.d?.name
            ]
            : [
                () => window.map?.name,
                () => window.g?.map?.name,
                () => window.g?.map?.d?.name,
                () => window.Engine?.map?.d?.name
            ];

        for (const read of readers) {
            try {
                const value = read();
                if (typeof value === 'string' && value.trim()) {
                    return value.replace(/\s+/g, ' ').trim();
                }
            } catch (_) {}
        }
        return null;
    }

    function isOnMonsterMap(monsterId, currentMapName = getCurrentMapName()) {
        if (!monsterId || !currentMapName) return false;
        const targetMaps = MONSTER_TO_MAPS[String(monsterId)] || [];
        return targetMaps.some(targetMap =>
            mapMatches(currentMapName, targetMap)
        );
    }

    // ── Priorytet konkretnych przedmiotów dla wybranych map ────────────────
    // Gdy dla danej mapy dostępnych jest kilku pasujących kamyków, ten
    // regex decyduje, który typ przedmiotu ma pierwszeństwo użycia.
    // Klucz = znormalizowana nazwa mapy (normalizeMapName).
    const RED_DRAGON_STONE_PATTERN = /kamie[nń]\s+czerwonego\s+smoka/i;
    const MAP_ITEM_PRIORITY = {
        [normalizeMapName('Chantli Cuaitla Citlalina')]: RED_DRAGON_STONE_PATTERN,
    };

    function isPriorityItem(el, matchedTarget, knownTip = null) {
        const tip = knownTip === null ? getItemTipText(el) : knownTip;
        if (RED_DRAGON_STONE_PATTERN.test(tip)) return true;

        const key = normalizeMapName(matchedTarget);
        const pattern = MAP_ITEM_PRIORITY[key];
        if (!pattern) return false;
        return pattern.test(tip);
    }

    function buildTeleportItemSnapshot(force = false) {
        const now = Date.now();
        if (
            !force &&
            now - teleportSnapshotCache.checkedAt < FALLBACK_RUN_MS &&
            teleportSnapshotCache.items.every(item => item.el?.isConnected)
        ) {
            return teleportSnapshotCache.items;
        }

        const items = getAllTeleportItems(force).map(el => {
            const tip = getItemTipText(el);
            return {
                el,
                tip,
                map: extractMapFromHtml(tip),
                cooldown: hasCooldown(el, tip)
            };
        });

        teleportSnapshotCache = {
            checkedAt: now,
            items
        };
        return items;
    }

    function findAvailableItemForMonster(monsterId, itemSnapshot = null) {
        const targetMaps = MONSTER_TO_MAPS[monsterId];
        if (!targetMaps || !targetMaps.length) return null;
        const all = itemSnapshot || buildTeleportItemSnapshot();

        if (DEBUG) {
            console.log(`[e2slot] szukam gotowego kamyka dla ${monsterId}, cele:`, targetMaps,
                'dostępne przedmioty:', all.map(item => ({
                    id: item.el.id,
                    map: item.map,
                    cd: item.cooldown
                })));
        }

        // Zbierz wszystkich gotowych (bez cooldownu) kandydatów pasujących do
        // którejkolwiek z docelowych map, żeby móc wybrać spośród nich priorytetowy.
        const candidates = [];
        for (const item of all) {
            const { el, map: itemMap, tip, cooldown } = item;
            if (cooldown) continue;
            const matchedTarget = targetMaps.find(tm => mapMatches(itemMap, tm));
            if (matchedTarget) {
                candidates.push({
                    el,
                    matchedTarget,
                    // Pozycja mapy w tablicy targetMaps = priorytet wyboru:
                    // im wcześniej mapa jest wymieniona w MONSTER_TO_MAPS, tym bardziej
                    // preferowany jest pasujący do niej kamyk (przy kilku gotowych naraz).
                    targetIndex: targetMaps.indexOf(matchedTarget),
                    priority: isPriorityItem(el, matchedTarget, tip),
                });
            }
        }

        if (!candidates.length) {
            if (DEBUG) {
                console.warn(`[e2slot] BRAK dopasowania dla ${monsterId}. Sprawdź, czy powyższe nazwy map` +
                    ' pokrywają się (po normalizacji) z wpisem w MONSTER_TO_MAPS:', targetMaps);
            }
            return null;
        }

        // Sortowanie: 1) jawny priorytet przedmiotu (np. KCS na Cuaitla Citlalina) zawsze
        // wygrywa, 2) przy braku takiego priorytetu decyduje kolejność mapy w tablicy
        // (wcześniejsza = preferowana), 3) w razie remisu zachowana jest kolejność z DOM.
        candidates.sort((a, b) => {
            if (a.priority !== b.priority) return a.priority ? -1 : 1;
            return a.targetIndex - b.targetIndex;
        });

        if (DEBUG) {
            console.log(`[e2slot] kandydaci dla ${monsterId} (posortowani):`, candidates.map(c => ({
                map: c.matchedTarget, priority: c.priority, targetIndex: c.targetIndex,
            })));
        }

        return candidates[0].el;
    }

    function findAnyItemForMonster(monsterId, itemSnapshot = null) {
        const targetMaps = MONSTER_TO_MAPS[monsterId];
        if (!targetMaps || !targetMaps.length) return null;
        const all = itemSnapshot || buildTeleportItemSnapshot();
        for (const item of all) {
            if (targetMaps.some(tm => mapMatches(item.map, tm))) return item.el;
        }
        return null;
    }

    let boundLootlogApi = null;
    let lootlogUnsubscribers = [];
    let lootlogTimerNames = new Map();
    let lootlogSnapshot = {
        ready: false,
        status: 'api-missing',
        world: '',
        guildId: '',
        guilds: [],
        socketState: null,
        map: new Map(),
        sorted: []
    };

    function normalizeWorld(value) {
        if (typeof value !== 'string') return '';
        const world = value
            .trim()
            .toLocaleLowerCase('en-US')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9-]/g, '');

        return /^[a-z0-9][a-z0-9-]{1,31}$/.test(world)
            ? world
            : '';
    }

    function detectGameWorld() {
        const candidates = [
            (() => {
                try {
                    return window.Engine?.worldConfig?.getWorldName?.();
                } catch (_) {
                    return '';
                }
            })(),
            (() => {
                try {
                    return window.g?.worldConfig?.getWorldName?.();
                } catch (_) {
                    return '';
                }
            })(),
            window.Engine?.worldName,
            window.Engine?.world?.name,
            window.g?.worldname,
            window.g?.world,
            window.hero?.world
        ];

        for (const candidate of candidates) {
            const world = normalizeWorld(candidate);
            if (world) return world;
        }

        const hostname = String(location.hostname || '').toLowerCase();
        const hostWorld = normalizeWorld(
            hostname.match(
                /^([a-z0-9-]+)\.margonem\.(?:pl|com)$/
            )?.[1]
        );

        return hostWorld &&
            !['www', 'new', 'forum', 'support', 'experimental']
                .includes(hostWorld)
            ? hostWorld
            : '';
    }

    function readPreferredLootlogGuildId() {
        const shared = readStoredJson(STORAGE_KEY_LOOTLOG_SOURCE, null);
        if (
            shared &&
            Object.prototype.hasOwnProperty.call(shared, 'guildId')
        ) {
            return String(shared.guildId || '').trim();
        }

        const legacy = readStoredJson(
            STORAGE_KEY_LEGACY_MISSING_TIMERS,
            null
        );
        const match = String(legacy?.activeServerKey || '')
            .match(/^guild:(.+)$/);
        return String(match?.[1] || '').trim();
    }

    function savePreferredLootlogGuildId(guildId) {
        const value = String(guildId || '').trim();
        try {
            localStorage.setItem(
                STORAGE_KEY_LOOTLOG_SOURCE,
                JSON.stringify({ guildId: value, updatedAt: Date.now() })
            );
        } catch (_) {}

        try {
            window.dispatchEvent(new CustomEvent(
                'garbaty:lootlog-source-changed',
                { detail: { guildId: value } }
            ));
        } catch (_) {}
    }

    function isSupportedLootlogApi(api) {
        return Boolean(
            api &&
            Number(api.apiVersion) === 1 &&
            typeof api.getGuilds === 'function' &&
            typeof api.getTimers === 'function' &&
            typeof api.getSocketState === 'function' &&
            typeof api.subscribe === 'function'
        );
    }

    function detachLootlogApi() {
        for (const unsubscribe of lootlogUnsubscribers.splice(0)) {
            try {
                unsubscribe();
            } catch (_) {}
        }
        boundLootlogApi = null;
    }

    function syncLootlogApiBinding() {
        const candidate = isSupportedLootlogApi(
            window.lootlogGameClientApi
        )
            ? window.lootlogGameClientApi
            : null;

        if (candidate === boundLootlogApi) return false;
        detachLootlogApi();
        boundLootlogApi = candidate;
        if (!candidate) return true;

        const subscribe = (eventName, listener) => {
            try {
                const unsubscribe = candidate.subscribe(
                    eventName,
                    listener
                );
                if (typeof unsubscribe === 'function') {
                    lootlogUnsubscribers.push(unsubscribe);
                }
            } catch (error) {
                console.warn(
                    '[Szybki KCS] Nie udało się podpiąć API Lootloga:',
                    eventName,
                    error
                );
            }
        };

        subscribe('ready', () => scheduleRun(0));
        subscribe('guilds:changed', () => scheduleRun(0));
        subscribe('socket:state-changed', () => scheduleRun(0));
        subscribe('timers:changed', payload => {
            const world = detectGameWorld();
            if (
                payload?.world &&
                normalizeWorld(payload.world) !== world
            ) return;

            const selectedGuildId =
                lootlogSnapshot.guildId ||
                readPreferredLootlogGuildId();
            if (
                payload?.guildId &&
                selectedGuildId &&
                String(payload.guildId) !== String(selectedGuildId)
            ) return;

            // Payload dotyczy tylko jednego Discorda. Zawsze ponownie czytamy
            // pełny snapshot z getTimers(), zamiast podmieniać nim kolejkę.
            scheduleRun(0);
        });

        return true;
    }

    function readLootlogGuilds(api) {
        let source;
        try {
            source = api.getGuilds();
        } catch (error) {
            console.warn('[Szybki KCS] Błąd odczytu Discordów:', error);
            return undefined;
        }

        if (source === undefined) return undefined;
        if (!Array.isArray(source)) return [];

        const byId = new Map();
        for (const raw of source) {
            const id = String(raw?.id || '').trim();
            const name = String(raw?.name || '')
                .replace(/\s+/g, ' ')
                .trim();
            if (!id || !name || byId.has(id)) continue;
            byId.set(id, {
                id,
                name,
                icon: String(raw?.icon || '')
            });
        }
        return [...byId.values()];
    }

    function resolveLootlogGuild(guilds) {
        const preferred = readPreferredLootlogGuildId();
        const selected = guilds.find(guild => guild.id === preferred);
        if (selected) return selected;

        if (guilds.length === 1) {
            if (preferred !== guilds[0].id) {
                savePreferredLootlogGuildId(guilds[0].id);
            }
            return guilds[0];
        }
        return null;
    }

    function normalizeLootlogTimers(
        source,
        world,
        guildId,
        now = Date.now()
    ) {
        if (!Array.isArray(source)) return [];

        const byNpcId = new Map();
        for (const raw of source) {
            const id = String(raw?.npcId ?? raw?.npc?.id ?? '').trim();
            const name = String(raw?.npc?.name || '')
                .replace(/\s+/g, ' ')
                .trim();
            const timerWorld = normalizeWorld(raw?.world);
            const timerGuildId = String(raw?.guildId || '').trim();
            const maxSpawnAt = Date.parse(
                String(raw?.maxSpawnTime || '')
            );

            if (
                !/^\d+$/.test(id) ||
                !name ||
                timerWorld !== world ||
                timerGuildId !== guildId ||
                !Number.isFinite(maxSpawnAt)
            ) continue;

            const timer = {
                id,
                name,
                seconds: Math.floor((maxSpawnAt - now) / 1000),
                guildId: timerGuildId,
                timerKey: String(raw?.timerKey || ''),
                maxSpawnAt,
                maxSpawnTime: String(raw?.maxSpawnTime || ''),
                updatedAt: String(raw?.updatedAt || ''),
                expired: maxSpawnAt <= now,
                isPending: raw?.isPending === true
            };
            const previous = byNpcId.get(id);
            if (!previous || timer.maxSpawnAt > previous.maxSpawnAt) {
                byNpcId.set(id, timer);
            }
        }

        return [...byNpcId.values()].sort((first, second) => {
            if (first.expired !== second.expired) {
                return first.expired ? 1 : -1;
            }
            if (first.maxSpawnAt !== second.maxSpawnAt) {
                return first.expired
                    ? second.maxSpawnAt - first.maxSpawnAt
                    : first.maxSpawnAt - second.maxSpawnAt;
            }
            return first.id.localeCompare(second.id, 'en');
        });
    }

    function setLootlogSnapshot(next) {
        lootlogSnapshot = {
            ready: false,
            status: 'api-missing',
            world: '',
            guildId: '',
            guilds: [],
            socketState: null,
            map: new Map(),
            sorted: [],
            ...next
        };

        if (settingsModal?.classList.contains('open')) {
            renderLootlogGuildSetting();
        }
        return lootlogSnapshot;
    }

    function refreshLootlogSnapshot() {
        syncLootlogApiBinding();
        const api = boundLootlogApi;
        const world = detectGameWorld();

        if (!api) {
            return setLootlogSnapshot({ status: 'api-missing', world });
        }
        if (!api.ready) {
            return setLootlogSnapshot({ status: 'api-not-ready', world });
        }
        if (!world) {
            return setLootlogSnapshot({ status: 'world-missing' });
        }

        const guilds = readLootlogGuilds(api);
        if (!Array.isArray(guilds)) {
            return setLootlogSnapshot({
                status: 'guilds-loading',
                world
            });
        }

        const guild = resolveLootlogGuild(guilds);
        if (!guild) {
            return setLootlogSnapshot({
                status: guilds.length
                    ? 'guild-unselected'
                    : 'guilds-empty',
                world,
                guilds
            });
        }

        let socketState;
        try {
            socketState = api.getSocketState();
        } catch (error) {
            console.warn('[Szybki KCS] Błąd stanu połączenia:', error);
            return setLootlogSnapshot({
                status: 'socket-error',
                world,
                guildId: guild.id,
                guilds
            });
        }

        const joinedGuilds = new Set(
            (Array.isArray(socketState?.joinedGuilds)
                ? socketState.joinedGuilds
                : [])
                .map(String)
        );
        if (
            !socketState?.connected ||
            !socketState?.joined ||
            !joinedGuilds.has(guild.id)
        ) {
            return setLootlogSnapshot({
                status: 'socket-offline',
                world,
                guildId: guild.id,
                guilds,
                socketState
            });
        }

        let source;
        try {
            source = api.getTimers({ world });
        } catch (error) {
            console.warn('[Szybki KCS] Błąd odczytu timerów:', error);
            return setLootlogSnapshot({
                status: 'timers-error',
                world,
                guildId: guild.id,
                guilds,
                socketState
            });
        }

        if (source === undefined) {
            return setLootlogSnapshot({
                status: 'timers-loading',
                world,
                guildId: guild.id,
                guilds,
                socketState
            });
        }

        const sorted = normalizeLootlogTimers(
            source,
            world,
            guild.id
        );
        const map = new Map(
            sorted.map(timer => [timer.id, timer.seconds])
        );
        lootlogTimerNames = new Map(
            sorted.map(timer => [timer.id, timer.name])
        );

        return setLootlogSnapshot({
            ready: true,
            status: 'ready',
            world,
            guildId: guild.id,
            guilds,
            socketState,
            map,
            sorted
        });
    }

    function lootlogStatusText(status = lootlogSnapshot.status) {
        return ({
            'api-missing': 'czekam na API Lootloga',
            'api-not-ready': 'Lootlog jeszcze się uruchamia',
            'world-missing': 'nie udało się wykryć świata',
            'guilds-loading': 'czekam na listę Discordów',
            'guilds-empty': 'Lootlog nie udostępnił żadnego Discorda',
            'guild-unselected': 'wybierz Discord Lootloga pod ⚙',
            'socket-error': 'nie udało się odczytać połączenia Lootloga',
            'socket-offline': 'Lootlog jest rozłączony z wybranym Discordem',
            'timers-error': 'nie udało się odczytać timerów Lootloga',
            'timers-loading': 'Lootlog nie załadował timerów tego świata'
        })[status] || 'czekam na dane Lootloga';
    }

    function readTimers() {
        const snapshot = refreshLootlogSnapshot();
        return {
            ready: snapshot.ready,
            status: snapshot.status,
            world: snapshot.world,
            guildId: snapshot.guildId,
            map: new Map(snapshot.map),
            sorted: snapshot.sorted.map(timer => ({ ...timer }))
        };
    }

    function getTimerMap() {
        return readTimers().map;
    }

    function getSortedTimers(timerMap) {
        const timers = readTimers().sorted;
        return timerMap instanceof Map
            ? timers.filter(timer => timerMap.has(timer.id))
            : timers;
    }

    function getMonsterNameForId(id) {
        const key = String(id || '');
        return lootlogTimerNames.get(key) ||
            getTimerCatalog()[key]?.name ||
            null;
    }

    function learnTimerCatalog(sortedTimers) {
        const catalog = getTimerCatalog();
        let changed = false;

        for (const timer of sortedTimers) {
            if (!MONSTER_TO_MAPS[timer.id]) continue;
            const name = timer.name || getMonsterNameForId(timer.id);
            const previous = catalog[timer.id];
            if (!previous || (name && previous.name !== name)) {
                catalog[timer.id] = {
                    id: String(timer.id),
                    name: name || previous?.name || `E2 ${timer.id}`,
                    seenAt: Date.now()
                };
                changed = true;
            }
        }

        if (changed) saveTimerCatalog(catalog);
        return catalog;
    }

    function getFirstMappedTimer(sortedTimers) {
        return sortedTimers.find(timer => MONSTER_TO_MAPS[timer.id]) || null;
    }

    function getSelectedSortedTimers(sortedTimers, selected) {
        return sortedTimers
            .filter(timer =>
                MONSTER_TO_MAPS[timer.id] &&
                selected.has(String(timer.id))
            )
            .slice();
    }

    const KILL_TIMER_JUMP = 120;
    const slotTargetTracker = { activeId: null, lastSeconds: Infinity };
    const autoTargetTracker = { activeId: null, lastSeconds: Infinity };

    // Mechanizm 1:1 z dodatku podświetlania: po wybraniu celu pamiętamy go,
    // dopóki timer nie zniknie albo nie skoczy w górę po ponownym zbiciu.
    // Kolory Lootloga nie uczestniczą w decyzji.
    function pickTarget(sortedTimers, itemSnapshot, selected, tracker) {
        const selectedTimers = getSelectedSortedTimers(sortedTimers, selected);
        if (!selectedTimers.length) {
            tracker.activeId = null;
            tracker.lastSeconds = Infinity;
            return null;
        }

        if (tracker.activeId) {
            const activeTimer = selectedTimers.find(timer =>
                String(timer.id) === String(tracker.activeId)
            );
            const activeIndex = activeTimer
                ? selectedTimers.indexOf(activeTimer)
                : -1;
            const killed = !activeTimer ||
                activeTimer.seconds > tracker.lastSeconds + KILL_TIMER_JUMP;

            // Lootlog przenosi zakończony timer na dół. Zapamiętany cel nie
            // może wtedy blokować następnej E2 z aktualnej kolejki.
            let displacedByQueue = false;
            if (activeTimer && activeIndex > 0) {
                if (!getSkipMissingStone()) {
                    displacedByQueue = true;
                } else {
                    displacedByQueue = selectedTimers
                        .slice(0, activeIndex)
                        .some(timer => Boolean(
                            findAvailableItemForMonster(timer.id, itemSnapshot)
                        ));
                }
            }

            if (!killed && !displacedByQueue) {
                tracker.lastSeconds = activeTimer.seconds;
                const activeItem = findAvailableItemForMonster(
                    activeTimer.id,
                    itemSnapshot
                );
                if (!getSkipMissingStone() || activeItem) {
                    return { timer: activeTimer, item: activeItem };
                }
            }

            tracker.activeId = null;
            tracker.lastSeconds = Infinity;
        }

        if (!getSkipMissingStone()) {
            const timer = selectedTimers[0];
            const target = {
                timer,
                item: findAvailableItemForMonster(timer.id, itemSnapshot)
            };
            tracker.activeId = timer.id;
            tracker.lastSeconds = timer.seconds;
            return target;
        }

        for (const timer of selectedTimers) {
            const item = findAvailableItemForMonster(timer.id, itemSnapshot);
            if (item) {
                tracker.activeId = timer.id;
                tracker.lastSeconds = timer.seconds;
                return { timer, item };
            }
        }
        tracker.activeId = null;
        tracker.lastSeconds = Infinity;
        return null;
    }

    function formatTimer(seconds) {
        if (seconds === null || seconds === Infinity) return '–';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
    }

    function truncate(str, n) {
        return str.length > n ? str.slice(0, n) + '…' : str;
    }

    let lastUseMethod = null;
    let lastUseError = null;
    let lastUseAt = null;
    let lastUseTargetId = null;
    let lastUseItemId = null;
    const autoUseNoEffectRetries = new Map();
    let activeAutoUseEffectWatch = null;

    function getUseGuard() {
        const guard = readStoredJson(STORAGE_KEY_USE_GUARD, null);
        if (!guard || !Number.isFinite(Number(guard.at))) return null;
        return guard;
    }

    function useIsTemporarilyBlocked(
        source = 'auto',
        targetMonsterId = null,
        targetItemId = null
    ) {
        const guard = getUseGuard();
        const targetKey = targetMonsterId === null || targetMonsterId === undefined
            ? null
            : String(targetMonsterId);
        const samePersistedItem =
            targetItemId !== null &&
            targetItemId !== undefined &&
            guard?.itemId !== null &&
            guard?.itemId !== undefined &&
            Number(guard.itemId) === Number(targetItemId);
        const sameRuntimeItem =
            targetItemId !== null &&
            targetItemId !== undefined &&
            lastUseItemId !== null &&
            lastUseItemId !== undefined &&
            Number(lastUseItemId) === Number(targetItemId);
        const persistedGuardMatches =
            source !== 'auto' ||
            !targetKey ||
            !guard?.monsterId ||
            String(guard.monsterId) === targetKey ||
            samePersistedItem;
        const runtimeGuardMatches =
            source !== 'auto' ||
            !targetKey ||
            !lastUseTargetId ||
            String(lastUseTargetId) === targetKey ||
            sameRuntimeItem;
        const guardedAt = Math.max(
            persistedGuardMatches
                ? Number(guard?.at) || 0
                : 0,
            runtimeGuardMatches
                ? Number(lastUseAt) || 0
                : 0
        );
        const guardDuration = source === 'auto'
            ? USE_GUARD_MS
            : MANUAL_USE_GUARD_MS;
        return guardedAt > 0 && Date.now() - guardedAt < guardDuration;
    }

    function markUseGuard(
        el,
        method,
        targetMonsterId = null
    ) {
        const guard = {
            at: Date.now(),
            itemId: getItemGameId(el),
            method: method || null,
            monsterId: targetMonsterId === null || targetMonsterId === undefined
                ? null
                : String(targetMonsterId)
        };
        try {
            localStorage.setItem(STORAGE_KEY_USE_GUARD, JSON.stringify(guard));
        } catch (_) {}
        lastUseAt = guard.at;
        lastUseTargetId = guard.monsterId;
        lastUseItemId = guard.itemId;
        return guard;
    }

    function clearMatchingUseGuard(monsterId, itemId = null, expectedAt = null) {
        const targetKey = monsterId === null || monsterId === undefined
            ? null
            : String(monsterId);
        const stored = getUseGuard();
        const storedMatches = Boolean(
            stored &&
            (
                expectedAt === null ||
                expectedAt === undefined ||
                Number(stored.at) === Number(expectedAt)
            ) &&
            (!targetKey || String(stored.monsterId || '') === targetKey) &&
            (
                itemId === null ||
                itemId === undefined ||
                stored.itemId === null ||
                stored.itemId === undefined ||
                Number(stored.itemId) === Number(itemId)
            )
        );
        if (storedMatches) {
            try { localStorage.removeItem(STORAGE_KEY_USE_GUARD); } catch (_) {}
        }

        const runtimeMatches = Boolean(
            (
                expectedAt === null ||
                expectedAt === undefined ||
                Number(lastUseAt) === Number(expectedAt)
            ) &&
            (!targetKey || String(lastUseTargetId || '') === targetKey) &&
            (
                itemId === null ||
                itemId === undefined ||
                lastUseItemId === null ||
                lastUseItemId === undefined ||
                Number(lastUseItemId) === Number(itemId)
            )
        );
        if (runtimeMatches) {
            lastUseAt = null;
            lastUseTargetId = null;
            lastUseItemId = null;
        }
    }

    function getAutoNoEffectRetryState(monsterId, cycleSpawnAt) {
        const monsterKey = String(monsterId);
        const anchor = Number(cycleSpawnAt);
        const current = autoUseNoEffectRetries.get(monsterKey);
        if (
            current &&
            Number.isFinite(anchor) &&
            Number.isFinite(Number(current.cycleSpawnAt)) &&
            Math.abs(Number(current.cycleSpawnAt) - anchor) <=
                RESP_CYCLE_ANCHOR_TOLERANCE_MS
        ) {
            return current;
        }

        const fresh = {
            cycleSpawnAt: Number.isFinite(anchor) ? anchor : null,
            retries: 0
        };
        autoUseNoEffectRetries.set(monsterKey, fresh);
        return fresh;
    }

    function responseContainsGameError(response) {
        if (!response || typeof response !== 'object') return false;
        return Boolean(
            response.e ||
            response.error ||
            response.alert ||
            response.err ||
            response.message?.type === 'error'
        );
    }

    function getGameSenders() {
        const senders = [];

        if (typeof window._g === 'function') {
            senders.push({ name: '_g', fn: window._g, owner: window });
        }

        try {
            const topWindow = window.top;
            if (
                topWindow &&
                topWindow !== window &&
                typeof topWindow._g === 'function'
            ) {
                senders.push({
                    name: 'top._g',
                    fn: topWindow._g,
                    owner: topWindow
                });
            }
        } catch (_) {}

        return senders;
    }

    function prepareItemUseCommand(el) {
        const id = getItemGameId(el);
        if (!id) {
            lastUseError = 'missing_item_id';
            return null;
        }

        const sender = getGameSenders().find(entry =>
            typeof entry.fn === 'function'
        );
        if (!sender) {
            lastUseError = 'missing_game_sender';
            return null;
        }

        return {
            id,
            command: `moveitem&st=1&id=${encodeURIComponent(id)}`,
            sender
        };
    }

    function sendItemUseCommand(
        el,
        preparedRequest = null,
        targetMonsterId = null
    ) {
        const request = preparedRequest || prepareItemUseCommand(el);
        if (!request) return false;

        try {
            lastUseError = null;
            // Nowe użycie rozpoczyna nowy cykl lokalnego odliczania. Dzięki
            // temu taki sam czas cooldownu jak poprzednio nie zostanie uznany
            // za stary, już wygasły licznik.
            resetCooldownObservationsForItem(request.id);
            // Dokładnie jedno wywołanie funkcji gry. Nie generujemy click,
            // dblclick ani drugiego fallbacku, nawet gdy interfejs odpowiada
            // z opóźnieniem. Brak sendera oznacza bezpieczne anulowanie.
            request.sender.fn.call(
                request.sender.owner,
                request.command,
                response => {
                    if (!responseContainsGameError(response)) return;

                    lastUseError =
                        response.alert ||
                        response.error ||
                        response.e ||
                        'game_error';
                    // Komenda została już wysłana. Odpowiedź — także błędna
                    // lub niejednoznaczna — NIGDY nie cofa blokady cyklu, bo
                    // serwer mógł zużyć kamień przed zwróceniem odpowiedzi.
                    scheduleRun(350, true);
                }
            );
            lastUseMethod = request.sender.name;
            markUseGuard(
                el,
                lastUseMethod,
                targetMonsterId
            );
            return true;
        } catch (error) {
            lastUseError = error?.message || String(error);
            return false;
        }
    }

    function scheduleAutoUseEffectVerification({
        monsterId,
        itemId,
        attemptId,
        cycleSpawnAt,
        mapNameAtUse,
        sharedTempleRouteEligible = false
    }) {
        if (!monsterId || !attemptId || !mapNameAtUse) return;

        const verificationStartedAt = Date.now();
        activeAutoUseEffectWatch = {
            monsterId: String(monsterId),
            itemId,
            attemptId: String(attemptId),
            mapNameAtUse,
            startedAt: verificationStartedAt,
            state: 'waiting-initial-check'
        };
        const setWatchState = state => {
            if (
                String(activeAutoUseEffectWatch?.attemptId || '') ===
                String(attemptId)
            ) {
                activeAutoUseEffectWatch.state = state;
                activeAutoUseEffectWatch.updatedAt = Date.now();
            }
        };
        const verifyEffect = () => {
            const currentGuard = getRespCycleGuard(monsterId);
            if (
                String(currentGuard?.attemptId || '') !== String(attemptId)
            ) {
                setWatchState('guard-replaced');
                return;
            }

            const currentMapName = getCurrentMapName();
            if (!currentMapName) {
                setWatchState('waiting-map-read');
                if (
                    Date.now() - verificationStartedAt <
                    AUTO_USE_EFFECT_WATCH_MAX_MS
                ) {
                    window.setTimeout(verifyEffect, AUTO_USE_EFFECT_POLL_MS);
                }
                return;
            }

            // Zmiana mapy albo dotarcie na mapę celu potwierdza, że komenda
            // zadziałała. Blokada cyklu zostaje wtedy bez zmian.
            if (
                normalizeMapName(currentMapName) !==
                    normalizeMapName(mapNameAtUse) ||
                isOnMonsterMap(monsterId, currentMapName)
            ) {
                setWatchState('confirmed-map-change');
                return;
            }

            const exactItem = buildTeleportItemSnapshot(true).find(entry =>
                Number(getItemGameId(entry.el)) === Number(itemId)
            );
            // Po nieudanej komendzie gra może mimo wszystko uruchomić cooldown.
            // Dopóki mapa ani razu się nie zmieniła, obserwujemy dokładnie ten
            // sam kamień i decyzję o jednym retry podejmujemy dopiero, gdy znów
            // będzie gotowy. Chwilowy brak przedmiotu w DOM także nie wystarcza
            // do uznania teleportu za udany.
            if (
                !exactItem ||
                exactItem.cooldown ||
                hasCooldown(exactItem.el, exactItem.tip)
            ) {
                setWatchState(
                    exactItem ? 'waiting-item-cooldown' : 'waiting-item-read'
                );
                if (
                    Date.now() - verificationStartedAt <
                    AUTO_USE_EFFECT_WATCH_MAX_MS
                ) {
                    window.setTimeout(verifyEffect, AUTO_USE_EFFECT_POLL_MS);
                } else {
                    lastUseError = 'teleport_effect_unconfirmed';
                    setWatchState('timed-out-unconfirmed');
                    scheduleRun(0, true);
                }
                return;
            }

            const retryState = getAutoNoEffectRetryState(
                monsterId,
                cycleSpawnAt
            );
            if (
                retryState.retries >= AUTO_USE_MAX_NO_EFFECT_RETRIES
            ) {
                lastUseError = 'teleport_no_effect_after_retry';
                setWatchState('failed-after-retry');
                scheduleRun(0, true);
                return;
            }

            retryState.retries += 1;
            autoUseNoEffectRetries.set(String(monsterId), retryState);

            if (!clearRespCycleGuard(monsterId, attemptId)) return;
            clearAutoGuardFor(monsterId, itemId);
            clearMatchingUseGuard(monsterId, itemId);

            if (sharedTempleRouteEligible) {
                const route = getSharedTempleRoute();
                if (
                    route &&
                    String(route.entryId) === String(monsterId) &&
                    Math.abs(
                        Number(route.at) - Number(currentGuard.at)
                    ) <= RESP_CYCLE_ANCHOR_TOLERANCE_MS
                ) {
                    clearSharedTempleRoute();
                }
            }

            lastUseError = 'teleport_no_effect_retry';
            setWatchState('retry-authorized');
            invalidateTeleportItemCache();
            scheduleRun(0, true);
        };

        window.setTimeout(verifyEffect, AUTO_USE_EFFECT_CONFIRM_MS);
    }

    function useItem(
        el,
        monsterId = currentMonsterId,
        source = 'manual-slot',
        timerSeconds = null
    ) {
        if (!el) return false;

        const targetMonsterId = monsterId ? String(monsterId) : null;
        const isAutoUse = source === 'auto';
        if (isAutoUse && (!getAutoEnabled() || getLegendaryHold())) {
            lastUseError = getLegendaryHold()
                ? 'legendary_drop_detected'
                : 'auto_disabled_before_preflight';
            return false;
        }
        // Ustalamy to przed wysłaniem komendy, gdy kamień jest jeszcze gotowy.
        // Specjalna trasa działa wyłącznie wtedy, gdy dokładnie ten sam element
        // przedmiotu jest najlepszym kamieniem zarówno dla Vaenry, jak i Chaegda.
        const sharedTempleRouteEligible = targetMonsterId
            ? sharedTempleUsesOnePhysicalItem(targetMonsterId, el)
            : false;

        // Przed każdą komendą — automatyczną i ręczną — odczytujemy mapę
        // bezpośrednio z silnika gry. Nie zużywamy kamienia, gdy odczytu jeszcze
        // nie ma albo postać już stoi na jednej z map przypisanych do tej E2.
        let mapNameAtUse = null;
        if (targetMonsterId) {
            const currentMapName = getCurrentMapName();
            if (!currentMapName) {
                lastUseError = 'current_map_unavailable';
                scheduleRun(250, true);
                return false;
            }
            if (isOnMonsterMap(targetMonsterId, currentMapName)) {
                lastUseError = 'already_on_target_map';
                scheduleRun(0, true);
                return false;
            }
            mapNameAtUse = currentMapName;
        }

        if (
            useIsTemporarilyBlocked(
                source,
                targetMonsterId,
                getItemGameId(el)
            )
        ) {
            lastUseError = 'use_guard_active';
            return false;
        }

        if (targetMonsterId) {
            const liveTimers = readTimers();
            if (isAutoUse && !liveTimers.ready) {
                lastUseError = `lootlog_${liveTimers.status}`;
                scheduleRun(0, true);
                return false;
            }
            if (liveTimers.ready) {
                reconcileRespCycleGuards(liveTimers.sorted);
            }
            // Blokada cyklu steruje wyłącznie AUTO. Ręczne użycie pozostaje
            // dostępne, o ile kamień jest gotowy i nie jesteśmy na jego mapie.
            if (isAutoUse && respCycleIsGuarded(targetMonsterId)) {
                lastUseError = 'resp_cycle_guard_active';
                scheduleRun(0, true);
                return false;
            }
        }

        if (hasCooldown(el)) {
            if (DEBUG) {
                console.warn('[e2slot] Użycie anulowane: kamień ma cooldown.', el);
            }
            scheduleRun(0, true);
            return false;
        }

        // Walidujemy ID i dostępność dokładnie jednego sendera przed założeniem
        // blokady. Po rozpoczęciu próby blokada zostaje, chyba że późniejsza
        // kontrola jednoznacznie potwierdzi brak efektu komendy.
        const preparedRequest = prepareItemUseCommand(el);
        if (!preparedRequest) return false;
        const autoGuardAtPreflight = isAutoUse
            ? Number(getAutoGuard()?.at) || null
            : null;

        // Zapis przed wysłaniem zamyka wyścig pomiędzy równoległymi tickami.
        const respGuard = targetMonsterId
            ? markRespCycleGuard(
                targetMonsterId,
                el,
                source,
                timerSeconds
            )
            : null;

        // Wspólna blokada jest zapisywana jeszcze przed wywołaniem gry.
        // Druga karta lub drugi kontekst Safari zobaczy ją zanim będzie mógł
        // przejść do własnej komendy użycia.
        const preflightUseGuard = markUseGuard(
            el,
            `${source}_preflight`,
            targetMonsterId
        );

        // Krótkie okno rozstrzyga ewentualny równoległy start dwóch kontekstów
        // Safari. Tylko właściciel ostatniej współdzielonej blokady może wysłać
        // jedną komendę. AUTO pozostaje cały czas włączone.
        window.setTimeout(() => {
            const legendaryHold = isAutoUse ? getLegendaryHold() : null;
            if (isAutoUse && (!getAutoEnabled() || legendaryHold)) {
                if (targetMonsterId && respGuard?.attemptId) {
                    clearRespCycleGuard(
                        targetMonsterId,
                        respGuard.attemptId
                    );
                    dropRuntimeRespCycleClaim(
                        targetMonsterId,
                        respGuard.attemptId
                    );
                }
                clearMatchingUseGuard(
                    targetMonsterId,
                    getItemGameId(el),
                    preflightUseGuard?.at
                );
                clearAutoGuardFor(
                    targetMonsterId,
                    getItemGameId(el),
                    autoGuardAtPreflight
                );
                lastUseError = legendaryHold
                    ? 'legendary_drop_detected'
                    : 'auto_disabled_before_send';
                scheduleRun(0, true);
                return;
            }

            if (
                targetMonsterId &&
                respGuard?.attemptId &&
                !respCycleClaimIsOwned(
                    targetMonsterId,
                    respGuard.attemptId
                )
            ) {
                dropRuntimeRespCycleClaim(
                    targetMonsterId,
                    respGuard.attemptId
                );
                lastUseError = 'resp_cycle_claim_lost';
                scheduleRun(250, true);
                return;
            }

            // Źródło albo kolejka mogą zmienić się także w krótkim oknie
            // rozstrzygającym równoległe karty. Przed samą komendą AUTO jeszcze
            // raz wymaga gotowego API, tego samego pierwszego celu i tego samego
            // fizycznego kamienia. Dzięki temu utrata socketu/Discorda w tych
            // 120 ms nie może zakończyć się spóźnionym teleportem.
            if (isAutoUse && targetMonsterId) {
                const finalTimerState = readTimers();
                const finalItemSnapshot = buildTeleportItemSnapshot(true);
                const finalTarget = finalTimerState.ready
                    ? pickTarget(
                        finalTimerState.sorted,
                        finalItemSnapshot,
                        getSelectedMonsterIds(),
                        { activeId: null, lastSeconds: Infinity }
                    )
                    : null;
                const finalTargetMatches = Boolean(
                    finalTarget &&
                    String(finalTarget.timer?.id || '') === targetMonsterId &&
                    itemsAreTheSame(finalTarget.item, el) &&
                    !hasCooldown(el)
                );

                if (!finalTimerState.ready || !finalTargetMatches) {
                    if (respGuard?.attemptId) {
                        clearRespCycleGuard(
                            targetMonsterId,
                            respGuard.attemptId
                        );
                        dropRuntimeRespCycleClaim(
                            targetMonsterId,
                            respGuard.attemptId
                        );
                    }
                    clearMatchingUseGuard(
                        targetMonsterId,
                        getItemGameId(el),
                        preflightUseGuard?.at
                    );
                    clearAutoGuardFor(
                        targetMonsterId,
                        getItemGameId(el),
                        autoGuardAtPreflight
                    );
                    lastUseError = !finalTimerState.ready
                        ? `lootlog_${finalTimerState.status}`
                        : 'auto_target_changed_before_send';
                    scheduleRun(0, true);
                    return;
                }
            }

            // Ostatni odczyt jest celowo tuż przy senderze. Inna karta może
            // zapisać blokadę legendy podczas powyższego skanu timerów/items.
            const finalLegendaryHoldBeforeSend = isAutoUse
                ? getLegendaryHold()
                : null;
            if (
                isAutoUse &&
                (!getAutoEnabled() || finalLegendaryHoldBeforeSend)
            ) {
                if (targetMonsterId && respGuard?.attemptId) {
                    clearRespCycleGuard(
                        targetMonsterId,
                        respGuard.attemptId
                    );
                    dropRuntimeRespCycleClaim(
                        targetMonsterId,
                        respGuard.attemptId
                    );
                }
                clearMatchingUseGuard(
                    targetMonsterId,
                    getItemGameId(el),
                    preflightUseGuard?.at
                );
                clearAutoGuardFor(
                    targetMonsterId,
                    getItemGameId(el),
                    autoGuardAtPreflight
                );
                lastUseError = finalLegendaryHoldBeforeSend
                    ? 'legendary_drop_detected'
                    : 'auto_disabled_before_send';
                scheduleRun(0, true);
                return;
            }

            // SI i NI przechodzą przez tę samą, pojedynczą komendę gry. Nie ma
            // syntetycznych kliknięć ani drugiego fallbacku.
            const sent = sendItemUseCommand(
                el,
                preparedRequest,
                targetMonsterId
            );
            if (isAutoUse && targetMonsterId && respGuard?.attemptId) {
                scheduleAutoUseEffectVerification({
                    monsterId: targetMonsterId,
                    itemId: getItemGameId(el),
                    attemptId: respGuard.attemptId,
                    cycleSpawnAt: respGuard.cycleSpawnAt,
                    mapNameAtUse,
                    sharedTempleRouteEligible
                });
            }
            if (!sent) {
                // Nie cofamy blokady po podjęciu próby wywołania sendera.
                // Weryfikator zdejmie ją wyłącznie wtedy, gdy po 5 sekundach
                // mapa oraz gotowość dokładnie tego samego kamienia są bez zmian.
                scheduleRun(350, true);
                return;
            }

            // Dopiero przyjęta komenda rozpoczyna wspólną trasę. Zapis następuje
            // jeszcze w tym samym obrocie, więc przetrwa przeładowanie mapy.
            if (sharedTempleRouteEligible) {
                markSharedTempleRoute(
                    targetMonsterId,
                    timerSeconds,
                    readTimers().sorted
                );
            }

            markAutoGuard(targetMonsterId, el);
            invalidateTeleportItemCache();
            scheduleRun(250, true);
        }, RESP_CYCLE_CLAIM_SETTLE_MS);
        return true;
    }

    function createRenderedItemIcon(el) {
        const source = el?.querySelector?.(
            'canvas.icon, canvas.canvas-icon, canvas, img'
        );

        if (source instanceof HTMLCanvasElement) {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 32;
                canvas.height = 32;
                canvas.getContext('2d')?.drawImage(source, 0, 0, 32, 32);
                return canvas;
            } catch (_) {}
        }

        if (source instanceof HTMLImageElement && source.src) {
            const img = document.createElement('img');
            img.src = source.src;
            img.alt = '';
            img.draggable = false;
            return img;
        }

        return null;
    }

    function renderSiLegacyItemIcon(el) {
        const source = el?.querySelector?.('img')?.src || '';
        const iconKey = `si:${getItemGameId(el) || el?.id || source}`;
        const currentImage = iconEl.querySelector('img');

        if (
            iconEl.dataset.itemIconKey === iconKey &&
            currentImage?.src === source
        ) return;

        iconEl.dataset.itemIconKey = iconKey;
        iconEl.replaceChildren();
        if (!source) return;

        const image = document.createElement('img');
        image.src = source;
        image.alt = '';
        image.draggable = false;
        Object.assign(image.style, {
            width: '24px',
            height: '24px',
            objectFit: 'contain',
            pointerEvents: 'none'
        });
        iconEl.appendChild(image);
    }

    function renderItemIcon(el) {
        // SI zachowuje stary sposób wyświetlania bez canvasa i bez czytania
        // modelu Engine. Cała nowsza obsługa grafiki dotyczy wyłącznie NI.
        if (INTERFACE === 'SI') {
            renderSiLegacyItemIcon(el);
            return;
        }

        const itemId = getItemGameId(el);
        const iconKey = String(itemId || el?.className || 'unknown');
        if (
            iconEl.dataset.itemIconKey === iconKey &&
            iconEl.querySelector('img, canvas')
        ) {
            return;
        }

        iconEl.dataset.itemIconKey = iconKey;
        iconEl.replaceChildren();

        const rendered = createRenderedItemIcon(el);
        if (rendered) {
            Object.assign(rendered.style, {
                width: '32px',
                height: '32px',
                objectFit: 'contain',
                pointerEvents: 'none'
            });
            iconEl.appendChild(rendered);
        }

        const candidates = itemImageCandidates(el);
        if (!candidates.length) return;

        let index = 0;
        const tryNext = () => {
            if (index >= candidates.length) return;
            const img = document.createElement('img');
            img.alt = '';
            img.draggable = false;
            Object.assign(img.style, {
                width: '32px',
                height: '32px',
                objectFit: 'contain',
                pointerEvents: 'none'
            });
            img.onload = () => {
                if (
                    iconEl.isConnected &&
                    iconEl.dataset.itemIconKey === iconKey
                ) {
                    iconEl.replaceChildren(img);
                }
            };
            img.onerror = tryNext;
            img.src = candidates[index++];
        };
        tryNext();
    }

    // ── Budowa UI ────────────────────────────────────────────────────────────
    const SLOT_SIZE = 42;

    let slotEl, iconEl, timerEl, lockBtn, settingsBtn, autoBtn, settingsModal;
    let isDragging = false, dragOffX = 0, dragOffY = 0;
    let dragStartX = 0, dragStartY = 0, dragMoved = false, ignoreClickUntil = 0;
    let locked = false;
    let currentItemEl = null;
    let currentMonsterId = null;
    let recordingHotkey = false;
    let pendingFreshUse = null;
    let pendingAutoUse = null;
    let pendingAutoTargetDelay = null;
    let scheduledRunTimer = null;
    const observedInventoryRoots = new WeakSet();

    function scheduleRun(delay = RUN_DEBOUNCE_MS, invalidateItems = false) {
        if (invalidateItems) invalidateTeleportItemCache();
        if (scheduledRunTimer !== null) return;

        scheduledRunTimer = setTimeout(() => {
            scheduledRunTimer = null;
            run();
        }, delay);
    }

    const inventoryMutationObserver = new MutationObserver(() => {
        scheduleRun(0, true);
    });

    function observeInventoryRoots() {
        const selectors = INTERFACE === 'SI'
            ? ['#bag', '#inventory', '.inventory', '.bags-window']
            : ['.inventory-grid', '[data-window-name="inventory"]'];

        const roots = selectors.flatMap(selector =>
            Array.from(document.querySelectorAll(selector))
        );

        // Jeśli interfejs nie posiada stałego kontenera, obserwuj rodziców
        // faktycznie wykrytych teleportów, ale nigdy własny slot.
        for (const item of getAllTeleportItems()) {
            const root = item.parentElement;
            if (root && !root.closest?.('#e2-teleport-slot')) roots.push(root);
        }

        for (const root of roots) {
            if (!root || observedInventoryRoots.has(root)) continue;
            observedInventoryRoots.add(root);
            inventoryMutationObserver.observe(root, {
                subtree: true,
                childList: true,
                characterData: true,
                attributes: true,
                attributeFilter: [
                    'class', 'style', 'data-cooldown', 'tip', 'tip-id'
                ]
            });
        }
    }

    function useFreshSelectedItem(source = 'manual-slot') {
        if (pendingFreshUse !== null) return;

        run();
        pendingFreshUse = setTimeout(() => {
            pendingFreshUse = null;
            run();

            const freshItem = currentItemEl;
            const freshMonsterId = currentMonsterId;
            if (freshItem && freshMonsterId) {
                useItem(
                    freshItem,
                    freshMonsterId,
                    source,
                    getTimerSecondsForMonster(freshMonsterId)
                );
            }
        }, FRESH_SELECTION_DELAY_MS);
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, character => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[character]);
    }

    function injectPanelStyles() {
        if (document.getElementById('garbaty-e2slot-style')) return;
        const style = document.createElement('style');
        style.id = 'garbaty-e2slot-style';
        style.textContent = `
            #e2-teleport-slot {
                box-sizing: border-box;
                color: #e8e4d8;
                font-family: Arial, sans-serif;
            }
            #e2-teleport-slot .e2slot-control {
                appearance: none;
                border: 1px solid #80651f;
                color: #e5c04f;
                background: linear-gradient(#20251d, #10140f);
                box-shadow: 0 1px 3px #000;
                cursor: pointer;
                font-family: Arial, sans-serif;
                font-weight: 700;
            }
            #e2-teleport-slot .e2slot-control:hover {
                border-color: #c69b32;
                color: #ffe17b;
            }
            #e2-teleport-slot .e2slot-auto {
                display: flex;
                align-items: center;
                justify-content: center;
            }
            #e2-teleport-slot .e2slot-auto-on {
                color: #8bdc91;
                background: linear-gradient(#19301c, #101710);
                box-shadow: inset 0 0 5px #315c35;
            }
            #e2-teleport-slot .e2slot-auto-legend {
                color: #ff9aac;
                border-color: #9b3448;
                background: linear-gradient(#3b1520, #1b1014);
                box-shadow: inset 0 0 5px #7a2939;
            }
            #garbaty-e2slot-settings {
                position: fixed;
                inset: 0;
                z-index: 1000001;
                display: none;
                align-items: center;
                justify-content: center;
                background: rgba(0, 0, 0, .58);
                font-family: Arial, sans-serif;
                color: #dedbd2;
            }
            #garbaty-e2slot-settings.open { display: flex; }
            #garbaty-e2slot-settings .e2slot-modal-box {
                width: min(390px, calc(100vw - 24px));
                max-height: min(650px, calc(100vh - 24px));
                display: flex;
                flex-direction: column;
                overflow: hidden;
                border: 1px solid #80651f;
                border-radius: 8px;
                background: #101410;
                box-shadow: 0 10px 35px #000, inset 0 0 0 1px #242a20;
            }
            #garbaty-e2slot-settings .e2slot-modal-head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 11px 13px;
                border-bottom: 1px solid #4c421e;
                background: #181d17;
                color: #e5c04f;
                font-size: 15px;
                font-weight: 700;
            }
            #garbaty-e2slot-settings .e2slot-close {
                border: 0;
                background: transparent;
                color: #aaa;
                font-size: 20px;
                cursor: pointer;
            }
            #garbaty-e2slot-settings .e2slot-content {
                padding: 12px; overflow-y: auto; overflow-x: hidden;
                min-height: 0; overscroll-behavior: contain;
                touch-action: pan-y; -webkit-overflow-scrolling: touch;
            }
            #garbaty-e2slot-settings .e2slot-help {
                margin: 0 0 9px;
                color: #aaa;
                font-size: 11px;
                line-height: 1.35;
            }
            #garbaty-e2slot-settings .e2slot-option {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                margin: 0 0 10px;
                padding: 8px 9px;
                border: 1px solid #30362c;
                border-radius: 5px;
                background: #0b0e0b;
                font-size: 12px;
            }
            #garbaty-e2slot-settings .e2slot-lootlog-label {
                display: flex;
                min-width: 0;
                flex: 1;
                flex-direction: column;
                gap: 2px;
            }
            #garbaty-e2slot-settings .e2slot-lootlog-status {
                color: #8e9288;
                font-size: 9px;
                line-height: 1.2;
            }
            #garbaty-e2slot-settings .e2slot-lootlog-guild {
                box-sizing: border-box;
                width: min(190px, 52%);
                min-width: 130px;
                padding: 6px 7px;
                border: 1px solid #4b513f;
                border-radius: 4px;
                outline: none;
                background: #090c09;
                color: #eee;
                font-size: 10px;
            }
            #garbaty-e2slot-settings .e2slot-skip-toggle {
                min-width: 48px;
                padding: 5px 7px;
                border: 1px solid #66541f;
                border-radius: 4px;
                background: #241710;
                color: #d99463;
                cursor: pointer;
                font-size: 10px;
                font-weight: 700;
            }
            #garbaty-e2slot-settings .e2slot-skip-toggle.on {
                background: #19301c;
                color: #8bdc91;
                border-color: #477c4c;
            }
            #garbaty-e2slot-settings .e2slot-search {
                box-sizing: border-box;
                width: 100%;
                padding: 8px 9px;
                border: 1px solid #4b513f;
                border-radius: 4px;
                outline: none;
                background: #090c09;
                color: #eee;
            }
            #garbaty-e2slot-settings .e2slot-actions {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 6px;
                margin: 8px 0;
            }
            #garbaty-e2slot-settings .e2slot-actions button {
                flex: 1;
                padding: 6px;
                border: 1px solid #66541f;
                border-radius: 4px;
                background: #191d17;
                color: #d8bd63;
                cursor: pointer;
                font-size: 10px;
                font-weight: 700;
            }
            #garbaty-e2slot-settings .e2slot-list {
                min-height: 130px;
                max-height: min(330px, 42vh);
                overflow-y: auto;
                overflow-x: hidden;
                overscroll-behavior: contain;
                touch-action: pan-y;
                -webkit-overflow-scrolling: touch;
                border: 1px solid #30362c;
                border-radius: 5px;
                background: #0b0e0b;
            }
            #garbaty-e2slot-settings .e2slot-row {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 7px 9px;
                border-bottom: 1px solid #252a22;
                cursor: pointer;
                font-size: 12px;
            }
            #garbaty-e2slot-settings .e2slot-row:last-child { border-bottom: 0; }
            #garbaty-e2slot-settings .e2slot-row:hover { background: #171c16; }
            #garbaty-e2slot-settings .e2slot-name { flex: 1; min-width: 0; }
            #garbaty-e2slot-settings .e2slot-check {
                display: flex;
                align-items: center;
                gap: 3px;
                color: #aaa;
                font-size: 9px;
                cursor: pointer;
            }
            #garbaty-e2slot-settings input[type="checkbox"] { accent-color: #c3942f; }
            #garbaty-e2slot-settings .e2slot-empty {
                padding: 22px 12px;
                color: #888;
                text-align: center;
                font-size: 12px;
            }
            #garbaty-e2slot-settings .e2slot-footer {
                padding-top: 9px;
                color: #9d9b92;
                font-size: 10px;
                text-align: center;
            }
        `;
        document.head.appendChild(style);
    }

    // AUTO nie ma fizycznego przycisku na widgecie; jego stan jest w ustawieniach.
    function updateAutoButton() {
        renderFrostControls();
    }

    function renderSettingsList(filter = '') {
        if (!settingsModal) return;
        const list = settingsModal.querySelector('.e2slot-list');
        const counter = settingsModal.querySelector('.e2slot-selected-count');
        const autoSelected = getSelectedMonsterIds();
        const slotSelected = getSlotSelectedMonsterIds();
        const autoRestricted = isAutoRestrictedForHero();
        const normalizedFilter = String(filter).trim().toLowerCase();
        const entries = Object.values(getTimerCatalog())
            .filter(entry => MONSTER_TO_MAPS[String(entry.id)])
            .filter(entry => String(entry.name).toLowerCase().includes(normalizedFilter))
            .sort((a, b) => String(a.name).localeCompare(String(b.name), 'pl'));

        counter.textContent = autoRestricted
            ? `SLOT: ${slotSelected.size}`
            : `SLOT: ${slotSelected.size} | AUTO: ${autoSelected.size}`;
        if (!entries.length) {
            list.innerHTML = '<div class="e2slot-empty">Brak zapisanych E2. Lista uzupełni się automatycznie z publicznego API Lootloga — okno timerów może pozostać zamknięte.</div>';
            return;
        }

        list.innerHTML = entries.map(entry => `
            <div class="e2slot-row">
                <span class="e2slot-name">${escapeHtml(entry.name)}</span>
                <label class="e2slot-check" title="Pokazuj w ręcznym slocie">
                    <input type="checkbox" data-selection="slot" data-monster-id="${escapeHtml(entry.id)}" ${slotSelected.has(String(entry.id)) ? 'checked' : ''}>
                    SLOT
                </label>
                ${autoRestricted ? '' : `
                <label class="e2slot-check" title="Pozwól używać przez AUTO">
                    <input type="checkbox" data-selection="auto" data-monster-id="${escapeHtml(entry.id)}" ${autoSelected.has(String(entry.id)) ? 'checked' : ''}>
                    AUTO
                </label>`}
            </div>
        `).join('');
    }

    function renderSkipMissingSetting() {
        if (!settingsModal) return;
        const button = settingsModal.querySelector('.e2slot-skip-toggle');
        if (!button) return;
        const enabled = getSkipMissingStone();
        button.textContent = enabled ? 'WŁ' : 'WYŁ';
        button.classList.toggle('on', enabled);
        button.setAttribute('aria-pressed', String(enabled));
        button.title = enabled
            ? 'E2 bez gotowego kamienia są pomijane'
            : 'Pierwsza czasowo E2 blokuje wybór, gdy nie ma na nią gotowego kamienia';
    }

    function renderShowAutoButtonSetting() {
        if (!settingsModal) return;
        const button = settingsModal.querySelector('.e2slot-show-auto-toggle');
        if (!button) return;
        const option = button.closest('.e2slot-option');
        if (isAutoRestrictedForHero()) {
            if (option) option.style.display = 'none';
            return;
        }
        if (option) option.style.display = '';
        const enabled = getShowAutoButton();
        button.textContent = enabled ? 'WŁ' : 'WYŁ';
        button.classList.toggle('on', enabled);
        button.setAttribute('aria-pressed', String(enabled));
        button.title = enabled
            ? 'Przycisk AUTO jest widoczny przy slocie'
            : 'Przycisk AUTO jest ukryty; automatyczny teleport nadal działa zgodnie z zapisanym stanem';
    }

    function renderFrostControls() {
        if (!settingsModal) return;
        const auto = settingsModal.querySelector('.fr-kcs-auto-toggle');
        const hotkey = settingsModal.querySelector('.fr-kcs-hotkey');
        const lock = settingsModal.querySelector('.fr-kcs-lock');
        const enabled = getAutoEnabled();
        if (auto) {
            auto.textContent = enabled ? 'WŁ' : 'WYŁ';
            auto.classList.toggle('on', enabled);
            auto.setAttribute('aria-pressed', String(enabled));
            auto.disabled = isAutoRestrictedForHero();
            auto.title = auto.disabled ? 'AUTO niedostępne dla tej postaci' : '';
        }
        if (hotkey) hotkey.textContent = recordingHotkey
            ? 'Naciśnij klawisz (Esc anuluje)'
            : formatKeyLabel(getHotkey());
        if (lock) {
            lock.textContent = locked ? 'WŁ' : 'WYŁ';
            lock.classList.toggle('on', locked);
            lock.setAttribute('aria-pressed', String(locked));
        }
    }

    function renderAutoRestrictionSettingsUi() {
        if (!settingsModal) return;
        const restricted = isAutoRestrictedForHero();
        settingsModal.querySelectorAll(
            'button[data-action^="auto-"]'
        ).forEach(button => {
            button.style.display = restricted ? 'none' : '';
        });
    }

    let lastLootlogSettingsSignature = '';

    function renderLootlogGuildSetting(force = false) {
        if (!settingsModal) return;
        const select = settingsModal.querySelector(
            '.e2slot-lootlog-guild'
        );
        const status = settingsModal.querySelector(
            '.e2slot-lootlog-status'
        );
        if (!select || !status) return;

        const guilds = lootlogSnapshot.guilds || [];
        const signature = JSON.stringify({
            status: lootlogSnapshot.status,
            world: lootlogSnapshot.world,
            guildId: lootlogSnapshot.guildId,
            preferredGuildId: readPreferredLootlogGuildId(),
            guilds: guilds.map(guild => [guild.id, guild.name])
        });
        if (!force && signature === lastLootlogSettingsSignature) return;
        lastLootlogSettingsSignature = signature;

        const selectedGuildId =
            lootlogSnapshot.guildId ||
            readPreferredLootlogGuildId();
        select.innerHTML = guilds.length
            ? [
                guilds.length > 1
                    ? '<option value="">Wybierz Discord...</option>'
                    : '',
                ...guilds.map(guild => `
                    <option value="${escapeHtml(guild.id)}">
                        ${escapeHtml(guild.name)}
                    </option>
                `)
            ].join('')
            : '<option value="">Brak dostępnych Discordów</option>';
        select.disabled = guilds.length === 0;
        select.value = guilds.some(guild => guild.id === selectedGuildId)
            ? selectedGuildId
            : '';

        const world = lootlogSnapshot.world || detectGameWorld();
        status.textContent = lootlogSnapshot.ready
            ? `Świat: ${world} • dane API gotowe`
            : `Świat: ${world || 'nie wykryto'} • ${lootlogStatusText()}`;
    }

    function buildSettingsModal() {
        settingsModal = document.createElement('div');
        settingsModal.id = 'garbaty-e2slot-settings';
        settingsModal.innerHTML = `
            <div class="e2slot-modal-box" role="dialog" aria-modal="true" aria-label="Auto teleport KCS">
                <div class="e2slot-modal-head">
                    <span>Frost Reaper • Szybki KCS</span>
                    <button type="button" class="e2slot-close" title="Zamknij">×</button>
                </div>
                <div class="e2slot-content">
                    <p class="e2slot-help">SLOT określa E2 pokazywane do ręcznego użycia. AUTO określa E2 do automatycznego teleportowania. Blokada cyklu AUTO nie ukrywa ręcznego kamienia; ręczne użycie wyłącza się dopiero na mapie docelowej. Przełącznik pomijania działa osobno na obu listach.</p>
                    <div class="e2slot-option e2slot-lootlog-option">
                        <span class="e2slot-lootlog-label">
                            <strong>Discord timerów Lootloga</strong>
                            <small class="e2slot-lootlog-status">Czekam na API Lootloga</small>
                        </span>
                        <select class="e2slot-lootlog-guild"></select>
                    </div>
                    <div class="e2slot-option">
                        <span>Pomijanie E2 bez kamienia</span>
                        <button type="button" class="e2slot-skip-toggle" aria-pressed="false">WYŁ</button>
                    </div>
                    <div class="e2slot-option fr-kcs-auto-option">
                        <span>AUTO (domyślnie wyłączone)</span>
                        <button type="button" class="e2slot-skip-toggle fr-kcs-auto-toggle" aria-pressed="false">WYŁ</button>
                    </div>
                    <div class="e2slot-option">
                        <span>Hotkey ręcznego teleportu</span>
                        <button type="button" class="e2slot-skip-toggle fr-kcs-hotkey">Ustaw</button>
                    </div>
                    <div class="e2slot-option">
                        <span>Blokada pozycji widgetu</span>
                        <button type="button" class="e2slot-skip-toggle fr-kcs-lock">WYŁ</button>
                    </div>
                    <input class="e2slot-search" type="text" placeholder="Szukaj e2...">
                    <div class="e2slot-actions">
                        <button type="button" data-action="slot-all">SLOT: WSZYSTKIE</button>
                        <button type="button" data-action="slot-none">SLOT: WYCZYŚĆ</button>
                        <button type="button" data-action="auto-all">AUTO: WSZYSTKIE</button>
                        <button type="button" data-action="auto-none">AUTO: WYCZYŚĆ</button>
                    </div>
                    <div class="e2slot-list"></div>
                    <div class="e2slot-footer e2slot-selected-count">Wybrano: 0</div>
                </div>
            </div>
        `;
        document.body.appendChild(settingsModal);

        // Silnik Margonem przechwytuje wheel/touch na dokumencie.
        // Zatrzymujemy propagację wyłącznie w obrębie okna KCS,
        // pozostawiając natywne przewijanie listy i całej konfiguracji.
        settingsModal.addEventListener('wheel', event => {
            event.stopPropagation();
        }, {capture: true, passive: true});
        settingsModal.addEventListener('touchmove', event => {
            event.stopPropagation();
        }, {capture: true, passive: true});

        const close = () => settingsModal.classList.remove('open');
        settingsModal.querySelector('.e2slot-close').addEventListener('click', close);
        settingsModal.addEventListener('mousedown', event => {
            if (event.target === settingsModal) close();
        });
        settingsModal.querySelector('.e2slot-search').addEventListener('input', event => {
            renderSettingsList(event.target.value);
        });
        settingsModal.querySelector('.e2slot-lootlog-guild').addEventListener('change', event => {
            savePreferredLootlogGuildId(event.target.value);
            slotTargetTracker.activeId = null;
            slotTargetTracker.lastSeconds = Infinity;
            autoTargetTracker.activeId = null;
            autoTargetTracker.lastSeconds = Infinity;
            scheduleRun(0);
        });
        settingsModal.querySelector('.e2slot-option .e2slot-skip-toggle').addEventListener('click', () => {
            setSkipMissingStone(!getSkipMissingStone());
            renderSkipMissingSetting();
            scheduleRun(0);
        });
        settingsModal.querySelector('.fr-kcs-auto-toggle').addEventListener('click', () => {
            const hold = getLegendaryHold();
            if (hold && !getAutoEnabled()) clearLegendaryHold();
            const enabled = setAutoEnabled(!getAutoEnabled());
            if (!enabled) {
                clearPendingAutoTargetDelay();
                if (pendingAutoUse !== null) {
                    clearTimeout(pendingAutoUse);
                    pendingAutoUse = null;
                }
                clearAutoGuard();
            }
            renderFrostControls();
            scheduleRun(0, true);
        });
        settingsModal.querySelector('.fr-kcs-hotkey').addEventListener('click', () => {
            recordingHotkey = true;
            renderFrostControls();
        });
        settingsModal.querySelector('.fr-kcs-lock').addEventListener('click', () => {
            locked = !locked;
            slotEl.style.cursor = locked ? 'pointer' : 'grab';
            localStorage.setItem(STORAGE_KEY_LOCK, JSON.stringify(locked));
            renderFrostControls();
        });
        settingsModal.querySelector('.e2slot-list').addEventListener('change', event => {
            const checkbox = event.target.closest('input[data-monster-id]');
            if (!checkbox) return;
            const isSlot = checkbox.dataset.selection === 'slot';
            const selected = isSlot
                ? getSlotSelectedMonsterIds()
                : getSelectedMonsterIds();
            if (checkbox.checked) selected.add(String(checkbox.dataset.monsterId));
            else selected.delete(String(checkbox.dataset.monsterId));
            if (isSlot) saveSlotSelectedMonsterIds(selected);
            else saveSelectedMonsterIds(selected);
            renderSettingsList(settingsModal.querySelector('.e2slot-search').value);
            scheduleRun(0);
        });
        settingsModal.querySelector('.e2slot-actions').addEventListener('click', event => {
            const action = event.target.closest('button[data-action]')?.dataset.action;
            if (!action) return;
            const catalogIds = Object.values(getTimerCatalog())
                .filter(entry => MONSTER_TO_MAPS[String(entry.id)])
                .map(entry => String(entry.id));
            const selectAll = action.endsWith('-all');
            if (action.startsWith('slot-')) {
                saveSlotSelectedMonsterIds(selectAll ? new Set(catalogIds) : new Set());
            } else if (action.startsWith('auto-')) {
                saveSelectedMonsterIds(selectAll ? new Set(catalogIds) : new Set());
            }
            renderSettingsList(settingsModal.querySelector('.e2slot-search').value);
            scheduleRun(0);
        });
    }

    function openSettings() {
        const timers = readTimers();
        if (timers.ready) learnTimerCatalog(timers.sorted);
        settingsModal.querySelector('.e2slot-search').value = '';
        renderLootlogGuildSetting(true);
        renderSkipMissingSetting();
        renderFrostControls();
        renderAutoRestrictionSettingsUi();
        renderSettingsList();
        settingsModal.classList.add('open');
    }

    function checkBattleActive() {
        try {
            const battle = window.g?.battle || window.Engine?.battle?.d || window.Engine?.battle;
            if (!battle) return false;
            if (typeof battle === 'boolean') return battle;
            if (battle.endBattle === true || battle.ended === true) return false;
            if (battle.active === false || battle.inBattle === false) return false;
            if (battle.active === true || battle.inBattle === true) return true;
            return Object.keys(battle).length > 0;
        } catch (_) {
            return false;
        }
    }

    function heroIsDead() {
        const heroData = window.Engine?.hero?.d || window.g?.hero || window.hero || {};
        return Boolean(heroData.dead || heroData.isDead || Number(heroData.hpp) === 0);
    }

    let groupActionQuietUntil = 0;
    let lastGroupActionLabel = null;

    function foldActionText(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/ł/g, 'l')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    }

    // ── Zatrzymanie AUTO po legendzie: detekcja pakietów SI + NI ────────────
    const handledLegendaryLootItems = new Map();
    const seenLegendaryClanMessages = new Map();
    const legendaryPacketHooks = [];
    let legendaryHookProbeTimer = null;

    function normalizeLegendaryRarity(value) {
        return String(value ?? '').trim().toLowerCase();
    }

    function isLegendaryDropItem(item) {
        if (!item || typeof item !== 'object') return false;

        const rarityCandidates = [
            item.rarity,
            item.rar,
            item.stats?.rarity,
            item.stats?.rar
        ];
        if (rarityCandidates.some(rarity => [
            'legendary',
            'legend',
            'leg',
            'l'
        ].includes(normalizeLegendaryRarity(rarity)))) {
            return true;
        }

        if (typeof item.stat !== 'string') return false;
        return item.stat.split(';').some(segment => {
            const separatorIndex = segment.indexOf('=');
            if (separatorIndex < 0) return false;
            const key = segment.slice(0, separatorIndex).trim().toLowerCase();
            const value = segment.slice(separatorIndex + 1).trim().toLowerCase();
            return key === 'rarity' && ['legendary', 'legend'].includes(value);
        });
    }

    function processLegendaryLootPacket(itemPacket, source) {
        if (!itemPacket || typeof itemPacket !== 'object') return false;

        let detected = null;
        for (const [packetId, item] of Object.entries(itemPacket)) {
            const itemKey = String(packetId);
            if (!item || typeof item !== 'object') continue;

            if (item.del) {
                handledLegendaryLootItems.delete(itemKey);
                continue;
            }

            const location = String(item.loc || '').toLowerCase();
            if (location !== 'l' && location !== 'k') {
                if (location) handledLegendaryLootItems.delete(itemKey);
                continue;
            }
            if (!isLegendaryDropItem(item)) continue;

            const identity = String(item.hid ?? item.id ?? packetId);
            if (handledLegendaryLootItems.get(itemKey) === identity) continue;
            handledLegendaryLootItems.set(itemKey, identity);
            const fingerprint = `loot:${itemKey}:${identity}`;
            if (legendaryDetectionWasAcknowledged(fingerprint)) continue;
            if (!detected) {
                detected = {
                    source,
                    fingerprint,
                    itemId: identity,
                    itemName: String(item.name || '').trim().slice(0, 120)
                };
            }
        }

        if (!detected) return false;
        stopAutoForLegendaryDrop(detected);
        return true;
    }

    function normalizeLegendaryChatTimestamp(value) {
        const timestamp = Number(value);
        if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
        return timestamp < 1e12 ? timestamp * 1000 : timestamp;
    }

    function pruneSeenLegendaryClanMessages(now = Date.now()) {
        for (const [key, seenAt] of seenLegendaryClanMessages) {
            if (now - seenAt > LEGENDARY_MESSAGE_DEDUPE_MS) {
                seenLegendaryClanMessages.delete(key);
            }
        }
        while (seenLegendaryClanMessages.size > LEGENDARY_MESSAGE_DEDUPE_LIMIT) {
            const oldestKey = seenLegendaryClanMessages.keys().next().value;
            if (oldestKey === undefined) break;
            seenLegendaryClanMessages.delete(oldestKey);
        }
    }

    function isFreshLegendaryClanMessage(entry, now = Date.now()) {
        const timestamp = normalizeLegendaryChatTimestamp(entry?.ts);
        if (timestamp === null) return false;
        const age = now - timestamp;
        return age >= -LEGENDARY_CLAN_MESSAGE_FUTURE_GRACE_MS &&
            age <= LEGENDARY_CLAN_MESSAGE_MAX_AGE_MS;
    }

    function hasLegendaryClanMarker(entry) {
        const message = String(entry?.msg || '');
        const code = String(entry?.code || '');
        const folded = foldActionText(`${message} ${code}`
            .replace(/<[^>]*>/g, ' ')
            .replace(/\[[^\]]*]/g, ' '));
        const hasPhrase = /\b(?:spadla legenda|zdobyto legende)\b/.test(folded);
        const hasItemCode = /ITEM#[^\s<>"']+/i.test(`${message} ${code}`);
        return hasPhrase && hasItemCode;
    }

    function getLegendaryClanMessageKey(entry) {
        if (entry?.id !== null && entry?.id !== undefined) {
            return `id:${String(entry.id)}`;
        }
        return [
            'fallback',
            String(entry?.ts || ''),
            String(entry?.sender || ''),
            String(entry?.msg || ''),
            String(entry?.code || '')
        ].join('|');
    }

    function processLegendaryClanPacket(data, source, now = Date.now()) {
        const clanChannel = data?.chat?.channels?.clan;
        const messages = Array.isArray(clanChannel?.msg)
            ? clanChannel.msg
            : [];
        if (!messages.length) return false;

        const archivedIds = new Set(
            Array.isArray(clanChannel.archivedIds)
                ? clanChannel.archivedIds.map(String)
                : []
        );
        pruneSeenLegendaryClanMessages(now);

        for (const entry of messages) {
            if (!entry || typeof entry !== 'object') continue;
            if (archivedIds.has(String(entry.id))) continue;
            if (!isFreshLegendaryClanMessage(entry, now)) continue;
            if (!hasLegendaryClanMarker(entry)) continue;

            const messageKey = getLegendaryClanMessageKey(entry);
            if (seenLegendaryClanMessages.has(messageKey)) continue;
            seenLegendaryClanMessages.set(messageKey, now);
            pruneSeenLegendaryClanMessages(now);
            const fingerprint = `clan:${messageKey}`;
            if (legendaryDetectionWasAcknowledged(fingerprint)) continue;
            stopAutoForLegendaryDrop({
                source,
                fingerprint,
                messageId: entry.id ?? null,
                message: String(entry.msg || '').trim().slice(0, 200)
            });
            return true;
        }
        return false;
    }

    function parseLegendaryGamePacket(raw) {
        if (raw && typeof raw === 'object') return raw;
        if (typeof raw !== 'string') return null;
        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch (_) {
            return null;
        }
    }

    function processLegendaryGamePacket(raw, interfaceName = INTERFACE) {
        const data = parseLegendaryGamePacket(raw);
        if (!data) return false;
        const normalizedInterface = String(interfaceName || INTERFACE).toLowerCase();
        const directLootDetected = processLegendaryLootPacket(
            data.item,
            `loot-${normalizedInterface}`
        );
        const clanDetected = processLegendaryClanPacket(
            data,
            `clan-${normalizedInterface}`
        );
        return directLootDetected || clanDetected;
    }

    function resolveLegendaryPacketHook() {
        const communication = window.Engine?.communication;
        const candidates = INTERFACE === 'NI'
            ? [
                [communication, 'parseJSON'],
                [communication, 'successData'],
                [window, 'successData']
            ]
            : [
                [window, 'successData'],
                [window, 'parseInput']
            ];
        return candidates.find(([container, property]) =>
            container && typeof container[property] === 'function'
        ) || null;
    }

    function legendaryHookAlreadyInChain(fn) {
        const visited = new Set();
        let current = fn;
        while (typeof current === 'function' && !visited.has(current)) {
            if (current.__garbatyTepeKamykiLegendHook) return true;
            visited.add(current);
            current = current.__garbatyOriginal;
        }
        return false;
    }

    function installLegendaryPacketHook() {
        const resolved = resolveLegendaryPacketHook();
        if (!resolved) return false;
        const [container, property] = resolved;
        const original = container[property];
        if (legendaryHookAlreadyInChain(original)) return true;

        function wrappedLegendaryPacketHook() {
            // Margonem zawsze dostaje oryginalne this, argumenty, wyjątek i wynik.
            // Pakiet obserwujemy dopiero po poprawnym powrocie gry i całego
            // bieżącego stosu, ale jeszcze przed kolejnymi timerami AUTO.
            const raw = arguments[0];
            const result = Reflect.apply(original, this, arguments);
            const observe = () => {
                try {
                    processLegendaryGamePacket(raw, INTERFACE);
                } catch (error) {
                    if (DEBUG) {
                        console.warn('[e2slot] Nie udało się sprawdzić legendy.', error);
                    }
                }
            };
            if (typeof window.queueMicrotask === 'function') {
                window.queueMicrotask(observe);
            } else {
                Promise.resolve().then(observe);
            }
            return result;
        }

        Object.defineProperties(wrappedLegendaryPacketHook, {
            __garbatyTepeKamykiLegendHook: { value: true },
            __garbatyOriginal: { value: original }
        });
        container[property] = wrappedLegendaryPacketHook;
        legendaryPacketHooks.push({ container, property, original, wrapper: wrappedLegendaryPacketHook });
        return container[property] === wrappedLegendaryPacketHook;
    }

    function startLegendaryPacketMonitoring() {
        installLegendaryPacketHook();
        if (legendaryHookProbeTimer !== null) return;
        legendaryHookProbeTimer = setInterval(
            installLegendaryPacketHook,
            LEGENDARY_HOOK_PROBE_MS
        );
    }

    function detachLegendaryPacketMonitoring() {
        if (legendaryHookProbeTimer !== null) {
            clearInterval(legendaryHookProbeTimer);
            legendaryHookProbeTimer = null;
        }
        for (const hook of legendaryPacketHooks.splice(0).reverse()) {
            if (hook.container?.[hook.property] === hook.wrapper) {
                hook.container[hook.property] = hook.original;
            }
        }
    }
    // ── Koniec detekcji legendy ─────────────────────────────────────────────

    function getInteractiveActionLabel(target) {
        const control = target?.closest?.(
            'button, a, [role="button"], [onclick], [title], [aria-label], [data-tip]'
        );
        if (!control) return '';
        return [
            control.textContent,
            control.getAttribute?.('title'),
            control.getAttribute?.('aria-label'),
            control.getAttribute?.('data-tip'),
            control.getAttribute?.('tip')
        ].filter(Boolean).join(' ');
    }

    function isGroupManagementAction(target) {
        const label = foldActionText(getInteractiveActionLabel(target));
        if (!label) return false;
        const action = '(?:rozwiaz|opusc|wyrzuc|usun|zakoncz|zamknij)';
        const group = '(?:grup|druzyn)';
        return new RegExp(
            `${action}.{0,48}${group}|${group}.{0,48}${action}`,
            'i'
        ).test(label);
    }

    function noteGroupManagementAction(target) {
        if (!isGroupManagementAction(target)) return false;
        groupActionQuietUntil = Date.now() + GROUP_ACTION_QUIET_MS;
        lastGroupActionLabel = foldActionText(
            getInteractiveActionLabel(target)
        ).slice(0, 120);
        scheduleRun(GROUP_ACTION_QUIET_MS + 50, true);
        return true;
    }

    function getGroupActionQuietRemaining() {
        return Math.max(0, groupActionQuietUntil - Date.now());
    }

    function getAutoGuard() {
        return readStoredJson(STORAGE_KEY_AUTO_GUARD, null);
    }

    function clearAutoGuard() {
        try { localStorage.removeItem(STORAGE_KEY_AUTO_GUARD); } catch (_) {}
    }

    function clearAutoGuardFor(monsterId, itemId = null, expectedAt = null) {
        const guard = getAutoGuard();
        if (!guard) return;
        if (
            expectedAt !== null &&
            expectedAt !== undefined &&
            Number(guard.at) !== Number(expectedAt)
        ) {
            return;
        }
        if (
            monsterId &&
            String(guard.monsterId || '') !== String(monsterId)
        ) {
            return;
        }
        if (
            itemId !== null &&
            guard.itemId !== null &&
            Number(guard.itemId) !== Number(itemId)
        ) {
            return;
        }
        clearAutoGuard();
    }

    function markAutoGuard(monsterId, item = null) {
        if (!monsterId) return;
        const at = Date.now();
        try {
            localStorage.setItem(STORAGE_KEY_AUTO_GUARD, JSON.stringify({
                monsterId: String(monsterId),
                itemId: item ? getItemGameId(item) : null,
                at,
                blockedUntil: at + AUTO_USE_LOCK_MS
            }));
        } catch (_) {}
    }

    function markManualInventoryGuard(item) {
        const monsterId = slotTargetTracker.activeId ||
            autoTargetTracker.activeId ||
            currentMonsterId;
        if (!monsterId) return;

        // Nie zapisujemy ręcznej blokady na podstawie nieaktualnego celu, gdy
        // publiczne API Lootloga chwilowo nie ma gotowego źródła. Timer musi być
        // obecny w bieżącej, pełnej kolejce wybranego Discorda.
        const timerState = readTimers();
        if (!timerState.ready) return;
        const timer = timerState.sorted.find(entry =>
            String(entry.id) === String(monsterId)
        );
        if (!timer) return;

        const currentMapName = getCurrentMapName();
        if (
            !currentMapName ||
            isOnMonsterMap(monsterId, currentMapName)
        ) return;

        markRespCycleGuard(
            monsterId,
            item,
            'manual-inventory',
            Number.isFinite(Number(timer?.seconds))
                ? Number(timer.seconds)
                : null
        );
        if (
            sharedTempleUsesOnePhysicalItem(monsterId, item)
        ) {
            markSharedTempleRoute(
                monsterId,
                getFiniteTimerSeconds(timer),
                timerState.sorted
            );
        }
        try {
            localStorage.setItem(STORAGE_KEY_AUTO_GUARD, JSON.stringify({
                source: 'manual-inventory',
                monsterId: String(monsterId),
                itemId: getItemGameId(item),
                at: Date.now(),
                lastSeconds: Number(timer?.seconds)
            }));
        } catch (_) {}
    }

    function clearPendingAutoTargetDelay() {
        if (pendingAutoTargetDelay?.wakeTimer) {
            clearTimeout(pendingAutoTargetDelay.wakeTimer);
        }
        pendingAutoTargetDelay = null;
    }

    function stopAutoForLegendaryDrop(detail = {}) {
        const hold = {
            type: 'legendary-drop',
            at: Date.now(),
            source: String(detail.source || 'game-packet').slice(0, 40),
            fingerprint: String(detail.fingerprint || '').slice(0, 300),
            itemId: detail.itemId === null || detail.itemId === undefined
                ? null
                : String(detail.itemId).slice(0, 120),
            itemName: String(detail.itemName || '').trim().slice(0, 120),
            messageId: detail.messageId ?? null,
            message: String(detail.message || '').trim().slice(0, 200)
        };

        // Najpierw zapisujemy twarde OFF. Inne otwarte karty sprawdzą ten sam
        // klucz jeszcze raz bezpośrednio przed ewentualną komendą teleportu.
        lastLegendaryDetection = hold;
        try {
            setAutoEnabled(false);
        } catch (_) {}
        try {
            localStorage.setItem(
                getLegendaryHoldStorageKey(),
                JSON.stringify(hold)
            );
        } catch (_) {}
        clearPendingAutoTargetDelay();
        if (pendingAutoUse !== null) {
            clearTimeout(pendingAutoUse);
            pendingAutoUse = null;
        }
        clearAutoGuard();
        lastUseError = 'legendary_drop_detected';
        updateAutoButton();
        scheduleRun(0, true);
        return hold;
    }

    function noteAutoTargetChange(previousTargetId, currentTargetId) {
        const previousKey = previousTargetId === null || previousTargetId === undefined
            ? null
            : String(previousTargetId);
        const currentKey = currentTargetId === null || currentTargetId === undefined
            ? null
            : String(currentTargetId);

        if (!currentKey) {
            clearPendingAutoTargetDelay();
            return;
        }

        if (
            pendingAutoTargetDelay &&
            pendingAutoTargetDelay.targetId !== currentKey
        ) {
            clearPendingAutoTargetDelay();
        }

        if (
            previousKey &&
            previousKey !== currentKey &&
            !pendingAutoTargetDelay
        ) {
            pendingAutoTargetDelay = {
                targetId: currentKey,
                totalDelayMs: null,
                waitBeforeRecheckMs: null,
                readyAt: null,
                wakeTimer: null
            };
        }
    }

    function getAutoTargetDelayRemaining(targetMonsterId) {
        const targetKey = String(targetMonsterId || '');
        const pending = pendingAutoTargetDelay;
        if (!pending || !targetKey || pending.targetId !== targetKey) return 0;

        if (
            pending.readyAt === null ||
            !Number.isFinite(Number(pending.readyAt))
        ) {
            pending.totalDelayMs = Math.floor(
                Math.random() *
                (AUTO_NEXT_TARGET_DELAY_MAX_MS - AUTO_NEXT_TARGET_DELAY_MIN_MS + 1)
            ) + AUTO_NEXT_TARGET_DELAY_MIN_MS;
            pending.waitBeforeRecheckMs = Math.max(
                0,
                pending.totalDelayMs -
                    AUTO_USE_RECHECK_DELAY_MS -
                    RESP_CYCLE_CLAIM_SETTLE_MS
            );
            pending.readyAt = Date.now() + pending.waitBeforeRecheckMs;
            pending.wakeTimer = setTimeout(() => {
                if (
                    pendingAutoTargetDelay &&
                    pendingAutoTargetDelay.targetId === targetKey
                ) {
                    pendingAutoTargetDelay.wakeTimer = null;
                    scheduleRun(0, true);
                }
            }, pending.waitBeforeRecheckMs);
        }

        const remaining = Math.max(0, Number(pending.readyAt) - Date.now());
        if (remaining <= 0) {
            clearPendingAutoTargetDelay();
            return 0;
        }
        return remaining;
    }

    function maybeAutoTeleport(sortedTimers, itemSnapshot) {
        reconcileRespCycleGuards(sortedTimers);
        const selectedMonsterIds = getSelectedMonsterIds();
        const sharedTempleHold = getSharedTempleHold(
            sortedTimers,
            selectedMonsterIds
        );
        const previousAutoTargetId = autoTargetTracker.activeId;
        const target = sharedTempleHold
            ? null
            : pickTarget(
                sortedTimers,
                itemSnapshot,
                selectedMonsterIds,
                autoTargetTracker
            );
        const firstTimer = target?.timer || null;
        noteAutoTargetChange(previousAutoTargetId, firstTimer?.id);
        let guard = getAutoGuard();
        const guardAge = guard?.at
            ? Date.now() - Number(guard.at)
            : Infinity;

        if (!getAutoEnabled() || getLegendaryHold()) {
            clearPendingAutoTargetDelay();
            updateAutoButton();
            return;
        }

        if (sharedTempleHold) {
            if (pendingAutoUse !== null) {
                clearTimeout(pendingAutoUse);
                pendingAutoUse = null;
            }
            if (sharedTempleHold.timer) {
                autoTargetTracker.activeId = String(sharedTempleHold.timer.id);
                autoTargetTracker.lastSeconds = Number(sharedTempleHold.timer.seconds);
            }
            updateAutoButton(sharedTempleHold.message);
            return;
        }

        if (!firstTimer) {
            updateAutoButton(getSkipMissingStone()
                ? 'AUTO czeka — brak gotowego kamienia dla zaznaczonych E2'
                : 'AUTO czeka — brak zaznaczonych E2');
            return;
        }

        const currentMapName = getCurrentMapName();
        if (!currentMapName) {
            updateAutoButton('AUTO czeka — nie udało się odczytać aktualnej mapy');
            return;
        }
        if (isOnMonsterMap(firstTimer.id, currentMapName)) {
            if (pendingAutoUse !== null) {
                clearTimeout(pendingAutoUse);
                pendingAutoUse = null;
            }
            clearAutoGuardFor(firstTimer.id);
            updateAutoButton(
                `AUTO czeka — jesteś już na mapie ${currentMapName}`
            );
            return;
        }

        const groupActionQuietRemaining = getGroupActionQuietRemaining();
        if (groupActionQuietRemaining > 0) {
            updateAutoButton('AUTO czeka — kończenie operacji na grupie');
            scheduleRun(groupActionQuietRemaining + 50, true);
            return;
        }

        if (guard?.source === 'manual-inventory') {
            const guardedTimer = sortedTimers.find(timer =>
                String(timer.id) === String(guard.monsterId)
            );
            const previousSeconds = Number(guard.lastSeconds);
            const manualTargetFinished =
                !guardedTimer ||
                !Number.isFinite(previousSeconds) ||
                guardedTimer.seconds > previousSeconds + KILL_TIMER_JUMP;

            if (!manualTargetFinished) {
                updateAutoButton('AUTO czeka — kamień użyty ręcznie, oczekiwanie na reset timera E2');
                return;
            }
            clearAutoGuard();
            guard = null;
        }

        if (respCycleIsGuarded(firstTimer.id)) {
            const effectWatch =
                String(activeAutoUseEffectWatch?.monsterId || '') ===
                String(firstTimer.id)
                    ? activeAutoUseEffectWatch
                    : null;
            const waitingForCooldown = [
                'waiting-item-cooldown',
                'waiting-item-read',
                'waiting-map-read'
            ].includes(effectWatch?.state);
            updateAutoButton(
                effectWatch?.state === 'failed-after-retry' ||
                    (
                        lastUseError === 'teleport_no_effect_after_retry' &&
                        String(lastUseTargetId || '') === String(firstTimer.id)
                    )
                    ? 'AUTO wstrzymane — teleport nie zadziałał po ponowieniu'
                    : waitingForCooldown
                        ? 'AUTO sprawdza teleport — czeka na koniec cooldownu kamienia'
                        : 'AUTO czeka — kamień już użyty dla tego cyklu E2'
            );
            return;
        }

        const readyItem = target.item;
        const readyItemId = readyItem ? getItemGameId(readyItem) : null;

        // Ignorujemy stare godzinne blockedUntil zapisane przez wersje 4.x.
        // Liczy się wyłącznie krótki bezpiecznik od chwili ostatniego użycia.
        const guardMatchesTarget = Boolean(
            guard &&
            (
                !guard.monsterId ||
                String(guard.monsterId) === String(firstTimer.id) ||
                (
                    readyItemId !== null &&
                    guard.itemId !== null &&
                    guard.itemId !== undefined &&
                    Number(guard.itemId) === Number(readyItemId)
                )
            )
        );
        const blockedUntil = (Number(guard?.at) || 0) + AUTO_USE_LOCK_MS;
        if (
            guardMatchesTarget &&
            guardAge >= 0 &&
            Date.now() < blockedUntil
        ) {
            const remainingSeconds = Math.max(
                1,
                Math.ceil((blockedUntil - Date.now()) / 1000)
            );
            updateAutoButton(`AUTO zabezpieczone po użyciu (${remainingSeconds} s)`);
            return;
        }
        if (guard) {
            clearAutoGuard();
        }

        if (
            pendingAutoUse !== null ||
            useIsTemporarilyBlocked(
                'auto',
                firstTimer.id,
                readyItemId
            ) ||
            checkBattleActive() ||
            heroIsDead()
        ) {
            updateAutoButton('AUTO czeka na możliwość teleportu');
            return;
        }

        if (!readyItem) {
            updateAutoButton('AUTO czeka — pierwsza czasowo E2 nie ma gotowego kamienia');
            return;
        }

        const targetDelayRemaining = getAutoTargetDelayRemaining(firstTimer.id);
        if (targetDelayRemaining > 0) {
            updateAutoButton(
                `AUTO — losowe opóźnienie przed następną E2 (${(
                    (
                        targetDelayRemaining +
                        AUTO_USE_RECHECK_DELAY_MS +
                        RESP_CYCLE_CLAIM_SETTLE_MS
                    ) / 1000
                ).toFixed(1)} s)`
            );
            return;
        }

        // Blokadę zapisujemy przed kliknięciem. Dzięki temu przeładowanie mapy
        // po teleportacji nie powoduje ponownego używania następnego kamienia.
        markAutoGuard(firstTimer.id, readyItem);
        updateAutoButton(`AUTO — teleport na ${getMonsterNameForId(firstTimer.id) || firstTimer.id}`);
        pendingAutoUse = setTimeout(() => {
            pendingAutoUse = null;
            if (!getAutoEnabled() || getLegendaryHold()) return;
            const freshGroupActionQuietRemaining =
                getGroupActionQuietRemaining();
            if (freshGroupActionQuietRemaining > 0) {
                clearAutoGuard();
                updateAutoButton('AUTO czeka — kończenie operacji na grupie');
                scheduleRun(freshGroupActionQuietRemaining + 50, true);
                return;
            }
            if (checkBattleActive() || heroIsDead()) {
                clearAutoGuard();
                scheduleRun(500, true);
                return;
            }

            const freshTimerState = readTimers();
            if (!freshTimerState.ready) {
                updateAutoButton(
                    `AUTO wstrzymane — ${lootlogStatusText(freshTimerState.status)}`
                );
                scheduleRun(500, true);
                return;
            }
            const freshTimers = freshTimerState.sorted;
            const freshSnapshot = buildTeleportItemSnapshot(true);
            const freshTarget = pickTarget(
                freshTimers,
                freshSnapshot,
                getSelectedMonsterIds(),
                autoTargetTracker
            );
            const freshFirst = freshTarget?.timer || null;
            if (!freshFirst || String(freshFirst.id) !== String(firstTimer.id)) {
                // Nie przechodzimy na kolejną e2. Blokada zostaje, bo zmiana
                // pierwszego timera może być skutkiem trwającego teleportu.
                updateAutoButton('AUTO zablokowane po rozpoczęciu teleportu');
                return;
            }

            const freshMapName = getCurrentMapName();
            if (!freshMapName) {
                clearAutoGuard();
                updateAutoButton('AUTO czeka — nie udało się odczytać aktualnej mapy');
                scheduleRun(500, true);
                return;
            }
            if (isOnMonsterMap(freshFirst.id, freshMapName)) {
                clearAutoGuard();
                updateAutoButton(`AUTO czeka — jesteś już na mapie ${freshMapName}`);
                scheduleRun(500, true);
                return;
            }
            const freshItem = freshTarget.item;
            if (freshItem && !hasCooldown(freshItem)) {
                if (!useItem(
                    freshItem,
                    freshFirst.id,
                    'auto',
                    freshFirst.seconds
                )) {
                    clearAutoGuard();
                    scheduleRun(500, true);
                }
            } else {
                clearAutoGuard();
                scheduleRun(500, true);
            }
        }, AUTO_USE_RECHECK_DELAY_MS);
    }

    function buildUI() {
        const savedPos = JSON.parse(localStorage.getItem(STORAGE_KEY_POS) || 'null');
        locked = JSON.parse(localStorage.getItem(STORAGE_KEY_LOCK) || 'false');
        injectPanelStyles();

        slotEl = document.createElement('div');
        slotEl.id = 'e2-teleport-slot';
        Object.assign(slotEl.style, {
            position: 'fixed', zIndex: '99999',
            left: savedPos ? savedPos.x + 'px' : '80px',
            top:  savedPos ? savedPos.y + 'px' : '200px',
            width: SLOT_SIZE + 'px', height: SLOT_SIZE + 'px',
            border: '1px solid #80651f', borderRadius: '6px',
            background: 'linear-gradient(#20251d, #0d100d)',
            boxShadow: '0 2px 8px #000c, inset 0 0 0 1px #292f25',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            userSelect: 'none', cursor: locked ? 'pointer' : 'grab',
            fontFamily: 'Arial, sans-serif', overflow: 'visible',
        });

        iconEl = document.createElement('div');
        Object.assign(iconEl.style, {
            width: '100%', height: '100%', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden', borderRadius: '5px',
            boxSizing: 'border-box', background: '#090c09',
        });

        timerEl = document.createElement('div');
        Object.assign(timerEl.style, {
            position: 'absolute', left: '0', right: '0', bottom: '0',
            width: '100%', transform: 'none',
            boxSizing: 'border-box', borderRadius: '0 0 5px 5px',
            color: '#fff2b5', fontSize: '8px', fontWeight: 'bold',
            textAlign: 'center', lineHeight: '1.1',
            background: 'rgba(0,0,0,0.75)', padding: '1px 0px',
            display: 'none', whiteSpace: 'nowrap', overflow: 'hidden',
            textOverflow: 'ellipsis', zIndex: '3',
        });

        lockBtn = document.createElement('span');
        lockBtn.textContent = locked ? '🔒' : '🔓';
        Object.assign(lockBtn.style, {
            position: 'absolute', top: '0px', right: '1px',
            fontSize: '8px', lineHeight: '1', cursor: 'pointer',
            opacity: '0.58', zIndex: '5',
        });
        lockBtn.title = 'Zablokuj/odblokuj pozycję';
        lockBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            locked = !locked;
            lockBtn.textContent = locked ? '🔒' : '🔓';
            slotEl.style.cursor = locked ? 'pointer' : 'grab';
            localStorage.setItem(STORAGE_KEY_LOCK, JSON.stringify(locked));
        });

        settingsBtn = document.createElement('button');
        settingsBtn.type = 'button';
        settingsBtn.className = 'e2slot-control';
        settingsBtn.textContent = '⚙';
        settingsBtn.title = 'Ustawienia Frost Reaper KCS';
        Object.assign(settingsBtn.style, {
            position: 'absolute', top: '-7px', left: '-7px', zIndex: '6',
            width: '18px', height: '18px', padding: '0', borderRadius: '50%',
            fontSize: '11px', lineHeight: '16px'
        });
        settingsBtn.addEventListener('mousedown', event => event.stopPropagation());
        settingsBtn.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            openSettings();
        });

        slotEl.appendChild(iconEl);
        slotEl.appendChild(timerEl);
        slotEl.appendChild(settingsBtn);
        document.body.appendChild(slotEl);
        buildSettingsModal();

        let lastTouchActivationAt = 0;
        let touchTap = null;

        const findTrackedTouch = touchList => {
            if (!touchTap || !touchList) return null;
            return Array.from(touchList).find(touch =>
                touch.identifier === touchTap.identifier
            ) || null;
        };

        slotEl.addEventListener('touchstart', event => {
            if (
                recordingHotkey ||
                event.target === lockBtn ||
                event.target?.closest?.('.e2slot-control') ||
                event.touches.length !== 1
            ) {
                touchTap = null;
                return;
            }

            const touch = event.touches[0];
            touchTap = {
                identifier: touch.identifier,
                startX: touch.clientX,
                startY: touch.clientY,
                startedAt: Date.now(),
                moved: false
            };
        }, { passive: true });

        slotEl.addEventListener('touchmove', event => {
            if (event.touches.length !== 1) {
                touchTap = null;
                return;
            }
            const touch = findTrackedTouch(event.touches);
            if (!touch || !touchTap) return;
            const distance = Math.hypot(
                touch.clientX - touchTap.startX,
                touch.clientY - touchTap.startY
            );
            if (distance > TOUCH_TAP_MAX_MOVE_PX) touchTap.moved = true;
        }, { passive: true });

        slotEl.addEventListener('touchcancel', () => {
            lastTouchActivationAt = Date.now();
            touchTap = null;
        }, { passive: true });

        slotEl.addEventListener('touchend', event => {
            const tracked = touchTap;
            const touch = findTrackedTouch(event.changedTouches);
            // Każdy zakończony dotyk blokuje ewentualny syntetyczny click Safari.
            // Tylko krótki dotyk bez przesunięcia uruchamia ręczne użycie.
            lastTouchActivationAt = Date.now();
            touchTap = null;
            if (!tracked || !touch || recordingHotkey) return;

            const distance = Math.hypot(
                touch.clientX - tracked.startX,
                touch.clientY - tracked.startY
            );
            const duration = Date.now() - tracked.startedAt;
            if (
                tracked.moved ||
                distance > TOUCH_TAP_MAX_MOVE_PX ||
                duration > TOUCH_TAP_MAX_DURATION_MS
            ) return;

            event.preventDefault();
            event.stopPropagation();
            useFreshSelectedItem('manual-touch');
        }, { passive: false });

        slotEl.addEventListener('click', event => {
            if (
                event.target === lockBtn ||
                event.target?.closest?.('.e2slot-control') ||
                recordingHotkey ||
                isDragging || dragMoved && Date.now() < ignoreClickUntil ||
                Date.now() - lastTouchActivationAt < TOUCH_GHOST_CLICK_MS
            ) return;

            useFreshSelectedItem('manual-click');
        });

        slotEl.addEventListener('mousedown', startDrag);
    }

    function renderRecordingState() {
        timerEl.style.display = 'block';
        timerEl.textContent = 'Klawisz?';
        iconEl.innerHTML = '<span style="color:#ffca28;font-size:16px;line-height:1">⌨</span>';
        slotEl.style.borderColor = '#ffca28';
        slotEl.style.boxShadow = '0 0 7px #ffca2866, 0 2px 8px #000c';
        slotEl.title = 'Wciśnij klawisz aby ustawić skrót (Esc anuluje, Backspace czyści)';
    }

    document.addEventListener('keydown', (e) => {
        if (recordingHotkey) {
            e.preventDefault();
            e.stopPropagation();
            recordingHotkey = false;

            if (e.key === 'Escape') {
                // anuluj
            } else if (e.key === 'Backspace' || e.key === 'Delete') {
                setHotkey('');
            } else {
                setHotkey(e.key);
            }
            renderFrostControls();
            run();
            return;
        }

        const hotkey = getHotkey();
        if (!hotkey) return;
        if (isTypingContext()) return;
        if (normalizeKey(e.key) !== normalizeKey(hotkey)) return;

        e.preventDefault();
        useFreshSelectedItem('manual-hotkey');
    }, true);

    function startDrag(e) {
        if (locked) return;
        if (e.target === lockBtn || e.target.closest?.('.e2slot-control')) return;
        if (e.button !== 0) return;
        isDragging = true;
        dragMoved = false;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        const rect = slotEl.getBoundingClientRect();
        dragOffX = e.clientX - rect.left;
        dragOffY = e.clientY - rect.top;
        slotEl.style.cursor = 'grabbing';
        e.preventDefault();
    }

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        if (!dragMoved && Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY) < 6) return;
        dragMoved = true;
        ignoreClickUntil = Date.now() + 900;
        const x = Math.max(0, Math.min(window.innerWidth  - slotEl.offsetWidth,  e.clientX - dragOffX));
        const y = Math.max(8, Math.min(window.innerHeight - slotEl.offsetHeight - 24, e.clientY - dragOffY));
        slotEl.style.left = x + 'px';
        slotEl.style.top  = y + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        if (dragMoved) ignoreClickUntil = Date.now() + 900;
        slotEl.style.cursor = locked ? 'pointer' : 'grab';
        if (!dragMoved) return;
        localStorage.setItem(STORAGE_KEY_POS, JSON.stringify({
            x: parseInt(slotEl.style.left), y: parseInt(slotEl.style.top),
        }));
    });

    document.addEventListener('pointerdown', event => {
        noteGroupManagementAction(event.target);
    }, true);

    document.addEventListener('click', event => {
        noteGroupManagementAction(event.target);
        const item = event.target?.closest?.(
            '.item, .inventory-item, [class*="item-id-"], [data-item-id]'
        );
        if (!item) return;

        invalidateTeleportItemCache();
        scheduleRun(250, true);
    }, true);

    document.addEventListener('dblclick', event => {
        const item = event.target?.closest?.(
            '.item, .inventory-item, [class*="item-id-"], [data-item-id]'
        );
        if (!item || item.closest?.('#e2-teleport-slot')) return;
        const tip = String(getItemTipText(item) || '');
        if (!tip.toLowerCase().includes('teleport')) return;

        markManualInventoryGuard(item);
        if (pendingAutoUse !== null) {
            clearTimeout(pendingAutoUse);
            pendingAutoUse = null;
        }
        invalidateTeleportItemCache();
        scheduleRun(250, true);
    }, true);

    function hideTimerLabel() {
        if (timerEl.style.display !== 'none') timerEl.style.display = 'none';
    }

    function showTimerLabel(value) {
        if (timerEl.textContent !== value) timerEl.textContent = value;
        if (timerEl.style.display !== 'block') timerEl.style.display = 'block';
    }

    function setSlotTitle(value) {
        if (slotEl.title !== value) slotEl.title = value;
    }

    function renderSlotFor(monsterId, timerMap = new Map(), selectedItem = undefined) {
        if (recordingHotkey) return;

        if (!monsterId) {
            currentMonsterId = null;
            currentItemEl = null;
            delete iconEl.dataset.itemIconKey;
            hideTimerLabel();
            setSlotTitle('');
            const emptyHtml = '<span style="color:#666;font-size:12px;line-height:1">–</span>';
            if (iconEl.innerHTML !== emptyHtml) iconEl.innerHTML = emptyHtml;
            slotEl.style.borderColor = '#80651f';
            slotEl.style.boxShadow = '0 2px 8px #000c, inset 0 0 0 1px #292f25';
            return;
        }

        currentMonsterId = String(monsterId);
        const monsterName = getMonsterNameForId(monsterId);
        const respGuarded = respCycleIsGuarded(monsterId);
        const currentMapName = getCurrentMapName();
        const mapUnavailable = !currentMapName;
        const onTargetMap = Boolean(
            currentMapName && isOnMonsterMap(monsterId, currentMapName)
        );
        const readyItem = mapUnavailable || onTargetMap
            ? null
            : selectedItem === undefined
                ? findAvailableItemForMonster(monsterId)
                : selectedItem;

        if (readyItem) {
            renderItemIcon(readyItem);
            currentItemEl = readyItem;
            slotEl.style.borderColor = respGuarded ? '#ffb02088' : '#80651f';
            slotEl.style.boxShadow = '0 2px 8px #000c, inset 0 0 0 1px #292f25';

            const hotkey = getHotkey();
            const hotkeyLabel = hotkey ? ` [${formatKeyLabel(hotkey)}]` : '';
            const tipParts = [];
            if (monsterName) tipParts.push(monsterName);
            if (respGuarded) {
                tipParts.push('AUTO: ten cykl jest już obsłużony; ręcznie nadal możesz użyć kamyka');
            }
            tipParts.push('LPM: użyj kamyka | PPM: ustaw hotkey' + hotkeyLabel);
            setSlotTitle(tipParts.join(' — '));

            const teleportLabel = getTeleportShortLabel(readyItem);
            if (teleportLabel) {
                showTimerLabel(teleportLabel);
            } else {
                showTimerLabel('KCS');
            }
        } else {
            currentItemEl = null;
            delete iconEl.dataset.itemIconKey;
            const targetLabel = getMonsterTeleportShortLabel(monsterId);
            const missingHtml = onTargetMap
                ? '<span style="color:#6bd484;font-size:7px;font-weight:bold;' +
                    'text-align:center;line-height:1.05;padding:1px;display:block">' +
                    escapeHtml(targetLabel) + '<br><span style="font-size:6px;color:#6bd484">OBECNY</span></span>'
                : mapUnavailable
                    ? '<span style="color:#ffca28;font-size:6px;font-weight:bold;' +
                        'text-align:center;line-height:1.05;padding:1px;display:block">' +
                        escapeHtml(targetLabel) + '<br><span style="font-size:6px;color:#ffca28">MAPA?</span></span>'
                : '<span style="color:#d99463;font-size:7px;font-weight:bold;' +
                    'text-align:center;line-height:1.05;padding:1px;display:block">' +
                    escapeHtml(targetLabel) + '<br><span style="font-size:6px;color:#b86f50">BRAK</span></span>';
            if (iconEl.innerHTML !== missingHtml) iconEl.innerHTML = missingHtml;
            slotEl.style.borderColor = onTargetMap
                ? '#6bd48488'
                : mapUnavailable
                    ? '#ffca2888'
                    : respGuarded
                        ? '#ffb02088'
                        : '#80651f';
            slotEl.style.boxShadow = '0 2px 8px #000c, inset 0 0 0 1px #292f25';

            const secs = timerMap.get(monsterId);
            // Ten licznik był czasem E2 z Lootloga, a nie czasem odnowienia
            // kamienia. Przy napisie BRAK był więc mylący — czas E2 pozostaje
            // dostępny w podpowiedzi po najechaniu, ale nie udaje cooldownu.
            hideTimerLabel();

            const tipParts = [];
            if (monsterName) tipParts.push(monsterName);
            if (onTargetMap) {
                tipParts.push(`jesteś już na mapie ${currentMapName} — ręczne użycie wyłączone`);
            } else if (mapUnavailable) {
                tipParts.push('czekam na odczyt aktualnej mapy');
            } else {
                tipParts.push('brak gotowego kamienia');
                if (respGuarded) {
                    tipParts.push('AUTO czeka na nowy cykl E2');
                }
            }
            if (secs !== undefined) tipParts.push('za ' + formatTimer(secs));
            tipParts.push('PPM: ustaw hotkey');
            setSlotTitle(tipParts.length ? tipParts.join(' — ') : 'Brak kamienia na następną e2');
        }
    }

    function run() {
        if (recordingHotkey) return;

        const timers = readTimers();
        const timerMap = timers.map;
        const sortedTimers = timers.sorted;

        // Brak API/cache/połączenia nie jest pustą listą timerów. Wstrzymujemy
        // AUTO bez ruszania trackerów i blokad cyklu, aby chwilowy zanik danych
        // nie został uznany za zbicie E2 albo zmianę celu.
        if (!timers.ready) {
            renderSlotFor(null, timerMap, null);
            updateAutoButton(`AUTO wstrzymane — ${lootlogStatusText(timers.status)}`);
            return;
        }

        reconcileRespCycleGuards(sortedTimers);
        learnTimerCatalog(sortedTimers);

        if (sortedTimers.length === 0) {
            renderSlotFor(null, timerMap, null);
            return;
        }

        const itemSnapshot = buildTeleportItemSnapshot();
        const target = pickTarget(
            sortedTimers,
            itemSnapshot,
            getSlotSelectedMonsterIds(),
            slotTargetTracker
        );
        renderSlotFor(
            target ? target.timer.id : null,
            timerMap,
            target ? target.item : null
        );
        maybeAutoTeleport(sortedTimers, itemSnapshot);
    }

    window.GarbatyTepeKamykiDebug = () => ({
        version: ADDON_VERSION,
        interface: INTERFACE,
        interfacePath:
            INTERFACE === 'SI'
                ? 'si_lootlog_public_api_v1_4_15_0'
                : 'ni_lootlog_public_api_v1_4_15_0',
        lootlogSource: {
            apiVersion: Number(boundLootlogApi?.apiVersion) || null,
            ready: lootlogSnapshot.ready,
            status: lootlogSnapshot.status,
            world: lootlogSnapshot.world,
            guildId: lootlogSnapshot.guildId,
            preferredGuildId: readPreferredLootlogGuildId(),
            guilds: lootlogSnapshot.guilds,
            socketState: lootlogSnapshot.socketState
        },
        mobileSafari: /iP(?:hone|ad|od)/i.test(navigator.userAgent) &&
            /Safari/i.test(navigator.userAgent),
        currentMapName: getCurrentMapName(),
        currentTargetIsCurrentMap: currentMonsterId
            ? isOnMonsterMap(currentMonsterId)
            : false,
        senderAvailable: getGameSenders().length > 0,
        lastUseMethod,
        lastUseError,
        lastUseAt,
        lastUseTargetId,
        lastUseItemId,
        cooldownCountdownObservations: Object.fromEntries(
            cooldownCountdownObservations
        ),
        autoUseNoEffectRetries: Object.fromEntries(autoUseNoEffectRetries),
        activeAutoUseEffectWatch,
        groupActionQuietRemainingMs: getGroupActionQuietRemaining(),
        lastGroupActionLabel,
        useGuard: getUseGuard(),
        useGuardActive: useIsTemporarilyBlocked(),
        manualUseGuardActive: useIsTemporarilyBlocked('manual-slot'),
        autoEnabled: getAutoEnabled(),
        autoEnabledStorageKey: getAutoEnabledStorageKey(),
        legendaryHoldStorageKey: getLegendaryHoldStorageKey(),
        legendaryHold: getLegendaryHold(),
        legendaryAckStorageKey: getLegendaryAckStorageKey(),
        legendaryAck: getLegendaryAck(),
        lastLegendaryDetection,
        legendaryPacketHookCount: legendaryPacketHooks.length,
        skipMissingStone: getSkipMissingStone(),
        autoSelectedIds: [...getSelectedMonsterIds()],
        slotSelectedIds: [...getSlotSelectedMonsterIds()],
        autoGuard: getAutoGuard(),
        pendingAutoTargetDelay: pendingAutoTargetDelay
            ? {
                targetId: pendingAutoTargetDelay.targetId,
                totalDelayMs: pendingAutoTargetDelay.totalDelayMs,
                waitBeforeRecheckMs: pendingAutoTargetDelay.waitBeforeRecheckMs,
                remainingMs: pendingAutoTargetDelay.readyAt !== null &&
                    Number.isFinite(Number(pendingAutoTargetDelay.readyAt))
                    ? Math.max(0, Number(pendingAutoTargetDelay.readyAt) - Date.now())
                    : null
            }
            : null,
        sharedTempleRouteStorageKey: getSharedTempleRouteStorageKey(),
        sharedTempleRoute: getSharedTempleRoute(),
        respCycleGuardStorageKey: getRespCycleGuardStorageKey(),
        respCycleGuards: getRespCycleGuards(),
        autoBlockedRemainingSeconds: Math.max(
            0,
            Math.ceil(
                (((Number(getAutoGuard()?.at) || 0) + AUTO_USE_LOCK_MS) - Date.now()) / 1000
            )
        ),
        runtimeMarker: document.documentElement?.getAttribute(RUNTIME_ATTR) || null,
        slotCount: document.querySelectorAll('#e2-teleport-slot').length,
        firstMappedTimer: getFirstMappedTimer(readTimers().sorted),
        selectedTarget: (() => {
            const timers = readTimers().sorted;
            const target = pickTarget(
                timers,
                buildTeleportItemSnapshot(),
                getSelectedMonsterIds(),
                autoTargetTracker
            );
            return target ? { timer: target.timer, hasReadyStone: Boolean(target.item) } : null;
        })(),
        timerCatalog: getTimerCatalog(),
        mappedTargets: Object.fromEntries(
            readTimers().sorted
                .filter(timer => MONSTER_TO_MAPS[timer.id])
                .map(timer => [timer.id, MONSTER_TO_MAPS[timer.id]])
        ),
        timers: getSortedTimers(getTimerMap()),
        teleportItems: getAllTeleportItems().map(el => ({
            element: el,
            gameId: getItemGameId(el),
            modelIcon: itemIconValue(getGameItemById(getItemGameId(el))),
            renderedIcon: Boolean(el.querySelector('img, canvas')),
            map: getMapForItem(el),
            shortLabel: getTeleportShortLabel(el),
            cooldown: hasCooldown(el),
            redDragonStone: RED_DRAGON_STONE_PATTERN.test(getItemTipText(el))
        }))
    });


    // Publiczny interfejs do zarządzania KCS z Frost Reaper Manager.
    // Widoczność widgetu nie zmienia działania AUTO.
    function frKcsSetVisible(visible) {
        localStorage.setItem('fr_manager_kcs_visible', String(Boolean(visible)));
        if (slotEl) slotEl.style.setProperty('display', visible ? '' : 'none');
        return Boolean(visible);
    }
    function frKcsSetAuto(enabled) {
        const hold = getLegendaryHold();
        if (hold && enabled && !getAutoEnabled()) clearLegendaryHold();
        const next = setAutoEnabled(enabled);
        if (!next) {
            clearPendingAutoTargetDelay();
            if (pendingAutoUse !== null) {
                clearTimeout(pendingAutoUse);
                pendingAutoUse = null;
            }
            clearAutoGuard();
        }
        renderFrostControls();
        scheduleRun(0, true);
        return next;
    }
    const frKcsApi = {
        version: '0.2.2',
        openSettings: () => { openSettings(); return true; },
        showWidget: () => frKcsSetVisible(true),
        hideWidget: () => frKcsSetVisible(false),
        isWidgetVisible: () => localStorage.getItem('fr_manager_kcs_visible') !== 'false',
        getAutoEnabled,
        setAutoEnabled: frKcsSetAuto,
        isAutoRestricted: isAutoRestrictedForHero,
        getHotkey,
        setHotkey: key => { setHotkey(key); renderFrostControls(); return getHotkey(); },
        startHotkeyRecording: () => { openSettings(); recordingHotkey = true; renderFrostControls(); },
        getLocked: () => locked,
        setLocked: value => {
            locked = Boolean(value);
            localStorage.setItem(STORAGE_KEY_LOCK, JSON.stringify(locked));
            if (slotEl) slotEl.style.cursor = locked ? 'pointer' : 'grab';
            renderFrostControls();
            return locked;
        }
    };
    window.FrostReaperKCS = frKcsApi;
    window.__FROST_REAPER_KCS__ = frKcsApi;
    window.dispatchEvent(new CustomEvent('frost-reaper:kcs-ready'));

    function init() {
        // Druga kopia mogła przejść kontrolę zanim pierwsza zdążyła zbudować UI.
        // Ponowna kontrola tuż przed budową zamyka również ten krótki wyścig.
        if (document.getElementById('e2-teleport-slot')) return;
        initializeFrostAutoDefault();
        enforceAutoRestrictionStorage();
        buildUI();
        frKcsSetVisible(localStorage.getItem("fr_manager_kcs_visible") !== "false");
        window.dispatchEvent(new CustomEvent("frost-reaper:kcs-ready"));
        run();
        observeInventoryRoots();
        setInterval(() => scheduleRun(0, true), FALLBACK_RUN_MS);
        setInterval(() => scheduleRun(0, false), STONE_READINESS_POLL_MS);
        setInterval(observeInventoryRoots, INVENTORY_OBSERVER_REBIND_MS);
    }

    window.addEventListener('storage', event => {
        if (
            event.key === getLegendaryHoldStorageKey() &&
            event.newValue === null
        ) {
            lastLegendaryDetection = null;
        }
        if (
            event.key === getRespCycleGuardStorageKey() ||
            event.key === getSharedTempleRouteStorageKey() ||
            event.key === getAutoEnabledStorageKey() ||
            event.key === getLegendaryHoldStorageKey() ||
            event.key === getLegendaryAckStorageKey() ||
            event.key === STORAGE_KEY_AUTO_GUARD ||
            event.key === STORAGE_KEY_USE_GUARD ||
            event.key === STORAGE_KEY_LOOTLOG_SOURCE
        ) {
            scheduleRun(0, true);
        }
    });

    window.addEventListener('garbaty:lootlog-source-changed', () => {
        scheduleRun(0, true);
    });
    startLegendaryPacketMonitoring();
    window.addEventListener('pagehide', detachLootlogApi, { once: true });
    window.addEventListener('pagehide', detachLegendaryPacketMonitoring);
    window.addEventListener('pageshow', startLegendaryPacketMonitoring);

    if (document.readyState === 'complete') {
        setTimeout(init, 1500);
    } else {
        window.addEventListener('load', () => setTimeout(init, 1500));
    }

})();

//# sourceURL=garbaty-protected-tepekamyki.js
