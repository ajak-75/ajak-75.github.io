/* K-Sajoo — app.js
   화면은 engine.js 가 돌려준 표준 JSON 하나만 받아 그린다. 계산은 하지 않는다. */
(function () {
  'use strict';

  var K = window.KSajoo;
  var I = window.KSAJOO_I18N;
  var LANGS = ['ko', 'en', 'ja', 'zh', 'zh-tw', 'es', 'fr', 'de', 'pt', 'vi', 'id'];
  var ELEM_ORDER = ['wood', 'fire', 'earth', 'metal', 'water'];
  var ELEM_INDEX = { wood: 0, fire: 1, earth: 2, metal: 3, water: 4 };
  var GOD_INDEX = { bigyeon: 0, geopjae: 1, siksin: 2, sangwan: 3, pyeonjae: 4, jeongjae: 5, pyeongwan: 6, jeonggwan: 7, pyeonin: 8, jeongin: 9 };

  /* 출생지 — IANA 타임존과 경도(진태양시 보정) */
  var CITIES = [
    { id: 'seoul', en: 'Seoul', ko: '서울', tz: 'Asia/Seoul', lon: 126.978 },
    { id: 'busan', en: 'Busan', ko: '부산', tz: 'Asia/Seoul', lon: 129.075 },
    { id: 'tokyo', en: 'Tokyo', ko: '도쿄', tz: 'Asia/Tokyo', lon: 139.6917 },
    { id: 'osaka', en: 'Osaka', ko: '오사카', tz: 'Asia/Tokyo', lon: 135.5023 },
    { id: 'beijing', en: 'Beijing', ko: '베이징', tz: 'Asia/Shanghai', lon: 116.4074 },
    { id: 'shanghai', en: 'Shanghai', ko: '상하이', tz: 'Asia/Shanghai', lon: 121.4737 },
    { id: 'hongkong', en: 'Hong Kong', ko: '홍콩', tz: 'Asia/Hong_Kong', lon: 114.1694 },
    { id: 'taipei', en: 'Taipei', ko: '타이베이', tz: 'Asia/Taipei', lon: 121.5654 },
    { id: 'singapore', en: 'Singapore', ko: '싱가포르', tz: 'Asia/Singapore', lon: 103.8198 },
    { id: 'bangkok', en: 'Bangkok', ko: '방콕', tz: 'Asia/Bangkok', lon: 100.5018 },
    { id: 'jakarta', en: 'Jakarta', ko: '자카르타', tz: 'Asia/Jakarta', lon: 106.8456 },
    { id: 'manila', en: 'Manila', ko: '마닐라', tz: 'Asia/Manila', lon: 120.9842 },
    { id: 'hanoi', en: 'Hanoi', ko: '하노이', tz: 'Asia/Ho_Chi_Minh', lon: 105.8342 },
    { id: 'hochiminh', en: 'Ho Chi Minh City', ko: '호찌민', tz: 'Asia/Ho_Chi_Minh', lon: 106.6297 },
    { id: 'kualalumpur', en: 'Kuala Lumpur', ko: '쿠알라룸푸르', tz: 'Asia/Kuala_Lumpur', lon: 101.6869 },
    { id: 'newdelhi', en: 'New Delhi', ko: '뉴델리', tz: 'Asia/Kolkata', lon: 77.209 },
    { id: 'mumbai', en: 'Mumbai', ko: '뭄바이', tz: 'Asia/Kolkata', lon: 72.8777 },
    { id: 'kathmandu', en: 'Kathmandu', ko: '카트만두', tz: 'Asia/Kathmandu', lon: 85.324 },
    { id: 'dhaka', en: 'Dhaka', ko: '다카', tz: 'Asia/Dhaka', lon: 90.4125 },
    { id: 'ulaanbaatar', en: 'Ulaanbaatar', ko: '울란바토르', tz: 'Asia/Ulaanbaatar', lon: 106.9057 },
    { id: 'tashkent', en: 'Tashkent', ko: '타슈켄트', tz: 'Asia/Tashkent', lon: 69.2401 },
    { id: 'dubai', en: 'Dubai', ko: '두바이', tz: 'Asia/Dubai', lon: 55.2708 },
    { id: 'riyadh', en: 'Riyadh', ko: '리야드', tz: 'Asia/Riyadh', lon: 46.6753 },
    { id: 'istanbul', en: 'Istanbul', ko: '이스탄불', tz: 'Europe/Istanbul', lon: 28.9784 },
    { id: 'tehran', en: 'Tehran', ko: '테헤란', tz: 'Asia/Tehran', lon: 51.389 },
    { id: 'telaviv', en: 'Tel Aviv', ko: '텔아비브', tz: 'Asia/Jerusalem', lon: 34.7818 },
    { id: 'london', en: 'London', ko: '런던', tz: 'Europe/London', lon: -0.1276 },
    { id: 'paris', en: 'Paris', ko: '파리', tz: 'Europe/Paris', lon: 2.3522 },
    { id: 'berlin', en: 'Berlin', ko: '베를린', tz: 'Europe/Berlin', lon: 13.405 },
    { id: 'madrid', en: 'Madrid', ko: '마드리드', tz: 'Europe/Madrid', lon: -3.7038 },
    { id: 'rome', en: 'Rome', ko: '로마', tz: 'Europe/Rome', lon: 12.4964 },
    { id: 'amsterdam', en: 'Amsterdam', ko: '암스테르담', tz: 'Europe/Amsterdam', lon: 4.9041 },
    { id: 'zurich', en: 'Zurich', ko: '취리히', tz: 'Europe/Zurich', lon: 8.5417 },
    { id: 'stockholm', en: 'Stockholm', ko: '스톡홀름', tz: 'Europe/Stockholm', lon: 18.0686 },
    { id: 'warsaw', en: 'Warsaw', ko: '바르샤바', tz: 'Europe/Warsaw', lon: 21.0122 },
    { id: 'athens', en: 'Athens', ko: '아테네', tz: 'Europe/Athens', lon: 23.7275 },
    { id: 'moscow', en: 'Moscow', ko: '모스크바', tz: 'Europe/Moscow', lon: 37.6173 },
    { id: 'lisbon', en: 'Lisbon', ko: '리스본', tz: 'Europe/Lisbon', lon: -9.1393 },
    { id: 'cairo', en: 'Cairo', ko: '카이로', tz: 'Africa/Cairo', lon: 31.2357 },
    { id: 'lagos', en: 'Lagos', ko: '라고스', tz: 'Africa/Lagos', lon: 3.3792 },
    { id: 'nairobi', en: 'Nairobi', ko: '나이로비', tz: 'Africa/Nairobi', lon: 36.8219 },
    { id: 'johannesburg', en: 'Johannesburg', ko: '요하네스버그', tz: 'Africa/Johannesburg', lon: 28.0473 },
    { id: 'casablanca', en: 'Casablanca', ko: '카사블랑카', tz: 'Africa/Casablanca', lon: -7.5898 },
    { id: 'newyork', en: 'New York', ko: '뉴욕', tz: 'America/New_York', lon: -74.006 },
    { id: 'losangeles', en: 'Los Angeles', ko: '로스앤젤레스', tz: 'America/Los_Angeles', lon: -118.2437 },
    { id: 'chicago', en: 'Chicago', ko: '시카고', tz: 'America/Chicago', lon: -87.6298 },
    { id: 'toronto', en: 'Toronto', ko: '토론토', tz: 'America/Toronto', lon: -79.3832 },
    { id: 'vancouver', en: 'Vancouver', ko: '밴쿠버', tz: 'America/Vancouver', lon: -123.1207 },
    { id: 'mexicocity', en: 'Mexico City', ko: '멕시코시티', tz: 'America/Mexico_City', lon: -99.1332 },
    { id: 'saopaulo', en: 'São Paulo', ko: '상파울루', tz: 'America/Sao_Paulo', lon: -46.6333 },
    { id: 'buenosaires', en: 'Buenos Aires', ko: '부에노스아이레스', tz: 'America/Argentina/Buenos_Aires', lon: -58.3816 },
    { id: 'santiago', en: 'Santiago', ko: '산티아고', tz: 'America/Santiago', lon: -70.6693 },
    { id: 'lima', en: 'Lima', ko: '리마', tz: 'America/Lima', lon: -77.0428 },
    { id: 'bogota', en: 'Bogotá', ko: '보고타', tz: 'America/Bogota', lon: -74.0721 },
    { id: 'sydney', en: 'Sydney', ko: '시드니', tz: 'Australia/Sydney', lon: 151.2093 },
    { id: 'melbourne', en: 'Melbourne', ko: '멜버른', tz: 'Australia/Melbourne', lon: 144.9631 },
    { id: 'auckland', en: 'Auckland', ko: '오클랜드', tz: 'Pacific/Auckland', lon: 174.7633 },
    { id: 'honolulu', en: 'Honolulu', ko: '호놀룰루', tz: 'Pacific/Honolulu', lon: -157.8583 }
  ];

  var state = { lang: 'ko', result: null, city: CITIES[0], resultCity: CITIES[0], preview: false };

  /* ── 작은 도구 ────────────────────────────────────────────── */
  function $(id) { return document.getElementById(id); }
  function dict() { return I[state.lang] || I.en; }
  function ui(key) { var d = dict().ui; return (d && d[key]) || (I.en.ui && I.en.ui[key]) || key; }
  function vars(text, map) {
    return String(text).replace(/\{(\w+)\}/g, function (m, k) { return map[k] !== undefined ? map[k] : m; });
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function localeTag() { return state.lang === 'zh-tw' ? 'zh-TW' : state.lang; }
  function cityLabel(city) { return state.lang === 'ko' ? city.ko : city.en; }
  function cityById(id) {
    for (var i = 0; i < CITIES.length; i++) if (CITIES[i].id === id) return CITIES[i];
    return CITIES[0];
  }

  function fmtTz(iso, tz) {
    try {
      return new Intl.DateTimeFormat(localeTag(), {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false
      }).format(new Date(iso));
    } catch (e) { return iso; }
  }
  function fmtOffset(min) {
    var sign = min < 0 ? '-' : '+';
    var abs = Math.abs(min);
    var h = Math.floor(abs / 60), m = Math.round(abs % 60);
    return 'UTC' + sign + (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }
  function prettySolar(s) { return String(s).replace('T', ' '); }

  /* ── 언어 ─────────────────────────────────────────────────── */
  function normLang(raw) {
    var v = String(raw || 'en').toLowerCase();
    if (v.indexOf('zh') === 0) return /tw|hk|hant/.test(v) ? 'zh-tw' : 'zh';
    var base = v.split('-')[0];
    return I[base] ? base : 'en';
  }

  function buildLangSelect() {
    var sel = $('langSelect');
    sel.innerHTML = '';
    LANGS.forEach(function (code) {
      var o = document.createElement('option');
      o.value = code;
      o.textContent = I[code].name;
      sel.appendChild(o);
    });
    sel.value = state.lang;
  }

  function applyLang(code, keepResult) {
    state.lang = I[code] ? code : 'en';
    document.documentElement.lang = state.lang === 'zh-tw' ? 'zh-Hant' : state.lang;
    try { localStorage.setItem('ksajoo.lang', state.lang); } catch (e) {}
    $('langSelect').value = state.lang;

    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute('data-i18n');
      if (ui(key)) nodes[i].textContent = ui(key);
    }
    document.title = 'K-Sajoo — ' + ui('brandSub');

    buildPlaceSelect();
    if (state.result && keepResult) render(state.result, true);
  }

  function buildPlaceSelect() {
    var sel = $('place');
    var current = sel.value || state.city.id;
    var priority = ['seoul', 'tokyo', 'newyork', 'london', 'beijing', 'shanghai', 'taipei', 'hongkong',
      'singapore', 'bangkok', 'hanoi', 'jakarta', 'manila', 'sydney', 'paris', 'berlin', 'losangeles',
      'toronto', 'dubai', 'istanbul'];
    function rank(c) { var i = priority.indexOf(c.id); return i < 0 ? 99 : i; }
    sel.innerHTML = '';
    CITIES.slice().sort(function (a, b) {
      var ra = rank(a), rb = rank(b);
      if (ra !== rb) return ra - rb;
      return cityLabel(a).localeCompare(cityLabel(b), localeTag());
    }).forEach(function (c) {
      var o = document.createElement('option');
      o.value = c.id;
      o.textContent = cityLabel(c);
      sel.appendChild(o);
    });
    sel.value = current;
    state.city = cityById(sel.value);
  }

  /* ── 계산 실행 ────────────────────────────────────────────── */
  function run(scroll) {
    var d = new Date();
    var dateVal = $('birthDate').value;
    var timeVal = $('birthTime').value;
    var unknown = $('timeUnknown').checked;
    var err = $('formError');
    err.hidden = true;

    if (!dateVal) { showError(ui('errDate')); return; }
    var year = parseInt(dateVal.slice(0, 4), 10);
    if (year < 1900 || year > 2100) { showError(ui('errRange')); return; }
    if (!unknown && !timeVal) { showError(ui('errTime')); return; }

    var city = cityById($('place').value);
    state.city = city;

    var basis = document.querySelector('input[name="timeBasis"]:checked');
    var result = K.compute({
      birthDate: dateVal,
      birthTime: unknown ? null : timeVal,
      timeUnknown: unknown,
      timezone: city.tz,
      longitude: city.lon,
      trueSolarTime: !basis || basis.value !== 'standard',
      calendarType: 'solar',
      gender: $('gender').value || null,
      jasi: $('jasi').value
    });

    if (!result.ok) {
      showError(result.error === 'out_of_range' ? ui('errRange') : ui('errDate'));
      return;
    }
    state.resultCity = city;
    render(result);
    if (scroll) $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function showError(msg) {
    var err = $('formError');
    err.textContent = msg;
    err.hidden = false;
  }

  /* ── 그리기 ───────────────────────────────────────────────── */
  function render(result, keepScroll) {
    state.result = result;
    var d = dict(), L = d.ui;

    var panel = $('result');
    panel.hidden = false;

    var when = result.meta.birthDate + (result.meta.birthTime ? ' · ' + result.meta.birthTime : '') +
      ' · ' + cityLabel(state.resultCity);
    $('resultSub').textContent = when;

    var notes = [result.meta.trueSolarTime ? L.noteSolar : L.noteStandard];
    if (result.meta.timeUnknown) notes.push(L.unknownTimeNote);
    if (result.meta.term.nearBoundary) notes.push(L.noteBoundary);
    var noteEl = $('resultNote');
    noteEl.textContent = notes.join(' ');
    noteEl.hidden = notes.length === 0;

    /* 기둥 */
    var pillars = $('pillars');
    pillars.innerHTML = '';
    ['year', 'month', 'day', 'hour'].forEach(function (key, idx) {
      pillars.appendChild(pillarCard(key, result.pillars[key], idx === 2, d, L));
    });

    /* 일간 */
    var dm = result.dayMaster;
    var eIdx = ELEM_INDEX[dm.element];
    $('dmName').textContent = d.stems[dm.index] + ' · ' + d.elements[eIdx];
    $('dmName').className = 'dm-name el-' + dm.element;
    $('dmStory').textContent = d.stemImages[dm.index] + ' — ' + d.elementStories[eIdx];

    /* 오행 */
    var box = $('elements');
    box.innerHTML = '';
    ELEM_ORDER.forEach(function (name) {
      var row = el('div', 'el-row el-' + name);
      var nameEl = el('span', 'el-name', d.elements[ELEM_INDEX[name]]);
      var bar = el('div', 'el-bar');
      var fill = document.createElement('i');
      fill.style.width = Math.max(2, result.fiveElements.percent[name]) + '%';
      bar.appendChild(fill);
      var count = el('span', 'el-count', String(result.fiveElements.counts[name]));
      row.appendChild(nameEl); row.appendChild(bar); row.appendChild(count);
      box.appendChild(row);
    });

    var counts = result.fiveElements.counts;
    var absent = result.fiveElements.absent;
    var maxC = 0, minC = 99;
    ELEM_ORDER.forEach(function (e) { maxC = Math.max(maxC, counts[e]); minC = Math.min(minC, counts[e]); });
    var balance;
    if (!absent && maxC - minC <= 1) {
      balance = d.balance.steady;
    } else {
      balance = vars(d.balance.dominant, { element: d.elements[ELEM_INDEX[result.fiveElements.dominant]] });
      if (absent) balance += ' ' + vars(d.balance.absent, { element: d.elements[ELEM_INDEX[absent]] });
    }
    $('balanceLine').textContent = balance;

    /* 십성 */
    var chips = $('tenGods');
    chips.innerHTML = '';
    K.TEN_GODS.forEach(function (key, i) {
      var n = result.tenGods.counts[key] || 0;
      if (!n) return;
      var chip = el('span', 'chip');
      chip.appendChild(el('b', null, d.tenGods[i]));
      chip.appendChild(el('span', null, '×' + n));
      chips.appendChild(chip);
    });

    /* 대운 */
    var daeunBlock = $('daeunBlock');
    if (result.daeun) {
      daeunBlock.hidden = false;
      $('daeunDir').textContent = (result.daeun.forward ? L.daeunForward : L.daeunBackward) + ' · ' +
        vars(L.daeunStart, { age: result.daeun.startAge });
      var listEx = $('daeunList');
      listEx.innerHTML = '';
      result.daeun.list.forEach(function (it) {
        var li = document.createElement('li');
        li.appendChild(el('span', 'da-age', vars(L.daeunAge, { age: it.startAge })));
        var nm = el('span', 'da-name', d.stems[it.stem]);
        nm.classList.add('el-' + K.ELEMENTS[K.STEM_ELEMENT[it.stem]]);
        li.appendChild(nm);
        li.appendChild(el('span', 'da-branch', d.animals[it.branch]));
        li.appendChild(el('span', 'da-god', d.tenGods[GOD_INDEX[it.tenGod]] || ''));
        listEx.appendChild(li);
      });
    } else {
      daeunBlock.hidden = true;
    }

    /* 근거 */
    var dl = $('details');
    dl.innerHTML = '';
    function row(label, value) {
      var wrap = document.createElement('div');
      wrap.appendChild(el('dt', null, label));
      wrap.appendChild(el('dd', null, value));
      dl.appendChild(wrap);
    }
    row(L.detailUtc, fmtTz(result.meta.utc, 'UTC'));
    row(L.detailKst, fmtTz(result.meta.kst, 'UTC') + ' (GMT+9)');
    row(L.detailSolar, prettySolar(result.meta.solarTime));
    row(L.detailOffset, fmtOffset(result.meta.offsetMinutes));
    row(L.detailTerm, fmtTz(result.meta.term.at, result.meta.timezone) + ' (' + cityLabel(state.resultCity) + ')');

    if (!keepScroll && !state.preview) {
      /* 첫 결과에서만 안내 없이 그대로 */
    }
    window.__KSAJOO_LAST = result;
  }

  function pillarCard(key, p, isDay, d, L) {
    var card = el('div', 'pillar');
    var labels = { year: L.pillarYear, month: L.pillarMonth, day: L.pillarDay, hour: L.pillarHour };
    card.appendChild(el('p', 'pillar-label', labels[key]));
    if (!p) {
      card.classList.add('is-empty');
      card.appendChild(el('p', 'pillar-stem', L.hourUnknown));
      card.appendChild(el('p', 'pillar-branch', '—'));
      return card;
    }
    var stem = el('p', 'pillar-stem', d.stems[p.stem]);
    stem.classList.add('el-' + p.stemElement);
    card.appendChild(stem);
    card.appendChild(el('p', 'pillar-branch', d.animals[p.branch]));
    var god = isDay ? L.selfGod : d.tenGods[GOD_INDEX[p.tenGod]];
    card.appendChild(el('p', 'pillar-god', god));
    return card;
  }

  /* ── 요약 텍스트 ──────────────────────────────────────────── */
  function summaryText(result) {
    var d = dict(), L = d.ui;
    var lines = [];
    lines.push('K-Sajoo · ' + L.summaryTitle);
    lines.push(result.meta.birthDate + (result.meta.birthTime ? ' ' + result.meta.birthTime : '') + ' · ' + cityLabel(state.resultCity));
    var names = [];
    ['year', 'month', 'day', 'hour'].forEach(function (k) {
      var p = result.pillars[k];
      if (p) names.push(d.stems[p.stem] + ' ' + d.animals[p.branch]);
    });
    lines.push(names.join(' · '));
    lines.push(L.dayMasterLabel + ': ' + d.stems[result.dayMaster.index]);
    var elLine = ELEM_ORDER.map(function (e) { return d.elements[ELEM_INDEX[e]] + ' ' + result.fiveElements.counts[e]; }).join(' · ');
    lines.push(L.elementsTitle + ': ' + elLine);
    lines.push('https://ajak-75.github.io/k-sajoo/');
    return lines.join('\n');
  }

  function copySummary() {
    if (!state.result) return;
    var text = summaryText(state.result);
    var done = function () {
      var btn = $('copyBtn');
      var old = ui('copy');
      btn.textContent = ui('copied');
      setTimeout(function () { btn.textContent = old; }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(fallback);
    } else fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.left = '-9999px';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  /* ── PNG 결과 카드 ────────────────────────────────────────── */
  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function wrap(ctx, text, x, y, maxW, lineH, maxLines) {
    var words = String(text).split(' ');
    var line = '', lines = [];
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = words[i]; }
      else line = test;
    }
    if (line) lines.push(line);
    if (maxLines && lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] = lines[maxLines - 1].replace(/.{1,2}$/, '…');
    }
    for (var j = 0; j < lines.length; j++) ctx.fillText(lines[j], x, y + j * lineH);
    return lines.length;
  }

  function drawCard(canvas, result) {
    var d = dict(), L = d.ui;
    var W = 1080, H = 1350;
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');

    var bg = cssVar('--bg', '#efe3cd');
    var ink = cssVar('--ink', '#241c16');
    var soft = cssVar('--ink-soft', '#6d5a45');
    var line = cssVar('--line', 'rgba(70,48,24,.2)');
    var lineStrong = cssVar('--line-strong', 'rgba(70,48,24,.4)');
    var accent = cssVar('--accent', '#8b2f26');
    var seal = cssVar('--seal', '#a8322a');
    var sealInk = cssVar('--seal-ink', '#f8eddb');
    var display = cssVar('--font-display', 'serif');
    var body = cssVar('--font-body', 'sans-serif');

    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    /* 한지 결 */
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = line; ctx.lineWidth = 1;
    for (var y = 0; y < H; y += 5) {
      ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke();
    }
    ctx.restore();

    ctx.strokeStyle = lineStrong; ctx.lineWidth = 2; ctx.strokeRect(54, 54, W - 108, H - 108);
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.strokeRect(66, 66, W - 132, H - 132);

    /* 브랜드 + 낙관 */
    ctx.fillStyle = seal;
    roundRect(ctx, 96, 96, 92, 92, 10); ctx.fill();
    ctx.fillStyle = sealInk;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 34px ' + display;
    ctx.fillText(state.lang === 'ko' ? '사주' : 'SAJOO', 142, 144);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = ink; ctx.font = '700 40px ' + display;
    ctx.fillText('K-Sajoo', 208, 136);
    ctx.fillStyle = soft; ctx.font = '400 22px ' + body;
    ctx.fillText(L.brandSub, 208, 172);

    /* 생년월일 */
    ctx.fillStyle = soft; ctx.font = '400 24px ' + body;
    var when = result.meta.birthDate + (result.meta.birthTime ? ' · ' + result.meta.birthTime : '') + ' · ' + cityLabel(state.resultCity);
    ctx.fillText(when, 96, 250);

    /* 기둥 */
    var keys = ['year', 'month', 'day', 'hour'];
    var labels = { year: L.pillarYear, month: L.pillarMonth, day: L.pillarDay, hour: L.pillarHour };
    var colW = (W - 192) / 4;
    var baseY = 300;
    ctx.strokeStyle = line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(96, baseY); ctx.lineTo(W - 96, baseY); ctx.stroke();

    keys.forEach(function (k, i) {
      var p = result.pillars[k];
      var cx = 96 + colW * i + colW / 2;
      ctx.textAlign = 'center';
      ctx.fillStyle = soft; ctx.font = '600 20px ' + body;
      ctx.fillText(labels[k], cx, baseY + 36);

      if (p) {
        var col = cssVar('--el-' + p.stemElement, ink);
        ctx.fillStyle = col; ctx.font = '700 46px ' + display;
        ctx.fillText(d.stems[p.stem], cx, baseY + 108);
        ctx.fillStyle = ink; ctx.font = '400 26px ' + body;
        ctx.fillText(d.animals[p.branch], cx, baseY + 152);
        ctx.fillStyle = soft; ctx.font = '400 20px ' + body;
        ctx.fillText(i === 2 ? L.selfGod : d.tenGods[GOD_INDEX[p.tenGod]], cx, baseY + 190);
      } else {
        ctx.fillStyle = soft; ctx.font = '400 34px ' + body;
        ctx.fillText(L.hourUnknown, cx, baseY + 108);
      }
      ctx.strokeStyle = line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(96 + colW * i, baseY + 4); ctx.lineTo(96 + colW * i, baseY + 210); ctx.stroke();
    });
    ctx.strokeStyle = lineStrong; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(96, baseY + 220); ctx.lineTo(W - 96, baseY + 220); ctx.stroke();

    /* 일간 */
    ctx.textAlign = 'left';
    ctx.fillStyle = soft; ctx.font = '600 20px ' + body;
    ctx.fillText(L.dayMasterLabel, 96, 588);
    var dm = result.dayMaster;
    ctx.fillStyle = cssVar('--el-' + dm.element, ink); ctx.font = '700 54px ' + display;
    ctx.fillText(d.stems[dm.index] + ' · ' + d.elements[ELEM_INDEX[dm.element]], 96, 646);
    ctx.fillStyle = ink; ctx.font = '400 26px ' + body;
    var storyLines = wrap(ctx, d.stemImages[dm.index] + ' — ' + d.elementStories[ELEM_INDEX[dm.element]], 96, 700, W - 192, 40, 3);

    /* 오행 */
    var ey = 700 + storyLines * 40 + 48;
    ctx.fillStyle = soft; ctx.font = '600 20px ' + body;
    ctx.fillText(L.elementsTitle, 96, ey - 18);

    ELEM_ORDER.forEach(function (name, i) {
      var rowY = ey + 14 + i * 46;
      var label = d.elements[ELEM_INDEX[name]];
      ctx.fillStyle = ink; ctx.font = '400 22px ' + body;
      ctx.textAlign = 'left';
      ctx.fillText(label, 96, rowY + 20);

      var barX = 96 + 190, barW = W - 192 - 190 - 80;
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      roundRect(ctx, barX, rowY, barW, 10, 5); ctx.fill();
      var pct = result.fiveElements.percent[name];
      ctx.fillStyle = cssVar('--el-' + name, ink);
      roundRect(ctx, barX, rowY, Math.max(4, barW * pct / 100), 10, 5); ctx.fill();

      ctx.fillStyle = soft; ctx.font = '400 20px ' + body;
      ctx.textAlign = 'right';
      ctx.fillText(String(result.fiveElements.counts[name]), W - 96, rowY + 20);
      ctx.textAlign = 'left';
    });

    /* 꼬리 */
    ctx.strokeStyle = line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(96, H - 150); ctx.lineTo(W - 96, H - 150); ctx.stroke();
    ctx.fillStyle = soft; ctx.font = '400 20px ' + body;
    ctx.textAlign = 'left';
    ctx.fillText('ajak-75.github.io/k-sajoo', 96, H - 104);
    ctx.textAlign = 'right';
    ctx.fillText('Ajak Studio', W - 96, H - 104);
    ctx.textAlign = 'center';
    ctx.fillStyle = accent; ctx.font = '600 18px ' + body;
    ctx.fillText(L.heroEyebrow, W / 2, H - 64);
    ctx.textAlign = 'left';
  }

  function downloadCard() {
    if (!state.result) return;
    var canvas = document.createElement('canvas');
    try { drawCard(canvas, state.result); } catch (e) { return; }
    var name = 'k-sajoo-' + state.result.meta.birthDate + '.png';
    function save(blob) {
      if (navigator.msSaveBlob) { navigator.msSaveBlob(blob, name); return; }
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
    }
    if (canvas.toBlob) canvas.toBlob(save, 'image/png');
    else {
      var data = canvas.toDataURL('image/png');
      var a = document.createElement('a');
      a.href = data; a.download = name; a.click();
    }
  }

  /* ── 정책 모달 ────────────────────────────────────────────── */
  function openPolicy(kind) {
    var d = dict();
    var titles = { terms: ui('terms'), refund: ui('refund'), privacy: ui('privacy') };
    $('policyTitle').textContent = titles[kind] || '';
    $('policyBody').textContent = (d.policies && d.policies[kind]) || '';
    $('policyModal').hidden = false;
    $('policyClose').focus();
  }

  /* ── 시작 ─────────────────────────────────────────────────── */
  function init() {
    var params = new URLSearchParams(location.search);
    var langParam = params.get('lang');
    var saved = null;
    try { saved = localStorage.getItem('ksajoo.lang'); } catch (e) {}
    state.lang = normLang(langParam || saved || (navigator.languages && navigator.languages[0]) || navigator.language);

    var theme = params.get('theme');
    if (theme && ['classic', 'pastel', 'boutique'].indexOf(theme) >= 0) {
      document.documentElement.setAttribute('data-theme', theme);
    }

    state.preview = params.get('preview') === '1';
    buildLangSelect();
    applyLang(state.lang, false);

    /* 기본 출생지: 기기 타임존과 같은 도시 */
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      for (var i = 0; i < CITIES.length; i++) if (CITIES[i].tz === tz) { $('place').value = CITIES[i].id; break; }
    } catch (e) {}
    state.city = cityById($('place').value);

    $('langSelect').addEventListener('change', function (e) { applyLang(e.target.value, true); });
    $('place').addEventListener('change', function (e) { state.city = cityById(e.target.value); });

    var timeInput = $('birthTime');
    $('timeUnknown').addEventListener('change', function (e) {
      timeInput.disabled = e.target.checked;
      if (e.target.checked) timeInput.value = '';
    });

    $('sajooForm').addEventListener('submit', function (e) {
      e.preventDefault();
      run(true);
    });

    $('downloadBtn').addEventListener('click', downloadCard);
    $('copyBtn').addEventListener('click', copySummary);

    document.querySelectorAll('[data-policy]').forEach(function (btn) {
      btn.addEventListener('click', function () { openPolicy(btn.getAttribute('data-policy')); });
    });
    $('policyClose').addEventListener('click', function () { $('policyModal').hidden = true; });
    $('policyModal').addEventListener('click', function (e) {
      if (e.target === $('policyModal')) $('policyModal').hidden = true;
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') $('policyModal').hidden = true;
    });

    /* 시안 미리보기 */
    if (state.preview) {
      document.body.classList.add('is-preview');
      var labels = {
        classic: '시안 1 · 조선 서책 클래식',
        pastel: '시안 2 · 모던 민화 (동백·호랑이·달)',
        boutique: '시안 3 · 모던 K-부티크 (일월오봉도)'
      };
      var lab = $('previewLabel');
      lab.textContent = labels[document.documentElement.getAttribute('data-theme')] || '';
      lab.hidden = false;

      $('birthDate').value = '1990-05-20';
      $('birthTime').value = '14:30';
      $('place').value = 'seoul';
      $('gender').value = 'male';
      state.city = cityById('seoul');
      if (params.get('view') === 'form') {
        document.body.classList.add('show-form');
      } else {
        run(false);
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
