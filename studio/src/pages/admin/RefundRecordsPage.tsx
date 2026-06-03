import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { formatDateTime } from '../../lib/utils';
import { api, ApiError } from '../../lib/api';
import { normalizeRefundRecords, type RefundRecord } from '../../lib/adminRefundRecords';
import { Search, RefreshCw, RotateCcw } from 'lucide-react';
import { TableSortButton } from '../../components/TableSortButton';
import { TablePaginationBar, useTablePagination } from '../../components/TablePagination';

export default function RefundRecordsPage() {
  const { t, i18n } = useTranslation();
  const [records, setRecords] = useState<RefundRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>('refunded_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const getLocale = (): string => {
    const langMap: { [key: string]: string } = {
      en: 'en-US',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
    };
    return langMap[i18n.language] || i18n.language || 'en-US';
  };

  async function loadRecords() {
    setLoading(true);
    setLoadError(null);
    try {
      const params: Record<string, string> = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await api.get<unknown>('/admin/refund-records', params);
      if (res.success === false) {
        throw new Error(res.msg || res.message || 'Failed to load refund records');
      }
      const rows = normalizeRefundRecords(res.data ?? res);
      setRecords(rows);
      setLastLoadedAt(new Date());
    } catch (err) {
      console.error('Failed to load refund records:', err);
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t('admin.refundRecords.loadFailed', '無法載入退款記錄');
      setLoadError(msg);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  useEffect(() => {
    const handler = () => {
      void loadRecords();
    };
    window.addEventListener('refund-record-added', handler);
    return () => window.removeEventListener('refund-record-added', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- always use latest filters on event
  }, [searchTerm]);

  const filtered = records.filter((r) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      r.user_name.toLowerCase().includes(q) ||
      (r.class_name && r.class_name.toLowerCase().includes(q)) ||
      (r.class_code && r.class_code.toLowerCase().includes(q))
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortKey) return 0;
    let cmp = 0;
    if (sortKey === 'refunded_at') {
      cmp = new Date(a.refunded_at).getTime() - new Date(b.refunded_at).getTime();
    } else if (sortKey === 'user_name') {
      cmp = (a.user_name || '').localeCompare(b.user_name || '', undefined, { sensitivity: 'base' });
    } else if (sortKey === 'class_name') {
      cmp = (a.class_name || '').localeCompare(b.class_name || '', undefined, { sensitivity: 'base' });
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const {
    page: refundPage,
    setPage: setRefundPage,
    totalPages: refundTotalPages,
    pageSize: refundPageSize,
    totalItems: refundTotalItems,
    paginatedItems: paginatedRefunds,
  } = useTablePagination(sorted, undefined, [searchTerm, sortKey, sortDir]);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <RotateCcw className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('admin.refundRecords.title')}</h1>
              <p className="text-sm text-gray-500">{t('admin.refundRecords.subtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadRecords()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? t('common.loading', '載入中…') : t('admin.refundRecords.refresh')}
          </button>
        </div>

        {loadError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
            <span className="block text-xs text-red-600 mt-1">
              {t('admin.refundRecords.apiHint', '請確認後端已部署 GET /api/admin/refund-records 且 refund_records 資料表存在。')}
            </span>
          </div>
        )}
        {lastLoadedAt && !loadError && (
          <p className="text-xs text-gray-500">
            {t('admin.refundRecords.lastLoaded', {
              count: records.length,
              time: formatDateTime(lastLoadedAt.toISOString(), getLocale()),
              defaultValue: '共 {{count}} 筆 · 上次更新 {{time}}',
            })}
          </p>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="relative max-w-md">
              <span
                className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"
                aria-hidden="true"
              >
                <Search className="h-4 w-4 shrink-0" />
              </span>
              <input
                type="text"
                placeholder={t('admin.refundRecords.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm leading-5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {loading && records.length === 0 ? (
            <div className="py-16 flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="py-16 text-center">
              <RotateCcw className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">{t('admin.refundRecords.noRecords')}</p>
              <p className="text-sm text-gray-500 mt-1">{t('admin.refundRecords.noRecordsHint')}</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <TableSortButton label={t('admin.refundRecords.date')} sortKey="refunded_at" currentSortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="px-4 py-3 text-left text-xs" />
                      <TableSortButton label={t('admin.refundRecords.student')} sortKey="user_name" currentSortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="px-4 py-3 text-left text-xs" />
                      <TableSortButton label={t('admin.refundRecords.class')} sortKey="class_name" currentSortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="px-4 py-3 text-left text-xs" />
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.refundRecords.tokens')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.refundRecords.remarks')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.refundRecords.refundedBy')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedRefunds.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                          {formatDateTime(r.refunded_at, getLocale())}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.user_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {r.class_name}
                          {r.class_code && <span className="text-gray-400 ml-1">({r.class_code})</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{r.tokens_refunded}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={r.remarks}>{r.remarks}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{r.refunded_by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <TablePaginationBar
                  page={refundPage}
                  totalPages={refundTotalPages}
                  totalItems={refundTotalItems}
                  pageSize={refundPageSize}
                  onPageChange={setRefundPage}
                  className="hidden md:flex"
                />
              </div>

              <div className="md:hidden divide-y divide-gray-200">
                {paginatedRefunds.map((r) => (
                  <div key={r.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-gray-900">{r.user_name}</span>
                      <span className="text-xs text-gray-500">{formatDateTime(r.refunded_at, getLocale())}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      {r.class_name} {r.class_code && `(${r.class_code})`}
                    </p>
                    <p className="text-sm text-gray-600 mb-1">
                      {t('admin.refundRecords.tokens')}: {r.tokens_refunded}
                    </p>
                    <p className="text-sm text-gray-600 mb-1 line-clamp-2">{r.remarks}</p>
                    <p className="text-xs text-gray-500">{t('admin.refundRecords.refundedBy')}: {r.refunded_by}</p>
                  </div>
                ))}
              </div>
              <TablePaginationBar
                page={refundPage}
                totalPages={refundTotalPages}
                totalItems={refundTotalItems}
                pageSize={refundPageSize}
                onPageChange={setRefundPage}
                className="md:hidden rounded-b-lg border border-gray-200 border-t-0"
              />
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
