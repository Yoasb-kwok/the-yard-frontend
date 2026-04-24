/**
 * Shared types and fallback data for admin report pages (financial, funnel, renewal/churn, class health, instructor performance, attendance anomaly).
 */

export interface FinancialDashboardData {
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueSameMonthLastYear: number;
  totalDiscountThisMonth: number;
  discountPercentage: number;
  revenueByPackage: { name: string; total: number }[];
  paymentMethodDistribution: { method: string; total: number; count: number }[];
  monthlyTrend: { month: string; revenue: number }[];
}

export interface ConversionFunnelData {
  byChannel: { channel: string; channelKey: string; trialCount: number; enrollmentCount: number; conversionRate: number; revenue: number }[];
  trialToEnrollmentRate: number;
  totalTrialCount: number;
  newEnrollmentCount: number;
  relatedRevenue: number;
  funnelStages: { name: string; nameKey: string; value: number }[];
}

export interface RenewalChurnData {
  totalExpiring: number;
  renewedCount: number;
  renewalRate: number;
  churnCount: number;
  churnRate: number;
  churnReasons: { reason: string; reasonKey: string; count: number }[];
  monthlyTrend: { month: string; expiring: number; renewed: number; churned: number }[];
  churnList: { id: string; full_name: string; mobile: string; expiry_date: string; churn_reason: string }[];
}

export type ClassHealthRow = {
  classId: string;
  className: string;
  programCode: string;
  instructor: string;
  avgAttendance: number;
  capacity: number;
  fillRate: number;
};

export interface ClassHealthData {
  byClass: ClassHealthRow[];
  lowAttendanceClasses: ClassHealthRow[];
  lowAttendanceThreshold: number;
  byInstructor: { instructor: string; classCount: number; totalStudents: number }[];
}

const DEFAULT_LOW_ATTENDANCE_THRESHOLD = 5;

function aggregateInstructorsFromClassRows(rows: ClassHealthRow[]): ClassHealthData['byInstructor'] {
  const m = new Map<string, { classCount: number; totalStudents: number }>();
  for (const row of rows) {
    const cur = m.get(row.instructor) ?? { classCount: 0, totalStudents: 0 };
    cur.classCount += 1;
    cur.totalStudents += row.avgAttendance;
    m.set(row.instructor, cur);
  }
  return Array.from(m.entries()).map(([instructor, v]) => ({
    instructor,
    classCount: v.classCount,
    totalStudents: v.totalStudents,
  }));
}

function classHealthRowFromRecord(c: Record<string, unknown>): ClassHealthRow | null {
  const classId = String(c.classId ?? c.class_id ?? '');
  if (!classId) return null;
  const capacity = typeof c.capacity === 'number' ? c.capacity : Number(c.capacity) || 0;
  const fillRateRaw = c.fillRate ?? c.fill_rate;
  const fillRate = typeof fillRateRaw === 'number' ? fillRateRaw : Number(fillRateRaw) || 0;
  const avgRaw = c.avgAttendance ?? c.avg_attendance;
  const attendanceRateRaw = c.attendanceRate ?? c.attendance_rate;
  const enrolledRaw = c.enrolledCount ?? c.enrolled_count;
  let avgAttendance: number;
  if (typeof avgRaw === 'number' && Number.isFinite(avgRaw)) {
    avgAttendance = avgRaw;
  } else {
    const n = Number(avgRaw);
    avgAttendance = Number.isFinite(n) ? n : NaN;
  }
  if (!Number.isFinite(avgAttendance)) {
    if (typeof attendanceRateRaw === 'number' && capacity > 0) {
      avgAttendance = Math.round((attendanceRateRaw / 100) * capacity);
    } else if (typeof enrolledRaw === 'number') {
      avgAttendance = enrolledRaw;
    } else {
      avgAttendance = 0;
    }
  }
  return {
    classId,
    className: String(c.className ?? c.class_name ?? ''),
    programCode: String(c.programCode ?? c.program_code ?? ''),
    instructor: String(c.instructor ?? ''),
    avgAttendance,
    capacity,
    fillRate,
  };
}

