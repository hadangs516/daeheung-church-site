/* 시안용 가짜 데이터 (실제 성도 이름·사진 없음) */
const CHURCH = {
  name: '포항대흥교회',
  address: '경북 포항시 남구 희망대로 466',
  phone: '054-275-3121',
  fax: '054-282-7211',
  visitorToday: '128',
  visitorTotal: '356,420'
};

/* 확정 메뉴 (menu/current v18) */
const MENU = [
  { label: '교회소개', items: [
    ['인사말', 'page.html?s=greeting'], ['목회비전', 'page.html?s=vision'], ['교회연혁', 'page.html?s=history'],
    ['예배안내', 'page.html?s=worship-info'], ['섬기는 분들', 'page.html?s=staff'], ['찾아오시는 길', 'page.html?s=directions'],
    ['차량 안내', 'page.html?s=shuttle'], ['교회 SNS', 'page.html?s=sns'], ['교회 일정', 'schedule.html']
  ]},
  { label: '예배·찬양', items: [
    ['설교', 'sermons.html'], ['1부 예배 찬양', 'page.html?s=praise1'], ['2부 예배 찬양', 'page.html?s=praise2'],
    ['주보', 'board.html?b=bulletin'], ['새벽기도회', 'board.html?b=dawn'], ['모닥불 기도회', 'page.html?s=bonfire']
  ]},
  { label: '교육·양육', items: [
    ['교육부서', 'page.html?s=education'], ['새가족양육', 'page.html?s=care'], ['평신도사역훈련', 'page.html?s=training'],
    ['제1청년부', 'page.html?s=youth1'], ['제2청년부', 'page.html?s=youth2'], ['제3청년부', 'page.html?s=youth3']
  ]},
  { label: '선교·봉사', items: [
    ['국내선교', 'board.html?b=domestic'], ['해외선교', 'board.html?b=overseas'], ['노인대학', 'board.html?b=elder']
  ]},
  { label: '성도의 교제', items: [
    ['공지사항', 'board.html?b=notice'], ['새가족소개', 'board.html?b=newfamily'], ['포토앨범', 'album.html'],
    ['자유게시판', 'board.html?b=freeboard'], ['남전도회', 'board.html?b=men'], ['여전도회', 'board.html?b=women'],
    ['행사·집회 안내', 'board.html?b=events']
  ]}
];

const GROUP_IMG = ['img/hero-exterior.jpg', 'img/hero-interior.jpg', 'img/album-2.jpg', 'img/album-3.jpg', 'img/album-5.jpg'];

