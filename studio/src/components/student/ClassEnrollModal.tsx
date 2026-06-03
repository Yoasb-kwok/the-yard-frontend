import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Coins, AlertCircle, Loader2, X } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  getEnrollmentCostLabel,
  type EnrollmentScope,
} from '../../lib/classEnrollmentTokens';
import {
  buildEnrollmentRequestBody,
  parseLessonClassIds,
  getFullCourseEnrollmentCounts,
  getLessonEnrollmentUiStatus,
  getSeriesFetchRange,
  getSingleLessonEnrollmentCost,
  mapApiClassToCourseLesson,
  type CourseLessonRow,
} from '../../lib/courseLessonEnrollment';
import { getTotalRemainingTokens, hasEnoughTokens, normalizeUserTokens, type UserToken } from '../../lib/studentTokens';
import { filterUserTokensByProfile, withStudentProfileQuery } from '../../lib/studentProfileScope';
import { formatDateTimeRange, formatProgramCodeDisplay } from '../../lib/utils';

export interface ClassEnrollLesson {
  id: string;
  name: string;
  instructor: string;
  start_time: string;
  end_time: string;
  location: string;
  program_code?: string;
  total_lessons?: number;
  token_cost?: number;
  capacity?: number;
  enrolled_count?: number;
}

interface ClassEnrollModalProps {
  isOpen: boolean;
  lesson: ClassEnrollLesson | null;
  onClose: () => void;
  onEnrolled?: () => void;
}

