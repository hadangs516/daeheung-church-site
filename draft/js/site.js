/* 공통: 헤더·푸터·하위 메뉴·페이지 틀 렌더링 (시안용) */
(function () {
  const Q = new URLSearchParams(location.search);
  const file = (location.pathname.split('/').pop() || 'home.html');
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* 현재 페이지가 어느 메뉴 항목인지 */
  function currentHref() {
    if (file === 'page.html') return 'page.html?s=' + Q.get('s');
    if (file === 'board.html' || file === 'board-view.html') return 'board.html?b=' + Q.get('b');
    if (file.startsWith('sermon')) return 'sermons.html';
    if (file.startsWith('album')) return 'album.html';
    if (file === 'schedule.html') return 'schedule.html';
    return null;
  }
  const cur = currentHref();
  let curGroup = -1, curItem = null;
  MENU.forEach((g, gi) => g.items.forEach(it => { if (it[1] === cur) { curGroup = gi; curItem = it; } }));

  /* ---------- 헤더 ---------- */
  const hd = $('#hd');
  if (hd) {
    hd.innerHTML = `<div class="wrap hd-in">
      <a class="logo" href="home.html"><img class="logo-img" src="img/brand/icon-192.png" alt=""><span class="logo-txt">${CHURCH.name}</span></a>
      <nav class="gnb" id="gnb"><ul>${MENU.map((g, gi) => `<li class="${gi === curGroup ? 'cur' : ''}"><a href="${g.items[0][1]}">${g.label}</a>
        <ul class="sub">${g.items.map(it => `<li><a href="${it[1]}"${it === curItem ? ' class="on"' : ''}>${it[0]}</a></li>`).join('')}</ul></li>`).join('')}</ul></nav>
      <button class="burger" id="burger" aria-label="메뉴 열기"><span class="ms">menu</span></button></div>`;
    const b = $('#burger'), g = $('#gnb');
    b.addEventListener('click', () => { const o = g.classList.toggle('open'); document.body.classList.toggle('lock', o); b.querySelector('.ms').textContent = o ? 'close' : 'menu'; });
    g.querySelectorAll(':scope > ul > li > a').forEach(a => a.addEventListener('click', e => { if (innerWidth <= 1024) { e.preventDefault(); a.parentElement.classList.toggle('on'); } }));
  }

  /* ---------- 푸터 ---------- */
  const ft = $('#ft');
  if (ft) ft.innerHTML = `<div class="wrap ft-in">
      <div class="ft-logo"><span class="ms">church</span>${CHURCH.name}</div>
      <div class="ft-info"><p>${CHURCH.address}</p><p><span>전화 ${CHURCH.phone}</span><span>팩스 ${CHURCH.fax}</span></p></div>
      <div class="ft-visit"><p class="lb">방문자</p><p>오늘 <b>${CHURCH.visitorToday}</b><i></i>전체 <b>${CHURCH.visitorTotal}</b></p></div>
    </div><div class="wrap ft-copy">Copyright © ${CHURCH.name}. All Rights Reserved.</div>`;

  /* ---------- 맨 위로 · 알림(토스트) ---------- */
  const top = document.createElement('button'); top.className = 'to-top'; top.setAttribute('aria-label', '맨 위로');
  top.innerHTML = '<span class="ms">arrow_upward</span>'; document.body.append(top);
  top.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
  addEventListener('scroll', () => top.classList.toggle('show', scrollY > 500), { passive: true });
  window.toast = msg => { const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = '<span class="ms">check_circle</span>' + msg; document.body.append(t); requestAnimationFrame(() => t.classList.add('show')); setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2200); };
  document.addEventListener('click', e => { const c = e.target.closest('[data-copy]'); if (!c) return; e.preventDefault(); navigator.clipboard && navigator.clipboard.writeText(c.dataset.copy).catch(() => {}); toast('주소를 복사했습니다'); });

  /* ---------- 하위 페이지 공통 틀 ---------- */
  const sub = $('#sub');
  if (!sub) return;
  const group = MENU[curGroup] || MENU[0];
  const title = curItem ? curItem[0] : '';
  document.title = title + ' | ' + CHURCH.name;
  sub.insertAdjacentHTML('beforebegin', `<section class="sv" style="background-image:url(${GROUP_IMG[curGroup] || GROUP_IMG[0]})">
      <div class="wrap sv-in"><p class="sv-group">${group.label}</p><h1 class="sv-title">${title}</h1></div></section>
    <nav class="snb-m" aria-label="${group.label} 하위 메뉴"><div class="wrap"><ul>${group.items.map(it => `<li><a href="${it[1]}"${it === curItem ? ' class="on"' : ''}>${it[0]}</a></li>`).join('')}</ul></div></nav>`);
  sub.innerHTML = `<div class="wrap sub-wrap">
      <aside class="snb"><h2>${group.label}</h2><ul>${group.items.map(it => `<li><a href="${it[1]}"${it === curItem ? ' class="on"' : ''}>${it[0]}<span class="ms">chevron_right</span></a></li>`).join('')}</ul></aside>
      <main class="sub-main"><div class="sub-hd"><h2>${title}</h2><p class="crumb"><span class="ms">home</span>홈<span class="ms">chevron_right</span>${group.label}<span class="ms">chevron_right</span><b>${title}</b></p></div>
      <div id="content"></div></main></div>`;
  const C = $('#content');
  const onChip = $('.snb-m a.on'); if (onChip) { const ul = onChip.closest('ul'); ul.scrollLeft = onChip.offsetLeft - (ul.clientWidth - onChip.offsetWidth) / 2; }

  const pager = (n = 3) => `<div class="pager"><a class="pg prev" href="#"><span class="ms">chevron_left</span></a>${Array.from({ length: n }, (_, i) => `<a class="pg${i === 0 ? ' on' : ''}" href="#">${i + 1}</a>`).join('')}<a class="pg next" href="#"><span class="ms">chevron_right</span></a></div>`;

  /* ---------- 글 페이지 ---------- */
  if (file === 'page.html') {
    const P = PAGES[Q.get('s')];
    C.innerHTML = P ? `<div class="page-body">${P.body}</div>` : '<p class="empty">준비 중입니다.</p>';
  }

  /* ---------- 게시판 목록 ---------- */
  if (file === 'board.html') {
    const b = Q.get('b'), B = BOARDS[b], posts = boardPosts(b);
    const tools = `<div class="bd-tools"><p class="bd-count">전체 <b>${posts.length}</b>건</p>
      <div class="bd-search"><input type="search" placeholder="검색어를 입력하세요" aria-label="검색어"><button aria-label="검색"><span class="ms">search</span></button></div>
      ${B.anon ? '<a class="btn sm" href="#"><span class="ms">edit</span>글쓰기</a>' : ''}</div>`;
    if (B.bulletin) {
      C.innerHTML = tools + `<ul class="bul-grid">${posts.map(p => `<li><a href="board-view.html?b=${b}&id=${p.id}">
        <span class="b-cover"><span class="b-church">${CHURCH.name}</span><span class="b-title">주 보</span><span class="b-no">${p.title.replace(' 주보', '')}</span><img src="${PHOTOS[(p.id + 3) % 5]}" alt=""></span>
        <span class="bul-t">${p.title}</span></a></li>`).join('')}</ul>` + pager(2);
    } else {
      C.innerHTML = tools + `<ul class="bd-list"><li class="bd-head"><span class="no">번호</span><span class="t">제목</span><span class="w">글쓴이</span><span class="d">날짜</span><span class="v">조회</span></li>
        ${posts.map((p, i) => `<li${p.pinned ? ' class="pin"' : ''}><span class="no">${p.pinned ? '<em>공지</em>' : posts.length - i}</span>
        <a class="t" href="board-view.html?b=${b}&id=${p.id}">${esc(p.title)}${p.hasFile ? '<span class="ms att" title="첨부파일">attach_file</span>' : ''}${p.hasPhoto ? '<span class="ms att" title="사진">image</span>' : ''}</a>
        <span class="w">${p.author}</span><span class="d">${p.date}</span><span class="v">${p.views}</span></li>`).join('')}</ul>` + pager(3);
    }
  }

  /* ---------- 게시판 상세 ---------- */
  if (file === 'board-view.html') {
    const b = Q.get('b'), B = BOARDS[b], posts = boardPosts(b);
    const id = +Q.get('id') || 1, i = Math.max(0, posts.findIndex(p => p.id === id)), p = posts[i];
    const prev = posts[i + 1], next = posts[i - 1];
    let body = '';
    if (B.bulletin) {
      const heads = ['예배 순서', '교회 소식', '이번 주 말씀', '섬기는 분들'];
      body = `<div class="bul-pages">${heads.map((h, n) => `<figure class="bul-page"><div class="paper"><p class="pp-hd">${CHURCH.name} 주보 · ${p.date}</p><p class="pp-t">${h}</p>${'<i></i>'.repeat(9)}</div><figcaption>${n + 1}면</figcaption></figure>`).join('')}</div>
        <p class="note-box"><span class="ms">info</span>실제 사이트에서는 주보 사진이 들어가고, 누르면 크게 보고 내려받을 수 있습니다.</p>`;
    } else {
      const pb = POST_BODY[b];
      body = `<div class="prose">${pb ? pb.map(t => `<p>${t}</p>`).join('') : `<p>${esc(p.title)} 내용을 알려 드립니다.</p>
        <p>성도 여러분의 많은 관심과 기도 부탁드립니다.</p>
        <p>· 일시: 2026년 11월 22일(주일) 오후 2:00<br>· 장소: 본당<br>· 문의: 교회 사무실 ${CHURCH.phone}</p>`}</div>
        ${B.photo ? `<div class="post-photos">${PHOTOS.slice(1, 4).map(s => `<img src="${s}" alt="" data-view>`).join('')}</div>` : ''}
        ${B.file || p.hasFile ? '<div class="attach"><span class="ms">attach_file</span><a href="#">안내문.pdf</a><span class="size">(320KB)</span><a class="btn sm line" href="#">내려받기</a></div>' : ''}`;
    }
    C.innerHTML = `<article class="post"><header class="post-hd"><h3>${esc(p.title)}</h3>
        <p class="post-meta"><span>${p.author}</span><span>${p.date}</span><span>조회 ${p.views}</span></p></header>
        <div class="post-body">${body}</div></article>
      <ul class="prevnext">
        <li><span class="lb"><span class="ms">expand_less</span>다음 글</span>${next ? `<a href="board-view.html?b=${b}&id=${next.id}">${esc(next.title)}</a>` : '<span class="none">다음 글이 없습니다.</span>'}</li>
        <li><span class="lb"><span class="ms">expand_more</span>이전 글</span>${prev ? `<a href="board-view.html?b=${b}&id=${prev.id}">${esc(prev.title)}</a>` : '<span class="none">이전 글이 없습니다.</span>'}</li></ul>
      <div class="btn-row center"><a class="btn line" href="board.html?b=${b}">목록으로</a></div>`;
  }

  /* ---------- 설교 목록 ---------- */
  const sermonCard = s => `<li><a href="sermon-view.html?id=${s.id}"><span class="thumb"><img src="${s.thumb}" alt=""><span class="play"><span class="ms">play_arrow</span></span><span class="dur">${s.dur}</span></span>
      <span class="sc-cat">${s.cat}</span><span class="sc-t">${s.title}</span><span class="sc-m">${s.passage}</span><span class="sc-m">${s.preacher} · ${s.date}</span></a></li>`;
  if (file === 'sermons.html') {
    const c = Q.get('c') || SERMON_CATS[0];
    const list = SERMONS.filter(s => s.cat === c);
    C.innerHTML = `<div class="tabs">${SERMON_CATS.map(k => `<a href="sermons.html?c=${encodeURIComponent(k)}"${k === c ? ' class="on"' : ''}>${k}</a>`).join('')}</div>
      <ul class="sermon-grid">${list.map(sermonCard).join('')}</ul>` + pager(2);
  }

  /* ---------- 설교 상세 ---------- */
  if (file === 'sermon-view.html') {
    const s = SERMONS.find(x => x.id === +Q.get('id')) || SERMONS[0];
    const more = SERMONS.filter(x => x.cat === s.cat && x.id !== s.id).slice(0, 3);
    C.innerHTML = `<div class="sv-player"><img src="${s.thumb}" alt=""><span class="play big"><span class="ms">play_arrow</span></span><span class="yt-note">유튜브 영상이 들어갈 자리</span></div>
      <div class="sv-info"><span class="sc-cat">${s.cat}</span><h3>${s.title}</h3>
        <p class="sv-meta"><span><span class="ms">menu_book</span><a href="#">${s.passage}</a></span><span><span class="ms">person</span>${s.preacher}</span><span><span class="ms">calendar_today</span>${s.date}</span></p>
        <div class="btn-row"><a class="btn" href="#"><span class="ms">description</span>설교 질문지 받기</a><a class="btn line" href="#"><span class="ms">open_in_new</span>본문 읽기</a></div></div>
      <h3 class="h3">${s.cat} 다른 설교</h3><ul class="sermon-grid three">${more.map(sermonCard).join('')}</ul>
      <div class="btn-row center"><a class="btn line" href="sermons.html?c=${encodeURIComponent(s.cat)}">목록으로</a></div>`;
  }

  /* ---------- 포토앨범 ---------- */
  if (file === 'album.html') {
    C.innerHTML = `<ul class="album-grid">${ALBUMS.map(a => `<li><a href="album-view.html?a=${a.id}"><span class="cover"><img src="${a.photos[0]}" alt=""><span class="cnt"><span class="ms">photo_library</span>${a.photos.length}</span></span>
      <span class="al-t">${a.title}</span><span class="al-d">${a.date}</span></a></li>`).join('')}</ul>` + pager(2);
  }
  if (file === 'album-view.html') {
    const a = ALBUMS.find(x => x.id === +Q.get('a')) || ALBUMS[0];
    C.innerHTML = `<div class="al-hd"><h3>${a.title}</h3><p>${a.date} · 사진 ${a.photos.length}장</p></div>
      <ul class="photo-grid">${a.photos.map((p, i) => `<li><button data-view data-src="${p}" aria-label="사진 ${i + 1} 크게 보기"><img src="${p}" alt=""></button></li>`).join('')}</ul>
      <div class="btn-row center"><a class="btn line" href="album.html">앨범 목록</a></div>`;
  }

  /* ---------- 교회 일정 ---------- */
  if (file === 'schedule.html') {
    let y = 2026, m = 10; // 2026년 11월 (0부터)
    const pad = n => String(n).padStart(2, '0');
    const WD = ['일', '월', '화', '수', '목', '금', '토'];
    function inDay(e, ds) { return e.end ? (ds >= e.date && ds <= e.end) : e.date === ds; }
    function draw() {
      const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
      const ym = y + '-' + pad(m + 1);
      const evs = EVENTS.filter(e => e.date.startsWith(ym) || (e.end && e.end.startsWith(ym))).sort((a, b) => a.date.localeCompare(b.date));
      let cells = '';
      for (let i = 0; i < first; i++) cells += '<div class="cd blank"></div>';
      for (let d = 1; d <= days; d++) {
        const ds = ym + '-' + pad(d), wd = (first + d - 1) % 7, es = EVENTS.filter(e => inDay(e, ds));
        cells += `<div class="cd${wd === 0 ? ' sun' : wd === 6 ? ' sat' : ''}${ds === '2026-11-17' ? ' today' : ''}${es.length ? ' has' : ''}"><span class="n">${d}</span>${es.map(e => `<span class="ev-chip">${e.title}</span>`).join('')}</div>`;
      }
      const rest = (7 - (first + days) % 7) % 7;
      for (let i = 0; i < rest; i++) cells += '<div class="cd blank"></div>';
      C.innerHTML = `<div class="cal"><div class="cal-hd"><button class="cal-nav" data-d="-1" aria-label="이전 달"><span class="ms">chevron_left</span></button><h3>${y}년 ${m + 1}월</h3><button class="cal-nav" data-d="1" aria-label="다음 달"><span class="ms">chevron_right</span></button></div>
        <div class="cal-grid">${WD.map((w, i) => `<div class="wd${i === 0 ? ' sun' : i === 6 ? ' sat' : ''}">${w}</div>`).join('')}${cells}</div></div>
        <h3 class="h3">${m + 1}월 일정</h3>
        ${evs.length ? `<ul class="ev-list">${evs.map(e => { const d = new Date(e.date), wd = WD[d.getDay()]; return `<li><span class="ev-d"><b>${pad(d.getMonth() + 1)}.${pad(d.getDate())}</b>${wd}</span><span class="ev-t"><b>${e.title}</b>${e.end ? '~ ' + e.end.slice(5).replace('-', '.') + ' · ' : ''}${e.place}</span></li>`; }).join('')}</ul>` : '<p class="empty">등록된 일정이 없습니다.</p>'}`;
      C.querySelectorAll('.cal-nav').forEach(b => b.addEventListener('click', () => { m += +b.dataset.d; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } draw(); }));
    }
    draw();
  }

  /* ---------- 사진 크게 보기 ---------- */
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-view]'); if (!t) return;
    const src = t.dataset.src || t.getAttribute('src');
    const lb = document.createElement('div'); lb.className = 'lightbox';
    lb.innerHTML = `<button class="lb-x" aria-label="닫기"><span class="ms">close</span></button><img src="${src}" alt=""><a class="btn sm" href="${src}" download><span class="ms">download</span>내려받기</a>`;
    lb.addEventListener('click', ev => { if (ev.target === lb || ev.target.closest('.lb-x')) lb.remove(); });
    document.body.append(lb);
  });
})();
