/* MOMO ADVENTURE RUN — game.js (세로형 · 375×812 기준)
   ─────────────────────────────────────────────────────────────
   가상 좌표: 폭 1000 단위 고정, 높이는 화면 비율에 따라 늘어난다(VH).
   배경은 클린 사진 한 장(좌우 반전 없음)을 세로 화면에 맞춰 그리고 아주 천천히 좌우로 흔든다.
   바닥 도로는 지면선 아래에서 빠르게 흐르는 표시(대시·먼지)로 속도를 보여 준다.
   · 하트 3 · 길거리 음식(+50점·코인·콤보) · 피버(무적 질주)
   · 아래 장애물은 점프/2단 점프, 위 장애물은 슬라이드로 피한다
   · 스테이지 목표 거리를 채우면 클리어 → 별점, localStorage 저장, 다음 지역 해금
   · 5개 지역 이후엔 무한 질주
*/
(function () {
  'use strict';

  /* 화면 오류를 모아 두면 검수 때 한 번에 확인할 수 있다 */
  window.__momoErr = [];
  window.addEventListener('error', (e) => { window.__momoErr.push('error: ' + (e.message || e.type)); });
  window.addEventListener('unhandledrejection', (e) => { window.__momoErr.push('reject: ' + e.reason); });

  const QA = /(^|[?&])qa=1(&|$)/.test(location.search);           // 검수용: 목표를 짧게
  const QAVP = /vp=(\d+)x(\d+)/.exec(location.search);            // 검수용: 화면 크기 고정
  const QASPD = (function () { const m = /spd=([\d.]+)/.exec(location.search); return m ? Math.max(0.05, Math.min(1, parseFloat(m[1]))) : 1; })();

  /* ── 좌표계 (세로형) ───────────────────────────────── */
  const VW = 1000;                 // 가로는 고정
  let VH = 2165;                   // 세로는 화면 비율로 (375×812 → 2165)
  let GROUND_Y = 1665;             // 모모 발이 닿는 선
  const FLOOR_H = 500;             // 지면선 아래 여유(단위)
  const PLAYER_X = 250;            // 화면 속 모모의 x

  /* ── 스테이지 ───────────────────────────────────────── */
  const STAGES = [
    { n: 1, key: 'myeongdong', bg: 'stage1', food: ['s1-1', 's1-2', 's1-3'],
      ground: ['s1-4', 's1-5'], top: 's3-6', goal: 860, foodGoal: 30, dash: '#ffd2e2' },
    { n: 2, key: 'bukchon', bg: 'stage2', food: ['s2-1', 's2-2', 's2-3'],
      ground: ['s2-4', 's2-5'], top: 's2-6', goal: 900, foodGoal: 32, dash: '#ffe6c2' },
    { n: 3, key: 'namsan', bg: 'stage3', food: ['s3-1', 's3-2', 's3-3'],
      ground: ['s3-4', 's3-5'], top: 's3-6', goal: 940, foodGoal: 34, dash: '#ffd9b8' },
    { n: 4, key: 'jagalchi', bg: 'stage4', food: ['s4-1', 's4-2', 's4-3'],
      ground: ['s4-4', 's4-6'], top: 's4-5', goal: 980, foodGoal: 36, dash: '#cfeaff' },
    { n: 5, key: 'jeju', bg: 'stage5', food: ['s5-1', 's5-2', 's5-3'],
      ground: ['s5-4', 's5-5'], top: 's5-6', goal: 1040, foodGoal: 38, dash: '#fff0bd' }
  ];

  const SPRITE_SRC = {
    run: 'assets/sprites/momo-run.webp',
    jump: 'assets/sprites/momo-jump.webp',
    djump: 'assets/sprites/momo-djump.webp',
    slide: 'assets/sprites/momo-slide.webp',
    idle: 'assets/sprites/momo-idle.webp',
    victory: 'assets/sprites/momo-victory.webp',
    wave: 'assets/sprites/momo-wave.webp'
  };

  /* ── 크기·물리 ──────────────────────────────────────── */
  const M_PER_UNIT = 1 / 22;      // 22 단위 = 1m
  const PLAYER_H = 314;           // 스프라이트 높이(단위)
  const HIT_W = 148;
  const HIT_H = 236;
  const SLIDE_HIT_H = 132;
  const TOP_GAP = 223;            // 위 장애물의 아래 끝 = 지면선 - 223
  const GRAVITY = 2700;
  const JUMP_V = 1180;            // 최고 높이 ≈ 258 단위
  const DJUMP_V = 1080;
  const SLIDE_TIME = 0.62;
  const SPEED_START = 400;
  const SPEED_MAX = 690;
  const FEVER_TIME = 7.2;
  const FEVER_MAX = 100;
  const COMBO_KEEP = 2.6;
  const SAVE_KEY = 'momoRun.v1';

  /* ── DOM ────────────────────────────────────────────── */
  const $ = (id) => document.getElementById(id);
  const canvas = $('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const els = {
    wrap: $('stageWrap'), hud: $('hud'), controls: $('controls'),
    hearts: $('hearts'), scoreVal: $('scoreVal'), coinVal: $('coinVal'),
    stageChip: $('stageChip'), stageGoalChip: $('stageGoalChip'),
    progFill: $('progFill'), progPup: $('progPup'),
    comboTag: $('comboTag'), feverWrap: $('feverWrap'), feverFill: $('feverFill'),
    btnSound: $('btnSound'), btnLang: $('btnLang'), btnPause: $('btnPause'),
    btnJump: $('btnJump'), btnSlide: $('btnSlide'),
    screenTitle: $('screenTitle'), screenStages: $('screenStages'),
    screenClear: $('screenClear'), screenOver: $('screenOver'), screenPause: $('screenPause'),
    stageGrid: $('stageGrid'), titleBest: $('titleBest'), titleCoins: $('titleCoins'),
    stagesCoins: $('stagesCoins'),
    clearStars: $('clearStars'), clearScore: $('clearScore'), clearCoins: $('clearCoins'),
    clearBest: $('clearBest'), clearUnlock: $('clearUnlock'), clearSub: $('clearSub'),
    overScore: $('overScore'), overDist: $('overDist'), overCoins: $('overCoins'), overRecord: $('overRecord'),
    loadingVeil: $('loadingVeil'), toast: $('toast')
  };

  const T = (k) => (window.MomoI18n ? window.MomoI18n.t(k) : k);

  /* ── 저장 ───────────────────────────────────────────── */
  const DEFAULT_SAVE = { unlocked: 1, stars: {}, best: {}, coins: 0, muted: false, endlessBest: 0 };
  let save = Object.assign({}, DEFAULT_SAVE);

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) save = Object.assign({}, DEFAULT_SAVE, JSON.parse(raw));
    } catch (e) {}
    save.stars = save.stars || {};
    save.best = save.best || {};
  }
  function writeSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
  }

  /* ── 이미지 ─────────────────────────────────────────── */
  const IMG = {};
  function loadImg(src) {
    if (IMG[src]) return Promise.resolve(IMG[src]);
    return new Promise((res) => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { IMG[src] = im; res(im); };
      im.onerror = () => { IMG[src] = null; res(null); };
      im.src = src;
    });
  }
  function bgSrc(st) { return 'assets/bg2/' + st.bg + '.webp'; }
  function itemSrc(id) { return 'assets/items/' + id + '.webp'; }
  function stageAssets(st) {
    const list = [bgSrc(st), itemSrc(st.top)];
    st.food.forEach((f) => list.push(itemSrc(f)));
    st.ground.forEach((g) => list.push(itemSrc(g)));
    return list;
  }
  function preload(list) { return Promise.all(list.map(loadImg)); }

  /* ── 소리 ───────────────────────────────────────────── */
  const Sfx = (function () {
    let ac = null;
    function ensure() {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ac = new AC();
      }
      if (ac.state === 'suspended') ac.resume();
      return ac;
    }
    function tone(freq, dur, type, gain, slideTo, delay) {
      if (save.muted) return;
      const a = ensure(); if (!a) return;
      const t0 = a.currentTime + (delay || 0);
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain || 0.18, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(a.destination);
      o.start(t0); o.stop(t0 + dur + 0.03);
    }
    function noise(dur, gain, hp) {
      if (save.muted) return;
      const a = ensure(); if (!a) return;
      const len = Math.floor(a.sampleRate * dur);
      const buf = a.createBuffer(1, len, a.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const s = a.createBufferSource(); s.buffer = buf;
      const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp || 700;
      const g = a.createGain(); g.gain.value = gain || 0.12;
      s.connect(f); f.connect(g); g.connect(a.destination); s.start();
    }
    return {
      unlock() { ensure(); },
      jump() { tone(520, 0.16, 'square', 0.1, 880); },
      djump() { tone(660, 0.18, 'square', 0.1, 1180); tone(990, 0.12, 'sine', 0.06, 1320, 0.04); },
      slide() { noise(0.26, 0.1, 1200); tone(300, 0.2, 'sawtooth', 0.05, 150); },
      coin(i) {
        const base = 880 * Math.pow(1.0595, Math.min(12, i || 0));
        tone(base, 0.09, 'sine', 0.14); tone(base * 1.5, 0.11, 'sine', 0.1, null, 0.05);
      },
      hit() { tone(220, 0.3, 'sawtooth', 0.2, 90); noise(0.22, 0.16, 300); },
      fever() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, 'triangle', 0.14, null, i * 0.07)); },
      clear() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.32, 'triangle', 0.13, null, i * 0.1)); },
      over() { [440, 349, 294, 220].forEach((f, i) => tone(f, 0.34, 'triangle', 0.14, null, i * 0.12)); },
      ui() { tone(700, 0.07, 'sine', 0.08); }
    };
  })();

  function buzz(pattern) {
    if (save.muted) return;
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
  }

  /* ── 상태 ───────────────────────────────────────────── */
  const S = {
    scene: 'boot',
    stage: STAGES[0],
    endless: false,
    worldX: 0,
    speed: SPEED_START,
    score: 0, coins: 0, runCoins: 0,
    hearts: 3,
    combo: 0, comboTimer: 0, bestCombo: 0,
    fever: 0, feverTimer: 0, feverCount: 0,
    foodGot: 0, distGoal: 0, foodGoal: 0,
    nextSpawn: 0,
    hitFlash: 0, feverFlash: 0, shake: 0,
    time: 0, runTime: 0,
    bannerTimer: 0, bannerText: '', bannerSub: '',
    ready: false
  };

  const player = {
    y: 0, vy: 0, jumps: 0, sliding: 0, hurt: 0, inv: 0, dead: false,
    squash: 1, runPhase: 0, dustT: 0, trailT: 0
  };

  let objects = [];
  let foods = [];
  let parts = [];
  let pops = [];
  let confetti = [];

  /* ── 크기/배율 ──────────────────────────────────────── */
  let dpr = 1;
  function resize() {
    if (QAVP) {
      els.wrap.style.width = QAVP[1] + 'px';
      els.wrap.style.height = QAVP[2] + 'px';
    }
    const rect = els.wrap.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(240, Math.round(rect.width * dpr));
    const h = Math.max(400, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
    }
    VH = VW * (rect.height / rect.width);
    GROUND_Y = VH - FLOOR_H;
    // HUD/CSS 배율 — 폰(375 폭)에서 0.89
    const s = Math.max(0.72, Math.min(1.55, rect.width / 421));
    document.documentElement.style.setProperty('--s', s.toFixed(4));
  }

  /* ── 화면 전환 ──────────────────────────────────────── */
  function showScreen(name) {
    [['title', els.screenTitle], ['stages', els.screenStages], ['clear', els.screenClear],
     ['over', els.screenOver], ['pause', els.screenPause]].forEach(([k, el]) => {
      el.hidden = (k !== name);
    });
  }
  function hudOn(on) {
    els.hud.classList.toggle('on', on);
    els.controls.classList.toggle('on', on);
  }

  /* ── 스테이지 시작 ──────────────────────────────────── */
  async function startStage(n, endless) {
    S.endless = !!endless;
    S.stage = STAGES[Math.max(0, Math.min(STAGES.length - 1, n - 1))];
    S.distGoal = S.stage.goal;
    S.foodGoal = S.stage.foodGoal;
    if (QA) { S.distGoal = 260; S.foodGoal = 4; }
    els.loadingVeil.hidden = false;
    Sfx.unlock();

    await preload(stageAssets(S.stage));
    els.loadingVeil.hidden = true;

    S.worldX = 0; S.speed = SPEED_START; S.score = 0; S.coins = 0; S.runCoins = 0;
    S.hearts = QA ? 9 : 3; S.combo = 0; S.comboTimer = 0; S.bestCombo = 0;
    S.fever = 0; S.feverTimer = 0; S.feverCount = 0; S.foodGot = 0;
    S.nextSpawn = 1200;
    S.hitFlash = 0; S.feverFlash = 0; S.shake = 0; S.runTime = 0;
    S.bannerTimer = 2.4;
    S.bannerText = 'STAGE ' + S.stage.n;
    S.bannerSub = T('stage' + S.stage.n);

    player.y = 0; player.vy = 0; player.jumps = 0; player.sliding = 0;
    player.hurt = 0; player.inv = 0; player.dead = false; player.squash = 1;

    objects = []; foods = []; parts = []; pops = []; confetti = [];

    S.scene = 'playing';
    showScreen(null);
    hudOn(true);
    syncHud(true);
    updateStageChip();
  }

  function updateStageChip() {
    els.stageChip.textContent = S.endless ? T('endless') : T('stage' + S.stage.n);
    els.stageGoalChip.textContent = S.endless ? '' : (T('food') + ' ' + S.foodGot + '/' + S.foodGoal);
  }

  /* ── HUD ────────────────────────────────────────────── */
  let hudCache = {};
  function syncHud(force) {
    if (force) hudCache = {};
    if (hudCache.score !== S.score) {
      els.scoreVal.textContent = String(Math.round(S.score));
      hudCache.score = S.score;
    }
    if (hudCache.coins !== save.coins + S.runCoins) {
      els.coinVal.textContent = String(save.coins + S.runCoins);
      hudCache.coins = save.coins + S.runCoins;
    }
    if (hudCache.hearts !== S.hearts) {
      const hs = els.hearts.children;
      for (let i = 0; i < hs.length; i++) hs[i].classList.toggle('lost', i >= Math.min(3, S.hearts));
      hudCache.hearts = S.hearts;
    }
    const meters = S.worldX * M_PER_UNIT;
    const p = S.endless ? 0 : Math.min(1, meters / S.distGoal);
    const pct = (p * 100).toFixed(1) + '%';
    if (hudCache.pct !== pct) {
      els.progFill.style.width = pct;
      els.progPup.style.left = pct;
      hudCache.pct = pct;
    }
    if (hudCache.combo !== S.combo) {
      els.comboTag.textContent = (S.combo > 1 ? S.combo + ' ' + T('combo') : '');
      els.comboTag.classList.toggle('on', S.combo > 1);
      hudCache.combo = S.combo;
    }
    const fp = Math.round(S.feverTimer > 0 ? 100 : Math.min(100, S.fever));
    if (hudCache.fever !== fp) {
      els.feverFill.style.width = (S.feverTimer > 0 ? 100 : fp) + '%';
      els.feverWrap.classList.toggle('full', S.feverTimer > 0);
      hudCache.fever = fp;
    }
    if (hudCache.food !== S.foodGot) {
      els.stageGoalChip.textContent = S.endless ? '' : (T('food') + ' ' + S.foodGot + '/' + S.foodGoal);
      hudCache.food = S.foodGot;
    }
  }

  /* ── 입력 ───────────────────────────────────────────── */
  function doJump() {
    if (S.scene !== 'playing' || player.dead) return;
    if (player.jumps >= 2) return;
    player.vy = player.jumps === 0 ? -JUMP_V : -DJUMP_V;
    player.jumps++;
    player.sliding = 0;
    player.squash = 0.86;
    if (player.jumps === 1) { Sfx.jump(); puff(PLAYER_X, GROUND_Y, 6, '#fff'); }
    else { Sfx.djump(); ring(PLAYER_X, GROUND_Y + player.y - PLAYER_H * 0.5); buzz(12); }
  }
  function doSlide() {
    if (S.scene !== 'playing' || player.dead) return;
    if (player.sliding > 0) return;
    player.sliding = SLIDE_TIME;
    player.squash = 0.9;
    Sfx.slide();
    puff(PLAYER_X - 40, GROUND_Y, 8, '#ffffff');
    buzz(8);
  }
  function bindPad(btn, fn) {
    const down = (e) => { e.preventDefault(); btn.classList.add('down'); fn(); Sfx.unlock(); };
    const up = (e) => { if (e) e.preventDefault(); btn.classList.remove('down'); };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('pointerleave', up);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  bindPad(els.btnJump, doJump);
  bindPad(els.btnSlide, doSlide);

  canvas.addEventListener('pointerdown', (e) => {
    if (S.scene !== 'playing') return;
    e.preventDefault();
    Sfx.unlock();
    const r = canvas.getBoundingClientRect();
    if ((e.clientX - r.left) / r.width < 0.45) doSlide(); else doJump();
  });

  window.addEventListener('keydown', (e) => {
    if (S.scene === 'playing') {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); doJump(); }
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); doSlide(); }
      else if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); togglePause(true); }
    } else if (S.scene === 'paused') {
      if (e.code === 'Escape' || e.code === 'KeyP' || e.code === 'Space') { e.preventDefault(); togglePause(false); }
    } else if (S.scene === 'title') {
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); startStage(save.unlocked, false); }
    }
  });

  /* ── 일시정지 ───────────────────────────────────────── */
  function togglePause(on) {
    if (on && S.scene !== 'playing') return;
    if (!on && S.scene !== 'paused') return;
    S.scene = on ? 'paused' : 'playing';
    showScreen(on ? 'pause' : null);
    hudOn(!on);
    Sfx.ui();
  }
  els.btnPause.addEventListener('click', () => togglePause(true));
  $('btnResume').addEventListener('click', () => togglePause(false));
  $('btnQuit').addEventListener('click', () => { togglePause(false); goTitle(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && S.scene === 'playing') togglePause(true);
  });

  /* ── 타이틀 / 지역 선택 ─────────────────────────────── */
  function bestOverall() {
    let b = 0;
    Object.keys(save.best || {}).forEach((k) => { b = Math.max(b, save.best[k] || 0); });
    return Math.max(b, save.endlessBest || 0);
  }

  function goTitle() {
    S.scene = 'title';
    hudOn(false);
    showScreen('title');
    els.titleBest.textContent = String(bestOverall());
    els.titleCoins.textContent = String(save.coins);
    S.stage = STAGES[0];
    preload([SPRITE_SRC.run, SPRITE_SRC.idle, bgSrc(STAGES[0]), itemSrc(STAGES[0].food[0])]);
  }

  function buildStageGrid() {
    els.stageGrid.innerHTML = '';
    STAGES.forEach((st) => {
      const locked = st.n > save.unlocked;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'stage-card' + (locked ? ' locked' : '');
      card.style.backgroundImage = 'url("assets/bg2/thumb-' + st.n + '.webp")';
      const stars = save.stars[st.n] || 0;
      const starHtml = [1, 2, 3].map((i) => '<i class="' + (i <= stars ? 'on' : '') + '">★</i>').join('');
      card.innerHTML =
        '<span class="sc-body">' +
          '<span class="sc-no">STAGE ' + st.n + '</span>' +
          '<span class="sc-name">' + T('stage' + st.n) + '</span>' +
          '<span class="sc-stars">' + starHtml + '</span>' +
        '</span>';
      if (!locked) card.addEventListener('click', () => { Sfx.ui(); startStage(st.n, false); });
      els.stageGrid.appendChild(card);
    });

    const endlessLocked = !(save.stars[5] > 0);
    const e = document.createElement('button');
    e.type = 'button';
    e.className = 'stage-card endless' + (endlessLocked ? ' locked' : '');
    e.innerHTML =
      '<span class="sc-body">' +
        '<span class="sc-no">∞</span>' +
        '<span class="sc-name">' + T('endless') + '</span>' +
        '<span class="sc-stars"><i class="on">' + (save.endlessBest || 0) + '</i></span>' +
      '</span>';
    if (!endlessLocked) e.addEventListener('click', () => { Sfx.ui(); startStage(STAGES.length, true); });
    els.stageGrid.appendChild(e);
    els.stagesCoins.textContent = String(save.coins);
  }

  function showStages() {
    S.scene = 'stages';
    buildStageGrid();
    showScreen('stages');
    hudOn(false);
    Sfx.ui();
  }

  $('btnPlay').addEventListener('click', () => { Sfx.unlock(); Sfx.ui(); startStage(save.unlocked, false); });
  $('btnStages').addEventListener('click', showStages);
  $('btnStagesBack').addEventListener('click', () => { Sfx.ui(); goTitle(); });
  $('btnRetryClear').addEventListener('click', () => { Sfx.ui(); startStage(S.stage.n, S.endless); });
  $('btnNext').addEventListener('click', () => {
    Sfx.ui();
    if (S.endless) startStage(STAGES.length, true);
    else startStage(Math.min(STAGES.length, S.stage.n + 1), false);
  });
  $('btnToList').addEventListener('click', () => { Sfx.ui(); showStages(); });
  $('btnRetryOver').addEventListener('click', () => { Sfx.ui(); startStage(S.stage.n, S.endless); });
  $('btnOverList').addEventListener('click', () => { Sfx.ui(); showStages(); });

  els.btnSound.addEventListener('click', () => {
    save.muted = !save.muted; writeSave();
    els.btnSound.classList.toggle('muted', save.muted);
    els.btnSound.setAttribute('aria-label', T(save.muted ? 'soundOff' : 'soundOn'));
    if (!save.muted) Sfx.ui();
  });
  els.btnLang.addEventListener('click', () => {
    window.MomoI18n.next();
    Sfx.ui();
    if (S.scene === 'stages') buildStageGrid();
    updateStageChip();
    hudCache = {};
    syncHud(true);
  });
  window.onMomoLangChange = function () {
    if (S.scene === 'stages') buildStageGrid();
    if (S.bannerTimer > 0) S.bannerSub = T('stage' + S.stage.n);
    updateStageChip();
  };

  /* ── 스폰 ───────────────────────────────────────────── */
  function spawnPattern() {
    const diff = Math.min(1, (S.worldX * M_PER_UNIT) / Math.max(1, S.distGoal));
    const baseGap = 620 - diff * 130;
    const pick = Math.random();
    let cursor = S.nextSpawn;

    if (pick < 0.4) {
      const w = 210 + Math.random() * 70;
      objects.push(makeTop(cursor, w));
      cursor += w + 110;
      cursor = spawnFoodArc(cursor + 50, 4, 190);
      cursor += baseGap * (0.9 + Math.random() * 0.3);
    } else if (pick < 0.78) {
      const n = Math.random() < 0.3 + diff * 0.2 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const w = 110 + Math.random() * 60;
        objects.push(makeGround(cursor, w));
        cursor += w + 190 + Math.random() * 50;
      }
      cursor = spawnFoodArc(cursor + 20, 3 + Math.floor(Math.random() * 2), 150);
      cursor += baseGap * (0.85 + Math.random() * 0.3);
    } else {
      cursor = spawnFoodLine(cursor, 4 + Math.floor(Math.random() * 3));
      cursor += baseGap * (0.55 + Math.random() * 0.2);
    }
    S.nextSpawn = Math.max(cursor, S.nextSpawn + 260);
  }

  function makeGround(x, w) {
    const id = S.stage.ground[Math.random() < 0.7 ? 0 : 1];
    const img = IMG[itemSrc(id)];
    const h = 132 + Math.random() * 42;
    const ww = img ? h * img.width / img.height : w;
    return { kind: 'ground', x: x, y: GROUND_Y, w: ww, h: h, img: img };
  }
  function makeTop(x, w) {
    const img = IMG[itemSrc(S.stage.top)];
    const h = 210 + Math.random() * 40;
    const ww = img ? h * img.width / img.height : w;
    return { kind: 'top', x: x, y: GROUND_Y - TOP_GAP, w: ww, h: h, img: img };
  }
  function spawnFoodArc(x, count, lift) {
    let cx = x;
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const y = GROUND_Y - 96 - Math.sin(t * Math.PI) * lift;
      foods.push(makeFood(cx, y, i));
      cx += 108;
    }
    return cx;
  }
  function spawnFoodLine(x, count) {
    let cx = x;
    const high = Math.random() < 0.3;
    for (let i = 0; i < count; i++) {
      const y = high ? GROUND_Y - 330 - Math.sin(i / count * Math.PI) * 60 : GROUND_Y - 92;
      foods.push(makeFood(cx, y, i));
      cx += 104;
    }
    return cx;
  }
  function makeFood(x, y, i) {
    const id = S.stage.food[(i + Math.floor(Math.random() * 3)) % S.stage.food.length];
    const img = IMG[itemSrc(id)];
    return { x: x, y: y + (Math.random() - 0.5) * 12, id: id, img: img, size: 96, spin: Math.random() * 6.28, done: false };
  }

  /* ── 파티클 ─────────────────────────────────────────── */
  function puff(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      parts.push({
        x: x + (Math.random() - 0.5) * 40, y: y - Math.random() * 20,
        vx: -100 - Math.random() * 180, vy: -Math.random() * 140,
        life: 0.5 + Math.random() * 0.4, t: 0, r: 7 + Math.random() * 13,
        color: color || '#fff', kind: 'puff'
      });
    }
  }
  function ring(x, y) {
    parts.push({ x: x, y: y, vx: 0, vy: 0, life: 0.5, t: 0, r: 18, color: '#ffe9a8', kind: 'ring' });
  }
  function sparkle(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * 6.28;
      const sp = 90 + Math.random() * 200;
      parts.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
        life: 0.45 + Math.random() * 0.3, t: 0, r: 3.5 + Math.random() * 5,
        color: color || '#ffd75e', kind: 'spark'
      });
    }
  }
  function addPop(x, y, text, color, big) {
    if (pops.length > 6) pops.shift();
    pops.push({ x: x + (Math.random() - 0.5) * 14, y: y, text: text, color: color || '#fff', t: 0, life: big ? 1.1 : 0.85, big: !!big });
  }

  /* ── 업데이트 ───────────────────────────────────────── */
  function update(dt) {
    S.time += dt;
    if (S.scene === 'title' || S.scene === 'stages') { updateAmbient(dt); return; }
    if (S.scene !== 'playing') { updateParticles(dt); return; }

    dt *= QASPD;
    S.runTime += dt;

    const meters = S.worldX * M_PER_UNIT;
    const ramp = S.endless ? Math.min(1, S.runTime / 130) : Math.min(1, meters / Math.max(1, S.distGoal));
    let target = SPEED_START + (SPEED_MAX - SPEED_START) * ramp;
    if (S.feverTimer > 0) target *= 1.18;
    S.speed += (target - S.speed) * Math.min(1, dt * 1.6);

    S.worldX += S.speed * dt;

    if (S.bannerTimer > 0) S.bannerTimer -= dt;
    if (S.hitFlash > 0) S.hitFlash -= dt * 2.4;
    if (S.feverFlash > 0) S.feverFlash -= dt * 2;
    if (S.shake > 0) S.shake = Math.max(0, S.shake - dt * 3.2);

    if (S.combo > 0) {
      S.comboTimer -= dt;
      if (S.comboTimer <= 0) S.combo = 0;
    }
    if (S.feverTimer > 0) {
      S.feverTimer -= dt;
      if (S.feverTimer <= 0) { S.fever = 0; S.feverFlash = 0.6; }
    }

    if (player.sliding > 0) player.sliding = Math.max(0, player.sliding - dt);
    if (player.hurt > 0) player.hurt = Math.max(0, player.hurt - dt);
    if (player.inv > 0) player.inv = Math.max(0, player.inv - dt);

    if (player.jumps > 0 || player.y < 0) {
      player.vy += GRAVITY * dt;
      player.y += player.vy * dt;
      if (player.y >= 0) {
        if (player.jumps > 0) { puff(PLAYER_X, GROUND_Y, 5, '#fff'); buzz(6); }
        player.y = 0; player.vy = 0; player.jumps = 0; player.squash = 1.14;
      }
    }
    player.squash += (1 - player.squash) * Math.min(1, dt * 9);
    player.runPhase += dt * (6 + S.speed / 170);

    if (player.jumps === 0 && player.sliding <= 0) {
      player.dustT -= dt;
      if (player.dustT <= 0) {
        player.dustT = 0.12;
        parts.push({
          x: PLAYER_X - 26, y: GROUND_Y - 6, vx: -S.speed * 0.4, vy: -50 - Math.random() * 60,
          life: 0.45, t: 0, r: 5 + Math.random() * 9, color: 'rgba(255,255,255,.55)', kind: 'puff'
        });
      }
    }
    if (S.feverTimer > 0) {
      player.trailT -= dt;
      if (player.trailT <= 0) {
        player.trailT = 0.04;
        const hue = (S.time * 320) % 360;
        parts.push({
          x: PLAYER_X - 30, y: GROUND_Y - 70 - Math.random() * 120, vx: -220, vy: -20 + Math.random() * 40,
          life: 0.5, t: 0, r: 10 + Math.random() * 12, color: 'hsla(' + hue + ',95%,68%,.85)', kind: 'spark'
        });
      }
    }

    while (S.nextSpawn < S.worldX + VW + 300) spawnPattern();

    const px = PLAYER_X;
    const pTop = GROUND_Y - (player.sliding > 0 ? SLIDE_HIT_H : HIT_H) + player.y;
    const pBot = GROUND_Y + player.y;
    const pHalf = (player.sliding > 0 ? 96 : HIT_W / 2);

    for (let i = objects.length - 1; i >= 0; i--) {
      const o = objects[i];
      const sx = o.x - S.worldX;
      if (sx < -420) { objects.splice(i, 1); continue; }
      if (player.dead) continue;
      const ox = sx - o.w / 2;
      const oBottom = o.y;
      const oTop = o.y - o.h;
      const overlapX = (px + pHalf * 0.7) > ox && (px - pHalf * 0.7) < ox + o.w;
      const overlapY = pBot > oTop + 8 && pTop < oBottom - 6;
      if (overlapX && overlapY && player.inv <= 0 && S.feverTimer <= 0) hitObstacle(o);
    }

    for (let i = foods.length - 1; i >= 0; i--) {
      const f = foods[i];
      let sx = f.x - S.worldX;
      if (sx < -140) { foods.splice(i, 1); continue; }
      f.spin += dt * 2.4;
      if (f.done || player.dead) continue;
      if (S.feverTimer > 0) {
        const ddx = px - sx, ddy = (GROUND_Y - 110 + player.y) - f.y;
        const d = Math.hypot(ddx, ddy);
        if (d < 320 && d > 1) {
          f.x += (ddx / d) * 560 * dt;
          f.y += (ddy / d) * 560 * dt;
          sx = f.x - S.worldX;
        }
      }
      const rr = f.size * 0.44;
      const bodyH = player.sliding > 0 ? SLIDE_HIT_H : HIT_H;
      const cy = pBot - bodyH / 2;
      if (Math.abs(sx - px) < rr + 52 && Math.abs(f.y - cy) < rr + bodyH / 2 + 10) eatFood(f, sx);
    }

    updateParticles(dt);

    if (!S.endless && meters >= S.distGoal) stageClear();
    syncHud();
  }

  function updateParticles(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.t += dt;
      if (p.t >= p.life) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'puff') p.vy -= 60 * dt;
      if (p.kind === 'spark') p.vy += 380 * dt;
    }
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i];
      p.t += dt; p.y -= 60 * dt;
      if (p.t >= p.life) pops.splice(i, 1);
    }
    for (let i = confetti.length - 1; i >= 0; i--) {
      const c = confetti[i];
      c.t += dt; c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 220 * dt; c.rot += c.vr * dt;
      if (c.t > 4) confetti.splice(i, 1);
    }
  }

  function updateAmbient(dt) {
    player.runPhase += dt * 5;
    updateParticles(dt);
    if (Math.random() < dt * 5) {
      parts.push({
        x: VW + 40, y: 200 + Math.random() * (VH * 0.5), vx: -80 - Math.random() * 60, vy: 26,
        life: 2.6, t: 0, r: 4 + Math.random() * 6, color: 'rgba(255,214,234,.8)', kind: 'petal'
      });
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (p.kind === 'petal') p.x += Math.sin(S.time * 2 + p.y) * 18 * dt;
    }
  }

  function hitObstacle(o) {
    S.hearts--;
    const hs = els.hearts.children[S.hearts];
    if (hs) { hs.classList.add('hit'); setTimeout(() => hs.classList.remove('hit'), 460); }
    player.inv = 1.5;
    player.hurt = 0.55;
    S.combo = 0;
    S.shake = 1;
    S.hitFlash = 1;
    Sfx.hit();
    buzz([30, 40, 60]);
    addPop(PLAYER_X + 20, GROUND_Y - 330, '−1 ♥', '#ff5577', true);
    sparkle(PLAYER_X + 20, GROUND_Y - 150, '#ff8fa8');
    if (S.hearts <= 0) gameOver();
  }

  function eatFood(f, sx) {
    f.done = true;
    S.combo++;
    S.comboTimer = COMBO_KEEP;
    S.bestCombo = Math.max(S.bestCombo, S.combo);
    const mult = 1 + Math.min(20, S.combo - 1) * 0.1;
    const feverMult = S.feverTimer > 0 ? 2 : 1;
    const gain = Math.round(50 * mult * feverMult);
    S.score += gain;
    S.coins += 1;
    S.runCoins += 1;
    S.foodGot++;
    if (S.feverTimer <= 0) {
      S.fever = Math.min(FEVER_MAX, S.fever + 9);
      if (S.fever >= FEVER_MAX) startFever();
    }
    addPop(sx, f.y - 26, '+' + gain + ' ' + T(foodNameKey(f.id)), '#ffe9a8', S.combo > 4 && S.combo % 5 === 0);
    sparkle(sx, f.y, '#ffd75e');
    Sfx.coin(S.combo);
    buzz(10);
  }

  function foodNameKey(id) {
    const m = /^s(\d)-(\d)$/.exec(id);
    if (!m) return 'food';
    return 'food' + m[1] + '_' + m[2];
  }

  function startFever() {
    S.feverTimer = FEVER_TIME;
    S.feverCount++;
    S.feverFlash = 1;
    Sfx.fever();
    buzz([20, 30, 20, 30, 60]);
    addPop(PLAYER_X, GROUND_Y - 460, T('feverStart'), '#8ef0ff', true);
    for (let i = 0; i < 26; i++) {
      parts.push({
        x: PLAYER_X + (Math.random() - 0.5) * 70, y: GROUND_Y - 120,
        vx: (Math.random() - 0.5) * 620, vy: -180 - Math.random() * 460,
        life: 0.9, t: 0, r: 5 + Math.random() * 9, color: 'hsl(' + (Math.random() * 360) + ',95%,70%)', kind: 'spark'
      });
    }
  }

  /* ── 클리어 / 게임오버 ──────────────────────────────── */
  function stageClear() {
    S.scene = 'clear';
    hudOn(false);
    const alive = S.hearts;
    const stars = (alive >= 3 && S.foodGot >= S.foodGoal) ? 3 : (alive >= 2 ? 2 : 1);
    const key = String(S.stage.n);
    const prevStars = S.endless ? 0 : (save.stars[key] || 0);
    if (!S.endless) {
      save.stars[key] = Math.max(prevStars, stars);
      save.unlocked = Math.max(save.unlocked, Math.min(STAGES.length, S.stage.n + 1));
    } else {
      save.endlessBest = Math.max(save.endlessBest || 0, Math.round(S.score));
    }
    const bestKey = S.endless ? 'endless' : key;
    const prevBest = save.best[bestKey] || 0;
    save.best[bestKey] = Math.max(prevBest, Math.round(S.score));
    save.coins += S.runCoins;
    writeSave();

    els.clearStars.children[0].className = stars >= 1 ? 'on' : '';
    els.clearStars.children[1].className = stars >= 2 ? 'on' : '';
    els.clearStars.children[2].className = stars >= 3 ? 'on' : '';
    els.clearScore.textContent = String(Math.round(S.score));
    els.clearCoins.textContent = '+' + S.runCoins;
    els.clearBest.textContent = String(save.best[bestKey]);
    els.clearSub.textContent = T('clearSub');

    if (S.endless) {
      els.clearUnlock.textContent = T('endlessTag');
      els.clearUnlock.hidden = false;
    } else if (S.stage.n < STAGES.length) {
      els.clearUnlock.textContent = T('unlocked') + ' → ' + T('stage' + (S.stage.n + 1));
      els.clearUnlock.hidden = false;
    } else {
      els.clearUnlock.textContent = T('allClear');
      els.clearUnlock.hidden = false;
    }
    const nextBtn = $('btnNext');
    nextBtn.textContent = (S.endless || S.stage.n >= STAGES.length) ? T('endless') : T('nextStage');
    nextBtn.hidden = false;

    for (let i = 0; i < 80; i++) {
      confetti.push({
        x: Math.random() * VW, y: -60 - Math.random() * 300,
        vx: (Math.random() - 0.5) * 140, vy: 180 + Math.random() * 240,
        rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 10,
        t: 0, color: ['#ff5d9b', '#ffd75e', '#6fd3ff', '#3ecf8e', '#ff8a5b'][Math.floor(Math.random() * 5)],
        w: 7 + Math.random() * 9, h: 4 + Math.random() * 7
      });
    }
    Sfx.clear();
    buzz([15, 40, 15, 40, 90]);
    setTimeout(() => showScreen('clear'), 720);
  }

  function gameOver() {
    player.dead = true;
    S.scene = 'over';
    const key = S.endless ? 'endless' : String(S.stage.n);
    const prevBest = save.best[key] || 0;
    const isRecord = Math.round(S.score) > prevBest;
    save.best[key] = Math.max(prevBest, Math.round(S.score));
    save.coins += S.runCoins;
    writeSave();

    els.overScore.textContent = String(Math.round(S.score));
    els.overDist.textContent = Math.round(S.worldX * M_PER_UNIT) + 'm';
    els.overCoins.textContent = '+' + S.runCoins;
    els.overRecord.hidden = !isRecord;
    Sfx.over();
    buzz(120);
    setTimeout(() => { hudOn(false); showScreen('over'); }, 900);
  }

  /* ── 그리기 ─────────────────────────────────────────── */
  function draw() {
    const k = canvas.height / VH;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const shake = S.shake;
    const shakeX = shake > 0 ? (Math.random() - 0.5) * 24 * shake : 0;
    const shakeY = shake > 0 ? (Math.random() - 0.5) * 16 * shake : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);

    drawBackground();
    drawGround();
    if (S.scene === 'playing' || S.scene === 'paused' || S.scene === 'clear' || S.scene === 'over') {
      drawObjects();
      drawFoods();
      drawPlayer();
    } else {
      drawTitleMomo();
    }
    drawParticles();
    drawPops();
    drawConfetti();
    drawFeverFx();
    drawBanner();
    ctx.restore();
    drawVignette();
  }

  /* 배경: 사진 한 장을 세로 화면에 맞춰 그리고 아주 천천히 좌우로 흔든다(반전·반복 없음) */
  function drawBackground() {
    const st = S.stage;
    const img = IMG[bgSrc(st)];
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, '#191024');
    g.addColorStop(0.5, '#241634');
    g.addColorStop(1, '#0f0a18');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);
    if (!img) return;

    const zoom = 1.10;
    const sc = Math.max(VW / img.width, VH / img.height) * zoom;
    const w = img.width * sc;
    const h = img.height * sc;
    const panMax = Math.max(0, (w - VW) / 2);
    const pan = (Math.sin(S.time * 0.11) * 0.5 + Math.sin(S.time * 0.037 + 1.2) * 0.5) * panMax * 0.85;
    const x = (VW - w) / 2 + pan;
    const y = VH - h * 1.01;
    ctx.drawImage(img, x, y, w, h);
  }

  /* 지면 아래: 빠르게 흐르는 도로 표시 + 접지 그림자 */
  function drawGround() {
    const st = S.stage;
    const top = GROUND_Y - 150;
    const g = ctx.createLinearGradient(0, top, 0, VH);
    g.addColorStop(0, 'rgba(16,9,22,0)');
    g.addColorStop(0.28, 'rgba(16,9,22,.34)');
    g.addColorStop(0.5, 'rgba(14,8,20,.6)');
    g.addColorStop(1, 'rgba(10,6,16,.88)');
    ctx.fillStyle = g;
    ctx.fillRect(0, top, VW, VH - top);

    // 발밑 접지 띠 — 사진 앞쪽 소품 위로 모모가 서 있는 느낌을 준다
    const cg = ctx.createLinearGradient(0, GROUND_Y - 60, 0, GROUND_Y + 90);
    cg.addColorStop(0, 'rgba(12,7,18,0)');
    cg.addColorStop(1, 'rgba(12,7,18,.55)');
    ctx.fillStyle = cg;
    ctx.fillRect(0, GROUND_Y - 60, VW, 150);

    // 속도 대시 — 지면선 근처에서 빠르게 흐른다
    const span = 340;
    const off = (S.worldX * 1.35) % span;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = st.dash || '#ffffff';
    ctx.lineWidth = 3;
    for (let i = -1; i < 6; i++) {
      const y = GROUND_Y + 24 + i * 62;
      const len = 90 + (i % 3) * 40;
      for (let j = 0; j < 5; j++) {
        const x = ((j * span * 1.6) - off + i * 70) % (VW + span) - span * 0.5;
        ctx.globalAlpha = 0.3 - i * 0.03;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + len, y);
        ctx.stroke();
      }
    }
    ctx.restore();

    // 지면선 하이라이트
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.fillRect(0, GROUND_Y - 2, VW, 2);
    ctx.restore();
  }

  function drawTitleMomo() {
    const img = IMG[SPRITE_SRC.run];
    if (!img) return;
    const bob = Math.sin(player.runPhase) * 6;
    const x = VW * 0.5;
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#120c1c';
    ctx.beginPath();
    ctx.ellipse(x, GROUND_Y + 6, 110, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawSprite(img, x, GROUND_Y + bob, PLAYER_H * 0.94);
  }

  function drawSprite(img, cx, bottomY, h, opt) {
    opt = opt || {};
    const w = h * img.width / img.height;
    ctx.save();
    if (opt.alpha !== undefined) ctx.globalAlpha = opt.alpha;
    ctx.translate(cx, bottomY);
    if (opt.rotate) ctx.rotate(opt.rotate);
    if (opt.sx || opt.sy) ctx.scale(opt.sx || 1, opt.sy || 1);
    ctx.drawImage(img, -w / 2, -h, w, h);
    ctx.restore();
    return w;
  }

  function drawPlayer() {
    const p = player;
    const inAir = p.jumps > 0 || p.y < 0;
    let img = IMG[SPRITE_SRC.run];
    let h = PLAYER_H;
    let rot = 0;
    let sy = p.squash;

    if (S.scene === 'clear') {
      img = IMG[SPRITE_SRC.victory]; h = PLAYER_H * 1.02;
      sy = 1 + Math.sin(S.time * 6) * 0.03;
    } else if (p.dead) {
      img = IMG[SPRITE_SRC.wave]; h = PLAYER_H * 0.86;
    } else if (p.sliding > 0) {
      img = IMG[SPRITE_SRC.slide]; h = PLAYER_H * 0.56;
      rot = 0.02;
    } else if (inAir) {
      img = p.jumps >= 2 ? IMG[SPRITE_SRC.djump] : IMG[SPRITE_SRC.jump];
      h = PLAYER_H * 0.98;
      rot = p.vy < 0 ? -0.05 : 0.05;
    }
    if (!img) img = IMG[SPRITE_SRC.run];
    if (!img) return;

    const bottom = GROUND_Y + p.y;
    const bob = (!inAir && p.sliding <= 0 && S.scene === 'playing') ? Math.sin(p.runPhase * 2) * 3 : 0;
    const shrink = Math.max(0.25, 1 - (-p.y) / 700);

    ctx.save();
    ctx.globalAlpha = 0.32 * shrink + 0.08;
    ctx.fillStyle = '#1a0f24';
    ctx.beginPath();
    ctx.ellipse(PLAYER_X, GROUND_Y + 8, 104 * shrink, 16 * shrink, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (S.feverTimer > 0) {
      const hue = (S.time * 260) % 360;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const rg = ctx.createRadialGradient(PLAYER_X, bottom - h * 0.5, 10, PLAYER_X, bottom - h * 0.5, h * 0.95);
      rg.addColorStop(0, 'hsla(' + hue + ',100%,72%,.42)');
      rg.addColorStop(1, 'hsla(' + hue + ',100%,72%,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(PLAYER_X - 300, bottom - h * 1.4, 600, h * 1.6);
      ctx.restore();
    }

    let alpha = 1;
    if (p.inv > 0 && S.feverTimer <= 0) alpha = (Math.floor(p.inv * 18) % 2) ? 0.35 : 1;

    ctx.save();
    if (p.hurt > 0) ctx.filter = 'saturate(.55) brightness(1.05)';
    drawSprite(img, PLAYER_X, bottom + bob, h, { rotate: rot, alpha: alpha, sy: sy });
    ctx.restore();
  }

  function drawObjects() {
    for (const o of objects) {
      const sx = o.x - S.worldX;
      if (sx < -320 || sx > VW + 320) continue;
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = '#160c20';
      ctx.beginPath();
      ctx.ellipse(sx, o.kind === 'ground' ? o.y + 6 : o.y + 2, o.w * 0.4, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (o.img) {
        const ww = o.h * o.img.width / o.img.height;
        ctx.drawImage(o.img, sx - ww / 2, o.y - o.h, ww, o.h);
      } else {
        ctx.fillStyle = '#ff5d9b';
        ctx.fillRect(sx - o.w / 2, o.y - o.h, o.w, o.h);
      }
      if (o.kind === 'top') {
        ctx.save();
        ctx.strokeStyle = 'rgba(40,26,52,.45)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, o.y - o.h + 10);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  function drawFoods() {
    for (const f of foods) {
      const sx = f.x - S.worldX;
      if (sx < -140 || sx > VW + 140) continue;
      const bob = Math.sin(S.time * 3 + sx * 0.02) * 5;
      const s = f.size;
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = '#1a0f24';
      ctx.beginPath();
      ctx.ellipse(sx, GROUND_Y + 6, s * 0.3, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = 'rgba(255,255,255,.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, f.y + bob, s * 0.56, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      if (f.img) {
        const w = s * f.img.width / f.img.height;
        const wob = Math.sin(S.time * 2.2 + f.spin) * 3;
        ctx.drawImage(f.img, sx - w / 2, f.y + bob - s / 2 + wob, w, s);
      } else {
        ctx.fillStyle = '#ffd75e';
        ctx.beginPath();
        ctx.arc(sx, f.y + bob, s / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawParticles() {
    for (const p of parts) {
      const a = 1 - p.t / p.life;
      ctx.save();
      ctx.globalAlpha = Math.max(0, a) * (p.kind === 'petal' ? 0.85 : 0.9);
      if (p.kind === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 4 * a;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + (1 - a) * 70, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.kind === 'petal') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.r, p.r * 0.6, S.time * 2 + p.x * 0.01, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (p.kind === 'spark' ? a : 1), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawPops() {
    for (const p of pops) {
      const a = 1 - Math.pow(p.t / p.life, 2);
      const scale = p.big ? 1.15 + Math.sin(p.t * 12) * 0.05 : 1;
      ctx.save();
      ctx.globalAlpha = Math.max(0, a);
      ctx.translate(p.x, p.y);
      ctx.scale(scale, scale);
      ctx.font = '900 ' + (p.big ? 34 : 25) + 'px "Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 7;
      ctx.strokeStyle = 'rgba(38,20,44,.72)';
      ctx.strokeText(p.text, 0, 0);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, 0, 0);
      ctx.restore();
    }
  }

  function drawConfetti() {
    for (const c of confetti) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.globalAlpha = Math.max(0, 1 - c.t / 4);
      ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      ctx.restore();
    }
  }

  function drawFeverFx() {
    if (S.feverTimer > 0) {
      const a = Math.min(0.2, S.feverTimer < 1 ? S.feverTimer * 0.2 : 0.2);
      const hue = (S.time * 200) % 360;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, 0, VW, 0);
      g.addColorStop(0, 'hsla(' + hue + ',100%,65%,' + a + ')');
      g.addColorStop(0.5, 'hsla(' + ((hue + 120) % 360) + ',100%,65%,' + (a * 0.5) + ')');
      g.addColorStop(1, 'hsla(' + ((hue + 240) % 360) + ',100%,65%,' + a + ')');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VW, VH);
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const y = ((i * 181 + (S.time * 900) % VH) % VH);
        const len = 140 + (i % 4) * 90;
        ctx.globalAlpha = 0.12 + (i % 3) * 0.05;
        ctx.beginPath();
        ctx.moveTo(VW - ((S.time * 1600 + i * 230) % (VW + 420)), y);
        ctx.lineTo(VW - ((S.time * 1600 + i * 230) % (VW + 420)) + len, y);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (S.feverFlash > 0) {
      ctx.save();
      ctx.globalAlpha = S.feverFlash * 0.5;
      ctx.fillStyle = '#ffd75e';
      ctx.fillRect(0, 0, VW, VH);
      ctx.restore();
    }
    if (S.hitFlash > 0) {
      ctx.save();
      const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.15, VW / 2, VH / 2, VH * 0.7);
      g.addColorStop(0, 'rgba(255,60,90,0)');
      g.addColorStop(1, 'rgba(255,40,80,' + (0.55 * S.hitFlash) + ')');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VW, VH);
      ctx.restore();
    }
  }

  function drawBanner() {
    if (S.bannerTimer <= 0) return;
    const t = S.bannerTimer;
    const a = t > 2.0 ? (2.4 - t) / 0.4 : Math.min(1, t / 0.5);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.textAlign = 'center';
    ctx.translate(VW / 2, VH * 0.3 - (1 - Math.min(1, (2.4 - t) * 4)) * 20);
    ctx.font = '900 30px "Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,.88)';
    ctx.fillText(S.bannerText, 0, -78);
    ctx.font = '900 92px "Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif';
    ctx.lineWidth = 14;
    ctx.strokeStyle = 'rgba(30,14,38,.5)';
    ctx.strokeText(S.bannerSub, 0, 20);
    const grd = ctx.createLinearGradient(0, -50, 0, 46);
    grd.addColorStop(0, '#fff');
    grd.addColorStop(1, '#ffd75e');
    ctx.fillStyle = grd;
    ctx.fillText(S.bannerSub, 0, 20);
    ctx.restore();
  }

  function drawVignette() {
    ctx.save();
    const g = ctx.createRadialGradient(VW / 2, VH * 0.45, VH * 0.3, VW / 2, VH * 0.5, VH * 0.95);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(16,8,24,.42)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);
    ctx.restore();
  }

  /* ── 루프 ───────────────────────────────────────────── */
  let last = 0;
  let acc = 0;
  const STEP = 1 / 120;

  function frame(now) {
    if (!last) last = now;
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    acc += dt;
    let guard = 0;
    while (acc >= STEP && guard < 12) {
      update(STEP);
      acc -= STEP;
      guard++;
    }
    draw();
    requestAnimationFrame(frame);
  }

  if (QA) {
    window.__momoState = () => ({
      scene: S.scene, hearts: S.hearts, score: Math.round(S.score), food: S.foodGot,
      sliding: +player.sliding.toFixed(2), jumps: player.jumps, y: Math.round(player.y),
      vy: Math.round(player.vy), inv: +player.inv.toFixed(2), squash: +player.squash.toFixed(2),
      speed: Math.round(S.speed), worldX: Math.round(S.worldX),
      objects: objects.length, foods: foods.length, err: window.__momoErr.slice(0, 3)
    });
  }

  /* ── 시작 ───────────────────────────────────────────── */
  function boot() {
    loadSave();
    els.btnSound.classList.toggle('muted', !!save.muted);
    window.MomoI18n.apply();
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 120));
    goTitle();
    requestAnimationFrame(frame);
  }

  document.addEventListener('pointerdown', () => Sfx.unlock(), { once: true });

  boot();
})();
