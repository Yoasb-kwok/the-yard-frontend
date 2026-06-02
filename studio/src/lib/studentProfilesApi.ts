import { api, type ApiResponse } from './api';
import type { AgeTag, CourseLevel } from '../contexts/AuthContext';

/** Temporary id for unsaved student rows in admin edit modal. */
export const NEW_STUDENT_PROFILE_ID_PREFIX = '__new__:';

export function isNewStudentProfileId(id: string | undefined | null): boolean {
  if (!id?.trim()) return true;
  return id.startsWith(NEW_STUDENT_PROFILE_ID_PREFIX);
}

export function newStudentProfileTempId(): string {
  return `${NEW_STUDENT_PROFILE_ID_PREFIX}${Date.now()}`;
}

export interface CreateStudentProfileFields {
  full_name: string;
  date_of_birth?: string | null;
  sex?: boolean | null;
  parents_name?: string | null;
  contact_number?: string | null;
  residential_district?: string | null;
  level?: CourseLevel | string | null;
  age_tag?: AgeTag | null;
  id_card_last4?: string | null;
  nick_name?: string | null;
  has_joined_courses?: boolean | null;
}

/** Body for POST /profiles or POST /admin/users/:id/student-profiles */
export function buildCreateStudentProfileBody(
  data: CreateStudentProfileFields,
  options?: {
    userId?: string | number | null;
    parentDefaults?: {
      parents_name?: string | null;
      contact_number?: string | null;
      residential_district?: string | null;
    };
  },
): Record<string, unknown> {
  const parent = options?.parentDefaults;
  const contact =
    data.contact_number?.trim() || parent?.contact_number?.trim() || null;
  const body: Record<string, unknown> = {
    full_name: data.full_name.trim(),
    date_of_birth: data.date_of_birth?.trim() || null,
    sex: data.sex ?? null,
    parents_name: data.parents_name?.trim() || parent?.parents_name?.trim() || null,
    contact_number: contact,
    residential_district: data.residential_district || parent?.residential_district || null,
    level: data.level || null,
    age_tag: data.age_tag || null,
    age_group: data.age_tag || null,
    profile_kind: 'student',
  };
  if (data.nick_name !== undefined) body.nick_name = data.nick_name?.trim() || null;
  if (data.has_joined_courses !== undefined) body.has_joined_courses = data.has_joined_courses;
  const idLast = data.id_card_last4?.trim();
  if (idLast) {
    body.id_card_last4 = idLast;
    body.id_last_four = idLast;
  }
  if (options?.userId != null && options.userId !== '') {
    const uid = options.userId;
    const asNum = typeof uid === 'number' ? uid : Number(uid);
    body.user_id = Number.isFinite(asNum) && String(asNum) === String(uid) ? asNum : uid;
  }
  return body;
}

/** PATCH /admin/users/:id — existing profiles include id; new rows omit id. */
export function buildAdminStudentProfilePatchRow(
  row: CreateStudentProfileFields & { id: string },
): Record<string, unknown> {
  const payload = buildCreateStudentProfileBody(row);
  if (!isNewStudentProfileId(row.id)) {
    return { id: row.id, ...payload };
  }
  return payload;
}

export type StudentProfileParentDefaults = {
  parents_name?: string | null;
  contact_number?: string | null;
  residential_district?: string | null;
};

export async function createAdminStudentProfile(
  userId: string,
  data: CreateStudentProfileFields,
  parentDefaults?: StudentProfileParentDefaults,
): Promise<ApiResponse<unknown>> {
  const body = buildCreateStudentProfileBody(data, { parentDefaults });
  return api.post<unknown>(`admin/users/${userId}/student-profiles`, body);
}

export async function createStudentProfile(
  data: CreateStudentProfileFields,
  userId: string,
  parentDefaults?: StudentProfileParentDefaults,
): Promise<ApiResponse<unknown>> {
  const body = buildCreateStudentProfileBody(data, { userId, parentDefaults });
  return api.post<unknown>('profiles', body);
}

export function extractProfileFromCreateResponse(res: ApiResponse<unknown>): Record<string, unknown> | null {
  const raw =
    (res as { profile?: unknown }).profile ??
    res.data ??
    (res as { data?: { profile?: unknown } }).data;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const nested = (raw as { profile?: unknown }).profile;
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      return nested as Record<string, unknown>;
    }
    return raw as Record<string, unknown>;
  }
  return null;
}