/* ---------- 게시판 ---------- */
const BOARDS = {
  notice:    { title: '공지사항', titles: ['추수감사주일 안내','성탄절 찬양대 연습 일정','겨울 성경학교 교사 모집','교회 주차장 공사 안내','새가족 환영회 안내','가을 대심방 일정 안내','2027년 교회 달력 신청','교회 차량 운행 시간 변경','제직회 모임 안내','장학금 신청 안내','교회 도서실 이용 안내','여름 수련회 결과 보고'], pinned: 2, file: true },
  bulletin:  { title: '주보', titles: ['2026년 11월 15일 주보','2026년 11월 8일 주보','2026년 11월 1일 주보','2026년 10월 25일 주보','2026년 10월 18일 주보','2026년 10월 11일 주보','2026년 10월 4일 주보','2026년 9월 27일 주보'], bulletin: true },
  dawn:      { title: '새벽기도회', titles: ['11월 셋째 주 새벽기도 말씀 (시편 23편)','11월 둘째 주 새벽기도 말씀 (시편 91편)','11월 첫째 주 새벽기도 말씀 (빌립보서 4장)','10월 넷째 주 새벽기도 말씀 (요한복음 15장)','10월 셋째 주 새벽기도 말씀 (마태복음 6장)','특별새벽기도회 안내','10월 둘째 주 새벽기도 말씀 (로마서 8장)','10월 첫째 주 새벽기도 말씀 (이사야 40장)'] },
  newfamily: { title: '새가족소개', titles: ['11월 셋째 주 새가족을 환영합니다','11월 둘째 주 새가족을 환영합니다','11월 첫째 주 새가족을 환영합니다','10월 넷째 주 새가족을 환영합니다','10월 셋째 주 새가족을 환영합니다','10월 둘째 주 새가족을 환영합니다'], photo: true },
  freeboard: { title: '자유게시판', titles: ['수요기도회 말씀에 은혜 받았습니다','교회 화단 꽃이 참 예쁩니다','주차 안내 봉사 감사드려요','성경 통독 같이 하실 분','청년부 수련회 사진 잘 봤습니다','기도 부탁드립니다','노인대학 소풍 즐거웠어요','찬양대 연주 감동이었습니다'], anon: true },
  men:       { title: '남전도회', titles: ['11월 남전도회 월례회 안내','교회 대청소 봉사 결과','연합 체육대회 참가 안내','10월 월례회 기도 제목','남전도회 임원 선출 안내','가을 야유회 사진'] },
  women:     { title: '여전도회', titles: ['김장 나눔 봉사 안내','11월 여전도회 월례회','바자회 수익금 사용 보고','선교 헌금 모금 안내','10월 월례회 기도 제목','가을 바자회 준비 모임'] },
  events:    { title: '행사·집회 안내', titles: ['성탄 전야 축하 행사 안내','추수감사절 연합 찬양제','가을 부흥사경회 안내','새가족 환영회','송구영신 기도회 안내','겨울 성경학교 일정','청년부 수련회 안내'] },
  domestic:  { title: '국내선교', titles: ['농어촌 교회 방문 보고','지역 독거노인 반찬 나눔','미자립 교회 후원 안내','여름 농촌 봉사 결과','지역 아동센터 방문','국내선교 기도 제목'], photo: true },
  overseas:  { title: '해외선교', titles: ['필리핀 선교사님 소식','캄보디아 단기선교 보고','몽골 선교지 기도 제목','해외선교 후원 안내','선교사 가정 방문 소식','단기선교팀 모집'], photo: true },
  elder:     { title: '노인대학', titles: ['2학기 종강식 안내','가을 소풍 다녀왔습니다','건강 체조 시간 사진','한글 교실 작품 전시','노인대학 봉사자 모집','2학기 개강 안내'], photo: true }
};
/* 글쓰기 권한: all=누구나(게스트 포함) / admin=관리자 모드에서만 / none=글쓰기 없음 */
const WRITE_RULE = { freeboard: 'all', men: 'all', women: 'all', notice: 'admin', dawn: 'admin', newfamily: 'admin', events: 'admin', domestic: 'admin', overseas: 'admin', elder: 'admin', bulletin: 'none' };
const RANKS = ['목사','전도사','장로','안수집사','권사','서리집사','성도','새가족','청년','학생'];
const BOARD_DATES = ['2026.11.15','2026.11.12','2026.11.08','2026.11.03','2026.10.29','2026.10.25','2026.10.18','2026.10.11','2026.10.04','2026.09.27','2026.09.20','2026.09.13'];
const PHOTOS = ['img/album-1.jpg','img/album-2.jpg','img/album-3.jpg','img/album-4.jpg','img/album-5.jpg','img/hero-interior.jpg','img/hero-exterior.jpg'];

function boardPosts(b) {
  const B = BOARDS[b]; if (!B) return [];
  return B.titles.map((t, i) => ({
    id: i + 1, title: t, date: BOARD_DATES[i % BOARD_DATES.length],
    pinned: i < (B.pinned || 0), author: B.anon ? '익명' : (b === 'notice' || b === 'bulletin' ? '교회 사무실' : '관리자'),
    views: 120 - i * 9 + (i % 3) * 4, hasFile: B.file && i % 2 === 0, hasPhoto: (B.photo || B.bulletin) && true
  }));
}

