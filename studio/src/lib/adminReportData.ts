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

export interface ClassHealthData {
  byClass: { classId: string; className: string; programCode: string; instructor: string; avgAttendance: number; capacity: number; fillRate: number }[];
  lowAttendanceClasses: { classId: string; className: string; programCode: string; instructor: string; avgAttendance: number; capacity: number; fillRate: number }[];
  lowAttendanceThreshold: number;
  byInstructor: { instructor: string; classCount: number; totalStudents: number }[];
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

export interface AttendanceAnomalyData {
  overallMonthlyAttendanceRate: number;
  lowAttendanceRateThreshold: number;
  lowAttendanceRateClasses: { classId: string; className: string; programCode: string; instructor: string; attendanceRate: number; enrolledCount: number }[];
  consecutiveAbsenceThreshold: number;
  consecutiveAbsenceStudents: { studentId: string; full_name: string; mobile: string; consecutiveAbsences: number; lastClassDate: string; className: string }[];
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
