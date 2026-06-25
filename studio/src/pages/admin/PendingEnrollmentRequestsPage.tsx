import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { api, ApiError } from '../../lib/api';
import {
  getEnrollmentTokenCost,
  getLessonsForScope,
  type EnrollmentScope,
} from '../../lib/classEnrollmentTokens';
import { formatDateTime, formatMobileForDisplay } from '../../lib/utils';
import {
  canRejectRequest,
  hasSufficientUnassigned,
  isAwaitingTokenAssignment,
  isClassPendingRow,
  isCompletedTokenAssignment,
  isIncompleteTokenAssignment,
  isReadyToAssignRequest,
  isTokenReadyRow,
  isWaitingForTokensRequest,
  loadAdminEnrollmentRequestQueue,
  normaliseRequestStatus,
  type EnrollmentRequest,
} from '../../lib/adminEnrollmentRequestQueue';
import { AlertCircle, ClipboardList, Coins, Filter, Loader2, Mail, Package, Pencil, RefreshCw, X } from 'lucide-react';

type ClassOption = {
  id: string;
  name: string;
  classCode: string;
  totalLessons: number;
  tokenCost: number;
  isCancelled: boolean;
};

function isTerminalRequestStatus(status: string): boolean {
  return status === 'fulfilled' || status === 'rejected' || status === 'cancelled' || status === 'assigned';
}

function extractRejectCurrentStatus(err: unknown): string | null {
  if (!(err instanceof ApiError) || !err.data) return null;
  const raw = err.data.current_status ?? err.data.currentStatus;
  if (raw == null || raw === '') return null;
  return normaliseRequestStatus(raw);
}

function buildAssignTokensUrl(request: EnrollmentRequest, tab: 'unassigned' | 'assigned'): string {
  const params = new URLSearchParams({ tab });
  if (request.classId) params.set('classId', request.classId);
  if (request.id && !isTokenReadyRow(request)) params.set('requestId', request.id);
  if (request.tokensRequired > 0) params.set('quantity', String(request.tokensRequired));
  if (request.lessonCount > 0) params.set('lessonCount', String(request.lessonCount));
  if (request.classId) params.set('scope', request.enrollmentScope);
  if (request.studentProfileId) {
    params.set('profileId', request.studentProfileId);
  }
  if (request.lessonClassIds.length > 0) {
    params.set('lessonClassIds', request.lessonClassIds.join(','));
  }
  return `/admin/users/${request.userId}/assign-tokens?${params.toString()}`;
}

type ListTab = 'incomplete' | 'completed';
type IncompleteSubTab = 'ready' | 'insufficient';

function mapClassOptions(data: unknown): ClassOption[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((row: Record<string, unknown>) => ({
      id: String(row.id ?? ''),
      name: String(row.name ?? ''),
      classCode: String(row.program_code ?? row.class_code ?? ''),
      totalLessons: Math.max(1, Number(row.total_lessons ?? row.totalLessons ?? 1) || 1),
      tokenCost: Math.max(1, Number(row.token_cost ?? row.tokenCost ?? 1) || 1),
      isCancelled: row.is_cancelled === 1 || row.is_cancelled === true,
    }))
    .filter((c) => c.id && !c.isCancelled);
}

