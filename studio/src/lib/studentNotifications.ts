/**
 * Student notifications: build display title/message from API with studentName, className, etc.
 */

import type { EnrolledClass } from './studentEnrollments';

export type ApiNotification = {
  id: string;
  type: string;
  title?: string;
  message?: string;
  titleKey?: string;
  messageKey?: string;
  date: string;
  studentName?: string;
  className?: string;
  dateTimeStr?: string;
  leaveType?: string;
  daysLeft?: string;
  remainingTokens?: string;
};

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  date: string;
  studentName?: string;
}

export function buildNotification(
  n: ApiNotification,
  t: (key: string, opts?: Record<string, string>) => string
): NotificationItem {
  const leaveTypeLabel =
    n.leaveType === 'personal' ? t('notifications.leaveTypePersonal') : t('notifications.leaveTypeSick');
  const vars: Record<string, string> = {
    studentName: n.studentName || '',
    className: n.className || '',
    dateTimeStr: n.dateTimeStr || '',
    leaveTypeLabel,
    daysLeft: n.daysLeft ?? '',
    remainingTokens: n.remainingTokens ?? '',
  };
  let title = n.title ?? '';
  let message = n.message ?? '';
  if (n.titleKey) title = t(`notifications.${n.titleKey}`, vars);
  if (n.messageKey) message = t(`notifications.${n.messageKey}`, vars);
  return {
    id: n.id,
    type: n.type,
    title,
    message,
    date: n.date,
    studentName: n.studentName || undefined,
  };
}

/** Build notification items for pending leave requests from enrollments (for 訊息中心) */
export function buildPendingLeaveNotifications(
  enrollments: EnrolledClass[],
  t: (key: string, opts?: Record<string, string | number>) => string
): NotificationItem[] {
  const items: NotificationItem[] = [];
  enrollments.forEach((enrollment) => {
    (enrollment.leave_requests || []).forEach((r) => {
      if (r.status !== 'pending') return;
      const leaveTypeLabel =
        r.leave_type === 'personal' ? t('notifications.leaveTypePersonal') : t('notifications.leaveTypeSick');
      const className = enrollment.class?.name ?? '';
      const n = (r.lesson_index ?? 0) + 1;
      items.push({
        id: `leave-pending-${enrollment.id}-${r.lesson_index}`,
        type: 'leave_pending',
        title: t('notifications.leavePendingTitle'),
        message: t('notifications.leavePendingMessage', {
          className,
          n: String(n),
          leaveTypeLabel,
        }),
        date: new Date().toISOString(),
        studentName: enrollment.user_name,
      });
    });
  });
  return items;
}
