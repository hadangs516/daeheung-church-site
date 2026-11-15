/* ============================================================
   설정 파일 (디자인과 무관, 디자인을 바꿔도 이 파일은 그대로 쓴다)
   - 교회 정보, 시트 주소, 메뉴 구조, 안내 문구
   ============================================================ */
window.CHURCH_CONFIG = {
  church: {
    name: '포항대흥교회',
    address: '포항시 남구 희망대로 466(이동)',
    phone: '054-275-3121',
    fax: '054-282-7211'
  },

  // 설교 질문지 사이트 (설교마다 질문지 열을 따로 채우지 않으면 이 주소로 연결)
  questionUrl: 'https://hadangs516.github.io/daeheung-youth-note/',

  // 대한성서공회 개역개정. 형식: 주소 + 책코드.장  (예: .../NKRV/JHN.3)
  bibleBase: 'https://bible.bskorea.or.kr/bible/NKRV/',

  // R2 공개 버킷 주소. 채우면 시트의 파일 칸에 파일 이름만 적어도 이 주소 뒤에 붙는다.
  // 예: 'https://pub-xxxx.r2.dev/'  (칸에 https://로 시작하는 전체 주소를 적으면 그 주소를 그대로 쓴다)
  fileBase: '',

  // 마지막 글이 이 기간(년)보다 오래된 메뉴는 숨긴다. 0이면 이 규칙을 끈다.
  staleYears: 2,

  // 초안 단계: true면 내용이 없거나 오래된 메뉴도 모두 보인다. false면 숨김 규칙 적용
  showAll: true,

  // 구글 시트 각 탭을 '웹에 게시 > CSV'로 만든 주소를 넣는다.
  // 비워 두면 js/sample-data.js의 예시 데이터를 쓴다(화면 위에 예시 안내줄이 뜬다).
  sheets: {
    sermons: '',
    posts: '',
    photos: '',
    events: '',
    pages: ''
  },

  // 방문자 수. demo가 true면 "(예시 숫자입니다)"가 같이 표시된다.
  visitor: { today: 128, total: 45678, demo: true },

  // data-notice="키" 로 띄우는 안내 문구
  messages: {
    locked: '로그인 기능 업데이트 이후 사용 가능합니다.',
    notBuilt: '이 기능은 아직 만들어지지 않았습니다.',
    // 내용이 아직 없는 페이지에 보이는 문구
    preparing: '준비 중입니다.'
  },

  categories: ['주일오전예배', '주일오후예배', '수요기도회'],

  // 게시판 이름. 시트 posts 탭의 board 열 값과 같아야 한다.
  boards: {
    notice:    { title: '공지사항' },
    bulletin:  { title: '주보' },
    newfamily: { title: '새가족소개' },
    resources: { title: '자료실' },
    freeboard: { title: '자유게시판' },
    men:       { title: '남전도회' },
    women:     { title: '여전도회' },
    elder:     { title: '노인대학' },
    building:  { title: '교회건축' },
    promo:     { title: '교회홍보영상' },
    domestic:  { title: '국내선교' },
    overseas:  { title: '해외선교' },
    community: { title: '커뮤니티 소식' }
  },

  /* 메뉴. 항목 종류:
       page:'슬러그'   고정 페이지 (시트 pages 탭에 행이 있어야 보임)
       board:'게시판'  게시판 (글이 있고 오래되지 않아야 보임)
       sermons / album / schedule  (데이터가 있어야 보임)
       locked:true    로그인 필요 (항상 보이고, 누르면 안내만 뜸) */
  menu: [
    { label: '교회소개', items: [
      { label: '인사말', page: 'greeting' },
      { label: '목회비전', page: 'vision' },
      { label: '교회연혁', page: 'history' },
      { label: '예배안내', page: 'worship-info' },
      { label: '섬기는 분들', page: 'staff' },
      { label: '찾아오시는 길', page: 'directions' },
      { label: '교회홍보영상', board: 'promo' },
      { label: '교회건축', board: 'building' },
      { label: '차량안내', page: 'shuttle' }
    ]},
    { label: '예배·찬양', items: [
      { label: '설교', sermons: true },
      { label: '1부 예배 찬양', locked: true },
      { label: '2부 예배 찬양', locked: true },
      { label: '행사·집회영상', locked: true }
    ]},
    { label: '찬양대', items: [
      { label: '할렐루야찬양대', locked: true },
      { label: '에셀찬양대', locked: true },
      { label: '절기찬양', locked: true },
      { label: '미디어사역', locked: true }
    ]},
    { label: '교육·양육', items: [
      { label: '교육부서 소개', page: 'education' },
      { label: '새가족양육', page: 'care' },
      { label: '평신도사역훈련', page: 'training' },
      { label: '화요성경공부', page: 'bible-study' },
      { label: '제1청년회', page: 'youth1' },
      { label: '청년부부회', page: 'youth-couple' }
    ]},
    { label: '선교·봉사', items: [
      { label: '국내선교', board: 'domestic' },
      { label: '해외선교', board: 'overseas' },
      { label: '노인대학', board: 'elder' }
    ]},
    { label: '성도의 교제', items: [
      { label: '공지사항', board: 'notice' },
      { label: '주보', board: 'bulletin' },
      { label: '새가족소개', board: 'newfamily' },
      { label: '자료실', board: 'resources' },
      { label: '포토앨범', album: true },
      { label: '자유게시판', board: 'freeboard' },
      { label: '남전도회', board: 'men' },
      { label: '여전도회', board: 'women' }
    ]},
    { label: '커뮤니티', items: [
      { label: '커뮤니티 소식', board: 'community' }
    ]}
  ]
};
