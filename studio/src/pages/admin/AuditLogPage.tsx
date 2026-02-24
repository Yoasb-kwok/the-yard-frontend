import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { formatDateTime } from '../../lib/utils';
import { api } from '../../lib/api';
import { FileText, Filter, Search } from 'lucide-react';

export interface AuditLogEntry {
  id: string;
  actor: string;
  actor_id?: string;
  action: string;
  target_type: string;
  target_id?: string;
  details?: string;
  created_at: string;
}

const DEMO_AUDIT_LOG: AuditLogEntry[] = [
  { id: '1', actor: 'Admin User', actor_id: 'admin-001', action: 'refund_tokens', target_type: 'user', target_id: 'student-001', details: '退 1 代幣（病假不補堂）', created_at: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: '2', actor: 'Admin User', actor_id: 'admin-001', action: 'attendance_change', target_type: 'enrollment', target_id: 'enr_1', details: '改為已出席', created_at: new Date(Date.now() - 5 * 3600000).toISOString() },
  { id: '3', actor: 'Admin User', actor_id: 'admin-001', action: 'approve_application', target_type: 'application', details: '同意改期申請', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: '4', actor: 'Admin User', actor_id: 'admin-001', action: 'reject_application', target_type: 'application', details: '拒絕病假申請', created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: '5', actor: 'Admin User', actor_id: 'admin-001', action: 'delete_user', target_type: 'user', target_id: 'old-student', details: '刪除測試帳號', created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
];

const ACTION_KEYS: Record<string, string> = {
  refund_tokens: 'audit.refundTokens',
  attendance_change: 'audit.attendanceChange',
  approve_application: 'audit.approveApplication',
  reject_application: 'audit.rejectApplication',
  delete_user: 'audit.deleteUser',
};

export default function AuditLogPage() {
  const { t, i18n } = useTranslation();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const getLocale = () => (i18n.language === 'zh-CN' ? 'zh-CN' : i18n.language === 'zh-TW' ? 'zh-TW' : 'en-US');

  useEffect(() => {
    loadLog();
  }, []);

  async function loadLog() {
    setLoading(true);
    try {
      const res = await api.get<AuditLogEntry[]>('/admin/audit-log?demo=1').catch(() => ({ success: true, data: DEMO_AUDIT_LOG }));
      const data = (res as any).data ?? res;
      setEntries(Array.isArray(data) ? data : DEMO_AUDIT_LOG);
    } catch {
      setEntries(DEMO_AUDIT_LOG);
    } finally {
      setLoading(false);
    }
  }

  const filtered = entries.filter((e) => {
    if (actionFilter !== 'all' && e.action !== actionFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return e.actor.toLowerCase().includes(q) || (e.details ?? '').toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) {
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
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="h-8 w-8 text-primary" />
          {t('admin.auditLog.title')}
        </h1>
        <p className="text-gray-600 text-sm">{t('admin.auditLog.description')}</p>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.auditLog.searchPlaceholder')}
              className="pl-9 pr-3 py-2 border rounded-md text-sm w-48 focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
            >
              <option value="all">{t('admin.auditLog.filterAll')}</option>
              {Object.keys(ACTION_KEYS).map((key) => (
                <option key={key} value={key}>{t(ACTION_KEYS[key])}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.auditLog.time')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.auditLog.actor')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.auditLog.action')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.auditLog.details')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">{t('admin.auditLog.noEntries')}</td>
                  </tr>
                ) : (
                  filtered.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDateTime(e.created_at, getLocale())}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{e.actor}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{t(ACTION_KEYS[e.action] ?? e.action)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{e.details ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
