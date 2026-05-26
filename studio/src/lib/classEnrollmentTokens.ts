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
