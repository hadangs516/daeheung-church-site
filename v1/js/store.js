/* ============================================================
   시험용 저장소 (이 브라우저의 localStorage에만 저장)
   - 정식판에서는 이 파일의 함수들을 서버(Cloudflare) API 호출로 바꾸면 됩니다.
   - 화면 코드(site.js, member.js)는 Store.* 만 부릅니다.
   - 비밀번호는 평문으로 저장하지 않고 SHA-256 + salt 해시로 저장합니다.
   ============================================================ */
(function () {
  const K = { users: 'pdh_users', session: 'pdh_session', posts: 'pdh_posts', comments: 'pdh_comments', admin: 'pdh_admin', guest: 'pdh_guest' };
  const read = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pad = n => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()); };

  /* ---------- 해시 ---------- */
  const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  async function hashPw(pw, salt) {
    if (!(window.crypto && crypto.subtle)) throw new Error('이 주소에서는 비밀번호 보호 기능을 쓸 수 없습니다. localhost 또는 https 주소로 열어 주세요.');
    return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + pw)));
  }
  const makeSalt = () => hex(crypto.getRandomValues(new Uint8Array(16)));

  /* ---------- 회원 ---------- */
  const users = () => read(K.users, []);
  const saveUsers = u => write(K.users, u);
  const me = () => { const s = read(K.session, null); return s ? (users().find(u => u.id === s.id) || null) : null; };
  const SENS = ['name', 'rank', 'birth', 'phone'];   // 바꾸면 교회 승인이 필요한 신상 항목
  const SENS_LABEL = { name: '이름', rank: '직분', birth: '생년월일', phone: '연락처' };

  async function signup(f) {
    const list = users();
    if (list.some(u => u.username.toLowerCase() === f.username.toLowerCase())) return { ok: false, field: 'username', error: '이미 사용 중인 아이디입니다.' };
    const salt = makeSalt();
    const u = { id: 'm' + uid(), username: f.username, salt, hash: await hashPw(f.password, salt),
      name: f.name, rank: f.rank, birth: f.birth, phone: f.phone || '', bio: '', photo: '', pending: null, createdAt: Date.now() };
    list.push(u);
    if (!saveUsers(list)) return { ok: false, error: '저장 공간이 가득 찼습니다.' };
    write(K.session, { id: u.id });
    return { ok: true, user: u };
  }
  async function login(username, pw) {
    const u = users().find(x => x.username.toLowerCase() === username.toLowerCase());
    if (!u || (await hashPw(pw, u.salt)) !== u.hash) return { ok: false, error: '아이디 또는 비밀번호가 맞지 않습니다.' };
    write(K.session, { id: u.id });
    return { ok: true, user: u };
  }
  const logout = () => { try { localStorage.removeItem(K.session); } catch (e) {} };

  /* 프로필 저장: 사진·자기소개는 바로 반영, 신상 항목은 승인 대기(pending)로 */
  function updateProfile(patch) {
    const list = users(), u = list.find(x => x.id === (me() || {}).id); if (!u) return { ok: false, error: '로그인이 필요합니다.' };
    if ('bio' in patch) u.bio = patch.bio;
    if ('photo' in patch) u.photo = patch.photo;
    const pend = Object.assign({}, u.pending || {}); delete pend.at;
    const before = JSON.stringify(pend);
    SENS.forEach(k => { if (k in patch) { if (patch[k] !== u[k]) pend[k] = patch[k]; else delete pend[k]; } });
    const keys = Object.keys(pend), diff = JSON.stringify(pend) !== before ? keys : [];
    u.pending = keys.length ? Object.assign(pend, { at: Date.now() }) : null;
    if (!saveUsers(list)) return { ok: false, error: '저장 공간이 가득 찼습니다. 사진을 줄이거나 예전 글을 지워 주세요.' };
    return { ok: true, pending: !!u.pending, changed: diff };
  }
  const cancelPending = () => { const list = users(), u = list.find(x => x.id === (me() || {}).id); if (u) { u.pending = null; saveUsers(list); } };
  async function changePassword(cur, next) {
    const list = users(), u = list.find(x => x.id === (me() || {}).id); if (!u) return { ok: false, error: '로그인이 필요합니다.' };
    if ((await hashPw(cur, u.salt)) !== u.hash) return { ok: false, field: 'cur', error: '현재 비밀번호가 맞지 않습니다.' };
    u.salt = makeSalt(); u.hash = await hashPw(next, u.salt); saveUsers(list); return { ok: true };
  }
  function withdraw() {                       // 탈퇴 = 이 회원의 시험 데이터 삭제
    const m = me(); if (!m) return;
    saveUsers(users().filter(u => u.id !== m.id));
    write(K.posts, read(K.posts, []).filter(p => p.owner !== m.id));
    write(K.comments, read(K.comments, []).filter(c => c.owner !== m.id));
    logout();
  }
  function resetAll() { Object.values(K).forEach(k => { try { localStorage.removeItem(k); } catch (e) {} }); }

  /* ---------- 시험용 관리자 모드 ---------- */
  const isAdmin = () => !!me() && read(K.admin, '0') === '1';
  const setAdmin = on => { try { localStorage.setItem(K.admin, on ? '"1"' : '"0"'); } catch (e) {} };
  const pendingList = () => users().filter(u => u.pending).map(u => ({ id: u.id, name: u.name, username: u.username, pending: u.pending, before: u }));
  function resolvePending(id, ok) {
    const list = users(), u = list.find(x => x.id === id); if (!u || !u.pending) return;
    if (ok) SENS.forEach(k => { if (k in u.pending && k !== 'at') u[k] = u.pending[k]; });
    u.pending = null; saveUsers(list);
  }

  /* ---------- 글 ---------- */
  function guestKey() { let g = read(K.guest, null); if (!g) { g = 'g' + uid(); write(K.guest, g); } return g; }
  const ownerKey = () => { const m = me(); return m ? m.id : guestKey(); };
  const isMine = owner => { const m = me(); return !!owner && (owner === (m && m.id) || owner === read(K.guest, null)); };
  const userName = o => { const u = users().find(x => x.id === o.owner); return u ? u.name : (o.name || '게스트'); };
  const displayAuthor = o => o.anon ? (isAdmin() ? '익명(' + userName(o) + ')' : '익명') : userName(o);

  const rawPosts = () => read(K.posts, []);
  const rawComments = () => read(K.comments, []);
  const CMT_POOL = ['은혜 받았습니다. 감사합니다.', '함께 기도하겠습니다.', '좋은 소식 감사합니다.', '아멘! 기대됩니다.', '수고 많으셨습니다. 늘 감사드려요.', '다음 모임에도 참여하겠습니다.'];
  const fakeCount = (b, id) => /^\d+$/.test(String(id)) ? (+id * 7 + b.length) % 6 : 0;
  function fakeComments(b, id) {
    return Array.from({ length: fakeCount(b, id) }, (_, i) => ({ id: 'f' + b + id + '-' + i, fake: true, name: BOARDS[b] && BOARDS[b].anon ? '익명' : '○○○', text: CMT_POOL[(id + i) % CMT_POOL.length], date: BOARD_DATES[(id + i) % BOARD_DATES.length] }));
  }
  const commentCount = (b, id) => fakeCount(b, id) + rawComments().filter(c => c.board === b && c.postId === String(id)).length;

  /* 한 게시판의 전체 글(고정 글 → 내가 쓴 글 → 기존 글) */
  function allPosts(b) {
    const fake = boardPosts(b).map(p => Object.assign(p, { id: String(p.id), comments: fakeCount(b, p.id) + rawComments().filter(c => c.board === b && c.postId === String(p.id)).length }));
    const mine = rawPosts().filter(p => p.board === b).sort((x, y) => y.at - x.at).map(p => ({
      id: p.id, title: p.title, date: p.date, author: displayAuthor(p), views: p.views || 0, pinned: false, user: true, owner: p.owner,
      hasPhoto: /<img/.test(p.html), hasFile: false, comments: commentCount(b, p.id) }));
    const pinned = fake.filter(p => p.pinned), rest = fake.filter(p => !p.pinned);
    return pinned.concat(mine, rest);
  }
  const getPost = id => rawPosts().find(p => p.id === id) || null;
  function savePost(f) {
    const list = rawPosts(), html = sanitize(f.html);
    let p = f.id && list.find(x => x.id === f.id);
    if (p) { p.title = f.title; p.html = html; p.anon = !!f.anon; p.edited = Date.now(); }
    else { const m = me(); p = { id: 'u' + uid(), board: f.board, title: f.title, html, anon: !!f.anon, owner: ownerKey(), name: m ? m.name : '게스트', date: today(), at: Date.now(), views: 0 }; list.push(p); }
    return write(K.posts, list) ? p : null;
  }
  function deletePost(id) {
    write(K.posts, rawPosts().filter(p => p.id !== id));
    write(K.comments, rawComments().filter(c => c.postId !== id));
  }
  function addView(id) { const list = rawPosts(), p = list.find(x => x.id === id); if (p) { p.views = (p.views || 0) + 1; write(K.posts, list); } }
  const myPosts = () => rawPosts().filter(p => isMine(p.owner)).sort((a, b) => b.at - a.at);

  /* ---------- 댓글 ---------- */
  function commentsOf(b, id) {
    const mine = rawComments().filter(c => c.board === b && c.postId === String(id)).sort((x, y) => x.at - y.at)
      .map(c => ({ id: c.id, text: c.text, date: c.date, name: displayAuthor(c), mine: isMine(c.owner) }));
    return (/^\d+$/.test(String(id)) ? fakeComments(b, +id) : []).concat(mine);
  }
  function addComment(f) {
    const list = rawComments(), m = me();
    list.push({ id: 'c' + uid(), board: f.board, postId: String(f.postId), text: f.text, anon: !!f.anon, owner: ownerKey(), name: m ? m.name : '게스트', date: today(), at: Date.now() });
    return write(K.comments, list);
  }
  const deleteComment = id => write(K.comments, rawComments().filter(c => c.id !== id));

  /* ---------- 글 HTML 정리 (허용한 태그만 남김) ---------- */
  const ALLOW = new Set(['P', 'DIV', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'SPAN', 'IMG']);
  const DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'SVG', 'MATH', 'FORM', 'INPUT', 'TEXTAREA', 'BUTTON', 'VIDEO', 'AUDIO']);
  const CLS = /^(fs-(s|n|l|xl)|fc-(ink|red|blue|green|orange|gray))$/;
  const IMG_OK = /^(data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+|img\/[\w./-]+)$/;
  function sanitize(html) {
    const tpl = document.createElement('template'); tpl.innerHTML = String(html || '');
    const out = document.createElement('div');
    (function walk(src, dst) {
      src.childNodes.forEach(n => {
        if (n.nodeType === 3) { dst.appendChild(document.createTextNode(n.nodeValue)); return; }
        if (n.nodeType !== 1) return;
        const t = n.tagName;
        if (DROP.has(t)) return;
        if (!ALLOW.has(t)) { walk(n, dst); return; }
        const e = document.createElement(t.toLowerCase());
        if (t === 'IMG') { const s = n.getAttribute('src') || ''; if (!IMG_OK.test(s)) return; e.setAttribute('src', s); e.setAttribute('alt', ''); dst.appendChild(e); return; }
        if (t === 'SPAN') { const c = (n.getAttribute('class') || '').split(/\s+/).filter(x => CLS.test(x)); if (!c.length) { walk(n, dst); return; } e.className = c.join(' '); }
        walk(n, e); dst.appendChild(e);
      });
    })(tpl.content, out);
    return out.innerHTML;
  }

  /* ---------- 사진 줄이기 (캔버스) ---------- */
  function resizeImage(file, maxSide, opt) {
    opt = opt || {};
    return new Promise((res, rej) => {
      if (!/^image\//.test(file.type)) return rej(new Error('사진 파일만 올릴 수 있습니다.'));
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        let w = img.naturalWidth, h = img.naturalHeight, sx = 0, sy = 0, sw = w, sh = h;
        if (opt.square) { const s = Math.min(w, h); sx = (w - s) / 2; sy = (h - s) / 2; sw = sh = s; w = h = s; }
        const k = Math.min(1, maxSide / Math.max(w, h)), cw = Math.round(w * k), ch = Math.round(h * k);
        const c = document.createElement('canvas'); c.width = cw; c.height = ch;
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cw, ch); g.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
        URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', opt.quality || 0.8));
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('사진을 읽을 수 없습니다.')); };
      img.src = url;
    });
  }
  /* 저장 공간 사용량(대략, KB) — 한도는 브라우저마다 약 5MB */
  function usageKB() { let n = 0; try { Object.values(K).forEach(k => { n += (localStorage.getItem(k) || '').length * 2; }); } catch (e) {} return Math.round(n / 1024); }

  window.Store = { me, signup, login, logout, updateProfile, cancelPending, changePassword, withdraw, resetAll, isAdmin, setAdmin, pendingList, resolvePending,
    SENS, SENS_LABEL, allPosts, getPost, savePost, deletePost, addView, myPosts, isMine, commentsOf, commentCount, addComment, deleteComment, sanitize, resizeImage, usageKB, today };
})();
