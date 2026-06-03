/**
 * Public instructor list — GET /api/instructors (no auth).
 * Admin CRUD remains under /api/admin/instructors.
 */

import { api } from './api';
import type { InstructorProfile } from './instructorProfiles';

export type PublicInstructorRow = {
  id: string;
  name: string;
  profile_image_url: string | null;
  profile: InstructorProfile;
};

const PUBLIC_ENDPOINTS = ['/instructors', '/public/instructors'] as const;

function parseAwards(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((a) => String(a).trim()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(/[\n,，]+/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/** Map one API instructor row to display profile (public + admin list). */
export function instructorProfileFromApiRow(
  row: Record<string, unknown>,
  fallbackName?: string,
): InstructorProfile {
  const name = String(row.name ?? row.full_name ?? fallbackName ?? '').trim();
  const introLegacy = String(
    row.intro ?? row.bio ?? row.description ?? '',
  ).trim();
  const avatar =
    String(row.profile_image_url ?? row.profileImageUrl ?? row.avatar_url ?? row.avatarUrl ?? '').trim() ||
    undefined;
  const bg = String(row.background_image ?? row.backgroundImage ?? '').trim() || undefined;

  return {
    name,
    intro: introLegacy || String(row.intro_zh_tw ?? row.introZhTw ?? '').trim(),
    intro_zh_tw: String(row.intro_zh_tw ?? row.introZhTw ?? '').trim() || undefined,
    intro_zh_cn: String(row.intro_zh_cn ?? row.introZhCn ?? '').trim() || undefined,
    intro_en: String(row.intro_en ?? row.introEn ?? '').trim() || undefined,
    awards: parseAwards(row.awards),
    years_dancing: Number(row.years_dancing ?? row.yearsDancing ?? 0) || 0,
    teaching_experience: Number(row.teaching_experience ?? row.teachingExperience ?? 0) || 0,
    dance_school: String(row.dance_school ?? row.danceSchool ?? '').trim(),
    icon: row.icon != null ? String(row.icon) : undefined,
    background_image: bg,
    avatar_url: avatar,
  };
}

function extractInstructorList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as Record<string, unknown>;
  const candidates = [root.data, root.instructors, root.items];
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }
  return [];
}

export function normalizePublicInstructorRow(raw: unknown): PublicInstructorRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const name = String(row.name ?? row.full_name ?? '').trim();
  if (!name) return null;
  const id = String(row.id ?? row.instructor_id ?? name).trim();
  const profile = instructorProfileFromApiRow(row, name);
  const profile_image_url =
    String(row.profile_image_url ?? row.profileImageUrl ?? profile.avatar_url ?? '').trim() || null;
  return { id, name, profile_image_url, profile };
}

/** Body for admin create/update when backend persists public profile fields. */
export function instructorProfileToApiBody(profile: InstructorProfile, form: {
  name: string;
  profile_image_url: string;
}): Record<string, unknown> {
  return {
    name: form.name.trim(),
    profile_image_url: form.profile_image_url?.trim() || null,
    intro: profile.intro,
    intro_zh_tw: profile.intro_zh_tw ?? null,
    intro_zh_cn: profile.intro_zh_cn ?? null,
    intro_en: profile.intro_en ?? null,
    awards: profile.awards,
    years_dancing: profile.years_dancing,
    teaching_experience: profile.teaching_experience,
    dance_school: profile.dance_school || null,
    background_image: profile.background_image ?? null,
    avatar_url: profile.avatar_url ?? null,
  };
}

export async function fetchPublicInstructors(): Promise<{
  instructors: PublicInstructorRow[];
  loadFailed: boolean;
}> {
  for (const endpoint of PUBLIC_ENDPOINTS) {
    try {
      const res = await api.get<unknown>(endpoint);
      if (res.success === false) continue;
      const list = extractInstructorList(res.data ?? res).map(normalizePublicInstructorRow).filter(
        (r): r is PublicInstructorRow => r != null,
      );
      return { instructors: list, loadFailed: false };
    } catch {
      // try next public path
    }
  }
  return { instructors: [], loadFailed: true };
}
