/* ============================================================
   소속 선택 창 (Affil)
   - 회원가입·마이페이지에서 "소속 선택" 버튼을 누르면 뜨는 창.
   - 전역 이름은 window.Affil 하나만 쓰고, CSS 클래스는 모두 af- 로 시작합니다.

   API
     Affil.GROUPS                   섹션별 소속 목록 (id·이름은 바꾸지 말 것)
     Affil.open({ birth, selected })
         birth:    'YYYY-MM-DD' 또는 ''
         selected: [{id, role}]   (role: 'student' | 'teacher' | 'member')
         → Promise<[{id, role}] | null>   ([] = 무소속, null = 취소)
     Affil.label(selected)          '중고등부 · 제2남전도회 · 유치부 교사' ([]이면 '무소속')
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 소속 목록 ---------- */
  var EDU_ROLES = ['student', 'teacher'];
  var GROUPS = [
    { id: 'edu', title: '교육부서', items: [
      { id: 'infant', name: '유아부',   note: '0~4세',   section: 'edu', roles: EDU_ROLES },
      { id: 'kinder', name: '유치부',   note: '5~7세',   section: 'edu', roles: EDU_ROLES },
      { id: 'elem1',  name: '초등1부',  note: '초1~3',   section: 'edu', roles: EDU_ROLES },
      { id: 'elem2',  name: '초등2부',  note: '초4~6',   section: 'edu', roles: EDU_ROLES },
      { id: 'youth',  name: '중고등부', note: '중1~고3', section: 'edu', roles: EDU_ROLES }
    ] },
    { id: 'young', title: '청년부', items: [
      { id: 'young1', name: '청년1부', section: 'young', roles: ['member'] },
      { id: 'young2', name: '청년2부', section: 'young', roles: ['member'] },
      { id: 'young3', name: '청년3부', section: 'young', roles: ['member'] }
    ] },
    { id: 'men', title: '남전도회', items: [1, 2, 3, 4, 5].map(function (n) {
      return { id: 'men' + n, name: '제' + n + '남전도회', section: 'men', roles: ['member'] };
    }) },
    { id: 'women', title: '여전도회', items: [1, 2, 3, 4, 5].map(function (n) {
      return { id: 'women' + n, name: '제' + n + '여전도회', section: 'women', roles: ['member'] };
    }) },
    { id: 'serve', title: '찬양·봉사', items: [
      { id: 'choir1',   name: '시온찬양대',   section: 'serve', roles: ['member'] },
      { id: 'choir2',   name: '호산나찬양대', section: 'serve', roles: ['member'] },
      { id: 'praise',   name: '찬양팀',       section: 'serve', roles: ['member'] },
      { id: 'newcomer', name: '새가족부',     section: 'serve', roles: ['member'] },
      { id: 'media',    name: '방송부',       section: 'serve', roles: ['member'] }
    ] }
  ];
  var BY_ID = {}, ORDER = {}, SECTION = {};
  GROUPS.forEach(function (g) { g.items.forEach(function (it) { ORDER[it.id] = Object.keys(BY_ID).length; BY_ID[it.id] = it; SECTION[it.id] = g; }); });

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function itemLabel(s) {
    var it = BY_ID[s.id]; if (!it) return '';
    return it.name + (s.role === 'teacher' ? ' 교사' : '');
  }
  function label(selected) {
    var arr = (selected || []).map(itemLabel).filter(Boolean);
    return arr.length ? arr.join(' · ') : '무소속';
  }

  /* ---------- 나이 ---------- */
  function ageOf(birth) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birth || ''); if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3], now = new Date();
    if (mo < 1 || mo > 12 || d < 1 || d > 31 || y > now.getFullYear()) return null;
    var a = now.getFullYear() - y;
    if (now.getMonth() + 1 < mo || (now.getMonth() + 1 === mo && now.getDate() < d)) a--;
    return a < 0 ? null : a;
  }
  /* 나이에 맞는 교육부서 (만 나이 기준 안내용. 아니요를 누르면 다른 부서를 고를 수 있음) */
  function eduForAge(a) {
    if (a <= 4) return 'infant';
    if (a <= 6) return 'kinder';
    if (a <= 9) return 'elem1';
    if (a <= 12) return 'elem2';
    return 'youth';
  }

  /* ---------- 상태 ---------- */
  var S = null;   // 열려 있는 창의 상태 (한 번에 하나만)

  var clone = function (a) { return a.map(function (x) { return { id: x.id, role: x.role }; }); };
  var roleOf = function (id) { for (var i = 0; i < S.sel.length; i++) if (S.sel[i].id === id) return S.sel[i].role; return null; };
  function setSel(id, role) {
    S.sel = S.sel.filter(function (x) { return x.id !== id; });
    if (role) S.sel.push({ id: id, role: role });
  }
  function sortedSel(a) { return clone(a).sort(function (x, y) { return ORDER[x.id] - ORDER[y.id]; }); }
  function isMinor() { return S.age !== null ? S.age < 19 : S.minorAns; }   // 생일 모르면 첫 질문 답, 아직 모르면 null

  /* ---------- 간편 선택 질문 순서 ---------- */
  function steps() {
    return isMinor()
      ? ['eduAge', 'serve']
      : ['young', 'men', 'women', 'teacher', 'serve'];
  }
  var Q = {
    young:   { q: '청년부인가요?',               pick: '몇 부인가요?',        ids: ['young1', 'young2', 'young3'],             txt: ['1부', '2부', '3부'] },
    men:     { q: '남전도회에 속해 있나요?',     pick: '몇 전도회인가요?',    ids: ['men1', 'men2', 'men3', 'men4', 'men5'],   txt: ['제1', '제2', '제3', '제4', '제5'] },
    women:   { q: '여전도회에 속해 있나요?',     pick: '몇 전도회인가요?',    ids: ['women1', 'women2', 'women3', 'women4', 'women5'], txt: ['제1', '제2', '제3', '제4', '제5'] },
    teacher: { q: '교회학교 교사로 섬기시나요?', multi: '어느 부서인가요? (여럿 고를 수 있어요)', ids: ['infant', 'kinder', 'elem1', 'elem2', 'youth'], role: 'teacher' },
    serve:   { q: '찬양대나 봉사팀에 계신가요?', multi: '어디인가요? (여럿 고를 수 있어요)',        ids: ['choir1', 'choir2', 'praise', 'newcomer', 'media'], role: 'member' }
  };

  /* ---------- 화면 만들기 ---------- */
  var ic = function (n) { return '<span class="ms af-ic" aria-hidden="true">' + n + '</span>'; };
  var big = function (act, v, icon, t, sub) {
    return '<button type="button" class="af-big" data-af="' + act + '"' + (v != null ? ' data-v="' + esc(v) + '"' : '') + '>' + ic(icon) +
      '<span class="af-big-t"><b>' + esc(t) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span>' + ic('chevron_right').replace('af-ic', 'af-ic af-go') + '</button>';
  };
  var yn = function (yes, no, yesT, noT) {
    return '<div class="af-yn"><button type="button" class="af-yes" data-af="' + yes + '">' + (yesT || '예') + '</button>' +
      '<button type="button" class="af-no" data-af="' + no + '">' + (noT || '아니요') + '</button></div>';
  };
  var chosenNote = function () {
    return S.sel.length ? '<p class="af-note">지금까지 고르신 곳: <b>' + esc(label(sortedSel(S.sel))) + '</b></p>' : '';
  };

  var SCREENS = {
    home: function () {
      var cur = S.sel.length ? '<p class="af-note">지금 고르신 곳: <b>' + esc(label(sortedSel(S.sel))) + '</b></p>' : '';
      return { title: '소속을 골라 주세요', noBack: true, html: cur + '<p class="af-lead">편한 방법을 눌러 주세요.</p><div class="af-stack">' +
        big('to-list', null, 'checklist', '목록에서 고르기', '전체 목록을 보고 직접 고릅니다') +
        big('to-easy', null, 'quiz', '간편 선택', '질문에 "예·아니요"로 답하면 됩니다') +
        big('to-none', null, 'person_off', '무소속', '어느 곳에도 속해 있지 않아요') + '</div>' };
    },

    /* --- 목록에서 고르기 --- */
    list: function () {
      var adult = S.age !== null ? S.age >= 19 : false;     // 생일 모르면 모두 보여 줌
      var h = '';
      GROUPS.forEach(function (g) {
        h += '<section class="af-sec"><h3 class="af-sh">' + esc(g.title) + '</h3>';
        g.items.forEach(function (it) {
          if (g.id === 'edu') {
            var showStudent = !adult || roleOf(it.id) === 'student';
            h += '<div class="af-edu"><div class="af-edu-n"><b>' + esc(it.name) + '</b><small>' + esc(it.note) + '</small></div><div class="af-edu-b">' +
              (showStudent ? '<button type="button" class="af-tg" data-af="toggle" data-id="' + it.id + '" data-role="student" aria-pressed="false">' + ic('check') + '학생</button>' : '') +
              '<button type="button" class="af-tg" data-af="toggle" data-id="' + it.id + '" data-role="teacher" aria-pressed="false">' + ic('check') + '교사</button></div></div>';
          } else {
            h += '<button type="button" class="af-row" role="checkbox" aria-checked="false" data-af="toggle" data-id="' + it.id + '" data-role="member"><span class="af-box-ck">' + ic('check') + '</span><b>' + esc(it.name) + '</b></button>';
          }
        });
        h += '</section>';
      });
      return { title: '목록에서 고르기', html: h, list: true, foot: '<button type="button" class="af-main" data-af="list-done"></button>' };
    },

    /* --- 무소속 확인 --- */
    none: function () {
      return { title: '무소속으로 하시겠어요?', html: '<p class="af-lead">어느 부서·기관에도 속하지 않은 것으로 저장합니다.<br>나중에 마이페이지에서 바꿀 수 있어요.</p>',
        foot: '<button type="button" class="af-main" data-af="finish-none">확인</button>' };
    },

    /* --- 간편 선택 --- */
    minor: function () {
      return { title: '학생인가요?', html: '<p class="af-lead">생일 정보가 없어서 먼저 여쭤봅니다.</p>' + yn('minor-yes', 'minor-no') };
    },
    ask: function (p) {
      var k = steps()[p.i];
      if (k === 'eduAge') {
        if (S.age === null) return SCREENS.eduPick({ i: p.i, all: true });
        var id = eduForAge(S.age);
        return { title: BY_ID[id].name + '인가요?', html: '<p class="af-lead">' + esc(BY_ID[id].note) + ' 학생 부서예요.</p>' + yn('edu-yes', 'edu-no') + chosenNote() };
      }
      return { title: Q[k].q, html: yn('ask-yes', 'ask-no') + chosenNote() };
    },
    eduPick: function (p) {
      var skip = p.all ? null : eduForAge(S.age);
      var ids = ['infant', 'kinder', 'elem1', 'elem2', 'youth'].filter(function (x) { return x !== skip; });
      var h = '<div class="af-stack">' + ids.map(function (id) {
        return '<button type="button" class="af-opt" data-af="edu-pick" data-id="' + id + '"><b>' + esc(BY_ID[id].name) + '</b><small>' + esc(BY_ID[id].note) + '</small></button>';
      }).join('') + '<button type="button" class="af-opt af-none" data-af="step-skip">해당 없음</button></div>';
      return { title: p.all ? '어느 교육부서에 다니나요?' : '그럼 어느 부서인가요?', html: h };
    },
    pick: function (p) {
      var q = Q[steps()[p.i]];
      return { title: q.pick, html: '<div class="af-grid">' + q.ids.map(function (id, n) {
        return '<button type="button" class="af-opt af-num" data-af="pick" data-id="' + id + '">' + esc(q.txt[n]) + '</button>';
      }).join('') + '</div>' };
    },
    multi: function (p) {
      var q = Q[steps()[p.i]];
      var h = '<div class="af-stack">' + q.ids.map(function (id) {
        return '<button type="button" class="af-row" role="checkbox" aria-checked="false" data-af="toggle" data-id="' + id + '" data-role="' + q.role + '"><span class="af-box-ck">' + ic('check') + '</span><b>' + esc(BY_ID[id].name) + '</b></button>';
      }).join('') + '</div>';
      return { title: q.multi, html: h, multi: q, foot: '<button type="button" class="af-main" data-af="multi-done">선택 완료</button>' };
    },
    more: function () {
      return { title: '더 있으신가요?', html: chosenNote() + '<div class="af-yn"><button type="button" class="af-yes" data-af="more-yes">더 있어요</button><button type="button" class="af-no" data-af="more-no">끝이에요</button></div>' };
    },
    summary: function () {
      var sel = sortedSel(S.sel);
      if (!sel.length) {
        return { title: '무소속으로 할까요?', html: '<p class="af-lead">고르신 곳이 없어요.</p>',
          foot: '<button type="button" class="af-main" data-af="finish">확인</button><button type="button" class="af-sub" data-af="redo">다시 고르기</button>' };
      }
      var h = '<ul class="af-sum">' + sel.map(function (s) {
        return '<li><small>' + esc(SECTION[s.id].title) + '</small><b>' + esc(BY_ID[s.id].name) + '</b>' +
          (s.role === 'student' ? '<i>학생</i>' : s.role === 'teacher' ? '<i>교사</i>' : '') + '</li>';
      }).join('') + '</ul>';
      return { title: '이렇게 고르셨어요', html: h,
        foot: '<button type="button" class="af-main" data-af="finish">확인</button><button type="button" class="af-sub" data-af="redo">다시 고르기</button>' };
    }
  };

  /* ---------- 화면 이동 ---------- */
  function go(name, params) {
    S.hist.push({ name: name, p: params || {}, sel: clone(S.sel), minorAns: S.minorAns });
    render(true);
  }
  function back() {
    if (S.hist.length < 2) return;
    S.hist.pop();
    var e = S.hist[S.hist.length - 1];
    S.sel = clone(e.sel); S.minorAns = e.minorAns;
    render(true);
  }
  function nextStep(i) {   // i번째 질문 다음으로
    var n = i + 1;
    if (n >= steps().length) go('summary'); else go('ask', { i: n });
  }
  function cur() { return S.hist[S.hist.length - 1]; }

  function render(focusTitle) {
    var e = cur(), sc = SCREENS[e.name](e.p), el = S.el;
    S.sc = sc;
    el.back.hidden = !!sc.noBack;
    el.main.innerHTML = '<h2 class="af-h" id="af-t" tabindex="-1">' + esc(sc.title) + '</h2>' + sc.html;
    el.foot.innerHTML = sc.foot || '';
    el.foot.hidden = !sc.foot;
    el.scroll.scrollTop = 0;
    el.main.classList.remove('af-in'); void el.main.offsetWidth; el.main.classList.add('af-in');
    syncChecks();
    if (focusTitle) { var t = el.main.querySelector('.af-h'); t && t.focus({ preventScroll: true }); }
  }

  /* 체크 표시와 아래 버튼 글자 갱신 (화면 전체를 다시 그리지 않아 스크롤이 유지됨) */
  function syncChecks() {
    S.el.box.querySelectorAll('[data-af="toggle"]').forEach(function (b) {
      var on = roleOf(b.dataset.id) === b.dataset.role;
      if (b.getAttribute('role') === 'checkbox') b.setAttribute('aria-checked', on); else b.setAttribute('aria-pressed', on);
      b.classList.toggle('on', on);
    });
    var sc = S.sc, b;
    if (sc && sc.list && (b = S.el.foot.querySelector('.af-main'))) {
      var n = S.sel.length;
      b.textContent = n ? n + '개 선택 완료' : '무소속으로 하기';
      b.classList.toggle('af-ghost', !n);
    }
  }

  /* ---------- 동작 ---------- */
  var ACT = {
    'to-list': function () { go('list'); },
    'to-easy': function () {
      S.sel = []; S.minorAns = null;
      if (S.age === null) go('minor'); else go('ask', { i: 0 });
    },
    'to-none': function () { go('none'); },
    'toggle': function (b) {
      var id = b.dataset.id, role = b.dataset.role;
      setSel(id, roleOf(id) === role ? null : role);   // 교육부서는 학생·교사 중 하나만
      syncChecks();
    },
    'list-done': function () { if (S.sel.length) finish(sortedSel(S.sel)); else go('none'); },
    'finish-none': function () { finish([]); },
    'finish': function () { finish(sortedSel(S.sel)); },
    'redo': function () {
      S.hist = [S.hist[0]];    // 처음(home)으로 돌아가 간편 선택을 새로 시작
      ACT['to-easy']();
    },
    'minor-yes': function () { S.minorAns = true; go('ask', { i: 0 }); },
    'minor-no': function () { S.minorAns = false; go('ask', { i: 0 }); },
    'edu-yes': function () { setSel(eduForAge(S.age), 'student'); go('more', { i: cur().p.i }); },
    'edu-no': function () { go('eduPick', { i: cur().p.i }); },
    'edu-pick': function (b) { setSel(b.dataset.id, 'student'); go('more', { i: cur().p.i }); },
    'step-skip': function () { nextStep(cur().p.i); },
    'ask-yes': function () {
      var i = cur().p.i, q = Q[steps()[i]];
      go(q.multi ? 'multi' : 'pick', { i: i });
    },
    'ask-no': function () { nextStep(cur().p.i); },
    'pick': function (b) { setSel(b.dataset.id, 'member'); go('more', { i: cur().p.i }); },
    'multi-done': function () {
      var i = cur().p.i, q = S.sc.multi, got = S.sel.some(function (s) { return q.ids.indexOf(s.id) >= 0; });
      if (got) go('more', { i: i }); else nextStep(i);
    },
    'more-yes': function () { nextStep(cur().p.i); },
    'more-no': function () { go('summary'); }
  };

  function finish(v) { close(v); }

  /* ---------- 열기·닫기 ---------- */
  var FOCUSABLE = 'button:not([disabled]):not([hidden]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  function onKey(e) {
    if (!S) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(null); return; }
    if (e.key === 'Tab') {   // 창 밖으로 포커스가 나가지 않게
      var f = [].filter.call(S.el.box.querySelectorAll(FOCUSABLE), function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (!S.el.box.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && (document.activeElement === first || document.activeElement.id === 'af-t')) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  function close(value) {
    if (!S) return;
    var s = S; S = null;
    document.removeEventListener('keydown', onKey, true);
    s.el.ov.classList.remove('af-show');
    var done = function () { s.el.ov.remove(); };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) done(); else setTimeout(done, 160);
    document.body.classList.remove('af-lock'); document.body.style.paddingRight = s.padRight;
    if (s.prev && s.prev.focus && document.contains(s.prev)) { try { s.prev.focus({ preventScroll: true }); } catch (er) { s.prev.focus(); } }
    s.resolve(value);
  }

  function open(opt) {
    opt = opt || {};
    if (S) close(null);
    return new Promise(function (resolve) {
      var ov = document.createElement('div');
      ov.className = 'af-ov';
      ov.innerHTML = '<div class="af-box" role="dialog" aria-modal="true" aria-labelledby="af-t">' +
        '<div class="af-top"><button type="button" class="af-back" data-af="back">' + ic('arrow_back') + '이전</button>' +
        '<button type="button" class="af-x" data-af="cancel" aria-label="닫기">' + ic('close') + '</button></div>' +
        '<div class="af-main-w"><div class="af-scr"></div></div><div class="af-foot" hidden></div></div>';
      var box = ov.firstChild;
      var main = box.querySelector('.af-scr');
      S = {
        age: ageOf(opt.birth), minorAns: null, resolve: resolve, prev: document.activeElement,
        sel: clone((opt.selected || []).filter(function (s) { return s && BY_ID[s.id] && BY_ID[s.id].roles.indexOf(s.role) >= 0; })),
        el: { ov: ov, box: box, main: main, scroll: box.querySelector('.af-main-w'), back: box.querySelector('.af-back'), foot: box.querySelector('.af-foot') },
        padRight: document.body.style.paddingRight
      };
      S.hist = [{ name: 'home', p: {}, sel: clone(S.sel), minorAns: null }];
      /* 스크롤바가 사라져 화면이 흔들리지 않게 */
      var sbw = window.innerWidth - document.documentElement.clientWidth;
      document.body.classList.add('af-lock'); if (sbw > 0) document.body.style.paddingRight = sbw + 'px';
      ov.addEventListener('click', function (e) {
        var b = e.target.closest('[data-af]'); if (!b || !S) return;
        var a = b.dataset.af;
        if (a === 'back') back(); else if (a === 'cancel') close(null); else if (ACT[a]) ACT[a](b);
      });
      document.addEventListener('keydown', onKey, true);
      document.body.appendChild(ov);
      render(false);
      requestAnimationFrame(function () { ov.classList.add('af-show'); var t = main.querySelector('.af-h'); t && t.focus({ preventScroll: true }); });
    });
  }

  window.Affil = { GROUPS: GROUPS, open: open, label: label };
})();
