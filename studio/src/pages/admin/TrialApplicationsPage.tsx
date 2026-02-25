import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { formatDateTime } from '../../lib/utils';
import { api } from '../../lib/api';
import React from 'react';
import { BookOpen, Calendar, MessageSquare, ChevronDown, Filter } from 'lucide-react';

export interface TrialApplication {
  id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone?: string;
  trial_class: string;
  preferred_datetime?: string;
  status: 'pending' | 'confirmed' | 'assigned' | 'cancelled' | 'contacted' | 'attended_trial' | 'converted';
  assigned_class_id?: string | null;
  assigned_class_name?: string | null;
  notes?: string;
  applied_at: string;
  updated_at?: string;
  trial_date?: string; // for "本週試堂" filter
}

const FALLBACK_TRIAL_APPLICATIONS: TrialApplication[] = [
  {
    id: 'trial_1',
    applicant_name: '陳小明',
    applicant_email: 'ming@example.com',
    applicant_phone: '91234567',
    trial_class: '兒童芭蕾試堂',
    preferred_datetime: new Date(Date.now() + 3 * 86400000).toISOString(),
    status: 'pending',
    assigned_class_id: null,
    assigned_class_name: null,
    notes: '',
    applied_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'trial_2',
    applicant_name: '李小花',
    applicant_email: 'flower@example.com',
    trial_class: '兒童爵士試堂',
    status: 'confirmed',
    assigned_class_id: 'cls_1',
    assigned_class_name: '兒童爵士 A（週五 18:00）',
    notes: '已致電確認時間',
    applied_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'trial_3',
    applicant_name: '王大明',
    applicant_email: 'daming@example.com',
    trial_class: '幼兒律動試堂',
    status: 'assigned',
    assigned_class_id: 'cls_2',
    assigned_class_name: '幼兒律動（週六 10:00）',
    applied_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'trial_4',
    applicant_name: '張小美',
    applicant_email: 'mei@example.com',
    trial_class: '兒童芭蕾試堂',
    status: 'contacted',
    applied_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    trial_date: new Date(Date.now() + 2 * 86400000).toISOString(),
  },
];

const STATUS_OPTIONS: TrialApplication['status'][] = ['pending', 'confirmed', 'assigned', 'contacted', 'attended_trial', 'converted', 'cancelled'];

const QUICK_FILTERS = ['all', 'not_contacted', 'this_week'] as const;
type QuickFilter = typeof QUICK_FILTERS[number];

