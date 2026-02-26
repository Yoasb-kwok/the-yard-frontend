import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { api } from '../../lib/api';
import { downloadCsv } from '../../lib/utils';
import { GraduationCap, Calendar, ArrowUpDown, Download } from 'lucide-react';
import { FALLBACK_INSTRUCTOR_PERFORMANCE, reportMonthOptions, type InstructorPerformanceData, type InstructorPerformanceRow } from '../../lib/adminReportData';

type SortKey = 'totalHours' | 'totalSessions' | 'totalStudents' | 'avgClassSize' | 'avgRenewalRate' | 'attendanceRate';

export default function AdminInstructorPerformancePage() {
  const { t } = useTranslation();
  const [data, setData] = useState<InstructorPerformanceData | null>(null);
  const [reportMonth, setReportMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('totalHours');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    const monthParam = reportMonth ? `&month=${encodeURIComponent(reportMonth)}` : '';
    api.get<InstructorPerformanceData>(`/admin/instructor-performance?demo=1${monthParam}`)
      .then((res: any) => {
        if (res?.success && res?.data) setData(res.data);
        else setData(FALLBACK_INSTRUCTOR_PERFORMANCE);
      })
      .catch(() => setData(FALLBACK_INSTRUCTOR_PERFORMANCE))
      .finally(() => setLoading(false));
  }, [reportMonth]);

  const sortedRows = useMemo(() => {
    if (!data?.byInstructor?.length) return [];
    const rows = [...data.byInstructor];
    rows.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return sortAsc ? cmp : -cmp;
    });
    return rows;
  }, [data?.byInstructor, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((a) => !a);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  if (loading || !data) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  const Th = ({ label, sortKey: sk }: { label: string; sortKey: SortKey }) => (
    <th className="py-2 pr-4 text-left">
      <button
        type="button"
        onClick={() => toggleSort(sk)}
        className="inline-flex items-center gap-1 font-medium text-gray-600 hover:text-gray-900"
      >
        {label}
        <ArrowUpDown className="h-4 w-4 opacity-70" />
      </button>
    </th>
  );

  const exportCsv = () => {
    const headers = [t('admin.dashboard.instructor'), t('admin.dashboard.totalTeachingHours'), t('admin.dashboard.totalSessions'), t('admin.dashboard.totalStudentsInstructor'), t('admin.dashboard.avgClassSize'), t('admin.dashboard.avgRenewalRate'), t('admin.dashboard.attendanceRate')];
    const rows: (string | number)[][] = [
      headers,
      ...sortedRows.map((r) => [r.instructor, r.totalHours, r.totalSessions, r.totalStudents, r.avgClassSize.toFixed(1), `${r.avgRenewalRate.toFixed(1)}%`, `${r.attendanceRate.toFixed(1)}%`]),
    ];
    downloadCsv(rows, `instructor-performance-${reportMonth}.csv`);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <GraduationCap className="h-7 w-7 text-primary" />
            {t('admin.dashboard.instructorPerformance')}
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
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary/5"
            >
              <Download className="h-4 w-4" />
              {t('admin.dashboard.exportCsv')}
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-600">{t('admin.dashboard.instructorPerformanceDesc')}</p>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">{t('admin.dashboard.instructorPerformance')}</h3>
          {sortedRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-600">
                    <th className="py-2 pr-4 text-left">{t('admin.dashboard.instructor')}</th>
                    <Th label={t('admin.dashboard.totalTeachingHours')} sortKey="totalHours" />
                    <Th label={t('admin.dashboard.totalSessions')} sortKey="totalSessions" />
                    <Th label={t('admin.dashboard.totalStudentsInstructor')} sortKey="totalStudents" />
                    <Th label={t('admin.dashboard.avgClassSize')} sortKey="avgClassSize" />
                    <Th label={t('admin.dashboard.avgRenewalRate')} sortKey="avgRenewalRate" />
                    <Th label={t('admin.dashboard.attendanceRate')} sortKey="attendanceRate" />
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row: InstructorPerformanceRow) => (
                    <tr key={row.instructorId} className="border-b border-gray-100">
                      <td className="py-2 pr-4 font-medium text-gray-900">{row.instructor}</td>
                      <td className="py-2 pr-4">{row.totalHours}</td>
                      <td className="py-2 pr-4">{row.totalSessions}</td>
                      <td className="py-2 pr-4">{row.totalStudents}</td>
                      <td className="py-2 pr-4">{row.avgClassSize.toFixed(1)}</td>
                      <td className="py-2 pr-4">{row.avgRenewalRate.toFixed(1)}%</td>
                      <td className="py-2">{row.attendanceRate.toFixed(1)}%</td>
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
