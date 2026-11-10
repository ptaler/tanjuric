(function () {
  'use strict';

  var ALLERGENS = ['Gluten', 'Mlijeko', 'Jaja', 'Kikiriki', 'Orašasti plodovi', 'Soja', 'Riba', 'Rakovi', 'Mekušci', 'Celer', 'Gorušica', 'Sezam', 'Sumporni dioksid', 'Lupina'];
  var TYPES = ['Doručak', 'Jutarnja užina', 'Ručak', 'Popodnevna užina', 'Večera', 'Ostalo'];
  var SYMPTOMS = ['Osip', 'Svrbež', 'Oticanje usana ili lica', 'Bol u trbuhu', 'Mučnina', 'Povraćanje', 'Proljev', 'Nadutost', 'Kašalj ili piskanje', 'Curenje nosa', 'Ekcem'];
  var SEVERITY = ['Blaga', 'Umjerena', 'Jaka'];
  var SEV_CLASS = { Blaga: 'mild', Umjerena: 'mod', Jaka: 'sev' };
  var STORE_KEY = 'tanjuric.v1';
  var TAB_KEY = 'tanjuric.tab';
  var TABS = [
    { id: 'all', label: 'Sve', newLabel: 'Novi upis' },
    { id: 'meals', label: 'Obroci', newLabel: 'Novi obrok' },
    { id: 'doses', label: 'Terapije', newLabel: 'Nova terapija' },
    { id: 'temps', label: 'Temperatura', newLabel: 'Novo mjerenje' }
  ];
  // [jednina, 2–4, 5+] — za decimalne doze koristi se srednji oblik
  var UNITS = {
    ml: ['ml', 'ml', 'ml'],
    mg: ['mg', 'mg', 'mg'],
    kap: ['kap', 'kapi', 'kapi'],
    tableta: ['tableta', 'tablete', 'tableta'],
    'vrećica': ['vrećica', 'vrećice', 'vrećica'],
    'čepić': ['čepić', 'čepića', 'čepića'],
    potisak: ['potisak', 'potiska', 'potisaka'],
    doza: ['doza', 'doze', 'doza']
  };
  var UNIT_KEYS = Object.keys(UNITS);
  var TEMP_METHODS = ['Pazuh', 'Uho', 'Čelo', 'Usta', 'Rektalno'];

  var ICON = {
    warn: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B45309" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4"/><path d="M12 17h.01"/></svg>',
    warnSm: '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C2410C" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4"/></svg>',
    plus: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
    x: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12"/><path d="M18 6 6 18"/></svg>',
    edit: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
    trash: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/></svg>',
    camera: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    check: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>',
    search: '<svg aria-hidden="true" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#A9B4B1" stroke-width="1.6" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'
  };

  // ---------- helpers ----------
  function $(sel) { return document.querySelector(sel); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function toIso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2);
  }
  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  }
  function parseIso(iso) {
    var p = String(iso).split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }
  function daysAgo(iso) {
    var t = new Date(); t.setHours(0, 0, 0, 0);
    return Math.round((t - parseIso(iso)) / 86400000);
  }
  var DAY_NAMES = ['nedjelja', 'ponedjeljak', 'utorak', 'srijeda', 'četvrtak', 'petak', 'subota'];
  var MONTHS = ['siječnja', 'veljače', 'ožujka', 'travnja', 'svibnja', 'lipnja', 'srpnja', 'kolovoza', 'rujna', 'listopada', 'studenoga', 'prosinca'];
  function dayLabel(iso) {
    var dt = parseIso(iso);
    var dn = DAY_NAMES[dt.getDay()];
    var date = dt.getDate() + '. ' + MONTHS[dt.getMonth()] + ' ' + dt.getFullYear() + '.';
    var diff = daysAgo(iso);
    if (diff === 0) return { rel: 'Danas', full: dn + ', ' + date };
    if (diff === 1) return { rel: 'Jučer', full: dn + ', ' + date };
    return { rel: dn.charAt(0).toUpperCase() + dn.slice(1), full: date };
  }
  function plural(n, one, few, many) {
    var a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return one;
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
    return many;
  }
  function byNewest(a, b) { return (b.date + b.time).localeCompare(a.date + a.time); }
  function fmtNum(n) { return String(n).replace('.', ','); }
  function parseNum(s) {
    s = String(s == null ? '' : s).trim().replace(',', '.');
    return s === '' ? NaN : Number(s);
  }
  function unitLabel(unit, n) {
    var u = UNITS[unit];
    if (!u) return unit || '';
    if (isNaN(n)) return u[0];
    if (n !== Math.floor(n)) return u[1];
    return plural(n, u[0], u[1], u[2]);
  }
  function doseText(dose, unit) { return fmtNum(dose) + ' ' + unitLabel(unit, dose); }
  function stamp(date, time) {
    var p = parseIso(date), t = String(time || '00:00').split(':').map(Number);
    p.setHours(t[0] || 0, t[1] || 0, 0, 0);
    return p.getTime();
  }
  function durText(ms) {
    var min = Math.round(ms / 60000);
    if (min < 60) return min + ' min';
    var h = Math.floor(min / 60), m = min % 60;
    if (h < 48) return h + ' h' + (m ? ' ' + m + ' min' : '');
    var d = Math.floor(h / 24);
    return d + ' ' + plural(d, 'dan', 'dana', 'dana');
  }
  function agoText(date, time) {
    var diff = Date.now() - stamp(date, time);
    if (diff < 0) return 'u budućnosti';
    if (diff < 60000) return 'upravo sada';
    return 'prije ' + durText(diff);
  }
  function whenText(date, time) { return dayLabel(date).rel + ' u ' + time; }
  function tempLevel(v) {
    if (v < 37.5) return { cls: 'ok', label: 'Normalna' };
    if (v < 38) return { cls: 'mild', label: 'Povišena' };
    if (v < 39) return { cls: 'mod', label: 'Vrućica' };
    return { cls: 'sev', label: 'Visoka vrućica' };
  }

  // ---------- data ----------
  function demoData() {
    function day(off) { var d = new Date(); d.setDate(d.getDate() - off); return toIso(d); }
    function E(childId, off, time, type, food, allergens, reaction, symptoms, severity, onset, note) {
      return { id: uid(), childId: childId, date: day(off), time: time, type: type, food: food, allergens: allergens, reaction: reaction, symptoms: symptoms, severity: severity, onset: onset, note: note, photo: '', demo: true };
    }
    return {
      v: 1,
      activeChild: 'demo-lana',
      children: [
        { id: 'demo-lana', name: 'Lana', allergies: ['Mlijeko', 'Jaja'], demo: true },
        { id: 'demo-marko', name: 'Marko', allergies: ['Kikiriki', 'Orašasti plodovi'], demo: true }
      ],
      entries: [
        E('demo-lana', 0, '08:10', 'Doručak', 'Zobena kaša s bademovim napitkom i bananom', ['Gluten', 'Orašasti plodovi'], false, [], '', '', 'Pojela cijelu porciju.'),
        E('demo-lana', 0, '12:30', 'Ručak', 'Piletina s rižom i kuhanom mrkvom', [], false, [], '', '', ''),
        E('demo-lana', 1, '10:00', 'Jutarnja užina', 'Keks iz vrtića', ['Gluten', 'Mlijeko'], true, ['Osip', 'Svrbež'], 'Umjerena', 25, 'Osip oko usta i na obrazima, prošao nakon otprilike 2 sata. Zamoliti odgojiteljicu da provjeri deklaraciju.'),
        E('demo-lana', 1, '18:30', 'Večera', 'Juha od povrća i kruh', ['Gluten', 'Celer'], false, [], '', '', ''),
        E('demo-lana', 2, '08:00', 'Doručak', 'Palačinke bez jaja sa zobenim napitkom', ['Gluten'], false, [], '', '', 'Recept s lanenim sjemenkama umjesto jaja — dobro prošlo.'),
        E('demo-lana', 2, '13:00', 'Ručak', 'Riblji štapići i pire krumpir bez mlijeka', ['Riba', 'Gluten'], true, ['Bol u trbuhu'], 'Blaga', 60, 'Žalila se na trbuh, možda se prejela.'),
        E('demo-marko', 0, '07:45', 'Doručak', 'Jaje na oko i tost', ['Jaja', 'Gluten'], false, [], '', '', ''),
        E('demo-marko', 1, '16:00', 'Popodnevna užina', 'Čokoladica s rođendana u školi', ['Mlijeko', 'Soja', 'Orašasti plodovi'], true, ['Oticanje usana ili lica', 'Kašalj ili piskanje'], 'Jaka', 10, 'Deklaracija: „može sadržavati tragove lješnjaka”. Dana terapija prema planu liječnika, smirilo se za 40 min. Pokazati pedijatru.'),
        E('demo-marko', 2, '12:15', 'Ručak', 'Tjestenina bolognese', ['Gluten', 'Celer'], false, [], '', '', '')
      ],
      meds: [
        { id: 'demo-med-par', childId: 'demo-lana', name: 'Paracetamol sirup', unit: 'ml', dose: 5, interval: 6, note: '120 mg / 5 ml', demo: true },
        { id: 'demo-med-cet', childId: 'demo-lana', name: 'Cetirizin kapi', unit: 'kap', dose: 5, interval: 24, note: 'Kod osipa i svrbeža', demo: true },
        { id: 'demo-med-sal', childId: 'demo-marko', name: 'Salbutamol inhalator', unit: 'potisak', dose: 2, interval: 4, note: 'Uz komoricu', demo: true }
      ],
      doses: [
        D('demo-lana', 'demo-med-cet', 'Cetirizin kapi', 'kap', 1, '10:40', 5, 'Nakon osipa od keksa.'),
        D('demo-lana', 'demo-med-par', 'Paracetamol sirup', 'ml', 1, '20:15', 5, ''),
        D('demo-lana', 'demo-med-par', 'Paracetamol sirup', 'ml', 0, '07:10', 5, ''),
        D('demo-marko', 'demo-med-sal', 'Salbutamol inhalator', 'potisak', 1, '16:15', 2, 'Piskanje nakon čokoladice.')
      ],
      temps: [
        T('demo-lana', 1, '20:00', 38.9, 'Uho', 'Malaksala, odbija večeru.'),
        T('demo-lana', 1, '22:30', 38.1, 'Uho', ''),
        T('demo-lana', 0, '07:00', 38.4, 'Pazuh', ''),
        T('demo-lana', 0, '11:00', 37.4, 'Pazuh', 'Igra se, bolje je volje.')
      ]
    };
    function D(childId, medId, medName, unit, off, time, dose, note) {
      return { id: uid(), childId: childId, medId: medId, medName: medName, unit: unit, date: day(off), time: time, dose: dose, note: note, demo: true };
    }
    function T(childId, off, time, value, method, note) {
      return { id: uid(), childId: childId, date: day(off), time: time, value: value, method: method, note: note, demo: true };
    }
  }

  function normalize(d) {
    if (!d || !Array.isArray(d.children) || !Array.isArray(d.entries)) return null;
    ['meds', 'doses', 'temps'].forEach(function (k) { if (!Array.isArray(d[k])) d[k] = []; });
    return d;
  }
  function readJson(key) {
    try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  }
  function writeJson(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); return true; }
    catch (e) { return false; }
  }
  function emptyData() { return { v: 1, activeChild: null, children: [], entries: [], meds: [], doses: [], temps: [] }; }

  var data = emptyData();

  // ---------- Supabase: prijava i sinkronizacija ----------
  // Podaci u memoriji ostaju isti kao prije; persist() sprema lokalnu kopiju
  // i u pozadini šalje razlike na poslužitelj (upsert izmijenjenih, delete uklonjenih).
  var CFG = window.TANJURIC_CONFIG || {};
  var sb = window.supabase && CFG.supabaseUrl ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey) : null;
  var auth = { user: null };
  function cacheKey() { return 'tanjuric.cache.' + auth.user.id; }

  function nz(v) { return v === '' || v == null ? null : Number(v); }
  function zs(v) { return v == null ? '' : Number(v); }
  var SYNC = [
    { key: 'children', table: 'children',
      to: function (c) { return { id: c.id, name: c.name, allergies: c.allergies || [] }; },
      from: function (r) { return { id: r.id, name: r.name, allergies: r.allergies || [] }; } },
    { key: 'entries', table: 'meals',
      to: function (e) {
        return { id: e.id, child_id: e.childId, date: e.date, time: e.time, type: e.type || '', food: e.food, allergens: e.allergens || [],
          reaction: !!e.reaction, symptoms: e.symptoms || [], severity: e.severity || '', onset: nz(e.onset), note: e.note || '', photo: e.photo || '' };
      },
      from: function (r) {
        return { id: r.id, childId: r.child_id, date: r.date, time: r.time, type: r.type, food: r.food, allergens: r.allergens || [],
          reaction: r.reaction, symptoms: r.symptoms || [], severity: r.severity, onset: zs(r.onset), note: r.note, photo: r.photo };
      } },
    { key: 'meds', table: 'meds',
      to: function (m) { return { id: m.id, child_id: m.childId, name: m.name, unit: m.unit, dose: nz(m.dose), interval_h: nz(m.interval), note: m.note || '' }; },
      from: function (r) { return { id: r.id, childId: r.child_id, name: r.name, unit: r.unit, dose: zs(r.dose), interval: zs(r.interval_h), note: r.note }; } },
    { key: 'doses', table: 'doses',
      to: function (d) { return { id: d.id, child_id: d.childId, med_id: d.medId || null, med_name: d.medName, unit: d.unit || '', date: d.date, time: d.time, dose: Number(d.dose), note: d.note || '' }; },
      from: function (r) { return { id: r.id, childId: r.child_id, medId: r.med_id, medName: r.med_name, unit: r.unit, date: r.date, time: r.time, dose: Number(r.dose), note: r.note }; } },
    { key: 'temps', table: 'temps',
      to: function (t) { return { id: t.id, child_id: t.childId, date: t.date, time: t.time, value: Number(t.value), method: t.method || '', note: t.note || '' }; },
      from: function (r) { return { id: r.id, childId: r.child_id, date: r.date, time: r.time, value: Number(r.value), method: r.method, note: r.note }; } }
  ];
  var synced = {};      // table -> { id: json retka zadnje potvrđene verzije }
  var sync = { busy: false, again: false, timer: null, retry: null, state: 'ok' };

  function setSyncState(s) {
    sync.state = s;
    var el = $('#syncStatus'); if (!el) return;
    el.className = 'sync ' + s;
    el.textContent = s === 'saving' ? 'Spremanje…' : s === 'error' ? 'Nije spremljeno — pokušavam ponovno' : 'Spremljeno';
  }

  function adoptDemoParents() {
    // Ako je stvaran unos dodan primjeru djeteta, to dijete postaje stvarno.
    data.children.forEach(function (c) {
      if (!c.demo) return;
      var used = ['entries', 'meds', 'doses', 'temps'].some(function (k) {
        return data[k].some(function (x) { return !x.demo && x.childId === c.id; });
      });
      if (used) delete c.demo;
    });
  }

  function scheduleSync(delay) {
    clearTimeout(sync.timer);
    sync.timer = setTimeout(runSync, delay == null ? 400 : delay);
  }

  function runSync() {
    if (!sb || !auth.user) return;
    if (sync.busy) { sync.again = true; return; }
    adoptDemoParents();
    var uidv = auth.user.id, ups = [], dels = [];
    SYNC.forEach(function (s) {
      var prev = synced[s.table] || {}, seen = {}, rows = [];
      data[s.key].forEach(function (x) {
        if (x.demo) return;
        var row = s.to(x); row.user_id = uidv;
        var js = JSON.stringify(row);
        seen[x.id] = js;
        if (prev[x.id] !== js) rows.push(row);
      });
      var gone = Object.keys(prev).filter(function (id) { return !(id in seen); });
      if (rows.length) ups.push({ table: s.table, rows: rows });
      if (gone.length) dels.push({ table: s.table, ids: gone });
      s._next = seen;
    });
    if (!ups.length && !dels.length) { markClean(); return; }
    sync.busy = true; setSyncState('saving');
    var p = Promise.resolve();
    ups.forEach(function (u) {   // roditelji (children) prvi
      p = p.then(function () { return sb.from(u.table).upsert(u.rows, { onConflict: 'user_id,id' }).then(check); });
    });
    dels.slice().reverse().forEach(function (d) {   // djeca prva, roditelji zadnji
      p = p.then(function () { return sb.from(d.table).delete().eq('user_id', uidv).in('id', d.ids).then(check); });
    });
    p.then(function () {
      SYNC.forEach(function (s) { synced[s.table] = s._next; });
      sync.busy = false;
      markClean();
      if (sync.again) { sync.again = false; runSync(); }
    }).catch(function (err) {
      sync.busy = false; sync.again = false;
      console.error('Sinkronizacija nije uspjela', err);
      setSyncState('error');
      clearTimeout(sync.retry);
      sync.retry = setTimeout(runSync, 8000);
    });
  }
  function check(res) { if (res.error) throw res.error; return res; }

  function markClean() {
    writeJson(cacheKey(), { dirty: false, data: data });
    if (!sync.busy) setSyncState('ok');
  }

  function persist() {
    if (!auth.user) return false;
    savePrefs();
    writeJson(cacheKey(), { dirty: true, data: data });
    setSyncState('saving');
    scheduleSync();
    return true;
  }

  function fetchAll() {
    return Promise.all(SYNC.map(function (s) {
      return sb.from(s.table).select('*').then(check).then(function (res) { return { s: s, rows: res.data || [] }; });
    })).then(function (parts) {
      var d = emptyData();
      parts.forEach(function (p) {
        synced[p.s.table] = {};
        p.rows.forEach(function (r) {
          var obj = p.s.from(r);
          d[p.s.key].push(obj);
          var back = p.s.to(obj); back.user_id = r.user_id;
          synced[p.s.table][obj.id] = JSON.stringify(back);
        });
      });
      return d;
    });
  }

  function legacyData() {
    if (localStorage.getItem(STORE_KEY + '.imported')) return null;
    var d = normalize(readJson(STORE_KEY));
    if (!d) return null;
    var real = [d.children, d.entries, d.meds, d.doses, d.temps].some(function (l) { return l.some(function (x) { return !x.demo; }); });
    return real ? d : null;
  }

  function loadUserData() {
    showScreen('loading');
    var cached = readJson(cacheKey());
    return fetchAll().then(function (server) {
      var prefs = readJson('tanjuric.prefs.' + auth.user.id) || {};
      var isEmpty = !server.children.length;
      if (cached && cached.dirty && normalize(cached.data)) {
        data = cached.data;               // lokalne promjene koje nisu stigle na poslužitelj
        scheduleSync(0);
      } else if (!isEmpty) {
        data = server;
      } else {
        data = prefs.demoCleared ? emptyData() : demoData();
        ui.legacy = legacyData();
      }
      data.activeChild = prefs.activeChild || null;
      if (!data.children.length) ui.addingChild = true;
      showScreen('app');
      renderAll();
      setSyncState('ok');
    }).catch(function (err) {
      console.error(err);
      if (cached && normalize(cached.data)) {
        data = cached.data; showScreen('app'); renderAll(); setSyncState('error'); scheduleSync(8000);
        flash('Nema veze s poslužiteljem — prikazana je zadnja spremljena kopija s ovog uređaja.');
      } else {
        showScreen('login');
        var e = $('#authError'); e.hidden = false; e.textContent = 'Učitavanje podataka nije uspjelo. Provjeri internetsku vezu i pokušaj ponovno.';
      }
    });
  }

  function savePrefs() {
    if (!auth.user) return;
    var prefs = readJson('tanjuric.prefs.' + auth.user.id) || {};
    prefs.activeChild = data.activeChild;
    writeJson('tanjuric.prefs.' + auth.user.id, prefs);
  }

  function showScreen(name) {
    $('#authScreen').hidden = name !== 'login';
    $('#loadingScreen').hidden = name !== 'loading';
    $('#appShell').hidden = name !== 'app';
  }

  var ui = {
    q: '', fType: '', fAllergen: '', fRange: '', fReaction: false,
    form: null, editingId: null, confirmDeleteId: null,
    addingChild: false, editingAllergies: false,
    tab: 'meals', formKind: null,
    medForm: null, medEditingId: null, confirmMedDeleteId: null,
    confirmChildDeleteId: null, picking: false
  };
  try {
    var savedTab = localStorage.getItem(TAB_KEY);
    if (TABS.some(function (t) { return t.id === savedTab; })) ui.tab = savedTab;
  } catch (e) { /* ignore */ }

  function activeChild() {
    var c = data.children.filter(function (x) { return x.id === data.activeChild; })[0];
    if (!c && data.children.length) { c = data.children[0]; data.activeChild = c.id; }
    return c || null;
  }
  function knownOf(child) { return child ? child.allergies : []; }
  function childEntries(child) {
    if (!child) return [];
    return data.entries.filter(function (e) { return e.childId === child.id; });
  }
  function ofChild(list, child) {
    if (!child) return [];
    return list.filter(function (x) { return x.childId === child.id; });
  }
  function childMeds(child) {
    return ofChild(data.meds, child).sort(function (a, b) { return a.name.localeCompare(b.name, 'hr'); });
  }
  function medById(id) { return data.meds.filter(function (m) { return m.id === id; })[0] || null; }
  function doseMedName(d) { var m = medById(d.medId); return m ? m.name : d.medName; }
  function lastDoseOf(medId, beforeStamp, exceptId) {
    return data.doses.filter(function (d) {
      return d.medId === medId && d.id !== exceptId && (beforeStamp == null || stamp(d.date, d.time) <= beforeStamp);
    }).sort(byNewest)[0] || null;
  }
  function groupByDay(list) {
    var groups = [];
    list.forEach(function (e) {
      var g = groups[groups.length - 1];
      if (!g || g.date !== e.date) { g = { date: e.date, items: [] }; groups.push(g); }
      g.items.push(e);
    });
    return groups;
  }
  function daysHtml(list, itemHtml, forms) {
    return groupByDay(list).map(function (g) {
      var l = dayLabel(g.date);
      return '<section class="day"><div class="day-head"><h2>' + esc(l.rel) + '</h2><span class="muted" style="font-size:14px">' + esc(l.full) + '</span>' +
        '<span class="n">' + g.items.length + ' ' + plural(g.items.length, forms[0], forms[1], forms[2]) + '</span></div>' +
        g.items.map(itemHtml).join('') + '</section>';
    }).join('<div style="height:10px"></div>');
  }
  function emptyHtml(title, text) {
    return '<div class="empty">' + ICON.search + '<strong>' + esc(title) + '</strong><span>' + esc(text) + '</span></div>';
  }
  function actionsHtml(item, kind, what) {
    if (ui.confirmDeleteId === item.id) {
      return '<div class="confirm" role="alert"><span>Obrisati ' + esc(what) + '?</span>' +
        '<button type="button" class="btn btn-danger" data-action="do-delete" data-kind="' + kind + '" data-id="' + esc(item.id) + '" data-fk="del-' + esc(item.id) + '">Obriši</button>' +
        '<button type="button" class="btn" data-action="cancel-delete" data-id="' + esc(item.id) + '">Odustani</button></div>';
    }
    return '<div class="entry-actions">' +
      '<button type="button" class="btn-link" data-action="edit-' + kind + '" data-id="' + esc(item.id) + '">' + ICON.edit + 'Uredi<span class="sr-only"> ' + esc(what) + '</span></button>' +
      '<button type="button" class="btn-link grey" data-action="ask-delete" data-id="' + esc(item.id) + '" data-fk="ask-' + esc(item.id) + '">' + ICON.trash + 'Obriši<span class="sr-only"> ' + esc(what) + '</span></button></div>';
  }

  // ---------- flash ----------
  var flashT = null;
  function flash(msg) {
    var el = $('#flash');
    el.innerHTML = '<div class="flash">' + ICON.check + esc(msg) + '</div>';
    clearTimeout(flashT);
    flashT = setTimeout(function () { el.innerHTML = ''; }, 3500);
  }

  // ---------- render: header ----------
  function renderChildren() {
    var html = data.children.map(function (c) {
      var on = c.id === data.activeChild;
      return '<button type="button" class="child-chip" data-action="pick-child" data-id="' + esc(c.id) + '" data-fk="child-' + esc(c.id) + '" aria-pressed="' + on + '">' +
        '<span class="av" aria-hidden="true">' + esc(c.name.charAt(0).toUpperCase()) + '</span>' + esc(c.name) + '</button>';
    }).join('');
    if (ui.addingChild) {
      html += '<div class="add-child"><label for="newChild" class="sr-only">Ime djeteta</label>' +
        '<input id="newChild" type="text" placeholder="Ime djeteta" maxlength="40" autocomplete="off">' +
        '<button type="button" class="btn btn-primary btn-pill" data-action="add-child-confirm">Dodaj</button>' +
        (data.children.length ? '<button type="button" class="btn btn-pill" data-action="add-child-cancel">Odustani</button>' : '') +
        '</div>';
    } else {
      html += '<button type="button" class="dashed" data-action="add-child-start" data-fk="add-child">' + ICON.plus + 'Dodaj dijete</button>';
    }
    $('#childBar').innerHTML = (data.children.length ? '<span class="muted" style="font-size:13px;margin-right:4px">Dijete:</span>' : '') + html;

    var child = activeChild();
    var known = knownOf(child);
    var kl = $('#knownLine');
    kl.hidden = !child || ui.tab !== 'meals';
    if (kl.hidden) { kl.innerHTML = ''; return; }
    kl.innerHTML = ICON.warn + '<span class="muted">Poznate alergije (' + esc(child.name) + '):</span>' +
      (known.length ? known.map(function (k) { return '<span class="tag warn">' + esc(k) + '</span>'; }).join('')
        : '<span class="muted" style="font-style:italic">nisu upisane</span>');
  }

  function renderDemoBanner() {
    var hasDemo = data.children.some(function (c) { return c.demo; }) ||
      [data.entries, data.meds, data.doses, data.temps].some(function (l) { return l.some(function (e) { return e.demo; }); });
    function realCount(l) { return l.filter(function (x) { return !x.demo; }).length; }
    var lk = ui.legacy ? realCount(ui.legacy.children) : 0, le = ui.legacy ? realCount(ui.legacy.entries) : 0;
    var legacy = ui.legacy
      ? '<div class="demo"><span>Na ovom uređaju postoje podaci upisani prije prijave (' + lk + ' ' + plural(lk, 'dijete', 'djece', 'djece') +
        ', ' + le + ' ' + plural(le, 'obrok', 'obroka', 'obroka') + '). Prenijeti ih na tvoj račun?</span>' +
        '<button type="button" class="btn btn-primary" data-action="import-legacy">Prenesi podatke</button>' +
        '<button type="button" class="btn-link" data-action="skip-legacy">Ne, hvala</button></div>'
      : '';
    $('#demoBanner').innerHTML = legacy + (hasDemo
      ? '<div class="demo"><span>Prikazani su <strong>primjeri</strong> da vidiš kako dnevnik izgleda. Primjeri se ne spremaju na tvoj račun.</span>' +
        '<button type="button" class="btn-link" data-action="clear-demo">Obriši primjere i kreni ispočetka</button></div>'
      : '');
  }

  // ---------- render: list ----------
  function filtered(child) {
    var words = norm(ui.q.trim()).split(/\s+/).filter(Boolean);
    return childEntries(child).filter(function (e) {
      if (ui.fType && e.type !== ui.fType) return false;
      if (ui.fAllergen && e.allergens.indexOf(ui.fAllergen) < 0) return false;
      if (ui.fReaction && !e.reaction) return false;
      if (ui.fRange && daysAgo(e.date) >= Number(ui.fRange)) return false;
      if (words.length) {
        var hay = norm([e.food, e.note, e.type, e.allergens.join(' '), e.symptoms.join(' '),
          e.reaction ? 'reakcija ' + e.severity : 'bez reakcije'].join(' '));
        for (var i = 0; i < words.length; i++) if (hay.indexOf(words[i]) < 0) return false;
      }
      return true;
    }).sort(byNewest);
  }

  function entryHtml(e, known) {
    var tags = e.allergens.map(function (a) {
      var k = known.indexOf(a) >= 0;
      return '<span class="tag' + (k ? ' warn' : '') + '">' + esc(a) + (k ? ' · poznata alergija' : '') + '</span>';
    }).join('');
    var badge = e.reaction
      ? '<span class="badge ' + (SEV_CLASS[e.severity] || 'mild') + '">Reakcija · ' + esc(String(e.severity || '').toLowerCase()) + '</span>'
      : '<span class="badge ok">Bez reakcije</span>';
    var symptoms = (e.reaction && e.symptoms.length)
      ? '<div class="symptoms"><strong>Simptomi:</strong> ' + esc(e.symptoms.join(', ')) +
        (e.onset !== '' && e.onset != null ? '<span class="muted"> · nakon ' + esc(e.onset) + ' min</span>' : '') + '</div>'
      : '';
    var actions = ui.confirmDeleteId === e.id
      ? '<div class="confirm" role="alert"><span>Obrisati ovaj obrok?</span>' +
        '<button type="button" class="btn btn-danger" data-action="do-delete" data-id="' + esc(e.id) + '" data-fk="del-' + esc(e.id) + '">Obriši</button>' +
        '<button type="button" class="btn" data-action="cancel-delete" data-id="' + esc(e.id) + '">Odustani</button></div>'
      : '<div class="entry-actions">' +
        '<button type="button" class="btn-link" data-action="edit" data-id="' + esc(e.id) + '">' + ICON.edit + 'Uredi<span class="sr-only"> obrok ' + esc(e.food) + '</span></button>' +
        '<button type="button" class="btn-link grey" data-action="ask-delete" data-id="' + esc(e.id) + '" data-fk="ask-' + esc(e.id) + '">' + ICON.trash + 'Obriši<span class="sr-only"> obrok ' + esc(e.food) + '</span></button></div>';
    return '<article class="entry">' +
      '<div class="when"><span class="time">' + esc(e.time) + '</span><span class="type">' + esc(e.type) + '</span></div>' +
      '<div class="body"><div class="title-row"><h3>' + esc(e.food) + '</h3>' + badge + '</div>' +
      (tags ? '<div class="tags">' + tags + '</div>' : '') + symptoms +
      (e.note ? '<p class="note">' + esc(e.note) + '</p>' : '') + actions + '</div>' +
      (e.photo ? '<img class="photo" src="' + esc(e.photo) + '" alt="Fotografija obroka: ' + esc(e.food) + '">' : '') +
      '</article>';
  }

  function renderTabs() {
    var child = activeChild();
    var counts = { meals: childEntries(child).length, doses: ofChild(data.doses, child).length, temps: ofChild(data.temps, child).length };
    counts.all = counts.meals + counts.doses + counts.temps;
    $('#tabs').hidden = !child;
    $('#tabs').innerHTML = TABS.map(function (t) {
      return '<button type="button" class="tab" data-action="tab" data-val="' + t.id + '" data-fk="tab-' + t.id + '" aria-pressed="' + (ui.tab === t.id) + '">' +
        esc(t.label) + '<span class="n">' + counts[t.id] + '</span></button>';
    }).join('');
  }

  function renderList() {
    $('#searchCard').hidden = ui.tab !== 'meals';
    if (ui.tab === 'doses') renderDoses();
    else if (ui.tab === 'temps') renderTemps();
    else if (ui.tab === 'all') renderTimeline();
    else renderMeals();
  }

  // ---------- render: vremenska crta (Sve) ----------
  var TL_ICON = {
    meal: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="7"/><circle cx="12" cy="13" r="3"/><path d="M4 3v5M20 3v5"/></svg>',
    react: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
    dose: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7z"/><path d="m8.5 8.5 7 7"/></svg>',
    temp: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M14 14.8V5a2 2 0 1 0-4 0v9.8a4 4 0 1 0 4 0z"/><path d="M12 9v7"/></svg>'
  };
  var TL_ORDER = { meal: 0, react: 1, dose: 2, temp: 2 };

  // Obroci, terapije i mjerenja zajedno. Reakcija s upisanim vremenom pojave
  // dobiva vlastiti događaj (obrok + N min), da se vidi slijed obrok → reakcija → lijek.
  function timelineItems(child) {
    var items = [];
    childEntries(child).forEach(function (e) {
      items.push({ kind: 'meal', date: e.date, time: e.time, item: e });
      var onset = e.onset === '' || e.onset == null ? NaN : Number(e.onset);
      if (e.reaction && !isNaN(onset) && onset > 0) {
        var at = new Date(stamp(e.date, e.time) + onset * 60000);
        items.push({ kind: 'react', date: toIso(at), time: pad(at.getHours()) + ':' + pad(at.getMinutes()), item: e });
      }
    });
    ofChild(data.doses, child).forEach(function (d) { items.push({ kind: 'dose', date: d.date, time: d.time, item: d }); });
    ofChild(data.temps, child).forEach(function (t) { items.push({ kind: 'temp', date: t.date, time: t.time, item: t }); });
    return items.sort(function (a, b) {
      return (b.date + b.time).localeCompare(a.date + a.time) || TL_ORDER[b.kind] - TL_ORDER[a.kind];
    });
  }

  function reactHtml(e, time) {
    var sev = String(e.severity || '').toLowerCase();
    return '<article class="entry tl-react">' +
      '<div class="when"><span class="time">' + esc(time) + '</span><span class="type">Reakcija</span></div>' +
      '<div class="body"><div class="title-row"><h3>' + esc(e.symptoms.length ? e.symptoms.join(', ') : 'Reakcija') + '</h3>' +
      (sev ? '<span class="badge ' + (SEV_CLASS[e.severity] || 'mild') + '">' + esc(sev) + '</span>' : '') + '</div>' +
      '<p class="note muted">' + esc(e.onset) + ' min nakon obroka: ' + esc(e.food) + '</p></div></article>';
  }

  function renderTimeline() {
    var child = activeChild(), host = $('#list');
    if (!child) { host.innerHTML = ''; return; }
    var items = timelineItems(child), known = knownOf(child);
    if (!items.length) {
      host.innerHTML = emptyHtml('Još nema upisa', 'Ovdje će se na jednoj vremenskoj crti prikazivati obroci, reakcije, terapije i temperatura. Kreni gumbom „Novi upis”.');
      return;
    }
    var KIND_NAME = { meal: 'Obrok', react: 'Reakcija', dose: 'Terapija', temp: 'Temperatura' };
    host.innerHTML = groupByDay(items).map(function (g) {
      var l = dayLabel(g.date);
      var n = g.items.filter(function (x) { return x.kind !== 'react'; }).length;
      var rows = g.items.map(function (x, i) {
        var card = x.kind === 'meal' ? entryHtml(x.item, known) : x.kind === 'dose' ? doseHtml(x.item)
          : x.kind === 'temp' ? tempHtml(x.item) : reactHtml(x.item, x.time);
        var gap = '';
        if (i > 0) {
          var prev = g.items[i - 1], ms = stamp(prev.date, prev.time) - stamp(x.date, x.time);
          gap = '<div class="tl-gap" aria-hidden="true">' + (ms > 0 ? durText(ms) + ' kasnije ↑' : 'u isto vrijeme') + '</div>';
        }
        return gap + '<div class="tl-item"><span class="tl-node ' + x.kind + '" role="img" aria-label="' + KIND_NAME[x.kind] + '">' + TL_ICON[x.kind] + '</span>' + card + '</div>';
      }).join('');
      return '<section class="day"><div class="day-head"><h2>' + esc(l.rel) + '</h2><span class="muted" style="font-size:14px">' + esc(l.full) + '</span>' +
        '<span class="n">' + n + ' ' + plural(n, 'upis', 'upisa', 'upisa') + '</span></div><div class="tl">' + rows + '</div></section>';
    }).join('<div style="height:10px"></div>');
  }

  function pickerHtml() {
    var child = activeChild();
    function opt(kind, title, sub) {
      return '<button type="button" class="pick-opt" data-action="pick-new" data-val="' + kind + '" data-fk="pick-' + kind + '">' +
        '<span class="tl-node ' + kind + '" aria-hidden="true">' + TL_ICON[kind] + '</span><span><strong>' + title + '</strong><span class="muted">' + sub + '</span></span></button>';
    }
    return '<section class="card form" id="formCard" aria-labelledby="pickTitle">' +
      '<div class="form-head"><div><h2 id="pickTitle">Što upisuješ?</h2><p class="muted" style="font-size:14px">Dijete: ' + esc(child ? child.name : '') + '</p></div>' +
      '<button type="button" class="icon-btn" data-action="close-form" aria-label="Zatvori">' + ICON.x + '</button></div>' +
      '<div class="pick-grid">' + opt('meal', 'Obrok', 'Što je jelo i je li bilo reakcije') +
      opt('dose', 'Terapija', 'Lijek i doza') + opt('temp', 'Temperatura', 'Izmjerena vrijednost') + '</div></section>';
  }

  function renderAllStats(child) {
    var now = Date.now();
    function in24(x) { var s = stamp(x.date, x.time); return s <= now && now - s < 86400000; }
    var meals24 = childEntries(child).filter(in24).length;
    var doses24 = ofChild(data.doses, child).filter(in24).length;
    var react7 = childEntries(child).filter(function (e) { return e.reaction && daysAgo(e.date) < 7; }).length;
    var temps24 = ofChild(data.temps, child).filter(in24).map(function (t) { return t.value; });
    var maxT = temps24.length ? Math.max.apply(null, temps24) : null;
    function leg(kind, label) { return '<span><span class="tl-node sm ' + kind + '" aria-hidden="true">' + TL_ICON[kind] + '</span>' + label + '</span>'; }
    return '<h2>Pregled — ' + esc(child.name) + '</h2>' +
      '<div class="stats"><div class="stat"><b>' + meals24 + '</b><span>' + plural(meals24, 'obrok', 'obroka', 'obroka') + ' u zadnja 24 h</span></div>' +
      '<div class="stat react"><b>' + react7 + '</b><span>' + plural(react7, 'reakcija', 'reakcije', 'reakcija') + ' u zadnjih 7 dana</span></div>' +
      '<div class="stat"><b>' + doses24 + '</b><span>' + plural(doses24, 'doza', 'doze', 'doza') + ' u zadnja 24 h</span></div>' +
      '<div class="stat"><b>' + (maxT == null ? '—' : esc(fmtNum(maxT.toFixed(1))) + '°') + '</b><span>najviša temperatura u 24 h</span></div></div>' +
      '<div class="tl-legend">' + leg('meal', 'Obrok') + leg('react', 'Reakcija') + leg('dose', 'Terapija') + leg('temp', 'Temperatura') + '</div>' +
      '<p class="foot-note">Reakcija se prikazuje kao zaseban događaj kad je u obroku upisano nakon koliko se minuta javila.</p>';
  }

  function doseHtml(d) {
    var title = doseMedName(d);
    return '<article class="entry">' +
      '<div class="when"><span class="time">' + esc(d.time) + '</span><span class="type">Terapija</span></div>' +
      '<div class="body"><div class="title-row"><h3>' + esc(title) + '</h3><span class="badge info">' + esc(doseText(d.dose, d.unit)) + '</span></div>' +
      (d.note ? '<p class="note">' + esc(d.note) + '</p>' : '') +
      actionsHtml(d, 'dose', 'terapiju ' + title) + '</div></article>';
  }

  function renderDoses() {
    var child = activeChild(), host = $('#list');
    if (!child) { host.innerHTML = ''; return; }
    var list = ofChild(data.doses, child).sort(byNewest);
    if (!list.length) {
      host.innerHTML = emptyHtml('Još nema zabilježenih terapija',
        childMeds(child).length ? 'Upiši prvu terapiju gumbom „Nova terapija”.' : 'Dodaj lijekove koje ' + child.name + ' koristi u kartici „Lijekovi”, ili odmah upiši terapiju gumbom „Nova terapija”.');
      return;
    }
    host.innerHTML = daysHtml(list, doseHtml, ['terapija', 'terapije', 'terapija']);
  }

  function tempHtml(t) {
    var lv = tempLevel(t.value);
    return '<article class="entry">' +
      '<div class="when"><span class="time">' + esc(t.time) + '</span><span class="type">' + esc(t.method || 'Mjerenje') + '</span></div>' +
      '<div class="body"><div class="title-row"><h3 class="temp-val">' + esc(fmtNum(t.value.toFixed(1))) + ' °C</h3><span class="badge ' + lv.cls + '">' + lv.label + '</span></div>' +
      (t.note ? '<p class="note">' + esc(t.note) + '</p>' : '') +
      actionsHtml(t, 'temp', 'mjerenje ' + fmtNum(t.value.toFixed(1)) + ' °C') + '</div></article>';
  }

  function renderTemps() {
    var child = activeChild(), host = $('#list');
    if (!child) { host.innerHTML = ''; return; }
    var list = ofChild(data.temps, child).sort(byNewest);
    if (!list.length) {
      host.innerHTML = emptyHtml('Još nema izmjerenih temperatura', 'Upiši prvo mjerenje gumbom „Novo mjerenje”.');
      return;
    }
    host.innerHTML = daysHtml(list, tempHtml, ['mjerenje', 'mjerenja', 'mjerenja']);
  }

  function renderMeals() {
    var child = activeChild();
    var all = childEntries(child);
    var list = filtered(child);
    var known = knownOf(child);
    var hasFilters = !!(ui.q.trim() || ui.fType || ui.fAllergen || ui.fRange || ui.fReaction);

    $('#countText').textContent = !child ? '' : hasFilters
      ? 'Pronađeno ' + list.length + ' od ' + all.length + ' ' + plural(all.length, 'obroka', 'obroka', 'obroka')
      : 'Ukupno ' + all.length + ' ' + plural(all.length, 'obrok', 'obroka', 'obroka');
    $('#clearBtn').hidden = !hasFilters;
    $('#fReaction').setAttribute('aria-pressed', String(ui.fReaction));

    var host = $('#list');
    if (!child) {
      host.innerHTML = '<div class="empty">' + ICON.search + '<strong>Dobro došli u Tanjurić</strong><span>Za početak dodaj dijete (gumb „Dodaj dijete” na vrhu), a zatim unosi obroke.</span></div>';
      return;
    }
    if (!list.length) {
      host.innerHTML = '<div class="empty">' + ICON.search +
        '<strong>' + (all.length ? 'Nema obroka koji odgovaraju pretrazi' : 'Još nema unesenih obroka') + '</strong>' +
        '<span>' + (all.length ? 'Pokušaj s drugim pojmom ili očisti filtre.' : 'Dodaj prvi obrok gumbom „Novi obrok”.') + '</span></div>';
      return;
    }
    host.innerHTML = daysHtml(list, function (e) { return entryHtml(e, known); }, ['obrok', 'obroka', 'obroka']);
  }

  // ---------- render: aside ----------
  function renderDoseStats(child) {
    var meds = childMeds(child), mine = ofChild(data.doses, child);
    var now = Date.now();
    var last24 = mine.filter(function (d) { var s = stamp(d.date, d.time); return s <= now && now - s < 86400000; }).length;
    var rows = meds.map(function (m) {
      var last = lastDoseOf(m.id, now, null);
      if (!last) return null;
      var elapsed = now - stamp(last.date, last.time);
      var early = m.interval && elapsed < m.interval * 3600000;
      return '<div class="med-last"><strong>' + esc(m.name) + '</strong><span class="muted">' + esc(whenText(last.date, last.time)) + ' · ' +
        esc(doseText(last.dose, last.unit)) + ' · ' + esc(agoText(last.date, last.time)) + '</span>' +
        (early ? '<span class="tag warn">Upisani razmak od ' + fmtNum(m.interval) + ' h još nije prošao</span>' : '') + '</div>';
    }).filter(Boolean);
    return '<h2>Terapije — ' + esc(child.name) + '</h2>' +
      '<div class="stats"><div class="stat"><b>' + last24 + '</b><span>' + plural(last24, 'doza', 'doze', 'doza') + ' u zadnja 24 h</span></div>' +
      '<div class="stat"><b>' + meds.length + '</b><span>' + plural(meds.length, 'lijek', 'lijeka', 'lijekova') + ' u popisu</span></div></div>' +
      '<div style="display:flex;flex-direction:column;gap:10px"><span class="muted" style="font-size:14px">Zadnja doza po lijeku</span>' +
      (rows.length ? rows.join('') : '<span class="muted" style="font-size:14px;font-style:italic">Još nema zabilježenih doza.</span>') + '</div>' +
      '<p class="foot-note">Razmak između doza upisuješ sam, prema uputi liječnika ili ljekarnika. Tanjurić ne savjetuje o doziranju.</p>';
  }

  function renderTempStats(child) {
    var mine = ofChild(data.temps, child).sort(byNewest), now = Date.now();
    var last = mine[0];
    var day = mine.filter(function (t) { var s = stamp(t.date, t.time); return s <= now && now - s < 86400000; });
    var max = day.reduce(function (m, t) { return !m || t.value > m.value ? t : m; }, null);
    var spark = sparkHtml(mine.filter(function (t) { return now - stamp(t.date, t.time) < 3 * 86400000; }));
    return '<h2>Temperatura — ' + esc(child.name) + '</h2>' +
      '<div class="stats"><div class="stat ' + (last && last.value >= 38 ? 'react' : '') + '"><b>' + (last ? fmtNum(last.value.toFixed(1)) + '°' : '—') + '</b><span>' +
      (last ? 'zadnje mjerenje, ' + esc(agoText(last.date, last.time)) : 'još nema mjerenja') + '</span></div>' +
      '<div class="stat ' + (max && max.value >= 38 ? 'react' : '') + '"><b>' + (max ? fmtNum(max.value.toFixed(1)) + '°' : '—') + '</b><span>najviša u zadnja 24 h</span></div></div>' +
      spark +
      '<p class="foot-note">Oznake (povišena od 37,5 °C, vrućica od 38 °C, visoka od 39 °C) su okvirne i ovise o načinu mjerenja i dobi djeteta. Za procjenu se obrati liječniku.</p>';
  }

  function sparkHtml(list) {
    if (list.length < 2) return '';
    var pts = list.slice().sort(function (a, b) { return stamp(a.date, a.time) - stamp(b.date, b.time); });
    var W = 280, H = 90, P = 6;
    var t0 = stamp(pts[0].date, pts[0].time), t1 = stamp(pts[pts.length - 1].date, pts[pts.length - 1].time);
    var lo = Math.min(36, Math.min.apply(null, pts.map(function (p) { return p.value; }))) - 0.2;
    var hi = Math.max(39.5, Math.max.apply(null, pts.map(function (p) { return p.value; }))) + 0.2;
    function x(p) { return t1 === t0 ? W / 2 : P + (stamp(p.date, p.time) - t0) / (t1 - t0) * (W - 2 * P); }
    function y(v) { return P + (hi - v) / (hi - lo) * (H - 2 * P); }
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + x(p).toFixed(1) + ' ' + y(p.value).toFixed(1); }).join(' ');
    var dots = pts.map(function (p) {
      return '<circle cx="' + x(p).toFixed(1) + '" cy="' + y(p.value).toFixed(1) + '" r="3.5" fill="' + (p.value >= 38 ? '#C2410C' : '#0F766E') + '"/>';
    }).join('');
    return '<div class="spark"><span class="muted" style="font-size:14px">Zadnja 3 dana</span>' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Grafikon temperature u zadnja 3 dana, ' + pts.length + ' mjerenja">' +
      '<line x1="0" x2="' + W + '" y1="' + y(38).toFixed(1) + '" y2="' + y(38).toFixed(1) + '" stroke="#FDBA74" stroke-dasharray="4 4"/>' +
      '<text x="' + (W - 2) + '" y="' + (y(38) - 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="#9A3412">38 °C</text>' +
      '<path d="' + line + '" fill="none" stroke="#0F766E" stroke-width="2" stroke-linejoin="round"/>' + dots + '</svg></div>';
  }

  function medFormHtml() {
    var m = ui.medForm;
    return '<div class="med-form" id="medForm">' +
      '<div class="field"><label for="mName">Naziv lijeka</label><input id="mName" class="input" type="text" maxlength="80" data-mfield="name" value="' + esc(m.name) + '" placeholder="npr. Paracetamol sirup" autocomplete="off"></div>' +
      '<div class="grid2"><div class="field"><label for="mDose">Uobičajena doza</label><input id="mDose" class="input" type="text" inputmode="decimal" data-mfield="dose" value="' + esc(m.dose) + '" placeholder="npr. 5"></div>' +
      '<div class="field"><label for="mUnit">Jedinica</label><select id="mUnit" class="input" data-mfield="unit">' + UNIT_KEYS.map(function (u) {
        return '<option value="' + esc(u) + '"' + (m.unit === u ? ' selected' : '') + '>' + esc(u) + '</option>';
      }).join('') + '</select></div></div>' +
      '<div class="field"><label for="mInterval">Najmanji razmak između doza (sati)</label><input id="mInterval" class="input" type="text" inputmode="decimal" data-mfield="interval" value="' + esc(m.interval) + '" placeholder="npr. 6 — nije obavezno">' +
      '<span class="hint">Prema uputi liječnika. Ako je upisan, dobit ćeš upozorenje kad je nova doza preblizu prethodnoj.</span></div>' +
      '<div class="field"><label for="mNote">Napomena</label><input id="mNote" class="input" type="text" maxlength="200" data-mfield="note" value="' + esc(m.note) + '" placeholder="npr. jačina, za što se daje"></div>' +
      '<div id="mError" class="alert-err" role="alert" hidden></div>' +
      '<div class="aside-actions"><button type="button" class="btn" data-action="med-cancel">Odustani</button>' +
      '<button type="button" class="btn btn-primary" data-action="med-save">' + (ui.medEditingId ? 'Spremi' : 'Dodaj lijek') + '</button></div></div>';
  }

  function renderMedCard(child) {
    var mc = $('#medCard');
    mc.hidden = !child || ui.tab !== 'doses';
    if (mc.hidden) return;
    var meds = childMeds(child);
    var list = meds.map(function (m) {
      if (ui.medEditingId === m.id && ui.medForm) return medFormHtml();
      var sub = [m.dose !== '' && m.dose != null ? doseText(m.dose, m.unit) : m.unit, m.interval ? 'razmak ' + fmtNum(m.interval) + ' h' : ''].filter(Boolean).join(' · ');
      var actions = ui.confirmMedDeleteId === m.id
        ? '<div class="confirm" role="alert"><span>Ukloniti lijek iz popisa?</span>' +
          '<button type="button" class="btn btn-danger" data-action="med-delete" data-id="' + esc(m.id) + '" data-fk="mdel-' + esc(m.id) + '">Ukloni</button>' +
          '<button type="button" class="btn" data-action="med-delete-cancel" data-id="' + esc(m.id) + '">Odustani</button></div>'
        : '<div class="entry-actions">' +
          '<button type="button" class="btn-link" data-action="med-edit" data-id="' + esc(m.id) + '">' + ICON.edit + 'Uredi<span class="sr-only"> lijek ' + esc(m.name) + '</span></button>' +
          '<button type="button" class="btn-link grey" data-action="med-ask-delete" data-id="' + esc(m.id) + '" data-fk="mask-' + esc(m.id) + '">' + ICON.trash + 'Ukloni<span class="sr-only"> lijek ' + esc(m.name) + '</span></button></div>';
      return '<div class="med-item"><strong>' + esc(m.name) + '</strong>' + (sub ? '<span class="muted">' + esc(sub) + '</span>' : '') +
        (m.note ? '<span class="muted" style="font-style:italic">' + esc(m.note) + '</span>' : '') + actions + '</div>';
    }).join('');
    var adding = ui.medForm && !ui.medEditingId;
    mc.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h2>Lijekovi — ' + esc(child.name) + '</h2>' +
      (adding ? '' : '<button type="button" class="btn-link" data-action="med-new" data-fk="med-new">' + ICON.plus + 'Dodaj</button>') + '</div>' +
      (list ? '<div class="med-list">' + list + '</div>' : (adding ? '' : '<span class="muted" style="font-size:14px">Popis lijekova koje dijete koristi. Pri upisu terapije biraš iz ovog popisa, a doza se sama popuni.</span>')) +
      (adding ? medFormHtml() : '');
  }

  function renderAside() {
    var child = activeChild();
    var stats = $('#statsCard'), ac = $('#allergyCard');
    $('#dataCard').hidden = !child;
    renderChildDelete(child);
    renderMedCard(child);
    if (!child) { stats.hidden = true; ac.hidden = true; return; }
    stats.hidden = false;
    ac.hidden = ui.tab !== 'meals';
    if (ui.tab === 'doses' || ui.tab === 'temps' || ui.tab === 'all') {
      stats.innerHTML = ui.tab === 'doses' ? renderDoseStats(child) : ui.tab === 'temps' ? renderTempStats(child) : renderAllStats(child);
      return;
    }

    var mine = childEntries(child);
    var reacts = mine.filter(function (e) { return e.reaction; }).sort(byNewest);
    var react7 = reacts.filter(function (e) { return daysAgo(e.date) < 7; }).length;
    var counts = {};
    reacts.forEach(function (e) { e.allergens.forEach(function (a) { counts[a] = (counts[a] || 0) + 1; }); });
    var keys = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 4);
    var maxC = keys.length ? counts[keys[0]] : 1;
    var last = reacts[0];

    stats.innerHTML = '<h2>Pregled — ' + esc(child.name) + '</h2>' +
      '<div class="stats"><div class="stat"><b>' + mine.length + '</b><span>unesenih obroka</span></div>' +
      '<div class="stat react"><b>' + react7 + '</b><span>reakcija u zadnjih 7 dana</span></div></div>' +
      (last ? '<div style="font-size:14px;display:flex;flex-direction:column;gap:2px"><span class="muted">Zadnja reakcija</span><strong>' +
        esc(dayLabel(last.date).rel + ' u ' + last.time + ' — ' + last.food) + '</strong></div>' : '') +
      '<div style="display:flex;flex-direction:column;gap:8px"><span class="muted" style="font-size:14px">Alergeni u obrocima s reakcijom</span>' +
      (keys.length ? keys.map(function (a) {
        return '<div class="bar-row"><div class="lbl"><strong>' + esc(a) + '</strong><span class="muted">' + counts[a] + '× u ' + reacts.length + ' ' +
          plural(reacts.length, 'reakciji', 'reakcije', 'reakcija') + '</span></div><div class="bar" aria-hidden="true"><i style="width:' +
          Math.round(counts[a] / maxC * 100) + '%"></i></div></div>';
      }).join('') : '<span class="muted" style="font-size:14px;font-style:italic">Još nema zabilježenih reakcija.</span>') +
      '</div><p class="foot-note">Pregled pomaže uočiti obrasce i pripremiti se za pregled kod liječnika. Ne zamjenjuje liječničku procjenu.</p>';
    renderAllergyCard(child);
  }

  function renderChildDelete(child) {
    var el = $('#childDelete');
    if (!child) { el.innerHTML = ''; return; }
    if (ui.confirmChildDeleteId !== child.id) {
      el.innerHTML = '<button type="button" class="btn-link" data-action="child-ask-delete" data-fk="child-del-ask">' + ICON.trash +
        'Obriši dijete ' + esc(child.name) + '</button>';
      return;
    }
    var counts = [
      [ofChild(data.entries, child).length, 'obrok', 'obroka', 'obroka'],
      [ofChild(data.meds, child).length, 'lijek', 'lijeka', 'lijekova'],
      [ofChild(data.doses, child).length, 'terapija', 'terapije', 'terapija'],
      [ofChild(data.temps, child).length, 'mjerenje temperature', 'mjerenja temperature', 'mjerenja temperature']
    ].filter(function (c) { return c[0] > 0; }).map(function (c) { return c[0] + ' ' + plural(c[0], c[1], c[2], c[3]); });
    var what = counts.length
      ? 'Obrisat će se i svi zapisi ovog djeteta: ' + (counts.length > 1 ? counts.slice(0, -1).join(', ') + ' i ' + counts[counts.length - 1] : counts[0]) + '.'
      : 'Za ovo dijete još nema zapisa.';
    el.innerHTML = '<div class="confirm-box" role="group" aria-labelledby="childDelTitle">' +
      '<strong id="childDelTitle">Obrisati dijete ' + esc(child.name) + '?</strong>' +
      '<span>' + esc(what) + ' Brisanje se ne može poništiti.</span>' +
      '<div class="aside-actions"><button type="button" class="btn" data-action="child-delete-cancel" data-fk="child-del-cancel">Odustani</button>' +
      '<button type="button" class="btn btn-danger" data-action="child-delete" data-id="' + esc(child.id) + '" data-fk="child-del-do">Obriši</button></div></div>';
  }

  function renderAllergyCard(child) {
    var ac = $('#allergyCard');
    var known = knownOf(child);
    ac.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h2>Poznate alergije</h2>' +
      '<button type="button" class="btn-link" data-action="toggle-edit-allergies" data-fk="edit-allergies" aria-expanded="' + ui.editingAllergies + '">' +
      (ui.editingAllergies ? 'Gotovo' : 'Uredi') + '</button></div>' +
      (ui.editingAllergies
        ? '<div class="chips">' + ALLERGENS.map(function (a) {
            return '<button type="button" class="chip warn" data-action="known-toggle" data-val="' + esc(a) + '" data-fk="known-' + esc(a) + '" aria-pressed="' + (known.indexOf(a) >= 0) + '">' + esc(a) + '</button>';
          }).join('') + '</div>'
        : '<span class="muted" style="font-size:14px">Označeni alergeni bit će istaknuti u svakom obroku, a pri unosu dobit ćeš upozorenje.</span>');
  }

  function renderAll() {
    var fk = document.activeElement && document.activeElement.getAttribute('data-fk');
    renderChildren();
    renderDemoBanner();
    renderTabs();
    renderList();
    renderAside();
    var noChild = !activeChild();
    var label = TABS.filter(function (t) { return t.id === ui.tab; })[0].newLabel;
    $('#newBtn .new-label').textContent = label;
    $('#fab .new-label').textContent = label;
    $('#newBtn').disabled = noChild;
    $('#fab').hidden = noChild || !!ui.form || ui.picking;
    if (fk) {
      var el = document.querySelector('[data-fk="' + (window.CSS && CSS.escape ? CSS.escape(fk) : fk) + '"]');
      if (el) el.focus();
    }
  }

  // ---------- form ----------
  function blankForm() {
    var now = new Date(), h = now.getHours();
    var type = h < 10 ? 'Doručak' : h < 12 ? 'Jutarnja užina' : h < 15 ? 'Ručak' : h < 18 ? 'Popodnevna užina' : h < 21 ? 'Večera' : 'Ostalo';
    return { date: toIso(now), time: pad(h) + ':' + pad(now.getMinutes()), type: type, food: '', allergens: [], reaction: false, symptoms: [], severity: 'Blaga', onset: '', note: '', photo: '' };
  }

  function photoRowHtml() {
    var f = ui.form;
    return (f.photo ? '<img src="' + esc(f.photo) + '" alt="Odabrana fotografija">' : '') +
      '<label class="file-btn">' + ICON.camera + (f.photo ? 'Zamijeni fotografiju' : 'Dodaj fotografiju') +
      '<input type="file" accept="image/*" id="fPhotoInput"></label>' +
      (f.photo ? '<button type="button" class="btn" data-action="f-photo-remove">Ukloni</button>' : '');
  }

  function chipsHtml(list, action, selected, extraClass, knownList) {
    return list.map(function (v) {
      var k = knownList && knownList.indexOf(v) >= 0;
      return '<button type="button" class="chip' + (extraClass || '') + (k ? ' warn' : '') + '" data-action="' + action + '" data-val="' + esc(v) + '" aria-pressed="' + (selected.indexOf(v) >= 0) + '">' +
        (k ? ICON.warnSm : '') + esc(v) + (k ? '<span class="sr-only"> (poznata alergija)</span>' : '') + '</button>';
    }).join('');
  }

  function renderForm() {
    var host = $('#formHost');
    $('#fab').hidden = !!ui.form || ui.picking || !activeChild();
    if (!ui.form) { host.innerHTML = ui.picking ? pickerHtml() : ''; return; }
    if (ui.formKind === 'dose') renderDoseForm(host);
    else if (ui.formKind === 'temp') renderTempForm(host);
    else renderMealForm(host);
  }

  function formShell(title, body, saveLabel) {
    var child = activeChild();
    return '<section class="card form" id="formCard" aria-labelledby="formTitle">' +
      '<div class="form-head"><div><h2 id="formTitle">' + esc(title) + '</h2><p class="muted" style="font-size:14px">Dijete: ' + esc(child ? child.name : '') + '</p></div>' +
      '<button type="button" class="icon-btn" data-action="close-form" aria-label="Zatvori obrazac">' + ICON.x + '</button></div>' +
      '<div class="grid2"><div class="field"><label for="fDate">Datum</label><input id="fDate" class="input" type="date" data-field="date" value="' + esc(ui.form.date) + '" required></div>' +
      '<div class="field"><label for="fTime">Vrijeme</label><input id="fTime" class="input" type="time" data-field="time" value="' + esc(ui.form.time) + '" required></div></div>' +
      body +
      '<div id="fError" class="alert-err" role="alert" hidden></div>' +
      '<div class="form-actions"><button type="button" class="btn" data-action="close-form">Odustani</button>' +
      '<button type="button" class="btn btn-primary" data-action="save">' + esc(saveLabel) + '</button></div></section>';
  }

  function renderDoseForm(host) {
    var f = ui.form, meds = childMeds(activeChild());
    var isNew = f.medId === '__new';
    host.innerHTML = formShell(ui.editingId ? 'Uredi terapiju' : 'Nova terapija',
      '<fieldset><legend>Lijek</legend><div class="chips">' + meds.map(function (m) {
        return '<button type="button" class="chip sq" data-action="f-med" data-val="' + esc(m.id) + '" aria-pressed="' + (f.medId === m.id) + '">' + esc(m.name) + '</button>';
      }).join('') +
      '<button type="button" class="chip sq dashed-chip" data-action="f-med" data-val="__new" aria-pressed="' + isNew + '">' + ICON.plus + 'Novi lijek</button></div></fieldset>' +
      '<div id="fNewMed" class="new-med"' + (isNew ? '' : ' hidden') + '>' +
      '<div class="grid2"><div class="field"><label for="fNewMedName">Naziv novog lijeka</label><input id="fNewMedName" class="input" type="text" maxlength="80" data-field="newMedName" value="' + esc(f.newMedName) + '" placeholder="npr. Ibuprofen sirup" autocomplete="off"></div>' +
      '<div class="field"><label for="fNewMedUnit">Jedinica</label><select id="fNewMedUnit" class="input" data-field="newMedUnit">' + UNIT_KEYS.map(function (u) {
        return '<option value="' + esc(u) + '"' + (f.newMedUnit === u ? ' selected' : '') + '>' + esc(u) + '</option>';
      }).join('') + '</select></div></div>' +
      '<span class="hint">Lijek će se spremiti u popis lijekova, gdje mu kasnije možeš dodati uobičajenu dozu i razmak.</span></div>' +
      '<div class="field"><label for="fDose">Doza</label><div class="input-unit"><input id="fDose" class="input" type="text" inputmode="decimal" data-field="dose" value="' + esc(f.dose) + '" placeholder="npr. 5">' +
      '<span id="fDoseUnit"></span></div></div>' +
      '<div id="fDoseInfo"></div>' +
      '<div class="field"><label for="fNote">Bilješka</label><textarea id="fNote" class="input" rows="2" data-field="note" maxlength="1000" placeholder="Zašto je dano, kako je dijete reagiralo…">' + esc(f.note) + '</textarea></div>',
      ui.editingId ? 'Spremi promjene' : 'Spremi terapiju');
    updateDoseInfo();
  }

  function currentDoseUnit() {
    var f = ui.form; if (!f) return '';
    if (f.medId === '__new') return f.newMedUnit;
    var m = medById(f.medId);
    return m ? m.unit : '';
  }

  function updateDoseInfo() {
    var el = $('#fDoseInfo'); if (!el || !ui.form) return;
    var f = ui.form, m = medById(f.medId);
    var u = $('#fDoseUnit'); if (u) u.textContent = unitLabel(currentDoseUnit(), parseNum(f.dose));
    if (!m || !f.date || !f.time) { el.innerHTML = ''; return; }
    var at = stamp(f.date, f.time);
    var last = lastDoseOf(m.id, at, ui.editingId);
    if (!last) { el.innerHTML = '<p class="muted" style="font-size:14px">Za ovaj lijek još nema ranije upisane doze.</p>'; return; }
    var gap = at - stamp(last.date, last.time);
    var info = 'Prethodna doza: ' + whenText(last.date, last.time) + ' (' + doseText(last.dose, last.unit) + '), ' + (gap < 60000 ? 'u isto vrijeme' : durText(gap) + ' ranije') + '.';
    if (m.interval && gap < m.interval * 3600000) {
      el.innerHTML = '<div class="alert-warn" role="alert">' + esc(info) + ' Upisani najmanji razmak za ovaj lijek je ' + esc(fmtNum(m.interval)) + ' h.</div>';
    } else {
      el.innerHTML = '<p class="muted" style="font-size:14px">' + esc(info) + '</p>';
    }
  }

  function renderTempForm(host) {
    var f = ui.form;
    host.innerHTML = formShell(ui.editingId ? 'Uredi mjerenje' : 'Novo mjerenje temperature',
      '<div class="field"><label for="fTemp">Temperatura (°C)</label><div class="input-unit"><input id="fTemp" class="input temp-input" type="text" inputmode="decimal" data-field="value" value="' + esc(f.value) + '" placeholder="npr. 38,2"><span>°C</span>' +
      '<span id="fTempBadge"></span></div></div>' +
      '<fieldset><legend>Način mjerenja</legend><div class="chips">' + TEMP_METHODS.map(function (m) {
        return '<button type="button" class="chip sq" data-action="f-method" data-val="' + esc(m) + '" aria-pressed="' + (f.method === m) + '">' + esc(m) + '</button>';
      }).join('') + '</div></fieldset>' +
      '<div class="field"><label for="fNote">Bilješka</label><textarea id="fNote" class="input" rows="2" data-field="note" maxlength="1000" placeholder="Kako se dijete osjeća, drugi simptomi…">' + esc(f.note) + '</textarea></div>',
      ui.editingId ? 'Spremi promjene' : 'Spremi mjerenje');
    updateTempBadge();
  }

  function updateTempBadge() {
    var el = $('#fTempBadge'); if (!el || !ui.form) return;
    var v = parseNum(ui.form.value);
    if (isNaN(v) || v < 34 || v > 43) { el.innerHTML = ''; return; }
    var lv = tempLevel(v);
    el.innerHTML = '<span class="badge ' + lv.cls + '">' + lv.label + '</span>';
  }

  function renderMealForm(host) {
    var f = ui.form, child = activeChild(), known = knownOf(child);
    host.innerHTML =
      '<section class="card form" id="formCard" aria-labelledby="formTitle">' +
      '<div class="form-head"><div><h2 id="formTitle">' + (ui.editingId ? 'Uredi obrok' : 'Novi obrok') + '</h2><p class="muted" style="font-size:14px">Dijete: ' + esc(child ? child.name : '') + '</p></div>' +
      '<button type="button" class="icon-btn" data-action="close-form" aria-label="Zatvori obrazac">' + ICON.x + '</button></div>' +

      '<div class="grid2"><div class="field"><label for="fDate">Datum</label><input id="fDate" class="input" type="date" data-field="date" value="' + esc(f.date) + '" required></div>' +
      '<div class="field"><label for="fTime">Vrijeme</label><input id="fTime" class="input" type="time" data-field="time" value="' + esc(f.time) + '" required></div></div>' +

      '<fieldset><legend>Obrok</legend><div class="chips">' + TYPES.map(function (t) {
        return '<button type="button" class="chip sq" data-action="f-type" data-val="' + esc(t) + '" aria-pressed="' + (f.type === t) + '">' + esc(t) + '</button>';
      }).join('') + '</div></fieldset>' +

      '<div class="field"><label for="fFood">Što je dijete jelo?</label>' +
      '<textarea id="fFood" class="input" rows="2" data-field="food" maxlength="300" placeholder="npr. zobena kaša s bananom i bademovim napitkom">' + esc(f.food) + '</textarea>' +
      '<span class="hint">Upiši jelo i glavne namirnice, po mogućnosti i marku proizvoda.</span></div>' +

      '<fieldset><legend>Alergeni u obroku</legend><div class="chips">' + chipsHtml(ALLERGENS, 'f-allergen', f.allergens, '', known) + '</div>' +
      '<div id="fWarn" class="alert-warn" role="alert" style="margin-top:10px" hidden></div></fieldset>' +

      '<fieldset><legend>Je li bilo reakcije?</legend><div class="seg2">' +
      '<button type="button" class="seg ok" data-action="f-react" data-val="0" aria-pressed="' + !f.reaction + '">Bez reakcije</button>' +
      '<button type="button" class="seg bad" data-action="f-react" data-val="1" aria-pressed="' + f.reaction + '">Bila je reakcija</button></div></fieldset>' +

      '<div id="fReactBox" class="react-box"' + (f.reaction ? '' : ' hidden') + '>' +
      '<fieldset><legend>Simptomi</legend><div class="chips">' + chipsHtml(SYMPTOMS, 'f-symptom', f.symptoms, ' warn') + '</div></fieldset>' +
      '<div class="row-wrap"><fieldset><legend>Jačina</legend><div class="seg3">' + SEVERITY.map(function (s) {
        return '<button type="button" class="seg ' + SEV_CLASS[s] + '" data-action="f-severity" data-val="' + s + '" aria-pressed="' + (f.severity === s) + '">' + s + '</button>';
      }).join('') + '</div></fieldset>' +
      '<div class="field"><label for="fOnset">Nakon koliko minuta?</label><input id="fOnset" class="input" type="number" min="0" max="1440" inputmode="numeric" data-field="onset" value="' + esc(f.onset) + '" placeholder="npr. 20"></div></div></div>' +

      '<div class="field"><label for="fNote">Bilješka</label><textarea id="fNote" class="input" rows="3" data-field="note" maxlength="2000" placeholder="Koliko je pojelo, gdje je jelo, što je dano kao terapija, napomene za liječnika…">' + esc(f.note) + '</textarea></div>' +

      '<div class="field"><span class="label">Fotografija obroka ili deklaracije</span><div class="photo-row" id="fPhotoRow">' + photoRowHtml() + '</div></div>' +

      '<div id="fError" class="alert-err" role="alert" hidden></div>' +
      '<div class="form-actions"><button type="button" class="btn" data-action="close-form">Odustani</button>' +
      '<button type="button" class="btn btn-primary" data-action="save">' + (ui.editingId ? 'Spremi promjene' : 'Spremi obrok') + '</button></div>' +
      '</section>';
    updateWarn();
  }

  function updateWarn() {
    var el = $('#fWarn'); if (!el || !ui.form) return;
    var child = activeChild(), known = knownOf(child);
    var hits = ui.form.allergens.filter(function (a) { return known.indexOf(a) >= 0; });
    el.hidden = !hits.length;
    el.textContent = hits.length ? 'Pažnja: ' + hits.join(', ') + (hits.length > 1 ? ' su' : ' je') + ' na popisu poznatih alergija (' + child.name + ').' : '';
  }

  function showError(msg) { var el = $('#fError'); if (el) { el.hidden = !msg; el.textContent = msg || ''; } }

  function nowParts() {
    var now = new Date();
    return { date: toIso(now), time: pad(now.getHours()) + ':' + pad(now.getMinutes()) };
  }

  function openForm(kind, entry) {
    if (!activeChild()) return;
    ui.confirmDeleteId = null; ui.picking = false;
    ui.formKind = kind;
    var n = nowParts();
    if (kind === 'dose') {
      var meds = childMeds(activeChild());
      ui.editingId = entry ? entry.id : null;
      ui.form = entry
        ? { date: entry.date, time: entry.time, medId: medById(entry.medId) ? entry.medId : '__new', newMedName: entry.medName, newMedUnit: entry.unit || 'ml', dose: fmtNum(entry.dose), note: entry.note || '' }
        : { date: n.date, time: n.time, medId: meds.length ? meds[0].id : '__new', newMedName: '', newMedUnit: 'ml', dose: '', note: '' };
      if (!entry && meds.length && meds[0].dose !== '' && meds[0].dose != null) ui.form.dose = fmtNum(meds[0].dose);
    } else if (kind === 'temp') {
      ui.editingId = entry ? entry.id : null;
      var lastT = ofChild(data.temps, activeChild()).sort(byNewest)[0];
      ui.form = entry
        ? { date: entry.date, time: entry.time, value: fmtNum(entry.value), method: entry.method || '', note: entry.note || '' }
        : { date: n.date, time: n.time, value: '', method: lastT ? lastT.method : 'Pazuh', note: '' };
    } else if (entry) {
      ui.editingId = entry.id;
      ui.form = {
        date: entry.date, time: entry.time, type: entry.type, food: entry.food,
        allergens: entry.allergens.slice(), reaction: !!entry.reaction, symptoms: entry.symptoms.slice(),
        severity: entry.severity || 'Blaga', onset: entry.onset === '' || entry.onset == null ? '' : String(entry.onset),
        note: entry.note || '', photo: entry.photo || ''
      };
    } else {
      ui.editingId = null;
      ui.form = blankForm();
    }
    renderForm();
    renderList();
    var card = $('#formCard');
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      var target = entry ? $('#formTitle')
        : kind === 'temp' ? $('#fTemp')
        : kind === 'dose' ? (ui.form.medId === '__new' ? $('#fNewMedName') : $('#fDose'))
        : $('#fFood');
      if (target) { if (entry) target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
    }
  }

  function closeForm() {
    ui.form = null; ui.editingId = null; ui.formKind = null; ui.picking = false;
    renderForm();
  }

  function saveForm() {
    if (ui.formKind === 'dose') return saveDose();
    if (ui.formKind === 'temp') return saveTemp();
    return saveMeal();
  }

  function finishSave(wasEdit, msg) {
    closeForm();
    renderAll();
    flash(msg);
    $('#main').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function saveDose() {
    var f = ui.form, child = activeChild();
    var existing = data.doses.filter(function (x) { return x.id === ui.editingId; })[0];
    var med = null, newMed = null;
    if (f.medId === '__new') {
      var name = String(f.newMedName || '').trim();
      if (!name) { showError('Upiši naziv lijeka ili odaberi lijek iz popisa.'); $('#fNewMedName').focus(); return; }
      med = childMeds(child).filter(function (m) { return norm(m.name) === norm(name); })[0] || null;
      if (!med) med = newMed = { id: uid(), childId: existing ? existing.childId : child.id, name: name, unit: f.newMedUnit || 'ml', dose: '', interval: '', note: '' };
    } else {
      med = medById(f.medId);
      if (!med) { showError('Odaberi lijek.'); return; }
    }
    var dose = parseNum(f.dose);
    if (isNaN(dose) || dose <= 0) { showError('Upiši dozu kao broj, npr. 5 ili 2,5.'); $('#fDose').focus(); return; }
    if (!f.date || !f.time) { showError('Upiši datum i vrijeme.'); return; }
    if (newMed) newMed.dose = dose;
    var entry = {
      id: existing ? existing.id : uid(),
      childId: existing ? existing.childId : child.id,
      medId: med.id, medName: med.name, unit: med.unit,
      date: f.date, time: f.time, dose: dose,
      note: String(f.note || '').trim()
    };
    var prevD = data.doses, prevM = data.meds;
    if (newMed) data.meds = prevM.concat([newMed]);
    data.doses = existing ? prevD.map(function (x) { return x.id === entry.id ? entry : x; }) : [entry].concat(prevD);
    if (!persist()) {
      data.doses = prevD; data.meds = prevM;
      showError('Spremanje nije uspjelo — preglednik ne dopušta spremanje podataka.');
      return;
    }
    finishSave(!!existing, existing ? 'Terapija je ažurirana.' : (newMed ? 'Terapija je spremljena, a lijek dodan u popis.' : 'Terapija je spremljena.'));
  }

  function saveTemp() {
    var f = ui.form, child = activeChild();
    var v = parseNum(f.value);
    if (isNaN(v)) { showError('Upiši temperaturu, npr. 38,2.'); $('#fTemp').focus(); return; }
    if (v < 34 || v > 43) { showError('Temperatura mora biti između 34 i 43 °C.'); $('#fTemp').focus(); return; }
    if (!f.date || !f.time) { showError('Upiši datum i vrijeme mjerenja.'); return; }
    var existing = data.temps.filter(function (x) { return x.id === ui.editingId; })[0];
    var entry = {
      id: existing ? existing.id : uid(),
      childId: existing ? existing.childId : child.id,
      date: f.date, time: f.time, value: Math.round(v * 10) / 10,
      method: f.method || '', note: String(f.note || '').trim()
    };
    var prev = data.temps;
    data.temps = existing ? prev.map(function (x) { return x.id === entry.id ? entry : x; }) : [entry].concat(prev);
    if (!persist()) {
      data.temps = prev;
      showError('Spremanje nije uspjelo — preglednik ne dopušta spremanje podataka.');
      return;
    }
    finishSave(!!existing, existing ? 'Mjerenje je ažurirano.' : 'Mjerenje je spremljeno.');
  }

  function saveMeal() {
    var f = ui.form;
    if (!String(f.food).trim()) { showError('Upiši što je dijete jelo.'); $('#fFood').focus(); return; }
    if (!f.date || !f.time) { showError('Upiši datum i vrijeme obroka.'); return; }
    var existing = data.entries.filter(function (x) { return x.id === ui.editingId; })[0];
    var entry = {
      id: existing ? existing.id : uid(),
      childId: existing ? existing.childId : data.activeChild,
      date: f.date, time: f.time, type: f.type,
      food: String(f.food).trim(), allergens: f.allergens.slice(),
      reaction: !!f.reaction,
      symptoms: f.reaction ? f.symptoms.slice() : [],
      severity: f.reaction ? f.severity : '',
      onset: f.reaction && f.onset !== '' ? Math.max(0, Number(f.onset) || 0) : '',
      note: String(f.note || '').trim(),
      photo: f.photo || ''
    };
    var prev = data.entries;
    data.entries = existing
      ? prev.map(function (x) { return x.id === entry.id ? entry : x; })
      : [entry].concat(prev);
    if (!persist()) {
      data.entries = prev;
      showError(entry.photo
        ? 'Spremanje nije uspjelo — u pregledniku nema dovoljno mjesta. Pokušaj bez fotografije.'
        : 'Spremanje nije uspjelo — preglednik ne dopušta spremanje podataka (npr. privatni način rada).');
      return;
    }
    var wasEdit = !!existing;
    closeForm();
    renderAll();
    flash(wasEdit ? 'Obrok je ažuriran.' : 'Obrok je spremljen.');
    $('#main').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function readPhoto(file) {
    if (!file || !/^image\//.test(file.type)) return;
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      var max = 900, w = img.naturalWidth, h = img.naturalHeight;
      var s = Math.min(1, max / Math.max(w, h));
      var cv = document.createElement('canvas');
      cv.width = Math.round(w * s); cv.height = Math.round(h * s);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      if (!ui.form) return;
      ui.form.photo = cv.toDataURL('image/jpeg', 0.72);
      $('#fPhotoRow').innerHTML = photoRowHtml();
    };
    img.onerror = function () { URL.revokeObjectURL(url); showError('Fotografiju nije moguće učitati.'); };
    img.src = url;
  }

  function toggleIn(arr, v) {
    var i = arr.indexOf(v);
    if (i >= 0) arr.splice(i, 1); else arr.push(v);
    return i < 0;
  }

  // ---------- export ----------
  function exportCsv() {
    var child = activeChild(); if (!child) return;
    function asc(a, b) { return (a.date + a.time).localeCompare(b.date + b.time); }
    function hrDate(iso) { var d = parseIso(iso); return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() + '.'; }
    function cell(v) { v = String(v == null ? '' : v); return /[";\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
    var head, rows, kindName;
    if (ui.tab === 'all') {
      kindName = 'sve';
      head = ['Datum', 'Vrijeme', 'Vrsta', 'Opis', 'Detalji', 'Bilješka'];
      rows = timelineItems(child).reverse().map(function (x) {
        var it = x.item;
        if (x.kind === 'meal') return [hrDate(x.date), x.time, 'Obrok · ' + it.type, it.food,
          [it.allergens.length ? 'Alergeni: ' + it.allergens.join(', ') : '', it.reaction ? 'Reakcija: ' + it.severity : 'Bez reakcije'].filter(Boolean).join('; '), it.note];
        if (x.kind === 'react') return [hrDate(x.date), x.time, 'Reakcija', it.symptoms.join(', ') || 'Reakcija',
          (it.severity ? it.severity + '; ' : '') + it.onset + ' min nakon obroka: ' + it.food, ''];
        if (x.kind === 'dose') return [hrDate(x.date), x.time, 'Terapija', doseMedName(it), doseText(it.dose, it.unit), it.note];
        return [hrDate(x.date), x.time, 'Temperatura', fmtNum(it.value.toFixed(1)) + ' °C', it.method, it.note];
      });
    } else if (ui.tab === 'doses') {
      kindName = 'terapije';
      head = ['Datum', 'Vrijeme', 'Lijek', 'Doza', 'Jedinica', 'Bilješka'];
      rows = ofChild(data.doses, child).sort(asc).map(function (d) {
        return [hrDate(d.date), d.time, doseMedName(d), fmtNum(d.dose), unitLabel(d.unit, d.dose), d.note];
      });
    } else if (ui.tab === 'temps') {
      kindName = 'temperatura';
      head = ['Datum', 'Vrijeme', 'Temperatura (°C)', 'Način mjerenja', 'Bilješka'];
      rows = ofChild(data.temps, child).sort(asc).map(function (t) {
        return [hrDate(t.date), t.time, fmtNum(t.value.toFixed(1)), t.method, t.note];
      });
    } else {
      kindName = 'obroci';
      head = ['Datum', 'Vrijeme', 'Obrok', 'Jelo', 'Alergeni', 'Reakcija', 'Jačina', 'Simptomi', 'Nakon (min)', 'Bilješka'];
      rows = childEntries(child).slice().sort(asc).map(function (e) {
        return [hrDate(e.date), e.time, e.type, e.food, e.allergens.join(', '),
          e.reaction ? 'Da' : 'Ne', e.reaction ? e.severity : '', e.symptoms.join(', '), e.reaction ? e.onset : '', e.note];
      });
    }
    var lines = [head.join(';')].concat(rows.map(function (r) { return r.map(cell).join(';'); }));
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tanjuric-' + kindName + '-' + norm(child.name).replace(/[^a-z0-9]+/g, '-') + '-' + toIso(new Date()) + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  // ---------- events ----------
  function addChild() {
    var input = $('#newChild');
    var name = input ? input.value.trim() : '';
    if (!name) { if (input) input.focus(); return; }
    var c = { id: uid(), name: name, allergies: [] };
    data.children.push(c);
    data.activeChild = c.id;
    ui.addingChild = false; ui.editingAllergies = true;
    closeForm();
    persist();
    renderAll();
    flash('Dodano dijete: ' + name + '. Označi poznate alergije u kartici „Poznate alergije”.');
  }

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-action]');
    if (!b) return;
    var a = b.getAttribute('data-action'), v = b.getAttribute('data-val'), id = b.getAttribute('data-id');
    var f = ui.form;
    switch (a) {
      case 'new':
        if (ui.tab !== 'all') { openForm(ui.tab === 'doses' ? 'dose' : ui.tab === 'temps' ? 'temp' : 'meal', null); break; }
        if (!activeChild()) break;
        ui.form = null; ui.editingId = null; ui.formKind = null; ui.confirmDeleteId = null; ui.picking = true;
        renderForm(); renderList();
        $('#formCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
        $('[data-fk="pick-meal"]').focus({ preventScroll: true });
        break;
      case 'pick-new': openForm(v, null); break;
      case 'tab':
        if (ui.tab === v) break;
        ui.tab = v; ui.confirmDeleteId = null; ui.medForm = null; ui.medEditingId = null; ui.confirmMedDeleteId = null;
        try { localStorage.setItem(TAB_KEY, v); } catch (e) { /* ignore */ }
        if (ui.form || ui.picking) closeForm();
        renderAll(); break;
      case 'edit-dose':
        openForm('dose', data.doses.filter(function (x) { return x.id === id; })[0]); break;
      case 'edit-temp':
        openForm('temp', data.temps.filter(function (x) { return x.id === id; })[0]); break;
      case 'f-med': {
        var prevMed = medById(f.medId), nextMed = medById(v);
        var prevDefault = prevMed && prevMed.dose !== '' && prevMed.dose != null ? fmtNum(prevMed.dose) : '';
        f.medId = v;
        b.parentNode.querySelectorAll('[data-action="f-med"]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        $('#fNewMed').hidden = v !== '__new';
        if (nextMed && nextMed.dose !== '' && nextMed.dose != null && (!f.dose || f.dose === prevDefault)) {
          f.dose = fmtNum(nextMed.dose); $('#fDose').value = f.dose;
        }
        showError('');
        updateDoseInfo();
        if (v === '__new') $('#fNewMedName').focus();
        break;
      }
      case 'f-method':
        f.method = f.method === v ? '' : v;
        b.parentNode.querySelectorAll('[data-action="f-method"]').forEach(function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-val') === f.method)); });
        break;
      case 'med-new':
        ui.medForm = { name: '', unit: 'ml', dose: '', interval: '', note: '' }; ui.medEditingId = null; ui.confirmMedDeleteId = null;
        renderAside(); $('#mName').focus(); break;
      case 'med-edit': {
        var em = medById(id); if (!em) break;
        ui.medEditingId = id; ui.confirmMedDeleteId = null;
        ui.medForm = { name: em.name, unit: em.unit, dose: em.dose === '' || em.dose == null ? '' : fmtNum(em.dose), interval: em.interval ? fmtNum(em.interval) : '', note: em.note || '' };
        renderAside(); $('#mName').focus(); break;
      }
      case 'med-cancel':
        ui.medForm = null; ui.medEditingId = null; renderAside(); break;
      case 'med-save': saveMed(); break;
      case 'med-ask-delete':
        ui.confirmMedDeleteId = id; ui.medForm = null; ui.medEditingId = null; renderAside();
        var md = document.querySelector('[data-fk="mdel-' + id + '"]'); if (md) md.focus();
        break;
      case 'med-delete-cancel':
        ui.confirmMedDeleteId = null; renderAside();
        var mk = document.querySelector('[data-fk="mask-' + id + '"]'); if (mk) mk.focus();
        break;
      case 'med-delete':
        data.meds = data.meds.filter(function (m) { return m.id !== id; });
        ui.confirmMedDeleteId = null;
        persist(); renderAll();
        if (ui.form && ui.formKind === 'dose') renderForm();
        flash('Lijek je uklonjen iz popisa. Već upisane terapije ostaju sačuvane.'); break;
      case 'close-form': closeForm(); break;
      case 'save': saveForm(); break;
      case 'pick-child':
        data.activeChild = id; ui.confirmDeleteId = null; ui.editingAllergies = false;
        ui.medForm = null; ui.medEditingId = null; ui.confirmMedDeleteId = null;
        closeForm(); persist(); renderAll(); break;
      case 'add-child-start':
        ui.addingChild = true; renderChildren(); $('#newChild').focus(); break;
      case 'add-child-cancel':
        ui.addingChild = false; renderChildren(); break;
      case 'add-child-confirm': addChild(); break;
      case 'child-ask-delete':
        ui.confirmChildDeleteId = data.activeChild; renderAside();
        var cdc = document.querySelector('[data-fk="child-del-cancel"]'); if (cdc) cdc.focus();
        break;
      case 'child-delete-cancel':
        ui.confirmChildDeleteId = null; renderAside();
        var cda = document.querySelector('[data-fk="child-del-ask"]'); if (cda) cda.focus();
        break;
      case 'child-delete': {
        var gone = data.children.filter(function (c) { return c.id === id; })[0];
        if (!gone) break;
        function other(x) { return x.childId !== id; }
        data.entries = data.entries.filter(other); data.meds = data.meds.filter(other);
        data.doses = data.doses.filter(other); data.temps = data.temps.filter(other);
        data.children = data.children.filter(function (c) { return c.id !== id; });
        data.activeChild = data.children.length ? data.children[0].id : null;
        ui.confirmChildDeleteId = null; ui.confirmDeleteId = null; ui.editingAllergies = false;
        ui.medForm = null; ui.medEditingId = null; ui.confirmMedDeleteId = null;
        if (!data.children.length) ui.addingChild = true;
        closeForm(); persist(); renderAll();
        flash('Dijete ' + gone.name + ' i svi njegovi zapisi su obrisani.');
        if (ui.addingChild && $('#newChild')) $('#newChild').focus();
        break;
      }
      case 'f-type':
        f.type = v;
        b.parentNode.querySelectorAll('[data-action="f-type"]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        break;
      case 'f-allergen':
        b.setAttribute('aria-pressed', String(toggleIn(f.allergens, v))); updateWarn(); break;
      case 'f-symptom':
        b.setAttribute('aria-pressed', String(toggleIn(f.symptoms, v))); break;
      case 'f-severity':
        f.severity = v;
        b.parentNode.querySelectorAll('[data-action="f-severity"]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        break;
      case 'f-react':
        f.reaction = v === '1';
        b.parentNode.querySelectorAll('[data-action="f-react"]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        $('#fReactBox').hidden = !f.reaction;
        break;
      case 'f-photo-remove':
        f.photo = ''; $('#fPhotoRow').innerHTML = photoRowHtml(); break;
      case 'edit':
        openForm('meal', data.entries.filter(function (x) { return x.id === id; })[0]); break;
      case 'ask-delete':
        ui.confirmDeleteId = id; renderList();
        var del = document.querySelector('[data-fk="del-' + id + '"]'); if (del) del.focus();
        break;
      case 'cancel-delete':
        ui.confirmDeleteId = null; renderList();
        var ask = document.querySelector('[data-fk="ask-' + id + '"]'); if (ask) ask.focus();
        break;
      case 'do-delete':
        var kind = b.getAttribute('data-kind');
        function drop(l) { return l.filter(function (x) { return x.id !== id; }); }
        data.entries = drop(data.entries); data.doses = drop(data.doses); data.temps = drop(data.temps);
        ui.confirmDeleteId = null;
        if (ui.editingId === id) closeForm();
        persist(); renderAll();
        flash(kind === 'dose' ? 'Terapija je obrisana.' : kind === 'temp' ? 'Mjerenje je obrisano.' : 'Obrok je obrisan.'); break;
      case 'toggle-reaction-filter':
        ui.fReaction = !ui.fReaction; renderList(); break;
      case 'clear-filters':
        ui.q = ''; ui.fType = ''; ui.fAllergen = ''; ui.fRange = ''; ui.fReaction = false;
        $('#q').value = ''; $('#fType').value = ''; $('#fAllergen').value = ''; $('#fRange').value = '';
        renderList(); $('#q').focus(); break;
      case 'toggle-edit-allergies':
        ui.editingAllergies = !ui.editingAllergies; renderAside();
        var t = document.querySelector('[data-fk="edit-allergies"]'); if (t) t.focus();
        break;
      case 'known-toggle': {
        var c = activeChild(); if (!c) break;
        toggleIn(c.allergies, v);
        c.allergies.sort(function (x, y) { return ALLERGENS.indexOf(x) - ALLERGENS.indexOf(y); });
        persist();
        var keepForm = ui.form;
        renderAll();
        if (keepForm) { renderForm(); }
        break;
      }
      case 'clear-demo':
        function real(e) { return !e.demo; }
        data.entries = data.entries.filter(real); data.meds = data.meds.filter(real);
        data.doses = data.doses.filter(real); data.temps = data.temps.filter(real);
        data.children = data.children.filter(function (c) {
          return !c.demo || [data.entries, data.meds, data.doses, data.temps].some(function (l) { return l.some(function (e) { return e.childId === c.id; }); });
        });
        data.children.forEach(function (c) { delete c.demo; });
        if (!data.children.length) { data.activeChild = null; ui.addingChild = true; }
        if (auth.user) {
          var pr = readJson('tanjuric.prefs.' + auth.user.id) || {};
          pr.demoCleared = true; writeJson('tanjuric.prefs.' + auth.user.id, pr);
        }
        closeForm(); persist(); renderAll();
        if (ui.addingChild && $('#newChild')) $('#newChild').focus();
        break;
      case 'import-legacy': {
        var L = ui.legacy; if (!L) break;
        function keep(x) { return !x.demo; }
        data = { v: 1, activeChild: null, children: L.children.filter(keep), entries: L.entries.filter(keep),
          meds: L.meds.filter(keep), doses: L.doses.filter(keep), temps: L.temps.filter(keep) };
        data.activeChild = data.children.length ? data.children[0].id : null;
        try { localStorage.setItem(STORE_KEY + '.imported', '1'); } catch (e) { /* ignore */ }
        ui.legacy = null; ui.addingChild = !data.children.length;
        closeForm(); persist(); renderAll();
        flash('Podaci s ovog uređaja preneseni su na tvoj račun.'); break;
      }
      case 'skip-legacy':
        try { localStorage.setItem(STORE_KEY + '.imported', '1'); } catch (e) { /* ignore */ }
        ui.legacy = null; renderDemoBanner(); break;
      case 'sign-in': signIn(); break;
      case 'sign-out': signOut(); break;
      case 'export-csv': exportCsv(); break;
      case 'print': window.print(); break;
    }
  });

  document.addEventListener('input', function (ev) {
    var t = ev.target;
    if (t.id === 'q') { ui.q = t.value; renderList(); return; }
    var field = t.getAttribute('data-field');
    if (field && ui.form) {
      ui.form[field] = t.value;
      if (field === 'food' || field === 'dose' || field === 'value' || field === 'newMedName') showError('');
      if (ui.formKind === 'dose' && (field === 'date' || field === 'time' || field === 'newMedUnit' || field === 'dose')) updateDoseInfo();
      if (ui.formKind === 'temp' && field === 'value') updateTempBadge();
      return;
    }
    var mfield = t.getAttribute('data-mfield');
    if (mfield && ui.medForm) { ui.medForm[mfield] = t.value; var me = $('#mError'); if (me) me.hidden = true; }
  });

  function saveMed() {
    var m = ui.medForm, child = activeChild(); if (!m || !child) return;
    var err = $('#mError');
    function fail(msg, focusSel) { err.hidden = false; err.textContent = msg; if (focusSel) $(focusSel).focus(); }
    var name = String(m.name || '').trim();
    if (!name) return fail('Upiši naziv lijeka.', '#mName');
    var dup = childMeds(child).filter(function (x) { return x.id !== ui.medEditingId && norm(x.name) === norm(name); })[0];
    if (dup) return fail('Lijek s tim nazivom već je u popisu.', '#mName');
    var dose = String(m.dose).trim() === '' ? '' : parseNum(m.dose);
    if (dose !== '' && (isNaN(dose) || dose <= 0)) return fail('Doza mora biti broj, npr. 5 ili 2,5.', '#mDose');
    var interval = String(m.interval).trim() === '' ? '' : parseNum(m.interval);
    if (interval !== '' && (isNaN(interval) || interval <= 0 || interval > 168)) return fail('Razmak upiši u satima, npr. 6.', '#mInterval');
    var existing = medById(ui.medEditingId);
    var med = {
      id: existing ? existing.id : uid(),
      childId: existing ? existing.childId : child.id,
      name: name, unit: m.unit || 'ml', dose: dose, interval: interval, note: String(m.note || '').trim()
    };
    var prev = data.meds;
    data.meds = existing ? prev.map(function (x) { return x.id === med.id ? med : x; }) : prev.concat([med]);
    if (!persist()) { data.meds = prev; return fail('Spremanje nije uspjelo — preglednik ne dopušta spremanje podataka.'); }
    ui.medForm = null; ui.medEditingId = null;
    renderAll();
    if (ui.form && ui.formKind === 'dose') renderForm();
    flash(existing ? 'Lijek je ažuriran.' : 'Lijek je dodan u popis.');
    var nb = document.querySelector('[data-fk="med-new"]'); if (nb) nb.focus();
  }

  document.addEventListener('change', function (ev) {
    var t = ev.target;
    if (t.id === 'fType') { ui.fType = t.value; renderList(); }
    else if (t.id === 'fAllergen') { ui.fAllergen = t.value; renderList(); }
    else if (t.id === 'fRange') { ui.fRange = t.value; renderList(); }
    else if (t.id === 'fPhotoInput') { readPhoto(t.files && t.files[0]); }
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.target.getAttribute && ev.target.getAttribute('data-mfield') && ev.key === 'Enter' && ev.target.tagName === 'INPUT') {
      ev.preventDefault(); saveMed(); return;
    }
    if (ev.target.id === 'newChild') {
      if (ev.key === 'Enter') { ev.preventDefault(); addChild(); }
      else if (ev.key === 'Escape' && data.children.length) { ui.addingChild = false; renderChildren(); }
    }
  });

  // ---------- init ----------
  $('#fType').insertAdjacentHTML('beforeend', TYPES.map(function (t) { return '<option>' + esc(t) + '</option>'; }).join(''));
  $('#fAllergen').insertAdjacentHTML('beforeend', ALLERGENS.map(function (t) { return '<option>' + esc(t) + '</option>'; }).join(''));
  function signIn() {
    var e = $('#authError'); e.hidden = true;
    if (!sb) { e.hidden = false; e.textContent = 'Prijava trenutno nije dostupna (nedostaje konfiguracija).'; return; }
    setSignInDisabled(true);
    sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } }).then(function (res) {
      if (res.error) {
        setSignInDisabled(false); e.hidden = false; e.textContent = 'Prijava nije uspjela: ' + res.error.message;
        e.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    });
  }

  // Na početnoj stranici ima više gumba za prijavu (izbornik, hero, kraj stranice).
  function setSignInDisabled(on) {
    document.querySelectorAll('[data-action="sign-in"]').forEach(function (b) { b.disabled = on; });
  }

  function signOut() {
    var u = auth.user;
    clearTimeout(sync.timer); clearTimeout(sync.retry);
    sb.auth.signOut().then(function () {
      if (u) { try { localStorage.removeItem('tanjuric.cache.' + u.id); } catch (e) { /* ignore */ } }
    });
  }

  function onUser(user) {
    if (auth.ready && (user && user.id) === (auth.user && auth.user.id)) return;
    auth.ready = true;
    auth.user = user;
    data = emptyData(); synced = {};
    ui.form = null; ui.editingId = null; ui.formKind = null; ui.legacy = null; ui.addingChild = false;
    if (!user) { setSignInDisabled(false); showScreen('login'); return; }
    var name = (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || user.email || '';
    $('#userName').textContent = name;
    $('#userAvatar').textContent = (name.trim().charAt(0) || '?').toUpperCase();
    $('#userName').title = user.email || '';
    loadUserData();
  }

  if (!sb) {
    showScreen('login');
    var ce = $('#authError'); ce.hidden = false;
    ce.textContent = 'Aplikacija nije povezana s poslužiteljem (nedostaje config.js).';
  } else {
    showScreen('loading');
    sb.auth.onAuthStateChange(function (_event, session) {
      // poziv Supabasea unutar ovog callbacka može zablokirati; odgodi
      setTimeout(function () { onUser(session ? session.user : null); }, 0);
    });
  }
  window.addEventListener('online', function () { if (sync.state === 'error') scheduleSync(0); });
  window.addEventListener('beforeunload', function (ev) {
    if (sync.busy || sync.state !== 'ok') { ev.preventDefault(); ev.returnValue = ''; }
  });
})();
