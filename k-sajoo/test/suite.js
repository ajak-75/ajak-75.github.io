/* K-Sajoo — test/suite.js
   엔진 검증 (브라우저·Node·QuickJS 공용). 결과는 숫자·코드만 확인한다.

   절기 기준값은 한국천문연구원(KASI) 천문우주지식정보 달력자료(월력요항)의
   2023~2026년 24절기 표에서 가져왔다. 입춘은 그 시각 1분 전/후로 년주·월주가
   바뀌는지까지 확인한다. */
(function (root) {
  'use strict';

  var results = [];

  function assert(name, cond, detail) {
    results.push({ name: name, pass: !!cond, detail: detail || '' });
  }
  function eq(name, actual, expected) {
    assert(name, actual === expected, 'actual=' + actual + ' expected=' + expected);
  }
  function near(name, actual, expected, tol, unit) {
    assert(name, Math.abs(actual - expected) <= tol,
      'actual=' + (Math.round(actual * 100) / 100) + ' expected=' + expected + ' tol=' + tol + (unit || ''));
  }
  function kstString(iso) {
    var d = new Date(new Date(iso).getTime() + 9 * 3600000);
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()) + ' ' +
      p(d.getUTCHours()) + ':' + p(d.getUTCMinutes());
  }

  /* KASI 발표 절입 시각 (KST) */
  var KASI = {
    2023: { '입춘': '2023-02-04T11:43', '춘분': '2023-03-21T06:24', '하지': '2023-06-21T23:58', '동지': '2023-12-22T12:27' },
    2024: { '입춘': '2024-02-04T17:27', '춘분': '2024-03-20T12:06', '하지': '2024-06-21T05:51', '동지': '2024-12-21T18:21' },
    2025: { '입춘': '2025-02-03T23:10', '춘분': '2025-03-20T18:01', '하지': '2025-06-21T11:42', '동지': '2025-12-22T00:03' },
    2026: { '입춘': '2026-02-04T05:02', '춘분': '2026-03-20T23:46', '하지': '2026-06-21T17:25', '동지': '2026-12-22T05:50' }
  };

  /* 년간에 따른 인월 천간: 갑기→병, 을경→무, 병신→경, 정임→임, 무계→갑 */
  var MONTH_STEM_AFTER = { 2023: 0, 2024: 2, 2025: 4, 2026: 6 };   /* 갑인·병인·무인·경인 */
  var MONTH_STEM_BEFORE = { 2023: 9, 2024: 1, 2025: 3, 2026: 5 };  /* 계축·을축·정축·기축 */

  function termCheck(year, terms, nameKo, expectLocal, tolSec) {
    var t = null;
    for (var i = 0; i < terms.length; i++) if (terms[i].nameKo === nameKo) t = terms[i];
    var diff = (t.date.getTime() - new Date(expectLocal + ':00+09:00').getTime()) / 1000;
    assert(year + ' ' + nameKo + ' = KASI ' + expectLocal.slice(11) + ' (계산 ' + kstString(t.date.toISOString()) + ' KST)',
      Math.abs(diff) <= tolSec, 'diff=' + Math.round(diff) + 's');
  }

  function run(K) {
    results = [];

    /* ── 1. 율리우스일 ─────────────────────────────────────── */
    eq('JDN 1900-01-01', K.jdnFromYMD(1900, 1, 1), 2415021);
    eq('JDN 2000-01-01', K.jdnFromYMD(2000, 1, 1), 2451545);
    eq('JDN 2026-11-19', K.jdnFromYMD(2026, 11, 19), 2461364);
    var roundTrip = K.ymdFromJDN(2461364);
    eq('JDN→날짜 왕복 (2026-11-19)', roundTrip.y + '-' + roundTrip.m + '-' + roundTrip.d, '2026-11-19');

    /* ── 2. 60갑자 일주 기준일 교차 검증 ─────────────────────── */
    var d1900 = K.compute({ birthDate: '1900-01-01', birthTime: '12:00', timezone: 'Asia/Seoul', trueSolarTime: false });
    eq('1900-01-01 일간 = 갑(0)', d1900.pillars.day.stem, 0);
    eq('1900-01-01 일지 = 술(10)', d1900.pillars.day.branch, 10);

    var d2000 = K.compute({ birthDate: '2000-01-01', birthTime: '12:00', timezone: 'Asia/Seoul', trueSolarTime: false });
    eq('2000-01-01 일간 = 무(4)', d2000.pillars.day.stem, 4);
    eq('2000-01-01 일지 = 오(6)', d2000.pillars.day.branch, 6);
    eq('1900→2000 일수 차 44칸이 60갑자 차와 일치', (2451545 - 2415021) % 60, (54 - 10 + 60) % 60);

    var dNext = K.compute({ birthDate: '2000-01-02', birthTime: '12:00', timezone: 'Asia/Seoul', trueSolarTime: false });
    eq('일주는 하루에 한 칸', (dNext.pillars.day.index - d2000.pillars.day.index + 60) % 60, 1);

    /* KASI 달력자료의 음력 월초 일진과 대조 (독립 표본) */
    var KASI_ILJIN = [
      ['2024-02-10', 0, 4, '갑진'], ['2023-01-22', 6, 4, '경진'], ['2024-04-09', 9, 3, '계묘'],
      ['2023-12-13', 1, 5, '을사'], ['2023-10-15', 2, 6, '병오']
    ];
    KASI_ILJIN.forEach(function (row) {
      var r = K.compute({ birthDate: row[0], birthTime: '12:00', timezone: 'Asia/Seoul', trueSolarTime: false });
      eq('KASI 일진 ' + row[0] + ' = ' + row[3], r.pillars.day.stem + '-' + r.pillars.day.branch, row[1] + '-' + row[2]);
    });

    /* ── 3. 24절기 — KASI 발표값 대조 ───────────────────────── */
    var allYears = [2023, 2024, 2025, 2026];
    allYears.forEach(function (year) {
      var terms = K.solarTermsOfYear(year);
      eq(year + '년 24절기 개수', terms.length, 24);
      var sorted = true;
      for (var i = 1; i < terms.length; i++) if (terms[i].jd <= terms[i - 1].jd) sorted = false;
      assert(year + '년 24절기 시각 오름차순', sorted);
      Object.keys(KASI[year]).forEach(function (name) {
        termCheck(year, terms, name, KASI[year][name], 90);
      });
    });

    /* ── 4. 입춘 1분 전/후 — 년주·월주 전환 ──────────────────── */
    function shiftMinute(local, delta) {
      var ms = new Date(local + ':00+09:00').getTime() + delta * 60000;
      var d = new Date(ms + 9 * 3600000);
      function p(n) { return (n < 10 ? '0' : '') + n; }
      return { date: d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()), time: p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) };
    }

    Object.keys(KASI).forEach(function (year) {
      var moment = KASI[year]['입춘'];
      var before = shiftMinute(moment, -1);
      var after = shiftMinute(moment, 1);

      var b = K.compute({ birthDate: before.date, birthTime: before.time, timezone: 'Asia/Seoul', trueSolarTime: false });
      var a = K.compute({ birthDate: after.date, birthTime: after.time, timezone: 'Asia/Seoul', trueSolarTime: false });

      eq(year + ' 입춘 1분 전 사주년 = ' + (Number(year) - 1), b.meta.sajuYear, Number(year) - 1);
      eq(year + ' 입춘 1분 전 월지 = 축(1)', b.pillars.month.branch, 1);
      eq(year + ' 입춘 1분 전 월간 = ' + MONTH_STEM_BEFORE[year], b.pillars.month.stem, MONTH_STEM_BEFORE[year]);
      eq(year + ' 입춘 1분 후 사주년 = ' + year, a.meta.sajuYear, Number(year));
      eq(year + ' 입춘 1분 후 월지 = 인(2)', a.pillars.month.branch, 2);
      eq(year + ' 입춘 1분 후 월간 = ' + MONTH_STEM_AFTER[year], a.pillars.month.stem, MONTH_STEM_AFTER[year]);
    });

    var feb3 = K.compute({ birthDate: '2026-02-03', birthTime: '23:00', timezone: 'Asia/Seoul', trueSolarTime: false });
    eq('2026-02-03 밤은 2025년', feb3.meta.sajuYear, 2025);
    var feb5 = K.compute({ birthDate: '2026-02-05', birthTime: '09:00', timezone: 'Asia/Seoul', trueSolarTime: false });
    eq('2026-02-05는 2026년', feb5.meta.sajuYear, 2026);

    var jan = K.compute({ birthDate: '2026-01-10', birthTime: '12:00', timezone: 'Asia/Seoul', trueSolarTime: false });
    eq('2026-01-10 사주년 = 2025', jan.meta.sajuYear, 2025);
    eq('2026-01-10 월지 = 축(1)', jan.pillars.month.branch, 1);

    /* ── 5. 경칩(345°) 월주 전환 ─────────────────────────────── */
    var gyeongchipBefore = K.compute({ birthDate: '2026-03-05', birthTime: '22:58', timezone: 'Asia/Seoul', trueSolarTime: false });
    var gyeongchipAfter = K.compute({ birthDate: '2026-03-05', birthTime: '23:00', timezone: 'Asia/Seoul', trueSolarTime: false });
    eq('경칩 1분 전 월지 = 인(2)', gyeongchipBefore.pillars.month.branch, 2);
    eq('경칩 1분 후 월지 = 묘(3)', gyeongchipAfter.pillars.month.branch, 3);
    eq('경칩 후 월간 = 신(7)', gyeongchipAfter.pillars.month.stem, 7);

    /* ── 6. 서머타임 (뉴욕·런던) ───────────────────────────── */
    var nySummer = K.compute({ birthDate: '1990-07-04', birthTime: '12:00', timezone: 'America/New_York', longitude: -74.006, trueSolarTime: false });
    eq('뉴욕 7월 오프셋 = -240분(EDT)', nySummer.meta.offsetMinutes, -240);
    eq('뉴욕 7월 12시 → UTC 16시', new Date(nySummer.meta.utc).getUTCHours(), 16);

    var nyWinter = K.compute({ birthDate: '1990-01-04', birthTime: '12:00', timezone: 'America/New_York', longitude: -74.006, trueSolarTime: false });
    eq('뉴욕 1월 오프셋 = -300분(EST)', nyWinter.meta.offsetMinutes, -300);
    eq('뉴욕 1월 12시 → UTC 17시', new Date(nyWinter.meta.utc).getUTCHours(), 17);

    var london = K.compute({ birthDate: '1990-07-04', birthTime: '12:00', timezone: 'Europe/London', longitude: -0.128, trueSolarTime: false });
    eq('런던 7월 오프셋 = +60분(BST)', london.meta.offsetMinutes, 60);
    eq('런던 7월 12시 → UTC 11시', new Date(london.meta.utc).getUTCHours(), 11);

    var seoulOffset = K.compute({ birthDate: '2026-07-01', birthTime: '12:00', timezone: 'Asia/Seoul', trueSolarTime: false });
    eq('서울 오프셋 = +540분', seoulOffset.meta.offsetMinutes, 540);

    /* ── 7. 진태양시 (서울 경도 보정) ───────────────────────── */
    var solar = K.compute({ birthDate: '2026-07-01', birthTime: '12:00', timezone: 'Asia/Seoul', longitude: 126.978, trueSolarTime: true });
    assert('서울 진태양시 보정 -40~-30분', solar.meta.solarCorrectionMinutes < -30 && solar.meta.solarCorrectionMinutes > -40,
      'corr=' + solar.meta.solarCorrectionMinutes.toFixed(2) + 'min');
    assert('진태양시 기준 시각 11시대', solar.meta.solarTime.slice(11, 13) === '11', solar.meta.solarTime);

    var solarNY = K.compute({ birthDate: '2026-07-01', birthTime: '12:00', timezone: 'America/New_York', longitude: -74.006, trueSolarTime: true });
    assert('뉴욕 진태양시 보정 약 -54분', Math.abs(solarNY.meta.solarCorrectionMinutes + 54) < 7,
      'corr=' + solarNY.meta.solarCorrectionMinutes.toFixed(2));

    /* ── 8. 시간 모름 (3주 6글자) ───────────────────────────── */
    var unknown = K.compute({ birthDate: '1990-05-20', timeUnknown: true, timezone: 'Asia/Seoul', longitude: 126.978 });
    eq('시간 모름 → 시주 null', unknown.pillars.hour, null);
    eq('시간 모름 → 글자 수 6', unknown.fiveElements.total, 6);
    var sum6 = 0;
    K.ELEMENTS.forEach(function (e) { sum6 += unknown.fiveElements.counts[e]; });
    eq('시간 모름 오행 합계 6', sum6, 6);
    eq('시간 모름 일주는 정오 기준과 같음', unknown.pillars.day.index,
      K.compute({ birthDate: '1990-05-20', birthTime: '12:00', timezone: 'Asia/Seoul' }).pillars.day.index);
    eq('시간 모름 meta 플래그', unknown.meta.timeUnknown, true);

    /* ── 9. 윤년 ───────────────────────────────────────────── */
    var leap = K.compute({ birthDate: '2000-02-29', birthTime: '12:00', timezone: 'Asia/Seoul', trueSolarTime: false });
    var leapNext = K.compute({ birthDate: '2000-03-01', birthTime: '12:00', timezone: 'Asia/Seoul', trueSolarTime: false });
    eq('2000-02-29 → 03-01 일주 +1', (leapNext.pillars.day.index - leap.pillars.day.index + 60) % 60, 1);
    assert('2024-02-29 계산됨', K.compute({ birthDate: '2024-02-29', birthTime: '12:00' }).ok === true);

    /* ── 10. 시주·자시 ─────────────────────────────────────── */
    var h00 = K.compute({ birthDate: '2026-05-20', birthTime: '00:30', timezone: 'Asia/Seoul', trueSolarTime: false });
    eq('00:30 시지 = 자(0)', h00.pillars.hour.branch, 0);
    var h01 = K.compute({ birthDate: '2026-05-20', birthTime: '01:10', timezone: 'Asia/Seoul', trueSolarTime: false });
    eq('01:10 시지 = 축(1)', h01.pillars.hour.branch, 1);
    var h23 = K.compute({ birthDate: '2026-05-20', birthTime: '23:10', timezone: 'Asia/Seoul', trueSolarTime: false });
    eq('23:10 시지 = 자(0)', h23.pillars.hour.branch, 0);

    var midnightRule = K.compute({ birthDate: '2026-05-20', birthTime: '23:30', timezone: 'Asia/Seoul', trueSolarTime: false, jasi: 'midnight' });
    var classicRule = K.compute({ birthDate: '2026-05-20', birthTime: '23:30', timezone: 'Asia/Seoul', trueSolarTime: false, jasi: 'classic' });
    eq('자시설 차이: 일주 +1', (classicRule.pillars.day.index - midnightRule.pillars.day.index + 60) % 60, 1);

    var gapDay = K.compute({ birthDate: '1900-01-01', birthTime: '00:30', timezone: 'Asia/Seoul', trueSolarTime: false });
    eq('갑일 자시 = 갑(0)', gapDay.pillars.hour.stem, 0);

    /* ── 11. 60갑자 인덱스 ─────────────────────────────────── */
    eq('갑자 index 0', K.gapjaIndex(0, 0), 0);
    eq('무오 index 54', K.gapjaIndex(4, 6), 54);
    eq('계해 index 59', K.gapjaIndex(9, 11), 59);
    eq('없는 조합(갑축) = -1', K.gapjaIndex(0, 1), -1);

    /* ── 12. 오행·십성 ─────────────────────────────────────── */
    var sample = K.compute({ birthDate: '1990-05-20', birthTime: '14:30', timezone: 'Asia/Seoul', longitude: 126.978 });
    eq('오행 합계 8', sample.fiveElements.total, 8);
    var pct = 0;
    K.ELEMENTS.forEach(function (e) { pct += sample.fiveElements.percent[e]; });
    assert('오행 비율 합 100 근사', Math.abs(pct - 100) <= 2, 'pct=' + pct);
    assert('일간 자신은 비견으로 집계', sample.tenGods.counts.bigyeon >= 1);
    eq('십성: 갑일 ↔ 경 = 편관', K.tenGodOf(0, 6), 'pyeongwan');
    eq('십성: 갑일 ↔ 계 = 정인', K.tenGodOf(0, 9), 'jeongin');
    eq('십성: 갑일 ↔ 병 = 식신', K.tenGodOf(0, 2), 'siksin');
    eq('십성: 갑일 ↔ 무 = 편재', K.tenGodOf(0, 4), 'pyeonjae');
    eq('십성: 갑일 ↔ 을 = 겁재', K.tenGodOf(0, 1), 'geopjae');

    /* ── 13. 대운 ─────────────────────────────────────────── */
    var male = K.compute({ birthDate: '1990-05-20', birthTime: '14:30', timezone: 'Asia/Seoul', gender: 'male' });
    var female = K.compute({ birthDate: '1990-05-20', birthTime: '14:30', timezone: 'Asia/Seoul', gender: 'female' });
    assert('대운: 남성 계산됨', !!male.daeun && male.daeun.list.length === 10);
    assert('대운: 여성 계산됨', !!female.daeun && female.daeun.list.length === 10);
    eq('대운: 남녀 방향 반대', male.daeun.forward, !female.daeun.forward);
    assert('대운 시작 나이 0~10세', male.daeun.startAge >= 0 && male.daeun.startAge <= 10, 'age=' + male.daeun.startAge);
    eq('대운 첫 칸 = 월주 다음 칸', male.daeun.list[0].index,
      ((male.pillars.month.index + (male.daeun.forward ? 1 : -1)) % 60 + 60) % 60);
    var daeunOk = true;
    for (var q = 1; q < male.daeun.list.length; q++) {
      var step = (male.daeun.list[q].order - male.daeun.list[q - 1].order);
      if (step !== 1) daeunOk = false;
    }
    assert('대운 10칸 순서', daeunOk);
    assert('대운 십성 코드', K.TEN_GODS.indexOf(male.daeun.list[0].tenGod) >= 0, male.daeun.list[0].tenGod);
    eq('성별 없으면 대운 없음', K.compute({ birthDate: '1990-05-20', birthTime: '14:30' }).daeun, null);

    /* ── 14. 표준 응답 스키마 ──────────────────────────────── */
    var keys = Object.keys(sample).sort().join(',');
    eq('응답 최상위 키', keys, 'daeun,dayMaster,fiveElements,meta,ok,pillars,tenGods');
    eq('meta 필수 키 존재', ['utc', 'kst', 'solarTime', 'timezone', 'sajuYear', 'term'].every(function (k) { return k in sample.meta; }), true);
    assert('결과 JSON에 한자 없음', !/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/.test(JSON.stringify(sample)));
    eq('pillar 필드', Object.keys(sample.pillars.year).sort().join(','),
      'branch,branchElement,index,stem,stemElement,stemYang,tenGod');

    /* ── 15. 입력 검증 ─────────────────────────────────────── */
    eq('날짜 없음 → missing_date', K.compute({}).error, 'missing_date');
    eq('1900년 이전 → out_of_range', K.compute({ birthDate: '1899-12-31', birthTime: '12:00' }).error, 'out_of_range');
    eq('음력은 예약 → calendar_type_unsupported', K.compute({ birthDate: '1990-05-20', calendarType: 'lunar' }).error, 'calendar_type_unsupported');

    /* ── 16. 균시차 ───────────────────────────────────────── */
    var eotFeb = K.equationOfTimeMinutes(Date.UTC(2026, 1, 11, 12));
    var eotNov = K.equationOfTimeMinutes(Date.UTC(2026, 10, 3, 12));
    assert('2월 균시차 -15~-13분', eotFeb > -15 && eotFeb < -13, 'eot=' + eotFeb.toFixed(2));
    assert('11월 균시차 +15.5~+17분', eotNov > 15.5 && eotNov < 17, 'eot=' + eotNov.toFixed(2));

    var passed = results.filter(function (r) { return r.pass; }).length;
    return { total: results.length, passed: passed, failed: results.length - passed, results: results };
  }

  root.KSajooTestSuite = { run: run };
}(typeof globalThis !== 'undefined' ? globalThis : this));
