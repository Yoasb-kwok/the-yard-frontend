import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { formatDate, formatDateTimeRange, formatMobileForDisplay } from '../../lib/utils';
import { api, ApiError } from '../../lib/api';
import { postAdminAssignTokensToClass } from '../../lib/adminTokenAssignment';
import { getAdminUserTokenBalance } from '../../lib/adminUserTokens';
import {
  buildEnrollmentConfirmedEmailExtras,
  buildEnrollmentLessonEmailRows,
} from '../../lib/enrollmentConfirmedEmailPayload';
import { useHolidays } from '../../lib/useHolidays';
import { ArrowLeft, Search, Calendar, User, Package, CheckCircle, X, Filter, MapPin } from 'lucide-react';

interface Class {
  id: string;
  name: string;
  class_code: string;
  instructor: string;
  start_time: string;
  end_time: string;
  capacity: number;
  enrolled_count: number;
  is_internal: boolean;
  is_cancelled: boolean;
  location?: 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui';
}

interface Enrollment {
  id: string;
  class_id: string;
  status: 'enrolled' | 'attended' | 'absent' | 'sick_leave';
  created_at: string;
  className: string;
  classCode: string;
  instructor: string;
  start_time: string;
  end_time: string;
  location?: Class['location'];
}

type ListTab = 'unassigned' | 'assigned';

type AssignedClassRow = {
  classId: string;
  classItem: Class | null;
  tokenCount: number;
  enrollmentIds: string[];
  status: Enrollment['status'];
};

interface User {
  id: string;
  full_name: string;
  email: string;
  mobile: string | null;
  remaining_tokens: number;
  assigned_tokens: number;
  purchased_tokens: number;
  expiry_date: string;
}

function mapAdminUserRow(raw: Record<string, unknown>, enrollmentRows?: unknown): User {
  const balance = getAdminUserTokenBalance(raw, enrollmentRows);
  const tokens = Array.isArray(raw.user_tokens) ? raw.user_tokens : [];
  let earliestExpiry = '';
  for (const t of tokens) {
    const row = t as Record<string, unknown>;
    const exp =
      typeof row.expiry_date === 'string'
        ? row.expiry_date.slice(0, 10)
        : typeof row.expires_at === 'string'
          ? row.expires_at.slice(0, 10)
          : '';
    if (exp && (!earliestExpiry || exp < earliestExpiry)) earliestExpiry = exp;
  }
  return {
    id: String(raw.id ?? ''),
    full_name: String(raw.full_name ?? raw.name ?? ''),
    email: String(raw.email ?? '').trim(),
    mobile: raw.mobile != null ? String(raw.mobile) : null,
    remaining_tokens: balance.remaining,
    assigned_tokens: balance.assigned,
    purchased_tokens: balance.purchased,
    expiry_date: earliestExpiry,
  };
}

