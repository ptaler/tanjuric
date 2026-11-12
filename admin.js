(function () {
  'use strict';

  // Admin dashboard. Podatke daju funkcije u bazi (admin_overview, admin_users),
  // koje same provjeravaju je li prijavljeni korisnik u public.admins.

  var CFG = window.TANJURIC_CONFIG || {};
  var sb = window.supabase && CFG.supabaseUrl ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey) : null;
  var TZ = 'Europe/Zagreb';
  var PERIOD_KEY = 'tanjuric.admin.period';
  var C = { meals: '#0D9488', doses: '#7C3AED', temps: '#D97706', react: '#EA580C', sev: ['#F59E0B', '#EA580C', '#B91C1C'] };
  var SERIES = [
    { key: 'meals', label: 'Obroci', color: C.meals },
    { key: 'doses', label: 'Terapije', color: C.doses },
    { key: 'temps', label: 'Temperature', color: C.temps }
  ];
  var FUNNEL = {
    registered: 'Registrirali se',
    child: 'Dodali dijete',
    entry: 'Upisali barem jedan podatak',
    three_days: 'Upisivali barem 3 različita dana',
    active_7: 'Aktivni u zadnjih 7 dana'
  };
  var WEEKDAYS = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'];
  var DAY = 86400000;

  var state = {
    user: null, overview: null, users: [], loadedAt: 0, busy: false,
    q: '', filter: 'all', sort: { key: 'created_at', dir: -1 }, limit: 25
  };
  var PAGE = 25;

  // ---------- pomoćne ----------

  function $(sel) { return document.querySelector(sel); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function int(n) { return Number(n || 0).toLocaleString('hr-HR'); }
  function pct(a, b) { return b ? Math.round(a / b * 100) : 0; }
  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }
  function bytes(n) {
    n = Number(n || 0);
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toLocaleString('hr-HR', { maximumFractionDigits: 0 }) + ' kB';
    if (n < 1073741824) return (n / 1048576).toLocaleString('hr-HR', { maximumFractionDigits: 1 }) + ' MB';
    return (n / 1073741824).toLocaleString('hr-HR', { maximumFractionDigits: 2 }) + ' GB';
  }
  var fmtDate = new Intl.DateTimeFormat('hr-HR', { timeZone: TZ, day: 'numeric', month: 'numeric', year: 'numeric' });
  var fmtDateTime = new Intl.DateTimeFormat('hr-HR', { timeZone: TZ, day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  var fmtTime = new Intl.DateTimeFormat('hr-HR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
  function ts(iso) { return iso ? new Date(iso).getTime() : 0; }
  // 'YYYY-MM-DD' -> '12. 11.' / '12. 11. 2026.'
  function dayShort(d) { var p = d.split('-'); return Number(p[2]) + '. ' + Number(p[1]) + '.'; }
  function dayLong(d) {
    var p = d.split('-'), dt = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    return WEEKDAYS[(dt.getDay() + 6) % 7] + ', ' + Number(p[2]) + '. ' + Number(p[1]) + '. ' + p[0] + '.';
  }
  function rel(iso) {
    if (!iso) return '—';
    var diff = Date.now() - ts(iso);
    if (diff < 60000) return 'upravo';
    if (diff < 3600000) return 'prije ' + Math.floor(diff / 60000) + ' min';
    if (diff < DAY) return 'prije ' + Math.floor(diff / 3600000) + ' h';
    var d = Math.floor(diff / DAY);
    if (d === 1) return 'jučer';
    if (d < 31) return 'prije ' + d + ' dana';
    return fmtDate.format(new Date(iso));
  }
  function whenHtml(iso) {
    if (!iso) return '<span class="muted">—</span>';
    return '<span class="when" title="' + esc(fmtDateTime.format(new Date(iso))) + '">' + esc(rel(iso)) + '</span>';
  }
  function initial(s) { return (String(s || '').trim().charAt(0) || '?').toUpperCase(); }
  function niceTicks(max) {
    if (!(max > 0)) return [0, 1];
    var raw = max / 4, mag = Math.pow(10, Math.floor(Math.log10(raw))), norm = raw / mag;
    var step = Math.max(1, (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag);
    var top = Math.ceil(max / step) * step, out = [];
    for (var v = 0; v <= top + 1e-9; v += step) out.push(v);
    return out;
  }
  function tipRow(color, label, value) {
    return '<div class="row">' + (color ? '<span class="sw" style="background:' + color + '"></span>' : '') +
      esc(label) + ': <b>' + esc(value) + '</b></div>';
  }
  function tipAttr(html) { return ' data-tip="' + esc(html) + '"'; }

  // ---------- zasloni i prijava ----------

  function show(name) {
    $('#loadingScreen').hidden = name !== 'loading';
    $('#loginScreen').hidden = name !== 'login';
    $('#deniedScreen').hidden = name !== 'denied';
    $('#shell').hidden = name !== 'app';
  }

  function signIn() {
    var e = $('#loginError'); e.hidden = true;
    sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } }).then(function (res) {
      if (res.error) { e.hidden = false; e.textContent = 'Prijava nije uspjela: ' + res.error.message; }
    });
  }
  function signOut() { sb.auth.signOut({ scope: 'local' }); }

  function onUser(user) {
    if (state.ready && (user && user.id) === (state.user && state.user.id)) return;
    state.ready = true;
    state.user = user; state.overview = null; state.users = [];
    if (!user) { show('login'); return; }
    var name = (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || user.email || '';
    $('#userName').textContent = name;
    $('#userName').title = user.email || '';
    $('#userAvatar').textContent = initial(name);
    show('loading');
    sb.rpc('is_admin').then(function (res) {
      if (res.error || res.data !== true) {
        $('#deniedEmail').textContent = user.email || name;
        show('denied');
        if (res.error) console.warn('is_admin:', res.error.message);
        return;
      }
      show('app');
      load();
    });
  }

  // ---------- dohvat ----------

  function period() { return Number($('#period').value) || 30; }

  function load() {
    if (state.busy) return;
    state.busy = true;
    var btn = $('#refreshBtn'); btn.classList.add('spin'); btn.disabled = true;
    $('#loadError').hidden = true;
    Promise.all([
      sb.rpc('admin_overview', { p_days: period() }),
      sb.rpc('admin_users')
    ]).then(function (res) {
      var err = res[0].error || res[1].error;
      if (err) throw err;
      state.overview = res[0].data;
      state.users = res[1].data || [];
      state.loadedAt = Date.now();
      render();
      $('#updated').textContent = 'Ažurirano u ' + fmtTime.format(new Date());
    }).catch(function (err) {
      var e = $('#loadError'); e.hidden = false;
      e.textContent = 'Podaci se nisu učitali: ' + (err && err.message ? err.message : err);
    }).then(function () {
      state.busy = false; btn.classList.remove('spin'); btn.disabled = false;
    });
  }

  // ---------- iscrtavanje ----------

  function render() {
    var o = state.overview, t = o.totals, u = o.users, total = t.users;
    var daily = o.days > 90 ? weekly(o.daily || []) : (o.daily || []);   // mini-grafovi: po tjednu za dulja razdoblja
    var entriesDaily = daily.map(function (d) { return d.meals + d.doses + d.temps; });

    var kpis = [
      kpi('Korisnici', int(total), '<b>+' + int(u.new_7) + '</b> u zadnjih 7 dana'),
      kpi('Aktivni danas', int(u.active_1), 'upisali ili mijenjali podatke u zadnja 24 h'),
      kpi('Aktivni 7 dana', int(u.active_7), '<b>' + pct(u.active_7, total) + ' %</b> svih korisnika'),
      kpi('Aktivni 30 dana', int(u.active_30), '<b>' + pct(u.active_30, total) + ' %</b> svih korisnika'),
      kpi('Upisi u razdoblju', int(u.entries_period), 'obroci, terapije i temperature', sparkHtml(entriesDaily)),
      kpi('Nove registracije', int(u.new_period), 'u odabranom razdoblju', sparkHtml(daily.map(function (d) { return d.signups; })))
    ].join('');

    var html =
      '<div class="kpis">' + kpis + '</div>' +

      '<h2 class="section-title">Korištenje</h2>' +
      '<div class="grid">' +
        card('Aktivni korisnici po danu', 'Korisnici koji su taj dan nešto upisali ili promijenili',
          '<div class="chart" data-chart="active"></div>') +
        card(o.days > 90 ? 'Nove registracije po tjednu' : 'Nove registracije po danu', 'Prvi ulazak Google računom',
          '<div class="chart" data-chart="signups"></div>') +
      '</div>' +
      card(o.days > 90 ? 'Upisi po tjednu' : 'Upisi po danu', 'Novi zapisi u dnevniku, po vrsti',
        legendHtml(SERIES) + '<div class="chart" data-chart="entries"></div>' + dailyTable(o.daily || [])) +
      '<div class="grid">' +
        card('Aktivacija korisnika', 'Koliko je korisnika došlo do kojeg koraka (svi korisnici, od početka)', funnelHtml(o.funnel)) +
        card('Djeca po korisniku', 'Broj profila djece na računu', childrenHtml(o.children_per_user, total)) +
      '</div>' +

      '<h2 class="section-title">Korisnici</h2>' +
      usersCard() +

      '<h2 class="section-title">Sadržaj dnevnika</h2>' +
      '<div class="grid3">' +
        card('Alergeni', 'Obroci koji sadrže alergen i koliko ih je završilo reakcijom',
          legendHtml([{ label: 'Obroci s alergenom', color: C.meals }, { label: 'S reakcijom', color: C.react }]) + allergensHtml(o.allergens)) +
        card('Reakcije', 'Simptomi i težina kod obroka s reakcijom', reactionsHtml(o, t)) +
        card('Vrste obroka', 'Svi upisani obroci', hbarsSimple(o.meal_types, C.meals)) +
      '</div>' +
      '<div class="grid3">' +
        card('Kada se upisuje', 'Sat u danu, odabrano razdoblje', '<div class="chart" data-chart="hours"></div>') +
        card('Dan u tjednu', 'Upisi po danima u tjednu, odabrano razdoblje', '<div class="chart" data-chart="weekdays"></div>') +
        card('Mjerenje temperature', 'Način mjerenja, sva mjerenja', hbarsSimple(o.temp_methods, C.temps)) +
      '</div>' +
      card('Podaci i pohrana', 'Ukupno u bazi, svi korisnici', factsHtml(t));

    $('#dash').innerHTML = html;
    renderUsers();
    drawCharts();
  }

  function kpi(label, value, note, extra) {
    return '<div class="kpi"><span class="kpi-label">' + esc(label) + '</span><span class="kpi-value">' + value + '</span>' +
      '<span class="kpi-note">' + note + '</span>' + (extra || '') + '</div>';
  }
  function card(title, sub, body, head) {
    return '<section class="card"><div class="card-head"><div><h2>' + esc(title) + '</h2>' +
      (sub ? '<p class="card-sub">' + esc(sub) + '</p>' : '') + '</div>' + (head || '') + '</div>' + body + '</section>';
  }
  function legendHtml(series) {
    return '<div class="legend">' + series.map(function (s) {
      return '<span><span class="sw" style="background:' + s.color + '"></span>' + esc(s.label) + '</span>';
    }).join('') + '</div>';
  }
  function emptyHtml(text) { return '<div class="empty">' + esc(text) + '</div>'; }

  function sparkHtml(vals) {
    if (!vals.length || !vals.some(function (v) { return v > 0; })) return '';
    var W = 160, H = 30, max = Math.max.apply(null, vals) || 1, n = vals.length;
    var pts = vals.map(function (v, i) {
      return (n === 1 ? W / 2 : i / (n - 1) * W).toFixed(1) + ' ' + (H - 2 - v / max * (H - 4)).toFixed(1);
    });
    return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" width="100%" height="' + H + '" aria-hidden="true">' +
      '<path d="M' + pts.join(' L') + '" fill="none" stroke="' + C.meals + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>';
  }

  function dailyTable(daily) {
    var rows = daily.slice().reverse().map(function (d) {
      return '<tr><td>' + esc(dayLong(d.d)) + '</td><td>' + d.active + '</td><td>' + d.signups + '</td><td>' + d.meals + '</td><td>' + d.doses + '</td><td>' + d.temps + '</td></tr>';
    }).join('');
    return '<details class="tbl"><summary>Prikaži tablicu po danima</summary><div class="scroll"><table>' +
      '<thead><tr><th>Dan</th><th>Aktivni</th><th>Registracije</th><th>Obroci</th><th>Terapije</th><th>Temperature</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div></details>';
  }

  function funnelHtml(steps) {
    var base = steps[0] ? steps[0].n : 0;
    if (!base) return emptyHtml('Još nema korisnika.');
    return '<div class="funnel">' + steps.map(function (s, i) {
      var prev = i ? steps[i - 1].n : 0;
      return '<div class="fn-row"><div class="fn-top"><span>' + esc(FUNNEL[s.key] || s.key) + '</span><span><b>' + int(s.n) + '</b> <span class="muted">· ' + pct(s.n, base) + ' %</span></span></div>' +
        '<div class="fn-track"><div class="fn-fill" style="width:' + Math.max(pct(s.n, base), s.n ? 1 : 0) + '%"></div></div>' +
        (i && i < 4 ? '<span class="fn-step">' + pct(s.n, prev) + ' % od prethodnog koraka</span>' : '') + '</div>';
    }).join('') + '</div>';
  }

  // items: [{ label, tip, bars: [{ v, color, label }] }]
  function hbars(items, max) {
    if (!items.length) return emptyHtml('Još nema podataka.');
    max = max || Math.max.apply(null, items.map(function (it) { return Math.max.apply(null, it.bars.map(function (b) { return b.v; })); })) || 1;
    var thin = items[0].bars.length > 1;
    return '<div class="hbars">' + items.map(function (it) {
      var tip = '<b>' + esc(it.label) + '</b>' + it.bars.map(function (b) { return tipRow(b.color, b.label, int(b.v)); }).join('');
      return '<div class="hb"' + tipAttr(tip) + '><span class="hb-label" title="' + esc(it.label) + '">' + esc(it.label) + '</span><div class="hb-bars">' +
        it.bars.map(function (b) {
          return '<div class="hb-line' + (thin ? ' thin' : '') + '"><div class="hb-track"><div class="hb-fill" style="width:' + (b.v / max * 100).toFixed(1) + '%;background:' + b.color + '"></div></div>' +
            '<span class="hb-val">' + int(b.v) + (b.note ? '<small>' + esc(b.note) + '</small>' : '') + '</span></div>';
        }).join('') + '</div></div>';
    }).join('') + '</div>';
  }
  function hbarsSimple(list, color) {
    var total = list.reduce(function (s, x) { return s + x.n; }, 0);
    return hbars(list.map(function (x) {
      return { label: x.name, bars: [{ v: x.n, color: color, label: 'Broj', note: pct(x.n, total) + ' %' }] };
    }));
  }
  function childrenHtml(cpu, total) {
    var keys = ['0', '1', '2', '3+'];
    var names = { '0': 'Bez djeteta', '1': '1 dijete', '2': '2 djece', '3+': '3 ili više' };
    if (!total) return emptyHtml('Još nema korisnika.');
    return hbars(keys.map(function (k) {
      return { label: names[k], bars: [{ v: cpu[k] || 0, color: C.meals, label: 'Korisnika', note: pct(cpu[k] || 0, total) + ' %' }] };
    }));
  }
  function allergensHtml(list) {
    return hbars(list.slice(0, 14).map(function (a) {
      return { label: a.name, bars: [
        { v: a.meals, color: C.meals, label: 'Obroci s alergenom' },
        { v: a.reactions, color: C.react, label: 'S reakcijom', note: a.meals ? pct(a.reactions, a.meals) + ' %' : '' }
      ] };
    }));
  }
  function reactionsHtml(o, t) {
    if (!t.reactions) return emptyHtml('Još nema upisanih reakcija.');
    var sevKeys = ['Blaga', 'Umjerena', 'Jaka'], sev = o.severity || {};
    var other = Object.keys(sev).filter(function (k) { return sevKeys.indexOf(k) < 0; }).reduce(function (s, k) { return s + sev[k]; }, 0);
    var parts = sevKeys.map(function (k, i) { return { label: k, v: sev[k] || 0, color: C.sev[i] }; });
    if (other) parts.push({ label: 'Nije navedeno', v: other, color: '#A9B4B1' });
    var sum = parts.reduce(function (s, p) { return s + p.v; }, 0) || 1;
    var bar = '<div class="seg-bar" role="img" aria-label="Težina reakcija: ' + esc(parts.map(function (p) { return p.label + ' ' + p.v; }).join(', ')) + '">' +
      parts.filter(function (p) { return p.v; }).map(function (p) {
        return '<span style="flex:' + p.v + ';background:' + p.color + '"' + tipAttr(tipRow(p.color, p.label, int(p.v) + ' (' + pct(p.v, sum) + ' %)')) + '></span>';
      }).join('') + '</div>';
    var legend = '<div class="legend">' + parts.map(function (p) {
      return '<span><span class="sw" style="background:' + p.color + '"></span>' + esc(p.label) + ' <b class="num">' + int(p.v) + '</b></span>';
    }).join('') + '</div>';
    return '<div><p class="card-sub" style="margin-bottom:8px"><b class="num" style="color:var(--text)">' + int(t.reactions) + '</b> ' +
      plural(t.reactions, 'obrok', 'obroka', 'obroka') + ' s reakcijom (' + pct(t.reactions, t.meals) + ' % svih obroka)</p>' + bar + '</div>' + legend +
      '<div style="margin-top:4px">' + (o.symptoms.length ? hbars(o.symptoms.slice(0, 8).map(function (s) {
        return { label: s.name, bars: [{ v: s.n, color: C.react, label: 'Reakcija sa simptomom' }] };
      })) : '') + '</div>';
  }
  function factsHtml(t) {
    function f(label, value, sub) {
      return '<div class="fact"><span>' + esc(label) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span><b>' + value + '</b></div>';
    }
    var out = '<div class="facts">' +
      f('Djeca', int(t.children)) +
      f('Obroci', int(t.meals), int(t.reactions) + ' s reakcijom') +
      f('Lijekovi na popisu', int(t.meds), int(t.scheduled_meds) + ' sa svakodnevnim rasporedom') +
      f('Upisane doze', int(t.doses), int(t.planned_doses) + ' potvrđeno iz rasporeda') +
      f('Preskočeni termini terapije', int(t.skipped_slots)) +
      f('Mjerenja temperature', int(t.temps), int(t.fevers) + ' od 38 °C naviše') +
      f('Fotografije obroka', int(t.photos), 'uz sličice za pregled') +
      f('Zauzeće pohrane', bytes(t.photo_bytes), 'fotografije i sličice') +
      '</div>';
    if (t.inline_photos) {
      out += '<p class="note-warn">' + int(t.inline_photos) + ' ' + plural(t.inline_photos, 'obrok još ima', 'obroka još imaju', 'obroka još ima') +
        ' fotografiju spremljenu u retku baze (stari format). Aplikacija ih premješta u pohranu kad se vlasnik sljedeći put prijavi.</p>';
    }
    return out;
  }

  // ---------- SVG grafovi ----------

  function weekly(daily) {
    // Za dulja razdoblja stupci po tjednu (od ponedjeljka).
    var out = [], cur = null;
    daily.forEach(function (d) {
      var p = d.d.split('-'), dt = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
      if (!cur || (dt.getDay() === 1)) {
        cur = { d: d.d, end: d.d, signups: 0, meals: 0, doses: 0, temps: 0 };
        out.push(cur);
      }
      cur.end = d.d;
      cur.signups += d.signups; cur.meals += d.meals; cur.doses += d.doses; cur.temps += d.temps;
    });
    return out;
  }
  function periodLabel(r) { return r.end && r.end !== r.d ? dayShort(r.d) + ' – ' + dayShort(r.end) : dayLong(r.d); }

  function drawCharts() {
    var o = state.overview;
    if (!o) return;
    var byWeek = o.days > 90;
    var rows = byWeek ? weekly(o.daily) : o.daily.map(function (d) { return Object.assign({ end: d.d }, d); });
    document.querySelectorAll('[data-chart]').forEach(function (el) {
      var w = el.clientWidth;
      if (!w) return;
      var k = el.getAttribute('data-chart');
      if (k === 'active') {
        el.innerHTML = lineChart(w, o.daily.map(function (d) {
          return { x: dayShort(d.d), v: d.active, tip: '<b>' + esc(dayLong(d.d)) + '</b>' + tipRow(C.meals, 'Aktivnih korisnika', d.active) };
        }), C.meals);
      } else if (k === 'signups') {
        el.innerHTML = colChart(w, rows.map(function (r) {
          return { x: dayShort(r.d), vals: [r.signups], tip: '<b>' + esc(periodLabel(r)) + '</b>' + tipRow(C.meals, 'Novih korisnika', r.signups) };
        }), [{ color: C.meals }], 180);
      } else if (k === 'entries') {
        el.innerHTML = colChart(w, rows.map(function (r) {
          return { x: dayShort(r.d), vals: SERIES.map(function (s) { return r[s.key]; }),
            tip: '<b>' + esc(periodLabel(r)) + '</b>' + SERIES.map(function (s) { return tipRow(s.color, s.label, r[s.key]); }).join('') +
              tipRow('', 'Ukupno', r.meals + r.doses + r.temps) };
        }), SERIES, 220);
      } else if (k === 'hours') {
        el.innerHTML = colChart(w, o.hours.map(function (v, h) {
          return { x: h % 3 === 0 ? h + ' h' : '', vals: [v], tip: '<b>' + h + ':00 – ' + h + ':59</b>' + tipRow(C.meals, 'Upisa', v) };
        }), [{ color: C.meals }], 160, true);
      } else if (k === 'weekdays') {
        el.innerHTML = colChart(w, o.weekdays.map(function (v, i) {
          return { x: WEEKDAYS[i], vals: [v], tip: '<b>' + WEEKDAYS[i] + '</b>' + tipRow(C.meals, 'Upisa', v) };
        }), [{ color: C.meals }], 160, true);
      }
    });
  }

  var M = { l: 34, r: 14, t: 14, b: 26 };

  function axis(W, H, ticks, ymax) {
    var ph = H - M.t - M.b;
    return ticks.map(function (v) {
      var y = (M.t + ph - v / ymax * ph).toFixed(1);
      return '<line class="' + (v ? 'grid-line' : 'base-line') + '" x1="' + M.l + '" x2="' + (W - M.r) + '" y1="' + y + '" y2="' + y + '"/>' +
        '<text x="' + (M.l - 8) + '" y="' + y + '" dy="4" text-anchor="end">' + int(v) + '</text>';
    }).join('');
  }
  function xLabelEvery(n, pw) { return Math.max(1, Math.ceil(n / Math.max(2, Math.floor(pw / 64)))); }

  function lineChart(W, pts, color) {
    var H = 200, pw = W - M.l - M.r, ph = H - M.t - M.b, n = pts.length;
    var max = Math.max.apply(null, pts.map(function (p) { return p.v; }));
    var ticks = niceTicks(max), ymax = ticks[ticks.length - 1];
    function x(i) { return M.l + (n === 1 ? pw / 2 : i / (n - 1) * pw); }
    function y(v) { return M.t + ph - v / ymax * ph; }
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1); }).join(' ');
    var area = line + ' L' + x(n - 1).toFixed(1) + ' ' + (M.t + ph) + ' L' + x(0).toFixed(1) + ' ' + (M.t + ph) + ' Z';
    var every = xLabelEvery(n, pw), labels = '', hits = '', band = pw / Math.max(1, n - 1);
    pts.forEach(function (p, i) {
      if ((n - 1 - i) % every === 0) labels += '<text x="' + x(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(p.x) + '</text>';
      var hx = Math.max(M.l, x(i) - band / 2), hw = Math.min(band, W - M.r - hx);
      hits += '<g class="hit"' + tipAttr(p.tip) + '><rect class="hr" x="' + hx.toFixed(1) + '" y="' + M.t + '" width="' + Math.max(hw, 1).toFixed(1) + '" height="' + ph + '"/>' +
        '<line class="xh" x1="' + x(i).toFixed(1) + '" x2="' + x(i).toFixed(1) + '" y1="' + M.t + '" y2="' + (M.t + ph) + '"/>' +
        '<circle class="xd" cx="' + x(i).toFixed(1) + '" cy="' + y(p.v).toFixed(1) + '" r="4.5" fill="' + color + '" stroke="#fff" stroke-width="2"/></g>';
    });
    var last = pts[n - 1];
    return '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Aktivni korisnici po danu, zadnji dan: ' + last.v + '">' +
      axis(W, H, ticks, ymax) + labels +
      '<path d="' + area + '" fill="' + color + '" fill-opacity=".1"/>' +
      '<path d="' + line + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="' + x(n - 1).toFixed(1) + '" cy="' + y(last.v).toFixed(1) + '" r="4" fill="' + color + '" stroke="#fff" stroke-width="2"/>' +
      hits + '</svg>';
  }

  function topRounded(x, y, w, h, r) {
    r = Math.min(r, w / 2, h);
    return 'M' + x + ' ' + (y + h) + 'V' + (y + r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + 'H' + (x + w - r) +
      'Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + r) + 'V' + (y + h) + 'Z';
  }

  // rows: [{ x, vals: [..], tip }], series: [{ color }] — složeni stupci od dna prema gore
  function colChart(W, rows, series, H, allLabels) {
    var pw = W - M.l - M.r, ph = H - M.t - M.b, n = rows.length;
    var max = Math.max.apply(null, rows.map(function (r) { return r.vals.reduce(function (a, b) { return a + b; }, 0); }));
    var ticks = niceTicks(max), ymax = ticks[ticks.length - 1];
    var band = pw / n, bw = Math.max(1, Math.min(24, band - 2, band * 0.72));
    var every = allLabels ? 1 : xLabelEvery(n, pw), out = '';
    rows.forEach(function (r, i) {
      var cx = M.l + band * i + band / 2, x0 = cx - bw / 2, base = M.t + ph, segs = [];
      r.vals.forEach(function (v, si) { if (v > 0) segs.push({ v: v, color: series[si].color }); });
      segs.forEach(function (s, si) {
        var h = s.v / ymax * ph, top = base - h, gap = si ? 2 : 0, hh = Math.max(0, h - gap);
        if (hh > 0) {
          out += si === segs.length - 1
            ? '<path d="' + topRounded(+x0.toFixed(1), +top.toFixed(1), +bw.toFixed(1), +hh.toFixed(1), 4) + '" fill="' + s.color + '"/>'
            : '<rect x="' + x0.toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + hh.toFixed(1) + '" fill="' + s.color + '"/>';
        }
        base = top;
      });
      if (r.x && (n - 1 - i) % every === 0) out += '<text x="' + cx.toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(r.x) + '</text>';
      out += '<g class="hit"' + tipAttr(r.tip) + '><rect class="hr" x="' + (M.l + band * i).toFixed(1) + '" y="' + M.t + '" width="' + band.toFixed(1) + '" height="' + ph + '"/></g>';
    });
    return '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Stupčasti graf">' +
      axis(W, H, ticks, ymax) + out + '</svg>';
  }

  // ---------- tablica korisnika ----------

  var COLS = [
    { key: 'name', label: 'Korisnik' },
    { key: 'state', label: 'Stanje' },
    { key: 'created_at', label: 'Registriran' },
    { key: 'last_sign_in_at', label: 'Zadnja prijava' },
    { key: 'last_activity', label: 'Zadnja aktivnost' },
    { key: 'active_days_30', label: 'Dani (30 d)', n: true, title: 'Broj različitih dana s aktivnošću u zadnjih 30 dana' },
    { key: 'children', label: 'Djeca', n: true },
    { key: 'meals', label: 'Obroci', n: true },
    { key: 'reactions', label: 'Reakcije', n: true },
    { key: 'meds', label: 'Lijekovi', n: true },
    { key: 'doses', label: 'Doze', n: true },
    { key: 'temps', label: 'Temp.', n: true, title: 'Mjerenja temperature' },
    { key: 'photos', label: 'Foto', n: true, title: 'Fotografije obroka' }
  ];
  var FILTERS = [
    { id: 'all', label: 'Svi', test: function () { return true; } },
    { id: 'active', label: 'Aktivni (7 d)', test: function (u) { return activityAge(u) < 7 * DAY; } },
    { id: 'idle', label: 'Neaktivni 30+ d', test: function (u) { return activityAge(u) >= 30 * DAY; } },
    { id: 'nochild', label: 'Bez djeteta', test: function (u) { return !u.children; } },
    { id: 'new', label: 'Novi (7 d)', test: function (u) { return Date.now() - ts(u.created_at) < 7 * DAY; } },
    { id: 'admin', label: 'Administratori', test: function (u) { return u.is_admin; } }
  ];
  function activityAge(u) { return u.last_activity ? Date.now() - ts(u.last_activity) : Infinity; }
  function stateOf(u) {
    var a = activityAge(u);
    if (a === Infinity) return { rank: 0, cls: '', label: 'Bez upisa' };
    if (a < 7 * DAY) return { rank: 3, cls: 'on', label: 'Aktivan' };
    if (a < 30 * DAY) return { rank: 2, cls: 'mid', label: 'Povremeno' };
    return { rank: 1, cls: '', label: 'Neaktivan' };
  }
  function sortVal(u, key) {
    if (key === 'name') return (u.name || u.email || '').toLocaleLowerCase('hr');
    if (key === 'state') return stateOf(u).rank * 1e13 + ts(u.last_activity);
    if (/_at$|activity$/.test(key)) return ts(u[key]);
    return Number(u[key] || 0);
  }

  function usersCard() {
    var head = '<button type="button" class="btn btn-sm" data-action="csv">' +
      '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>Izvoz CSV</button>';
    return card('Korisnici', 'Svi registrirani računi i koliko koriste aplikaciju',
      '<div class="tools"><label for="uq" class="sr-only">Pretraži korisnike</label>' +
      '<input id="uq" class="search" type="search" placeholder="Pretraži po imenu ili e-mailu…" autocomplete="off" value="' + esc(state.q) + '">' +
      '<div class="chips" id="uFilters" role="group" aria-label="Filtar korisnika"></div></div>' +
      '<div class="table-wrap"><table class="users"><thead><tr id="uHead"></tr></thead><tbody id="uBody"></tbody></table></div>' +
      '<div class="table-foot"><span class="left"><span id="uCount"></span>' +
      '<button type="button" class="btn btn-sm" data-action="umore" id="uMore" hidden>Prikaži još</button></span>' +
      '<span>Stanje: aktivan = upis u zadnjih 7 dana, povremeno = u zadnjih 30 dana.</span></div>', head);
  }

  function visibleUsers() {
    var f = FILTERS.filter(function (x) { return x.id === state.filter; })[0] || FILTERS[0];
    var q = state.q.trim().toLocaleLowerCase('hr');
    var list = state.users.filter(function (u) {
      return f.test(u) && (!q || ((u.name || '') + ' ' + (u.email || '')).toLocaleLowerCase('hr').indexOf(q) >= 0);
    });
    var k = state.sort.key, dir = state.sort.dir;
    return list.sort(function (a, b) {
      var va = sortVal(a, k), vb = sortVal(b, k);
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir || ts(b.created_at) - ts(a.created_at);
    });
  }

  function renderUsers() {
    if (!$('#uBody')) return;
    $('#uFilters').innerHTML = FILTERS.map(function (f) {
      var n = state.users.filter(f.test).length;
      return '<button type="button" class="chip" data-action="ufilter" data-id="' + f.id + '" aria-pressed="' + (state.filter === f.id) + '">' +
        esc(f.label) + ' <span class="cnt">' + n + '</span></button>';
    }).join('');
    $('#uHead').innerHTML = COLS.map(function (c) {
      var on = state.sort.key === c.key;
      var arrow = on ? (state.sort.dir > 0 ? '↑' : '↓') : '';
      return '<th scope="col"' + (c.n ? ' class="n"' : '') + (on ? ' aria-sort="' + (state.sort.dir > 0 ? 'ascending' : 'descending') + '"' : '') + '>' +
        '<button type="button" data-action="usort" data-key="' + c.key + '"' + (c.title ? ' title="' + esc(c.title) + '"' : '') + '>' + esc(c.label) +
        '<span aria-hidden="true">' + arrow + '</span></button></th>';
    }).join('');
    var list = visibleUsers(), shown = list.slice(0, state.limit);
    $('#uBody').innerHTML = shown.length ? shown.map(function (u) {
      var st = stateOf(u), isNew = Date.now() - ts(u.created_at) < 7 * DAY;
      function n(v) { return '<td class="n">' + (v ? int(v) : '<span class="zero">0</span>') + '</td>'; }
      return '<tr>' +
        '<td><div class="u-cell"><span class="u-av" aria-hidden="true">' + esc(initial(u.name || u.email)) + '</span><div>' +
          '<div class="u-name">' + esc(u.name || '(bez imena)') + (u.is_admin ? ' <span class="badge admin">admin</span>' : '') + (isNew ? ' <span class="badge new">novo</span>' : '') + '</div>' +
          '<div class="u-mail">' + esc(u.email || '') + '</div></div></div></td>' +
        '<td><span class="state ' + st.cls + '">' + st.label + '</span></td>' +
        '<td>' + whenHtml(u.created_at) + '</td>' +
        '<td>' + whenHtml(u.last_sign_in_at) + '</td>' +
        '<td>' + whenHtml(u.last_activity) + '</td>' +
        n(u.active_days_30) + n(u.children) + n(u.meals) + n(u.reactions) + n(u.meds) + n(u.doses) + n(u.temps) +
        '<td class="n"' + (u.photos ? ' title="' + esc(bytes(u.photo_bytes)) + '"' : '') + '>' + (u.photos ? int(u.photos) : '<span class="zero">0</span>') + '</td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="' + COLS.length + '"><div class="empty">Nema korisnika za ovaj filtar.</div></td></tr>';
    $('#uCount').textContent = 'Prikazano ' + shown.length + ' od ' + list.length +
      (list.length < state.users.length ? ' (ukupno ' + state.users.length + ')' : '');
    var rest = list.length - shown.length;
    $('#uMore').hidden = rest <= 0;
    $('#uMore').textContent = 'Prikaži još ' + Math.min(rest, PAGE);
  }

  function exportCsv() {
    var head = ['E-mail', 'Ime', 'Prijava', 'Registriran', 'Zadnja prijava', 'Zadnja aktivnost', 'Aktivni dani (30 d)',
      'Djeca', 'Obroci', 'Reakcije', 'Lijekovi', 'Doze', 'Temperature', 'Fotografije', 'Pohrana (B)', 'Admin'];
    function cell(v) { v = v == null ? '' : String(v); return /[";\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
    function d(iso) { return iso ? fmtDateTime.format(new Date(iso)) : ''; }
    var lines = [head.join(';')].concat(visibleUsers().map(function (u) {
      return [u.email, u.name, u.provider, d(u.created_at), d(u.last_sign_in_at), d(u.last_activity), u.active_days_30,
        u.children, u.meals, u.reactions, u.meds, u.doses, u.temps, u.photos, u.photo_bytes, u.is_admin ? 'da' : ''].map(cell).join(';');
    }));
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tanjuric-korisnici-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  // ---------- tooltip ----------

  var tip = $('#tip'), tipFor = null;
  function placeTip(x, y) {
    var r = tip.getBoundingClientRect(), pad = 12;
    var left = x + 14, top = y + 14;
    if (left + r.width > window.innerWidth - pad) left = x - r.width - 14;
    if (top + r.height > window.innerHeight - pad) top = y - r.height - 14;
    tip.style.left = Math.max(pad, left) + 'px';
    tip.style.top = Math.max(pad, top) + 'px';
  }
  document.addEventListener('mouseover', function (ev) {
    var el = ev.target.closest && ev.target.closest('[data-tip]');
    if (el === tipFor) return;
    tipFor = el;
    if (!el) { tip.hidden = true; return; }
    tip.innerHTML = el.getAttribute('data-tip');
    tip.hidden = false;
    placeTip(ev.clientX, ev.clientY);
  });
  document.addEventListener('mousemove', function (ev) { if (tipFor) placeTip(ev.clientX, ev.clientY); });
  document.addEventListener('scroll', function () { tip.hidden = true; tipFor = null; }, { passive: true });

  // ---------- događaji ----------

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-action]');
    if (!b) return;
    switch (b.getAttribute('data-action')) {
      case 'sign-in': signIn(); break;
      case 'sign-out': signOut(); break;
      case 'refresh': load(); break;
      case 'csv': exportCsv(); break;
      case 'ufilter': state.filter = b.getAttribute('data-id'); state.limit = PAGE; renderUsers(); break;
      case 'umore': state.limit += PAGE; renderUsers(); break;
      case 'usort': {
        var k = b.getAttribute('data-key');
        if (state.sort.key === k) state.sort.dir = -state.sort.dir;
        else state.sort = { key: k, dir: k === 'name' ? 1 : -1 };
        renderUsers();
        var again = document.querySelector('[data-action="usort"][data-key="' + k + '"]');
        if (again) again.focus();
        break;
      }
    }
  });
  document.addEventListener('input', function (ev) {
    if (ev.target.id === 'uq') { state.q = ev.target.value; state.limit = PAGE; renderUsers(); }
  });
  $('#period').addEventListener('change', function () {
    try { localStorage.setItem(PERIOD_KEY, $('#period').value); } catch (e) { /* ignore */ }
    load();
  });
  var resizeT = null, lastW = window.innerWidth;
  window.addEventListener('resize', function () {
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    clearTimeout(resizeT); resizeT = setTimeout(drawCharts, 150);
  });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && state.overview && Date.now() - state.loadedAt > 5 * 60000) load();
  });

  // ---------- pokretanje ----------

  try {
    var saved = localStorage.getItem(PERIOD_KEY);
    if (saved && $('#period').querySelector('option[value="' + saved + '"]')) $('#period').value = saved;
  } catch (e) { /* ignore */ }

  if (!sb) {
    show('login');
    var le = $('#loginError'); le.hidden = false;
    le.textContent = 'Aplikacija nije povezana s poslužiteljem (nedostaje config.js).';
  } else {
    sb.auth.onAuthStateChange(function (_event, session) {
      setTimeout(function () { onUser(session ? session.user : null); }, 0);
    });
  }
})();
