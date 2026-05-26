/**
 * Student 訊息中心：試堂申請、課堂變動、請假／改期申請與批准結果。
 * 合併 API `/student/notifications`、試堂列表、報名課程內的請假狀態。
 */

import type { EnrolledClass } from './studentEnrollments';
import type { TrialApplicationItem, TrialStatus } from './studentTrialApplications';

export type StudentNotificationCategory = 'trial' | 'leave' | 'extension' | 'class' | 'other';

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
  /** Legacy mock / DB fields */
  body?: string;
  created_at?: string;
};

export interface NotificationItem {
  id: string;
  type: string;
  category: StudentNotificationCategory;
  title: string;
  message: string;
  date: string;
  studentName?: string;
}

type TFn = (key: string, opts?: Record<string, string | number>) => string;

const FOCUS_TYPES = new Set([
  'trial',
  'trial_application',
  'trial_pending',
  'trial_confirmed',
  'trial_cancelled',
  'trial_converted',
  'leave',
  'leave_pending',
  'leave_approved',
  'leave_rejected',
  'extension',
  'extension_pending',
  'extension_approved',
  'extension_rejected',
  'class_change',
  'class_cancelled',
  'class_rescheduled',
  'class_announcement',
]);

export function categorizeNotificationType(type: string): StudentNotificationCategory {
  const t = type.toLowerCase();
  if (t.startsWith('trial')) return 'trial';
  if (t.startsWith('leave')) return 'leave';
  if (t.startsWith('extension')) return 'extension';
  if (t.startsWith('class')) return 'class';
  return 'other';
}

function leaveTypeLabel(leaveType: string | undefined, t: TFn): string {
  return leaveType === 'personal' ? t('notifications.leaveTypePersonal') : t('notifications.leaveTypeSick');
}

/** Map legacy `{ title, body, created_at }` mock rows to ApiNotification. */
export function normalizeApiNotification(raw: Record<string, unknown>): ApiNotification | null {
  const id = String(raw.id ?? '').trim();
  if (!id) return null;
  const date = String(raw.date ?? raw.created_at ?? '').trim() || new Date().toISOString();
  const type = String(raw.type ?? 'other').trim() || 'other';
  return {
    id,
    type,
    title: raw.title != null ? String(raw.title) : undefined,
    message: raw.message != null ? String(raw.message) : raw.body != null ? String(raw.body) : undefined,
    titleKey: raw.titleKey != null ? String(raw.titleKey) : undefined,
    messageKey: raw.messageKey != null ? String(raw.messageKey) : undefined,
    date,
    studentName: raw.studentName != null ? String(raw.studentName) : undefined,
    className: raw.className != null ? String(raw.className) : undefined,
    dateTimeStr: raw.dateTimeStr != null ? String(raw.dateTimeStr) : undefined,
    leaveType: raw.leaveType != null ? String(raw.leaveType) : undefined,
    daysLeft: raw.daysLeft != null ? String(raw.daysLeft) : undefined,
    remainingTokens: raw.remainingTokens != null ? String(raw.remainingTokens) : undefined,
  };
}

export function buildNotification(n: ApiNotification, t: TFn): NotificationItem {
  const leaveLabel = leaveTypeLabel(n.leaveType, t);
  const vars: Record<string, string> = {
    studentName: n.studentName || '',
    className: n.className || '',
    dateTimeStr: n.dateTimeStr || '',
    leaveTypeLabel: leaveLabel,
    daysLeft: n.daysLeft ?? '',
    remainingTokens: n.remainingTokens ?? '',
  };
  let title = n.title ?? '';
  let message = n.message ?? '';
  if (n.titleKey) title = t(`notifications.${n.titleKey}`, vars);
  if (n.messageKey) message = t(`notifications.${n.messageKey}`, vars);
  const type = n.type || 'other';
  return {
    id: n.id,
    type,
    category: categorizeNotificationType(type),
    title,
    message,
    date: n.date,
    studentName: n.studentName || undefined,
  };
}

