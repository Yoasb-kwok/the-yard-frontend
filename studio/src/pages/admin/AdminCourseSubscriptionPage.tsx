import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import PageLoading from '../../components/PageLoading';
import EmptyState from '../../components/EmptyState';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/utils';
import { BookOpen, Search, Calendar } from 'lucide-react';
import { TablePaginationBar, useTablePagination } from '../../components/TablePagination';

export interface SubscriptionRecord {
  id: string;
  class_id: string;
  class_name?: string;
  class_code?: string;
  class_start_time?: string;
  user_id: string;
  user_name: string;
  user_mobile?: string | null;
  status: string;
  created_at: string;
}

export default function AdminCourseSubscriptionPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [records, setRecords] = useState<SubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadRecords();
  }, []);

  async function loadRecords() {
    try {
      setLoading(true);
      const res = await api
        .get<SubscriptionRecord[]>('/admin/enrollments', { demo: '1' })
        .catch(() => ({ success: true, data: [] }));
      const list = Array.isArray(res?.data) ? res.data : [];
      setRecords(list);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  const getLocale = () =>
    i18n.language === 'zh-CN' ? 'zh-CN' : i18n.language === 'zh-TW' ? 'zh-TW' : 'en-US';

  const filteredRecords = records.filter(
    (r) =>
      (r.user_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.user_mobile || '').includes(search) ||
      (r.class_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.class_code || '').toLowerCase().includes(search.toLowerCase())
  );

  const {
    page: subPage,
    setPage: setSubPage,
    totalPages: subTotalPages,
    pageSize: subPageSize,
    totalItems: subTotalItems,
    paginatedItems: paginatedSubRecords,
  } = useTablePagination(filteredRecords, undefined, [search]);

  if (loading) {
    return (
      <Layout>
        <PageLoading message={t('admin.subscriptionRecords.loading', '載入課程訂閱紀錄…')} />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BookOpen className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-gray-900">
            {t('admin.subscriptionRecords.title', '課程訂閱紀錄')}
          </h1>
        </div>
        <p className="text-sm text-gray-600">
          {t('admin.subscriptionRecords.description', '用戶報名課程／班別的訂閱紀錄，可查看誰報了哪一班。')}
        </p>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder={t('admin.subscriptionRecords.searchPlaceholder', '搜尋用戶、課程名稱或代碼…')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {filteredRecords.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <EmptyState
                message={t(
                  'admin.subscriptionRecords.noRecords',
                  '暫無課程訂閱紀錄。若後端已提供 GET /admin/enrollments，請確認 API 已啟用。'
                )}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">
                      {t('admin.subscriptionRecords.user', '用戶')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">
                      {t('admin.subscriptionRecords.class', '課程／班別')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">
                      {t('admin.subscriptionRecords.subscribedAt', '報名時間')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">
                      {t('admin.subscriptionRecords.status', '狀態')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">
                      {t('admin.subscriptionRecords.actions', '操作')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedSubRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{r.user_name}</div>
                        {r.user_mobile && (
                          <div className="text-gray-500 text-xs">{r.user_mobile}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {r.class_name || r.class_code || r.class_id}
                        </div>
                        {r.class_start_time && (
                          <div className="text-gray-500 text-xs">
                            {formatDateTime(r.class_start_time, getLocale())}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDateTime(r.created_at, getLocale())}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {r.status || '–'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/classes/${r.class_id}/attendance`)}
                          className="text-primary hover:text-primary-dark text-sm font-medium"
                        >
                          {t('admin.subscriptionRecords.viewAttendance', '查看出席')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <TablePaginationBar
                page={subPage}
                totalPages={subTotalPages}
                totalItems={subTotalItems}
                pageSize={subPageSize}
                onPageChange={setSubPage}
              />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
