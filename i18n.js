// Jezik sučelja (hr / en). Hrvatski tekst u kodu je ujedno i ključ prijevoda:
// t('Spremi') vraća 'Save' kad je jezik engleski, a izvorni tekst kad je hrvatski
// ili kad prijevod nedostaje. Prijevodi su u lang/<jezik>.js (I18N.add).
//
// Redoslijed odabira jezika:
//   1. ?lang=hr|en u adresi (sprema se kao izbor korisnika)
//   2. izbor korisnika (prekidač HR / EN), localStorage
//   3. kolačić tanjuric_geo koji postavlja middleware.js prema zemlji IP adrese
//   4. jezik preglednika
(function () {
  'use strict';

  var LANGS = ['hr', 'en'];
  var CHOICE_KEY = 'tanjuric.lang';
  var GEO_COOKIE = 'tanjuric_geo';
  // Jezici preglednika za koje je hrvatsko sučelje bliže od engleskog.
  var HR_LIKE = /^(hr|bs|sr|sh|cnr|sl|mk)\b/i;

  function valid(l) { return LANGS.indexOf(l) >= 0 ? l : ''; }
  function readCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }
  function storedChoice() { try { return valid(localStorage.getItem(CHOICE_KEY)); } catch (e) { return ''; } }
  function saveChoice(l) { try { localStorage.setItem(CHOICE_KEY, l); } catch (e) { /* ignore */ } }

  function fromQuery() {
    try {
      var params = new URLSearchParams(location.search), l = valid(params.get('lang'));
      if (!params.has('lang')) return '';
      params.delete('lang');
      var qs = params.toString();
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
      if (l) saveChoice(l);
      return l;
    } catch (e) { return ''; }
  }
  function fromBrowser() {
    var list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    for (var i = 0; i < list.length; i++) {
      if (HR_LIKE.test(list[i])) return 'hr';
      if (/^en\b/i.test(list[i])) return 'en';
    }
    return list[0] ? 'en' : 'hr';
  }

  var lang = fromQuery() || storedChoice() || valid(readCookie(GEO_COOKIE)) || fromBrowser();
  var dicts = { hr: {} , en: {} };
  var missing = {};

  function fill(s, vars) {
    if (!vars || typeof vars !== 'object') return s;   // npr. .map(tx) šalje indeks
    return s.replace(/\{(\w+)\}/g, function (m, k) { return k in vars ? String(vars[k]) : m; });
  }
  function lookup(key) {
    var d = dicts[lang];
    if (d && Object.prototype.hasOwnProperty.call(d, key)) return d[key];
    if (lang !== 'hr' && !missing[key]) { missing[key] = true; console.warn('[i18n] nema prijevoda (' + lang + '):', key); }
    return null;
  }

  // Prijevod teksta. vars: {ime} u tekstu zamijeni se vrijednošću (bez escapanja).
  function t(key, vars) {
    var s = lookup(key);
    return fill(s == null ? key : s, vars);
  }
  function t0(key) {   // za spremljene vrijednosti (alergeni, vrste obroka…): bez upozorenja za vlastite unose
    var d = dicts[lang];
    return d && Object.prototype.hasOwnProperty.call(d, key) ? d[key] : key;
  }

  // Množina. forms: hrvatski oblici 'jednina|2-4|5+' (ključ); prijevod: 'one|other'.
  // Decimalni broj uzima srednji (hr) odnosno množinski (en) oblik.
  function hrForm(n, f) {
    if (n !== Math.floor(n)) return f[1];
    var a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return f[0];
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return f[1];
    return f[2];
  }
  function tp(n, forms, vars) {
    var hr = forms.split('|');
    while (hr.length < 3) hr.push(hr[hr.length - 1]);
    var tr = lang === 'hr' ? null : lookup(forms);
    var s;
    if (tr == null) s = hrForm(n, hr);
    else { var f = tr.split('|'); s = n === 1 ? f[0] : (f[1] || f[0]); }
    return fill(s, Object.assign({ n: n }, vars || {}));
  }

  // ---------- datumi i brojevi ----------
  var DAYS = {
    hr: ['nedjelja', 'ponedjeljak', 'utorak', 'srijeda', 'četvrtak', 'petak', 'subota'],
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  };
  var MONTHS = {   // hr u genitivu, kako se piše uz dan
    hr: ['siječnja', 'veljače', 'ožujka', 'travnja', 'svibnja', 'lipnja', 'srpnja', 'kolovoza', 'rujna', 'listopada', 'studenoga', 'prosinca'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  };
  function dayName(dt) { return DAYS[lang][dt.getDay()]; }
  function fullDate(dt) {
    return lang === 'hr'
      ? dt.getDate() + '. ' + MONTHS.hr[dt.getMonth()] + ' ' + dt.getFullYear() + '.'
      : dt.getDate() + ' ' + MONTHS.en[dt.getMonth()] + ' ' + dt.getFullYear();
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function shortDate(dt) {   // za CSV i ispis
    return lang === 'hr'
      ? pad(dt.getDate()) + '.' + pad(dt.getMonth() + 1) + '.' + dt.getFullYear() + '.'
      : dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate());
  }
  function fmtNum(n) { return lang === 'hr' ? String(n).replace('.', ',') : String(n); }

  // ---------- statični HTML ----------
  // data-i18n: prevode se izravni tekstualni čvorovi elementa (ikone ostaju).
  // data-i18n-html: cijeli innerHTML je ključ (za tekst s <em>, <b>, <a>).
  // data-i18n-attr="placeholder aria-label": prevode se navedeni atributi.
  function normWs(s) { return s.replace(/\s+/g, ' ').trim(); }
  function apply(root) {
    root = root || document;
    if (lang === 'hr') return;
    root.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.childNodes.forEach(function (n) {
        if (n.nodeType !== 3 || !n.nodeValue.trim()) return;
        var lead = n.nodeValue.match(/^\s*/)[0], trail = n.nodeValue.match(/\s*$/)[0];
        n.nodeValue = lead + t(normWs(n.nodeValue)) + trail;
      });
    });
    root.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      el.innerHTML = t(normWs(el.innerHTML));
    });
    root.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      el.getAttribute('data-i18n-attr').split(/\s+/).forEach(function (a) {
        if (el.hasAttribute(a)) el.setAttribute(a, t(normWs(el.getAttribute(a))));
      });
    });
  }

  function setLang(l) {
    l = valid(l); if (!l) return;
    saveChoice(l);
    if (l !== lang) location.reload();
  }

  document.documentElement.lang = lang;

  window.I18N = {
    lang: lang,
    langs: LANGS.slice(),
    locale: lang === 'hr' ? 'hr-HR' : 'en-GB',
    add: function (l, map) { dicts[l] = Object.assign(dicts[l] || {}, map); },
    t: t, t0: t0, tp: tp,
    dayName: dayName, fullDate: fullDate, shortDate: shortDate, fmtNum: fmtNum,
    apply: apply, setLang: setLang,
    missing: function () { return Object.keys(missing); }   // za provjeru prijevoda u konzoli
  };
})();
