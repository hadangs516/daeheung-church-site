/* ============================================================
   회원 화면: 로그인 · 회원가입 · 마이페이지 · 글쓰기 편집기 · 댓글
   - 데이터는 Store(js/store.js)만 사용합니다. (시험용: 이 브라우저에만 저장)
   - 모든 버튼·폼은 data-action 으로 연결됩니다 (js/ui.js 의 Actions).
   ============================================================ */
(function () {
  const Q = new URLSearchParams(location.search);
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const safeNext = n => /^[\w-]+\.html(\?[\w=&%.\-]*)?$/.test(n || '') ? n : 'home.html';
  const QUOTA_MSG = '저장 공간이 가득 찼습니다. 사진을 줄이거나 예전 글을 지운 뒤 다시 저장해 주세요.';

  const trial = extra => `<div class="trial-box" role="note"><span class="ms">science</span><div><b>시험용 — 실제 비밀번호를 쓰지 마세요.</b><p>이 계정과 글은 이 브라우저에만 저장됩니다. ${extra || ''}</p></div></div>`;
  const field = (label, input, key, hint) => `<div class="fld"><label><span class="fld-l">${label}</span>${input}</label>${hint ? `<p class="fld-h">${hint}</p>` : ''}<p class="field-err" data-err="${key}" role="alert"></p></div>`;
  const avatar = u => `<span class="avatar-m">${u && u.photo ? `<img src="${u.photo}" alt="">` : '<span class="ms">person</span>'}</span>`;
  const rankOpts = sel => RANKS.map(r => `<option${r === sel ? ' selected' : ''}>${r}</option>`).join('');

  function setErr(form, key, msg) {
    form.querySelectorAll('[data-err]').forEach(p => p.textContent = '');
    const p = form.querySelector(`[data-err="${key}"]`) || form.querySelector('[data-err="form"]'); if (p) p.textContent = msg;
    const inp = form.querySelector(`[name="${key}"]`); if (inp) inp.focus();
    return false;
  }
  const clearErr = form => form.querySelectorAll('[data-err]').forEach(p => p.textContent = '');
  const busy = (form, on) => { const b = form.querySelector('[type=submit]'); if (b) b.disabled = on; };

  /* ================= 로그인 ================= */
  function login(C) {
    if (Store.me()) { location.replace('mypage.html'); return; }
    C.innerHTML = `<div class="mb-card">${trial('정식판에서는 교회 승인 후 이용할 수 있습니다.')}
      <form class="mb-form" data-action="login" novalidate>
        ${field('아이디', '<input name="username" autocomplete="username" maxlength="20" autocapitalize="off">', 'username')}
        ${field('비밀번호', '<input name="password" type="password" autocomplete="current-password">', 'password')}
        <p class="field-err" data-err="form" role="alert"></p>
        <button class="btn block" type="submit">로그인</button>
      </form>
      <div class="mb-links"><a href="join.html${location.search}">회원가입</a><button type="button" data-action="soon">비밀번호 찾기</button></div>
      <p class="mb-guest"><span class="ms">info</span>로그인하지 않아도 지금은 글쓰기와 댓글을 쓸 수 있습니다. 이때 작성자는 “게스트”로 표시됩니다.</p></div>`;
  }
  Actions.login = async form => {
    clearErr(form);
    const u = form.username.value.trim(), p = form.password.value;
    if (!u) return setErr(form, 'username', '아이디를 입력해 주세요.');
    if (!p) return setErr(form, 'password', '비밀번호를 입력해 주세요.');
    busy(form, true);
    try {
      const r = await Store.login(u, p);
      if (!r.ok) { busy(form, false); return setErr(form, 'form', r.error); }
      toastLater(r.user.name + '님, 환영합니다'); location.href = safeNext(Q.get('next'));
    } catch (e) { busy(form, false); setErr(form, 'form', e.message); }
  };

  /* ================= 회원가입 ================= */
  function join(C) {
    if (Store.me()) { location.replace('mypage.html'); return; }
    const todayISO = new Date().toISOString().slice(0, 10);
    C.innerHTML = `<div class="mb-card">${trial('시험판에서는 가입하면 바로 로그인됩니다. 정식판에서는 교회 승인 후 이용할 수 있습니다.')}
      <form class="mb-form" data-action="join" novalidate>
        ${field('이름', '<input name="name" autocomplete="name" maxlength="20">', 'name')}
        ${field('아이디', '<input name="username" autocomplete="username" maxlength="20" autocapitalize="off">', 'username', '영문·숫자·밑줄(_) 4~20자')}
        ${field('비밀번호', '<input name="password" type="password" autocomplete="new-password">', 'password', '6자 이상')}
        ${field('비밀번호 확인', '<input name="password2" type="password" autocomplete="new-password">', 'password2')}
        ${field('생년월일', `<input name="birth" type="date" min="1900-01-01" max="${todayISO}">`, 'birth')}
        ${field('직분', `<select name="rank"><option value="">선택해 주세요</option>${rankOpts('')}</select>`, 'rank')}
        ${field('휴대폰 <i class="opt">(선택)</i>', '<input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="010-0000-0000">', 'phone')}
        <p class="field-err" data-err="form" role="alert"></p>
        <button class="btn block" type="submit">가입하고 로그인</button>
      </form>
      <div class="mb-links"><span>이미 계정이 있나요?</span><a href="login.html${location.search}">로그인</a></div></div>`;
  }
  Actions.join = async form => {
    clearErr(form);
    const v = k => form[k].value.trim(), pw = form.password.value;
    if (v('name').length < 2) return setErr(form, 'name', '이름을 2자 이상 입력해 주세요.');
    if (!/^[A-Za-z0-9_]{4,20}$/.test(v('username'))) return setErr(form, 'username', '아이디는 영문·숫자·밑줄(_) 4~20자로 입력해 주세요.');
    if (pw.length < 6) return setErr(form, 'password', '비밀번호는 6자 이상으로 입력해 주세요.');
    if (pw !== form.password2.value) return setErr(form, 'password2', '비밀번호가 서로 다릅니다.');
    if (!v('birth')) return setErr(form, 'birth', '생년월일을 입력해 주세요.');
    if (!form.rank.value) return setErr(form, 'rank', '직분을 선택해 주세요.');
    if (v('phone') && !/^01\d[-\s]?\d{3,4}[-\s]?\d{4}$/.test(v('phone'))) return setErr(form, 'phone', '휴대폰 번호 형식이 맞지 않습니다. (예: 010-0000-0000)');
    busy(form, true);
    try {
      const r = await Store.signup({ name: v('name'), username: v('username'), password: pw, birth: v('birth'), rank: form.rank.value, phone: v('phone') });
      if (!r.ok) { busy(form, false); return setErr(form, r.field || 'form', r.error); }
      toastLater(r.user.name + '님, 가입되었습니다 (시험판: 바로 로그인)'); location.href = safeNext(Q.get('next'));
    } catch (e) { busy(form, false); setErr(form, 'form', e.message); }
  };

  /* ================= 로그아웃 (헤더·마이페이지 공통) ================= */
  Actions.logout = () => { Store.logout(); toastLater('로그아웃했습니다'); location.href = 'home.html'; };

  /* ================= 마이페이지 ================= */
  let TAB = 'info';
  function mypage(C) {
    if (!Store.me()) { location.replace('login.html?next=mypage.html'); return; }
    TAB = (location.hash || '').slice(1) || 'info';
    drawMy(C);
    addEventListener('hashchange', () => { TAB = (location.hash || '').slice(1) || 'info'; drawMy(); });
  }
  function drawMy(C) {
    C = C || $('#content'); const u = Store.me(); if (!u) return;
    const admin = Store.isAdmin(), pend = u.pending, pcount = admin ? Store.pendingList().length : 0;
    const tabs = [['info', '내 정보'], ['posts', '내가 쓴 글'], ['pw', '비밀번호 변경'], ['acct', '계정']].concat(admin ? [['admin', '승인 관리' + (pcount ? ' (' + pcount + ')' : '')]] : []);
    if (!tabs.some(t => t[0] === TAB)) TAB = 'info';
    C.innerHTML = `<div class="mp">
      <aside class="mp-side"><div class="mp-me">${avatar(u)}<b>${esc(u.name)}</b><span>${esc(u.rank)}${pend ? '' : ''}</span>
        ${pend ? '<em class="badge wait"><span class="ms">hourglass_top</span>승인 대기 중</em>' : '<em class="badge ok"><span class="ms">verified</span>승인됨</em>'}</div>
        <label class="switch"><input type="checkbox" role="switch" data-action="admin-toggle"${admin ? ' checked' : ''}><span class="sw"></span><span class="sw-t">시험용 관리자 모드</span></label>
        <p class="sw-h">켜면 공지 글쓰기, 익명 글 작성자 확인, 신상 변경 승인을 해볼 수 있습니다.</p></aside>
      <section class="mp-main"><div class="tabs" role="tablist">${tabs.map(t => `<a href="#${t[0]}" role="tab" data-action="mp-tab" data-tab="${t[0]}"${t[0] === TAB ? ' class="on" aria-selected="true"' : ''}>${t[1]}</a>`).join('')}</div>
        <div class="mp-panel" data-panel="${TAB}">${panel(u, TAB)}</div></section></div>`;
  }
  Actions['mp-tab'] = (el, e) => { e.preventDefault(); TAB = el.dataset.tab; history.replaceState(null, '', '#' + TAB); drawMy(); };

  function panel(u, tab) {
    if (tab === 'posts') return panelPosts();
    if (tab === 'pw') return `<form class="mb-form wide" data-action="pw-change" novalidate>
        ${field('현재 비밀번호', '<input name="cur" type="password" autocomplete="current-password">', 'cur')}
        ${field('새 비밀번호', '<input name="next" type="password" autocomplete="new-password">', 'next', '6자 이상')}
        ${field('새 비밀번호 확인', '<input name="next2" type="password" autocomplete="new-password">', 'next2')}
        <p class="field-err" data-err="form" role="alert"></p><button class="btn" type="submit">비밀번호 변경</button></form>`;
    if (tab === 'acct') return `<div class="acct"><div class="acct-row"><div><b>로그아웃</b><p>이 브라우저에서 로그아웃합니다.</p></div><button type="button" class="btn line" data-action="logout">로그아웃</button></div>
        <div class="acct-row"><div><b>탈퇴</b><p>시험 계정과, 이 계정으로 쓴 글·댓글이 모두 삭제됩니다. 되돌릴 수 없습니다.</p></div><button type="button" class="btn danger" data-action="withdraw">탈퇴하기</button></div>
        <div class="acct-row"><div><b>시험 데이터 전체 초기화</b><p>이 브라우저에 저장된 모든 시험 계정·글·댓글을 지웁니다.</p></div><button type="button" class="btn line" data-action="reset-all">전체 초기화</button></div>
        <p class="fld-h">저장 공간 사용: 약 ${Store.usageKB().toLocaleString()}KB / 5,000KB (브라우저마다 다릅니다)</p></div>`;
    if (tab === 'admin') return panelAdmin();
    /* 내 정보 */
    const p = u.pending || {}, val = k => (k in p ? p[k] : u[k]);
    const need = '<span class="need-ok"><span class="ms">verified_user</span>변경 시 교회 승인 필요</span>';
    const wait = k => k in p ? `<p class="fld-w"><span class="ms">hourglass_top</span>승인 대기 중 · 지금 표시되는 정보: ${esc(u[k] || '(없음)')}</p>` : '';
    return `${pend(u)}<form class="mb-form wide" data-action="profile-save" novalidate>
        <div class="mp-photo">${avatar(u)}<div><p class="fld-l">프로필 사진 <i class="opt">바로 반영</i></p>
          <button type="button" class="btn sm line" data-action="photo-pick"><span class="ms">photo_camera</span>사진 변경</button>
          ${u.photo ? '<button type="button" class="btn sm line" data-action="photo-clear">삭제</button>' : ''}
          <input type="file" accept="image/*" hidden data-action="photo-file"></div></div>
        ${field('자기소개 <i class="opt">바로 반영</i>', `<textarea name="bio" rows="3" maxlength="200" placeholder="간단히 자신을 소개해 주세요 (200자)">${esc(u.bio)}</textarea>`, 'bio')}
        <div class="fld-grid">
        <div>${field('이름 ' + need, `<input name="name" maxlength="20" value="${esc(val('name'))}">`, 'name')}${wait('name')}</div>
        <div>${field('직분 ' + need, `<select name="rank">${rankOpts(val('rank'))}</select>`, 'rank')}${wait('rank')}</div>
        <div>${field('생년월일 ' + need, `<input name="birth" type="date" value="${esc(val('birth'))}">`, 'birth')}${wait('birth')}</div>
        <div>${field('연락처 ' + need, `<input name="phone" type="tel" inputmode="tel" value="${esc(val('phone'))}" placeholder="010-0000-0000">`, 'phone')}${wait('phone')}</div></div>
        <p class="field-err" data-err="form" role="alert"></p>
        <div class="btn-row"><button class="btn" type="submit">정보 수정</button></div></form>`;
    function pend(u) {
      if (!u.pending) return '';
      const rows = Store.SENS.filter(k => k in u.pending).map(k => `<li><b>${Store.SENS_LABEL[k]}</b> ${esc(u[k] || '(없음)')} <span class="ms">arrow_forward</span> ${esc(u.pending[k] || '(없음)')}</li>`).join('');
      return `<div class="pend-box"><div><b><span class="ms">hourglass_top</span>승인 대기 중</b><p>교회에서 승인하기 전까지는 이전 정보가 표시됩니다.</p><ul>${rows}</ul></div><button type="button" class="btn sm line" data-action="pending-cancel">요청 취소</button></div>`;
    }
  }
  function panelPosts() {
    const list = Store.myPosts();
    if (!list.length) return '<p class="empty">아직 쓴 글이 없습니다.<br><a class="btn sm" style="margin-top:16px" href="write.html?b=freeboard">자유게시판에 글쓰기</a></p>';
    return `<ul class="my-list">${list.map(p => `<li><div><span class="my-b">${esc((BOARDS[p.board] || {}).title || p.board)}</span><a href="board-view.html?b=${p.board}&id=${p.id}">${esc(p.title)}</a><span class="my-d">${p.date}${p.anon ? ' · 익명' : ''}</span></div>
        <div class="my-act"><a class="btn sm line" href="write.html?b=${p.board}&edit=${p.id}">수정</a><button type="button" class="btn sm line" data-action="post-del" data-id="${p.id}" data-board="${p.board}" data-back="mypage.html#posts">삭제</button></div></li>`).join('')}</ul>`;
  }
  function panelAdmin() {
    const L = Store.pendingList();
    return `<p class="fld-h" style="margin-bottom:14px">시험용 화면입니다. 정식판에서는 교회 담당자가 이 화면에서 회원의 신상 변경을 승인합니다.</p>` + (L.length ? `<ul class="my-list">${L.map(x => `<li><div><b>${esc(x.before.name)}</b> (${esc(x.username)})<ul class="pend-rows">${Store.SENS.filter(k => k in x.pending).map(k => `<li>${Store.SENS_LABEL[k]}: ${esc(x.before[k] || '(없음)')} → <b>${esc(x.pending[k] || '(없음)')}</b></li>`).join('')}</ul></div>
        <div class="my-act"><button type="button" class="btn sm" data-action="approve" data-id="${x.id}">승인</button><button type="button" class="btn sm line" data-action="reject" data-id="${x.id}">반려</button></div></li>`).join('')}</ul>` : '<p class="empty">승인을 기다리는 변경이 없습니다.</p>');
  }

  Actions['admin-toggle'] = el => { Store.setAdmin(el.checked); toastLater(el.checked ? '관리자 모드를 켰습니다' : '관리자 모드를 껐습니다'); location.reload(); };
  Actions.approve = el => { Store.resolvePending(el.dataset.id, true); toastLater('승인했습니다'); location.reload(); };
  Actions.reject = el => { Store.resolvePending(el.dataset.id, false); toastLater('반려했습니다'); location.reload(); };
  Actions['pending-cancel'] = () => { Store.cancelPending(); toastLater('변경 요청을 취소했습니다'); location.reload(); };
  Actions['photo-pick'] = el => el.closest('form').querySelector('[data-action="photo-file"]').click();
  Actions['photo-file'] = async el => {
    const f = el.files[0]; if (!f) return;
    try { const photo = await Store.resizeImage(f, 320, { square: true, quality: 0.85 }); const r = Store.updateProfile({ photo }); if (!r.ok) return Modal.alert(esc(r.error)); toast('프로필 사진을 바꿨습니다'); location.reload(); }
    catch (e) { toast(e.message, 'error'); }
  };
  Actions['photo-clear'] = () => { Store.updateProfile({ photo: '' }); toast('사진을 삭제했습니다'); location.reload(); };

  Actions['profile-save'] = async form => {
    clearErr(form);
    const u = Store.me(), v = k => form[k].value.trim();
    if (v('name').length < 2) return setErr(form, 'name', '이름을 2자 이상 입력해 주세요.');
    if (!v('birth')) return setErr(form, 'birth', '생년월일을 입력해 주세요.');
    if (v('phone') && !/^01\d[-\s]?\d{3,4}[-\s]?\d{4}$/.test(v('phone'))) return setErr(form, 'phone', '휴대폰 번호 형식이 맞지 않습니다. (예: 010-0000-0000)');
    const eff = k => (u.pending && k in u.pending ? u.pending[k] : u[k]);
    const sens = { name: v('name'), rank: form.rank.value, birth: v('birth'), phone: v('phone') };
    const changed = Store.SENS.filter(k => sens[k] !== (eff(k) || ''));
    if (changed.length) {
      const ok = await Modal.confirm('이름·직분·생년월일·연락처를 바꾸면 <b>교회의 재승인</b>이 필요합니다.<br>승인 전까지는 지금 정보가 표시되고 “승인 대기 중”으로 보입니다.<br>(변경 항목: ' + changed.map(k => Store.SENS_LABEL[k]).join(', ') + ')<br><br>자기소개와 사진은 바로 반영됩니다. 수정할까요?', { title: '신상 정보 변경', ok: '변경 요청' });
      if (!ok) return;
    }
    const r = Store.updateProfile(Object.assign({ bio: form.bio.value.trim() }, sens));
    if (!r.ok) return Modal.alert(esc(r.error));
    toast(changed.length ? '변경을 요청했습니다 (승인 대기 중)' : '저장했습니다'); drawMy();
  };
  Actions['pw-change'] = async form => {
    clearErr(form);
    if (!form.cur.value) return setErr(form, 'cur', '현재 비밀번호를 입력해 주세요.');
    if (form.next.value.length < 6) return setErr(form, 'next', '새 비밀번호는 6자 이상으로 입력해 주세요.');
    if (form.next.value !== form.next2.value) return setErr(form, 'next2', '새 비밀번호가 서로 다릅니다.');
    busy(form, true);
    try { const r = await Store.changePassword(form.cur.value, form.next.value); busy(form, false); if (!r.ok) return setErr(form, r.field || 'form', r.error); form.reset(); toast('비밀번호를 바꿨습니다'); }
    catch (e) { busy(form, false); setErr(form, 'form', e.message); }
  };
  Actions.withdraw = async () => { if (await Modal.confirm('시험 계정과 이 계정으로 쓴 글·댓글이 모두 삭제됩니다.<br>되돌릴 수 없습니다. 탈퇴할까요?', { title: '탈퇴', ok: '탈퇴하기', danger: true })) { Store.withdraw(); toastLater('탈퇴했습니다. 시험 데이터를 삭제했습니다'); location.href = 'home.html'; } };
  Actions['reset-all'] = async () => { if (await Modal.confirm('이 브라우저에 저장된 모든 시험 계정·글·댓글을 지웁니다. 계속할까요?', { title: '전체 초기화', ok: '초기화', danger: true })) { Store.resetAll(); toastLater('시험 데이터를 모두 지웠습니다'); location.href = 'home.html'; } };
  Actions['post-del'] = async el => {
    if (!(await Modal.confirm('이 글을 삭제할까요? 댓글도 함께 삭제되며 되돌릴 수 없습니다.', { title: '글 삭제', ok: '삭제', danger: true }))) return;
    Store.deletePost(el.dataset.id); toastLater('글을 삭제했습니다'); location.href = el.dataset.back || ('board.html?b=' + el.dataset.board);
  };

  /* ================= 글쓰기 편집기 ================= */
  function write(C, board, editId) {
    const B = BOARDS[board], rule = WRITE_RULE[board] || 'none', m = Store.me();
    const back = 'board.html?b=' + board;
    const stop = (icon, msg, extra) => { C.innerHTML = `<div class="mb-card"><p class="empty" style="padding:40px 0"><span class="ms big">${icon}</span><br>${msg}</p>${extra || ''}<div class="btn-row center" style="margin-top:8px"><a class="btn line" href="${back}">목록으로</a></div></div>`; };
    if (!B || rule === 'none') return stop('block', '이 게시판에는 글쓰기가 없습니다.');
    if (rule === 'admin' && !Store.isAdmin()) return stop('lock', '이 게시판은 교회에서만 글을 올릴 수 있습니다.', '<p class="fld-h" style="text-align:center">시험 중에는 마이페이지에서 “시험용 관리자 모드”를 켜면 쓸 수 있습니다.</p><div class="btn-row center" style="margin-top:12px"><a class="btn" href="mypage.html">마이페이지로</a></div>');
    let post = null;
    if (editId) { post = Store.getPost(editId); if (!post || !(Store.isMine(post.owner))) return stop('search_off', '수정할 수 있는 글이 아닙니다.'); }
    const who = m ? esc(m.name) : '게스트';
    C.innerHTML = `<form class="wr" data-action="post-save" data-board="${board}" data-edit="${post ? post.id : ''}" novalidate>
      <p class="wr-as"><span class="ms">edit_note</span>${B.title} · 작성자 <b>${who}</b>${m ? '' : ' <i class="opt">(로그인하지 않아 게스트로 표시됩니다)</i>'}</p>
      <input class="wr-title" name="title" maxlength="100" placeholder="제목을 입력하세요" value="${post ? esc(post.title) : ''}" aria-label="제목">
      ${B.anon ? `<div class="wr-anon" role="radiogroup" aria-label="작성자 표시"><span>작성자 표시</span><label><input type="radio" name="nm" value="real"${post && post.anon ? '' : ' checked'}> 이름 공개 (${who})</label><label><input type="radio" name="nm" value="anon"${post && post.anon ? ' checked' : ''}> 익명</label></div>` : ''}
      <div class="ed-wrap">
        <div class="ed-tb" role="toolbar" aria-label="글 꾸미기">
          <span class="tb-g"><button type="button" data-action="fmt" data-cmd="bold" aria-label="굵게" title="굵게"><span class="ms">format_bold</span></button>
          <button type="button" data-action="fmt" data-cmd="italic" aria-label="기울임" title="기울임"><span class="ms">format_italic</span></button>
          <button type="button" data-action="fmt" data-cmd="underline" aria-label="밑줄" title="밑줄"><span class="ms">format_underlined</span></button>
          <button type="button" data-action="fmt" data-cmd="strikeThrough" aria-label="취소선" title="취소선"><span class="ms">strikethrough_s</span></button></span>
          <span class="tb-g" aria-label="글자 크기"><button type="button" class="sz s" data-action="fmt-size" data-size="s" aria-label="글자 작게" title="작게">가</button><button type="button" class="sz n" data-action="fmt-size" data-size="n" aria-label="글자 보통" title="보통">가</button><button type="button" class="sz l" data-action="fmt-size" data-size="l" aria-label="글자 크게" title="크게">가</button><button type="button" class="sz xl" data-action="fmt-size" data-size="xl" aria-label="글자 아주 크게" title="아주 크게">가</button></span>
          <span class="tb-g" aria-label="글자 색">${[['ink', '기본'], ['red', '빨강'], ['orange', '주황'], ['green', '초록'], ['blue', '파랑'], ['gray', '회색']].map(c => `<button type="button" class="sw-c c-${c[0]}" data-action="fmt-color" data-color="${c[0]}" aria-label="글자색 ${c[1]}" title="${c[1]}"><i></i></button>`).join('')}</span>
          <span class="tb-g"><button type="button" class="tb-img" data-action="img-pick" aria-label="사진 넣기" title="사진 넣기"><span class="ms">add_photo_alternate</span><span class="lbl">사진</span></button><input type="file" accept="image/*" multiple hidden data-action="img-file"></span>
        </div>
        <div class="ed" id="ed" contenteditable="true" role="textbox" aria-multiline="true" aria-label="본문" data-placeholder="내용을 입력하세요. 사진은 한 줄에 한 장씩 크게 들어갑니다."></div>
      </div>
      <p class="wr-hint"><span class="ms">info</span>사진은 긴 변 1200px 정도로 줄여 저장됩니다. 붙여넣으면 글자 모양은 지워지고 글자만 들어갑니다. <span data-usage></span></p>
      <p class="field-err" data-err="form" role="alert"></p>
      <div class="btn-row center"><a class="btn line" href="${post ? 'board-view.html?b=' + board + '&id=' + post.id : back}">취소</a><button class="btn" type="submit">${post ? '수정 저장' : '저장'}</button></div></form>`;
    const ed = $('#ed'); if (post) ed.innerHTML = Store.sanitize(post.html);
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) {}
    initEditor(ed); usage();
  }
  const usage = () => { const s = $('[data-usage]'); if (s) s.textContent = '저장 공간 약 ' + Store.usageKB().toLocaleString() + 'KB / 5,000KB 사용 중.'; };

  let SAVED = null;
  function initEditor(ed) {
    document.addEventListener('selectionchange', () => {
      const s = getSelection(); if (!s.rangeCount) return;
      const r = s.getRangeAt(0);
      if (ed.contains(r.commonAncestorContainer)) { SAVED = r.cloneRange(); syncTb(); }
    });
    $('.ed-tb').addEventListener('mousedown', e => { if (!e.target.closest('input')) e.preventDefault(); });   // 눌러도 글 선택이 풀리지 않게
    ed.addEventListener('input', () => { if (!ed.textContent.trim() && !ed.querySelector('img')) ed.innerHTML = ''; });
    ed.addEventListener('paste', e => {
      e.preventDefault();
      const files = [...(e.clipboardData.files || [])].filter(f => /^image\//.test(f.type));
      if (files.length) return insertImages(files);
      document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
    });
    ed.addEventListener('drop', e => { e.preventDefault(); const files = [...(e.dataTransfer.files || [])].filter(f => /^image\//.test(f.type)); if (files.length) insertImages(files); });
  }
  function syncTb() {
    document.querySelectorAll('.ed-tb [data-cmd]').forEach(b => { let on = false; try { on = document.queryCommandState(b.dataset.cmd); } catch (e) {} b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  }
  function focusEd() {
    const ed = $('#ed'); ed.focus();
    const s = getSelection(); s.removeAllRanges();
    if (SAVED && ed.contains(SAVED.commonAncestorContainer)) s.addRange(SAVED);
    else { const r = document.createRange(); r.selectNodeContents(ed); r.collapse(false); s.addRange(r); }
    return ed;
  }
  Actions.fmt = el => { focusEd(); document.execCommand(el.dataset.cmd); syncTb(); };
  function applyClass(kind, val) {
    const ed = focusEd(), s = getSelection();
    if (!s.rangeCount || s.isCollapsed) { toast('먼저 바꿀 글자를 선택해 주세요', 'info'); return; }
    if (kind === 'size') document.execCommand('fontSize', false, '7'); else document.execCommand('foreColor', false, '#010203');
    ed.querySelectorAll('font').forEach(f => {
      if (f.getAttribute('size') !== '7' && f.getAttribute('color') !== '#010203') return;
      const sp = document.createElement('span'); sp.className = (kind === 'size' ? 'fs-' : 'fc-') + val;
      while (f.firstChild) sp.appendChild(f.firstChild); f.replaceWith(sp);
    });
  }
  Actions['fmt-size'] = el => applyClass('size', el.dataset.size);
  Actions['fmt-color'] = el => applyClass('color', el.dataset.color);
  Actions['img-pick'] = el => el.parentElement.querySelector('[data-action="img-file"]').click();
  Actions['img-file'] = async el => { const files = [...el.files]; el.value = ''; await insertImages(files); };
  async function insertImages(files) {
    const ed = $('#ed');
    for (const f of files) {
      if (ed.innerHTML.length > 2500000) { toast('이 글에는 사진이 너무 많아 더 넣을 수 없습니다', 'warning'); break; }
      try { const src = await Store.resizeImage(f, 1200, { quality: 0.8 }); focusEd(); document.execCommand('insertHTML', false, '<p><img src="' + src + '"></p><p><br></p>'); }
      catch (e) { toast(e.message, 'error'); }
    }
  }
  Actions['post-save'] = form => {
    clearErr(form);
    const ed = $('#ed'), title = form.title.value.trim();
    if (!title) return setErr(form, 'title', '제목을 입력해 주세요.');
    if (!ed.textContent.trim() && !ed.querySelector('img')) { form.querySelector('[data-err="form"]').textContent = '내용을 입력해 주세요.'; ed.focus(); return; }
    const anon = !!form.querySelector('[name="nm"][value="anon"]:checked');
    const p = Store.savePost({ id: form.dataset.edit || null, board: form.dataset.board, title, html: ed.innerHTML, anon });
    if (!p) { Modal.alert(QUOTA_MSG, { title: '저장 공간 부족' }); usage(); return; }
    toastLater(form.dataset.edit ? '글을 수정했습니다' : '글을 저장했습니다'); location.href = 'board-view.html?b=' + form.dataset.board + '&id=' + p.id;
  };

  /* ================= 댓글 ================= */
  function comments(root, board, postId) {
    root.dataset.cmtRoot = ''; root.dataset.board = board; root.dataset.post = postId;
    const list = Store.commentsOf(board, postId), m = Store.me(), anonOk = BOARDS[board] && BOARDS[board].anon;
    const cc = $('[data-cmt-count]'); if (cc) cc.textContent = list.length;
    root.innerHTML = `<section class="cmt-box" aria-label="댓글"><h3 class="cmt-h">댓글 <b>${list.length}</b></h3>
      ${list.length ? `<ul class="cmt-list">${list.map(c => `<li><div class="cmt-top"><b>${esc(c.name)}</b>${c.mine ? '<em class="me">내 댓글</em>' : ''}<span>${c.date}</span>${c.mine ? `<button type="button" class="cmt-del" data-action="cmt-del" data-id="${c.id}" aria-label="댓글 삭제"><span class="ms">delete</span></button>` : ''}</div><p>${esc(c.text).replace(/\n/g, '<br>')}</p></li>`).join('')}</ul>` : '<p class="cmt-none">첫 댓글을 남겨 보세요.</p>'}
      <form class="cmt-form" data-action="cmt-add" novalidate>
        <p class="cmt-as"><span class="ms">person</span>${m ? esc(m.name) + '(으)로 작성' : '로그인하지 않아 “게스트”로 작성됩니다'}</p>
        ${anonOk ? `<div class="wr-anon"><label><input type="radio" name="nm" value="real" checked> 이름 공개</label><label><input type="radio" name="nm" value="anon"> 익명</label></div>` : ''}
        <textarea name="text" rows="3" maxlength="500" placeholder="댓글을 입력하세요" aria-label="댓글"></textarea>
        <p class="field-err" data-err="text" role="alert"></p>
        <div class="cmt-act"><span class="cnt-t">0 / 500</span><button class="btn" type="submit">댓글 등록</button></div></form></section>`;
    const ta = root.querySelector('textarea'), cnt = root.querySelector('.cnt-t'); ta.addEventListener('input', () => cnt.textContent = ta.value.length + ' / 500');
  }
  Actions['cmt-add'] = form => {
    const root = form.closest('[data-cmt-root]'), text = form.text.value.trim();
    if (!text) return setErr(form, 'text', '댓글 내용을 입력해 주세요.');
    const ok = Store.addComment({ board: root.dataset.board, postId: root.dataset.post, text, anon: !!form.querySelector('[name="nm"][value="anon"]:checked') });
    if (!ok) return Modal.alert(QUOTA_MSG, { title: '저장 공간 부족' });
    comments(root, root.dataset.board, root.dataset.post); toast('댓글을 남겼습니다');
  };
  Actions['cmt-del'] = async el => {
    if (!(await Modal.confirm('이 댓글을 삭제할까요?', { title: '댓글 삭제', ok: '삭제', danger: true }))) return;
    const root = el.closest('[data-cmt-root]'); Store.deleteComment(el.dataset.id); comments(root, root.dataset.board, root.dataset.post); toast('댓글을 삭제했습니다');
  };

  window.Member = { login, join, mypage, write, comments, trial };
})();
