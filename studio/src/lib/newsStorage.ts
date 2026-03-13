/**
 * Admin-managed news posts (最新消息). Stored in localStorage for demo.
 * Public NewsPage reads from here when available; otherwise falls back to DUMMY_NEWS_POSTS.
 */

/** Supported news languages (admin inputs all three; public gets one via ?lang=). */
export type NewsLang = 'zh-TW' | 'zh-CN' | 'en';

export interface StoredNewsPost {
  id: string;
  /** Legacy single title (used when multilang not set). */
  title: string;
  /** Legacy single content (used when multilang not set). */
  content: string;
  /** Title in 繁體中文 (admin input). */
  title_zh_tw?: string;
  /** Title in 简体中文 (admin input). */
  title_zh_cn?: string;
  /** Title in English (admin input). */
  title_en?: string;
  /** Content in 繁體中文. */
  content_zh_tw?: string;
  /** Content in 简体中文. */
  content_zh_cn?: string;
  /** Content in English. */
  content_en?: string;
  /** Image URL (external URL or data URL from upload). */
  image_url: string | null;
  published_at: string; // ISO
  created_at: string;   // ISO
  /** If true, show this post in a pop-up when user visits the site. */
  show_as_popup?: boolean;
}

/** Display title for list (first non-empty language). */
export function getPostDisplayTitle(p: StoredNewsPost): string {
  return p.title_zh_tw?.trim() || p.title_zh_cn?.trim() || p.title_en?.trim() || p.title?.trim() || '';
}

const STORAGE_KEY = 'the_yard_news_posts';

