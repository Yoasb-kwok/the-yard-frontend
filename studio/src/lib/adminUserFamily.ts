/**
 * Admin 用戶管理：家長主帳戶（登入）與學員子帳戶（profiles）資料結構。
 */
import type { AgeTag, CourseLevel } from '../contexts/AuthContext';
import {
  normalizeAgeTag,
  normalizeDateOfBirth,
  normalizeLevel,
  normalizeResidentialDistrict,
  normalizeSex,
  readProfilesArray,
} from './adminUserFields';

export type FamilyProfileKind = 'parent' | 'student';

export interface AdminParentAccount {
  login_email: string | null;
  login_mobile: string | null;
  parents_name: string | null;
  contact_number: string | null;
  residential_district: string | null;
  country_code: string | null;
  /** 登入帳戶顯示名（users.full_name，可能為家長或首位學員） */
  account_display_name: string;
}

export interface AdminStudentProfile {
  id: string;
  full_name: string;
  student_id: string | null;
  nick_name: string | null;
  date_of_birth: string | null;
  sex: boolean | null;
  parents_name: string | null;
  contact_number: string | null;
  residential_district: string | null;
  level: CourseLevel | null;
  age_tag: AgeTag | null;
  mobile: string | null;
  id_card_last4: string | null;
  /** Per-student wallet (when backend scopes user_tokens by profile). */
  remaining_tokens?: number;
  assigned_tokens?: number;
  total_tokens?: number;
  token_expiry_date?: string | null;
  user_tokens?: unknown;
}

export interface AdminUserFamily {
  parent: AdminParentAccount;
  students: AdminStudentProfile[];
}

