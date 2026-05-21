/** Minimal trial row fields used to match admin user list rows. */
export interface TrialApplicationRef {
  user_id?: string | null;
  applicant_email?: string | null;
  email?: string | null;
  applicant_phone?: string | null;
  mobile?: string | null;
  contact_number?: string | null;
  applicant_name?: string | null;
  student_name?: string | null;
  full_name?: string | null;
}

export interface UserTrialMatchFields {
  id: string;
  email?: string | null;
  mobile?: string | null;
  full_name?: string;
}

function digitsOnly(value: string | null | undefined): string {
  return String(value ?? '').replace(/\D/g, '');
}

function normalizeTrialRefs(raw: unknown[]): TrialApplicationRef[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => row as TrialApplicationRef);
}

/** Whether this user row has at least one trial application (by user_id, email, mobile, or student name). */
export function userHasTrialApplication(user: UserTrialMatchFields, trials: unknown[]): boolean {
  const refs = normalizeTrialRefs(trials);

  const email = (user.email ?? '').trim().toLowerCase();
  const mobile = digitsOnly(user.mobile);
  const name = (user.full_name ?? '').trim().toLowerCase();

  return refs.some((t) => {
    if (t.user_id && String(t.user_id) === user.id) return true;

    const trialEmail = String(t.applicant_email ?? t.email ?? '')
      .trim()
      .toLowerCase();
    if (email && trialEmail && email === trialEmail) return true;

    const trialMobile = digitsOnly(t.applicant_phone ?? t.mobile ?? t.contact_number);
    if (mobile && trialMobile && (mobile === trialMobile || mobile.endsWith(trialMobile) || trialMobile.endsWith(mobile))) {
      return true;
    }

    const trialName = String(t.applicant_name ?? t.student_name ?? t.full_name ?? '')
      .trim()
      .toLowerCase();
    if (name && trialName && (name === trialName || name.includes(trialName) || trialName.includes(name))) {
      return true;
    }

    return false;
  });
}

export function readHasTrialFromApi(raw: Record<string, unknown>): boolean {
  return (
    raw.has_trial_application === true ||
    raw.has_trial === true ||
    raw.trial_applied === true ||
    raw.has_trial_application === 1 ||
    raw.has_trial === 1
  );
}