/** Demo news (dance discounts, new courses, trial offers) when API/storage is empty. */
const DEMO_NEWS_ENTRIES: Array<{
  id: string;
  image_url: string | null;
  daysAgo: number;
  content: { 'zh-TW': { title: string; content: string }; 'zh-CN': { title: string; content: string }; 'en': { title: string; content: string } };
}> = [
  {
    id: 'demo-1',
    daysAgo: 0,
    image_url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=800&q=80',
    content: {
      'zh-TW': { title: '學跳舞限時折扣 — 代幣套票 9 折', content: '即日起至本月底，報名任何舞蹈課程並購買代幣套票，可享 9 折優惠。\n\n適用於芭蕾、街舞、K-Pop、兒童舞蹈等全部課程。名額有限，先到先得。請到課程表預約試堂或聯絡我們查詢。' },
      'zh-CN': { title: '学跳舞限时折扣 — 代币套票 9 折', content: '即日起至本月底，报名任何舞蹈课程并购买代币套票，可享 9 折优惠。\n\n适用于芭蕾、街舞、K-Pop、儿童舞蹈等全部课程。名额有限，先到先得。请到课程表预约试堂或联络我们查询。' },
      'en': { title: 'Dance Learning Discount — 10% Off Token Packages', content: 'For a limited time this month, get 10% off token packages when you sign up for any dance class.\n\nApplies to ballet, street dance, K-Pop, kids dance and all other courses. Limited places. Book a trial or contact us for details.' },
    },
  },
  {
    id: 'demo-2',
    daysAgo: 2,
    image_url: 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=800&q=80',
    content: {
      'zh-TW': { title: '新開設：K-Pop 進階班與成人芭蕾', content: '全新舞蹈課程現已開放報名。\n\n・K-Pop 進階班 — 每週二、四晚上，適合已有基礎的學員。\n・成人芭蕾 — 每週三晚上，從零開始也可參加。\n\n歡迎到課程表查看時間並預約試堂。' },
      'zh-CN': { title: '新开设：K-Pop 进阶班与成人芭蕾', content: '全新舞蹈课程现已开放报名。\n\n・K-Pop 进阶班 — 每周二、四晚上，适合已有基础的学员。\n・成人芭蕾 — 每周三晚上，从零开始也可参加。\n\n欢迎到课程表查看时间并预约试堂。' },
      'en': { title: 'New Classes: K-Pop Advanced & Adult Ballet', content: 'New dance courses are now open for enrollment.\n\n・K-Pop Advanced — Tue & Thu evenings, for students with some experience.\n・Adult Ballet — Wed evenings, beginners welcome.\n\nCheck the calendar for times and book a trial.' },
    },
  },
  {
    id: 'demo-3',
    daysAgo: 5,
    image_url: 'https://images.unsplash.com/photo-1524594152303-9fd13543fe6e?w=800&q=80',
    content: {
      'zh-TW': { title: '試堂優惠 — 首堂半價', content: '新生專屬：首次試堂享半價優惠。\n\n可選課程包括兒童舞蹈、街舞、K-Pop、芭蕾等。只需在課程表選擇心儀時段，填寫試堂申請即可。每人限用一次，數量有限。' },
      'zh-CN': { title: '试堂优惠 — 首堂半价', content: '新生专属：首次试堂享半价优惠。\n\n可选课程包括儿童舞蹈、街舞、K-Pop、芭蕾等。只需在课程表选择心仪时段，填写试堂申请即可。每人限用一次，数量有限。' },
      'en': { title: 'Trial Class Offer — Half Price First Lesson', content: 'New students: your first trial class is half price.\n\nChoose from kids dance, street dance, K-Pop, ballet and more. Pick a slot on the calendar and submit a trial application. One per person, limited availability.' },
    },
  },
  {
    id: 'demo-4',
    daysAgo: 8,
    image_url: 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800&q=80',
    content: {
      'zh-TW': { title: '暑期舞蹈營 現正招生', content: '今年暑假開辦兒童及青少年舞蹈營，為期一週，每日 2–3 小時。\n\n內容包括街舞、K-Pop、編舞與成果展。適合 6–15 歲。名額有限，請儘早報名。' },
      'zh-CN': { title: '暑期舞蹈营 现正招生', content: '今年暑假开办儿童及青少年舞蹈营，为期一周，每日 2–3 小时。\n\n内容包括街舞、K-Pop、编舞与成果展。适合 6–15 岁。名额有限，请尽早报名。' },
      'en': { title: 'Summer Dance Camp — Enrollment Open', content: 'Week-long dance camp for kids and teens this summer, 2–3 hours per day.\n\nIncludes street dance, K-Pop, choreography and a showcase. Ages 6–15. Limited places — sign up early.' },
    },
  },
  {
    id: 'demo-5',
    daysAgo: 12,
    image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
    content: {
      'zh-TW': { title: 'Yayakids 兒童舞蹈班 新學期開課', content: 'Yayakids 兒童舞蹈學院新學期即將開課，設有幼兒律動、芭蕾基礎、街舞入門等班別。\n\n對象 3–12 歲，小班教學。可先預約試堂再決定報名。詳情請見課程表或聯絡我們。' },
      'zh-CN': { title: 'Yayakids 儿童舞蹈班 新学期开课', content: 'Yayakids 儿童舞蹈学院新学期即将开课，设有幼儿律动、芭蕾基础、街舞入门等班别。\n\n对象 3–12 岁，小班教学。可先预约试堂再决定报名。详情请见课程表或联络我们。' },
      'en': { title: 'Yayakids Kids Dance — New Term Starting', content: 'Yayakids Dance Academy new term is starting soon. Classes include creative movement, ballet basics and street dance for ages 3–12. Small groups.\n\nBook a trial before committing. See the calendar or contact us for details.' },
    },
  },
  {
    id: 'demo-6',
    daysAgo: 15,
    image_url: null,
    content: {
      'zh-TW': { title: '三月週末親子舞蹈工作坊', content: '歡迎家長與小朋友一起參加週末親子舞蹈工作坊，透過簡單律動增進親子互動。名額有限，請提早報名。' },
      'zh-CN': { title: '三月周末亲子舞蹈工作坊', content: '欢迎家长与小朋友一起参加周末亲子舞蹈工作坊，透过简单律动增进亲子互动。名额有限，请提早报名。' },
      'en': { title: 'March Weekend Parent-Child Dance Workshop', content: 'Join our weekend parent-child dance workshop. Simple movements for bonding. Limited places — book early.' },
    },
  },
  {
    id: 'demo-7',
    daysAgo: 18,
    image_url: null,
    content: {
      'zh-TW': { title: '街舞 Battle 交流賽 報名開始', content: '本中心將舉辦街舞交流賽，歡迎學員與外界舞者報名。設有少年組與成人組，詳情請見最新公告。' },
      'zh-CN': { title: '街舞 Battle 交流赛 报名开始', content: '本中心将举办街舞交流赛，欢迎学员与外界舞者报名。设有少年组与成人组，详情请见最新公告。' },
      'en': { title: 'Street Dance Battle — Registration Open', content: 'We are hosting a street dance battle. Open to students and external dancers. Junior and adult categories. See announcements for details.' },
    },
  },
  {
    id: 'demo-8',
    daysAgo: 21,
    image_url: null,
    content: {
      'zh-TW': { title: '清明連假課程安排通知', content: '清明連假期間部分課程時間將調整，請學員留意課表更新並以系統通知為準。' },
      'zh-CN': { title: '清明连假课程安排通知', content: '清明连假期间部分课程时间将调整，请学员留意课表更新并以系统通知为准。' },
      'en': { title: 'Holiday Schedule Update', content: 'Some class times will change during the holiday period. Please check the updated schedule and system notifications.' },
    },
  },
  {
    id: 'demo-9',
    daysAgo: 25,
    image_url: null,
    content: {
      'zh-TW': { title: '成人芭蕾體驗班 四月開班', content: '專為成人設計的芭蕾體驗班，無基礎可參加。每週一堂，為期四週。歡迎預約試堂。' },
      'zh-CN': { title: '成人芭蕾体验班 四月开班', content: '专为成人设计的芭蕾体验班，无基础可参加。每周一堂，为期四周。欢迎预约试堂。' },
      'en': { title: 'Adult Ballet Taster — Starting April', content: 'Ballet taster for adults, no experience needed. One class per week for four weeks. Book a trial to join.' },
    },
  },
];