export default function TrialApplicationsPage() {
  const { t, i18n } = useTranslation();
  const [applications, setApplications] = useState<TrialApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TrialApplication['status'] | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState<Record<string, string>>({});
  const [editAssignedClass, setEditAssignedClass] = useState<Record<string, string>>({});
  const [editStatus, setEditStatus] = useState<Record<string, TrialApplication['status']>>({});
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');

  const getLocale = () => (i18n.language === 'zh-CN' ? 'zh-CN' : i18n.language === 'zh-TW' ? 'zh-TW' : 'en-US');

  const startOfWeek = (d: Date) => {
    const x = new Date(d);
    const day = x.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    x.setDate(x.getDate() + diff);
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  };
  const endOfWeek = (d: Date) => {
    const x = new Date(startOfWeek(d));
    x.setDate(x.getDate() + 6);
    x.setHours(23, 59, 59, 999);
    return x.getTime();
  };
  const thisWeekStart = startOfWeek(new Date());
  const thisWeekEnd = endOfWeek(new Date());

  const filtered = applications.filter((a) => {
    if (quickFilter === 'not_contacted') {
      if (!['pending'].includes(a.status)) return false;
    } else if (quickFilter === 'this_week') {
      const trialTime = a.trial_date ? new Date(a.trial_date).getTime() : a.preferred_datetime ? new Date(a.preferred_datetime).getTime() : new Date(a.applied_at).getTime();
      if (trialTime < thisWeekStart || trialTime > thisWeekEnd) return false;
    }
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    return true;
  });

  useEffect(() => {
    loadApplications();
  }, []);

  async function loadApplications() {
    setLoading(true);
    try {
      const res = await api.get<TrialApplication[]>('/admin/trial-applications?demo=1').catch(() => ({ success: true, data: FALLBACK_TRIAL_APPLICATIONS }));
      const data = (res as any).data ?? res;
      setApplications(Array.isArray(data) ? data : FALLBACK_TRIAL_APPLICATIONS);
      const initialNotes: Record<string, string> = {};
      const initialAssigned: Record<string, string> = {};
      const initialStatus: Record<string, TrialApplication['status']> = {};
      (Array.isArray(data) ? data : FALLBACK_TRIAL_APPLICATIONS).forEach((a) => {
        initialNotes[a.id] = a.notes ?? '';
        initialAssigned[a.id] = a.assigned_class_name ?? '';
        initialStatus[a.id] = a.status;
      });
      setEditNotes(initialNotes);
      setEditAssignedClass(initialAssigned);
      setEditStatus(initialStatus);
    } catch {
      setApplications(FALLBACK_TRIAL_APPLICATIONS);
      FALLBACK_TRIAL_APPLICATIONS.forEach((a) => {
        setEditNotes((prev) => ({ ...prev, [a.id]: a.notes ?? '' }));
        setEditAssignedClass((prev) => ({ ...prev, [a.id]: a.assigned_class_name ?? '' }));
        setEditStatus((prev) => ({ ...prev, [a.id]: a.status }));
      });
    } finally {
      setLoading(false);
    }
  }

  function getStatusLabel(s: TrialApplication['status']) {
    return t(`admin.trialApplications.status.${s}`);
  }

  function getStatusColor(s: TrialApplication['status']) {
    switch (s) {
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'assigned': return 'bg-green-100 text-green-800';
      case 'contacted': return 'bg-cyan-100 text-cyan-800';
      case 'attended_trial': return 'bg-emerald-100 text-emerald-800';
      case 'converted': return 'bg-primary-lighter text-primary';
      case 'cancelled': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function saveNotes(id: string) {
    setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, notes: editNotes[id] } : a)));
    setExpandedId(null);
  }

  function saveAssignedClass(id: string) {
    setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, assigned_class_name: editAssignedClass[id] || undefined } : a)));
  }

  function saveStatus(id: string) {
    const newStatus = editStatus[id];
    if (newStatus == null) return;
    setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a)));
    setExpandedId(null);
  }

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            {t('admin.trialApplications.title')}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-5 w-5 text-gray-500" />
            <select
              value={quickFilter}
              onChange={(e) => setQuickFilter(e.target.value as QuickFilter)}
              className="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
            >
              <option value="all">{t('admin.trialApplications.filterAll')}</option>
              <option value="not_contacted">{t('admin.trialApplications.filterNotContacted', '未聯絡')}</option>
              <option value="this_week">{t('admin.trialApplications.filterThisWeek', '本週試堂')}</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TrialApplication['status'] | 'all')}
              className="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
            >
              <option value="all">{t('admin.trialApplications.filterAllStatus', '全部狀態')}</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{getStatusLabel(s)}</option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-gray-600 text-sm">
          {t('admin.trialApplications.description')}
        </p>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">{t('admin.trialApplications.noApplications')}</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.trialApplications.applicant')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.trialApplications.trialClass')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.trialApplications.statusLabel')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.trialApplications.assignedClass')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.trialApplications.appliedAt')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions', { defaultValue: '操作' })}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.map((app) => (
                    <React.Fragment key={app.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{app.applicant_name}</div>
                          <div className="text-xs text-gray-500">{app.applicant_email}</div>
                          {app.applicant_phone && <div className="text-xs text-gray-500">{app.applicant_phone}</div>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{app.trial_class}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(app.status)}`}>
                            {getStatusLabel(app.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{app.assigned_class_name || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDateTime(app.applied_at, getLocale())}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                            className="text-primary hover:text-primary-dark flex items-center justify-end gap-1 text-sm"
                          >
                            {expandedId === app.id ? t('common.collapse') : t('admin.trialApplications.notesAndAssign')}
                            <ChevronDown className={`h-4 w-4 ${expandedId === app.id ? 'rotate-180' : ''}`} />
                          </button>
                        </td>
                      </tr>
                      {expandedId === app.id && (
                        <tr key={`${app.id}-expand`} className="bg-gray-50">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="flex flex-row items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
                                <label className="shrink-0 text-sm font-medium text-gray-600 w-14">
                                  {t('admin.trialApplications.statusLabel')}
                                </label>
                                <select
                                  value={editStatus[app.id] ?? app.status}
                                  onChange={(e) => setEditStatus((prev) => ({ ...prev, [app.id]: e.target.value as TrialApplication['status'] }))}
                                  className="min-w-0 flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                                >
                                  {STATUS_OPTIONS.map((s) => (
                                    <option key={s} value={s}>{getStatusLabel(s)}</option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => saveStatus(app.id)}
                                  className="shrink-0 px-3 py-2 text-sm font-medium bg-primary text-white rounded-md hover:bg-primary-dark"
                                >
                                  {t('common.save')}
                                </button>
                              </div>
                              <div className="flex flex-row items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
                                <label className="shrink-0 text-sm font-medium text-gray-600 flex items-center gap-1 w-14">
                                  <MessageSquare className="h-4 w-4" />
                                  {t('admin.trialApplications.notes')}
                                </label>
                                <input
                                  type="text"
                                  value={editNotes[app.id] ?? ''}
                                  onChange={(e) => setEditNotes((prev) => ({ ...prev, [app.id]: e.target.value }))}
                                  className="min-w-0 flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                                  placeholder={t('admin.trialApplications.notesPlaceholder')}
                                />
                                <button
                                  type="button"
                                  onClick={() => saveNotes(app.id)}
                                  className="shrink-0 px-3 py-2 text-sm font-medium bg-primary text-white rounded-md hover:bg-primary-dark"
                                >
                                  {t('common.save')}
                                </button>
                              </div>
                              <div className="flex flex-row items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
                                <label className="shrink-0 text-sm font-medium text-gray-600 flex items-center gap-1 w-14">
                                  <Calendar className="h-4 w-4" />
                                  {t('admin.trialApplications.assignClass')}
                                </label>
                                <input
                                  type="text"
                                  value={editAssignedClass[app.id] ?? ''}
                                  onChange={(e) => setEditAssignedClass((prev) => ({ ...prev, [app.id]: e.target.value }))}
                                  className="min-w-0 flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                                  placeholder={t('admin.trialApplications.assignClassPlaceholder')}
                                />
                                <button
                                  type="button"
                                  onClick={() => saveAssignedClass(app.id)}
                                  className="shrink-0 px-3 py-2 text-sm font-medium bg-primary text-white rounded-md hover:bg-primary-dark"
                                >
                                  {t('common.save')}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
