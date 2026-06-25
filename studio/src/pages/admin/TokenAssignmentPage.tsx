import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { formatDate, formatDateTimeRange, formatMobileForDisplay } from '../../lib/utils';
import { api, ApiError } from '../../lib/api';
import {
  postAdminAssignTokensToClass,
  postAdminUnassignTokensFromClass,
  patchFulfillEnrollmentRequest,
  isBenignFulfillEnrollmentError,
  formatAssignTokensApiError,
  readUnassignTokensRefunded,
} from '../../lib/adminTokenAssignment';
import { getAdminUserTokenBalance } from '../../lib/adminUserTokens';
import type { EnrollmentScope } from '../../lib/classEnrollmentTokens';
import {
  buildEnrollmentConfirmedEmailExtras,
  buildEnrollmentLessonEmailRows,
  buildEnrollmentLessonEmailRowsFromClassSchedule,
  type EnrollmentConfirmedEmailExtras,
} from '../../lib/enrollmentConfirmedEmailPayload';
import { useHolidays } from '../../lib/useHolidays';
import { ArrowLeft, Search, Calendar, User, Package, X, Filter } from 'lucide-react';
import TokenAssignmentCourseList from '../../components/admin/TokenAssignmentCourseList';
import {
  buildCourseGroups,
  filterGroupsForTab,
  getCourseGroupKey,
  resolveTokenAssignPlan,
  type TokenAssignmentClassRow,
  type TokenAssignmentCourseGroup,
} from '../../lib/tokenAssignmentGroups';
import {
  extractClassEnrollmentRows,
  mapAdminClassEnrollmentRow,
  mergeClassRowsWithEnrollments,
  normalizeClassId,
  enrollmentIsTokenAssigned,
  enrollmentIsTrialEnrollment,
  pickCanonicalEnrollmentsByClass,
  type AdminClassEnrollmentRow,
} from '../../lib/adminClassEnrollments';
import { withStudentProfileQuery } from '../../lib/studentProfileScope';
import { readProfilesArray } from '../../lib/adminUserFields';
import { parseLessonClassIds } from '../../lib/courseLessonEnrollment';

interface Class extends TokenAssignmentClassRow {}

type Enrollment = AdminClassEnrollmentRow;

type ListTab = 'unassigned' | 'assigned';

type ConfirmModal =
  | { type: 'assign'; classId: string; className: string }
  | { type: 'assignBatch'; className: string; lessonIds: string[]; expectedLessonCount?: number }
  | { type: 'remove'; enrollmentId: string; classId: string; className: string };

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

function mapAdminUserRow(
  raw: Record<string, unknown>,
  enrollmentRows?: unknown,
  studentProfileId?: string | null,
): User {
  const balance = getAdminUserTokenBalance(raw, enrollmentRows, studentProfileId);
  const tokens = Array.isArray(raw.user_tokens) ? raw.user_tokens : [];
  let latestExpiry = '';
  for (const t of tokens) {
    const row = t as Record<string, unknown>;
    const exp =
      typeof row.expiry_date === 'string'
        ? row.expiry_date.slice(0, 10)
        : typeof row.expires_at === 'string'
          ? row.expires_at.slice(0, 10)
          : '';
    if (exp && (!latestExpiry || exp > latestExpiry)) latestExpiry = exp;
  }
  return {
    id: String(raw.id ?? ''),
    full_name: String(raw.full_name ?? raw.name ?? ''),
    email: String(raw.email ?? '').trim(),
    mobile: raw.mobile != null ? String(raw.mobile) : null,
    remaining_tokens: balance.remaining,
    assigned_tokens: balance.assigned,
    purchased_tokens: balance.purchased,
    expiry_date: latestExpiry,
  };
}