function trialStatusToNotification(
  status: TrialStatus,
  className: string,
  studentName: string,
  t: TFn,
): { type: string; titleKey: string; messageKey: string } | null {
  switch (status) {
    case 'pending':
      return {
        type: 'trial_pending',
        titleKey: 'trialSubmittedTitle',
        messageKey: 'trialSubmittedMessage',
      };
    case 'assigned':
    case 'confirmed':
    case 'contacted':
    case 'attended_trial':
      return {
        type: 'trial_confirmed',
        titleKey: 'trialConfirmedTitle',
        messageKey: 'trialConfirmedMessage',
      };
    case 'cancelled':
    case 'could_not_assign':
      return {
        type: status === 'could_not_assign' ? 'trial_could_not_assign' : 'trial_cancelled',
        titleKey: status === 'could_not_assign' ? 'trialCouldNotAssignTitle' : 'trialCancelledTitle',
        messageKey: status === 'could_not_assign' ? 'trialCouldNotAssignMessage' : 'trialCancelledMessage',
      };
    case 'converted':
      return {
        type: 'trial_converted',
        titleKey: 'trialConvertedTitle',
        messageKey: 'trialConvertedMessage',
      };
    default:
      return null;
  }
}

/** 由試堂申請列表產生通知（待確認、已確認、已取消等）。 */
export function buildTrialApplicationNotifications(
  trials: TrialApplicationItem[],
  t: TFn,
  studentName?: string,
): NotificationItem[] {
  const name = studentName?.trim() || '';
  return trials
    .map((trial) => {
      const className = trial.assigned_class_name || trial.class_name || '';
      const mapped = trialStatusToNotification(trial.status, className, name, t);
      if (!mapped) return null;
      const vars = { studentName: name, className };
      return {
        id: `trial-${trial.id}-${trial.status}`,
        type: mapped.type,
        category: 'trial' as const,
        title: t(`notifications.${mapped.titleKey}`, vars),
        message: t(`notifications.${mapped.messageKey}`, vars),
        date: trial.applied_date || new Date().toISOString(),
        studentName: name || undefined,
      };
    })
    .filter((n): n is NotificationItem => n !== null);
}

/** 請假：待定、已批准、未批准。 */
export function buildLeaveNotificationsFromEnrollments(
  enrollments: EnrolledClass[],
  t: TFn,
): NotificationItem[] {
  const items: NotificationItem[] = [];
  enrollments.forEach((enrollment) => {
    const className = enrollment.class?.name ?? '';
    const studentName = enrollment.user_name ?? '';
    (enrollment.leave_requests || []).forEach((r) => {
      const leaveTypeLabelStr =
        r.leave_type === 'personal' ? t('notifications.leaveTypePersonal') : t('notifications.leaveTypeSick');
      const n = (r.lesson_index ?? 0) + 1;
      const vars = { studentName, className, n: String(n), leaveTypeLabel: leaveTypeLabelStr };
      if (r.status === 'pending') {
        items.push({
          id: `leave-pending-${enrollment.id}-${r.lesson_index}`,
          type: 'leave_pending',
          category: 'leave',
          title: t('notifications.leavePendingTitle'),
          message: t('notifications.leavePendingMessage', vars),
          date: new Date().toISOString(),
          studentName: studentName || undefined,
        });
      } else if (r.status === 'approved') {
        items.push({
          id: `leave-approved-${enrollment.id}-${r.lesson_index}`,
          type: 'leave_approved',
          category: 'leave',
          title: t('notifications.leaveApprovedTitle', vars),
          message: t('notifications.leaveApprovedMessage', vars),
          date: new Date().toISOString(),
          studentName: studentName || undefined,
        });
      } else if (r.status === 'rejected') {
        items.push({
          id: `leave-rejected-${enrollment.id}-${r.lesson_index}`,
          type: 'leave_rejected',
          category: 'leave',
          title: t('notifications.leaveRejectedTitle', vars),
          message: t('notifications.leaveRejectedMessage', vars),
          date: new Date().toISOString(),
          studentName: studentName || undefined,
        });
      }
    });

    const sick = enrollment.sick_leave_application;
    if (sick?.status === 'pending') {
      items.push({
        id: `sick-pending-${enrollment.id}`,
        type: 'leave_pending',
        category: 'leave',
        title: t('notifications.sickLeavePendingTitle'),
        message: t('notifications.sickLeavePendingMessage', { studentName, className }),
        date: new Date().toISOString(),
        studentName: studentName || undefined,
      });
    } else if (sick?.status === 'approved') {
      items.push({
        id: `sick-approved-${enrollment.id}`,
        type: 'leave_approved',
        category: 'leave',
        title: t('notifications.leaveApprovedTitle', {
          studentName,
          className,
          leaveTypeLabel: t('notifications.leaveTypeSick'),
        }),
        message: t('notifications.leaveApprovedMessage', {
          studentName,
          className,
          leaveTypeLabel: t('notifications.leaveTypeSick'),
        }),
        date: new Date().toISOString(),
        studentName: studentName || undefined,
      });
    } else if (sick?.status === 'rejected') {
      items.push({
        id: `sick-rejected-${enrollment.id}`,
        type: 'leave_rejected',
        category: 'leave',
        title: t('notifications.leaveRejectedTitle', {
          studentName,
          className,
          leaveTypeLabel: t('notifications.leaveTypeSick'),
        }),
        message: t('notifications.leaveRejectedMessage', {
          studentName,
          className,
          leaveTypeLabel: t('notifications.leaveTypeSick'),
        }),
        date: new Date().toISOString(),
        studentName: studentName || undefined,
      });
    }
  });
  return items;
}

