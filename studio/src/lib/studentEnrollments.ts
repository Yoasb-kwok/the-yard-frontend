/**
 * Single source of truth for student enrollments (報名課程).
 * Used by SchedulePage, StudentSidebarSchedule, and DashboardPage so
 * 課程表、左側欄、日曆、Dashboard 報名課程 all show the same data per profile.
 */

export const DEMO_PROFILE_IDS = ['student-001', 'student-001-sub-2', 'student-001-sub-3'];

export interface EnrolledClass {
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
    /** 上課地點，用於顯示分店名、地址、打開地圖 */
    location?: 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui';
  };
  attended_lessons?: number;
  total_lessons?: number;
  extension_application?: { status: string; rejection_reason?: string };
  sick_leave_application?: { status: string; rejection_reason?: string };
}

/** Same 3 courses per profile so calendar, sidebar, and dashboard counts match. */
export function getFallbackUpcomingClasses(profileId?: string, profileName?: string): EnrolledClass[] {
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
  return [
    { id: 'enr_demo_1', status: 'enrolled', user_id: profileId ?? '', user_name: profileName ?? '', class: { name: '兒童芭蕾 A', instructor: '李老師', start_time: start, end_time: end, program_code: 'KB-A', location: 'sanpokong' }, attended_lessons: 2, total_lessons: 8 },
    { id: 'enr_demo_2', status: 'enrolled', user_id: profileId ?? '', user_name: profileName ?? '', class: { name: '兒童爵士 B', instructor: '王老師', start_time: start2, end_time: end2, program_code: 'KJ-B', location: 'causewaybay' }, attended_lessons: 3, total_lessons: 16 },
    { id: 'enr_demo_3', status: 'enrolled', user_id: profileId ?? '', user_name: profileName ?? '', class: { name: '兒童芭蕾 B', instructor: '李老師', start_time: start3, end_time: end3, program_code: 'KB-B', location: 'sanpokong' }, attended_lessons: 1, total_lessons: 4 },
  ];
}
