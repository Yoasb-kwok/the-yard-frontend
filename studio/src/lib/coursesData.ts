/**
 * 課程表／課程介紹共用：課程列表與篩選用常數。
 * 首頁課程表、課程介紹頁共用此資料。
 */

import type { CourseLevel } from '../contexts/AuthContext';

export interface CourseItem {
  id: string;
  name: string;
  program_code: string;
  intro: string;
  level: CourseLevel;
  age_tag: string;
  instructor: string;
  trial_class_name: string;
  location: 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui';
  weekday: number;
  course_type: 'regular' | 'summer' | 'short_term';
  /** GET /courses?fromClasses=1：最近一堂未取消班 id，試堂申請優先作 classId */
  next_class_id?: number | null;
  /** 未來／進行中班別數（API 選填） */
  open_class_count?: number | null;
  /** 後端若仍有「目錄列」概念可回傳；無 courses 表時可恒為 false / 省略 */
  has_course_catalog_row?: boolean;
}

export const COURSE_TYPES = ['regular', 'summer', 'short_term'] as const;
export type CourseType = (typeof COURSE_TYPES)[number];

export const LEVELS: CourseLevel[] = ['entry', 'intermediate', 'advanced'];
export const AGE_TAGS = ['5-8', '9-12', '13-16'];

