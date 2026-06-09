/**
 * PATCH /admin/trial-applications/:id — email context when status → confirmed.
 * Backend should send `trial_application_confirmed` using these fields (see TRIAL_SIGNUP_EMAIL_SPEC.md §12).
 */

export const TRIAL_CONFIRMED_EMAIL_TYPE = 'trial_application_confirmed' as const;

export type TrialConfirmedEmailContext = {
  applicant_name: string;
  applicant_email: string;
  applicant_phone?: string;
  contact_number?: string;
  trial_class: string;
  course_code?: string;
  preferred_datetime?: string;
  trial_date?: string;
  class_datetime?: string;
  class_datetime_formatted?: string;
  branch?: string;
  branch_label?: string;
  assigned_class_id?: string;
  assigned_class_name?: string;
};

export type TrialConfirmedPatchExtras = TrialConfirmedEmailContext & {
  sendConfirmationEmail: true;
  confirmationEmailType: typeof TRIAL_CONFIRMED_EMAIL_TYPE;
  language: string;
};

type TrialAppLike = {
  applicant_name: string;
  applicant_email: string;
  applicant_phone?: string;
  trial_class: string;
  course_code?: string | null;
  preferred_datetime?: string;
  trial_date?: string;
  branch?: string | null;
  assigned_class_id?: string | null;
  assigned_class_name?: string | null;
};

export function resolveTrialClassDatetimeIso(app: TrialAppLike): string | undefined {
  const preferred = String(app.preferred_datetime ?? '').trim();
  if (preferred) return preferred;
  const trialDate = String(app.trial_date ?? '').trim();
  return trialDate || undefined;
}

/** Build PATCH extras when admin sets status to confirmed (first time). */
export function buildTrialConfirmedEmailPatch(
  app: TrialAppLike,
  opts: {
    language: string;
    branchKey?: string | null;
    branchLabel: string;
    courseCode: string;
    classDatetimeFormatted: string;
  },
): TrialConfirmedPatchExtras | null {
  const email = String(app.applicant_email ?? '').trim();
  if (!email) return null;

  const phone = String(app.applicant_phone ?? '').trim();
  const classDatetime = resolveTrialClassDatetimeIso(app);

  return {
    sendConfirmationEmail: true,
    confirmationEmailType: TRIAL_CONFIRMED_EMAIL_TYPE,
    language: opts.language || 'zh-TW',
    applicant_name: String(app.applicant_name ?? '').trim(),
    applicant_email: email,
    ...(phone ? { applicant_phone: phone, contact_number: phone } : {}),
    trial_class: String(app.trial_class ?? '').trim(),
    ...(opts.courseCode && opts.courseCode !== '—' ? { course_code: opts.courseCode } : {}),
    ...(classDatetime ? { preferred_datetime: classDatetime, class_datetime: classDatetime } : {}),
    ...(app.trial_date ? { trial_date: app.trial_date } : {}),
    ...(opts.classDatetimeFormatted && opts.classDatetimeFormatted !== '—'
      ? { class_datetime_formatted: opts.classDatetimeFormatted }
      : {}),
    ...(opts.branchKey ? { branch: opts.branchKey } : {}),
    ...(opts.branchLabel && opts.branchLabel !== '—' ? { branch_label: opts.branchLabel } : {}),
    ...(app.assigned_class_id ? { assigned_class_id: String(app.assigned_class_id) } : {}),
    ...(app.assigned_class_name ? { assigned_class_name: app.assigned_class_name } : {}),
  };
}