export default function ClassEnrollModal({ isOpen, lesson, onClose, onEnrolled }: ClassEnrollModalProps) {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const [tokens, setTokens] = useState<UserToken[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [seriesLessons, setSeriesLessons] = useState<CourseLessonRow[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getLocale = () => (i18n.language === 'zh-CN' ? 'zh-CN' : i18n.language === 'zh-TW' ? 'zh-TW' : 'en-US');

  const anchorRow = useMemo((): CourseLessonRow | null => {
    if (!lesson) return null;
    return mapApiClassToCourseLesson({
      id: lesson.id,
      name: lesson.name,
      instructor: lesson.instructor,
      start_time: lesson.start_time,
      end_time: lesson.end_time,
      program_code: lesson.program_code,
      total_lessons: lesson.total_lessons,
      token_cost: lesson.token_cost,
      capacity: lesson.capacity ?? 0,
      enrolled_count: lesson.enrolled_count ?? 0,
      is_cancelled: false,
      location: lesson.location,
    });
  }, [lesson]);

  const totalLessonsInSeries = Math.max(
    1,
    Number(lesson?.total_lessons) || 0,
    seriesLessons.length,
  );
  const isFullCourseSeries = totalLessonsInSeries > 1;
  const enrollmentScope: EnrollmentScope = isFullCourseSeries ? 'full_course' : 'single_lesson';

  const enrollmentCounts = useMemo(() => {
    if (!anchorRow) {
      return {
        bookable: [] as CourseLessonRow[],
        lessonCount: 1,
        tokensRequired: 1,
        lessonClassIds: [] as string[],
        skippedPast: 0,
        skippedFull: 0,
        seriesTotal: 1,
      };
    }
    const pool = seriesLessons.length > 0 ? seriesLessons : [anchorRow];
    if (!isFullCourseSeries) {
      const cost = getSingleLessonEnrollmentCost(anchorRow);
      return {
        bookable: pool.filter((l) => l.id === anchorRow.id),
        lessonCount: 1,
        tokensRequired: cost,
        lessonClassIds: [anchorRow.id],
        skippedPast: 0,
        skippedFull: 0,
        seriesTotal: 1,
      };
    }
    return getFullCourseEnrollmentCounts(anchorRow, pool);
  }, [anchorRow, seriesLessons, isFullCourseSeries]);

  const { lessonCount, tokensRequired, lessonClassIds, skippedPast, skippedFull, bookable } =
    enrollmentCounts;

  const balance = useMemo(() => getTotalRemainingTokens(tokens), [tokens]);
  const hasPurchasedTokens = balance > 0;
  const sufficientTokens = useMemo(() => hasEnoughTokens(tokens, tokensRequired), [tokens, tokensRequired]);
  const tokenShortfall = Math.max(0, tokensRequired - balance);
  const canSubmit = bookable.length > 0 && tokensRequired > 0;

  const seriesDisplay = useMemo(() => {
    if (!anchorRow) return [];
    const pool = seriesLessons.length > 0 ? seriesLessons : [anchorRow];
    const bookableIds = new Set(bookable.map((l) => l.id));
    return pool.map((row) => ({
      row,
      status: getLessonEnrollmentUiStatus(row, { assignedClassIds: new Set() }),
      included: bookableIds.has(row.id),
    }));
  }, [anchorRow, seriesLessons, bookable]);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      return;
    }
    let cancelled = false;
    setLoadingTokens(true);
    const profileId = profile?.id;
    api
      .get('/student/tokens', withStudentProfileQuery(undefined, profileId))
      .catch(() => api.get('/user-tokens', withStudentProfileQuery(undefined, profileId)))
      .then((res) => {
        if (cancelled) return;
        const normalized = normalizeUserTokens(res);
        const scoped = filterUserTokensByProfile(normalized, profileId);
        setTokens(Array.isArray(scoped) ? (scoped as UserToken[]) : normalized);
      })
      .catch(() => {
        if (!cancelled) setTokens([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingTokens(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, profile?.id]);

  useEffect(() => {
    if (!isOpen || !lesson?.program_code?.trim()) {
      setSeriesLessons([]);
      return;
    }
    let cancelled = false;
    setSeriesLoading(true);
    const code = lesson.program_code.trim();
    const range = getSeriesFetchRange();
    api
      .get<Record<string, unknown>[]>('/classes', {
        from: range.from,
        to: range.to,
        program_code: code,
        class_code: code,
      })
      .then((res) => {
        if (cancelled) return;
        const rows = res.success && Array.isArray(res.data) ? res.data : [];
        const mapped = rows
          .map((row) => mapApiClassToCourseLesson(row))
          .filter((r) => r.id && (r.class_code || '').trim().toLowerCase() === code.toLowerCase());
        setSeriesLessons(mapped.length > 0 ? mapped : anchorRow ? [anchorRow] : []);
      })
      .catch(() => {
        if (!cancelled) setSeriesLessons(anchorRow ? [anchorRow] : []);
      })
      .finally(() => {
        if (!cancelled) setSeriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, lesson?.program_code, lesson?.id, anchorRow]);

  if (!isOpen || !lesson || !anchorRow) return null;

  async function handleConfirm() {
    if (!lesson || submitting || !canSubmit) return;
    if (!hasPurchasedTokens) {
      setError(t('enrollment.noTokensPurchased', '請先購買套票後再報名課程。'));
      return;
    }
    setSubmitting(true);
    setError(null);
    const anchorId = bookable[0]?.id ?? lesson.id;
    try {
      const body = buildEnrollmentRequestBody({
        classId: anchorId,
        lessonCount,
        enrollmentScope,
        tokensRequired,
        lessonClassIds: isFullCourseSeries ? lessonClassIds : undefined,
        studentProfileId: profile?.id,
      });
      const res = await api.post<Record<string, unknown>>('/class-enrollment-requests', body);
      const payload = (res.data ?? res) as Record<string, unknown>;
      const confirmedIds = parseLessonClassIds(
        payload.lesson_class_ids ?? payload.lessonClassIds ?? payload.data,
      );
      if (isFullCourseSeries && confirmedIds.length > 0 && confirmedIds.length !== lessonClassIds.length) {
        console.info('[enrollment] lesson_class_ids from API:', confirmedIds);
      }
      window.alert(t('enrollment.successPending', '報名申請已提交，管理員確認後將為您分配代幣。'));
      onEnrolled?.();
      onClose();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t('common.error', 'Something went wrong.');
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function statusLabel(status: string, included: boolean): string | null {
    if (status === 'past') return t('enrollment.lessonStatusPast');
    if (status === 'full') return t('enrollment.lessonStatusFull');
    if (status === 'cancelled') return t('enrollment.lessonStatusCancelled');
    if (included) return t('enrollment.lessonStatusIncluded');
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label={t('common.close')} onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">{t('enrollment.title', '報名課程')}</h2>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {profile?.full_name && (
          <p className="text-sm text-gray-600">
            {t('enrollment.enrollingAs', { name: profile.full_name })}
          </p>
        )}

        <div className="text-sm text-gray-700 space-y-1">
          <p className="font-medium text-gray-900">{lesson.name}</p>
          {lesson.program_code && <p className="text-primary">{lesson.program_code}</p>}
          <p>{t(`home.locations.${lesson.location}`, { defaultValue: lesson.location })}</p>
        </div>

        <div className="rounded-lg border border-primary/25 bg-primary-lighter/40 p-3">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            {isFullCourseSeries
              ? t('enrollment.lessonScheduleTitleRemaining', { count: lessonCount, total: totalLessonsInSeries })
              : t('enrollment.lessonScheduleTitle', { count: lessonCount })}
          </h3>
          <p className="text-xs text-gray-600 mb-2">{t('enrollment.lessonScheduleHintRemaining')}</p>
          {seriesLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <ul className="space-y-2.5 max-h-52 overflow-y-auto">
              {seriesDisplay.map(({ row, status, included }) => {
                const badge = statusLabel(status, included);
                return (
                  <li key={row.id} className="flex gap-2.5 text-sm">
                    <span className="shrink-0 font-medium text-primary min-w-[4.5rem]">
                      {formatProgramCodeDisplay(row.class_code, row.lesson_number) ||
                        t('admin.tokenAssignment.lessonRow')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-gray-900 ${included ? 'font-medium' : 'text-gray-500'}`}>
                        {formatDateTimeRange(row.start_time, row.end_time, getLocale())}
                      </p>
                      {badge && (
                        <p
                          className={`text-xs mt-0.5 ${
                            included ? 'text-green-800' : 'text-amber-800'
                          }`}
                        >
                          {badge}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {isFullCourseSeries && (skippedPast > 0 || skippedFull > 0) && (
            <p className="text-xs text-amber-800 mt-2">
              {t('enrollment.skippedLessonsSummary', { past: skippedPast, full: skippedFull })}
            </p>
          )}
        </div>

        {!canSubmit && !seriesLoading && (
          <p className="text-sm text-gray-700 bg-gray-100 border border-gray-200 rounded-lg px-3 py-2">
            {skippedFull > 0 && bookable.length === 0
              ? t('enrollment.allLessonsFull')
              : t('enrollment.noBookableLessons')}
          </p>
        )}

        {isFullCourseSeries && canSubmit && (
          <p className="text-sm text-gray-700 bg-primary-lighter/30 border border-primary/20 rounded-lg px-3 py-2">
            {t('enrollment.fullCourseRemaining', {
              count: lessonCount,
              tokens: tokensRequired,
            })}
          </p>
        )}

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 flex items-start gap-3">
          <Coins className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-gray-600">{t('enrollment.cost', '所需代幣')}：</span>
              <span className="font-semibold text-gray-900">
                {getEnrollmentCostLabel(lessonCount, lesson.token_cost, t)}
              </span>
              {!loadingTokens && !sufficientTokens && canSubmit && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {hasPurchasedTokens
                    ? t('enrollment.insufficientTokensShortfall', { count: tokenShortfall })
                    : t('enrollment.insufficientTokensBadge')}
                </span>
              )}
            </p>
            <p>
              <span className="text-gray-600">{t('enrollment.purchasedBalance', '已購代幣')}：</span>
              <span className={`font-semibold ml-1 ${hasPurchasedTokens ? 'text-green-700' : 'text-red-600'}`}>
                {loadingTokens ? '…' : balance}
              </span>
            </p>
            <p className="text-gray-600 text-xs pt-1">{t('enrollment.adminAssignHint')}</p>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          {!canSubmit && !seriesLoading ? (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t('common.close')}
            </button>
          ) : !hasPurchasedTokens && !loadingTokens ? (
            <Link
              to="/student/shop"
              state={{
                classData: {
                  id: lesson.id,
                  name: lesson.name,
                  instructor: lesson.instructor,
                  start_time: lesson.start_time,
                  end_time: lesson.end_time,
                  location: lesson.location,
                  program_code: lesson.program_code ?? '',
                },
                studentProfileId: profile?.id,
              }}
              className="flex-1 inline-flex justify-center items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark"
            >
              {t('enrollment.buyTokens', '購買代幣')}
            </Link>
          ) : (
            <button
              type="button"
              disabled={submitting || loadingTokens || !hasPurchasedTokens || !canSubmit}
              onClick={handleConfirm}
              className="flex-1 inline-flex justify-center items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('enrollment.confirm', '確認報名')}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('common.cancel', '取消')}
          </button>
        </div>
      </div>
    </div>
  );
}
