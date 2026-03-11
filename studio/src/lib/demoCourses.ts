/**
 * Single source of truth for demo courses (主頁課程表、日曆、Admin 班別、學生「我的課程」一致).
 * 與 CoursesPage 課程介紹、主頁試堂、日曆 fallback、Admin 班別、學生報讀課程共用同一套課程定義。
 */

import type { CourseLevel, AgeTag } from '../contexts/AuthContext';

export type DemoLocation = 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui';

/** One program type shown on 課程介紹 / calendar / admin. Recurring: weekday 0–6, hour, total lessons. */
export interface DemoProgram {
  name: string;
  program_code: string;
  instructor: string;
  location: DemoLocation;
  /** Recurring: weekday 0=Sun … 6=Sat */
  weekday: number;
  hour: number;
  min: number;
  /** Total lessons in the course (4, 8, or 16) */
  total_lessons: 4 | 8 | 16;
  level: CourseLevel;
  age_tag: AgeTag;
}

/** 與 CoursesPage 一致：主頁試堂、日曆、Admin 班別、學生報讀都用這 6 個課程 */
export const DEMO_PROGRAMS: DemoProgram[] = [
  { name: '兒童芭蕾', program_code: 'KB-A', instructor: '李老師', location: 'sanpokong', weekday: 1, hour: 16, min: 0, total_lessons: 8, level: 'entry', age_tag: '5-8' },
  { name: '青少年街舞', program_code: 'THH', instructor: '陳老師', location: 'causewaybay', weekday: 3, hour: 17, min: 0, total_lessons: 16, level: 'intermediate', age_tag: '9-12' },
  { name: '幼兒律動', program_code: 'KIDS', instructor: '王老師', location: 'sanpokong', weekday: 6, hour: 10, min: 0, total_lessons: 4, level: 'entry', age_tag: '5-8' },
  { name: '爵士舞', program_code: 'JAZZ', instructor: '張老師', location: 'fotan', weekday: 5, hour: 19, min: 0, total_lessons: 8, level: 'entry', age_tag: '9-12' },
  { name: '兒童中國舞', program_code: 'CCD', instructor: '黃老師', location: 'sheungshui', weekday: 2, hour: 15, min: 30, total_lessons: 8, level: 'entry', age_tag: '5-8' },
  { name: 'K-Pop 流行舞', program_code: 'KPOP', instructor: '林老師', location: 'causewaybay', weekday: 4, hour: 18, min: 0, total_lessons: 8, level: 'entry', age_tag: '9-12' },
];

/** 主頁「新生課程」fallback：接下來 14 日內的試堂，與主頁展示的課程一致 */
export interface UpcomingClassForHome {
  id: string;
  name: string;
  instructor: string;
  start_time: string;
  end_time: string;
  capacity: number;
  enrolled_count: number;
  location: DemoLocation;
  program_code: string;
  lesson_number?: number | null;
}

export function getFallbackNewStudentCourses(): UpcomingClassForHome[] {
  const now = new Date();
  const courses: UpcomingClassForHome[] = [];
  DEMO_PROGRAMS.forEach((p, i) => {
    const base = new Date(now);
    base.setDate(base.getDate() + 1 + Math.floor(i / 2));
    base.setHours(14 + (i % 3) * 2, 0, 0, 0);
    const start = new Date(base);
    const end = new Date(base);
    end.setHours(end.getHours() + 1, 0, 0, 0);
    courses.push({
      id: `demo_trial_${i + 1}`,
      name: `${p.name}試堂`,
      instructor: p.instructor,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      capacity: 12,
      enrolled_count: 3 + i,
      location: p.location,
      program_code: p.program_code,
      lesson_number: 1,
    });
  });
  return courses;
}

/** Admin Class shape (ClassesPage fallback) */
export interface DemoClassForAdmin {
  id: string;
  name: string;
  class_code: string;
  lesson_number?: number | null;
  instructor: string;
  substitute_instructor?: string | null;
  start_time: string;
  end_time: string;
  capacity: number;
  enrolled_count: number;
  is_internal: boolean;
  is_cancelled: boolean;
  location?: DemoLocation;
  level?: CourseLevel;
  age_tag?: AgeTag;
}

