/** API field names for per-student (profile) scope. */

export function pickStudentProfileId(
  raw: Record<string, unknown> | null | undefined,
): string | null {
  if (!raw) return null;
  for (const key of [
    'student_profile_id',
    'studentProfileId',
    'profile_id',
    'profileId',
  ] as const) {
    const v = raw[key];
    if (v != null && String(v).trim() && String(v) !== '0') return String(v).trim();
  }
  return null;
}

export function withStudentProfileQuery(
  params: Record<string, string> | undefined,
  profileId: string | null | undefined,
): Record<string, string> | undefined {
  const id = profileId?.trim();
  if (!id) return params;
  return {
    ...params,
    profile_id: id,
    student_profile_id: id,
  };
}

export function filterUserTokensByProfile<T>(raw: T, profileId: string | null | undefined): T {
  const id = profileId?.trim();
  if (!id || !Array.isArray(raw)) return raw;
  return raw.filter((item) => {
    const row = item as Record<string, unknown>;
    const rowProfile = pickStudentProfileId(row);
    return !rowProfile || rowProfile === id;
  }) as T;
}
