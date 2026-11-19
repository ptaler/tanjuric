(function () {
  'use strict';

  // Prijevod sučelja (i18n.js): hrvatski tekst je ključ. Spremljene vrijednosti (alergeni,
  // vrste obroka, simptomi, jačina, način mjerenja, jedinice) ostaju hrvatske u bazi i
  // prevode se samo pri prikazu (tx0), pa podijeljena djeca rade bez obzira na jezik.
  var I18N = window.I18N;
  var tx = I18N.t, tx0 = I18N.t0, txp = I18N.tp;
  var LANG = I18N.lang;
  I18N.apply();

  var ALLERGENS = ['Gluten', 'Mlijeko', 'Jaja', 'Kikiriki', 'Orašasti plodovi', 'Soja', 'Riba', 'Rakovi', 'Mekušci', 'Celer', 'Gorušica', 'Sezam', 'Sumporni dioksid', 'Lupina'];
  var TYPES = ['Doručak', 'Jutarnja užina', 'Ručak', 'Popodnevna užina', 'Večera', 'Ostalo'];
  var SYMPTOMS = ['Osip', 'Svrbež', 'Oticanje usana ili lica', 'Bol u trbuhu', 'Mučnina', 'Povraćanje', 'Proljev', 'Nadutost', 'Kašalj ili piskanje', 'Curenje nosa', 'Ekcem'];
  var SEVERITY = ['Blaga', 'Umjerena', 'Jaka'];
  var SEV_CLASS = { Blaga: 'mild', Umjerena: 'mod', Jaka: 'sev' };
  var STORE_KEY = 'tanjuric.v1';
  var TAB_KEY = 'tanjuric.tab';
  var TABS = [
    { id: 'all', label: tx('Sve'), newLabel: tx('Novi upis') },
    { id: 'meals', label: tx('Obroci'), newLabel: tx('Novi obrok') },
    { id: 'doses', label: tx('Terapije'), newLabel: tx('Nova terapija') },
    { id: 'temps', label: tx('Temperatura'), newLabel: tx('Novo mjerenje') }
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
    clock: '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    gallery: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>',
    thermo: '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M14 14.8V5a2 2 0 1 0-4 0v9.8a4 4 0 1 0 4 0z"/><path d="M12 9v7"/></svg>',
    pill: '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7z"/><path d="m8.5 8.5 7 7"/></svg>',
    camera: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    check: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>',
    people: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.2 3-5 6-5s5.4 1.8 6 5"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14.2c2.4.2 4 1.7 4.5 4.3"/></svg>',
    bell: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z"/><path d="M10 20a2.2 2.2 0 0 0 4 0"/></svg>',
    link: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
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
  function dayLabel(iso) {
    var dt = parseIso(iso);
    var dn = I18N.dayName(dt);
    var date = I18N.fullDate(dt);
    var diff = daysAgo(iso);
    if (diff === 0) return { rel: tx('Danas'), full: dn + ', ' + date };
    if (diff === 1) return { rel: tx('Jučer'), full: dn + ', ' + date };
    return { rel: dn.charAt(0).toUpperCase() + dn.slice(1), full: date };
  }
  // Oznaka dana usred rečenice: hr sve malim slovima, en samo „today” / „yesterday”.
  function relLower(iso) {
    var r = dayLabel(iso).rel;
    return LANG === 'hr' || daysAgo(iso) <= 1 ? r.toLowerCase() : r;
  }
  // Množina: hrvatski oblici su ključ prijevoda (npr. 'obrok|obroka|obroka').
  function plural(n, one, few, many) { return txp(n, one + '|' + few + '|' + many); }
  function byNewest(a, b) { return (b.date + b.time).localeCompare(a.date + a.time); }
  function fmtNum(n) { return I18N.fmtNum(n); }
  function cmpText(a, b) { return String(a).localeCompare(String(b), LANG); }
  function parseNum(s) {
    s = String(s == null ? '' : s).trim().replace(',', '.');
    return s === '' ? NaN : Number(s);
  }
  function unitLabel(unit, n) {
    var u = UNITS[unit];
    if (!u) return unit || '';
    if (isNaN(n)) return plural(1, u[0], u[1], u[2]);
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
    if (diff < 0) return tx('u budućnosti');
    if (diff < 60000) return tx('upravo sada');
    return tx('prije {d}', { d: durText(diff) });
  }
  function atText(time) { return tx('u {time}', { time: time }); }
  function whenText(date, time) { return tx('{day} u {time}', { day: dayLabel(date).rel, time: time }); }
  function tempLevel(v) {
    if (v < 37.5) return { cls: 'ok', label: tx('Normalna') };
    if (v < 38) return { cls: 'mild', label: tx('Povišena') };
    if (v < 39) return { cls: 'mod', label: tx('Vrućica') };
    return { cls: 'sev', label: tx('Visoka vrućica') };
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
        E('demo-lana', 0, '08:10', 'Doručak', tx('Zobena kaša s bademovim napitkom i bananom'), ['Gluten', 'Orašasti plodovi'], false, [], '', '', tx('Pojela cijelu porciju.')),
        E('demo-lana', 0, '12:30', 'Ručak', tx('Piletina s rižom i kuhanom mrkvom'), [], false, [], '', '', ''),
        E('demo-lana', 1, '10:00', 'Jutarnja užina', tx('Keks iz vrtića'), ['Gluten', 'Mlijeko'], true, ['Osip', 'Svrbež'], 'Umjerena', 25, tx('Osip oko usta i na obrazima, prošao nakon otprilike 2 sata. Zamoliti odgojiteljicu da provjeri deklaraciju.')),
        E('demo-lana', 1, '18:30', 'Večera', tx('Juha od povrća i kruh'), ['Gluten', 'Celer'], false, [], '', '', ''),
        E('demo-lana', 2, '08:00', 'Doručak', tx('Palačinke bez jaja sa zobenim napitkom'), ['Gluten'], false, [], '', '', tx('Recept s lanenim sjemenkama umjesto jaja — dobro prošlo.')),
        E('demo-lana', 2, '13:00', 'Ručak', tx('Riblji štapići i pire krumpir bez mlijeka'), ['Riba', 'Gluten'], true, ['Bol u trbuhu'], 'Blaga', 60, tx('Žalila se na trbuh, možda se prejela.')),
        E('demo-marko', 0, '07:45', 'Doručak', tx('Jaje na oko i tost'), ['Jaja', 'Gluten'], false, [], '', '', ''),
        E('demo-marko', 1, '16:00', 'Popodnevna užina', tx('Čokoladica s rođendana u školi'), ['Mlijeko', 'Soja', 'Orašasti plodovi'], true, ['Oticanje usana ili lica', 'Kašalj ili piskanje'], 'Jaka', 10, tx('Deklaracija: „može sadržavati tragove lješnjaka”. Dana terapija prema planu liječnika, smirilo se za 40 min. Pokazati pedijatru.')),
        E('demo-marko', 2, '12:15', 'Ručak', tx('Tjestenina bolognese'), ['Gluten', 'Celer'], false, [], '', '', '')
      ],
      meds: [
        { id: 'demo-med-par', childId: 'demo-lana', name: tx('Paracetamol sirup'), unit: 'ml', dose: 5, interval: 6, note: '120 mg / 5 ml', demo: true },
        { id: 'demo-med-cet', childId: 'demo-lana', name: tx('Cetirizin kapi'), unit: 'kap', dose: 5, interval: 10, note: tx('Kod osipa i svrbeža'),
          times: ['08:00', '20:00'], since: day(3), until: '', demo: true },
        { id: 'demo-med-sal', childId: 'demo-marko', name: tx('Salbutamol inhalator'), unit: 'potisak', dose: 2, interval: 4, note: tx('Uz komoricu'), demo: true }
      ],
      doses: [
        D('demo-lana', 'demo-med-cet', tx('Cetirizin kapi'), 'kap', 1, '10:40', 5, tx('Nakon osipa od keksa.')),
        D('demo-lana', 'demo-med-par', tx('Paracetamol sirup'), 'ml', 1, '20:15', 5, ''),
        D('demo-lana', 'demo-med-par', tx('Paracetamol sirup'), 'ml', 0, '07:10', 5, ''),
        D('demo-marko', 'demo-med-sal', tx('Salbutamol inhalator'), 'potisak', 1, '16:15', 2, tx('Piskanje nakon čokoladice.')),
        Object.assign(D('demo-lana', 'demo-med-cet', tx('Cetirizin kapi'), 'kap', 0, '08:05', 5, ''), { slotDate: day(0), slot: '08:00' })
      ],
      slots: [],
      temps: [
        T('demo-lana', 1, '20:00', 38.9, 'Uho', tx('Malaksala, odbija večeru.')),
        T('demo-lana', 1, '22:30', 38.1, 'Uho', ''),
        T('demo-lana', 0, '07:00', 38.4, 'Pazuh', ''),
        T('demo-lana', 0, '11:00', 37.4, 'Pazuh', tx('Igra se, bolje je volje.'))
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
    ['meds', 'doses', 'temps', 'slots'].forEach(function (k) { if (!Array.isArray(d[k])) d[k] = []; });
    d.meds.forEach(function (m) { if (!Array.isArray(m.times)) m.times = []; });
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
  function emptyData() { return { v: 1, activeChild: null, children: [], entries: [], meds: [], doses: [], temps: [], slots: [] }; }

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
      from: function (r) { return { id: r.id, name: r.name, allergies: r.allergies || [], owner: r.user_id }; } },
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
      to: function (m) {
        return { id: m.id, child_id: m.childId, name: m.name, unit: m.unit, dose: nz(m.dose), interval_h: nz(m.interval), note: m.note || '',
          times: m.times || [], since: m.since || null, until: m.until || null, antipyretic: !!m.antipyretic };
      },
      from: function (r) {
        return { id: r.id, childId: r.child_id, name: r.name, unit: r.unit, dose: zs(r.dose), interval: zs(r.interval_h), note: r.note,
          times: r.times || [], since: r.since || '', until: r.until || '', antipyretic: !!r.antipyretic };
      } },
    { key: 'doses', table: 'doses',
      to: function (d) {
        return { id: d.id, child_id: d.childId, med_id: d.medId || null, med_name: d.medName, unit: d.unit || '', date: d.date, time: d.time, dose: Number(d.dose), note: d.note || '',
          slot_date: d.slot ? d.slotDate : null, slot: d.slot || null, antipyretic: !!d.antipyretic, temp_id: d.tempId || null, remind_at: d.remindAt || null };
      },
      from: function (r) {
        return { id: r.id, childId: r.child_id, medId: r.med_id, medName: r.med_name, unit: r.unit, date: r.date, time: r.time, dose: Number(r.dose), note: r.note,
          slotDate: r.slot_date || '', slot: r.slot || '', antipyretic: !!r.antipyretic, tempId: r.temp_id || '', remindAt: r.remind_at || '' };
      } },
    { key: 'slots', table: 'med_slots',
      to: function (s) { return { id: s.id, child_id: s.childId, med_id: s.medId, date: s.date, slot: s.slot, time: s.time || null, skipped: !!s.skipped }; },
      from: function (r) { return { id: r.id, childId: r.child_id, medId: r.med_id, date: r.date, slot: r.slot, time: r.time || '', skipped: r.skipped }; } },
    { key: 'temps', table: 'temps',
      to: function (t) { return { id: t.id, child_id: t.childId, date: t.date, time: t.time, value: Number(t.value), method: t.method || '', note: t.note || '' }; },
      from: function (r) { return { id: r.id, childId: r.child_id, date: r.date, time: r.time, value: Number(r.value), method: r.method, note: r.note }; } }
  ];
  var synced = {};      // table -> { id: json retka zadnje potvrđene verzije }
  var fullLoadUser = null;   // korisnik čiji su podaci u ovoj sesiji cijeli dohvaćeni s poslužitelja
  var sync = { busy: false, again: false, timer: null, retry: null, state: 'ok', gen: 0 };

  // ---------- dijeljenje djeteta ----------
  // Dijete pripada vlasniku (children.user_id, u memoriji child.owner). Svi zapisi
  // djeteta spremaju se pod user_id vlasnika, i kad ih upiše drugi roditelj.
  function myId() { return auth.user ? auth.user.id : ''; }
  function childById(id) { return data.children.filter(function (c) { return c.id === id; })[0] || null; }
  function isMine(child) { return !child || !child.owner || child.owner === myId(); }
  function ownerOf(childId) { var c = childById(childId); return (c && c.owner) || myId(); }
  function rowOf(s, x) {
    var row = s.to(x);
    row.user_id = s.key === 'children' ? (x.owner || myId()) : ownerOf(x.childId);
    return row;
  }

  function setSyncState(s) {
    sync.state = s;
    var el = $('#syncStatus'); if (!el) return;
    el.className = 'sync ' + s;
    el.textContent = tx(s === 'saving' ? 'Spremanje…' : s === 'error' ? 'Nije spremljeno — pokušavam ponovno' : 'Spremljeno');
  }

  function adoptDemoParents() {
    // Ako je stvaran unos dodan primjeru djeteta, to dijete postaje stvarno.
    data.children.forEach(function (c) {
      if (!c.demo) return;
      var used = ['entries', 'meds', 'doses', 'temps', 'slots'].some(function (k) {
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
    var ups = [], dels = [];
    SYNC.forEach(function (s) {
      var prev = synced[s.table] || {}, seen = {}, rows = [];
      data[s.key].forEach(function (x) {
        if (x.demo) return;
        var row = rowOf(s, x);
        var js = JSON.stringify(row);
        seen[x.id] = js;
        if (prev[x.id] !== js) rows.push(row);
      });
      // brisanje po vlasniku retka (vlastita i podijeljena djeca)
      var byOwner = {};
      Object.keys(prev).forEach(function (id) {
        if (id in seen) return;
        var owner = JSON.parse(prev[id]).user_id;
        (byOwner[owner] = byOwner[owner] || []).push(id);
      });
      if (rows.length) ups.push({ table: s.table, rows: rows });
      Object.keys(byOwner).forEach(function (owner) { dels.push({ table: s.table, owner: owner, ids: byOwner[owner] }); });
      s._next = seen;
    });
    if (!ups.length && !dels.length) { markClean(); return; }
    sync.busy = true; setSyncState('saving');
    var p = Promise.resolve();
    ups.forEach(function (u) {   // roditelji (children) prvi
      p = p.then(function () { return sb.from(u.table).upsert(u.rows, { onConflict: 'user_id,id' }).then(check); });
    });
    dels.slice().reverse().forEach(function (d) {   // djeca prva, roditelji zadnji
      p = p.then(function () { return sb.from(d.table).delete().eq('user_id', d.owner).in('id', d.ids).then(check); });
    });
    p.then(function () {
      SYNC.forEach(function (s) { synced[s.table] = s._next; });
      sync.busy = false; sync.gen++;
      markClean();
      if (sync.again) { sync.again = false; runSync(); }
    }).catch(function (err) {
      sync.busy = false; sync.again = false;
      console.error('Sinkronizacija nije uspjela', err);
      setSyncState('error');
      clearTimeout(sync.retry);
      sync.retry = setTimeout(runSync, 8000);
      // RLS je odbio upis: vjerojatno je pristup podijeljenom djetetu prestao — osvježi pa
      // mergeServer() makne dijete i njegove neposlane izmjene.
      if (err && err.code === '42501') refreshFromServer(true);
    });
  }
  function check(res) { if (res.error) throw res.error; return res; }

  function markClean() {
    writeJson(cacheKey(), { dirty: false, data: data, synced: synced });
    if (!sync.busy) setSyncState('ok');
  }

  function persist() {
    if (!auth.user) return false;
    savePrefs();
    writeJson(cacheKey(), { dirty: true, data: data, synced: synced });
    setSyncState('saving');
    scheduleSync();
    schedulePhotoCleanup(30000);
    return true;
  }

  // Supabase vraća najviše „Max rows” redaka po upitu (zadano 1000), pa se tablica čita
  // stranicu po stranicu. Nepotpun dohvat bi izgledao kao da su upisi obrisani na poslužitelju.
  // Straniči se po ključu (user_id, id), a ne po pomaku, da istodobni upisi ne preskoče redak.
  // FETCH_PAGE ne smije biti veći od „Max rows” u postavkama projekta.
  var FETCH_PAGE = 1000;
  function fetchTable(table) {
    var rows = [];
    function page(after) {
      var q = sb.from(table).select('*').order('user_id').order('id').limit(FETCH_PAGE);
      if (after) {
        var u = '"' + after.user_id + '"', i = '"' + String(after.id).replace(/["\\]/g, '\\$&') + '"';
        q = q.or('user_id.gt.' + u + ',and(user_id.eq.' + u + ',id.gt.' + i + ')');
      }
      return q.then(check).then(function (res) {
        var got = res.data || [];
        rows = rows.concat(got);
        return got.length < FETCH_PAGE ? rows : page(got[got.length - 1]);
      });
    }
    return page(null);
  }

  function fetchAll() {
    return Promise.all(SYNC.map(function (s) {
      return fetchTable(s.table).then(function (rows) { return { s: s, rows: rows }; });
    })).then(function (parts) {
      var d = emptyData(), map = {};
      parts.forEach(function (p) {
        map[p.s.table] = {};
        p.rows.forEach(function (r) {
          var obj = p.s.from(r);
          d[p.s.key].push(obj);
          var back = p.s.to(obj); back.user_id = r.user_id;
          map[p.s.table][obj.id] = JSON.stringify(back);
        });
      });
      return { data: d, synced: map };
    });
  }

  // Spoji stanje s poslužitelja (server) s lokalnim podacima, s obzirom na zadnju
  // potvrđenu verziju (base). Lokalne izmjene koje još nisu poslane ostaju, a
  // dodaci, izmjene i brisanja drugog roditelja (ili drugog uređaja) se preuzimaju.
  function mergeServer(server, base) {
    var out = { v: 1, activeChild: data.activeChild };
    SYNC.forEach(function (s) {
      var b = base[s.table] || {}, srvJs = server.synced[s.table] || {}, srv = {}, local = {}, list = [];
      server.data[s.key].forEach(function (x) { srv[x.id] = x; });
      data[s.key].forEach(function (x) {
        if (x.demo) { list.push(x); return; }
        local[x.id] = true;
        var js = JSON.stringify(rowOf(s, x));
        if (x.id in srv) list.push(js === b[x.id] ? srv[x.id] : x);   // nepromijenjeno lokalno → verzija s poslužitelja
        else if (!(x.id in b) || js !== b[x.id]) list.push(x);        // novo ili izmijenjeno lokalno → ostaje
        // inače: obrisano na poslužitelju
      });
      server.data[s.key].forEach(function (x) {
        if (!local[x.id] && !(x.id in b)) list.push(x);                // dodano drugdje
      });
      if (s.key === 'children') {
        // dijete drugog vlasnika koje više ne postoji na poslužitelju = pristup je prestao
        list = list.filter(function (c) { return c.demo || isMine(c) || c.id in srvJs; });
      }
      out[s.key] = list;
    });
    var kids = {};
    out.children.forEach(function (c) { kids[c.id] = true; });
    SYNC.forEach(function (s) {
      if (s.key !== 'children') out[s.key] = out[s.key].filter(function (x) { return kids[x.childId]; });
    });
    // samo primjeri lokalno, a na poslužitelju ima stvarne djece → primjeri odlaze
    if (server.data.children.length && !Object.keys(base.children || {}).length &&
        data.children.every(function (c) { return c.demo; })) {
      out = server.data; out.activeChild = data.activeChild;
    }
    return normalize(out);
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
    fullLoadUser = null;
    var cached = readJson(cacheKey());
    return fetchAll().then(function (res) {
      fullLoadUser = auth.user.id;
      var server = res.data;
      var prefs = readJson('tanjuric.prefs.' + auth.user.id) || {};
      var isEmpty = !server.children.length;
      if (cached && cached.dirty && normalize(cached.data)) {
        data = cached.data;               // lokalne promjene koje nisu stigle na poslužitelj
        data = mergeServer(res, cached.synced || {});
        synced = res.synced;
        scheduleSync(0);
      } else if (!isEmpty) {
        data = server; synced = res.synced;
      } else {
        synced = res.synced;
        data = prefs.demoCleared ? emptyData() : demoData();
        ui.legacy = legacyData();
      }
      data.activeChild = prefs.activeChild || null;
      if (!data.children.length) ui.addingChild = true;
      showScreen('app');
      renderAll();
      setSyncState('ok');
      migrateInlinePhotos();
      schedulePhotoCleanup(15000);
      loadShares();
      checkPendingInvite();
      loadPushState();
      applyOpenRequest();
    }).catch(function (err) {
      console.error(err);
      if (cached && normalize(cached.data)) {
        data = cached.data; synced = cached.synced || {};
        showScreen('app'); renderAll(); setSyncState('error'); scheduleSync(8000);
        flash(tx('Nema veze s poslužiteljem — prikazana je zadnja spremljena kopija s ovog uređaja.'));
      } else {
        showScreen('login');
        var e = $('#authError'); e.hidden = false; e.textContent = tx('Učitavanje podataka nije uspjelo. Provjeri internetsku vezu i pokušaj ponovno.');
      }
    });
  }

  // Osvježi podatke s poslužitelja (promjene drugog roditelja ili drugog uređaja).
  // Ne dira ništa dok je otvoren obrazac ili potvrda, da se ne izgubi što korisnik radi.
  var refreshing = false;
  function uiBusy() {
    return !!(ui.form || ui.medForm || ui.occEdit || ui.exp || ui.addingChild || ui.picking || ui.editingAllergies ||
      ui.confirmDeleteId || ui.confirmMedDeleteId || ui.confirmChildDeleteId || ui.shareConfirm);
  }
  function refreshFromServer(force) {
    if (!sb || !auth.user || refreshing || sync.busy) return Promise.resolve(false);
    if (!force && uiBusy()) return Promise.resolve(false);
    var user = auth.user, gen = sync.gen;
    refreshing = true;
    return fetchAll().then(function (res) {
      refreshing = false;
      if (auth.user !== user || sync.busy || sync.gen !== gen) return false;   // u međuvremenu je nešto poslano
      if (!force && uiBusy()) return false;
      var before = JSON.stringify(data);
      var prevKids = data.children.slice();
      data = mergeServer(res, synced);
      synced = res.synced;
      fullLoadUser = user.id;
      writeJson(cacheKey(), { dirty: sync.state !== 'ok', data: data, synced: synced });
      if (JSON.stringify(data) === before) return true;
      var lost = prevKids.filter(function (c) { return !c.demo && !childById(c.id); });
      if (!childById(data.activeChild)) data.activeChild = data.children.length ? data.children[0].id : null;
      if (!data.children.length) ui.addingChild = true;
      renderAll();
      if (lost.length) flash(tx('Dijete {name} više nije dostupno na tvom računu.', { name: lost.map(function (c) { return c.name; }).join(', ') }));
      if (sync.state !== 'ok') scheduleSync(0);
      return true;
    }).catch(function (err) { refreshing = false; console.error('Osvježavanje nije uspjelo', err); return false; });
  }

  // ---------- dijeljenje: stanje, pozivnice ----------
  var INVITE_KEY = 'tanjuric.invite';
  var shares = {};    // child_id -> { owner: {id,name,email}, members: [{id,name,email,since}] }
  var invites = {};   // child_id -> { token, expires_at } (samo za vlastitu djecu)
  function personName(p) { return p && (p.name || p.email) || tx('drugi korisnik'); }
  function inviteLink(token) { return location.origin + location.pathname + '?pozivnica=' + token; }

  function loadShares() {
    if (!sb || !auth.user) return Promise.resolve();
    var user = auth.user;
    return Promise.all([
      sb.rpc('child_shares').then(check),
      sb.from('child_invites').select('token, child_id, expires_at').gt('expires_at', new Date().toISOString()).then(check)
    ]).then(function (r) {
      if (auth.user !== user) return;
      var s = {}, inv = {};
      (r[0].data || []).forEach(function (x) { s[x.child_id] = { owner: x.owner, members: x.members || [] }; });
      (r[1].data || []).forEach(function (x) { inv[x.child_id] = x; });
      var changed = JSON.stringify([s, inv]) !== JSON.stringify([shares, invites]);
      shares = s; invites = inv;
      if (changed) { renderChildren(); renderAside(); }
    }).catch(function (err) { console.error('Podaci o dijeljenju nisu dostupni', err); });
  }

  // Poveznica ?pozivnica=<token>: zapamti je (preživi prijavu preko Googlea) i makni iz adrese.
  (function captureInvite() {
    try {
      var params = new URLSearchParams(location.search), t = params.get('pozivnica');
      if (!t) return;
      if (/^[0-9a-f]{32}$/.test(t)) localStorage.setItem(INVITE_KEY, t);
      params.delete('pozivnica');
      var qs = params.toString();
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
    } catch (e) { /* ignore */ }
  })();
  function pendingInvite() { try { return localStorage.getItem(INVITE_KEY) || ''; } catch (e) { return ''; } }
  function clearInvite() { try { localStorage.removeItem(INVITE_KEY); } catch (e) { /* ignore */ } ui.invite = null; }

  // ---------- podsjetnici (Web Push) ----------
  // Uređaj se pretplati na obavijesti (push_subscribe); šalje ih Edge Function push-reminders,
  // koju pg_cron poziva svake minute (supabase/migrations/20261117120000_push_reminders.sql).
  // push.prefs: null = podsjetnici na ovom uređaju isključeni, inače { daily, partner }.
  var push = { reg: null, sub: null, prefs: null, busy: false, err: '' };

  function pushSupported() {
    return !!(sb && window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window);
  }
  function isIos() { return /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  function isStandalone() { return navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches); }
  function pushOn() { return !!(push.sub && push.prefs); }

  function swReady() {
    if (push.reg) return Promise.resolve(push.reg);
    if (!('serviceWorker' in navigator)) return Promise.resolve(null);
    return navigator.serviceWorker.register('sw.js').then(function (r) { push.reg = r; return r; })
      .catch(function (err) { console.error('Service worker nije registriran', err); return null; });
  }

  function b64uBytes(s) {
    var b = atob(String(s).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), out = new Uint8Array(b.length);
    for (var i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
    return out;
  }
  function timeZone() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; } }

  function savePushSub(sub, prefs) {
    var j = sub.toJSON();
    return sb.rpc('push_subscribe', {
      p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_tz: timeZone(), p_lang: LANG,
      p_daily: prefs.daily, p_partner: prefs.partner
    }).then(check).then(function (res) { return res.data; });
  }

  // Stanje ovog uređaja: postoji li pretplata u pregledniku i pripada li prijavljenom korisniku.
  function loadPushState() {
    push.sub = null; push.prefs = null; push.err = '';
    if (!pushSupported() || !auth.user) return Promise.resolve();
    var user = auth.user;
    return swReady().then(function (reg) {
      return reg ? reg.pushManager.getSubscription() : null;
    }).then(function (sub) {
      if (!sub || auth.user !== user) return null;
      return sb.from('push_subscriptions').select('daily, partner, tz, lang').eq('endpoint', sub.endpoint).then(check).then(function (res) {
        var row = res.data && res.data[0];
        if (auth.user !== user || !row) return;   // uređaj nema pretplatu za ovaj račun
        push.sub = sub; push.prefs = { daily: row.daily, partner: row.partner };
        // promijenjen jezik ili vremenska zona: osvježi da obavijesti stižu točno i na pravom jeziku
        if (row.lang !== LANG || row.tz !== timeZone()) savePushSub(sub, push.prefs).catch(function () { /* sljedeći put */ });
      });
    }).catch(function (err) { console.error('Stanje podsjetnika nije dostupno', err); })
      .then(function () { if (auth.user === user) { renderRemindCard(activeChild()); if (ui.form) updateFormReminder(); } });
  }

  function enablePush() {
    if (push.busy) return;
    push.busy = true; push.err = ''; renderRemindCard(activeChild());
    var user = auth.user;
    Notification.requestPermission().then(function (perm) {
      if (perm !== 'granted') throw { quiet: true };
      return Promise.all([swReady(), sb.rpc('push_public_key').then(check)]);
    }).then(function (r) {
      var reg = r[0], key = r[1].data;
      if (!reg) throw new Error('no service worker');
      if (!key) throw { msg: tx('Podsjetnici još nisu spremni na poslužitelju. Pokušaj ponovno za minutu.') };
      var opts = { userVisibleOnly: true, applicationServerKey: b64uBytes(key) };
      return reg.pushManager.subscribe(opts).catch(function () {
        // stara pretplata s drugim ključem: makni je i pretplati se ponovno
        return reg.pushManager.getSubscription().then(function (old) {
          return (old ? old.unsubscribe() : Promise.resolve()).then(function () { return reg.pushManager.subscribe(opts); });
        });
      });
    }).then(function (sub) {
      var prefs = { daily: true, partner: true };
      return savePushSub(sub, prefs).then(function () {
        if (auth.user !== user) return;
        push.sub = sub; push.prefs = prefs;
        flash(tx('Podsjetnici su uključeni na ovom uređaju.'));
      });
    }).catch(function (err) {
      if (!(err && err.quiet)) {
        console.error('Uključivanje podsjetnika nije uspjelo', err);
        push.err = (err && err.msg) || tx('Uključivanje podsjetnika nije uspjelo. Provjeri internetsku vezu i pokušaj ponovno.');
      }
    }).then(function () {
      push.busy = false;
      renderRemindCard(activeChild());
      if (ui.form) updateFormReminder();
      var back = $('[data-fk="push-off"]') || $('[data-fk="push-on"]'); if (back) back.focus({ preventScroll: true });
    });
  }

  function setPushPref(name, on) {
    if (!pushOn()) return;
    var prev = push.prefs;
    push.prefs = Object.assign({}, prev); push.prefs[name] = on;
    savePushSub(push.sub, push.prefs).catch(function (err) {
      console.error(err);
      push.prefs = prev; push.err = tx('Spremanje nije uspjelo. Provjeri internetsku vezu i pokušaj ponovno.');
      renderRemindCard(activeChild());
    });
  }

  // Isključi podsjetnike na ovom uređaju (i pri odjavi, da obavijesti ne stižu na tuđi uređaj).
  function disablePush() {
    var sub = push.sub;
    push.sub = null; push.prefs = null; push.err = '';
    if (!sub) return Promise.resolve();
    var del = sb && auth.user ? sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint).then(check) : Promise.resolve();
    return Promise.all([del, sub.unsubscribe()]).catch(function (err) { console.error('Isključivanje podsjetnika', err); });
  }

  // Obavijest otvara aplikaciju s ?terapije=<child_id>: prikaži to dijete na kartici Terapije.
  var openRequest = null;
  (function captureOpen() {
    try {
      var params = new URLSearchParams(location.search), c = params.get('terapije');
      if (c == null) return;
      openRequest = c;
      params.delete('terapije');
      var qs = params.toString();
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
    } catch (e) { /* ignore */ }
  })();
  function applyOpenRequest() {
    var id = openRequest; openRequest = null;
    if (id == null || !auth.user) return;
    if (childById(id)) { data.activeChild = id; savePrefs(); }
    if (ui.form || ui.picking) closeForm();
    ui.tab = 'doses'; ui.occEdit = null; ui.medForm = null; ui.medEditingId = null;
    try { localStorage.setItem(TAB_KEY, 'doses'); } catch (e) { /* ignore */ }
    renderAll();
    $('#main').scrollIntoView({ block: 'start' });
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', function (ev) {
      if (!ev.data || ev.data.type !== 'open') return;
      try { openRequest = new URL(ev.data.url).searchParams.get('terapije'); } catch (e) { return; }
      applyOpenRequest();
      refreshNow();   // obavijest drugog roditelja: dohvati njegov upis
    });
  }

  // Kartica „Podsjetnici” na kartici Terapije.
  function renderRemindCard(child) {
    var el = $('#remindCard'); if (!el) return;
    var show = !!(sb && auth.user && child && ui.tab === 'doses' && (childMeds(child).length || pushOn()));
    el.hidden = !show;
    if (!show) { el.innerHTML = ''; return; }
    var html = '<h2>' + ICON.bell + tx('Podsjetnici') + '</h2>';
    if (!pushSupported()) {
      html += '<p class="share-lead">' + (isIos() && !isStandalone()
        ? tx('Na iPhoneu podsjetnici rade kad Tanjurić dodaš na početni zaslon: u Safariju dodirni Dijeli, zatim „Dodaj na početni zaslon”, pa otvori Tanjurić odande.')
        : tx('Ovaj preglednik ne podržava obavijesti.')) + '</p>';
    } else if (!pushOn() && Notification.permission === 'denied') {
      html += '<p class="share-lead">' + tx('Obavijesti za Tanjurić blokirane su u postavkama preglednika. Dopusti ih ondje, pa uključi podsjetnike.') + '</p>';
    } else if (!pushOn()) {
      html += '<p class="share-lead">' + tx('Obavijest na ovom uređaju kad je vrijeme za svakodnevnu terapiju, kad prođe razmak do sljedeće doze i kad drugi roditelj upiše lijek.') + '</p>' +
        '<button type="button" class="btn" data-action="push-on" data-fk="push-on"' + (push.busy ? ' disabled' : '') + '>' + ICON.bell + tx('Uključi podsjetnike') + '</button>';
    } else {
      var shared = Object.keys(shares).length > 0;
      html += '<div class="check-col"><label class="check"><input type="checkbox" data-push="daily"' + (push.prefs.daily ? ' checked' : '') + '>' + tx('Svakodnevne terapije u zadano vrijeme') + '</label>' +
        (shared ? '<label class="check"><input type="checkbox" data-push="partner"' + (push.prefs.partner ? ' checked' : '') + '>' + tx('Kad netko drugi upiše dozu') + '</label>' : '') + '</div>' +
        '<span class="hint">' + tx('Uz dozu lijeka s upisanim razmakom možeš zatražiti podsjetnik kad razmak prođe.') + '</span>' +
        '<button type="button" class="btn-link grey" data-action="push-off" data-fk="push-off">' + tx('Isključi na ovom uređaju') + '</button>';
    }
    if (push.err) html += '<span class="alert-err" role="alert">' + esc(push.err) + '</span>';
    el.innerHTML = html;
  }

  // Podsjetnik kad prođe razmak: trenutak (ms) ili 0 ako ga za taj lijek i vrijeme nema smisla nuditi.
  function remindTarget(m, date, time) {
    if (!pushOn() || !m || !m.interval || !date || !time) return 0;
    var at = stamp(date, time) + Number(m.interval) * 3600000;
    return at > Date.now() + 60000 ? at : 0;
  }
  function remindIso(ms) { return new Date(ms).toISOString().slice(0, 19) + '+00:00'; }   // oblik kao iz baze
  function remindCheckHtml(field, on, at) {
    var d = new Date(at), iso = toIso(d), hm = pad(d.getHours()) + ':' + pad(d.getMinutes());
    var when = iso === isoOffset(0) ? atText(hm) : iso === isoOffset(1) ? tx('sutra u {time}', { time: hm }) : whenText(iso, hm);
    return '<label class="check"><input type="checkbox" data-field="' + field + '"' + (on ? ' checked' : '') + '>' +
      esc(tx('Podsjeti me kad prođe razmak ({when})', { when: when })) + '</label>';
  }
  // Početno stanje kvačice: kao kod zadnje doze tog lijeka (tko traži podsjetnik, traži ga svaki put).
  function remindDefault(medId, beforeStamp, exceptId) {
    var last = lastDoseOf(medId, beforeStamp, exceptId);
    return !!(last && last.remindAt);
  }
  function updateFormReminder() {
    if (ui.formKind === 'dose') updateDoseInfo();
    else if (ui.formKind === 'temp') updateApInfo();
  }

  function checkPendingInvite() {
    var token = pendingInvite();
    if (!token || !sb || !auth.user) return;
    var user = auth.user;
    sb.rpc('child_invite_info', { p_token: token }).then(check).then(function (res) {
      if (auth.user !== user) return;
      var info = res.data || { status: 'invalid' };
      if (info.status === 'member') {
        clearInvite();
        if (childById(info.child_id)) { data.activeChild = info.child_id; savePrefs(); renderAll(); }
        flash(tx('Već vidiš dnevnik za dijete {name}.', { name: info.child_name || '' }));
        return;
      }
      ui.invite = { token: token, status: info.status, childId: info.child_id, childName: info.child_name || '', owner: info.owner, busy: false, err: '' };
      renderDemoBanner();
    }).catch(function (err) { console.error('Pozivnicu nije moguće provjeriti', err); });
  }

  function acceptInvite() {
    var inv = ui.invite; if (!inv || inv.busy) return;
    inv.busy = true; inv.err = ''; renderDemoBanner();
    sb.rpc('accept_child_invite', { p_token: inv.token }).then(check).then(function () {
      clearInvite();
      return refreshFromServer(true).then(function (ok) {
        if (!ok) return loadUserData();
      });
    }).then(function () {
      if (childById(inv.childId)) data.activeChild = inv.childId;
      ui.addingChild = false;
      savePrefs(); renderAll(); loadShares();
      flash(tx('Sada zajedno vodite dnevnik za dijete {name}.', { name: inv.childName }));
    }).catch(function (err) {
      console.error(err);
      inv.busy = false;
      inv.err = tx('Prihvaćanje pozivnice nije uspjelo. Pozivnica je možda istekla ili je već iskorištena.');
      renderDemoBanner();
    });
  }

  function inviteBannerHtml() {
    var inv = ui.invite; if (!inv) return '';
    var who = esc(personName(inv.owner)), child = '<strong>' + esc(inv.childName) + '</strong>';
    var body, actions;
    if (inv.status === 'ok') {
      body = tx('{who} te poziva da zajedno vodite dnevnik za dijete {child}. Vidjet ćeš i moći upisivati obroke, terapije i temperaturu, a sve što upišeš vidjet će i {who}.', { who: who, child: child });
      actions = '<button type="button" class="btn btn-primary" data-action="invite-accept" data-fk="invite-accept"' + (inv.busy ? ' disabled' : '') + '>' +
        tx(inv.busy ? 'Prihvaćam…' : 'Prihvati poziv') + '</button>' +
        '<button type="button" class="btn-link" data-action="invite-dismiss"' + (inv.busy ? ' disabled' : '') + '>' + tx('Odbij') + '</button>';
    } else if (inv.status === 'own') {
      body = tx('Ovo je pozivnica za tvoje dijete {child}. Pošalji poveznicu drugom roditelju da je otvori na svom računu.', { child: child });
      actions = '<button type="button" class="btn-link" data-action="invite-dismiss">' + tx('U redu') + '</button>';
    } else {
      body = tx('Pozivnica ne vrijedi: istekla je ili je već iskorištena. Zamoli roditelja da ti pošalje novu poveznicu.');
      actions = '<button type="button" class="btn-link" data-action="invite-dismiss">' + tx('U redu') + '</button>';
    }
    return '<div class="demo invite-banner" role="region" aria-label="' + tx('Pozivnica') + '"><span>' + body + '</span>' + actions +
      (inv.err ? '<span class="alert-err" role="alert">' + esc(inv.err) + '</span>' : '') + '</div>';
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
    confirmChildDeleteId: null, picking: false, occEdit: null, exp: null,
    invite: null, shareConfirm: null, shareBusy: false, shareErr: ''
  };
  try {
    var savedTab = localStorage.getItem(TAB_KEY);
    ui.hideAp = localStorage.getItem('tanjuric.hideAp') === '1';
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
    return ofChild(data.meds, child).sort(function (a, b) { return cmpText(a.name, b.name); });
  }
  function medById(id) { return data.meds.filter(function (m) { return m.id === id; })[0] || null; }
  // Antipiretici: lijekovi za snižavanje temperature. Poznati nazivi označe se sami.
  var AP_NAMES = /(neofen|nurofen|ibuprofen|brufen|ibuprom|dalsy|lupocet|paracetamol|panadol|plicet|efferalgan|calpol|perfalgan|daleron|febricet|paracet)/i;
  function looksAntipyretic(name) { return AP_NAMES.test(String(name || '')); }
  function isApDose(d) { var m = medById(d.medId); return m ? !!m.antipyretic : !!d.antipyretic; }
  function childApMeds(child) { return childMeds(child).filter(function (m) { return m.antipyretic; }); }
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
  // Popis prikazuje samo najnovije dane s upisima; ostatak se otvara gumbom „Prikaži starije”.
  // Broj prikazanih dana vraća se na početni kad se promijeni kartica, dijete ili filtar.
  var DAYS_FIRST = 14, DAYS_MORE = 30;
  function shownDays(groups) {
    var child = activeChild();
    var key = [ui.tab, child ? child.id : '', ui.q.trim(), ui.fType, ui.fAllergen, ui.fRange, ui.fReaction, ui.hideAp].join('|');
    if (ui.daysKey !== key) { ui.daysKey = key; ui.daysShown = DAYS_FIRST; }
    return groups.slice(0, ui.daysShown);
  }
  function moreHtml(groups, shown, countOf) {
    var rest = groups.slice(shown.length);
    if (!rest.length) return '';
    var n = 0;
    rest.forEach(function (g) { n += countOf(g); });
    var next = Math.min(DAYS_MORE, rest.length);
    return '<div class="list-more"><button type="button" class="btn" data-action="show-more" data-fk="show-more">' + tx('Prikaži starije') +
      '<span class="sr-only"> ' + tx('upise') + '</span></button><span class="muted">' + tx('Još {days}', { days: rest.length + ' ' + plural(rest.length, 'dan', 'dana', 'dana') }) +
      ' · ' + n + ' ' + plural(n, 'upis', 'upisa', 'upisa') + (next < rest.length ? ' ' + tx('(sljedećih {n} dana)', { n: next }) : '') + '</span></div>';
  }
  function daysHtml(list, itemHtml, forms) {
    var groups = groupByDay(list), shown = shownDays(groups);
    return shown.map(function (g) {
      var l = dayLabel(g.date);
      return '<section class="day"><div class="day-head"><h2>' + esc(l.rel) + '</h2><span class="muted" style="font-size:14px">' + esc(l.full) + '</span>' +
        '<span class="n">' + g.items.length + ' ' + plural(g.items.length, forms[0], forms[1], forms[2]) + '</span></div>' +
        g.items.map(itemHtml).join('') + '</section>';
    }).join('<div style="height:10px"></div>') + moreHtml(groups, shown, function (g) { return g.items.length; });
  }
  function emptyHtml(title, text) {
    return '<div class="empty">' + ICON.search + '<strong>' + esc(title) + '</strong><span>' + esc(text) + '</span></div>';
  }
  function actionsHtml(item, kind, what) {
    if (ui.confirmDeleteId === item.id) {
      return '<div class="confirm" role="alert"><span>' + esc(tx('Obrisati {what}?', { what: what })) + '</span>' +
        '<button type="button" class="btn btn-danger" data-action="do-delete" data-kind="' + kind + '" data-id="' + esc(item.id) + '" data-fk="del-' + esc(item.id) + '">' + tx('Obriši') + '</button>' +
        '<button type="button" class="btn" data-action="cancel-delete" data-id="' + esc(item.id) + '">' + tx('Odustani') + '</button></div>';
    }
    return '<div class="entry-actions">' +
      '<button type="button" class="btn-link" data-action="edit-' + kind + '" data-id="' + esc(item.id) + '">' + ICON.edit + tx('Uredi') + '<span class="sr-only"> ' + esc(what) + '</span></button>' +
      '<button type="button" class="btn-link grey" data-action="ask-delete" data-id="' + esc(item.id) + '" data-fk="ask-' + esc(item.id) + '">' + ICON.trash + tx('Obriši') + '<span class="sr-only"> ' + esc(what) + '</span></button></div>';
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
        '<span class="av" aria-hidden="true">' + esc(c.name.charAt(0).toUpperCase()) + '</span>' + esc(c.name) +
        (shares[c.id] ? '<span class="shared-ico" title="' + tx('Podijeljeno') + '">' + ICON.people + '<span class="sr-only">, ' + tx('podijeljeno') + '</span></span>' : '') + '</button>';
    }).join('');
    if (ui.addingChild) {
      html += '<div class="add-child"><label for="newChild" class="sr-only">' + tx('Ime djeteta') + '</label>' +
        '<input id="newChild" type="text" placeholder="' + tx('Ime djeteta') + '" maxlength="40" autocomplete="off">' +
        '<button type="button" class="btn btn-primary btn-pill" data-action="add-child-confirm">' + tx('Dodaj') + '</button>' +
        (data.children.length ? '<button type="button" class="btn btn-pill" data-action="add-child-cancel">' + tx('Odustani') + '</button>' : '') +
        '</div>';
    } else {
      html += '<button type="button" class="dashed" data-action="add-child-start" data-fk="add-child">' + ICON.plus + tx('Dodaj dijete') + '</button>';
    }
    $('#childBar').innerHTML = (data.children.length ? '<span class="muted" style="font-size:13px;margin-right:4px">' + tx('Dijete:') + '</span>' : '') + html;

    var child = activeChild();
    var known = knownOf(child);
    var kl = $('#knownLine');
    kl.hidden = !child || ui.tab !== 'meals';
    if (kl.hidden) { kl.innerHTML = ''; return; }
    kl.innerHTML = ICON.warn + '<span class="muted">' + esc(tx('Poznate alergije ({name}):', { name: child.name })) + '</span>' +
      (known.length ? known.map(function (k) { return '<span class="tag warn">' + esc(tx0(k)) + '</span>'; }).join('')
        : '<span class="muted" style="font-style:italic">' + tx('nisu upisane') + '</span>');
  }

  function renderDemoBanner() {
    var hasDemo = data.children.some(function (c) { return c.demo; }) ||
      [data.entries, data.meds, data.doses, data.temps].some(function (l) { return l.some(function (e) { return e.demo; }); });
    function realCount(l) { return l.filter(function (x) { return !x.demo; }).length; }
    var lk = ui.legacy ? realCount(ui.legacy.children) : 0, le = ui.legacy ? realCount(ui.legacy.entries) : 0;
    var legacy = ui.legacy
      ? '<div class="demo"><span>' + tx('Na ovom uređaju postoje podaci upisani prije prijave ({counts}). Prenijeti ih na tvoj račun?', {
          counts: lk + ' ' + plural(lk, 'dijete', 'djece', 'djece') + ', ' + le + ' ' + plural(le, 'obrok', 'obroka', 'obroka') }) + '</span>' +
        '<button type="button" class="btn btn-primary" data-action="import-legacy">' + tx('Prenesi podatke') + '</button>' +
        '<button type="button" class="btn-link" data-action="skip-legacy">' + tx('Ne, hvala') + '</button></div>'
      : '';
    $('#demoBanner').innerHTML = inviteBannerHtml() + legacy + (hasDemo
      ? '<div class="demo"><span>' + tx('Prikazani su <strong>primjeri</strong> da vidiš kako dnevnik izgleda. Primjeri se ne spremaju na tvoj račun.') + '</span>' +
        '<button type="button" class="btn-link" data-action="clear-demo">' + tx('Obriši primjere i kreni ispočetka') + '</button></div>'
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
        // traži i po hrvatskoj (spremljenoj) i po prevedenoj oznaci
        var hay = norm([e.food, e.note, e.type, tx0(e.type), e.allergens.join(' '), e.allergens.map(tx0).join(' '),
          e.symptoms.join(' '), e.symptoms.map(tx0).join(' '),
          e.reaction ? 'reakcija ' + e.severity + ' ' + tx('Reakcija') + ' ' + tx0(e.severity) : 'bez reakcije ' + tx('Bez reakcije')].join(' '));
        for (var i = 0; i < words.length; i++) if (hay.indexOf(words[i]) < 0) return false;
      }
      return true;
    }).sort(byNewest);
  }

  function entryHtml(e, known) {
    var tags = e.allergens.map(function (a) {
      var k = known.indexOf(a) >= 0;
      return '<span class="tag' + (k ? ' warn' : '') + '">' + esc(tx0(a)) + (k ? ' · ' + tx('poznata alergija') : '') + '</span>';
    }).join('');
    var badge = e.reaction
      ? '<span class="badge ' + (SEV_CLASS[e.severity] || 'mild') + '">' + tx('Reakcija') + ' · ' + esc(tx0(String(e.severity || '')).toLowerCase()) + '</span>'
      : '<span class="badge ok">' + tx('Bez reakcije') + '</span>';
    var symptoms = (e.reaction && e.symptoms.length)
      ? '<div class="symptoms"><strong>' + tx('Simptomi:') + '</strong> ' + esc(e.symptoms.map(tx0).join(', ')) +
        (e.onset !== '' && e.onset != null ? '<span class="muted"> · ' + esc(tx('nakon {n} min', { n: e.onset })) + '</span>' : '') + '</div>'
      : '';
    var what = tx('obrok {name}', { name: e.food });
    var actions = ui.confirmDeleteId === e.id
      ? '<div class="confirm" role="alert"><span>' + tx('Obrisati ovaj obrok?') + '</span>' +
        '<button type="button" class="btn btn-danger" data-action="do-delete" data-id="' + esc(e.id) + '" data-fk="del-' + esc(e.id) + '">' + tx('Obriši') + '</button>' +
        '<button type="button" class="btn" data-action="cancel-delete" data-id="' + esc(e.id) + '">' + tx('Odustani') + '</button></div>'
      : '<div class="entry-actions">' +
        '<button type="button" class="btn-link" data-action="edit" data-id="' + esc(e.id) + '">' + ICON.edit + tx('Uredi') + '<span class="sr-only"> ' + esc(what) + '</span></button>' +
        '<button type="button" class="btn-link grey" data-action="ask-delete" data-id="' + esc(e.id) + '" data-fk="ask-' + esc(e.id) + '">' + ICON.trash + tx('Obriši') + '<span class="sr-only"> ' + esc(what) + '</span></button></div>';
    return '<article class="entry">' +
      '<div class="when"><span class="time">' + esc(e.time) + '</span><span class="type">' + esc(tx0(e.type)) + '</span></div>' +
      '<div class="body"><div class="title-row"><h3>' + esc(e.food) + '</h3>' + badge + '</div>' +
      (tags ? '<div class="tags">' + tags + '</div>' : '') + symptoms +
      (e.note ? '<p class="note">' + esc(e.note) + '</p>' : '') + actions + '</div>' +
      (e.photo ? '<button type="button" class="photo-btn" data-action="photo-open" data-path="' + esc(e.photo) + '" data-caption="' + esc(e.food + ' · ' + dayLabel(e.date).full + ' ' + atText(e.time)) + '" aria-label="' + esc(tx('Prikaži fotografiju obroka {name} u punoj veličini', { name: e.food })) + '">' +
        photoImg(thumbPath(e.photo), tx('Fotografija obroka: {name}', { name: e.food }), 'photo') + '</button>' : '') +
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
    var sev = tx0(String(e.severity || '')).toLowerCase();
    return '<article class="entry tl-react">' +
      '<div class="when"><span class="time">' + esc(time) + '</span><span class="type">' + tx('Reakcija') + '</span></div>' +
      '<div class="body"><div class="title-row"><h3>' + esc(e.symptoms.length ? e.symptoms.map(tx0).join(', ') : tx('Reakcija')) + '</h3>' +
      (sev ? '<span class="badge ' + (SEV_CLASS[e.severity] || 'mild') + '">' + esc(sev) + '</span>' : '') + '</div>' +
      '<p class="note muted">' + esc(tx('{n} min nakon obroka: {food}', { n: e.onset, food: e.food })) + '</p></div></article>';
  }

  function renderTimeline() {
    var child = activeChild(), host = $('#list');
    if (!child) { host.innerHTML = ''; return; }
    var items = timelineItems(child), known = knownOf(child), plan = planHtml(child);
    if (!items.length) {
      host.innerHTML = plan + emptyHtml(tx('Još nema upisa'), tx('Ovdje će se na jednoj vremenskoj crti prikazivati obroci, reakcije, terapije i temperatura. Kreni gumbom „Novi upis”.'));
      return;
    }
    var KIND_NAME = { meal: tx('Obrok'), react: tx('Reakcija'), dose: tx('Terapija'), temp: tx('Temperatura') };
    var groups = groupByDay(items), shown = shownDays(groups);
    function realCount(g) { return g.items.filter(function (x) { return x.kind !== 'react'; }).length; }
    host.innerHTML = plan + shown.map(function (g) {
      var l = dayLabel(g.date);
      var n = realCount(g);
      var rows = g.items.map(function (x, i) {
        var card = x.kind === 'meal' ? entryHtml(x.item, known) : x.kind === 'dose' ? doseHtml(x.item)
          : x.kind === 'temp' ? tempHtml(x.item) : reactHtml(x.item, x.time);
        var gap = '';
        if (i > 0) {
          var prev = g.items[i - 1], ms = stamp(prev.date, prev.time) - stamp(x.date, x.time);
          gap = '<div class="tl-gap" aria-hidden="true">' + (ms > 0 ? tx('{d} kasnije ↑', { d: durText(ms) }) : tx('u isto vrijeme')) + '</div>';
        }
        return gap + '<div class="tl-item"><span class="tl-node ' + x.kind + '" role="img" aria-label="' + KIND_NAME[x.kind] + '">' + TL_ICON[x.kind] + '</span>' + card + '</div>';
      }).join('');
      return '<section class="day"><div class="day-head"><h2>' + esc(l.rel) + '</h2><span class="muted" style="font-size:14px">' + esc(l.full) + '</span>' +
        '<span class="n">' + n + ' ' + plural(n, 'upis', 'upisa', 'upisa') + '</span></div><div class="tl">' + rows + '</div></section>';
    }).join('<div style="height:10px"></div>') + moreHtml(groups, shown, realCount);
  }

  // ---------- svakodnevne terapije: plan, potvrde i pomaci ----------
  // Termin (occurrence) = lijek + datum + vrijeme iz rasporeda (slot). Potvrda je obična doza
  // s oznakom termina (slotDate/slot); pomak ili preskakanje za taj dan sprema se u data.slots.
  function medActiveOn(m, date) {
    return !!(m.times && m.times.length && (!m.since || m.since <= date) && (!m.until || date <= m.until));
  }
  function occurrences(child, date) {
    var out = [];
    childMeds(child).forEach(function (m) {
      if (!medActiveOn(m, date)) return;
      m.times.forEach(function (slot) {
        var ov = data.slots.filter(function (s) { return s.medId === m.id && s.date === date && s.slot === slot; })[0] || null;
        var dose = data.doses.filter(function (d) { return d.medId === m.id && d.slotDate === date && d.slot === slot; })[0] || null;
        out.push({ med: m, date: date, slot: slot, time: ov && ov.time ? ov.time : slot, ov: ov, dose: dose, skipped: !!(ov && ov.skipped) });
      });
    });
    return out.sort(function (a, b) { return a.time.localeCompare(b.time) || cmpText(a.med.name, b.med.name); });
  }
  function occKey(o) { return o.med.id + '|' + o.date + '|' + o.slot; }
  function findOcc(key) {
    var p = String(key || '').split('|'); if (p.length < 3) return null;
    var slot = p.pop(), date = p.pop(), medId = p.join('|');
    var child = activeChild(); if (!child) return null;
    return occurrences(child, date).filter(function (o) { return o.med.id === medId && o.slot === slot; })[0] || null;
  }
  function isoOffset(days) { var d = new Date(); d.setDate(d.getDate() + days); return toIso(d); }
  function nowHm() { var n = new Date(); return pad(n.getHours()) + ':' + pad(n.getMinutes()); }

  function occHtml(o) {
    var k = occKey(o), m = o.med, at = stamp(o.date, o.time), diff = Date.now() - at, today = toIso(new Date());
    var editing = ui.occEdit === k, moved = o.time !== o.slot;
    var doseLbl = m.dose !== '' && m.dose != null ? doseText(m.dose, m.unit) : '';
    function act(a, label, cls) { return '<button type="button" class="' + (cls || 'btn-link') + '" data-action="' + a + '" data-key="' + esc(k) + '" data-fk="' + a + '-' + esc(k) + '">' + label + '</button>'; }
    function editor(value, label, withReset) {
      return '<div class="occ-editor"><label for="occTime">' + label + '</label><input id="occTime" class="input" type="time" value="' + esc(value) + '">' +
        '<button type="button" class="btn btn-primary" data-action="occ-time-save" data-key="' + esc(k) + '">' + tx('Spremi') + '</button>' +
        '<button type="button" class="btn" data-action="occ-edit-cancel">' + tx('Odustani') + '</button>' +
        (withReset ? '<button type="button" class="btn-link" data-action="occ-reset" data-key="' + esc(k) + '">' + esc(tx('Vrati na {time}', { time: o.slot })) + '</button>' : '') + '</div>';
    }
    var state, status, actions;
    if (o.dose) {
      state = 'done';
      status = '<span class="badge ok">' + ICON.check + esc(tx('Dano u {time}', { time: o.dose.time })) + (o.dose.date !== o.date ? ' (' + esc(relLower(o.dose.date)) + ')' : '') + '</span>';
      actions = editing ? editor(o.dose.time, tx('Dano u'), false)
        : act('occ-edit', ICON.clock + tx('Promijeni vrijeme')) + act('occ-undo', tx('Poništi potvrdu'), 'btn-link grey');
    } else if (o.skipped) {
      state = 'skipped';
      status = '<span class="badge skip">' + tx('Preskočeno') + '</span>';
      actions = act('occ-unskip', tx('Poništi'));
    } else {
      state = diff >= 0 ? 'due' : 'upcoming';
      status = o.date !== today ? '<span class="badge mod">' + tx('Nije potvrđeno') + '</span>'
        : diff >= 0 ? '<span class="badge ' + (diff > 3600000 ? 'mod' : 'mild') + '">' + (diff < 60000 ? tx('Sada') : tx('Kasni {d}', { d: durText(diff) })) + '</span>'
        : '<span class="badge info">' + tx('Za {d}', { d: durText(-diff) }) + '</span>';
      actions = editing ? editor(o.time, tx('Danas u'), moved)
        : act('occ-confirm', ICON.check + tx('Potvrdi'), 'btn btn-primary occ-confirm') + act('occ-edit', ICON.clock + tx('Promijeni vrijeme')) + act('occ-skip', tx('Preskoči'), 'btn-link grey');
    }
    return '<div class="occ ' + state + '">' +
      '<div class="occ-time"><span class="time">' + esc(o.time) + '</span>' + (moved ? '<s class="muted">' + esc(o.slot) + '</s>' : '') + '</div>' +
      '<div class="occ-body"><div class="occ-title"><strong>' + esc(m.name) + '</strong>' + (doseLbl ? '<span class="muted">' + esc(doseLbl) + '</span>' : '') + status + '</div>' +
      (moved && !o.dose ? '<span class="hint">' + esc(tx(o.date === today ? 'Danas pomaknuto s {time}' : 'Taj dan pomaknuto s {time}', { time: o.slot })) + '</span>' : '') +
      '</div><div class="occ-actions">' + actions + '</div></div>';
  }

  function planHtml(child) {
    var today = isoOffset(0), yest = isoOffset(-1);
    var todayList = occurrences(child, today);
    var yList = occurrences(child, yest).filter(function (o) { return !o.dose && !o.skipped; });
    if (!todayList.length && !yList.length) return '';
    var done = todayList.filter(function (o) { return o.dose || o.skipped; }).length;
    var pct = todayList.length ? Math.round(done / todayList.length * 100) : 100;
    return '<section class="card plan" aria-labelledby="planTitle">' +
      '<div class="plan-head"><div><h2 id="planTitle">' + tx('Svakodnevne terapije') + '</h2><span class="muted">' + esc(dayLabel(today).full) + '</span></div>' +
      (todayList.length ? '<span class="plan-count">' + done + ' / ' + todayList.length + '</span>' : '') + '</div>' +
      (todayList.length ? '<div class="bar plan-bar" aria-hidden="true"><i style="width:' + pct + '%"></i></div>' : '') +
      (yList.length ? '<div class="plan-day">' + tx('Jučer — nije potvrđeno') + '</div>' + yList.map(occHtml).join('') : '') +
      (todayList.length ? (yList.length ? '<div class="plan-day">' + tx('Danas') + '</div>' : '') + todayList.map(occHtml).join('') : '') +
      '</section>';
  }

  function setSlot(o, patch) {
    var id = 'o|' + occKey(o);
    var cur = data.slots.filter(function (s) { return s.id === id; })[0];
    var next = Object.assign({ id: id, childId: o.med.childId, medId: o.med.id, date: o.date, slot: o.slot, time: '', skipped: false }, cur || {}, patch);
    if (next.time === next.slot) next.time = '';
    data.slots = data.slots.filter(function (s) { return s.id !== id; });
    if (next.time || next.skipped) data.slots.push(next);
  }

  function occAction(a, key) {
    var o = findOcc(key); if (!o) return;
    var m = o.med, msg = '';
    if (a === 'occ-confirm') {
      if (o.dose) return;
      var diff = Date.now() - stamp(o.date, o.time);
      // Potvrda unutar sat vremena od termina (ili prije njega) bilježi stvarno vrijeme, inače vrijeme termina.
      var useNow = diff > -12 * 3600000 && diff <= 3600000;
      var dose = {
        id: 'p|' + occKey(o), childId: m.childId, medId: m.id, medName: m.name, unit: m.unit,
        date: useNow ? isoOffset(0) : o.date, time: useNow ? nowHm() : o.time, dose: Number(m.dose), note: '',
        slotDate: o.date, slot: o.slot
      };
      data.doses = [dose].concat(data.doses.filter(function (d) { return d.id !== dose.id; }));
      msg = tx('Potvrđeno: {name} u {time}.', { name: m.name, time: dose.time });
    } else if (a === 'occ-undo') {
      data.doses = data.doses.filter(function (d) { return !(d.medId === m.id && d.slotDate === o.date && d.slot === o.slot); });
      msg = tx('Potvrda je poništena.');
    } else if (a === 'occ-skip') {
      setSlot(o, { skipped: true }); msg = tx('{name} u {time} je preskočen.', { name: m.name, time: o.time });
    } else if (a === 'occ-unskip') {
      setSlot(o, { skipped: false }); msg = tx('Termin je vraćen u plan.');
    } else if (a === 'occ-reset') {
      setSlot(o, { time: '' }); ui.occEdit = null; msg = tx('Termin je vraćen na {time}.', { time: o.slot });
    } else if (a === 'occ-time-save') {
      var t = ($('#occTime') && $('#occTime').value || '').slice(0, 5);
      if (!/^\d\d:\d\d$/.test(t)) { $('#occTime').focus(); return; }
      if (o.dose) {
        var upd = Object.assign({}, o.dose, { time: t });
        data.doses = data.doses.map(function (d) { return d.id === upd.id ? upd : d; });
        msg = tx('Vrijeme uzimanja promijenjeno na {time}.', { time: t });
      } else {
        setSlot(o, { time: t });
        msg = t === o.slot ? tx('Termin je vraćen na {time}.', { time: o.slot })
          : tx(o.date === isoOffset(0) ? 'Termin {slot} za danas pomaknut je na {time}.' : 'Termin {slot} za taj dan pomaknut je na {time}.', { slot: o.slot, time: t });
      }
      ui.occEdit = null;
    }
    persist(); renderAll(); flash(msg);
    var back = document.querySelector('[data-fk="occ-confirm-' + (window.CSS && CSS.escape ? CSS.escape(key) : key) + '"]') ||
      document.querySelector('[data-fk="occ-edit-' + (window.CSS && CSS.escape ? CSS.escape(key) : key) + '"]');
    if (back) back.focus({ preventScroll: true });
  }

  function pickerHtml() {
    var child = activeChild();
    function opt(kind, title, sub) {
      return '<button type="button" class="pick-opt" data-action="pick-new" data-val="' + kind + '" data-fk="pick-' + kind + '">' +
        '<span class="tl-node ' + kind + '" aria-hidden="true">' + TL_ICON[kind] + '</span><span><strong>' + title + '</strong><span class="muted">' + sub + '</span></span></button>';
    }
    return '<section class="card form" id="formCard" aria-labelledby="pickTitle">' +
      '<div class="form-head"><div><h2 id="pickTitle">' + tx('Što upisuješ?') + '</h2><p class="muted" style="font-size:14px">' + tx('Dijete:') + ' ' + esc(child ? child.name : '') + '</p></div>' +
      '<button type="button" class="icon-btn" data-action="close-form" aria-label="' + tx('Zatvori') + '">' + ICON.x + '</button></div>' +
      '<div class="pick-grid">' + opt('meal', tx('Obrok'), tx('Što je jelo i je li bilo reakcije')) +
      opt('dose', tx('Terapija'), tx('Lijek i doza')) + opt('temp', tx('Temperatura'), tx('Izmjerena vrijednost')) + '</div></section>';
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
    return '<h2>' + esc(tx('Pregled — {name}', { name: child.name })) + '</h2>' +
      '<div class="stats"><div class="stat"><b>' + meals24 + '</b><span>' + plural(meals24, 'obrok', 'obroka', 'obroka') + ' ' + tx('u zadnja 24 h') + '</span></div>' +
      '<div class="stat react"><b>' + react7 + '</b><span>' + plural(react7, 'reakcija', 'reakcije', 'reakcija') + ' ' + tx('u zadnjih 7 dana') + '</span></div>' +
      '<div class="stat"><b>' + doses24 + '</b><span>' + plural(doses24, 'doza', 'doze', 'doza') + ' ' + tx('u zadnja 24 h') + '</span></div>' +
      '<div class="stat"><b>' + (maxT == null ? '—' : esc(fmtNum(maxT.toFixed(1))) + '°') + '</b><span>' + tx('najviša temperatura u 24 h') + '</span></div></div>' +
      '<div class="tl-legend">' + leg('meal', tx('Obrok')) + leg('react', tx('Reakcija')) + leg('dose', tx('Terapija')) + leg('temp', tx('Temperatura')) + '</div>' +
      '<p class="foot-note">' + tx('Reakcija se prikazuje kao zaseban događaj kad je u obroku upisano nakon koliko se minuta javila.') + '</p>';
  }

  function doseHtml(d) {
    var title = doseMedName(d);
    return '<article class="entry">' +
      '<div class="when"><span class="time">' + esc(d.time) + '</span><span class="type">' + (d.slot ? esc(tx('Plan {time}', { time: d.slot })) : tx('Terapija')) + '</span></div>' +
      '<div class="body"><div class="title-row"><h3>' + esc(title) + '</h3><span class="badge info">' + esc(doseText(d.dose, d.unit)) + '</span></div>' +
      (isApDose(d) ? '<div class="tags"><span class="tag ap">' + ICON.thermo + tx('Antipiretik') + apTempText(d) + '</span></div>' : '') +
      (d.note ? '<p class="note">' + esc(d.note) + '</p>' : '') +
      actionsHtml(d, 'dose', tx('terapiju {name}', { name: title })) + '</div></article>';
  }
  function apTempText(d) {
    var t = d.tempId ? data.temps.filter(function (x) { return x.id === d.tempId; })[0] : null;
    return t ? ' · ' + esc(tx('uz {v} °C', { v: fmtNum(t.value.toFixed(1)) })) : '';
  }

  function renderDoses() {
    var child = activeChild(), host = $('#list');
    if (!child) { host.innerHTML = ''; return; }
    var all = ofChild(data.doses, child).sort(byNewest), plan = planHtml(child);
    var apCount = all.filter(isApDose).length;
    var list = ui.hideAp ? all.filter(function (d) { return !isApDose(d); }) : all;
    var tools = apCount ? '<div class="list-tools"><button type="button" class="toggle ap-toggle" data-action="toggle-ap" data-fk="toggle-ap" aria-pressed="' + !!ui.hideAp + '">' +
      ICON.thermo + tx('Bez antipiretika') + '</button><span class="muted">' + (ui.hideAp
        ? tx('Skriveno: {n}', { n: apCount + ' ' + plural(apCount, 'doza antipiretika', 'doze antipiretika', 'doza antipiretika') })
        : apCount + ' ' + plural(apCount, 'doza antipiretika', 'doze antipiretika', 'doza antipiretika') + ' ' + tx('u popisu')) + '</span></div>' : '';
    plan += tools;
    if (all.length && !list.length) {
      host.innerHTML = plan + emptyHtml(tx('Nema terapija bez antipiretika'), tx('Sve upisane terapije su antipiretici. Isključi filtar „Bez antipiretika” da ih vidiš.'));
      return;
    }
    if (!list.length) {
      host.innerHTML = plan + emptyHtml(tx('Još nema zabilježenih terapija'),
        childMeds(child).length ? tx('Upiši prvu terapiju gumbom „Nova terapija”, ili lijeku u kartici „Lijekovi” dodaj vremena za svakodnevnu terapiju.') : tx('Dodaj lijekove koje {name} koristi u kartici „Lijekovi”, ili odmah upiši terapiju gumbom „Nova terapija”.', { name: child.name }));
      return;
    }
    host.innerHTML = plan + daysHtml(list, doseHtml, ['terapija', 'terapije', 'terapija']);
  }

  function tempHtml(t) {
    var lv = tempLevel(t.value);
    return '<article class="entry">' +
      '<div class="when"><span class="time">' + esc(t.time) + '</span><span class="type">' + esc(t.method ? tx0(t.method) : tx('Mjerenje')) + '</span></div>' +
      '<div class="body"><div class="title-row"><h3 class="temp-val">' + esc(fmtNum(t.value.toFixed(1))) + ' °C</h3><span class="badge ' + lv.cls + '">' + lv.label + '</span></div>' +
      data.doses.filter(function (d) { return d.tempId === t.id; }).map(function (d) {
        return '<div class="tags"><span class="tag ap">' + ICON.pill + esc(tx('Dano: {name}', { name: doseMedName(d) })) + ' ' + esc(doseText(d.dose, d.unit)) + (d.time !== t.time ? ' ' + esc(atText(d.time)) : '') + '</span></div>';
      }).join('') +
      (t.note ? '<p class="note">' + esc(t.note) + '</p>' : '') +
      actionsHtml(t, 'temp', tx('mjerenje {v} °C', { v: fmtNum(t.value.toFixed(1)) })) + '</div></article>';
  }

  function renderTemps() {
    var child = activeChild(), host = $('#list');
    if (!child) { host.innerHTML = ''; return; }
    var list = ofChild(data.temps, child).sort(byNewest);
    if (!list.length) {
      host.innerHTML = emptyHtml(tx('Još nema izmjerenih temperatura'), tx('Upiši prvo mjerenje gumbom „Novo mjerenje”.'));
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
      ? tx('Pronađeno {n} od {total}', { n: list.length, total: all.length + ' ' + plural(all.length, 'obroka', 'obroka', 'obroka') })
      : tx('Ukupno {total}', { total: all.length + ' ' + plural(all.length, 'obrok', 'obroka', 'obroka') });
    $('#clearBtn').hidden = !hasFilters;
    $('#fReaction').setAttribute('aria-pressed', String(ui.fReaction));

    var host = $('#list');
    if (!child) {
      host.innerHTML = '<div class="empty">' + ICON.search + '<strong>' + tx('Dobro došli u Tanjurić') + '</strong><span>' + tx('Za početak dodaj dijete (gumb „Dodaj dijete” na vrhu), a zatim unosi obroke.') + '</span></div>';
      return;
    }
    if (!list.length) {
      host.innerHTML = '<div class="empty">' + ICON.search +
        '<strong>' + tx(all.length ? 'Nema obroka koji odgovaraju pretrazi' : 'Još nema unesenih obroka') + '</strong>' +
        '<span>' + tx(all.length ? 'Pokušaj s drugim pojmom ili očisti filtre.' : 'Dodaj prvi obrok gumbom „Novi obrok”.') + '</span></div>';
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
        (early ? '<span class="tag warn">' + esc(tx('Upisani razmak od {h} h još nije prošao', { h: fmtNum(m.interval) })) + '</span>' : '') + '</div>';
    }).filter(Boolean);
    return '<h2>' + esc(tx('Terapije — {name}', { name: child.name })) + '</h2>' +
      '<div class="stats"><div class="stat"><b>' + last24 + '</b><span>' + plural(last24, 'doza', 'doze', 'doza') + ' ' + tx('u zadnja 24 h') + '</span></div>' +
      '<div class="stat"><b>' + meds.length + '</b><span>' + plural(meds.length, 'lijek', 'lijeka', 'lijekova') + ' ' + tx('u popisu') + '</span></div></div>' +
      '<div style="display:flex;flex-direction:column;gap:10px"><span class="muted" style="font-size:14px">' + tx('Zadnja doza po lijeku') + '</span>' +
      (rows.length ? rows.join('') : '<span class="muted" style="font-size:14px;font-style:italic">' + tx('Još nema zabilježenih doza.') + '</span>') + '</div>' +
      '<p class="foot-note">' + tx('Razmak između doza upisuješ sam, prema uputi liječnika ili ljekarnika. Tanjurić ne savjetuje o doziranju.') + '</p>';
  }

  function renderTempStats(child) {
    var mine = ofChild(data.temps, child).sort(byNewest), now = Date.now();
    var last = mine[0];
    var day = mine.filter(function (t) { var s = stamp(t.date, t.time); return s <= now && now - s < 86400000; });
    var max = day.reduce(function (m, t) { return !m || t.value > m.value ? t : m; }, null);
    var spark = sparkHtml(mine.filter(function (t) { return now - stamp(t.date, t.time) < 3 * 86400000; }));
    return '<h2>' + esc(tx('Temperatura — {name}', { name: child.name })) + '</h2>' +
      '<div class="stats"><div class="stat ' + (last && last.value >= 38 ? 'react' : '') + '"><b>' + (last ? fmtNum(last.value.toFixed(1)) + '°' : '—') + '</b><span>' +
      (last ? esc(tx('zadnje mjerenje, {ago}', { ago: agoText(last.date, last.time) })) : tx('još nema mjerenja')) + '</span></div>' +
      '<div class="stat ' + (max && max.value >= 38 ? 'react' : '') + '"><b>' + (max ? fmtNum(max.value.toFixed(1)) + '°' : '—') + '</b><span>' + tx('najviša u zadnja 24 h') + '</span></div></div>' +
      spark +
      '<p class="foot-note">' + tx('Oznake (povišena od 37,5 °C, vrućica od 38 °C, visoka od 39 °C) su okvirne i ovise o načinu mjerenja i dobi djeteta. Za procjenu se obrati liječniku.') + '</p>';
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
    return '<div class="spark"><span class="muted" style="font-size:14px">' + tx('Zadnja 3 dana') + '</span>' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(tx('Grafikon temperature u zadnja 3 dana, {n}', { n: pts.length + ' ' + plural(pts.length, 'mjerenje', 'mjerenja', 'mjerenja') })) + '">' +
      '<line x1="0" x2="' + W + '" y1="' + y(38).toFixed(1) + '" y2="' + y(38).toFixed(1) + '" stroke="#FDBA74" stroke-dasharray="4 4"/>' +
      '<text x="' + (W - 2) + '" y="' + (y(38) - 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="#9A3412">38 °C</text>' +
      '<path d="' + line + '" fill="none" stroke="#0F766E" stroke-width="2" stroke-linejoin="round"/>' + dots + '</svg></div>';
  }

  function unitOptions(sel) {
    return UNIT_KEYS.map(function (u) {
      return '<option value="' + esc(u) + '"' + (sel === u ? ' selected' : '') + '>' + esc(unitLabel(u, NaN)) + '</option>';
    }).join('');
  }

  function medFormHtml() {
    var m = ui.medForm;
    return '<div class="med-form" id="medForm">' +
      '<div class="field"><label for="mName">' + tx('Naziv lijeka') + '</label><input id="mName" class="input" type="text" maxlength="80" data-mfield="name" value="' + esc(m.name) + '" placeholder="' + tx('npr. Paracetamol sirup') + '" autocomplete="off"></div>' +
      '<div class="grid2"><div class="field"><label for="mDose">' + tx('Uobičajena doza') + '</label><input id="mDose" class="input" type="text" inputmode="decimal" data-mfield="dose" value="' + esc(m.dose) + '" placeholder="' + tx('npr. 5') + '"></div>' +
      '<div class="field"><label for="mUnit">' + tx('Jedinica') + '</label><select id="mUnit" class="input" data-mfield="unit">' + unitOptions(m.unit) + '</select></div></div>' +
      '<label class="check"><input type="checkbox" id="mAp" data-mfield="antipyretic"' + (m.antipyretic ? ' checked' : '') + '>' + tx('Antipiretik (lijek za snižavanje temperature)') + '</label>' +
      '<fieldset class="med-sched"><legend>' + tx('Svakodnevno u') + '</legend>' +
      '<div class="chips">' + m.times.map(function (t) {
        return '<span class="time-chip">' + esc(t) + '<button type="button" class="chip-x" data-action="med-time-remove" data-val="' + esc(t) + '" aria-label="' + esc(tx('Ukloni {time}', { time: t })) + '">' + ICON.x + '</button></span>';
      }).join('') +
      '<span class="time-add"><label for="mTimeNew" class="sr-only">' + tx(m.times.length ? 'Dodaj još jedno vrijeme' : 'Vrijeme') + '</label><input id="mTimeNew" class="input" type="time" value=""></span></div>' +
      '<span class="hint">' + tx('Za terapiju koju dijete prima svaki dan u isto vrijeme. Upisano vrijeme doda se samo, a za svako sljedeće upiši novo. Svako uzimanje potvrđuješ u planu na kartici Terapije.') + '</span>' +
      (m.times.length ? '<div class="grid2"><div class="field"><label for="mSince">' + tx('Od') + '</label><input id="mSince" class="input" type="date" data-mfield="since" value="' + esc(m.since) + '"></div>' +
        '<div class="field"><label for="mUntil">' + tx('Do (nije obavezno)') + '</label><input id="mUntil" class="input" type="date" data-mfield="until" value="' + esc(m.until) + '"></div></div>' : '') +
      '</fieldset>' +
      '<div class="field"><label for="mInterval">' + tx('Najmanji razmak između doza (sati)') + '</label><input id="mInterval" class="input" type="text" inputmode="decimal" data-mfield="interval" value="' + esc(m.interval) + '" placeholder="' + tx('npr. 6 — nije obavezno') + '">' +
      '<span class="hint">' + tx('Prema uputi liječnika. Ako je upisan, dobit ćeš upozorenje kad je nova doza preblizu prethodnoj.') + '</span></div>' +
      '<div class="field"><label for="mNote">' + tx('Napomena') + '</label><input id="mNote" class="input" type="text" maxlength="200" data-mfield="note" value="' + esc(m.note) + '" placeholder="' + tx('npr. jačina, za što se daje') + '"></div>' +
      '<div id="mError" class="alert-err" role="alert" hidden></div>' +
      '<div class="aside-actions"><button type="button" class="btn" data-action="med-cancel">' + tx('Odustani') + '</button>' +
      '<button type="button" class="btn btn-primary" data-action="med-save">' + tx(ui.medEditingId ? 'Spremi' : 'Dodaj lijek') + '</button></div></div>';
  }

  function renderMedCard(child) {
    var mc = $('#medCard');
    mc.hidden = !child || ui.tab !== 'doses';
    if (mc.hidden) return;
    var meds = childMeds(child);
    var list = meds.map(function (m) {
      if (ui.medEditingId === m.id && ui.medForm) return medFormHtml();
      var sub = [m.dose !== '' && m.dose != null ? doseText(m.dose, m.unit) : unitLabel(m.unit, NaN), m.interval ? tx('razmak {h} h', { h: fmtNum(m.interval) }) : ''].filter(Boolean).join(' · ');
      var what = tx('lijek {name}', { name: m.name });
      var actions = ui.confirmMedDeleteId === m.id
        ? '<div class="confirm" role="alert"><span>' + tx('Ukloniti lijek iz popisa?') + '</span>' +
          '<button type="button" class="btn btn-danger" data-action="med-delete" data-id="' + esc(m.id) + '" data-fk="mdel-' + esc(m.id) + '">' + tx('Ukloni') + '</button>' +
          '<button type="button" class="btn" data-action="med-delete-cancel" data-id="' + esc(m.id) + '">' + tx('Odustani') + '</button></div>'
        : '<div class="entry-actions">' +
          '<button type="button" class="btn-link" data-action="med-edit" data-id="' + esc(m.id) + '">' + ICON.edit + tx('Uredi') + '<span class="sr-only"> ' + esc(what) + '</span></button>' +
          '<button type="button" class="btn-link grey" data-action="med-ask-delete" data-id="' + esc(m.id) + '" data-fk="mask-' + esc(m.id) + '">' + ICON.trash + tx('Ukloni') + '<span class="sr-only"> ' + esc(what) + '</span></button></div>';
      var sched = m.times && m.times.length
        ? '<span class="med-sched-line">' + ICON.clock + esc(tx('Svaki dan u {times}', { times: m.times.join(', ') })) +
          (m.until ? ' · ' + esc(tx('do {date}', { date: dayLabel(m.until).full })) : '') + (m.until && m.until < toIso(new Date()) ? ' ' + tx('(završeno)') : '') + '</span>'
        : '';
      return '<div class="med-item"><strong>' + esc(m.name) + (m.antipyretic ? ' <span class="tag ap">' + ICON.thermo + tx('Antipiretik') + '</span>' : '') + '</strong>' + (sub ? '<span class="muted">' + esc(sub) + '</span>' : '') + sched +
        (m.note ? '<span class="muted" style="font-style:italic">' + esc(m.note) + '</span>' : '') + actions + '</div>';
    }).join('');
    var adding = ui.medForm && !ui.medEditingId;
    mc.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h2>' + esc(tx('Lijekovi — {name}', { name: child.name })) + '</h2>' +
      (adding ? '' : '<button type="button" class="btn-link" data-action="med-new" data-fk="med-new">' + ICON.plus + tx('Dodaj') + '</button>') + '</div>' +
      (list ? '<div class="med-list">' + list + '</div>' : (adding ? '' : '<span class="muted" style="font-size:14px">' + tx('Popis lijekova koje dijete koristi. Pri upisu terapije biraš iz ovog popisa, a doza se sama popuni.') + '</span>')) +
      (adding ? medFormHtml() : '');
  }

  function renderAside() {
    var child = activeChild();
    var stats = $('#statsCard'), ac = $('#allergyCard');
    $('#dataCard').hidden = !child;
    if (ui.exp && child && ui.exp.medId && !medById(ui.exp.medId)) ui.exp.medId = '';
    renderExport(child);
    renderChildDelete(child);
    renderShareCard(child);
    renderMedCard(child);
    renderRemindCard(child);
    var sh = child && shares[child.id];
    $('#dataNote').textContent = sh
      ? tx('Zapise za dijete {name} vide i mogu mijenjati svi s kojima je dijete podijeljeno. CSV je tvoja kopija za liječnika ili arhivu.', { name: child.name })
      : tx('Podaci se spremaju na tvoj račun i vidljivi su samo tebi. CSV je tvoja kopija za liječnika ili arhivu.');
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

    stats.innerHTML = '<h2>' + esc(tx('Pregled — {name}', { name: child.name })) + '</h2>' +
      '<div class="stats"><div class="stat"><b>' + mine.length + '</b><span>' + plural(mine.length, 'uneseni obrok', 'unesena obroka', 'unesenih obroka') + '</span></div>' +
      '<div class="stat react"><b>' + react7 + '</b><span>' + plural(react7, 'reakcija', 'reakcije', 'reakcija') + ' ' + tx('u zadnjih 7 dana') + '</span></div></div>' +
      (last ? '<div style="font-size:14px;display:flex;flex-direction:column;gap:2px"><span class="muted">' + tx('Zadnja reakcija') + '</span><strong>' +
        esc(whenText(last.date, last.time) + ' — ' + last.food) + '</strong></div>' : '') +
      '<div style="display:flex;flex-direction:column;gap:8px"><span class="muted" style="font-size:14px">' + tx('Alergeni u obrocima s reakcijom') + '</span>' +
      (keys.length ? keys.map(function (a) {
        return '<div class="bar-row"><div class="lbl"><strong>' + esc(tx0(a)) + '</strong><span class="muted">' +
          esc(tx('{n}× u {total}', { n: counts[a], total: reacts.length + ' ' + plural(reacts.length, 'reakciji', 'reakcije', 'reakcija') })) +
          '</span></div><div class="bar" aria-hidden="true"><i style="width:' +
          Math.round(counts[a] / maxC * 100) + '%"></i></div></div>';
      }).join('') : '<span class="muted" style="font-size:14px;font-style:italic">' + tx('Još nema zabilježenih reakcija.') + '</span>') +
      '</div><p class="foot-note">' + tx('Pregled pomaže uočiti obrasce i pripremiti se za pregled kod liječnika. Ne zamjenjuje liječničku procjenu.') + '</p>';
    renderAllergyCard(child);
  }

  function renderChildDelete(child) {
    var el = $('#childDelete');
    if (!child) { el.innerHTML = ''; return; }
    if (!isMine(child)) {   // član: ukloni dijete sa svog računa (zapisi ostaju vlasniku)
      var owner = personName(shares[child.id] && shares[child.id].owner);
      el.innerHTML = ui.confirmChildDeleteId !== child.id
        ? '<button type="button" class="btn-link" data-action="child-ask-delete" data-fk="child-del-ask">' + ICON.x +
          esc(tx('Ukloni dijete {name} sa svog računa', { name: child.name })) + '</button>'
        : '<div class="confirm-box" role="group" aria-labelledby="childDelTitle">' +
          '<strong id="childDelTitle">' + esc(tx('Ukloniti dijete {name} sa svog računa?', { name: child.name })) + '</strong>' +
          '<span>' + esc(tx('Više nećeš vidjeti zapise za dijete {name}. Ništa se ne briše: zapisi ostaju na računu vlasnika ({owner}). Za ponovni pristup trebat ćeš novu pozivnicu.', { name: child.name, owner: owner })) + '</span>' +
          (ui.shareErr ? '<span class="alert-err" role="alert">' + esc(ui.shareErr) + '</span>' : '') +
          '<div class="aside-actions"><button type="button" class="btn" data-action="child-delete-cancel" data-fk="child-del-cancel">' + tx('Odustani') + '</button>' +
          '<button type="button" class="btn btn-danger" data-action="share-leave" data-id="' + esc(child.id) + '" data-fk="child-del-do"' +
          (ui.shareBusy ? ' disabled' : '') + '>' + tx('Ukloni') + '</button></div></div>';
      return;
    }
    if (ui.confirmChildDeleteId !== child.id) {
      el.innerHTML = '<button type="button" class="btn-link" data-action="child-ask-delete" data-fk="child-del-ask">' + ICON.trash +
        esc(tx('Obriši dijete {name}', { name: child.name })) + '</button>';
      return;
    }
    var counts = [
      [ofChild(data.entries, child).length, 'obrok', 'obroka', 'obroka'],
      [ofChild(data.meds, child).length, 'lijek', 'lijeka', 'lijekova'],
      [ofChild(data.doses, child).length, 'terapija', 'terapije', 'terapija'],
      [ofChild(data.temps, child).length, 'mjerenje temperature', 'mjerenja temperature', 'mjerenja temperature']
    ].filter(function (c) { return c[0] > 0; }).map(function (c) { return c[0] + ' ' + plural(c[0], c[1], c[2], c[3]); });
    var what = counts.length
      ? tx('Obrisat će se i svi zapisi ovog djeteta: {list}.', { list: counts.length > 1 ? counts.slice(0, -1).join(', ') + ' ' + tx('i') + ' ' + counts[counts.length - 1] : counts[0] })
      : tx('Za ovo dijete još nema zapisa.');
    var sharedWith = shares[child.id] ? shares[child.id].members.map(personName) : [];
    if (sharedWith.length) what += ' ' + tx('Dijete će nestati i kod: {names}.', { names: sharedWith.join(', ') });
    el.innerHTML = '<div class="confirm-box" role="group" aria-labelledby="childDelTitle">' +
      '<strong id="childDelTitle">' + esc(tx('Obrisati dijete {name}?', { name: child.name })) + '</strong>' +
      '<span>' + esc(what) + ' ' + tx('Brisanje se ne može poništiti.') + '</span>' +
      '<div class="aside-actions"><button type="button" class="btn" data-action="child-delete-cancel" data-fk="child-del-cancel">' + tx('Odustani') + '</button>' +
      '<button type="button" class="btn btn-danger" data-action="child-delete" data-id="' + esc(child.id) + '" data-fk="child-del-do">' + tx('Obriši') + '</button></div></div>';
  }

  function renderAllergyCard(child) {
    var ac = $('#allergyCard');
    var known = knownOf(child);
    ac.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h2>' + tx('Poznate alergije') + '</h2>' +
      '<button type="button" class="btn-link" data-action="toggle-edit-allergies" data-fk="edit-allergies" aria-expanded="' + ui.editingAllergies + '">' +
      tx(ui.editingAllergies ? 'Gotovo' : 'Uredi') + '</button></div>' +
      (ui.editingAllergies
        ? '<div class="chips">' + ALLERGENS.map(function (a) {
            return '<button type="button" class="chip warn" data-action="known-toggle" data-val="' + esc(a) + '" data-fk="known-' + esc(a) + '" aria-pressed="' + (known.indexOf(a) >= 0) + '">' + esc(tx0(a)) + '</button>';
          }).join('') + '</div>'
        : '<span class="muted" style="font-size:14px">' + tx('Označeni alergeni bit će istaknuti u svakom obroku, a pri unosu dobit ćeš upozorenje.') + '</span>');
  }

  function personLi(p, note, removeId) {
    var name = personName(p), initial = (name.trim().charAt(0) || '?').toUpperCase();
    var li = '<li><span class="av" aria-hidden="true">' + esc(initial) + '</span><span class="who"><strong>' + esc(name) + '</strong>' +
      (p && p.email && p.name ? '<span class="muted">' + esc(p.email) + '</span>' : '') + '</span>' +
      (note ? '<span class="tag">' + esc(note) + '</span>' : '') +
      (removeId && ui.shareConfirm !== removeId
        ? '<button type="button" class="btn-link grey" data-action="share-remove-ask" data-id="' + esc(removeId) + '" data-fk="share-rm-' + esc(removeId) + '">' + tx('Ukloni') + '</button>'
        : '') + '</li>';
    if (removeId && ui.shareConfirm === removeId) {
      var child = activeChild();
      li += '<li class="share-confirm"><div class="confirm-box" role="group" aria-label="' + tx('Uklanjanje pristupa') + '">' +
        '<strong>' + esc(tx('Ukloniti pristup za {name}?', { name: name })) + '</strong>' +
        '<span>' + esc(tx('Više neće vidjeti zapise za dijete {name}. Već upisani zapisi ostaju sačuvani.', { name: child ? child.name : '' })) + '</span>' +
        '<div class="aside-actions"><button type="button" class="btn" data-action="share-remove-cancel" data-fk="share-rm-cancel">' + tx('Odustani') + '</button>' +
        '<button type="button" class="btn btn-danger" data-action="share-remove" data-id="' + esc(removeId) + '" data-fk="share-rm-do"' +
        (ui.shareBusy ? ' disabled' : '') + '>' + tx('Ukloni pristup') + '</button></div></div></li>';
    }
    return li;
  }

  function renderShareCard(child) {
    var el = $('#shareCard');
    if (!child || child.demo || !sb || !auth.user) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    var sh = shares[child.id], me = myId(), you = { name: tx('Ti'), email: '' };
    var html = '<h2>' + ICON.people + tx('Dijeljenje') + '</h2>';
    if (!isMine(child)) {
      html += '<p class="share-lead">' + esc(tx('{owner} dijeli s tobom dnevnik za dijete {name}. Svi vidite i upisujete iste obroke, terapije i temperature.', { owner: personName(sh && sh.owner), name: child.name })) + '</p>';
      if (sh) {
        html += '<ul class="share-list" aria-label="' + tx('Pristup imaju') + '">' + personLi(sh.owner, tx('vlasnik')) +
          sh.members.map(function (m) { return m.id === me ? personLi(you) : personLi(m); }).join('') + '</ul>';
      }
      el.innerHTML = html;
      return;
    }
    var members = sh ? sh.members : [];
    if (members.length) {
      html += '<ul class="share-list" aria-label="' + tx('Pristup imaju') + '">' + personLi(you, tx('vlasnik')) +
        members.map(function (m) { return personLi(m, '', m.id); }).join('') + '</ul>';
    } else {
      html += '<p class="share-lead">' + esc(tx('Pozovi drugog roditelja da sa svog Google računa vodi dnevnik za dijete {name}. Oboje ćete vidjeti i upisivati iste obroke, terapije i temperature.', { name: child.name })) + '</p>';
    }
    var inv = invites[child.id];
    if (inv) {
      html += '<div class="share-invite"><label for="shareLink">' + tx('Poveznica za poziv') + '</label>' +
        '<input id="shareLink" class="input" type="text" readonly value="' + esc(inviteLink(inv.token)) + '">' +
        '<div class="aside-actions"><button type="button" class="btn btn-primary" data-action="share-copy" data-fk="share-copy">' + ICON.link + tx('Kopiraj') + '</button>' +
        (navigator.share ? '<button type="button" class="btn" data-action="share-send" data-fk="share-send">' + tx('Pošalji…') + '</button>' : '') + '</div>' +
        '<span class="share-hint">' + esc(tx('Poveznica vrijedi do {date} i može je iskoristiti jedna osoba. Pošalji je samo onome kome želiš dati pristup.', { date: hrDate(toIso(new Date(inv.expires_at))) })) + '</span>' +
        '<button type="button" class="btn-link grey" data-action="share-cancel-link" data-fk="share-cancel-link">' + tx('Poništi poveznicu') + '</button></div>';
    } else {
      html += '<button type="button" class="btn" data-action="share-create" data-fk="share-create"' + (ui.shareBusy ? ' disabled' : '') + '>' +
        ICON.plus + tx(members.length ? 'Pozovi još nekoga' : 'Pozovi drugog roditelja') + '</button>';
    }
    if (ui.shareErr) html += '<span class="alert-err" role="alert">' + esc(ui.shareErr) + '</span>';
    el.innerHTML = html;
  }

  // Član je uklonio dijete sa svog računa: makni ga lokalno, bez brisanja na poslužitelju.
  function dropSharedChild(id) {
    function other(x) { return x.childId !== id; }
    SYNC.forEach(function (s) {
      var gone = data[s.key].filter(function (x) { return s.key === 'children' ? x.id === id : x.childId === id; });
      gone.forEach(function (x) { if (synced[s.table]) delete synced[s.table][x.id]; });
    });
    data.entries = data.entries.filter(other); data.meds = data.meds.filter(other);
    data.doses = data.doses.filter(other); data.temps = data.temps.filter(other); data.slots = data.slots.filter(other);
    data.children = data.children.filter(function (c) { return c.id !== id; });
    delete shares[id];
    if (data.activeChild === id) data.activeChild = data.children.length ? data.children[0].id : null;
    if (!data.children.length) ui.addingChild = true;
  }

  function shareAction(a, id) {
    var child = activeChild(); if (!child || !sb) return;
    var me = myId();
    function done(msg, focus) {
      ui.shareBusy = false; ui.shareErr = '';
      renderAll();
      if (msg) flash(msg);
      var f = focus && document.querySelector('[data-fk="' + focus + '"]'); if (f) f.focus();
    }
    function fail(msg) { return function (err) { console.error(err); ui.shareBusy = false; ui.shareErr = msg; renderAside(); }; }
    switch (a) {
      case 'share-create':
        if (!synced.children || !synced.children[child.id]) {
          ui.shareErr = tx('Dijete se još sprema na poslužitelj. Pokušaj ponovno za trenutak.'); scheduleSync(0); renderAside(); return;
        }
        ui.shareBusy = true; ui.shareErr = ''; renderAside();
        sb.rpc('create_child_invite', { p_child_id: child.id }).then(check).then(function (res) {
          invites[child.id] = res.data;
          done('', 'share-copy');
        }).catch(fail(tx('Pozivnicu nije moguće napraviti. Provjeri internetsku vezu i pokušaj ponovno.')));
        break;
      case 'share-copy': {
        var inp = $('#shareLink'); if (!inp) return;
        var copied = navigator.clipboard ? navigator.clipboard.writeText(inp.value) : Promise.reject(new Error('clipboard'));
        copied.then(function () { flash(tx('Poveznica je kopirana. Pošalji je drugom roditelju.')); })
          .catch(function () { inp.focus(); inp.select(); flash(tx('Poveznica je označena — kopiraj je i pošalji.')); });
        break;
      }
      case 'share-send': {
        var inv = invites[child.id]; if (!inv || !navigator.share) return;
        navigator.share({ title: 'Tanjurić', text: tx('Pozivam te da u Tanjuriću zajedno vodimo dnevnik za dijete {name}.', { name: child.name }), url: inviteLink(inv.token) })
          .catch(function () { /* korisnik je odustao */ });
        break;
      }
      case 'share-cancel-link': {
        var tok = invites[child.id] && invites[child.id].token; if (!tok) return;
        ui.shareBusy = true; renderAside();
        sb.from('child_invites').delete().eq('token', tok).then(check).then(function () {
          delete invites[child.id];
          done(tx('Poveznica je poništena i više ne vrijedi.'), 'share-create');
        }).catch(fail(tx('Poništavanje nije uspjelo. Pokušaj ponovno.')));
        break;
      }
      case 'share-remove-ask':
        ui.shareConfirm = id; ui.shareErr = ''; renderAside();
        var c = document.querySelector('[data-fk="share-rm-cancel"]'); if (c) c.focus();
        break;
      case 'share-remove-cancel':
        var back = ui.shareConfirm; ui.shareConfirm = null; renderAside();
        var r = document.querySelector('[data-fk="share-rm-' + back + '"]'); if (r) r.focus();
        break;
      case 'share-remove': {
        var sh = shares[child.id], who = sh && sh.members.filter(function (m) { return m.id === id; })[0];
        ui.shareBusy = true; renderAside();
        sb.from('child_members').delete().match({ owner_id: me, child_id: child.id, member_id: id }).then(check).then(function () {
          ui.shareConfirm = null;
          if (sh) { sh.members = sh.members.filter(function (m) { return m.id !== id; }); if (!sh.members.length) delete shares[child.id]; }
          done(tx('{who} više nema pristup dnevniku za dijete {name}.', { who: personName(who), name: child.name }), 'share-create');
          loadShares();
        }).catch(fail(tx('Uklanjanje pristupa nije uspjelo. Pokušaj ponovno.')));
        break;
      }
      case 'share-leave':
        if (isMine(child) || child.id !== id) return;
        ui.shareBusy = true; ui.shareErr = ''; renderAside();
        sb.from('child_members').delete().match({ owner_id: child.owner, child_id: child.id, member_id: me }).then(check).then(function () {
          ui.confirmChildDeleteId = null;
          dropSharedChild(child.id);
          closeForm(); persist();
          done(tx('Dijete {name} više nije na tvom računu.', { name: child.name }));
          if (ui.addingChild && $('#newChild')) $('#newChild').focus();
        }).catch(fail(tx('Uklanjanje nije uspjelo. Provjeri internetsku vezu i pokušaj ponovno.')));
        break;
    }
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
    if (f.photoBusy) return '<span class="photo-busy" role="status">' + tx('Spremam fotografiju…') + '</span>';
    return (f.photo ? '<button type="button" class="photo-btn" data-action="photo-open" data-path="' + esc(f.photo) + '" data-caption="' + esc(f.food || tx('Odabrana fotografija')) + '" aria-label="' + tx('Prikaži fotografiju u punoj veličini') + '">' +
        photoImg(thumbPath(f.photo), tx('Odabrana fotografija')) + '</button>' : '') +
      // Na mobitelu: „Fotografiraj” izravno otvara stražnju kameru, „Iz galerije” postojeće slike.
      // Na računalu (miš) gumb za kameru se skriva, a drugi gumb glasi „Dodaj fotografiju”.
      '<label class="file-btn cam-btn">' + ICON.camera + tx(f.photo ? 'Fotografiraj ponovno' : 'Fotografiraj') +
      '<input type="file" accept="image/*" capture="environment" id="fCameraInput"></label>' +
      '<label class="file-btn">' + ICON.gallery +
      '<span class="lbl-touch">' + tx(f.photo ? 'Zamijeni iz galerije' : 'Iz galerije') + '</span>' +
      '<span class="lbl-mouse">' + tx(f.photo ? 'Zamijeni fotografiju' : 'Dodaj fotografiju') + '</span>' +
      '<input type="file" accept="image/*" id="fPhotoInput"></label>' +
      (f.photo ? '<button type="button" class="btn" data-action="f-photo-remove">' + tx('Ukloni') + '</button>' : '') +
      (f.photoErr ? '<div class="alert-err" role="alert" style="flex:1 1 100%">' + esc(f.photoErr) + '</div>' : '');
  }

  function chipsHtml(list, action, selected, extraClass, knownList) {
    return list.map(function (v) {
      var k = knownList && knownList.indexOf(v) >= 0;
      return '<button type="button" class="chip' + (extraClass || '') + (k ? ' warn' : '') + '" data-action="' + action + '" data-val="' + esc(v) + '" aria-pressed="' + (selected.indexOf(v) >= 0) + '">' +
        (k ? ICON.warnSm : '') + esc(tx0(v)) + (k ? '<span class="sr-only"> (' + tx('poznata alergija') + ')</span>' : '') + '</button>';
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
      '<div class="form-head"><div><h2 id="formTitle">' + esc(title) + '</h2><p class="muted" style="font-size:14px">' + tx('Dijete:') + ' ' + esc(child ? child.name : '') + '</p></div>' +
      '<button type="button" class="icon-btn" data-action="close-form" aria-label="' + tx('Zatvori obrazac') + '">' + ICON.x + '</button></div>' +
      '<div class="grid2"><div class="field"><label for="fDate">' + tx('Datum') + '</label><input id="fDate" class="input" type="date" data-field="date" value="' + esc(ui.form.date) + '" required></div>' +
      '<div class="field"><label for="fTime">' + tx('Vrijeme') + '</label><input id="fTime" class="input" type="time" data-field="time" value="' + esc(ui.form.time) + '" required></div></div>' +
      body +
      '<div id="fError" class="alert-err" role="alert" hidden></div>' +
      '<div class="form-actions"><button type="button" class="btn" data-action="close-form">' + tx('Odustani') + '</button>' +
      '<button type="button" class="btn btn-primary" data-action="save">' + esc(saveLabel) + '</button></div></section>';
  }

  function renderDoseForm(host) {
    var f = ui.form, meds = childMeds(activeChild());
    var isNew = f.medId === '__new';
    host.innerHTML = formShell(tx(ui.editingId ? 'Uredi terapiju' : 'Nova terapija'),
      '<fieldset><legend>' + tx('Lijek') + '</legend><div class="chips">' + meds.map(function (m) {
        return '<button type="button" class="chip sq" data-action="f-med" data-val="' + esc(m.id) + '" aria-pressed="' + (f.medId === m.id) + '">' + esc(m.name) + '</button>';
      }).join('') +
      '<button type="button" class="chip sq dashed-chip" data-action="f-med" data-val="__new" aria-pressed="' + isNew + '">' + ICON.plus + tx('Novi lijek') + '</button></div></fieldset>' +
      '<div id="fNewMed" class="new-med"' + (isNew ? '' : ' hidden') + '>' +
      '<div class="grid2"><div class="field"><label for="fNewMedName">' + tx('Naziv novog lijeka') + '</label><input id="fNewMedName" class="input" type="text" maxlength="80" data-field="newMedName" value="' + esc(f.newMedName) + '" placeholder="' + tx('npr. Ibuprofen sirup') + '" autocomplete="off"></div>' +
      '<div class="field"><label for="fNewMedUnit">' + tx('Jedinica') + '</label><select id="fNewMedUnit" class="input" data-field="newMedUnit">' + unitOptions(f.newMedUnit) + '</select></div></div>' +
      '<span class="hint">' + tx('Lijek će se spremiti u popis lijekova, gdje mu kasnije možeš dodati uobičajenu dozu i razmak.') + '</span></div>' +
      '<div class="field"><label for="fDose">' + tx('Doza') + '</label><div class="input-unit"><input id="fDose" class="input" type="text" inputmode="decimal" data-field="dose" value="' + esc(f.dose) + '" placeholder="' + tx('npr. 5') + '">' +
      '<span id="fDoseUnit"></span></div></div>' +
      '<div id="fDoseInfo"></div>' +
      '<div class="field"><label for="fNote">' + tx('Bilješka') + '</label><textarea id="fNote" class="input" rows="2" data-field="note" maxlength="1000" placeholder="' + tx('Zašto je dano, kako je dijete reagiralo…') + '">' + esc(f.note) + '</textarea></div>',
      tx(ui.editingId ? 'Spremi promjene' : 'Spremi terapiju'));
    updateDoseInfo();
  }

  function currentDoseUnit() {
    var f = ui.form; if (!f) return '';
    if (f.medId === '__new') return f.newMedUnit;
    var m = medById(f.medId);
    return m ? m.unit : '';
  }

  function prevDoseText(last, gap) {
    return tx('Prethodna doza: {when} ({dose}), {gap}.', { when: whenText(last.date, last.time), dose: doseText(last.dose, last.unit),
      gap: gap < 60000 ? tx('u isto vrijeme') : tx('{d} ranije', { d: durText(gap) }) });
  }
  function minGapText(m) { return tx('Upisani najmanji razmak za ovaj lijek je {h} h.', { h: fmtNum(m.interval) }); }

  function updateDoseInfo() {
    var el = $('#fDoseInfo'); if (!el || !ui.form) return;
    var f = ui.form, m = medById(f.medId);
    var u = $('#fDoseUnit'); if (u) u.textContent = unitLabel(currentDoseUnit(), parseNum(f.dose));
    if (!m || !f.date || !f.time) { el.innerHTML = ''; return; }
    var at = stamp(f.date, f.time);
    var last = lastDoseOf(m.id, at, ui.editingId);
    var target = remindTarget(m, f.date, f.time), html;
    if (target && f.remind == null) f.remind = remindDefault(m.id, at, ui.editingId);
    var remind = target ? remindCheckHtml('remind', f.remind, target) : '';
    if (!last) {
      html = '<p class="muted" style="font-size:14px">' + tx('Za ovaj lijek još nema ranije upisane doze.') + '</p>';
    } else {
      var gap = at - stamp(last.date, last.time);
      var info = prevDoseText(last, gap);
      html = m.interval && gap < m.interval * 3600000
        ? '<div class="alert-warn" role="alert">' + esc(info + ' ' + minGapText(m)) + '</div>'
        : '<p class="muted" style="font-size:14px">' + esc(info) + '</p>';
    }
    el.innerHTML = html + remind;
  }

  function renderTempForm(host) {
    var f = ui.form;
    host.innerHTML = formShell(tx(ui.editingId ? 'Uredi mjerenje' : 'Novo mjerenje temperature'),
      '<div class="field"><label for="fTemp">' + tx('Temperatura (°C)') + '</label><div class="input-unit"><input id="fTemp" class="input temp-input" type="text" inputmode="decimal" data-field="value" value="' + esc(f.value) + '" placeholder="' + tx('npr. 38,2') + '"><span>°C</span>' +
      '<span id="fTempBadge"></span></div></div>' +
      '<fieldset><legend>' + tx('Način mjerenja') + '</legend><div class="chips">' + TEMP_METHODS.map(function (m) {
        return '<button type="button" class="chip sq" data-action="f-method" data-val="' + esc(m) + '" aria-pressed="' + (f.method === m) + '">' + esc(tx0(m)) + '</button>';
      }).join('') + '</div></fieldset>' +
      (ui.editingId ? '' : apBoxHtml()) +
      '<div class="field"><label for="fNote">' + tx('Bilješka') + '</label><textarea id="fNote" class="input" rows="2" data-field="note" maxlength="1000" placeholder="' + tx('Kako se dijete osjeća, drugi simptomi…') + '">' + esc(f.note) + '</textarea></div>',
      tx(ui.editingId ? 'Spremi promjene' : 'Spremi mjerenje'));
    updateTempBadge();
    updateApInfo();
  }

  // Dio obrasca za novo mjerenje: je li dan lijek za snižavanje temperature.
  function apBoxHtml() {
    var f = ui.form, meds = childApMeds(activeChild()), sel = f.apMedId || '';
    return '<fieldset class="ap-box"><legend>' + ICON.thermo + tx('Je li dan lijek za temperaturu?') + '</legend><div class="chips">' +
      '<button type="button" class="chip sq" data-action="f-ap" data-val="" aria-pressed="' + (sel === '') + '">' + tx('Nije dan') + '</button>' +
      meds.map(function (m) {
        return '<button type="button" class="chip sq" data-action="f-ap" data-val="' + esc(m.id) + '" aria-pressed="' + (sel === m.id) + '">' + esc(m.name) + '</button>';
      }).join('') +
      '<button type="button" class="chip sq dashed-chip" data-action="f-ap" data-val="__new" aria-pressed="' + (sel === '__new') + '">' + ICON.plus + tx('Novi antipiretik') + '</button></div>' +
      '<div id="fApNew" class="new-med"' + (sel === '__new' ? '' : ' hidden') + '><div class="grid2">' +
      '<div class="field"><label for="fApName">' + tx('Naziv lijeka') + '</label><input id="fApName" class="input" type="text" maxlength="80" data-field="apNewName" value="' + esc(f.apNewName || '') + '" placeholder="' + tx('npr. Neofen sirup, Lupocet') + '" autocomplete="off"></div>' +
      '<div class="field"><label for="fApUnit">' + tx('Jedinica') + '</label><select id="fApUnit" class="input" data-field="apNewUnit">' + unitOptions(f.apNewUnit || 'ml') + '</select></div></div>' +
      '<span class="hint">' + tx('Lijek se sprema u popis lijekova s oznakom „antipiretik”.') + '</span></div>' +
      '<div id="fApDoseRow" class="field"' + (sel ? '' : ' hidden') + '><label for="fApDose">' + tx('Doza') + '</label><div class="input-unit">' +
      '<input id="fApDose" class="input" type="text" inputmode="decimal" data-field="apDose" value="' + esc(f.apDose || '') + '" placeholder="' + tx('npr. 5') + '"><span id="fApUnitLbl"></span></div></div>' +
      '<div id="fApInfo"></div>' +
      '<span class="hint">' + tx('Doza se upisuje i u Terapije, s datumom i vremenom ovog mjerenja.') + '</span></fieldset>';
  }
  function apUnit() {
    var f = ui.form; if (!f) return '';
    if (f.apMedId === '__new') return f.apNewUnit || 'ml';
    var m = medById(f.apMedId); return m ? m.unit : '';
  }
  function updateApInfo() {
    var el = $('#fApInfo'), f = ui.form; if (!el || !f) return;
    var u = $('#fApUnitLbl'); if (u) u.textContent = unitLabel(apUnit(), parseNum(f.apDose));
    var m = medById(f.apMedId);
    if (!m || !f.date || !f.time) { el.innerHTML = ''; return; }
    var at = stamp(f.date, f.time), last = lastDoseOf(m.id, at, null);
    var target = remindTarget(m, f.date, f.time);
    if (target && f.apRemind == null) f.apRemind = remindDefault(m.id, at, null);
    var remind = target ? remindCheckHtml('apRemind', f.apRemind, target) : '';
    if (!last) { el.innerHTML = remind; return; }
    var gap = at - stamp(last.date, last.time);
    var info = prevDoseText(last, gap);
    el.innerHTML = (m.interval && gap < m.interval * 3600000
      ? '<div class="alert-warn" role="alert">' + esc(info + ' ' + minGapText(m)) + '</div>'
      : '<p class="muted" style="font-size:14px">' + esc(info) + '</p>') + remind;
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
      '<div class="form-head"><div><h2 id="formTitle">' + tx(ui.editingId ? 'Uredi obrok' : 'Novi obrok') + '</h2><p class="muted" style="font-size:14px">' + tx('Dijete:') + ' ' + esc(child ? child.name : '') + '</p></div>' +
      '<button type="button" class="icon-btn" data-action="close-form" aria-label="' + tx('Zatvori obrazac') + '">' + ICON.x + '</button></div>' +

      '<div class="grid2"><div class="field"><label for="fDate">' + tx('Datum') + '</label><input id="fDate" class="input" type="date" data-field="date" value="' + esc(f.date) + '" required></div>' +
      '<div class="field"><label for="fTime">' + tx('Vrijeme') + '</label><input id="fTime" class="input" type="time" data-field="time" value="' + esc(f.time) + '" required></div></div>' +

      '<fieldset><legend>' + tx('Obrok') + '</legend><div class="chips">' + TYPES.map(function (t) {
        return '<button type="button" class="chip sq" data-action="f-type" data-val="' + esc(t) + '" aria-pressed="' + (f.type === t) + '">' + esc(tx0(t)) + '</button>';
      }).join('') + '</div></fieldset>' +

      '<div class="field ac-field"><label for="fFood" id="fFoodLabel">' + tx('Što je dijete jelo?') + '</label>' +
      '<textarea id="fFood" class="input" rows="2" data-field="food" maxlength="300" placeholder="' + tx('npr. zobena kaša s bananom i bademovim napitkom') + '"' +
      ' role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="fFoodList" autocomplete="off">' + esc(f.food) + '</textarea>' +
      '<ul id="fFoodList" class="ac-list" role="listbox" aria-labelledby="fFoodLabel" hidden></ul>' +
      '<span class="hint">' + tx('Upiši jelo i glavne namirnice, po mogućnosti i marku proizvoda. Ranije upisana jela nude se dok tipkaš.') + '</span></div>' +

      '<fieldset><legend>' + tx('Alergeni u obroku') + '</legend><div class="chips" id="fAllergenChips">' + chipsHtml(ALLERGENS, 'f-allergen', f.allergens, '', known) + '</div>' +
      '<div id="fAllergenFrom" class="ac-note" role="status"></div>' +
      '<div id="fWarn" class="alert-warn" role="alert" style="margin-top:10px" hidden></div></fieldset>' +

      '<fieldset><legend>' + tx('Je li bilo reakcije?') + '</legend><div class="seg2">' +
      '<button type="button" class="seg ok" data-action="f-react" data-val="0" aria-pressed="' + !f.reaction + '">' + tx('Bez reakcije') + '</button>' +
      '<button type="button" class="seg bad" data-action="f-react" data-val="1" aria-pressed="' + f.reaction + '">' + tx('Bila je reakcija') + '</button></div></fieldset>' +

      '<div id="fReactBox" class="react-box"' + (f.reaction ? '' : ' hidden') + '>' +
      '<fieldset><legend>' + tx('Simptomi') + '</legend><div class="chips">' + chipsHtml(SYMPTOMS, 'f-symptom', f.symptoms, ' warn') + '</div></fieldset>' +
      '<div class="row-wrap"><fieldset><legend>' + tx('Jačina') + '</legend><div class="seg3">' + SEVERITY.map(function (s) {
        return '<button type="button" class="seg ' + SEV_CLASS[s] + '" data-action="f-severity" data-val="' + s + '" aria-pressed="' + (f.severity === s) + '">' + esc(tx0(s)) + '</button>';
      }).join('') + '</div></fieldset>' +
      '<div class="field"><label for="fOnset">' + tx('Nakon koliko minuta?') + '</label><input id="fOnset" class="input" type="number" min="0" max="1440" inputmode="numeric" data-field="onset" value="' + esc(f.onset) + '" placeholder="' + tx('npr. 20') + '"></div></div></div>' +

      '<div class="field"><label for="fNote">' + tx('Bilješka') + '</label><textarea id="fNote" class="input" rows="3" data-field="note" maxlength="2000" placeholder="' + tx('Koliko je pojelo, gdje je jelo, što je dano kao terapija, napomene za liječnika…') + '">' + esc(f.note) + '</textarea></div>' +

      '<div class="field"><span class="label">' + tx('Fotografija obroka ili deklaracije') + '</span><div class="photo-row" id="fPhotoRow">' + photoRowHtml() + '</div></div>' +

      '<div id="fError" class="alert-err" role="alert" hidden></div>' +
      '<div class="form-actions"><button type="button" class="btn" data-action="close-form">' + tx('Odustani') + '</button>' +
      '<button type="button" class="btn btn-primary" data-action="save">' + tx(ui.editingId ? 'Spremi promjene' : 'Spremi obrok') + '</button></div>' +
      '</section>';
    updateWarn();
  }

  function updateWarn() {
    var el = $('#fWarn'); if (!el || !ui.form) return;
    var child = activeChild(), known = knownOf(child);
    var hits = ui.form.allergens.filter(function (a) { return known.indexOf(a) >= 0; });
    el.hidden = !hits.length;
    el.textContent = hits.length ? tx(hits.length > 1 ? 'Pažnja: {list} su na popisu poznatih alergija ({name}).' : 'Pažnja: {list} je na popisu poznatih alergija ({name}).',
      { list: hits.map(tx0).join(', '), name: child.name }) : '';
  }

  // ---------- prijedlozi jela (autocomplete) ----------
  // Ranija jela: najprije odabranog djeteta, zatim ostale djece; češća i novija ranije.
  // Odabir upisuje naziv i preuzima alergene iz zadnjeg upisa tog jela.
  var ac = { items: [], active: -1, open: false };
  function foodSuggestions(q) {
    var words = norm(q).trim().split(/[\s,.;:()/-]+/).filter(Boolean);
    if (!words.length || norm(q).trim().length < 2) return [];
    var child = activeChild(), by = {};
    data.entries.forEach(function (e) {
      if (e.demo && !(child && child.demo)) return;
      if (ui.editingId && e.id === ui.editingId) return;
      var key = norm(e.food).trim(); if (!key) return;
      var g = by[key] || (by[key] = { key: key, food: e.food, count: 0, mine: false, last: null, lastReact: null });
      g.count++;
      if (child && e.childId === child.id) g.mine = true;
      var at = e.date + e.time;
      if (!g.last || at > g.last.date + g.last.time) { g.last = e; g.food = e.food; }
      if (e.reaction && (!g.lastReact || at > g.lastReact.date + g.lastReact.time)) g.lastReact = e;
    });
    var exact = norm(q).trim();
    return Object.keys(by).map(function (k) { return by[k]; }).filter(function (g) {
      if (g.key === exact) return false;
      var ws = g.key.split(/[\s,.;:()/-]+/);
      return words.every(function (w) { return ws.some(function (x) { return x.indexOf(w) === 0; }); });
    }).sort(function (a, b) {
      return (b.mine - a.mine) || (b.count - a.count) || (b.last.date + b.last.time).localeCompare(a.last.date + a.last.time);
    }).slice(0, 6);
  }
  function shortDate(iso) { var d = parseIso(iso); return LANG === 'hr' ? d.getDate() + '. ' + (d.getMonth() + 1) + '.' : d.getDate() + '/' + (d.getMonth() + 1); }
  function renderAc() {
    var list = $('#fFoodList'), ta = $('#fFood'); if (!list || !ta) return;
    var child = activeChild(), known = knownOf(child);
    ac.open = ac.items.length > 0;
    list.hidden = !ac.open;
    ta.setAttribute('aria-expanded', String(ac.open));
    if (ac.active >= 0 && ac.open) ta.setAttribute('aria-activedescendant', 'fFoodOpt' + ac.active); else ta.removeAttribute('aria-activedescendant');
    list.innerHTML = ac.items.map(function (g, i) {
      var other = !g.mine ? data.children.filter(function (c) { return c.id === g.last.childId; })[0] : null;
      var meta = [];
      if (g.lastReact) meta.push('<span class="ac-react">' + ICON.warnSm + esc(tx('reakcija {date}', { date: shortDate(g.lastReact.date) })) + '</span>');
      meta.push('<span>' + (g.count > 1 ? g.count + '× · ' : '') + esc(tx('zadnje {date}', { date: shortDate(g.last.date) })) + (other ? ' · ' + esc(other.name) : '') + '</span>');
      return '<li id="fFoodOpt' + i + '" role="option" class="ac-item" aria-selected="' + (i === ac.active) + '" data-ac="' + i + '">' +
        '<strong>' + esc(g.food) + '</strong>' +
        (g.last.allergens.length ? '<span class="ac-tags">' + g.last.allergens.map(function (a) {
          return '<span class="tag' + (known.indexOf(a) >= 0 ? ' warn' : '') + '">' + esc(tx0(a)) + '</span>';
        }).join('') + '</span>' : '') +
        '<span class="ac-meta">' + meta.join('') + '</span></li>';
    }).join('');
  }
  function updateAc() {
    var ta = $('#fFood'); if (!ta || !ui.form) return;
    ac.items = foodSuggestions(ta.value); ac.active = -1;
    renderAc();
  }
  function closeAc() { ac.items = []; ac.active = -1; renderAc(); }
  function pickAc(i) {
    var g = ac.items[i], f = ui.form; if (!g || !f) return;
    var ta = $('#fFood');
    f.food = g.food; ta.value = g.food;
    f.allergens = g.last.allergens.slice();
    document.querySelectorAll('[data-action="f-allergen"]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(f.allergens.indexOf(b.getAttribute('data-val')) >= 0));
    });
    var note = $('#fAllergenFrom');
    if (note) note.textContent = f.allergens.length
      ? tx('Alergeni su preuzeti iz upisa od {date} — provjeri jesu li isti.', { date: shortDate(g.last.date) })
      : tx('U upisu od {date} nije bio označen nijedan alergen — provjeri.', { date: shortDate(g.last.date) });
    updateWarn();
    showError('');
    closeAc();
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
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
        ? { date: entry.date, time: entry.time, medId: medById(entry.medId) ? entry.medId : '__new', newMedName: entry.medName, newMedUnit: entry.unit || 'ml', dose: fmtNum(entry.dose), note: entry.note || '', remind: !!entry.remindAt }
        : { date: n.date, time: n.time, medId: meds.length ? meds[0].id : '__new', newMedName: '', newMedUnit: 'ml', dose: '', note: '' };
      if (!entry && meds.length && meds[0].dose !== '' && meds[0].dose != null) ui.form.dose = fmtNum(meds[0].dose);
    } else if (kind === 'temp') {
      ui.editingId = entry ? entry.id : null;
      var lastT = ofChild(data.temps, activeChild()).sort(byNewest)[0];
      ui.form = entry
        ? { date: entry.date, time: entry.time, value: fmtNum(entry.value), method: entry.method || '', note: entry.note || '' }
        : { date: n.date, time: n.time, value: '', method: lastT ? lastT.method : 'Pazuh', note: '', apMedId: '', apDose: '', apNewName: '', apNewUnit: 'ml' };
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
      if (!name) { showError(tx('Upiši naziv lijeka ili odaberi lijek iz popisa.')); $('#fNewMedName').focus(); return; }
      med = childMeds(child).filter(function (m) { return norm(m.name) === norm(name); })[0] || null;
      if (!med) med = newMed = { id: uid(), childId: existing ? existing.childId : child.id, name: name, unit: f.newMedUnit || 'ml', dose: '', interval: '', note: '', times: [], since: '', until: '', antipyretic: looksAntipyretic(name) };
    } else {
      med = medById(f.medId);
      if (!med) { showError(tx('Odaberi lijek.')); return; }
    }
    var dose = parseNum(f.dose);
    if (isNaN(dose) || dose <= 0) { showError(tx('Upiši dozu kao broj, npr. 5 ili 2,5.')); $('#fDose').focus(); return; }
    if (!f.date || !f.time) { showError(tx('Upiši datum i vrijeme.')); return; }
    if (newMed) newMed.dose = dose;
    var keepSlot = existing && existing.slot && existing.medId === med.id;
    var entry = {
      id: existing ? existing.id : uid(),
      childId: existing ? existing.childId : child.id,
      medId: med.id, medName: med.name, unit: med.unit,
      date: f.date, time: f.time, dose: dose,
      note: String(f.note || '').trim(),
      slotDate: keepSlot ? existing.slotDate : '', slot: keepSlot ? existing.slot : '',
      antipyretic: !!med.antipyretic, tempId: existing && existing.medId === med.id ? existing.tempId || '' : ''
    };
    // Podsjetnik kad prođe razmak. Bez podsjetnika na ovom uređaju kvačice nema, pa podsjetnik
    // koji je zatražio netko drugi ostaje kakav jest.
    var target = remindTarget(med, f.date, f.time);
    entry.remindAt = target ? (f.remind ? remindIso(target) : '') : (existing && existing.medId === med.id ? existing.remindAt || '' : '');
    var prevD = data.doses, prevM = data.meds;
    if (newMed) data.meds = prevM.concat([newMed]);
    data.doses = existing ? prevD.map(function (x) { return x.id === entry.id ? entry : x; }) : [entry].concat(prevD);
    if (!persist()) {
      data.doses = prevD; data.meds = prevM;
      showError(tx('Spremanje nije uspjelo — preglednik ne dopušta spremanje podataka.'));
      return;
    }
    finishSave(!!existing, tx(existing ? 'Terapija je ažurirana.' : (newMed ? 'Terapija je spremljena, a lijek dodan u popis.' : 'Terapija je spremljena.')));
  }

  function saveTemp() {
    var f = ui.form, child = activeChild();
    var v = parseNum(f.value);
    if (isNaN(v)) { showError(tx('Upiši temperaturu, npr. 38,2.')); $('#fTemp').focus(); return; }
    if (v < 34 || v > 43) { showError(tx('Temperatura mora biti između 34 i 43 °C.')); $('#fTemp').focus(); return; }
    if (!f.date || !f.time) { showError(tx('Upiši datum i vrijeme mjerenja.')); return; }
    var existing = data.temps.filter(function (x) { return x.id === ui.editingId; })[0];
    var entry = {
      id: existing ? existing.id : uid(),
      childId: existing ? existing.childId : child.id,
      date: f.date, time: f.time, value: Math.round(v * 10) / 10,
      method: f.method || '', note: String(f.note || '').trim()
    };
    // Antipiretik dan uz novo mjerenje: doza u Terapije (i novi lijek u popis, ako treba).
    var apMed = null, apNewMed = null, apDose = null;
    if (!existing && f.apMedId) {
      if (f.apMedId === '__new') {
        var apName = String(f.apNewName || '').trim();
        if (!apName) { showError(tx('Upiši naziv lijeka za temperaturu ili odaberi „Nije dan”.')); $('#fApName').focus(); return; }
        apMed = childMeds(child).filter(function (m) { return norm(m.name) === norm(apName); })[0] || null;
        if (!apMed) apMed = apNewMed = { id: uid(), childId: child.id, name: apName, unit: f.apNewUnit || 'ml', dose: '', interval: '', note: '', times: [], since: '', until: '', antipyretic: true };
      } else {
        apMed = medById(f.apMedId);
      }
      var apAmount = parseNum(f.apDose);
      if (!apMed) { showError(tx('Odaberi lijek za temperaturu.')); return; }
      if (isNaN(apAmount) || apAmount <= 0) { showError(tx('Upiši dozu lijeka kao broj, npr. 5 ili 2,5.')); $('#fApDose').focus(); return; }
      if (apNewMed) apNewMed.dose = apAmount;
      apDose = { id: uid(), childId: child.id, medId: apMed.id, medName: apMed.name, unit: apMed.unit, date: f.date, time: f.time,
        dose: apAmount, note: '', slotDate: '', slot: '', antipyretic: true, tempId: entry.id };
      var apTarget = remindTarget(apMed, f.date, f.time);
      if (apTarget && f.apRemind) apDose.remindAt = remindIso(apTarget);
    }
    var prev = data.temps, prevD = data.doses, prevM = data.meds;
    data.temps = existing ? prev.map(function (x) { return x.id === entry.id ? entry : x; }) : [entry].concat(prev);
    if (apNewMed) data.meds = prevM.concat([apNewMed]);
    if (apDose) data.doses = [apDose].concat(prevD);
    if (!persist()) {
      data.temps = prev; data.doses = prevD; data.meds = prevM;
      showError(tx('Spremanje nije uspjelo — preglednik ne dopušta spremanje podataka.'));
      return;
    }
    finishSave(!!existing, tx(existing ? 'Mjerenje je ažurirano.' : 'Mjerenje je spremljeno.'));
  }

  function saveMeal() {
    var f = ui.form;
    if (f.photoBusy) { f.saveAfterPhoto = true; showError(tx('Fotografija se još sprema — obrok će se spremiti čim ona bude gotova.')); return; }
    if (!String(f.food).trim()) { showError(tx('Upiši što je dijete jelo.')); $('#fFood').focus(); return; }
    if (!f.date || !f.time) { showError(tx('Upiši datum i vrijeme obroka.')); return; }
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
      showError(tx(entry.photo
        ? 'Spremanje nije uspjelo — u pregledniku nema dovoljno mjesta. Pokušaj bez fotografije.'
        : 'Spremanje nije uspjelo — preglednik ne dopušta spremanje podataka (npr. privatni način rada).'));
      return;
    }
    var wasEdit = !!existing;
    closeForm();
    renderAll();
    flash(tx(wasEdit ? 'Obrok je ažuriran.' : 'Obrok je spremljen.'));
    $('#main').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------- fotografije u Supabase Storageu ----------
  // meals.photo = putanja pune slike u spremniku "photos" (<user_id>/<id>.jpg); sličica je <id>_t.jpg.
  // user_id je vlasnik djeteta, pa i drugi roditelj sprema sliku u vlasnikovu mapu.
  // Stari zapisi s ugrađenom slikom ("data:...") prikazuju se izravno i sami se prebacuju u spremnik.
  var PHOTO_BUCKET = 'photos';
  var photoUrls = {};          // putanja -> { url, exp }
  var photoWanted = {}, photoTimer = null;
  function isInlinePhoto(p) { return /^data:/.test(p || ''); }
  function thumbPath(p) { return isInlinePhoto(p) ? p : String(p).replace(/\.jpg$/, '_t.jpg'); }

  // Vraća URL ako ga već imamo, inače ga zatraži (potpisani URL vrijedi sat vremena) i vrati ''.
  function photoUrl(key) {
    if (!key) return '';
    if (isInlinePhoto(key)) return key;
    var c = photoUrls[key];
    if (c && c.exp > Date.now() + 60000) return c.url;
    photoWanted[key] = true;
    clearTimeout(photoTimer);
    photoTimer = setTimeout(fetchPhotoUrls, 20);
    return '';
  }
  function fetchPhotoUrls() {
    var keys = Object.keys(photoWanted); photoWanted = {};
    if (!keys.length || !sb) return;
    sb.storage.from(PHOTO_BUCKET).createSignedUrls(keys, 3600).then(function (res) {
      if (res.error) throw res.error;
      (res.data || []).forEach(function (r) {
        if (!r.signedUrl) return;
        photoUrls[r.path] = { url: r.signedUrl, exp: Date.now() + 3600000 };
        setPhotoSrc(r.path, r.signedUrl);
      });
    }).catch(function (err) { console.error('Fotografije nije moguće učitati', err); });
  }
  function setPhotoSrc(key, url) {
    document.querySelectorAll('img[data-photo-key]').forEach(function (img) {
      if (img.getAttribute('data-photo-key') === key) { img.src = url; img.classList.remove('loading'); }
    });
  }
  function photoImg(key, alt, cls) {
    var url = photoUrl(key);
    return '<img class="' + (cls || '') + (url ? '' : ' loading') + '" data-photo-key="' + esc(key) + '"' + (url ? ' src="' + esc(url) + '"' : '') + ' alt="' + esc(alt) + '">';
  }

  function canvasBlob(img, max, quality) {
    var w = img.naturalWidth, h = img.naturalHeight, s = Math.min(1, max / Math.max(w, h));
    var cv = document.createElement('canvas');
    cv.width = Math.round(w * s); cv.height = Math.round(h * s);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    return new Promise(function (ok, bad) { cv.toBlob(function (b) { b ? ok(b) : bad(new Error('toBlob')); }, 'image/jpeg', quality); });
  }
  function loadImage(src) {
    return new Promise(function (ok, bad) { var im = new Image(); im.onload = function () { ok(im); }; im.onerror = bad; im.src = src; });
  }
  // Napravi punu sliku (do 1600 px) i sličicu (do 400 px) i pošalji obje u spremnik.
  function uploadPhoto(src, owner) {
    var path = (owner || auth.user.id) + '/' + uid() + '.jpg';
    return loadImage(src).then(function (img) {
      return Promise.all([canvasBlob(img, 1600, 0.82), canvasBlob(img, 400, 0.72)]);
    }).then(function (blobs) {
      var store = sb.storage.from(PHOTO_BUCKET), opts = { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false };
      return Promise.all([store.upload(path, blobs[0], opts), store.upload(thumbPath(path), blobs[1], opts)]).then(function (res) {
        res.forEach(function (r) { if (r.error) throw r.error; });
        var full = URL.createObjectURL(blobs[0]), thumb = URL.createObjectURL(blobs[1]);
        photoUrls[path] = { url: full, exp: Infinity };
        photoUrls[thumbPath(path)] = { url: thumb, exp: Infinity };
        return path;
      });
    });
  }

  // Stare ugrađene slike (prije Storagea) prebaci u spremnik, jednu po jednu.
  var migratingPhotos = false;
  function migrateInlinePhotos() {
    if (migratingPhotos || !sb || !auth.user) return;
    var e = data.entries.filter(function (x) { return !x.demo && isInlinePhoto(x.photo) && ownerOf(x.childId) === myId(); })[0];
    if (!e) return;
    migratingPhotos = true;
    var inline = e.photo;
    uploadPhoto(inline).then(function (path) {
      data.entries = data.entries.map(function (x) { return x.id === e.id && x.photo === inline ? Object.assign({}, x, { photo: path }) : x; });
      persist(); renderList();
      migratingPhotos = false;
      migrateInlinePhotos();
    }).catch(function (err) { migratingPhotos = false; console.error('Prijenos stare fotografije nije uspio', err); });
  }

  // Datoteke u spremniku koje nijedan obrok više ne koristi (obrisan obrok ili dijete, zamijenjena slika)
  // brišu se nakon sat vremena, da se ne dira slika s drugog uređaja koja još čeka sinkronizaciju.
  // Briše se samo kad su obroci u ovoj sesiji cijeli učitani s poslužitelja (fullLoadUser):
  // stara ili nepotpuna kopija s uređaja ne smije zaključiti da fotografiju nitko ne koristi.
  var photoCleanT = null;
  function schedulePhotoCleanup(delay) {
    clearTimeout(photoCleanT);
    photoCleanT = setTimeout(cleanupPhotos, delay == null ? 5000 : delay);
  }
  function cleanupPhotos() {
    if (!sb || !auth.user || fullLoadUser !== auth.user.id) return;
    var used = {};
    data.entries.forEach(function (x) { if (x.photo && !isInlinePhoto(x.photo)) { used[x.photo] = true; used[thumbPath(x.photo)] = true; } });
    if (ui.form && ui.form.photo) { used[ui.form.photo] = true; used[thumbPath(ui.form.photo)] = true; }
    var folder = auth.user.id, store = sb.storage.from(PHOTO_BUCKET);
    store.list(folder, { limit: 1000 }).then(function (res) {
      if (res.error) throw res.error;
      var old = Date.now() - 3600000;
      var gone = (res.data || []).filter(function (f) {
        var p = folder + '/' + f.name;
        return f.id && !used[p] && new Date(f.created_at).getTime() < old;
      }).map(function (f) { return folder + '/' + f.name; });
      if (gone.length) return store.remove(gone);
    }).catch(function (err) { console.error('Čišćenje fotografija nije uspjelo', err); });
  }

  var lbOpener = null;
  function openLightbox(path, caption, opener) {
    if (!path) return;
    var lb = $('#lightbox'), img = $('#lbImg');
    var url = photoUrl(path);
    img.setAttribute('data-photo-key', path);
    img.alt = caption || tx('Fotografija obroka');
    if (url) { img.src = url; img.classList.remove('loading'); }
    else { img.removeAttribute('src'); img.classList.add('loading'); }
    $('#lbCap').textContent = caption || '';
    lbOpener = opener || null;
    lb.hidden = false;
    document.body.classList.add('lb-open');
    $('#lbClose').focus();
  }
  function closeLightbox() {
    var lb = $('#lightbox'); if (lb.hidden) return;
    lb.hidden = true;
    document.body.classList.remove('lb-open');
    $('#lbImg').removeAttribute('data-photo-key');
    if (lbOpener && document.contains(lbOpener)) lbOpener.focus();
    lbOpener = null;
  }

  function readPhoto(file) {
    if (!file || !/^image\//.test(file.type)) return;
    var f = ui.form; if (!f) return;
    var url = URL.createObjectURL(file);
    f.photoBusy = true; f.photoErr = '';
    $('#fPhotoRow').innerHTML = photoRowHtml();
    var child = activeChild();
    var job = f.photoJob = uploadPhoto(url, child ? ownerOf(child.id) : '').then(function (path) {
      URL.revokeObjectURL(url);
      if (ui.form !== f || f.photoJob !== job) return;
      f.photo = path; f.photoBusy = false;
      $('#fPhotoRow').innerHTML = photoRowHtml();
      if (f.saveAfterPhoto) { f.saveAfterPhoto = false; saveMeal(); }
    }).catch(function (err) {
      URL.revokeObjectURL(url);
      console.error(err);
      if (ui.form !== f || f.photoJob !== job) return;
      f.photoBusy = false; f.saveAfterPhoto = false;
      f.photoErr = tx('Fotografiju nije moguće spremiti. Provjeri internetsku vezu i pokušaj ponovno.');
      $('#fPhotoRow').innerHTML = photoRowHtml();
    });
  }

  function toggleIn(arr, v) {
    var i = arr.indexOf(v);
    if (i >= 0) arr.splice(i, 1); else arr.push(v);
    return i < 0;
  }

  // ---------- izvoz (CSV) i ispis ----------
  // Oba koriste iste filtre iz panela u kartici „Podaci”: razdoblje je uvijek zadano.
  var WHAT_LABEL = { all: tx('Sve'), meals: tx('Obroci'), doses: tx('Terapije'), temps: tx('Temperatura') };
  var EX_ICON = {
    csv: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></svg>',
    print: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/></svg>'
  };
  var PRESETS = [['7', tx('7 dana')], ['30', tx('30 dana')], ['90', tx('3 mjeseca')], ['all', tx('Sve')]];
  function csvDate(iso) { return I18N.shortDate(parseIso(iso)); }
  function hrDate(iso) { var d = parseIso(iso); return LANG === 'hr' ? d.getDate() + '. ' + (d.getMonth() + 1) + '. ' + d.getFullYear() + '.' : I18N.fullDate(d); }

  function firstDate(child) {
    var ds = [childEntries(child), ofChild(data.doses, child), ofChild(data.temps, child)]
      .reduce(function (a, l) { return a.concat(l.map(function (x) { return x.date; })); }, []).sort();
    return ds[0] || '';
  }
  function setPreset(x, p, child) {
    x.preset = p; x.to = isoOffset(0);
    x.from = p === 'all' ? (firstDate(child) || x.to) : isoOffset(-(Number(p) - 1));
    if (x.from > x.to) x.from = x.to;
  }
  function newExport(kind, child) {
    var x = { kind: kind, what: ui.tab, preset: '30', from: '', to: '', reactOnly: false, allergen: '', medId: '', feverOnly: false, noAp: !!ui.hideAp,
      incMeals: true, incDoses: true, incTemps: true };
    setPreset(x, '30', child);
    return x;
  }

  // Redovi za CSV i ispis prema filtrima. Vraća i opis filtara za zaglavlje ispisa.
  function exportData(child, x) {
    function inRange(d) { return d >= x.from && d <= x.to; }
    function asc(a, b) { return (a.date + a.time).localeCompare(b.date + b.time); }
    function mealOk(e) { return (!x.reactOnly || e.reaction) && (x.what !== 'meals' || !x.allergen || e.allergens.indexOf(x.allergen) >= 0); }
    var out = { filters: [], head: [], rows: [], kindName: '', summary: '' };
    var w = x.what;
    if (w === 'meals' || w === 'all') {
      if (x.reactOnly) out.filters.push(tx('samo obroci s reakcijom'));
      if (w === 'meals' && x.allergen) out.filters.push(tx('alergen: {name}', { name: tx0(x.allergen) }));
    }
    if (w === 'doses' && x.medId) out.filters.push(tx('lijek: {name}', { name: (medById(x.medId) || {}).name || '' }));
    if ((w === 'doses' || (w === 'all' && x.incDoses)) && x.noAp) out.filters.push(tx('terapije bez antipiretika'));
    if (w === 'temps' && x.feverOnly) out.filters.push(tx('samo od 37,5 °C'));
    if (w === 'all') {
      var skip = [x.incMeals ? '' : tx('obroke'), x.incDoses ? '' : tx('terapije'), x.incTemps ? '' : tx('temperaturu')].filter(Boolean);
      if (skip.length) out.filters.push(tx('bez: {list}', { list: skip.join(', ') }));
      out.kindName = tx('sve');
      out.head = ['Datum', 'Vrijeme', 'Vrsta', 'Opis', 'Detalji', 'Bilješka'].map(tx);
      var items = timelineItems(child).filter(function (it) {
        if (!inRange(it.date)) return false;
        if (it.kind === 'meal' || it.kind === 'react') return x.incMeals && mealOk(it.item);
        if (it.kind === 'dose') return x.incDoses && !(x.noAp && isApDose(it.item));
        return x.incTemps;
      }).reverse();
      out.rows = items.map(function (it) {
        var e = it.item;
        if (it.kind === 'meal') return [csvDate(it.date), it.time, tx('Obrok') + ' · ' + tx0(e.type), e.food,
          [e.allergens.length ? tx('Alergeni: {list}', { list: e.allergens.map(tx0).join(', ') }) : '',
            e.reaction ? tx('Reakcija: {sev}', { sev: tx0(e.severity) }) : tx('Bez reakcije')].filter(Boolean).join('; '), e.note];
        if (it.kind === 'react') return [csvDate(it.date), it.time, tx('Reakcija'), e.symptoms.map(tx0).join(', ') || tx('Reakcija'),
          (e.severity ? tx0(e.severity) + '; ' : '') + tx('{n} min nakon obroka: {food}', { n: e.onset, food: e.food }), ''];
        if (it.kind === 'dose') return [csvDate(it.date), it.time, tx(isApDose(e) ? 'Terapija · antipiretik' : 'Terapija'), doseMedName(e), doseText(e.dose, e.unit), e.note];
        return [csvDate(it.date), it.time, tx('Temperatura'), fmtNum(e.value.toFixed(1)) + ' °C', tx0(e.method || ''), e.note];
      });
      var nm = items.filter(function (i) { return i.kind === 'meal'; }).length;
      var nr = items.filter(function (i) { return i.kind === 'meal' && i.item.reaction; }).length;
      var nd = items.filter(function (i) { return i.kind === 'dose'; }).length;
      var nt = items.filter(function (i) { return i.kind === 'temp'; }).length;
      out.summary = [x.incMeals ? nm + ' ' + plural(nm, 'obrok', 'obroka', 'obroka') + (nr ? ' (' + tx('{n} s reakcijom', { n: nr }) + ')' : '') : '',
        x.incDoses ? nd + ' ' + plural(nd, 'terapija', 'terapije', 'terapija') : '',
        x.incTemps ? nt + ' ' + plural(nt, 'mjerenje', 'mjerenja', 'mjerenja') : ''].filter(Boolean).join(' · ');
      out.count = items.filter(function (i) { return i.kind !== 'react'; }).length;
    } else if (w === 'doses') {
      out.kindName = tx('terapije');
      out.head = ['Datum', 'Vrijeme', 'Lijek', 'Doza', 'Jedinica', 'Antipiretik', 'Po planu', 'Bilješka'].map(tx);
      var ds = ofChild(data.doses, child).filter(function (d) { return inRange(d.date) && (!x.medId || d.medId === x.medId) && !(x.noAp && isApDose(d)); }).sort(asc);
      out.rows = ds.map(function (d) { return [csvDate(d.date), d.time, doseMedName(d), fmtNum(d.dose), unitLabel(d.unit, d.dose), isApDose(d) ? tx('Da') : '', d.slot || '', d.note]; });
      out.count = ds.length;
      out.summary = ds.length + ' ' + plural(ds.length, 'terapija', 'terapije', 'terapija');
    } else if (w === 'temps') {
      out.kindName = tx('temperatura');
      out.head = ['Datum', 'Vrijeme', 'Temperatura (°C)', 'Ocjena', 'Način mjerenja', 'Bilješka'].map(tx);
      var ts = ofChild(data.temps, child).filter(function (t) { return inRange(t.date) && (!x.feverOnly || t.value >= 37.5); }).sort(asc);
      out.rows = ts.map(function (t) { return [csvDate(t.date), t.time, fmtNum(t.value.toFixed(1)), tempLevel(t.value).label, tx0(t.method || ''), t.note]; });
      out.count = ts.length;
      var mx = ts.length ? Math.max.apply(null, ts.map(function (t) { return t.value; })) : null;
      out.summary = ts.length + ' ' + plural(ts.length, 'mjerenje', 'mjerenja', 'mjerenja') + (mx != null ? ' · ' + tx('najviša {v} °C', { v: fmtNum(mx.toFixed(1)) }) : '');
    } else {
      out.kindName = tx(x.reactOnly ? 'obroci-s-reakcijom' : 'obroci');
      out.head = ['Datum', 'Vrijeme', 'Obrok', 'Jelo', 'Alergeni', 'Reakcija', 'Jačina', 'Simptomi', 'Nakon (min)', 'Bilješka'].map(tx);
      var es = childEntries(child).filter(function (e) { return inRange(e.date) && mealOk(e); }).sort(asc);
      out.rows = es.map(function (e) {
        return [csvDate(e.date), e.time, tx0(e.type), e.food, e.allergens.map(tx0).join(', '),
          tx(e.reaction ? 'Da' : 'Ne'), e.reaction ? tx0(e.severity) : '', e.symptoms.map(tx0).join(', '), e.reaction ? e.onset : '', e.note];
      });
      out.count = es.length;
      var rc = es.filter(function (e) { return e.reaction; }).length;
      out.summary = es.length + ' ' + plural(es.length, 'obrok', 'obroka', 'obroka') + ' · ' + rc + ' ' + plural(rc, 'reakcija', 'reakcije', 'reakcija');
    }
    return out;
  }

  function renderExport(child) {
    var box = $('#exportBox');
    if (!child) { box.innerHTML = ''; return; }
    var x = ui.exp;
    if (!x) {
      box.innerHTML = '<div class="aside-actions">' +
        '<button type="button" class="btn" data-action="export-open" data-val="csv" data-fk="exp-open-csv">' + EX_ICON.csv + tx('Izvezi CSV') + '</button>' +
        '<button type="button" class="btn" data-action="export-open" data-val="print" data-fk="exp-open-print">' + EX_ICON.print + tx('Ispiši') + '</button></div>';
      return;
    }
    var bad = !x.from || !x.to || x.from > x.to;
    var res = bad ? null : exportData(child, x);
    function opt(v, label, cur) { return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(label) + '</option>'; }
    function check(field, label, on) {
      return '<label class="check"><input type="checkbox" data-xfield="' + field + '"' + (on ? ' checked' : '') + '>' + esc(label) + '</label>';
    }
    var extra = '';
    if (x.what === 'meals') {
      extra = check('reactOnly', tx('Samo obroci s reakcijom'), x.reactOnly) +
        '<div class="field"><label for="xAllergen">' + tx('Alergen') + '</label><select id="xAllergen" class="input" data-xfield="allergen">' +
        opt('', tx('Svi obroci'), x.allergen) + ALLERGENS.map(function (a) { return opt(a, tx0(a), x.allergen); }).join('') + '</select></div>';
    } else if (x.what === 'doses') {
      extra = '<div class="field"><label for="xMed">' + tx('Lijek') + '</label><select id="xMed" class="input" data-xfield="medId">' +
        opt('', tx('Svi lijekovi'), x.medId) + childMeds(child).map(function (m) { return opt(m.id, m.name, x.medId); }).join('') + '</select></div>' +
        check('noAp', tx('Bez antipiretika (lijekova za temperaturu)'), x.noAp);
    } else if (x.what === 'temps') {
      extra = check('feverOnly', tx('Samo povišena temperatura (od 37,5 °C)'), x.feverOnly);
    } else {
      extra = '<div class="check-row">' + check('incMeals', tx('Obroci'), x.incMeals) + check('incDoses', tx('Terapije'), x.incDoses) + check('incTemps', tx('Temperatura'), x.incTemps) + '</div>' +
        (x.incMeals ? check('reactOnly', tx('Od obroka samo oni s reakcijom'), x.reactOnly) : '') +
        (x.incDoses ? check('noAp', tx('Terapije bez antipiretika'), x.noAp) : '');
    }
    var count = res ? res.count : 0;
    box.innerHTML = '<div class="export-panel" role="group" aria-labelledby="expTitle">' +
      '<strong id="expTitle">' + tx(x.kind === 'print' ? 'Ispis' : 'Izvoz u CSV') + ' — ' + esc(child.name) + '</strong>' +
      '<div class="field"><label for="xWhat">' + tx('Sadržaj') + '</label><select id="xWhat" class="input" data-xfield="what">' +
        ['all', 'meals', 'doses', 'temps'].map(function (k) { return opt(k, WHAT_LABEL[k], x.what); }).join('') + '</select></div>' +
      '<fieldset><legend>' + tx('Razdoblje') + '</legend><div class="chips">' + PRESETS.map(function (p) {
        return '<button type="button" class="chip sq" data-action="export-preset" data-val="' + p[0] + '" data-fk="exp-preset-' + p[0] + '" aria-pressed="' + (x.preset === p[0]) + '">' + p[1] + '</button>';
      }).join('') + '</div>' +
      '<div class="grid2" style="margin-top:10px"><div class="field"><label for="xFrom">' + tx('Od') + '</label><input id="xFrom" class="input" type="date" data-xfield="from" value="' + esc(x.from) + '" max="' + esc(isoOffset(0)) + '"></div>' +
      '<div class="field"><label for="xTo">' + tx('Do') + '</label><input id="xTo" class="input" type="date" data-xfield="to" value="' + esc(x.to) + '" max="' + esc(isoOffset(0)) + '"></div></div></fieldset>' +
      extra +
      (bad ? '<div class="alert-err" role="alert">' + tx('Odaberi razdoblje: datum „Od” mora biti prije datuma „Do”.') + '</div>'
        : '<p class="export-count" role="status">' + (count ? esc(res.summary) : tx('Za odabrane filtre nema zapisa.')) + '</p>') +
      '<div class="aside-actions"><button type="button" class="btn" data-action="export-cancel">' + tx('Odustani') + '</button>' +
      '<button type="button" class="btn' + (x.kind === 'csv' ? ' btn-primary' : '') + '" data-action="export-run" data-val="csv"' + (count ? '' : ' disabled') + '>' + EX_ICON.csv + tx('Preuzmi CSV') + '</button>' +
      '<button type="button" class="btn' + (x.kind === 'print' ? ' btn-primary' : '') + '" data-action="export-run" data-val="print"' + (count ? '' : ' disabled') + '>' + EX_ICON.print + tx('Ispiši') + '</button></div></div>';
  }

  function runExport(kind) {
    var child = activeChild(), x = ui.exp; if (!child || !x || !x.from || !x.to || x.from > x.to) return;
    var res = exportData(child, x);
    if (!res.count) return;
    if (kind === 'csv') downloadCsv(child, x, res); else printReport(child, x, res);
  }

  function downloadCsv(child, x, res) {
    var SEP = LANG === 'hr' ? ';' : ',';
    function cell(v) { v = String(v == null ? '' : v); return /[";,\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
    var lines = [res.head.map(cell).join(SEP)].concat(res.rows.map(function (r) { return r.map(cell).join(SEP); }));
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tanjuric-' + res.kindName + '-' + norm(child.name).replace(/[^a-z0-9]+/g, '-') + '-' + x.from + '_' + x.to + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    flash(tx('CSV je preuzet: {summary}.', { summary: res.summary }));
  }

  function printReport(child, x, res) {
    var known = knownOf(child);
    var pv = $('#printView');
    pv.innerHTML = '<header class="pv-head"><div><h1>' + esc(WHAT_LABEL[x.what]) + ' — ' + esc(child.name) + '</h1>' +
      '<p>' + tx('Razdoblje:') + ' <strong>' + esc(hrDate(x.from)) + ' – ' + esc(hrDate(x.to)) + '</strong>' +
      (res.filters.length ? ' · ' + esc(res.filters.join(' · ')) : '') + '</p>' +
      ((x.what === 'meals' || x.what === 'all') ? '<p>' + tx('Poznate alergije:') + ' <strong>' + esc(known.length ? known.map(tx0).join(', ') : tx('nisu upisane')) + '</strong></p>' : '') +
      '<p>' + esc(res.summary) + '</p></div>' +
      '<div class="pv-brand">Tanjurić<span>' + esc(tx('Ispisano {date}', { date: hrDate(isoOffset(0)) })) + '</span></div></header>' +
      '<table class="pv-table"><thead><tr>' + res.head.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      res.rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table><p class="pv-foot">' + tx('Tanjurić pomaže voditi evidenciju i ne zamjenjuje liječničku procjenu.') + '</p>';
    document.body.classList.add('print-report');
    function done() { document.body.classList.remove('print-report'); window.removeEventListener('afterprint', done); }
    window.addEventListener('afterprint', done);
    window.print();
    setTimeout(function () { if (!window.matchMedia('print').matches) done(); }, 1000);
  }

  // ---------- events ----------
  function addChild() {
    var input = $('#newChild');
    var name = input ? input.value.trim() : '';
    if (!name) { if (input) input.focus(); return; }
    var c = { id: uid(), name: name, allergies: [], owner: myId() };
    data.children.push(c);
    data.activeChild = c.id;
    ui.addingChild = false; ui.editingAllergies = true;
    closeForm();
    persist();
    renderAll();
    flash(tx('Dodano dijete: {name}. Označi poznate alergije u kartici „Poznate alergije”.', { name: name }));
  }

  // Prijedlog jela: mousedown ne smije maknuti fokus s polja, odabir na klik.
  document.addEventListener('mousedown', function (ev) { if (ev.target.closest && ev.target.closest('[data-ac]')) ev.preventDefault(); });
  document.addEventListener('click', function (ev) {
    var acItem = ev.target.closest && ev.target.closest('[data-ac]');
    if (acItem) { pickAc(Number(acItem.getAttribute('data-ac'))); return; }
    var b = ev.target.closest('[data-action]');
    if (!b) return;
    var a = b.getAttribute('data-action'), v = b.getAttribute('data-val'), id = b.getAttribute('data-id');
    var f = ui.form;
    if (/^share-/.test(a)) { shareAction(a, id); return; }
    switch (a) {
      case 'push-on': enablePush(); break;
      case 'push-off':
        disablePush().then(function () {
          renderRemindCard(activeChild());
          if (ui.form) updateFormReminder();
          flash(tx('Podsjetnici su isključeni na ovom uređaju.'));
          var on = $('[data-fk="push-on"]'); if (on) on.focus({ preventScroll: true });
        });
        break;
      case 'invite-accept': acceptInvite(); break;
      case 'invite-dismiss': clearInvite(); renderDemoBanner(); break;
      case 'new':
        if (ui.tab !== 'all') { openForm(ui.tab === 'doses' ? 'dose' : ui.tab === 'temps' ? 'temp' : 'meal', null); break; }
        if (!activeChild()) break;
        ui.form = null; ui.editingId = null; ui.formKind = null; ui.confirmDeleteId = null; ui.picking = true;
        renderForm(); renderList();
        $('#formCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
        $('[data-fk="pick-meal"]').focus({ preventScroll: true });
        break;
      case 'pick-new': openForm(v, null); break;
      case 'occ-confirm': case 'occ-undo': case 'occ-skip': case 'occ-unskip': case 'occ-reset': case 'occ-time-save':
        occAction(a, b.getAttribute('data-key')); break;
      case 'occ-edit':
        ui.occEdit = b.getAttribute('data-key'); renderList();
        if ($('#occTime')) $('#occTime').focus();
        break;
      case 'occ-edit-cancel':
        ui.occEdit = null; renderList(); break;
      case 'tab':
        if (ui.tab === v) break;
        ui.tab = v; ui.confirmDeleteId = null; ui.occEdit = null; ui.medForm = null; ui.medEditingId = null; ui.confirmMedDeleteId = null;
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
        f.medId = v; f.remind = null;
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
      case 'f-ap': {
        var prevAp = medById(f.apMedId), nextAp = medById(v);
        var prevApDefault = prevAp && prevAp.dose !== '' && prevAp.dose != null ? fmtNum(prevAp.dose) : '';
        f.apMedId = v; f.apRemind = null;
        b.parentNode.querySelectorAll('[data-action="f-ap"]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        $('#fApNew').hidden = v !== '__new';
        $('#fApDoseRow').hidden = !v;
        if (nextAp && nextAp.dose !== '' && nextAp.dose != null && (!f.apDose || f.apDose === prevApDefault)) {
          f.apDose = fmtNum(nextAp.dose); $('#fApDose').value = f.apDose;
        }
        showError(''); updateApInfo();
        if (v === '__new') $('#fApName').focus(); else if (v) $('#fApDose').focus();
        break;
      }
      case 'show-more': {
        var before = ui.daysShown;
        ui.daysShown += DAYS_MORE;
        renderList();
        // fokus na prvi novootvoreni dan, da čitač ekrana i tipkovnica nastave odande
        var sec = $('#list').querySelectorAll('section.day')[before], h = sec && sec.querySelector('h2');
        if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
        break;
      }
      case 'toggle-ap':
        ui.hideAp = !ui.hideAp;
        try { localStorage.setItem('tanjuric.hideAp', ui.hideAp ? '1' : ''); } catch (e) { /* ignore */ }
        renderList();
        var ta2 = document.querySelector('[data-fk="toggle-ap"]'); if (ta2) ta2.focus();
        break;
      case 'f-method':
        f.method = f.method === v ? '' : v;
        b.parentNode.querySelectorAll('[data-action="f-method"]').forEach(function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-val') === f.method)); });
        break;
      case 'med-new':
        ui.medForm = { name: '', unit: 'ml', dose: '', interval: '', note: '', times: [], since: '', until: '', antipyretic: false }; ui.medEditingId = null; ui.confirmMedDeleteId = null;
        renderAside(); $('#mName').focus(); break;
      case 'med-edit': {
        var em = medById(id); if (!em) break;
        ui.medEditingId = id; ui.confirmMedDeleteId = null;
        ui.medForm = { name: em.name, unit: em.unit, dose: em.dose === '' || em.dose == null ? '' : fmtNum(em.dose), interval: em.interval ? fmtNum(em.interval) : '', note: em.note || '',
          times: (em.times || []).slice(), since: em.since || '', until: em.until || '', antipyretic: !!em.antipyretic, apTouched: true };
        renderAside(); $('#mName').focus(); break;
      }
      case 'med-cancel':
        ui.medForm = null; ui.medEditingId = null; renderAside(); break;
      case 'med-save': saveMed(); break;
      case 'med-time-add': addMedTime(true); break;
      case 'med-time-remove': {
        var mr = ui.medForm; if (!mr) break;
        mr.times = mr.times.filter(function (t) { return t !== v; });
        renderAside(); $('#mTimeNew').focus(); break;
      }
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
        data.slots = data.slots.filter(function (s) { return s.medId !== id; });
        ui.confirmMedDeleteId = null;
        persist(); renderAll();
        if (ui.form && ui.formKind === 'dose') renderForm();
        flash(tx('Lijek je uklonjen iz popisa. Već upisane terapije ostaju sačuvane.')); break;
      case 'close-form': closeForm(); break;
      case 'save': saveForm(); break;
      case 'pick-child':
        data.activeChild = id; ui.confirmDeleteId = null; ui.occEdit = null; ui.exp = null; ui.editingAllergies = false;
        ui.shareConfirm = null; ui.shareErr = ''; ui.confirmChildDeleteId = null;
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
        ui.confirmChildDeleteId = null; ui.shareErr = ''; renderAside();
        var cda = document.querySelector('[data-fk="child-del-ask"]'); if (cda) cda.focus();
        break;
      case 'child-delete': {
        var gone = data.children.filter(function (c) { return c.id === id; })[0];
        if (!gone || !isMine(gone)) break;
        delete shares[id]; delete invites[id];
        function other(x) { return x.childId !== id; }
        data.entries = data.entries.filter(other); data.meds = data.meds.filter(other);
        data.doses = data.doses.filter(other); data.temps = data.temps.filter(other); data.slots = data.slots.filter(other);
        data.children = data.children.filter(function (c) { return c.id !== id; });
        data.activeChild = data.children.length ? data.children[0].id : null;
        ui.confirmChildDeleteId = null; ui.confirmDeleteId = null; ui.editingAllergies = false; ui.exp = null;
        ui.medForm = null; ui.medEditingId = null; ui.confirmMedDeleteId = null;
        if (!data.children.length) ui.addingChild = true;
        closeForm(); persist(); renderAll();
        flash(tx('Dijete {name} i svi njegovi zapisi su obrisani.', { name: gone.name }));
        if (ui.addingChild && $('#newChild')) $('#newChild').focus();
        break;
      }
      case 'f-type':
        f.type = v;
        b.parentNode.querySelectorAll('[data-action="f-type"]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        break;
      case 'f-allergen':
        b.setAttribute('aria-pressed', String(toggleIn(f.allergens, v))); updateWarn();
        if ($('#fAllergenFrom')) $('#fAllergenFrom').textContent = '';
        break;
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
        f.photo = ''; f.photoErr = ''; $('#fPhotoRow').innerHTML = photoRowHtml(); break;
      case 'photo-open': openLightbox(b.getAttribute('data-path'), b.getAttribute('data-caption'), b); break;
      case 'photo-close': closeLightbox(); break;
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
        flash(tx(kind === 'dose' ? 'Terapija je obrisana.' : kind === 'temp' ? 'Mjerenje je obrisano.' : 'Obrok je obrisan.')); break;
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
        data.doses = data.doses.filter(real); data.temps = data.temps.filter(real); data.slots = data.slots.filter(real);
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
          meds: L.meds.filter(keep), doses: L.doses.filter(keep), temps: L.temps.filter(keep), slots: [] };
        data.activeChild = data.children.length ? data.children[0].id : null;
        try { localStorage.setItem(STORE_KEY + '.imported', '1'); } catch (e) { /* ignore */ }
        ui.legacy = null; ui.addingChild = !data.children.length;
        closeForm(); persist(); renderAll();
        flash(tx('Podaci s ovog uređaja preneseni su na tvoj račun.')); break;
      }
      case 'skip-legacy':
        try { localStorage.setItem(STORE_KEY + '.imported', '1'); } catch (e) { /* ignore */ }
        ui.legacy = null; renderDemoBanner(); break;
      case 'set-lang': I18N.setLang(v); break;
      case 'sign-in': signIn(); break;
      case 'sign-out': signOut(); break;
      case 'export-open':
        ui.exp = newExport(v, activeChild()); renderAside();
        if ($('#xWhat')) $('#xWhat').focus();
        break;
      case 'export-cancel': {
        var wasKind = ui.exp ? ui.exp.kind : 'csv';
        ui.exp = null; renderAside();
        var eo = document.querySelector('[data-fk="exp-open-' + wasKind + '"]'); if (eo) eo.focus();
        break;
      }
      case 'export-preset':
        if (!ui.exp) break;
        setPreset(ui.exp, v, activeChild()); renderAside();
        var ep = document.querySelector('[data-fk="exp-preset-' + v + '"]'); if (ep) ep.focus();
        break;
      case 'export-run': runExport(v); break;
    }
  });

  document.addEventListener('input', function (ev) {
    var t = ev.target;
    if (t.id === 'q') { ui.q = t.value; renderList(); return; }
    var field = t.getAttribute('data-field');
    if (field && ui.form) {
      ui.form[field] = t.type === 'checkbox' ? t.checked : t.value;
      if (field === 'food' || field === 'dose' || field === 'value' || field === 'newMedName') showError('');
      if (t.id === 'fFood') updateAc();
      if (ui.formKind === 'dose' && (field === 'date' || field === 'time' || field === 'newMedUnit' || field === 'dose')) updateDoseInfo();
      if (ui.formKind === 'temp' && field === 'value') updateTempBadge();
      if (ui.formKind === 'temp' && (field === 'date' || field === 'time' || field === 'apDose' || field === 'apNewUnit')) updateApInfo();
      return;
    }
    var mfield = t.getAttribute('data-mfield');
    if (mfield && ui.medForm) {
      ui.medForm[mfield] = t.type === 'checkbox' ? t.checked : t.value;
      if (mfield === 'antipyretic') ui.medForm.apTouched = true;
      if (mfield === 'name' && !ui.medForm.apTouched && $('#mAp')) { ui.medForm.antipyretic = looksAntipyretic(t.value); $('#mAp').checked = ui.medForm.antipyretic; }
      var me = $('#mError'); if (me) me.hidden = true;
    }
  });

  // Vrijeme za svakodnevnu terapiju dodaje se samo: kad je polje potpuno upisano
  // (nakon kratke stanke, da se ne doda napola utipkana minuta), pri izlasku iz polja,
  // na Enter i pri spremanju lijeka.
  var medTimeT = null;
  function addMedTime(keepFocus) {
    clearTimeout(medTimeT);
    var mf = ui.medForm, inp = $('#mTimeNew'); if (!mf || !inp) return false;
    var nt = (inp.value || '').slice(0, 5);
    if (!/^\d\d:\d\d$/.test(nt)) return false;
    var added = mf.times.indexOf(nt) < 0;
    if (added) { mf.times.push(nt); mf.times.sort(); }
    if (!mf.since) mf.since = toIso(new Date());
    renderAside();
    var ni = $('#mTimeNew'); if (keepFocus && ni) ni.focus();
    return added;
  }

  function saveMed() {
    var m = ui.medForm, child = activeChild(); if (!m || !child) return;
    addMedTime(false);   // vrijeme koje je upisano, ali još nije dodano
    var err = $('#mError');
    function fail(msg, focusSel) { err.hidden = false; err.textContent = msg; if (focusSel) $(focusSel).focus(); }
    var name = String(m.name || '').trim();
    if (!name) return fail(tx('Upiši naziv lijeka.'), '#mName');
    var dup = childMeds(child).filter(function (x) { return x.id !== ui.medEditingId && norm(x.name) === norm(name); })[0];
    if (dup) return fail(tx('Lijek s tim nazivom već je u popisu.'), '#mName');
    var dose = String(m.dose).trim() === '' ? '' : parseNum(m.dose);
    if (dose !== '' && (isNaN(dose) || dose <= 0)) return fail(tx('Doza mora biti broj, npr. 5 ili 2,5.'), '#mDose');
    var interval = String(m.interval).trim() === '' ? '' : parseNum(m.interval);
    if (interval !== '' && (isNaN(interval) || interval <= 0 || interval > 168)) return fail(tx('Razmak upiši u satima, npr. 6.'), '#mInterval');
    var times = (m.times || []).slice().sort(), since = '', until = '';
    if (times.length) {
      if (dose === '') return fail(tx('Za svakodnevnu terapiju upiši uobičajenu dozu — ona se upisuje pri svakoj potvrdi.'), '#mDose');
      since = m.since || toIso(new Date());
      until = m.until || '';
      // Promijenjeni termini vrijede od danas, da se ranijim danima ne pojave nepotvrđeni termini.
      var prevMed = medById(ui.medEditingId), todayIso = toIso(new Date());
      if (prevMed && (prevMed.times || []).join() !== times.join() && since === (prevMed.since || '') && since < todayIso) since = todayIso;
      if (until && until < since) return fail(tx('Datum „Do” ne može biti prije datuma „Od”.'), '#mUntil');
    }
    var existing = medById(ui.medEditingId);
    var med = {
      id: existing ? existing.id : uid(),
      childId: existing ? existing.childId : child.id,
      name: name, unit: m.unit || 'ml', dose: dose, interval: interval, note: String(m.note || '').trim(),
      times: times, since: since, until: until, antipyretic: !!m.antipyretic
    };
    var prev = data.meds;
    data.meds = existing ? prev.map(function (x) { return x.id === med.id ? med : x; }) : prev.concat([med]);
    if (!persist()) { data.meds = prev; return fail(tx('Spremanje nije uspjelo — preglednik ne dopušta spremanje podataka.')); }
    ui.medForm = null; ui.medEditingId = null;
    renderAll();
    if (ui.form && ui.formKind === 'dose') renderForm();
    flash(tx(existing ? 'Lijek je ažuriran.' : 'Lijek je dodan u popis.'));
    var nb = document.querySelector('[data-fk="med-new"]'); if (nb) nb.focus();
  }

  document.addEventListener('change', function (ev) {
    var t = ev.target;
    if (t.id === 'mTimeNew') {
      clearTimeout(medTimeT);
      if (t.value) medTimeT = setTimeout(function () { addMedTime(document.activeElement === t); }, 900);
      return;
    }
    var pp = t.getAttribute && t.getAttribute('data-push');
    if (pp) { setPushPref(pp, t.checked); return; }
    var xf = t.getAttribute && t.getAttribute('data-xfield');
    if (xf && ui.exp) {
      ui.exp[xf] = t.type === 'checkbox' ? t.checked : t.value;
      if (xf === 'from' || xf === 'to') ui.exp.preset = '';
      if (xf === 'what') { ui.exp.allergen = ''; ui.exp.medId = ''; }
      var keepId = t.id, keepFk = t.getAttribute('data-xfield');
      renderAside();
      var back = keepId ? document.getElementById(keepId) : null;
      if (!back) back = document.querySelector('[data-xfield="' + keepFk + '"]');
      if (back) back.focus();
      return;
    }
    if (t.id === 'fType') { ui.fType = t.value; renderList(); }
    else if (t.id === 'fAllergen') { ui.fAllergen = t.value; renderList(); }
    else if (t.id === 'fRange') { ui.fRange = t.value; renderList(); }
    else if (t.id === 'fPhotoInput' || t.id === 'fCameraInput') { readPhoto(t.files && t.files[0]); }
  });

  document.addEventListener('focusout', function (ev) {
    // Izlazak iz polja za vrijeme lijeka dodaje vrijeme; ne kad se klikne gumb u obrascu
    // (Spremi ga doda sam, a novi prikaz bi „pojeo” klik).
    if (ev.target.id === 'mTimeNew') {
      var rt = ev.relatedTarget;
      if (!(rt && rt.closest && rt.closest('#medForm button'))) addMedTime(false);
      return;
    }
    if (ev.target.id === 'fFood') setTimeout(function () { if (!document.activeElement || document.activeElement.id !== 'fFood') closeAc(); }, 150);
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.target.id === 'fFood' && ac.open) {
      var n = ac.items.length;
      if (ev.key === 'ArrowDown') { ev.preventDefault(); ac.active = (ac.active + 1) % n; renderAc(); return; }
      if (ev.key === 'ArrowUp') { ev.preventDefault(); ac.active = ac.active <= 0 ? n - 1 : ac.active - 1; renderAc(); return; }
      if (ev.key === 'Enter' && ac.active >= 0) { ev.preventDefault(); pickAc(ac.active); return; }
      if (ev.key === 'Escape') { ev.preventDefault(); closeAc(); return; }
      if (ev.key === 'Tab') closeAc();
    }
    if (!$('#lightbox').hidden) {
      if (ev.key === 'Escape') { ev.preventDefault(); closeLightbox(); }
      else if (ev.key === 'Tab') { ev.preventDefault(); $('#lbClose').focus(); }
      return;
    }
    if (ev.key === 'Enter' && ev.target.id === 'mTimeNew') { ev.preventDefault(); addMedTime(true); return; }
    if (ev.key === 'Enter' && ev.target.id === 'occTime') {
      ev.preventDefault();
      var go = document.querySelector('[data-action="occ-time-save"]');
      if (go) go.click();
      return;
    }
    if (ev.key === 'Escape' && ev.target.id === 'occTime') { ui.occEdit = null; renderList(); return; }
    if (ev.target.getAttribute && ev.target.getAttribute('data-mfield') && ev.key === 'Enter' && ev.target.tagName === 'INPUT') {
      ev.preventDefault(); saveMed(); return;
    }
    if (ev.target.id === 'newChild') {
      if (ev.key === 'Enter') { ev.preventDefault(); addChild(); }
      else if (ev.key === 'Escape' && data.children.length) { ui.addingChild = false; renderChildren(); }
    }
  });

  // Plan terapija prikazuje „za 20 min” / „kasni 5 min” — osvježi ga svake minute dok se ne uređuje.
  setInterval(function () {
    if (!auth.user || document.hidden || ui.occEdit) return;
    if (ui.tab !== 'doses' && ui.tab !== 'all') return;
    var ae = document.activeElement;
    if (ae && ae.closest && ae.closest('#list .confirm')) return;
    renderList();
  }, 60000);

  // ---------- init ----------
  $('#fType').insertAdjacentHTML('beforeend', TYPES.map(function (t) { return '<option value="' + esc(t) + '">' + esc(tx0(t)) + '</option>'; }).join(''));
  $('#fAllergen').insertAdjacentHTML('beforeend', ALLERGENS.map(function (t) { return '<option value="' + esc(t) + '">' + esc(tx0(t)) + '</option>'; }).join(''));

  // Prekidač jezika (na početnoj stranici i u podnožju aplikacije). Izbor se pamti u pregledniku.
  function renderLangSwitch() {
    var names = { hr: 'Hrvatski', en: 'English' };
    var html = '<span class="lang-switch" role="group" aria-label="' + tx('Jezik') + '">' + I18N.langs.map(function (l) {
      return '<button type="button" data-action="set-lang" data-val="' + l + '" lang="' + l + '" aria-pressed="' + (l === LANG) + '" title="' + names[l] + '">' + l.toUpperCase() + '</button>';
    }).join('') + '</span>';
    ['#langSwitchLp', '#langSwitchApp'].forEach(function (s) { var el = $(s); if (el) el.innerHTML = html; });
  }
  renderLangSwitch();
  function signIn() {
    var e = $('#authError'); e.hidden = true;
    if (!sb) { e.hidden = false; e.textContent = tx('Prijava trenutno nije dostupna (nedostaje konfiguracija).'); return; }
    setSignInDisabled(true);
    sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } }).then(function (res) {
      if (res.error) {
        setSignInDisabled(false); e.hidden = false; e.textContent = tx('Prijava nije uspjela: {msg}', { msg: res.error.message });
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
    // Podsjetnici ovog uređaja se gase prije odjave (brisanje treba prijavu); najviše 3 s čekanja.
    var off = Promise.race([disablePush(), new Promise(function (r) { setTimeout(r, 3000); })]);
    off.then(function () { return sb.auth.signOut({ scope: 'local' }); }).then(function () {
      if (u) { try { localStorage.removeItem('tanjuric.cache.' + u.id); } catch (e) { /* ignore */ } }
    });
  }

  function onUser(user) {
    if (auth.ready && (user && user.id) === (auth.user && auth.user.id)) return;
    auth.ready = true;
    auth.user = user; photoUrls = {}; closeLightbox();
    data = emptyData(); synced = {}; shares = {}; invites = {};
    push.sub = null; push.prefs = null; push.err = ''; push.busy = false;
    ui.form = null; ui.editingId = null; ui.formKind = null; ui.legacy = null; ui.addingChild = false;
    ui.invite = null; ui.shareConfirm = null; ui.shareErr = ''; ui.shareBusy = false;
    if (!user) { setSignInDisabled(false); $('#inviteNote').hidden = !pendingInvite(); showScreen('login'); return; }
    var name = (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || user.email || '';
    $('#userName').textContent = name;
    $('#userAvatar').textContent = (name.trim().charAt(0) || '?').toUpperCase();
    $('#userName').title = user.email || '';
    $('#adminLink').hidden = true;
    loadUserData();
    // Poveznica na administraciju samo za administratore (public.admins).
    sb.rpc('is_admin').then(function (res) {
      if (auth.user === user) $('#adminLink').hidden = res.data !== true;
    });
  }

  if (!sb) {
    showScreen('login');
    var ce = $('#authError'); ce.hidden = false;
    ce.textContent = tx('Aplikacija nije povezana s poslužiteljem (nedostaje config.js).');
  } else {
    showScreen('loading');
    sb.auth.onAuthStateChange(function (_event, session) {
      // poziv Supabasea unutar ovog callbacka može zablokirati; odgodi
      setTimeout(function () { onUser(session ? session.user : null); }, 0);
    });
  }
  window.addEventListener('online', function () { if (sync.state === 'error') scheduleSync(0); });

  // Promjene drugog roditelja: osvježi kad se korisnik vrati u aplikaciju, a dok je
  // otvorena i dijete je podijeljeno, i svake minute.
  var lastRefresh = Date.now();
  function refreshNow() {
    if (!auth.user || document.hidden) return;
    lastRefresh = Date.now();
    refreshFromServer(false);
    loadShares();
  }
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && Date.now() - lastRefresh > 15000) refreshNow();
  });
  setInterval(function () {
    if (Object.keys(shares).length && Date.now() - lastRefresh > 55000) refreshNow();
  }, 60000);
  window.addEventListener('beforeunload', function (ev) {
    if (sync.busy || sync.state !== 'ok') { ev.preventDefault(); ev.returnValue = ''; }
  });
})();
