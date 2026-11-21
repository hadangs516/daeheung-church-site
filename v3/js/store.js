/* ============================================================
   시험용 저장소 (이 브라우저의 localStorage에만 저장)
   - 정식판에서는 이 파일의 함수들을 서버(Cloudflare) API 호출로 바꾸면 됩니다.
   - 화면 코드(site.js, member.js)는 Store.* 만 부릅니다.
   - 비밀번호는 평문으로 저장하지 않고 SHA-256 + salt 해시로 저장합니다.
   ============================================================ */
(function () {
  const K = { users: 'pdh_users', session: 'pdh_session', posts: 'pdh_posts', comments: 'pdh_comments', admin: 'pdh_admin', guest: 'pdh_guest', leaders: 'pdh_leaders', prefs: 'pdh_prefs' };
  Object.assign(K, { notifs: 'pdh_notifs', nprefs: 'pdh_notif_prefs', reports: 'pdh_reports', appeals: 'pdh_appeals' });
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
  // 예전 데이터의 문자열 교구·상태 없는 교구도 신청으로 복원한다.
  // 이전에는 상태가 없으면 승인 큐에서 빠지고, 화면에서는 승인된 것처럼 보였다.
  const users = () => read(K.users, []).map(u => {
    if (typeof u.parish === 'string') u.parish = { id: u.parish };
    if (u.parish && !['pending', 'approved', 'rejected'].includes(u.parish.status)) u.parish.status = 'pending';
    return u;
  });
  const saveUsers = u => write(K.users, u);
  const me = () => { const s = read(K.session, null); return s ? (users().find(u => u.id === s.id) || null) : null; };
  const SENS = ['name', 'rank', 'birth', 'phone'];   // 바꾸면 교회 승인이 필요한 신상 항목
  const SENS_LABEL = { name: '이름', rank: '직분', birth: '생년월일', phone: '연락처' };

  const requiredConsents = ['age', 'terms', 'privacy', 'sensitive'];
  const consentVersions = { terms: '[시행일]', privacy: '[시행일]' };
  const hasRequiredConsents = choices => requiredConsents.every(key => choices?.[key] === true);
  function signupBirthError(birth) {
    const now = new Date(), [y, m, d] = String(birth).split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birth) || y < 1850 || date.getFullYear() !== y ||
        date.getMonth() !== m - 1 || date.getDate() !== d || date > now)
      return '생년월일을 숫자로 입력해 주세요. (예: 1951년 4월 1일)';
    if (new Date(y + 14, m - 1, d) > now)
      return `이 홈페이지는 만 14세 미만의 가입을 받지 않습니다. 어린이·청소년부 소식은 담당 선생님이나 관리자가 올립니다. 궁금한 점은 교회(${CHURCH.phone})로 문의해 주세요.`;
    return '';
  }

  async function signup(f) {
    const birthError = signupBirthError(f.birth);
    if (birthError) return { ok: false, field: 'birth', error: birthError };
    if (!hasRequiredConsents(f.consent)) return { ok: false, field: 'consent', error: '필수 항목에 모두 동의해 주세요.' };
    const consent = { age: true, terms: true, privacy: true, sensitive: true, phone: f.consent.phone === true,
      at: new Date().toISOString(), versions: { ...consentVersions } };
    const salt = makeSalt(), hash = await hashPw(f.password, salt);
    const list = users();
    if (list.some(u => u.username.toLowerCase() === f.username.toLowerCase())) return { ok: false, field: 'username', error: '이미 사용 중인 아이디입니다.' };
    const u = { id: 'm' + uid(), username: f.username, salt, hash, consent,
      name: f.name, rank: f.rank, birth: f.birth, phone: consent.phone ? f.phone || '' : '', bio: (f.bio || '').trim().slice(0, 200), photo: '', pending: null, createdAt: Date.now(),
      status: 'pending', groups: [], parish: null, privacy: Object.assign({}, PRIV_DEFAULT) };   // status: 홈페이지 가입 승인(관리자)
    const news = applyAffil(u, f.groups || [], f.parish || '');
    list.push(u);
    if (!saveUsers(list)) return { ok: false, error: '저장 공간이 가득 찼습니다.' };
    write(K.session, { id: u.id });
    sendNotif({ to: 'admin', type: 'signup', text: '새 가입 신청이 있어요: ' + u.name + '님', link: 'mypage.html#admin/signup' });
    notifyAffil(u, news);
    return { ok: true, user: u };
  }
  async function login(username, pw) {
    const u = users().find(x => x.username.toLowerCase() === username.toLowerCase());
    if (!u || (await hashPw(pw, u.salt)) !== u.hash) return { ok: false, error: '아이디 또는 비밀번호가 맞지 않습니다.' };
    write(K.session, { id: u.id });
    return { ok: true, user: u };
  }
  const usernameTaken = n => users().some(u => u.username.toLowerCase() === String(n).toLowerCase());
  const logout = () => { try { localStorage.removeItem(K.session); } catch (e) {} };

  /* 프로필 저장: 사진·자기소개는 바로 반영, 신상 항목은 승인 대기(pending)로 */
  function updateProfile(patch) {
    const list = users(), u = list.find(x => x.id === (me() || {}).id); if (!u) return { ok: false, error: '로그인이 필요합니다.' };
    if ('bio' in patch) u.bio = patch.bio;
    if ('photo' in patch) u.photo = patch.photo;
    const news = ('groups' in patch || 'parish' in patch) ? applyAffil(u, 'groups' in patch ? patch.groups : u.groups, 'parish' in patch ? patch.parish : (u.parish && u.parish.id) || '') : [];
    const pend = Object.assign({}, u.pending || {}); delete pend.at;
    const before = JSON.stringify(pend);
    SENS.forEach(k => { if (k in patch) { if (patch[k] !== u[k]) pend[k] = patch[k]; else delete pend[k]; } });
    const keys = Object.keys(pend), diff = JSON.stringify(pend) !== before ? keys : [];
    u.pending = keys.length ? Object.assign(pend, { at: Date.now() }) : null;
    if (!saveUsers(list)) return { ok: false, error: '저장 공간이 가득 찼습니다. 사진을 줄이거나 예전 글을 지워 주세요.' };
    if (diff.length) sendNotif({ to: 'admin', type: 'signup', text: u.name + '님이 정보 변경을 요청했어요', link: 'mypage.html#admin/profile' });
    notifyAffil(u, news);
    return { ok: true, pending: !!u.pending, changed: diff };
  }
  const cancelPending = () => { const list = users(), u = list.find(x => x.id === (me() || {}).id); if (u) { u.pending = null; saveUsers(list); } };
  async function changePassword(cur, next) {
    const list = users(), u = list.find(x => x.id === (me() || {}).id); if (!u) return { ok: false, error: '로그인이 필요합니다.' };
    if ((await hashPw(cur, u.salt)) !== u.hash) return { ok: false, field: 'cur', error: '현재 비밀번호가 맞지 않습니다.' };
    u.salt = makeSalt(); u.hash = await hashPw(next, u.salt);
    if (!saveUsers(list)) return { ok: false, error: '비밀번호를 저장하지 못했습니다.' };
    logout(); return { ok: true };
  }
  async function verifyPassword(password) {
    const m = me();
    return !!m && typeof password === 'string' && (await hashPw(password, m.salt)) === m.hash;
  }
  async function withdraw(opt = {}) {          // 비밀번호를 다시 확인한 뒤 탈퇴
    const m = me(); if (!m) return { ok: false, error: '로그인이 필요합니다.' };
    if (!(await verifyPassword(opt.password))) return { ok: false, field: 'password', error: '비밀번호가 맞지 않습니다' };
    if (!saveUsers(users().filter(u => u.id !== m.id))) return { ok: false, error: '탈퇴 정보를 저장하지 못했습니다.' };
    if (opt && opt.deleteContent) {
      write(K.posts, read(K.posts, []).filter(p => p.owner !== m.id));
      write(K.comments, read(K.comments, []).filter(c => c.owner !== m.id));
    }
    write(K.notifs, read(K.notifs, []).filter(n => n.to !== m.id));
    const L = leaders(); ['groups', 'parishes'].forEach(k => Object.keys(L[k]).forEach(i => { L[k][i] = L[k][i].filter(x => x !== m.id); })); write(K.leaders, L);
    logout(); return { ok: true };
  }
  function resetAll() { Object.values(K).forEach(k => { try { localStorage.removeItem(k); } catch (e) {} }); }

  /* ---------- 시험용 관리자 모드 ---------- */
  const isAdmin = () => !!me() && read(K.admin, '0') === '1';
  const setAdmin = on => { try { localStorage.setItem(K.admin, on ? '"1"' : '"0"'); } catch (e) {} };
  const pendingList = () => users().filter(u => u.pending).map(u => ({ id: u.id, name: u.name, username: u.username, pending: u.pending, before: u }));
  function resolvePending(id, ok) {
    if (!isAdmin()) return false;
    const list = users(), u = list.find(x => x.id === id); if (!u || !u.pending) return;
    if (ok) SENS.forEach(k => { if (k in u.pending && k !== 'at') u[k] = u.pending[k]; });
    u.pending = null; saveUsers(list);
    sendNotif({ to: u.id, type: 'approval', text: ok ? '정보 변경이 승인되었어요' : '정보 변경 요청이 반영되지 않았어요. 교회에 문의해 주세요', link: 'mypage.html' });
  }

  /* ---------- v3-A 회원 확장: 직분·소속·교구·공개 범위·가입 승인·부서 대표 ---------- */
  const sendNotif = o => { try { if (window.Store && window.Store.notify) window.Store.notify(o); } catch (e) {} };   // B가 만드는 알림. 없으면 건너뜀
  const EDU = ['infant', 'kinder', 'elem1', 'elem2', 'youth'];
  const GROUP_NAMES = { infant: '유아부', kinder: '유치부', elem1: '초등1부', elem2: '초등2부', youth: '중고등부', young1: '청년1부', young2: '청년2부', young3: '청년3부',
    choir1: '시온찬양대', choir2: '호산나찬양대', praise: '찬양팀', newcomer: '새가족부', media: '방송부' };
  for (let i = 1; i <= 5; i++) { GROUP_NAMES['men' + i] = '제' + i + '남전도회'; GROUP_NAMES['women' + i] = '제' + i + '여전도회'; }
  const PARISHES = Array.from({ length: 8 }, (_, i) => ({ id: 'p' + (i + 1), name: (i + 1) + '교구' }));
  const parishName = id => { const p = PARISHES.find(x => x.id === id); return p ? p.name : ''; };
  const groupName = id => GROUP_NAMES[id] || id;
  const groupText = g => groupName(g.id) + (g.role === 'teacher' ? ' 교사' : '');   // 학생은 부서 이름만
  const PRIV_FIELDS = [['position', '직분'], ['groups', '소속'], ['parish', '교구'], ['birth', '생년월일'], ['phone', '연락처'], ['bio', '자기소개']];
  const PRIV_DEFAULT = { position: 'all', groups: 'all', parish: 'members', birth: 'none', phone: 'none', bio: 'all' };
  const PRIV_LABEL = { all: '전체 공개', members: '로그인 회원만', none: '비공개' };
  const leaders = () => { const L = read(K.leaders, null) || {}; return { groups: L.groups || {}, parishes: L.parishes || {} }; };
  const leaderIds = (kind, id) => (leaders()[kind === 'group' ? 'groups' : 'parishes'][id] || []);
  function setLeader(kind, id, uidv, on) {
    if (!isAdmin()) return false;
    const L = leaders(), k = kind === 'group' ? 'groups' : 'parishes', s = new Set(L[k][id] || []);
    on ? s.add(uidv) : s.delete(uidv); L[k][id] = [...s]; write(K.leaders, L);
  }
  const leaderOf = uidv => { const L = leaders(), pick = o => Object.keys(o).filter(i => o[i].includes(uidv)); return { groups: pick(L.groups), parishes: pick(L.parishes) }; };
  const isLeader = () => { const m = me(); if (!m) return false; const l = leaderOf(m.id); return !!(l.groups.length || l.parishes.length); };

  /* 선택한 소속·교구를 회원에게 반영. 이미 승인된 것은 그대로, 새로 고른 것은 '대기'. 새로 대기가 된 항목 목록을 돌려줌 */
  function applyAffil(u, groups, parishId) {
    parishId = typeof parishId === 'object' ? (parishId && parishId.id) || '' : String(parishId || '');
    const old = u.groups || [], news = [];
    u.groups = (groups || []).map(g => {
      const had = old.find(o => o.id === g.id && o.role === g.role);
      if (had) return had;
      const auto = leaderIds('group', g.id).includes(u.id);       // 본인이 그 부서 대표면 바로 승인
      const n = { id: g.id, role: g.role || 'member', status: auto ? 'approved' : 'pending' }; if (!auto) news.push({ kind: 'group', id: g.id }); return n;
    });
    if (parishId) {
      if (!(u.parish && u.parish.id === parishId)) {
        const auto = leaderIds('parish', parishId).includes(u.id);
        u.parish = { id: parishId, status: auto ? 'approved' : 'pending' }; if (!auto) news.push({ kind: 'parish', id: parishId });
      }
    } else u.parish = null;
    return news;
  }
  /* 새 소속·교구 신청 → 그 부서 대표(없으면 관리자)에게 알림 */
  function notifyAffil(u, news) {
    (news || []).forEach(n => {
      const ids = leaderIds(n.kind, n.id), name = n.kind === 'group' ? groupName(n.id) : parishName(n.id);
      const text = u.name + '님이 ' + (n.kind === 'group' ? name + ' 소속을' : name + '를') + ' 신청했어요. 확인해 주세요';
      if (ids.length) ids.forEach(t => sendNotif({ to: t, type: 'group', text, link: 'mypage.html#admin/affil' })); else sendNotif({ to: 'admin', type: 'group', text, link: 'mypage.html#admin/affil' });
    });
  }
  /* 내가 승인할 수 있는 소속·교구 신청 (대표는 자기 부서, 관리자 모드는 전부) */
  function affilQueue() {
    const m = me(); if (!m) return [];
    const mine = leaderOf(m.id), all = isAdmin(), out = [];
    users().forEach(u => {
      (u.groups || []).forEach(g => { if (g.status === 'pending' && (all || mine.groups.includes(g.id))) out.push({ uid: u.id, name: u.name, kind: 'group', id: g.id, role: g.role, label: groupText(g) }); });
      if (u.parish && u.parish.status === 'pending' && (all || mine.parishes.includes(u.parish.id))) out.push({ uid: u.id, name: u.name, kind: 'parish', id: u.parish.id, label: parishName(u.parish.id) });
    });
    return out;
  }
  function resolveAffil(uidv, kind, id, role, ok) {
    const m = me(); if (!m) return false;
    const mine = leaderOf(m.id); if (!(isAdmin() || mine[kind === 'group' ? 'groups' : 'parishes'].includes(id))) return false;
    const list = users(), u = list.find(x => x.id === uidv); if (!u) return false;
    const st = ok ? 'approved' : 'rejected';
    if (kind === 'group') { const g = (u.groups || []).find(x => x.id === id && x.role === role); if (!g) return false; g.status = st; }
    else { if (!u.parish || u.parish.id !== id) return false; u.parish.status = st; }
    saveUsers(list);
    const name = kind === 'group' ? groupName(id) : parishName(id);
    sendNotif({ to: u.id, type: 'group', text: (kind === 'group' ? name + ' 소속' : name) + (ok ? '이 승인되었어요' : ' 신청이 반영되지 않았어요. 담당자에게 문의해 주세요'), link: 'mypage.html' });
    return true;
  }
  /* 홈페이지 가입 승인(전체 관리자) */
  const signupList = () => users().filter(u => u.status === 'pending').map(u => ({ id: u.id, name: u.name, username: u.username, rank: u.rank, createdAt: u.createdAt }));
  function resolveSignup(id, ok) {
    if (!isAdmin()) return false;
    const list = users(), u = list.find(x => x.id === id); if (!u || u.status !== 'pending') return;
    u.status = ok ? 'approved' : 'rejected'; saveUsers(list);
    sendNotif({ to: u.id, type: 'approval', text: ok ? '가입이 승인되었어요. 환영합니다!' : '가입 승인이 아직 되지 않았어요. 교회에 문의해 주세요', link: 'mypage.html' });
  }
  const statusOf = u => (u && u.status) || 'approved';        // 예전 회원(필드 없음)은 승인됨으로 본다
  const privOf = u => Object.assign({}, PRIV_DEFAULT, (u && u.privacy) || {});
  function setPrivacy(key, level) {
    const list = users(), u = list.find(x => x.id === (me() || {}).id); if (!u || !PRIV_LABEL[level]) return false;
    u.privacy = Object.assign(privOf(u), { [key]: level }); return saveUsers(list);
  }
  /* 글·댓글 곁에 붙는 작은 카드. 없는 회원은 null. 시험 글 작성자는 id 를 'demo:이름' 으로 쓴다 */
  function userCard(id) {
    if (!id) return null; const s = String(id);
    if (s.indexOf('demo:') === 0) return { id: s, name: s.slice(5), avatar: null };
    const u = users().find(x => x.id === s); return u ? { id: u.id, name: u.name, avatar: u.photo || null } : null;
  }
  /* 공개 프로필: 보는 사람(본인 / 로그인 회원 / 비로그인)에 맞게 공개 범위를 적용해서 돌려줌 */
  function profileOf(id) {
    const c = userCard(id); if (!c) return null;
    const viewer = me(), self = !!viewer && viewer.id === c.id, lvl = self ? 'self' : viewer ? 'members' : 'all';
    const can = k => self || (lvl === 'members' ? ['all', 'members'] : ['all']).includes(privOf(users().find(x => x.id === c.id) || {})[k]);
    const out = { id: c.id, name: c.name, avatar: c.avatar, self, demo: String(id).indexOf('demo:') === 0, fields: {}, hidden: [] };
    let u = users().find(x => x.id === c.id);
    if (!u) {                                                      // 가짜(시험) 작성자 — 이름으로 정해진 가짜 정보
      const h = [...c.name].reduce((a, ch) => a + ch.charCodeAt(0), 0);
      u = { rank: RANKS[h % RANKS.length], bio: '함께 예배드리는 교우입니다. 잘 부탁드립니다.', groups: [{ id: ['youth', 'men1', 'women2', 'choir1', 'young1'][h % 5], role: 'member', status: 'approved' }], parish: { id: 'p' + (h % 8 + 1), status: 'approved' }, birth: '', phone: '' };
      out.fields = { position: u.rank, groups: u.groups.map(groupText), parish: parishName(u.parish.id), bio: u.bio }; return out;
    }
    const vis = g => self || g.status === 'approved';
    const affilSuffix = g => g.status === 'rejected' ? ' (승인 안 됨)' : g.status !== 'approved' ? ' (승인 대기)' : '';
    const val = { position: u.rank || '', groups: (u.groups || []).filter(vis).map(g => groupText(g) + affilSuffix(g)), parish: u.parish && vis(u.parish) ? parishName(u.parish.id) + affilSuffix(u.parish) : '', birth: u.birth || '', phone: u.phone || '', bio: u.bio || '' };
    PRIV_FIELDS.forEach(([k]) => { if (can(k)) { if (val[k] && val[k].length !== 0) out.fields[k] = val[k]; } else out.hidden.push(k); });
    if (self) out.privacy = privOf(u);
    out.needLogin = !viewer && PRIV_FIELDS.some(([k]) => privOf(u)[k] === 'members' && val[k] && val[k].length !== 0);   // 로그인하면 더 볼 수 있는 항목이 있는지
    return out;
  }
  const postsOfUser = id => rawPosts().filter(p => p.owner === id && !p.anon && canSeePost(p)).sort((a, b) => b.at - a.at);
  const prefs = () => Object.assign({ bigText: false }, read(K.prefs, {}));
  const setPref = (k, v) => { const p = prefs(); p[k] = v; write(K.prefs, p); };
  const allMembers = () => isAdmin() ? users().map(u => ({ id: u.id, name: u.name, username: u.username, rank: u.rank, status: statusOf(u), ban: u.ban || null })) : [];
  const activeBan = (u = me()) => u && u.ban && (u.ban.until === null || u.ban.until > Date.now()) ? u.ban : null;
  function writeError(u = me()) {
    const b = activeBan(u); if (!b) return '';
    const d = b.until === null ? '영구' : (() => { const t = new Date(b.until); return t.getFullYear() + '.' + pad(t.getMonth() + 1) + '.' + pad(t.getDate()) + '까지'; })();
    return '이용이 제한된 계정입니다 (사유: ' + b.reason + ' · ' + d + ')';
  }
  function sanctionUser(id, days, reason) {
    if (!isAdmin()) return { ok: false, error: '관리자만 제재할 수 있습니다.' };
    reason = String(reason || '').trim();
    if (!reason || reason.length > 500) return { ok: false, error: '제재 사유를 1~500자로 입력해 주세요.' };
    if (days !== null && (!Number.isInteger(days) || days < 1 || days > 3650)) return { ok: false, error: '기간은 1~3650일로 입력해 주세요.' };
    const list = users(), u = list.find(x => x.id === id); if (!u) return { ok: false, error: '회원을 찾을 수 없습니다.' };
    u.ban = { until: days === null ? null : Date.now() + days * 86400000, reason, at: Date.now(), by: me().id };
    if (!saveUsers(list)) return { ok: false, error: '제재를 저장하지 못했습니다.' };
    notify({ to: u.id, type: 'sanction', text: writeError(u), link: 'mypage.html#info' });
    return { ok: true };
  }
  function liftSanction(id) {
    if (!isAdmin()) return { ok: false, error: '관리자만 해제할 수 있습니다.' };
    const list = users(), u = list.find(x => x.id === id); if (!u) return { ok: false, error: '회원을 찾을 수 없습니다.' };
    delete u.ban;
    if (!saveUsers(list)) return { ok: false, error: '해제 정보를 저장하지 못했습니다.' };
    notify({ to: u.id, type: 'sanction', text: '이용 제재가 해제되었습니다. 다시 글과 댓글을 쓸 수 있습니다.', link: 'mypage.html#info' });
    return { ok: true };
  }

  /* ---------- 글 ---------- */
  function guestKey() { let g = read(K.guest, null); if (!g) { g = 'g' + uid(); write(K.guest, g); } return g; }
  const ownerKey = () => { const m = me(); return m ? m.id : guestKey(); };
  const isMine = owner => { const m = me(); return !!owner && (owner === (m && m.id) || owner === read(K.guest, null)); };
  const userName = o => { const u = users().find(x => x.id === o.owner); return u ? u.name : (o.name || '게스트'); };
  const displayAuthor = o => o.anon ? (isAdmin() ? '익명(' + userName(o) + ')' : '익명') : userName(o);

  const canSeePost = p => !p.hidden || isMine(p.owner) || isAdmin();
  const rawPosts = () => read(K.posts, []);
  const rawComments = () => read(K.comments, []);
  const CMT_POOL = ['은혜 받았습니다. 감사합니다.', '함께 기도하겠습니다.', '좋은 소식 감사합니다.', '아멘! 기대됩니다.', '수고 많으셨습니다. 늘 감사드려요.', '다음 모임에도 참여하겠습니다.'];
  const fakeCount = (b, id) => /^\d+$/.test(String(id)) ? (+id * 7 + b.length) % 6 : 0;
  const dateAt = (s, h) => { const m = /^(\d{4})\.(\d{2})\.(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3], h || 12, 0).getTime() : 0; };
  function fakeComments(b, id) {
    const anon = !!(BOARDS[b] && BOARDS[b].anon);
    return Array.from({ length: fakeCount(b, id) }, (_, i) => { const date = BOARD_DATES[(id + i) % BOARD_DATES.length];
      return { id: 'f' + b + id + '-' + i, fake: true, name: anon ? '익명' : '○○○', authorId: anon ? null : 'demo:○○○', text: CMT_POOL[(id + i) % CMT_POOL.length], date, at: dateAt(date, 9 + i) }; });
  }
  const commentCount = (b, id) => fakeCount(b, id) + rawComments().filter(c => c.board === b && c.postId === String(id)).length;

  /* 한 게시판의 전체 글(고정 글 → 내가 쓴 글 → 기존 글) */
  function allPosts(b) {
    const fake = boardPosts(b).map(p => Object.assign(p, { id: String(p.id), comments: fakeCount(b, p.id) + rawComments().filter(c => c.board === b && c.postId === String(p.id)).length }));
    fake.forEach(p => { p.authorId = BOARDS[b].anon ? null : 'demo:' + p.author; });
    const mine = rawPosts().filter(p => p.board === b && canSeePost(p)).sort((x, y) => y.at - x.at).map(p => ({
      id: p.id, title: p.title, date: p.date, author: displayAuthor(p), authorId: p.anon || !users().some(u => u.id === p.owner) ? null : p.owner, at: p.at, views: p.views || 0, pinned: false, user: true, owner: p.owner, hidden: !!p.hidden, hiddenBy: p.hiddenBy,
      hasPhoto: /<img/.test(p.html), hasFile: false, comments: commentCount(b, p.id) }));
    const pinned = fake.filter(p => p.pinned), rest = fake.filter(p => !p.pinned);
    return pinned.concat(mine, rest);
  }
  const getPost = id => rawPosts().find(p => p.id === id) || null;
  function setPostHidden(id, hidden) {
    const list = rawPosts(), p = list.find(x => x.id === id);
    if (!p || !(isMine(p.owner) || isAdmin())) return false;
    if (!isAdmin() && p.hidden && p.hiddenBy === 'admin') return false;
    if (hidden) { p.hidden = true; p.hiddenBy = isAdmin() ? 'admin' : 'author'; p.hiddenAt = Date.now(); }
    else { delete p.hidden; delete p.hiddenBy; delete p.hiddenAt; }
    return write(K.posts, list);
  }
  const hiddenPosts = () => isAdmin() ? rawPosts().filter(p => p.hidden).sort((a, b) => (b.hiddenAt || b.at) - (a.hiddenAt || a.at)) : [];
  const appeals = () => read(K.appeals, []).filter(a => isAdmin() || a.by === me()?.id).sort((a, b) => b.at - a.at);
  const pendingAppeal = postId => appeals().find(a => a.postId === postId && a.status === 'pending') || null;
  function submitAppeal(postId, text) {
    const m = me(), p = getPost(postId); text = String(text || '').trim();
    if (!m || !p || p.owner !== m.id || !p.hidden || p.hiddenBy !== 'admin') return { ok: false, error: '이의신청할 수 있는 글이 아닙니다.' };
    if (!text || text.length > 500) return { ok: false, error: '신청 사유를 1~500자로 입력해 주세요.' };
    if (pendingAppeal(postId)) return { ok: false, error: '이미 이의신청 검토 중입니다.' };
    const list = read(K.appeals, []), a = { id: 'a' + uid(), board: p.board, postId, title: p.title, by: m.id, byName: m.name, text, at: Date.now(), status: 'pending', reply: '' };
    list.push(a);
    if (!write(K.appeals, list)) return { ok: false, error: '이의신청을 저장하지 못했습니다.' };
    notifyAdmins('appeal', '새 이의신청: ' + p.title, 'mypage.html#admin/appeals');
    return { ok: true, appeal: a };
  }
  function resolveAppeal(id, accepted, reply) {
    if (!isAdmin()) return { ok: false, error: '관리자만 처리할 수 있습니다.' };
    const list = read(K.appeals, []), a = list.find(x => x.id === id);
    if (!a || a.status !== 'pending') return { ok: false, error: '이미 처리되었거나 없는 신청입니다.' };
    if (accepted && getPost(a.postId) && !setPostHidden(a.postId, false)) return { ok: false, error: '숨김을 해제하지 못했습니다.' };
    a.status = accepted ? 'accepted' : 'rejected'; a.reply = String(reply || '').trim().slice(0, 500);
    if (!write(K.appeals, list)) return { ok: false, error: '처리 결과를 저장하지 못했습니다.' };
    notify({ to: a.by, type: 'appeal', text: '“' + a.title + '” 이의신청이 ' + (accepted ? '수락' : '거절') + '되었습니다.' + (a.reply ? ' 답변: ' + a.reply : ''), link: commentHref(a.board, a.postId) });
    return { ok: true };
  }
  function savePost(f) {
    if (writeError()) return null;
    const list = rawPosts(), html = sanitize(f.html);
    let p = f.id && list.find(x => x.id === f.id);
    if (p) { p.title = f.title; p.html = html; p.anon = !!f.anon; p.edited = Date.now(); }
    else { const m = me(); p = { id: 'u' + uid(), board: f.board, title: f.title, html, anon: !!f.anon, owner: ownerKey(), name: m ? m.name : '게스트', date: today(), at: Date.now(), views: 0 }; list.push(p); p._new = true; }
    const isNew = p._new; delete p._new;
    if (!write(K.posts, list)) return null;
    if (isNew && (f.board === 'notice' || f.board === 'bulletin')) notifyAll(f.board === 'notice' ? 'notice' : 'bulletin', (f.board === 'notice' ? '새 공지사항: ' : '새 주보: ') + p.title, 'board-view.html?b=' + f.board + '&id=' + p.id);
    return p;
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
      .map(c => ({ id: c.id, text: c.text, date: c.date, at: c.at, parent: c.parent || null, name: displayAuthor(c), authorId: c.anon || !users().some(u => u.id === c.owner) ? null : c.owner, mine: isMine(c.owner) }));
    return (/^\d+$/.test(String(id)) ? fakeComments(b, +id) : []).concat(mine);
  }
  function commentHref(board, postId, commentId) {
    const id = encodeURIComponent(postId);
    const page = board === 'album' ? 'album-view.html?a=' + id : 'board-view.html?b=' + encodeURIComponent(board) + '&id=' + id;
    return commentId ? page + '#c-' + encodeURIComponent(commentId) : page;
  }
  function addComment(f) {
    if (writeError()) return false;
    const list = rawComments(), m = me();
    let parent = f.parent ? String(f.parent) : null;                        // 답글은 1단계만: 답글에 단 답글은 원래 댓글 아래로
    const pc = parent && list.find(c => c.id === parent); if (pc && pc.parent) parent = pc.parent;
    const c = { id: 'c' + uid(), board: f.board, postId: String(f.postId), text: f.text, anon: !!f.anon, owner: ownerKey(), name: m ? m.name : '게스트', date: today(), at: Date.now() };
    if (parent) c.parent = parent;
    list.push(c);
    if (!write(K.comments, list)) return false;
    /* 알림: 내 글에 댓글 → 글쓴이 / 내 댓글에 답글 → 댓글 쓴이 */
    try {
      const who = c.anon ? '익명' : c.name, post = getPost(c.postId), link = commentHref(c.board, c.postId, c.id);
      const title = post ? post.title : ((BOARDS[c.board] && BOARDS[c.board].titles[+c.postId - 1]) || '글');
      const replyTo = (pc || {}).owner;
      if (parent && replyTo && replyTo !== c.owner) notify({ to: replyTo, type: 'reply', text: who + '님이 내 댓글에 답글을 남겼습니다: ' + c.text.slice(0, 40), link });
      if (post && post.owner !== c.owner && post.owner !== replyTo) notify({ to: post.owner, type: 'comment', text: who + '님이 “' + title.slice(0, 30) + '” 글에 댓글을 남겼습니다', link });
    } catch (e) {}
    return true;
  }
  function deleteComment(id) { return write(K.comments, rawComments().filter(c => c.id !== id && c.parent !== id)); }   // 답글도 함께
  function myComments() {
    const posts = new Map(rawPosts().map(p => [p.id, p]));
    return rawComments().filter(c => isMine(c.owner) && (!posts.has(c.postId) || canSeePost(posts.get(c.postId))))
      .sort((a, b) => b.at - a.at).map(c => {
        const p = posts.get(c.postId);
        const target = c.board === 'album' ? ALBUMS.find(a => a.id === +c.postId)?.title : BOARDS[c.board]?.titles[+c.postId - 1];
        return { id: c.id, board: c.board, postId: c.postId, postTitle: p?.title || target || '(삭제된 글)', hidden: !!p?.hidden, text: c.text, at: c.at, isReply: !!c.parent };
      });
  }

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

  window.Store = { me, usernameTaken, signup, hasRequiredConsents, signupBirthError, login, logout, updateProfile, cancelPending, changePassword, withdraw, resetAll, isAdmin, setAdmin, pendingList, resolvePending,
    SENS, SENS_LABEL, allPosts, getPost, canSeePost, setPostHidden, hiddenPosts, appeals, pendingAppeal, submitAppeal, resolveAppeal, activeBan, writeError, sanctionUser, liftSanction, verifyPassword, commentHref, savePost, deletePost, addView, myPosts, isMine, commentsOf, commentCount, addComment, deleteComment, sanitize, resizeImage, usageKB, today };
  /* v3-A 회원 확장 내보내기 (A 채팅 구역) */
  Object.assign(window.Store, { userCard, profileOf, postsOfUser, statusOf, privOf, setPrivacy, PRIV_FIELDS, PRIV_LABEL, PRIV_DEFAULT, GROUP_NAMES, EDU, PARISHES, parishName, groupName, groupText,
    leaderIds, setLeader, leaderOf, isLeader, affilQueue, resolveAffil, signupList, resolveSignup, prefs, setPref, allMembers });

  /* ===== v3-B: 알림 · 신고 · 내 댓글 (B 채팅 구역) =====
     - 알림 {id,to,type,text,link,at,read}: to = 회원 id 또는 'admin'(관리자 모드에서 보임)
     - 받는 사람이 그 종류를 꺼 두었으면 만들지 않는다. */
  const NOTIF_TYPES = [
    { id: 'report', label: '신고 접수', desc: '새 신고가 접수되면 알려 드려요 (관리자)' },
    { id: 'appeal', label: '이의신청', desc: '이의신청 접수와 처리 결과를 알려 드려요' },
    { id: 'sanction', label: '이용 제재', desc: '이용 제재와 해제를 알려 드려요' },
    { id: 'signup',   label: '새 가입 신청',      desc: '새 회원이 가입을 신청하면 알려 드려요 (관리자)' },
    { id: 'approval', label: '가입·정보 변경 승인', desc: '내 가입이나 정보 변경이 승인되면 알려 드려요' },
    { id: 'group',    label: '소속·교구 승인',     desc: '소속·교구 신청과 그 결과를 알려 드려요' },
    { id: 'comment',  label: '내 글에 댓글',      desc: '내 글에 댓글이 달리면 알려 드려요' },
    { id: 'reply',    label: '내 댓글에 답글',     desc: '내 댓글에 답글이 달리면 알려 드려요' },
    { id: 'bulletin', label: '주보',            desc: '새 주보가 올라오면 알려 드려요' },
    { id: 'notice',   label: '공지사항',         desc: '새 공지사항이 올라오면 알려 드려요' }
  ];
  const TYPE_IDS = NOTIF_TYPES.map(t => t.id);
  const allPrefs = () => read(K.nprefs, {});
  const prefsOf = uidv => { const o = allPrefs()[uidv] || {}, r = {}; TYPE_IDS.forEach(t => { r[t] = o[t] !== false; }); return r; };
  const notifPrefs = () => { const m = me(); return prefsOf(m ? m.id : '_'); };
  function setNotifPref(type, on) {
    const m = me(); if (!m || TYPE_IDS.indexOf(type) < 0) return false;
    const all = allPrefs(); all[m.id] = Object.assign({}, all[m.id], { [type]: !!on }); return write(K.nprefs, all);
  }
  function notify(f) {
    if (!f || !f.to || TYPE_IDS.indexOf(f.type) < 0) return null;
    if (f.to !== 'admin' && !prefsOf(f.to)[f.type]) return null;
    const list = read(K.notifs, []), n = { id: 'n' + uid(), to: f.to, type: f.type, text: String(f.text || ''), link: f.link || '', at: Date.now(), read: false };
    list.push(n); if (list.length > 300) list.splice(0, list.length - 300);
    write(K.notifs, list);
    if (window.dispatchEvent) window.dispatchEvent(new Event('pdh-notifs'));
    return n;
  }
  // 관리자는 회원 속성이 아니라 이 기기의 모드 토글이다. 공용 관리자 수신함은 모든 관리자 모드 회원에게 보인다.
  function notifyAdmins(type, text, link) { return notify({ to: 'admin', type, text, link }); }
  function notifyAll(type, text, link) { const m = me(); users().forEach(u => { if (!m || u.id !== m.id) notify({ to: u.id, type, text, link }); }); }
  function myNotifs(o) {
    const m = me(); if (!m) return [];
    const p = prefsOf(m.id), adm = isAdmin();
    let l = read(K.notifs, []).filter(n => n.to === m.id || (n.to === 'admin' && adm && p[n.type])).sort((a, b) => b.at - a.at);
    const hidden = new Set(rawPosts().filter(post => !canSeePost(post)).map(post => commentHref(post.board, post.id)));
    if (hidden.size) l = l.filter(n => !hidden.has((n.link || '').split('#')[0]));
    if (o && o.unreadOnly) l = l.filter(n => !n.read);
    return l;
  }
  const unreadCount = () => myNotifs({ unreadOnly: true }).length;
  function markNotifs(pred) { const ids = new Set(myNotifs().filter(pred).map(n => n.id)), l = read(K.notifs, []); l.forEach(n => { if (ids.has(n.id)) n.read = true; }); write(K.notifs, l); }
  const readNotif = id => markNotifs(n => n.id === id);
  const readAllNotifs = () => markNotifs(() => true);

  /* 신고: {kind:'post'|'comment'|'image', id, reason, text, link?, label?} */
  function report(f) {
    if (writeError()) return null;
    if (!f || !f.kind || !f.id) return null;
    const m = me(), list = read(K.reports, []);
    const r = { id: 'r' + uid(), kind: f.kind, targetId: String(f.id), reason: f.reason || '', text: f.text || '', link: f.link || '', label: f.label || '', by: m ? m.id : 'guest', byName: m ? m.name : '게스트', at: Date.now(), done: false };
    list.push(r); if (!write(K.reports, list)) return null;
    notifyAdmins('report', '새 신고가 접수되었습니다: ' + (r.label || r.reason || '신고 내용 확인'), 'mypage.html#admin/reports');
    return r;
  }
  const reports = () => isAdmin() ? read(K.reports, []).sort((a, b) => b.at - a.at) : [];
  function resolveReport(id) { if (!isAdmin()) return false; const l = read(K.reports, []), r = l.find(x => x.id === id); if (r) { r.done = true; write(K.reports, l); } }
  const deleteReport = id => isAdmin() && write(K.reports, read(K.reports, []).filter(x => x.id !== id));

  /* 작성자 카드: A의 Store.userCard가 있으면 그것을 쓰고, 없을 때만 이 임시 버전을 쓴다 */
  function cardFallback(id) {
    if (!id) return null; id = String(id);
    if (id.indexOf('demo:') === 0) return { id, name: id.slice(5), avatar: null };
    const u = users().find(x => x.id === id); return u ? { id, name: u.name, avatar: u.photo || u.avatar || null } : null;
  }
  const api = { NOTIF_TYPES, notify, myNotifs, unreadCount, readNotif, readAllNotifs, notifPrefs, setNotifPref, myComments, report, reports, resolveReport, deleteReport };
  if (!window.Store.userCard) api.userCard = cardFallback;
  Object.assign(window.Store, api);
})();
