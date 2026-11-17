/* 공통: 헤더·푸터·하위 메뉴·페이지 틀 렌더링 (시안용)
   불러오는 순서: data.js → store.js → ui.js → member.js → site.js */
(function () {
  const Q = new URLSearchParams(location.search);
  const file = (location.pathname.split('/').pop() || 'home.html');
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MEMBER_PAGES = { 'login.html': ['로그인', 'login'], 'join.html': ['회원가입', 'join'], 'mypage.html': ['마이페이지', 'mypage'] };

  /* 현재 페이지가 어느 메뉴 항목인지 */
  function currentHref() {
    if (file === 'page.html') return 'page.html?s=' + Q.get('s');
    if (file === 'board.html' || file === 'board-view.html' || file === 'write.html') return 'board.html?b=' + Q.get('b');
    if (file.startsWith('sermon')) return 'sermons.html';
    if (file.startsWith('album')) return 'album.html';
    if (file === 'schedule.html') return 'schedule.html';
    return null;
  }
  const cur = currentHref();
  let curGroup = -1, curItem = null;
  MENU.forEach((g, gi) => g.items.forEach(it => { if (it[1] === cur) { curGroup = gi; curItem = it; } }));

  /* ---------- 헤더 + 로그인 영역 ---------- */
  const here = encodeURIComponent(file + location.search);
  function authLinks(mobile) {
    const m = Store.me();
    if (!m) return `<a href="login.html?next=${here}">로그인</a><a href="join.html?next=${here}">회원가입</a>`;
    return `<span class="who"><b>${esc(m.name)}</b>님</span><a href="mypage.html">마이페이지</a><button type="button" data-action="logout">로그아웃</button>` + (Store.isAdmin() ? '<em class="adm">관리자 모드</em>' : '');
  }
  const hd = $('#hd');
  if (hd) {
    hd.insertAdjacentHTML('beforebegin', `<div class="hd-top"><div class="wrap">${authLinks()}</div></div>`);
    hd.innerHTML = `<div class="wrap hd-in">
      <a class="logo" href="home.html"><img class="logo-img" src="img/brand/icon-192.png" alt=""><span class="logo-txt">${CHURCH.name}</span></a>
      <nav class="gnb" id="gnb" aria-label="주 메뉴"><div class="gnb-user">${authLinks()}</div><ul>${MENU.map((g, gi) => `<li class="${gi === curGroup ? 'cur' : ''}"><a href="${g.items[0][1]}" aria-controls="gnb-sub-${gi}">${g.label}</a>
        <ul class="sub" id="gnb-sub-${gi}">${g.items.map(it => `<li><a href="${it[1]}"${it === curItem ? ' class="on" aria-current="page"' : ''}>${it[0]}</a></li>`).join('')}</ul></li>`).join('')}</ul></nav>
      <button class="burger" id="burger" aria-label="메뉴 열기" aria-controls="gnb" aria-expanded="false"><span class="ms" aria-hidden="true">menu</span></button></div>`;
    const b = $('#burger'), g = $('#gnb');
    const groups = [...g.querySelectorAll(':scope > ul > li > a')];
    const setMenu = open => {
      g.classList.toggle('open', open); document.body.classList.toggle('lock', open || !!document.querySelector('.modal,.lightbox'));
      b.setAttribute('aria-expanded', String(open)); b.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
      b.querySelector('.ms').textContent = open ? 'close' : 'menu';
    };
    b.addEventListener('click', () => setMenu(!g.classList.contains('open')));
    groups.forEach(a => a.addEventListener('click', e => {
      if (innerWidth <= 1024) { e.preventDefault(); const open = a.parentElement.classList.toggle('on'); a.setAttribute('aria-expanded', String(open)); }
    }));
    const syncMenu = () => {
      if (innerWidth > 1024) setMenu(false);
      groups.forEach(a => { if (innerWidth <= 1024) a.setAttribute('aria-expanded', String(a.parentElement.classList.contains('on'))); else a.removeAttribute('aria-expanded'); });
    };
    addEventListener('resize', syncMenu); syncMenu();
    document.addEventListener('keydown', e => {
      if (!g.classList.contains('open')) return;
      if (e.key === 'Escape') { setMenu(false); b.focus(); }
      if (e.key === 'Tab') {
        const focusable = [...g.querySelectorAll('a,button'), b].filter(el => el.getClientRects().length);
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ---------- 푸터 ---------- */
  const ft = $('#ft');
  if (ft) ft.innerHTML = `<div class="wrap ft-in">
      <div class="ft-logo">${CHURCH.name}</div>
      <div class="ft-info"><p>${CHURCH.address}</p><p><span>전화 ${CHURCH.phone}</span><span>팩스 ${CHURCH.fax}</span></p></div>
      <div class="ft-visit"><p class="lb">방문자</p><p>오늘 <b>${CHURCH.visitorToday}</b><i></i>전체 <b>${CHURCH.visitorTotal}</b></p></div>
    </div><div class="wrap ft-copy">Copyright &copy; ${CHURCH.name}. All Rights Reserved.</div>`;

  /* ---------- 홈: 공지사항은 저장된 글까지 포함해서 보여줌 ---------- */
  const hn = $('[data-slot="home-notice"]');
  if (hn) hn.innerHTML = Store.allPosts('notice').slice(0, 6).map(p => `<li><a href="board-view.html?b=notice&id=${p.id}"><span class="t">${esc(p.title)}</span><span class="d">${p.date.slice(5)}</span></a></li>`).join('');

  /* ---------- 하위 페이지 공통 틀 ---------- */
  const sub = $('#sub');
  if (!sub) return;

  /* 로그인·가입·마이페이지 (왼쪽 메뉴 없는 틀) */
  if (MEMBER_PAGES[file]) {
    const [ttl, fn] = MEMBER_PAGES[file];
    document.title = ttl + ' | ' + CHURCH.name;
    sub.insertAdjacentHTML('beforebegin', `<section class="sv"><div class="wrap sv-in"><nav class="crumb" aria-label="현재 위치"><a href="home.html">홈</a><span aria-hidden="true">›</span><span>회원</span><span aria-hidden="true">›</span><b aria-current="page">${ttl}</b></nav><h1 class="sv-title">${ttl}</h1></div></section>`);
    sub.innerHTML = `<div class="wrap mb-wrap${fn === 'mypage' ? ' wide' : ''}"><div id="content"></div></div>`;
    Member[fn]($('#content'));
    return;
  }

  const group = MENU[curGroup] || MENU[0];
  const title = curItem ? curItem[0] : '';
  const heading = file === 'write.html' ? (Q.get('edit') ? '글 수정' : '글쓰기') : title;
  document.title = heading + ' | ' + CHURCH.name;
  sub.insertAdjacentHTML('beforebegin', `<section class="sv">
      <div class="wrap sv-in"><nav class="crumb" aria-label="현재 위치"><a href="home.html">홈</a><span aria-hidden="true">›</span><a href="${group.items[0][1]}">${group.label}</a><span aria-hidden="true">›</span>${file === 'write.html' ? `<a href="board.html?b=${Q.get('b')}">${title}</a><span aria-hidden="true">›</span>` : ''}<b aria-current="page">${heading}</b></nav><h1 class="sv-title">${heading}</h1></div></section>
    <nav class="snb-m" aria-label="${group.label} 하위 메뉴"><div class="wrap"><ul>${group.items.map(it => `<li><a href="${it[1]}"${it === curItem ? ' class="on"' : ''}>${it[0]}</a></li>`).join('')}</ul></div></nav>`);
  sub.innerHTML = `<div class="wrap sub-wrap">
      <aside class="snb"><h2>${group.label}</h2><ul>${group.items.map(it => `<li><a href="${it[1]}"${it === curItem ? ' class="on"' : ''}>${it[0]}<span class="ms">chevron_right</span></a></li>`).join('')}</ul></aside>
      <main class="sub-main">
      <div id="content"></div></main></div>`;
  const C = $('#content');
  const onChip = $('.snb-m a.on'); if (onChip) { const ul = onChip.closest('ul'); ul.scrollLeft = onChip.offsetLeft - (ul.clientWidth - onChip.offsetWidth) / 2; }

  /* 페이지 넘김 (실제 개수만큼) */
  const pageUrl = p => { const u = new URLSearchParams(location.search); if (p > 1) u.set('p', p); else u.delete('p'); const s = u.toString(); return file + (s ? '?' + s : ''); };
  const pager = (total, size, cur) => {
    const n = Math.ceil(total / size); if (n <= 1) return '';
    const from = Math.max(1, Math.min(cur - 2, n - 4)), to = Math.min(n, from + 4);
    let h = `<a class="pg prev" href="${pageUrl(Math.max(1, cur - 1))}" aria-label="이전 쪽"${cur === 1 ? ' aria-disabled="true"' : ''}><span class="ms">chevron_left</span></a>`;
    for (let i = from; i <= to; i++) h += `<a class="pg${i === cur ? ' on' : ''}" href="${pageUrl(i)}"${i === cur ? ' aria-current="page"' : ''}>${i}</a>`;
    return `<nav class="pager" aria-label="쪽 이동">${h}<a class="pg next" href="${pageUrl(Math.min(n, cur + 1))}" aria-label="다음 쪽"${cur === n ? ' aria-disabled="true"' : ''}><span class="ms">chevron_right</span></a></nav>`;
  };
  const curPage = total => Math.min(Math.max(1, +Q.get('p') || 1), Math.max(1, Math.ceil(total / 1)));
  const canWrite = b => { const r = WRITE_RULE[b]; return r === 'all' || (r === 'admin' && Store.isAdmin()); };

  /* ---------- 글 페이지 ---------- */
  if (file === 'page.html') {
    const P = PAGES[Q.get('s')];
    C.innerHTML = P ? `<div class="page-body">${P.body}</div>` : '<p class="empty">준비 중입니다.</p>';
  }

  /* ---------- 글쓰기 ---------- */
  if (file === 'write.html') Member.write(C, Q.get('b'), Q.get('edit'));

  /* ---------- 게시판 목록 ---------- */
  if (file === 'board.html') {
    const b = Q.get('b'), B = BOARDS[b];
    if (!B) { C.innerHTML = '<p class="empty">없는 게시판입니다.</p>'; return; }
    const q = (Q.get('q') || '').trim(), size = B.bulletin ? 8 : 10;
    let posts = Store.allPosts(b);
    if (q) posts = posts.filter(p => (p.title + ' ' + p.author).toLowerCase().includes(q.toLowerCase()));
    const total = posts.length, page = Math.min(Math.max(1, +Q.get('p') || 1), Math.max(1, Math.ceil(total / size)));
    const view = posts.slice((page - 1) * size, page * size);
    const tools = `<div class="bd-tools"><p class="bd-count">${q ? `“${esc(q)}” 검색 결과 ` : '전체 '}<b>${total}</b>건${q ? ` · <a class="bd-all" href="board.html?b=${b}">전체 보기</a>` : ''}</p>
      <form class="bd-search" action="board.html" method="get" role="search"><input type="hidden" name="b" value="${b}"><input type="search" name="q" value="${esc(q)}" placeholder="검색어를 입력하세요" aria-label="검색어"><button type="submit" aria-label="검색"><span class="ms">search</span></button></form>
      ${canWrite(b) ? `<a class="btn sm" href="write.html?b=${b}">글쓰기</a>` : ''}</div>`;
    if (!total) { C.innerHTML = tools + `<p class="empty">${q ? '검색 결과가 없습니다.' : '등록된 글이 없습니다.'}</p>`; }
    else if (B.bulletin) {
      C.innerHTML = tools + `<ul class="bul-grid">${view.map(p => `<li><a href="board-view.html?b=${b}&id=${p.id}">
        <span class="b-cover"><span class="b-church">${CHURCH.name}</span><span class="b-title">주 보</span><span class="b-no">${p.title.replace(' 주보', '')}</span><img src="${PHOTOS[(+p.id + 3) % 5]}" alt=""></span>
        <span class="bul-t">${p.title}</span></a></li>`).join('')}</ul>` + pager(total, size, page);
    } else {
      C.innerHTML = tools + `<ul class="bd-list"><li class="bd-head"><span class="no">번호</span><span class="t">제목</span><span class="w">작성자</span><span class="d">날짜</span><span class="v">조회</span></li>
        ${view.map((p, i) => `<li${p.pinned ? ' class="pin"' : ''}><span class="no">${p.pinned ? '<em>공지</em>' : total - ((page - 1) * size + i)}</span>
        <a class="t" href="board-view.html?b=${b}&id=${p.id}"><span class="t-txt">${esc(p.title)}</span>${p.comments ? `<span class="cmt-n" aria-label="댓글 ${p.comments}개">[${p.comments}]</span>` : ''}${p.hasFile ? '<span class="ms att" title="첨부파일">attach_file</span>' : ''}${p.hasPhoto ? '<span class="ms att" title="사진">image</span>' : ''}${p.user && Store.isMine(p.owner) ? '<em class="me">내 글</em>' : ''}</a>
        <span class="w">${esc(p.author)}</span><span class="d">${p.date}</span><span class="v">${p.views}</span></li>`).join('')}</ul>` + pager(total, size, page);
    }
  }

  /* ---------- 게시판 상세 ---------- */
  if (file === 'board-view.html') {
    const b = Q.get('b'), B = BOARDS[b], posts = B ? Store.allPosts(b) : [];
    const id = String(Q.get('id') || '1'), i = posts.findIndex(p => p.id === id), p = posts[i];
    if (!B || !p) { C.innerHTML = `<p class="empty">글을 찾을 수 없습니다. 삭제되었을 수 있습니다.</p><div class="btn-row center"><a class="btn line" href="board.html?b=${b}">목록으로</a></div>`; return; }
    const U = p.user ? Store.getPost(id) : null;
    if (U) { Store.addView(id); p.views = (U.views || 0) + 1; }
    const mine = !!U && Store.isMine(U.owner), canDel = mine || (!!U && Store.isAdmin());
    let body = '';
    if (B.bulletin) {
      const heads = ['예배 순서', '교회 소식', '이번 주 말씀', '섬기는 분들'];
      body = `<div class="bul-pages">${heads.map((h, n) => `<figure class="bul-page"><div class="paper"><p class="pp-hd">${CHURCH.name} 주보 · ${p.date}</p><p class="pp-t">${h}</p>${'<i></i>'.repeat(9)}</div><figcaption>${n + 1}면</figcaption></figure>`).join('')}</div>
        <div class="btn-row center" style="margin-top:28px"><button type="button" class="btn line" data-action="soon"><span class="ms">download</span>주보 내려받기</button></div>
        <p class="note-box">실제 사이트에서는 주보 사진이 들어가고, 누르면 크게 보고 내려받을 수 있습니다.</p>`;
    } else if (U) {
      body = `<div class="rt" data-gallery>${Store.sanitize(U.html).replace(/<img /g, '<img data-view loading="lazy" ')}</div>`;
    } else {
      const pb = POST_BODY[b];
      body = `<div class="prose">${pb ? pb.map(t => `<p>${t}</p>`).join('') : `<p>${esc(p.title)} 내용을 알려 드립니다.</p>
        <p>성도 여러분의 많은 관심과 기도 부탁드립니다.</p>
        <p>· 일시: 2026년 11월 22일(주일) 오후 3:30<br>· 장소: 본당<br>· 문의: 교회 사무실 ${CHURCH.phone}</p>`}</div>
        ${B.photo ? `<div class="post-photos" data-gallery>${PHOTOS.slice(1, 4).map(s => `<img src="${s}" alt="" data-view>`).join('')}</div>` : ''}
        ${B.file || p.hasFile ? '<div class="attach"><span class="ms">attach_file</span><a href="#" data-action="soon">안내문.pdf</a><span class="size">(320KB)</span><button type="button" class="btn sm line" data-action="soon">내려받기</button></div>' : ''}`;
    }
    /* 같은 게시판의 다른 글 (현재 글과 가까운 5개) */
    const others = posts.map((x, k) => ({ x, k })).filter(o => o.x.id !== id).sort((a, c) => Math.abs(a.k - i) - Math.abs(c.k - i)).slice(0, 5).sort((a, c) => a.k - c.k).map(o => o.x);
    C.innerHTML = `<article class="post"><header class="post-hd"><h3>${esc(p.title)}</h3>
        <p class="post-meta"><span>${esc(p.author)}</span><span>${p.date}</span><span>조회 ${p.views}</span>${B.bulletin ? '' : `<span>댓글 <b data-cmt-count>${p.comments}</b></span>`}${U && U.edited ? '<span>수정됨</span>' : ''}</p></header>
        <div class="post-body">${body}</div></article>
      <div class="post-actions"><a class="btn line" href="board.html?b=${b}">목록으로</a><span class="pa-r">
        <button type="button" class="btn line" data-copy="page">공유</button><button type="button" class="btn line" data-action="print">인쇄</button>
        ${mine ? `<a class="btn line" href="write.html?b=${b}&edit=${id}">수정</a>` : ''}${canDel ? `<button type="button" class="btn line danger-t" data-action="post-del" data-id="${id}" data-board="${b}"><span class="ms">delete</span>삭제</button>` : ''}</span></div>
      ${B.bulletin ? '' : '<div id="cmt"></div>'}
      ${others.length ? `<section class="related" aria-label="같은 게시판의 다른 글"><h3 class="rel-h">${B.title}의 다른 글</h3><ul class="rel-list">${others.map(x => `<li><a href="board-view.html?b=${b}&id=${x.id}"><span class="rel-t">${esc(x.title)}${x.comments ? `<span class="cmt-n">(${x.comments})</span>` : ''}</span><span class="rel-m">${esc(x.author)}<i></i>${x.date}</span></a></li>`).join('')}</ul></section>` : ''}`;
    if (!B.bulletin) Member.comments($('#cmt'), b, id);
  }

  /* ---------- 설교 목록 ---------- */
  const sermonCard = s => `<li><a href="sermon-view.html?id=${s.id}"><span class="thumb"><img src="${s.thumb}" alt=""><span class="play"><span class="ms">play_arrow</span></span><span class="dur">${s.dur}</span></span>
      <span class="sc-cat">${s.cat}</span><span class="sc-t">${s.title}</span><span class="sc-m">${s.passage}</span><span class="sc-m">${s.preacher} · ${s.date}</span></a></li>`;
  if (file === 'sermons.html') {
    const c = SERMON_CATS.includes(Q.get('c')) ? Q.get('c') : SERMON_CATS[0], size = 6;
    const list = SERMONS.filter(s => s.cat === c), page = Math.min(Math.max(1, +Q.get('p') || 1), Math.max(1, Math.ceil(list.length / size)));
    C.innerHTML = `<div class="tabs">${SERMON_CATS.map(k => `<a href="sermons.html?c=${encodeURIComponent(k)}"${k === c ? ' class="on"' : ''}>${k}</a>`).join('')}</div>
      <ul class="sermon-grid">${list.slice((page - 1) * size, page * size).map(sermonCard).join('')}</ul>` + pager(list.length, size, page);
  }

  /* ---------- 설교 상세 ---------- */
  if (file === 'sermon-view.html') {
    const s = SERMONS.find(x => x.id === +Q.get('id')) || SERMONS[0];
    const more = SERMONS.filter(x => x.cat === s.cat && x.id !== s.id).slice(0, 3);
    C.innerHTML = `<div class="sv-player" data-action="soon" role="button" tabindex="0" aria-label="영상 재생"><img src="${s.thumb}" alt=""><span class="play big"><span class="ms">play_arrow</span></span><span class="yt-note">유튜브 영상이 들어갈 자리</span></div>
      <div class="sv-info"><span class="sc-cat">${s.cat}</span><h3>${s.title}</h3>
        <p class="sv-meta"><span><a href="#" data-action="soon">${s.passage}</a></span><span>${s.preacher}</span><span>${s.date}</span></p>
        <div class="btn-row"><button type="button" class="btn" data-action="soon">설교 질문지 받기</button><button type="button" class="btn line" data-action="soon">본문 읽기</button><button type="button" class="btn line" data-copy="page">공유</button></div></div>
      <h3 class="h3">${s.cat} 다른 설교</h3><ul class="sermon-grid three">${more.map(sermonCard).join('')}</ul>
      <div class="btn-row center"><a class="btn line" href="sermons.html?c=${encodeURIComponent(s.cat)}">목록으로</a></div>`;
  }

  /* ---------- 포토앨범 ---------- */
  if (file === 'album.html') {
    const size = 6, page = Math.min(Math.max(1, +Q.get('p') || 1), Math.ceil(ALBUMS.length / size));
    C.innerHTML = `<ul class="album-grid">${ALBUMS.slice((page - 1) * size, page * size).map(a => `<li><a href="album-view.html?a=${a.id}"><span class="cover"><img src="${a.photos[0]}" alt=""><span class="cnt"><span class="ms">photo_library</span>${a.photos.length}</span></span>
      <span class="al-t">${a.title}</span><span class="al-d">${a.date}</span></a></li>`).join('')}</ul>` + pager(ALBUMS.length, size, page);
  }
  if (file === 'album-view.html') {
    const k = Math.max(0, ALBUMS.findIndex(x => x.id === +Q.get('a'))), a = ALBUMS[k], prev = ALBUMS[k + 1], next = ALBUMS[k - 1];
    C.innerHTML = `<div class="al-hd"><h3>${a.title}</h3><p>${a.date} · 사진 ${a.photos.length}장</p></div>
      <ul class="photo-list" data-gallery>${a.photos.map((p, i) => `<li><figure><button type="button" data-view data-src="${p}" aria-label="사진 ${i + 1} 크게 보기"><img src="${p}" alt="${esc(a.title)} 사진 ${i + 1}" loading="lazy"></button><figcaption>${i + 1} / ${a.photos.length}</figcaption></figure></li>`).join('')}</ul>
      <div class="btn-row center">${next ? `<a class="btn line" href="album-view.html?a=${next.id}"><span class="ms">chevron_left</span>이전 앨범</a>` : ''}<a class="btn line" href="album.html">앨범 목록</a>${prev ? `<a class="btn line" href="album-view.html?a=${prev.id}">다음 앨범<span class="ms">chevron_right</span></a>` : ''}</div>`;
  }

  /* ---------- 교회 일정 ---------- */
  if (file === 'schedule.html') {
    const pad = n => String(n).padStart(2, '0'), WD = ['일', '월', '화', '수', '목', '금', '토'];
    const now = new Date(), todayS = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    let y = now.getFullYear(), m = now.getMonth(), view = 'cal';
    if (!EVENTS.some(e => e.date.startsWith(y + '-' + pad(m + 1)))) { y = 2026; m = 10; }   // 시안 자료가 있는 달로
    const inDay = (e, ds) => e.end ? (ds >= e.date && ds <= e.end) : e.date === ds;
    function draw() {
      const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate(), ym = y + '-' + pad(m + 1);
      const evs = EVENTS.filter(e => e.date.startsWith(ym) || (e.end && e.end.startsWith(ym))).sort((a, c) => a.date.localeCompare(c.date));
      let cells = '';
      for (let i = 0; i < first; i++) cells += '<div class="cd blank"></div>';
      for (let d = 1; d <= days; d++) {
        const ds = ym + '-' + pad(d), wd = (first + d - 1) % 7, es = EVENTS.filter(e => inDay(e, ds));
        cells += `<div class="cd${wd === 0 ? ' sun' : wd === 6 ? ' sat' : ''}${ds === todayS ? ' today' : ''}${es.length ? ' has' : ''}"${es.length ? ` role="button" tabindex="0" data-action="day-open" data-date="${ds}" aria-label="${m + 1}월 ${d}일 일정 ${es.length}건"` : ''}><span class="n">${d}</span>${es.map(e => `<span class="ev-chip">${esc(e.title)}</span>`).join('')}</div>`;
      }
      const rest = (7 - (first + days) % 7) % 7;
      for (let i = 0; i < rest; i++) cells += '<div class="cd blank"></div>';
      const list = evs.length ? `<ul class="ev-list">${evs.map(e => { const d = new Date(e.date + 'T00:00'); return `<li><span class="ev-d"><b>${pad(d.getMonth() + 1)}.${pad(d.getDate())}</b>${WD[d.getDay()]}</span><span class="ev-t"><b>${esc(e.title)}</b>${e.end ? '~ ' + e.end.slice(5).replace('-', '.') + ' · ' : ''}${e.place}</span></li>`; }).join('')}</ul>` : '<p class="empty">등록된 일정이 없습니다.</p>';
      C.innerHTML = `<div class="cal-tools"><div class="seg" role="group" aria-label="보기 방식"><button type="button" data-action="cal-view" data-v="cal"${view === 'cal' ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"'}><span class="ms">calendar_month</span>달력형</button><button type="button" data-action="cal-view" data-v="list"${view === 'list' ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"'}>목록형</button></div>
          <button type="button" class="btn sm line" data-action="cal-today">오늘</button></div>
        <div class="cal-hd"><button class="cal-nav" data-action="cal-nav" data-d="-1" aria-label="이전 달"><span class="ms">chevron_left</span></button><h3>${y}년 ${m + 1}월</h3><button class="cal-nav" data-action="cal-nav" data-d="1" aria-label="다음 달"><span class="ms">chevron_right</span></button></div>
        ${view === 'cal' ? `<div class="cal"><div class="cal-grid">${WD.map((w, i) => `<div class="wd${i === 0 ? ' sun' : i === 6 ? ' sat' : ''}">${w}</div>`).join('')}${cells}</div></div><h3 class="h3">${m + 1}월 일정</h3>` : ''}${list}`;
    }
    Actions['cal-nav'] = el => { m += +el.dataset.d; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } draw(); };
    Actions['cal-view'] = el => { view = el.dataset.v; draw(); };
    Actions['cal-today'] = () => { y = now.getFullYear(); m = now.getMonth(); draw(); };
    Actions['day-open'] = el => {
      const ds = el.dataset.date, es = EVENTS.filter(e => inDay(e, ds)), d = new Date(ds + 'T00:00');
      Modal.open({ title: `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]}) 일정`, body: `<ul class="modal-ev">${es.map(e => `<li><b>${esc(e.title)}</b><span>${e.end ? e.date.slice(5).replace('-', '.') + ' ~ ' + e.end.slice(5).replace('-', '.') + ' · ' : ''}${e.place}</span></li>`).join('')}</ul>`, actions: [{ label: '닫기', value: true }] });
    };
    draw();
  }
})();
