(function () {
  'use strict';

  var ALLERGENS = ['Gluten', 'Mlijeko', 'Jaja', 'Kikiriki', 'Orašasti plodovi', 'Soja', 'Riba', 'Rakovi', 'Mekušci', 'Celer', 'Gorušica', 'Sezam', 'Sumporni dioksid', 'Lupina'];
  var TYPES = ['Doručak', 'Jutarnja užina', 'Ručak', 'Popodnevna užina', 'Večera', 'Ostalo'];
  var SYMPTOMS = ['Osip', 'Svrbež', 'Oticanje usana ili lica', 'Bol u trbuhu', 'Mučnina', 'Povraćanje', 'Proljev', 'Nadutost', 'Kašalj ili piskanje', 'Curenje nosa', 'Ekcem'];
  var SEVERITY = ['Blaga', 'Umjerena', 'Jaka'];
  var SEV_CLASS = { Blaga: 'mild', Umjerena: 'mod', Jaka: 'sev' };
  var STORE_KEY = 'tanjuric.v1';

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
      ]
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var d = JSON.parse(raw);
        if (d && Array.isArray(d.children) && Array.isArray(d.entries)) return d;
      }
    } catch (e) { /* storage unavailable */ }
    return demoData();
  }

  var data = load();
  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); return true; }
    catch (e) { return false; }
  }

  var ui = {
    q: '', fType: '', fAllergen: '', fRange: '', fReaction: false,
    form: null, editingId: null, confirmDeleteId: null,
    addingChild: false, editingAllergies: false
  };

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
    if (!child) { kl.innerHTML = ''; return; }
    kl.innerHTML = ICON.warn + '<span class="muted">Poznate alergije (' + esc(child.name) + '):</span>' +
      (known.length ? known.map(function (k) { return '<span class="tag warn">' + esc(k) + '</span>'; }).join('')
        : '<span class="muted" style="font-style:italic">nisu upisane</span>');
  }

  function renderDemoBanner() {
    var hasDemo = data.children.some(function (c) { return c.demo; }) || data.entries.some(function (e) { return e.demo; });
    $('#demoBanner').innerHTML = hasDemo
      ? '<div class="demo"><span>Prikazani su <strong>primjeri</strong> da vidiš kako dnevnik izgleda.</span>' +
        '<button type="button" class="btn-link" data-action="clear-demo">Obriši primjere i kreni ispočetka</button></div>'
      : '';
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

  function renderList() {
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
    var groups = [];
    list.forEach(function (e) {
      var g = groups[groups.length - 1];
      if (!g || g.date !== e.date) { g = { date: e.date, items: [] }; groups.push(g); }
      g.items.push(e);
    });
    host.innerHTML = groups.map(function (g) {
      var l = dayLabel(g.date);
      return '<section class="day"><div class="day-head"><h2>' + esc(l.rel) + '</h2><span class="muted" style="font-size:14px">' + esc(l.full) + '</span>' +
        '<span class="n">' + g.items.length + ' ' + plural(g.items.length, 'obrok', 'obroka', 'obroka') + '</span></div>' +
        g.items.map(function (e) { return entryHtml(e, known); }).join('') + '</section>';
    }).join('<div style="height:10px"></div>');
  }

  // ---------- render: aside ----------
  function renderAside() {
    var child = activeChild();
    var stats = $('#statsCard'), ac = $('#allergyCard');
    $('#dataCard').hidden = !child;
    if (!child) { stats.hidden = true; ac.hidden = true; return; }
    stats.hidden = false; ac.hidden = false;

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
    renderList();
    renderAside();
    var noChild = !activeChild();
    $('#newBtn').disabled = noChild;
    $('#fab').hidden = noChild || !!ui.form;
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
    $('#fab').hidden = !!ui.form || !activeChild();
    if (!ui.form) { host.innerHTML = ''; return; }
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

  function openForm(entry) {
    if (!activeChild()) return;
    ui.confirmDeleteId = null;
    if (entry) {
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
      var target = entry ? $('#formTitle') : $('#fFood');
      if (target) { if (entry) target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
    }
  }

  function closeForm() {
    ui.form = null; ui.editingId = null;
    renderForm();
  }

  function saveForm() {
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
    var rows = childEntries(child).slice().sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
    var head = ['Datum', 'Vrijeme', 'Obrok', 'Jelo', 'Alergeni', 'Reakcija', 'Jačina', 'Simptomi', 'Nakon (min)', 'Bilješka'];
    function cell(v) { v = String(v == null ? '' : v); return /[";\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
    var lines = [head.join(';')].concat(rows.map(function (e) {
      var d = parseIso(e.date);
      return [pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() + '.', e.time, e.type, e.food, e.allergens.join(', '),
        e.reaction ? 'Da' : 'Ne', e.reaction ? e.severity : '', e.symptoms.join(', '), e.reaction ? e.onset : '', e.note].map(cell).join(';');
    }));
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tanjuric-' + norm(child.name).replace(/[^a-z0-9]+/g, '-') + '-' + toIso(new Date()) + '.csv';
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
      case 'new': openForm(null); break;
      case 'close-form': closeForm(); break;
      case 'save': saveForm(); break;
      case 'pick-child':
        data.activeChild = id; ui.confirmDeleteId = null; ui.editingAllergies = false;
        closeForm(); persist(); renderAll(); break;
      case 'add-child-start':
        ui.addingChild = true; renderChildren(); $('#newChild').focus(); break;
      case 'add-child-cancel':
        ui.addingChild = false; renderChildren(); break;
      case 'add-child-confirm': addChild(); break;
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
        openForm(data.entries.filter(function (x) { return x.id === id; })[0]); break;
      case 'ask-delete':
        ui.confirmDeleteId = id; renderList();
        var del = document.querySelector('[data-fk="del-' + id + '"]'); if (del) del.focus();
        break;
      case 'cancel-delete':
        ui.confirmDeleteId = null; renderList();
        var ask = document.querySelector('[data-fk="ask-' + id + '"]'); if (ask) ask.focus();
        break;
      case 'do-delete':
        data.entries = data.entries.filter(function (x) { return x.id !== id; });
        ui.confirmDeleteId = null;
        if (ui.editingId === id) closeForm();
        persist(); renderAll(); flash('Obrok je obrisan.'); break;
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
        data.entries = data.entries.filter(function (e) { return !e.demo; });
        data.children = data.children.filter(function (c) { return !c.demo || data.entries.some(function (e) { return e.childId === c.id; }); });
        data.children.forEach(function (c) { delete c.demo; });
        if (!data.children.length) { data.activeChild = null; ui.addingChild = true; }
        closeForm(); persist(); renderAll();
        if (ui.addingChild && $('#newChild')) $('#newChild').focus();
        break;
      case 'export-csv': exportCsv(); break;
      case 'print': window.print(); break;
    }
  });

  document.addEventListener('input', function (ev) {
    var t = ev.target;
    if (t.id === 'q') { ui.q = t.value; renderList(); return; }
    var field = t.getAttribute('data-field');
    if (field && ui.form) { ui.form[field] = t.value; if (field === 'food') showError(''); }
  });

  document.addEventListener('change', function (ev) {
    var t = ev.target;
    if (t.id === 'fType') { ui.fType = t.value; renderList(); }
    else if (t.id === 'fAllergen') { ui.fAllergen = t.value; renderList(); }
    else if (t.id === 'fRange') { ui.fRange = t.value; renderList(); }
    else if (t.id === 'fPhotoInput') { readPhoto(t.files && t.files[0]); }
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.target.id === 'newChild') {
      if (ev.key === 'Enter') { ev.preventDefault(); addChild(); }
      else if (ev.key === 'Escape' && data.children.length) { ui.addingChild = false; renderChildren(); }
    }
  });

  // ---------- init ----------
  $('#fType').insertAdjacentHTML('beforeend', TYPES.map(function (t) { return '<option>' + esc(t) + '</option>'; }).join(''));
  $('#fAllergen').insertAdjacentHTML('beforeend', ALLERGENS.map(function (t) { return '<option>' + esc(t) + '</option>'; }).join(''));
  if (!data.children.length) ui.addingChild = true;
  renderAll();
})();
