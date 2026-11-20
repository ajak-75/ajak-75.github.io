/* KOMI & MOMO POP — 한붓그리기 팡! (스테이지 모드 + 타격감 업그레이드)
   같은 종류 구슬 3개 이상을 한붓으로 이어 터뜨리는 라인 링크 퍼즐.
   · 스테이지 모드: 1탄부터 목표(구슬·점수·콤보·폭탄·얼음)를 채워 클리어, 별 1~3개·코인·도감 배지
   · 무한 60초: 예전 타임어택(기록 도전)
   외부 라이브러리·CDN 없이 캔버스 2D + 자체 원형 물리로 돌아간다. */
(function () {
  'use strict';

  var DICT = window.KOMI_POP_I18N || {};
  var TAU = Math.PI * 2;
  var FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  /* =========================================================
     1. 저장 값 · 언어
     ========================================================= */
  function store(key, val) {
    try {
      if (val === null) localStorage.removeItem(key);
      else localStorage.setItem(key, val);
    } catch (e) { /* 사생활 보호 모드 */ }
  }
  function recall(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function recallJSON(key, fallback) {
    try {
      var raw = recall(key);
      if (!raw) return fallback;
      var v = JSON.parse(raw);
      return v == null ? fallback : v;
    } catch (e) { return fallback; }
  }

  var LANGS = ['ko', 'en', 'ja', 'zh', 'zh-tw', 'es', 'fr', 'de', 'pt', 'ru', 'id', 'vi'];
  var NATIVE = {
    ko: '한국어', en: 'English', ja: '日本語', zh: '中文 (简体)', 'zh-tw': '中文 (繁體)',
    es: 'Español', fr: 'Français', de: 'Deutsch', pt: 'Português', ru: 'Русский',
    id: 'Bahasa Indonesia', vi: 'Tiếng Việt'
  };
  var LANG_KEY = 'komi_pop_lang_v1';
  var LANG = detectLang();

  function detectLang() {
    var saved = recall(LANG_KEY);
    if (saved && DICT[saved]) return saved;
    var raw = String((navigator.languages && navigator.languages[0]) || navigator.language || 'en').toLowerCase();
    if (DICT[raw]) return raw;
    if (raw.indexOf('zh') === 0) return raw.indexOf('hant') > 0 || raw.indexOf('tw') === 0 || raw.indexOf('hk') === 0 ? 'zh-tw' : 'zh';
    var base = raw.split('-')[0];
    if (DICT[base]) return base;
    return 'en';
  }

  function t(key) {
    var d = DICT[LANG] || DICT.en || {};
    if (d[key] != null) return d[key];
    if ((DICT.en || {})[key] != null) return DICT.en[key];
    if ((DICT.ko || {})[key] != null) return DICT.ko[key];
    return key;
  }

  var langWrap = $('langWrap');
  var langBtn = $('langBtn');
  var langMenu = $('langMenu');
  var langCur = $('langCur');
  var soundBtn = $('soundBtn');

  function applyLang(lang) {
    LANG = DICT[lang] ? lang : 'en';
    var d = DICT[LANG] || {};
    document.documentElement.lang = LANG;
    if (d.metaTitle) document.title = d.metaTitle;
    var md = document.querySelector('meta[name="description"]');
    if (md && d.metaDesc) md.setAttribute('content', d.metaDesc);
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var k = nodes[i].getAttribute('data-i18n');
      var v = t(k);
      if (v) nodes[i].textContent = v;
    }
    if (soundBtn) soundBtn.setAttribute('aria-label', muted ? t('soundOn') : t('soundOff'));
    var ariaNodes = document.querySelectorAll('[data-i18n-aria]');
    for (var j = 0; j < ariaNodes.length; j++) {
      var ak = ariaNodes[j].getAttribute('data-i18n-aria');
      if (ak && t(ak)) ariaNodes[j].setAttribute('aria-label', t(ak));
    }
    if (cv) cv.setAttribute('aria-label', t('board'));
    if (langCur) langCur.textContent = NATIVE[LANG] || LANG;
    if (langBtn) langBtn.setAttribute('aria-label', t('lang'));
    syncMenu();
    repaintAfterLang();
  }

  function pickLang(code) {
    if (!DICT[code]) return;
    store(LANG_KEY, code);
    applyLang(code);
    sfxClick();
  }

  function syncMenu() {
    if (!langMenu) return;
    var opts = langMenu.querySelectorAll('.lang-opt');
    for (var i = 0; i < opts.length; i++) {
      opts[i].setAttribute('aria-selected', opts[i].getAttribute('data-lang') === LANG ? 'true' : 'false');
    }
  }
  function closeMenu() {
    if (!langMenu || !langBtn) return;
    langMenu.hidden = true;
    langBtn.setAttribute('aria-expanded', 'false');
  }
  function openMenu() {
    if (!langMenu || !langBtn) return;
    langMenu.hidden = false;
    langBtn.setAttribute('aria-expanded', 'true');
    var sel = langMenu.querySelector('[aria-selected="true"]');
    if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest' });
  }

  function buildLangMenu() {
    if (!langMenu || !langBtn) return;
    var html = '';
    for (var i = 0; i < LANGS.length; i++) {
      html += '<button class="lang-opt" type="button" role="option" aria-selected="false" data-lang="' +
        LANGS[i] + '">' + NATIVE[LANGS[i]] + '</button>';
    }
    langMenu.innerHTML = html;

    langMenu.addEventListener('click', function (ev) {
      var el = ev.target;
      while (el && el !== langMenu && !(el.getAttribute && el.getAttribute('data-lang'))) el = el.parentNode;
      if (!el || el === langMenu) return;
      pickLang(el.getAttribute('data-lang'));
      closeMenu();
      if (langBtn) langBtn.focus({ preventScroll: true });
    });

    langBtn.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      if (langMenu.hidden) openMenu(); else closeMenu();
    });

    document.addEventListener('click', function (ev) {
      if (langWrap && !langWrap.contains(ev.target)) closeMenu();
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && !langMenu.hidden) {
        closeMenu();
        if (langBtn) langBtn.focus({ preventScroll: true });
      }
    });
  }

  /* =========================================================
     2. 소리 · 진동 (Web Audio 합성 — 외부 파일 없음)
     ========================================================= */
  var BEST_KEY = 'komi_pop_link_best_v1';
  var MUTE_KEY = 'komi_pop_mute_v1';
  var best = Math.max(0, parseInt(recall(BEST_KEY) || '0', 10) || 0);
  var muted = recall(MUTE_KEY) === '1';
  var actx = null;

  function audio() {
    if (muted) return null;
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
    } catch (e) { return null; }
    return actx;
  }
  function tone(freq, dur, type, gain, slideTo, delay) {
    var ac = audio();
    if (!ac) return;
    var t0 = ac.currentTime + (delay || 0);
    var o = ac.createOscillator();
    var g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0015, gain || 0.12), t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ac.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  }
  function noise(dur, gain, cut, delay, highpass) {
    var ac = audio();
    if (!ac) return;
    var t0 = ac.currentTime + (delay || 0);
    var len = Math.max(1, Math.floor(ac.sampleRate * dur));
    var buf = ac.createBuffer(1, len, ac.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ac.createBufferSource();
    src.buffer = buf;
    var f = ac.createBiquadFilter();
    f.type = highpass ? 'highpass' : 'lowpass';
    f.frequency.value = cut || 2000;
    var g = ac.createGain();
    g.gain.value = gain || 0.1;
    src.connect(f).connect(g).connect(ac.destination);
    src.start(t0);
  }
  /* 묵직한 드롭 킥 — 85Hz에서 35Hz로 떨어지는 저음 펀치 */
  function kick(power) {
    var ac = audio();
    if (!ac) return;
    var p = power || 1;
    var t0 = ac.currentTime;
    var o = ac.createOscillator();
    var g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(95, t0);
    o.frequency.exponentialRampToValueAtTime(34, t0 + 0.18);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.22 * p, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.26);
    o.connect(g).connect(ac.destination);
    o.start(t0);
    o.stop(t0 + 0.3);
    noise(0.09, 0.05 * p, 320);
  }

  var PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26];
  function noteFreq(i) {
    var semi = PENTA[i % PENTA.length] + 12 * Math.floor(i / PENTA.length);
    return 523.25 * Math.pow(2, semi / 12);
  }
  function sfxChain(i) {
    var f = noteFreq(Math.min(i, 15));
    tone(f, 0.15, 'sine', 0.14);
    tone(f * 2, 0.06, 'triangle', 0.035, null, 0.01);
    vibe(10);
  }
  function sfxBack() { tone(392, 0.06, 'sine', 0.06, 330); vibe(6); }
  function sfxPop(n) {
    for (var i = 0; i < Math.min(n, 6); i++) {
      var f = 560 * Math.pow(1.08, i);
      tone(f, 0.1, 'triangle', 0.09, f * 1.45, i * 0.022);
    }
    noise(0.16, 0.09, 2600, 0.01);
    kick(n >= 5 ? 1 : n >= 4 ? 0.72 : 0.5);
    if (n >= 4) noise(0.22, 0.1, 1100, 0.02);
    vibe(n >= 5 ? [25, 20, 45] : 14);
  }
  function sfxBomb() {
    kick(1.5);
    tone(160, 0.55, 'sawtooth', 0.18, 40);
    tone(96, 0.7, 'sine', 0.2, 30, 0.02);
    noise(0.5, 0.22, 1000);
    noise(0.32, 0.12, 320, 0.02);
    vibe([25, 20, 45, 30, 60]);
  }
  function sfxBombDrop() {
    tone(660, 0.14, 'triangle', 0.1, 1180);
    tone(880, 0.16, 'sine', 0.09, 1560, 0.08);
    vibe(12);
  }
  function sfxFever() {
    var notes = [523, 659, 784, 1047, 1319];
    for (var i = 0; i < notes.length; i++) tone(notes[i], 0.3, 'sine', 0.11, null, i * 0.075);
    noise(0.5, 0.06, 4000, 0, true);
    kick(0.9);
    vibe([25, 20, 45]);
  }
  function sfxIce() {
    tone(2400, 0.1, 'triangle', 0.06, 3400);
    tone(3100, 0.08, 'sine', 0.045, 2100, 0.03);
    noise(0.14, 0.07, 3600, 0, true);
    vibe(16);
  }
  function sfxClear() {
    var notes = [523, 659, 784, 1047, 1319, 1568];
    for (var i = 0; i < notes.length; i++) tone(notes[i], 0.34, 'triangle', 0.1, null, i * 0.085);
    tone(1047, 0.6, 'sine', 0.09, 1568, 0.52);
    noise(0.5, 0.05, 5200, 0.4, true);
    kick(1.1);
    vibe([30, 40, 30, 40, 90]);
  }
  function sfxShuffle() {
    noise(0.3, 0.12, 1500);
    tone(320, 0.28, 'sine', 0.07, 720);
    vibe(12);
  }
  function sfxTick() { tone(1080, 0.05, 'square', 0.045); }
  function sfxClick() { tone(620, 0.06, 'sine', 0.07, 760); }
  function sfxStart() {
    tone(523, 0.12, 'sine', 0.09);
    tone(784, 0.16, 'sine', 0.09, null, 0.09);
    vibe(12);
  }
  function sfxOver() {
    tone(494, 0.22, 'triangle', 0.1, 392);
    tone(392, 0.26, 'triangle', 0.09, 294, 0.16);
    tone(294, 0.4, 'sine', 0.08, 174, 0.34);
    vibe(90);
  }
  /* 진동 — 소리가 켜져 있을 때만 함께 울린다 */
  function vibe(pattern) {
    if (muted) return;
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* 미지원 기기 */ }
  }

  function paintSound() {
    if (!soundBtn) return;
    soundBtn.setAttribute('aria-pressed', muted ? 'false' : 'true');
    soundBtn.setAttribute('aria-label', muted ? t('soundOn') : t('soundOff'));
  }
  if (soundBtn) {
    soundBtn.addEventListener('click', function () {
      muted = !muted;
      store(MUTE_KEY, muted ? '1' : '0');
      paintSound();
      if (muted) { try { navigator.vibrate && navigator.vibrate(0); } catch (e) {} }
      else sfxClick();
    });
  }

  /* =========================================================
     3. 화면 요소
     ========================================================= */
  var wrap = $('stageWrap');
  var cv = $('game');
  var ctx = cv.getContext('2d');
  var overlay = $('overlay');
  var introPanel = $('introPanel');
  var clearPanel = $('clearPanel');
  var failPanel = $('failPanel');
  var overPanel = $('overPanel');
  var scoreEl = $('score');
  var bestEl = $('best');
  var bestStat = $('bestStat');
  var bestIntroEl = $('bestIntro');
  var coinValEl = $('coinVal');
  var timeLeftEl = $('timeLeft');
  var timeRing = $('timeRing');
  var comboChip = $('comboChip');
  var comboVal = $('comboVal');
  var feverBar = $('feverBar');
  var feverFill = $('feverFill');
  var finalScoreEl = $('finalScore');
  var recordLine = $('recordLine');
  var stCombo = $('stCombo');
  var stChain = $('stChain');
  var stPopped = $('stPopped');
  var shuffleBtn = $('shuffleBtn');
  var startBtn = $('startBtn');
  var againBtn = $('againBtn');
  var goalBar = $('goalBar');
  var stageNumEl = $('stageNum');
  var goalList = $('goalList');
  var starGauge = $('starGauge');
  var modeTabs = $('modeTabs');
  var stageCard = $('stageCard');
  var sandboxCard = $('sandboxCard');
  var introStageNum = $('introStageNum');
  var introGoals = $('introGoals');
  var introStars = $('introStars');
  var introCoin = $('introCoin');
  var boostBombBtn = $('boostBombBtn');
  var boostTimeBtn = $('boostTimeBtn');
  var albumBtn = $('albumBtn');
  var albumModal = $('albumModal');
  var albumCloseBtn = $('albumClose');
  var albumCoinsEl = $('albumCoins');
  var albumStarsEl = $('albumStars');
  var albumClearedEl = $('albumCleared');
  var badgeGrid = $('badgeGrid');
  var stageGrid = $('stageGrid');
  var clearStageEl = $('clearStage');
  var clearScoreEl = $('clearScore');
  var clearStarsEl = $('clearStars');
  var clearCoinsEl = $('clearCoins');
  var clearBonusEl = $('clearBonus');
  var clearBadgeEl = $('clearBadge');
  var clearBadgeImg = $('clearBadgeImg');
  var clearBadgeName = $('clearBadgeName');
  var nextBtn = $('nextBtn');
  var retryClearBtn = $('retryClearBtn');
  var retryBtn = $('retryBtn');
  var failStageEl = $('failStage');
  var failGoals = $('failGoals');
  var failScoreEl = $('failScore');

  /* =========================================================
     4. 스테이지 설계 · 저장
     ========================================================= */
  var S_CUR = 'komi_pop_stage_v1';
  var S_STARS = 'komi_pop_stars_v1';
  var S_COINS = 'komi_pop_coins_v1';
  var S_BADGE = 'komi_pop_badge_v1';

  var starsOf = recallJSON(S_STARS, {});
  if (!starsOf || typeof starsOf !== 'object') starsOf = {};
  var badgeSet = recallJSON(S_BADGE, {});
  if (!badgeSet || typeof badgeSet !== 'object') badgeSet = {};
  var coinBalance = parseInt(recall(S_COINS) || '', 10);
  var coinsNew = false;
  if (isNaN(coinBalance) || coinBalance < 0) { coinBalance = 100; coinsNew = true; }
  var maxStage = Math.max(1, parseInt(recall(S_CUR) || '1', 10) || 1);
  var stageNo = Math.min(maxStage, topStage());
  if (coinsNew) saveCoins();

  function saveStars() { store(S_STARS, JSON.stringify(starsOf)); }
  function saveCoins() { store(S_COINS, String(coinBalance)); }
  function saveBadges() { store(S_BADGE, JSON.stringify(badgeSet)); }
  function saveStage() { store(S_CUR, String(maxStage)); }

  /* 손으로 설계한 15개 스테이지 */
  var HAND = [
    { time: 45, goals: [{ kind: 'bead', type: 1, need: 10 }] },
    { time: 50, goals: [{ kind: 'bead', type: 4, need: 14 }, { kind: 'combo', need: 2 }] },
    { time: 50, goals: [{ kind: 'score', need: 800 }] },
    { time: 55, goals: [{ kind: 'bomb', need: 1 }, { kind: 'score', need: 500 }] },
    { time: 55, goals: [{ kind: 'ice', need: 6 }, { kind: 'bead', type: 2, need: 12 }] },
    { time: 50, goals: [{ kind: 'bead', type: 0, need: 18 }] },
    { time: 55, goals: [{ kind: 'combo', need: 4 }, { kind: 'score', need: 1200 }] },
    { time: 60, goals: [{ kind: 'ice', need: 10 }, { kind: 'bead', type: 3, need: 15 }] },
    { time: 55, goals: [{ kind: 'bomb', need: 2 }, { kind: 'score', need: 900 }] },
    { time: 55, goals: [{ kind: 'score', need: 2000 }] },
    { time: 60, goals: [{ kind: 'ice', need: 14 }, { kind: 'combo', need: 5 }] },
    { time: 60, goals: [{ kind: 'bead', type: 3, need: 20 }, { kind: 'bomb', need: 2 }] },
    { time: 55, goals: [{ kind: 'score', need: 3000 }] },
    { time: 60, goals: [{ kind: 'ice', need: 18 }, { kind: 'score', need: 2500 }] },
    { time: 65, goals: [{ kind: 'bomb', need: 3 }, { kind: 'score', need: 4000 }] }
  ];

  /* 16탄부터는 자동 생성 — 끝없이 도전 */
  function autoStage(n) {
    var k = n - 15;
    var bump = Math.floor((k - 1) / 5);
    var time = Math.max(48, 65 - Math.floor(k / 3));
    var p = (n - 16) % 5;
    var goals;
    if (p === 0) {
      goals = [{ kind: 'score', need: 3500 + bump * 600 }, { kind: 'bead', type: (n * 2) % 5, need: Math.min(32, 18 + bump * 2) }];
    } else if (p === 1) {
      goals = [{ kind: 'ice', need: Math.min(30, 12 + bump * 2) }, { kind: 'combo', need: 4 + Math.min(4, bump) }];
    } else if (p === 2) {
      goals = [{ kind: 'bomb', need: 2 + Math.min(3, bump) }, { kind: 'score', need: 3000 + bump * 500 }];
    } else if (p === 3) {
      goals = [{ kind: 'ice', need: Math.min(30, 16 + bump * 2) }, { kind: 'score', need: 3800 + bump * 600 }];
    } else {
      goals = [
        { kind: 'bead', type: n % 5, need: Math.min(34, 22 + bump * 2) },
        { kind: 'bead', type: (n + 2) % 5, need: Math.min(30, 16 + bump * 2) }
      ];
    }
    return { time: time, goals: goals, auto: true };
  }

  function stageDef(n) {
    if (n >= 1 && n <= HAND.length) return HAND[n - 1];
    return autoStage(n);
  }

  /* 도감 배지 — 마일스톤 스테이지 최초 클리어 시 해금 */
  var BADGES = [
    { id: 1, stage: 1, img: 'chars/bead-4.webp', key: 'badge1' },
    { id: 2, stage: 3, img: 'chars/bead-1.webp', key: 'badge2' },
    { id: 3, stage: 5, img: 'chars/bead-2.webp', key: 'badge3' },
    { id: 4, stage: 7, img: 'chars/bomb.webp', key: 'badge4' },
    { id: 5, stage: 10, img: 'chars/bead-3.webp', key: 'badge5' },
    { id: 6, stage: 12, img: 'chars/bead-0.webp', key: 'badge6' },
    { id: 7, stage: 15, img: 'chars/bead-4.webp', key: 'badge7' }
  ];

  function badgeForStage(n) {
    for (var i = 0; i < BADGES.length; i++) if (BADGES[i].stage === n) return BADGES[i];
    return null;
  }
  function clearedCount() {
    var c = 0;
    for (var k in starsOf) if (starsOf[k] > 0) c++;
    return c;
  }
  function topStage() {
    var top = maxStage;
    if (top < 1) top = 1;
    return top;
  }

  /* =========================================================
     5. 구슬 종류 · 스프라이트
     ========================================================= */
  var TYPES = [
    { key: 'paw', file: 'chars/bead-0.webp', color: '#8B5CF6' },
    { key: 'flower', file: 'chars/bead-1.webp', color: '#F2592D' },
    { key: 'blue', file: 'chars/bead-2.webp', color: '#3B82F6' },
    { key: 'beret', file: 'chars/bead-3.webp', color: '#F0A81C' },
    { key: 'pink', file: 'chars/bead-4.webp', color: '#EF5DA8' }
  ];
  var MAX_BEADS = 50;
  var GRAV = 2100;
  var REST = 0.16;
  var FEVER_DUR = 10;

  var beadImgs = [];
  var bombImg = new Image();
  var ready = false;

  function hexA(hex, a) {
    var h = hex.replace('#', '');
    return 'rgba(' + parseInt(h.slice(0, 2), 16) + ',' + parseInt(h.slice(2, 4), 16) + ',' + parseInt(h.slice(4, 6), 16) + ',' + a + ')';
  }

  var beadCache = {};
  var boardCv = document.createElement('canvas');

  function makeBeadSprite(img, r, color) {
    var pad = Math.ceil(r * 0.55);
    var css = (r + pad) * 2;
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(css * DPR));
    c.height = Math.max(1, Math.ceil(css * DPR));
    var g = c.getContext('2d');
    g.scale(DPR, DPR);
    var cx = css / 2, cy = css / 2;

    var sg = g.createRadialGradient(cx, cy + r * 0.7, r * 0.05, cx, cy + r * 0.7, r * 1.05);
    sg.addColorStop(0, 'rgba(120,40,80,.30)');
    sg.addColorStop(0.5, 'rgba(120,40,80,.12)');
    sg.addColorStop(1, 'rgba(120,40,80,0)');
    g.fillStyle = sg;
    g.beginPath();
    g.ellipse(cx, cy + r * 0.68, r * 0.96, r * 0.6, 0, 0, TAU);
    g.fill();

    if (color) {
      var ag = g.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.16);
      ag.addColorStop(0, hexA(color, 0));
      ag.addColorStop(0.62, hexA(color, 0.2));
      ag.addColorStop(1, hexA(color, 0));
      g.fillStyle = ag;
      g.beginPath();
      g.arc(cx, cy, r * 1.16, 0, TAU);
      g.fill();
    }

    if (img && img.complete && img.naturalWidth) {
      g.drawImage(img, cx - r, cy - r, r * 2, r * 2);
    } else {
      g.fillStyle = color || '#FF9BC5';
      g.beginPath();
      g.arc(cx, cy, r, 0, TAU);
      g.fill();
    }
    return { cv: c, css: css };
  }

  function buildSprites() {
    beadCache = {};
    for (var i = 0; i < TYPES.length; i++) {
      beadCache[i] = makeBeadSprite(beadImgs[i], R, TYPES[i].color);
    }
    beadCache.bomb = makeBeadSprite(bombImg, R * 1.16, '#F5B301');
  }

  function roundRect(g, x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + rr, y);
    g.arcTo(x + w, y, x + w, y + h, rr);
    g.arcTo(x + w, y + h, x, y + h, rr);
    g.arcTo(x, y + h, x, y, rr);
    g.arcTo(x, y, x + w, y, rr);
    g.closePath();
  }

  function buildBoard() {
    boardCv.width = Math.max(1, Math.ceil(W * DPR));
    boardCv.height = Math.max(1, Math.ceil(H * DPR));
    var g = boardCv.getContext('2d');
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    g.clearRect(0, 0, W, H);
    var rad = 24;

    roundRect(g, 0, 0, W, H, rad);
    var grd = g.createLinearGradient(0, 0, W * 0.4, H);
    grd.addColorStop(0, '#FFF7FB');
    grd.addColorStop(0.52, '#FFF0F7');
    grd.addColorStop(1, '#FFE4EF');
    g.fillStyle = grd;
    g.fill();

    var rg = g.createRadialGradient(W * 0.5, H * 0.1, 8, W * 0.5, H * 0.25, H * 0.95);
    rg.addColorStop(0, 'rgba(255,255,255,.95)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.fill();

    g.fillStyle = 'rgba(226,47,118,.055)';
    var step = 22;
    for (var y = step; y < H; y += step) {
      for (var x = step; x < W; x += step) {
        g.beginPath();
        g.arc(x, y, 1.1, 0, TAU);
        g.fill();
      }
    }

    var fg = g.createLinearGradient(0, H - 100, 0, H);
    fg.addColorStop(0, 'rgba(226,47,118,0)');
    fg.addColorStop(1, 'rgba(226,47,118,.075)');
    g.fillStyle = fg;
    g.fillRect(0, H - 100, W, 100);

    g.lineWidth = 2;
    g.strokeStyle = 'rgba(255,178,209,.7)';
    roundRect(g, 1, 1, W - 2, H - 2, rad - 1);
    g.stroke();
  }

  /* =========================================================
     6. 게임 상태
     ========================================================= */
  var DPR = 1, W = 375, H = 520, R = 26;
  var PAD = 8;
  var left = PAD, right = W - PAD, floorY = H - PAD;

  var beads = [];
  var ghosts = [];
  var parts = [];
  var texts = [];
  var waves = [];
  var boomQueue = [];
  var uid = 0;

  var state = 'intro';       // intro | play | clear | fail
  var MODE = 'stage';        // stage | sandbox
  var paused = false;
  var score = 0, combo = 0, comboT = 0, maxCombo = 1, maxChain = 0, poppedTotal = 0;
  var timeLeft = 0, timeLimit = 60, feverGauge = 0, feverLeft = 0, lastSec = -1;
  var pending = 0, spawnTimer = 0;
  var chain = [], chainType = -1, dragging = false;
  var dragLast = { x: 0, y: 0 };
  var shakeT = 0, shakeMag = 0, flash = 0;
  var qaEv = { down: 0, move: 0, up: 0, hits: 0, links: 0 };
  var acc = 0, lastFrame = 0;

  var goals = [];
  var poppedByType = [0, 0, 0, 0, 0];
  var iceBroken = 0, bombsPopped = 0;
  var finishing = false, finishDelay = 0;
  var boostBomb = false, boostTime = false;
  var starsWon = 0, coinsWon = 0, bonusWon = 0, appearedBadge = null;
  var albumOpen = false;
  var lastHint = 0;

  function resize() {
    var rect = wrap.getBoundingClientRect();
    W = Math.max(200, Math.round(rect.width));
    H = Math.max(240, Math.round(rect.height));
    DPR = Math.min(window.devicePixelRatio || 1, 2.5);
    cv.width = Math.max(1, Math.round(W * DPR));
    cv.height = Math.max(1, Math.round(H * DPR));
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';
    left = PAD;
    right = W - PAD;
    floorY = H - PAD;
    R = clamp(W * 0.088, 18, 32);

    buildBoard();
    if (ready) buildSprites();

    for (var i = 0; i < beads.length; i++) {
      var b = beads[i];
      b.r = b.bomb ? R * 1.16 : R;
      b.x = clamp(b.x, left + b.r, right - b.r);
      b.y = clamp(b.y, -b.r * 3, floorY - b.r);
    }
  }

  function makeBead(type, x, y, bomb) {
    return {
      id: ++uid, type: type, bomb: !!bomb, ice: false,
      x: x, y: y, vx: 0, vy: 0,
      r: bomb ? R * 1.16 : R,
      scale: 1, flash: 0, crack: 0
    };
  }

  function fillBoard() {
    beads.length = 0;
    ghosts.length = 0;
    parts.length = 0;
    texts.length = 0;
    waves.length = 0;
    boomQueue.length = 0;

    var types = [];
    for (var i = 0; i < MAX_BEADS; i++) types.push(i % TYPES.length);
    for (var k = types.length - 1; k > 0; k--) {
      var j = (Math.random() * (k + 1)) | 0;
      var tmp = types[k]; types[k] = types[j]; types[j] = tmp;
    }

    var idx = 0, row = 0;
    while (idx < MAX_BEADS && row < 40) {
      var y = floorY - R - row * (2 * R * 0.93);
      var off = (row % 2) ? R : 0;
      for (var x = left + R + off; x <= right - R + 0.01 && idx < MAX_BEADS; x += 2 * R + 0.5) {
        beads.push(makeBead(types[idx++], x + rnd(-1.6, 1.6), y + rnd(-1, 1)));
      }
      row++;
    }
    for (var s = 0; s < 170; s++) stepPhysics(1 / 120);
    for (var q = 0; q < beads.length; q++) { beads[q].vx = 0; beads[q].vy = 0; }
  }

  /* =========================================================
     7. 물리
     ========================================================= */
  function stepPhysics(dt) {
    var i, j, b;

    for (i = 0; i < beads.length; i++) {
      b = beads[i];
      b.vy += GRAV * dt;
      b.vx *= 0.999;
      var sp2 = b.vx * b.vx + b.vy * b.vy;
      if (sp2 > 1e6) { var f = 1000 / Math.sqrt(sp2); b.vx *= f; b.vy *= f; }
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.x < left + b.r) { b.x = left + b.r; if (b.vx < 0) b.vx = -b.vx * 0.42; }
      if (b.x > right - b.r) { b.x = right - b.r; if (b.vx > 0) b.vx = -b.vx * 0.42; }
      if (b.y > floorY - b.r) {
        b.y = floorY - b.r;
        if (b.vy > 0) b.vy = -b.vy * 0.26;
        b.vx *= 0.9;
        if (Math.abs(b.vy) < 26) b.vy = 0;
      }
    }

    for (var it = 0; it < 2; it++) {
      for (i = 0; i < beads.length; i++) {
        var a = beads[i];
        for (j = i + 1; j < beads.length; j++) {
          var c = beads[j];
          var dx = c.x - a.x, dy = c.y - a.y;
          var rr = a.r + c.r;
          var d2 = dx * dx + dy * dy;
          if (d2 > rr * rr || d2 < 1e-6) continue;
          var d = Math.sqrt(d2);
          var nx = dx / d, ny = dy / d;
          var overlap = rr - d;
          var ma = a.r * a.r, mc = c.r * c.r, tot = ma + mc;
          a.x -= nx * overlap * (mc / tot);
          a.y -= ny * overlap * (mc / tot);
          c.x += nx * overlap * (ma / tot);
          c.y += ny * overlap * (ma / tot);

          var rvn = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
          if (rvn < 0) {
            var imp = -(1 + REST) * rvn / (1 / ma + 1 / mc);
            a.vx -= imp * nx / ma; a.vy -= imp * ny / ma;
            c.vx += imp * nx / mc; c.vy += imp * ny / mc;

            var tx = -ny, ty = nx;
            var rvt = (c.vx - a.vx) * tx + (c.vy - a.vy) * ty;
            var jt = -rvt * 0.16 / (1 / ma + 1 / mc);
            a.vx -= jt * tx / ma; a.vy -= jt * ty / ma;
            c.vx += jt * tx / mc; c.vy += jt * ty / mc;
          }
        }
      }
    }

    for (i = 0; i < beads.length; i++) {
      b = beads[i];
      if (Math.abs(b.vx) < 3) b.vx *= 0.82;
      if (Math.abs(b.vy) < 3) b.vy *= 0.82;
    }
  }

  /* =========================================================
     8. 연결(한붓그리기)
     ========================================================= */
  function locked() {
    return state !== 'play' || paused || finishing || albumOpen;
  }

  function beadAt(x, y, k) {
    var bestB = null, bestD = 1e9;
    for (var i = 0; i < beads.length; i++) {
      var b = beads[i];
      var d = Math.hypot(b.x - x, b.y - y);
      if (d < b.r * (k || 1) && d < bestD) { bestD = d; bestB = b; }
    }
    return bestB;
  }

  function tryExtend(px, py) {
    if (!chain.length) return;
    var last = chain[chain.length - 1];
    var cands = [];
    for (var i = 0; i < beads.length; i++) {
      var b = beads[i];
      var d = Math.hypot(b.x - px, b.y - py);
      if (d < b.r * 0.98) cands.push({ b: b, d: d });
    }
    cands.sort(function (a, c) { return a.d - c.d; });

    for (var k = 0; k < cands.length; k++) {
      var cand = cands[k].b;
      var idx = chain.indexOf(cand);
      if (idx >= 0) {
        if (idx < chain.length - 1) {
          chain.length = idx + 1;
          sfxBack();
        }
        return;
      }
      if (cand.bomb || cand.type !== chainType) continue;
      var dd = Math.hypot(cand.x - last.x, cand.y - last.y);
      if (dd > (cand.r + last.r) * 1.8) continue;
      chain.push(cand);
      qaEv.links++;
      cand.flash = 0.3;
      sfxChain(chain.length - 1);
      return;
    }
  }

  function extendPath(x0, y0, x1, y1) {
    var dx = x1 - x0, dy = y1 - y0;
    var len = Math.hypot(dx, dy);
    var steps = Math.max(1, Math.ceil(len / Math.max(6, R * 0.42)));
    for (var s = 1; s <= steps; s++) {
      tryExtend(x0 + dx * s / steps, y0 + dy * s / steps);
    }
  }

  function localPoint(ev) {
    var r = cv.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }

  cv.addEventListener('pointerdown', function (ev) {
    if (locked()) return;
    ev.preventDefault();
    var p = localPoint(ev);
    var b = beadAt(p.x, p.y, 1.06);
    qaEv.down++;
    if (b) qaEv.hits++;
    if (!b) return;
    try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
    if (b.bomb) {
      b.exploded = true;
      boomQueue.push({ b: b, t: 0 });
      return;
    }
    dragging = true;
    chain = [b];
    chainType = b.type;
    dragLast = p;
    b.flash = 0.3;
    sfxChain(0);
  });

  cv.addEventListener('pointermove', function (ev) {
    if (!dragging) return;
    ev.preventDefault();
    qaEv.move++;
    var list = ev.getCoalescedEvents ? ev.getCoalescedEvents() : null;
    if (list && list.length) {
      for (var i = 0; i < list.length; i++) {
        var q = localPoint(list[i]);
        extendPath(dragLast.x, dragLast.y, q.x, q.y);
        dragLast = q;
      }
    } else {
      var p = localPoint(ev);
      extendPath(dragLast.x, dragLast.y, p.x, p.y);
      dragLast = p;
    }
  });

  function releasePointer() {
    if (!dragging) return;
    dragging = false;
    commitChain();
  }
  cv.addEventListener('pointerup', function (ev) { ev.preventDefault(); qaEv.up++; releasePointer(); });
  cv.addEventListener('pointercancel', function () {
    dragging = false;
    chain = [];
    chainType = -1;
  });
  cv.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });

  function commitChain() {
    var n = chain.length;
    if (n < 3) {
      for (var f = 0; f < chain.length; f++) chain[f].flash = 0.2;
      chain = [];
      chainType = -1;
      return;
    }

    var popped = [], iced = [], i, b;
    for (i = 0; i < n; i++) {
      if (chain[i].ice) iced.push(chain[i]); else popped.push(chain[i]);
    }
    var np = popped.length;
    var tp = TYPES[chainType] || TYPES[0];
    var gain = 0;

    var cx = 0, cy = 0;
    for (i = 0; i < n; i++) { cx += chain[i].x; cy += chain[i].y; }
    cx /= n; cy /= n;

    if (np > 0) {
      var mult = 1 + Math.min(combo, 8) * 0.2;
      var base = np * 10 + Math.max(0, np - 3) * 10;
      gain = Math.round(base * mult * (feverLeft > 0 ? 2 : 1));
      score += gain;
      poppedTotal += np;
      combo += 1;
      comboT = 3.2;
      if (combo > maxCombo) maxCombo = combo;
      if (n > maxChain) maxChain = n;
      addFever(5 + np * 1.4);
      pending = Math.min(14, pending + np);
      spawnTimer = Math.min(spawnTimer, 0.02);
    }

    for (i = 0; i < np; i++) {
      b = popped[i];
      var idx = beads.indexOf(b);
      if (idx >= 0) beads.splice(idx, 1);
      ghosts.push({ x: b.x, y: b.y, r: b.r, type: b.type, bomb: false, t: 0, dur: 0.34, delay: i * 0.016 });
      burst(b.x, b.y, tp.color, np >= 5 ? 7 : 5);
      poppedByType[b.type] = (poppedByType[b.type] || 0) + 1;
    }

    /* 같은 줄에 이은 얼음은 직접 쨍! */
    for (i = 0; i < iced.length; i++) crackIce(iced[i], true);

    /* 바로 옆 구슬이 터지면 얼음도 쨍! */
    if (np > 0) {
      var popC = [];
      for (i = 0; i < np; i++) popC.push(popped[i]);
      for (i = 0; i < beads.length; i++) {
        var ob = beads[i];
        if (!ob.ice) continue;
        for (var q = 0; q < popC.length; q++) {
          var dd = Math.hypot(ob.x - popC[q].x, ob.y - popC[q].y);
          if (dd < (ob.r + popC[q].r) * 1.14) { crackIce(ob, false); break; }
        }
      }
    }

    if (np > 0) {
      texts.push({
        x: cx, y: cy - R * 0.45, text: '+' + fmt(gain), t: 0, dur: 0.9,
        color: tp.color, size: 16 + Math.min(9, np)
      });
      if (np >= 4) {
        var word = np >= 7 ? t('popAmazing') : np === 6 ? t('popGreat') : t('popGood');
        var wsize = np >= 7 ? 27 : 30;
        pushPop(word, cx, cy - R * 1.7, '#E22F76', wsize);
      }
      sfxPop(np);
      shake(0.16 + Math.min(0.26, np * 0.014), 3 + Math.min(7, np));
    } else if (iced.length) {
      shake(0.18, 4);
    }

    if (np >= bombThreshold()) dropBomb(cx);
    if (combo >= 2) pulseCombo();
    else hideCombo();

    chain = [];
    chainType = -1;
    updateScoreUI();
    bumpEl(scoreEl);
    refreshGoals();
  }

  /* =========================================================
     9. 폭탄 · 피버
     ========================================================= */
  function bombThreshold() {
    var g = goalOf('bomb');
    return g ? 6 : 7;
  }

  function dropBomb(x) {
    var b = makeBead(-1, clamp(x, left + R * 1.4, right - R * 1.4), -R * 1.8, true);
    b.vy = 90;
    b.scale = 0.3;
    beads.push(b);
    sfxBombDrop();
  }

  function doExplode(b) {
    var idx = beads.indexOf(b);
    if (idx >= 0) beads.splice(idx, 1);
    var rad = R * 3.9;
    var killed = 0;

    for (var i = beads.length - 1; i >= 0; i--) {
      var o = beads[i];
      var d = Math.hypot(o.x - b.x, o.y - b.y);
      if (d > rad) continue;
      if (o.ice) { crackIce(o, false); continue; }
      beads.splice(i, 1);
      ghosts.push({ x: o.x, y: o.y, r: o.r, type: o.type, bomb: o.bomb, t: 0, dur: 0.34, delay: 0 });
      burst(o.x, o.y, o.bomb ? '#FFD75E' : TYPES[Math.max(0, o.type)].color, 5);
      if (!o.bomb) poppedByType[o.type] = (poppedByType[o.type] || 0) + 1;
      killed++;
      if (o.bomb && !o.exploded) {
        o.exploded = true;
        boomQueue.push({ b: o, t: 0.14 });
      }
    }

    bombsPopped++;
    var gain = Math.round((20 + killed * 18) * (feverLeft > 0 ? 2 : 1));
    score += gain;
    poppedTotal += killed;
    pushPop(t('popBoom'), b.x, b.y - R * 1.1, '#E08A00', 34);
    texts.push({ x: b.x, y: b.y + R * 0.6, text: '+' + fmt(gain), t: 0, dur: 1, color: '#D98A00', size: 22 });
    waves.push({ x: b.x, y: b.y, r: R, r1: rad * 1.2, t: 0, dur: 0.6, color: '#FFC246' });
    waves.push({ x: b.x, y: b.y, r: R * 0.4, r1: rad * 1.6, t: 0, dur: 0.85, color: '#FFF0B8' });
    for (var c = 0; c < 34; c++) {
      var col = c % 4 === 0 ? '#FFF3C4' : c % 3 ? '#FFD75E' : '#FF8A3D';
      burst(b.x, b.y, col, 1, c % 4 === 0);
    }

    flash = Math.max(flash, 0.9);
    shake(0.62, 17);
    sfxBomb();

    pending = Math.min(22, pending + killed);
    spawnTimer = Math.min(spawnTimer, 0.05);
    updateScoreUI();
    bumpEl(scoreEl);
    refreshGoals();
  }

  function addFever(v) {
    if (feverLeft > 0) return;
    feverGauge = Math.min(100, feverGauge + v);
    if (feverGauge >= 100) startFever();
    else updateFeverUI();
  }

  function startFever() {
    feverLeft = FEVER_DUR;
    feverGauge = 100;
    timeLeft = Math.min(timeLimit + 10, timeLeft + 5);
    feverBar.classList.add('on');
    pushPop(t('popFever'), W / 2, H * 0.3, '#FF7B00', 28);
    flash = Math.max(flash, 0.55);
    for (var i = 0; i < 40; i++) confetti();
    sfxFever();
    updateTimerUI();
  }

  /* =========================================================
     10. 얼음 구슬
     ========================================================= */
  function crackIce(b, direct) {
    if (!b.ice) return;
    b.ice = false;
    b.crack = 1;
    b.flash = 0.5;
    b.vx += rnd(-70, 70);
    b.vy -= rnd(60, 150);
    iceBroken++;
    score += 10;
    for (var k = 0; k < 9; k++) {
      var a = Math.random() * TAU, sp = rnd(90, 300);
      parts.push({
        x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
        t: 0, dur: rnd(0.35, 0.7), r: rnd(1.6, 4), color: k % 3 ? '#BFEBFF' : '#FFFFFF', g: 760
      });
    }
    waves.push({ x: b.x, y: b.y, r: b.r * 0.55, r1: b.r * 2, t: 0, dur: 0.4, color: '#9BD9FF' });
    if (texts.length < 7) {
      texts.push({ x: b.x, y: b.y - b.r * 1.15, text: t('iceCrack'), t: 0, dur: 0.62, color: '#1E86C9', size: 14 });
    }
    sfxIce();
    if (direct) shake(0.14, 3);
    updateScoreUI();
    refreshGoals();
  }

  function iceNeed() {
    var g = goalOf('ice');
    return g ? g.need : 0;
  }
  function iceOnBoard() {
    var c = 0;
    for (var i = 0; i < beads.length; i++) if (beads[i].ice) c++;
    return c;
  }
  function seedIce() {
    var need = iceNeed();
    if (!need) return;
    var want = Math.min(need, 10);
    var pool = beads.slice(0);
    for (var i = pool.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }
    for (i = 0; i < want && i < pool.length; i++) pool[i].ice = true;
  }

  /* =========================================================
     11. 이펙트
     ========================================================= */
  function burst(x, y, color, n, star) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * TAU, sp = rnd(80, 320);
      parts.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
        t: 0, dur: rnd(0.4, 0.9), r: rnd(2, 5.4), color: color, g: 720, star: !!star
      });
    }
    if (parts.length > 520) parts.splice(0, parts.length - 520);
  }
  function confetti() {
    var tp = TYPES[(Math.random() * TYPES.length) | 0];
    parts.push({
      x: rnd(0, W), y: rnd(-40, H * 0.3),
      vx: rnd(-40, 40), vy: rnd(60, 200),
      t: 0, dur: rnd(1.1, 1.9), r: rnd(2, 4.5), color: tp.color, g: 260
    });
  }
  function pushPop(text, x, y, color, size) {
    texts.push({ x: x, y: y, text: text, t: 0, dur: 1.15, color: color, size: size || 28, pop: true });
    if (texts.length > 16) texts.splice(0, texts.length - 16);
  }
  function shake(tm, mag) { shakeT = Math.max(shakeT, tm); shakeMag = Math.max(shakeMag, mag); }
  function bumpEl(el) {
    if (!el) return;
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }
  function pulseCombo() {
    comboChip.hidden = false;
    comboVal.textContent = combo;
    comboChip.classList.remove('pop');
    void comboChip.offsetWidth;
    comboChip.classList.add('pop');
  }
  function hideCombo() { comboChip.hidden = true; }

  /* =========================================================
     12. 새 구슬 · 섞기
     ========================================================= */
  function nextType() {
    var counts = [0, 0, 0, 0, 0], i;
    for (i = 0; i < beads.length; i++) if (!beads[i].bomb) counts[beads[i].type]++;
    var min = Infinity;
    for (i = 0; i < counts.length; i++) if (counts[i] < min) min = counts[i];
    var pool = [];
    for (i = 0; i < counts.length; i++) if (counts[i] <= min + 1) pool.push(i);
    if (Math.random() < 0.25) return (Math.random() * TYPES.length) | 0;
    return pool[(Math.random() * pool.length) | 0];
  }

  function spawnOne() {
    if (state !== 'play') return;
    var x = rnd(left + R, right - R);
    var b = makeBead(nextType(), x, -R * 1.3 - rnd(0, 40));
    b.vy = 90;
    b.vx = rnd(-30, 30);
    b.scale = 0.45;
    var need = iceNeed();
    if (need && iceBroken < need && iceOnBoard() < Math.min(8, need - iceBroken + 2) && Math.random() < 0.34) {
      b.ice = true;
    }
    beads.push(b);
  }

  function processSpawns(dt) {
    if (pending <= 0) return;
    spawnTimer -= dt;
    while (spawnTimer <= 0 && pending > 0) {
      spawnOne();
      pending--;
      spawnTimer += 0.045;
    }
  }

  function shuffle() {
    if (locked()) return;
    for (var i = 0; i < beads.length; i++) {
      var b = beads[i];
      var a = Math.random() * TAU;
      var sp = rnd(260, 520);
      b.vx += Math.cos(a) * sp;
      b.vy += Math.sin(a) * sp - 300;
      b.flash = 0.3;
    }
    chain = [];
    chainType = -1;
    sfxShuffle();
    shuffleBtn.classList.remove('spin');
    void shuffleBtn.offsetWidth;
    shuffleBtn.classList.add('spin');
    shake(0.28, 3);
  }
  if (shuffleBtn) shuffleBtn.addEventListener('click', shuffle);

  /* =========================================================
     13. 목표 · 보상
     ========================================================= */
  function goalOf(kind) {
    for (var i = 0; i < goals.length; i++) if (goals[i].kind === kind) return goals[i];
    return null;
  }
  function hasIceGoal() { return !!goalOf('ice'); }

  function goalGot(g) {
    switch (g.kind) {
      case 'bead': return poppedByType[g.type] || 0;
      case 'score': return score;
      case 'combo': return maxCombo;
      case 'bomb': return bombsPopped;
      case 'ice': return iceBroken;
    }
    return 0;
  }
  function goalText(g) {
    if (g.kind === 'score') return fmt(Math.min(g.got, g.need)) + '/' + fmt(g.need);
    return Math.min(g.got, g.need) + '/' + g.need;
  }
  function goalIcon(g) {
    if (g.kind === 'bead') return '<img class="goal-ico" src="./chars/bead-' + g.type + '.webp" alt="" width="16" height="16">';
    if (g.kind === 'bomb') return '<img class="goal-ico" src="./chars/bomb.webp" alt="" width="16" height="16">';
    if (g.kind === 'ice') return '<i class="goal-glyph ice">❄</i>';
    if (g.kind === 'score') return '<i class="goal-glyph star">★</i>';
    return '<i class="goal-glyph combo">×</i>';
  }
  function buildGoalChips(container, list) {
    if (!container) return;
    container.innerHTML = '';
    for (var i = 0; i < list.length; i++) {
      var g = list[i];
      var el = document.createElement('span');
      el.className = 'goal';
      el.innerHTML = goalIcon(g) + '<b>0/' + g.need + '</b>';
      container.appendChild(el);
      g.el = el;
      g.valEl = el.querySelector('b');
      g._shown = -1;
    }
  }
  function paintGoalChips() {
    for (var i = 0; i < goals.length; i++) {
      var g = goals[i];
      if (!g.el) continue;
      g.got = goalGot(g);
      if (g.valEl) g.valEl.textContent = goalText(g);
      var done = g.got >= g.need;
      if (done) g.el.classList.add('done');
      if (g._shown >= 0 && g.got > g._shown && !done) {
        g.el.classList.remove('hit');
        void g.el.offsetWidth;
        g.el.classList.add('hit');
      }
      g._shown = g.got;
    }
  }
  function allGoalsDone() {
    if (!goals.length) return false;
    for (var i = 0; i < goals.length; i++) {
      goals[i].got = goalGot(goals[i]);
      if (goals[i].got < goals[i].need) return false;
    }
    return true;
  }
  function refreshGoals() {
    if (MODE !== 'stage') return;
    paintGoalChips();
    if (state === 'play' && !finishing && allGoalsDone()) {
      finishing = true;
      finishDelay = 0.55;
      for (var i = 0; i < 26; i++) confetti();
    }
  }

  function starPreview() {
    var frac = timeLimit > 0 ? timeLeft / timeLimit : 0;
    return frac >= 0.45 ? 3 : frac >= 0.22 ? 2 : 1;
  }
  function paintStars(el, n, animate) {
    if (!el) return;
    var kids = el.children;
    for (var i = 0; i < kids.length; i++) {
      kids[i].classList.toggle('on', i < n);
      kids[i].classList.remove('pop');
      if (animate && i < n) {
        (function (k, node) {
          node.style.animationDelay = (k * 0.16) + 's';
          void node.offsetWidth;
          node.classList.add('pop');
        })(i, kids[i]);
      }
    }
  }
  function paintStarGauge() { paintStars(starGauge, starPreview(), false); }

  /* =========================================================
     14. 화면 갱신
     ========================================================= */
  function updateScoreUI() {
    scoreEl.textContent = fmt(score);
    if (bestEl) bestEl.textContent = fmt(best);
  }
  function updateCoinUI() {
    var v = fmt(coinBalance);
    if (coinValEl) coinValEl.textContent = v;
    if (introCoin) introCoin.textContent = v;
    paintBoosters();
  }

  function updateTimerUI() {
    var sec = Math.ceil(timeLeft);
    if (sec === lastSec) return;
    lastSec = sec;
    timeLeftEl.textContent = sec;
    timeRing.style.setProperty('--p', clamp((timeLeft / timeLimit) * 100, 0, 100).toFixed(1));
    timeRing.classList.toggle('low', timeLeft <= 10);
    if (MODE === 'stage' && state === 'play' && !finishing) paintStarGauge();
    if (timeLeft <= 5 && sec > 0) {
      timeRing.classList.remove('tick');
      void timeRing.offsetWidth;
      timeRing.classList.add('tick');
      sfxTick();
    }
  }

  function updateFeverUI() {
    feverFill.style.width = clamp(feverGauge, 0, 100).toFixed(1) + '%';
    feverBar.classList.toggle('on', feverLeft > 0);
  }

  function paintBoosters() {
    if (boostBombBtn) {
      var needB = 50;
      boostBombBtn.setAttribute('aria-pressed', boostBomb ? 'true' : 'false');
      boostBombBtn.classList.toggle('off', !boostBomb && coinBalance < needB);
    }
    if (boostTimeBtn) {
      var needT = 40;
      boostTimeBtn.setAttribute('aria-pressed', boostTime ? 'true' : 'false');
      boostTimeBtn.classList.toggle('off', !boostTime && coinBalance < needT);
    }
  }

  function paintModeTabs() {
    if (!modeTabs) return;
    var tabs = modeTabs.querySelectorAll('.mode-tab');
    for (var i = 0; i < tabs.length; i++) {
      var on = tabs[i].getAttribute('data-mode') === MODE;
      tabs[i].classList.toggle('on', on);
      tabs[i].setAttribute('aria-selected', on ? 'true' : 'false');
    }
    if (stageCard) stageCard.hidden = MODE !== 'stage';
    if (sandboxCard) sandboxCard.hidden = MODE !== 'sandbox';
    if (goalBar) goalBar.hidden = MODE !== 'stage';
    if (bestStat) bestStat.hidden = MODE === 'stage';
  }

  function paintIntroStage() {
    var def = stageDef(stageNo);
    if (stageNumEl) stageNumEl.textContent = stageNo;
    if (introStageNum) introStageNum.textContent = stageNo;
    if (introGoals) {
      var tmp = def.goals.map(function (g) { return { kind: g.kind, type: g.type, need: g.need }; });
      buildGoalChips(introGoals, tmp);
      for (var i = 0; i < tmp.length; i++) {
        tmp[i].el.classList.add('readonly');
        tmp[i].valEl.textContent = '0/' + (tmp[i].kind === 'score' ? fmt(tmp[i].need) : tmp[i].need);
      }
    }
    if (introStars) {
      var s = starsOf[stageNo] || 0;
      introStars.hidden = s <= 0;
      var kids = introStars.querySelectorAll('i');
      for (var k = 0; k < kids.length; k++) kids[k].classList.toggle('on', k < s);
    }
    if (starGauge) paintStars(starGauge, 3, false);
    paintBoosters();
  }

  function paintAlbum() {
    if (!albumModal) return;
    if (albumCoinsEl) albumCoinsEl.textContent = fmt(coinBalance);
    var totalStars = 0;
    for (var k in starsOf) totalStars += starsOf[k] || 0;
    if (albumStarsEl) albumStarsEl.textContent = fmt(totalStars);
    if (albumClearedEl) albumClearedEl.textContent = String(clearedCount());

    if (badgeGrid) {
      var html = '';
      for (var i = 0; i < BADGES.length; i++) {
        var b = BADGES[i];
        var got = !!badgeSet[b.id];
        html += '<div class="badge' + (got ? ' got' : '') + '">' +
          '<span class="badge-ico"><img src="' + b.img + '" alt="" width="34" height="34"></span>' +
          '<span class="badge-name">' + (got ? t(b.key) : t('locked')) + '</span>' +
          '<span class="badge-stage">' + t('stageWord') + ' ' + b.stage + '</span>' +
          '</div>';
      }
      badgeGrid.innerHTML = html;
    }

    if (stageGrid) {
      var top = Math.max(maxStage, 1);
      var out = '';
      for (var n = 1; n <= top; n++) {
        var st = starsOf[n] || 0;
        var cls = n === stageNo ? 'stage-cell cur' : 'stage-cell';
        out += '<button type="button" class="' + cls + '" data-stage="' + n + '">' +
          '<b>' + n + '</b><span class="cell-stars">' + starText(st) + '</span></button>';
      }
      out += '<div class="stage-cell next"><b>' + (top + 1) + '</b><span class="cell-stars">' + t('locked') + '</span></div>';
      stageGrid.innerHTML = out;
      stageGrid.onclick = function (ev) {
        var el = ev.target;
        while (el && el !== stageGrid && !(el.getAttribute && el.getAttribute('data-stage'))) el = el.parentNode;
        if (!el || el === stageGrid) return;
        var n = parseInt(el.getAttribute('data-stage'), 10);
        if (!n || isNaN(n)) return;
        stageNo = n;
        MODE = 'stage';
        closeAlbum();
        sfxClick();
        showIntro();
      };
    }
  }
  function starText(n) {
    var s = '';
    for (var i = 0; i < 3; i++) s += i < n ? '★' : '☆';
    return s;
  }

  function repaintAfterLang() {
    if (goalList) paintGoalChips();
    if (introPanel && !introPanel.hidden) paintIntroStage();
    if (albumModal && !albumModal.hidden) paintAlbum();
    if (clearPanel && !clearPanel.hidden) paintClearPanel();
    if (failPanel && !failPanel.hidden) paintFailPanel();
  }

  /* =========================================================
     15. 게임 흐름
     ========================================================= */
  function resetRound() {
    score = 0; combo = 0; comboT = 0; maxCombo = 1; maxChain = 0; poppedTotal = 0;
    feverGauge = 0; feverLeft = 0; lastSec = -1;
    pending = 0; spawnTimer = 0;
    iceBroken = 0; bombsPopped = 0;
    poppedByType = [0, 0, 0, 0, 0];
    finishing = false; finishDelay = 0;
    acc = 0;
    starsWon = 0; coinsWon = 0; bonusWon = 0; appearedBadge = null;
    chain = []; chainType = -1; dragging = false;
    hideCombo();
    feverBar.classList.remove('on');
    scoreEl.textContent = '0';
    updateFeverUI();
  }

  function startStage(num) {
    if (!ready) return;
    MODE = 'stage';
    if (num) stageNo = num;
    var def = stageDef(stageNo);
    resetRound();
    timeLimit = def.time + (boostTime ? 10 : 0);
    timeLeft = timeLimit;
    goals = def.goals.map(function (g) {
      return { kind: g.kind, type: (g.type == null ? -1 : g.type), need: g.need };
    });
    buildGoalChips(goalList, goals);
    paintGoalChips();
    fillBoard();
    if (hasIceGoal()) seedIce();
    for (var i = 0; i < beads.length; i++) beads[i].scale = rnd(0.3, 0.55);
    if (boostBomb) dropBomb(W * 0.5);
    boostBomb = false; boostTime = false;

    stageNumEl.textContent = stageNo;
    paintStarGauge();
    paintModeTabs();
    updateCoinUI();
    updateTimerUI();
    state = 'play';
    paused = false;
    overlay.hidden = true;
    setPanel(null);
    sfxStart();
  }

  function startSandbox() {
    if (!ready) return;
    MODE = 'sandbox';
    resetRound();
    goals = [];
    timeLimit = 60;
    timeLeft = 60;
    paintModeTabs();
    fillBoard();
    for (var i = 0; i < beads.length; i++) beads[i].scale = rnd(0.3, 0.55);
    updateTimerUI();
    state = 'play';
    paused = false;
    overlay.hidden = true;
    setPanel(null);
    sfxStart();
  }

  function setPanel(which) {
    if (introPanel) introPanel.hidden = which !== 'intro';
    if (clearPanel) clearPanel.hidden = which !== 'clear';
    if (failPanel) failPanel.hidden = which !== 'fail';
    if (overPanel) overPanel.hidden = which !== 'over';
  }

  function showIntro() {
    state = 'intro';
    finishing = false;
    dragging = false;
    chain = []; chainType = -1;
    overlay.hidden = false;
    setPanel('intro');
    paintModeTabs();
    paintIntroStage();
    updateCoinUI();
    paintStarGauge();
    if (bestIntroEl) bestIntroEl.textContent = fmt(best);
    if (MODE === 'stage') { goalBar.hidden = false; stageNumEl.textContent = stageNo; }
  }

  function finishStage() {
    finishing = false;
    state = 'clear';
    dragging = false;
    chain = []; chainType = -1;

    var frac = timeLimit > 0 ? timeLeft / timeLimit : 0;
    starsWon = frac >= 0.45 ? 3 : frac >= 0.22 ? 2 : 1;
    bonusWon = Math.round(timeLeft * 12);
    score += bonusWon;

    var prev = starsOf[stageNo] || 0;
    var firstClear = prev <= 0;
    coinsWon = firstClear ? (40 + starsWon * 20 + 30) : (15 + starsWon * 8);

    if (starsWon > prev) { starsOf[stageNo] = starsWon; saveStars(); }
    coinBalance += coinsWon;
    saveCoins();
    if (stageNo + 1 > maxStage) { maxStage = stageNo + 1; saveStage(); }

    appearedBadge = null;
    var bd = badgeForStage(stageNo);
    if (bd && !badgeSet[bd.id]) { badgeSet[bd.id] = 1; saveBadges(); appearedBadge = bd; }

    paintStarGauge();
    paintClearPanel();
    overlay.hidden = false;
    setPanel('clear');
    updateScoreUI();
    updateCoinUI();
    sfxClear();
    for (var i = 0; i < 46; i++) confetti();
    flash = Math.max(flash, 0.4);
    pushPop(t('popClear'), W / 2, H * 0.4, '#E22F76', 26);
  }

  function paintClearPanel() {
    if (clearStageEl) clearStageEl.textContent = t('stageWord') + ' ' + stageNo;
    if (clearScoreEl) clearScoreEl.textContent = fmt(score);
    if (clearStarsEl) paintStars(clearStarsEl, starsWon, true);
    if (clearCoinsEl) clearCoinsEl.textContent = '+' + fmt(coinsWon);
    if (clearBonusEl) clearBonusEl.textContent = '+' + fmt(bonusWon);
    if (clearBadgeEl) {
      if (appearedBadge) {
        clearBadgeEl.hidden = false;
        if (clearBadgeImg) clearBadgeImg.src = appearedBadge.img;
        if (clearBadgeName) clearBadgeName.textContent = t(appearedBadge.key);
      } else {
        clearBadgeEl.hidden = true;
      }
    }
  }

  function failStage() {
    state = 'fail';
    dragging = false;
    chain = []; chainType = -1;
    timeLeft = 0;
    feverLeft = 0;
    feverGauge = 0;
    updateTimerUI();
    updateFeverUI();
    paintFailPanel();
    overlay.hidden = false;
    setPanel('fail');
    sfxOver();
  }

  function paintFailPanel() {
    if (failStageEl) failStageEl.textContent = t('stageWord') + ' ' + stageNo;
    if (failScoreEl) failScoreEl.textContent = fmt(score);
    if (failGoals) {
      var tmp = goals.map(function (g) { return { kind: g.kind, type: g.type, need: g.need }; });
      buildGoalChips(failGoals, tmp);
      for (var i = 0; i < tmp.length; i++) {
        var g = goals[i];
        var got = Math.min(got_now(g), g.need);
        tmp[i].el.classList.add('readonly');
        tmp[i].valEl.textContent = (tmp[i].kind === 'score' ? fmt(got) : got) + '/' + (tmp[i].kind === 'score' ? fmt(tmp[i].need) : tmp[i].need);
        if (got >= tmp[i].need) tmp[i].el.classList.add('done');
      }
    }
  }
  function got_now(g) {
    switch (g.kind) {
      case 'bead': return poppedByType[g.type] || 0;
      case 'score': return score;
      case 'combo': return maxCombo;
      case 'bomb': return bombsPopped;
      case 'ice': return iceBroken;
    }
    return 0;
  }

  function endSandbox() {
    state = 'fail';
    dragging = false;
    chain = []; chainType = -1;
    timeLeft = 0;
    feverLeft = 0;
    feverGauge = 0;
    updateTimerUI();
    updateFeverUI();

    var isRecord = score > best && score > 0;
    if (score > best) {
      best = score;
      store(BEST_KEY, String(best));
    }
    finalScoreEl.textContent = fmt(score);
    recordLine.hidden = !isRecord;
    stCombo.textContent = '×' + Math.max(1, maxCombo);
    stChain.textContent = String(maxChain);
    stPopped.textContent = fmt(poppedTotal);
    bestEl.textContent = fmt(best);
    bestIntroEl.textContent = fmt(best);
    overlay.hidden = false;
    setPanel('over');
    sfxOver();
  }

  /* 버튼 */
  if (startBtn) startBtn.addEventListener('click', function () {
    if (MODE === 'stage') startStage(stageNo); else startSandbox();
  });
  if (againBtn) againBtn.addEventListener('click', startSandbox);
  if (nextBtn) nextBtn.addEventListener('click', function () {
    var n = stageNo + 1;
    if (n > maxStage) { maxStage = n; saveStage(); }
    startStage(n);
  });
  if (retryClearBtn) retryClearBtn.addEventListener('click', function () { startStage(stageNo); });
  if (retryBtn) retryBtn.addEventListener('click', function () { startStage(stageNo); });

  if (modeTabs) modeTabs.addEventListener('click', function (ev) {
    var el = ev.target;
    while (el && el !== modeTabs && !(el.getAttribute && el.getAttribute('data-mode'))) el = el.parentNode;
    if (!el || el === modeTabs) return;
    var m = el.getAttribute('data-mode');
    if (m === MODE) return;
    if (MODE === 'stage') refundBoosters();
    MODE = m === 'sandbox' ? 'sandbox' : 'stage';
    sfxClick();
    paintModeTabs();
    if (MODE === 'stage') paintIntroStage();
  });

  function refundBoosters() {
    if (boostBomb) { coinBalance += 50; boostBomb = false; }
    if (boostTime) { coinBalance += 40; boostTime = false; }
    saveCoins();
    updateCoinUI();
  }

  function toggleBoost(kind) {
    if (state !== 'intro' || MODE !== 'stage') return;
    var cost = kind === 'bomb' ? 50 : 40;
    var flag = kind === 'bomb' ? boostBomb : boostTime;
    if (!flag && coinBalance < cost) { sfxNo(); toastNotEnough(); return; }
    if (flag) {
      coinBalance += cost;
      if (kind === 'bomb') boostBomb = false; else boostTime = false;
    } else {
      coinBalance -= cost;
      if (kind === 'bomb') boostBomb = true; else boostTime = true;
    }
    saveCoins();
    updateCoinUI();
    sfxClick();
  }
  if (boostBombBtn) boostBombBtn.addEventListener('click', function () { toggleBoost('bomb'); });
  if (boostTimeBtn) boostTimeBtn.addEventListener('click', function () { toggleBoost('time'); });

  function sfxNo() { tone(220, 0.14, 'square', 0.06, 160); vibe(20); }
  function toastNotEnough() {
    pushPop(t('notEnough'), W / 2, H * 0.45, '#B0446E', 22);
  }

  /* 도감 */
  function openAlbum() {
    if (!albumModal) return;
    albumOpen = true;
    dragging = false;
    chain = []; chainType = -1;
    paintAlbum();
    albumModal.hidden = false;
    if (albumCloseBtn) albumCloseBtn.focus({ preventScroll: true });
    sfxClick();
  }
  function closeAlbum() {
    albumOpen = false;
    if (albumModal) albumModal.hidden = true;
  }
  if (albumBtn) albumBtn.addEventListener('click', function (ev) { ev.preventDefault(); openAlbum(); });
  if (albumCloseBtn) albumCloseBtn.addEventListener('click', closeAlbum);
  if (albumModal) albumModal.addEventListener('click', function (ev) {
    if (ev.target === albumModal) closeAlbum();
  });

  window.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') {
      if (albumOpen) { closeAlbum(); return; }
      if (!langMenu || langMenu.hidden) closeMenu();
    }
    if (ev.code === 'Space' || ev.key === ' ') {
      if (albumOpen) return;
      if (state === 'play') { ev.preventDefault(); shuffle(); }
      else if (state === 'intro') { ev.preventDefault(); if (MODE === 'stage') startStage(stageNo); else startSandbox(); }
      else if (state === 'clear') { ev.preventDefault(); var nn = stageNo + 1; if (nn > maxStage) { maxStage = nn; saveStage(); } startStage(nn); }
      else if (state === 'fail') { ev.preventDefault(); if (MODE === 'stage') startStage(stageNo); else startSandbox(); }
    }
  });

  document.addEventListener('visibilitychange', function () {
    paused = document.hidden && state === 'play';
    if (!paused) lastFrame = 0;
  });

  /* =========================================================
     16. 매 프레임
     ========================================================= */
  function update(dt) {
    var i;

    if (!paused) {
      acc += dt;
      var fixed = 1 / 120, guard = 0;
      while (acc >= fixed && guard < 8) {
        stepPhysics(fixed);
        acc -= fixed;
        guard++;
      }
      if (guard >= 8) acc = 0;
    }

    if (state === 'play' && !paused && !albumOpen) {
      if (finishing) {
        finishDelay -= dt;
        if (finishDelay <= 0) finishStage();
      } else {
        timeLeft -= dt;
        updateTimerUI();
        if (timeLeft <= 0) {
          timeLeft = 0;
          if (MODE === 'stage') failStage(); else endSandbox();
        } else {
          if (combo > 0) {
            comboT -= dt;
            if (comboT <= 0) { combo = 0; hideCombo(); }
          }
          if (feverLeft > 0) {
            feverLeft -= dt;
            feverGauge = clamp(100 * (feverLeft / FEVER_DUR), 0, 100);
            if (feverLeft <= 0) { feverLeft = 0; feverGauge = 0; }
            updateFeverUI();
          }
          processSpawns(dt);
        }
      }

      for (i = boomQueue.length - 1; i >= 0; i--) {
        boomQueue[i].t -= dt;
        if (boomQueue[i].t <= 0) {
          var bb = boomQueue[i].b;
          boomQueue.splice(i, 1);
          if (beads.indexOf(bb) >= 0) doExplode(bb);
        }
      }
    }

    for (i = 0; i < beads.length; i++) {
      var b = beads[i];
      if (b.scale < 1) b.scale = Math.min(1, b.scale + dt * 4.2);
      if (b.flash > 0) b.flash = Math.max(0, b.flash - dt * 2.2);
      if (b.crack > 0) b.crack = Math.max(0, b.crack - dt * 2.4);
    }
    for (i = ghosts.length - 1; i >= 0; i--) {
      ghosts[i].t += dt;
      if (ghosts[i].t > ghosts[i].dur + ghosts[i].delay) ghosts.splice(i, 1);
    }
    for (i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.t += dt;
      if (p.t >= p.dur) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (i = texts.length - 1; i >= 0; i--) {
      texts[i].t += dt;
      if (texts[i].t >= texts[i].dur) texts.splice(i, 1);
    }
    for (i = waves.length - 1; i >= 0; i--) {
      waves[i].t += dt;
      if (waves[i].t >= waves[i].dur) waves.splice(i, 1);
    }
    if (shakeT > 0) { shakeT = Math.max(0, shakeT - dt); if (shakeT === 0) shakeMag = 0; }
    if (flash > 0) flash = Math.max(0, flash - dt * 2.6);
  }

  function drawBeadSprite(cache, x, y, scale) {
    if (!cache) return;
    var w = cache.css * scale;
    ctx.drawImage(cache.cv, x - w / 2, y - w / 2, w, w);
  }

  function drawBombRing(b, now) {
    var ph = now / 220;
    ctx.save();
    ctx.globalAlpha = 0.72 + 0.28 * Math.sin(ph);
    ctx.strokeStyle = '#FFD033';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 1.02, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = '#FFF3C4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * (1.16 + 0.05 * Math.sin(ph * 1.3)), 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  /* 얼음 결계 — 반투명 서리 + 두꺼운 테두리 + 금 간 선 */
  function drawIce(b, now) {
    var r = b.r * 1.03;
    var gl = ctx.createRadialGradient(b.x - r * 0.35, b.y - r * 0.4, r * 0.1, b.x, b.y, r);
    gl.addColorStop(0, 'rgba(255,255,255,.60)');
    gl.addColorStop(0.55, 'rgba(206,240,255,.34)');
    gl.addColorStop(0.9, 'rgba(140,210,255,.42)');
    gl.addColorStop(1, 'rgba(108,192,246,.58)');
    ctx.save();
    ctx.beginPath();
    ctx.arc(b.x, b.y, r, 0, TAU);
    ctx.fillStyle = gl;
    ctx.fill();

    ctx.lineWidth = 2.6;
    ctx.strokeStyle = 'rgba(255,255,255,.92)';
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(90,178,238,.95)';
    ctx.beginPath();
    ctx.arc(b.x, b.y, r * 0.99, 0, TAU);
    ctx.stroke();

    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = 'rgba(255,255,255,.95)';
    ctx.lineWidth = 1.35;
    ctx.beginPath();
    ctx.moveTo(b.x - r * 0.55, b.y - r * 0.18);
    ctx.lineTo(b.x - r * 0.1, b.y - r * 0.05);
    ctx.lineTo(b.x + r * 0.16, b.y + r * 0.3);
    ctx.moveTo(b.x + r * 0.1, b.y - r * 0.62);
    ctx.lineTo(b.x + r * 0.24, b.y - r * 0.12);
    ctx.stroke();

    var tw = 0.55 + 0.45 * Math.sin(now / 260 + b.id);
    ctx.globalAlpha = 0.55 * tw;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(b.x + r * 0.42, b.y - r * 0.5, 2.1, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawStar(x, y, r, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x + r * 0.22, y - r * 0.22, x + r, y);
    ctx.quadraticCurveTo(x + r * 0.22, y + r * 0.22, x, y + r);
    ctx.quadraticCurveTo(x - r * 0.22, y + r * 0.22, x - r, y);
    ctx.quadraticCurveTo(x - r * 0.22, y - r * 0.22, x, y - r);
    ctx.fill();
    ctx.restore();
  }

  function render(now) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var sx = 0, sy = 0, rot = 0;
    if (shakeT > 0) {
      var k = Math.min(1, shakeT * 5);
      sx = rnd(-1, 1) * shakeMag * k * 0.55;
      sy = rnd(-1, 1) * shakeMag * k * 0.55;
      rot = rnd(-1, 1) * shakeMag * k * 0.0007;
    }
    ctx.save();
    ctx.translate(W / 2 + sx, H / 2 + sy);
    ctx.rotate(rot);
    ctx.translate(-W / 2, -H / 2);

    ctx.drawImage(boardCv, 0, 0, W, H);

    if (feverLeft > 0) {
      var fg = ctx.createRadialGradient(W / 2, H * 0.42, 10, W / 2, H * 0.5, Math.max(W, H) * 0.85);
      fg.addColorStop(0, 'rgba(255,214,120,' + (0.13 + 0.05 * Math.sin(now / 150)) + ')');
      fg.addColorStop(0.65, 'rgba(255,150,90,.05)');
      fg.addColorStop(1, 'rgba(255,110,170,.02)');
      ctx.fillStyle = fg;
      ctx.fillRect(0, 0, W, H);
    }

    var inChain = {};
    var i;
    for (i = 0; i < chain.length; i++) inChain[chain[i].id] = i + 1;

    for (i = 0; i < beads.length; i++) {
      var b = beads[i];
      if (b.y < -b.r * 2.4) continue;
      var s = b.scale;
      var ci = inChain[b.id];
      if (ci) s *= 1.1;
      drawBeadSprite(b.bomb ? beadCache.bomb : beadCache[b.type], b.x, b.y, s);
      if (b.flash > 0) {
        ctx.save();
        ctx.globalAlpha = b.flash * 0.8;
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * 1.05, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
      if (b.ice) drawIce(b, now);
      if (b.bomb) drawBombRing(b, now);
    }

    for (i = 0; i < ghosts.length; i++) {
      var g = ghosts[i];
      var kk = clamp((g.t - g.delay) / g.dur, 0, 1);
      if (kk <= 0) continue;
      var tp = TYPES[g.type] || TYPES[0];
      ctx.save();
      ctx.globalAlpha = (1 - kk) * 0.95;
      drawBeadSprite(g.bomb ? beadCache.bomb : beadCache[g.type], g.x, g.y, 1 + kk * 0.62);
      ctx.globalAlpha = (1 - kk) * 0.7;
      ctx.strokeStyle = tp.color;
      ctx.lineWidth = 3 * (1 - kk) + 1;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r * (1 + kk * 1.2), 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    for (i = 0; i < waves.length; i++) {
      var wv = waves[i];
      var wk = wv.t / wv.dur;
      ctx.save();
      ctx.globalAlpha = (1 - wk) * 0.85;
      ctx.strokeStyle = wv.color;
      ctx.lineWidth = 9 * (1 - wk) + 1;
      ctx.beginPath();
      ctx.arc(wv.x, wv.y, wv.r + (wv.r1 - wv.r) * wk, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    if (chain.length) {
      var ct = TYPES[chainType] || TYPES[0];
      if (chain.length > 1) {
        var pulse = 0.5 + 0.18 * Math.sin(now / 140);
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(chain[0].x, chain[0].y);
        for (i = 1; i < chain.length; i++) ctx.lineTo(chain[i].x, chain[i].y);
        ctx.shadowColor = ct.color;
        ctx.shadowBlur = 24;
        ctx.strokeStyle = hexA(ct.color, pulse);
        ctx.lineWidth = R * 0.54;
        ctx.stroke();
        ctx.shadowBlur = 10;
        ctx.strokeStyle = 'rgba(255,255,255,.96)';
        ctx.lineWidth = R * 0.3;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = ct.color;
        ctx.lineWidth = R * 0.1;
        ctx.stroke();
        ctx.restore();
      }
      for (i = 0; i < chain.length; i++) {
        var cb = chain[i];
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,.98)';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = ct.color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(cb.x, cb.y, cb.r * 0.99, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }

      if (chain.length >= 2) {
        var lastB = chain[chain.length - 1];
        var bx = lastB.x, by = lastB.y - lastB.r * 1.35;
        ctx.save();
        ctx.fillStyle = ct.color;
        ctx.shadowColor = 'rgba(255,255,255,.9)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(bx, by, 12, 0, TAU);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = '900 14px ' + FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(chain.length), bx, by + 0.5);
        ctx.restore();
      }
    }

    for (i = 0; i < parts.length; i++) {
      var pt = parts[i];
      var pk = 1 - pt.t / pt.dur;
      if (pt.star) { drawStar(pt.x, pt.y, pt.r * pk * 1.7, pt.color, pk); continue; }
      ctx.globalAlpha = pk;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r * pk, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (i = 0; i < texts.length; i++) {
      var tx = texts[i];
      var tk = tx.t / tx.dur;
      var alpha = tk < 0.12 ? tk / 0.12 : 1 - Math.max(0, (tk - 0.62) / 0.38);
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.font = '900 ' + tx.size + 'px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (tx.pop) {
        var sc = 1 - Math.exp(-tk * 16) * Math.cos(tk * 20);
        sc = Math.max(0.06, sc);
        ctx.translate(tx.x, tx.y - 10 * tk);
        ctx.scale(sc, sc);
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'rgba(255,255,255,.95)';
        ctx.strokeText(tx.text, 0, 0);
        ctx.fillStyle = tx.color;
        ctx.fillText(tx.text, 0, 0);
      } else {
        var rise = 26 * tk;
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(255,255,255,.9)';
        ctx.strokeText(tx.text, tx.x, tx.y - rise);
        ctx.fillStyle = tx.color;
        ctx.fillText(tx.text, tx.x, tx.y - rise);
      }
      ctx.restore();
    }

    if (flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.6, flash * 0.55) + ')';
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
  }

  function frame(ts) {
    requestAnimationFrame(frame);
    if (!lastFrame) lastFrame = ts;
    var dt = Math.min(0.05, Math.max(0, (ts - lastFrame) / 1000));
    lastFrame = ts;
    update(dt);
    render(ts);
  }

  /* =========================================================
     17. 시작
     ========================================================= */
  function onImagesReady() {
    ready = true;
    buildSprites();
    fillBoard();
    if (bestIntroEl) bestIntroEl.textContent = fmt(best);
    paintIntroStage();
    paintStarGauge();
  }

  function loadImages() {
    var list = [], i;
    for (i = 0; i < TYPES.length; i++) {
      var im = new Image();
      im.src = TYPES[i].file;
      list.push(im);
    }
    beadImgs = list;
    bombImg.src = 'chars/bomb.webp';
    var all = list.concat([bombImg]);
    var left2 = 0;
    function done() {
      if (left2 > 0 && --left2 === 0) onImagesReady();
    }
    for (i = 0; i < all.length; i++) {
      if (all[i].complete && all[i].naturalWidth) continue;
      left2++;
      all[i].addEventListener('load', done);
      all[i].addEventListener('error', done);
    }
    if (left2 === 0) { onImagesReady(); return; }
    setTimeout(function () {
      if (!ready) onImagesReady();
    }, 1200);
  }

  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resize();
      if (state === 'intro') fillBoard();
    }, 120);
  });
  window.addEventListener('orientationchange', function () {
    setTimeout(function () { resize(); if (state === 'intro') fillBoard(); }, 260);
  });

  buildLangMenu();
  applyLang(LANG);
  paintSound();
  resize();
  timeLimit = 60;
  timeLeft = 60;
  updateTimerUI();
  updateScoreUI();
  if (bestIntroEl) bestIntroEl.textContent = fmt(best);
  paintModeTabs();
  paintIntroStage();
  updateCoinUI();
  requestAnimationFrame(frame);

  /* =========================================================
     18. QA(검수용) — ?qa=1 일 때만 열린다
     ========================================================= */
  if (/[?&]qa=1/.test(location.search)) {
    window.addEventListener('error', function (ev) {
      if (window.__KOMI_QA) window.__KOMI_QA.errors.push(String(ev.message || ev.error));
    });
    window.__KOMI_QA = {
      errors: [],
      info: function () {
        return {
          state: state, mode: MODE, stage: stageNo, maxStage: maxStage,
          score: score, combo: combo, maxCombo: maxCombo, maxChain: maxChain,
          popped: poppedTotal, time: timeLeft, timeLimit: timeLimit,
          fever: feverLeft, gauge: feverGauge,
          beads: beads.length, pending: pending, R: R, W: W, H: H, chain: chain.length,
          goals: goals.map(function (g) { return { kind: g.kind, need: g.need, got: goalGot(g) }; }),
          ice: iceBroken, iceOnBoard: iceOnBoard(), bombs: bombsPopped,
          coins: coinBalance, starsWon: starsWon, coinsWon: coinsWon,
          starsOf: starsOf, badges: Object.keys(badgeSet),
          finishing: finishing, albumOpen: albumOpen,
          panels: {
            intro: !introPanel.hidden, clear: !clearPanel.hidden,
            fail: !failPanel.hidden, over: !overPanel.hidden, album: albumModal ? !albumModal.hidden : false
          },
          ev: qaEv
        };
      },
      beads: function () {
        return beads.map(function (b) { return { x: b.x, y: b.y, r: b.r, type: b.type, bomb: b.bomb, ice: b.ice }; });
      },
      drag: function (pts) {
        if (!pts || !pts.length) return null;
        var b = beadAt(pts[0][0], pts[0][1], 1.06);
        if (!b || b.bomb) return null;
        chain = [b]; chainType = b.type; dragging = true;
        dragLast = { x: pts[0][0], y: pts[0][1] };
        for (var i = 1; i < pts.length; i++) {
          extendPath(dragLast.x, dragLast.y, pts[i][0], pts[i][1]);
          dragLast = { x: pts[i][0], y: pts[i][1] };
        }
        var len = chain.length;
        dragging = false;
        commitChain();
        return { len: len };
      },
      dragType: function (type, maxN) {
        var list = [];
        for (var i = 0; i < beads.length; i++) if (beads[i].type === type && !beads[i].bomb) list.push(beads[i]);
        if (list.length < 3) return null;
        var path = [];
        var cur = list[0];
        path.push([cur.x, cur.y]);
        var used = [cur];
        for (var step = 0; step < (maxN || 8); step++) {
          var next = null, bd = 1e9;
          for (var j = 0; j < list.length; j++) {
            var cand = list[j];
            if (used.indexOf(cand) >= 0) continue;
            var d = Math.hypot(cand.x - cur.x, cand.y - cur.y);
            if (d < bd && d < cur.r * 2.4) { bd = d; next = cand; }
          }
          if (!next) break;
          used.push(next);
          path.push([next.x, next.y]);
          cur = next;
        }
        return this.drag(path);
      },
      tapBomb: function () {
        for (var i = 0; i < beads.length; i++) {
          if (beads[i].bomb) {
            beads[i].exploded = true;
            boomQueue.push({ b: beads[i], t: 0 });
            return true;
          }
        }
        return false;
      },
      start: function (n) { startStage(n || stageNo); },
      sandbox: startSandbox,
      intro: showIntro,
      next: function () { var n = stageNo + 1; if (n > maxStage) { maxStage = n; saveStage(); } startStage(n); },
      retry: function () { startStage(stageNo); },
      album: openAlbum,
      closeAlbum: closeAlbum,
      tick: function (sec) { timeLeft = sec; updateTimerUI(); },
      addFever: function (v) { addFever(v); },
      setGoals: function (arr) {
        goals = arr.map(function (g) { return { kind: g.kind, type: g.type == null ? -1 : g.type, need: g.need }; });
        buildGoalChips(goalList, goals);
      },
      grant: function (n) { coinBalance += n; saveCoins(); updateCoinUI(); },
      seedIce: seedIce,
      lastSend: function () { return lastHint; }
    };
  }

})();
