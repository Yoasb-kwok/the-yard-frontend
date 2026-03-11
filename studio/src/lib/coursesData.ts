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
}

export const COURSE_TYPES = ['regular', 'summer', 'short_term'] as const;
export type CourseType = (typeof COURSE_TYPES)[number];

export const LEVELS: CourseLevel[] = ['entry', 'intermediate', 'advanced'];
export const AGE_TAGS = ['5-8', '9-12', '13-16'];

export const ALL_COURSES: CourseItem[] = [
  { id: 'kb-a', name: '兒童芭蕾', program_code: 'KB-A', intro: '從基礎芭蕾手位與步法開始，培養節奏感與身體協調，適合幼兒啟蒙。', level: 'entry', age_tag: '5-8', instructor: '李老師', trial_class_name: '兒童芭蕾體驗', location: 'sanpokong', weekday: 1, course_type: 'regular' },
  { id: 'kids', name: '幼兒律動', program_code: 'KIDS', intro: '透過音樂與遊戲學習基本節奏與肢體表達，課堂氣氛輕鬆愉快。', level: 'entry', age_tag: '5-8', instructor: '王老師', trial_class_name: '幼兒律動體驗', location: 'sanpokong', weekday: 6, course_type: 'regular' },
  { id: 'ccd', name: '兒童中國舞', program_code: 'CCD', intro: '中國舞基本功與身韻入門，認識民族民間舞小組合。', level: 'entry', age_tag: '5-8', instructor: '黃老師', trial_class_name: '兒童中國舞體驗', location: 'sheungshui', weekday: 2, course_type: 'regular' },
  { id: 'thh', name: '青少年街舞', program_code: 'THH', intro: 'Hip Hop 與街舞基礎，強調節奏感與表現力，可參與表演與比賽。', level: 'intermediate', age_tag: '9-12', instructor: '陳老師', trial_class_name: '青少年街舞體驗', location: 'causewaybay', weekday: 3, course_type: 'regular' },
  { id: 'jazz', name: '爵士舞', program_code: 'JAZZ', intro: '爵士舞基礎與現代舞元素，適合喜歡流行與舞台表現的學員。', level: 'entry', age_tag: '9-12', instructor: '張老師', trial_class_name: '爵士舞體驗', location: 'fotan', weekday: 5, course_type: 'regular' },
  { id: 'kpop', name: 'K-Pop 流行舞', program_code: 'KPOP', intro: 'K-Pop 偶像舞碼與編排，節奏明快，適合喜愛流行舞的學員。', level: 'entry', age_tag: '9-12', instructor: '林老師', trial_class_name: 'K-Pop 流行舞體驗', location: 'causewaybay', weekday: 4, course_type: 'regular' },
  { id: 'thh-teen', name: '青少年街舞（進階）', program_code: 'THH', intro: '街舞進階編舞與技巧，可參與比賽與演出。', level: 'advanced', age_tag: '13-16', instructor: '陳老師', trial_class_name: '青少年街舞體驗', location: 'causewaybay', weekday: 3, course_type: 'regular' },
  { id: 'summer-kids', name: '暑期兒童舞蹈營', program_code: 'SUMMER-K', intro: '暑假兩週密集班，涵蓋芭蕾、街舞、K-Pop 基礎，適合 5–12 歲。', level: 'entry', age_tag: '5-8', instructor: '李老師', trial_class_name: '暑期兒童舞蹈營試堂', location: 'sanpokong', weekday: 1, course_type: 'summer' },
  { id: 'summer-teen', name: '暑期青少年街舞營', program_code: 'SUMMER-T', intro: '暑假兩週街舞進階營，含編舞與成果展。', level: 'intermediate', age_tag: '9-12', instructor: '陳老師', trial_class_name: '暑期青少年街舞營試堂', location: 'causewaybay', weekday: 4, course_type: 'summer' },
  { id: 'short-adult', name: '成人芭蕾短期班', program_code: 'SHORT-AB', intro: '四堂短期體驗，從零開始學芭蕾，適合成人。', level: 'entry', age_tag: '13-16', instructor: '張老師', trial_class_name: '成人芭蕾短期試堂', location: 'fotan', weekday: 3, course_type: 'short_term' },
  { id: 'short-kpop', name: 'K-Pop 短期體驗班', program_code: 'SHORT-K', intro: '六堂短期班，學一首完整舞碼。', level: 'entry', age_tag: '9-12', instructor: '林老師', trial_class_name: 'K-Pop 短期體驗試堂', location: 'causewaybay', weekday: 5, course_type: 'short_term' },
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
