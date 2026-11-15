/* ============================================================
   예시 데이터 (config.js의 sheets 주소가 비어 있을 때만 쓰임)
   - 열 이름은 구글 시트 탭의 첫 줄과 같다.
   - 설교의 날짜, 본문, 설교자 중 최신 3건은 유튜브 공식 채널의 실제 날짜·본문이고(설교자 이름은 가림)
     제목과 나머지는 모두 가짜다. 사진은 저장소 안 img/sample-*.svg(단색 그림)이다.
   ============================================================ */
(function () {
  'use strict';
  var P1 = 'img/sample-1.svg';
  var P2 = 'img/sample-2.svg';
  var PASSAGES = ['요한복음 3:1-8', '시편 23:1-6', '로마서 8:28-39', '요한일서 4:7-12', '빌립보서 2:1-11',
    '야고보서 1:2-8', '고린도전서 13:1-13', '창세기 12:1-9', '이사야 40:27-31', '사도행전 2:42-47',
    '마태복음 5:1-12', '히브리서 11:1-6', '에베소서 4:1-6', '골로새서 3:12-17', '잠언 3:5-6'];

  function p(n) { return n < 10 ? '0' + n : '' + n; }
  function iso(d) { return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
  function back(start, n, stepDays) {
    var out = [], d = new Date(start + 'T00:00:00'), i;
    for (i = 0; i < n; i++) { out.push(iso(d)); d.setDate(d.getDate() - stepDays); }
    return out;
  }
  function ko(s) { var a = s.split('-'); return a[0] + '년 ' + (+a[1]) + '월 ' + (+a[2]) + '일'; }

  var sermons = [];
  function addSermons(cat, first, n, real) {
    back(first, n, 7).forEach(function (d, i) {
      var r = real[i];
      sermons.push({
        category: cat, date: d,
        title: '설교 제목 예시 ' + (n - i),
        passage: r ? r.passage : PASSAGES[i % PASSAGES.length],
        preacher: r ? r.preacher : '○○○ 목사',
        video: r && r.video ? r.video : '',
        question: ''
      });
    });
  }
  addSermons('주일오전예배', '2026-11-08', 26, [{ passage: '마태복음 6:25-34', preacher: '○○○ 목사', video: 'https://www.youtube.com/live/95Yae3vIAkw' }]);
  addSermons('주일오후예배', '2026-11-08', 24, [{ passage: '디도서 1:10-16', preacher: '○○○ 목사' }]);
  addSermons('수요기도회', '2026-11-04', 22, [{ passage: '데살로니가전서 4:9-12', preacher: '○○○ 목사' }]);

  var posts = [];
  posts.push({ board: 'notice', date: '2026-10-01', title: '장소 사용 신청서 안내 (예시)', body: '장소 사용을 원하시는 분은 첨부된 신청서를 확인해 주세요.\n(예시 글입니다.)', file_id: P1, file_name: '장소사용신청서(예시).png', pinned: 'Y' });
  back('2026-11-02', 12, 7).forEach(function (d, i) {
    posts.push({ board: 'notice', date: d, title: '공지사항 예시 ' + (12 - i), body: '공지사항 본문 예시입니다.\n\n두 번째 문단 예시입니다.' });
  });
  back('2026-11-08', 6, 7).forEach(function (d) {
    posts.push({ board: 'bulletin', date: d, title: ko(d) + ' 주보 (예시)', body: '', image_ids: P1 + ' ' + P2 + ' ' + P1 });
  });
  [['2026-10-21', 3], ['2026-10-14', 2], ['2026-10-07', 1]].forEach(function (a) {
    posts.push({ board: 'newfamily', date: a[0], title: '새가족 예시 ' + a[1] + ' · 소속 예시', body: '환영합니다. (예시 글입니다. 실제 이름과 사진은 교회 승인 후에 정합니다.)' });
  });
  back('2026-11-06', 5, 1).forEach(function (d, i) {
    posts.push({ board: 'resources', date: d, title: '새벽기도 본문 예시 ' + (5 - i), body: '새벽기도 본문 예시입니다.' });
  });

  // 옛 사이트에 글이 있던 게시판의 예시 글. (promo, domestic, overseas는 일부러 비워 "준비 중입니다."를 보여 준다)
  [
    ['building', '교회건축', ['2012-09-16', '2012-06-10', '2012-03-04']],
    ['elder', '노인대학', ['2015-10-08', '2015-05-14']],
    ['freeboard', '자유게시판', ['2019-11-03', '2019-07-21', '2019-02-10']],
    ['men', '남전도회', ['2015-09-20', '2015-04-05']],
    ['women', '여전도회', ['2013-10-27', '2013-05-12']],
    ['community', '커뮤니티 소식', ['2021-12-05', '2021-06-13']]
  ].forEach(function (b) {
    b[2].forEach(function (d, i) {
      posts.push({ board: b[0], date: d, title: b[1] + ' 예시 글 ' + (b[2].length - i), body: b[1] + ' 게시판 예시 글입니다. 실제 내용이 아닙니다.\n\n두 번째 문단 예시입니다.' });
    });
  });

  var events = [
    { date: '2026-11-15', end_date: '', title: '일정 예시 (교사 모임)', place: '교육관' },
    { date: '2026-11-22', end_date: '', title: '일정 예시 (찬양대 모임)', place: '본당' },
    { date: '2026-11-29', end_date: '', title: '일정 예시 (전교인 행사)', place: '' },
    { date: '2026-12-06', end_date: '', title: '일정 예시 (성탄 준비 모임)', place: '' },
    { date: '2026-12-13', end_date: '2026-12-14', title: '일정 예시 (이틀 일정)', place: '' },
    { date: '2026-12-24', end_date: '', title: '성탄 전야 행사 (예시)', place: '본당' }
  ];

  var photos = [
    { album: '시험 앨범', date: '2026-11-14', title: '사진 1', file_id: P1 },
    { album: '시험 앨범', date: '2026-11-14', title: '사진 2', file_id: P2 },
    { album: '시험 앨범 2', date: '2026-11-01', title: '사진 3', file_id: P2 }
  ];

  var pages = [
    { slug: 'greeting', title: '인사말', body: '포항대흥교회 홈페이지를 찾아 주셔서 감사합니다.\n\n(인사말 예시 문구입니다. 실제 인사말은 교회에서 받아 넣습니다.)', image_id: '', link_url: '', link_label: '' },
    { slug: 'vision', title: '목회비전', body: '(목회비전 예시 문구입니다.)', image_id: '', link_url: '', link_label: '' },
    { slug: 'history', title: '교회연혁', body: '1951 | 교회 개척\n2000 | 연혁 예시\n2010 | 연혁 예시\n2020 | 연혁 예시', image_id: '', link_url: '', link_label: '' },
    { slug: 'worship-info', title: '예배안내', body: '주일오전예배 | 시간 예시 | 본당\n주일오후예배 | 시간 예시 | 본당\n수요기도회 | 시간 예시 | 본당', image_id: '', link_url: '', link_label: '' },
    { slug: 'staff', title: '섬기는 분들', body: '담임목사 | ○○○ 목사\n교역자 | 이름 예시 | 이메일은 공개 여부를 교회가 정합니다', image_id: '', link_url: '', link_label: '' },
    { slug: 'directions', title: '찾아오시는 길', body: '포항시 남구 희망대로 466(이동)\n전화 054-275-3121', image_id: '', link_url: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('포항시 남구 희망대로 466'), link_label: '지도에서 보기' },
    { slug: 'education', title: '교육부서 소개', body: '(영아부부터 중고등부, 제2청년회까지 소개 예시입니다.)', image_id: '', link_url: '', link_label: '' },
    { slug: 'care', title: '새가족양육', body: '(새가족양육 예시 문구입니다. 실제 내용이 아닙니다.)', image_id: '', link_url: '', link_label: '' },
    { slug: 'training', title: '평신도사역훈련', body: '(평신도사역훈련 예시 문구입니다. 실제 내용이 아닙니다.)', image_id: '', link_url: '', link_label: '' },
    { slug: 'bible-study', title: '화요성경공부', body: '(화요성경공부 예시 문구입니다. 실제 내용이 아닙니다.)', image_id: '', link_url: '', link_label: '' },
    { slug: 'shuttle', title: '차량안내', body: '(차량안내 예시 문구입니다. 운행 시간과 장소는 교회에서 받아 넣습니다.)', image_id: '', link_url: '', link_label: '' },
    { slug: 'giving', title: '헌금·기부금 안내', body: '헌금과 기부금 증명서는 외부 온라인서비스(ch2ch)에서 처리합니다.\n(연결 주소는 교회에 확인한 뒤 넣습니다.)', image_id: '', link_url: '', link_label: '' }
  ];

  window.CHURCH_SAMPLE = { sermons: sermons, posts: posts, photos: photos, events: events, pages: pages };
})();
