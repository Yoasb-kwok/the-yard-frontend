/** Row shape needed to detect duplicate email / login username in admin user edit. */
export type UserIdentityRow = {
  id: string;
  email?: string | null;
  username?: string | null;
};

/** Login username shown in admin list (explicit username, else email local-part). */
export function effectiveLoginUsername(user: UserIdentityRow): string | null {
  const explicit = (user.username ?? '').trim();
  if (explicit) return explicit.toLowerCase();
  const email = (user.email ?? '').trim().toLowerCase();
  if (!email) return null;
  return email.includes('@') ? email.split('@')[0] : email;
}

/** Username that would apply after save (explicit field, else derived from email). */
export function resolveUsernameForCheck(email: string, username: string): string {
  const explicit = username.trim();
  if (explicit) return explicit.toLowerCase();
  const e = email.trim().toLowerCase();
  if (!e) return '';
  return e.includes('@') ? e.split('@')[0] : e;
}

export type EditUserDuplicateField = 'email' | 'username';

export function findEditUserDuplicateFields(
  users: UserIdentityRow[],
  excludeUserId: string,
  email: string,
  username: string,
): Set<EditUserDuplicateField> {
  const dup = new Set<EditUserDuplicateField>();
  const emailNorm = email.trim().toLowerCase();
  if (
    emailNorm &&
    users.some((u) => u.id !== excludeUserId && (u.email?.trim().toLowerCase() ?? '') === emailNorm)
  ) {
    dup.add('email');
  }
  const loginName = resolveUsernameForCheck(email, username);
  if (
    loginName &&
    users.some((u) => {
      if (u.id === excludeUserId) return false;
      const eff = effectiveLoginUsername(u);
      return eff != null && eff === loginName;
    })
  ) {
    dup.add('username');
  }
  return dup;
}