export default function TokenAssignmentPage() {
  const { t, i18n } = useTranslation();
  const { holidayDatesSet } = useHolidays();
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const studentProfileId = searchParams.get('profileId')?.trim() || searchParams.get('studentProfileId')?.trim() || '';
  /** Prevents re-opening the same URL prefill; reset when user dismisses the modal. */
  const consumedPrefillKeyRef = useRef<string | null>(null);
  /** Persists ?requestId=&classId=&quantity= after URL is cleared so the modal does not re-open. */
  const enrollmentAssignLinkRef = useRef<{
    requestId?: string;
    classId: string;
    quantity: number;
    lessonCount?: number;
    scope?: EnrollmentScope;
    lessonClassIds?: string[];
  } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<'all' | 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui'>('all');
  const [confirmModal, setConfirmModal] = useState<ConfirmModal | null>(null);
  const [assignTokenInput, setAssignTokenInput] = useState('1');
  const [assigning, setAssigning] = useState(false);
  const [removing, setRemoving] = useState(false);
  const tabFromUrl = searchParams.get('tab') === 'assigned' ? 'assigned' : 'unassigned';
  const [listTab, setListTab] = useState<ListTab>(tabFromUrl);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());
  const [enrollmentsLoadWarning, setEnrollmentsLoadWarning] = useState<string | null>(null);
  const [activeStudentName, setActiveStudentName] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      consumedPrefillKeyRef.current = null;
      enrollmentAssignLinkRef.current = null;
      void loadData();
    }
  }, [userId, studentProfileId]);

  async function loadData() {
    if (!userId) return;
    setLoading(true);
    setEnrollmentsLoadWarning(null);
    try {
      const [usersRes, classesRes, enrollRes] = await Promise.all([
        api.get<Record<string, unknown>[]>('/admin/users'),
        api.get<any[]>('/admin/classes'),
        api
          .get<unknown>(
            `/admin/users/${userId}/class-enrollments`,
            withStudentProfileQuery(undefined, studentProfileId || undefined),
          )
          .catch((err) => ({
          success: false as const,
          data: undefined,
          msg: err instanceof Error ? err.message : String(err),
        })),
      ]);

      const users = usersRes.success && Array.isArray(usersRes.data) ? usersRes.data : [];
      const raw = users.find((u) => normalizeClassId(u.id) === normalizeClassId(userId));
      if (!raw) {
        setUser(null);
        setClasses([]);
        setEnrollments([]);
        return;
      }

      if (enrollRes.success === false) {
        setEnrollmentsLoadWarning(
          enrollRes.msg ||
            t('admin.tokenAssignment.enrollmentsLoadFailed', {
              defaultValue: '無法載入已分配課程記錄，已分配分頁可能不完整。',
            }),
        );
      }

      const enrollRows = extractClassEnrollmentRows(
        enrollRes.success !== false ? (enrollRes.data ?? enrollRes) : [],
      );
      const mappedEnrollments = enrollRows
        .map((row) => mapAdminClassEnrollmentRow(row as Record<string, unknown>))
        .filter((e): e is Enrollment => e != null);
      setEnrollments(mappedEnrollments);

      const profiles = readProfilesArray(raw);
      const profileRow = studentProfileId
        ? profiles.find((p) => normalizeClassId((p as Record<string, unknown>).id) === studentProfileId)
        : undefined;
      setActiveStudentName(
        profileRow
          ? String((profileRow as Record<string, unknown>).full_name ?? (profileRow as Record<string, unknown>).name ?? '')
          : null,
      );
      const mappedUser = mapAdminUserRow(raw, enrollRows, studentProfileId || undefined);
      setUser(mappedUser);

      let mappedClasses: Class[] = [];
      if (classesRes.success && Array.isArray(classesRes.data)) {
        mappedClasses = classesRes.data.map((cls: Record<string, unknown>) => ({
          id: normalizeClassId(cls.id),
          name: String(cls.name ?? ''),
          class_code: String(cls.program_code ?? cls.class_code ?? ''),
          instructor: String(cls.instructor ?? ''),
          start_time: String(cls.start_time ?? ''),
          end_time: String(cls.end_time ?? cls.start_time ?? ''),
          capacity: Number(cls.capacity ?? 0),
          enrolled_count: Number(cls.enrolled_count ?? 0),
          is_internal: cls.is_internal === 1 || cls.is_internal === true,
          is_cancelled: cls.is_cancelled === 1 || cls.is_cancelled === true,
          location: cls.location as Class['location'],
          lesson_number: cls.lesson_number != null ? Number(cls.lesson_number) : null,
          total_lessons: cls.total_lessons != null ? Number(cls.total_lessons) : undefined,
          token_cost: cls.token_cost != null ? Number(cls.token_cost) : 1,
        }));
      }
      setClasses(mergeClassRowsWithEnrollments(mappedClasses, mappedEnrollments));

    } catch (err) {
      console.error('TokenAssignment loadData:', err);
      setUser(null);
      setClasses([]);
      setEnrollments([]);
      setEnrollmentsLoadWarning(
        err instanceof Error ? err.message : t('admin.tokenAssignment.enrollmentsLoadFailed'),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const tab = searchParams.get('tab') === 'assigned' ? 'assigned' : 'unassigned';
    setListTab(tab);
  }, [searchParams]);

  const toggleGroupExpand = useCallback((key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  /** Only link pending enrollment request when assigning the exact class from enrollment queue. */
  const getEnrollmentRequestIdForClass = useCallback(
    (classId: string): string | undefined => {
      const fromRef = enrollmentAssignLinkRef.current;
      if (fromRef?.requestId && String(fromRef.classId) === String(classId)) {
        return fromRef.requestId;
      }
      const requestId = searchParams.get('requestId')?.trim();
      const linkedClassId = searchParams.get('classId')?.trim();
      if (!requestId || !linkedClassId) return undefined;
      if (String(linkedClassId) !== String(classId)) return undefined;
      return requestId;
    },
    [searchParams],
  );

  const clearEnrollmentAssignLinkFromUrl = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    if (
      !next.has('requestId') &&
      !next.has('classId') &&
      !next.has('quantity') &&
      !next.has('lessonCount') &&
      !next.has('scope') &&
      !next.has('lessonClassIds')
    ) {
      return;
    }
    next.delete('requestId');
    next.delete('classId');
    next.delete('quantity');
    next.delete('lessonCount');
    next.delete('scope');
    next.delete('lessonClassIds');
    navigate(
      { pathname: `/admin/users/${userId}/assign-tokens`, search: next.toString() },
      { replace: true },
    );
  }, [navigate, searchParams, userId]);

  const consumeEnrollmentRequestLink = useCallback(() => {
    if (enrollmentAssignLinkRef.current) {
      enrollmentAssignLinkRef.current = {
        ...enrollmentAssignLinkRef.current,
        requestId: undefined,
      };
    }
    clearEnrollmentAssignLinkFromUrl();
  }, [clearEnrollmentAssignLinkFromUrl]);

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

  const getClassTokenCost = useCallback(
    (classId: string): number => {
      const row = classes.find((c) => c.id === classId);
      return Math.max(1, Number(row?.token_cost) || 1);
    },
    [classes],
  );

  const sumTokensForLessonIds = useCallback(
    (lessonIds: string[]): number =>
      lessonIds.reduce((sum, id) => sum + getClassTokenCost(id), 0),
    [getClassTokenCost],
  );

  const applyLocalAssignmentDelta = useCallback(
    (classId: string, tokensCharged: number) => {
      setUser((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          remaining_tokens: Math.max(0, prev.remaining_tokens - tokensCharged),
          assigned_tokens: prev.assigned_tokens + tokensCharged,
        };
      });
      setEnrollments((prev) => {
        const existing = prev.find((e) => e.class_id === classId);
        if (existing) {
          return prev.map((e) =>
            e.class_id === classId ? { ...e, tokens_charged: tokensCharged } : e,
          );
        }
        const classItem = classes.find((c) => c.id === classId);
        if (!classItem) return prev;
        return [
          ...prev,
          {
            id: `local-${classId}`,
            class_id: classId,
            status: 'enrolled' as const,
            tokens_charged: tokensCharged,
            created_at: new Date().toISOString(),
            className: classItem.name,
            classCode: classItem.class_code,
            instructor: classItem.instructor,
            start_time: classItem.start_time,
            end_time: classItem.end_time,
            location: classItem.location,
          },
        ];
      });
    },
    [classes],
  );

  const applyLocalUnassignmentDelta = useCallback((classId: string, tokensRefunded: number) => {
    const key = normalizeClassId(classId);
    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        remaining_tokens: prev.remaining_tokens + tokensRefunded,
        assigned_tokens: Math.max(0, prev.assigned_tokens - tokensRefunded),
      };
    });
    setEnrollments((prev) => prev.filter((e) => normalizeClassId(e.class_id) !== key));
  }, []);

  const canonicalEnrollmentsByClass = useMemo(
    () => pickCanonicalEnrollmentsByClass(enrollments),
    [enrollments],
  );

  const canonicalEnrollments = useMemo(
    () => Array.from(canonicalEnrollmentsByClass.values()),
    [canonicalEnrollmentsByClass],
  );

  const isClassTokensAssigned = (classId: string): boolean => {
    const enrollment = canonicalEnrollmentsByClass.get(normalizeClassId(classId));
    return enrollment != null && enrollmentIsTokenAssigned(enrollment);
  };

  const isClassTrialEnrolled = (classId: string): boolean => {
    const enrollment = canonicalEnrollmentsByClass.get(normalizeClassId(classId));
    return enrollment != null && enrollmentIsTrialEnrollment(enrollment);
  };

  const hasEnrollmentAwaitingTokens = (classId: string): boolean => {
    const key = normalizeClassId(classId);
    const enrollment = canonicalEnrollmentsByClass.get(key);
    if (!enrollment || enrollmentIsTokenAssigned(enrollment) || enrollmentIsTrialEnrollment(enrollment)) {
      return false;
    }
    return String(enrollment.status).toLowerCase() !== 'cancelled';
  };

  const isClassFull = (classItem: Class): boolean => {
    return classItem.enrolled_count >= classItem.capacity;
  };

  const isClassPast = (classItem: Class): boolean => {
    return new Date(classItem.start_time) < new Date();
  };

  const isClassIdPast = useCallback(
    (classId: string): boolean => {
      const row = classes.find((c) => c.id === classId);
      return row ? isClassPast(row) : false;
    },
    [classes],
  );

  /** Future lessons first so partial batch succeeds for upcoming dates before past-lesson API errors. */
  const sortLessonIdsForBatch = useCallback(
    (ids: string[]): string[] => {
      return [...ids].sort((a, b) => {
        const ca = classes.find((c) => c.id === a);
        const cb = classes.find((c) => c.id === b);
        const pa = ca && isClassPast(ca) ? 1 : 0;
        const pb = cb && isClassPast(cb) ? 1 : 0;
        if (pa !== pb) return pa - pb;
        return (
          (Number(ca?.lesson_number) || 0) - (Number(cb?.lesson_number) || 0) ||
          new Date(ca?.start_time ?? 0).getTime() - new Date(cb?.start_time ?? 0).getTime()
        );
      });
    },
    [classes],
  );

  const formatAssignError = useCallback(
    (err: unknown): string => {
      if (err instanceof ApiError && err.code === 'CLASS_PAST') {
        return t('admin.tokenAssignment.errorClassPast');
      }
      let msg = formatAssignTokensApiError(err);
      if (/CLASS_PAST/i.test(msg)) {
        return t('admin.tokenAssignment.errorClassPast');
      }
      return msg;
    },
    [t],
  );

  const canAssignToClass = (classItem: Class): boolean => {
    const unassignedTokens = getUnassignedTokens();
    if (isClassTokensAssigned(classItem.id) || isClassTrialEnrolled(classItem.id)) return false;
    if (isClassFull(classItem) || isClassPast(classItem) || classItem.is_cancelled || unassignedTokens <= 0) {
      return false;
    }
    return true;
  };

  const canAssignFullCourseBatch = (classItem: Class): boolean => {
    if (isClassTokensAssigned(classItem.id) || isClassTrialEnrolled(classItem.id)) return false;
    if (classItem.is_cancelled || isClassPast(classItem) || isClassFull(classItem)) return false;
    return getUnassignedTokens() > 0;
  };

  const getRequestLessonClassIds = useCallback((): string[] => {
    const fromRef = enrollmentAssignLinkRef.current?.lessonClassIds;
    if (fromRef?.length) return fromRef;
    return parseLessonClassIds(searchParams.get('lessonClassIds'));
  }, [searchParams]);

  const getAssignLinkContext = useCallback((): {
    enrollmentScope?: EnrollmentScope;
    expectedLessonCount?: number;
    lessonClassIds?: string[];
  } => {
    const link = enrollmentAssignLinkRef.current;
    if (link?.scope || link?.lessonCount || link?.lessonClassIds?.length) {
      return {
        enrollmentScope: link.scope,
        expectedLessonCount: link.lessonCount,
        lessonClassIds: link.lessonClassIds,
      };
    }
    const scopeRaw = searchParams.get('scope')?.trim();
    const lessonRaw = searchParams.get('lessonCount')?.trim();
    const lessonCount = lessonRaw && !isNaN(parseInt(lessonRaw, 10)) ? parseInt(lessonRaw, 10) : undefined;
    const enrollmentScope =
      scopeRaw === 'full_course' ? 'full_course' : scopeRaw === 'single_lesson' ? 'single_lesson' : undefined;
    const lessonClassIds = parseLessonClassIds(searchParams.get('lessonClassIds'));
    return { enrollmentScope, expectedLessonCount: lessonCount, lessonClassIds };
  }, [searchParams]);

  const buildTokenAssignPlan = useCallback(
    (
      classId: string,
      tokenCount: number,
      overrides?: {
        enrollmentScope?: EnrollmentScope;
        expectedLessonCount?: number;
        preferredLinkClassId?: string;
      },
    ) => {
      const ctx = getAssignLinkContext();
      return resolveTokenAssignPlan({
        classId,
        tokenCount,
        classes,
        canAssign: canAssignToClass,
        canAssignFullCourse: canAssignFullCourseBatch,
        enrollmentScope: overrides?.enrollmentScope ?? ctx.enrollmentScope,
        expectedLessonCount: overrides?.expectedLessonCount ?? ctx.expectedLessonCount,
        preferredLinkClassId:
          overrides?.preferredLinkClassId ??
          enrollmentAssignLinkRef.current?.classId ??
          classId,
        requestLessonClassIds: ctx.lessonClassIds?.length ? ctx.lessonClassIds : getRequestLessonClassIds(),
      });
    },
    [classes, getAssignLinkContext, getRequestLessonClassIds, enrollments, user],
  );

  const dismissConfirmModal = useCallback(() => {
    consumedPrefillKeyRef.current = null;
    setConfirmModal(null);
  }, []);

  useEffect(() => {
    if (loading || classes.length === 0) return;
    if (searchParams.get('tab') === 'assigned') return;
    const classId = searchParams.get('classId')?.trim();
    const quantity = searchParams.get('quantity')?.trim();
    const lessonCountRaw = searchParams.get('lessonCount')?.trim();
    const scopeRaw = searchParams.get('scope')?.trim();
    if (!classId) return;
    const lessonClassIdsRaw = searchParams.get('lessonClassIds')?.trim() ?? '';
    const prefillKey = `${classId}|${searchParams.get('requestId')?.trim() ?? ''}|${quantity ?? ''}|${lessonCountRaw ?? ''}|${scopeRaw ?? ''}|${lessonClassIdsRaw}`;
    if (consumedPrefillKeyRef.current === prefillKey) return;
    const target = classes.find((c) => c.id === classId);
    if (!target || target.is_cancelled) {
      consumedPrefillKeyRef.current = prefillKey;
      clearEnrollmentAssignLinkFromUrl();
      return;
    }
    consumedPrefillKeyRef.current = prefillKey;
    const lessonCount =
      lessonCountRaw && !isNaN(parseInt(lessonCountRaw, 10)) ? parseInt(lessonCountRaw, 10) : undefined;
    const scope: EnrollmentScope | undefined =
      scopeRaw === 'full_course' ? 'full_course' : scopeRaw === 'single_lesson' ? 'single_lesson' : undefined;
    const quantityN = quantity && !isNaN(parseInt(quantity, 10)) ? parseInt(quantity, 10) : 1;
    const tokenCount =
      scope === 'full_course' && lessonCount != null ? Math.max(quantityN, lessonCount) : quantityN;
    const requestId = searchParams.get('requestId')?.trim() || undefined;
    const lessonClassIds = parseLessonClassIds(lessonClassIdsRaw);
    enrollmentAssignLinkRef.current = {
      requestId,
      classId,
      quantity: tokenCount,
      lessonCount,
      scope,
      lessonClassIds: lessonClassIds.length > 0 ? lessonClassIds : undefined,
    };
    clearEnrollmentAssignLinkFromUrl();
    setListTab('unassigned');
    setExpandedGroups((prev) => new Set(prev).add(getCourseGroupKey(target)));
    const plan = buildTokenAssignPlan(target.id, tokenCount);
    if (plan.mode === 'batch') {
      setAssignTokenInput(String(plan.lessonIds.length * plan.tokensPerLesson));
      setConfirmModal({
        type: 'assignBatch',
        className: plan.courseName,
        lessonIds: plan.lessonIds,
        expectedLessonCount: plan.expectedLessonCount,
      });
      return;
    }
    setAssignTokenInput(String(plan.quantity));
    setConfirmModal({ type: 'assign', classId: target.id, className: target.name });
  }, [loading, classes, searchParams, clearEnrollmentAssignLinkFromUrl, buildTokenAssignPlan]);

  const resolveEnrollmentRequestIdForAssign = useCallback(
    (classId: string, assignQuantity: number): string | undefined => {
      const candidate = getEnrollmentRequestIdForClass(classId);
      if (!candidate) return undefined;
      const link = enrollmentAssignLinkRef.current;
      const tokensRequired = link?.quantity ?? link?.lessonCount;
      // Backend TOKEN_MISMATCH: with enrollment_request_id, quantity must equal tokens_required.
      // Full-course uses per-lesson quantity=1 batch + separate fulfill PATCH.
      if (tokensRequired != null && tokensRequired > 1 && assignQuantity !== tokensRequired) {
        return undefined;
      }
      return candidate;
    },
    [getEnrollmentRequestIdForClass],
  );

  async function assignTokenToClass(
    classId: string,
    count: number,
    options?: {
      skipReload?: boolean;
      skipSuccessAlert?: boolean;
      skipAssigningState?: boolean;
      /** Batch / other lessons in same course must not reuse ?requestId= from URL */
      skipEnrollmentRequest?: boolean;
      /** Batch middle calls should not trigger confirmation email per lesson. */
      skipConfirmationEmail?: boolean;
      confirmationEmailOverride?: EnrollmentConfirmedEmailExtras;
      enrollmentScope?: 'single_lesson' | 'full_course';
      allowPastLessons?: boolean;
      lessonClassIds?: string[];
    },
  ): Promise<{ ok: boolean; error?: string }> {
    if (!user || !userId || count < 1) return { ok: false, error: t('common.error') };

    const available = getUnassignedTokens();
    if (count > available) {
      const msg = t('admin.tokenAssignment.assignExceedsTotal', {
        count,
        assigned: user.assigned_tokens,
        remaining: available,
      });
      if (!options?.skipSuccessAlert) alert(msg);
      return { ok: false, error: msg };
    }

    const enrollmentRequestId = options?.skipEnrollmentRequest
      ? undefined
      : resolveEnrollmentRequestIdForAssign(classId, count);
    const classItem = classes.find((c) => c.id === classId);
    if (!classItem) {
      const msg = t('admin.tokenAssignment.classNotFound');
      if (!options?.skipSuccessAlert) alert(msg);
      return { ok: false, error: msg };
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
      options?.confirmationEmailOverride ??
      (!options?.skipConfirmationEmail &&
        user.email &&
        buildEnrollmentConfirmedEmailExtras({
          language: i18n.language || 'zh-TW',
          student_name: activeStudentName || user.full_name,
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
        }));

    if (!options?.skipAssigningState) setAssigning(true);
    try {
      await postAdminAssignTokensToClass({
        userId,
        classId,
        quantity: count,
        studentProfileId: studentProfileId || undefined,
        enrollmentRequestId,
        confirmationEmail: confirmationEmail ?? undefined,
        enrollmentScope: options?.enrollmentScope,
        allowPastLessons: options?.allowPastLessons,
        lessonClassIds: options?.lessonClassIds,
      });
      if (enrollmentRequestId) {
        consumeEnrollmentRequestLink();
      }
      applyLocalAssignmentDelta(classId, count);
      if (!options?.skipReload) {
        await loadData();
      }
      if (!options?.skipSuccessAlert) {
        alert(t('admin.tokenAssignment.assignedSuccessfully'));
      }
      return { ok: true };
    } catch (err) {
      let msg = formatAssignError(err);
      if (/already enrolled/i.test(msg) && hasEnrollmentAwaitingTokens(classId)) {
        msg = t('admin.tokenAssignment.assignTokensToExistingEnrollment');
      }
      if (!options?.skipSuccessAlert) alert(msg);
      return { ok: false, error: msg };
    } finally {
      if (!options?.skipAssigningState) setAssigning(false);
    }
  }

  const formatUnassignError = useCallback(
    (err: unknown): string => {
      if (err instanceof ApiError) {
        if (err.code === 'ENROLLMENT_NOT_FOUND') {
          return t('admin.tokenAssignment.errorEnrollmentNotFound');
        }
        if (err.code === 'NOT_TOKEN_ASSIGNED') {
          return t('admin.tokenAssignment.errorNotTokenAssigned');
        }
        if (err.code === 'CANNOT_UNASSIGN_ATTENDED' || err.code === 'ALREADY_ATTENDED') {
          return t('admin.tokenAssignment.errorCannotUnassignAttended');
        }
      }
      return formatAssignTokensApiError(err);
    },
    [t],
  );

  async function removeAssignment(enrollmentId: string, classId: string): Promise<boolean> {
    if (!user || !userId) return false;

    const key = normalizeClassId(classId);
    const enrollment =
      enrollments.find((e) => e.id === enrollmentId) ??
      enrollments.find((e) => normalizeClassId(e.class_id) === key);
    if (!enrollment || !enrollmentIsTokenAssigned(enrollment)) {
      alert(t('admin.tokenAssignment.errorNotTokenAssigned'));
      return false;
    }

    const fallbackRefund = Math.max(1, enrollment.tokens_charged || getClassTokenCost(classId));
    const classItem = classes.find((c) => normalizeClassId(c.id) === key);
    const remarks = classItem
      ? t('admin.tokenAssignment.removeRemarksDefault', {
          className: classItem.name,
          defaultValue: 'Admin removed token assignment: {{className}}',
        })
      : undefined;

    setRemoving(true);
    try {
      const data = await postAdminUnassignTokensFromClass({
        enrollmentId: enrollment.id,
        userId,
        classId,
        studentProfileId: studentProfileId || undefined,
        remarks,
      });
      const refunded = readUnassignTokensRefunded(data) || fallbackRefund;
      applyLocalUnassignmentDelta(classId, refunded);
      await loadData();
      alert(
        t('admin.tokenAssignment.removeSuccess', {
          count: refunded,
          defaultValue: '已移除分配，{{count}} 個代幣已退回未分配餘額。',
        }),
      );
      return true;
    } catch (err) {
      alert(formatUnassignError(err));
      return false;
    } finally {
      setRemoving(false);
    }
  }

  const handleConfirmModal = async () => {
    if (!confirmModal || confirmModal.type !== 'remove') return;
    const ok = await removeAssignment(confirmModal.enrollmentId, confirmModal.classId);
    if (ok) setConfirmModal(null);
  };

  /** Mark request fulfilled when every lesson in *this batch* (idsToAssign) succeeded — not original request lessonCount (may include skipped in-progress lessons). */
  async function fulfillEnrollmentRequestIfNeeded(
    pendingRequestId: string | undefined,
    lessonsInBatch: number,
    assignedCount: number,
    options?: { assignIncludedRequestId?: boolean },
  ): Promise<void> {
    if (!pendingRequestId) return;
    const target = Math.max(1, lessonsInBatch);
    if (assignedCount < target) return;
    if (options?.assignIncludedRequestId) {
      consumeEnrollmentRequestLink();
      return;
    }
    try {
      await patchFulfillEnrollmentRequest(pendingRequestId);
      consumeEnrollmentRequestLink();
    } catch (err) {
      if (isBenignFulfillEnrollmentError(err)) {
        consumeEnrollmentRequestLink();
        return;
      }
      alert(
        t('admin.tokenAssignment.fulfillRequestFailed', {
          error: formatAssignTokensApiError(err),
          defaultValue: '代幣已分配，但標記報名申請完成失敗：{{error}}',
        }),
      );
    }
  }

  async function assignBatchLessons(
    lessonIds: string[],
    courseName: string,
    _tokensPerLesson = 1,
  ): Promise<boolean> {
    if (!user || !userId || lessonIds.length === 0) return false;

    const idsToAssign = sortLessonIdsForBatch(lessonIds.filter((id) => !isClassTokensAssigned(id)));
    const pastLessonCount = idsToAssign.filter((id) => isClassIdPast(id)).length;
    const batchAssignOpts = {
      enrollmentScope: 'full_course' as const,
      allowPastLessons: true,
      lessonClassIds: idsToAssign,
    };
    if (idsToAssign.length === 0) {
      alert(t('admin.tokenAssignment.assignedBatchSuccess', { count: 0, courseName }));
      return true;
    }

    const totalTokensNeeded = sumTokensForLessonIds(idsToAssign);
    const available = getUnassignedTokens();
    if (totalTokensNeeded > available) {
      alert(
        t('admin.tokenAssignment.assignExceedsTotal', {
          count: totalTokensNeeded,
          assigned: user.assigned_tokens,
          remaining: available,
        }),
      );
      return false;
    }

    setAssigning(true);
    const link = enrollmentAssignLinkRef.current;
    const pendingRequestId = link?.requestId;
    const tokensRequired = link?.quantity;
    let firstError: string | null = null;

    try {
      const tryBulkAssign = async (anchorId: string, includeRequestId: boolean): Promise<boolean> => {
        const anchor = classes.find((c) => c.id === anchorId);
        const scheduled = idsToAssign
          .map((id) => classes.find((c) => c.id === id))
          .filter((c): c is Class => c != null)
          .sort(
            (a, b) =>
              (Number(a.lesson_number) || 0) - (Number(b.lesson_number) || 0) ||
              new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
          );
        const locale = getLocale();
        const branchLabel = anchor?.location ? t(`home.locations.${anchor.location}`) : undefined;
        const confirmationEmailOverride =
          user.email && anchor
            ? buildEnrollmentConfirmedEmailExtras({
                language: i18n.language || 'zh-TW',
                student_name: activeStudentName || user.full_name,
                student_email: user.email,
                class_name: anchor.name,
                class_id: anchor.id,
                lesson_count: scheduled.length,
                tokens_assigned: totalTokensNeeded,
                lessons: buildEnrollmentLessonEmailRowsFromClassSchedule(scheduled, locale),
                class_code: anchor.class_code || undefined,
                instructor: anchor.instructor || undefined,
                branch: anchor.location,
                branch_label: branchLabel,
                enrollment_scope: 'full_course',
              })
            : undefined;

        const bulk = await assignTokenToClass(anchorId, totalTokensNeeded, {
          skipReload: true,
          skipSuccessAlert: true,
          skipAssigningState: true,
          skipEnrollmentRequest: !includeRequestId,
          skipConfirmationEmail: !confirmationEmailOverride,
          confirmationEmailOverride: confirmationEmailOverride ?? undefined,
          ...batchAssignOpts,
        });
        if (bulk.ok) {
          await loadData();
          await fulfillEnrollmentRequestIfNeeded(pendingRequestId, idsToAssign.length, idsToAssign.length, {
            assignIncludedRequestId: includeRequestId,
          });
          alert(
            t('admin.tokenAssignment.assignedBatchSuccess', {
              count: scheduled.length,
              courseName,
            }),
          );
          return true;
        }
        firstError = bulk.error ?? null;
        return false;
      };

      // Full-course: prefer one API call (backend enrolls all lesson rows).
      if (idsToAssign.length > 1 && totalTokensNeeded <= available) {
        const anchorId =
          link?.classId && idsToAssign.includes(link.classId) ? link.classId : idsToAssign[0];
        const useRequestId = Boolean(
          pendingRequestId &&
            tokensRequired != null &&
            tokensRequired > 1 &&
            tokensRequired === totalTokensNeeded,
        );
        if (await tryBulkAssign(anchorId, useRequestId)) {
          return true;
        }
      }

      // Per-lesson fallback when bulk assign is not supported by backend.
      const scheduledLessons = idsToAssign
        .map((id) => classes.find((c) => c.id === id))
        .filter((c): c is Class => c != null);
      const anchor = scheduledLessons[0];
      const locale = getLocale();
      const batchEmailOverride =
        user.email && anchor
          ? buildEnrollmentConfirmedEmailExtras({
              language: i18n.language || 'zh-TW',
              student_name: activeStudentName || user.full_name,
              student_email: user.email,
              class_name: anchor.name,
              class_id: anchor.id,
              lesson_count: scheduledLessons.length,
              tokens_assigned: totalTokensNeeded,
              lessons: buildEnrollmentLessonEmailRowsFromClassSchedule(scheduledLessons, locale),
              class_code: anchor.class_code || undefined,
              instructor: anchor.instructor || undefined,
              branch: anchor.location,
              branch_label: anchor.location ? t(`home.locations.${anchor.location}`) : undefined,
              enrollment_scope: 'full_course',
            })
          : undefined;

      let done = 0;
      for (let i = 0; i < idsToAssign.length; i++) {
        const classId = idsToAssign[i];
        if (isClassTokensAssigned(classId)) {
          done += 1;
          continue;
        }
        const cost = getClassTokenCost(classId);
        if (cost > getUnassignedTokens()) {
          if (!firstError) {
            firstError = t('admin.tokenAssignment.assignExceedsTotal', {
              count: cost,
              assigned: user.assigned_tokens,
              remaining: getUnassignedTokens(),
            });
          }
          continue;
        }
        const isLast = i === idsToAssign.length - 1;
        const result = await assignTokenToClass(classId, cost, {
          skipReload: true,
          skipSuccessAlert: true,
          skipAssigningState: true,
          skipEnrollmentRequest: true,
          skipConfirmationEmail: !(isLast && batchEmailOverride),
          confirmationEmailOverride: isLast ? batchEmailOverride ?? undefined : undefined,
          ...batchAssignOpts,
        });
        if (!result.ok) {
          if (!firstError) firstError = result.error ?? t('admin.tokenAssignment.assignBatchFailed');
          continue;
        }
        done += 1;
      }

      await loadData();

      if (done === idsToAssign.length) {
        await fulfillEnrollmentRequestIfNeeded(pendingRequestId, idsToAssign.length, done);
        alert(t('admin.tokenAssignment.assignedBatchSuccess', { count: done, courseName }));
        return true;
      }

      if (done > 0) {
        const reason =
          firstError?.trim() ||
          (pastLessonCount > 0
            ? t('admin.tokenAssignment.assignedBatchPartialPastHint', { count: pastLessonCount })
            : t('admin.tokenAssignment.assignedBatchPartialHint'));
        alert(
          t('admin.tokenAssignment.assignedBatchPartial', {
            done,
            total: idsToAssign.length,
            reason,
          }),
        );
      } else {
        alert(firstError ?? t('admin.tokenAssignment.assignBatchFailed'));
      }
      return done > 0;
    } finally {
      setAssigning(false);
    }
  }

  const handleAssignConfirm = async () => {
    if (!confirmModal) return;
    if (confirmModal.type === 'assignBatch') {
      const firstLesson = classes.find((c) => c.id === confirmModal.lessonIds[0]);
      const tokensPerLesson = Math.max(1, Number(firstLesson?.token_cost) || 1);
      const result = await assignBatchLessons(
        confirmModal.lessonIds,
        confirmModal.className,
        tokensPerLesson,
      );
      if (result) dismissConfirmModal();
      return;
    }
    if (confirmModal.type !== 'assign') return;
    const n = Math.max(1, parseInt(assignTokenInput, 10) || 1);
    const plan = buildTokenAssignPlan(confirmModal.classId, n);
    if (plan.mode === 'batch') {
      const result = await assignBatchLessons(plan.lessonIds, plan.courseName, plan.tokensPerLesson);
      if (result) dismissConfirmModal();
      return;
    }
    const result = await assignTokenToClass(plan.classId, plan.quantity);
    if (result.ok) dismissConfirmModal();
  };

  const getLocationLabel = (location?: string | typeof locationFilter): string => {
    if (!location || location === 'all') {
      return location === 'all' ? t('admin.classes.allLocations') : '-';
    }
    return t(`home.locations.${location}`);
  };

  const classMatchesFilters = useCallback(
    (classItem: Class, options?: { skipMonth?: boolean }): boolean => {
      const locationMatches = locationFilter === 'all' || classItem.location === locationFilter;
      const searchMatches =
        classItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        classItem.class_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        classItem.instructor.toLowerCase().includes(searchTerm.toLowerCase());
      if (!locationMatches || !searchMatches) return false;
      if (options?.skipMonth || monthFilter === 'all') return true;
      const d = new Date(classItem.start_time);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === monthFilter;
    },
    [locationFilter, searchTerm, monthFilter],
  );

  const assignedClassIds = useMemo(
    () =>
      new Set(
        canonicalEnrollments
          .filter(enrollmentIsTokenAssigned)
          .map((e) => normalizeClassId(e.class_id))
          .filter(Boolean),
      ),
    [canonicalEnrollments],
  );

  const enrollmentIdByClassId = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of canonicalEnrollments) {
      if (!enrollmentIsTokenAssigned(e)) continue;
      m.set(normalizeClassId(e.class_id), e.id);
    }
    return m;
  }, [canonicalEnrollments]);

  const tokensChargedByClassId = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of canonicalEnrollments) {
      if (!enrollmentIsTokenAssigned(e)) continue;
      m.set(normalizeClassId(e.class_id), e.tokens_charged);
    }
    return m;
  }, [canonicalEnrollments]);

  const enrollmentStatusByClassId = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of canonicalEnrollments) {
      m.set(normalizeClassId(e.class_id), e.status);
    }
    return m;
  }, [canonicalEnrollments]);

  const enrollmentByClassId = useMemo(() => {
    const m = new Map<string, { class_id: string; tokens_charged: number; status: string }>();
    for (const e of canonicalEnrollments) {
      if (!enrollmentIsTokenAssigned(e)) continue;
      const key = normalizeClassId(e.class_id);
      m.set(key, {
        class_id: key,
        tokens_charged: e.tokens_charged,
        status: e.status,
      });
    }
    return m;
  }, [canonicalEnrollments]);

  const filteredClasses = useMemo(() => {
    const skipMonth = listTab === 'assigned';
    const filtered = classes.filter((c) => classMatchesFilters(c, { skipMonth }));
    if (listTab !== 'assigned') return filtered;
    return mergeClassRowsWithEnrollments(filtered, canonicalEnrollments, { onlyWithTokens: true });
  }, [classes, classMatchesFilters, listTab, canonicalEnrollments]);

  const allCourseGroups = useMemo(
    () => buildCourseGroups(filteredClasses, assignedClassIds, enrollmentByClassId),
    [filteredClasses, assignedClassIds, enrollmentByClassId],
  );

  const unassignedGroups = useMemo(
    () => filterGroupsForTab(allCourseGroups, 'unassigned'),
    [allCourseGroups],
  );

  const assignedGroups = useMemo(
    () => filterGroupsForTab(allCourseGroups, 'assigned'),
    [allCourseGroups],
  );

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

  const getStatusLabel = (status: string) => {
    const key = `admin.attendance.statuses.${status}`;
    const translated = t(key);
    if (translated !== key) return translated;
    if (status === 'cancelled') return t('admin.tokenAssignment.lessonStatusCancelled');
    return status;
  };

  const openAssignLesson = (classItem: Class) => {
    setConfirmModal({ type: 'assign', classId: classItem.id, className: classItem.name });
    setAssignTokenInput('1');
  };

  const openAssignGroup = (group: TokenAssignmentCourseGroup, lessonIds: string[]) => {
    const assignableIds =
      lessonIds.length > 0
        ? lessonIds
        : group.lessons.filter((l) => canAssignFullCourseBatch(l)).map((l) => l.id);
    const anchor = group.lessons.find((l) => l.id === assignableIds[0]);
    if (!anchor) return;
    const tokensPerLesson = Math.max(1, Number(anchor.token_cost) || 1);
    const lessonCount = assignableIds.length;
    const tokenCount = lessonCount * tokensPerLesson;
    const plan = buildTokenAssignPlan(anchor.id, tokenCount, {
      enrollmentScope: 'full_course',
      expectedLessonCount: lessonCount,
      preferredLinkClassId: anchor.id,
    });
    if (plan.mode === 'batch') {
      setConfirmModal({
        type: 'assignBatch',
        className: plan.courseName,
        lessonIds: plan.lessonIds,
        expectedLessonCount: plan.expectedLessonCount ?? group.totalLessons,
      });
      return;
    }
    setConfirmModal({
      type: 'assignBatch',
      className: group.displayName,
      lessonIds: group.lessons.filter((l) => canAssignFullCourseBatch(l)).map((l) => l.id),
      expectedLessonCount: group.totalLessons,
    });
  };

  const trialEnrolledClassIds = useMemo(
    () =>
      new Set(
        canonicalEnrollments
          .filter(enrollmentIsTrialEnrollment)
          .map((e) => normalizeClassId(e.class_id))
          .filter(Boolean),
      ),
    [canonicalEnrollments],
  );

  const awaitingTokensClassIds = useMemo(() => {
    const s = new Set<string>();
    for (const e of canonicalEnrollments) {
      const key = normalizeClassId(e.class_id);
      if (!key || assignedClassIds.has(key)) continue;
      if (trialEnrolledClassIds.has(key)) continue;
      if (String(e.status).toLowerCase() === 'cancelled') continue;
      if (!enrollmentIsTokenAssigned(e)) s.add(key);
    }
    return s;
  }, [canonicalEnrollments, assignedClassIds, trialEnrolledClassIds]);

  const listSharedProps = {
    expandedKeys: expandedGroups,
    onToggleExpand: toggleGroupExpand,
    locale: getLocale(),
    assignedClassIds,
    awaitingTokensClassIds,
    trialEnrolledClassIds,
    getLocationLabel,
    getStatusLabel,
    getUnassignedTokens,
    canAssignToClass,
    canAssignFullCourseBatch,
    isClassFull,
    onAssignLesson: openAssignLesson,
    onAssignGroup: openAssignGroup,
    onRemoveAssignment: (enrollmentId: string, classId: string, className: string) =>
      setConfirmModal({ type: 'remove', enrollmentId, classId, className }),
    enrollmentIdByClassId,
    tokensChargedByClassId,
    enrollmentStatusByClassId,
  };

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
              <h2 className="text-xl font-semibold text-gray-900">
                {activeStudentName || user.full_name}
              </h2>
              {activeStudentName && (
                <p className="text-sm text-gray-500">{t('admin.tokenAssignment.accountLabel', { name: user.full_name })}</p>
              )}
              <p className="text-gray-600">{formatMobileForDisplay(user.mobile, '-')}</p>
            </div>
          </div>

          {/* Token Information */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-gray-900">{t('admin.tokenAssignment.remainingTokens')}</span>
                </div>
                <div className="text-2xl font-bold text-green-600">{unassignedTokens}</div>
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
            <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
              {t('admin.tokenAssignment.assignedTokens')}: {user.assigned_tokens}
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

        {enrollmentsLoadWarning && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {enrollmentsLoadWarning}
          </div>
        )}

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
              <span className="ml-2 opacity-90">({unassignedGroups.length})</span>
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
              <span className="ml-2 opacity-90">({assignedGroups.length})</span>
            </button>
          </div>

          <TokenAssignmentCourseList
            mode={listTab}
            groups={listTab === 'unassigned' ? unassignedGroups : assignedGroups}
            {...listSharedProps}
          />
        </div>
      </div>

      {/* Confirm modal for 分配 / 移除 */}
      {confirmModal && (() => {
        const isSingleAssign = confirmModal.type === 'assign';
        const isBatchAssign = confirmModal.type === 'assignBatch';
        const parsed = parseInt(assignTokenInput, 10);
        const assignValid = isSingleAssign && !isNaN(parsed) && parsed >= 1;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={dismissConfirmModal}>
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    isSingleAssign || isBatchAssign ? 'bg-primary/20' : 'bg-red-100'
                  }`}
                >
                  {isSingleAssign || isBatchAssign ? (
                    <Package className="h-5 w-5 text-primary" />
                  ) : (
                    <X className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {isSingleAssign || isBatchAssign
                    ? t('admin.tokenAssignment.assignTokensModalTitle')
                    : t('admin.tokenAssignment.confirmRemove')}
                </h3>
              </div>
              {isBatchAssign ? (
                <>
                  <p className="text-gray-600 mb-4">
                    {t('admin.tokenAssignment.confirmAssignBatch', {
                      count: confirmModal.lessonIds.length,
                      className: confirmModal.className,
                      defaultValue:
                        '確認將 {{count}} 個代幣分配到「{{className}}」的 {{count}} 堂課？',
                    })}
                  </p>
                  {confirmModal.expectedLessonCount != null &&
                    confirmModal.lessonIds.length < confirmModal.expectedLessonCount && (
                      <p className="mb-4 text-xs text-amber-800 bg-amber-50 rounded-md px-3 py-2">
                        {t('admin.tokenAssignment.assignPartialCourseWarning', {
                          found: confirmModal.lessonIds.length,
                          expected: confirmModal.expectedLessonCount,
                        })}
                      </p>
                    )}
                  {(() => {
                    const pastN = confirmModal.lessonIds.filter((id) => isClassIdPast(id)).length;
                    if (pastN <= 0) return null;
                    return (
                      <p className="mb-4 text-xs text-amber-800 bg-amber-50 rounded-md px-3 py-2">
                        {t('admin.tokenAssignment.assignBatchPastLessonsWarning', { count: pastN })}
                      </p>
                    );
                  })()}
                </>
              ) : isSingleAssign ? (
                <>
                  <p className="text-gray-600 mb-2">
                    {t('admin.tokenAssignment.assignTokensToClass', { className: confirmModal.className })}
                  </p>
                  <div className="mb-6">
                    <label htmlFor="assign-token-count" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('admin.tokenAssignment.tokensToAssign')}
                    </label>
                    <input
                      id="assign-token-count"
                      type="number"
                      min={1}
                      value={assignTokenInput}
                      onChange={(e) => setAssignTokenInput(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    {(() => {
                      const parsed = parseInt(assignTokenInput, 10);
                      if (isNaN(parsed) || parsed < 2) return null;
                      const plan = buildTokenAssignPlan(confirmModal.classId, parsed);
                      if (plan.mode !== 'batch') return null;
                      return (
                        <p className="mt-2 text-xs text-blue-800 bg-blue-50 rounded-md px-3 py-2">
                          {t('admin.tokenAssignment.assignDistributedPerLesson', {
                            count: plan.lessonIds.length,
                            tokens: plan.tokensPerLesson,
                          })}
                        </p>
                      );
                    })()}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-gray-600 mb-2">
                    {t('admin.tokenAssignment.confirmRemoveMessage', { className: confirmModal.className })}
                  </p>
                  <p className="text-sm text-amber-800 bg-amber-50 rounded-md px-3 py-2 mb-6">
                    {t('admin.tokenAssignment.confirmRemoveRefundHint')}
                  </p>
                </>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={dismissConfirmModal}
                  className="px-4 py-2 rounded-md text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
                {isSingleAssign || isBatchAssign ? (
                  <button
                    onClick={handleAssignConfirm}
                    disabled={(isSingleAssign && !assignValid) || assigning}
                    className="px-4 py-2 rounded-md text-sm font-medium text-white bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {assigning ? t('common.loading', 'Loading…') : t('admin.tokenAssignment.assign')}
                  </button>
                ) : (
                  <button
                    onClick={handleConfirmModal}
                    disabled={removing}
                    className="px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {removing ? t('common.loading', 'Loading…') : t('common.confirm')}
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