export function getFallbackClassesForAdmin(): DemoClassForAdmin[] {
  const now = new Date();
  const list: DemoClassForAdmin[] = [];
  let id = 1;
  const base = new Date(now);
  base.setDate(base.getDate() - 14);
  base.setHours(0, 0, 0, 0);
  for (const p of DEMO_PROGRAMS) {
    let daysToFirst = (p.weekday - base.getDay() + 7) % 7;
    const firstSession = new Date(base);
    firstSession.setDate(base.getDate() + daysToFirst);
    firstSession.setHours(p.hour, p.min, 0, 0);
    for (let L = 1; L <= p.total_lessons; L++) {
      const sessionDate = new Date(firstSession);
      sessionDate.setDate(firstSession.getDate() + (L - 1) * 7);
      const endDate = new Date(sessionDate);
      endDate.setHours(endDate.getHours() + 1, 0, 0, 0);
      list.push({
        id: `cls_fb_${id++}`,
        name: p.name,
        class_code: p.program_code,
        lesson_number: L,
        instructor: p.instructor,
        substitute_instructor: null,
        start_time: sessionDate.toISOString(),
        end_time: endDate.toISOString(),
        capacity: 12,
        enrolled_count: L <= 2 ? 6 : 7,
        is_internal: false,
        is_cancelled: false,
        location: p.location,
        level: p.level,
        age_tag: p.age_tag,
      });
    }
  }
  return list;
}

/** Calendar lesson shape (CalendarPage fallback) */
export interface DemoLessonForCalendar {
  id: string;
  name: string;
  instructor: string;
  start_time: string;
  end_time: string;
  capacity: number;
  enrolled_count: number;
  location: DemoLocation;
  program_code: string;
  lesson_number: number;
  level: CourseLevel;
  age_tag: AgeTag;
  weekday: number;
  total_lessons: 4 | 8 | 16;
  /** 課程分類：常規班、暑假班、短期班（日曆篩選用） */
  course_type?: 'regular' | 'summer' | 'short_term';
}

export function getFallbackCalendarLessons(displayedDate?: Date): DemoLessonForCalendar[] {
  const anchor = displayedDate
    ? new Date(displayedDate.getFullYear(), displayedDate.getMonth(), 1)
    : new Date();
  const now = displayedDate || new Date();
  const lessons: DemoLessonForCalendar[] = [];
  let id = 1;
  for (const p of DEMO_PROGRAMS) {
    const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const daysUntilWeekday = (p.weekday - firstOfMonth.getDay() + 7) % 7;
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1 + daysUntilWeekday);
    start.setHours(p.hour, p.min, 0, 0);
    for (let L = 1; L <= p.total_lessons; L++) {
      const sessionDate = new Date(start);
      sessionDate.setDate(start.getDate() + (L - 1) * 7);
      const endDate = new Date(sessionDate);
      endDate.setHours(endDate.getHours() + 1, 0, 0, 0);
      if (!displayedDate && sessionDate.getTime() < now.getTime() - 86400000) continue;
      lessons.push({
        id: `fb-${id++}`,
        name: p.name,
        instructor: p.instructor,
        start_time: sessionDate.toISOString(),
        end_time: endDate.toISOString(),
        capacity: 12,
        enrolled_count: L <= 2 ? 5 + L : 6,
        location: p.location,
        program_code: p.program_code,
        lesson_number: L,
        level: p.level,
        age_tag: p.age_tag,
        weekday: p.weekday,
        total_lessons: p.total_lessons,
        course_type: 'regular',
      });
    }
  }

  // Demo: 同時段多個課程（同一日同一時段 4 堂，方便測試週視圖並排顯示）
  const firstSunday = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  firstSunday.setDate(1 + (7 - firstSunday.getDay()) % 7);
  if (firstSunday.getMonth() === anchor.getMonth()) {
    const overlapNames = ['兒童芭蕾', '兒童中國舞', '幼兒律動', '爵士舞'];
    const overlapInstructors = ['李老師', '黃老師', '王老師', '張老師'];
    const overlapLocations: DemoLocation[] = ['sanpokong', 'sheungshui', 'sanpokong', 'fotan'];
    const overlapCodes = ['KB-A', 'CCD', 'KIDS', 'JAZZ'];
    for (let i = 0; i < 4; i++) {
      const startDemo = new Date(firstSunday);
      startDemo.setHours(10, 0, 0, 0);
      const endDemo = new Date(startDemo);
      endDemo.setHours(11, 0, 0, 0);
      lessons.push({
        id: `fb-overlap-${i + 1}`,
        name: overlapNames[i],
        instructor: overlapInstructors[i],
        start_time: startDemo.toISOString(),
        end_time: endDemo.toISOString(),
        capacity: 12,
        enrolled_count: 4 + i,
        location: overlapLocations[i],
        program_code: overlapCodes[i],
        lesson_number: 1,
        level: 'entry',
        age_tag: i % 2 === 0 ? '5-8' : '9-12',
        weekday: 0,
        total_lessons: 8,
        course_type: 'regular',
      });
    }
  }

  // Demo: 一日 15 堂課（同一日從早到晚排滿，方便測試月視圖 / 週視圖單日多堂）
  const firstSaturday = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  firstSaturday.setDate(1 + (6 - firstSaturday.getDay() + 7) % 7);
  if (firstSaturday.getMonth() === anchor.getMonth()) {
    const day15Names = ['幼兒律動', '兒童芭蕾', '兒童中國舞', 'K-Pop 流行舞', '爵士舞', '青少年街舞', '兒童芭蕾', '幼兒律動', '兒童中國舞', '爵士舞', 'K-Pop 流行舞', '青少年街舞', '兒童芭蕾', '幼兒律動', '爵士舞'];
    const day15Instructors = ['王老師', '李老師', '黃老師', '林老師', '張老師', '陳老師', '李老師', '王老師', '黃老師', '張老師', '林老師', '陳老師', '李老師', '王老師', '張老師'];
    const day15Locations: DemoLocation[] = ['sanpokong', 'sanpokong', 'sheungshui', 'causewaybay', 'fotan', 'causewaybay', 'sanpokong', 'sanpokong', 'sheungshui', 'fotan', 'causewaybay', 'causewaybay', 'sanpokong', 'sanpokong', 'fotan'];
    const day15Codes = ['KIDS', 'KB-A', 'CCD', 'KPOP', 'JAZZ', 'THH', 'KB-A', 'KIDS', 'CCD', 'JAZZ', 'KPOP', 'THH', 'KB-A', 'KIDS', 'JAZZ'];
    for (let i = 0; i < 15; i++) {
      const hour = 8 + i; // 8:00, 9:00, ... 22:00
      const startDemo = new Date(firstSaturday);
      startDemo.setHours(hour, 0, 0, 0);
      const endDemo = new Date(startDemo);
      endDemo.setHours(hour + 1, 0, 0, 0);
      lessons.push({
        id: `fb-day15-${i + 1}`,
        name: day15Names[i],
        instructor: day15Instructors[i],
        start_time: startDemo.toISOString(),
        end_time: endDemo.toISOString(),
        capacity: 12,
        enrolled_count: 3 + (i % 5),
        location: day15Locations[i],
        program_code: day15Codes[i],
        lesson_number: (i % 4) + 1,
        level: i % 3 === 0 ? 'entry' : i % 3 === 1 ? 'intermediate' : 'advanced',
        age_tag: i % 3 === 0 ? '5-8' : i % 3 === 1 ? '9-12' : '13-16',
        weekday: 6,
        total_lessons: 8,
        course_type: 'regular',
      });
    }
  }

  return lessons.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
}

