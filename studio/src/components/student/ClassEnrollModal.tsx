import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Coins, Loader2, X } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import {
  getEnrollmentCostLabel,
  getEnrollmentTokenCost,
  getLessonsForScope,
  type EnrollmentScope,
} from '../../lib/classEnrollmentTokens';
import { getTotalRemainingTokens, hasEnoughTokens, normalizeUserTokens, type UserToken } from '../../lib/studentTokens';
import { getEnrollmentLessonSlots } from '../../lib/studentEnrollments';
import { useHolidays } from '../../lib/useHolidays';
import { formatDate, formatDateTimeRange, isClassOccurrencePast } from '../../lib/utils';

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
}

interface ClassEnrollModalProps {
  isOpen: boolean;
  lesson: ClassEnrollLesson | null;
  onClose: () => void;
  onEnrolled?: () => void;
}

export default function ClassEnrollModal({ isOpen, lesson, onClose, onEnrolled }: ClassEnrollModalProps) {
  const { t, i18n } = useTranslation();
  const { holidayDatesSet } = useHolidays();
  const [tokens, setTokens] = useState<UserToken[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<EnrollmentScope>('single_lesson');

  const getLocale = () => (i18n.language === 'zh-CN' ? 'zh-CN' : i18n.language === 'zh-TW' ? 'zh-TW' : 'en-US');

  const totalLessons = lesson?.total_lessons ?? 8;
  const canEnrollFullCourse = totalLessons > 1;

  const lessonCount = useMemo(
    () => getLessonsForScope(scope, totalLessons),
    [scope, totalLessons],
  );

  const tokenCost = useMemo(
    () =>
      getEnrollmentTokenCost({
        lessonCount,
        tokenCostPerLesson: lesson?.token_cost,
      }),
    [lessonCount, lesson?.token_cost],
  );

  const balance = useMemo(() => getTotalRemainingTokens(tokens), [tokens]);
  const sufficient = hasEnoughTokens(tokens, tokenCost);

  const lessonSlots = useMemo(() => {
    if (!lesson) return [];
    return getEnrollmentLessonSlots({
      start_time: lesson.start_time,
      end_time: lesson.end_time,
      lessonCount,
      holidayDatesSet,
    });
  }, [lesson, lessonCount, holidayDatesSet]);

  useEffect(() => {
    if (!isOpen) {
      setScope('single_lesson');
      setError(null);
      return;
    }
    let cancelled = false;
    setLoadingTokens(true);
    api
      .get('/student/tokens')
      .catch(() => api.get('/user-tokens'))
      .then((res) => {
        if (cancelled) return;
        setTokens(normalizeUserTokens(res));
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
  }, [isOpen]);

  if (!isOpen || !lesson) return null;

  const lessonEnded = isClassOccurrencePast(lesson.end_time);

  async function handleConfirm() {
    if (!lesson || submitting || lessonEnded) return;
    if (!sufficient) {
      setError(t('enrollment.insufficientTokens', '代幣不足，無法報名。請先購買套票。'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const preferredToken = tokens.find((tok) => tok.remaining_tokens >= tokenCost) ?? tokens[0];
      await api.post('/class-enrollments', {
        class_id: lesson.id,
        classId: lesson.id,
        user_token_id: preferredToken?.id,
        lesson_count: lessonCount,
        enrollment_scope: scope,
      });
      window.alert(t('enrollment.success', '報名成功，已扣除代幣。'));
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

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label={t('common.close')} onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">{t('enrollment.title', '報名課程')}</h2>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="text-sm text-gray-700 space-y-1">
          <p className="font-medium text-gray-900">{lesson.name}</p>
          {lesson.program_code && <p className="text-primary">{lesson.program_code}</p>}
          <p>{t(`home.locations.${lesson.location}`, { defaultValue: lesson.location })}</p>
        </div>

        <div className="rounded-lg border border-primary/25 bg-primary-lighter/40 p-3">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            {t('enrollment.lessonScheduleTitle', { count: lessonCount })}
          </h3>
          <p className="text-xs text-gray-600 mb-2">{t('enrollment.lessonScheduleHint')}</p>
          <ul className="space-y-2.5 max-h-52 overflow-y-auto">
            {lessonSlots.map((slot) => (
              <li key={slot.lessonIndex} className="flex gap-2.5 text-sm">
                <span className="shrink-0 font-medium text-primary min-w-[4.5rem]">
                  {t('calendar.lessonXOfY', { current: slot.lessonIndex, total: lessonCount })}
                </span>
                <div className="min-w-0">
                  <p className="text-gray-900 font-medium">
                    {formatDateTimeRange(slot.start.toISOString(), slot.end.toISOString(), getLocale())}
                  </p>
                  {slot.originalDateStr && (
                    <p className="text-xs text-amber-800 mt-0.5">
                      {t('calendar.postponedFromHoliday', {
                        date: formatDate(slot.originalDateStr, getLocale()),
                      })}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {lessonEnded && (
          <p className="text-sm text-gray-700 bg-gray-100 border border-gray-200 rounded-lg px-3 py-2">
            {t('calendar.lessonPastNoEnroll')}
          </p>
        )}

        {canEnrollFullCourse && !lessonEnded && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-gray-700">{t('enrollment.scopeLabel', '報名範圍')}</legend>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="enroll-scope"
                checked={scope === 'single_lesson'}
                onChange={() => setScope('single_lesson')}
              />
              {t('enrollment.scopeSingle', '只報名此堂（1 個代幣）')}
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="enroll-scope"
                checked={scope === 'full_course'}
                onChange={() => setScope('full_course')}
              />
              {t('enrollment.scopeFull', {
                count: totalLessons,
                defaultValue: '報名全期 {{count}} 堂',
              })}
            </label>
          </fieldset>
        )}

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 flex items-start gap-3">
          <Coins className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p>
              <span className="text-gray-600">{t('enrollment.cost', '所需代幣')}：</span>
              <span className="font-semibold text-gray-900 ml-1">
                {getEnrollmentCostLabel(lessonCount, lesson.token_cost, t)}
              </span>
            </p>
            <p>
              <span className="text-gray-600">{t('enrollment.balance', '可用餘額')}：</span>
              <span className={`font-semibold ml-1 ${sufficient ? 'text-green-700' : 'text-red-600'}`}>
                {loadingTokens ? '…' : balance}
              </span>
            </p>
            {!loadingTokens && !sufficient && (
              <p className="text-red-600 text-xs pt-1">{t('enrollment.insufficientTokens', '代幣不足，無法報名。請先購買套票。')}</p>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          {lessonEnded ? (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t('common.close')}
            </button>
          ) : !sufficient && !loadingTokens ? (
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
              }}
              className="flex-1 inline-flex justify-center items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark"
            >
              {t('enrollment.buyTokens', '購買代幣')}
            </Link>
          ) : (
            <button
              type="button"
              disabled={submitting || loadingTokens || !sufficient}
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
