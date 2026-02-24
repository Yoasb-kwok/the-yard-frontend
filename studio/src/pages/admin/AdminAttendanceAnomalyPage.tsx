import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { api } from '../../lib/api';
import { ClipboardList, Calendar } from 'lucide-react';
import { FALLBACK_ATTENDANCE_ANOMALY, reportMonthOptions, type AttendanceAnomalyData } from '../../lib/adminReportData';

export default function AdminAttendanceAnomalyPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<AttendanceAnomalyData | null>(null);
  const [reportMonth, setReportMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const monthParam = reportMonth ? `&month=${encodeURIComponent(reportMonth)}` : '';
    api.get<AttendanceAnomalyData>(`admin/attendance-anomaly?demo=1${monthParam}`)
      .then((res: any) => {
        if (res?.success && res?.data) setData(res.data);
        else setData(FALLBACK_ATTENDANCE_ANOMALY);
      })
      .catch(() => setData(FALLBACK_ATTENDANCE_ANOMALY))
      .finally(() => setLoading(false));
  }, [reportMonth]);

  if (loading || !data) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <ClipboardList className="h-7 w-7 text-primary" />
            {t('admin.dashboard.attendanceAnomaly')}
          </h1>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <select
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[140px]"
            >
              {reportMonthOptions().map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-sm text-gray-600">{t('admin.dashboard.attendanceAnomalyDesc')}</p>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600">{t('admin.dashboard.overallMonthlyAttendanceRate')}</h3>
            <div className="text-2xl font-bold text-primary mt-1">{data.overallMonthlyAttendanceRate.toFixed(1)}%</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600">{t('admin.dashboard.lowAttendanceRateThreshold')}</h3>
            <div className="text-2xl font-bold text-amber-600 mt-1">&lt; {data.lowAttendanceRateThreshold}%</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-amber-400">
          <h3 className="text-sm font-medium text-gray-700 mb-3">{t('admin.dashboard.lowAttendanceRateClasses')}</h3>
          {data.lowAttendanceRateClasses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-600">
                    <th className="py-2 pr-4">{t('admin.dashboard.className')}</th>
                    <th className="py-2 pr-4">{t('admin.dashboard.programCode')}</th>
                    <th className="py-2 pr-4">{t('admin.dashboard.instructor')}</th>
                    <th className="py-2 pr-4">{t('admin.dashboard.attendanceRate')}</th>
                    <th className="py-2">{t('admin.dashboard.enrolledCount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lowAttendanceRateClasses.map((row) => (
                    <tr key={row.classId} className="border-b border-gray-100">
                      <td className="py-2 pr-4 font-medium text-gray-900">{row.className}</td>
                      <td className="py-2 pr-4">{row.programCode}</td>
                      <td className="py-2 pr-4">{row.instructor}</td>
                      <td className="py-2 pr-4">{row.attendanceRate.toFixed(1)}%</td>
                      <td className="py-2">{row.enrolledCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-sm py-8 text-center">{t('admin.dashboard.noData')}</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            {t('admin.dashboard.consecutiveAbsenceStudents')} ({t('admin.dashboard.consecutiveAbsenceThreshold')} ≥ {data.consecutiveAbsenceThreshold})
          </h3>
          {data.consecutiveAbsenceStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-600">
                    <th className="py-2 pr-4">{t('admin.dashboard.name')}</th>
                    <th className="py-2 pr-4">{t('admin.dashboard.mobile')}</th>
                    <th className="py-2 pr-4">{t('admin.dashboard.consecutiveAbsences')}</th>
                    <th className="py-2 pr-4">{t('admin.dashboard.lastClassDate')}</th>
                    <th className="py-2">{t('admin.dashboard.className')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.consecutiveAbsenceStudents.map((row) => (
                    <tr key={row.studentId} className="border-b border-gray-100">
                      <td className="py-2 pr-4 font-medium text-gray-900">{row.full_name}</td>
                      <td className="py-2 pr-4">{row.mobile}</td>
                      <td className="py-2 pr-4">{row.consecutiveAbsences}</td>
                      <td className="py-2 pr-4">{row.lastClassDate}</td>
                      <td className="py-2">{row.className}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-sm py-8 text-center">{t('admin.dashboard.noData')}</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
