/* SnapRate — app.js
   서버 없는 정적 앱: 환율(open.er-api.com) + localStorage 캐시 + Tesseract.js(CDN) OCR */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var t = function (key) { return (DICT[state.lang] && DICT[state.lang][key]) || DICT.en[key] || key; };

  var DICT = (window.I18N && window.I18N.strings) || { en: {} };
  var LANGS = (window.I18N && window.I18N.langs) || [{ code: "en", name: "English", dir: "ltr" }];

  /* ── 통화 목록 ───────────────────────────── */
  var CUR = [
    ["KRW", "🇰🇷"], ["USD", "🇺🇸"], ["JPY", "🇯🇵"], ["CNY", "🇨🇳"], ["TWD", "🇹🇼"], ["EUR", "🇪🇺"],
    ["THB", "🇹🇭"], ["VND", "🇻🇳"], ["SGD", "🇸🇬"], ["GBP", "🇬🇧"], ["AUD", "🇦🇺"], ["CAD", "🇨🇦"],
    ["HKD", "🇭🇰"], ["PHP", "🇵🇭"], ["MYR", "🇲🇾"], ["IDR", "🇮🇩"], ["CHF", "🇨🇭"], ["NZD", "🇳🇿"],
    ["INR", "🇮🇳"], ["AED", "🇦🇪"], ["TRY", "🇹🇷"], ["MXN", "🇲🇽"], ["BRL", "🇧🇷"], ["ZAR", "🇿🇦"],
    ["SEK", "🇸🇪"], ["NOK", "🇳🇴"], ["DKK", "🇩🇰"], ["PLN", "🇵🇱"], ["CZK", "🇨🇿"], ["HUF", "🇭🇺"],
    ["RON", "🇷🇴"], ["BGN", "🇧🇬"], ["ILS", "🇮🇱"], ["SAR", "🇸🇦"], ["QAR", "🇶🇦"], ["RUB", "🇷🇺"],
    ["KHR", "🇰🇭"], ["LAK", "🇱🇦"], ["MMK", "🇲🇲"], ["PKR", "🇵🇰"], ["BDT", "🇧🇩"], ["EGP", "🇪🇬"],
    ["CLP", "🇨🇱"], ["PEN", "🇵🇪"], ["COP", "🇨🇴"], ["ISK", "🇮🇸"], ["KZT", "🇰🇿"], ["UZS", "🇺🇿"],
    ["NPR", "🇳🇵"], ["LKR", "🇱🇰"]
  ].map(function (p) { return { code: p[0], flag: p[1] }; });

  var FALLBACK = {
    USD: 1, KRW: 1450, JPY: 152, CNY: 7.12, TWD: 31.6, EUR: 0.86, THB: 32.6, VND: 26100,
    SGD: 1.30, GBP: 0.76, AUD: 1.52, CAD: 1.39, HKD: 7.78, PHP: 58.4, MYR: 4.18, IDR: 16650,
    CHF: 0.80, NZD: 1.66, INR: 89.2, AED: 3.6725, TRY: 42.2, MXN: 18.4, BRL: 5.38, ZAR: 17.4,
    SEK: 9.42, NOK: 10.1, DKK: 6.42, PLN: 3.62, CZK: 20.7, HUF: 329, RON: 4.28, BGN: 1.68,
    ILS: 3.42, SAR: 3.75, QAR: 3.64, RUB: 92, KHR: 4060, LAK: 21600, MMK: 2100, PKR: 281,
    BDT: 122, EGP: 48.1, CLP: 948, PEN: 3.72, COP: 3920, ISK: 137, KZT: 520, UZS: 12600,
    NPR: 143, LKR: 300
  };

  var ZERO_DEC = { KRW: 1, JPY: 1, VND: 1, IDR: 1, CLP: 1, ISK: 1, HUF: 1, TWD: 1, KHR: 1, LAK: 1, MMK: 1, UZS: 1 };
  var CACHE_MS = 12 * 60 * 60 * 1000;

  var LS = { home: "sr.home", local: "sr.local", lang: "sr.lang", budget: "sr.budget", exp: "sr.exp", rates: "sr.rates", tax: "sr.tax" };

  /* ── 상태 ────────────────────────────────── */
  var state = {
    lang: "ko", locale: "ko", home: "KRW", local: "JPY", side: "local",
    input: "", rates: FALLBACK, rateMeta: { source: "fallback", ts: 0 },
    budget: 0, expenses: [], taxOpen: false
  };

  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 사생활 모드 */ } }

  function curInfo(code) {
    for (var i = 0; i < CUR.length; i++) if (CUR[i].code === code) return CUR[i];
    return { code: code, flag: "🏳️" };
  }

  var nameCache = {};
  function curName(code) {
    var key = state.locale + "|" + code;
    if (nameCache[key]) return nameCache[key];
    var n = code;
    try {
      if (typeof Intl !== "undefined" && Intl.DisplayNames) {
        n = new Intl.DisplayNames([state.locale], { type: "currency" }).of(code) || code;
      }
    } catch (e) { n = code; }
    nameCache[key] = n;
    return n;
  }

  /* ── 숫자 포맷 ───────────────────────────── */
  function decOf(code) { return ZERO_DEC[code] ? 0 : 2; }

  function fmt(value, code) {
    var d = decOf(code);
    var v = isFinite(value) ? value : 0;
    try {
      return new Intl.NumberFormat(state.locale, {
        style: "currency", currency: code, currencyDisplay: "narrowSymbol",
        minimumFractionDigits: d, maximumFractionDigits: d
      }).format(v);
    } catch (e) {
      return num(v) + " " + code;
    }
  }

  function num(v, maxDec) {
    try {
      return new Intl.NumberFormat(state.locale, { maximumFractionDigits: maxDec == null ? 0 : maxDec }).format(v);
    } catch (e) { return String(Math.round(v)); }
  }

  function fmtRate(v) {
    var d = v < 1 ? 4 : v < 10 ? 3 : v < 1000 ? 2 : 0;
    return num(v, d);
  }

  function groupInput(raw) {
    if (!raw) return "0";
    var parts = raw.split(".");
    var gi = (parts[0] || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.length > 1 ? gi + "." + parts[1] : gi;
  }

  function roundFor(v, code) {
    var d = decOf(code);
    var m = Math.pow(10, d);
    return Math.round(v * m) / m;
  }

  /* ── 환율 ────────────────────────────────── */
  function homePerLocal() {
    var r = state.rates || FALLBACK;
    var a = r[state.home], b = r[state.local];
    if (!a || !b) return 1;
    return a / b;
  }

  function readCache() {
    try {
      var raw = JSON.parse(safeGet(LS.rates) || "null");
      if (raw && raw.rates && raw.ts) return raw;
    } catch (e) {}
    return null;
  }

  function applyRates(rates, source, ts) {
    state.rates = rates;
    state.rateMeta = { source: source, ts: ts || 0 };
    renderRate();
    renderDisplay();
    renderBudget();
    renderExpenses();
  }

  function rateLabel() {
    if (state.rateMeta.source === "live") return t("rateLive");
    if (state.rateMeta.source === "cache" || state.rateMeta.source === "stale") return t("rateCached");
    return t("rateFallback");
  }

  function timeText(ts) {
    if (!ts) return "";
    var d = new Date(ts), now = new Date();
    var sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    try {
      if (sameDay) return new Intl.DateTimeFormat(state.locale, { hour: "2-digit", minute: "2-digit" }).format(d);
      return new Intl.DateTimeFormat(state.locale, { month: "numeric", day: "numeric" }).format(d);
    } catch (e) { return ""; }
  }

  var rateBusy = false;
  function loadRates(force) {
    var cache = readCache();
    var fresh = cache && (Date.now() - cache.ts) < CACHE_MS;

    if (cache && !force && fresh) { applyRates(cache.rates, "cache", cache.ts); return; }
    if (rateBusy) return;
    rateBusy = true;
    setSpin(true);

    var ctl = null, timer = null;
    var done = function () {
      rateBusy = false; setSpin(false);
      if (timer) { clearTimeout(timer); timer = null; }
    };

    try { ctl = new AbortController(); } catch (e) { ctl = null; }

    var opts = { cache: "no-store" };
    if (ctl) {
      opts.signal = ctl.signal;
      timer = setTimeout(function () { try { ctl.abort(); } catch (e) {} }, 9000);
    }

    fetch("https://open.er-api.com/v6/latest/USD", opts)
      .then(function (res) {
        if (!res.ok) throw new Error("http " + res.status);
        return res.json();
      })
      .then(function (j) {
        if (!j || j.result !== "success" || !j.rates || !j.rates.USD) throw new Error("bad payload");
        var ts = j.time_last_update_unix ? j.time_last_update_unix * 1000 : Date.now();
        safeSet(LS.rates, JSON.stringify({ rates: j.rates, ts: ts }));
        applyRates(j.rates, "live", ts);
        done();
      })
      .catch(function () {
        if (cache) applyRates(cache.rates, "stale", cache.ts);
        else applyRates(FALLBACK, "fallback", 0);
        done();
      });
  }

  function setSpin(on) {
    var b = $("rateRefresh");
    if (b) b.classList.toggle("is-spin", !!on);
  }

  /* ── 언어 ────────────────────────────────── */
  function detectedLang() {
    var saved = safeGet(LS.lang);
    if (saved && DICT[saved]) return saved;
    var list = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || "en"];
    for (var i = 0; i < list.length; i++) {
      var raw = String(list[i] || "").toLowerCase();
      if (DICT[raw]) return raw;
      var base = raw.split("-")[0];
      if (base === "zh") return /tw|hk|mo/.test(raw) ? "zh-TW" : "zh-CN";
      if (DICT[base]) return base;
    }
    return "en";
  }

  function applyLang(code) {
    var lang = null;
    for (var i = 0; i < LANGS.length; i++) if (LANGS[i].code === code) lang = LANGS[i];
    if (!lang) lang = { code: "en", name: "English", dir: "ltr" };
    state.lang = lang.code;
    state.locale = lang.code;
    safeSet(LS.lang, lang.code);

    document.documentElement.lang = lang.code;
    document.documentElement.dir = lang.dir;

    var dict = DICT[lang.code] || DICT.en;
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"), function (el) {
      var k = el.getAttribute("data-i18n");
      if (dict[k]) el.textContent = dict[k];
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n-aria]"), function (el) {
      var k = el.getAttribute("data-i18n-aria");
      if (dict[k]) el.setAttribute("aria-label", dict[k]);
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n-ph]"), function (el) {
      var k = el.getAttribute("data-i18n-ph");
      if (dict[k]) el.setAttribute("placeholder", dict[k]);
    });

    var sel = $("langSelect");
    if (sel) sel.value = lang.code;
    updateBudgetCurLabel();
    renderRate();
    renderDisplay();
    renderBudget();
    renderExpenses();
    renderTax();
  }

  /* ── 통화 선택 ───────────────────────────── */
  function defaultHome(lang) {
    var map = { ko: "KRW", ja: "JPY", "zh-CN": "CNY", "zh-TW": "TWD", es: "EUR", fr: "EUR", de: "EUR", it: "EUR", pt: "EUR", ru: "RUB", vi: "VND", th: "THB", id: "IDR", ar: "AED", hi: "INR" };
    return map[lang] || "USD";
  }

  function guessLocal() {
    var tz = "";
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
    var map = {
      "Asia/Seoul": "KRW", "Asia/Tokyo": "JPY", "Asia/Shanghai": "CNY", "Asia/Taipei": "TWD",
      "Asia/Hong_Kong": "HKD", "Asia/Bangkok": "THB", "Asia/Ho_Chi_Minh": "VND", "Asia/Singapore": "SGD",
      "Asia/Manila": "PHP", "Asia/Kuala_Lumpur": "MYR", "Asia/Jakarta": "IDR", "Asia/Kolkata": "INR",
      "Asia/Dubai": "AED", "Europe/London": "GBP", "Europe/Paris": "EUR", "Europe/Berlin": "EUR",
      "Europe/Madrid": "EUR", "Europe/Rome": "EUR", "Europe/Lisbon": "EUR", "America/New_York": "USD",
      "America/Los_Angeles": "USD", "America/Toronto": "CAD", "Australia/Sydney": "AUD"
    };
    return map[tz] || "";
  }

  function pickDefaults() {
    var lang = detectedLang();
    var home = safeGet(LS.home) || defaultHome(lang);
    var local = safeGet(LS.local) || guessLocal();
    if (!curInfo(home).code) home = "USD";
    if (!local || local === home) local = home === "KRW" ? "JPY" : (home === "USD" ? "EUR" : "USD");
    state.home = home;
    state.local = local;
  }

  function renderCurrencies() {
    var h = curInfo(state.home), l = curInfo(state.local);
    $("homeFlag").textContent = h.flag;
    $("homeCode").textContent = h.code;
    $("localFlag").textContent = l.flag;
    $("localCode").textContent = l.code;
    $("segLocalCode").textContent = l.code;
    $("segHomeCode").textContent = h.code;
    updateBudgetCurLabel();
  }

  function updateBudgetCurLabel() {
    var el = $("budgetCur");
    if (el) el.textContent = state.home;
  }

  var sheetRole = "home";
  var lastFocus = null;

  function openSheet(id) {
    lastFocus = document.activeElement;
    $(id).hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeSheet(id) {
    $(id).hidden = true;
    if ($("curSheet").hidden && $("scanSheet").hidden) document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }

  function buildCurList(q) {
    var list = $("curList");
    var query = (q || "").trim().toLowerCase();
    list.innerHTML = "";
    CUR.slice().sort(function (a, b) { return a.code < b.code ? -1 : 1; }).forEach(function (c) {
      var name = curName(c.code);
      if (query && c.code.toLowerCase().indexOf(query) < 0 && String(name).toLowerCase().indexOf(query) < 0) return;
      var active = (sheetRole === "home" ? state.home : state.local) === c.code;
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cur-item" + (active ? " is-on" : "");
      btn.setAttribute("data-code", c.code);

      var flag = document.createElement("span");
      flag.className = "ci-flag"; flag.textContent = c.flag;
      var code = document.createElement("span");
      code.className = "ci-code"; code.textContent = c.code;
      var nm = document.createElement("span");
      nm.className = "ci-name"; nm.textContent = name;
      var check = document.createElement("span");
      check.className = "ci-check";
      check.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4.5 4.5L19 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';

      btn.appendChild(flag); btn.appendChild(code); btn.appendChild(nm); btn.appendChild(check);
      btn.addEventListener("click", function () { chooseCurrency(c.code); });
      li.appendChild(btn);
      list.appendChild(li);
    });
  }

  function chooseCurrency(code) {
    var other = sheetRole === "home" ? state.local : state.home;
    if (code === other) {
      /* 같은 통화를 고르면 두 통화를 맞바꾼다 */
      var tmp = state.home;
      rebaseHome(state.local);
      state.home = state.local;
      state.local = tmp;
    } else if (sheetRole === "home") {
      rebaseHome(code);
      state.home = code;
    } else {
      state.local = code;
    }
    safeSet(LS.home, state.home);
    safeSet(LS.local, state.local);
    closeSheet("curSheet");
    renderCurrencies();
    renderRate();
    renderDisplay();
    renderBudget();
    renderExpenses();
    renderTax();
  }

  /* 홈 통화가 바뀌면 예산·내역을 새 통화로 환산 */
  function rebaseHome(newHome) {
    var oldHome = state.home;
    if (newHome === oldHome) return;
    var r = state.rates || FALLBACK;
    if (!r[oldHome] || !r[newHome]) return;
    var f = r[newHome] / r[oldHome];
    if (state.budget) state.budget = roundFor(state.budget * f, newHome);
    state.expenses.forEach(function (e) {
      if (e.hc === oldHome) { e.home = roundFor(e.home * f, newHome); e.hc = newHome; }
    });
    saveBudget();
    saveExpenses();
  }

  /* ── 계산기 ──────────────────────────────── */
  function currentValue() {
    var v = parseFloat(state.input || "0");
    return isFinite(v) ? v : 0;
  }

  function convertedValue() {
    var v = currentValue();
    return state.side === "local" ? v * homePerLocal() : v / homePerLocal();
  }

  function renderRate() {
    var r = homePerLocal();
    $("rateText").textContent = "1 " + state.local + " = " + fmtRate(r) + " " + state.home;
    var label = rateLabel();
    var when = timeText(state.rateMeta.ts);
    $("rateSub").textContent = label + (when ? " · " + t("updated") + " " + when : "");
  }

  function renderDisplay() {
    var mainCur = state.side === "local" ? state.local : state.home;
    var convCur = state.side === "local" ? state.home : state.local;
    var mainText = groupInput(state.input);
    var amt = $("amtMain");
    amt.textContent = mainText;
    amt.classList.toggle("is-long", mainText.length > 10 && mainText.length <= 14);
    amt.classList.toggle("is-xlong", mainText.length > 14);
    $("curMain").textContent = mainCur;

    var conv = convertedValue();
    $("amtConv").textContent = fmt(conv, convCur);
    $("curConv").textContent = convCur;
    var convBox = $("amtConv").parentNode;
    if (convBox) convBox.classList.toggle("is-zero", conv <= 0);

    var segL = $("segLocal"), segH = $("segHome");
    var localOn = state.side === "local";
    segL.classList.toggle("is-on", localOn);
    segH.classList.toggle("is-on", !localOn);
    segL.setAttribute("aria-pressed", localOn ? "true" : "false");
    segH.setAttribute("aria-pressed", localOn ? "false" : "true");

    renderTax();
  }

  function buzz(ms) {
    try { if (navigator.vibrate) navigator.vibrate(ms || 8); } catch (e) {}
  }

  function pressKey(k) {
    buzz(7);
    if (k === "del") {
      state.input = state.input.slice(0, -1);
    } else if (k === "clr") {
      state.input = "";
    } else if (k === ".") {
      if (!state.input) state.input = "0.";
      else if (state.input.indexOf(".") < 0) state.input += ".";
    } else {
      var digits = state.input.replace(/[^\d]/g, "");
      if (digits.length >= 12) return;
      if (state.input === "0") state.input = "";
      if (k === "00" && !state.input) { state.input = "0"; return; }
      state.input += k;
    }
    renderDisplay();
  }

  function setInputFromNumber(v, cur) {
    if (!isFinite(v) || v <= 0) { state.input = ""; renderDisplay(); return; }
    var d = decOf(cur || (state.side === "local" ? state.local : state.home));
    state.input = d === 0 ? String(Math.round(v)) : String(Math.round(v * 100) / 100);
    renderDisplay();
  }

  /* OCR 후보는 항상 현지 통화 금액이므로, 현지 통화 입력으로 맞춰 넣는다 */
  function fillLocal(v) {
    state.side = "local";
    setInputFromNumber(v, state.local);
  }

  /* ── 오늘 예산 ───────────────────────────── */
  function todayKey(d) {
    d = d || new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }

  function todayExpenses() {
    var k = todayKey();
    return state.expenses.filter(function (e) { return todayKey(new Date(e.ts)) === k; });
  }

  function spentTotal() {
    return todayExpenses().reduce(function (s, e) { return s + e.home; }, 0);
  }

  function saveBudget() { safeSet(LS.budget, JSON.stringify({ amount: state.budget, cur: state.home })); }
  function saveExpenses() { safeSet(LS.exp, JSON.stringify(state.expenses.slice(-80))); }

  function loadStored() {
    try {
      var b = JSON.parse(safeGet(LS.budget) || "null");
      if (b && typeof b.amount === "number") {
        state.budget = b.amount;
        if (b.cur && b.cur !== state.home) {
          var r = state.rates || FALLBACK;
          if (r[b.cur] && r[state.home]) state.budget = roundFor(state.budget * (r[state.home] / r[b.cur]), state.home);
        }
      }
    } catch (e) {}
    try {
      var ex = JSON.parse(safeGet(LS.exp) || "[]");
      if (Array.isArray(ex)) state.expenses = ex.filter(function (e) { return e && e.ts && typeof e.home === "number" && typeof e.local === "number"; });
    } catch (e) {}
  }

  function renderBudget() {
    var hasBudget = state.budget > 0;
    $("budgetEmpty").hidden = hasBudget;
    $("budgetSet").hidden = !hasBudget;
    $("budgetEditBtn").hidden = !hasBudget;

    if (!hasBudget) return;

    var spent = spentTotal();
    var left = state.budget - spent;
    var over = left < 0;

    $("budgetAmount").textContent = fmt(state.budget, state.home);
    var leftEl = $("budgetLeft");
    leftEl.classList.toggle("is-over", over);
    leftEl.innerHTML = "";
    var b = document.createElement("b");
    b.textContent = fmt(Math.abs(left), state.home);
    leftEl.appendChild(document.createTextNode((over ? t("budgetOver") : t("budgetLeft")) + " "));
    leftEl.appendChild(b);

    var pct = state.budget > 0 ? (spent / state.budget) * 100 : 0;
    var bar = $("barFill");
    bar.style.width = Math.max(0, Math.min(100, pct)) + "%";
    bar.classList.toggle("is-over", pct > 100);
    $("bar").setAttribute("aria-valuenow", String(Math.round(Math.max(0, Math.min(100, pct)))));
    $("bar").setAttribute("aria-valuetext", Math.round(pct) + "%");

    $("spentLine").textContent = t("budgetSpent") + " " + fmt(spent, state.home);
    var localLeft = left / homePerLocal();
    $("leftLocal").textContent = "≈ " + fmt(localLeft, state.local);
  }

  function renderExpenses() {
    var list = $("expList");
    var items = todayExpenses().slice().sort(function (a, b) { return b.ts - a.ts; });
    list.innerHTML = "";
    $("expCount").textContent = String(items.length);
    $("expEmpty").hidden = items.length > 0;

    items.forEach(function (e) {
      var li = document.createElement("li");
      li.className = "exp-item";

      var box = document.createElement("div");
      var main = document.createElement("p");
      main.className = "exp-main";
      var a1 = document.createElement("span");
      a1.textContent = fmt(e.local, e.lc || state.local);
      var a2 = document.createElement("span");
      a2.className = "e-home";
      a2.textContent = "≈ " + fmt(e.home, e.hc || state.home);
      main.appendChild(a1); main.appendChild(a2);

      var time = document.createElement("p");
      time.className = "exp-time";
      try {
        time.textContent = new Intl.DateTimeFormat(state.locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(e.ts));
      } catch (err) { time.textContent = ""; }

      box.appendChild(main); box.appendChild(time);

      var del = document.createElement("button");
      del.type = "button";
      del.className = "exp-del";
      del.setAttribute("aria-label", t("delete"));
      del.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12M9.5 7V5.4h5V7M8 7l.7 11.2A1.6 1.6 0 0 0 10.3 20h3.4a1.6 1.6 0 0 0 1.6-1.5L16 7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';
      del.addEventListener("click", function () { removeExpense(e.id); });

      li.appendChild(box); li.appendChild(del);
      list.appendChild(li);
    });
  }

  function removeExpense(id) {
    state.expenses = state.expenses.filter(function (e) { return e.id !== id; });
    saveExpenses();
    renderBudget();
    renderExpenses();
  }

  function addExpense() {
    var v = currentValue();
    if (!(v > 0)) { toast(t("needAmount")); return; }
    var rate = homePerLocal();
    var localVal = state.side === "local" ? v : v / rate;
    var homeVal = state.side === "local" ? v * rate : v;
    state.expenses.push({
      id: "e" + Date.now() + Math.random().toString(36).slice(2, 6),
      ts: Date.now(),
      local: roundFor(localVal, state.local),
      home: roundFor(homeVal, state.home),
      lc: state.local,
      hc: state.home
    });
    saveExpenses();
    state.input = "";
    renderDisplay();
    renderBudget();
    renderExpenses();
    toast(t("added"));
  }

  /* ── 택스프리(한국 결제) ──────────────────── */
  function renderTax() {
    var isKRW = state.local === "KRW";
    $("taxRow").hidden = !isKRW;
    if (!isKRW) return;

    var localVal = state.side === "local" ? currentValue() : currentValue() / homePerLocal();
    if (!(localVal > 0)) {
      $("taxVal").textContent = "—";
    } else {
      var lo = localVal * 0.064, hi = localVal * 0.077;
      var r = function (x) { return x >= 1000 ? Math.round(x / 100) * 100 : Math.round(x); };
      $("taxVal").textContent = "₩" + num(r(lo)) + " ~ ₩" + num(r(hi));
    }
    $("taxNote").hidden = !state.taxOpen;
    $("taxPill").setAttribute("aria-expanded", state.taxOpen ? "true" : "false");
  }

  /* ── 토스트 ──────────────────────────────── */
  var toastTimer = null;
  function toast(msg) {
    var el = $("toast");
    el.textContent = msg;
    el.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 1800);
  }

  /* ── 스캔 · OCR ───────────────────────────── */
  var TESS_VER = "5.1.1";
  var ocrWorker = null, ocrLoading = null, progressCb = null, previewUrl = null;

  function loadScriptOnce(src) {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = function () { window.Tesseract ? resolve(window.Tesseract) : reject(new Error("no tesseract")); };
      s.onerror = function () { reject(new Error("cdn")); };
      document.head.appendChild(s);
    });
  }

  function ensureWorker() {
    if (ocrWorker) return Promise.resolve(ocrWorker);
    if (ocrLoading) return ocrLoading;
    ocrLoading = loadScriptOnce("https://cdn.jsdelivr.net/npm/tesseract.js@" + TESS_VER + "/dist/tesseract.min.js")
      .then(function (T) {
        return T.createWorker("eng", 1, {
          workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@" + TESS_VER + "/dist/worker.min.js",
          corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.0",
          langPath: "https://tessdata.projectnaptha.com/4.0.0",
          logger: function (m) { if (progressCb) progressCb(m); }
        });
      })
      .then(function (w) {
        return w.setParameters({
          tessedit_char_whitelist: "0123456789.,",
          tessedit_pageseg_mode: "11",
          preserve_interword_spaces: "0"
        }).then(function () { ocrWorker = w; return w; });
      })
      .catch(function (e) { ocrLoading = null; throw e; });
    return ocrLoading;
  }

  function prepCanvas(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        try {
          var w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height;
          var scale = 1;
          var longest = Math.max(w0, h0);
          if (longest > 1600) scale = 1600 / longest;
          else if (w0 < 900) scale = Math.min(2, 900 / w0);
          var w = Math.max(1, Math.round(w0 * scale)), h = Math.max(1, Math.round(h0 * scale));
          var c = document.createElement("canvas");
          c.width = w; c.height = h;
          var ctx = c.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          var data = ctx.getImageData(0, 0, w, h), p = data.data;
          for (var i = 0; i < p.length; i += 4) {
            var g = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
            g = (g - 128) * 1.28 + 128;
            g = g < 0 ? 0 : g > 255 ? 255 : g;
            p[i] = p[i + 1] = p[i + 2] = g;
          }
          ctx.putImageData(data, 0, 0);
          URL.revokeObjectURL(url);
          resolve(c);
        } catch (err) { URL.revokeObjectURL(url); reject(err); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("img")); };
      img.src = url;
    });
  }

  function extractCandidates(data) {
    var found = new Map();
    function push(v, conf, raw) {
      if (!isFinite(v) || v < 1 || v > 99999999) return;
      v = v >= 100 ? Math.round(v) : Math.round(v * 100) / 100;
      var prev = found.get(v);
      if (!prev || prev.conf < conf) found.set(v, { v: v, conf: conf, raw: raw });
    }
    var words = (data && data.words) || [];
    var i, w, txt, digits, conf;

    for (i = 0; i < words.length; i++) {
      w = words[i];
      if (!w || !w.text) continue;
      txt = String(w.text).trim().replace(/\s+/g, "");
      if (!/^\d[\d.,]*\d?$/.test(txt) && !/^\d$/.test(txt)) continue;
      conf = typeof w.confidence === "number" ? w.confidence : 45;
      digits = txt.replace(/[^\d]/g, "");
      if (!digits || digits.length > 8) continue;
      push(parseFloat(digits), conf, txt);
      if (/[.,]\d{1,2}$/.test(txt)) {
        var d2 = parseFloat(txt.replace(",", "."));
        push(d2, conf - 12, txt);
      }
    }

    /* 붙어 있는 숫자 낱말 합치기: "12" + "000" = 12000 */
    for (i = 0; i < words.length - 1; i++) {
      var a = words[i], b = words[i + 1];
      if (!a || !b || !a.text || !b.text) continue;
      var ta = String(a.text).trim(), tb = String(b.text).trim();
      if (!/^\d{1,4}$/.test(ta) || !/^\d{1,4}$/.test(tb)) continue;
      var joined = ta + tb;
      if (joined.length > 8) continue;
      var c2 = Math.min(typeof a.confidence === "number" ? a.confidence : 45,
                        typeof b.confidence === "number" ? b.confidence : 45) - 10;
      push(parseFloat(joined), c2, ta + " " + tb);
    }

    /* 낱말 정보가 없을 때: 전체 텍스트에서 숫자 뽑기 */
    if (!found.size && data && data.text) {
      var m = String(data.text).match(/\d[\d.,]{0,10}/g) || [];
      m.forEach(function (s) {
        var dg = s.replace(/[^\d]/g, "");
        if (dg && dg.length <= 8) push(parseFloat(dg), 40, s);
      });
    }

    var arr = Array.prototype.slice.call(found.values());
    arr.sort(function (x, y) { return (y.conf - x.conf) || (String(y.v).length - String(x.v).length); });
    return arr.slice(0, 8);
  }

  function renderChips(cands, target) {
    var box = $(target || "scanChips");
    box.innerHTML = "";
    if (!cands || !cands.length) { box.hidden = true; return; }
    box.hidden = false;
    var limit = target === "chips" ? 4 : 8;
    cands.slice(0, limit).forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = num(c.v, decOf(state.local));
      b.addEventListener("click", function () {
        fillLocal(c.v);
        Array.prototype.forEach.call(document.querySelectorAll(".chip"), function (x) { x.classList.remove("is-used"); });
        b.classList.add("is-used");
        if (!$("scanSheet").hidden) closeSheet("scanSheet");
      });
      box.appendChild(b);
    });
  }

  function handleScan(file) {
    if (!file) return;
    openSheet("scanSheet");
    $("scanChips").hidden = true;
    $("scanChips").innerHTML = "";
    $("chips").hidden = true;
    $("scanMsg").textContent = "";

    if (previewUrl) { try { URL.revokeObjectURL(previewUrl); } catch (e) {} }
    previewUrl = URL.createObjectURL(file);
    $("shot").src = previewUrl;

    $("shotLoading").hidden = false;
    $("scanStatus").textContent = t("scanPreparing");

    var progressSeen = false;
    progressCb = function (m) {
      if (!m) return;
      if (m.status === "recognizing text" && typeof m.progress === "number") {
        progressSeen = true;
        $("scanStatus").textContent = t("scanReading") + " " + Math.round(m.progress * 100) + "%";
      }
    };

    Promise.all([ensureWorker(), prepCanvas(file)])
      .then(function (res) {
        return res[0].recognize(res[1]);
      })
      .then(function (out) {
        progressCb = null;
        var cands = extractCandidates(out && out.data);
        $("shotLoading").hidden = true;
        if (cands.length) {
          $("scanMsg").textContent = t("scanFound");
          renderChips(cands, "scanChips");
          renderChips(cands, "chips");
        } else {
          $("scanMsg").textContent = t("scanNone");
        }
      })
      .catch(function () {
        progressCb = null;
        $("shotLoading").hidden = true;
        $("scanMsg").textContent = t("scanFail");
      });
  }

  /* ── 초기화 ──────────────────────────────── */
  function buildLangSelect() {
    var sel = $("langSelect");
    sel.innerHTML = "";
    LANGS.forEach(function (l) {
      var o = document.createElement("option");
      o.value = l.code;
      o.textContent = l.name;
      sel.appendChild(o);
    });
    sel.addEventListener("change", function () { applyLang(sel.value); });
  }

  function wire() {
    /* 통화 · 환율 */
    $("homeBtn").addEventListener("click", function () { sheetRole = "home"; buildCurList(""); $("curSearch").value = ""; openSheet("curSheet"); });
    $("localBtn").addEventListener("click", function () { sheetRole = "local"; buildCurList(""); $("curSearch").value = ""; openSheet("curSheet"); });
    $("swapBtn").addEventListener("click", function () {
      var tmp = state.home;
      rebaseHome(state.local);
      state.home = state.local;
      state.local = tmp;
      safeSet(LS.home, state.home);
      safeSet(LS.local, state.local);
      renderCurrencies(); renderRate(); renderDisplay(); renderBudget(); renderExpenses();
    });
    $("rateRefresh").addEventListener("click", function () { loadRates(true); });
    $("curSearch").addEventListener("input", function (e) { buildCurList(e.target.value); });
    $("curClose").addEventListener("click", function () { closeSheet("curSheet"); });
    Array.prototype.forEach.call(document.querySelectorAll("[data-close]"), function (el) {
      el.addEventListener("click", function () { closeSheet(el.getAttribute("data-close")); });
    });

    /* 계산기 */
    Array.prototype.forEach.call(document.querySelectorAll(".key[data-key]"), function (k) {
      k.addEventListener("click", function () { pressKey(k.getAttribute("data-key")); });
    });
    $("segLocal").addEventListener("click", function () { state.side = "local"; renderDisplay(); });
    $("segHome").addEventListener("click", function () { state.side = "home"; renderDisplay(); });
    $("addBtn").addEventListener("click", addExpense);

    /* 예산 */
    $("budgetInput").addEventListener("input", function (e) {
      var digits = e.target.value.replace(/[^\d]/g, "").slice(0, 12);
      e.target.value = digits ? groupInput(digits) : "";
    });
    $("budgetInput").addEventListener("keydown", function (e) { if (e.key === "Enter") saveBudgetFromInput(); });
    $("budgetSave").addEventListener("click", saveBudgetFromInput);
    $("budgetEditBtn").addEventListener("click", function () {
      $("budgetInput").value = state.budget ? groupInput(String(Math.round(state.budget))) : "";
      $("budgetEmpty").hidden = false;
      $("budgetSet").hidden = true;
      $("budgetEditBtn").hidden = true;
      $("budgetInput").focus();
    });

    /* 스캔 */
    $("scanBtn").addEventListener("click", function () { $("camInput").click(); });
    $("photoBtn").addEventListener("click", function () { $("libInput").click(); });
    $("camInput").addEventListener("change", function (e) { var f = e.target.files && e.target.files[0]; e.target.value = ""; handleScan(f); });
    $("libInput").addEventListener("change", function (e) { var f = e.target.files && e.target.files[0]; e.target.value = ""; handleScan(f); });
    $("scanAgain").addEventListener("click", function () { $("camInput").click(); });
    $("scanClose").addEventListener("click", function () { closeSheet("scanSheet"); });
    $("scanDone").addEventListener("click", function () { closeSheet("scanSheet"); });

    /* 택스프리 */
    $("taxPill").addEventListener("click", function () {
      state.taxOpen = !state.taxOpen;
      safeSet(LS.tax, state.taxOpen ? "1" : "0");
      renderTax();
    });

    /* 날짜가 바뀌면 오늘 내역 다시 */
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) { renderBudget(); renderExpenses(); }
    });
  }

  function saveBudgetFromInput() {
    var v = parseInt(($("budgetInput").value || "").replace(/[^\d]/g, ""), 10);
    if (!v) { $("budgetInput").focus(); return; }
    state.budget = v;
    saveBudget();
    $("budgetInput").value = "";
    renderBudget();
    $("budgetSet").hidden = false;
    $("budgetEditBtn").hidden = false;
  }

  function init() {
    buildLangSelect();
    pickDefaults();

    var savedTax = safeGet(LS.tax);
    state.taxOpen = savedTax === "1";

    loadStored();

    applyLang(detectedLang());
    renderCurrencies();

    if (state.budget) {
      $("budgetSet").hidden = false;
      $("budgetEmpty").hidden = true;
      $("budgetEditBtn").hidden = false;
    }

    wire();
    renderRate();
    renderDisplay();
    renderBudget();
    renderExpenses();

    loadRates(false);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
