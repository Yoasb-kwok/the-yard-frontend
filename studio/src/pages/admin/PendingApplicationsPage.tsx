import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { api } from '../../lib/api';
import { ClipboardList, Eye, X, FileText, Check, Ban, Filter, RefreshCw } from 'lucide-react';

type Application = {
  id: string;
  rawType?: 'extension' | 'sick_leave';
  rawId?: number;
  studentName: string;
  className: string;
  type: 'reschedule' | 'sickLeave';
  leaveType?: 'personal' | 'sick';
  reason: string;
  documentUrl?: string | null;
};

/** Normalise API response: flat array or nested { sick_leave_requests, extension_requests } */
function normaliseApplications(data: unknown): Application[] {
  if (Array.isArray(data)) {
    return data.map((a: Record<string, unknown>) => ({
      id: String(a.id ?? ''),
      rawType: (a.rawType ?? a.raw_type) as 'extension' | 'sick_leave',
      rawId: typeof a.rawId === 'number' ? a.rawId : (typeof a.raw_id === 'number' ? a.raw_id : undefined),
      studentName: String(a.studentName ?? a.student_name ?? ''),
      className: String(a.className ?? a.class_name ?? ''),
      type: (a.type === 'reschedule' ? 'reschedule' : 'sickLeave') as 'reschedule' | 'sickLeave',
      leaveType: (a.leaveType === 'personal' || a.leave_type === 'personal' ? 'personal' : 'sick') as 'personal' | 'sick',
      reason: String(a.reason ?? ''),
      documentUrl: (a.documentUrl ?? a.document_url ?? null) as string | null,
    }));
  }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const out: Application[] = [];
    const sick = (data as Record<string, unknown>).sick_leave_requests;
    if (Array.isArray(sick)) {
      sick.forEach((r: Record<string, unknown>) => {
        out.push({
          id: `sick_leave_${r.id}`,
          rawType: 'sick_leave',
          rawId: typeof r.id === 'number' ? r.id : undefined,
          studentName: String(r.student_name ?? r.studentName ?? ''),
          className: String(r.class_name ?? r.className ?? ''),
          type: 'sickLeave',
          leaveType: (r.leave_type === 'personal' || r.leaveType === 'personal' ? 'personal' : 'sick') as 'personal' | 'sick',
          reason: String(r.reason ?? ''),
          documentUrl: (r.document_url ?? r.documentUrl ?? null) as string | null,
        });
      });
    }
    const ext = (data as Record<string, unknown>).extension_requests;
    if (Array.isArray(ext)) {
      ext.forEach((r: Record<string, unknown>) => {
        out.push({
          id: `extension_${r.id}`,
          rawType: 'extension',
          rawId: typeof r.id === 'number' ? r.id : undefined,
          studentName: String(r.student_name ?? r.studentName ?? ''),
          className: String(r.class_name ?? r.className ?? ''),
          type: 'reschedule',
          reason: String(r.reason ?? ''),
          documentUrl: null,
        });
      });
    }
    return out;
  }
  return [];
}