/**
 * Normalize API / mock payloads into {@link ClassHealthData}.
 *
 * Supports:
 * - Full `ClassHealthData` (camelCase `byClass`, etc.)
 * - Legacy demo mock shape `{ classes: [...], summary?: ... }` (snake_case rows)
 * - Empty / malformed payloads → safe empty tables (not a crash)
 */
export function normalizeClassHealthPayload(raw: unknown): ClassHealthData {
  const empty: ClassHealthData = {
    byClass: [],
    lowAttendanceClasses: [],
    lowAttendanceThreshold: DEFAULT_LOW_ATTENDANCE_THRESHOLD,
    byInstructor: [],
  };

  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return empty;
  }

  const o = raw as Record<string, unknown>;
  const threshold =
    typeof o.lowAttendanceThreshold === 'number' && Number.isFinite(o.lowAttendanceThreshold)
      ? o.lowAttendanceThreshold
      : DEFAULT_LOW_ATTENDANCE_THRESHOLD;

  let byClass: ClassHealthRow[] = [];

  if (Array.isArray(o.byClass)) {
    byClass = o.byClass
      .map((x) => (x && typeof x === 'object' ? classHealthRowFromRecord(x as Record<string, unknown>) : null))
      .filter((x): x is ClassHealthRow => x != null);
  } else if (Array.isArray(o.classes)) {
    byClass = o.classes
      .map((x) => (x && typeof x === 'object' ? classHealthRowFromRecord(x as Record<string, unknown>) : null))
      .filter((x): x is ClassHealthRow => x != null);
  } else {
    return empty;
  }

  let lowAttendanceClasses: ClassHealthRow[];
  if (Array.isArray(o.lowAttendanceClasses) && o.lowAttendanceClasses.length > 0) {
    lowAttendanceClasses = o.lowAttendanceClasses
      .map((x) => (x && typeof x === 'object' ? classHealthRowFromRecord(x as Record<string, unknown>) : null))
      .filter((x): x is ClassHealthRow => x != null);
  } else {
    lowAttendanceClasses = byClass
      .filter((r) => r.avgAttendance < threshold)
      .slice()
      .sort((a, b) => a.avgAttendance - b.avgAttendance);
  }

  let byInstructor: ClassHealthData['byInstructor'];
  if (Array.isArray(o.byInstructor) && o.byInstructor.length > 0) {
    byInstructor = o.byInstructor
      .map((x) => {
        if (!x || typeof x !== 'object') return null;
        const r = x as Record<string, unknown>;
        const instructor = String(r.instructor ?? '');
        if (!instructor) return null;
        return {
          instructor,
          classCount: typeof r.classCount === 'number' ? r.classCount : Number(r.classCount) || 0,
          totalStudents: typeof r.totalStudents === 'number' ? r.totalStudents : Number(r.totalStudents) || 0,
        };
      })
      .filter((x): x is ClassHealthData['byInstructor'][number] => x != null);
  } else {
    byInstructor = aggregateInstructorsFromClassRows(byClass);
  }

  return {
    byClass,
    lowAttendanceClasses,
    lowAttendanceThreshold: threshold,
    byInstructor,
  };
}

export interface InstructorPerformanceRow {
  instructorId: string;
  instructor: string;
  totalHours: number;
  totalSessions: number;
  totalStudents: number;
  avgClassSize: number;
  avgRenewalRate: number;
  attendanceRate: number;
}