function getDemoNewsPostsForLocale(locale: string): StoredNewsPost[] {
  const lang = locale.startsWith('zh') ? (locale === 'zh-CN' ? 'zh-CN' : 'zh-TW') : 'en';
  const now = new Date();
  return DEMO_NEWS_ENTRIES.map((entry) => {
    const pub = new Date(now);
    pub.setDate(pub.getDate() - entry.daysAgo);
    const published_at = pub.toISOString();
    const created_at = pub.toISOString();
    const { title, content } = entry.content[lang];
    return { id: entry.id, title, content, image_url: entry.image_url, published_at, created_at };
  });
}

/** Demo posts (dance discounts, new courses, trial offers). Sorted by published_at descending. */
export function getDemoNewsPosts(locale?: string): StoredNewsPost[] {
  const posts = getDemoNewsPostsForLocale(locale || 'zh-TW');
  return [...posts].sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
}

function getStored(): StoredNewsPost[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setStored(posts: StoredNewsPost[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  } catch (e) {
    console.warn('Failed to save news posts to localStorage', e);
  }
}

/** Get news posts that are marked to show as pop-up (sorted by published_at desc). */
export function getPopupNewsPosts(): StoredNewsPost[] {
  const posts = getStored().filter((p) => p.show_as_popup === true);
  return [...posts].sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
}

/** Get all news posts saved by admin. */
export function getStoredNewsPosts(): StoredNewsPost[] {
  return getStored();
}

/** Save full list (replace all). Used by admin. */
export function saveStoredNewsPosts(posts: StoredNewsPost[]): void {
  setStored(posts);
}

/** Create a new post (generate id and created_at). */
export function createStoredNewsPost(input: {
  title?: string;
  content?: string;
  title_zh_tw?: string;
  title_zh_cn?: string;
  title_en?: string;
  content_zh_tw?: string;
  content_zh_cn?: string;
  content_en?: string;
  image_url: string | null;
  published_at: string;
  show_as_popup?: boolean;
}): StoredNewsPost {
  const id = `n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  return {
    id,
    title: input.title?.trim() ?? '',
    content: input.content?.trim() ?? '',
    title_zh_tw: input.title_zh_tw?.trim(),
    title_zh_cn: input.title_zh_cn?.trim(),
    title_en: input.title_en?.trim(),
    content_zh_tw: input.content_zh_tw?.trim(),
    content_zh_cn: input.content_zh_cn?.trim(),
    content_en: input.content_en?.trim(),
    image_url: input.image_url || null,
    published_at: input.published_at || now,
    created_at: now,
    show_as_popup: input.show_as_popup ?? false,
  };
}

/** Update existing post by id. */
export function updateStoredNewsPost(
  id: string,
  updates: Partial<Pick<StoredNewsPost, 'title' | 'content' | 'title_zh_tw' | 'title_zh_cn' | 'title_en' | 'content_zh_tw' | 'content_zh_cn' | 'content_en' | 'image_url' | 'published_at' | 'show_as_popup'>>
): boolean {
  const posts = getStored();
  const idx = posts.findIndex((p) => p.id === id);
  if (idx < 0) return false;
  posts[idx] = { ...posts[idx], ...updates };
  setStored(posts);
  return true;
}

/** Delete post by id. */
export function deleteStoredNewsPost(id: string): boolean {
  const posts = getStored().filter((p) => p.id !== id);
  if (posts.length === getStored().length) return false;
  setStored(posts);
  return true;
}
