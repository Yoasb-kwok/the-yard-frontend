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
  status: 'pending' | 'confirmed' | 'assigned' | 'cancelled';
  assigned_class_id?: string | null;
  assigned_class_name?: string | null;
  notes?: string;
  applied_at: string;
  updated_at?: string;
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
];

const STATUS_OPTIONS: TrialApplication['status'][] = ['pending', 'confirmed', 'assigned', 'cancelled'];

export default function TrialApplicationsPage() {
  const { t, i18n } = useTranslation();
  const [applications, setApplications] = useState<TrialApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TrialApplication['status'] | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState<Record<string, string>>({});
  const [editAssignedClass, setEditAssignedClass] = useState<Record<string, string>>({});

  const getLocale = () => (i18n.language === 'zh-CN' ? 'zh-CN' : i18n.language === 'zh-TW' ? 'zh-TW' : 'en-US');

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
      (Array.isArray(data) ? data : FALLBACK_TRIAL_APPLICATIONS).forEach((a) => {
        initialNotes[a.id] = a.notes ?? '';
        initialAssigned[a.id] = a.assigned_class_name ?? '';
      });
      setEditNotes(initialNotes);
      setEditAssigned(initialAssigned);
    } catch {
      setApplications(FALLBACK_TRIAL_APPLICATIONS);
      FALLBACK_TRIAL_APPLICATIONS.forEach((a) => {
        setEditNotes((prev) => ({ ...prev, [a.id]: a.notes ?? '' }));
        setEditAssigned((prev) => ({ ...prev, [a.id]: a.assigned_class_name ?? '' }));
      });
    } finally {
      setLoading(false);
    }
  }

  const filtered = applications.filter((a) => statusFilter === 'all' || a.status === statusFilter);

  function getStatusLabel(s: TrialApplication['status']) {
    return t(`admin.trialApplications.status.${s}`);
  }

  function getStatusColor(s: TrialApplication['status']) {
    switch (s) {
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'assigned': return 'bg-green-100 text-green-800';
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
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TrialApplication['status'] | 'all')}
              className="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
            >
              <option value="all">{t('admin.trialApplications.filterAll')}</option>
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.trialApplications.status')}</th>
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
                            <div className="grid sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                                  <MessageSquare className="h-4 w-4" />
                                  {t('admin.trialApplications.notes')}
                                </label>
                                <textarea
                                  value={editNotes[app.id] ?? ''}
                                  onChange={(e) => setEditNotes((prev) => ({ ...prev, [app.id]: e.target.value }))}
                                  rows={2}
                                  className="w-full border rounded px-3 py-2 text-sm"
                                  placeholder={t('admin.trialApplications.notesPlaceholder')}
                                />
                                <button
                                  type="button"
                                  onClick={() => saveNotes(app.id)}
                                  className="mt-2 px-3 py-1 bg-primary text-white text-sm rounded hover:bg-primary-dark"
                                >
                                  {t('common.save')}
                                </button>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {t('admin.trialApplications.assignClass')}
                                </label>
                                <input
                                  type="text"
                                  value={editAssignedClass[app.id] ?? ''}
                                  onChange={(e) => setEditAssignedClass((prev) => ({ ...prev, [app.id]: e.target.value }))}
                                  className="w-full border rounded px-3 py-2 text-sm"
                                  placeholder={t('admin.trialApplications.assignClassPlaceholder')}
                                />
                                <button
                                  type="button"
                                  onClick={() => saveAssignedClass(app.id)}
                                  className="mt-2 px-3 py-1 bg-primary text-white text-sm rounded hover:bg-primary-dark"
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
