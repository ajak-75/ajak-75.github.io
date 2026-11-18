# K-Sajoo engine — API 규격 (v1.0.0)

`engine.js`는 화면과 완전히 분리된 순수 계산 모듈입니다. UI 테마를 바꾸거나 모바일 앱으로 옮겨도
이 파일은 고치지 않습니다. 모든 화면(시안 1·2·3)은 아래 **하나의 표준 JSON**만 받아 그립니다.

- 의존성 없음, 전역 `KSajoo` (브라우저) / `module.exports` (Node·번들러)
- 결과에 **한자 필드가 없습니다.** 값은 숫자·코드·ISO 문자열뿐이고, 사람이 읽는 표기는 UI의 i18n이 맡습니다.
- 계산 기준: 태양 겉보기 황경(VSOP87 축약 + 장동 + 광행차)으로 24절기 시각을 구하고,
  IANA 타임존으로 서머타임을 반영한 뒤, 표준시 또는 진태양시(경도 + 균시차)로 시주·일주를 정합니다.

## 요청 (Request)

```js
KSajoo.compute({
  birthDate: '1990-05-20',        // 'YYYY-MM-DD' 양력 (필수)
  birthTime: '14:30',             // 'HH:mm' — timeUnknown 이면 생략 가능
  timeUnknown: false,             // true면 년·월·일 3주(6글자)로 계산
  timezone: 'Asia/Seoul',         // IANA 타임존 (기본 Asia/Seoul)
  longitude: 126.978,             // 출생지 경도 (기본 126.978, 서울)
  trueSolarTime: true,            // 진태양시 보정 (기본 true)
  calendarType: 'solar',          // 'solar' 지원. 'lunar'는 예약(미지원 → 오류 코드)
  gender: 'male',                 // 'male' | 'female' — 대운 계산에 사용. 없으면 daeun: null
  jasi: 'midnight'                // 'midnight'(기본, 00시 넘김) | 'classic'(23시 넘김)
})
```

| 필드 | 형식 | 기본값 | 설명 |
|---|---|---|---|
| `birthDate` | `YYYY-MM-DD` | — | 양력 생년월일. 1900~2100년 |
| `birthTime` | `HH:mm` | — | 출생지 현지 시각 |
| `timeUnknown` | boolean | `false` | 시간을 모르면 `true` |
| `timezone` | IANA string | `Asia/Seoul` | 서머타임 자동 반영 |
| `longitude` | number | `126.978` | 진태양시 경도 보정 |
| `trueSolarTime` | boolean | `true` | `false`면 표준시(벽시계) 기준 |
| `calendarType` | string | `solar` | `lunar`는 아직 미지원 |
| `gender` | string | `null` | 대운 방향 결정 |
| `jasi` | string | `midnight` | 자시설 |

## 응답 (Response)

```jsonc
{
  "ok": true,
  "meta": {
    "engine": "k-sajoo-engine", "version": "1.0.0",
    "birthDate": "1990-05-20", "birthTime": "14:30", "timeUnknown": false,
    "timezone": "Asia/Seoul", "longitude": 126.978, "trueSolarTime": true,
    "calendarType": "solar", "gender": "male", "jasi": "midnight",
    "utc": "1990-05-20T05:30:00.000Z",
    "kst": "1990-05-20T14:30:00.000Z",
    "offsetMinutes": 540,
    "solarTime": "1990-05-20T14:01",            // 사주 계산에 쓴 현지 시각
    "solarCorrectionMinutes": -28.6,            // 진태양시 보정(경도+균시차)
    "longitudeCorrectionMinutes": -32.1,
    "eotMinutes": 3.5,
    "sajuYear": 1990,
    "monthIndex": 4,                            // 0=인월 … 11=축월
    "term": { "angle": 75, "at": "1990-06-06T00:00:00.000Z",
              "nextAngle": 105, "nextAt": "1990-07-07T00:00:00.000Z",
              "nearBoundary": false }
  },
  "pillars": {
    "year":  { "index": 6, "stem": 6, "branch": 6, "stemElement": "metal",
               "branchElement": "fire", "stemYang": true, "tenGod": "jeonggwan" },
    "month": { "index": 7, "stem": 7, "branch": 5, "...": "..." },
    "day":   { "index": 9, "stem": 9, "branch": 9, "tenGod": "self" },
    "hour":  { "index": 12, "stem": 2, "branch": 2, "tenGod": "pyeonjae" }
  },
  "fiveElements": {
    "counts": { "wood": 0, "fire": 3, "earth": 2, "metal": 2, "water": 1 },
    "percent": { "wood": 0, "fire": 38, "earth": 25, "metal": 25, "water": 12 },
    "total": 8, "dominant": "fire", "absent": "wood"
  },
  "dayMaster": { "index": 9, "element": "water", "yang": false },
  "tenGods": {
    "byPillar": { "year": "jeonggwan", "month": "jeongin", "day": "self", "hour": "pyeonjae" },
    "counts": { "bigyeon": 1, "jeonggwan": 1, "jeongin": 1, "pyeonjae": 1 }
  },
  "daeun": {
    "forward": true, "startAge": 5, "startMonths": 6, "startAgeExact": 5.5,
    "list": [
      { "order": 1, "index": 8, "startAge": 5, "startYear": 1995,
        "stem": 8, "branch": 8, "tenGod": "bigyeon" }
    ]
  }
}
```

### 코드 값

| 필드 | 값 |
|---|---|
| `stem` | `0`~`9` — 갑·을·병·정·무·기·경·신·임·계 |
| `branch` | `0`~`11` — 자·축·인·묘·진·사·오·미·신·유·술·해 |
| `stemElement`, `branchElement` | `wood` `fire` `earth` `metal` `water` |
| `tenGod` | `self` `bigyeon` `geopjae` `siksin` `sangwan` `pyeonjae` `jeongjae` `pyeongwan` `jeonggwan` `pyeonin` `jeongin` |
| `monthIndex` | `0`(인월) ~ `11`(축월) |
| `jasi` | `midnight` \| `classic` |
| `error` | `missing_date` `invalid_date` `invalid_time` `out_of_range` `calendar_type_unsupported` `term_range` |

### 화면 표기 원칙

1. 화면에 나가는 이름은 전부 i18n이 만듭니다. 엔진은 이름을 만들지 않습니다.
2. 한국어 화면에는 한자를 쓰지 않습니다. (갑목·자(쥐)·양의 나무처럼 한글만)
3. 일본어·중국어 로케일은 그 언어의 자연스러운 표기를 씁니다.
4. 언어를 더할 때는 `i18n.js`에 항목 하나만 추가하면 되고, 엔진은 그대로입니다.

## 테스트

```bash
node test/run.mjs          # Node
python3 test/run_quickjs.py # Node 없이 (개발용)
```

브라우저에서는 `test/run.html`을 엽니다. 절기 값은 한국천문연구원(KASI) 달력자료의
2023~2026년 표와 대조하고, 입춘 1분 전/후·경칩 1분 전/후·서머타임·윤년·시간 모름·대운을 확인합니다.
