/* KOMI & MOMO POP — 게임 본체
   수박게임 스타일 합치기 퍼즐. 외부 라이브러리·CDN 없이 자체 2D 원형 물리로 돌아간다. */
(function () {
  'use strict';

  var SPR = window.KOMI_POP_SPRITES;
  var DICT = window.KOMI_POP_I18N || {};

  /* =========================================================
     1. 언어
     ========================================================= */
  var LANGS = ['ko', 'en', 'ja', 'zh', 'zh-tw', 'es', 'fr', 'de', 'pt', 'ru', 'id', 'vi'];
  var NATIVE = {
    ko: '한국어', en: 'English', ja: '日本語', zh: '中文 (简体)', 'zh-tw': '中文 (繁體)',
    es: 'Español', fr: 'Français', de: 'Deutsch', pt: 'Português', ru: 'Русский',
    id: 'Bahasa Indonesia', vi: 'Tiếng Việt'
  };
  var LANG_KEY = 'komi_pop_lang_v1';
  var LANG = detectLang();

  function store(key, val) {
    try {
      if (val === null) localStorage.removeItem(key);
      else localStorage.setItem(key, val);
    } catch (e) { /* 사생활 보호 모드 */ }
  }
  function recall(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

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

  var langSel = document.getElementById('langSel');
  var soundBtn = document.getElementById('soundBtn');

  function applyLang(lang) {
    LANG = lang;
    var d = DICT[LANG] || DICT.en || {};
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
    if (langSel) langSel.value = LANG;
  }

  function buildLangSelect() {
    if (!langSel) return;
    var html = '';
    for (var i = 0; i < LANGS.length; i++) {
      html += '<option value="' + LANGS[i] + '">' + NATIVE[LANGS[i]] + '</option>';
    }
    langSel.innerHTML = html;
    langSel.value = LANG;
    langSel.addEventListener('change', function () {
      store(LANG_KEY, langSel.value);
      applyLang(langSel.value);
      sfxClick();
    });
  }

  /* =========================================================
     2. 저장 값 · 소리
     ========================================================= */
  var BEST_KEY = 'komi_pop_best_v1';
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
    o.stop(t0 + dur + 0.02);
  }
  function sfxDrop() { tone(190, 0.10, 'triangle', 0.10, 110); }
  function sfxClick() { tone(620, 0.06, 'sine', 0.07, 720); }
  function sfxMerge(stage) {
    var f = 320 * Math.pow(1.115, stage);
    tone(f, 0.16, 'sine', 0.13, f * 1.5);
    tone(f * 1.5, 0.13, 'triangle', 0.05, f * 2, 0.03);
  }
  function sfxGold() {
    var notes = [523, 659, 784, 1047];
    for (var i = 0; i < notes.length; i++) tone(notes[i], 0.30, 'sine', 0.10, notes[i], i * 0.09);
  }
  function sfxOver() {
    tone(420, 0.20, 'triangle', 0.10, 300);
    tone(300, 0.24, 'triangle', 0.09, 200, 0.15);
    tone(200, 0.34, 'sine', 0.08, 120, 0.32);
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
     3. 게임판 · 상태
     ========================================================= */
  var wrap = document.getElementById('stageWrap');
  var cv = document.getElementById('game');
  var ctx = cv.getContext('2d');
  var nextCv = document.getElementById('nextCv');
  var nextCtx = nextCv ? nextCv.getContext('2d') : null;
  var overlay = document.getElementById('overlay');
  var introPanel = document.getElementById('introPanel');
  var overPanel = document.getElementById('overPanel');
  var finalScoreEl = document.getElementById('finalScore');
  var recordLine = document.getElementById('recordLine');
  var scoreEl = document.getElementById('score');
  var bestEl = document.getElementById('best');

  var STAGES = 9;
  var RAD = [1, 1.34, 1.72, 2.14, 2.60, 3.12, 3.68, 4.30, 4.98];
  var PTS = [1, 3, 6, 10, 15, 21, 28, 36, 52];
  var PALETTE = [
    ['#FFB6D4', '#FF6FA4', '#FFFFFF'],
    ['#FF8FBB', '#E3226F', '#FFD0E2'],
    ['#5A4655', '#F7EADC', '#FFFFFF'],
    ['#FFC7DE', '#FFC44D', '#FFFFFF'],
    ['#F9E2BD', '#FF5D9B', '#FFF6E6'],
    ['#FFD66B', '#FF5D9B', '#FFF3C4'],
    ['#1F5FA8', '#D8452F', '#F5C034'],
    ['#E8548A', '#FFFDF8', '#2E7D5B'],
    ['#FFD66B', '#FFF6C9', '#FFFFFF']
  ];

  var DPR = 1;
  var box = { w: 0, h: 0 };
  var unit = 16;
  var lineY = 0;
  var boardR = 26;

  var G = {
    state: 'intro',
    balls: [],
    held: null,          // {stage, x}
    nextStage: 0,
    pendingStage: 0,
    score: 0,
    combo: 0,
    lastMerge: -99,
    cooldown: 0,
    time: 0,
    particles: [],
    floats: [],
    shake: 0,
    flash: 0,
    aiming: false,
    pointerX: 0,
    danger: 0
  };

  var lastTs = 0;
  var raf = null;

  function radiusOf(stage) { return RAD[stage] * unit; }
  function randStage() {
    var r = Math.random();
    if (r < 0.34) return 0;
    if (r < 0.62) return 1;
    if (r < 0.84) return 2;
    return 3;
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* ---------- 크기 ---------- */
  function layout() {
    /* 판이 지나치게 길어지지 않도록 높이를 폭의 1.62배로 제한한다 */
    var rect = wrap.getBoundingClientRect();
    var maxH = Math.round(rect.width * 1.62);
    if (rect.height > maxH + 4) {
      wrap.style.height = maxH + 'px';
      wrap.style.flex = '0 0 auto';
      rect = wrap.getBoundingClientRect();
    } else if (wrap.style.height) {
      wrap.style.height = '';
      wrap.style.flex = '';
      rect = wrap.getBoundingClientRect();
    }
    var w = Math.max(220, Math.round(rect.width));
    var h = Math.max(260, Math.round(rect.height));
    var oldW = box.w, oldH = box.h;
    DPR = Math.min(3, window.devicePixelRatio || 1);
    box.w = w; box.h = h;
    cv.width = Math.round(w * DPR);
    cv.height = Math.round(h * DPR);
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    boardR = Math.min(28, w * 0.075);

    var newUnit = w * 0.0405;
    if (oldW > 0 && G.balls.length) {
      var sx = w / oldW, sy = h / oldH;
      for (var i = 0; i < G.balls.length; i++) {
        var b = G.balls[i];
        b.x *= sx; b.y *= sy;
        b.vx *= sx; b.vy *= sy;
        b.r = RAD[b.stage] * newUnit;
      }
      if (G.held) G.held.x = clamp(G.held.x * sx, 0, w);
    }
    unit = newUnit;
    lineY = Math.round(h * 0.135);
    SPR.clearCache();
    buildEvo();
    drawNext();
    if (G.held) G.held.x = clamp(G.held.x, radiusOf(G.held.stage), w - radiusOf(G.held.stage));
    render();
  }

  /* =========================================================
     4. 게임 흐름
     ========================================================= */
  function resetGame() {
    G.balls = [];
    G.particles = [];
    G.floats = [];
    G.score = 0;
    G.combo = 0;
    G.lastMerge = -99;
    G.cooldown = 0;
    G.time = 0;
    G.danger = 0;
    G.shake = 0;
    G.flash = 0;
    G.aiming = false;
    G.held = null;
    G.nextStage = randStage();
    G.pendingStage = randStage();
    spawnHeld();
    paintScore(true);
    paintBest();
    drawNext();
  }

  function spawnHeld() {
    var st = G.pendingStage;
    G.held = { stage: st, x: box.w / 2 };
    G.pendingStage = G.nextStage;
    G.nextStage = randStage();
    drawNext();
  }

  function startGame() {
    resetGame();
    G.state = 'playing';
    if (overlay) overlay.hidden = true;
    audio();
  }

  function finishGame() {
    G.state = 'over';
    sfxOver();
    var isNew = G.score > best && G.score > 0;
    if (isNew) { best = G.score; store(BEST_KEY, String(best)); }
    paintBest();
    if (finalScoreEl) finalScoreEl.textContent = G.score;
    if (recordLine) recordLine.hidden = !isNew;
    if (overPanel) overPanel.hidden = false;
    if (introPanel) introPanel.hidden = true;
    if (overlay) overlay.hidden = false;
  }

  function paintScore(bump) {
    if (!scoreEl) return;
    scoreEl.textContent = G.score;
    if (bump) {
      scoreEl.classList.remove('bump');
      void scoreEl.offsetWidth;
      scoreEl.classList.add('bump');
    }
  }
  function paintBest() { if (bestEl) bestEl.textContent = best; }

  /* =========================================================
     5. 물리
     ========================================================= */
  var PAD = 5;   /* 벽 안쪽 여백 — 공이 판 테두리에 파묻히지 않게 */

  function substep(h) {
    var g = box.w * 6.9;
    var balls = G.balls;
    var i, b;

    for (i = 0; i < balls.length; i++) {
      b = balls[i];
      b.age += h;
      b.vy += g * h;
      if (b.vy > 2600) b.vy = 2600;
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.angle += b.spin * h;
      b.vx *= 0.9992;
      b.spin *= 0.994;
      if (b.spin > 7) b.spin = 7;
      if (b.spin < -7) b.spin = -7;
    }

    // 벽·바닥
    for (i = 0; i < balls.length; i++) {
      b = balls[i];
      if (b.x - b.r < PAD) {
        b.x = b.r + PAD;
        if (b.vx < 0) b.vx = -b.vx * 0.20;
        b.spin *= 0.94;
      } else if (b.x + b.r > box.w - PAD) {
        b.x = box.w - b.r - PAD;
        if (b.vx > 0) b.vx = -b.vx * 0.20;
        b.spin *= 0.94;
      }
      if (b.y + b.r > box.h - PAD) {
        b.y = box.h - b.r - PAD;
        if (b.vy > 0) {
          b.vy = Math.abs(b.vy) > 140 ? -b.vy * 0.16 : 0;
        }
        b.vx *= 0.86;
        b.spin *= 0.86;
      }
    }

    // 원-원 충돌 · 합체
    var merges = [];
    for (i = 0; i < balls.length; i++) {
      var a = balls[i];
      if (a.dead) continue;
      for (var j = i + 1; j < balls.length; j++) {
        b = balls[j];
        if (b.dead) continue;
        var dx = b.x - a.x, dy = b.y - a.y;
        var rsum = a.r + b.r;
        var d2 = dx * dx + dy * dy;
        if (d2 >= rsum * rsum) continue;

        if (a.stage === b.stage && a.age > 0.045 && b.age > 0.045) {
          a.dead = true;
          b.dead = true;
          merges.push([a, b]);
          break;
        }

        var d = Math.sqrt(d2) || 0.0001;
        var nx = dx / d, ny = dy / d;
        // 위치 보정 (질량 ∝ 반지름²)
        var ma = a.r * a.r, mb = b.r * b.r;
        var overlap = (rsum - d) + 0.05;
        var wa = mb / (ma + mb), wb = ma / (ma + mb);
        a.x -= nx * overlap * wa * 0.62;
        a.y -= ny * overlap * wa * 0.62;
        b.x += nx * overlap * wb * 0.62;
        b.y += ny * overlap * wb * 0.62;

        // 반발
        var rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rvn < 0) {
          var ima = 1 / ma, imb = 1 / mb;
          var jn = -(1 + 0.08) * rvn / (ima + imb);
          a.vx -= jn * ima * nx;
          a.vy -= jn * ima * ny;
          b.vx += jn * imb * nx;
          b.vy += jn * imb * ny;
        }
        // 접선 마찰 → 회전
        var tvx = (b.vx - a.vx) - ((b.vx - a.vx) * nx + (b.vy - a.vy) * ny) * nx;
        var tvy = (b.vy - a.vy) - ((b.vx - a.vx) * nx + (b.vy - a.vy) * ny) * ny;
        a.spin -= (tvx * -ny + tvy * nx) / a.r * 0.05;
        b.spin += (tvx * -ny + tvy * nx) / b.r * 0.05;
      }
    }

    if (merges.length) {
      G.balls = balls.filter(function (x) { return !x.dead; });
      for (i = 0; i < merges.length; i++) doMerge(merges[i][0], merges[i][1]);
    }
  }

  function doMerge(a, b) {
    var ns = a.stage + 1;
    var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    G.combo = (G.time - G.lastMerge < 1.45) ? Math.min(9, G.combo + 1) : 1;
    G.lastMerge = G.time;
    var mult = 1 + 0.25 * (G.combo - 1);

    if (ns < STAGES) {
      G.balls.push({
        x: mx, y: my,
        vx: (a.vx + b.vx) / 2, vy: (a.vy + b.vy) / 2 - 40,
        r: radiusOf(ns), stage: ns,
        angle: 0, spin: (a.spin + b.spin) / 2,
        age: 0, danger: 0
      });
      var base = PTS[ns];
      var gain = Math.round(base * mult);
      G.score += gain;
      paintScore(true);
      popBurst(mx, my, ns, 10 + ns * 2);
      addFloat(mx, my - radiusOf(ns) * 0.5, '+' + gain, G.combo > 1 ? 'combo' : '');
      if (G.combo > 1) addFloat(mx, my - radiusOf(ns) * 1.15, 'x' + G.combo.toFixed(2).replace(/\.00$/, ''), 'combo');
      G.shake = Math.min(7, G.shake + 1.6 + ns * 0.35);
      if (ns === STAGES - 1) { sfxGold(); G.flash = 1; }
      else sfxMerge(ns);
    } else {
      // 대왕 골드 코미 두 개 → 큰 축포
      var bonus = Math.round(160 * mult);
      G.score += bonus;
      paintScore(true);
      popBurst(mx, my, 8, 46);
      addFloat(mx, my - radiusOf(8) * 0.7, '+' + bonus, 'combo');
      G.flash = 1;
      G.shake = 9;
      sfxGold();
    }
  }

  function popBurst(x, y, stage, count) {
    var pal = PALETTE[clamp(stage, 0, PALETTE.length - 1)];
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 60 + Math.random() * (140 + stage * 22);
      G.particles.push({
        type: 'dot', x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
        r: 2 + Math.random() * (2.6 + stage * 0.55),
        life: 0.5 + Math.random() * 0.45, max: 0.95,
        color: pal[i % pal.length]
      });
    }
    for (var s = 0; s < 3 + Math.floor(stage / 2); s++) {
      var sa = Math.random() * Math.PI * 2;
      var ss = 50 + Math.random() * 90;
      G.particles.push({
        type: 'star', x: x, y: y,
        vx: Math.cos(sa) * ss, vy: Math.sin(sa) * ss - 30,
        r: 4 + Math.random() * 5 + stage * 0.4,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 8,
        life: 0.6, max: 0.7, color: '#FFF8DC'
      });
    }
    G.particles.push({ type: 'ring', x: x, y: y, r: radiusOf(stage) * 0.8, vr: 240, life: 0.34, max: 0.34, color: pal[1] });
  }

  function addFloat(x, y, text, kind) {
    G.floats.push({ x: x, y: y, text: text, kind: kind, life: 0.95, max: 0.95 });
  }

  function updateFx(dt) {
    var i;
    for (i = G.particles.length - 1; i >= 0; i--) {
      var p = G.particles[i];
      p.life -= dt;
      if (p.life <= 0) { G.particles.splice(i, 1); continue; }
      if (p.type === 'ring') { p.r += p.vr * dt; continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 620 * dt;
      p.vx *= 0.97;
      if (p.type === 'star') p.rot += p.vr * dt;
    }
    for (i = G.floats.length - 1; i >= 0; i--) {
      var f = G.floats[i];
      f.life -= dt;
      f.y -= 42 * dt;
      if (f.life <= 0) G.floats.splice(i, 1);
    }
    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 26);
    if (G.flash > 0) G.flash = Math.max(0, G.flash - dt * 2.6);
  }

  function update(dt) {
    G.time += dt;

    if (G.cooldown > 0) {
      G.cooldown -= dt;
      if (G.cooldown <= 0) { G.cooldown = 0; spawnHeld(); }
    }

    var maxV = 0;
    for (var i = 0; i < G.balls.length; i++) {
      var b = G.balls[i];
      var v = Math.abs(b.vx) + Math.abs(b.vy);
      if (v > maxV) maxV = v;
    }
    var steps = clamp(Math.ceil((maxV * dt) / Math.max(6, unit * 0.45)), 3, 10);
    var sdt = dt / steps;
    for (var s = 0; s < steps; s++) {
      substep(sdt);
      if (G.state !== 'playing') break;
    }

    // 데드라인 판정 (2.4초 유예)
    var danger = 0;
    for (var k = 0; k < G.balls.length; k++) {
      var ball = G.balls[k];
      var speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      if (ball.age > 1.0 && ball.y - ball.r < lineY && speed < 70) {
        ball.danger += dt;
      } else {
        ball.danger = Math.max(0, ball.danger - dt * 2.5);
      }
      if (ball.danger > danger) danger = ball.danger;
      if (ball.danger > 2.4) { finishGame(); return; }
    }
    G.danger = danger;
  }

  /* =========================================================
     6. 그리기
     ========================================================= */
  function roundRectPath(c, x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
  }

  function render() {
    if (!box.w) return;
    var w = box.w, h = box.h;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, w, h);

    ctx.save();
    if (G.shake > 0.05) {
      ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);
    }

    // 판
    roundRectPath(ctx, 0, 0, w, h, boardR);
    var bg = ctx.createLinearGradient(0, 0, w * 0.4, h);
    bg.addColorStop(0, '#FFFAFD');
    bg.addColorStop(0.45, '#FFF1F9');
    bg.addColorStop(1, '#FFE4F1');
    ctx.fillStyle = bg;
    ctx.fill();

    ctx.save();
    roundRectPath(ctx, 0, 0, w, h, boardR);
    ctx.clip();

    // 윗면 빛
    var topG = ctx.createLinearGradient(0, 0, 0, h * 0.5);
    topG.addColorStop(0, 'rgba(255,255,255,.95)');
    topG.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = topG;
    ctx.fillRect(0, 0, w, h * 0.5);

    // 위험: 선 위쪽 붉은 기운
    if (G.danger > 0.2) {
      var pulse = 0.5 + 0.5 * Math.sin(G.time * 9);
      var dg = ctx.createLinearGradient(0, 0, 0, lineY * 1.9);
      dg.addColorStop(0, 'rgba(255,92,120,' + (0.10 + 0.09 * pulse) * Math.min(1, G.danger / 2.4) + ')');
      dg.addColorStop(1, 'rgba(255,92,120,0)');
      ctx.fillStyle = dg;
      ctx.fillRect(0, 0, w, lineY * 1.9);
    }

    // 데드라인
    var lineAlpha = G.danger > 0.2 ? 0.55 + 0.35 * Math.sin(G.time * 9) : 0.30;
    var lineColor = G.danger > 0.2 ? 'rgba(255,74,120,' + lineAlpha + ')' : 'rgba(255,140,180,' + lineAlpha + ')';
    ctx.save();
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = G.danger > 0.2 ? 2.4 : 1.6;
    ctx.strokeStyle = lineColor;
    ctx.beginPath();
    ctx.moveTo(10, lineY);
    ctx.lineTo(w - 10, lineY);
    ctx.stroke();
    ctx.restore();

    // 조준 안내
    if (G.state === 'playing' && G.held) {
      var hr = radiusOf(G.held.stage);
      var hx = G.held.x;
      var gy = h;
      var guide = ctx.createLinearGradient(0, hr * 2, 0, h);
      guide.addColorStop(0, 'rgba(255,93,155,.42)');
      guide.addColorStop(1, 'rgba(255,93,155,.06)');
      ctx.save();
      ctx.setLineDash([5, 9]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = guide;
      ctx.beginPath();
      ctx.moveTo(hx, hr * 2 + 6);
      ctx.lineTo(hx, gy);
      ctx.stroke();
      ctx.restore();
      ctx.beginPath();
      ctx.ellipse(hx, gy - 6, hr * 0.92, hr * 0.20, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,93,155,.10)';
      ctx.fill();
    }

    // 공
    for (var i = 0; i < G.balls.length; i++) drawBall(G.balls[i]);

    // 보유 공
    if (G.state === 'playing' && G.held) {
      var bob = Math.sin(G.time * 2.6) * 2.2;
      var r = radiusOf(G.held.stage);
      drawBall({ x: G.held.x, y: r + 8 + bob, r: r, stage: G.held.stage, angle: 0, age: 1, held: true });
    }

    // 파티클
    for (var p = 0; p < G.particles.length; p++) {
      var pt = G.particles[p];
      var a = Math.max(0, Math.min(1, pt.life / pt.max));
      if (pt.type === 'ring') {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        ctx.lineWidth = 3 * a + 1;
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.55 * a) + ')';
        ctx.stroke();
        continue;
      }
      ctx.globalAlpha = a;
      if (pt.type === 'star') {
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.rot);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        for (var s6 = 0; s6 < 4; s6++) {
          ctx.moveTo(0, -pt.r);
          ctx.quadraticCurveTo(pt.r * 0.22, -pt.r * 0.22, pt.r, 0);
          ctx.rotate(Math.PI / 2);
        }
        ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        ctx.fillStyle = pt.color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // 점수 말풍선
    for (var f = 0; f < G.floats.length; f++) {
      var fl = G.floats[f];
      var fa = Math.max(0, Math.min(1, fl.life / fl.max));
      ctx.globalAlpha = fa;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var size = fl.kind === 'combo' ? 12 : 15;
      ctx.font = '800 ' + size + 'px -apple-system, "Segoe UI", Roboto, "Noto Sans KR", sans-serif';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.strokeText(fl.text, fl.x, fl.y);
      ctx.fillStyle = fl.kind === 'combo' ? '#FF7A2F' : '#E22F76';
      ctx.fillText(fl.text, fl.x, fl.y);
      ctx.globalAlpha = 1;
    }

    // 골드 합체 섬광
    if (G.flash > 0) {
      ctx.fillStyle = 'rgba(255,248,220,' + (G.flash * 0.55) + ')';
      ctx.fillRect(0, 0, w, h);
    }

    ctx.restore(); // clip

    // 테두리
    roundRectPath(ctx, 1, 1, w - 2, h - 2, boardR - 1);
    ctx.lineWidth = 2;
    ctx.strokeStyle = G.danger > 0.2 ? 'rgba(255,110,145,.75)' : 'rgba(255,174,207,.95)';
    ctx.stroke();

    ctx.restore();
  }

  function drawBall(b) {
    var size = b.r * 2 * SPR.ratio;
    var scale = b.age < 0.19 ? 0.55 + 0.45 * easeOut(b.age / 0.19) : 1;
    var d = size * scale;

    // 바닥 그림자
    if (!b.held) {
      ctx.save();
      ctx.globalAlpha = 0.10;
      ctx.fillStyle = '#B23A6B';
      ctx.beginPath();
      ctx.ellipse(b.x, Math.min(b.y + b.r * 0.94, box.h - PAD - 1), b.r * 0.78, b.r * 0.20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    var sprite = SPR.make(b.stage, Math.min(1200, Math.ceil(size * DPR)));
    var headShift = -0.0375 * d;   /* 그림의 얼굴 중심(172/320)을 충돌 원 중심에 맞춘다 */
    ctx.save();
    ctx.translate(b.x, b.y);
    if (b.angle) ctx.rotate(clamp(b.angle, -0.22, 0.22));
    ctx.drawImage(sprite, -d / 2, -d / 2 + headShift, d, d);
    ctx.restore();
  }

  function easeOut(x) {
    x = clamp(x, 0, 1);
    return 1 - Math.pow(1 - x, 3);
  }

  /* =========================================================
     7. 입력
     ========================================================= */
  function clientToX(e) {
    var rect = cv.getBoundingClientRect();
    return (e.clientX - rect.left) * (box.w / rect.width);
  }

  function setAim(x) {
    if (!G.held) return;
    var r = radiusOf(G.held.stage);
    G.held.x = clamp(x, r + PAD, box.w - r - PAD);
  }

  function drop() {
    if (G.state !== 'playing' || !G.held || G.cooldown > 0) return;
    var r = radiusOf(G.held.stage);
    var x = clamp(G.held.x, r + PAD, box.w - r - PAD);
    G.balls.push({
      x: x, y: r + 8, vx: 0, vy: 40,
      r: r, stage: G.held.stage,
      angle: 0, spin: 0, age: 0, danger: 0
    });
    G.held = null;
    G.cooldown = 0.42;
    G.aiming = false;
    sfxDrop();
  }

  cv.addEventListener('pointerdown', function (e) {
    if (G.state !== 'playing' || !G.held) return;
    G.aiming = true;
    setAim(clientToX(e));
    try { cv.setPointerCapture(e.pointerId); } catch (err) { }
    e.preventDefault();
  });
  cv.addEventListener('pointermove', function (e) {
    if (!G.aiming) return;
    setAim(clientToX(e));
    e.preventDefault();
  });
  cv.addEventListener('pointerup', function (e) {
    if (!G.aiming) return;
    setAim(clientToX(e));
    G.aiming = false;
    drop();
    e.preventDefault();
  });
  cv.addEventListener('pointercancel', function () {
    G.aiming = false;
  });
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  window.addEventListener('keydown', function (e) {
    if (G.state !== 'playing') {
      if ((e.key === 'Enter' || e.key === ' ') && G.state === 'intro') { e.preventDefault(); startGame(); }
      else if ((e.key === 'Enter' || e.key === ' ') && G.state === 'over') { e.preventDefault(); startGame(); }
      return;
    }
    if (!G.held) return;
    var step = Math.max(8, box.w * 0.035);
    if (e.key === 'ArrowLeft') { setAim(G.held.x - step); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { setAim(G.held.x + step); e.preventDefault(); }
    else if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown') { drop(); e.preventDefault(); }
  });

  /* =========================================================
     8. 다음 공 · 진화표 · 시작 그림
     ========================================================= */
  function drawNext() {
    if (!nextCtx) return;
    var w = nextCv.width, h = nextCv.height;
    nextCtx.clearRect(0, 0, w, h);
    var stage = G.state === 'intro' ? 4 : (G.held ? G.nextStage : G.pendingStage);
    var sprite = SPR.make(stage, 160);
    var size = Math.min(w, h) * 0.94;
    nextCtx.drawImage(sprite, (w - size) / 2, (h - size) / 2, size, size);
  }

  var evoTrack = document.getElementById('evoTrack');
  function buildEvo() {
    if (!evoTrack) return;
    var w = evoTrack.clientWidth || 280;
    var hMax = 26;
    var gap = 1;
    var arrowW = 7;
    var avail = w - arrowW * (STAGES - 1) - gap * 2 * (STAGES - 1);
    var base = Math.min(26, Math.max(10, avail / (STAGES * 1.06)));
    var html = '';
    for (var i = 0; i < STAGES; i++) {
      var size = Math.round(base * (0.70 + 0.055 * i));
      html += '<span class="evo-item"><canvas class="evo-cv" data-stage="' + i + '" width="' +
        (size * 2) + '" height="' + (size * 2) + '" style="width:' + size + 'px;height:' + size + 'px"></canvas></span>';
      if (i < STAGES - 1) html += '<span class="evo-arrow">›</span>';
    }
    evoTrack.innerHTML = html;
    var cvs = evoTrack.querySelectorAll('canvas');
    for (var c = 0; c < cvs.length; c++) {
      var st = parseInt(cvs[c].getAttribute('data-stage'), 10);
      var cctx = cvs[c].getContext('2d');
      var px = cvs[c].width;
      cctx.clearRect(0, 0, px, px);
      cctx.drawImage(SPR.make(st, px), 0, 0, px, px);
    }
  }

  function drawIntroArt() {
    var c = document.getElementById('introArt');
    if (!c) return;
    var g = c.getContext('2d');
    var w = c.width, h = c.height;
    g.clearRect(0, 0, w, h);
    var small = SPR.make(2, 220);
    var big = SPR.make(8, 300);
    g.drawImage(small, -6, h - 128, 128, 128);
    g.drawImage(big, w - 144, 4, 152, 152);
  }

  /* =========================================================
     9. 시작
     ========================================================= */
  var startBtn = document.getElementById('startBtn');
  var againBtn = document.getElementById('againBtn');
  if (startBtn) startBtn.addEventListener('click', startGame);
  if (againBtn) againBtn.addEventListener('click', startGame);

  function loop(ts) {
    raf = requestAnimationFrame(loop);
    if (!lastTs) lastTs = ts;
    var dt = Math.min(0.033, Math.max(0.001, (ts - lastTs) / 1000));
    lastTs = ts;
    if (G.state === 'playing') update(dt);
    updateFx(dt);
    render();
  }

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 90);
  });
  window.addEventListener('orientationchange', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 220);
  });

  buildLangSelect();
  applyLang(LANG);
  paintSound();
  paintBest();
  layout();
  drawIntroArt();
  requestAnimationFrame(loop);

  /* 확인용 읽기 전용 상태(게임에는 영향 없음) */
  window.KMP_STATE = function () {
    return {
      state: G.state, score: G.score, best: best, combo: G.combo,
      heldStage: G.held ? G.held.stage : null, nextStage: G.nextStage,
      balls: G.balls.map(function (b) {
        return { stage: b.stage, x: Math.round(b.x), y: Math.round(b.y), r: Math.round(b.r), danger: +b.danger.toFixed(2) };
      }),
      lineY: lineY, box: { w: box.w, h: box.h }, lang: LANG, muted: muted
    };
  };
})();
