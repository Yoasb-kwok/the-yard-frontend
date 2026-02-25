import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { ClipboardList, Eye, X, FileText, Check, Ban, Filter } from 'lucide-react';

type Application = {
  id: string;
  studentName: string;
  className: string;
  type: 'reschedule' | 'sickLeave';
  reason: string;
  documentUrl?: string | null;
};

const EXAMPLE_APPLICATIONS: Application[] = [
  { id: '1', studentName: '陳小明', className: '兒童芭蕾 A', type: 'reschedule', reason: '時間未能配合' },
  { id: '2', studentName: '李小花', className: 'Teen Hip Hop', type: 'sickLeave', reason: '發燒', documentUrl: null },
  { id: '3', studentName: '王大明', className: '兒童芭蕾 A', type: 'sickLeave', reason: '感冒', documentUrl: null },
];

export default function PendingApplicationsPage() {
  const { t } = useTranslation();
  const [applications, setApplications] = useState<Application[]>(() => [...EXAMPLE_APPLICATIONS]);
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
  function handleBulkApprove() {
    const ids = filteredApplications.filter((a) => selectedIds.has(a.id)).map((a) => a.id);
    setApplications((prev) => prev.filter((a) => !ids.includes(a.id)));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    setSuccessMessage(t('admin.dashboard.bulkApproved', { count: ids.length }, `已批准 ${ids.length} 件申請`));
    setTimeout(() => setSuccessMessage(null), 4000);
  }
  function handleBulkRejectSubmit() {
    const reason = bulkRejectReason.trim();
    if (!reason) {
      setBulkRejectError(t('admin.dashboard.rejectReasonRequired'));
      return;
    }
    const ids = filteredApplications.filter((a) => selectedIds.has(a.id)).map((a) => a.id);
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
    setApplications((prev) => prev.filter((a) => a.id !== id));
    closeModal();
    if (withRefund) {
      setSuccessMessage(t('admin.dashboard.applicationApprovedWithRefund', { name: studentName }));
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  }

  function handleReject(id: string) {
    const reason = rejectReason.trim();
    if (!reason) {
      setRejectReasonError(t('admin.dashboard.rejectReasonRequired'));
      return;
    }
    setApplications((prev) => prev.filter((a) => a.id !== id));
    closeModal();
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-gray-900">{t('admin.dashboard.pendingApplications')}</h1>
        </div>

        <p className="text-sm text-gray-600">{t('admin.dashboard.pendingApplicationsHint')}</p>

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
                    {app.type === 'sickLeave' ? t('admin.dashboard.applicationTypeSickLeave') : t('admin.dashboard.applicationTypeReschedule')}
                  </span>
                  {app.type === 'sickLeave' && (
                    <span className="text-sm text-green-600 ml-1">✓ {t('admin.dashboard.sickLeaveDocUploaded')}</span>
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
                {viewing.type === 'sickLeave' ? t('admin.dashboard.applicationTypeSickLeave') : t('admin.dashboard.applicationTypeReschedule')}
              </p>
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">{t('schedule.reason')}</p>
                <p className="text-sm text-gray-900">{viewing.reason}</p>
              </div>
              {viewing.type === 'sickLeave' && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">{t('admin.attendance.sickLeaveDoc')}</p>
                  {viewing.documentUrl ? (
                    <a
                      href={viewing.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline"
                    >
                      <FileText className="h-4 w-4" />
                      {t('admin.attendance.viewSickLeaveDoc')}
                    </a>
                  ) : viewing.id === '2' ? (
                    <div className="border border-gray-200 rounded-lg bg-gray-50 p-4 text-sm text-gray-800 shadow-inner">
                      <div className="text-center border-b border-gray-300 pb-2 mb-3">
                        <p className="font-bold text-base text-gray-900">醫生證明書</p>
                        <p className="text-xs text-gray-500 mt-0.5">Medical Certificate</p>
                      </div>
                      <table className="w-full text-left">
                        <tbody>
                          <tr><td className="py-1 text-gray-500 w-28">病人姓名</td><td className="font-medium">李小花</td></tr>
                          <tr><td className="py-1 text-gray-500">診斷／病況</td><td>發燒 (Fever)</td></tr>
                          <tr><td className="py-1 text-gray-500">建議休息</td><td>2026年2月20日至2月21日</td></tr>
                          <tr><td className="py-1 text-gray-500">簽發日期</td><td>2026年2月20日</td></tr>
                        </tbody>
                      </table>
                      <div className="mt-4 pt-3 border-t border-gray-200 flex justify-end">
                        <p className="text-gray-600 text-xs">陳大文醫生</p>
                        <p className="text-gray-400 text-xs ml-2">XX 診所</p>
                      </div>
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
      </div>
    </Layout>
  );
}
