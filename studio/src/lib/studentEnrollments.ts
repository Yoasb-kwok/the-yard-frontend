/**
 * Single source of truth for student enrollments (報名課程).
 * Used by SchedulePage, StudentSidebarSchedule, and DashboardPage so
 * 課程表、左側欄、日曆、Dashboard 報名課程 all show the same data per profile.
 * Demo 課程與主頁/日曆一致，來自 demoCourses。
 */

import { getFallbackEnrolledClassesForStudent } from './demoCourses';

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

/** 與主頁展示的課程一致：兒童芭蕾、爵士舞、幼兒律動（來自 demoCourses） */
export function getFallbackUpcomingClasses(profileId?: string, profileName?: string): EnrolledClass[] {
  return getFallbackEnrolledClassesForStudent(profileId, profileName);
}