export default function TokenAssignmentPage() {
  const { t, i18n } = useTranslation();
  const { holidayDatesSet } = useHolidays();
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const prefillHandled = useRef(false);
  const [user, setUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<'all' | 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui'>('all');
  const [confirmModal, setConfirmModal] = useState<null | { type: 'assign'; classId: string; className: string } | { type: 'remove'; enrollmentId: string; classId: string; className: string }>(null);
  const [assignTokenInput, setAssignTokenInput] = useState('1');
  const [assigning, setAssigning] = useState(false);
  const tabFromUrl = searchParams.get('tab') === 'assigned' ? 'assigned' : 'unassigned';
  const [listTab, setListTab] = useState<ListTab>(tabFromUrl);

  useEffect(() => {
    if (userId) {
      void loadData();
    }
  }, [userId]);

  function mapEnrollmentRow(raw: Record<string, unknown>): Enrollment | null {
    const cls = raw.class as Record<string, unknown> | undefined;
    const classId = String(raw.class_id ?? cls?.id ?? '');
    const id = String(raw.id ?? '');
    if (!id || !classId) return null;
    const start = String(cls?.start_time ?? raw.start_time ?? '');
    const end = String(cls?.end_time ?? raw.end_time ?? start);
    return {
      id,
      class_id: classId,
      status: (raw.status as Enrollment['status']) || 'enrolled',
      created_at: String(raw.created_at ?? ''),
      className: String(cls?.name ?? cls?.class_name ?? raw.class_name ?? ''),
      classCode: String(cls?.class_code ?? cls?.program_code ?? raw.program_code ?? ''),
      instructor: String(cls?.instructor ?? ''),
      start_time: start,
      end_time: end,
      location: cls?.location as Enrollment['location'],
    };
  }

  async function loadData() {
    if (!userId) return;
    setLoading(true);
    try {
      const [usersRes, classesRes, enrollRes] = await Promise.all([
        api.get<Record<string, unknown>[]>('/admin/users'),
        api.get<any[]>('/admin/classes'),
        api.get<Record<string, unknown>[]>(`/admin/users/${userId}/class-enrollments`).catch(() => ({
          success: false,
          data: [] as Record<string, unknown>[],
        })),
      ]);

      const users = usersRes.success && Array.isArray(usersRes.data) ? usersRes.data : [];
      const raw = users.find((u) => String(u.id) === String(userId));
      if (!raw) {
        setUser(null);
        setClasses([]);
        setEnrollments([]);
        return;
      }
      const enrollRows = enrollRes.success && Array.isArray(enrollRes.data) ? enrollRes.data : [];
      const mappedEnrollments = enrollRows
        .map((row) => mapEnrollmentRow(row as Record<string, unknown>))
        .filter((e): e is Enrollment => e != null);
      setEnrollments(mappedEnrollments);

      const mappedUser = mapAdminUserRow(raw, enrollRows);
      setUser(mappedUser);

      if (classesRes.success && Array.isArray(classesRes.data)) {
        const mapped: Class[] = classesRes.data.map((cls: any) => ({
          id: String(cls.id),
          name: cls.name || '',
          class_code: cls.program_code || '',
          instructor: cls.instructor || '',
          start_time: cls.start_time,
          end_time: cls.end_time,
          capacity: cls.capacity ?? 0,
          enrolled_count: cls.enrolled_count ?? 0,
          is_internal: cls.is_internal === 1 || cls.is_internal === true,
          is_cancelled: cls.is_cancelled === 1 || cls.is_cancelled === true,
          location: cls.location,
        }));
        setClasses(mapped);
      } else {
        setClasses([]);
      }

    } catch (err) {
      console.error('TokenAssignment loadData:', err);
      setUser(null);
      setClasses([]);
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const tab = searchParams.get('tab') === 'assigned' ? 'assigned' : 'unassigned';
    setListTab(tab);
  }, [searchParams]);

  useEffect(() => {
    if (loading || prefillHandled.current || classes.length === 0) return;
    if (searchParams.get('tab') === 'assigned') return;
    const classId = searchParams.get('classId')?.trim();
    const quantity = searchParams.get('quantity')?.trim();
    if (!classId) return;
    const target = classes.find((c) => c.id === classId);
    if (!target || target.is_cancelled) return;
    prefillHandled.current = true;
    setListTab('unassigned');
    if (quantity && !isNaN(parseInt(quantity, 10)) && parseInt(quantity, 10) >= 1) {
      setAssignTokenInput(String(parseInt(quantity, 10)));
    }
    setConfirmModal({ type: 'assign', classId: target.id, className: target.name });
  }, [loading, classes, searchParams]);

  const getLocale = (): string => {
    const langMap: { [key: string]: string } = {
      'en': 'en-US',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
    };
    return langMap[i18n.language] || i18n.language || 'en-US';
  };

  const getUnassignedTokens = (): number => {
    if (!user) return 0;
    return user.remaining_tokens;
  };

  const isClassAssigned = (classId: string): boolean => {
    return enrollments.some(e => e.class_id === classId);
  };

  const isClassFull = (classItem: Class): boolean => {
    return classItem.enrolled_count >= classItem.capacity;
  };

  const isClassPast = (classItem: Class): boolean => {
    return new Date(classItem.start_time) < new Date();
  };

  const canAssignToClass = (classItem: Class): boolean => {
    const unassignedTokens = getUnassignedTokens();
    return !isClassAssigned(classItem.id) && !isClassFull(classItem) && !isClassPast(classItem) && !classItem.is_cancelled && unassignedTokens > 0;
  };

  async function assignTokenToClass(classId: string, count: number): Promise<boolean> {
    if (!user || !userId || count < 1) return false;

    const available = getUnassignedTokens();
    if (count > available) {
      alert(t('admin.tokenAssignment.assignExceedsTotal', {
        count,
        assigned: user.assigned_tokens,
        total: available,
      }));
      return false;
    }

    const enrollmentRequestId = searchParams.get('requestId')?.trim() || undefined;
    const classItem = classes.find((c) => c.id === classId);
    if (!classItem) {
      alert(t('admin.tokenAssignment.classNotFound'));
      return false;
    }

    const locale = getLocale();
    const lessons = buildEnrollmentLessonEmailRows({
      start_time: classItem.start_time,
      end_time: classItem.end_time,
      lessonCount: count,
      locale,
      holidayDatesSet,
    });

    const branchLabel = classItem.location ? t(`home.locations.${classItem.location}`) : undefined;
    const confirmationEmail =
      user.email &&
      buildEnrollmentConfirmedEmailExtras({
        language: i18n.language || 'zh-TW',
        student_name: user.full_name,
        student_email: user.email,
        class_name: classItem.name,
        class_id: classItem.id,
        lesson_count: count,
        tokens_assigned: count,
        lessons,
        class_code: classItem.class_code || undefined,
        instructor: classItem.instructor || undefined,
        branch: classItem.location,
        branch_label: branchLabel,
        enrollment_scope: count > 1 ? 'full_course' : 'single_lesson',
      });

    setAssigning(true);
    try {
      await postAdminAssignTokensToClass({
        userId,
        classId,
        quantity: count,
        enrollmentRequestId,
        confirmationEmail: confirmationEmail ?? undefined,
      });
      await loadData();
      setListTab('assigned');
      alert(t('admin.tokenAssignment.assignedSuccessfully'));
      return true;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : t('common.error');
      alert(msg);
      return false;
    } finally {
      setAssigning(false);
    }
  }

  async function removeAssignment(_enrollmentId: string, _classId: string) {
    alert(t('admin.tokenAssignment.removeNotAvailable'));
  }

  const handleConfirmModal = async () => {
    if (!confirmModal) return;
    if (confirmModal.type === 'remove') {
      await removeAssignment(confirmModal.enrollmentId, confirmModal.classId);
    }
    setConfirmModal(null);
  };

  const handleAssignConfirm = async () => {
    if (!confirmModal || confirmModal.type !== 'assign') return;
    const n = Math.max(1, parseInt(assignTokenInput, 10) || 1);
    const ok = await assignTokenToClass(confirmModal.classId, n);
    if (ok) setConfirmModal(null);
  };

  const getLocationLabel = (location?: string | typeof locationFilter): string => {
    if (!location || location === 'all') {
      return location === 'all' ? t('admin.classes.allLocations') : '-';
    }
    return t(`home.locations.${location}`);
  };

  const classMatchesFilters = useCallback(
    (classItem: Class): boolean => {
      const locationMatches = locationFilter === 'all' || classItem.location === locationFilter;
      const searchMatches =
        classItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        classItem.class_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        classItem.instructor.toLowerCase().includes(searchTerm.toLowerCase());
      if (!locationMatches || !searchMatches) return false;
      if (monthFilter === 'all') return true;
      const d = new Date(classItem.start_time);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === monthFilter;
    },
    [locationFilter, searchTerm, monthFilter],
  );

  const assignedClassIds = useMemo(
    () => new Set(enrollments.map((e) => e.class_id)),
    [enrollments],
  );

  const filteredClasses = useMemo(
    () => classes.filter(classMatchesFilters),
    [classes, classMatchesFilters],
  );

  const unassignedClasses = useMemo(
    () =>
      filteredClasses
        .filter((c) => !assignedClassIds.has(c.id))
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()),
    [filteredClasses, assignedClassIds],
  );

  const assignedRows = useMemo(() => {
    const byClass = new Map<string, AssignedClassRow>();
    for (const enrollment of enrollments) {
      const classItem = classes.find((c) => c.id === enrollment.class_id) ?? null;
      if (classItem && !classMatchesFilters(classItem)) continue;
      const existing = byClass.get(enrollment.class_id);
      if (existing) {
        existing.tokenCount += 1;
        existing.enrollmentIds.push(enrollment.id);
      } else {
        byClass.set(enrollment.class_id, {
          classId: enrollment.class_id,
          classItem,
          tokenCount: 1,
          enrollmentIds: [enrollment.id],
          status: enrollment.status,
        });
      }
    }
    return Array.from(byClass.values()).sort((a, b) => {
      const ta = a.classItem?.start_time ?? '';
      const tb = b.classItem?.start_time ?? '';
      return new Date(ta).getTime() - new Date(tb).getTime();
    });
  }, [enrollments, classes, classMatchesFilters]);

  const yearMonths = useMemo(() => {
    const set = new Set<string>();
    classes.forEach((c) => {
      const d = new Date(c.start_time);
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    });
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return Array.from(set).sort();
  }, [classes]);

  const formatMonthOption = (key: string) => {
    if (key === 'all') return t('admin.tokenAssignment.allMonths');
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(getLocale(), { month: 'short', year: 'numeric' });
  };

  const getStatusLabel = (status: Enrollment['status']) => t(`admin.attendance.statuses.${status}`);

  const renderUnassignedTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.classes.className')}</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.tokenAssignment.classCode')}</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.tokenAssignment.instructor')}</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.tokenAssignment.time')}</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.tokenAssignment.location')}</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.tokenAssignment.enrolled')}</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.purchaseHistory.actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {unassignedClasses.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                {t('admin.tokenAssignment.noUnassignedClasses')}
              </td>
            </tr>
          ) : (
            unassignedClasses.map((classItem) => {
              const canAssign = canAssignToClass(classItem);
              return (
                <tr key={classItem.id} className={classItem.is_cancelled ? 'opacity-60' : undefined}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    <div className="flex flex-wrap items-center gap-2">
                      {classItem.name}
                      {classItem.is_internal && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded">{t('admin.tokenAssignment.makeupClass')}</span>
                      )}
                      {classItem.is_cancelled && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded">{t('admin.classes.cancelled')}</span>
                      )}
                      {isClassPast(classItem) && (
                        <span className="text-xs text-amber-700">{t('admin.tokenAssignment.classPast')}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-primary">{classItem.class_code || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{classItem.instructor || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {formatDateTimeRange(classItem.start_time, classItem.end_time, getLocale())}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{getLocationLabel(classItem.location)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {classItem.enrolled_count} / {classItem.capacity}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {canAssign ? (
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmModal({ type: 'assign', classId: classItem.id, className: classItem.name });
                          setAssignTokenInput('1');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-primary text-white hover:bg-primary-dark"
                      >
                        <Package className="h-4 w-4" />
                        {t('admin.tokenAssignment.assign')}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-500">
                        {!getUnassignedTokens()
                          ? t('admin.tokenAssignment.noTokensAvailable')
                          : isClassFull(classItem)
                            ? t('admin.tokenAssignment.classFull')
                            : '—'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  const renderAssignedTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.classes.className')}</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.tokenAssignment.classCode')}</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.tokenAssignment.instructor')}</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.tokenAssignment.time')}</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.tokenAssignment.location')}</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.tokenAssignment.tokensAssigned')}</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.attendance.status')}</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.purchaseHistory.actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {assignedRows.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                {t('admin.tokenAssignment.noAssignedClasses')}
              </td>
            </tr>
          ) : (
            assignedRows.map((row) => {
              const c = row.classItem;
              const name = c?.name ?? enrollments.find((e) => e.class_id === row.classId)?.className ?? '—';
              const code = c?.class_code ?? enrollments.find((e) => e.class_id === row.classId)?.classCode ?? '—';
              const instructor = c?.instructor ?? enrollments.find((e) => e.class_id === row.classId)?.instructor ?? '—';
              const start = c?.start_time ?? enrollments.find((e) => e.class_id === row.classId)?.start_time ?? '';
              const end = c?.end_time ?? enrollments.find((e) => e.class_id === row.classId)?.end_time ?? start;
              const loc = c?.location ?? enrollments.find((e) => e.class_id === row.classId)?.location;
              return (
                <tr key={row.classId} className="bg-green-50/40">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      {name}
                      <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-primary">{code}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{instructor}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {start ? formatDateTimeRange(start, end, getLocale()) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{getLocationLabel(loc)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{row.tokenCount}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {getStatusLabel(row.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmModal({
                          type: 'remove',
                          enrollmentId: row.enrollmentIds[0],
                          classId: row.classId,
                          className: name,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200"
                    >
                      <X className="h-4 w-4" />
                      {t('admin.tokenAssignment.remove')}
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/users')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{t('admin.tokenAssignment.title')}</h1>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-center text-gray-600 py-8">{t('admin.tokenAssignment.userNotFound')}</p>
          </div>
        </div>
      </Layout>
    );
  }

  const unassignedTokens = getUnassignedTokens();

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/users')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.tokenAssignment.title')}</h1>
        </div>

        {/* User Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-primary-lighter rounded-full">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{user.full_name}</h2>
              <p className="text-gray-600">{formatMobileForDisplay(user.mobile, '-')}</p>
            </div>
          </div>

          {/* Token Information */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-5 w-5 text-primary" />
                  <span className="font-medium text-gray-900">{t('admin.tokenAssignment.totalTokens')}</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{user.purchased_tokens}</div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="font-medium text-gray-900">{t('admin.tokenAssignment.tokenExpiryDate')}</span>
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatDate(user.expiry_date, getLocale())}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-gray-900">{t('admin.tokenAssignment.unassignedTokens')}</span>
                </div>
                <span className="text-2xl font-bold text-green-600">{unassignedTokens}</span>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                {t('admin.tokenAssignment.assignedTokens')}: {user.assigned_tokens} / {user.purchased_tokens}
              </div>
            </div>
          </div>
        </div>

        {/* Month choice (Jan, Feb...) - above Location Filter */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">{t('admin.tokenAssignment.filterByMonth')}</h3>
          </div>
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium bg-white min-w-[180px]"
          >
            <option value="all">{t('admin.tokenAssignment.allMonths')}</option>
            {yearMonths.map((ym) => (
              <option key={ym} value={ym}>
                {formatMonthOption(ym)}
              </option>
            ))}
          </select>
        </div>

        {/* Location Filter */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3 mb-3">
            <Filter className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">{t('admin.classes.filterByLocation')}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'sanpokong', 'causewaybay', 'fotan', 'sheungshui'] as typeof locationFilter[]).map((loc) => {
              const isActive = locationFilter === loc;
              
              return (
                <button
                  key={loc}
                  onClick={() => setLocationFilter(loc)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {getLocationLabel(loc)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Course List: 已開課 / 未開課 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('admin.tokenAssignment.assignToClasses')}</h2>

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder={t('admin.tokenAssignment.searchClasses')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200 pb-4">
            <button
              type="button"
              onClick={() => setListTab('unassigned')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                listTab === 'unassigned'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('admin.tokenAssignment.tabUnassigned')}
              <span className="ml-2 opacity-90">({unassignedClasses.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setListTab('assigned')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                listTab === 'assigned'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('admin.tokenAssignment.tabAssigned')}
              <span className="ml-2 opacity-90">({assignedRows.length})</span>
            </button>
          </div>

          {listTab === 'unassigned' ? renderUnassignedTable() : renderAssignedTable()}
        </div>
      </div>

      {/* Confirm modal for 分配 / 移除 */}
      {confirmModal && (() => {
        const isAssign = confirmModal.type === 'assign';
        const parsed = parseInt(assignTokenInput, 10);
        const assignValid = isAssign && !isNaN(parsed) && parsed >= 1;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setConfirmModal(null)}>
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${isAssign ? 'bg-primary/20' : 'bg-red-100'}`}>
                  {isAssign ? <Package className="h-5 w-5 text-primary" /> : <X className="h-5 w-5 text-red-600" />}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {isAssign ? t('admin.tokenAssignment.assignTokensModalTitle') : t('admin.tokenAssignment.confirmRemove')}
                </h3>
              </div>
              {isAssign ? (
                <>
                  <p className="text-gray-600 mb-2">{t('admin.tokenAssignment.assignTokensToClass', { className: confirmModal.className })}</p>
                  <div className="mb-6">
                    <label htmlFor="assign-token-count" className="block text-sm font-medium text-gray-700 mb-1">{t('admin.tokenAssignment.tokensToAssign')}</label>
                    <input
                      id="assign-token-count"
                      type="number"
                      min={1}
                      value={assignTokenInput}
                      onChange={(e) => setAssignTokenInput(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </>
              ) : (
                <p className="text-gray-600 mb-6">{t('admin.tokenAssignment.confirmRemoveMessage', { className: confirmModal.className })}</p>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 rounded-md text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
                {isAssign ? (
                  <button
                    onClick={handleAssignConfirm}
                    disabled={!assignValid || assigning}
                    className="px-4 py-2 rounded-md text-sm font-medium text-white bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {assigning ? t('common.loading', 'Loading…') : t('admin.tokenAssignment.assign')}
                  </button>
                ) : (
                  <button
                    onClick={handleConfirmModal}
                    className="px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                  >
                    {t('common.confirm')}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </Layout>
  );
}