/** 改期：待定、已批准、未批准。 */
export function buildExtensionNotificationsFromEnrollments(
  enrollments: EnrolledClass[],
  t: TFn,
): NotificationItem[] {
  const items: NotificationItem[] = [];
  enrollments.forEach((enrollment) => {
    const ext = enrollment.extension_application;
    if (!ext?.status) return;
    const className = enrollment.class?.name ?? '';
    const studentName = enrollment.user_name ?? '';
    const vars = { studentName, className };
    if (ext.status === 'pending') {
      items.push({
        id: `extension-pending-${enrollment.id}`,
        type: 'extension_pending',
        category: 'extension',
        title: t('notifications.extensionPendingTitle'),
        message: t('notifications.extensionPendingMessage', vars),
        date: new Date().toISOString(),
        studentName: studentName || undefined,
      });
    } else if (ext.status === 'approved') {
      items.push({
        id: `extension-approved-${enrollment.id}`,
        type: 'extension_approved',
        category: 'extension',
        title: t('notifications.extensionApprovedTitle', vars),
        message: t('notifications.extensionApprovedMessage', vars),
        date: new Date().toISOString(),
        studentName: studentName || undefined,
      });
    } else if (ext.status === 'rejected') {
      items.push({
        id: `extension-rejected-${enrollment.id}`,
        type: 'extension_rejected',
        category: 'extension',
        title: t('notifications.extensionRejectedTitle', vars),
        message: t('notifications.extensionRejectedMessage', vars),
        date: new Date().toISOString(),
        studentName: studentName || undefined,
      });
    }
  });
  return items;
}

export type StudentRequestRow = {
  id: string;
  kind: 'extension' | 'sick_leave';
  status: string;
  class_name?: string;
  class_date?: string;
  created_at: string;
  user_name?: string;
};

