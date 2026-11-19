# Ajak Studio

아이디어가 앱이 되는 스튜디오 — 만든 앱을 한곳에 모은 공개 쇼케이스 포털.
`https://ajak-75.github.io/` (저장소 `ajak-75/ajak-75.github.io`, `main` 브랜치 루트가 그대로 배포됨)

## 구성

| 파일 | 역할 |
| --- | --- |
| `index.html` | 쇼케이스 한 페이지 (정적 셸 + `data-i18n` 슬롯) |
| `styles.css` | 순백색 스튜디오 갤러리 톤 · 모바일 375px / 데스크톱 반응형 |
| `apps.js` | **앱 목록 데이터** — 새 앱은 이 배열에 항목 하나만 추가 |
| `i18n.js` | 문구 사전 15개 언어(ko·en·ja·zh·zh-TW·es·fr·de·pt·it·ru·id·vi·th·ar) |
| `app.js` | 카드 렌더 · 기기 언어 자동 감지 · 자동 번역 폴백 · PWA 등록 |
| `manifest.webmanifest` · `sw.js` | PWA(설치 가능) + 오프라인 셸 캐시 |
| `icons/` | 파비콘·앱 아이콘·OG 커버 (`tools/make-icons.py`로 생성) |
| `apps/` | 카드에 쓰는 앱 아이콘 (Ajak · KOMI-Diary · KOMI & MOMO POP · K-Sajoo · ABI) |
| `komi-pop/` | KOMI & MOMO POP — 합치기 퍼즐 게임 (자체 2D 물리 · 캔버스 벡터 스프라이트 · 12개 언어) |

## 새 앱 추가하기

`apps.js` 배열에 한 항목을 추가하면 카드·배지·링크가 자동으로 만들어진다.

```js
{
  id: 'my-app',
  name: 'My App',
  status: 'live',                     // 'live' | 'soon'
  category: 'Utility · Daily',
  url: 'https://ajak-75.github.io/my-app/',
  icon: './apps/my-app.png',          // 192px
  icon2x: './apps/my-app-512.png',    // 512px (선택)
  iconBg: '#FFFFFF',                  // 아이콘 뒤 타일 배경색. 'transparent'면 흰 박스 없이 그림자만
  desc: {
    ko: '한 줄 소개',
    en: 'One-line description'
    // ja·zh·zh-tw·es 는 선택. 그 밖의 언어는 접속 기기에서 자동 번역된다.
  }
}
```

## 다국어

- 접속 기기 언어(`navigator.languages[0] || navigator.language`)를 먼저 읽고, `?lang=fr` 쿼리와
  상단 언어 선택이 그보다 우선한다(선택값은 기기에 저장됨).
- 내장 15개 언어(문구 + 앱 소개 모두)는 즉시 표시. 그 밖의 언어는 Google Translate 공개 API로
  한 번 번역해 `localStorage`에 캐시하고, 번역이 실패하면 영어로 받쳐 둔다.
- 앱 소개(`apps.js`의 `desc`)에 해당 언어가 비어 있으면 그 소개만 자동 번역된다.

## 로컬 확인

```bash
python3 -m http.server 8080   # 이 폴더에서
# http://localhost:8080/?lang=en
```

## 배포

`main` 브랜치 루트를 그대로 올리면 GitHub Pages(유저 사이트)가 `https://ajak-75.github.io/`로 서비스한다.
`apps/` 아이콘을 바꾸면 `sw.js`의 `VER`를 올려 캐시를 갱신한다.

아이콘 PNG에 알파(투명)가 있으면 `iconBg: 'transparent'`로 둔다. 카드에서는 흰 사각 타일·테두리 없이
`filter: drop-shadow(...)`만 아이콘 윤곽을 따라가고, OG 커버(`tools/make-icons.py`)도 사각 그림자 대신
alpha 실루엣 그림자를 쓴다.