/* ---------- 설교 ---------- */
const SERMON_CATS = ['주일오전', '주일오후', '수요기도회'];
const SERMONS = [
  ['주일오전','감사로 드리는 삶','시편 100:1-5','2026.11.15'],
  ['주일오전','믿음으로 사는 사람','히브리서 11:1-6','2026.11.08'],
  ['주일오전','기도의 자리로','누가복음 18:1-8','2026.11.01'],
  ['주일오전','선한 목자','요한복음 10:11-18','2026.10.25'],
  ['주일오전','세상의 빛과 소금','마태복음 5:13-16','2026.10.18'],
  ['주일오전','두려워하지 말라','이사야 41:10-13','2026.10.11'],
  ['주일오후','말씀 위에 세운 집','마태복음 7:24-27','2026.11.15'],
  ['주일오후','서로 사랑하라','요한일서 4:7-12','2026.11.08'],
  ['주일오후','쉬지 말고 기도하라','데살로니가전서 5:16-18','2026.11.01'],
  ['주일오후','작은 일에 충성','누가복음 16:10-13','2026.10.25'],
  ['수요기도회','주의 손에 맡기라','시편 37:3-6','2026.11.11'],
  ['수요기도회','새 힘을 얻으리니','이사야 40:27-31','2026.11.04'],
  ['수요기도회','항상 기뻐하라','빌립보서 4:4-7','2026.10.28'],
  ['수요기도회','여호와는 나의 목자','시편 23:1-6','2026.10.21']
].map((s, i) => ({ id: i + 1, cat: s[0], title: s[1], passage: s[2], date: s[3], preacher: '담임목사',
  thumb: ['img/hero-interior.jpg','img/album-1.jpg','img/hero-exterior.jpg','img/album-5.jpg','img/album-2.jpg'][i % 5],
  dur: ['38:24','41:10','35:52','39:07','36:45'][i % 5] }));

/* ---------- 포토앨범 ---------- */
const ALBUMS = [
  { id: 1, title: '추수감사 찬양', date: '2026.11.15', photos: ['img/album-1.jpg','img/hero-interior.jpg','img/album-5.jpg','img/hero-exterior.jpg','img/album-2.jpg','img/album-3.jpg','img/album-4.jpg','img/album-1.jpg'] },
  { id: 2, title: '새가족 양육 수업', date: '2026.11.10', photos: ['img/album-2.jpg','img/hero-interior.jpg','img/album-1.jpg','img/album-5.jpg'] },
  { id: 3, title: '사랑 나눔 봉사', date: '2026.11.07', photos: ['img/album-3.jpg','img/album-2.jpg','img/album-4.jpg','img/album-5.jpg','img/hero-exterior.jpg'] },
  { id: 4, title: '주일학교 공과', date: '2026.11.01', photos: ['img/album-4.jpg','img/album-3.jpg','img/album-2.jpg'] },
  { id: 5, title: '본당 새 단장', date: '2026.10.25', photos: ['img/hero-interior.jpg','img/hero-exterior.jpg','img/album-1.jpg','img/album-5.jpg','img/album-2.jpg','img/album-4.jpg'] },
  { id: 6, title: '봄 교회 정원', date: '2026.05.10', photos: ['img/album-5.jpg','img/hero-exterior.jpg','img/album-4.jpg','img/album-3.jpg'] },
  { id: 7, title: '교회 전경', date: '2026.04.20', photos: ['img/hero-exterior.jpg','img/album-5.jpg','img/hero-interior.jpg'] },
  { id: 8, title: '찬양대 연습', date: '2026.04.12', photos: ['img/album-1.jpg','img/hero-interior.jpg','img/album-2.jpg','img/album-3.jpg'] },
  { id: 9, title: '부활절 연합 행사', date: '2026.04.05', photos: ['img/hero-interior.jpg','img/album-1.jpg','img/album-5.jpg'] }
];

