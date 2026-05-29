import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { api } from '../../lib/api';
import { downloadCsv } from '../../lib/utils';
import { BookOpen, Calendar, Download } from 'lucide-react';
import {
  FALLBACK_CLASS_HEALTH,
  normalizeClassHealthPayload,
  reportMonthOptions,
  type ClassHealthData,
} from '../../lib/adminReportData';
import { TablePaginationBar, useTablePagination } from '../../components/TablePagination';

export default function AdminClassHealthPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<ClassHealthData | null>(null);
  const [reportMonth, setReportMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const monthParam = reportMonth ? `&month=${encodeURIComponent(reportMonth)}` : '';
    api.get<ClassHealthData>(`/admin/class-health${monthParam}`)
      .then((res: any) => {
        if (res?.success && res?.data != null) {
          setData(normalizeClassHealthPayload(res.data));
        } else {
          setData(FALLBACK_CLASS_HEALTH);
        }
      })
      .catch(() => setData(FALLBACK_CLASS_HEALTH))
      .finally(() => setLoading(false));
  }, [reportMonth]);

  const byClassRows = data?.byClass ?? [];
  const lowAttendanceRows = data?.lowAttendanceClasses ?? [];
  const byInstructorRows = data?.byInstructor ?? [];
  const {
    page: healthClassPage,
    setPage: setHealthClassPage,
    totalPages: healthClassTotalPages,
    pageSize: healthClassPageSize,
    totalItems: healthClassTotalItems,
    paginatedItems: paginatedByClass,
  } = useTablePagination(byClassRows, undefined, [reportMonth]);
  const {
    page: healthLowPage,
    setPage: setHealthLowPage,
    totalPages: healthLowTotalPages,
    pageSize: healthLowPageSize,
    totalItems: healthLowTotalItems,
    paginatedItems: paginatedLowClass,
  } = useTablePagination(lowAttendanceRows, undefined, [reportMonth]);
  const {
    page: healthInstPage,
    setPage: setHealthInstPage,
    totalPages: healthInstTotalPages,
    pageSize: healthInstPageSize,
    totalItems: healthInstTotalItems,
    paginatedItems: paginatedByInstructor,
  } = useTablePagination(byInstructorRows, undefined, [reportMonth]);

  if (loading || !data) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  const exportCsv = () => {
    const headers = [t('admin.dashboard.className'), t('admin.dashboard.programCode'), t('admin.dashboard.instructor'), t('admin.dashboard.avgAttendance'), t('admin.dashboard.capacity'), t('admin.dashboard.fillRate')];
    const byClass = data.byClass ?? [];
    const low = data.lowAttendanceClasses ?? [];
    const byInst = data.byInstructor ?? [];
    const rows: (string | number)[][] = [
      [t('admin.dashboard.classFillRateChart')],
      headers,
      ...byClass.map((r) => [r.className, r.programCode, r.instructor, r.avgAttendance, r.capacity, `${r.fillRate.toFixed(1)}%`]),
      [],
      [t('admin.dashboard.lowAttendanceClasses')],
      headers,
      ...low.map((r) => [r.className, r.programCode, r.instructor, r.avgAttendance, r.capacity, `${r.fillRate.toFixed(1)}%`]),
      [],
      [t('admin.dashboard.instructorClassCount')],
      [t('admin.dashboard.instructor'), t('admin.dashboard.classCount'), t('admin.dashboard.totalStudents')],
      ...byInst.map((r) => [r.instructor, r.classCount, r.totalStudents]),
    ];
    downloadCsv(rows, `class-health-${reportMonth}.csv`);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <BookOpen className="h-7 w-7 text-primary" />
            {t('admin.dashboard.classHealth')}
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
        <p className="text-sm text-gray-600">{t('admin.dashboard.classHealthDesc')}</p>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">{t('admin.dashboard.classFillRateChart')}</h3>
          {(data.byClass ?? []).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-600">
                    <th className="py-2 pr-4">{t('admin.dashboard.className')}</th>
                    <th className="py-2 pr-4">{t('admin.dashboard.programCode')}</th>
                    <th className="py-2 pr-4">{t('admin.dashboard.instructor')}</th>
                    <th className="py-2 pr-4">{t('admin.dashboard.avgAttendance')}</th>
                    <th className="py-2 pr-4">{t('admin.dashboard.capacity')}</th>
                    <th className="py-2">{t('admin.dashboard.fillRate')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedByClass.map((row) => (
                    <tr key={row.classId} className="border-b border-gray-100">
                      <td className="py-2 pr-4 font-medium text-gray-900">{row.className}</td>
                      <td className="py-2 pr-4">{row.programCode}</td>
                      <td className="py-2 pr-4">{row.instructor}</td>
                      <td className="py-2 pr-4">{row.avgAttendance}</td>
                      <td className="py-2 pr-4">{row.capacity}</td>
                      <td className="py-2">{row.fillRate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <TablePaginationBar
                page={healthClassPage}
                totalPages={healthClassTotalPages}
                totalItems={healthClassTotalItems}
                pageSize={healthClassPageSize}
                onPageChange={setHealthClassPage}
              />
            </div>
          ) : (
            <p className="text-gray-500 text-sm py-8 text-center">{t('admin.dashboard.noData')}</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-amber-400">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            {t('admin.dashboard.lowAttendanceClasses')} ({t('admin.dashboard.lowAttendanceThreshold')} &lt; {data.lowAttendanceThreshold})
          </h3>
          {(data.lowAttendanceClasses ?? []).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-600">
                    <th className="py-2 pr-4">{t('admin.dashboard.className')}</th>
                    <th className="py-2 pr-4">{t('admin.dashboard.programCode')}</th>
                    <th className="py-2 pr-4">{t('admin.dashboard.instructor')}</th>
                    <th className="py-2 pr-4">{t('admin.dashboard.avgAttendance')}</th>
                    <th className="py-2">{t('admin.dashboard.fillRate')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLowClass.map((row) => (
                    <tr key={row.classId} className="border-b border-gray-100">
                      <td className="py-2 pr-4 font-medium text-gray-900">{row.className}</td>
                      <td className="py-2 pr-4">{row.programCode}</td>
                      <td className="py-2 pr-4">{row.instructor}</td>
                      <td className="py-2 pr-4">{row.avgAttendance}</td>
                      <td className="py-2">{row.fillRate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <TablePaginationBar
                page={healthLowPage}
                totalPages={healthLowTotalPages}
                totalItems={healthLowTotalItems}
                pageSize={healthLowPageSize}
                onPageChange={setHealthLowPage}
              />
            </div>
          ) : (
            <p className="text-gray-500 text-sm py-4">{t('admin.dashboard.noData')}</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">{t('admin.dashboard.instructorClassCount')}</h3>
          {(data.byInstructor ?? []).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-600">
                    <th className="py-2 pr-4">{t('admin.dashboard.instructor')}</th>
                    <th className="py-2 pr-4">{t('admin.dashboard.classCount')}</th>
                    <th className="py-2">{t('admin.dashboard.totalStudents')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedByInstructor.map((row) => (
                    <tr key={row.instructor} className="border-b border-gray-100">
                      <td className="py-2 pr-4 font-medium text-gray-900">{row.instructor}</td>
                      <td className="py-2 pr-4">{row.classCount}</td>
                      <td className="py-2">{row.totalStudents}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <TablePaginationBar
                page={healthInstPage}
                totalPages={healthInstTotalPages}
                totalItems={healthInstTotalItems}
                pageSize={healthInstPageSize}
                onPageChange={setHealthInstPage}
              />
            </div>
          ) : (
            <p className="text-gray-500 text-sm py-8 text-center">{t('admin.dashboard.noData')}</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
