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
    category: 'Game · Link',
    url: 'https://ajak-75.github.io/komi-pop/',
    icon: './apps/komi-pop.png?v=4',
    icon2x: './apps/komi-pop-512.png?v=4',
    iconBg: 'transparent',
    desc: {
      ko: '같은 코미·모모 구슬을 3개 이상 한붓으로 이어 터뜨리는 60초 퍼즐. 7개 이상 이으면 황금 폭탄이 생기고, 게이지를 채우면 피버 타임. 최고 점수는 기기에 저장돼요.',
      en: 'Link three or more matching Komi and Momo beads in one stroke and pop them in 60 seconds. Link seven for a golden bomb, and fill the gauge for Fever Time. Your best score stays on your device.',
      ja: '同じコミ・モモの玉を3つ以上ひと筆でつないで弾けさせる60秒パズル。7つ以上で黄金ボムが生まれ、ゲージを溜めるとフィーバータイム。ベストスコアは端末に保存されます。',
      zh: '把三颗以上相同的科米、莫莫珠子一笔连起来爆掉，限时60秒。连到七颗会掉出黄金炸弹，集满能量就进入狂热时间。最高分保存在你的设备上。',
      'zh-tw': '把三顆以上相同的科米、莫莫珠子一筆連起來爆掉，限時60秒。連到七顆會掉出黃金炸彈，集滿能量就進入狂熱時間。最高分保存在你的裝置上。',
      es: 'Une tres o más cuentas iguales de Komi y Momo con un solo trazo y reviéntalas en 60 segundos. Con siete o más llega una bomba dorada, y al llenar la barra empieza el tiempo de fiebre. Tu récord se queda en tu dispositivo.',
      fr: 'Reliez trois billes identiques de Komi et Momo ou plus d’un seul trait et faites-les éclater en 60 secondes. À sept billes, une bombe dorée apparaît ; la jauge pleine déclenche le temps de fièvre. Votre record reste sur votre appareil.',
      de: 'Verbinde drei oder mehr gleiche Komi- und Momo-Kugeln mit einem Strich und lass sie in 60 Sekunden platzen. Ab sieben gibt es eine goldene Bombe, und die volle Leiste startet die Fieberzeit. Dein Bestwert bleibt auf deinem Gerät.',
      pt: 'Ligue três ou mais contas iguais de Komi e Momo com um só traço e estoure em 60 segundos. Com sete ou mais vem uma bomba dourada, e a barra cheia inicia o tempo de febre. Seu recorde fica no seu aparelho.',
      it: 'Unisci tre o più perline uguali di Komi e Momo con un solo tratto e falli scoppiare in 60 secondi. Con sette o più arriva una bomba dorata e la barra piena avvia il tempo febbre. Il record resta sul tuo dispositivo.',
      ru: 'Соедините три и больше одинаковых шариков Коми и Момо одним штрихом и лопните их за 60 секунд. С семи шариков появляется золотая бомба, а полная шкала включает время жара. Рекорд хранится на вашем устройстве.',
      id: 'Hubungkan tiga bola Komi dan Momo yang sama atau lebih dengan satu garis dan ledakkan dalam 60 detik. Tujuh bola memberi bom emas, dan bilah penuh memulai waktu demam. Rekor tersimpan di perangkatmu.',
      vi: 'Nối ba viên Komi và Momo giống nhau trở lên bằng một nét và làm nổ trong 60 giây. Bảy viên trở lên sẽ có bom vàng, thanh đầy sẽ bật thời gian bùng nổ. Kỷ lục lưu trên thiết bị của bạn.',
      th: 'ลากเส้นเดียวเชื่อมลูกโคมิและโมโม่ที่เหมือนกันตั้งแต่สามลูกขึ้นไปแล้วทำให้แตกภายใน 60 วินาที เชื่อมครบเจ็ดลูกจะมีระเบิดทอง และเกจเต็มจะเปิดช่วงฟีเวอร์ สถิติสูงสุดเก็บไว้ในเครื่องของคุณ',
      ar: 'اربط ثلاث كرات أو أكثر متشابهة من كومي ومومو بخط واحد وفجّرها خلال ٦٠ ثانية. سبع كرات تمنحك قنبلة ذهبية، وامتلاء الشريط يبدأ وقت الحماس. أفضل نتيجة تُحفظ على جهازك.'
    }
  },
  {
    id: 'k-sajoo',
    name: 'K-Sajoo',
    status: 'live',
    category: 'Fortune · Global',
    url: 'https://ajak-75.github.io/k-sajoo/',
    icon: './apps/k-sajoo.png?v=2',
    icon2x: './apps/k-sajoo-512.png?v=2',
    iconBg: 'transparent',
    desc: {
      "ko": "태양의 24절기와 출생지의 시간으로 세우는 글로벌 만세력. 년·월·일·시 네 기둥과 오행의 균형을 11개 언어로 읽고, 결과 카드를 PNG로 저장하세요.",
      "en": "A global four-pillars reading built from the 24 solar terms and your birthplace’s own clock. Year, month, day and hour pillars with the balance of five elements in 11 languages, plus a result card to save.",
      "ja": "太陽の二十四節気と出生地の時刻から立てるグローバル四柱推命。年・月・日・時の四柱と五行のバランスを11言語で読み、結果カードをPNGで保存できます。",
      "zh": "以太阳二十四节气和出生地时间排盘的全球四柱命理。用11种语言查看年月日时四柱与五行平衡，并可把结果保存为图片。",
      "zh-tw": "以太陽二十四節氣與出生地時間排盤的全球四柱命理。用11種語言查看年月日時四柱與五行平衡，並可把結果存成圖片。",
      "es": "Una lectura global de los cuatro pilares a partir de los 24 términos solares y del reloj de tu lugar de nacimiento. Tus pilares de año, mes, día y hora con los cinco elementos en 11 idiomas, y una tarjeta para guardar.",
      "fr": "Une lecture globale des quatre piliers, calculée avec les 24 termes solaires et l’heure de votre lieu de naissance. Vos piliers année, mois, jour et heure et les cinq éléments en 11 langues, avec une carte à enregistrer.",
      "de": "Eine globale Vier-Säulen-Lesung aus den 24 Sonnenabschnitten und der Uhr deines Geburtsorts. Deine Säulen für Jahr, Monat, Tag und Stunde mit den fünf Elementen in 11 Sprachen – und einer Karte zum Speichern.",
      "pt": "Uma leitura global dos quatro pilares a partir dos 24 termos solares e do relógio do seu local de nascimento. Seus pilares de ano, mês, dia e hora com os cinco elementos em 11 idiomas, e um cartão para salvar.",
      "it": "Una lettura globale dei quattro pilastri dai 24 termini solari e dall’orologio del tuo luogo di nascita. I pilastri di anno, mese, giorno e ora con i cinque elementi in 11 lingue, e una card da salvare.",
      "ru": "Глобальный разбор четырёх столпов по 24 солнечным терминам и часам места рождения. Столпы года, месяца, дня и часа и баланс пяти стихий на 11 языках — с карточкой результата.",
      "id": "Bacaan empat pilar global dari 24 istilah matahari dan jam tempat lahirmu. Pilar tahun, bulan, hari, dan jam dengan lima unsur dalam 11 bahasa, plus kartu hasil untuk disimpan.",
      "vi": "Lá số tứ trụ toàn cầu tính từ 24 tiết khí và giờ nơi bạn sinh. Bốn trụ năm, tháng, ngày, giờ cùng ngũ hành bằng 11 ngôn ngữ, kèm thẻ kết quả để lưu.",
      "th": "การอ่านสี่เสาสำหรับคนทั้งโลก จาก 24 สุริยคติและเวลาของสถานที่เกิด ดูเสาปี เดือน วัน ชั่วโมง พร้อมธาตุทั้งห้าใน 11 ภาษา และบันทึกการ์ดผลลัพธ์ได้",
      "ar": "قراءة عالمية للأعمدة الأربعة من الفصول الشمسية الأربعة والعشرين وساعة مكان الميلاد. أعمدة السنة والشهر واليوم والساعة مع توازن العناصر الخمسة بإحدى عشرة لغة، وبطاقة نتيجة قابلة للحفظ."
    }
  },
  {
    id: 'abi',
    name: 'ABI',
    status: 'live',
    category: 'Android APK · Phase 1',
    url: 'https://github.com/ajak-75/ABI-ai-agent',
    icon: './apps/abi.png?v=1',
    icon2x: './apps/abi-512.png?v=1',
    desc: {
      ko: '폰 안에서 바로 답하는 독립형 Android AI 비서. 대화·기억·작업 기록을 기기 속 SQLite에 두고 필요할 때만 클라우드로 넘기는 하이브리드 1단계입니다.',
      en: 'A standalone Android AI assistant that answers from the phone itself. Conversations, memories and task logs stay in the device’s own SQLite, and the cloud is called only when needed — Phase 1 of a hybrid design.',
      ja: 'スマホの中ですぐに答える独立型のAndroid AIアシスタント。会話・記憶・作業ログは端末のSQLiteに置き、必要なときだけクラウドへ渡すハイブリッド構成の第1段階です。',
      zh: '在手机里直接作答的独立型 Android AI 助手。对话、记忆与任务记录都存在设备的 SQLite 中，只在需要时交给云端——混合架构的第一阶段。',
      'zh-tw': '在手機裡直接作答的獨立型 Android AI 助手。對話、記憶與任務紀錄都存在裝置的 SQLite 中，只在需要時才交給雲端——混合架構的第一階段。',
      es: 'Un asistente de IA para Android independiente que responde desde el propio teléfono. Conversaciones, recuerdos y registros de tareas viven en el SQLite del dispositivo y la nube se usa solo cuando hace falta: la primera fase de un diseño híbrido.',
      fr: 'Un assistant IA Android autonome qui répond depuis le téléphone lui-même. Conversations, souvenirs et journaux de tâches restent dans le SQLite de l’appareil, et le cloud n’est appelé qu’au besoin : première étape d’une conception hybride.',
      de: 'Ein eigenständiger Android-KI-Assistent, der direkt auf dem Telefon antwortet. Gespräche, Erinnerungen und Aufgabenprotokolle liegen in der SQLite-Datenbank des Geräts, die Cloud wird nur bei Bedarf genutzt – Phase 1 eines hybriden Aufbaus.',
      pt: 'Um assistente de IA Android independente que responde no próprio celular. Conversas, memórias e registros de tarefas ficam no SQLite do aparelho, e a nuvem só entra quando precisa: a primeira fase de um desenho híbrido.',
      it: 'Un assistente IA Android autonomo che risponde dal telefono stesso. Conversazioni, ricordi e registri delle attività restano nel SQLite del dispositivo e il cloud entra solo quando serve: la prima fase di un’impostazione ibrida.',
      ru: 'Самостоятельный ИИ-ассистент для Android, который отвечает прямо с телефона. Разговоры, воспоминания и журнал задач хранятся в SQLite на устройстве, а облако подключается только при необходимости — первая фаза гибридной схемы.',
      id: 'Asisten AI Android mandiri yang menjawab langsung dari ponsel. Percakapan, memori, dan catatan tugas tersimpan di SQLite perangkat, dan cloud hanya dipanggil saat perlu — fase pertama rancangan hibrida.',
      vi: 'Trợ lý AI Android độc lập, trả lời ngay trên điện thoại. Hội thoại, ký ức và nhật ký công việc nằm trong SQLite của máy, chỉ gọi đám mây khi cần — giai đoạn đầu của thiết kế lai.',
      th: 'ผู้ช่วย AI บน Android ที่ทำงานในเครื่องและตอบได้ทันที บทสนทนา ความจำ และบันทึกงานเก็บไว้ใน SQLite ของเครื่อง เรียกคลาวด์เฉพาะเมื่อจำเป็น — เฟสแรกของโครงสร้างแบบไฮบริด',
      ar: 'مساعد ذكاء اصطناعي مستقل على أندرويد يجيب من الهاتف نفسه. تبقى المحادثات والذكريات وسجلات المهام في قاعدة SQLite على الجهاز، ولا تُستدعى السحابة إلا عند الحاجة — المرحلة الأولى من تصميم هجين.'
    }
  },
  {
    id: 'bubble-merge',
    name: 'KOMI & MOMO BUBBLE MERGE',
    status: 'live',
    category: 'Casual Puzzle · Web Game',
    url: 'https://ajak-75.github.io/komi-momo-bubble-merge/',
    icon: './apps/bubble-merge.png?v=1',
    icon2x: './apps/bubble-merge-512.png?v=1',
    desc: {
      ko: '코미와 모모, 두 계열의 버블을 떨어뜨려 같은 것끼리 키우고 왕관 버블끼리 합쳐 레전더리를 만드는 무료 웹 퍼즐. 설치 없이 브라우저에서 바로 즐기고, 도감과 최고 점수는 기기에 남습니다.',
      en: 'A free web puzzle: drop Komi and Momo bubbles, grow each line by merging twins, then bring the two royals together into the Legendary. Play right in the browser, no install — your collection and best score stay on your device.',
      ja: 'コミとモモ、2つの系統のバブルを落として同じもの同士を育て、王冠どうしを合体させてレジェンダリーを生み出す無料のウェブパズル。インストール不要で、図鑑とベストスコアは端末に残ります。',
      zh: '把科米与莫莫两条系列的泡泡放下来，相同的两颗合成成长，最后让两顶王冠合体成传奇。免安装的免费网页拼图，图鉴与最高分保存在设备上。',
      'zh-tw': '把科米與莫莫兩條系列的泡泡放下來，相同的兩顆合成成長，最後讓兩頂王冠合體成傳奇。免安裝的免費網頁拼圖，圖鑑與最高分保存在裝置上。',
      es: 'Un puzle web gratuito: deja caer burbujas de Komi y Momo, une las iguales de cada línea y corona a la Leyenda al juntar a los dos royals. Sin instalar, y tu colección y récord se quedan en tu dispositivo.',
      fr: 'Un puzzle web gratuit : lâchez les bulles Komi et Momo, fusionnez les identiques de chaque lignée et couronnez la Légende en réunissant les deux royaux. Sans installation, collection et record restent sur votre appareil.',
      de: 'Ein kostenloses Web-Puzzle: Lass Komi- und Momo-Blasen fallen, verbinde die Gleichen jeder Reihe und kröne die Legende, indem du beide Royals verschmilzt. Ohne Installation – Sammlung und Bestwert bleiben auf deinem Gerät.',
      pt: 'Um quebra-cabeça web gratuito: solte bolhas de Komi e Momo, junte as iguais de cada linhagem e coroe a Lenda ao fundir os dois royals. Sem instalar, e sua coleção e recorde ficam no aparelho.',
      it: 'Un puzzle web gratuito: lascia cadere le bolle di Komi e Momo, unisci le uguali di ogni stirpe e incorona la Leggenda fondendo i due royal. Senza installare, collezione e record restano sul dispositivo.',
      ru: 'Бесплатная веб-головоломка: бросайте пузыри Коми и Момо, соединяйте одинаковых в каждой линии и соберите Легенду, слив двух роялов. Без установки — коллекция и рекорд остаются на устройстве.',
      id: 'Puzzle web gratis: jatuhkan gelembung Komi dan Momo, satukan yang sama di tiap garis, lalu satukan dua bangsawan menjadi Legenda. Tanpa instal, koleksi dan rekor tersimpan di perangkatmu.',
      vi: 'Trò chơi ghép miễn phí trên web: thả bong bóng Komi và Momo, ghép những quả giống nhau trong từng dòng và hợp nhất hai quả hoàng gia thành Huyền Thoại. Không cần cài, bộ sưu tập và kỷ lục lưu trên thiết bị.',
      th: 'เกมจับคู่ฟรีบนเว็บ ปล่อยบับเบิลโคมิและโมโม่ รวมคู่ที่เหมือนกันในแต่ละสาย แล้วรวมบับเบิลมงกุฎสององค์เป็นตำนาน ไม่ต้องติดตั้ง สมุดสะสมและสถิติเก็บไว้ในเครื่อง',
      ar: 'لعبة ويب مجانية: أسقط فقاعات كۆمي ومومو، وادمج المتشابهين في كل سلالة، ثم اجمع التاجين لتصل إلى الأسطورة. بلا تثبيت، وتبقى المجموعة وأفضل نتيجة على جهازك.'
    }
  }
];