/* ---------- 교회 일정 ---------- */
const EVENTS = [
  ['2026-11-04','','수요기도회 특별 찬양','본당'],
  ['2026-11-08','','제직회','교육관'],
  ['2026-11-15','','추수감사 찬양제','본당'],
  ['2026-11-22','','추수감사주일','본당'],
  ['2026-11-23','2026-11-27','가을 특별새벽기도회','본당'],
  ['2026-11-29','','새가족 환영회','교육관'],
  ['2026-12-06','','성찬 주일','본당'],
  ['2026-12-12','','여전도회 김장 나눔','친교실'],
  ['2026-12-20','','성탄 찬양 발표회','본당'],
  ['2026-12-24','','성탄 전야 축하 행사','본당'],
  ['2026-12-25','','성탄절 기념 행사','본당'],
  ['2026-12-31','','송구영신 기도회','본당'],
  ['2027-01-09','2027-01-10','겨울 성경학교','교육관'],
  ['2026-10-18','','가을 야유회','형산강 둔치'],
  ['2026-10-25','','종교개혁주일','본당']
].map(e => ({ date: e[0], end: e[1], title: e[2], place: e[3] }));

/* ---------- 글 페이지 ---------- */
const TBL = (head, rows) => '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + head.map(h => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
const VIDEO = (title) => '<div class="video-ph" data-action="soon"><img src="img/hero-interior.jpg" alt=""><span class="play"><span class="ms">play_arrow</span></span><span class="cap">' + title + '</span></div>';

