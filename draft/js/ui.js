/* ============================================================
   공통 UI 도구: 알림(toast) · 확인창(Modal) · 사진 크게 보기 · 버튼 동작 연결
   - 버튼·폼의 동작은 class가 아니라 data-action="이름" 으로 연결합니다.
     (스타일을 바꿔도 동작이 깨지지 않게 하기 위함 — 기능-목록.md 참고)
   - 동작 등록: Actions['이름'] = (요소, 이벤트) => { ... }
   ============================================================ */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const Actions = window.Actions = {};

  // 아이콘 글꼴을 받기 전에도 메뉴 이름이 길게 새거나 빈 버튼이 생기지 않게 한다.
  if (document.fonts) {
    const root = document.documentElement;
    root.classList.add('text-icons');
    document.fonts.load('24px "Material Symbols Rounded"').then(faces => {
      if (faces.length) root.classList.remove('text-icons');
    }).catch(() => {});
  }

  /* ---------- 알림 ---------- */
  window.toast = (msg, icon) => {
    document.querySelector('.toast')?.remove();
    const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status');
    t.dataset.icon = icon || 'check_circle'; t.innerHTML = '<span class="ms">' + (icon || 'check_circle') + '</span><span></span>'; t.lastChild.textContent = msg;
    document.body.append(t); requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2400);
  };
  /* "준비 중" 안내는 이 하나로 통일 */
  window.soon = () => toast('준비 중입니다. 정식 사이트에서 연결됩니다.', 'construction');
  Actions.soon = (el, e) => { e && e.preventDefault(); soon(); };
  /* 다음 화면에서 보여줄 알림 */
  window.toastLater = msg => { try { sessionStorage.setItem('pdh_flash', msg); } catch (e) {} };
  try { const f = sessionStorage.getItem('pdh_flash'); if (f) { sessionStorage.removeItem('pdh_flash'); setTimeout(() => toast(f), 250); } } catch (e) {}

  /* ---------- 확인창 ---------- */
  const escH = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const Modal = window.Modal = {
    open({ title, body, actions }) {
      return new Promise(resolve => {
        const prev = document.activeElement;
        const m = document.createElement('div'); m.className = 'modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
        m.innerHTML = '<div class="modal-box">' + (title ? '<h3 class="modal-t">' + escH(title) + '</h3>' : '') + '<div class="modal-body">' + body + '</div><div class="modal-act">' +
          actions.map((a, i) => '<button type="button" class="btn ' + (a.kind || '') + '" data-modal="' + i + '">' + escH(a.label) + '</button>').join('') + '</div></div>';
        const done = v => { document.removeEventListener('keydown', key); m.remove(); document.body.classList.remove('lock'); prev && prev.focus && prev.focus(); resolve(v); };
        const key = e => { if (e.key === 'Escape') done(null); };
        m.addEventListener('click', e => { const b = e.target.closest('[data-modal]'); if (b) done(actions[+b.dataset.modal].value); else if (e.target === m) done(null); });
        document.addEventListener('keydown', key); document.body.append(m); document.body.classList.add('lock');
        const f = m.querySelector('[data-modal]:last-child'); f && f.focus();
      });
    },
    /* 확인/취소 → true/false */
    async confirm(msg, o = {}) {
      const r = await Modal.open({ title: o.title, body: '<p>' + msg + '</p>', actions: [{ label: o.cancel || '취소', value: false, kind: 'line' }, { label: o.ok || '확인', value: true, kind: o.danger ? 'danger' : '' }] });
      return r === true;
    },
    alert(msg, o = {}) { return Modal.open({ title: o.title, body: msg, actions: [{ label: '확인', value: true }] }); }
  };

  /* ===== v3-B: UI 도구 — 점 세 개 메뉴 · 작성자 사진 · 상대 시간 · 신고 ===== */
  const UI = window.UI = window.UI || {};
  const mk = (tag, cls) => { const e = document.createElement(tag); e.className = cls; return e; };
  let menuClose = null;
  /* ⋮ · ⋯ 팝업 메뉴. items: [{label, icon, danger, onClick}] (PC는 버튼 옆 팝업, 휴대폰은 아래에서 올라오는 목록) */
  UI.menu = (anchor, items) => {
    if (menuClose) menuClose();
    items = (items || []).filter(Boolean);
    const bg = mk('div', 'menu-bg'), pop = mk('div', 'menu-pop'); pop.setAttribute('role', 'menu');
    pop.innerHTML = items.map((it, i) => it.sep ? '<hr>' : '<button type="button" role="menuitem" class="menu-it' + (it.danger ? ' danger' : '') + '" data-i="' + i + '">' + (it.icon ? '<span class="ms">' + it.icon + '</span>' : '') + '<span>' + escH(it.label) + '</span></button>').join('');
    const mobile = matchMedia('(max-width:720px)').matches;
    const close = () => { menuClose = null; document.removeEventListener('keydown', key, true); removeEventListener('resize', close); removeEventListener('scroll', onScroll, true); bg.remove(); anchor && anchor.setAttribute && anchor.setAttribute('aria-expanded', 'false'); anchor && anchor.focus && anchor.focus({ preventScroll: true }); };
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    const onScroll = e => { if (!pop.contains(e.target)) close(); };
    bg.addEventListener('click', e => {
      if (e.target === bg) return close();
      const b = e.target.closest('.menu-it'); if (!b) return;
      const it = items[+b.dataset.i]; close(); if (it && it.onClick) it.onClick();
    });
    bg.append(pop); document.body.append(bg); menuClose = close;
    if (anchor && anchor.setAttribute) anchor.setAttribute('aria-expanded', 'true');
    if (mobile) { bg.classList.add('mob'); requestAnimationFrame(() => bg.classList.add('open')); }
    else {
      const r = anchor.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
      let left = Math.min(Math.max(8, r.right - w), innerWidth - w - 8), top = r.bottom + 6;
      if (top + h > innerHeight - 8 && r.top - h - 6 > 8) top = r.top - h - 6;
      pop.style.left = left + 'px'; pop.style.top = Math.max(8, Math.min(top, innerHeight - h - 8)) + 'px';
      addEventListener('scroll', onScroll, true);
    }
    document.addEventListener('keydown', key, true);
    addEventListener('resize', close);
    const f = pop.querySelector('.menu-it'); f && f.focus({ preventScroll: true });
    return close;
  };
  /* 작성자 사진: 사진이 있으면 사진, 이름만 있으면 머리글자 원, 익명·게스트는 기본 사진 */
  UI.avatar = (card, name, cls) => {
    const c = cls ? ' ' + cls : '';
    if (card && card.avatar) return '<span class="av' + c + '"><img src="' + escH(card.avatar) + '" alt=""></span>';
    const n = (card && card.name) || '';
    if (!n || n === '익명' || n === '게스트') return '<span class="av none' + c + '"><span class="ms">person</span></span>';
    return '<span class="av ini' + c + '">' + escH([...n][0]) + '</span>';
  };
  UI.profileHref = id => 'profile.html?u=' + encodeURIComponent(id);
  /* id가 있으면 {card, href}, 익명·게스트는 {card:null, href:''} */
  UI.who = id => { const card = id && window.Store && Store.userCard ? Store.userCard(id) : null; return { card, href: card ? UI.profileHref(card.id) : '' }; };
  /* 댓글 상대 시간: 방금 → n분 → n시간 → n일(1~6) → n주(7일~한 달 전) → n개월(1~11) → n년 */
  UI.rel = (at, now) => {
    now = now || Date.now(); const s = Math.max(0, (now - at) / 1000);
    if (s < 60) return '방금';
    if (s < 3600) return Math.floor(s / 60) + '분 전';
    if (s < 86400) return Math.floor(s / 3600) + '시간 전';
    const days = Math.floor(s / 86400); if (days < 7) return days + '일 전';
    const a = new Date(at), b = new Date(now);
    let mo = (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth();
    const ann = new Date(a); ann.setMonth(a.getMonth() + mo); if (ann > b) mo--;   // 달력상 한 달이 지났는지
    if (mo < 1) return Math.floor(days / 7) + '주 전';
    return mo < 12 ? mo + '개월 전' : Math.floor(mo / 12) + '년 전';
  };
  UI.abs = at => { const d = new Date(at), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); };
  /* 신고하기: 사유 고르기 → Store.report. o = {kind:'post'|'comment'|'image', id, label, link} */
  const REASONS = ['광고·홍보 글이에요', '욕설이나 다툼이 있어요', '개인 정보가 나와 있어요', '교회와 관계없는 내용이에요', '기타'];
  UI.report = o => {
    let reason = REASONS[0], text = '';
    const what = { post: '글', comment: '댓글', image: '사진' }[o.kind] || '내용';
    const p = Modal.open({ title: what + ' 신고하기', body: '<p class="rp-q">어떤 점이 불편하셨나요?</p><div class="rp-list" role="radiogroup">' + REASONS.map((r, i) => '<label class="rp-it"><input type="radio" name="rp" value="' + i + '"' + (i === 0 ? ' checked' : '') + '><span>' + escH(r) + '</span></label>').join('') + '</div><textarea class="rp-text" rows="3" maxlength="200" placeholder="자세한 내용을 적어 주세요 (선택)" aria-label="자세한 내용"></textarea><p class="rp-n">신고 내용은 관리자만 볼 수 있어요.</p>', actions: [{ label: '취소', value: false, kind: 'line' }, { label: '신고하기', value: true }] });
    const m = document.querySelector('.modal:last-of-type');
    if (m) { m.addEventListener('change', e => { if (e.target.name === 'rp') reason = REASONS[+e.target.value]; }); m.addEventListener('input', e => { if (e.target.classList.contains('rp-text')) text = e.target.value; }); }
    return p.then(ok => { if (ok !== true) return false; Store.report({ kind: o.kind, id: o.id, reason, text: text.trim(), link: o.link || (location.pathname.split('/').pop() + location.search), label: o.label || '' }); toast('신고해 주셔서 고맙습니다. 관리자가 확인할게요.', 'info'); return true; });
  };

  document.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const layers = document.querySelectorAll('.menu-pop,.np,.sheet,.modal-box,.lightbox');
    const layer = layers[layers.length - 1];
    if (!layer) return;
    const controls = [...layer.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled)')].filter(el => el.getClientRects().length);
    if (!controls.length) return;
    const first = controls[0], last = controls[controls.length - 1];
    if (!layer.contains(document.activeElement) || (e.shiftKey ? document.activeElement === first : document.activeElement === last)) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    }
  });

  /* ---------- 클릭·입력 연결 (data-action) ---------- */
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]'); if (!el || /^(INPUT|SELECT|TEXTAREA|FORM)$/.test(el.tagName)) return;
    const fn = Actions[el.dataset.action]; if (fn) { if (el.tagName === 'A' && el.getAttribute('href') === '#') e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('change', e => { const el = e.target.closest('[data-action]'); if (el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) && Actions[el.dataset.action]) Actions[el.dataset.action](el, e); });
  document.addEventListener('input', e => { const el = e.target.closest && e.target.closest('[data-oninput]'); if (el && Actions[el.dataset.oninput]) Actions[el.dataset.oninput](el, e); });
  document.addEventListener('submit', e => { const f = e.target.closest('form[data-action]'); if (f && Actions[f.dataset.action]) { e.preventDefault(); Actions[f.dataset.action](f, e); } });
  document.addEventListener('keydown', e => { const el = e.target.closest && e.target.closest('[role="button"][data-action],[role="button"][data-view]'); if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); el.click(); } });
  /* 주소 복사 (공유) */
  document.addEventListener('click', e => {
    const c = e.target.closest('[data-copy]'); if (!c) return; e.preventDefault();
    const text = c.dataset.copy === 'page' ? location.href : c.dataset.copy;
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).catch(() => { const t = document.createElement('textarea'); t.value = text; document.body.append(t); t.select(); try { document.execCommand('copy'); } catch (er) {} t.remove(); });
    toast('주소를 복사했습니다');
  });


  /* ---------- 공유 ----------
     휴대폰(터치 기기)은 기본 공유 창(navigator.share), 그 밖(PC 등)은 아래 하단 시트를 띄운다. */
  const Sheet = window.Sheet = {
    open(html) {
      const trigger = document.activeElement;
      const bg = document.createElement('div'); bg.className = 'sheet-bg'; bg.setAttribute('role', 'dialog'); bg.setAttribute('aria-modal', 'true'); bg.setAttribute('aria-label', '공유');
      bg.innerHTML = '<div class="sheet"><div class="sheet-heading"><h2>공유하기</h2><button type="button" data-sheet-close aria-label="공유 창 닫기">닫기</button></div>' + html + '</div>';
      const close = () => { document.removeEventListener('keydown', key); bg.classList.remove('open'); setTimeout(() => bg.remove(), 280); trigger?.focus({ preventScroll: true }); };
      const key = e => { if (e.key === 'Escape') close(); };
      bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('[data-sheet-close]')) close(); });
      document.addEventListener('keydown', key); document.body.append(bg); requestAnimationFrame(() => requestAnimationFrame(() => bg.classList.add('open')));
      bg.querySelector('[data-sheet-close]').focus({ preventScroll: true });
      return close;
    }
  };
  const copyText = text => (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).catch(() => { const t = document.createElement('textarea'); t.value = text; document.body.append(t); t.select(); try { document.execCommand('copy'); } catch (er) {} t.remove(); });
  UI.copy = copyText;
  Actions.share = async el => {
    const title = el.dataset.title || document.title, url = location.href;
    if (navigator.share && matchMedia('(pointer:coarse)').matches) {
      try { await navigator.share({ title, text: title, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; }   // 실패하면 아래 시트로
    }
    const enc = encodeURIComponent, body = title + ' ' + url;
    Sheet.open('<div class="sheet-head"><div class="sheet-t"><b>' + escH(title) + '</b><span>' + escH(url) + '</span></div></div>' +
      '<button type="button" class="sheet-copy" data-action="share-copy" data-sheet-close>복사</button>' +
      '<div class="sheet-row"><button type="button" class="k" data-action="soon" data-sheet-close><i><span class="ms">chat</span></i>카카오톡</button>' +
      '<a class="s" href="sms:?&body=' + enc(body) + '" data-sheet-close><i><span class="ms">sms</span></i>문자</a>' +
      '<a class="e" href="mailto:?subject=' + enc(title) + '&body=' + enc(body) + '" data-sheet-close><i><span class="ms">mail</span></i>이메일</a>' +
      '<button type="button" class="c" data-action="share-copy" data-sheet-close><i><span class="ms">content_copy</span></i>주소 복사</button></div>');
    document.querySelector('.sheet').dataset.url = url;
  };
  Actions['share-copy'] = el => { copyText(el.closest('.sheet').dataset.url || location.href); toast('주소를 복사했습니다'); };

  /* ---------- 맨 위로 ---------- */
  Actions['to-top'] = () => scrollTo({ top: 0, behavior: 'smooth' });

  /* ---------- 사진 크게 보기 (같은 묶음의 사진은 좌우로 넘김) ---------- */
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-view]'); if (!t) return;
    const group = t.closest('[data-gallery]'), all = group ? [...group.querySelectorAll('[data-view]')] : [t];
    const srcOf = x => x.dataset.src || x.getAttribute('src');
    let i = Math.max(0, all.indexOf(t));
    const lb = document.createElement('div'); lb.className = 'lightbox'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', '사진 크게 보기');
    const draw = () => {
      lb.innerHTML = '<button class="lb-x" data-lb="close" aria-label="닫기"><span class="ms">close</span></button>' +
        '<button class="lb-more" data-lb="more" aria-label="사진 메뉴 (저장·공유·신고)" aria-haspopup="menu" aria-expanded="false"><span class="ms">more_horiz</span></button>' +
        (all.length > 1 ? '<button class="lb-nav prev" data-lb="prev" aria-label="이전 사진"><span class="ms">chevron_left</span></button><button class="lb-nav next" data-lb="next" aria-label="다음 사진"><span class="ms">chevron_right</span></button>' : '') +
        '<img src="' + escH(srcOf(all[i])) + '" alt="' + escH(all[i].querySelector('img')?.alt || all[i].getAttribute('alt') || ('사진 ' + (i + 1))) + '"><div class="lb-bar">' + (all.length > 1 ? '<span>' + (i + 1) + ' / ' + all.length + '</span>' : '') + '</div>';
    };
    const busy = () => document.querySelector('.menu-pop,.modal,.sheet-bg');   // 메뉴·확인창이 떠 있으면 사진 창은 가만히
    const key = ev => { if (busy()) return; if (ev.key === 'Escape') close(); if (ev.key === 'ArrowLeft') go(-1); if (ev.key === 'ArrowRight') go(1); };
    const close = () => { lb.remove(); document.removeEventListener('keydown', key); t.focus({ preventScroll: true }); };
    const go = d => { if (all.length > 1) { i = (i + d + all.length) % all.length; draw(); lb.querySelector(d < 0 ? '.prev' : '.next').focus({ preventScroll: true }); } };
    const more = btn => {
      const src = srcOf(all[i]), ctx = document.querySelector('[data-img-ctx]'), cx = ctx ? ctx.dataset.imgCtx : 'page:' + location.pathname.split('/').pop() + location.search;
      UI.menu(btn, [
        { label: '사진 저장', icon: 'download', onClick: () => { const a = document.createElement('a'); a.href = src; a.download = 'photo-' + (i + 1) + '.jpg'; document.body.append(a); a.click(); a.remove(); toast('사진을 저장했습니다'); } },
        { label: '공유하기', icon: 'share', onClick: () => Actions.share({ dataset: { title: document.title } }) },
        { sep: true },
        { label: '신고하기', icon: 'flag', danger: true, onClick: () => UI.report({ kind: 'image', id: cx + '#' + (i + 1), label: (ctx && ctx.dataset.imgLabel || document.title) + ' · 사진 ' + (i + 1) }) }
      ]);
    };
    lb.addEventListener('click', ev => {
      const b = ev.target.closest('[data-lb]');
      if (b) { if (b.dataset.lb === 'close') close(); else if (b.dataset.lb === 'more') more(b); else go(b.dataset.lb === 'next' ? 1 : -1); } else if (ev.target === lb) close();
    });
    document.addEventListener('keydown', key); draw(); document.body.append(lb); lb.querySelector('.lb-x').focus({ preventScroll: true });
  });
})();
