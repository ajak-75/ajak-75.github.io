/* Ajak Studio — app.js
   쇼케이스 렌더 · 다국어 자동 감지 · PWA 등록
   · 접속 기기 언어(navigator.languages[0] || navigator.language)로 문구를 고른다.
   · 내장 사전(15개 언어)에 없는 언어는 문구와 앱 소개를 Google Translate 공개 API로 한 번 번역해
     localStorage('ajak_studio_i18n_{lang}')에 캐시하고, 실패하면 영어로 받쳐 둔다.
   · ?lang=xx 쿼리와 상단 언어 선택으로 언제든 바꿀 수 있다(선택값은 기기에 저장). */
(function () {
  'use strict';

/* GitHub Pages는 frame-ancestors 헤더를 보낼 수 없어서, 페이지 스스로 남의 프레임에
   들어가지 않는다. 다른 출처의 부모면 그 창을 이 페이지로 옮기고, 부모에 닿을 수 없으면
   아무것도 보여 주지 않는다. 같은 출처(우리 페이지)의 프레임은 그대로 허용한다. */
(function frameGuard(){
  if (window.top === window.self) return;
  try {
    if (window.top.location.origin === window.location.origin) return;
    window.top.location.href = window.location.href;
  } catch (e) {
    document.documentElement.style.display = 'none';
  }
})();

  var APPS = window.AJAK_STUDIO_APPS || [];
  var BUILTIN = window.AJAK_STUDIO_I18N || {};
  var CACHE_VER = '1';
  var SOON_SLOTS = 1;                       /* 쇼케이스 끝에 놓는 '준비 중' 카드 수 */

  var LANGS = [
    ['ko', '한국어'], ['en', 'English'], ['ja', '日本語'], ['zh', '中文 (简体)'],
    ['zh-tw', '中文 (繁體)'], ['es', 'Español'], ['fr', 'Français'], ['de', 'Deutsch'],
    ['pt', 'Português'], ['it', 'Italiano'], ['ru', 'Русский'], ['id', 'Bahasa Indonesia'],
    ['vi', 'Tiếng Việt'], ['th', 'ไทย'], ['ar', 'العربية']
  ];
  var LOCALES = {
    ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN', 'zh-tw': 'zh-TW', es: 'es-ES',
    fr: 'fr-FR', de: 'de-DE', pt: 'pt-BR', it: 'it-IT', ru: 'ru-RU', id: 'id-ID',
    vi: 'vi-VN', th: 'th-TH', ar: 'ar'
  };
  var RTL = ['ar', 'he', 'fa', 'ur', 'yi', 'dv', 'ps', 'ckb', 'sd', 'ug'];
  var STORE_LANG = 'ajak_studio_lang';

  /* ---------- 언어 ---------- */
  function normalize(raw) {
    var tag = String(raw || '').toLowerCase().replace('_', '-').trim();
    if (!tag) return 'en';
    if (tag === 'zh' || tag === 'zh-cn' || tag === 'zh-hans' || tag === 'zh-sg' || tag === 'zh-my') return 'zh';
    if (tag.indexOf('zh-') === 0) return 'zh-tw';
    if (Object.prototype.hasOwnProperty.call(BUILTIN, tag)) return tag;
    var base = tag.split('-')[0];
    return base || 'en';
  }

  function deviceLang() {
    return normalize((navigator.languages && navigator.languages[0]) || navigator.language || 'en');
  }

  function queryLang() {
    try {
      var q = (new URLSearchParams(location.search).get('lang') || '').trim();
      return q ? normalize(q) : '';
    } catch (e) { return ''; }
  }

  function savedLang() {
    try {
      var v = localStorage.getItem(STORE_LANG);
      return v && v !== 'auto' ? normalize(v) : '';
    } catch (e) { return ''; }
  }

  var LANG = queryLang() || savedLang() || deviceLang();
  var IS_BUILTIN = Object.prototype.hasOwnProperty.call(BUILTIN, LANG);
  var dict = IS_BUILTIN ? BUILTIN[LANG] : (BUILTIN.en || {});
  var appDescs = {};                        /* id -> 번역된 소개 */

  function t(key, vars) {
    var s = dict[key];
    if (s == null) s = (BUILTIN.en || {})[key];
    if (s == null) s = (BUILTIN.ko || {})[key];
    if (s == null) return '';
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
      });
    }
    return s;
  }

  /* ---------- 번역 폴백 ---------- */
  function cacheKey(lang) { return 'ajak_studio_i18n_' + lang + '_v' + CACHE_VER; }

  function readCache(lang) {
    try {
      var raw = localStorage.getItem(cacheKey(lang));
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function writeCache(lang, obj) {
    try { localStorage.setItem(cacheKey(lang), JSON.stringify(obj)); } catch (e) { /* quota */ }
  }

  function gtx(text, target) {
    return fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' +
      encodeURIComponent(target) + '&dt=t', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: 'q=' + encodeURIComponent(text)
    }).then(function (r) {
      if (!r.ok) throw new Error('gtx ' + r.status);
      return r.json();
    }).then(function (j) {
      var out = (j[0] || []).map(function (seg) { return (seg && seg[0]) || ''; }).join('');
      if (!out.trim()) throw new Error('gtx empty');
      return out;
    });
  }

  function clients5(text, target) {
    return fetch('https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=' +
      encodeURIComponent(target) + '&q=' + encodeURIComponent(text))
      .then(function (r) {
        if (!r.ok) throw new Error('c5 ' + r.status);
        return r.json();
      }).then(function (j) {
        var out = '';
        if (Array.isArray(j)) {
          if (typeof j[0] === 'string') out = j.join(' ');
          else if (Array.isArray(j[0])) out = j.map(function (s) { return Array.isArray(s) ? (s[0] || '') : (s || ''); }).join('');
        }
        if (!out.trim()) throw new Error('c5 empty');
        return out;
      });
  }

  var QUEUE = [], ACTIVE = 0, MAX_ACTIVE = 4;
  function translate(text, target) {
    return new Promise(function (resolve, reject) {
      QUEUE.push(function () {
        gtx(text, target)
          .catch(function () { return clients5(text, target); })
          .then(resolve, reject);
      });
      pump();
    });
  }
  function pump() {
    while (ACTIVE < MAX_ACTIVE && QUEUE.length) {
      var run = QUEUE.shift();
      ACTIVE++;
      run().then(done, done);
      function done() { ACTIVE--; pump(); }
    }
  }

  /* ---------- 렌더 ---------- */
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* 카드 주소는 진짜 웹 주소일 때만 링크가 된다(javascript:·data: 등은 링크를 만들지 않는다) */
  function safeHref(s) {
    var v = String(s == null ? '' : s).trim();
    return /^https?:\/\//i.test(v) ? v : '';
  }

  function applyStrings() {
    var html = document.documentElement;
    html.lang = LOCALE_OF(LANG);
    html.dir = RTL.indexOf(LANG.split('-')[0]) >= 0 ? 'rtl' : 'ltr';

    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute('data-i18n');
      var val = t(key);
      if (val) nodes[i].textContent = val;
    }
    var title = t('metaTitle'), desc = t('metaDesc');
    if (title) document.title = title;
    setMeta('name', 'description', desc);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', desc);
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', desc);
    setMeta('property', 'og:locale', LOCALE_OF(LANG).replace('-', '_'));
    var sel = document.getElementById('langSelect');
    if (sel) {
      sel.value = LANG;
      if (!sel.value) sel.value = 'auto';   /* 내장 목록에 없는 기기 언어 */
    }
  }

  function LOCALE_OF(lang) { return LOCALES[lang] || lang; }

  function setMeta(attr, name, content) {
    if (!content) return;
    var el = document.querySelector('meta[' + attr + '="' + name + '"]');
    if (el) el.setAttribute('content', content);
  }

  function arrowSvg() {
    return '<svg class="card-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.4 4.2 12.2 8l-3.8 3.8"/></svg>';
  }

  function descFor(app) {
    var d = app.descs && app.descs[LANG];
    if (!d && app.desc) d = app.desc[LANG];
    if (!d && app.desc) d = app.desc.en || app.desc.ko || '';
    return appDescs[app.id] || d || '';
  }

  function renderApps() {
    var grid = document.getElementById('appGrid');
    if (!grid) return;
    var html = '';

    APPS.forEach(function (app) {
      var href = safeHref(app.url);
      var live = app.status !== 'soon' && !!href;
      var tag = live ? 'a' : 'div';
      var attrs = live
        ? ' href="' + esc(href) + '" target="_blank" rel="noopener noreferrer"'
        : '';
      var badge = live
        ? '<span class="badge"><span class="dot"></span>' + esc(t('live')) + '</span>'
        : '<span class="badge badge--soon">' + esc(t('soon')) + '</span>';
      var noBox = app.iconBg === 'transparent';   /* 투명 아이콘: 흰 사각 박스 없이 */
      var icon = app.icon
        ? '<img class="app-icon' + (noBox ? ' app-icon--nobox' : '') + '" src="' + esc(app.icon) + '"' +
          (app.icon2x ? ' srcset="' + esc(app.icon) + ' 1x, ' + esc(app.icon2x) + ' 2x"' : '') +
          ' alt="' + esc(app.name) + '" width="60" height="60" loading="lazy" decoding="async"' +
          (app.iconBg && !noBox ? ' style="background:' + esc(app.iconBg) + '"' : '') + '>'
        : '<div class="app-icon"></div>';

      html += '<' + tag + ' class="card reveal' + (live ? '' : ' card--soon') + '"' + attrs + '>' +
        '<div class="card-top">' + icon + badge + '</div>' +
        '<h3 class="card-title">' + esc(app.name) + '</h3>' +
        (app.category ? '<p class="card-cat">' + esc(app.category) + '</p>' : '') +
        '<p class="card-desc">' + esc(descFor(app)) + '</p>' +
        (live ? '<span class="card-foot">' + esc(t('openApp')) + arrowSvg() + '</span>' : '') +
        '</' + tag + '>';
    });

    for (var i = 0; i < SOON_SLOTS; i++) {
      html += '<div class="card card--soon reveal">' +
        '<div class="ghost-icon" aria-hidden="true"><span></span><span></span></div>' +
        '<div class="soon-text">' +
          '<h3 class="card-title">' + esc(t('soonTitle')) + '</h3>' +
          '<p class="card-desc">' + esc(t('soonDesc')) + '</p>' +
        '</div>' +
      '</div>';
    }

    grid.innerHTML = html;
  }

  function buildLangSelect() {
    var sel = document.getElementById('langSelect');
    if (!sel) return;
    var html = '<option value="auto">Auto · ' + esc(LANG_NAMES()[deviceLang()] || '') + '</option>';
    LANGS.forEach(function (pair) {
      html += '<option value="' + pair[0] + '">' + esc(pair[1]) + '</option>';
    });
    sel.innerHTML = html;
    sel.value = LANG;
    sel.addEventListener('change', function () {
      var v = sel.value;
      try {
        if (v === 'auto') localStorage.removeItem(STORE_LANG);
        else localStorage.setItem(STORE_LANG, v);
      } catch (e) { /* private mode */ }
      var next = v === 'auto' ? deviceLang() : normalize(v);
      /* 쿼리로 고정된 언어는 URL을 비워야 바뀐다 */
      if (queryLang()) {
        try {
          var u = new URL(location.href);
          u.searchParams.delete('lang');
          history.replaceState(null, '', u.pathname + (u.search ? u.search : '') + u.hash);
        } catch (e) { }
      }
      setLang(next);
    });
  }

  function LANG_NAMES() {
    var map = {};
    LANGS.forEach(function (p) { map[p[0]] = p[1]; });
    return map;
  }

  function setLang(next) {
    LANG = next;
    IS_BUILTIN = Object.prototype.hasOwnProperty.call(BUILTIN, LANG);
    dict = IS_BUILTIN ? BUILTIN[LANG] : (BUILTIN.en || {});
    appDescs = {};
    applyStrings();
    renderApps();
    observeReveals();
    var sel = document.getElementById('langSelect');
    if (sel) { sel.value = LANG; if (!sel.value) sel.value = 'auto'; }
    loadRuntimeStrings();
  }

  /* 내장 사전에 없는 문구·앱 소개는 한 번 번역해 캐시한다.
     (내장 언어라도 그 언어의 앱 소개가 비어 있으면 그 소개만 번역한다) */
  function loadRuntimeStrings() {
    var cached = readCache(LANG);
    if (cached && cached.ui) {
      Object.keys(cached.ui).forEach(function (k) { dict[k] = cached.ui[k]; });
      applyStrings();
    }
    if (cached && cached.apps) {
      Object.keys(cached.apps).forEach(function (k) { appDescs[k] = cached.apps[k]; });
      renderApps();
      observeReveals();
    }

    var needUi = !IS_BUILTIN && !(cached && cached.ui);
    var missing = APPS.filter(function (app) {
      return !appDescs[app.id] && !(app.desc && app.desc[LANG]);
    });
    if (!needUi && !missing.length) return;

    var target = LANG, uiOut = {}, appsOut = {}, jobs = [];
    if (needUi) {
      Object.keys(BUILTIN.en || {}).forEach(function (k) {
        jobs.push(translate(BUILTIN.en[k], target).then(function (v) {
          uiOut[k] = v; dict[k] = v;
        }).catch(function () { }));
      });
    }
    missing.forEach(function (app) {
      var src = (app.desc && (app.desc.en || app.desc.ko)) || '';
      if (!src) return;
      jobs.push(translate(src, target).then(function (v) {
        appsOut[app.id] = v; appDescs[app.id] = v;
      }).catch(function () { }));
    });
    if (!jobs.length) return;

    Promise.all(jobs).then(function () {
      if (LANG !== target) return;
      if (needUi) applyStrings();
      if (missing.length) { renderApps(); observeReveals(); }
      var cache = readCache(target) || {};
      if (Object.keys(uiOut).length) cache.ui = Object.assign(cache.ui || {}, uiOut);
      if (Object.keys(appsOut).length) cache.apps = Object.assign(cache.apps || {}, appsOut);
      writeCache(target, cache);
    });
  }

  /* ---------- 부가 동작 ---------- */
  var io = null;
  function observeReveals() {
    var items = document.querySelectorAll('.reveal:not(.is-in)');
    if (!('IntersectionObserver' in window)) {
      for (var i = 0; i < items.length; i++) items[i].classList.add('is-in');
      return;
    }
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add('is-in');
            io.unobserve(en.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    }
    for (var j = 0; j < items.length; j++) io.observe(items[j]);
  }

  function watchScroll() {
    var bar = document.getElementById('topbar');
    if (!bar) return;
    var on = function () { bar.classList.toggle('is-scrolled', window.scrollY > 6); };
    on();
    window.addEventListener('scroll', on, { passive: true });
  }

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:') return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () { /* 오프라인 캐시는 없어도 동작 */ });
    });
  }

  /* ---------- 시작 ---------- */
  buildLangSelect();
  applyStrings();
  renderApps();
  observeReveals();
  loadRuntimeStrings();
  watchScroll();
  registerSW();
})();
