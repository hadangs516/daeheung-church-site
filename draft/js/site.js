/* 공통: 헤더·푸터·하위 메뉴·페이지 틀 렌더링 (시안용)
   불러오는 순서: data.js → store.js → ui.js → member.js → site.js */
(function () {
  if (UI.enforceBan()) return;
  const Q = new URLSearchParams(location.search);
  const file = (location.pathname.split('/').pop() || 'home.html');
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MEMBER_PAGES = { 'login.html': ['로그인', 'login'], 'join.html': ['회원가입', 'join'], 'mypage.html': ['마이페이지', 'mypage'], 'profile.html': ['프로필', 'profile'] };

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
  /* 알림함 종 아이콘 (로그인했거나 관리자 모드일 때) — PC는 위 줄 오른쪽 끝, 휴대폰은 ☰ 왼쪽 */
  const bellBtn = cls => Store.me() ? `<button type="button" class="bell ${cls}" data-action="notif-open" aria-label="알림함" aria-haspopup="dialog" aria-expanded="false"><span class="ms">notifications</span><i class="bell-n" hidden></i></button>` : '';
  function authLinks(mobile) {
    const m = Store.me();
    if (!m) return `<a href="login.html?next=${here}">로그인</a><a href="join.html?next=${here}">회원가입</a>`;
    return `<span class="who"><b>${esc(m.name)}</b>님</span><a href="mypage.html">마이페이지</a><button type="button" data-action="logout">로그아웃</button>` + (Store.isAdmin() ? '<em class="adm">관리자 모드</em>' : '') + (mobile ? '' : bellBtn('bell-d'));
  }
  const hd = $('#hd');
  if (hd) {
    hd.insertAdjacentHTML('beforebegin', `<div class="hd-top"><div class="wrap">${authLinks()}</div></div>`);
    const headerBlock = document.createElement('div'); headerBlock.className = 'site-header';
    const topBar = hd.previousElementSibling; topBar.before(headerBlock); headerBlock.append(topBar, hd);
    hd.innerHTML = `<div class="wrap hd-in">
      <a class="logo" href="home.html"><img class="logo-img" src="img/brand/icon-192.png" alt=""><span class="logo-txt">${CHURCH.name}</span></a>
      <nav class="gnb" id="gnb"><div class="gnb-user">${authLinks(true)}</div><ul>${MENU.map((g, gi) => `<li class="${gi === curGroup ? 'cur' : ''}"><a href="${g.items[0][1]}">${g.label}</a>
        <ul class="sub">${g.items.map(it => `<li><a href="${it[1]}"${it === curItem ? ' class="on"' : ''}>${it[0]}</a></li>`).join('')}</ul></li>`).join('')}</ul></nav>
      <div class="hd-r">${bellBtn('bell-m')}<button class="burger" id="burger" aria-label="메뉴 열기"><span class="ms">menu</span></button></div></div>`;
    const sizeHeader = () => document.documentElement.style.setProperty('--header-height', headerBlock.getBoundingClientRect().height + 'px');
    sizeHeader();
    if (window.ResizeObserver) new ResizeObserver(sizeHeader).observe(headerBlock);
    else addEventListener('resize', sizeHeader);
    const b = $('#burger'), g = $('#gnb');
    b.addEventListener('click', () => { const o = g.classList.toggle('open'); document.body.classList.toggle('lock', o); b.querySelector('.ms').textContent = o ? 'close' : 'menu'; });
    /* 모바일: 상위 메뉴를 누르면 하위 메뉴가 부드럽게 펼쳐지고 접힌다 (높이 애니메이션 + 화살표 회전) */
    g.querySelectorAll(':scope > ul > li > a').forEach(a => a.addEventListener('click', e => {
      if (innerWidth > 1024) return;
      e.preventDefault();
      const li = a.parentElement, sb = li.querySelector('.sub'), open = !li.classList.contains('on');
      li.classList.toggle('on', open); a.setAttribute('aria-expanded', open);
      sb.style.height = open ? sb.scrollHeight + 'px' : '0px';
    }));
    addEventListener('resize', () => { if (innerWidth > 1024) g.querySelectorAll('.sub').forEach(x => x.style.height = ''); });
  }

  /* ---------- 알림함 ---------- */
  const NI = { prayer: 'volunteer_activism', signup: 'person_add', approval: 'verified', group: 'groups', comment: 'chat_bubble', reply: 'reply', bulletin: 'menu_book', notice: 'campaign', report: 'flag', appeal: 'gavel', sanction: 'block' };
  function refreshBells() {
    const n = Store.me() ? Store.unreadCount() : 0;
    document.querySelectorAll('.bell').forEach(b => { const i = b.querySelector('.bell-n'); i.hidden = !n; i.textContent = n > 99 ? '99+' : n; b.setAttribute('aria-label', n ? '알림함, 안 읽은 알림 ' + n + '개' : '알림함'); });
  }
  refreshBells();
  addEventListener('storage', refreshBells);
  addEventListener('pdh-notifs', refreshBells);
  Actions['notif-open'] = btn => {
    if (document.querySelector('.np-bg')) return;
    const bg = document.createElement('div'), mobile = matchMedia('(max-width:720px)').matches;
    bg.className = 'np-bg'; bg.innerHTML = '<div class="np" role="dialog" aria-label="알림함"></div>';
    const np = bg.firstChild;
    const draw = () => {
      const L = Store.myNotifs({ unreadOnly: true });
      np.innerHTML = `<div class="np-hd"><b>알림</b>${L.length ? `<span class="np-n">${L.length}</span>` : ''}<button type="button" class="np-all" data-np="all"${L.length ? '' : ' disabled'}><span class="ms">done_all</span>모두 읽음</button><button type="button" class="np-x" data-np="close" aria-label="닫기"><span class="ms">close</span></button></div>
        ${L.length ? `<ul class="np-list">${L.map(n => `<li><a class="np-it" href="${esc(n.link || '#')}" data-np-id="${n.id}"><span class="np-ic"><span class="ms">${NI[n.type] || 'notifications'}</span></span><span class="np-t"><b>${esc(n.text)}</b><em title="${UI.abs(n.at)}">${UI.rel(n.at)}</em></span></a></li>`).join('')}</ul>`
          : '<p class="np-none"><span class="ms">notifications_off</span>새 알림이 없습니다</p>'}
        <a class="np-more" href="mypage.html#settings/notif">지난 알림 보기</a>`;
    };
    const close = () => { document.removeEventListener('keydown', key, true); removeEventListener('resize', close); bg.remove(); btn.setAttribute('aria-expanded', 'false'); refreshBells(); };
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    bg.addEventListener('click', e => {
      if (e.target === bg) return close();
      const a = e.target.closest('[data-np]');
      if (a) { if (a.dataset.np === 'close') close(); else if (a.dataset.np === 'all') { Store.readAllNotifs(); draw(); refreshBells(); toast('모두 읽음으로 바꿨습니다. 지난 알림은 마이페이지에서 볼 수 있어요.', 'info'); } return; }
      const it = e.target.closest('[data-np-id]'); if (it) { Store.readNotif(it.dataset.npId); if (!it.getAttribute('href') || it.getAttribute('href') === '#') { e.preventDefault(); draw(); refreshBells(); } }
    });
    draw(); document.body.append(bg); btn.setAttribute('aria-expanded', 'true'); document.addEventListener('keydown', key, true);
    if (mobile) { bg.classList.add('mob'); requestAnimationFrame(() => bg.classList.add('open')); }
    else { const r = btn.getBoundingClientRect(), w = np.offsetWidth; np.style.top = r.bottom + 8 + 'px'; np.style.left = Math.min(Math.max(8, r.right - w), innerWidth - w - 8) + 'px'; addEventListener('resize', close); }
  };

  /* ---------- 푸터 ---------- */
  const legalPages = [['개인정보 처리방침', 'privacy.html'], ['이용약관', 'terms.html']];
  const legalPage = legalPages.find(it => it[1] === file);
  const ft = $('#ft');
  if (ft) ft.innerHTML = `<div class="wrap ft-in">
      <div class="ft-logo"><span class="ms">church</span>${CHURCH.name}</div>
      <div class="ft-info"><p>${CHURCH.address}</p><p><span>전화 ${CHURCH.phone}</span><span>팩스 ${CHURCH.fax}</span></p></div>
      <div class="ft-visit"><p class="lb">방문자</p><p>오늘 <b>${CHURCH.visitorToday}</b><i></i>전체 <b>${CHURCH.visitorTotal}</b></p></div>
    </div><div class="wrap ft-copy"><nav class="ft-legal" aria-label="이용 안내">${legalPages.map(([label, url]) => `<a href="${url}">${label}</a>`).join('')}</nav>Copyright © ${CHURCH.name}. All Rights Reserved. <small>v${APP_VERSION}</small></div>`;

  /* ---------- 홈: 공지사항은 저장된 글까지 포함해서 보여줌 ---------- */
  const hn = $('[data-slot="home-notice"]');
  if (hn) hn.innerHTML = Store.allPosts('notice').slice(0, 6).map(p => `<li><a href="board-view.html?b=notice&id=${p.id}"><span class="t">${esc(p.title)}</span>${UI.hiddenBadge(p)}<span class="d">${p.date.slice(5)}</span></a></li>`).join('');

  /* ---------- 하위 페이지 공통 틀 ---------- */
  const sub = $('#sub');
  if (!sub) return;

  /* 로그인·가입·마이페이지 (왼쪽 메뉴 없는 틀) */
  if (MEMBER_PAGES[file]) {
    const [ttl, fn] = MEMBER_PAGES[file];
    document.title = ttl + ' | ' + CHURCH.name;
    sub.insertAdjacentHTML('beforebegin', `<section class="sv" style="background-image:url(img/hero-interior.jpg)"><div class="wrap sv-in"><p class="sv-group">회원</p><h1 class="sv-title">${ttl}</h1></div></section>`);
    sub.innerHTML = `<div class="wrap mb-wrap${fn === 'mypage' ? ' wide' : ''}"><div id="content"></div></div>`;
    Member[fn]($('#content'));
    return;
  }

  if (legalPage) curItem = legalPage;
  const legalArticle = legalPage && sub.querySelector('.legal-doc');
  const legalTitle = legalArticle?.querySelector('h1').textContent;
  const group = legalPage ? { label: '이용 안내', items: legalPages } : MENU[curGroup] || MENU[0];
  const title = curItem ? curItem[0] : '';
  const heading = file === 'write.html' ? (Q.get('edit') ? '글 수정' : '글쓰기') : title;
  document.title = heading + ' | ' + CHURCH.name;
  sub.insertAdjacentHTML('beforebegin', `<section class="sv" style="background-image:url(${GROUP_IMG[curGroup] || GROUP_IMG[0]})">
      <div class="wrap sv-in"><p class="sv-group">${group.label}</p><h1 class="sv-title">${legalTitle || title}</h1></div></section>
    <nav class="snb-m" aria-label="${group.label} 하위 메뉴"><div class="wrap"><ul>${group.items.map(it => `<li><a href="${it[1]}"${it === curItem ? ' class="on"' : ''}>${it[0]}</a></li>`).join('')}</ul></div></nav>`);
  sub.innerHTML = `<div class="wrap sub-wrap">
      <aside class="snb"><h2>${group.label}</h2><ul>${group.items.map(it => `<li><a href="${it[1]}"${it === curItem ? ' class="on"' : ''}>${it[0]}<span class="ms">chevron_right</span></a></li>`).join('')}</ul></aside>
      <main class="sub-main"><div class="sub-hd"><h2>${heading}</h2><p class="crumb"><span class="ms">home</span>홈<span class="ms">chevron_right</span>${group.label}<span class="ms">chevron_right</span>${file === 'write.html' ? title + '<span class="ms">chevron_right</span>' : ''}<b>${heading}</b></p></div>
      <div id="content"></div></main></div>`;
  const C = $('#content');
  const mobileSubnav = $('.snb-m');
  const sizeSubnav = () => document.documentElement.style.setProperty('--subnav-height', (mobileSubnav ? mobileSubnav.getBoundingClientRect().height : 0) + 'px');
  sizeSubnav();
  if (mobileSubnav && window.ResizeObserver) new ResizeObserver(sizeSubnav).observe(mobileSubnav);
  else addEventListener('resize', sizeSubnav);
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
  if (legalArticle) {
    legalArticle.querySelector('h1').remove();
    C.append(legalArticle);
  }
  if (file === 'page.html') {
    const P = PAGES[Q.get('s')];
    C.innerHTML = P ? `<div class="page-body">${P.body}</div>` : '<p class="empty">준비 중입니다.</p>';
    if (['praise1', 'praise2'].includes(Q.get('s'))) {
      const table = C.querySelector('.tbl-wrap');
      table.insertAdjacentHTML('beforebegin', '<label class="archive-search">지난 찬양 검색<input type="search" data-oninput="praise-search" placeholder="날짜 또는 곡 이름 (예: 11월, 11.08)"></label><p class="empty" data-praise-empty hidden role="status">검색 결과가 없습니다.</p>');
      Actions['praise-search'] = input => {
        let count = 0;
        table.querySelectorAll('tbody tr').forEach(row => {
          const cells = row.querySelectorAll('td');
          row.hidden = !Store.matchesSearch(cells[0].textContent, cells[1].textContent, input.value);
          if (!row.hidden) count++;
        });
        table.hidden = !count; C.querySelector('[data-praise-empty]').hidden = !!count;
      };
    }
  }

  /* ---------- 글쓰기 ---------- */
  if (file === 'write.html') Member.write(C, Q.get('b'), Q.get('edit'));

  /* ---------- 게시판 목록 ---------- */
  if (file === 'board.html') {
    const b = Q.get('b'), B = BOARDS[b];
    if (!B) { C.innerHTML = '<p class="empty">없는 게시판입니다.</p>'; return; }
    const q = (Q.get('q') || '').trim(), size = B.bulletin ? 8 : 10;
    const now = Date.now(), before = Store.visitBoard(b, now);
    const newBadge = p => !p.locked && Store.isNewPost(p, before, now) ? '<em class="new-badge" aria-label="새 글">N</em>' : '';
    let posts = Store.allPosts(b);
    if (q) posts = posts.filter(p => !p.locked && Store.matchesSearch(p.date, p.title + ' ' + p.author, q));
    const total = posts.length, page = Math.min(Math.max(1, +Q.get('p') || 1), Math.max(1, Math.ceil(total / size)));
    const view = posts.slice((page - 1) * size, page * size);
    const tools = `<div class="bd-tools"><p class="bd-count">${q ? `“${esc(q)}” 검색 결과 ` : '전체 '}<b>${total}</b>건${q ? ` · <a class="bd-all" href="board.html?b=${b}">전체 보기</a>` : ''}</p>
      <form class="bd-search" action="board.html" method="get" role="search"><input type="hidden" name="b" value="${b}"><input type="search" name="q" value="${esc(q)}" placeholder="검색어를 입력하세요" aria-label="검색어"><button type="submit" aria-label="검색"><span class="ms">search</span></button></form></div>`;
    const foot = pg => `<div class="bd-foot"><span></span>${pg || '<span></span>'}${canWrite(b) ? `<a class="btn" href="write.html?b=${b}"><span class="ms">edit</span>글쓰기</a>` : '<span></span>'}</div>`;
    if (!total) { C.innerHTML = tools + `<p class="empty">${q ? '검색 결과가 없습니다.' : '등록된 글이 없습니다.'}</p>` + foot(''); }
    else if (B.bulletin) {
      C.innerHTML = tools + `<ul class="bul-grid">${view.map(p => `<li><a href="board-view.html?b=${b}&id=${p.id}">
        <span class="b-cover"><span class="b-church">${CHURCH.name}</span><span class="b-title">주 보</span><span class="b-no">${esc(p.title.replace(' 주보', ''))}</span><img src="${PHOTOS[(+p.id + 3) % 5]}" alt=""></span>
        <span class="bul-t">${p.pinned ? '<em class="pin-badge">공지</em>' : ''}${esc(p.title)}${newBadge(p)}${UI.hiddenBadge(p)}</span></a></li>`).join('')}</ul>` + foot(pager(total, size, page));
    } else {
      C.innerHTML = tools + `<ul class="bd-list"><li class="bd-head"><span class="no">번호</span><span class="t">제목</span><span class="w">글쓴이</span><span class="d">날짜</span><span class="v">조회</span></li>
        ${view.map((p, i) => `<li${p.pinned ? ' class="pin"' : ''}><span class="no">${p.pinned ? '<em>공지</em>' : total - ((page - 1) * size + i)}</span>
        ${p.locked ? `<span class="t prayer-locked"><span class="ms" aria-hidden="true">lock</span><span class="t-txt">${Store.prayerMessage(p)}</span></span>` : `<a class="t" href="board-view.html?b=${b}&id=${p.id}"><span class="t-txt">${esc(p.title)}</span>${newBadge(p)}${UI.audienceBadge(p)}${UI.hiddenBadge(p)}${p.comments ? `<span class="cmt-n" aria-label="댓글 ${p.comments}개">[${p.comments}]</span>` : ''}${p.hasFile ? '<span class="ms att" title="첨부파일">attach_file</span>' : ''}${p.hasPhoto ? '<span class="ms att" title="사진">image</span>' : ''}${p.user && Store.isMine(p.owner) ? '<em class="me">내 글</em>' : ''}</a>`}
        <span class="w">${esc(p.author)}</span><span class="d">${p.date}</span><span class="v">${p.views}</span></li>`).join('')}</ul>` + foot(pager(total, size, page));
    }
  }

  /* ---------- 게시판 상세 ---------- */
  if (file === 'board-view.html') {
    const b = Q.get('b'), B = BOARDS[b], posts = B ? Store.allPosts(b) : [];
    const id = String(Q.get('id') || '1'), i = posts.findIndex(p => p.id === id), p = posts[i];
    if (!p) {
      const stored = B && Store.getPost(id);
      const hidden = stored && stored.board === b && !Store.canSeePost(stored);
      C.innerHTML = `<p class="empty">${hidden ? '숨겨진 글입니다.' : '글을 찾을 수 없습니다. 삭제되었을 수 있습니다.'}</p><div class="btn-row center"><a class="btn line" href="board.html?b=${encodeURIComponent(b)}">목록으로</a></div>`;
      return;
    }
    if (p.locked || !Store.canReadPost(p)) {
      C.innerHTML = `<p class="empty"><span class="ms" aria-hidden="true">lock</span> ${Store.prayerMessage(p)}</p><div class="btn-row center"><a class="btn line" href="board.html?b=${b}">목록으로</a></div>`;
      return;
    }
    const U = p.user ? Store.getPost(id) : null;
    if (U) { Store.addView(id); p.views = (U.views || 0) + 1; }
    const mine = !!U && Store.isMine(U.owner), canDel = mine || (!!U && Store.isAdmin());
    let body = '';
    if (B.bulletin) {
      const heads = ['예배 순서', '교회 소식', '이번 주 말씀', '섬기는 분들'];
      body = `<div class="bul-pages">${heads.map((h, n) => `<figure class="bul-page"><div class="paper"><p class="pp-hd">${CHURCH.name} 주보 · ${p.date}</p><p class="pp-t">${h}</p>${'<i></i>'.repeat(9)}</div><figcaption>${n + 1}면</figcaption></figure>`).join('')}</div>
        <div class="btn-row center" style="margin-top:28px"><button type="button" class="btn line" data-action="soon"><span class="ms">download</span>주보 내려받기</button></div>
        <p class="note-box"><span class="ms">info</span>실제 사이트에서는 주보 사진이 들어가고, 누르면 크게 보고 내려받을 수 있습니다.</p>`;
    } else if (U) {
      body = `<div class="rt" data-gallery>${Store.sanitize(U.html).replace(/<img /g, '<img data-view loading="lazy" ')}</div>`;
    } else if (b === 'prayer') {
      body = `<div class="prose"><p>${esc(p.title)} 기도 부탁드립니다.</p><p>이 시간을 잘 지나갈 수 있도록 함께 기도해 주세요. 주님의 평안과 지혜를 구합니다.</p></div>`;
    } else {
      const pb = POST_BODY[b];
      body = `<div class="prose">${pb ? pb.map(t => `<p>${t}</p>`).join('') : `<p>${esc(p.title)} 내용을 알려 드립니다.</p>
        <p>성도 여러분의 많은 관심과 기도 부탁드립니다.</p>
        <p>· 일시: 2026년 11월 22일(주일) 오후 3:30<br>· 장소: 본당<br>· 문의: 교회 사무실 ${CHURCH.phone}</p>`}</div>
        ${B.photo ? `<div class="post-photos" data-gallery>${PHOTOS.slice(1, 4).map(s => `<img src="${s}" alt="" data-view>`).join('')}</div>` : ''}
        ${B.file || p.hasFile ? '<div class="attach"><span class="ms">attach_file</span><a href="#" data-action="soon">안내문.pdf</a><span class="size">(320KB)</span><button type="button" class="btn sm line" data-action="soon">내려받기</button></div>' : ''}`;
    }
    /* 같은 게시판의 다른 글 (현재 글과 가까운 5개) */
    const others = posts.map((x, k) => ({ x, k })).filter(o => o.x.id !== id && !o.x.locked).sort((a, c) => Math.abs(a.k - i) - Math.abs(c.k - i)).slice(0, 5).sort((a, c) => a.k - c.k).map(o => o.x);
    /* 작성자 줄 (네이버 블로그처럼): 둥근 사진 + 이름 + 날짜·조회. 회원이면 프로필로 이동, 익명·게스트는 링크 없음 */
    const who = UI.who(p.authorId), nm = esc(p.author);
    const byAv = who.href ? `<a class="by-av" href="${who.href}" aria-label="${nm} 프로필 보기">${UI.avatar(who.card, p.author)}</a>` : `<span class="by-av">${UI.avatar(null, p.author)}</span>`;
    const byNm = who.href ? `<a class="by-name" href="${who.href}">${nm}</a>` : `<span class="by-name">${nm}</span>`;
    Actions['post-more'] = btn => UI.menu(btn, [
      Store.isAdmin() && { label: p.pinned ? '고정 해제' : '상단 고정', icon: 'push_pin', onClick: () => {
        const result = Store.setPostPinned(b, id, !p.pinned);
        if (!result.ok) return toast(result.error, 'info');
        toastLater(p.pinned ? '고정을 해제했습니다' : '상단에 고정했습니다'); location.reload();
      } },
      mine && { label: '수정', icon: 'edit', onClick: () => { location.href = `write.html?b=${b}&edit=${id}`; } },
      canDel && { label: U.hidden ? '숨김 해제' : '숨기기', icon: U.hidden ? 'visibility' : 'visibility_off', onClick: () => {
        if (U.hidden && U.hiddenBy === 'admin' && !Store.isAdmin()) return UI.appeal(id);
        if (!Store.setPostHidden(id, !U.hidden)) return toast('숨김 상태를 변경하지 못했습니다', 'error');
        toastLater(U.hidden ? '숨김을 해제했습니다' : '글을 숨겼습니다'); location.reload();
      } },
      canDel && { label: '삭제', icon: 'delete', danger: true, onClick: () => Actions['post-del']({ dataset: { id, board: b } }) },
      canDel && { sep: true },
      { label: '신고하기', icon: 'flag', danger: true, onClick: () => UI.report({ kind: 'post', id: b + ':' + id, label: p.title }) }
    ]);
    C.innerHTML = `<article class="post" data-img-ctx="post:${b}:${id}" data-img-label="${esc(p.title)}"><header class="post-hd"><h3>${esc(p.title)}${UI.audienceBadge(p)}${UI.hiddenBadge(p)}</h3>
        <div class="post-tools"><button type="button" class="share-btn" data-action="share" data-title="${esc(p.title)}" aria-label="공유"><span class="ms">share</span></button>
        <button type="button" class="more-btn" data-action="post-more" aria-label="글 메뉴" aria-haspopup="menu" aria-expanded="false"><span class="ms">more_vert</span></button></div>
        <div class="post-by">${byAv}<div class="by-tx">${byNm}<p class="post-meta"><span>${p.date}</span><span>조회 ${p.views}</span>${B.bulletin ? '' : `<span>댓글 <b data-cmt-count>${p.comments}</b></span>`}${U && U.edited ? '<span>수정됨</span>' : ''}</p></div></div></header>
        <div class="post-body">${body}</div></article>
      <div class="post-actions"><span class="pa-l">
        ${mine ? `<a class="btn line" href="write.html?b=${b}&edit=${id}"><span class="ms">edit</span>수정</a>` : ''}${canDel ? `<button type="button" class="btn line danger-t" data-action="post-del" data-id="${id}" data-board="${b}"><span class="ms">delete</span>삭제</button>` : ''}</span>
        <a class="btn" href="board.html?b=${b}"><span class="ms">list</span>목록</a></div>
      ${B.bulletin ? '' : '<div id="cmt"></div>'}
      ${others.length ? `<section class="related" aria-label="같은 게시판의 다른 글"><h3 class="rel-h">${B.title}의 다른 글</h3><ul class="rel-list">${others.map(x => `<li><a href="board-view.html?b=${b}&id=${x.id}"><span class="rel-t">${esc(x.title)}${UI.hiddenBadge(x)}${x.comments ? `<span class="cmt-n">(${x.comments})</span>` : ''}</span><span class="rel-m">${esc(x.author)}<i></i>${x.date}</span></a></li>`).join('')}</ul></section>` : ''}`;
    if (!B.bulletin) Member.comments($('#cmt'), b, id);
  }

  /* ---------- 설교 목록 ---------- */
  const sermonCard = s => `<li><a href="sermon-view.html?id=${s.id}"><span class="thumb"><img src="${s.thumb}" alt=""><span class="play"><span class="ms">play_arrow</span></span><span class="dur">${s.dur}</span></span>
      <span class="sc-cat">${s.cat}</span><span class="sc-t">${s.title}</span><span class="sc-m">${s.passage}</span><span class="sc-m">${s.preacher} · ${s.date}</span></a></li>`;
  if (file === 'sermons.html') {
    const c = SERMON_CATS.includes(Q.get('c')) ? Q.get('c') : SERMON_CATS[0], size = 6;
    const q = (Q.get('q') || '').trim();
    const list = SERMONS.filter(s => s.cat === c && Store.matchesSearch(s.date, s.title + ' ' + s.passage + ' ' + s.preacher, q)), page = Math.min(Math.max(1, +Q.get('p') || 1), Math.max(1, Math.ceil(list.length / size)));
    C.innerHTML = `<div class="tabs">${SERMON_CATS.map(k => `<a href="sermons.html?c=${encodeURIComponent(k)}"${k === c ? ' class="on"' : ''}>${k}</a>`).join('')}</div>
      <div class="bd-tools"><p class="bd-count">검색 결과 <b>${list.length}</b>건</p><form class="bd-search" action="sermons.html" method="get" role="search"><input type="hidden" name="c" value="${esc(c)}"><input type="search" name="q" value="${esc(q)}" placeholder="날짜·제목·본문 검색" aria-label="설교 검색"><button type="submit" aria-label="검색"><span class="ms">search</span></button></form></div>
      ${list.length ? `<ul class="sermon-grid">${list.slice((page - 1) * size, page * size).map(sermonCard).join('')}</ul>` : '<p class="empty">검색 결과가 없습니다.</p>'}` + pager(list.length, size, page);
  }

  /* ---------- 설교 상세 ---------- */
  if (file === 'sermon-view.html') {
    const s = SERMONS.find(x => x.id === +Q.get('id')) || SERMONS[0];
    const more = SERMONS.filter(x => x.cat === s.cat && x.id !== s.id).slice(0, 3);
    C.innerHTML = `<div class="sv-player" data-action="soon" role="button" tabindex="0" aria-label="영상 재생"><img src="${s.thumb}" alt=""><span class="play big"><span class="ms">play_arrow</span></span><span class="yt-note">유튜브 영상이 들어갈 자리</span></div>
      <div class="sv-info"><span class="sc-cat">${s.cat}</span><h3>${s.title}</h3>
        <button type="button" class="share-btn" data-action="share" data-title="${esc(s.title)}" aria-label="공유"><span class="ms">share</span></button>
        <p class="sv-meta"><span><span class="ms">menu_book</span><a href="#" data-action="soon">${s.passage}</a></span><span><span class="ms">person</span>${s.preacher}</span><span><span class="ms">calendar_today</span>${s.date}</span></p>
        <div class="btn-row"><button type="button" class="btn" data-action="soon"><span class="ms">description</span>설교 질문지 받기</button><button type="button" class="btn line" data-action="soon"><span class="ms">open_in_new</span>본문 읽기</button></div></div>
      <h3 class="h3">${s.cat} 다른 설교</h3><ul class="sermon-grid three">${more.map(sermonCard).join('')}</ul>
      <div class="btn-row center"><a class="btn line" href="sermons.html?c=${encodeURIComponent(s.cat)}">목록으로</a></div>`;
  }

  /* ---------- 포토앨범 ---------- */
  if (file === 'album.html') {
    const size = 6, page = Math.min(Math.max(1, +Q.get('p') || 1), Math.ceil(ALBUMS.length / size));
    C.innerHTML = `<ul class="album-grid">${ALBUMS.slice((page - 1) * size, page * size).map(a => `<li><a href="album-view.html?a=${a.id}"><span class="cover"><img src="${a.photos[0]}" alt=""><span class="cnt"><span class="ms">photo_library</span>${a.photos.length}</span></span>
      <span class="al-t">${a.title}</span><span class="al-d">${a.date} · 댓글 ${Store.commentCount('album', a.id)}개</span></a></li>`).join('')}</ul>` + pager(ALBUMS.length, size, page);
  }
  if (file === 'album-view.html') {
    const k = Math.max(0, ALBUMS.findIndex(x => x.id === +Q.get('a'))), a = ALBUMS[k], prev = ALBUMS[k + 1], next = ALBUMS[k - 1];
    C.innerHTML = `<div class="al-hd"><h3>${a.title}</h3><p>${a.date} · 사진 ${a.photos.length}장 · 댓글 <b data-cmt-count>${Store.commentCount('album', a.id)}</b></p></div>
      <ul class="photo-list" data-gallery data-img-ctx="album:${a.id}" data-img-label="${esc(a.title)}">${a.photos.map((p, i) => `<li><figure><button type="button" data-view data-src="${p}" aria-label="사진 ${i + 1} 크게 보기"><img src="${p}" alt="${esc(a.title)} 사진 ${i + 1}" loading="lazy"></button><figcaption>${i + 1} / ${a.photos.length}</figcaption></figure></li>`).join('')}</ul>
      <div id="cmt"></div>
      <div class="btn-row center">${next ? `<a class="btn line" href="album-view.html?a=${next.id}"><span class="ms">chevron_left</span>이전 앨범</a>` : ''}<a class="btn line" href="album.html">앨범 목록</a>${prev ? `<a class="btn line" href="album-view.html?a=${prev.id}">다음 앨범<span class="ms">chevron_right</span></a>` : ''}</div>`;
    Member.comments($('#cmt'), 'album', String(a.id));
  }

  /* ---------- 교회 일정 ---------- */
  if (file === 'schedule.html') {
    const pad = n => String(n).padStart(2, '0'), WD = ['일', '월', '화', '수', '목', '금', '토'];
    const now = new Date(), todayS = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    let y = now.getFullYear(), m = now.getMonth(), view = 'cal';
    if (!Store.events().some(e => e.date.startsWith(y + '-' + pad(m + 1)))) { y = 2026; m = 10; }   // 시안 자료가 있는 달로
    const inDay = (e, ds) => e.end ? (ds >= e.date && ds <= e.end) : e.date === ds;
    function draw() {
      const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate(), ym = y + '-' + pad(m + 1);
      const all = Store.events(), last = ym + '-' + pad(days);
      const evs = all.filter(e => e.date <= last && (e.end || e.date) >= ym + '-01');
      const upcoming = all.filter(e => e.date >= todayS).slice(0, 3);
      let cells = '';
      for (let i = 0; i < first; i++) cells += '<div class="cd blank"></div>';
      for (let d = 1; d <= days; d++) {
        const ds = ym + '-' + pad(d), wd = (first + d - 1) % 7, es = all.filter(e => inDay(e, ds));
        cells += `<div class="cd${wd === 0 ? ' sun' : wd === 6 ? ' sat' : ''}${ds === todayS ? ' today' : ''}${es.length ? ' has' : ''}"${es.length ? ` role="button" tabindex="0" data-action="day-open" data-date="${ds}" aria-label="${m + 1}월 ${d}일 일정 ${es.length}건"` : ''}><span class="n">${d}</span>${es.map(e => `<span class="ev-chip">${esc(e.title)}</span>`).join('')}</div>`;
      }
      const rest = (7 - (first + days) % 7) % 7;
      for (let i = 0; i < rest; i++) cells += '<div class="cd blank"></div>';
      const list = evs.length ? `<ul class="ev-list">${evs.map(e => { const d = new Date(e.date + 'T00:00'); return `<li><span class="ev-d"><b>${pad(d.getMonth() + 1)}.${pad(d.getDate())}</b>${WD[d.getDay()]}</span><button type="button" class="ev-t" data-action="event-open" data-id="${e.id}"><b>${esc(e.title)}</b>${e.end ? '~ ' + e.end.slice(5).replace('-', '.') + ' · ' : ''}${esc(e.place)}</button></li>`; }).join('')}</ul>` : '<p class="empty">등록된 일정이 없습니다.</p>';
      C.innerHTML = `<section class="upcoming"><h3 class="h3">다가오는 일정</h3>${upcoming.length ? `<ul class="upcoming-events">${upcoming.map(e => `<li><button type="button" data-action="event-open" data-id="${e.id}"><time datetime="${e.date}">${e.date.replaceAll('-', '.')}${e.end ? ' ~ ' + e.end.replaceAll('-', '.') : ''}</time><b>${esc(e.title)}</b><span>${esc(e.place)}</span></button></li>`).join('')}</ul>` : '<p class="empty">다가오는 일정이 없습니다.</p>'}</section>
        <div class="cal-tools"><div class="seg" role="group" aria-label="보기 방식"><button type="button" data-action="cal-view" data-v="cal"${view === 'cal' ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"'}><span class="ms">calendar_month</span>달력형</button><button type="button" data-action="cal-view" data-v="list"${view === 'list' ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"'}><span class="ms">list</span>목록형</button></div>
          <div class="cal-actions">${Store.isAdmin() ? '<button type="button" class="btn sm" data-action="event-add"><span class="ms">add</span>일정 추가</button>' : ''}<button type="button" class="btn sm line" data-action="cal-today">오늘</button></div></div>
        <div class="cal-hd"><button class="cal-nav" data-action="cal-nav" data-d="-1" aria-label="이전 달"><span class="ms">chevron_left</span></button><h3>${y}년 ${m + 1}월</h3><button class="cal-nav" data-action="cal-nav" data-d="1" aria-label="다음 달"><span class="ms">chevron_right</span></button></div>
        ${view === 'cal' ? `<div class="cal"><div class="cal-grid">${WD.map((w, i) => `<div class="wd${i === 0 ? ' sun' : i === 6 ? ' sat' : ''}">${w}</div>`).join('')}${cells}</div></div><h3 class="h3">${m + 1}월 일정</h3>` : ''}${list}`;
    }
    Actions['cal-nav'] = el => { m += +el.dataset.d; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } draw(); };
    Actions['cal-view'] = el => { view = el.dataset.v; draw(); };
    Actions['cal-today'] = () => { y = now.getFullYear(); m = now.getMonth(); draw(); };
    async function editEvent(event) {
      if (!Store.isAdmin()) return;
      const e = event || {};
      const values = await UI.formDialog({ title: event ? '일정 수정' : '일정 추가', body: `<label class="fld">제목<input name="title" maxlength="100" value="${esc(e.title || '')}" required autofocus></label><label class="fld">시작일<input type="date" name="date" value="${e.date || todayS}" required></label><label class="fld">종료일 (선택)<input type="date" name="end" value="${e.end || ''}"></label><label class="fld">장소<input name="place" maxlength="100" value="${esc(e.place || '')}"></label>`, submit: '저장', validate: Store.eventError });
      if (!values) return;
      const r = Store.saveEvent({ ...values, id: e.id });
      if (!r.ok) return toast(r.error, 'error');
      const d = new Date(r.event.date + 'T00:00'); y = d.getFullYear(); m = d.getMonth(); draw(); toast(event ? '일정을 수정했습니다' : '일정을 추가했습니다');
    }
    Actions['event-add'] = () => editEvent();
    Actions['event-open'] = async el => {
      const e = Store.events().find(e => e.id === el.dataset.id); if (!e) return;
      const action = await Modal.open({ title: e.title, body: `<p>${e.date.replaceAll('-', '.')}${e.end ? ' ~ ' + e.end.replaceAll('-', '.') : ''}</p><p>${esc(e.place || '장소 미정')}</p>`, actions: (Store.isAdmin() ? [{ label: '수정', value: 'edit', kind: 'line' }, { label: '삭제', value: 'delete', kind: 'line danger-t' }] : []).concat([{ label: '닫기', value: null }]) });
      if (action === 'edit') return editEvent(e);
      if (action === 'delete' && Store.isAdmin() && await Modal.confirm('이 일정을 삭제할까요?', { title: '일정 삭제', ok: '삭제', danger: true })) {
        const r = Store.deleteEvent(e.id); if (!r.ok) return toast(r.error, 'error'); draw(); toast('일정을 삭제했습니다');
      }
    };
    Actions['day-open'] = async el => {
      const ds = el.dataset.date, es = Store.events().filter(e => inDay(e, ds)), d = new Date(ds + 'T00:00');
      if (es.length === 1) return Actions['event-open']({ dataset: { id: es[0].id } });
      const id = await Modal.open({ title: `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]}) 일정`, body: '<p>자세히 볼 일정을 선택해 주세요.</p>', actions: es.map(e => ({ label: e.title, value: e.id, kind: 'line' })).concat([{ label: '닫기', value: null }]) });
      if (id) return Actions['event-open']({ dataset: { id } });
    };
    draw();
  }
})();