export interface InstructorPerformanceData {
  byInstructor: InstructorPerformanceRow[];
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Map API / legacy mock row → {@link InstructorPerformanceRow}. */
function instructorPerformanceRowFromRecord(r: Record<string, unknown>): InstructorPerformanceRow | null {
  const instructorId = String(r.instructorId ?? r.instructor_id ?? '');
  const instructor = String(r.instructor ?? r.name ?? '');
  if (!instructorId && !instructor) return null;

  const totalSessions = num(r.totalSessions ?? r.class_count ?? r.classCount);
  const totalStudents = num(r.totalStudents ?? r.total_students);
  let totalHours = num(r.totalHours ?? r.total_hours);
  if (!totalHours && totalSessions > 0) {
    totalHours = Math.round(totalSessions * 1.25 * 10) / 10;
  }
  let avgClassSize = num(r.avgClassSize ?? r.avg_class_size);
  if (!avgClassSize && totalSessions > 0) {
    avgClassSize = Math.round((totalStudents / totalSessions) * 10) / 10;
  }
  let avgRenewalRate = num(r.avgRenewalRate ?? r.avg_renewal_rate ?? r.retention_rate);
  let attendanceRate = num(r.attendanceRate ?? r.attendance_rate);
  if (!attendanceRate && r.avg_rating != null) {
    attendanceRate = Math.min(100, Math.round(num(r.avg_rating) * 20 * 10) / 10);
  }
  if (!avgRenewalRate) avgRenewalRate = 55;
  if (!attendanceRate) attendanceRate = 85;

  return {
    instructorId: instructorId || instructor,
    instructor: instructor || instructorId,
    totalHours,
    totalSessions,
    totalStudents,
    avgClassSize,
    avgRenewalRate,
    attendanceRate,
  };
}

/**
 * Normalize `GET /admin/instructor-performance` payloads for {@link AdminInstructorPerformancePage}.
 *
 * Accepts:
 * - `{ byInstructor: InstructorPerformanceRow[] }`
 * - Legacy mock: **array** of `{ instructor_id, name, class_count, total_students, avg_rating, retention_rate }`
 */
export function normalizeInstructorPerformancePayload(raw: unknown): InstructorPerformanceData {
  const empty: InstructorPerformanceData = { byInstructor: [] };

  if (raw == null) return empty;

  if (Array.isArray(raw)) {
    const byInstructor = raw
      .map((x) => (x && typeof x === 'object' ? instructorPerformanceRowFromRecord(x as Record<string, unknown>) : null))
      .filter((x): x is InstructorPerformanceRow => x != null);
    return { byInstructor };
  }

  if (typeof raw !== 'object') return empty;

  const o = raw as Record<string, unknown>;
  if (Array.isArray(o.byInstructor)) {
    const byInstructor = o.byInstructor
      .map((x) => (x && typeof x === 'object' ? instructorPerformanceRowFromRecord(x as Record<string, unknown>) : null))
      .filter((x): x is InstructorPerformanceRow => x != null);
    return { byInstructor };
  }

  return empty;
}

export type LowAttendanceClassRow = {
  classId: string;
  className: string;
  programCode: string;
  instructor: string;
  attendanceRate: number;
  enrolledCount: number;
};

export type ConsecutiveAbsenceStudentRow = {
  studentId: string;
  full_name: string;
  mobile: string;
  consecutiveAbsences: number;
  lastClassDate: string;
  className: string;
};

export interface AttendanceAnomalyData {
  overallMonthlyAttendanceRate: number;
  lowAttendanceRateThreshold: number;
  lowAttendanceRateClasses: LowAttendanceClassRow[];
  consecutiveAbsenceThreshold: number;
  consecutiveAbsenceStudents: ConsecutiveAbsenceStudentRow[];
}

const DEFAULT_LOW_ATTENDANCE_RATE_THRESHOLD = 80;
const DEFAULT_CONSECUTIVE_ABSENCE_THRESHOLD = 3;

function lowAttendanceClassFromRecord(r: Record<string, unknown>): LowAttendanceClassRow | null {
  const classId = String(r.classId ?? r.class_id ?? '');
  if (!classId) return null;
  return {
    classId,
    className: String(r.className ?? r.class_name ?? ''),
    programCode: String(r.programCode ?? r.program_code ?? ''),
    instructor: String(r.instructor ?? ''),
    attendanceRate: num(r.attendanceRate ?? r.attendance_rate),
    enrolledCount: Math.round(num(r.enrolledCount ?? r.enrolled_count)),
  };
}

function consecutiveAbsenceFromRecord(r: Record<string, unknown>): ConsecutiveAbsenceStudentRow | null {
  const studentId = String(r.studentId ?? r.student_id ?? r.user_id ?? '');
  const full_name = String(r.full_name ?? r.name ?? '');
  if (!studentId && !full_name) return null;
  return {
    studentId: studentId || full_name,
    full_name: full_name || studentId,
    mobile: String(r.mobile ?? r.phone ?? ''),
    consecutiveAbsences: Math.round(num(r.consecutiveAbsences ?? r.consecutive_absences)),
    lastClassDate: String(r.lastClassDate ?? r.last_class_date ?? '').split('T')[0] || '—',
    className: String(r.className ?? r.class_name ?? '—'),
  };
}

/**
 * Normalize `GET /admin/attendance-anomaly` for {@link AdminAttendanceAnomalyPage}.
 *
 * Supports:
 * - Full {@link AttendanceAnomalyData} (camelCase; optional snake_case rows)
 * - Legacy demo: `{ students, flagged, summary }` (student-level mock)
 */
export function normalizeAttendanceAnomalyPayload(raw: unknown): AttendanceAnomalyData {
  const empty: AttendanceAnomalyData = {
    overallMonthlyAttendanceRate: 0,
    lowAttendanceRateThreshold: DEFAULT_LOW_ATTENDANCE_RATE_THRESHOLD,
    lowAttendanceRateClasses: [],
    consecutiveAbsenceThreshold: DEFAULT_CONSECUTIVE_ABSENCE_THRESHOLD,
    consecutiveAbsenceStudents: [],
  };

  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return empty;
  }

