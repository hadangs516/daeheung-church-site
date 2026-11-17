/* ============================================================
   공통 UI 도구: 알림(toast) · 확인창(Modal) · 사진 크게 보기 · 버튼 동작 연결
   - 버튼·폼의 동작은 class가 아니라 data-action="이름" 으로 연결합니다.
     (스타일을 바꿔도 동작이 깨지지 않게 하기 위함 — 기능-목록.md 참고)
   - 동작 등록: Actions['이름'] = (요소, 이벤트) => { ... }
   ============================================================ */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const Actions = window.Actions = {};

  /* ---------- 알림 ---------- */
  window.toast = (msg, icon) => {
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

  /* ---------- 클릭·입력 연결 (data-action) ---------- */
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]'); if (!el || /^(INPUT|SELECT|TEXTAREA|FORM)$/.test(el.tagName)) return;
    const fn = Actions[el.dataset.action]; if (fn) { if (el.tagName === 'A' && el.getAttribute('href') === '#') e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('change', e => { const el = e.target.closest('[data-action]'); if (el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) && Actions[el.dataset.action]) Actions[el.dataset.action](el, e); });
  document.addEventListener('submit', e => { const f = e.target.closest('form[data-action]'); if (f && Actions[f.dataset.action]) { e.preventDefault(); Actions[f.dataset.action](f, e); } });
  document.addEventListener('keydown', e => { const el = e.target.closest && e.target.closest('[role="button"][data-action]'); if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); el.click(); } });
  /* 주소 복사 (공유) */
  document.addEventListener('click', e => {
    const c = e.target.closest('[data-copy]'); if (!c) return; e.preventDefault();
    const text = c.dataset.copy === 'page' ? location.href : c.dataset.copy;
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).catch(() => { const t = document.createElement('textarea'); t.value = text; document.body.append(t); t.select(); try { document.execCommand('copy'); } catch (er) {} t.remove(); });
    toast('주소를 복사했습니다');
  });
  Actions.print = () => window.print();

  /* ---------- 맨 위로 ---------- */
  const top = document.createElement('button'); top.className = 'to-top'; top.setAttribute('aria-label', '맨 위로'); top.setAttribute('data-action', 'to-top');
  top.innerHTML = '<span class="ms">arrow_upward</span>'; document.body.append(top);
  Actions['to-top'] = () => scrollTo({ top: 0, behavior: 'smooth' });
  addEventListener('scroll', () => top.classList.toggle('show', scrollY > 500), { passive: true });

  /* ---------- 사진 크게 보기 (같은 묶음의 사진은 좌우로 넘김) ---------- */
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-view]'); if (!t) return;
    const group = t.closest('[data-gallery]'), all = group ? [...group.querySelectorAll('[data-view]')] : [t];
    const srcOf = x => x.dataset.src || x.getAttribute('src');
    let i = Math.max(0, all.indexOf(t));
    const lb = document.createElement('div'); lb.className = 'lightbox'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true');
    const draw = () => {
      lb.innerHTML = '<button class="lb-x" data-lb="close" aria-label="닫기"><span class="ms">close</span></button>' +
        (all.length > 1 ? '<button class="lb-nav prev" data-lb="prev" aria-label="이전 사진"><span class="ms">chevron_left</span></button><button class="lb-nav next" data-lb="next" aria-label="다음 사진"><span class="ms">chevron_right</span></button>' : '') +
        '<img src="' + srcOf(all[i]) + '" alt=""><div class="lb-bar">' + (all.length > 1 ? '<span>' + (i + 1) + ' / ' + all.length + '</span>' : '') +
        '<a class="btn sm" href="' + srcOf(all[i]) + '" download="photo-' + (i + 1) + '.jpg"><span class="ms">download</span>내려받기</a></div>';
    };
    const key = ev => { if (ev.key === 'Escape') close(); if (ev.key === 'ArrowLeft') go(-1); if (ev.key === 'ArrowRight') go(1); };
    const close = () => { lb.remove(); document.removeEventListener('keydown', key); };
    const go = d => { if (all.length > 1) { i = (i + d + all.length) % all.length; draw(); } };
    lb.addEventListener('click', ev => {
      const b = ev.target.closest('[data-lb]');
      if (b) { if (b.dataset.lb === 'close') close(); else go(b.dataset.lb === 'next' ? 1 : -1); } else if (ev.target === lb) close();
    });
    document.addEventListener('keydown', key); draw(); document.body.append(lb);
  });
})();