const PAGES = {
  greeting: { body: `
    <div class="greet">
      <figure class="greet-img"><img src="img/hero-exterior.jpg" alt="교회 전경"></figure>
      <div class="prose">
        <p class="lead">“수고하고 무거운 짐 진 자들아 다 내게로 오라<br>내가 너희를 쉬게 하리라” <small>(마태복음 11:28)</small></p>
        <p>포항대흥교회 홈페이지를 찾아 주신 여러분을 주님의 이름으로 환영합니다.</p>
        <p>우리 교회는 하나님의 말씀 위에 바로 서서, 예배로 하나 되고 사랑으로 섬기는 공동체가 되기를 소망합니다. 처음 오신 분도, 오랫동안 함께해 오신 분도 이곳에서 따뜻한 쉼과 회복을 누리시기를 바랍니다.</p>
        <p>세대와 세대가 함께 예배하며 다음 세대를 믿음으로 세우고, 이웃과 열방을 향해 그리스도의 사랑을 전하는 교회가 되도록 기도와 관심으로 함께해 주십시오.</p>
        <p>여러분의 가정과 일터 위에 하나님의 은혜와 평강이 늘 함께하시기를 기도합니다.</p>
        <p class="sign">포항대흥교회 담임목사 <b>○○○</b></p>
      </div>
    </div>` },
  vision: { body: `
    <p class="page-lead">말씀과 기도로 세워지고, 사랑으로 세상을 섬기는 교회</p>
    <ul class="vision">
      <li><span class="ms">menu_book</span><b>말씀의 교회</b><p>성경을 삶의 기준으로 삼고 말씀대로 살아가는 성도를 세웁니다.</p></li>
      <li><span class="ms">volunteer_activism</span><b>기도의 교회</b><p>새벽과 수요, 금요 기도로 하나님과 동행하는 공동체가 됩니다.</p></li>
      <li><span class="ms">diversity_3</span><b>다음 세대의 교회</b><p>어린이와 청소년, 청년을 믿음의 사람으로 키웁니다.</p></li>
      <li><span class="ms">public</span><b>선교하는 교회</b><p>지역과 열방을 향해 복음과 사랑을 나눕니다.</p></li>
    </ul>
    <h3 class="h3">2027년 표어</h3>
    <p class="motto">“너희는 먼저 그의 나라와 그의 의를 구하라” <small>(마태복음 6:33)</small></p>` },
  history: { body: TBL(['연도','내용'], [
    ['1972','포항대흥교회 설립, 첫 모임'],['1985','제1교육관 준공'],['1994','본당 신축 입당식'],
    ['2003','노인대학 개강'],['2011','해외선교 시작 (필리핀)'],['2018','교회 차량 운행 확대'],
    ['2024','본당 리모델링'],['2026','교회 홈페이지 새 단장']]) },
  'worship-info': { body: '<h3 class="h3">주일 예배</h3>' + TBL(['예배','시간','장소'], [
      ['주일 1부 예배','오전 9:30','2·3층 본당'],['주일 2부 예배','낮 12:00','2·3층 본당'],['주일 오후 예배','오후 3:30','2·3층 본당']]) +
    '<h3 class="h3">기도회</h3>' + TBL(['모임','시간','장소'], [
      ['수요기도회','수요일 오후 8:00','2·3층 본당'],['새벽기도회','월~토 오전 5:00','1층 소예배실'],['새가족부기도회','매주 화요일 오전 5:30','새가족실'],['선교위원회기도회','매주 금요일 오전 5:30','새가족실'],['모닥불 기도회','매월 마지막 토요일 오후 7:30','교회 마당']]) +
    '<h3 class="h3">교회학교</h3>' + TBL(['부서','시간','장소'], [
      ['유아부','주일 오전 9:30','2층 4교육예배실'],['유치부','주일 오전 9:30','1층 2교육예배실'],['초등1부','주일 오전 9:30','지하 1교육예배실'],['초등2부','주일 오전 9:30','4층 5교육예배실'],['중고등부','주일 오전 10:30','1층 소예배실']]) +
    '<h3 class="h3">양육</h3>' + TBL(['모임','시간','장소'], [
      ['제1청년부','주일 오후 1:40','지하 콘서트홀'],['제2청년부','주일 오후 1:40','1층 소예배실'],['제3청년부','주일 오후 1:40','1층 2교육예배실'],['새가족반','주일 1·2부 예배 후','2층 새가족실'],['권찰회','매주 금요일 오전 10:00','1층 소예배실'],['양육과정','매주 목요일 저녁 7:00','1층 소예배실']]) +
    '<h3 class="h3">자치기관</h3>' + TBL(['모임','시간','장소'], [
      ['남전도회·여전도회 월례회','매월 마지막 주일 2부 예배 후','각 전도회 교실']]) },
  staff: { body: '<h3 class="h3">교역자</h3><ul class="staff">' +
      [['담임목사','○○○'],['부목사','○○○'],['교육목사','○○○'],['전도사','○○○']].map(s => '<li><span class="avatar ms">person</span><b>' + s[1] + '</b><span>' + s[0] + '</span></li>').join('') + '</ul>' +
    '<h3 class="h3">장로</h3>' + TBL(['직분','이름','섬기는 곳'], [['시무장로','○○○','재정부'],['시무장로','○○○','교육부'],['시무장로','○○○','선교부'],['시무장로','○○○','관리부']]) },
  directions: { body: `
    <div class="map-big"><img src="img/map.jpg" alt="교회 위치 지도"></div>
    <dl class="info">
      <div><dt>주소</dt><dd>경북 포항시 남구 희망대로 466</dd></div>
      <div><dt>전화</dt><dd>054-275-3121</dd></div>
      <div><dt>팩스</dt><dd>054-282-7211</dd></div>
      <div><dt>버스</dt><dd>○○ 정류장 하차 후 도보 3분 (시내버스 ○○○번, ○○○번)</dd></div>
      <div><dt>주차</dt><dd>교회 앞마당 및 교육관 뒤편 주차장 이용</dd></div>
    </dl>
    <div class="btn-row"><button type="button" class="btn" data-action="soon">카카오맵으로 보기</button><button type="button" class="btn line" data-action="soon">네이버 지도로 보기</button><button type="button" class="btn line" data-action="soon">티맵으로 보기</button><a class="btn line" href="#" data-copy="경북 포항시 남구 희망대로 466"><span class="ms">content_copy</span>주소 복사</a></div>` },
  shuttle: { body: '<p class="page-lead">주일 오전에 교회 차량이 운행됩니다. 이용하실 분은 교회 사무실로 연락해 주세요.</p>' +
    '<h3 class="h3">1호차 (주일 1부)</h3>' + TBL(['정류장','시간'], [['○○아파트 정문','오전 8:50'],['○○시장 앞','오전 9:00'],['○○초등학교','오전 9:10'],['교회 도착','오전 9:20']]) +
    '<h3 class="h3">2호차 (주일 2부)</h3>' + TBL(['정류장','시간'], [['○○동 행정복지센터','오전 11:15'],['○○병원 앞','오전 11:25'],['○○아파트 후문','오전 11:35'],['교회 도착','오전 11:45']]) +
    '<p class="note-box"><span class="ms">call</span>차량 문의: 교회 사무실 054-275-3121</p>' },
  sns: { body: '<p class="page-lead">교회 소식을 SNS에서도 만나보세요.</p><ul class="sns">' +
    [['smart_display','유튜브','설교 실황 영상','#e62117'],['photo_camera','인스타그램','교회 사진과 소식','#c13584'],['chat','카카오톡 채널','공지와 주보 알림','#f5c400'],['groups','네이버 밴드','부서별 모임 소식','#2db400']]
      .map(s => '<li><a href="#" data-action="soon"><span class="sns-ic ms" style="background:' + s[3] + '">' + s[0] + '</span><b>' + s[1] + '</b><span>' + s[2] + '</span><span class="go ms">open_in_new</span></a></li>').join('') + '</ul>' },
  praise1: { body: VIDEO('11월 15일 주일 1부 예배 찬양') + '<h3 class="h3">지난 찬양</h3>' + TBL(['날짜','찬양'], [['2026.11.15','감사 찬양 (찬양팀)'],['2026.11.08','주 은혜임을 (찬양팀)'],['2026.11.01','은혜 아니면 (찬양팀)'],['2026.10.25','내 영혼이 은총 입어 (찬양팀)']]) },
  praise2: { body: VIDEO('11월 15일 주일 2부 예배 찬양') + '<h3 class="h3">지난 찬양</h3>' + TBL(['날짜','찬양'], [['2026.11.15','감사의 노래 (찬양대)'],['2026.11.08','주의 사랑 (찬양대)'],['2026.11.01','거룩하신 주 (찬양대)'],['2026.10.25','평화의 기도 (찬양대)']]) },
  bonfire: { body: `
    <figure class="img-wide"><img src="img/album-5.jpg" alt=""></figure>
    <div class="prose"><p>모닥불 기도회는 매월 마지막 토요일 저녁, 교회 마당에 모여 함께 찬양하고 기도하는 시간입니다. 온 가족이 함께 참여할 수 있습니다.</p></div>
    <dl class="info"><div><dt>일시</dt><dd>매월 마지막 토요일 오후 7:30</dd></div><div><dt>장소</dt><dd>교회 마당 (비가 오면 본당)</dd></div><div><dt>대상</dt><dd>온 성도와 가족</dd></div></dl>` },
  education: { body: '<p class="page-lead">다음 세대를 믿음의 사람으로 세웁니다.</p><ul class="dept">' +
    [['유아부','영유아(1~4세)','주일 오전 9:30 · 2층 4교육예배실','부모와 함께 드리는 예배'],['유치부','미취학 아동(5~7세)','주일 오전 9:30 · 1층 2교육예배실','노래와 율동, 성경 이야기'],['초등1부','초등 1~3학년','주일 오전 9:30 · 지하 1교육예배실','말씀 암송과 공과 공부'],['초등2부','초등 4~6학년','주일 오전 9:30 · 4층 5교육예배실','큐티와 소그룹 나눔'],['중고등부','중·고등학생','주일 오전 10:30 · 1층 소예배실','찬양과 말씀, 수련회']]
      .map(d => '<li><div class="dept-hd"><b>' + d[0] + '</b><span>' + d[1] + '</span></div><p>' + d[3] + '</p><p class="dept-meta"><span class="ms">schedule</span>' + d[2] + '</p></li>').join('') + '</ul>' },
  care: { body: `
    <div class="prose"><p>교회에 처음 오신 분들이 신앙의 기초를 다지고 교회 공동체에 잘 정착하실 수 있도록 5주 과정의 새가족 양육을 진행합니다.</p></div>
    <ol class="steps">
      <li><b>1주</b>구원의 확신</li><li><b>2주</b>하나님과의 교제</li><li><b>3주</b>말씀과 기도</li><li><b>4주</b>교회 공동체</li><li><b>5주</b>섬김과 수료</li>
    </ol>
    <dl class="info"><div><dt>시간</dt><dd>주일 1·2부 예배 후 (5주)</dd></div><div><dt>장소</dt><dd>2층 새가족실</dd></div></dl>` },
  training: { body: `
    <div class="prose"><p>평신도 지도자를 세우는 1년 과정의 훈련입니다. 말씀 공부와 기도, 실천 과제를 통해 교회를 섬기는 일꾼으로 준비됩니다.</p></div>
    ${TBL(['과정','기간','내용'], [['기초반','3~6월','성경 개관, 기도 생활'],['성장반','9~11월','제자의 삶, 섬김'],['리더반','이듬해 3~6월','소그룹 인도, 상담 기초']])}` },
  youth1: { body: `
    <figure class="img-wide"><img src="img/album-1.jpg" alt=""></figure>
    <div class="prose"><p>제1청년부는 대학생 청년들이 함께 찬양하고 교제하는 공동체입니다. 주일 예배 후 모임과 봉사 활동을 합니다.</p></div>
    <dl class="info"><div><dt>대상</dt><dd>대학생</dd></div><div><dt>모임</dt><dd>주일 오후 1:40 · 지하 콘서트홀</dd></div><div><dt>문의</dt><dd>교회 사무실 054-275-3121</dd></div></dl>` },
  youth2: { body: `
    <figure class="img-wide"><img src="img/album-3.jpg" alt=""></figure>
    <div class="prose"><p>제2청년부는 대학 졸업 이후 결혼 전까지의 청년들이 함께 말씀을 나누고 교제하는 공동체입니다.</p></div>
    <dl class="info"><div><dt>대상</dt><dd>대학 졸업 이후 ~ 결혼 전 청년</dd></div><div><dt>모임</dt><dd>주일 오후 1:40 · 1층 소예배실</dd></div><div><dt>문의</dt><dd>교회 사무실 054-275-3121</dd></div></dl>` },
  youth3: { body: `
    <figure class="img-wide"><img src="img/album-5.jpg" alt=""></figure>
    <div class="prose"><p>제3청년부는 결혼 후 3년까지의 신혼부부들이 함께 가정을 세워 가는 공동체입니다.</p></div>
    <dl class="info"><div><dt>대상</dt><dd>결혼 후 3년까지 신혼부부</dd></div><div><dt>모임</dt><dd>주일 오후 1:40 · 1층 2교육예배실</dd></div><div><dt>문의</dt><dd>교회 사무실 054-275-3121</dd></div></dl>` }
};