export default function PendingApplicationsPage() {
  const { t } = useTranslation();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectReasonError, setRejectReasonError] = useState('');
  const [approveWithRefund, setApproveWithRefund] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'reschedule' | 'sickLeave'>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRejectModal, setBulkRejectModal] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState('');
  const [bulkRejectError, setBulkRejectError] = useState('');

  const loadApplications = useCallback(() => {
    setApiError(null);
    setLoading(true);
    api
      .get<{ data?: unknown }>('/admin/pending-applications')
      .then((res) => {
        const data = res.data;
        setApplications(normaliseApplications(Array.isArray(data) ? data : data));
      })
      .catch((err) => {
        setApiError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  useEffect(() => {
    const onFocus = () => loadApplications();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadApplications]);

  const courseOptions = Array.from(new Set(applications.map((a) => a.className)));
  const filteredApplications = applications.filter((a) => {
    if (typeFilter !== 'all' && a.type !== typeFilter) return false;
    if (courseFilter !== 'all' && a.className !== courseFilter) return false;
    return true;
  });
  const allSelected = filteredApplications.length > 0 && selectedIds.size === filteredApplications.length;
  const selectedCount = filteredApplications.filter((a) => selectedIds.has(a.id)).length;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredApplications.forEach((a) => next.delete(a.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredApplications.forEach((a) => next.add(a.id));
        return next;
      });
    }
  }
  async function patchApplication(app: Application, status: 'approved' | 'rejected', rejectionReason?: string) {
    if (app.rawType === 'extension' && app.rawId != null) {
      await api.patch(`/admin/extension-requests/${app.rawId}`, { status, rejection_reason: rejectionReason ?? undefined });
    } else if (app.rawType === 'sick_leave' && app.rawId != null) {
      await api.patch(`/admin/sick-leave-requests/${app.rawId}`, { status, rejection_reason: rejectionReason ?? undefined });
    }
  }
  function handleBulkApprove() {
    const toApprove = filteredApplications.filter((a) => selectedIds.has(a.id));
    Promise.all(toApprove.map((a) => patchApplication(a, 'approved')))
      .then(() => {
        const ids = toApprove.map((a) => a.id);
        setApplications((prev) => prev.filter((a) => !ids.includes(a.id)));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        });
        setSuccessMessage(t('admin.dashboard.bulkApproved', { count: ids.length }, `已批准 ${ids.length} 件申請`));
        setTimeout(() => setSuccessMessage(null), 4000);
      })
      .catch((err) => setApiError(err instanceof Error ? err.message : 'Request failed'));
  }
  function handleBulkRejectSubmit() {
    const reason = bulkRejectReason.trim();
    if (!reason) {
      setBulkRejectError(t('admin.dashboard.rejectReasonRequired'));
      return;
    }
    const toReject = filteredApplications.filter((a) => selectedIds.has(a.id));
    Promise.all(toReject.map((a) => patchApplication(a, 'rejected', reason)))
      .then(() => {
        const ids = toReject.map((a) => a.id);
        setApplications((prev) => prev.filter((a) => !ids.includes(a.id)));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        });
        setBulkRejectModal(false);
        setBulkRejectReason('');
        setBulkRejectError('');
        setSuccessMessage(t('admin.dashboard.bulkRejected', { count: ids.length }, `已拒絕 ${ids.length} 件申請`));
        setTimeout(() => setSuccessMessage(null), 4000);
      })
      .catch((err) => setApiError(err instanceof Error ? err.message : 'Request failed'));
  }

  const viewing = applications.find((a) => a.id === viewingId);

  function closeModal() {
    setViewingId(null);
    setRejectMode(false);
    setRejectReason('');
    setRejectReasonError('');
    setApproveWithRefund(false);
  }

  function handleApprove(id: string, studentName: string, withRefund: boolean) {
    const app = applications.find((a) => a.id === id);
    if (!app) return;
    patchApplication(app, 'approved')
      .then(() => {
        setApplications((prev) => prev.filter((a) => a.id !== id));
        closeModal();
        if (withRefund) {
          setSuccessMessage(t('admin.dashboard.applicationApprovedWithRefund', { name: studentName }));
          setTimeout(() => setSuccessMessage(null), 5000);
        }
      })
      .catch((err) => setApiError(err instanceof Error ? err.message : 'Request failed'));
  }

  function handleReject(id: string) {
    const reason = rejectReason.trim();
    if (!reason) {
      setRejectReasonError(t('admin.dashboard.rejectReasonRequired'));
      return;
    }
    const app = applications.find((a) => a.id === id);
    if (!app) return;
    patchApplication(app, 'rejected', reason)
      .then(() => {
        setApplications((prev) => prev.filter((a) => a.id !== id));
        closeModal();
      })
      .catch((err) => setApiError(err instanceof Error ? err.message : 'Request failed'));
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-gray-900">{t('admin.dashboard.pendingApplications')}</h1>
          <button
            type="button"
            onClick={() => loadApplications()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
            title={t('common.retry', '重新載入')}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('common.retry', '重新載入')}
          </button>
        </div>

        <p className="text-sm text-gray-600">{t('admin.dashboard.pendingApplicationsHint')}</p>

        {apiError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            {apiError}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">{t('common.loading', '載入中...')}</p>
        ) : (
        <>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | 'reschedule' | 'sickLeave')}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary"
            >
              <option value="all">{t('admin.dashboard.filterAllTypes', '全部類型')}</option>
              <option value="reschedule">{t('admin.dashboard.applicationTypeReschedule')}</option>
              <option value="sickLeave">{t('admin.dashboard.applicationTypeSickLeave')}</option>
            </select>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary"
            >
              <option value="all">{t('admin.dashboard.filterAllCourses', '全部課程')}</option>
              {courseOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        {successMessage && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md border-l-4 border-amber-400 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-gray-700">{t('admin.dashboard.selectAll', '全選')}</span>
              </label>
              {selectedCount > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleBulkApprove}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                  >
                    <Check className="h-4 w-4" />
                    {t('admin.dashboard.bulkApprove', '批量批准')} ({selectedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkRejectModal(true)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
                  >
                    <Ban className="h-4 w-4" />
                    {t('admin.dashboard.bulkReject', '批量拒絕')} ({selectedCount})
                  </button>
                </>
              )}
            </div>
          </div>
          <ul className="space-y-4">
            {filteredApplications.length === 0 ? (
              <li className="py-8 text-center text-gray-500">{t('admin.dashboard.noPendingApplications')}</li>
            ) : (
            filteredApplications.map((app) => (
              <li key={app.id} className="p-4 bg-amber-50 rounded-lg border border-amber-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(app.id)}
                    onChange={() => toggleSelect(app.id)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                <div>
                  <span className="font-medium text-gray-900">{app.studentName}</span>
                  <span className="text-gray-500 mx-1">·</span>
                  <span className="text-gray-700">{app.className}</span>
                  <span className="text-gray-500 mx-1">·</span>
                  <span className={app.type === 'sickLeave' ? 'text-amber-700 font-medium' : 'text-primary font-medium'}>
                    {app.type === 'reschedule' ? t('admin.dashboard.applicationTypeReschedule') : app.leaveType === 'personal' ? t('admin.dashboard.applicationTypePersonalLeave') : t('admin.dashboard.applicationTypeSickLeave')}
                  </span>
                  {app.type === 'sickLeave' && app.leaveType === 'sick' && (
                    <span className="text-sm text-green-600 ml-1">✓ {app.documentUrl ? t('admin.dashboard.sickLeaveDocUploaded') : t('admin.dashboard.noDocUploaded')}</span>
                  )}
                </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingId(app.id)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary bg-primary-lighter rounded-md hover:bg-primary/20 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  {t('admin.dashboard.viewReasonOrDoc')}
                </button>
              </li>
            )))}
          </ul>
        </div>

        {bulkRejectModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setBulkRejectModal(false); setBulkRejectError(''); }}>
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('admin.dashboard.bulkRejectReason', '統一拒絕原因')}</h3>
              <textarea
                value={bulkRejectReason}
                onChange={(e) => { setBulkRejectReason(e.target.value); setBulkRejectError(''); }}
                placeholder={t('admin.dashboard.rejectionReasonPlaceholder')}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
              {bulkRejectError && <p className="mt-1 text-sm text-red-600">{bulkRejectError}</p>}
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => { setBulkRejectModal(false); setBulkRejectError(''); setBulkRejectReason(''); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleBulkRejectSubmit}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  <Ban className="h-4 w-4" />
                  {t('admin.dashboard.confirmReject')}
                </button>
              </div>
            </div>
          </div>
        )}

        {viewing && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeModal}>
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('admin.dashboard.viewReasonOrDoc')}</h3>
                <button type="button" onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium text-gray-900">{viewing.studentName}</span>
                <span className="text-gray-500 mx-1">·</span>
                <span className="text-gray-700">{viewing.className}</span>
              </p>
              <p className="text-sm text-gray-500 mb-2">
                {viewing.type === 'reschedule' ? t('admin.dashboard.applicationTypeReschedule') : viewing.leaveType === 'personal' ? t('admin.dashboard.applicationTypePersonalLeave') : t('admin.dashboard.applicationTypeSickLeave')}
              </p>
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">{t('schedule.reason')}</p>
                <p className="text-sm text-gray-900">{viewing.reason}</p>
              </div>
              {viewing.type === 'sickLeave' && viewing.leaveType === 'sick' && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">{t('admin.attendance.sickLeaveDoc')}</p>
                  {viewing.documentUrl ? (
                    <div className="space-y-2">
                      {viewing.documentUrl.startsWith('data:') ? (
                        <img
                          src={viewing.documentUrl}
                          alt=""
                          className="max-w-full max-h-64 rounded border border-gray-200 object-contain bg-gray-50"
                        />
                      ) : null}
                      {viewing.documentUrl.startsWith('data:') ? (
                        <button
                          type="button"
                          onClick={() => {
                            const w = window.open('', '_blank');
                            if (w) {
                              w.document.write(
                                '<!DOCTYPE html><html><head><meta charset="utf-8"><title>病假證明</title></head><body style="margin:0;background:#f3f4f6;display:flex;justify-content:center;align-items:center;min-height:100vh"><img src="' +
                                  viewing.documentUrl +
                                  '" style="max-width:100%;height:auto;display:block" alt="Sick leave document"/></body></html>'
                              );
                              w.document.close();
                            }
                          }}
                          className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline"
                        >
                          <FileText className="h-4 w-4" />
                          {t('admin.attendance.viewSickLeaveDoc')}
                        </button>
                      ) : (
                        <a
                          href={viewing.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline"
                        >
                          <FileText className="h-4 w-4" />
                          {t('admin.attendance.viewSickLeaveDoc')}
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">{t('admin.dashboard.noDocUploaded')}</p>
                  )}
                </div>
              )}

              {rejectMode ? (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.dashboard.rejectionReason')}</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => { setRejectReason(e.target.value); setRejectReasonError(''); }}
                    placeholder={t('admin.dashboard.rejectionReasonPlaceholder')}
                    rows={3}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  {rejectReasonError && <p className="mt-1 text-sm text-red-600">{rejectReasonError}</p>}
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => handleReject(viewing.id)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                    >
                      <Ban className="h-4 w-4" />
                      {t('admin.dashboard.confirmReject')}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRejectMode(false); setRejectReason(''); setRejectReasonError(''); }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-t border-gray-200 pt-4 mt-4 space-y-4">
                  <p className="text-xs text-gray-500">{t('admin.dashboard.emailNotifyOnApproveReject')}</p>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={approveWithRefund}
                      onChange={(e) => setApproveWithRefund(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">{t('admin.dashboard.approveWithRefundCheckbox')}</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleApprove(viewing.id, viewing.studentName, approveWithRefund)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                    >
                      <Check className="h-4 w-4" />
                      {t('admin.dashboard.approveApplication')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectMode(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
                    >
                      <Ban className="h-4 w-4" />
                      {t('admin.dashboard.rejectApplication')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <Link
          to="/admin/classes"
          className="inline-flex items-center gap-2 text-primary font-medium hover:text-primary-dark"
        >
          {t('admin.dashboard.goToClasses')} →
        </Link>
        </>
        )}
      </div>
    </Layout>
  );
}