  const o = raw as Record<string, unknown>;

  if (Array.isArray(o.lowAttendanceRateClasses) && Array.isArray(o.consecutiveAbsenceStudents)) {
    const overallRaw = num(o.overallMonthlyAttendanceRate ?? o.overall_monthly_attendance_rate);
    const overall = Number.isFinite(overallRaw) ? Math.round(overallRaw * 10) / 10 : 0;
    const lowTh =
      typeof o.lowAttendanceRateThreshold === 'number' && Number.isFinite(o.lowAttendanceRateThreshold)
        ? o.lowAttendanceRateThreshold
        : DEFAULT_LOW_ATTENDANCE_RATE_THRESHOLD;
    const consecTh =
      typeof o.consecutiveAbsenceThreshold === 'number' && Number.isFinite(o.consecutiveAbsenceThreshold)
        ? o.consecutiveAbsenceThreshold
        : DEFAULT_CONSECUTIVE_ABSENCE_THRESHOLD;
    return {
      overallMonthlyAttendanceRate: overall,
      lowAttendanceRateThreshold: lowTh,
      lowAttendanceRateClasses: o.lowAttendanceRateClasses
        .map((x) => (x && typeof x === 'object' ? lowAttendanceClassFromRecord(x as Record<string, unknown>) : null))
        .filter((x): x is LowAttendanceClassRow => x != null),
      consecutiveAbsenceThreshold: consecTh,
      consecutiveAbsenceStudents: o.consecutiveAbsenceStudents
        .map((x) => (x && typeof x === 'object' ? consecutiveAbsenceFromRecord(x as Record<string, unknown>) : null))
        .filter((x): x is ConsecutiveAbsenceStudentRow => x != null),
    };
  }

  if (Array.isArray(o.students) && o.summary && typeof o.summary === 'object') {
    const summary = o.summary as Record<string, unknown>;
    const students = o.students as Record<string, unknown>[];
    const flagged = Array.isArray(o.flagged)
      ? (o.flagged as Record<string, unknown>[])
      : students.filter(
          (s) =>
            num(s.consecutive_absences) >= DEFAULT_CONSECUTIVE_ABSENCE_THRESHOLD ||
            num(s.attendance_rate) < 60,
        );

    const overall =
      typeof summary.overallAttendance === 'number'
        ? (summary.overallAttendance as number)
        : students.length > 0
          ? students.reduce((acc, s) => acc + num(s.attendance_rate), 0) / students.length
          : 0;

    const consecutiveAbsenceStudents = flagged
      .map((s) =>
        consecutiveAbsenceFromRecord({
          student_id: s.user_id,
          full_name: s.name,
          mobile: s.mobile ?? s.email,
          consecutive_absences: s.consecutive_absences,
          last_class_date: new Date().toISOString(),
          class_name: '—',
        }),
      )
      .filter((x): x is ConsecutiveAbsenceStudentRow => x != null);

    return {
      overallMonthlyAttendanceRate: Math.round(overall * 10) / 10,
      lowAttendanceRateThreshold: DEFAULT_LOW_ATTENDANCE_RATE_THRESHOLD,
      lowAttendanceRateClasses: [],
      consecutiveAbsenceThreshold: DEFAULT_CONSECUTIVE_ABSENCE_THRESHOLD,
      consecutiveAbsenceStudents,
    };
  }

