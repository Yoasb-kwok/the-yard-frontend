/**
 * Token cost rules for class enrollment: 1 lesson = 1 token (× per-lesson token_cost).
 * Enrolling in a full course of N lessons costs N tokens.
 */

export const DEFAULT_TOKEN_COST_PER_LESSON = 1;

export type EnrollmentScope = 'single_lesson' | 'full_course';

export function getLessonsForScope(
  scope: EnrollmentScope,
  totalLessonsInCourse?: number | null,
): number {
  if (scope === 'full_course') {
    const n = Number(totalLessonsInCourse);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
    return 1;
  }
  return 1;
}

/** Total tokens required for enrollment. */
export function getEnrollmentTokenCost(input: {
  lessonCount: number;
  tokenCostPerLesson?: number | null;
}): number {
  const perLesson = Math.max(1, Number(input.tokenCostPerLesson) || DEFAULT_TOKEN_COST_PER_LESSON);
  const lessons = Math.max(1, Math.floor(Number(input.lessonCount) || 1));
  return lessons * perLesson;
}

export function getEnrollmentCostLabel(
  lessonCount: number,
  tokenCostPerLesson: number | undefined | null,
  t: (key: string, opts?: Record<string, string | number>) => string,
): string {
  const cost = getEnrollmentTokenCost({ lessonCount, tokenCostPerLesson });
  return t('enrollment.tokenCost', { count: cost, defaultValue: '{{count}} 個代幣' });
}

/** Derive lesson + token counts for admin queue rows (handles full_course + class total_lessons). */
export function normalizeEnrollmentRequestCounts(row: Record<string, unknown>): {
  enrollmentScope: EnrollmentScope;
  lessonCount: number;
  tokensRequired: number;
} {
  const enrollmentScope: EnrollmentScope =
    (row.enrollment_scope ?? row.enrollmentScope) === 'full_course' ? 'full_course' : 'single_lesson';
  const lessonCountFromApi = Math.max(1, Number(row.lesson_count ?? row.lessonCount ?? 1) || 1);
  const classTotalLessons = Math.max(
    0,
    Number(row.class_total_lessons ?? row.classTotalLessons ?? row.total_lessons ?? row.totalLessons ?? 0) || 0,
  );
  const tokenCostPerLesson = Math.max(
    1,
    Number(row.token_cost ?? row.tokenCost ?? row.class_token_cost ?? row.classTokenCost ?? 1) || 1,
  );
  const tokensFromApi = Math.max(1, Number(row.tokens_required ?? row.tokensRequired ?? lessonCountFromApi) || 1);

  if (enrollmentScope === 'full_course') {
    const lessonCount = Math.max(
      lessonCountFromApi,
      classTotalLessons > 0 ? classTotalLessons : 0,
      getLessonsForScope('full_course', classTotalLessons || lessonCountFromApi),
    );
    const tokensRequired = Math.max(
      tokensFromApi,
      getEnrollmentTokenCost({ lessonCount, tokenCostPerLesson }),
    );
    return { enrollmentScope, lessonCount, tokensRequired };
  }

  return {
    enrollmentScope,
    lessonCount: lessonCountFromApi,
    tokensRequired: Math.max(tokensFromApi, getEnrollmentTokenCost({ lessonCount: lessonCountFromApi, tokenCostPerLesson })),
  };
}
