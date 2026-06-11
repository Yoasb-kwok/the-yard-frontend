import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, CheckCircle, Package, X } from 'lucide-react';
import {
  formatDateTimeRange,
  formatMultiLessonTimeSummary,
  formatProgramCodeDisplay,
} from '../../lib/utils';
import type { TokenAssignmentCourseGroup, TokenAssignmentClassRow } from '../../lib/tokenAssignmentGroups';
import { normalizeClassId } from '../../lib/adminClassEnrollments';
import { getLessonEnrollmentUiStatus } from '../../lib/courseLessonEnrollment';

type TabMode = 'unassigned' | 'assigned';

export interface TokenAssignmentCourseListProps {
  mode: TabMode;
  groups: TokenAssignmentCourseGroup[];
  expandedKeys: Set<string>;
  onToggleExpand: (key: string) => void;
  locale: string;
  assignedClassIds: Set<string>;
  getLocationLabel: (location?: TokenAssignmentClassRow['location']) => string;
  getStatusLabel?: (status: string) => string;
  getUnassignedTokens: () => number;
  canAssignToClass: (classItem: TokenAssignmentClassRow) => boolean;
  canAssignFullCourseBatch?: (classItem: TokenAssignmentClassRow) => boolean;
  isClassFull: (classItem: TokenAssignmentClassRow) => boolean;
  onAssignLesson: (classItem: TokenAssignmentClassRow) => void;
  onAssignGroup: (group: TokenAssignmentCourseGroup, lessonIds: string[]) => void;
  onRemoveAssignment?: (enrollmentId: string, classId: string, className: string) => void;
  enrollmentIdByClassId?: Map<string, string>;
  tokensChargedByClassId?: Map<string, number>;
  enrollmentStatusByClassId?: Map<string, string>;
  awaitingTokensClassIds?: Set<string>;
}

