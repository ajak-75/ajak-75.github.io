/* Ajak Studio — apps.js
   쇼케이스에 올라가는 앱 목록. 새 앱은 이 배열에 항목 하나만 추가하면 카드로 자동 렌더된다.
   desc 는 언어별 문구(ko·en·ja·zh·zh-tw·es 내장). 그 밖의 언어는 app.js가 자동 번역해 캐시한다.
   ─────────────────────────────────────────────────────────────
   status : 'live' (지금 사용 가능) | 'soon' (준비 중, url 없이도 됨)
   url    : 카드 전체를 눌렀을 때 열리는 주소
   icon / icon2x : 카드 아이콘(192·512px)
   iconBg : 아이콘 뒤 배경(투명 PNG 대비) — 생략하면 흰색, 'transparent'면 흰 박스 없이 그림자만
*/
window.AJAK_STUDIO_APPS = [
  {
    id: 'ajak',
    name: 'Ajak',
    status: 'live',
    category: 'Thread · Global',
    url: 'https://ajak-75.github.io/diary/',
    icon: './apps/ajak.png?v=3',
    icon2x: './apps/ajak-512.png?v=3',
    iconBg: 'transparent',
    desc: {
      ko: '코미·모모 캐릭터 없이 남녀노소 누구나 가볍게 일상과 생각을 나누는 한국판 스레드형 미니 SNS. 접속한 기기의 언어를 자동으로 감지해 각자의 언어로 열립니다.',
      en: 'A light, Threads-style mini social network for everyday thoughts — no mascots, just people. It detects each visitor’s device language and opens in their own.',
      ja: 'キャラクターなしで、誰でも気軽に日常や考えを共有できる韓国版Threads風ミニSNS。端末の言語を自動で検出し、それぞれの言葉で開きます。',
      zh: '没有角色设定，谁都能轻松分享日常与想法的韩版Threads风迷你社交网络。自动识别设备语言，以各自的母语打开。',
      'zh-tw': '沒有角色設定，誰都能輕鬆分享日常與想法的韓版Threads風迷你社群。自動偵測裝置語言，以各自的語言開啟。',
      es: 'Una mini red social estilo Threads para el día a día, sin mascotas: solo personas. Detecta el idioma del dispositivo y se abre en el idioma de cada visitante.',
      fr: 'Un mini réseau social à la Threads, sans mascottes : chacun partage son quotidien en toute simplicité. Il détecte la langue de l’appareil et s’ouvre dans la langue de chaque visiteur.',
      de: 'Ein leichtes Mini-Netzwerk im Threads-Stil – ohne Maskottchen, für alle, die ihren Alltag teilen möchten. Es erkennt die Gerätesprache und öffnet sich in der Sprache jedes Besuchers.',
      pt: 'Uma mini rede social no estilo Threads, sem mascotes: qualquer pessoa compartilha o dia a dia com leveza. Detecta o idioma do dispositivo e abre no idioma de cada visitante.',
      it: 'Un mini social network in stile Threads, senza mascotte: chiunque condivide la quotidianità con leggerezza. Rileva la lingua del dispositivo e si apre in quella di ogni visitatore.',
      ru: 'Мини-соцсеть в духе Threads — без маскотов: каждый легко делится повседневным. Определяет язык устройства и открывается на языке посетителя.',
      id: 'Jejaring sosial mini bergaya Threads tanpa maskot: siapa pun bisa berbagi keseharian dengan ringan. Mendeteksi bahasa perangkat dan terbuka dalam bahasa tiap pengunjung.',
      vi: 'Mạng xã hội mini kiểu Threads, không có linh vật: ai cũng chia sẻ được chuyện thường ngày một cách nhẹ nhàng. Tự nhận ngôn ngữ thiết bị và mở bằng ngôn ngữ của từng người.',
      th: 'โซเชียลมีนิแบบ Threads ที่ไม่มีมาสคอต ใครก็แชร์เรื่องราวในชีวิตประจำวันได้อย่างสบาย ๆ ตรวจจับภาษาของอุปกรณ์และเปิดในภาษาของผู้เข้าชมแต่ละคน',
      ar: 'شبكة تواصل صغيرة على طراز Threads بلا شخصيات كرتونية: يشارك فيها الجميع يومهم ببساطة. تكتشف لغة الجهاز وتفتح بلغة كل زائر.'
    }
  },
  {
    id: 'komi-diary',
    name: 'KOMI-Diary',
    status: 'live',
    category: 'K-Culture · Community',
    url: 'https://ajak-75.github.io/KOMI-Diary/',
    icon: './apps/komi-diary.png?v=2',
    icon2x: './apps/komi-diary-512.png?v=2',
    iconBg: 'transparent',
    desc: {
      ko: '전 세계 케미(Kemi)들이 모이는 K-컬처 팬덤 다이어리 · 모모 샵 · K-스타 케미 궁합 · 16개국어와 전 세계 언어를 자동 번역합니다.',
      en: 'A K-culture fandom diary where Kemis around the world meet — Momo Shop, K-star compatibility, and automatic translation into 16 languages and beyond.',
      ja: '世界中のケミ（Kemi）が集まるK-カルチャーファンダムダイアリー。モモショップ、Kスター相性診断、16言語＋世界の言語を自動翻訳。',
      zh: '全球Kemi汇聚的K-Culture粉丝日记。莫莫商店、K明星缘分测试，16种语言及全球语言自动翻译。',
      'zh-tw': '全球Kemi齊聚的K-Culture粉絲日記。莫莫商店、K明星緣分測驗，16種語言及全球語言自動翻譯。',
      es: 'El diario de fandom K-culture donde se encuentran Kemis de todo el mundo: Momo Shop, afinidad con estrellas K y traducción automática a 16 idiomas y más.',
      fr: 'Le journal de fandom K-culture où se retrouvent les Kemis du monde entier : Momo Shop, affinités avec les stars K et traduction automatique en 16 langues et plus.',
      de: 'Das K-Culture-Fandom-Tagebuch, in dem Kemis aus aller Welt zusammenkommen: Momo Shop, K-Star-Kompatibilität und automatische Übersetzung in 16 Sprachen und mehr.',
      pt: 'O diário de fandom K-culture onde Kemis do mundo todo se encontram: Momo Shop, afinidade com estrelas K e tradução automática para 16 idiomas e mais.',
      it: 'Il diario fandom K-culture dove si incontrano i Kemi di tutto il mondo: Momo Shop, affinità con le star K e traduzione automatica in 16 lingue e oltre.',
      ru: 'Дневник K-культурного фандома, где встречаются Kemi со всего мира: Momo Shop, совместимость со звёздами K и автоперевод на 16 языков и более.',
      id: 'Diari fandom K-culture tempat Kemi dari seluruh dunia berkumpul: Momo Shop, kecocokan dengan bintang K, dan terjemahan otomatis ke 16 bahasa dan lainnya.',
      vi: 'Nhật ký fandom K-culture nơi các Kemi khắp thế giới gặp nhau: Momo Shop, độ hợp với các ngôi sao K và dịch tự động sang 16 ngôn ngữ trở lên.',
      th: 'ไดอารี่แฟนดอม K-culture ที่เหล่า Kemi ทั่วโลกมาพบกัน: Momo Shop การเช็กดวงกับศิลปิน K และแปลอัตโนมัติกว่า 16 ภาษา',
      ar: 'مفكرة فاندوم K-culture حيث يلتقي الكيمي من كل العالم: متجر مومو، وتوافق نجوم K، وترجمة تلقائية إلى 16 لغة وأكثر.'
    }
  },
  {
    id: 'komi-pop',
    name: 'KOMI & MOMO POP',
    status: 'live',
    category: 'Game · Cozy',
    url: 'https://ajak-75.github.io/komi-pop/',
    icon: './apps/komi-pop.png?v=2',
    icon2x: './apps/komi-pop-512.png?v=2',
    iconBg: 'transparent',
    desc: {
      ko: '코미와 모모를 떨어뜨려 같은 친구끼리 합치는 힐링 퍼즐. 대왕 골드 코미까지 키워 보세요. 최고 점수는 기기에 저장돼요.',
      en: 'A cozy merge puzzle: drop Komi and Momo, pair the same friends and grow them all the way to the Golden King Komi. Your best score stays on your device.',
      ja: 'コミとモモを落として、同じ仲間どうしを合体。大王ゴールドコミまで育てる、やさしい合体パズル。ベストスコアは端末に保存されます。',
      zh: '把科米和莫莫放下来，两个相同的朋友碰在一起就会进化。一路养成大王黄金科米，最高分保存在你的设备上。',
      'zh-tw': '把科米和莫莫放下來，兩個相同的朋友碰在一起就會進化。一路養成大王黃金科米，最高分保存在你的裝置上。',
      es: 'Un puzle de fusiones para todos: deja caer a Komi y Momo, une a los amigos iguales y llévalos hasta el Gran Komi Dorado. Tu récord se queda en tu dispositivo.',
      fr: 'Un puzzle de fusion tout doux : lâchez Komi et Momo, réunissez les amis identiques et faites-les grandir jusqu’au Grand Komi Doré. Votre record reste sur votre appareil.',
      de: 'Ein gemütliches Fusion-Puzzle: Lass Komi und Momo fallen, verbinde gleiche Freunde und ziehe sie bis zum Goldenen König-Komi auf. Dein Bestwert bleibt auf deinem Gerät.',
      pt: 'Um quebra-cabeça de fusões fofinho: solte Komi e Momo, junte os amigos iguais e cresça até o Grande Komi Dourado. Seu recorde fica no seu aparelho.',
      it: 'Un puzzle di fusioni tenero: lascia cadere Komi e Momo, unisci gli amici uguali e cresci fino al Grande Komi Dorato. Il record resta sul tuo dispositivo.',
      ru: 'Уютная головоломка: бросайте Коми и Момо, соединяйте одинаковых друзей и растите до Золотого Короля Коми. Рекорд хранится на вашем устройстве.',
      id: 'Puzzle gabung yang gemas: jatuhkan Komi dan Momo, satukan teman yang sama, dan tumbuhkan sampai Komi Emas Raksasa. Rekor tersimpan di perangkatmu.',
      vi: 'Trò chơi ghép dễ thương: thả Komi và Momo, ghép hai người bạn giống nhau và lớn dần thành Komi Vàng Đại Vương. Kỷ lục lưu trên thiết bị của bạn.',
      th: 'เกมรวมร่างสุดน่ารัก ปล่อยโคมิกับโมโม่ให้เพื่อนที่เหมือนกันชนกัน แล้วโตขึ้นเรื่อย ๆ จนเป็นโคมิทองคำองค์ใหญ่ สถิติสูงสุดเก็บไว้ในเครื่องของคุณ',
      ar: 'لعبة دمج لطيفة: أسقط كۆمي ومومو، واجمع الصديقين المتشابهين لينموا حتى ملك كومي الذهبي. أفضل نتيجة تُحفظ على جهازك.'
    }
  }
];