  return empty;
}

export const FALLBACK_FINANCIAL: FinancialDashboardData = {
  revenueThisMonth: 48500,
  revenueLastMonth: 44200,
  revenueSameMonthLastYear: 39800,
  totalDiscountThisMonth: 1200,
  discountPercentage: 2.4,
  revenueByPackage: [
    { name: 'Kids 8-Week', total: 18200 },
    { name: 'Teen Intensive', total: 14500 },
    { name: 'Adult Drop-in', total: 9800 },
    { name: 'Trial Package', total: 6000 },
  ],
  paymentMethodDistribution: [
    { method: 'fps', total: 25200, count: 28 },
    { method: 'cash', total: 15800, count: 35 },
    { method: 'credit_card', total: 7500, count: 12 },
  ],
  monthlyTrend: (() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      return { month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, revenue: 42000 + Math.sin(i * 0.7) * 8000 + i * 500 };
    });
  })(),
};

export const FALLBACK_FUNNEL: ConversionFunnelData = {
  byChannel: [
    { channel: 'IG', channelKey: 'ig', trialCount: 45, enrollmentCount: 14, conversionRate: 31.1, revenue: 18200 },
    { channel: 'FB', channelKey: 'fb', trialCount: 32, enrollmentCount: 11, conversionRate: 34.4, revenue: 14300 },
    { channel: 'Referral', channelKey: 'referral', trialCount: 28, enrollmentCount: 13, conversionRate: 46.4, revenue: 16900 },
    { channel: 'Google', channelKey: 'google', trialCount: 18, enrollmentCount: 5, conversionRate: 27.8, revenue: 6500 },
    { channel: 'Walk-in', channelKey: 'walkin', trialCount: 12, enrollmentCount: 4, conversionRate: 33.3, revenue: 5200 },
  ],
  trialToEnrollmentRate: 34.2,
  totalTrialCount: 135,
  newEnrollmentCount: 47,
  relatedRevenue: 61100,
  funnelStages: [{ name: 'Trial', nameKey: 'trial', value: 135 }, { name: 'Enrolled', nameKey: 'enrolled', value: 47 }],
};

export const FALLBACK_RENEWAL_CHURN: RenewalChurnData = {
  totalExpiring: 24,
  renewedCount: 11,
  renewalRate: 45.8,
  churnCount: 13,
  churnRate: 54.2,
  churnReasons: [
    { reason: 'price', reasonKey: 'price', count: 5 },
    { reason: 'schedule', reasonKey: 'schedule', count: 4 },
    { reason: 'relocation', reasonKey: 'relocation', count: 2 },
    { reason: 'other', reasonKey: 'other', count: 2 },
  ],
  monthlyTrend: (() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return { month: mk, expiring: 20 + i, renewed: 9 + i, churned: 11 - i };
    });
  })(),
  churnList: [
    { id: 'u1', full_name: 'Amy Chen', mobile: '91234561', expiry_date: '2026-01-15', churn_reason: 'price' },
    { id: 'u2', full_name: 'Ben Wong', mobile: '92345672', expiry_date: '2026-01-20', churn_reason: 'schedule' },
    { id: 'u3', full_name: 'Cindy Liu', mobile: '93456783', expiry_date: '2026-01-22', churn_reason: 'relocation' },
  ],
};

