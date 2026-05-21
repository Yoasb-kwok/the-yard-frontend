/**
 * Seed data for the demo mock database. Rich and realistic so the demo looks
 * like a production system. All dates are relative to "now" so the calendar
 * stays fresh without a cron.
 */

import type { DemoDb } from './db';

const IMG = (seed: string, w = 800, h = 500) => `https://picsum.photos/seed/${seed}/${w}/${h}`;
const AVATAR = (seed: string) => `https://i.pravatar.cc/300?u=${seed}`;

const now = () => new Date();

function iso(d: Date): string {
  return d.toISOString();
}
function daysFromNow(days: number, hour = 0, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}
function hoursFromNow(hours: number): Date {
  const d = new Date();
  d.setHours(d.getHours() + hours, 0, 0, 0);
  return d;
}

export function buildSeed(): DemoDb {
  const nowIso = iso(now());

  // ---------------------------------------------------------------- Users
  const users: DemoDb['users'] = [
    {
      id: 'user_admin',
      email: 'admin@demo.com',
      password: 'demo1234',
      name: '阿 Sam (管理員)',
      role: 'admin',
      mobile: '91234567',
      country_code: '852',
      created_at: iso(daysFromNow(-365)),
    },
    {
      id: 'user_001',
      email: 'student@demo.com',
      password: 'demo1234',
      name: '陳小美',
      role: 'student',
      mobile: '62345678',
      country_code: '852',
      id_first_four: 'A123',
      id_last_four: '5678',
      student_id: 'yayakid1',
      nick_name: 'Amy',
      date_of_birth: '2014-05-12',
      sex: false,
      parents_name: '陳太太',
      contact_number: '62345678',
      residential_district: '九龍灣',
      has_joined_courses: true,
      level: 'intermediate',
      created_at: iso(daysFromNow(-120)),
    },
    {
      id: 'user_002',
      email: 'parent@demo.com',
      password: 'demo1234',
      name: '黃先生 (家長)',
      role: 'student',
      mobile: '69876543',
      country_code: '852',
      student_id: 'yayakid2',
      id_last_four: '9012',
      date_of_birth: '1985-03-20',
      sex: true,
      contact_number: '69876543',
      residential_district: '銅鑼灣',
      has_joined_courses: true,
      level: 'entry',
      created_at: iso(daysFromNow(-60)),
    },
    {
      id: 'user_003',
      email: 'teacher@demo.com',
      password: 'demo1234',
      name: '李老師',
      role: 'instructor',
      mobile: '65554444',
      country_code: '852',
      created_at: iso(daysFromNow(-200)),
    },
    {
      id: 'user_004',
      email: 'leo@demo.com',
      password: 'demo1234',
      name: 'Leo 林',
      role: 'student',
      mobile: '61112222',
      country_code: '852',
      student_id: 'yayakid4',
      id_last_four: '3456',
      date_of_birth: '2010-09-02',
      level: 'advanced',
      created_at: iso(daysFromNow(-30)),
    },
  ];

  // ---------------------------------------------------------- Instructors
  const instructors: DemoDb['instructors'] = [
    {
      id: 'inst_001',
      name: '李老師 Christy',
      bio: '專業芭蕾導師，香港演藝學院畢業，超過 10 年教學經驗。',
      bio_zh_tw: '專業芭蕾導師，香港演藝學院畢業，超過 10 年教學經驗。',
      bio_zh_cn: '专业芭蕾导师，香港演艺学院毕业，超过 10 年教学经验。',
      bio_en: 'Professional ballet instructor with 10+ years of experience. HKAPA graduate.',
      specialty: '芭蕾 / 現代舞',
      image_url: AVATAR('christy'),
      photo_url: AVATAR('christy'),
      is_active: true,
      display_order: 1,
    },
    {
      id: 'inst_002',
      name: '陳老師 Jay',
      bio: '街舞世界冠軍，曾擔任多個大型舞蹈比賽評審。',
      bio_zh_tw: '街舞世界冠軍，曾擔任多個大型舞蹈比賽評審。',
      bio_zh_cn: '街舞世界冠军，曾担任多个大型舞蹈比赛评审。',
      bio_en: 'World champion hip-hop dancer, judge at major dance competitions.',
      specialty: 'Hip-hop / K-pop',
      image_url: AVATAR('jay'),
      photo_url: AVATAR('jay'),
      is_active: true,
      display_order: 2,
    },
    {
      id: 'inst_003',
      name: '王老師 Kelly',
      bio: '兒童舞蹈專家，擅長啟蒙教學，深受學員喜愛。',
      bio_zh_tw: '兒童舞蹈專家，擅長啟蒙教學，深受學員喜愛。',
      bio_zh_cn: '儿童舞蹈专家，擅长启蒙教学，深受学员喜爱。',
      bio_en: 'Specialist in children dance education, beloved by students.',
      specialty: '兒童舞蹈 / Jazz',
      image_url: AVATAR('kelly'),
      photo_url: AVATAR('kelly'),
      is_active: true,
      display_order: 3,
    },
    {
      id: 'inst_004',
      name: '張老師 Rex',
      bio: '當代舞及爵士舞導師，編舞作品豐富。',
      bio_zh_tw: '當代舞及爵士舞導師，編舞作品豐富。',
      bio_zh_cn: '当代舞及爵士舞导师，编舞作品丰富。',
      bio_en: 'Contemporary and jazz instructor with a rich portfolio of choreography.',
      specialty: '當代舞 / Jazz',
      image_url: AVATAR('rex'),
      photo_url: AVATAR('rex'),
      is_active: true,
      display_order: 4,
    },
  ];

  // ------------------------------------------------------------- Classes
  const classes: DemoDb['classes'] = [];
  const baseClasses = [
    { name: '兒童芭蕾啟蒙班', program_code: 'KB-A', instructor: '王老師 Kelly', instructor_id: 'inst_003', level: 'entry', age_tag: '4-6', category: 'regular', weekday: 2, hour: 16, location: 'sanpokong' },
    { name: '少兒芭蕾初級', program_code: 'KB-B', instructor: '李老師 Christy', instructor_id: 'inst_001', level: 'entry', age_tag: '7-9', category: 'regular', weekday: 3, hour: 17, location: 'sanpokong' },
    { name: '少年芭蕾中級', program_code: 'KB-C', instructor: '李老師 Christy', instructor_id: 'inst_001', level: 'intermediate', age_tag: '10-12', category: 'regular', weekday: 4, hour: 18, location: 'sanpokong' },
    { name: 'Hip-hop 青少年', program_code: 'HH-T', instructor: '陳老師 Jay', instructor_id: 'inst_002', level: 'intermediate', age_tag: '13-15', category: 'regular', weekday: 5, hour: 19, location: 'causewaybay' },
    { name: 'K-pop 舞蹈', program_code: 'KPOP', instructor: '陳老師 Jay', instructor_id: 'inst_002', level: 'intermediate', age_tag: '16+', category: 'regular', weekday: 6, hour: 20, location: 'causewaybay' },
    { name: '當代舞中級', program_code: 'CTMP', instructor: '張老師 Rex', instructor_id: 'inst_004', level: 'intermediate', age_tag: '16+', category: 'regular', weekday: 1, hour: 19, location: 'causewaybay' },
    { name: '成人爵士舞', program_code: 'JZ-A', instructor: '張老師 Rex', instructor_id: 'inst_004', level: 'entry', age_tag: '16+', category: 'regular', weekday: 2, hour: 20, location: 'causewaybay' },
    { name: '暑期芭蕾密集班', program_code: 'KB-SUM', instructor: '王老師 Kelly', instructor_id: 'inst_003', level: 'entry', age_tag: '7-9', category: 'summer', weekday: 6, hour: 10, location: 'sanpokong' },
    { name: '短期街舞體驗', program_code: 'HH-SRT', instructor: '陳老師 Jay', instructor_id: 'inst_002', level: 'entry', age_tag: '10-12', category: 'short', weekday: 0, hour: 14, location: 'causewaybay' },
  ];

  baseClasses.forEach((b, idx) => {
    // Create instances for each of the next 8 weeks on the weekday.
    // Use numeric string IDs (MySQL-style) so the admin frontend's
    // `Number(classId)` parsing works.
    for (let week = 0; week < 8; week += 1) {
      const d = new Date();
      const diff = (b.weekday - d.getDay() + 7) % 7;
      d.setDate(d.getDate() + diff + week * 7);
      d.setHours(b.hour, 0, 0, 0);
      const start = new Date(d);
      const end = new Date(d);
      end.setHours(end.getHours() + 1);
      end.setMinutes(end.getMinutes() + 30);
      const numericId = String(idx * 8 + week + 1); // 1..72
      classes.push({
        id: numericId,
        lesson_number: week + 1,
        name: b.name,
        name_zh_tw: b.name,
        name_zh_cn: b.name,
        name_en: b.program_code,
        instructor: b.instructor,
        instructor_id: b.instructor_id,
        substitute_instructor_id: null,
        start_time: iso(start),
        end_time: iso(end),
        location: b.location,
        program_code: b.program_code,
        level: b.level,
        age_tag: b.age_tag,
        category: b.category,
        capacity: 12,
        enrolled_count: 4 + Math.floor(Math.random() * 7),
        weekday: b.weekday,
        total_lessons: b.category === 'short' ? 4 : b.category === 'summer' ? 8 : 16,
        token_cost: 1,
        allow_trial: true,
        description: `${b.name}課程 — 注重基礎訓練及興趣培養。`,
        image_url: IMG(`class-${b.program_code}`),
        is_active: true,
      });
    }
  });

  // --------------------------------------------------------- Enrollments
  const enrollments: DemoDb['enrollments'] = [
    {
      id: 'enr_001',
      class_id: '1',
      user_id: 'user_001',
      student_name: '陳小美',
      status: 'enrolled',
      lessons_used: 3,
      lessons_remaining: 13,
      makeup_remaining: 2,
      created_at: iso(daysFromNow(-30)),
    },
    {
      id: 'enr_002',
      class_id: '9',
      user_id: 'user_001',
      student_name: '陳小美',
      status: 'enrolled',
      lessons_used: 2,
      lessons_remaining: 14,
      makeup_remaining: 2,
      created_at: iso(daysFromNow(-20)),
    },
    {
      id: 'enr_003',
      class_id: '25',
      user_id: 'user_002',
      student_name: '黃先生',
      status: 'enrolled',
      lessons_used: 5,
      lessons_remaining: 11,
      makeup_remaining: 1,
      created_at: iso(daysFromNow(-45)),
    },
    {
      id: 'enr_004',
      class_id: '33',
      user_id: 'user_004',
      student_name: 'Leo 林',
      status: 'enrolled',
      lessons_used: 1,
      lessons_remaining: 15,
      makeup_remaining: 2,
      created_at: iso(daysFromNow(-10)),
    },
  ];

  // ---------------------------------------------------- Trial applications
  const trialApplications: DemoDb['trialApplications'] = [
    {
      id: 'trial_001',
      student_name: '陳小美',
      email: 'student@demo.com',
      mobile: '62345678',
      user_id: 'user_001',
      country_code: '852',
      date_of_birth: '2016-07-10',
      preferred_date: iso(daysFromNow(5)),
      preferred_location: 'sanpokong',
      preferred_program: 'KB-A',
      status: 'pending',
      created_at: iso(daysFromNow(-2)),
    },
    {
      id: 'trial_002',
      student_name: '周同學',
      email: 'chou@example.com',
      mobile: '92222222',
      country_code: '852',
      date_of_birth: '2012-01-20',
      preferred_date: iso(daysFromNow(3)),
      preferred_location: 'causewaybay',
      preferred_program: 'HH-T',
      assigned_class_id: '25',
      assigned_class_name: 'Hip-hop 青少年',
      assigned_lessons: 16,
      status: 'assigned',
      notes: '已電話聯絡，有興趣正式報名',
      created_at: iso(daysFromNow(-5)),
    },
    {
      id: 'trial_003',
      student_name: '吳Ms',
      email: 'wu@example.com',
      mobile: '93333333',
      country_code: '852',
      preferred_date: iso(daysFromNow(-7)),
      preferred_location: 'causewaybay',
      preferred_program: 'CTMP',
      assigned_class_id: '41',
      assigned_class_name: '當代舞中級',
      assigned_lessons: 16,
      status: 'converted',
      notes: '試堂後已轉正式學員',
      user_id: 'user_004',
      created_at: iso(daysFromNow(-30)),
    },
  ];

  // ----------------------------------------------------- Token packages
  const tokenPackages: DemoDb['tokenPackages'] = [
    {
      id: 'pkg_1',
      name: '體驗套票 — 4 堂',
      description: '適合新手試課，60 天內使用。',
      token_count: 4,
      price: 680,
      validity_days: 60,
      is_active: true,
      display_order: 1,
    },
    {
      id: 'pkg_2',
      name: '標準套票 — 8 堂',
      description: '最受歡迎，平均每堂 HK$150。',
      token_count: 8,
      price: 1200,
      validity_days: 90,
      is_active: true,
      display_order: 2,
    },
    {
      id: 'pkg_3',
      name: '超值套票 — 16 堂',
      description: '長期學員首選，平均每堂 HK$130。',
      token_count: 16,
      price: 2080,
      validity_days: 180,
      is_active: true,
      display_order: 3,
    },
    {
      id: 'pkg_4',
      name: '家庭套票 — 32 堂',
      description: '適合兩位或以上家庭成員共用。',
      token_count: 32,
      price: 3840,
      validity_days: 365,
      is_active: true,
      display_order: 4,
    },
  ];

  // --------------------------------------------------------------- Orders
  const orders: DemoDb['orders'] = [
    {
      id: 'ord_001',
      user_id: 'user_001',
      user_email: 'student@demo.com',
      user_name: '陳小美',
      package_id: 'pkg_3',
      package_name: '超值套票 — 16 堂',
      quantity: 1,
      subtotal: 2080,
      discount: 0,
      total: 2080,
      payment_method: 'card',
      payment_status: 'paid',
      created_at: iso(daysFromNow(-28)),
      paid_at: iso(daysFromNow(-28)),
    },
    {
      id: 'ord_002',
      user_id: 'user_002',
      user_email: 'parent@demo.com',
      user_name: '黃先生',
      package_id: 'pkg_2',
      package_name: '標準套票 — 8 堂',
      quantity: 1,
      subtotal: 1200,
      discount: 120,
      total: 1080,
      coupon_code: 'WELCOME10',
      payment_method: 'fps',
      payment_status: 'paid',
      created_at: iso(daysFromNow(-40)),
      paid_at: iso(daysFromNow(-40)),
    },
    {
      id: 'ord_003',
      user_id: 'user_004',
      user_email: 'leo@demo.com',
      user_name: 'Leo 林',
      package_id: 'pkg_1',
      package_name: '體驗套票 — 4 堂',
      quantity: 1,
      subtotal: 680,
      discount: 0,
      total: 680,
      payment_method: 'card',
      payment_status: 'paid',
      created_at: iso(daysFromNow(-10)),
      paid_at: iso(daysFromNow(-10)),
    },
    {
      id: 'ord_004',
      user_id: 'user_001',
      user_email: 'student@demo.com',
      user_name: '陳小美',
      package_id: 'pkg_1',
      package_name: '體驗套票 — 4 堂',
      quantity: 1,
      subtotal: 680,
      discount: 0,
      total: 680,
      payment_method: 'card',
      payment_status: 'pending',
      created_at: iso(hoursFromNow(-2)),
    },
  ];

  // ------------------------------------------------------------ User tokens
  const userTokens: DemoDb['userTokens'] = [
    {
      id: 'ut_001',
      user_id: 'user_001',
      package_id: 'pkg_3',
      package_name: '超值套票 — 16 堂',
      tokens: 16,
      balance: 11,
      expires_at: iso(daysFromNow(150)),
      purchased_at: iso(daysFromNow(-28)),
      order_id: 'ord_001',
      is_active: true,
    },
    {
      id: 'ut_002',
      user_id: 'user_002',
      package_id: 'pkg_2',
      package_name: '標準套票 — 8 堂',
      tokens: 8,
      balance: 3,
      expires_at: iso(daysFromNow(50)),
      purchased_at: iso(daysFromNow(-40)),
      order_id: 'ord_002',
      is_active: true,
    },
    {
      id: 'ut_003',
      user_id: 'user_004',
      package_id: 'pkg_1',
      package_name: '體驗套票 — 4 堂',
      tokens: 4,
      balance: 3,
      expires_at: iso(daysFromNow(50)),
      purchased_at: iso(daysFromNow(-10)),
      order_id: 'ord_003',
      is_active: true,
    },
  ];

  // ---------------------------------------------------------------- News
  const news: DemoDb['news'] = [
    {
      id: 'news_001',
      title: '2026 暑期舞蹈密集班現正接受報名',
      title_zh_tw: '2026 暑期舞蹈密集班現正接受報名',
      title_zh_cn: '2026 暑期舞蹈密集班现正接受报名',
      title_en: '2026 Summer Intensive Open for Registration',
      content: '<p>為期兩週的暑期密集班將於 7 月 15 日開始，由資深導師親自教授。名額有限，額滿即止。</p>',
      content_zh_tw: '<p>為期兩週的暑期密集班將於 7 月 15 日開始，由資深導師親自教授。名額有限，額滿即止。</p>',
      content_zh_cn: '<p>为期两周的暑期密集班将于 7 月 15 日开始，由资深导师亲自教授。名额有限，额满即止。</p>',
      content_en: '<p>Our 2-week summer intensive kicks off July 15 with veteran instructors. Limited spots.</p>',
      image_url: IMG('news-summer'),
      published_at: iso(daysFromNow(-3)),
      show_as_popup: true,
      is_active: true,
    },
    {
      id: 'news_002',
      title: '學員作品 ： 2026 春季舞展花絮',
      title_zh_tw: '學員作品 ： 2026 春季舞展花絮',
      title_zh_cn: '学员作品 ： 2026 春季舞展花絮',
      title_en: '2026 Spring Showcase Highlights',
      content: '<p>感謝所有學員的精彩演出！錯過了現場？一起回顧今年春季舞展的精彩瞬間。</p>',
      image_url: IMG('news-showcase'),
      published_at: iso(daysFromNow(-15)),
      is_active: true,
    },
    {
      id: 'news_003',
      title: '新分校登場 ： 銅鑼灣分校正式開幕',
      title_zh_tw: '新分校登場 ： 銅鑼灣分校正式開幕',
      title_zh_cn: '新分校登场 ： 铜锣湾分校正式开幕',
      title_en: 'New Branch : Causeway Bay Now Open',
      content: '<p>全新銅鑼灣分校正式開幕，配備專業木地板及鏡面教室，歡迎親臨體驗。</p>',
      image_url: IMG('news-branch'),
      published_at: iso(daysFromNow(-45)),
      is_active: true,
    },
  ];

  // ------------------------------------------------------------- Coupons
  const coupons: DemoDb['coupons'] = [
    {
      id: 'coup_001',
      code: 'WELCOME10',
      discount_type: 'percentage',
      discount_value: 10,
      valid_from: iso(daysFromNow(-60)),
      valid_until: iso(daysFromNow(60)),
      quantity: 100,
      used_count: 12,
      is_active: true,
      created_at: iso(daysFromNow(-60)),
    },
    {
      id: 'coup_002',
      code: 'SUMMER200',
      discount_type: 'fixed',
      discount_value: 200,
      valid_from: iso(daysFromNow(-10)),
      valid_until: iso(daysFromNow(30)),
      quantity: 50,
      used_count: 5,
      min_subtotal: 1000,
      is_active: true,
      created_at: iso(daysFromNow(-10)),
    },
  ];

  // ------------------------------------------------------------ Holidays
  const holidays: DemoDb['holidays'] = [
    { id: 'hol_1', name: '農曆新年', date: '2026-02-17', is_active: true, remark: '連休 3 天' },
    { id: 'hol_2', name: '復活節', date: '2026-04-03', is_active: true },
    { id: 'hol_3', name: '勞動節', date: '2026-05-01', is_active: true },
    { id: 'hol_4', name: '端午節', date: '2026-06-19', is_active: true },
    { id: 'hol_5', name: '中秋節', date: '2026-09-25', is_active: true },
  ];

  // ------------------------------------------------------- Class notices
  const classNotices: DemoDb['classNotices'] = [
    {
      id: 'not_001',
      title: '暑期密集班開放報名',
      content: '7 月 15 日開課，名額有限！',
      priority: 'info',
      start_date: iso(daysFromNow(-3)),
      end_date: iso(daysFromNow(30)),
      image_url: IMG('notice-summer'),
      is_active: true,
      created_at: iso(daysFromNow(-3)),
    },
  ];

  // -------------------------------------------------- Contact + FAQ CMS
  const contactSettings: DemoDb['contactSettings'] = {
    title: '聯絡我們',
    title_zh_tw: '聯絡我們',
    title_zh_cn: '联络我们',
    title_en: 'Contact Us',
    intro_html: '<p>歡迎查詢課程、試堂或場地租用。我們將盡快回覆。</p>',
    intro_zh_tw: '<p>歡迎查詢課程、試堂或場地租用。我們將盡快回覆。</p>',
    intro_zh_cn: '<p>欢迎查询课程、试堂或场地租用。我们将尽快回复。</p>',
    intro_en: '<p>Reach out for classes, trial sessions, or venue rental. We respond quickly.</p>',
    image_url: IMG('contact-hero', 1200, 600),
  };
  const contactBranches: DemoDb['contactBranches'] = [
    {
      id: 1,
      name: '新蒲崗總店',
      address: '九龍新蒲崗大有街 1 號 2 樓',
      phone: '2345 6789',
      email: 'sanpokong@theyard.hk',
      map_url: 'https://maps.google.com/?q=22.337%2C114.198',
      order_no: 1,
    },
    {
      id: 2,
      name: '銅鑼灣分店',
      address: '銅鑼灣怡和街 38 號 5 樓',
      phone: '2987 6543',
      email: 'causewaybay@theyard.hk',
      map_url: 'https://maps.google.com/?q=22.280%2C114.185',
      order_no: 2,
    },
  ];

  const faqSettings: DemoDb['faqSettings'] = {
    title: '常見問題',
    title_zh_tw: '常見問題',
    title_zh_cn: '常见问题',
    title_en: 'FAQ',
    intro_html: '<p>這裡有您最常提出的問題答案。</p>',
    intro_zh_tw: '<p>這裡有您最常提出的問題答案。</p>',
    intro_zh_cn: '<p>这里有您最常提出的问题答案。</p>',
    intro_en: '<p>Answers to the questions we hear most often.</p>',
  };
  const faqItems: DemoDb['faqItems'] = [
    {
      id: 1,
      question: '如何報名試堂？',
      answer_html: '<p>到試堂頁面填寫表格，我們會在 1 個工作天內聯絡你。</p>',
      display_order: 0,
      is_active: true,
    },
    {
      id: 2,
      question: '代幣是否有使用期限？',
      answer_html: '<p>每個套票都有有效期，請參考套票頁的說明。</p>',
      display_order: 1,
      is_active: true,
    },
    {
      id: 3,
      question: '可否轉讓代幣給其他學員？',
      answer_html: '<p>目前代幣只限本人使用，不可轉讓。</p>',
      display_order: 2,
      is_active: true,
    },
    {
      id: 4,
      question: '請假政策如何？',
      answer_html: '<p>每個套票提供 2 次病假補堂，需提供醫生紙。</p>',
      display_order: 3,
      is_active: true,
    },
  ];

  // ----------------------------------------------------- Tags CMS
  const tagTypes: DemoDb['tagTypes'] = [
    { id: 1, code: 'level', label_zh_tw: '程度', label_zh_cn: '程度', label_en: 'Level', display_order: 1, is_active: true, is_system: true },
    { id: 2, code: 'age', label_zh_tw: '年齡', label_zh_cn: '年龄', label_en: 'Age', display_order: 2, is_active: true, is_system: true },
    { id: 3, code: 'category', label_zh_tw: '課程分類', label_zh_cn: '课程分类', label_en: 'Category', display_order: 3, is_active: true, is_system: true },
  ];
  const tags: DemoDb['tags'] = [
    { id: 11, type: 'level', code: 'entry', label_zh_tw: '入門', label_zh_cn: '入门', label_en: 'Entry', display_order: 1, is_active: true },
    { id: 12, type: 'level', code: 'intermediate', label_zh_tw: '中級', label_zh_cn: '中级', label_en: 'Intermediate', display_order: 2, is_active: true },
    { id: 13, type: 'level', code: 'advanced', label_zh_tw: '高級', label_zh_cn: '高级', label_en: 'Advanced', display_order: 3, is_active: true },
    { id: 21, type: 'age', code: '4-6', label_zh_tw: '4–6 歲', label_zh_cn: '4–6 岁', label_en: 'Ages 4–6', display_order: 1, is_active: true },
    { id: 22, type: 'age', code: '7-9', label_zh_tw: '7–9 歲', label_zh_cn: '7–9 岁', label_en: 'Ages 7–9', display_order: 2, is_active: true },
    { id: 23, type: 'age', code: '10-12', label_zh_tw: '10–12 歲', label_zh_cn: '10–12 岁', label_en: 'Ages 10–12', display_order: 3, is_active: true },
    { id: 24, type: 'age', code: '13-15', label_zh_tw: '13–15 歲', label_zh_cn: '13–15 岁', label_en: 'Ages 13–15', display_order: 4, is_active: true },
    { id: 25, type: 'age', code: '16+', label_zh_tw: '16 歲以上', label_zh_cn: '16 岁以上', label_en: 'Ages 16+', display_order: 5, is_active: true },
    { id: 31, type: 'category', code: 'regular', label_zh_tw: '常規班', label_zh_cn: '常规班', label_en: 'Regular', display_order: 1, is_active: true },
    { id: 32, type: 'category', code: 'summer', label_zh_tw: '暑假班', label_zh_cn: '暑假班', label_en: 'Summer', display_order: 2, is_active: true },
    { id: 33, type: 'category', code: 'short', label_zh_tw: '短期班', label_zh_cn: '短期班', label_en: 'Short-term', display_order: 3, is_active: true },
  ];

  // --------------------------------------------------- Terms / Privacy CMS
  const terms: DemoDb['terms'] = {
    title: '服務條款',
    title_zh_tw: '服務條款',
    title_zh_cn: '服务条款',
    title_en: 'Terms of Service',
    content_html: '<h2>1. 課程預約</h2><p>所有課程需提前預約，如需取消請於 24 小時前通知。</p><h2>2. 退款政策</h2><p>已開課之套票恕不退款，未使用堂數可轉讓或延期，需經管理員批准。</p>',
    updated_at: iso(daysFromNow(-30)),
  };
  const privacy: DemoDb['privacy'] = {
    title: '私隱政策',
    title_zh_tw: '私隱政策',
    title_zh_cn: '私隐政策',
    title_en: 'Privacy Policy',
    content_html: '<h2>資料收集</h2><p>我們會收集您的姓名、聯絡方式、付款資訊以提供課程服務。</p><h2>資料使用</h2><p>所有資料僅作內部營運用途，絕不外洩第三方。</p>',
    updated_at: iso(daysFromNow(-60)),
  };

  // --------------------------------------------------------- Home / about
  const homeAbout: DemoDb['homeAbout'] = {
    title: 'The Yard — 跳出屬於你的舞步',
    subtitle: '香港專業舞蹈學院｜啟蒙到高階，全齡適合',
    image_url: IMG('home-hero', 1600, 900),
    blocks: [
      {
        id: 'b1',
        heading: '專業師資',
        body_html: '<p>導師均具備 10 年以上教學經驗，來自香港演藝學院及國際舞蹈學府。</p>',
        image_url: IMG('about-1'),
      },
      {
        id: 'b2',
        heading: '多元課程',
        body_html: '<p>從兒童芭蕾啟蒙到青少年 Hip-hop、成人當代舞，一應俱全。</p>',
        image_url: IMG('about-2'),
      },
      {
        id: 'b3',
        heading: '專業場地',
        body_html: '<p>新蒲崗總店及銅鑼灣分店均配備專業木地板、環繞鏡面及音響系統。</p>',
        image_url: IMG('about-3'),
      },
    ],
  };

  const siteContent: DemoDb['siteContent'] = {
    'home/about': homeAbout,
    about: homeAbout,
  };

  // -------------------------------------------------- Refund / requests
  const refundRecords: DemoDb['refundRecords'] = [
    {
      id: 'ref_001',
      user_id: 'user_002',
      user_name: '黃先生',
      amount: 200,
      tokens: 1,
      reason: '學員病假需退回一堂代幣',
      status: 'approved',
      created_at: iso(daysFromNow(-5)),
    },
  ];
  const extensionRequests: DemoDb['extensionRequests'] = [
    {
      id: 'ext_001',
      user_id: 'user_001',
      user_name: '陳小美',
      enrollment_id: 'enr_001',
      class_name: '兒童芭蕾啟蒙班',
      reason: '家庭旅行兩星期，希望延後補堂。',
      status: 'pending',
      created_at: iso(daysFromNow(-1)),
    },
  ];
  const sickLeaveRequests: DemoDb['sickLeaveRequests'] = [
    {
      id: 'sick_001',
      user_id: 'user_002',
      user_name: '黃先生',
      enrollment_id: 'enr_003',
      class_name: 'Hip-hop 青少年',
      class_date: iso(daysFromNow(-1)),
      reason: '感冒需休息，附上醫生紙。',
      status: 'pending',
      created_at: iso(hoursFromNow(-18)),
    },
  ];

  const auditLog: DemoDb['auditLog'] = [
    {
      id: 'audit_0',
      actor_id: 'user_admin',
      actor_name: '阿 Sam (管理員)',
      action: 'update',
      entity_type: 'trial_application',
      entity_id: 'trial_002',
      details: '分配試堂到 Hip-hop 青少年',
      created_at: iso(daysFromNow(-1)),
    },
    {
      id: 'audit_1',
      actor_id: 'user_admin',
      actor_name: '阿 Sam (管理員)',
      action: 'create',
      entity_type: 'news',
      entity_id: 'news_001',
      details: '發佈暑期密集班消息',
      created_at: iso(daysFromNow(-3)),
    },
  ];

  const notifications: DemoDb['notifications'] = [
    {
      id: 'notif_001',
      user_id: 'user_001',
      title: '您的套票將於 150 天後到期',
      body: '請善用剩餘 11 次代幣。',
      is_read: false,
      created_at: iso(daysFromNow(-1)),
    },
    {
      id: 'notif_002',
      user_id: 'user_001',
      title: '明天有課',
      body: '兒童芭蕾啟蒙班 下午 4:00 @ 新蒲崗',
      is_read: false,
      created_at: iso(hoursFromNow(-3)),
    },
  ];

  return {
    version: 1,
    users,
    otps: {},
    instructors,
    classes,
    enrollments,
    trialApplications,
    tokenPackages,
    orders,
    userTokens,
    news,
    coupons,
    holidays,
    classNotices,
    contactSettings,
    contactBranches,
    faqSettings,
    faqItems,
    tagTypes,
    tags,
    terms,
    privacy,
    siteContent,
    homeAbout,
    refundRecords,
    extensionRequests,
    sickLeaveRequests,
    auditLog,
    notifications,
  } satisfies DemoDb;
  void nowIso; // reserved for future use
}
