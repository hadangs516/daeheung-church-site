# 포항대흥교회 사이트 - 디자인 교체 안내 (스티치용)

## 원칙
- `js/`(config, sample-data, data, ui)는 디자인과 무관하다. 건드리지 않는다.
- 디자인을 바꿀 때는 HTML 모양과 CSS만 바꾸고, 아래 `data-*` 속성만 그대로 달아 준다.
- 스크립트는 `config.js → sample-data.js → data.js → ui.js` 순서로 `<script src>` 로 불러온다(모듈 아님).
- 숨김 처리는 `hidden` 속성이다. CSS에 `[hidden]{display:none!important}` 필수.

## 페이지 (6개)
index.html 메인 / sermons.html 설교(목록+상세) / board.html 게시판(목록+상세, ?b=게시판) / album.html 앨범(앨범목록+사진, ?a=앨범) / schedule.html 달력 / page.html 고정 페이지(?s=슬러그)

## 속성 (채울 데이터는 행(row)의 필드 이름)
| 속성 | 뜻 |
|---|---|
| `data-list="출처"` + 자식 `<template>` | 행마다 template 복제. `data-limit` 개수, `data-page-size` 쪽수, `id` 필수(조건부 표시용) |
| `data-pager-for="목록id"` | 쪽 이동 링크를 자동 생성(`a.pg`, 현재 `on`, `prev`/`next`) |
| `data-detail="출처"` | 주소 `?id=` 의 행 하나로 채움. `data-detail-first`(id 없으면 첫 행), `data-title-from="필드"`, 자식 `data-notfound`(없을 때 표시) |
| `data-text="필드"` | 글자 |
| `data-href="필드"` | 링크. 비면 href 제거, `data-href-optional` 이면 요소 숨김, `data-external` 이면 새 창 |
| `data-src="필드"` `data-alt="필드"` | 이미지(비면 숨김) |
| `data-iframe="필드"` | 영상 등 iframe |
| `data-show="필드"` | 값이 있을 때만 표시 |
| `data-blocks="필드"` | 본문. 빈 줄=문단, 모든 줄에 `|` 있으면 표 |
| `data-each="필드"` + `<template>` | 배열(예: images) 반복 |
| `data-viewer` | 클릭 시 사진 크게 보기(다운로드 포함) |
| `data-when="id"` / `"!id"` | 목록·상세 id에 행이 있을 때/없을 때 표시. 특수값: `demo`, `visitor-demo`, `load-error`, `param:이름`, `!param:이름` |
| `data-requires="출처"` | 그 출처가 비었거나 오래되면 숨김(바로가기 등) |
| `data-tabs` | 탭 묶음. 안에 `[data-tab="출처"]`(+`data-more-href`), `[data-tab-list]`(+template), `[data-more]`. 선택된 탭은 `.on` |
| `data-calendar` | 안에 `[data-cal-title]`, `[data-cal-prev]`, `[data-cal-next]`, `[data-cal-grid]`, `[data-cal-list]`(+template: `range`,`title`,`place`), `[data-cal-empty]`. 칸은 `.d`(`has`,`today`,`sun`,`sat`,`blank`), 요일 `.wd` |
| `data-menu` | 메뉴. 그룹 template 안에 `[data-text="label"]`, `[data-menu-items]`(항목 template: `label`,`href`) |
| `data-menu-toggle` | 모바일 메뉴 버튼(`data-menu` 요소에 `open` 클래스) |
| `data-bind="경로"` `data-bind-href` `data-bind-tel` | 설정값: `church.name/address/phone/fax`, `visitor.today/total`, `questionUrl`, `board.title`, `param.이름`, `page.title`(주소 `?s=` 슬러그의 메뉴 이름), `messages.preparing`("준비 중입니다.") |
| `data-notice="키"` | 클릭 시 안내창(`locked`, `notBuilt`) |
| `data-tab-empty` | `data-tabs` 안에서 선택된 탭의 행이 없을 때만 보이는 요소(보통 `hidden` 으로 시작) |
| `data-nav-param="c" data-nav-value="값" [data-nav-source="sermons"]` | 분류 탭 링크 자동 생성, 현재 값은 `.on`, 데이터 없으면 숨김 |

## 출처 문법
`sermons` · `sermons:분류` · `posts:게시판` · `photos[:앨범]` · `albums` · `events` · `pages:슬러그` · 콜론 뒤 `@이름`은 주소창 값으로 대체(예 `sermons:@c`)

## 행 필드
- sermons: id, category, date, dateDot, dateKo, dateLong, title, passage, passageUrl, preacher, video, videoEmbed, videoWatch, questionUrl, detailUrl, listUrl
- posts: id, board, dateDot/Ko/Long, title, body, fileUrl, fileName, photoThumb, images[{thumbUrl,downloadUrl,title}], pinned, detailUrl, no(번호)
- photos: id, album, title, dateDot, thumbUrl, bigUrl, downloadUrl · albums: title, countText, dateDot, coverThumb, detailUrl
- events: date, endDate, dateKo, title, place · pages: slug, title, body, imageThumb, link, linkLabel
- 상세 전용: prevUrl, prevTitle, nextUrl, nextTitle, listHref

## 구글 시트 연결
탭 5개(sermons, posts, photos, events, pages), 첫 줄은 열 이름.
- sermons: category, date, title, passage, preacher, video, question
- posts: board, date, title, body, file_id, file_name, image_ids, photo_id, pinned
- photos: album, date, title, file_id
- events: date, end_date, title, place
- pages: slug, title, body, image_id, link_url, link_label
각 탭을 `파일 > 공유 > 웹에 게시 > CSV` 로 게시해 나온 주소를 `js/config.js` 의 `sheets` 에 넣는다. 비워 두면 예시 데이터가 쓰이고 위에 예시 안내줄이 뜬다.
드라이브 파일 ID 칸에는 ID나 공유 링크를 그대로 붙여 넣어도 된다.

## 초안 단계 설정
`config.js` 의 `showAll: true` 이면 내용이 없거나 오래된 메뉴·탭·바로가기도 모두 보이고, 빈 목록과 빈 페이지에는 `messages.preparing`("준비 중입니다.")가 뜬다. `false` 로 바꾸면 `staleYears` 숨김 규칙이 다시 적용된다.