/** 學生 demo「我的課程」：只顯示主頁有展示的課程（DEMO_PROGRAMS 中的 3 個：兒童芭蕾、爵士舞、幼兒律動） */
export interface EnrolledClassForStudent {
  id: string;
  status: string;
  user_id?: string;
  user_name?: string;
  class: {
    name: string;
    instructor: string;
    start_time: string;
    end_time: string;
    program_code?: string;
    location?: DemoLocation;
  };
  attended_lessons?: number;
  total_lessons?: number;
}

const STUDENT_DEMO_PROGRAM_INDEXES = [0, 3, 2]; // 兒童芭蕾, 爵士舞, 幼兒律動

export function getFallbackEnrolledClassesForStudent(profileId?: string, profileName?: string): EnrolledClassForStudent[] {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(14, 0, 0, 0);
  const start = d.toISOString();
  const end = new Date(d.getTime() + 3600000).toISOString();
  const d2 = new Date();
  d2.setDate(d2.getDate() + 4);
  d2.setHours(16, 0, 0, 0);
  const start2 = d2.toISOString();
  const end2 = new Date(d2.getTime() + 3600000).toISOString();
  const d3 = new Date();
  d3.setDate(d3.getDate() + 7);
  d3.setHours(10, 0, 0, 0);
  const start3 = d3.toISOString();
  const end3 = new Date(d3.getTime() + 3600000).toISOString();
  const times = [{ start, end }, { start: start2, end: end2 }, { start: start3, end: end3 }];
  return STUDENT_DEMO_PROGRAM_INDEXES.map((idx, i) => {
    const p = DEMO_PROGRAMS[idx];
    const t = times[i];
    return {
      id: `enr_demo_${i + 1}`,
      status: 'enrolled',
      user_id: profileId ?? '',
      user_name: profileName ?? '',
      class: {
        name: p.name,
        instructor: p.instructor,
        start_time: t.start,
        end_time: t.end,
        program_code: p.program_code,
        location: p.location,
      },
      attended_lessons: [2, 3, 1][i],
      total_lessons: p.total_lessons,
    };
  });
}
