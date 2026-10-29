# AI 자료실 (@aigents_ai)

인스타그램 게시물의 자세한 방법을 모아 두는 사이트. 기존 자료실 디자인을 그대로 옮기고, 새 안내를 같은 틀로 빠르게 추가할 수 있게 정리했다.

## 폴더

```
index.html          자료실 첫 화면 (이번 안내 · DM 못 받았을 때 · 자료 목록)
404.html            없는 주소로 들어왔을 때
assets/styles.css   공용 디자인 (색·글꼴·첫 화면·목록)
assets/guide.css    안내 페이지 공용 디자인 (단계·실제 화면 캡처·프롬프트 상자)
assets/app.js       검색·필터·복사·체크 (고치지 않는다)
assets/catalog.json 자료 목록 — 새 안내는 여기 한 줄 추가
assets/favicon.svg
sample/             견본 안내 페이지 = 새 안내의 틀
```

## 새 안내 추가하기 (게시물 1편 = 폴더 1개 + 목록 1줄)

1. `sample/` 폴더를 복사해 영문 소문자 이름으로 바꾼다. 예: `meeting-notes/`
2. 새 폴더의 `index.html`에서 바꿀 곳
   - `<title>`, `description`, `og:` 문구
   - `noindex` 줄 삭제 (견본에만 있음)
   - `data-guide-id` = 목록의 `id`
   - 견본 안내 띠(`sample-banner`) 삭제
   - 본문, 프롬프트, 실제 화면 캡처, 공식 출처 링크, 게시물 링크와 번호
3. 실제 화면 캡처는 `새폴더/shots/01.jpg`처럼 넣고, 회색 칸(`shot-placeholder`)을 이미지로 바꾼다.
   ```html
   <div class="shot-frame"><img src="shots/01.jpg" alt="메모 앱에서 전체 선택 메뉴를 연 화면"><span class="shot-mark" style="left:62%;top:38%">1</span></div>
   ```
   `shot-mark`의 left·top 값으로 누를 곳에 번호를 찍는다. 개인정보·알림·다른 앱은 캡처 전에 가린다.
4. `assets/catalog.json`에 한 줄 추가
   ```json
   {
     "id": "meeting-notes", "code": "001",
     "title": "…", "description": "…", "hook": "이번 안내 카드 한 줄",
     "category": "업무 자동화 | 프롬프트 | 부업 도구",
     "keywords": ["…"], "url": "meeting-notes/",
     "updated": "2026-11-02", "status": "무료 플랜 가능 등 조건 한 줄",
     "letter": "회", "featured": true,
     "ticket": { "label": "MEETING / NOTES GUIDE", "big": "3단계", "unit": "STEPS" }
   }
   ```
   - `featured: true`는 한 개만. 이전 안내에서는 지운다.
   - `code`는 인스타 게시물 마지막 장에 적는 번호와 같게 (No.001).
   - 첫 실제 안내를 올릴 때 견본(`sample-meeting-notes`) 줄을 지운다.
5. ManyChat DM 링크는 `https://<주소>/meeting-notes/` 로. DM이 실패했을 때 쓰는 링크는 `https://<주소>/?q=001`.

## 올리는 곳

GitHub Pages(공개 저장소 `<계정>.github.io`)에 이 폴더 내용을 그대로 올린다. 모든 경로가 상대 경로라 도메인을 연결해도 그대로 동작한다. 404.html만 사이트 맨 위 기준 경로를 쓴다.

글꼴: SUIT (SIL Open Font License) — jsDelivr에서 불러온다.
