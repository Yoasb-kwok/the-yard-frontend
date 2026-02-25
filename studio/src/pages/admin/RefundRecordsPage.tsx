import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { formatDateTime } from '../../lib/utils';
import { api } from '../../lib/api';
import { Search, RefreshCw, RotateCcw } from 'lucide-react';
import DateSelect from '../../components/DateSelect';
import { TableSortButton } from '../../components/TableSortButton';

export interface RefundRecord {
  id: string;
  enrollment_id: string;
  user_id: string;
  user_name: string;
  class_id: string;
  class_name: string;
  class_code: string;
  tokens_refunded: number;
  remarks: string;
  refunded_by: string;
  refunded_at: string;
}

/** Fallback demo data when API is unavailable */
const FALLBACK_REFUND_RECORDS: RefundRecord[] = [
  { id: 'refund_1', enrollment_id: 'enr_1', user_id: 'student-001', user_name: 'Student One', class_id: 'cls_1', class_name: 'Kids Ballet', class_code: 'KB-A', tokens_refunded: 1, remarks: 'Sick leave', refunded_by: 'admin', refunded_at: new Date().toISOString() },
];

export default function RefundRecordsPage() {
  const { t, i18n } = useTranslation();
  const [records, setRecords] = useState<RefundRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
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

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<RefundRecord[]>('admin/refund-records?demo=1').catch(() => ({ success: true, data: FALLBACK_REFUND_RECORDS }));
      setRecords(res.data ?? FALLBACK_REFUND_RECORDS);
    } catch (err) {
      console.error('Failed to load refund records:', err);
      setRecords(FALLBACK_REFUND_RECORDS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    const handler = () => loadRecords();
    window.addEventListener('refund-record-added', handler);
    return () => window.removeEventListener('refund-record-added', handler);
  }, [loadRecords]);

  const filtered = records.filter((r) => {
    const matchSearch =
      !searchTerm ||
      r.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.class_name && r.class_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.class_code && r.class_code.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!matchSearch) return false;
    if (dateFrom || dateTo) {
      const d = new Date(r.refunded_at).getTime();
      if (dateFrom && d < new Date(dateFrom + 'T00:00:00').getTime()) return false;
      if (dateTo && d > new Date(dateTo + 'T23:59:59').getTime()) return false;
    }
    return true;
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

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  if (loading && records.length === 0) {
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
            onClick={loadRecords}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            {t('admin.refundRecords.refresh')}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('admin.refundRecords.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="flex gap-2 flex-wrap items-end">
                <div>
                  <span className="block text-xs text-gray-500 mb-1">{t('admin.refundRecords.dateFrom')}</span>
                  <DateSelect
                    value={dateFrom}
                    onChange={setDateFrom}
                    className="px-3 py-2 text-sm"
                    ariaLabel={t('admin.refundRecords.dateFrom')}
                  />
                </div>
                <div>
                  <span className="block text-xs text-gray-500 mb-1">{t('admin.refundRecords.dateTo')}</span>
                  <DateSelect
                    value={dateTo}
                    onChange={setDateTo}
                    className="px-3 py-2 text-sm"
                    ariaLabel={t('admin.refundRecords.dateTo')}
                  />
                </div>
              </div>
            </div>
          </div>

          {sorted.length === 0 ? (
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
                    {sorted.map((r) => (
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
              </div>

              <div className="md:hidden divide-y divide-gray-200">
                {sorted.map((r) => (
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
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