/* 게시판 글 본문 (종류별 예시) */
const POST_BODY = {
  newfamily: ['이번 주 우리 교회에 새로 오신 가족을 소개합니다.', '처음 오신 분들이 낯설지 않도록 따뜻하게 맞아 주세요. 새가족 양육(5주)은 주일 오후 1시 새가족실에서 시작됩니다.', '※ 사진과 이름은 본인 동의를 받은 경우에만 올립니다.'],
  freeboard: ['지난 수요기도회 말씀을 듣고 마음에 큰 위로를 받았습니다.', '요즘 힘든 일이 많았는데 함께 기도해 주시는 분들 덕분에 힘을 얻습니다. 모두 감사합니다.', '— 익명으로 남깁니다.'],
  dawn: ['오늘 새벽기도회 말씀을 나눕니다.', '“여호와는 나의 목자시니 내게 부족함이 없으리로다” (시편 23:1)', '하루를 시작하며 주님께 모든 것을 맡기는 성도 되시길 바랍니다.'],
  domestic: ['이번 달 국내선교 활동을 알려 드립니다.', '지역의 홀로 계신 어르신 댁을 방문하여 반찬을 나누고 함께 기도드렸습니다. 함께해 주신 성도님들께 감사드립니다.'],
  overseas: ['선교지에서 소식을 전해 왔습니다.', '현지 교회 주일학교가 꾸준히 성장하고 있으며, 새 모임 처소를 위해 기도를 부탁드립니다.'],
  elder: ['노인대학 소식을 전합니다.', '어르신들과 함께 즐거운 시간을 보냈습니다. 봉사해 주신 선생님들께 감사드립니다.']
};
