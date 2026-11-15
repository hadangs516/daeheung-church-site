/* ============================================================
   화면 계층 (디자인과 무관)
   HTML의 data-* 속성을 읽어서 채운다. 디자인(HTML/CSS)을 통째로 바꿔도
   속성 이름만 지키면 그대로 동작한다. 속성 설명은 DESIGN-HANDOFF.md 참고.
   ============================================================ */
(function () {
  'use strict';
  var Ch = window.Church, C = Ch.config, doc = document;
  var params = {}, counts = {}, ctx;

  /* ---------- 도구 ---------- */
  (function () {
    var q = location.search.replace(/^\?/, '');
    if (!q) return;
    q.split('&').forEach(function (kv) {
      var i = kv.indexOf('='), k = i < 0 ? kv : kv.slice(0, i), v = i < 0 ? '' : kv.slice(i + 1);
      try { params[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' ')); } catch (e) { params[k] = v; }
    });
  })();

  function $all(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }
  function enc(s) { return encodeURIComponent(s); }
  function truthy(v) { return Array.isArray(v) ? v.length > 0 : !!v; }
  function hide(el, on) { if (on) el.setAttribute('hidden', ''); else el.removeAttribute('hidden'); }
  function getPath(obj, path) {
    var cur = obj;
    String(path).split('.').forEach(function (k) { cur = cur == null ? cur : cur[k]; });
    return cur;
  }
  function withSelf(root, sel) {
    var list = $all(sel, root);
    if (root.nodeType === 1 && root.matches && root.matches(sel)) list.unshift(root);
    return list;
  }
  function koShort(iso) { var p = iso.split('-'); return (+p[1]) + '월 ' + (+p[2]) + '일'; }
  function queryWith(over) {
    var o = {}, k, parts = [];
    for (k in params) { o[k] = params[k]; }
    for (k in over) { if (over[k] === '' || over[k] == null) delete o[k]; else o[k] = over[k]; }
    for (k in o) { parts.push(enc(k) + '=' + enc(o[k])); }
    return parts.length ? '?' + parts.join('&') : '';
  }
  function pageName() { return location.pathname.split('/').pop() || 'index.html'; }

  /* ---------- 본문 블록 ----------
     빈 줄로 문단을 나눈다. 모든 줄에 | 가 있는 덩어리는 표로 만든다. */
  function renderBlocks(el, text) {
    el.textContent = '';
    String(text || '').replace(/\r/g, '').split(/\n\s*\n/).forEach(function (block) {
      var lines = block.split('\n').filter(function (l) { return l.replace(/\s/g, ''); }), tbl, tr, p;
      if (!lines.length) return;
      if (lines.every(function (l) { return l.indexOf('|') >= 0; })) {
        tbl = doc.createElement('table');
        lines.forEach(function (l) {
          tr = doc.createElement('tr');
          l.split('|').forEach(function (c, i) {
            var cell = doc.createElement(i === 0 ? 'th' : 'td');
            cell.textContent = c.replace(/^\s+|\s+$/g, '');
            tr.appendChild(cell);
          });
          tbl.appendChild(tr);
        });
        el.appendChild(tbl);
      } else {
        p = doc.createElement('p');
        lines.forEach(function (l, i) {
          if (i) p.appendChild(doc.createElement('br'));
          p.appendChild(doc.createTextNode(l));
        });
        el.appendChild(p);
      }
    });
  }

  /* ---------- 대화상자 (공지, 사진 크게 보기) ---------- */
  var dlgNotice, dlgView;
  function makeDialog(cls) {
    var d = doc.createElement('dialog');
    d.className = 'ch-dialog ' + cls;
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    doc.body.appendChild(d);
    return d;
  }
  function openDialog(d) {
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
  }
  function button(text, cls, fn) {
    var b = doc.createElement('button');
    b.type = 'button'; b.className = cls; b.textContent = text;
    b.addEventListener('click', fn);
    return b;
  }
  function showNotice(key) {
    var msg = (C.messages && C.messages[key]) || key;
    if (!dlgNotice) dlgNotice = makeDialog('ch-notice');
    dlgNotice.textContent = '';
    var p = doc.createElement('p');
    p.className = 'ch-dialog-msg';
    p.textContent = msg;
    dlgNotice.appendChild(p);
    dlgNotice.appendChild(button('확인', 'ch-btn', function () { dlgNotice.close(); }));
    openDialog(dlgNotice);
  }
  function openViewer(row) {
    var id = row.id, big = row.bigUrl || Ch.drive.thumb(id, 1600), body, bar, img, a;
    if (!dlgView) dlgView = makeDialog('ch-viewer');
    dlgView.textContent = '';
    bar = doc.createElement('div'); bar.className = 'ch-viewer-bar';
    var t = doc.createElement('strong'); t.textContent = row.title || '';
    bar.appendChild(t);
    a = doc.createElement('a'); a.className = 'ch-btn'; a.textContent = '다운로드';
    a.href = row.downloadUrl || Ch.drive.download(id); a.target = '_blank'; a.rel = 'noopener';
    bar.appendChild(a);
    bar.appendChild(button('닫기', 'ch-btn', function () { dlgView.close(); }));
    body = doc.createElement('div'); body.className = 'ch-viewer-body';
    img = doc.createElement('img'); img.alt = row.title || '';
    img.onerror = function () {   // 썸네일이 안 열리면 드라이브 미리보기 화면으로 대신한다
      var f = doc.createElement('iframe');
      f.src = Ch.drive.preview(id); f.title = row.title || '미리보기';
      body.textContent = ''; body.appendChild(f);
    };
    img.src = big;
    body.appendChild(img);
    dlgView.appendChild(bar); dlgView.appendChild(body);
    openDialog(dlgView);
  }

  /* ---------- 칸 채우기 ---------- */
  function fill(root, row) {
    withSelf(root, '[data-text]').forEach(function (el) {
      var v = row[el.getAttribute('data-text')];
      el.textContent = v == null ? '' : v;
    });
    withSelf(root, '[data-href]').forEach(function (el) {
      var v = row[el.getAttribute('data-href')];
      if (v) { el.setAttribute('href', v); if (/^https?:/i.test(v) && el.hasAttribute('data-external')) { el.target = '_blank'; el.rel = 'noopener'; } }
      else { el.removeAttribute('href'); if (el.hasAttribute('data-href-optional')) hide(el, true); }
    });
    withSelf(root, '[data-src]').forEach(function (el) {
      var v = row[el.getAttribute('data-src')], alt = el.getAttribute('data-alt');
      if (alt) el.setAttribute('alt', row[alt] || '');
      if (v) { el.setAttribute('loading', 'lazy'); el.setAttribute('src', v); } else { hide(el, true); }
    });
    withSelf(root, '[data-iframe]').forEach(function (el) {
      var v = row[el.getAttribute('data-iframe')];
      if (v) { el.setAttribute('src', v); } else { hide(el, true); }
    });
    withSelf(root, '[data-show]').forEach(function (el) { hide(el, !truthy(row[el.getAttribute('data-show')])); });
    withSelf(root, '[data-blocks]').forEach(function (el) { renderBlocks(el, row[el.getAttribute('data-blocks')]); });
    withSelf(root, '[data-viewer]').forEach(function (el) {
      el.style.cursor = 'zoom-in';
      el.addEventListener('click', function (e) { e.preventDefault(); openViewer(row); });
    });
    withSelf(root, '[data-each]').forEach(function (el) {
      var items = row[el.getAttribute('data-each')] || [], tpl = el.querySelector('template');
      if (!tpl) return;
      items.forEach(function (it) { var f = tpl.content.cloneNode(true); fill(f, it); el.appendChild(f); });
    });
    return root;
  }
  function fillFragment(tpl, row) {
    var f = tpl.content.cloneNode(true);
    // 조각(fragment)은 자기 자신 처리가 없으므로 자식들을 하나씩 채운다
    Array.prototype.slice.call(f.children).forEach(function (c) { fill(c, row); });
    return f;
  }

  /* ---------- 목록 ---------- */
  function renderList(el) {
    var src = el.getAttribute('data-list'), tpl = el.querySelector('template'), rows = Ch.getRows(src, params), total = rows.length,
      limit = parseInt(el.getAttribute('data-limit'), 10), size = parseInt(el.getAttribute('data-page-size'), 10), page = 1;
    if (!tpl) return;
    if (size) {
      page = Math.max(1, parseInt(params.p, 10) || 1);
      page = Math.min(page, Math.max(1, Math.ceil(total / size)));
      rows = rows.slice((page - 1) * size, page * size);
    } else if (limit) { rows = rows.slice(0, limit); }
    rows.forEach(function (r, i) {
      r.no = total - ((page - 1) * (size || 0)) - i;   // 번호 (최신이 가장 큼)
      el.appendChild(fillFragment(tpl, r));
    });
    if (el.id) { counts[el.id] = total; el._page = { page: page, size: size, total: total }; }
  }
  function renderPagers() {
    $all('[data-pager-for]').forEach(function (el) {
      var list = doc.getElementById(el.getAttribute('data-pager-for')), info = list && list._page, pages, start, end, i;
      el.textContent = '';
      if (!info || !info.size) return;
      pages = Math.ceil(info.total / info.size);
      if (pages < 2) return;
      function link(label, p, cls) {
        var a = doc.createElement('a');
        a.className = 'pg' + (cls ? ' ' + cls : ''); a.textContent = label;
        a.href = pageName() + queryWith({ p: p > 1 ? p : '' });
        el.appendChild(a);
      }
      start = Math.max(1, info.page - 4); end = Math.min(pages, start + 9); start = Math.max(1, end - 9);
      if (info.page > 1) link('이전', info.page - 1, 'prev');
      for (i = start; i <= end; i++) link(String(i), i, i === info.page ? 'on' : '');
      if (info.page < pages) link('다음', info.page + 1, 'next');
    });
  }

  /* ---------- 상세 ---------- */
  function renderDetail(el) {
    var src = el.getAttribute('data-detail'), rows = Ch.getRows(src, params), id = params.id, row = null, idx = -1, i, nf = el.querySelector('[data-notfound]');
    for (i = 0; i < rows.length; i++) { if (String(rows[i].id) === String(id)) { row = rows[i]; idx = i; break; } }
    if (!row && !id && el.hasAttribute('data-detail-first') && rows.length) { row = rows[0]; idx = 0; }
    if (!row) {
      Array.prototype.slice.call(el.children).forEach(function (c) { hide(c, !c.hasAttribute('data-notfound')); });
      if (nf) hide(nf, false);
      if (el.id) counts[el.id] = 0;
      return;
    }
    if (nf) hide(nf, true);
    var data = {}, k;
    for (k in row) { data[k] = row[k]; }
    data.prevUrl = idx > 0 ? rows[idx - 1].detailUrl : '';
    data.prevTitle = idx > 0 ? rows[idx - 1].title : '';
    data.nextUrl = idx < rows.length - 1 ? rows[idx + 1].detailUrl : '';
    data.nextTitle = idx < rows.length - 1 ? rows[idx + 1].title : '';
    data.listHref = pageName() + queryWith({ id: '' });
    fill(el, data);
    var tf = el.getAttribute('data-title-from');
    if (tf && data[tf]) doc.title = data[tf] + ' - ' + C.church.name;
    if (el.id) counts[el.id] = 1;
  }

  /* ---------- 탭 (메인 화면 소식 등) ---------- */
  function renderTabs(el) {
    var tabs = $all('[data-tab]', el), list = el.querySelector('[data-tab-list]'), tpl = list && list.querySelector('template'),
      more = el.querySelector('[data-more]'), empty = el.querySelector('[data-tab-empty]'), limit = parseInt(el.getAttribute('data-limit'), 10) || 5, first = null;
    tabs = tabs.filter(function (t) {
      var ok = Ch.isActive(t.getAttribute('data-tab'));
      hide(t, !ok);
      return ok;
    });
    function select(t) {
      var rows = Ch.getRows(t.getAttribute('data-tab'), params).slice(0, limit);
      tabs.forEach(function (x) { x.classList.toggle('on', x === t); x.setAttribute('aria-selected', x === t ? 'true' : 'false'); });
      $all('*', list).forEach(function (n) { if (n.tagName !== 'TEMPLATE' && n.parentNode === list) list.removeChild(n); });
      Array.prototype.slice.call(list.children).forEach(function (n) { if (n.tagName !== 'TEMPLATE') list.removeChild(n); });
      rows.forEach(function (r) { list.appendChild(fillFragment(tpl, r)); });
      if (empty) hide(empty, rows.length > 0);
      if (more) { var h = t.getAttribute('data-more-href'); if (h) more.setAttribute('href', h); hide(more, !h); }
    }
    tabs.forEach(function (t) { t.addEventListener('click', function (e) { e.preventDefault(); select(t); }); });
    first = tabs[0];
    if (first && tpl) select(first);
    if (el.id) counts[el.id] = tabs.length;
    hide(el, !first && el.hasAttribute('data-hide-if-empty'));
  }

  /* ---------- 달력 ---------- */
  function renderCalendar(el) {
    var events = Ch.getRows('events', params), now = new Date(), y = now.getFullYear(), m = now.getMonth(),
      grid = el.querySelector('[data-cal-grid]'), title = el.querySelector('[data-cal-title]'), list = el.querySelector('[data-cal-list]'),
      tpl = list && list.querySelector('template'), empty = el.querySelector('[data-cal-empty]'),
      today = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2);
    function ds(yy, mm, dd) { return yy + '-' + ('0' + (mm + 1)).slice(-2) + '-' + ('0' + dd).slice(-2); }
    function draw() {
      var first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate(), i, d, cell, n, hits, monthEv, from = ds(y, m, 1), to = ds(y, m, days);
      if (title) title.textContent = y + '년 ' + (m + 1) + '월';
      if (grid) {
        grid.textContent = '';
        '일월화수목금토'.split('').forEach(function (w, k) {
          var h = doc.createElement('div'); h.className = 'wd' + (k === 0 ? ' sun' : k === 6 ? ' sat' : ''); h.textContent = w; grid.appendChild(h);
        });
        for (i = 0; i < first; i++) { cell = doc.createElement('div'); cell.className = 'd blank'; grid.appendChild(cell); }
        for (d = 1; d <= days; d++) {
          var key = ds(y, m, d), wd = (first + d - 1) % 7;
          hits = events.filter(function (e) { return e.date <= key && key <= (e.endDate || e.date); });
          cell = doc.createElement('div');
          cell.className = 'd' + (wd === 0 ? ' sun' : wd === 6 ? ' sat' : '') + (hits.length ? ' has' : '') + (key === today ? ' today' : '');
          n = doc.createElement('span'); n.className = 'n'; n.textContent = d; cell.appendChild(n);
          if (hits.length) cell.title = hits.map(function (e) { return e.title; }).join(', ');
          grid.appendChild(cell);
        }
      }
      if (list && tpl) {
        Array.prototype.slice.call(list.children).forEach(function (c) { if (c.tagName !== 'TEMPLATE') list.removeChild(c); });
        monthEv = events.filter(function (e) { return e.date <= to && (e.endDate || e.date) >= from; });
        monthEv.forEach(function (e) {
          var r = {}, k;
          for (k in e) { r[k] = e[k]; }
          r.range = e.endDate ? koShort(e.date) + ' ~ ' + koShort(e.endDate) : koShort(e.date);
          list.appendChild(fillFragment(tpl, r));
        });
        if (empty) hide(empty, monthEv.length > 0);
      }
    }
    var pv = el.querySelector('[data-cal-prev]'), nx = el.querySelector('[data-cal-next]');
    if (pv) pv.addEventListener('click', function (e) { e.preventDefault(); m--; if (m < 0) { m = 11; y--; } draw(); });
    if (nx) nx.addEventListener('click', function (e) { e.preventDefault(); m++; if (m > 11) { m = 0; y++; } draw(); });
    draw();
    if (el.id) counts[el.id] = events.length;
    hide(el, !events.length && el.hasAttribute('data-hide-if-empty'));
  }

  /* ---------- 메뉴 ---------- */
  function menuHref(item) {
    if (item.page) return Ch.isActive('pages:' + item.page) ? 'page.html?s=' + enc(item.page) : null;
    if (item.board) return Ch.isActive('posts:' + item.board) ? 'board.html?b=' + enc(item.board) : null;
    if (item.sermons) return Ch.isActive('sermons') ? 'sermons.html' : null;
    if (item.album) return Ch.isActive('photos') ? 'album.html' : null;
    if (item.schedule) return Ch.isActive('events') ? 'schedule.html' : null;
    if (item.locked) return '#';
    return null;
  }
  function renderMenu(el) {
    var gtpl = el.querySelector('template'), groups = C.menu || [];
    if (!gtpl) return;
    groups.forEach(function (g) {
      var items = [];
      g.items.forEach(function (it) {
        var h = menuHref(it);
        if (h) items.push({ label: it.label, href: h, locked: !!it.locked });
      });
      if (!items.length) return;
      var frag = gtpl.content.cloneNode(true), root = frag.firstElementChild, box;
      fill(root, { label: g.label });
      box = root.querySelector('[data-menu-items]');
      var itpl = box && box.querySelector('template');
      if (itpl) {
        items.forEach(function (it) {
          var f = itpl.content.cloneNode(true), n = f.firstElementChild;
          fill(n, it);
          if (it.locked) n.setAttribute('data-notice', 'locked');
          box.appendChild(f);
        });
      }
      var gb = root.firstElementChild;
      if (gb) gb.addEventListener('click', function () { root.classList.toggle('open'); });
      el.appendChild(frag);
    });
    $all('[data-menu-toggle]').forEach(function (b) {
      b.addEventListener('click', function () {
        var open = !el.classList.contains('open');
        el.classList.toggle('open', open);
        b.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
  }

  /* ---------- 값 연결, 조건부 표시 ---------- */
  // 메뉴 설정에서 항목 이름 찾기 (kind: 'page' 등, key: 슬러그)
  function menuLabel(kind, key) {
    var out = '';
    if (!key) return out;
    (C.menu || []).forEach(function (g) {
      g.items.forEach(function (it) { if (!out && it[kind] === key) out = it.label; });
    });
    return out;
  }
  function bindAll() {
    ctx = { church: C.church, visitor: C.visitor, questionUrl: C.questionUrl, board: C.boards[params.b] || {}, param: params,
      messages: C.messages || {}, page: { title: menuLabel('page', params.s) } };
    $all('[data-bind]').forEach(function (el) {
      var v = getPath(ctx, el.getAttribute('data-bind'));
      if (typeof v === 'number') v = v.toLocaleString('ko-KR');
      el.textContent = v == null ? '' : v;
    });
    $all('[data-bind-href]').forEach(function (el) {
      var v = getPath(ctx, el.getAttribute('data-bind-href'));
      if (v) { el.setAttribute('href', v); el.target = '_blank'; el.rel = 'noopener'; }
    });
    $all('[data-bind-tel]').forEach(function (el) {
      var v = getPath(ctx, el.getAttribute('data-bind-tel'));
      if (v) el.setAttribute('href', 'tel:' + String(v).replace(/[^\d+]/g, ''));
    });
    if (ctx.board.title && doc.body.hasAttribute('data-title-board')) doc.title = ctx.board.title + ' - ' + C.church.name;
    else if (ctx.page.title && pageName() === 'page.html') doc.title = ctx.page.title + ' - ' + C.church.name;   // 행이 있으면 renderDetail이 다시 덮는다
  }
  function applyConditions() {
    $all('[data-requires]').forEach(function (el) {
      hide(el, !Ch.isActive(el.getAttribute('data-requires')));
    });
    $all('[data-nav-param]').forEach(function (el) {
      var p = el.getAttribute('data-nav-param'), v = el.getAttribute('data-nav-value') || '', src = el.getAttribute('data-nav-source');
      if (el.tagName === 'A') { var o = { id: '', p: '' }; o[p] = v; el.setAttribute('href', pageName() + queryWith(o)); }
      el.classList.toggle('on', (params[p] || '') === v);
      if (src && v && !C.showAll && !Ch.getRows(src + ':' + v, params).length) hide(el, true);
    });
    $all('[data-when]').forEach(function (el) {
      var k = el.getAttribute('data-when'), neg = k.charAt(0) === '!', key = neg ? k.slice(1) : k, ok;
      if (key === 'demo') ok = Ch.isDemo();
      else if (key === 'visitor-demo') ok = !!(C.visitor && C.visitor.demo);
      else if (key === 'load-error') ok = Ch.errors.length > 0;
      else if (key.indexOf('param:') === 0) ok = !!params[key.slice(6)];
      else ok = (counts[key] || 0) > 0;
      hide(el, neg ? ok : !ok);
    });
  }

  /* ---------- 시작 ---------- */
  doc.addEventListener('click', function (e) {
    var n = e.target.closest ? e.target.closest('[data-notice]') : null;
    if (n) { e.preventDefault(); showNotice(n.getAttribute('data-notice')); }
  });

  function render() {
    bindAll();
    $all('[data-menu]').forEach(renderMenu);
    $all('[data-list]').forEach(renderList);
    $all('[data-detail]').forEach(renderDetail);
    $all('[data-tabs]').forEach(renderTabs);
    $all('[data-calendar]').forEach(renderCalendar);
    renderPagers();
    applyConditions();
    doc.documentElement.classList.add('ch-ready');
  }

  Ch.load().then(render, function () { render(); });
  window.ChurchUI = { showNotice: showNotice, openViewer: openViewer };
})();
