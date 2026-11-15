/* ============================================================
   데이터 계층 (디자인과 무관)
   - 구글 시트 CSV 읽기, 열 정리, 정렬, 숨김 규칙, 성경·드라이브·유튜브 주소 만들기
   ============================================================ */
(function () {
  'use strict';
  var C = window.CHURCH_CONFIG || {};
  var SAMPLE = window.CHURCH_SAMPLE || {};
  var TABS = ['sermons', 'posts', 'photos', 'events', 'pages'];
  var raw = {}, norm = {}, sampleUsed = {}, errors = [];

  /* ---------- 작은 도구 ---------- */
  function pad(n) { n = String(n); return n.length < 2 ? '0' + n : n; }
  function enc(s) { return encodeURIComponent(s); }
  function trim(s) { return String(s == null ? '' : s).replace(/^\s+|\s+$/g, ''); }

  // 2026-11-08, 2026. 11. 8, 2026/11/8 모두 받는다. (월/일/연 형식은 보조로만 처리)
  function isoDate(s) {
    s = String(s || '');
    var m = /(\d{4})\D+(\d{1,2})\D+(\d{1,2})/.exec(s);
    if (m) return m[1] + '-' + pad(m[2]) + '-' + pad(m[3]);
    m = /^\s*(\d{1,2})\D+(\d{1,2})\D+(\d{4})/.exec(s);
    return m ? m[3] + '-' + pad(m[1]) + '-' + pad(m[2]) : '';
  }
  function dotDate(iso) { return iso ? iso.slice(2).replace(/-/g, '.') : ''; }
  function koDate(iso) { if (!iso) return ''; var p = iso.split('-'); return (+p[1]) + '월 ' + (+p[2]) + '일'; }
  function longDate(iso) { if (!iso) return ''; var p = iso.split('-'); return (+p[0]) + '년 ' + (+p[1]) + '월 ' + (+p[2]) + '일'; }

  // 드라이브 파일 ID: 주소를 통째로 붙여 넣어도, ID만 넣어도 된다.
  function driveId(s) {
    s = trim(s);
    if (!s) return '';
    var m = /\/d\/([-\w]{15,})/.exec(s) || /[?&]id=([-\w]{15,})/.exec(s);
    if (m) return m[1];
    return /^[-\w]{15,}$/.test(s) ? s : '';
  }
  function driveIds(s) {
    return String(s || '').split(/[,\s]+/).map(driveId).filter(Boolean);
  }
  // 유튜브 영상 ID: watch?v=, youtu.be/, /live/, /embed/, /shorts/ 모두 받는다.
  function youtubeId(s) {
    s = trim(s);
    if (!s) return '';
    var m = /(?:youtu\.be\/|[?&]v=|\/(?:live|embed|shorts)\/)([-\w]{11})/.exec(s);
    if (m) return m[1];
    return /^[-\w]{11}$/.test(s) ? s : '';
  }

  var drive = {
    thumb: function (id, w) { return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w' + (w || 800); },
    preview: function (id) { return 'https://drive.google.com/file/d/' + id + '/preview'; },
    download: function (id) { return 'https://drive.usercontent.google.com/download?id=' + id + '&export=download'; }
  };

  /* ---------- 성경 본문 링크 ---------- */
  var BOOKS_RAW = [
    ['GEN', '창세기', '창'], ['EXO', '출애굽기', '출'], ['LEV', '레위기', '레'], ['NUM', '민수기', '민'], ['DEU', '신명기', '신'],
    ['JOS', '여호수아', '수'], ['JDG', '사사기', '삿'], ['RUT', '룻기', '룻'], ['1SA', '사무엘상', '삼상'], ['2SA', '사무엘하', '삼하'],
    ['1KI', '열왕기상', '왕상'], ['2KI', '열왕기하', '왕하'], ['1CH', '역대상', '대상'], ['2CH', '역대하', '대하'], ['EZR', '에스라', '스'],
    ['NEH', '느헤미야', '느'], ['EST', '에스더', '에'], ['JOB', '욥기', '욥'], ['PSA', '시편', '시'], ['PRO', '잠언', '잠'],
    ['ECC', '전도서', '전'], ['SNG', '아가서', '아가'], ['ISA', '이사야', '사'], ['LAM', '예레미야애가', '애'], ['JER', '예레미야', '렘'],
    ['EZK', '에스겔', '겔'], ['DAN', '다니엘', '단'], ['HOS', '호세아', '호'], ['JOL', '요엘', '욜'], ['AMO', '아모스', '암'],
    ['OBA', '오바댜', '옵'], ['JON', '요나', '욘'], ['MIC', '미가', '미'], ['NAM', '나훔', '나'], ['HAB', '하박국', '합'],
    ['ZEP', '스바냐', '습'], ['HAG', '학개', '학'], ['ZEC', '스가랴', '슥'], ['MAL', '말라기', '말'],
    ['MAT', '마태복음', '마'], ['MRK', '마가복음', '막'], ['LUK', '누가복음', '눅'], ['JHN', '요한복음', '요'], ['ACT', '사도행전', '행'],
    ['ROM', '로마서', '롬'], ['1CO', '고린도전서', '고전'], ['2CO', '고린도후서', '고후'], ['GAL', '갈라디아서', '갈'], ['EPH', '에베소서', '엡'],
    ['PHP', '빌립보서', '빌'], ['COL', '골로새서', '골'], ['1TH', '데살로니가전서', '살전'], ['2TH', '데살로니가후서', '살후'],
    ['1TI', '디모데전서', '딤전'], ['2TI', '디모데후서', '딤후'], ['TIT', '디도서', '딛'], ['PHM', '빌레몬서', '몬'], ['HEB', '히브리서', '히'],
    ['JAS', '야고보서', '약'], ['1PE', '베드로전서', '벧전'], ['2PE', '베드로후서', '벧후'], ['1JN', '요한일서', '요일'],
    ['2JN', '요한이서', '요이'], ['3JN', '요한삼서', '요삼'], ['JUD', '유다서', '유'], ['REV', '요한계시록', '계']
  ];
  var BOOKS = {};
  BOOKS_RAW.forEach(function (r) { BOOKS[r[1]] = r[0]; BOOKS[r[2]] = r[0]; });
  BOOKS['아'] = 'SNG';
  var BOOK_NAMES = Object.keys(BOOKS).sort(function (a, b) { return b.length - a.length; }); // 긴 이름부터 (요한복음/요한일서/요나 구분)

  // "마태복음 6:25-34" -> .../NKRV/MAT.6  (장 단위 연결. 못 읽으면 빈 문자열)
  function bibleUrl(ref) {
    var s = String(ref || '').replace(/\s+/g, ''), i, n, m;
    for (i = 0; i < BOOK_NAMES.length; i++) {
      n = BOOK_NAMES[i];
      if (s.indexOf(n) === 0) {
        m = /^(\d+)/.exec(s.slice(n.length));
        if (m) return (C.bibleBase || '') + BOOKS[n] + '.' + m[1];
      }
    }
    return '';
  }

  /* ---------- CSV ---------- */
  function parseCSV(text) {
    var rows = [], row = [], f = '', q = false, i, c;
    text = String(text || '').replace(/^﻿/, '');
    for (i = 0; i < text.length; i++) {
      c = text.charAt(i);
      if (q) {
        if (c === '"') { if (text.charAt(i + 1) === '"') { f += '"'; i++; } else { q = false; } }
        else { f += c; }
      } else if (c === '"') { q = true; }
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
      else if (c !== '\r') { f += c; }
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    if (!rows.length) return [];
    var head = rows[0].map(function (h) { return trim(h).toLowerCase(); });
    return rows.slice(1).map(function (r, idx) {
      var o = { _row: idx + 2 };
      head.forEach(function (h, k) { if (h) o[h] = trim(r[k]); });
      return o;
    }).filter(function (o) {
      return Object.keys(o).some(function (k) { return k !== '_row' && o[k]; });
    });
  }

  /* ---------- 탭별 정리 ---------- */
  function byDateDesc(a, b) { return (b.date || '').localeCompare(a.date || '') || b._r - a._r; }

  function normSermon(r) {
    var iso = isoDate(r.date), id = r.id || String(r._row), cat = r.category || '', vid = youtubeId(r.video), q = trim(r.question), qid;
    if (!r.title && !iso) return null;
    qid = driveId(q);
    return {
      id: id, _r: r._row, category: cat, date: iso, dateDot: dotDate(iso), dateKo: koDate(iso), dateLong: longDate(iso),
      title: r.title || '', passage: r.passage || '', passageUrl: bibleUrl(r.passage), preacher: r.preacher || '',
      video: vid, videoEmbed: vid ? 'https://www.youtube.com/embed/' + vid : '', videoWatch: vid ? 'https://www.youtube.com/watch?v=' + vid : '',
      questionUrl: /^https?:/i.test(q) && !qid ? q : (qid ? drive.download(qid) : C.questionUrl || ''),
      detailUrl: 'sermons.html?c=' + enc(cat) + '&id=' + enc(id), listUrl: 'sermons.html' + (cat ? '?c=' + enc(cat) : '')
    };
  }

  function normPost(r) {
    var iso = isoDate(r.date), id = r.id || String(r._row), board = r.board || '', fid = driveId(r.file_id), pid = driveId(r.photo_id);
    if (!board || !r.title) return null;
    return {
      id: id, _r: r._row, board: board, date: iso, dateDot: dotDate(iso), dateKo: koDate(iso), dateLong: longDate(iso),
      title: r.title, body: r.body || '',
      fileId: fid, fileUrl: fid ? drive.download(fid) : '', fileName: fid ? (r.file_name || '첨부파일') : '',
      photoId: pid, photoThumb: pid ? drive.thumb(pid, 700) : '',
      images: driveIds(r.image_ids).map(function (x, i) {
        return { id: x, title: r.title, n: i + 1, thumbUrl: drive.thumb(x, 900), downloadUrl: drive.download(x) };
      }),
      pinned: /^(y|yes|1|true|o|예)$/i.test(r.pinned || ''),
      detailUrl: 'board.html?b=' + enc(board) + '&id=' + enc(id), listUrl: 'board.html?b=' + enc(board)
    };
  }

  function normPhoto(r) {
    var id = driveId(r.file_id), iso = isoDate(r.date), album = r.album || '기타';
    if (!id) return null;
    return {
      id: id, _r: r._row, album: album, date: iso, dateDot: dotDate(iso), title: r.title || '',
      thumbUrl: drive.thumb(id, 500), bigUrl: drive.thumb(id, 1600), downloadUrl: drive.download(id),
      albumUrl: 'album.html?a=' + enc(album)
    };
  }

  function normEvent(r) {
    var iso = isoDate(r.date), end = isoDate(r.end_date);
    if (!iso || !r.title) return null;
    return { id: String(r._row), _r: r._row, date: iso, endDate: end, dateDot: dotDate(iso), dateKo: koDate(iso), title: r.title, place: r.place || '' };
  }

  function normPage(r) {
    var slug = trim(r.slug), img = driveId(r.image_id);
    if (!slug || !(r.body || img || r.link_url)) return null;
    return {
      id: slug, _r: r._row, slug: slug, title: r.title || '', body: r.body || '',
      imageId: img, imageThumb: img ? drive.thumb(img, 1200) : '', link: /^https?:/i.test(r.link_url || '') ? r.link_url : '', linkLabel: r.link_label || '바로가기'
    };
  }

  var NORM = { sermons: normSermon, posts: normPost, photos: normPhoto, events: normEvent, pages: normPage };

  function tabRows(tab) {
    if (!norm[tab]) norm[tab] = (raw[tab] || []).map(NORM[tab]).filter(Boolean);
    return norm[tab];
  }

  function albums() {
    var g = {}, order = [];
    tabRows('photos').forEach(function (p) {
      if (!g[p.album]) { g[p.album] = { count: 0, date: '', cover: '' }; order.push(p.album); }
      var a = g[p.album];
      a.count++;
      if (p.date > a.date) a.date = p.date;
      if (!a.cover) a.cover = p.thumbUrl;
    });
    return order.map(function (k, i) {
      var a = g[k];
      return { id: k, _r: i, title: k, count: a.count, countText: a.count + '장', date: a.date, dateDot: dotDate(a.date), coverThumb: a.cover, detailUrl: 'album.html?a=' + enc(k) };
    }).sort(byDateDesc);
  }

  /* ---------- 조회 ----------
     source 형식:  sermons | sermons:주일오전예배 | posts:notice | photos:앨범이름 | albums | events | pages:슬러그
     콜론 뒤가 @이름 이면 주소창 값(예: @c)으로 바뀐다. */
  function getRows(source, params) {
    params = params || {};
    var i = source.indexOf(':'), tab = i < 0 ? source : source.slice(0, i), arg = i < 0 ? '' : source.slice(i + 1), m = /^@(\w+)$/.exec(arg), rows;
    if (m) arg = params[m[1]] || '';
    switch (tab) {
      case 'sermons':
        rows = tabRows('sermons').filter(function (r) { return !arg || r.category === arg; });
        return rows.slice().sort(byDateDesc);
      case 'posts':
        if (!arg) return [];
        return tabRows('posts').filter(function (r) { return r.board === arg; }).sort(function (a, b) {
          return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || byDateDesc(a, b);
        });
      case 'photos':
        return tabRows('photos').filter(function (r) { return !arg || r.album === arg; }).sort(function (a, b) { return a._r - b._r; });
      case 'albums': return albums();
      case 'events':
        return tabRows('events').slice().sort(function (a, b) { return a.date.localeCompare(b.date) || a._r - b._r; });
      case 'pages':
        return arg ? tabRows('pages').filter(function (r) { return r.slug === arg; }) : [];
    }
    return [];
  }

  // 메뉴 숨김 규칙: 내용이 없거나, 마지막 글이 staleYears보다 오래되면 false
  function isActive(source) {
    if (C.showAll) return true;   // 초안 단계: 모두 보인다
    var rows = getRows(source, {}), years = C.staleYears, newest = '', limit, d;
    if (!rows.length) return false;
    if (!years) return true;
    rows.forEach(function (r) { var x = r.endDate || r.date || ''; if (x > newest) newest = x; });
    if (!newest) return true;
    d = new Date();
    d.setFullYear(d.getFullYear() - years);
    limit = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    return newest >= limit;
  }

  /* ---------- 불러오기 ---------- */
  function load() {
    var jobs = TABS.map(function (tab) {
      var url = (C.sheets || {})[tab];
      if (!url) {
        sampleUsed[tab] = true;
        raw[tab] = (SAMPLE[tab] || []).map(function (o, i) {
          var c = { _row: i + 2 }, k;
          for (k in o) { if (Object.prototype.hasOwnProperty.call(o, k)) c[k] = o[k]; }
          return c;
        });
        return Promise.resolve();
      }
      return fetch(url).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      }).then(function (t) {
        if (/^\s*<(!doctype|html)/i.test(t)) throw new Error('not csv');  // 게시되지 않은 시트는 로그인 화면(HTML)이 온다
        raw[tab] = parseCSV(t);
      }).catch(function (e) {
        errors.push(tab);
        raw[tab] = [];
        if (window.console) console.warn('시트 불러오기 실패:', tab, e && e.message);
      });
    });
    return Promise.all(jobs);
  }

  window.Church = {
    config: C, load: load, getRows: getRows, isActive: isActive, parseCSV: parseCSV,
    bibleUrl: bibleUrl, drive: drive, youtubeId: youtubeId, driveId: driveId, isoDate: isoDate,
    errors: errors, isDemo: function () { return Object.keys(sampleUsed).length > 0; }
  };
})();