export const ALL_COURSES: CourseItem[] = [
  { id: 'kb-a', name: '兒童芭蕾', program_code: 'KB-A', intro: '從基礎芭蕾手位與步法開始，培養節奏感與身體協調，適合幼兒啟蒙。', level: 'entry', age_tag: '5-8', instructor: '李老師', trial_class_name: '兒童芭蕾體驗', location: 'sanpokong', weekday: 1, course_type: 'regular' },
  { id: 'kids', name: '幼兒律動', program_code: 'KIDS', intro: '適合3-6歲年幼的孩子，學習肌肉協調及訓練對音樂節拍的認知，為選擇合適舞蹈風格前做好準備。', level: 'entry', age_tag: '5-8', instructor: '王老師', trial_class_name: '幼兒律動體驗', location: 'sanpokong', weekday: 6, course_type: 'regular' },
  { id: 'ccd', name: '兒童中國舞', program_code: 'CCD', intro: '中國舞基本功與身韻入門，認識民族民間舞小組合。', level: 'entry', age_tag: '5-8', instructor: '黃老師', trial_class_name: '兒童中國舞體驗', location: 'sheungshui', weekday: 2, course_type: 'regular' },
  { id: 'thh', name: '青少年街舞', program_code: 'THH', intro: 'Hip Hop 源於美國黑人文化，於80年代興起，很多時會使用節奏重的 rap 音樂，動作幅度大，注重身體的協調性與律動，基礎動作包括 Bounce、Rock、Skate、Roll，課程會著重基礎性的練習和編舞。', level: 'intermediate', age_tag: '9-12', instructor: '陳老師', trial_class_name: '青少年街舞體驗', location: 'causewaybay', weekday: 3, course_type: 'regular' },
  { id: 'jazz', name: '街頭爵士舞 Jazz Funk', program_code: 'JAZZ', intro: '由傳統爵士舞加入流行元素演變而成，多見於流行音樂演出（如 Beyonce、Taylor Swift 等），線條感重，特別適合女孩子或有芭蕾舞底子的小朋友。', level: 'entry', age_tag: '9-12', instructor: '張老師', trial_class_name: '爵士舞體驗', location: 'fotan', weekday: 5, course_type: 'regular' },
  { id: 'kpop', name: '韓風小明星 K-POP', program_code: 'KPOP', intro: 'K-POP 原意是指韓國流行音樂而並非一個舞種。由於歌手會於 MV 中編排突出的動作令人產生特別的記憶點，因而廣泛流行並令人產生對跳舞的興趣，其舞蹈基礎建於 Jazz Funk 和 Hip Hop，是接觸街舞入門的好選擇。', level: 'entry', age_tag: '9-12', instructor: '林老師', trial_class_name: 'K-Pop 流行舞體驗', location: 'causewaybay', weekday: 4, course_type: 'regular' },
  { id: 'thh-teen', name: '青少年街舞（進階）', program_code: 'THH', intro: '源於 Hip Hop 文化，著重情緒表達，舞者會以 Battle 鬥舞形式展現個性，發揮想像力進行即興創作。不需要規範式的編排，而是隨音樂起舞，因此需要更廣泛的舞蹈功底、更強的創造力和獨特的個人感覺。課程會注重開發小朋友的創意和身體的可能性，能有效訓練孩子的自信和節奏感。', level: 'advanced', age_tag: '13-16', instructor: '陳老師', trial_class_name: '青少年街舞體驗', location: 'causewaybay', weekday: 3, course_type: 'regular' },
  { id: 'popping', name: '機械舞 Popping', program_code: 'POPPING', intro: '主要通過肌肉的快速收縮與舒張而達到震動的效果，類似機械人的動作，基礎包括 Pop、Hit、Wave、Isolation。', level: 'entry', age_tag: '9-12', instructor: '陳老師', trial_class_name: '機械舞體驗', location: 'causewaybay', weekday: 4, course_type: 'regular' },
  { id: 'locking', name: '鎖舞 Locking', program_code: 'LOCKING', intro: '鎖舞依賴身體快速定住或鎖住（Lock）的動作，加上拍掌、劈腿及用手指指向不同方向的動作（Point），有點像木偶的感覺，常會與觀眾有互動，多數呈現一種歡樂和幽默的氣氛給觀眾。', level: 'entry', age_tag: '9-12', instructor: '陳老師', trial_class_name: '鎖舞體驗', location: 'causewaybay', weekday: 5, course_type: 'regular' },
  { id: 'summer-kids', name: '暑期兒童舞蹈營', program_code: 'SUMMER-K', intro: '暑假兩週密集班，涵蓋芭蕾、街舞、K-Pop 基礎，適合 5–12 歲。', level: 'entry', age_tag: '5-8', instructor: '李老師', trial_class_name: '暑期兒童舞蹈營試堂', location: 'sanpokong', weekday: 1, course_type: 'summer' },
  { id: 'summer-teen', name: '暑期青少年街舞營', program_code: 'SUMMER-T', intro: '暑假兩週街舞進階營，含編舞與成果展。', level: 'intermediate', age_tag: '9-12', instructor: '陳老師', trial_class_name: '暑期青少年街舞營試堂', location: 'causewaybay', weekday: 4, course_type: 'summer' },
  { id: 'short-adult', name: '成人芭蕾短期班', program_code: 'SHORT-AB', intro: '四堂短期體驗，從零開始學芭蕾，適合成人。', level: 'entry', age_tag: '13-16', instructor: '張老師', trial_class_name: '成人芭蕾短期試堂', location: 'fotan', weekday: 3, course_type: 'short_term' },
  { id: 'short-kpop', name: 'K-Pop 短期體驗班', program_code: 'SHORT-K', intro: 'K-POP 原意是指韓國流行音樂而並非一個舞種，其舞蹈基礎建於 Jazz Funk 和 Hip Hop，是接觸街舞入門的好選擇。六堂短期班，學一首完整舞碼。', level: 'entry', age_tag: '9-12', instructor: '林老師', trial_class_name: 'K-Pop 短期體驗試堂', location: 'causewaybay', weekday: 5, course_type: 'short_term' },
];

export function filterCoursesByTags(
  courses: CourseItem[],
  filterLevel: CourseLevel | null,
  filterAge: string | null,
  filterCategory: CourseType | null
): CourseItem[] {
  let list = [...courses];
  if (filterLevel != null) list = list.filter((c) => c.level === filterLevel);
  if (filterAge != null) list = list.filter((c) => c.age_tag === filterAge);
  if (filterCategory != null) list = list.filter((c) => c.course_type === filterCategory);
  return list;
}
