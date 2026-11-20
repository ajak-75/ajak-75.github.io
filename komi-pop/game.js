/* KOMI & MOMO POP — 한붓그리기 팡!
   60초 타임어택 라인 링크 퍼즐. 필드에 물리로 쌓인 코미·모모 구슬을 같은 종류 3개 이상
   한붓으로 이어 터뜨린다. 7개 이상이면 황금 폭탄, 게이지를 채우면 피버 타임.
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
    if (cv) cv.setAttribute('aria-label', t('board'));
    if (langCur) langCur.textContent = NATIVE[LANG] || LANG;
    if (langBtn) langBtn.setAttribute('aria-label', t('lang'));
    syncMenu();
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
     2. 소리 (Web Audio 합성 — 외부 파일 없음)
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
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.12, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ac.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  }
  function noise(dur, gain, cut, delay) {
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
    f.type = 'lowpass';
    f.frequency.value = cut || 2000;
    var g = ac.createGain();
    g.gain.value = gain || 0.1;
    src.connect(f).connect(g).connect(ac.destination);
    src.start(t0);
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
  }
  function sfxBack() { tone(392, 0.06, 'sine', 0.06, 330); }
  function sfxPop(n) {
    for (var i = 0; i < Math.min(n, 5); i++) {
      var f = 560 * Math.pow(1.08, i);
      tone(f, 0.1, 'triangle', 0.09, f * 1.45, i * 0.024);
    }
    noise(0.16, 0.09, 2400, 0.01);
  }
  function sfxBomb() {
    tone(160, 0.55, 'sawtooth', 0.18, 42);
    tone(96, 0.6, 'sine', 0.16, 38, 0.02);
    noise(0.45, 0.2, 900);
  }
  function sfxBombDrop() {
    tone(660, 0.14, 'triangle', 0.1, 1180);
    tone(880, 0.16, 'sine', 0.09, 1560, 0.08);
  }
  function sfxFever() {
    var notes = [523, 659, 784, 1047, 1319];
    for (var i = 0; i < notes.length; i++) tone(notes[i], 0.3, 'sine', 0.11, null, i * 0.075);
    noise(0.5, 0.06, 4000);
  }
  function sfxShuffle() {
    noise(0.3, 0.12, 1500);
    tone(320, 0.28, 'sine', 0.07, 720);
  }
  function sfxTick() { tone(1080, 0.05, 'square', 0.045); }
  function sfxClick() { tone(620, 0.06, 'sine', 0.07, 760); }
  function sfxStart() {
    tone(523, 0.12, 'sine', 0.09);
    tone(784, 0.16, 'sine', 0.09, null, 0.09);
  }
  function sfxOver() {
    tone(494, 0.22, 'triangle', 0.1, 392);
    tone(392, 0.26, 'triangle', 0.09, 294, 0.16);
    tone(294, 0.4, 'sine', 0.08, 174, 0.34);
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
      if (!muted) sfxClick();
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
  var overPanel = $('overPanel');
  var scoreEl = $('score');
  var bestEl = $('best');
  var bestIntroEl = $('bestIntro');
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

  /* =========================================================
     4. 구슬 종류 · 스프라이트
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
  var ROUND_TIME = 60;
  var FEVER_DUR = 10;

  var beadImgs = [];
  var bombImg = new Image();
  var imgReady = 0;
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

    // 바닥 그림자
    var sg = g.createRadialGradient(cx, cy + r * 0.7, r * 0.05, cx, cy + r * 0.7, r * 1.05);
    sg.addColorStop(0, 'rgba(120,40,80,.30)');
    sg.addColorStop(0.5, 'rgba(120,40,80,.12)');
    sg.addColorStop(1, 'rgba(120,40,80,0)');
    g.fillStyle = sg;
    g.beginPath();
    g.ellipse(cx, cy + r * 0.68, r * 0.96, r * 0.6, 0, 0, TAU);
    g.fill();

    // 종류 색 오라 — 작은 화면에서도 색으로 구분되게
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
    grd.addColorStop(0, '#FFFBFD');
    grd.addColorStop(0.55, '#FFF3F8');
    grd.addColorStop(1, '#FFE9F2');
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
     5. 게임 상태
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

  var state = 'intro';       // intro | play | over
  var paused = false;
  var score = 0, combo = 0, comboT = 0, maxCombo = 1, maxChain = 0, poppedTotal = 0;
  var timeLeft = ROUND_TIME, feverGauge = 0, feverLeft = 0, lastSec = -1;
  var pending = 0, spawnTimer = 0;
  var chain = [], chainType = -1, dragging = false;
  var dragLast = { x: 0, y: 0 };
  var shakeT = 0, shakeMag = 0, flash = 0;
  var acc = 0, lastFrame = 0;

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
    R = clamp(W * 0.084, 18, 31);

    buildBoard();
    if (ready) buildSprites();

    // 경계를 벗어난 구슬 정리
    for (var i = 0; i < beads.length; i++) {
      var b = beads[i];
      b.r = b.bomb ? R * 1.16 : R;
      b.x = clamp(b.x, left + b.r, right - b.r);
      b.y = clamp(b.y, -b.r * 3, floorY - b.r);
    }
  }

  function makeBead(type, x, y, bomb) {
    return {
      id: ++uid, type: type, bomb: !!bomb,
      x: x, y: y, vx: 0, vy: 0,
      r: bomb ? R * 1.16 : R,
      scale: 1, flash: 0
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

    var perRow = Math.max(3, Math.floor((right - left) / (2 * R + 0.5)));
    var idx = 0, row = 0;
    while (idx < MAX_BEADS && row < 40) {
      var y = floorY - R - row * (2 * R * 0.93);
      var off = (row % 2) ? R : 0;
      for (var x = left + R + off; x <= right - R + 0.01 && idx < MAX_BEADS; x += 2 * R + 0.5) {
        beads.push(makeBead(types[idx++], x + rnd(-1.6, 1.6), y + rnd(-1, 1)));
      }
      row++;
    }
    // 조용히 물리 정착 — 자연스럽게 쌓인 모양
    for (var s = 0; s < 170; s++) stepPhysics(1 / 120);
    for (var q = 0; q < beads.length; q++) { beads[q].vx = 0; beads[q].vy = 0; }
  }

  /* =========================================================
     6. 물리
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
     7. 연결(한붓그리기)
     ========================================================= */
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

    // 손가락 아래 후보들을 가까운 순서로
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
    if (state !== 'play' || paused) return;
    ev.preventDefault();
    var p = localPoint(ev);
    var b = beadAt(p.x, p.y, 1.06);
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
  cv.addEventListener('pointerup', function (ev) { ev.preventDefault(); releasePointer(); });
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
    var tp = TYPES[chainType] || TYPES[0];
    var mult = 1 + Math.min(combo, 8) * 0.2;
    var base = n * 10 + Math.max(0, n - 3) * 10;
    var gain = Math.round(base * mult * (feverLeft > 0 ? 2 : 1));

    score += gain;
    poppedTotal += n;
    combo += 1;
    comboT = 3.2;
    if (combo > maxCombo) maxCombo = combo;
    if (n > maxChain) maxChain = n;
    addFever(5 + n * 1.4);

    var cx = 0, cy = 0, i;
    for (i = 0; i < n; i++) { cx += chain[i].x; cy += chain[i].y; }
    cx /= n; cy /= n;

    for (i = 0; i < n; i++) {
      var b = chain[i];
      var idx = beads.indexOf(b);
      if (idx >= 0) beads.splice(idx, 1);
      ghosts.push({ x: b.x, y: b.y, r: b.r, type: b.type, bomb: false, t: 0, dur: 0.34, delay: i * 0.016 });
      burst(b.x, b.y, tp.color, 5);
    }

    texts.push({ x: cx, y: cy - R * 0.4, text: '+' + fmt(gain), t: 0, dur: 0.9, color: tp.color, size: 15 + Math.min(9, n) });
    if (n >= 5) texts.push({ x: cx, y: cy - R * 1.5, text: n + ' CHAIN', t: 0, dur: 0.9, color: '#E22F76', size: 13 });

    sfxPop(n);
    shake(0.16 + Math.min(0.2, n * 0.012), 3 + Math.min(6, n));

    pending = Math.min(14, pending + n);
    spawnTimer = Math.min(spawnTimer, 0.02);

    if (n >= 7) dropBomb(cx);
    if (combo >= 2) pulseCombo();
    else hideCombo();

    chain = [];
    chainType = -1;
    updateScoreUI();
    bumpEl(scoreEl);
  }

  /* =========================================================
     8. 폭탄 · 피버
     ========================================================= */
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
    var rad = R * 3.7;
    var killed = 0;

    for (var i = beads.length - 1; i >= 0; i--) {
      var o = beads[i];
      var d = Math.hypot(o.x - b.x, o.y - b.y);
      if (d > rad) continue;
      beads.splice(i, 1);
      ghosts.push({ x: o.x, y: o.y, r: o.r, type: o.type, bomb: o.bomb, t: 0, dur: 0.34, delay: 0 });
      burst(o.x, o.y, o.bomb ? '#FFD75E' : TYPES[o.type].color, 4);
      killed++;
      if (o.bomb && !o.exploded) {
        o.exploded = true;
        boomQueue.push({ b: o, t: 0.14 });
      }
    }

    var gain = Math.round((20 + killed * 18) * (feverLeft > 0 ? 2 : 1));
    score += gain;
    poppedTotal += killed;
    texts.push({ x: b.x, y: b.y - R, text: '+' + fmt(gain), t: 0, dur: 1, color: '#D98A00', size: 22 });
    waves.push({ x: b.x, y: b.y, r: R, r1: rad * 1.15, t: 0, dur: 0.55, color: '#FFC246' });
    for (var c = 0; c < 26; c++) burst(b.x, b.y, c % 3 ? '#FFD75E' : '#FF8A3D', 1);

    flash = Math.max(flash, 0.85);
    shake(0.5, 13);
    sfxBomb();

    pending = Math.min(20, pending + killed);
    spawnTimer = Math.min(spawnTimer, 0.05);
    updateScoreUI();
    bumpEl(scoreEl);
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
    timeLeft = Math.min(ROUND_TIME + 30, timeLeft + 5);
    feverBar.classList.add('on');
    texts.push({ x: W / 2, y: H * 0.3, text: t('fever').toUpperCase(), t: 0, dur: 1.4, color: '#FF8A00', size: 30, big: true });
    flash = Math.max(flash, 0.55);
    for (var i = 0; i < 36; i++) confetti();
    sfxFever();
    updateTimerUI();
  }

  /* =========================================================
     9. 이펙트
     ========================================================= */
  function burst(x, y, color, n) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * TAU, sp = rnd(70, 280);
      parts.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 50,
        t: 0, dur: rnd(0.4, 0.85), r: rnd(1.8, 4.6), color: color, g: 720
      });
    }
    if (parts.length > 420) parts.splice(0, parts.length - 420);
  }
  function confetti() {
    var tp = TYPES[(Math.random() * TYPES.length) | 0];
    parts.push({
      x: rnd(0, W), y: rnd(-40, H * 0.3),
      vx: rnd(-40, 40), vy: rnd(60, 200),
      t: 0, dur: rnd(1.1, 1.9), r: rnd(2, 4.5), color: tp.color, g: 260
    });
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
     10. 새 구슬 · 섞기
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
    if (state === 'over') return;
    var x = rnd(left + R, right - R);
    var b = makeBead(nextType(), x, -R * 1.3 - rnd(0, 40));
    b.vy = 90;
    b.vx = rnd(-30, 30);
    b.scale = 0.45;
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
    if (state !== 'play' || paused) return;
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
     11. 게임 진행
     ========================================================= */
  function updateScoreUI() {
    scoreEl.textContent = fmt(score);
    bestEl.textContent = fmt(best);
  }

  function updateTimerUI() {
    var sec = Math.ceil(timeLeft);
    if (sec === lastSec) return;
    lastSec = sec;
    timeLeftEl.textContent = sec;
    timeRing.style.setProperty('--p', clamp((timeLeft / ROUND_TIME) * 100, 0, 100).toFixed(1));
    timeRing.classList.toggle('low', timeLeft <= 10);
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

  function startGame() {
    if (!ready) return;
    score = 0; combo = 0; comboT = 0; maxCombo = 1; maxChain = 0; poppedTotal = 0;
    timeLeft = ROUND_TIME; feverGauge = 0; feverLeft = 0; lastSec = -1;
    pending = 0; spawnTimer = 0;
    acc = 0;
    hideCombo();
    feverBar.classList.remove('on');
    fillBoard();
    for (var i = 0; i < beads.length; i++) beads[i].scale = rnd(0.3, 0.55);
    state = 'play';
    paused = false;
    overlay.hidden = true;
    introPanel.hidden = false;
    overPanel.hidden = true;
    scoreEl.textContent = '0';
    bestEl.textContent = fmt(best);
    updateTimerUI();
    updateFeverUI();
    sfxStart();
  }

  function endGame() {
    state = 'over';
    dragging = false;
    chain = [];
    chainType = -1;
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

    introPanel.hidden = true;
    overPanel.hidden = false;
    overlay.hidden = false;
    sfxOver();
  }

  if (startBtn) startBtn.addEventListener('click', startGame);
  if (againBtn) againBtn.addEventListener('click', startGame);

  window.addEventListener('keydown', function (ev) {
    if (ev.code === 'Space' || ev.key === ' ') {
      if (state === 'play') { ev.preventDefault(); shuffle(); }
      else if (!overlay.hidden) { ev.preventDefault(); startGame(); }
    }
  });

  document.addEventListener('visibilitychange', function () {
    paused = document.hidden && state === 'play';
    if (!paused) lastFrame = 0;
  });

  /* =========================================================
     12. 매 프레임
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

    if (state === 'play' && !paused) {
      timeLeft -= dt;
      updateTimerUI();
      if (timeLeft <= 0) { timeLeft = 0; endGame(); }
      else {
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

      for (i = boomQueue.length - 1; i >= 0; i--) {
        boomQueue[i].t -= dt;
        if (boomQueue[i].t <= 0) {
          var bb = boomQueue[i].b;
          boomQueue.splice(i, 1);
          if (beads.indexOf(bb) >= 0) doExplode(bb);
        }
      }
    }

    // 등장 스케일 · 반짝임
    for (i = 0; i < beads.length; i++) {
      var b = beads[i];
      if (b.scale < 1) b.scale = Math.min(1, b.scale + dt * 4.2);
      if (b.flash > 0) b.flash = Math.max(0, b.flash - dt * 2.2);
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
    ctx.globalAlpha = 0.5 + 0.35 * Math.sin(ph);
    ctx.strokeStyle = '#FFD75E';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 1.02, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = '#FFF3C4';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * (1.16 + 0.05 * Math.sin(ph * 1.3)), 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function render(now) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var sx = 0, sy = 0;
    if (shakeT > 0) {
      var k = shakeT * 6;
      sx = rnd(-1, 1) * shakeMag * k * 0.35;
      sy = rnd(-1, 1) * shakeMag * k * 0.35;
    }
    ctx.save();
    ctx.translate(sx, sy);

    ctx.drawImage(boardCv, 0, 0, W, H);

    // 피버 분위기
    if (feverLeft > 0) {
      var fg = ctx.createRadialGradient(W / 2, H * 0.42, 10, W / 2, H * 0.5, Math.max(W, H) * 0.85);
      fg.addColorStop(0, 'rgba(255,214,120,' + (0.13 + 0.05 * Math.sin(now / 150)) + ')');
      fg.addColorStop(0.65, 'rgba(255,150,90,.05)');
      fg.addColorStop(1, 'rgba(255,110,170,.02)');
      ctx.fillStyle = fg;
      ctx.fillRect(0, 0, W, H);
    }

    // 연결 중인 구슬 집합
    var inChain = {};
    var i;
    for (i = 0; i < chain.length; i++) inChain[chain[i].id] = i + 1;

    // 구슬
    for (i = 0; i < beads.length; i++) {
      var b = beads[i];
      if (b.y < -b.r * 2.4) continue;
      var s = b.scale;
      var ci = inChain[b.id];
      if (ci) s *= 1.06;
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
      if (b.bomb) drawBombRing(b, now);
    }

    // 터지는 잔상
    for (i = 0; i < ghosts.length; i++) {
      var g = ghosts[i];
      var kk = clamp((g.t - g.delay) / g.dur, 0, 1);
      if (kk <= 0) continue;
      var tp = TYPES[g.type] || TYPES[0];
      ctx.save();
      ctx.globalAlpha = (1 - kk) * 0.95;
      drawBeadSprite(g.bomb ? beadCache.bomb : beadCache[g.type], g.x, g.y, 1 + kk * 0.55);
      ctx.globalAlpha = (1 - kk) * 0.7;
      ctx.strokeStyle = tp.color;
      ctx.lineWidth = 3 * (1 - kk) + 1;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r * (1 + kk * 1.15), 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    // 충격파
    for (i = 0; i < waves.length; i++) {
      var wv = waves[i];
      var wk = wv.t / wv.dur;
      ctx.save();
      ctx.globalAlpha = (1 - wk) * 0.8;
      ctx.strokeStyle = wv.color;
      ctx.lineWidth = 8 * (1 - wk) + 1;
      ctx.beginPath();
      ctx.arc(wv.x, wv.y, wv.r + (wv.r1 - wv.r) * wk, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    // 한붓 연결선
    if (chain.length) {
      var ct = TYPES[chainType] || TYPES[0];
      if (chain.length > 1) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(chain[0].x, chain[0].y);
        for (i = 1; i < chain.length; i++) ctx.lineTo(chain[i].x, chain[i].y);
        ctx.shadowColor = ct.color;
        ctx.shadowBlur = 16;
        ctx.strokeStyle = 'rgba(255,255,255,.92)';
        ctx.lineWidth = R * 0.42;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = ct.color;
        ctx.lineWidth = R * 0.15;
        ctx.stroke();
        ctx.restore();
      }
      for (i = 0; i < chain.length; i++) {
        var cb = chain[i];
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,.96)';
        ctx.lineWidth = 3;
        ctx.shadowColor = ct.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(cb.x, cb.y, cb.r * 0.99, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
    }

    // 파티클
    for (i = 0; i < parts.length; i++) {
      var pt = parts[i];
      var pk = 1 - pt.t / pt.dur;
      ctx.globalAlpha = pk;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r * pk, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 점수 글자
    for (i = 0; i < texts.length; i++) {
      var tx = texts[i];
      var tk = tx.t / tx.dur;
      var rise = 26 * tk;
      ctx.save();
      ctx.globalAlpha = tk < 0.15 ? tk / 0.15 : 1 - Math.max(0, (tk - 0.55) / 0.45);
      ctx.font = '900 ' + tx.size + 'px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.strokeText(tx.text, tx.x, tx.y - rise);
      ctx.fillStyle = tx.color;
      ctx.fillText(tx.text, tx.x, tx.y - rise);
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
     13. 시작
     ========================================================= */
  function onImagesReady() {
    ready = true;
    buildSprites();
    fillBoard();
    bestIntroEl.textContent = fmt(best);
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
      if (all[i].complete && all[i].naturalWidth) continue;   // 이미 캐시된 이미지
      left2++;
      all[i].addEventListener('load', done);
      all[i].addEventListener('error', done);
    }
    if (left2 === 0) { onImagesReady(); return; }
    // 캐시된 이미지는 load 이벤트가 안 올 수 있다
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
  updateScoreUI();
  bestIntroEl.textContent = fmt(best);
  loadImages();
  requestAnimationFrame(frame);   // 이미지 전에도 보드부터 그린다

  /* QA(검수용) — ?qa=1 일 때만 열린다 */
  if (/[?&]qa=1/.test(location.search)) {
    window.__KOMI_QA = {
      info: function () {
        return {
          state: state, score: score, combo: combo, maxCombo: maxCombo, maxChain: maxChain,
          popped: poppedTotal, time: timeLeft, fever: feverLeft, gauge: feverGauge,
          beads: beads.length, pending: pending, R: R, W: W, H: H, chain: chain.length
        };
      },
      beads: function () {
        return beads.map(function (b) { return { x: b.x, y: b.y, r: b.r, type: b.type, bomb: b.bomb }; });
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
      start: startGame,
      shuffle: shuffle,
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
      tick: function (sec) { timeLeft = sec; updateTimerUI(); },
      addFever: function (v) { addFever(v); }
    };
  }

})();
