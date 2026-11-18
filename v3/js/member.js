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
  const pwf = (name, ac, meter) => `<span class="pw-wrap"><input name="${name}" type="password" autocomplete="${ac}"${meter ? ' data-oninput="pw-meter"' : ''}><button type="button" class="pw-eye" data-action="pw-toggle" aria-label="비밀번호 보기"><span class="ms">visibility</span></button></span>${meter ? '<div class="pw-meter" data-lv="0" aria-live="polite"><span class="pw-bars"><i></i><i></i><i></i></span><b></b></div>' : ''}`;
  const field = (label, input, key, hint, div) => `<div class="fld">${div ? `<div role="group"><span class="fld-l">${label}</span>${input}</div>` : `<label><span class="fld-l">${label}</span>${input}</label>`}${hint ? `<p class="fld-h">${hint}</p>` : ''}<p class="field-err" data-err="${key}" role="alert"></p></div>`;
  const avatar = u => `<span class="avatar-m">${u && u.photo ? `<img src="${u.photo}" alt="">` : '<span class="ms">person</span>'}</span>`;
  const rankOpts = sel => RANKS.map(r => `<option${r === sel ? ' selected' : ''}>${r}</option>`).join('');

  function setErr(form, key, msg) {
    form.querySelectorAll('[data-err]').forEach(p => p.textContent = '');
    const p = form.querySelector(`[data-err="${key}"]`) || form.querySelector('[data-err="form"]'); if (p) p.textContent = msg;
    const inp = form.querySelector(`[name="${key}"]:not([type=hidden])`) || form.querySelector(`[data-focus="${key}"]`); if (inp) inp.focus();
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
        ${field('비밀번호', pwf('password', 'current-password'), 'password')}
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

  /* ---------- 가입·정보 수정에서 같이 쓰는 입력 도구 ---------- */
  /* 비밀번호 강도: 4자 이상이면 모두 허용. 막대는 약함·보통·강함만 알려 줌 */
  function pwLevel(p) {
    const n = p.length; if (n < 4) return 0;
    const c = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(r => r.test(p)).length;
    if ((n >= 10 && c >= 2) || (n >= 8 && c >= 3)) return 3;
    if ((n >= 6 && c >= 2) || n >= 8) return 2;
    return 1;
  }
  Actions['pw-meter'] = el => {
    const m = el.closest('.fld') && el.closest('.fld').querySelector('.pw-meter'); if (!m) return;
    const l = pwLevel(el.value); m.dataset.lv = l; m.querySelector('b').textContent = ['', '약함', '보통', '강함'][l];
  };
  /* 생년월일: 년·월·일을 직접 입력(숫자 키패드). 합친 값은 숨은 칸 birth 에 YYYY-MM-DD */
  const birthHtml = v => {
    const [y, m, d] = (v || '').split('-').map(Number);
    const i = (n, ph, len, val, unit) => `<label class="bi bi-${n}"><input name="b${n}" inputmode="numeric" pattern="[0-9]*" maxlength="${len}" placeholder="${ph}" value="${val || ''}" autocomplete="off" data-oninput="birth-key"${n === 'y' ? ' data-focus="birth"' : ''} aria-label="태어난 ${unit}"><span>${unit}</span></label>`;
    return `<div class="birth-in" role="group">${i('y', '1950', 4, y, '년')}${i('m', '3', 2, m, '월')}${i('d', '15', 2, d, '일')}<input type="hidden" name="birth" value="${esc(v || '')}"></div>`;
  };
  function readBirth(form) {
    const y = +form.by.value, m = +form.bm.value, d = +form.bd.value, now = new Date();
    let ok = y >= 1900 && y <= now.getFullYear() && m >= 1 && m <= 12 && d >= 1 && d <= new Date(y, m, 0).getDate();
    if (ok && new Date(y, m - 1, d) > now) ok = false;
    const iso = ok ? y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0') : '';
    form.birth.value = iso; return iso;
  }
  Actions['birth-key'] = el => {
    el.value = el.value.replace(/\D/g, '');
    const f = el.form, next = { by: 'bm', bm: 'bd' }[el.name];
    if (next && (el.value.length >= el.maxLength || (el.name === 'bm' && +el.value > 1))) f[next].focus();
  };
  const BIRTH_ERR = '생년월일을 숫자로 입력해 주세요. (예: 1950년 3월 15일)';
  /* 소속: 선택 창(Affil.open)에서 고른 결과를 칩으로 보여 줌. 상태는 요소의 data-sel 에 JSON 으로 담는다 */
  const affBlock = (sel, orig) => `<div class="fld"><span class="fld-l">소속 <i class="opt">(선택 · 없으면 그대로 두세요)</i></span>
      <div class="aff" data-aff data-sel="${esc(JSON.stringify(sel.map(g => ({ id: g.id, role: g.role }))))}" data-orig="${esc(JSON.stringify(orig || []))}"><div class="aff-chips"></div>
        <button type="button" class="btn line" data-action="aff-open"><span class="ms">groups</span>소속 선택</button></div>
      <p class="fld-h">교육부서·청년부·전도회·찬양대 등. 부서 대표님이 확인하면 승인됩니다.</p></div>`;
  function affDraw(box) {
    const sel = JSON.parse(box.dataset.sel || '[]'), orig = JSON.parse(box.dataset.orig || '[]');
    box.querySelector('.aff-chips').innerHTML = sel.length ? sel.map(g => {
      const o = orig.find(x => x.id === g.id && (x.role || 'member') === (g.role || 'member')), wait = o && o.status === 'pending';
      return `<span class="chip${wait ? ' wait' : ''}">${esc(Store.groupText(g))}${wait ? ' · 승인 대기' : ''}</span>`;
    }).join('') : `<span class="chip none">${box.dataset.set ? '무소속' : '아직 고르지 않았어요'}</span>`;
  }
  const affInit = root => root.querySelectorAll('[data-aff]').forEach(affDraw);
  const affGet = form => { const b = form.querySelector('[data-aff]'); return b ? JSON.parse(b.dataset.sel || '[]') : []; };
  Actions['aff-open'] = async el => {
    const box = el.closest('[data-aff]'), form = el.closest('form');
    if (!(window.Affil && Affil.open)) { toast('소속 선택 창을 준비하고 있습니다', 'construction'); return; }
    const r = await Affil.open({ birth: readBirth(form), selected: affGet(form) });
    if (r) { box.dataset.sel = JSON.stringify(r.map(g => ({ id: g.id, role: g.role || 'member' }))); box.dataset.set = '1'; affDraw(box); }
  };
  const parishOpts = sel => '<option value="">모르겠어요 · 아직 없어요</option>' + Store.PARISHES.map(p => `<option value="${p.id}"${p.id === sel ? ' selected' : ''}>${p.name}</option>`).join('');

  /* ================= 회원가입 ================= */
  function join(C) {
    if (Store.me()) { location.replace('mypage.html'); return; }
    C.innerHTML = `<div class="mb-card">${trial('시험판에서는 가입하면 바로 로그인되고, 관리자가 승인하기 전까지 “승인 대기 중”으로 보입니다.')}
      <form class="mb-form" data-action="join" novalidate>
        ${field('이름', '<input name="name" autocomplete="name" maxlength="20">', 'name')}
        ${field('아이디', '<input name="username" autocomplete="username" maxlength="20" autocapitalize="off" data-action="id-check">', 'username', '영문·숫자·밑줄(_) 4~20자')}
        ${field('비밀번호', pwf('password', 'new-password', true), 'password', '4자 이상 쓰시면 됩니다')}
        ${field('비밀번호 확인', pwf('password2', 'new-password'), 'password2')}
        ${field('생년월일', birthHtml(''), 'birth', '숫자만 입력해 주세요', true)}
        ${field('직분', `<select name="rank"><option value="">선택해 주세요</option>${rankOpts('')}</select>`, 'rank')}
        ${affBlock([])}
        ${field('교구 <i class="opt">(선택)</i>', `<select name="parish">${parishOpts('')}</select>`, 'parish', '교구장님이 확인하면 승인됩니다.')}
        ${field('휴대폰 <i class="opt">(선택)</i>', '<input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="010-0000-0000" data-oninput="phone-fmt">', 'phone')}
        <p class="field-err" data-err="form" role="alert"></p>
        <button class="btn block" type="submit">가입하고 로그인</button>
      </form>
      <div class="mb-links"><span>이미 계정이 있나요?</span><a href="login.html${location.search}">로그인</a></div></div>`;
    affInit(C);
  }
  Actions.join = async form => {
    clearErr(form);
    const v = k => form[k].value.trim(), pw = form.password.value;
    if (v('name').length < 2) return setErr(form, 'name', '이름을 2자 이상 입력해 주세요.');
    if (!/^[A-Za-z0-9_]{4,20}$/.test(v('username'))) return setErr(form, 'username', '아이디는 영문·숫자·밑줄(_) 4~20자로 입력해 주세요.');
    if (pw.length < 4) return setErr(form, 'password', '4자 이상 입력해 주세요.');
    if (pw !== form.password2.value) return setErr(form, 'password2', '비밀번호가 서로 다릅니다. 다시 확인해 주세요.');
    const birth = readBirth(form); if (!birth) return setErr(form, 'birth', BIRTH_ERR);
    if (!form.rank.value) return setErr(form, 'rank', '직분을 선택해 주세요.');
    if (v('phone') && !/^01\d[-\s]?\d{3,4}[-\s]?\d{4}$/.test(v('phone'))) return setErr(form, 'phone', '휴대폰 번호 형식이 맞지 않습니다. (예: 010-0000-0000)');
    busy(form, true);
    try {
      const r = await Store.signup({ name: v('name'), username: v('username'), password: pw, birth, rank: form.rank.value, phone: v('phone'), groups: affGet(form), parish: form.parish.value });
      if (!r.ok) { busy(form, false); return setErr(form, r.field || 'form', r.error); }
      toastLater(r.user.name + '님, 가입되었습니다 (관리자 승인 전까지 “승인 대기 중”으로 보입니다)'); location.href = safeNext(Q.get('next'));
    } catch (e) { busy(form, false); setErr(form, 'form', e.message); }
  };

  Actions['pw-toggle'] = el => { const i = el.parentElement.querySelector('input'), show = i.type === 'password'; i.type = show ? 'text' : 'password'; el.querySelector('.ms').textContent = show ? 'visibility_off' : 'visibility'; el.setAttribute('aria-label', show ? '비밀번호 숨기기' : '비밀번호 보기'); };
  Actions['id-check'] = el => {
    const v = el.value.trim(), box = el.closest('.fld').querySelector('[data-err]'); if (!v) return;
    if (!/^[A-Za-z0-9_]{4,20}$/.test(v)) { box.className = 'field-err'; box.textContent = '아이디는 영문·숫자·밑줄(_) 4~20자로 입력해 주세요.'; return; }
    const taken = Store.usernameTaken(v); box.className = taken ? 'field-err' : 'field-ok'; box.textContent = taken ? '이미 사용 중인 아이디입니다.' : '사용할 수 있는 아이디입니다.';
  };
  Actions['phone-fmt'] = el => { const d = el.value.replace(/[^0-9]/g, '').slice(0, 11); el.value = d.length > 7 ? d.slice(0, 3) + '-' + d.slice(3, d.length - 4) + '-' + d.slice(-4) : d.length > 3 ? d.slice(0, 3) + '-' + d.slice(3) : d; };

  /* ================= 로그아웃 (헤더·마이페이지 공통) ================= */
  Actions.logout = () => { Store.logout(); toastLater('로그아웃했습니다'); location.href = 'home.html'; };

  /* ================= 마이페이지 =================
     화면 이동은 주소의 # 로: #info(내 정보) #activity(내 활동) #approve(승인 관리: 관리자·대표만)
     #account(계정 설정) #settings/privacy|notif|view|leave(설정) */
  let TAB = 'info', SUB = 'privacy', ACT = 'all';
  function route() {
    const h = (location.hash || '').slice(1).split('/'); TAB = h[0] || 'info'; if (TAB === 'edit') TAB = 'account';
    if (!['info', 'activity', 'approve', 'account', 'settings'].includes(TAB)) TAB = 'info';
    if (TAB === 'settings') SUB = ['privacy', 'notif', 'view', 'leave'].includes(h[1]) ? h[1] : 'notif';   // #settings 만 오면 알림(지난 알림)
  }
  function mypage(C) {
    if (!Store.me()) { location.replace('login.html?next=mypage.html'); return; }
    route(); drawMy(C);
    addEventListener('hashchange', () => { route(); drawMy(); scrollTo({ top: 0 }); });
  }
  const badgeHtml = u => {
    const st = Store.statusOf(u);
    if (st === 'rejected') return '<em class="badge hold"><span class="ms">info</span>승인 확인 중</em>';
    return (st === 'pending' || u.pending) ? '<em class="badge wait"><span class="ms">hourglass_top</span>승인 대기 중</em>' : '<em class="badge ok"><span class="ms">verified</span>승인됨</em>';
  };
  const dotDate = t => { const d = new Date(t), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate()); };
  const dotTime = t => { const d = new Date(t), p = n => String(n).padStart(2, '0'); return dotDate(t) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); };
  const fmtBirth = b => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(b || ''); return m ? `${+m[1]}년 ${+m[2]}월 ${+m[3]}일` : '(없음)'; };
  const groupChips = u => (u.groups || []).length ? (u.groups || []).map(g => `<span class="chip${g.status === 'pending' ? ' wait' : g.status === 'rejected' ? ' no' : ''}">${esc(Store.groupText(g))}${g.status === 'pending' ? ' · 승인 대기' : g.status === 'rejected' ? ' · 승인 안 됨' : ''}</span>`).join('') : '<span class="muted">(없음 · 무소속)</span>';
  const parishText = u => u.parish ? `<span class="chip${u.parish.status === 'pending' ? ' wait' : u.parish.status === 'rejected' ? ' no' : ''}">${esc(Store.parishName(u.parish.id))}${u.parish.status === 'pending' ? ' · 승인 대기' : u.parish.status === 'rejected' ? ' · 승인 안 됨' : ''}</span>` : '<span class="muted">(없음)</span>';
  const approveCount = () => (Store.isAdmin() ? Store.signupList().length + Store.pendingList().length : 0) + Store.affilQueue().length;

  function drawMy(C) {
    C = C || $('#content'); const u = Store.me(); if (!u) return;
    const admin = Store.isAdmin(), cnt = (admin || Store.isLeader()) ? approveCount() : 0;
    const tabs = [['info', '내 정보'], ['activity', '내 활동']].concat(admin || Store.isLeader() ? [['approve', '승인 관리' + (cnt ? ' (' + cnt + ')' : '')]] : []);
    if (TAB === 'approve' && tabs.length < 3) TAB = 'info';
    const on = (TAB === 'account' || TAB === 'settings') ? 'info' : TAB;
    const aff = Store.groupText && (u.groups || []).filter(g => g.status === 'approved').map(g => Store.groupText(g));
    C.innerHTML = `<div class="mp">
      <aside class="mp-side"><div class="mp-me">${avatar(u)}<div class="mp-me-t"><b>${esc(u.name)}</b><span>${esc(u.rank)}${aff.length ? ' · ' + esc(aff.join(' · ')) : ''}</span>${badgeHtml(u)}</div></div></aside>
      <section class="mp-main"><div class="tabs" role="tablist">${tabs.map(t => `<a href="#${t[0]}" role="tab" data-action="mp-tab" data-tab="${t[0]}"${t[0] === on ? ' class="on" aria-selected="true"' : ''}>${t[1]}</a>`).join('')}</div>
        <div class="mp-panel" data-panel="${TAB}">${panel(u)}</div></section>
      <aside class="mp-test" aria-label="시험용 도구"><p class="mp-test-t"><span class="ms">science</span>시험용 도구</p>
        <label class="switch"><input type="checkbox" role="switch" data-action="admin-toggle"${admin ? ' checked' : ''}><span class="sw"></span><span class="sw-t">시험용 관리자 모드</span></label>
        <p class="sw-h">켜면 공지 글쓰기, 익명 글 작성자 확인, 가입·정보 변경 승인, 부서 대표 지정, 신고 확인을 해볼 수 있습니다.</p></aside></div>`;
    affInit(C);
  }
  Actions['mp-tab'] = (el, e) => { e.preventDefault(); history.pushState(null, '', '#' + el.dataset.tab); route(); drawMy(); scrollTo({ top: 0 }); };
  const back = '<a class="mp-back" href="#info" data-action="mp-tab" data-tab="info"><span class="ms">arrow_back</span>내 정보로 돌아가기</a>';

  function panel(u) {
    if (TAB === 'activity') return panelActivity();
    if (TAB === 'approve') return panelApprove();
    if (TAB === 'account') return back + panelAccount(u);
    if (TAB === 'settings') return back + panelSettings(u);
    /* 내 정보 (보기 화면) */
    const row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
    const notice = (Store.statusOf(u) === 'pending' ? `<div class="pend-box"><div><b><span class="ms">hourglass_top</span>가입 승인 대기 중</b><p>관리자가 확인하면 승인됩니다. 그 전에도 홈페이지는 그대로 이용하실 수 있습니다.</p></div></div>`
      : Store.statusOf(u) === 'rejected' ? `<div class="pend-box"><div><b><span class="ms">info</span>가입 승인이 아직 되지 않았어요</b><p>교회 사무실에 문의해 주세요.</p></div></div>` : '') + pendBox(u);
    return `${notice}<div class="mp-view"><div class="mp-photo">${avatar(u)}<div class="mp-v-id"><b class="mp-v-name">${esc(u.name)}</b><span class="mp-v-rank">${esc(u.rank)}</span>
        <a class="mp-prof" href="profile.html?u=${u.id}">내 프로필 보기<span class="ms">chevron_right</span></a></div>
        <div class="mp-v-btns"><button type="button" class="btn sm line" data-action="mp-tab" data-tab="account"><span class="ms">manage_accounts</span>계정 설정</button><button type="button" class="btn sm line" data-action="mp-tab" data-tab="settings/privacy"><span class="ms">settings</span>설정</button></div></div>
        <dl class="info mp-dl">${row('이름', esc(u.name))}${row('직분', esc(u.rank))}${row('소속', groupChips(u))}${row('교구', parishText(u))}${row('생년월일', fmtBirth(u.birth))}${row('연락처', esc(u.phone) || '(없음)')}${row('자기소개', u.bio ? esc(u.bio).replace(/\n/g, '<br>') : '<span class="muted">(아직 없습니다)</span>')}</dl>
        <div class="mp-logout"><button type="button" class="btn line" data-action="logout"><span class="ms">logout</span>로그아웃</button></div></div>`;
  }
  function pendBox(u) {
    if (!u.pending) return '';
    const rows = Store.SENS.filter(k => k in u.pending).map(k => `<li><b>${Store.SENS_LABEL[k]}</b> ${esc(u[k] || '(없음)')} <span class="ms">arrow_forward</span> ${esc(u.pending[k] || '(없음)')}</li>`).join('');
    return `<div class="pend-box"><div><b><span class="ms">hourglass_top</span>승인 대기 중</b><p>교회에서 승인하기 전까지는 이전 정보가 표시됩니다.</p><ul>${rows}</ul></div><button type="button" class="btn sm line" data-action="pending-cancel">요청 취소</button></div>`;
  }

  /* ---------- 내 활동: 내가 쓴 글·댓글·답글 (최신순) ---------- */
  function panelActivity() {
    const items = Store.myPosts().map(p => ({ kind: 'post', at: p.at, board: p.board, title: p.title, href: `board-view.html?b=${p.board}&id=${p.id}`, p }))
      .concat((Store.myComments ? Store.myComments() : []).map(c => ({ kind: c.isReply ? 'reply' : 'comment', at: c.at, board: c.board, title: c.postTitle, text: c.text, href: `board-view.html?b=${c.board}&id=${c.postId}` })))
      .sort((a, b) => b.at - a.at);
    const n = k => items.filter(i => i.kind === k).length;
    const seg = [['all', '전체', items.length], ['post', '글', n('post')], ['comment', '댓글', n('comment')], ['reply', '답글', n('reply')]];
    const list = ACT === 'all' ? items : items.filter(i => i.kind === ACT);
    const KL = { post: '글', comment: '댓글', reply: '답글' };
    return `<div class="seg act-seg" role="tablist">${seg.map(s => `<button type="button" role="tab" data-action="act-filter" data-k="${s[0]}"${s[0] === ACT ? ' class="on" aria-selected="true"' : ''}>${s[1]} ${s[2]}</button>`).join('')}</div>` +
      (list.length ? `<ul class="my-list act-list">${list.map(i => `<li><div class="act-main"><span class="act-k k-${i.kind}">${KL[i.kind]}</span><span class="my-b">${esc((BOARDS[i.board] || {}).title || i.board)}</span>
        <a href="${i.href}">${esc(i.title)}</a>${i.text ? `<p class="act-t">${esc(i.text).replace(/\n/g, '<br>')}</p>` : ''}<span class="my-d">${dotDate(i.at)}${i.p && i.p.anon ? ' · 익명' : ''}</span></div>
        ${i.p ? `<div class="my-act"><a class="btn sm line" href="write.html?b=${i.board}&edit=${i.p.id}">수정</a><button type="button" class="btn sm line" data-action="post-del" data-id="${i.p.id}" data-board="${i.board}" data-back="mypage.html#activity">삭제</button></div>` : ''}</li>`).join('')}</ul>`
        : `<p class="empty">${ACT === 'all' ? '아직 쓴 글이나 댓글이 없습니다.' : '아직 없습니다.'}<br><a class="btn sm" style="margin-top:16px" href="write.html?b=freeboard">자유게시판에 글쓰기</a></p>`);
  }
  Actions['act-filter'] = el => { ACT = el.dataset.k; drawMy(); };

  /* ---------- 계정 설정: 정보 수정 + 비밀번호 변경 ---------- */
  function panelAccount(u) {
    const p = u.pending || {}, val = k => (k in p ? p[k] : u[k]);
    const need = '<span class="need-ok"><span class="ms">verified_user</span>변경 시 교회 승인 필요</span>';
    const wait = k => k in p ? `<p class="fld-w"><span class="ms">hourglass_top</span>승인 대기 중 · 지금 표시되는 정보: ${esc(u[k] || '(없음)')}</p>` : '';
    return `<h3 class="mp-h">계정 설정</h3>${pendBox(u)}<form class="mb-form wide" data-action="profile-save" novalidate>
        <div class="mp-photo">${avatar(u)}<div><p class="fld-l">프로필 사진 <i class="opt">바로 반영</i></p>
          <button type="button" class="btn sm line" data-action="photo-pick"><span class="ms">photo_camera</span>사진 변경</button>
          ${u.photo ? '<button type="button" class="btn sm line" data-action="photo-clear">삭제</button>' : ''}
          <input type="file" accept="image/*" hidden data-action="photo-file"></div></div>
        ${field('자기소개 <i class="opt">바로 반영</i>', `<textarea name="bio" rows="3" maxlength="200" placeholder="간단히 자신을 소개해 주세요 (200자)">${esc(u.bio)}</textarea>`, 'bio')}
        <div class="fld-grid">
        <div>${field('이름 ' + need, `<input name="name" maxlength="20" value="${esc(val('name'))}">`, 'name')}${wait('name')}</div>
        <div>${field('직분 ' + need, `<select name="rank">${rankOpts(val('rank'))}</select>`, 'rank')}${wait('rank')}</div>
        <div>${field('생년월일 ' + need, birthHtml(val('birth')), 'birth', null, true)}${wait('birth')}</div>
        <div>${field('연락처 ' + need, `<input name="phone" type="tel" inputmode="tel" value="${esc(val('phone'))}" placeholder="010-0000-0000" data-oninput="phone-fmt">`, 'phone')}${wait('phone')}</div></div>
        ${affBlock((u.groups || []).map(g => ({ id: g.id, role: g.role })), u.groups)}
        ${field('교구 <i class="opt">(선택)</i>', `<select name="parish">${parishOpts(u.parish && u.parish.id)}</select>`, 'parish', '바꾸면 교구장님의 승인이 다시 필요합니다.')}
        <p class="field-err" data-err="form" role="alert"></p>
        <div class="btn-row end"><button type="button" class="btn line" data-action="mp-tab" data-tab="info">취소</button><button class="btn" type="submit">저장</button></div></form>
      <h3 class="mp-h mp-h2">비밀번호 변경</h3><form class="mb-form wide" data-action="pw-change" novalidate>
        ${field('현재 비밀번호', pwf('cur', 'current-password'), 'cur')}
        ${field('새 비밀번호', pwf('next', 'new-password', true), 'next', '4자 이상 쓰시면 됩니다')}
        ${field('새 비밀번호 확인', pwf('next2', 'new-password'), 'next2')}
        <p class="field-err" data-err="form" role="alert"></p><div class="btn-row end"><button class="btn" type="submit">비밀번호 변경</button></div></form>`;
  }

  /* ---------- 설정: 공개 범위 · 알림 · 화면 · 탈퇴 ---------- */
  function panelSettings(u) {
    const subs = [['privacy', '공개 범위'], ['notif', '알림'], ['view', '화면·기타'], ['leave', '탈퇴']];
    const seg = `<div class="seg set-seg" role="tablist">${subs.map(s => `<button type="button" role="tab" data-action="set-sub" data-k="${s[0]}"${s[0] === SUB ? ' class="on" aria-selected="true"' : ''}>${s[1]}</button>`).join('')}</div>`;
    let h = '';
    if (SUB === 'privacy') {
      const pv = Store.privOf(u);
      h = `<p class="set-lead">내 정보를 누구에게 보여 줄지 정해요. 이름과 사진은 글을 쓸 때 항상 보입니다.</p><ul class="set-list">${Store.PRIV_FIELDS.map(([k, l]) => `<li><label for="pv-${k}">${l}</label>
          <select id="pv-${k}" data-action="priv-set" data-key="${k}">${Object.keys(Store.PRIV_LABEL).map(v => `<option value="${v}"${pv[k] === v ? ' selected' : ''}>${Store.PRIV_LABEL[v]}</option>`).join('')}</select></li>`).join('')}</ul>
        <p class="fld-h" style="margin-top:14px">“전체 공개”는 로그인하지 않은 분도 볼 수 있습니다. <a class="mp-prof" href="profile.html?u=${u.id}">내 프로필 미리 보기<span class="ms">chevron_right</span></a></p>`;
    } else if (SUB === 'notif') {
      const pf = Store.notifPrefs ? Store.notifPrefs() : {}, hist = Store.myNotifs ? Store.myNotifs() : [];
      h = `<p class="set-lead">받고 싶은 알림만 켜 두세요. 종류별로 끄고 켤 수 있습니다.</p><ul class="set-list sw-list">${(Store.NOTIF_TYPES || []).map(t => `<li><div><b>${t.label}</b><p>${t.desc}</p></div>
          <label class="switch"><input type="checkbox" role="switch" data-action="notif-pref" data-type="${t.id}"${pf[t.id] !== false ? ' checked' : ''} aria-label="${t.label} 알림"><span class="sw"></span></label></li>`).join('')}</ul>
        <h4 class="set-h">알림 기록 <span class="muted">(알림함에서 지워져도 여기에 남습니다)</span></h4>
        ${hist.length ? `<ul class="nh-list">${hist.slice(0, 80).map(n => `<li class="${n.read ? '' : 'unread'}"><a href="${esc(n.link || '#')}" data-action="nh-go" data-id="${n.id}"><span class="nh-t">${esc(n.text)}</span><span class="nh-d">${dotTime(n.at)}${n.read ? '' : ' · 안 읽음'}</span></a></li>`).join('')}</ul>` : '<p class="empty" style="padding:36px 0">아직 받은 알림이 없습니다.</p>'}`;
    } else if (SUB === 'view') {
      h = `<ul class="set-list sw-list"><li><div><b>글자 크게 보기</b><p>홈페이지의 글자와 버튼을 조금 더 크게 보여 드려요.</p></div><label class="switch"><input type="checkbox" role="switch" data-action="big-text"${Store.prefs().bigText ? ' checked' : ''} aria-label="글자 크게 보기"><span class="sw"></span></label></li></ul>
        <div class="acct"><div class="acct-row"><div><b>시험 데이터 전체 초기화</b><p>이 브라우저에 저장된 모든 시험 계정·글·댓글을 지웁니다.</p></div><button type="button" class="btn line" data-action="reset-all">전체 초기화</button></div>
        <p class="fld-h">저장 공간 사용: 약 ${Store.usageKB().toLocaleString()}KB / 5,000KB (브라우저마다 다릅니다)</p></div>`;
    } else {
      h = `<div class="leave"><p class="set-lead">탈퇴하면 로그인 정보와 내 정보가 삭제되고 되돌릴 수 없습니다.</p>
        <label class="chk"><input type="checkbox" id="leave-del"><span><b>내 글·댓글도 모두 지우기</b><i>체크하지 않으면 쓴 글과 댓글은 그대로 남습니다. (작성자 이름만 남아요)</i></span></label>
        <button type="button" class="btn danger" data-action="withdraw">탈퇴하기</button></div>`;
    }
    return `<h3 class="mp-h">설정</h3>${seg}<div class="set-body">${h}</div>`;
  }
  Actions['set-sub'] = el => { SUB = el.dataset.k; history.replaceState(null, '', '#settings/' + SUB); drawMy(); };
  Actions['priv-set'] = el => { Store.setPrivacy(el.dataset.key, el.value); toast('공개 범위를 바꿨습니다'); };
  Actions['notif-pref'] = el => { Store.setNotifPref(el.dataset.type, el.checked); toast(el.checked ? '이 알림을 켰습니다' : '이 알림을 껐습니다'); };
  Actions['nh-go'] = el => { if (Store.readNotif) Store.readNotif(el.dataset.id); };
  const applyPrefs = () => document.documentElement.classList.toggle('big-text', !!Store.prefs().bigText);
  Actions['big-text'] = el => { Store.setPref('bigText', el.checked); applyPrefs(); toast(el.checked ? '글자를 크게 보여 드립니다' : '글자 크기를 원래대로 했습니다'); };
  applyPrefs();

  /* ---------- 승인 관리 (관리자 모드 · 부서 대표·교구장) ---------- */
  function panelApprove() {
    const admin = Store.isAdmin(), q = Store.affilQueue(), btn = (a, id, extra) => `<div class="my-act"><button type="button" class="btn sm" data-action="${a}-ok" ${extra || ''} data-id="${id}">승인</button><button type="button" class="btn sm line" data-action="${a}-no" ${extra || ''} data-id="${id}">거절</button></div>`;
    const sec = (t, n, body, hint) => `<section class="ap-sec"><h4 class="set-h">${t} <b>${n}</b></h4>${hint ? `<p class="fld-h" style="margin:-4px 0 8px">${hint}</p>` : ''}${body}</section>`;
    const none = t => `<p class="ap-none">${t}</p>`;
    let h = '';
    if (admin) {
      const S = Store.signupList(), P = Store.pendingList();
      h += sec('가입 승인', S.length, S.length ? `<ul class="my-list">${S.map(x => `<li><div><b>${esc(x.name)}</b> (${esc(x.username)})<span class="my-d">${esc(x.rank)} · ${dotDate(x.createdAt)} 신청</span></div>${btn('signup', x.id)}</li>`).join('')}</ul>` : none('승인을 기다리는 가입이 없습니다.'), '홈페이지 가입은 전체 관리자가 승인합니다.');
      h += sec('정보 변경 승인', P.length, P.length ? `<ul class="my-list">${P.map(x => `<li><div><b>${esc(x.before.name)}</b> (${esc(x.username)})<ul class="pend-rows">${Store.SENS.filter(k => k in x.pending).map(k => `<li>${Store.SENS_LABEL[k]}: ${esc(x.before[k] || '(없음)')} → <b>${esc(x.pending[k] || '(없음)')}</b></li>`).join('')}</ul></div>
          <div class="my-act"><button type="button" class="btn sm" data-action="approve" data-id="${x.id}">승인</button><button type="button" class="btn sm line" data-action="reject" data-id="${x.id}">반려</button></div></li>`).join('')}</ul>` : none('승인을 기다리는 변경이 없습니다.'));
    }
    h += sec('소속·교구 승인', q.length, q.length ? `<ul class="my-list">${q.map(x => `<li><div><b>${esc(x.name)}</b>님 · ${x.kind === 'group' ? '소속' : '교구'} <span class="chip">${esc(x.label)}</span></div>${btn('affil', x.uid, `data-kind="${x.kind}" data-gid="${x.id}" data-role="${x.role || ''}"`)}</li>`).join('')}</ul>` : none('승인을 기다리는 신청이 없습니다.'),
      admin ? '관리자 모드에서는 모든 신청이 보입니다. 부서 대표가 정해진 곳은 대표님이 승인합니다.' : '내가 대표(교구장)인 부서·교구의 신청만 보입니다.');
    if (admin) {
      h += sec('부서 대표 · 교구장 지정', '', leaderEditor(), '대표로 지정된 회원은 마이페이지 “승인 관리”에서 그 부서의 신청을 승인·거절합니다.');
      const R = Store.reports ? Store.reports() : [], KL = { post: '글', comment: '댓글', image: '사진' };
      h += sec('신고 목록', R.filter(r => !r.done).length, R.length ? `<ul class="my-list rp-list">${R.map(r => `<li class="${r.done ? 'done' : ''}"><div><span class="act-k k-rp">${KL[r.kind] || r.kind}</span><b>${esc(r.reason || '사유 없음')}</b>${r.label ? ' · ' + esc(r.label) : ''}${r.text ? `<p class="act-t">${esc(r.text)}</p>` : ''}
          <span class="my-d">${esc(r.byName || '')} · ${dotTime(r.at)}${r.done ? ' · 처리됨' : ''}${r.link ? ` · <a class="plain" href="${esc(r.link)}">신고된 곳 보기</a>` : ''}</span></div>
          <div class="my-act">${r.done ? '' : `<button type="button" class="btn sm" data-action="rp-done" data-id="${r.id}">처리 완료</button>`}<button type="button" class="btn sm line" data-action="rp-del" data-id="${r.id}">지우기</button></div></li>`).join('')}</ul>` : none('들어온 신고가 없습니다.'));
    }
    return h || '<p class="empty">승인할 내용이 없습니다.</p>';
  }
  function leaderEditor() {
    const M = Store.allMembers(), nm = id => (M.find(m => m.id === id) || { name: '(탈퇴)' }).name;
    const opts = '<option value="">회원 고르기…</option>' + M.map(m => `<option value="${m.id}">${esc(m.name)} (${esc(m.username)})</option>`).join('');
    const row = (kind, id, label) => `<li><b>${label}</b><span class="ld-names">${Store.leaderIds(kind, id).map(x => `<span class="chip">${esc(nm(x))}<button type="button" data-action="leader-del" data-kind="${kind}" data-gid="${id}" data-uid="${x}" aria-label="${esc(nm(x))} 지정 해제">×</button></span>`).join('') || '<span class="muted">미지정</span>'}</span>
      <select data-action="leader-add" data-kind="${kind}" data-gid="${id}" aria-label="${label} 대표 추가">${opts}</select></li>`;
    if (!M.length) return '<p class="ap-none">회원이 없습니다.</p>';
    return `<details class="ld"><summary>소속 부서 대표 (${Object.keys(Store.GROUP_NAMES).length}곳)</summary><ul class="ld-list">${Object.keys(Store.GROUP_NAMES).map(g => row('group', g, Store.GROUP_NAMES[g])).join('')}</ul></details>
      <details class="ld"><summary>교구장 (${Store.PARISHES.length}곳)</summary><ul class="ld-list">${Store.PARISHES.map(p => row('parish', p.id, p.name)).join('')}</ul></details>`;
  }
  const reload = msg => { toastLater(msg); location.reload(); };
  Actions['signup-ok'] = el => { Store.resolveSignup(el.dataset.id, true); reload('가입을 승인했습니다'); };
  Actions['signup-no'] = el => { Store.resolveSignup(el.dataset.id, false); reload('가입을 거절했습니다'); };
  Actions['affil-ok'] = el => { Store.resolveAffil(el.dataset.id, el.dataset.kind, el.dataset.gid, el.dataset.role || 'member', true); reload('승인했습니다'); };
  Actions['affil-no'] = el => { Store.resolveAffil(el.dataset.id, el.dataset.kind, el.dataset.gid, el.dataset.role || 'member', false); reload('거절했습니다'); };
  Actions['leader-add'] = el => { if (!el.value) return; Store.setLeader(el.dataset.kind, el.dataset.gid, el.value, true); const o = document.querySelectorAll('.ld[open]'), n = [...o].map(x => x.querySelector('summary').textContent); drawMy(); document.querySelectorAll('.ld').forEach(d => { if (n.includes(d.querySelector('summary').textContent)) d.open = true; }); toast('대표로 지정했습니다'); };
  Actions['leader-del'] = el => { Store.setLeader(el.dataset.kind, el.dataset.gid, el.dataset.uid, false); const n = [...document.querySelectorAll('.ld[open]')].map(x => x.querySelector('summary').textContent); drawMy(); document.querySelectorAll('.ld').forEach(d => { if (n.includes(d.querySelector('summary').textContent)) d.open = true; }); toast('지정을 해제했습니다'); };
  Actions['rp-done'] = el => { Store.resolveReport(el.dataset.id); drawMy(); toast('처리했습니다'); };
  Actions['rp-del'] = el => { Store.deleteReport(el.dataset.id); drawMy(); toast('지웠습니다'); };

  Actions['admin-toggle'] = el => { Store.setAdmin(el.checked); toastLater(el.checked ? '관리자 모드를 켰습니다' : '관리자 모드를 껐습니다'); location.reload(); };
  Actions.approve = el => { Store.resolvePending(el.dataset.id, true); reload('승인했습니다'); };
  Actions.reject = el => { Store.resolvePending(el.dataset.id, false); reload('반려했습니다'); };
  Actions['pending-cancel'] = () => { Store.cancelPending(); reload('변경 요청을 취소했습니다'); };
  Actions['photo-pick'] = el => el.closest('form').querySelector('[data-action="photo-file"]').click();
  Actions['photo-file'] = async el => {
    const f = el.files[0]; if (!f) return;
    try { const photo = await Store.resizeImage(f, 320, { square: true, quality: 0.85 }); const r = Store.updateProfile({ photo }); if (!r.ok) return Modal.alert(esc(r.error)); toastLater('프로필 사진을 바꿨습니다'); location.reload(); }
    catch (e) { toast(e.message, 'error'); }
  };
  Actions['photo-clear'] = () => { Store.updateProfile({ photo: '' }); toastLater('사진을 삭제했습니다'); location.reload(); };

  Actions['profile-save'] = async form => {
    clearErr(form);
    const u = Store.me(), v = k => form[k].value.trim();
    if (v('name').length < 2) return setErr(form, 'name', '이름을 2자 이상 입력해 주세요.');
    const birth = readBirth(form); if (!birth) return setErr(form, 'birth', BIRTH_ERR);
    if (v('phone') && !/^01\d[-\s]?\d{3,4}[-\s]?\d{4}$/.test(v('phone'))) return setErr(form, 'phone', '휴대폰 번호 형식이 맞지 않습니다. (예: 010-0000-0000)');
    const eff = k => (u.pending && k in u.pending ? u.pending[k] : u[k]);
    const sens = { name: v('name'), rank: form.rank.value, birth, phone: v('phone') };
    const changed = Store.SENS.filter(k => sens[k] !== (eff(k) || ''));
    const groups = affGet(form), parish = form.parish.value;
    const key = a => a.map(g => g.id + ':' + (g.role || 'member')).sort().join(',');
    const affChanged = key(groups) !== key(u.groups || []) || parish !== ((u.parish && u.parish.id) || '');
    if (changed.length) {
      const ok = await Modal.confirm('이름·직분·생년월일·연락처를 바꾸면 <b>교회의 재승인</b>이 필요합니다.<br>승인 전까지는 지금 정보가 표시되고 “승인 대기 중”으로 보입니다.<br>(변경 항목: ' + changed.map(k => Store.SENS_LABEL[k]).join(', ') + ')<br><br>자기소개와 사진은 바로 반영됩니다. 수정할까요?', { title: '신상 정보 변경', ok: '변경 요청' });
      if (!ok) return;
    }
    const r = Store.updateProfile(Object.assign({ bio: form.bio.value.trim(), groups, parish }, sens));
    if (!r.ok) return Modal.alert(esc(r.error));
    toast(changed.length ? '변경을 요청했습니다 (승인 대기 중)' : affChanged ? '저장했습니다 (소속·교구는 대표님 승인 후 반영돼요)' : '저장했습니다');
    history.pushState(null, '', '#info'); route(); drawMy(); scrollTo({ top: 0 });
  };
  Actions['pw-change'] = async form => {
    clearErr(form);
    if (!form.cur.value) return setErr(form, 'cur', '현재 비밀번호를 입력해 주세요.');
    if (form.next.value.length < 4) return setErr(form, 'next', '4자 이상 입력해 주세요.');
    if (form.next.value !== form.next2.value) return setErr(form, 'next2', '새 비밀번호가 서로 다릅니다. 다시 확인해 주세요.');
    busy(form, true);
    try { const r = await Store.changePassword(form.cur.value, form.next.value); busy(form, false); if (!r.ok) return setErr(form, r.field || 'form', r.error); form.reset(); form.querySelectorAll('.pw-meter').forEach(m => { m.dataset.lv = 0; }); toast('비밀번호를 바꿨습니다'); }
    catch (e) { busy(form, false); setErr(form, 'form', e.message); }
  };
  Actions.withdraw = async () => {
    const del = !!($('#leave-del') || {}).checked;
    const msg = '탈퇴하면 로그인 정보와 내 정보가 삭제되고 되돌릴 수 없습니다.<br>' + (del ? '<b>내가 쓴 글과 댓글도 모두 삭제됩니다.</b>' : '내가 쓴 글과 댓글은 그대로 남습니다.') + '<br><br>정말 탈퇴할까요?';
    if (await Modal.confirm(msg, { title: '탈퇴 확인', ok: '탈퇴하기', cancel: '그만두기', danger: true })) { Store.withdraw({ deleteContent: del }); toastLater('탈퇴했습니다. 그동안 함께해 주셔서 감사합니다'); location.href = 'home.html'; }
  };
  Actions['reset-all'] = async () => { if (await Modal.confirm('이 브라우저에 저장된 모든 시험 계정·글·댓글을 지웁니다. 계속할까요?', { title: '전체 초기화', ok: '초기화', danger: true })) { Store.resetAll(); toastLater('시험 데이터를 모두 지웠습니다'); location.href = 'home.html'; } };
  Actions['post-del'] = async el => {
    if (!(await Modal.confirm('이 글을 삭제할까요? 댓글도 함께 삭제되며 되돌릴 수 없습니다.', { title: '글 삭제', ok: '삭제', danger: true }))) return;
    Store.deletePost(el.dataset.id); toastLater('글을 삭제했습니다'); location.href = el.dataset.back || ('board.html?b=' + el.dataset.board);
  };

  /* ================= 공개 프로필 (profile.html?u=회원id) ================= */
  function profile(C) {
    const id = Q.get('u'), p = id && Store.profileOf(id);
    document.title = (p ? p.name + '님' : '프로필') + ' | ' + CHURCH.name;
    if (!p) { C.innerHTML = '<div class="mb-card"><p class="empty" style="padding:48px 0"><span class="ms big">person_off</span><br>찾을 수 없는 회원입니다.</p><div class="btn-row center" style="margin-top:0"><a class="btn line" href="home.html">홈으로</a></div></div>'; return; }
    const F = p.fields, row = (l, v) => v ? `<div><dt>${l}</dt><dd>${v}</dd></div>` : '';
    const chips = a => (Array.isArray(a) ? a : [a]).map(t => `<span class="chip">${esc(t)}</span>`).join('');
    const posts = p.demo ? [] : Store.postsOfUser(p.id);
    const sub = [F.position, ...(Array.isArray(F.groups) ? F.groups : [])].filter(Boolean).join(' · ');
    C.innerHTML = `<div class="pf"><section class="pf-card"><span class="avatar-m pf-av">${p.avatar ? `<img src="${p.avatar}" alt="">` : '<span class="ms">person</span>'}</span>
        <div class="pf-id"><h2>${esc(p.name)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</div>
        ${p.self ? '<a class="btn sm line pf-edit" href="mypage.html#settings/privacy"><span class="ms">visibility</span>공개 범위 바꾸기</a>' : ''}
        ${F.bio ? `<p class="pf-bio">${esc(F.bio).replace(/\n/g, '<br>')}</p>` : ''}
        <dl class="info mp-dl pf-dl">${row('직분', 'position' in F ? esc(F.position) : '')}${row('소속', 'groups' in F ? chips(F.groups) : '')}${row('교구', 'parish' in F ? chips(F.parish) : '')}${row('생년월일', 'birth' in F ? fmtBirth(F.birth) : '')}${row('연락처', 'phone' in F ? esc(F.phone) : '')}</dl>
        ${p.self ? '<p class="fld-h pf-note"><span class="ms">info</span>내가 보는 화면이라 모든 정보가 보입니다. 다른 분에게는 공개 범위에 맞춰 보입니다.</p>' : (!Store.me() && p.needLogin) ? '<p class="fld-h pf-note"><span class="ms">lock</span>로그인하면 더 많은 정보를 볼 수 있어요.</p>' : ''}</section>
      <section class="pf-posts"><h3 class="mp-h">쓴 글 <b>${posts.length}</b></h3>${posts.length ? `<ul class="my-list">${posts.map(x => `<li><div><span class="my-b">${esc((BOARDS[x.board] || {}).title || x.board)}</span><a href="board-view.html?b=${x.board}&id=${x.id}">${esc(x.title)}</a><span class="my-d">${x.date}</span></div></li>`).join('')}</ul>` : '<p class="empty" style="padding:44px 0">아직 쓴 글이 없습니다.</p>'}</section></div>`;
  }
  /* profile.html 은 site.js 의 틀 목록에 없어도 열리도록, 필요하면 틀을 직접 만든다 */
  function mountProfile() {
    const sub = $('#sub'); if (!sub) return;
    if (!$('#content') || !$('.mb-wrap')) {
      document.querySelectorAll('.sv, .snb-m').forEach(n => n.remove());
      sub.insertAdjacentHTML('beforebegin', '<section class="sv" style="background-image:url(img/hero-interior.jpg)"><div class="wrap sv-in"><p class="sv-group">회원</p><h1 class="sv-title">프로필</h1></div></section>');
      sub.innerHTML = '<div class="wrap mb-wrap wide"><div id="content"></div></div>';
    }
    const C = $('#content'); if (!C.firstElementChild) profile(C);
  }

  /* ================= 글쓰기 편집기 ================= */
  function write(C, board, editId) {
    const B = BOARDS[board], rule = WRITE_RULE[board] || 'none', m = Store.me();
    const back = 'board.html?b=' + board;
    const stop = (icon, msg, extra) => { C.innerHTML = `<div class="mb-card"><p class="empty" style="padding:40px 0"><span class="ms big">${icon}</span><br>${msg}</p>${extra || ''}<div class="btn-row center" style="margin-top:8px"><a class="btn line" href="${back}">목록으로</a></div></div>`; };
    if (!B || rule === 'none') return stop('block', '이 게시판에는 글쓰기가 없습니다.');
    if (rule === 'admin' && !Store.isAdmin()) return stop('lock', '이 게시판은 교회에서만 글을 올릴 수 있습니다.', '<p class="fld-h" style="text-align:center">시험 중에는 마이페이지에서 “시험용 관리자 모드”를 켜면 쓸 수 있습니다.</p><div class="btn-row center" style="margin-top:12px"><a class="btn" href="mypage.html">마이페이지로</a></div>');
    let post = null;
    if (editId) { post = Store.getPost(editId); if (!post || !(Store.isMine(post.owner) || Store.isAdmin())) return stop('search_off', '수정할 수 있는 글이 아닙니다.'); }
    const who = m ? esc(m.name) : '게스트';
    C.innerHTML = `<form class="wr" data-action="post-save" data-board="${board}" data-edit="${post ? post.id : ''}" novalidate>
      <p class="wr-as"><span class="ms">edit_note</span>${B.title} · 작성자 <b>${who}</b>${m ? '' : ' <i class="opt">(로그인하지 않아 게스트로 표시됩니다)</i>'}</p>
      <input class="wr-title" name="title" maxlength="100" placeholder="제목을 입력하세요" value="${post ? esc(post.title) : ''}" aria-label="제목">
      ${B.anon ? `<div class="wr-anon" role="radiogroup" aria-label="작성자 표시"><span>작성자 표시</span><label><input type="radio" name="nm" value="real"${post && post.anon ? '' : ' checked'}> 이름 공개 (${who})</label><label><input type="radio" name="nm" value="anon"${post && post.anon ? ' checked' : ''}> 익명</label></div>` : ''}
      <div class="ed-wrap">
        <div class="ed-tb" role="toolbar" aria-label="글 꾸미기">
          <span class="tb-g"><button type="button" class="tb-img" data-action="img-pick" aria-label="사진 넣기" title="사진 넣기"><span class="ms">add_photo_alternate</span><span class="lbl">사진</span></button><input type="file" accept="image/*" multiple hidden data-action="img-file"></span>
          <span class="tb-g"><button type="button" data-action="fmt" data-cmd="bold" aria-label="굵게" title="굵게"><span class="ms">format_bold</span></button>
          <button type="button" data-action="fmt" data-cmd="italic" aria-label="기울임" title="기울임"><span class="ms">format_italic</span></button>
          <button type="button" data-action="fmt" data-cmd="underline" aria-label="밑줄" title="밑줄"><span class="ms">format_underlined</span></button>
          <button type="button" data-action="fmt" data-cmd="strikeThrough" aria-label="취소선" title="취소선"><span class="ms">strikethrough_s</span></button></span>
          <span class="tb-g" aria-label="글자 크기"><button type="button" class="sz s" data-action="fmt-size" data-size="s" aria-label="글자 작게" title="작게">가</button><button type="button" class="sz n" data-action="fmt-size" data-size="n" aria-label="글자 보통" title="보통">가</button><button type="button" class="sz l" data-action="fmt-size" data-size="l" aria-label="글자 크게" title="크게">가</button><button type="button" class="sz xl" data-action="fmt-size" data-size="xl" aria-label="글자 아주 크게" title="아주 크게">가</button></span>
          <span class="tb-g" aria-label="글자 색">${[['ink', '기본'], ['red', '빨강'], ['orange', '주황'], ['green', '초록'], ['blue', '파랑'], ['gray', '회색']].map(c => `<button type="button" class="sw-c c-${c[0]}" data-action="fmt-color" data-color="${c[0]}" aria-label="글자색 ${c[1]}" title="${c[1]}"><i></i></button>`).join('')}</span>
        </div>
        <div class="ed" id="ed" contenteditable="true" role="textbox" aria-multiline="true" aria-label="본문" data-placeholder="내용을 입력하세요. 사진은 한 줄에 한 장씩 크게 들어갑니다."></div>
      </div>
      <p class="wr-hint"><span class="ms">info</span>사진은 긴 변 1200px 정도로 줄여 저장됩니다. 붙여넣으면 글자 모양은 지워지고 글자만 들어갑니다. <span data-usage></span></p>
      <p class="field-err" data-err="form" role="alert"></p>
      <div class="btn-row end"><a class="btn line" href="${post ? 'board-view.html?b=' + board + '&id=' + post.id : back}">취소</a><button class="btn" type="submit">${post ? '수정 완료' : '등록'}</button></div></form>`;
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
    const admin = Store.isAdmin();
    const item = (c, reply) => {
      const w = UI.who(c.authorId), nm = esc(c.name);
      const av = w.href ? `<a class="cmt-av" href="${w.href}" aria-label="${nm} 프로필 보기">${UI.avatar(w.card, c.name)}</a>` : `<span class="cmt-av">${UI.avatar(null, c.name)}</span>`;
      const nmH = w.href ? `<a class="cmt-nm" href="${w.href}">${nm}</a>` : `<b class="cmt-nm">${nm}</b>`;
      return `<div class="cmt-it${reply ? ' reply' : ''}" id="c-${c.id}" data-cid="${c.id}">${av}<div class="cmt-bd">
        <div class="cmt-top">${nmH}${c.mine ? '<em class="me">내 댓글</em>' : ''}<time title="${c.at ? UI.abs(c.at) : c.date}">${c.at ? UI.rel(c.at) : c.date}</time>
          <button type="button" class="cmt-more" data-action="cmt-more" data-id="${c.id}" data-del="${(c.mine || admin) && !c.fake ? 1 : ''}" aria-label="댓글 메뉴" aria-haspopup="menu" aria-expanded="false"><span class="ms">more_vert</span></button></div>
        <p class="cmt-text">${esc(c.text).replace(/\n/g, '<br>')}</p>
        <button type="button" class="cmt-re-btn" data-action="cmt-reply" data-id="${c.id}"><span class="ms">subdirectory_arrow_right</span>답글</button></div></div>`;
    };
    const tops = list.filter(c => !c.parent), kids = id => list.filter(c => c.parent === id);
    root.innerHTML = `<section class="cmt-box" aria-label="댓글"><h3 class="cmt-h">댓글 <b>${list.length}</b></h3>
      ${list.length ? `<ul class="cmt-list">${tops.map(c => `<li class="cmt-th" data-th="${c.id}">${item(c)}${kids(c.id).length ? `<div class="cmt-rs">${kids(c.id).map(r => item(r, true)).join('')}</div>` : ''}</li>`).join('')}</ul>` : '<p class="cmt-none">첫 댓글을 남겨 보세요.</p>'}
      ${cmtForm(m, anonOk, '')}</section>`;
    root.querySelectorAll('textarea').forEach(t => t.addEventListener('input', () => { t.closest('form').querySelector('.cnt-t').textContent = t.value.length + ' / 500'; }));
    const h = location.hash; if (/^#c-/.test(h)) { const t = document.getElementById(h.slice(1)); if (t) { t.classList.add('flash'); t.scrollIntoView({ block: 'center' }); } }
  }
  function cmtForm(m, anonOk, parent) {
    return `<form class="cmt-form${parent ? ' reply' : ''}" data-action="cmt-add"${parent ? ` data-parent="${parent}"` : ''} novalidate>
        <p class="cmt-as"><span class="ms">person</span>${m ? esc(m.name) + '(으)로 작성' : '로그인하지 않아 “게스트”로 작성됩니다'}</p>
        ${anonOk ? `<div class="wr-anon"><label><input type="radio" name="nm" value="real" checked> 이름 공개</label><label><input type="radio" name="nm" value="anon"> 익명</label></div>` : ''}
        <textarea name="text" rows="${parent ? 2 : 3}" maxlength="500" placeholder="${parent ? '답글을 입력하세요' : '댓글을 입력하세요'}" aria-label="${parent ? '답글' : '댓글'}"></textarea>
        <p class="field-err" data-err="text" role="alert"></p>
        <div class="cmt-act"><span class="cnt-t">0 / 500</span><span class="cmt-btns">${parent ? '<button type="button" class="btn line" data-action="cmt-reply-cancel">취소</button>' : ''}<button class="btn" type="submit">${parent ? '답글 등록' : '댓글 등록'}</button></span></div></form>`;
  }
  Actions['cmt-add'] = form => {
    const root = form.closest('[data-cmt-root]'), text = form.text.value.trim();
    const reply = !!form.dataset.parent;
    if (!text) return setErr(form, 'text', (reply ? '답글' : '댓글') + ' 내용을 입력해 주세요.');
    const ok = Store.addComment({ board: root.dataset.board, postId: root.dataset.post, text, parent: form.dataset.parent || null, anon: !!form.querySelector('[name="nm"][value="anon"]:checked') });
    if (!ok) return Modal.alert(QUOTA_MSG, { title: '저장 공간 부족' });
    history.replaceState(null, '', location.pathname + location.search);
    comments(root, root.dataset.board, root.dataset.post); toast(reply ? '답글을 남겼습니다' : '댓글을 남겼습니다');
  };
  /* "답글"을 누르면 그 댓글 바로 아래에 입력창이 열린다 (답글의 답글도 같은 줄기에 붙는다) */
  Actions['cmt-reply'] = el => {
    const root = el.closest('[data-cmt-root]'), it = el.closest('.cmt-it'), was = root.querySelector('.cmt-form.reply');
    if (was) { const same = was.previousElementSibling === it; was.remove(); if (same) return; }
    const m = Store.me(), anonOk = BOARDS[root.dataset.board] && BOARDS[root.dataset.board].anon;
    it.insertAdjacentHTML('afterend', cmtForm(m, anonOk, el.dataset.id));
    const f = it.nextElementSibling, ta = f.querySelector('textarea'); ta.addEventListener('input', () => { f.querySelector('.cnt-t').textContent = ta.value.length + ' / 500'; });
    ta.focus({ preventScroll: true }); f.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };
  Actions['cmt-reply-cancel'] = el => el.closest('.cmt-form').remove();
  Actions['cmt-more'] = el => {
    const root = el.closest('[data-cmt-root]'), id = el.dataset.id;
    UI.menu(el, [
      el.dataset.del && { label: '삭제', icon: 'delete', danger: true, onClick: () => Actions['cmt-del'](el) },
      !el.closest('.cmt-it').querySelector('.me') && { label: '신고하기', icon: 'flag', danger: true, onClick: () => UI.report({ kind: 'comment', id: root.dataset.board + ':' + root.dataset.post + ':' + id, label: (el.closest('.cmt-it').querySelector('.cmt-text').textContent || '').slice(0, 40), link: 'board-view.html?b=' + root.dataset.board + '&id=' + root.dataset.post + '#c-' + id }) }
    ]);
  };
  Actions['cmt-del'] = async el => {
    const root = el.closest('[data-cmt-root]'), hasKids = !!root.querySelector('[data-th="' + el.dataset.id + '"] .cmt-rs');
    if (!(await Modal.confirm(hasKids ? '이 댓글을 삭제할까요? 달린 답글도 함께 삭제됩니다.' : '이 댓글을 삭제할까요?', { title: '댓글 삭제', ok: '삭제', danger: true }))) return;
    Store.deleteComment(el.dataset.id); comments(root, root.dataset.board, root.dataset.post); toast('댓글을 삭제했습니다');
  };


  window.Member = { login, join, mypage, profile, mountProfile, write, comments, trial };
})();