/** 由後端請假／改期申請列表補充通知（mock 或正式 API）。 */
export function buildNotificationsFromStudentRequests(
  rows: StudentRequestRow[],
  t: TFn,
): NotificationItem[] {
  return rows.flatMap((row) => {
    const className = row.class_name ?? '';
    const studentName = row.user_name ?? '';
    const vars = {
      studentName,
      className,
      dateTimeStr: row.class_date ?? '',
      leaveTypeLabel: t('notifications.leaveTypeSick'),
    };
    if (row.kind === 'extension') {
      if (row.status === 'pending') {
        return [{
          id: `ext-req-${row.id}`,
          type: 'extension_pending',
          category: 'extension' as const,
          title: t('notifications.extensionPendingTitle'),
          message: t('notifications.extensionPendingMessage', vars),
          date: row.created_at,
          studentName: studentName || undefined,
        }];
      }
      if (row.status === 'approved') {
        return [{
          id: `ext-req-${row.id}`,
          type: 'extension_approved',
          category: 'extension' as const,
          title: t('notifications.extensionApprovedTitle', vars),
          message: t('notifications.extensionApprovedMessage', vars),
          date: row.created_at,
          studentName: studentName || undefined,
        }];
      }
      if (row.status === 'rejected') {
        return [{
          id: `ext-req-${row.id}`,
          type: 'extension_rejected',
          category: 'extension' as const,
          title: t('notifications.extensionRejectedTitle', vars),
          message: t('notifications.extensionRejectedMessage', vars),
          date: row.created_at,
          studentName: studentName || undefined,
        }];
      }
      return [];
    }
    // sick leave
    if (row.status === 'pending') {
      return [{
        id: `sick-req-${row.id}`,
        type: 'leave_pending',
        category: 'leave' as const,
        title: t('notifications.sickLeavePendingTitle'),
        message: t('notifications.sickLeavePendingMessage', vars),
        date: row.created_at,
        studentName: studentName || undefined,
      }];
    }
    if (row.status === 'approved') {
      return [{
        id: `sick-req-${row.id}`,
        type: 'leave_approved',
        category: 'leave' as const,
        title: t('notifications.leaveApprovedTitle', vars),
        message: t('notifications.leaveApprovedMessage', vars),
        date: row.created_at,
        studentName: studentName || undefined,
      }];
    }
    if (row.status === 'rejected') {
      return [{
        id: `sick-req-${row.id}`,
        type: 'leave_rejected',
        category: 'leave' as const,
        title: t('notifications.leaveRejectedTitle', vars),
        message: t('notifications.leaveRejectedMessage', vars),
        date: row.created_at,
        studentName: studentName || undefined,
      }];
    }
    return [];
  });
}

function isFocusedNotification(item: NotificationItem): boolean {
  if (item.category !== 'other') return true;
  return FOCUS_TYPES.has(item.type);
}

/** 合併各來源、去重、依時間排序。API 通知優先於同 id 的 client 合成項。 */
export function collectStudentNotifications(input: {
  apiNotifications: ApiNotification[];
  trials: TrialApplicationItem[];
  enrollments: EnrolledClass[];
  studentRequests?: StudentRequestRow[];
  studentName?: string;
  t: TFn;
}): NotificationItem[] {
  const { apiNotifications, trials, enrollments, studentRequests = [], studentName, t } = input;

  const fromApi = apiNotifications
    .filter((n) => n.type !== 'news')
    .map((n) => buildNotification(n, t))
    .filter(isFocusedNotification);

  const synthesized = [
    ...buildTrialApplicationNotifications(trials, t, studentName),
    ...buildLeaveNotificationsFromEnrollments(enrollments, t),
    ...buildExtensionNotificationsFromEnrollments(enrollments, t),
    ...buildNotificationsFromStudentRequests(studentRequests, t),
  ];

  const byId = new Map<string, NotificationItem>();
  synthesized.forEach((n) => byId.set(n.id, n));
  fromApi.forEach((n) => byId.set(n.id, n));

  return [...byId.values()].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/** @deprecated Use buildLeaveNotificationsFromEnrollments */
export function buildPendingLeaveNotifications(
  enrollments: EnrolledClass[],
  t: TFn,
): NotificationItem[] {
  return buildLeaveNotificationsFromEnrollments(enrollments, t).filter((n) => n.type === 'leave_pending');
}
