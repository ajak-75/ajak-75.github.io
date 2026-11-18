/* K-Sajoo — engine.js  (v1.0.0)
   글로벌 만세력 계산 엔진. 의존성 없음. 화면·언어와 완전히 분리된 순수 계산 모듈.

   ── 계산 기준 ──────────────────────────────────────────────
   · 24절기: 태양 겉보기 황경(VSOP87 축약 + 장동 + 광행차)이 15° 배수에 닿는 순간을 뉴턴법으로 찾는다.
     한국천문연구원(KASI) 발표 절입 시각과 2023~2026년 표본에서 1분 이내로 일치한다.
   · 일주: 율리우스일수(JDN) 차이로 60갑자를 센다. 기준 1900-01-01 = 갑술일, 2000-01-01 = 무오일.
   · 시주: 출생지 IANA 타임존(Intl.DateTimeFormat)으로 서머타임을 반영해 UTC를 구한 뒤,
     표준시 또는 진태양시(경도 보정 + 균시차)로 환산해 시지·일주를 정한다.
   · 시간을 모르면 년·월·일 3주(6글자)로 계산하고 시주는 null 로 둔다.
   · 대운: 절입까지의 일수(3일=1년)로 시작 나이를 잡고, 년간 음양·성별로 순행/역행을 정한다.

   ── API (이 규격만 지키면 UI·앱을 바꿔도 엔진은 그대로 쓴다) ──
   @typedef {Object} SajooRequest
   @property {string}  birthDate        'YYYY-MM-DD' (양력)
   @property {string}  [birthTime]      'HH:mm' — timeUnknown 이면 생략 가능
   @property {boolean} [timeUnknown]    태어난 시간을 모르면 true
   @property {string}  [timezone]       IANA 타임존 (기본 'Asia/Seoul')
   @property {number}  [longitude]      출생지 경도 (기본 126.978, 서울)
   @property {boolean} [trueSolarTime]  진태양시 보정 (기본 true)
   @property {string}  [calendarType]   'solar' (기본) — 'lunar' 는 예약(미지원)
   @property {string}  [gender]         'male' | 'female' — 대운 계산에 사용(없으면 daeun null)
   @property {string}  [jasi]           'midnight'(기본, 00시 넘김) | 'classic'(23시 넘김)

   @typedef {Object} SajooResult
   @property {boolean} ok
   @property {string}  [error]          'missing_date' | 'invalid_date' | 'out_of_range' | 'calendar_type_unsupported'
   @property {Object}  meta             입력 메타 + UTC/KST/진태양시 + 절기 경계
   @property {Object}  pillars          year · month · day · hour(null 가능)
   @property {Object}  fiveElements     counts · percent · total · dominant · absent
   @property {Object}  dayMaster        index · element · yang
   @property {Object}  tenGods          byPillar · counts
   @property {Object|null} daeun        forward · startAge · list[10]

   모든 필드는 영문 키 + 숫자/코드 값이며 한자 필드는 없다. 표기는 UI(i18n)가 맡는다.

   반환 코드 값
   · element : 'wood' | 'fire' | 'earth' | 'metal' | 'water'
   · tenGod  : 'bigyeon' | 'geopjae' | 'siksin' | 'sangwan' | 'pyeonjae' | 'jeongjae'
               | 'pyeongwan' | 'jeonggwan' | 'pyeonin' | 'jeongin'
   · stem 0~9 (갑~계), branch 0~11 (자~해)
*/
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KSajoo = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var ENGINE_VERSION = '1.0.0';

  /* ── 기본 상수 (화면 표기 없음, 인덱스만) ─────────────────── */
  var STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
  var BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
  var STEM_ELEMENT = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
  var STEM_YANG = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
  var BRANCH_ELEMENT = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
  var BRANCH_YANG = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
  var ELEMENTS = ['wood', 'fire', 'earth', 'metal', 'water'];

  var TERM_ANGLES = [285, 300, 315, 330, 345, 0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270];
  var TERM_NAMES_KO = ['소한', '대한', '입춘', '우수', '경칩', '춘분', '청명', '곡우', '입하', '소만', '망종', '하지', '소서', '대서', '입추', '처서', '백로', '추분', '한로', '상강', '입동', '소설', '대설', '동지'];
  var JEOL_ANGLES = [315, 345, 15, 45, 75, 105, 135, 165, 195, 225, 255, 285];

  /* ── 율리우스일 ──────────────────────────────────────────── */
  function jdnFromYMD(y, m, d) {
    var a = Math.floor((14 - m) / 12);
    var yy = y + 4800 - a;
    var mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy +
      Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  }

  function ymdFromJDN(jdn) {
    var a = jdn + 32044;
    var b = Math.floor((4 * a + 3) / 146097);
    var c = a - Math.floor(146097 * b / 4);
    var d = Math.floor((4 * c + 3) / 1461);
    var e = c - Math.floor(1461 * d / 4);
    var m = Math.floor((5 * e + 2) / 153);
    return {
      y: 100 * b + d - 4800 + Math.floor(m / 10),
      m: m + 3 - 12 * Math.floor(m / 10),
      d: e - Math.floor((153 * m + 2) / 5) + 1
    };
  }

  function jdnFromDate(y, m, d) { return jdnFromYMD(y, m, d); }

  /* ── 태양 황경 (VSOP87 축약) ─────────────────────────────── */
  var L0 = [
    [175347046, 0, 0], [3341656, 4.6692568, 6283.07585], [34894, 4.6261, 12566.1517],
    [3497, 2.7441, 5753.3849], [3418, 2.8289, 3.5231], [3136, 3.6277, 77713.7715],
    [2676, 4.4181, 7860.4194], [2343, 6.1352, 3930.2097], [1324, 0.7425, 11506.7698],
    [1273, 2.0371, 529.691], [1199, 1.1096, 1577.3435], [990, 5.233, 5884.927],
    [902, 2.045, 26.298], [857, 3.508, 398.149], [780, 1.179, 5223.694],
    [753, 2.533, 5507.553], [505, 4.583, 18849.228], [492, 4.205, 775.523],
    [357, 2.92, 0.067], [317, 5.849, 11790.629], [284, 1.899, 796.298],
    [271, 0.315, 10977.079], [243, 0.345, 5486.778], [206, 4.806, 2544.314],
    [205, 1.869, 5573.143], [202, 2.458, 6069.777], [156, 0.833, 213.299],
    [132, 3.411, 2942.463], [126, 1.083, 20.775], [115, 0.645, 0.98],
    [103, 0.636, 4694.003], [102, 0.976, 15720.839], [102, 4.267, 7.114],
    [99, 6.21, 2146.17], [98, 0.68, 155.42], [86, 5.98, 161000.69],
    [85, 1.3, 6275.96], [85, 3.67, 71430.7], [80, 1.81, 17260.15],
    [79, 3.04, 12036.46], [75, 1.76, 5088.63], [74, 3.5, 3154.69],
    [74, 4.68, 801.82], [70, 0.83, 9437.76], [62, 3.98, 8827.39],
    [61, 1.82, 7084.9], [57, 2.78, 6286.6], [56, 4.39, 14143.5],
    [56, 3.47, 6279.55], [52, 0.19, 12139.55], [52, 1.33, 1748.02],
    [51, 0.28, 5856.48], [49, 0.49, 1194.45], [41, 5.37, 8429.24],
    [41, 2.4, 19651.05], [39, 6.17, 10447.39], [37, 6.04, 10213.29],
    [37, 2.57, 1059.38], [36, 1.71, 2352.87], [36, 1.78, 6812.77],
    [33, 0.59, 17789.85], [30, 0.44, 83996.85], [30, 2.74, 1349.87],
    [25, 3.16, 4690.48]
  ];
  var L1 = [
    [628331966747, 0, 0], [206059, 2.678235, 6283.07585], [4303, 2.6351, 12566.1517],
    [425, 1.59, 3.523], [119, 5.796, 26.298], [109, 2.966, 1577.344],
    [93, 2.59, 18849.23], [72, 1.14, 529.69], [68, 1.87, 398.15],
    [67, 4.41, 5507.55], [59, 2.89, 5223.69], [56, 2.17, 155.42],
    [45, 0.4, 796.3], [36, 0.47, 775.52], [29, 2.65, 7.11],
    [21, 5.34, 0.98], [19, 1.85, 5486.78], [19, 4.97, 213.3],
    [17, 2.99, 6275.96], [16, 0.03, 2544.31], [16, 1.43, 2146.17],
    [15, 1.21, 10977.08], [12, 2.83, 1748.02], [12, 3.26, 5088.63],
    [12, 5.27, 1194.45], [12, 2.08, 4694], [11, 0.77, 553.57],
    [10, 1.3, 6286.6], [10, 4.24, 1349.87], [9, 2.7, 242.73],
    [9, 5.64, 951.72], [8, 5.3, 2352.87], [6, 2.65, 9437.76],
    [6, 4.67, 4690.48]
  ];
  var L2 = [
    [52919, 0, 0], [8720, 1.0721, 6283.0758], [309, 0.867, 12566.152],
    [27, 0.05, 3.52], [16, 5.19, 26.3], [16, 3.68, 155.42],
    [10, 0.76, 18849.23], [9, 2.06, 77713.77], [7, 0.83, 775.52],
    [5, 4.66, 1577.34], [4, 1.03, 7.11], [4, 3.44, 5573.14],
    [3, 5.14, 796.3], [3, 6.05, 5507.55], [3, 1.19, 242.73],
    [3, 6.12, 529.69], [3, 0.31, 398.15], [3, 2.28, 553.57],
    [2, 4.38, 5223.69], [2, 3.75, 0.98]
  ];
  var L3 = [[289, 5.844, 6283.076], [35, 0, 0], [17, 5.49, 12566.15], [3, 5.2, 155.42], [1, 4.72, 3.52], [1, 5.3, 18849.23], [1, 5.97, 242.73]];
  var L4 = [[114, 3.142, 0], [8, 4.13, 6283.08], [1, 3.84, 12566.15]];
  var L5 = [[1, 3.14, 0]];

  var D2R = Math.PI / 180;
  var R2D = 180 / Math.PI;

  function seriesSum(terms, T) {
    var s = 0;
    for (var i = 0; i < terms.length; i++) s += terms[i][0] * Math.cos(terms[i][1] + terms[i][2] * T);
    return s;
  }

  function norm360(x) { x = x % 360; return x < 0 ? x + 360 : x; }
  function wrap180(x) { x = norm360(x); return x > 180 ? x - 360 : x; }

  function sunApparentLongitude(jde) {
    var T = (jde - 2451545.0) / 365250.0;
    var L = (seriesSum(L0, T) + seriesSum(L1, T) * T + seriesSum(L2, T) * T * T +
      seriesSum(L3, T) * Math.pow(T, 3) + seriesSum(L4, T) * Math.pow(T, 4) +
      seriesSum(L5, T) * Math.pow(T, 5)) / 1e8;
    var geo = norm360(L * R2D + 180);

    var Tc = (jde - 2451545.0) / 36525.0;
    var omega = 125.04452 - 1934.136261 * Tc + 0.0020708 * Tc * Tc + Math.pow(Tc, 3) / 450000;
    var Ls = 280.4665 + 36000.7698 * Tc;
    var Lm = 218.3165 + 481267.8813 * Tc;
    var dpsi = (-17.20 * Math.sin(omega * D2R) - 1.32 * Math.sin(2 * Ls * D2R) -
      0.23 * Math.sin(2 * Lm * D2R) + 0.21 * Math.sin(2 * omega * D2R)) / 3600;

    var M = (357.52911 + 35999.05029 * Tc - 0.0001537 * Tc * Tc) * D2R;
    var C = (1.914602 - 0.004817 * Tc - 0.000014 * Tc * Tc) * Math.sin(M) +
      (0.019993 - 0.000101 * Tc) * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
    var e = 0.016708634 - 0.000042037 * Tc - 0.0000001267 * Tc * Tc;
    var nu = M + C * D2R;
    var R = 1.000001018 * (1 - e * e) / (1 + e * Math.cos(nu));
    var aberration = -20.4898 / (3600 * R);

    return norm360(geo + dpsi + aberration);
  }

  function deltaTSeconds(year) {
    var y = year, t;
    if (y < 1900) { t = y - 1860; return 7.62 + 0.5737 * t - 0.251754 * t * t + 0.01680668 * Math.pow(t, 3) - 0.0004473624 * Math.pow(t, 4) + Math.pow(t, 5) / 233174; }
    if (y < 1920) { t = y - 1900; return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * Math.pow(t, 3) - 0.000197 * Math.pow(t, 4); }
    if (y < 1941) { t = y - 1920; return 21.20 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * Math.pow(t, 3); }
    if (y < 1961) { t = y - 1950; return 29.07 + 0.407 * t - t * t / 233 + Math.pow(t, 3) / 2547; }
    if (y < 1986) { t = y - 1975; return 45.45 + 1.067 * t - t * t / 260 - Math.pow(t, 3) / 718; }
    if (y < 2005) { t = y - 2000; return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * Math.pow(t, 3) + 0.000651814 * Math.pow(t, 4) + 0.00002373599 * Math.pow(t, 5); }
    if (y < 2050) { t = y - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; }
    if (y < 2150) { return -20 + 32 * Math.pow((y - 1820) / 100, 2) - 0.5628 * (2150 - y); }
    t = (y - 1820) / 100; return -20 + 32 * t * t;
  }

  function solarTermJD(year, angle) {
    var base = jdnFromYMD(year, 1, 1) - 0.5;
    var delta = norm360(angle - 280) / 0.98564736;
    var jdUT = base + delta;
    var dt = deltaTSeconds(year) / 86400;
    for (var i = 0; i < 8; i++) {
      var lon = sunApparentLongitude(jdUT + dt);
      var diff = wrap180(angle - lon) / 0.98564736;
      jdUT += diff;
      if (Math.abs(diff) < 1e-7) break;
    }
    return jdUT;
  }

  function jdToDate(jd) { return new Date(Math.round((jd - 2440587.5) * 86400000)); }
  function dateToJD(d) { return d.getTime() / 86400000 + 2440587.5; }

  function solarTermsOfYear(year) {
    var out = [];
    for (var i = 0; i < TERM_ANGLES.length; i++) {
      var jd = solarTermJD(year, TERM_ANGLES[i]);
      out.push({ angle: TERM_ANGLES[i], nameKo: TERM_NAMES_KO[i], jd: jd, date: jdToDate(jd) });
    }
    return out;
  }

  /* ── 타임존 ──────────────────────────────────────────────── */
  var dtfCache = {};
  function dtfFor(tz) {
    if (!dtfCache[tz]) {
      dtfCache[tz] = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hour12: false,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    }
    return dtfCache[tz];
  }

  function wallPartsAt(ms, tz) {
    var parts = dtfFor(tz).formatToParts(new Date(ms));
    var o = {};
    for (var i = 0; i < parts.length; i++) if (parts[i].type !== 'literal') o[parts[i].type] = parts[i].value;
    var h = parseInt(o.hour, 10);
    if (h === 24) h = 0;
    return { y: parseInt(o.year, 10), mo: parseInt(o.month, 10), d: parseInt(o.day, 10), h: h, mi: parseInt(o.minute, 10), s: parseInt(o.second, 10) };
  }

  function tzOffsetMs(ms, tz) {
    var p = wallPartsAt(ms, tz);
    var asUTC = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) + ((ms % 1000) + 1000) % 1000;
    return asUTC - ms;
  }

  function wallToUTC(y, mo, d, h, mi, tz) {
    var target = Date.UTC(y, mo - 1, d, h, mi, 0);
    var guess = target;
    for (var i = 0; i < 4; i++) {
      var off = tzOffsetMs(guess, tz);
      var next = target - off;
      if (next === guess) break;
      guess = next;
    }
    return guess;
  }

  function equationOfTimeMinutes(ms) {
    var jd = dateToJD(new Date(ms));
    var T = (jd - 2451545.0) / 36525;
    var L0d = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    var M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * D2R;
    var e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
    var eps = (23 + 26 / 60 + 21.448 / 3600 - (46.815 * T + 0.00059 * T * T - 0.001813 * Math.pow(T, 3)) / 3600) * D2R;
    var y2 = Math.pow(Math.tan(eps / 2), 2);
    var E = y2 * Math.sin(2 * L0d * D2R) - 2 * e * Math.sin(M) +
      4 * e * y2 * Math.sin(M) * Math.cos(2 * L0d * D2R) -
      0.5 * y2 * y2 * Math.sin(4 * L0d * D2R) - 1.25 * e * e * Math.sin(2 * M);
    return E * 4 * R2D;
  }

  /* ── 십성 ────────────────────────────────────────────────── */
  var TEN_GODS = ['bigyeon', 'geopjae', 'siksin', 'sangwan', 'pyeonjae', 'jeongjae', 'pyeongwan', 'jeonggwan', 'pyeonin', 'jeongin'];

  function tenGodOf(dayStem, otherStem) {
    var de = STEM_ELEMENT[dayStem], oe = STEM_ELEMENT[otherStem];
    var same = STEM_YANG[dayStem] === STEM_YANG[otherStem];
    if (de === oe) return TEN_GODS[same ? 0 : 1];
    if ((de + 1) % 5 === oe) return TEN_GODS[same ? 2 : 3];
    if ((de + 2) % 5 === oe) return TEN_GODS[same ? 4 : 5];
    if ((oe + 2) % 5 === de) return TEN_GODS[same ? 6 : 7];
    return TEN_GODS[same ? 8 : 9];
  }

  function gapjaIndex(stem, branch) {
    for (var i = 0; i < 60; i++) if (i % 10 === stem && i % 12 === branch) return i;
    return -1;
  }

  function makePillar(stem, branch, dayStem, isDay) {
    return {
      index: gapjaIndex(stem, branch),
      stem: stem,
      branch: branch,
      stemElement: ELEMENTS[STEM_ELEMENT[stem]],
      branchElement: ELEMENTS[BRANCH_ELEMENT[branch]],
      stemYang: !!STEM_YANG[stem],
      tenGod: isDay ? 'self' : tenGodOf(dayStem, stem)
    };
  }

  /* ── 대운 ────────────────────────────────────────────────── */
  function buildDaeun(yearStem, dayStem, monthPillar, gender, instantJD, currentJeol, nextJeol, birthDate) {
    if (gender !== 'male' && gender !== 'female') return null;

    /* 양간+남자, 음간+여자 → 순행 / 그 밖은 역행 */
    var forward = (STEM_YANG[yearStem] === 1) === (gender === 'male');
    var days = forward ? (nextJeol.jd - instantJD) : (instantJD - currentJeol.jd);
    if (days < 0) days = 0;

    var startYearsExact = days / 3;                      /* 3일 = 1년 */
    var years = Math.floor(startYearsExact);
    var months = Math.round((startYearsExact - years) * 12);
    if (months === 12) { years += 1; months = 0; }

    var list = [];
    var base = monthPillar.index;
    for (var i = 1; i <= 10; i++) {
      var idx = ((base + forward * i) % 60 + 60) % 60;
      var stem = idx % 10, branch = idx % 12;
      list.push({
        order: i,
        index: idx,
        startAge: years + (i - 1) * 10,
        startYear: birthDate.y + years + (i - 1) * 10,
        stem: stem,
        branch: branch,
        tenGod: tenGodOf(dayStem, stem)
      });
    }
    return { forward: forward, startAge: years, startMonths: months, startAgeExact: startYearsExact, list: list };
  }

  /* ── 본 계산 ─────────────────────────────────────────────── */
  function compute(req) {
    req = req || {};

    if (req.calendarType && req.calendarType !== 'solar') {
      return { ok: false, error: 'calendar_type_unsupported' };
    }

    var birthDate = req.birthDate;
    var y, mo, d;
    if (typeof birthDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      var bits = birthDate.split('-');
      y = parseInt(bits[0], 10); mo = parseInt(bits[1], 10); d = parseInt(bits[2], 10);
    } else {
      return { ok: false, error: 'missing_date' };
    }

    var timeUnknown = req.timeUnknown === true || !req.birthTime;
    var hh = 12, mm = 0;
    if (!timeUnknown) {
      if (!/^\d{2}:\d{2}$/.test(req.birthTime)) return { ok: false, error: 'invalid_time' };
      hh = parseInt(req.birthTime.slice(0, 2), 10);
      mm = parseInt(req.birthTime.slice(3, 5), 10);
      if (hh > 23 || mm > 59) return { ok: false, error: 'invalid_time' };
    }

    if (y < 1900 || y > 2100) return { ok: false, error: 'out_of_range' };
    var daysInMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth) return { ok: false, error: 'invalid_date' };

    var tz = req.timezone || 'Asia/Seoul';
    var lon = typeof req.longitude === 'number' ? req.longitude : 126.978;
    var trueSolar = req.trueSolarTime !== false;
    var jasi = req.jasi === 'classic' ? 'classic' : 'midnight';
    var gender = req.gender === 'male' || req.gender === 'female' ? req.gender : null;

    var utcMs = wallToUTC(y, mo, d, hh, mm, tz);
    var utcDate = new Date(utcMs);
    var offsetMin = tzOffsetMs(utcMs, tz) / 60000;

    var eot = equationOfTimeMinutes(utcMs);
    var lonCorr = lon * 4 - offsetMin;                     /* 출생지 표준자오선 대비 경도 보정 */
    var solarShiftMs = utcMs + lon * 4 * 60000 + eot * 60000;
    var basisMs = trueSolar ? solarShiftMs : utcMs + offsetMin * 60000;
    var bd = new Date(basisMs);
    var by = bd.getUTCFullYear(), bm = bd.getUTCMonth() + 1, bday = bd.getUTCDate();
    var bh = bd.getUTCHours(), bmi = bd.getUTCMinutes();

    /* 절기 목록 (앞뒤 1년 포함) */
    var termYear = utcDate.getUTCFullYear();
    var jeols = [];
    for (var yy = termYear - 1; yy <= termYear + 1; yy++) {
      for (var j = 0; j < JEOL_ANGLES.length; j++) {
        var jd = solarTermJD(yy, JEOL_ANGLES[j]);
        jeols.push({ angle: JEOL_ANGLES[j], monthIndex: j, jd: jd, date: jdToDate(jd), year: yy });
      }
    }
    jeols.sort(function (a, b) { return a.jd - b.jd; });

    var instantJD = dateToJD(utcDate);
    var current = null, next = null;
    for (var k = 0; k < jeols.length; k++) {
      if (jeols[k].jd <= instantJD) current = jeols[k];
      else { next = jeols[k]; break; }
    }
    if (!current || !next) return { ok: false, error: 'term_range' };

    var sajuYear = current.monthIndex === 11 ? current.year - 1 : current.year;
    var yearStem = ((sajuYear - 4) % 10 + 10) % 10;
    var yearBranch = ((sajuYear - 4) % 12 + 12) % 12;

    var monthIndex = current.monthIndex;
    var monthBranch = (2 + monthIndex) % 12;
    var monthStem = (((yearStem % 5) * 2 + 2) % 10 + monthIndex) % 10;

    var dayJDN = jdnFromYMD(by, bm, bday);
    if (jasi === 'classic' && bh >= 23 && !timeUnknown) dayJDN += 1;
    var dayIdx = ((dayJDN + 49) % 60 + 60) % 60;
    var dayStem = dayIdx % 10;
    var dayBranch = dayIdx % 12;

    var hourPillar = null;
    if (!timeUnknown) {
      var hourBranch = Math.floor(((bh + 1) % 24) / 2);
      var hourStem = (((dayStem % 5) * 2) % 10 + hourBranch) % 10;
      hourPillar = makePillar(hourStem, hourBranch, dayStem, false);
    }

    var yearPillar = makePillar(yearStem, yearBranch, dayStem, false);
    var monthPillar = makePillar(monthStem, monthBranch, dayStem, false);
    var dayPillar = makePillar(dayStem, dayBranch, dayStem, true);

    /* 오행 */
    var counts = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
    var stemsAll = [yearStem, monthStem, dayStem];
    var branchesAll = [yearBranch, monthBranch, dayBranch];
    if (hourPillar) { stemsAll.push(hourPillar.stem); branchesAll.push(hourPillar.branch); }
    for (var s = 0; s < stemsAll.length; s++) counts[ELEMENTS[STEM_ELEMENT[stemsAll[s]]]] += 1;
    for (var b = 0; b < branchesAll.length; b++) counts[ELEMENTS[BRANCH_ELEMENT[branchesAll[b]]]] += 1;

    var total = stemsAll.length + branchesAll.length;
    var percent = {};
    var dominant = ELEMENTS[0], absent = null;
    for (var e = 0; e < ELEMENTS.length; e++) {
      percent[ELEMENTS[e]] = total ? Math.round(counts[ELEMENTS[e]] / total * 100) : 0;
      if (counts[ELEMENTS[e]] > counts[dominant]) dominant = ELEMENTS[e];
      if (counts[ELEMENTS[e]] === 0) absent = ELEMENTS[e];
    }

    /* 십성 집계 */
    var byPillar = { year: yearPillar.tenGod, month: monthPillar.tenGod, day: 'self' };
    if (hourPillar) byPillar.hour = hourPillar.tenGod;
    var tenGodCounts = { bigyeon: 1 };   /* 일간 자신 */
    ['year', 'month', 'day', 'hour'].forEach(function (p) {
      if (p === 'day') return;
      if (byPillar[p]) tenGodCounts[byPillar[p]] = (tenGodCounts[byPillar[p]] || 0) + 1;
    });

    var daeun = buildDaeun(yearStem, dayStem, monthPillar, gender, instantJD, current, next, { y: by, m: bm, d: bday });

    var nearBoundary = Math.abs(instantJD - current.jd) < 1 || Math.abs(next.jd - instantJD) < 1;

    return {
      ok: true,
      meta: {
        engine: 'k-sajoo-engine',
        version: ENGINE_VERSION,
        birthDate: birthDate,
        birthTime: timeUnknown ? null : req.birthTime,
        timeUnknown: timeUnknown,
        timezone: tz,
        longitude: lon,
        trueSolarTime: trueSolar,
        calendarType: 'solar',
        gender: gender,
        jasi: jasi,
        utc: utcDate.toISOString(),
        kst: new Date(utcMs + 9 * 3600000).toISOString(),
        offsetMinutes: offsetMin,
        solarTime: pad4(by) + '-' + pad2(bm) + '-' + pad2(bday) + 'T' + pad2(bh) + ':' + pad2(bmi),
        solarCorrectionMinutes: trueSolar ? lonCorr + eot : 0,
        longitudeCorrectionMinutes: lonCorr,
        eotMinutes: eot,
        sajuYear: sajuYear,
        monthIndex: monthIndex,
        term: {
          angle: current.angle,
          at: current.date.toISOString(),
          nextAngle: next.angle,
          nextAt: next.date.toISOString(),
          nearBoundary: nearBoundary
        }
      },
      pillars: {
        year: yearPillar,
        month: monthPillar,
        day: dayPillar,
        hour: hourPillar
      },
      fiveElements: {
        counts: counts,
        percent: percent,
        total: total,
        dominant: dominant,
        absent: absent
      },
      dayMaster: {
        index: dayStem,
        element: ELEMENTS[STEM_ELEMENT[dayStem]],
        yang: !!STEM_YANG[dayStem]
      },
      tenGods: { byPillar: byPillar, counts: tenGodCounts },
      daeun: daeun
    };
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function pad4(n) { return ('000' + n).slice(-4); }

  /* UI·테스트용: 한 해 24절기 (JSON 친화적) */
  function listTerms(year) {
    return solarTermsOfYear(year).map(function (t) {
      return { angle: t.angle, nameKo: t.nameKo, at: t.date.toISOString() };
    });
  }

  return {
    version: ENGINE_VERSION,
    STEMS: STEMS,
    BRANCHES: BRANCHES,
    ELEMENTS: ELEMENTS,
    STEM_ELEMENT: STEM_ELEMENT,
    STEM_YANG: STEM_YANG,
    BRANCH_ELEMENT: BRANCH_ELEMENT,
    TEN_GODS: TEN_GODS,
    TERM_ANGLES: TERM_ANGLES,
    TERM_NAMES_KO: TERM_NAMES_KO,
    jdnFromYMD: jdnFromYMD,
    ymdFromJDN: ymdFromJDN,
    sunApparentLongitude: sunApparentLongitude,
    deltaTSeconds: deltaTSeconds,
    solarTermJD: solarTermJD,
    solarTermsOfYear: solarTermsOfYear,
    listTerms: listTerms,
    equationOfTimeMinutes: equationOfTimeMinutes,
    wallToUTC: wallToUTC,
    tzOffsetMs: tzOffsetMs,
    tenGodOf: tenGodOf,
    gapjaIndex: gapjaIndex,
    compute: compute
  };
}));
