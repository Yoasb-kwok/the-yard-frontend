import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { formatDateTime } from '../../lib/utils';
import { getRefundRecords, type RefundRecord } from '../../lib/refundRecords';
import { Search, RefreshCw, RotateCcw } from 'lucide-react';

export default function RefundRecordsPage() {
  const { t, i18n } = useTranslation();
  const [records, setRecords] = useState<RefundRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const getLocale = (): string => {
    const langMap: { [key: string]: string } = {
      en: 'en-US',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
    };
    return langMap[i18n.language] || i18n.language || 'en-US';
  };

  const loadRecords = useCallback(() => {
    setRecords(getRefundRecords());
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
      r.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.class_code && r.class_code.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!matchSearch) return false;
    if (dateFrom || dateTo) {
      const d = new Date(r.refunded_at).getTime();
      if (dateFrom && d < new Date(dateFrom + 'T00:00:00').getTime()) return false;
      if (dateTo && d > new Date(dateTo + 'T23:59:59').getTime()) return false;
    }
    return true;
  });

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
              <div className="flex gap-2 flex-wrap">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.refundRecords.date')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.refundRecords.student')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.refundRecords.class')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.refundRecords.tokens')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.refundRecords.remarks')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.refundRecords.refundedBy')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filtered.map((r) => (
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
                {filtered.map((r) => (
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