export const FALLBACK_CLASS_HEALTH: ClassHealthData = {
  byClass: [
    { classId: 'c1', className: 'Hip Hop Kids L1', programCode: 'HH-L1', instructor: 'Eva Tang', avgAttendance: 8, capacity: 12, fillRate: 66.7 },
    { classId: 'c2', className: 'Contemporary L1', programCode: 'CON-L1', instructor: 'Eva Tang', avgAttendance: 10, capacity: 12, fillRate: 83.3 },
    { classId: 'c3', className: 'Jazz Teens', programCode: 'JZ-T', instructor: 'Eva Tang', avgAttendance: 4, capacity: 10, fillRate: 40 },
    { classId: 'c4', className: 'Ballet 5-8', programCode: 'BL-58', instructor: 'Grace Ho', avgAttendance: 6, capacity: 8, fillRate: 75 },
    { classId: 'c5', className: 'Street Dance L2', programCode: 'SD-L2', instructor: 'Grace Ho', avgAttendance: 3, capacity: 10, fillRate: 30 },
    { classId: 'c6', className: 'Kids Trial', programCode: 'TRIAL', instructor: 'Grace Ho', avgAttendance: 11, capacity: 12, fillRate: 91.7 },
  ],
  lowAttendanceClasses: [
    { classId: 'c3', className: 'Jazz Teens', programCode: 'JZ-T', instructor: 'Eva Tang', avgAttendance: 4, capacity: 10, fillRate: 40 },
    { classId: 'c5', className: 'Street Dance L2', programCode: 'SD-L2', instructor: 'Grace Ho', avgAttendance: 3, capacity: 10, fillRate: 30 },
  ],
  lowAttendanceThreshold: 5,
  byInstructor: [
    { instructor: 'Eva Tang', classCount: 3, totalStudents: 22 },
    { instructor: 'Grace Ho', classCount: 3, totalStudents: 20 },
  ],
};

export const FALLBACK_INSTRUCTOR_PERFORMANCE: InstructorPerformanceData = {
  byInstructor: [
    { instructorId: 'i1', instructor: 'Eva Tang', totalHours: 24, totalSessions: 18, totalStudents: 42, avgClassSize: 7.0, avgRenewalRate: 52.3, attendanceRate: 88.5 },
    { instructorId: 'i2', instructor: 'Grace Ho', totalHours: 20, totalSessions: 15, totalStudents: 38, avgClassSize: 6.3, avgRenewalRate: 48.1, attendanceRate: 85.2 },
    { instructorId: 'i3', instructor: 'Henry Zhang', totalHours: 16, totalSessions: 12, totalStudents: 28, avgClassSize: 5.6, avgRenewalRate: 61.0, attendanceRate: 91.0 },
  ],
};

export const FALLBACK_ATTENDANCE_ANOMALY: AttendanceAnomalyData = {
  overallMonthlyAttendanceRate: 85.2,
  lowAttendanceRateThreshold: 80,
  lowAttendanceRateClasses: [
    { classId: 'c3', className: 'Jazz Teens', programCode: 'JZ-T', instructor: 'Eva Tang', attendanceRate: 62.5, enrolledCount: 8 },
    { classId: 'c5', className: 'Street Dance L2', programCode: 'SD-L2', instructor: 'Grace Ho', attendanceRate: 55.0, enrolledCount: 10 },
    { classId: 'c7', className: 'Ballet 9-12', programCode: 'BL-912', instructor: 'Henry Zhang', attendanceRate: 72.0, enrolledCount: 10 },
  ],
  consecutiveAbsenceThreshold: 3,
  consecutiveAbsenceStudents: [
    { studentId: 'u2', full_name: 'Ben Wong', mobile: '92345672', consecutiveAbsences: 4, lastClassDate: '2026-01-20', className: 'Contemporary L1' },
    { studentId: 'u5', full_name: 'Emma Tang', mobile: '95678905', consecutiveAbsences: 3, lastClassDate: '2026-01-15', className: 'Jazz Teens' },
    { studentId: 'u8', full_name: 'Hugo Zhang', mobile: '98901238', consecutiveAbsences: 3, lastClassDate: '2026-01-18', className: 'Street Dance L2' },
  ],
};

export const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-');
  const monthNum = parseInt(m, 10);
  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${shortMonths[monthNum - 1] || m} ${y}`;
}

export function reportMonthOptions(): { value: string; label: string }[] {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  for (let i = -24; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    options.push({ value, label: formatMonthLabel(value) });
  }
  return options;
}