export default function TokenAssignmentCourseList({
  mode,
  groups,
  expandedKeys,
  onToggleExpand,
  locale,
  assignedClassIds,
  getLocationLabel,
  getStatusLabel,
  getUnassignedTokens,
  canAssignToClass,
  canAssignFullCourseBatch,
  isClassFull,
  onAssignLesson,
  onAssignGroup,
  onRemoveAssignment,
  enrollmentIdByClassId,
  tokensChargedByClassId,
  enrollmentStatusByClassId,
  awaitingTokensClassIds,
}: TokenAssignmentCourseListProps) {
  const { t } = useTranslation();

  const lessonStatusLabel = (status: ReturnType<typeof getLessonEnrollmentUiStatus>): string => {
    switch (status) {
      case 'past':
        return t('admin.tokenAssignment.lessonStatusPast');
      case 'full':
        return t('admin.tokenAssignment.lessonStatusFull');
      case 'assigned':
        return t('admin.tokenAssignment.lessonStatusAssigned');
      case 'awaiting_tokens':
        return t('admin.tokenAssignment.lessonStatusAwaiting');
      case 'cancelled':
        return t('admin.tokenAssignment.lessonStatusCancelled');
      default:
        return t('admin.tokenAssignment.lessonStatusPending');
    }
  };

  if (groups.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-gray-500">
        {mode === 'unassigned'
          ? t('admin.tokenAssignment.noUnassignedClasses')
          : t('admin.tokenAssignment.noAssignedClasses')}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="w-10 px-2 py-3" aria-hidden />
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              {t('admin.classes.className')}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              {t('admin.tokenAssignment.classCode')}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              {t('admin.tokenAssignment.instructor')}
            </th>
            <th className="min-w-[12rem] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              {t('admin.tokenAssignment.time')}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              {t('admin.tokenAssignment.location')}
            </th>
            {mode === 'unassigned' ? (
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t('admin.tokenAssignment.enrolled')}
              </th>
            ) : (
              <>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('admin.tokenAssignment.tokensAssigned')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('admin.attendance.status')}
                </th>
              </>
            )}
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              {t('admin.purchaseHistory.actions')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {groups.map((group) => {
            const expanded = expandedKeys.has(group.key);
            const multiLesson = group.lessons.length > 1;
            const showLessonRows = multiLesson && expanded;
            const first = group.lessons[0];
            const last = group.lessons[group.lessons.length - 1];
            const assignableInGroup = group.lessons.filter((l) => {
              if (assignedClassIds.has(normalizeClassId(l.id))) return false;
              if (canAssignFullCourseBatch?.(l)) return true;
              return canAssignToClass(l);
            });
            const tokensNeededForGroup = assignableInGroup.reduce(
              (sum, l) => sum + Math.max(1, Number(l.token_cost) || 1),
              0,
            );
            const canAssignGroup =
              mode === 'unassigned' &&
              multiLesson &&
              assignableInGroup.length > 0 &&
              tokensNeededForGroup <= getUnassignedTokens();

            return (
              <Fragment key={group.key}>
                <tr className={mode === 'assigned' ? 'bg-green-50/40' : 'bg-slate-50/80'}>
                  <td className="px-2 py-3 align-top">
                    {multiLesson ? (
                      <button
                        type="button"
                        onClick={() => onToggleExpand(group.key)}
                        className="p-1 rounded hover:bg-gray-200 text-gray-600"
                        aria-expanded={expanded}
                      >
                        {expanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                    <div className="flex flex-wrap items-center gap-2">
                      {group.displayName}
                      {multiLesson && (
                        <span className="text-xs font-normal text-gray-500">
                          ({group.lessons.length} {t('admin.tokenAssignment.lessonsUnit', { defaultValue: '堂' })})
                        </span>
                      )}
                      {mode === 'assigned' && (
                        <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                      )}
                      {multiLesson && group.assignedLessonCount > 0 && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            group.assignedLessonCount === group.lessons.length
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {group.assignedLessonCount === group.lessons.length
                            ? t('admin.tokenAssignment.fullyAssigned', {
                                total: group.lessons.length,
                                defaultValue: '全部 {{total}} 堂已分配',
                              })
                            : t('admin.tokenAssignment.partiallyAssigned', {
                                assigned: group.assignedLessonCount,
                                total: group.lessons.length,
                              })}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-primary font-medium">
                    {group.programCode || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{group.instructor || '—'}</td>
                  <td className="min-w-[12rem] px-4 py-3 text-sm text-gray-700 align-top">
                    {multiLesson && !expanded ? (
                      <MultiLessonTimeSummary
                        firstStart={first.start_time}
                        firstEnd={first.end_time}
                        lastStart={last.start_time}
                        lastEnd={last.end_time}
                        locale={locale}
                      />
                    ) : (
                      <span className="whitespace-nowrap">
                        {formatDateTimeRange(first.start_time, first.end_time, locale)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {getLocationLabel(group.location)}
                  </td>
                  {mode === 'unassigned' ? (
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {!multiLesson ? `${first.enrolled_count} / ${first.capacity}` : '—'}
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                        {group.assignedTokenCount}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {!multiLesson && enrollmentStatusByClassId?.get(first.id) && getStatusLabel ? (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {getStatusLabel(enrollmentStatusByClassId.get(first.id)!)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3 text-sm">
                    {mode === 'unassigned' && multiLesson && canAssignGroup && (
                      <button
                        type="button"
                        onClick={() =>
                          onAssignGroup(
                            group,
                            assignableInGroup.map((l) => l.id),
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-primary text-white hover:bg-primary-dark"
                      >
                        <Package className="h-4 w-4" />
                        {t('admin.tokenAssignment.assignFullCourse', {
                          count: group.totalLessons,
                        })}
                      </button>
                    )}
                    {mode === 'unassigned' && !multiLesson && first && (
                      <AssignButton
                        lesson={first}
                        canAssign={canAssignToClass(first)}
                        getUnassignedTokens={getUnassignedTokens}
                        isClassFull={isClassFull}
                        onAssign={onAssignLesson}
                      />
                    )}
                    {mode === 'assigned' && !multiLesson && first && enrollmentIdByClassId?.get(first.id) && onRemoveAssignment && (
                      <button
                        type="button"
                        onClick={() =>
                          onRemoveAssignment(
                            enrollmentIdByClassId.get(first.id)!,
                            first.id,
                            first.name,
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200"
                      >
                        <X className="h-4 w-4" />
                        {t('admin.tokenAssignment.remove')}
                      </button>
                    )}
                  </td>
                </tr>

                {showLessonRows &&
                  group.lessons.map((lesson) => {
                    const lessonKey = normalizeClassId(lesson.id);
                    const uiStatus = getLessonEnrollmentUiStatus(lesson, {
                      assignedClassIds,
                      awaitingTokensClassIds,
                    });
                    const isAssigned = uiStatus === 'assigned';
                    const statusText = lessonStatusLabel(uiStatus);
                    const tokens = tokensChargedByClassId?.get(lessonKey) ?? 0;
                    const enrollStatus = enrollmentStatusByClassId?.get(lessonKey);
                    const enrollmentId = enrollmentIdByClassId?.get(lessonKey);
                    const rowTone =
                      uiStatus === 'past'
                        ? 'bg-gray-50/80 text-gray-500'
                        : uiStatus === 'full'
                          ? 'bg-amber-50/30'
                          : isAssigned
                            ? 'hover:bg-green-50/30'
                            : 'hover:bg-gray-50';

                    if (mode === 'unassigned' && (uiStatus === 'past' || uiStatus === 'cancelled')) {
                      return (
                        <tr key={`${group.key}-${lesson.id}`} className={rowTone}>
                          <td />
                          <td colSpan={7} className="px-4 py-2 pl-10 text-xs">
                            <span className="inline-flex flex-wrap items-center gap-2">
                              {formatProgramCodeDisplay(lesson.class_code, lesson.lesson_number) ||
                                lesson.class_code}
                              <span>·</span>
                              {formatDateTimeRange(lesson.start_time, lesson.end_time, locale)}
                              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-gray-700">
                                {statusText}
                              </span>
                            </span>
                          </td>
                        </tr>
                      );
                    }

                    if (mode === 'unassigned' && isAssigned) {
                      return (
                        <tr key={`${group.key}-${lesson.id}`} className="bg-gray-50/60">
                          <td />
                          <td colSpan={7} className="px-4 py-2 pl-10 text-xs text-gray-600">
                            <span className="inline-flex flex-wrap items-center gap-2">
                              <CheckCircle className="h-3.5 w-3.5 text-primary" />
                              {formatProgramCodeDisplay(lesson.class_code, lesson.lesson_number) ||
                                lesson.class_code}
                              <span>·</span>
                              {formatDateTimeRange(lesson.start_time, lesson.end_time, locale)}
                              <span className="text-primary font-medium">{statusText}</span>
                              {tokens > 0 && (
                                <span>
                                  ({t('admin.tokenAssignment.tokensAssigned')}: {tokens})
                                </span>
                              )}
                            </span>
                          </td>
                        </tr>
                      );
                    }

                    if (mode === 'assigned' && (uiStatus === 'past' || uiStatus === 'cancelled')) {
                      return (
                        <tr key={`${group.key}-${lesson.id}`} className={rowTone}>
                          <td />
                          <td colSpan={8} className="px-4 py-2 pl-10 text-xs">
                            <span className="inline-flex flex-wrap items-center gap-2">
                              {formatProgramCodeDisplay(lesson.class_code, lesson.lesson_number) ||
                                lesson.class_code}
                              <span>·</span>
                              {formatDateTimeRange(lesson.start_time, lesson.end_time, locale)}
                              <span className="rounded-full bg-gray-200 px-2 py-0.5">{statusText}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    }

                    if (mode === 'assigned' && !isAssigned) {
                      return (
                        <tr key={`${group.key}-${lesson.id}`} className="bg-amber-50/40">
                          <td />
                          <td colSpan={8} className="px-4 py-2 pl-10 text-xs text-amber-900">
                            <span className="inline-flex flex-wrap items-center gap-2">
                              {formatProgramCodeDisplay(lesson.class_code, lesson.lesson_number) ||
                                lesson.class_code}
                              <span>·</span>
                              {formatDateTimeRange(lesson.start_time, lesson.end_time, locale)}
                              <span className="font-medium">{statusText}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={`${group.key}-${lesson.id}`} className={rowTone}>
                        <td />
                        <td className="px-4 py-2 pl-10 text-sm text-gray-900">
                          <span className="inline-flex items-center gap-1.5">
                            {isAssigned && <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />}
                            {formatProgramCodeDisplay(lesson.class_code, lesson.lesson_number) ||
                              lesson.name}
                          </span>
                          {multiLesson && (
                            <p className="text-xs text-gray-500 mt-0.5">{statusText}</p>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-primary">
                          {formatProgramCodeDisplay(lesson.class_code, lesson.lesson_number) || '—'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">{lesson.instructor || '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">
                          {formatDateTimeRange(lesson.start_time, lesson.end_time, locale)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {getLocationLabel(lesson.location)}
                        </td>
                        {mode === 'unassigned' ? (
                          <>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {lesson.enrolled_count} / {lesson.capacity}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              <AssignButton
                                lesson={lesson}
                                canAssign={canAssignToClass(lesson)}
                                getUnassignedTokens={getUnassignedTokens}
                                isClassFull={isClassFull}
                                onAssign={onAssignLesson}
                                compact
                              />
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">
                              {tokens > 0 ? tokens : '—'}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {enrollStatus && getStatusLabel ? (
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  {getStatusLabel(enrollStatus)}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {enrollmentId && onRemoveAssignment && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onRemoveAssignment(enrollmentId, lesson.id, lesson.name)
                                  }
                                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  {t('admin.tokenAssignment.remove')}
                                </button>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MultiLessonTimeSummary({
  firstStart,
  firstEnd,
  lastStart,
  lastEnd,
  locale,
}: {
  firstStart: string;
  firstEnd: string;
  lastStart: string;
  lastEnd: string;
  locale: string;
}) {
  const { primary, secondary, secondaryIsTimeOnly } = formatMultiLessonTimeSummary(
    firstStart,
    firstEnd,
    lastStart,
    lastEnd,
    locale,
  );
  return (
    <div className="leading-snug">
      <div className="whitespace-nowrap">{primary}</div>
      {secondary ? (
        <div className={`mt-0.5 ${secondaryIsTimeOnly ? 'text-gray-600' : 'text-gray-700'}`}>
          {secondary}
        </div>
      ) : null}
    </div>
  );
}

function AssignButton({
  lesson,
  canAssign,
  getUnassignedTokens,
  isClassFull,
  onAssign,
  compact,
}: {
  lesson: TokenAssignmentClassRow;
  canAssign: boolean;
  getUnassignedTokens: () => number;
  isClassFull: (c: TokenAssignmentClassRow) => boolean;
  onAssign: (c: TokenAssignmentClassRow) => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  if (canAssign) {
    return (
      <button
        type="button"
        onClick={() => onAssign(lesson)}
        className={`inline-flex items-center gap-1.5 rounded-md font-medium bg-primary text-white hover:bg-primary-dark ${
          compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'
        }`}
      >
        <Package className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        {compact
          ? t('admin.tokenAssignment.assignLesson')
          : t('admin.tokenAssignment.assign')}
      </button>
    );
  }
  return (
    <span className="text-xs text-gray-500">
      {!getUnassignedTokens()
        ? t('admin.tokenAssignment.noTokensAvailable')
        : isClassFull(lesson)
          ? t('admin.tokenAssignment.classFull')
          : '—'}
    </span>
  );
}