export default function PendingEnrollmentRequestsPage() {
  const { t, i18n } = useTranslation();
  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

  const [editingRequest, setEditingRequest] = useState<EnrollmentRequest | null>(null);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [editClassId, setEditClassId] = useState('');
  const [editScope, setEditScope] = useState<EnrollmentScope>('single_lesson');
  const [savingEdit, setSavingEdit] = useState(false);
  const [listTab, setListTab] = useState<ListTab>('incomplete');
  const [incompleteSubTab, setIncompleteSubTab] = useState<IncompleteSubTab>('ready');

  const getLocale = () => (i18n.language === 'zh-CN' ? 'zh-CN' : i18n.language === 'zh-TW' ? 'zh-TW' : 'en-US');

  const loadRequests = useCallback(() => {
    setApiError(null);
    setLoading(true);
    loadAdminEnrollmentRequestQueue()
      .then((rows) => setRequests(rows))
      .catch((err) => {
        setApiError(err instanceof Error ? err.message : t('common.error'));
        setRequests([]);
      })
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    const onFocus = () => loadRequests();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadRequests]);

  useEffect(() => {
    if (!editingRequest) return;
    let cancelled = false;
    setLoadingClasses(true);
    setEditClassId(editingRequest.classId);
    setEditScope(editingRequest.enrollmentScope);
    api
      .get<unknown[]>('/admin/classes')
      .then((res) => {
        if (cancelled) return;
        const options = mapClassOptions(res.success && Array.isArray(res.data) ? res.data : []);
        setClassOptions(options);
        if (options.some((c) => c.id === editingRequest.classId)) {
          setEditClassId(editingRequest.classId);
        } else if (options.length > 0) {
          setEditClassId(options[0].id);
        }
      })
      .catch(() => {
        if (!cancelled) setClassOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingClasses(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editingRequest]);

  const selectedClass = useMemo(
    () => classOptions.find((c) => c.id === editClassId) ?? null,
    [classOptions, editClassId],
  );

  const editLessonCount = useMemo(
    () => getLessonsForScope(editScope, selectedClass?.totalLessons),
    [editScope, selectedClass?.totalLessons],
  );

  const editTokensRequired = useMemo(
    () =>
      getEnrollmentTokenCost({
        lessonCount: editLessonCount,
        tokenCostPerLesson: selectedClass?.tokenCost,
      }),
    [editLessonCount, selectedClass?.tokenCost],
  );

  const canEnrollFullCourse = (selectedClass?.totalLessons ?? 1) > 1;

  const incompleteRequests = useMemo(() => requests.filter(isIncompleteTokenAssignment), [requests]);

  const completedRequests = useMemo(() => requests.filter(isCompletedTokenAssignment), [requests]);

  const readyToAssignRequests = useMemo(() => incompleteRequests.filter(isReadyToAssignRequest), [incompleteRequests]);

  const waitingForTokensRequests = useMemo(
    () => incompleteRequests.filter(isWaitingForTokensRequest),
    [incompleteRequests],
  );

  useEffect(() => {
    if (incompleteSubTab === 'insufficient' && waitingForTokensRequests.length === 0) {
      setIncompleteSubTab('ready');
    }
  }, [incompleteSubTab, waitingForTokensRequests.length]);
  async function handleSendInsufficientTokensEmail(request: EnrollmentRequest) {
    if (sendingEmailId) return;
    setSendingEmailId(request.id);
    setActionError(null);
    setSuccessMessage(null);
    try {
      await api.post(`/admin/enrollment-requests/${request.id}/send-insufficient-tokens-email`);
      setSuccessMessage(
        t('admin.enrollmentRequests.insufficientTokensEmailSent', { name: request.studentName || '—' }),
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSendingEmailId(null);
    }
  }

  async function handleReject(request: EnrollmentRequest) {
    if (!rejectReason.trim()) {
      setActionError(t('admin.enrollmentRequests.rejectReasonRequired'));
      return;
    }
    if (!canRejectRequest(request)) {
      setActionError(t('admin.enrollmentRequests.notPendingCannotReject'));
      return;
    }
    setActionError(null);
    try {
      await api.patch(`/admin/enrollment-requests/${encodeURIComponent(request.id)}`, {
        status: 'rejected',
        rejection_reason: rejectReason.trim(),
      });
      setRejectingId(null);
      setRejectReason('');
      loadRequests();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      const currentStatus = extractRejectCurrentStatus(err);
      if (currentStatus && isTerminalRequestStatus(currentStatus)) {
        setRejectingId(null);
        setRejectReason('');
        setRequests((prev) => prev.filter((r) => r.id !== request.id));
        loadRequests();
        setSuccessMessage(t('admin.enrollmentRequests.rejectAlreadyTerminal', { status: currentStatus }));
        return;
      }
      if (/not found/i.test(msg)) {
        setRejectingId(null);
        setRejectReason('');
        loadRequests();
        setActionError(t('admin.enrollmentRequests.rejectNotFoundRefresh'));
      } else {
        setActionError(msg);
      }
    }
  }

  async function handleSaveEdit() {
    if (!editingRequest || !selectedClass || savingEdit) return;
    setSavingEdit(true);
    setActionError(null);
    try {
      if (isTokenReadyRow(editingRequest)) {
        const updated: EnrollmentRequest = {
          ...editingRequest,
          classId: selectedClass.id,
          className: selectedClass.name,
          classCode: selectedClass.classCode || undefined,
          lessonCount: editLessonCount,
          tokensRequired: editTokensRequired,
          enrollmentScope: editScope,
        };
        setRequests((prev) =>
          prev.map((row) => (row.id === editingRequest.id ? updated : row)),
        );
        setEditingRequest(null);
        return;
      }
      await api.patch(`/admin/enrollment-requests/${editingRequest.id}`, {
        class_id: selectedClass.id,
        lesson_count: editLessonCount,
        enrollment_scope: editScope,
        tokens_required: editTokensRequired,
      });
      setEditingRequest(null);
      loadRequests();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSavingEdit(false);
    }
  }

  function scopeLabel(scope: EnrollmentRequest['enrollmentScope'], count: number) {
    return scope === 'full_course'
      ? t('admin.enrollmentRequests.scopeFull', { count })
      : t('admin.enrollmentRequests.scopeSingle');
  }

  function openEdit(request: EnrollmentRequest) {
    setActionError(null);
    setEditingRequest(request);
  }

  function renderInsufficientTokensBadge(required: number, available: number | null) {
    if (available == null || available >= required) return null;
    const shortfall = required - available;
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        {available <= 0
          ? t('admin.enrollmentRequests.insufficientTokensBadge')
          : t('admin.enrollmentRequests.insufficientTokensShortfall', { count: shortfall })}
      </span>
    );
  }

  function renderActionsCell(request: EnrollmentRequest, section: 'unassigned' | 'assigned') {
    const insufficientUnassigned = !hasSufficientUnassigned(request);
    const editLabel = isTokenReadyRow(request)
      ? t('admin.enrollmentRequests.selectClassAction', '選擇課程')
      : t('admin.enrollmentRequests.edit');
    const canAssignNow = Boolean(request.classId) && (request.tokensRequired > 0 || isTokenReadyRow(request));
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => openEdit(request)}
          className="p-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          title={editLabel}
          aria-label={editLabel}
        >
          <Pencil className="h-4 w-4" />
        </button>
        {section === 'unassigned' ? (
          canAssignNow ? (
            <Link
              to={buildAssignTokensUrl(request, 'unassigned')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary-dark"
              title={t('admin.enrollmentRequests.assignUnassignedTokens')}
              aria-label={t('admin.enrollmentRequests.assignUnassignedTokens')}
            >
              <Package className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{t('admin.enrollmentRequests.assignUnassignedTokens')}</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => openEdit(request)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary-dark"
              title={t('admin.enrollmentRequests.selectClassBeforeAssign', '請先選擇課程')}
            >
              <Package className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{t('admin.enrollmentRequests.assignUnassignedTokens')}</span>
            </button>
          )
        ) : (
          <>
            {insufficientUnassigned && (
              <button
                type="button"
                onClick={() => handleSendInsufficientTokensEmail(request)}
                disabled={sendingEmailId === request.id}
                className="p-2 border border-amber-300 text-amber-800 bg-amber-50 rounded-md hover:bg-amber-100 disabled:opacity-50"
                title={t('admin.enrollmentRequests.sendInsufficientTokensEmail')}
                aria-label={t('admin.enrollmentRequests.sendInsufficientTokensEmail')}
              >
                {sendingEmailId === request.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
              </button>
            )}
            <Link
              to={buildAssignTokensUrl(request, 'assigned')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 text-gray-800 bg-white rounded-md hover:bg-gray-50"
              title={t('admin.enrollmentRequests.manageAssignedTokens')}
              aria-label={t('admin.enrollmentRequests.manageAssignedTokens')}
            >
              <Coins className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{t('admin.enrollmentRequests.manageAssignedTokens')}</span>
            </Link>
          </>
        )}
        {canRejectRequest(request) && (
          <button
            type="button"
            onClick={() => {
              setRejectingId(request.id);
              setRejectReason('');
              setActionError(null);
            }}
            className="p-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            title={t('admin.enrollmentRequests.reject')}
            aria-label={t('admin.enrollmentRequests.reject')}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  function requestStatusLabel(request: EnrollmentRequest): string {
    const status = normaliseRequestStatus(request.status);
    if (status === 'fulfilled' || status === 'assigned') {
      return t('admin.enrollmentRequests.statusFulfilled', '已完成');
    }
    if (request.tokensChargedForRequest > 0) {
      return t('admin.enrollmentRequests.statusTokensAssigned', '已扣代幣');
    }
    return status;
  }

  function renderRequestsTable(
    sectionRequests: EnrollmentRequest[],
    section: 'unassigned' | 'assigned',
    options?: { showStatus?: boolean },
  ) {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.enrollmentRequests.student')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.enrollmentRequests.class')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.enrollmentRequests.scope')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.enrollmentRequests.tokensRequired')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.tokenAssignment.unassignedTokens')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.tokenAssignment.assignedTokens')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.enrollmentRequests.submittedAt')}</th>
              {options?.showStatus && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.enrollmentRequests.status', '狀態')}</th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.enrollmentRequests.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sectionRequests.map((request) => (
              <tr key={request.id}>
                <td className="px-4 py-3 text-sm">
                  <p className="font-medium text-gray-900">{request.studentName || '—'}</p>
                  <p className="text-xs text-gray-500">{formatMobileForDisplay(request.userMobile, '—')}</p>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {isClassPendingRow(request) ? (
                    <span className="text-gray-400">—</span>
                  ) : (
                    <>
                      <p>{request.className || '—'}</p>
                      {request.classCode && <p className="text-xs text-primary">{request.classCode}</p>}
                      {request.alreadyEnrolled && (
                        <span className="mt-1 inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-900">
                          {isAwaitingTokenAssignment(request)
                            ? t('admin.enrollmentRequests.alreadyEnrolledBadge')
                            : t('admin.enrollmentRequests.alreadyEnrolled')}
                        </span>
                      )}
                    </>
                  )}
                  {isTokenReadyRow(request) && (
                    <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">
                      {t('admin.enrollmentRequests.tokenReadyBadge', '已購代幣待分配')}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {isClassPendingRow(request) ? '—' : scopeLabel(request.enrollmentScope, request.lessonCount)}
                </td>
                <td className="px-4 py-3 text-sm">
                  {isClassPendingRow(request) ? (
                    <span className="text-gray-400">—</span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900">{request.tokensRequired}</span>
                      {renderInsufficientTokensBadge(request.tokensRequired, request.unassignedTokens)}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`font-semibold ${hasSufficientUnassigned(request) ? 'text-green-700' : 'text-amber-700'}`}>
                    {request.unassignedTokens != null ? request.unassignedTokens : '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {request.assignedTokens != null ? request.assignedTokens : '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {isTokenReadyRow(request)
                    ? '—'
                    : request.createdAt
                      ? formatDateTime(request.createdAt, getLocale())
                      : '—'}
                </td>
                {options?.showStatus && (
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      {requestStatusLabel(request)}
                    </span>
                  </td>
                )}
                <td className="px-4 py-3 text-sm">
                  {options?.showStatus ? (
                    <Link
                      to={`/admin/users/${request.userId}/assign-tokens${request.studentProfileId ? `?profileId=${encodeURIComponent(request.studentProfileId)}` : ''}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {t('admin.enrollmentRequests.viewStudentAssign', '查看學員分配')}
                    </Link>
                  ) : (
                    renderActionsCell(request, section)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList className="h-7 w-7 text-primary" />
              {t('admin.enrollmentRequests.title')}
            </h1>
            <p className="text-sm text-gray-600 mt-1 max-w-3xl">{t('admin.enrollmentRequests.hint')}</p>
          </div>
          <button
            type="button"
            onClick={loadRequests}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            {t('common.refresh', 'Refresh')}
          </button>
        </div>

        {apiError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{apiError}</div>
        )}
        {successMessage && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{successMessage}</div>
        )}
        {actionError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow-md flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600">{t('admin.enrollmentRequests.empty')}</p>
            {apiError ? (
              <p className="text-sm text-red-500 mt-2">{apiError}</p>
            ) : (
              <p className="text-sm text-gray-500 mt-2">{t('admin.enrollmentRequests.apiNotReady')}</p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="flex flex-wrap gap-2 p-4 border-b border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setListTab('incomplete');
                  setIncompleteSubTab('ready');
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  listTab === 'incomplete'
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('admin.enrollmentRequests.tableIncomplete', '未完成代幣分配')}
                <span className="ml-2 opacity-90">({incompleteRequests.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setListTab('completed')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  listTab === 'completed'
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('admin.enrollmentRequests.tableCompleted', '已完成代幣分配')}
                <span className="ml-2 opacity-90">({completedRequests.length})</span>
              </button>
            </div>

            {listTab === 'incomplete' ? (
              incompleteRequests.length === 0 ? (
                <p className="p-8 text-center text-gray-600">{t('admin.enrollmentRequests.emptyIncomplete', '目前沒有待完成的代幣分配。')}</p>
              ) : (
                <div className="p-4 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-gray-500" />
                      <select
                        value={incompleteSubTab}
                        onChange={(e) => setIncompleteSubTab(e.target.value as IncompleteSubTab)}
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary"
                      >
                        <option value="ready">
                          {t('admin.enrollmentRequests.tableUnassignedTokens')} ({readyToAssignRequests.length})
                        </option>
                        <option value="insufficient">
                          {t('admin.enrollmentRequests.tableAssignedTokens')} ({waitingForTokensRequests.length})
                        </option>
                      </select>
                    </div>
                  </div>

                  {incompleteSubTab === 'ready' ? (
                    <div>
                      <p className="text-xs text-gray-500 mb-3">{t('admin.enrollmentRequests.tableUnassignedHint')}</p>
                      {readyToAssignRequests.length === 0 ? (
                        <p className="text-sm text-gray-500 py-4">{t('admin.enrollmentRequests.emptyUnassignedSection')}</p>
                      ) : (
                        renderRequestsTable(readyToAssignRequests, 'unassigned')
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-gray-500 mb-3">{t('admin.enrollmentRequests.tableAssignedHint')}</p>
                      {waitingForTokensRequests.length === 0 ? (
                        <p className="text-sm text-gray-500 py-4">{t('admin.enrollmentRequests.emptyAssignedSection')}</p>
                      ) : (
                        renderRequestsTable(waitingForTokensRequests, 'assigned')
                      )}
                    </div>
                  )}
                </div>
              )
            ) : completedRequests.length === 0 ? (
              <p className="p-8 text-center text-gray-600">{t('admin.enrollmentRequests.emptyCompleted', '尚無已完成的代幣分配紀錄。')}</p>
            ) : (
              renderRequestsTable(completedRequests, 'assigned', { showStatus: true })
            )}
          </div>
        )}
      </div>

      {editingRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {isTokenReadyRow(editingRequest)
                    ? t('admin.enrollmentRequests.selectClassTitle', '選擇課程並分配代幣')
                    : t('admin.enrollmentRequests.editTitle')}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {editingRequest.studentName}
                  {editingRequest.userMobile ? ` · ${formatMobileForDisplay(editingRequest.userMobile, '')}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRequest(null)}
                className="p-1 rounded-md text-gray-500 hover:bg-gray-100"
                aria-label={t('common.close')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingClasses ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="edit-class" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.enrollmentRequests.selectClass')}
                  </label>
                  <select
                    id="edit-class"
                    value={editClassId}
                    onChange={(e) => setEditClassId(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    {classOptions.length === 0 ? (
                      <option value="">{t('admin.enrollmentRequests.noClasses')}</option>
                    ) : (
                      classOptions.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                          {cls.classCode ? ` (${cls.classCode})` : ''}
                          {' · '}
                          {t('admin.enrollmentRequests.totalLessonsShort', { count: cls.totalLessons })}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {selectedClass && (
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium text-gray-700">{t('admin.enrollmentRequests.scope')}</legend>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="edit-enroll-scope"
                        checked={editScope === 'single_lesson'}
                        onChange={() => setEditScope('single_lesson')}
                      />
                      {t('admin.enrollmentRequests.scopeSingle')}
                    </label>
                    {canEnrollFullCourse && (
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="edit-enroll-scope"
                          checked={editScope === 'full_course'}
                          onChange={() => setEditScope('full_course')}
                        />
                        {t('admin.enrollmentRequests.scopeFull', { count: selectedClass.totalLessons })}
                      </label>
                    )}
                  </fieldset>
                )}

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('admin.enrollmentRequests.lessonCount')}</span>
                    <span className="font-semibold text-gray-900">{editLessonCount}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-gray-600">{t('admin.enrollmentRequests.tokensRequired')}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-primary">{editTokensRequired}</span>
                      {renderInsufficientTokensBadge(editTokensRequired, editingRequest?.unassignedTokens ?? null)}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingRequest(null)}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={savingEdit || !selectedClass}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50"
                  >
                    {savingEdit && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t('admin.enrollmentRequests.saveChanges')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {rejectingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">{t('admin.enrollmentRequests.rejectTitle')}</h2>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder={t('admin.enrollmentRequests.rejectReasonPlaceholder')}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setRejectingId(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  const req = requests.find((r) => r.id === rejectingId);
                  if (req) handleReject(req);
                }}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                {t('admin.enrollmentRequests.confirmReject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