function toOptStr(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

function mapStudentProfile(
  raw: Record<string, unknown>,
  userFallback?: Record<string, unknown>,
): AdminStudentProfile {
  const idLast =
    toOptStr(raw.id_last_four) ??
    toOptStr(raw.id_card_last4) ??
    toOptStr(raw.hkid_last4) ??
    (userFallback
      ? toOptStr(userFallback.id_last_four ?? userFallback.id_card_last4 ?? userFallback.hkid_last4)
      : null);

  const dob =
    normalizeDateOfBirth(
      raw.date_of_birth ?? raw.dateOfBirth ?? raw.birth_date ?? raw.birthday ?? raw.dob,
    ) ??
    (userFallback
      ? normalizeDateOfBirth(
          userFallback.date_of_birth ??
            userFallback.dateOfBirth ??
            userFallback.birth_date ??
            userFallback.birthday,
        )
      : null);

  const sex =
    normalizeSex(raw.sex ?? raw.gender ?? raw.Gender) ??
    (userFallback ? normalizeSex(userFallback.sex ?? userFallback.gender) : null);

  const district =
    normalizeResidentialDistrict(raw.residential_district ?? raw.residentialDistrict) ??
    (userFallback
      ? normalizeResidentialDistrict(
          userFallback.residential_district ?? userFallback.residentialDistrict,
        )
      : null);

  const remainingRaw = Number(raw.remaining_tokens ?? raw.unassigned_tokens ?? raw.remainingTokens ?? NaN);
  const assignedRaw = Number(raw.assigned_tokens ?? raw.assignedTokens ?? NaN);
  const totalRaw = Number(raw.total_tokens ?? raw.totalTokens ?? NaN);

  return {
    id: String(raw.id ?? userFallback?.id ?? ''),
    full_name: toOptStr(raw.full_name) ?? toOptStr(raw.name) ?? toOptStr(userFallback?.full_name) ?? toOptStr(userFallback?.name) ?? '',
    student_id: toOptStr(raw.student_id ?? raw.studentId) ?? toOptStr(userFallback?.student_id),
    nick_name: toOptStr(raw.nick_name ?? raw.nickName),
    date_of_birth: dob,
    sex,
    parents_name: toOptStr(raw.parents_name ?? raw.parentsName),
    contact_number: toOptStr(raw.contact_number ?? raw.contactNumber),
    residential_district: district,
    level: normalizeLevel(raw.level),
    age_tag: normalizeAgeTag(raw.age_tag ?? raw.age_group ?? raw.ageTag),
    mobile: toOptStr(raw.mobile ?? raw.contact_number),
    id_card_last4: idLast,
    remaining_tokens: Number.isFinite(remainingRaw) && remainingRaw >= 0 ? remainingRaw : undefined,
    assigned_tokens: Number.isFinite(assignedRaw) && assignedRaw >= 0 ? assignedRaw : undefined,
    total_tokens: Number.isFinite(totalRaw) && totalRaw >= 0 ? totalRaw : undefined,
    token_expiry_date:
      toOptStr(raw.token_expiry_date ?? raw.tokenExpiryDate ?? raw.earliest_token_expiry) ?? null,
    user_tokens: raw.user_tokens ?? raw.userTokens,
  };
}

/** 從 GET /admin/users 單筆 user + profiles 組成家長／學員區塊。 */
export function buildAdminUserFamily(
  user: Record<string, unknown>,
  rawProfiles?: unknown,
): AdminUserFamily {
  const email = toOptStr(user.email);
  const mobile = toOptStr(user.mobile);
  const accountName = toOptStr(user.full_name) ?? toOptStr(user.name) ?? '';

  const profileRows = readProfilesArray(user, rawProfiles);

  const parentFromProfiles = profileRows.find((row) => {
    const r = row as Record<string, unknown>;
    const kind = String(r.profile_kind ?? r.profileKind ?? r.kind ?? '').toLowerCase();
    return kind === 'parent';
  }) as Record<string, unknown> | undefined;

  const studentRows = profileRows.filter((row) => {
    const r = row as Record<string, unknown>;
    const kind = String(r.profile_kind ?? r.profileKind ?? r.kind ?? 'student').toLowerCase();
    return kind !== 'parent';
  });

  const userFallback = user;
  const students =
    studentRows.length > 0
      ? studentRows
          .map((row) => mapStudentProfile(row as Record<string, unknown>, userFallback))
          .filter((p) => p.id && p.full_name)
      : [mapStudentProfile({ id: String(user.id ?? 'primary'), full_name: accountName }, userFallback)].filter(
          (p) => p.full_name,
        );

  const parentsName =
    toOptStr(user.parents_name ?? user.parentsName) ??
    toOptStr(parentFromProfiles?.full_name) ??
    (students.length === 1 ? toOptStr(students[0].parents_name) : null);

  const parent: AdminParentAccount = {
    login_email: email,
    login_mobile: mobile,
    parents_name: parentsName,
    contact_number:
      toOptStr(user.contact_number ?? user.contactNumber) ??
      toOptStr(parentFromProfiles?.contact_number) ??
      mobile,
    residential_district:
      normalizeResidentialDistrict(
        user.residential_district ?? user.residentialDistrict ?? parentFromProfiles?.residential_district,
      ) ??
      (students.length > 0 ? students[0].residential_district : null),
    country_code: toOptStr(user.country_code ?? user.countryCode),
    account_display_name: accountName,
  };

  return { parent, students };
}

export function formatSexLabel(
  sex: boolean | null,
  t: (key: string, opts?: { defaultValue?: string }) => string,
): string {
  if (sex == null) return '—';
  return sex ? t('profile.male', { defaultValue: '男' }) : t('profile.female', { defaultValue: '女' });
}

export function formatStudentLevelLabel(
  level: CourseLevel | null,
  t: (key: string, opts?: { defaultValue?: string }) => string,
): string {
  if (!level) return '—';
  const key = `calendar.level.${level}`;
  const label = t(key);
  return label !== key ? label : level;
}

export function formatStudentAgeLabel(
  student: Pick<AdminStudentProfile, 'age_tag' | 'date_of_birth'>,
  t: (key: string, opts?: { defaultValue?: string }) => string,
  getAgeFromDob: (dob: string) => number | null,
): string {
  if (student.age_tag) {
    const key = `calendar.ageTag.${student.age_tag}`;
    const label = t(key);
    if (label !== key) return label;
  }
  if (student.date_of_birth) {
    const age = getAgeFromDob(student.date_of_birth);
    if (age != null) {
      return `${age}${t('calendar.ageTag.yearsOld', { defaultValue: '歲' })}`;
    }
  }
  return '—';
}
