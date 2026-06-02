import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, ApiError, type ApiResponse } from '../lib/api';
import { createStudentProfile, extractProfileFromCreateResponse } from '../lib/studentProfilesApi';

export type CourseLevel = 'entry' | 'intermediate' | 'advanced';

/** Age ranges for students and courses: 5-8, 9-12, 13-16 */
export type AgeTag = '5-8' | '9-12' | '13-16';

interface Profile {
  id: string;
  full_name: string;
  nick_name: string | null;
  date_of_birth: string | null;
  sex: boolean | null;
  parents_name: string | null;
  contact_number: string | null;
  residential_district: string | null;
  has_joined_courses: boolean | null;
  student_id: string | null;
  role: 'student' | 'admin';
  mobile: string | null;
  id_first_four: string | null;
  level: CourseLevel | null;
}

interface User {
  id: string;
  email: string;
  mobile?: string | null;
}

interface Session {
  user: User;
}

/** Data for adding a new family member. full_name required; others optional. */
export interface AddProfileData {
  full_name: string;
  nick_name?: string | null;
  date_of_birth?: string | null;
  sex?: boolean | null;
  parents_name?: string | null;
  contact_number?: string | null;
  residential_district?: string | null;
  has_joined_courses?: boolean | null;
  level?: CourseLevel | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  /** All profiles for this account (main + sub-accounts). Use when profiles.length > 1 for family switcher. */
  profiles: Profile[];
  /** Id of the currently active profile (for sub-account switching). */
  activeProfileId: string | null;
  /** Switch active profile (e.g. to another family member). No-op if id not in profiles. */
  switchProfile: (profileId: string) => void;
  /** Add a new family member (sub-account). Persists via POST /profiles when logged in with API. */
  addProfile: (data: AddProfileData) => Promise<void>;
  /** Update an existing family member (persists via PATCH /profiles/:id or /profiles/me). */
  updateProfile: (profileId: string, data: Partial<AddProfileData>) => Promise<void>;
  /** Remove a family member. Cannot remove the first profile. Persists via DELETE /profiles/:id when logged in with API. */
  deleteProfile: (profileId: string) => Promise<void>;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ requirePasswordChange?: boolean } | void>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    nickName: string | null,
    dateOfBirth: string | null,
    sex: boolean | null,
    parentsName: string | null,
    contactNumber: string | null,
    residentialDistrict: string | null,
    hasJoinedCourses: boolean | null,
    extra?: { idLastFour: string; countryCode: string; mobile: string }
  ) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  /** True when backend requires user to change password (e.g. after trial signup). */
  requirePasswordChange: boolean;
  /** Refresh user and profiles from API (e.g. after updating email/mobile). */
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const STUDENT_ID_PREFIX = 'std';
const STUDENT_ID_COUNTER_KEY = 'studio_student_id_counter';
const STUDENT_ID_BASE_WIDTH = 5;
let hasWarnedMissingAuthProvider = false;

const fallbackAuthContext: AuthContextType = {
  user: null,
  profile: null,
  profiles: [],
  activeProfileId: null,
  switchProfile: () => {},
  addProfile: async () => {},
  updateProfile: async () => {},
  deleteProfile: async () => {},
  session: null,
  loading: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  isAdmin: false,
  requirePasswordChange: false,
  refreshMe: async () => {},
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);

  // Derive active profile from profiles + activeProfileId
  const profile =
    profiles && activeProfileId
      ? profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null
      : profiles?.[0] ?? null;

  useEffect(() => {
    const STORAGE_KEY_SERVER_ID = 'studio_backend_server_id';
    const token = localStorage.getItem('token');
    async function restoreSession() {
      if (token) {
        if (token.startsWith('sheet_')) {
          localStorage.removeItem('auth_session');
          localStorage.removeItem('token');
          setLoading(false);
          return;
        }
        try {
          const healthRes = await api.get<{ ok?: boolean; serverId?: string }>('health');
          const currentServerId = (healthRes as any).serverId ?? (healthRes as any).data?.serverId;
          if (currentServerId) {
            const storedServerId = sessionStorage.getItem(STORAGE_KEY_SERVER_ID);
            if (storedServerId != null && storedServerId !== currentServerId) {
              localStorage.removeItem('token');
              localStorage.removeItem('auth_session');
              sessionStorage.removeItem(STORAGE_KEY_SERVER_ID);
              setUser(null);
              setProfiles(null);
              setActiveProfileId(null);
              setSession(null);
              setLoading(false);
              return;
            }
            sessionStorage.setItem(STORAGE_KEY_SERVER_ID, currentServerId);
          }
          const res = await api.get<{ user: { id: string; email: string }; profiles: Profile[]; requirePasswordChange?: boolean }>('auth/me');
          const userFromMe = (res as any).user ?? (res as any).data?.user;
          const profilesFromMe = (res as any).profiles ?? (res as any).data?.profiles;
          if ((res as any).requirePasswordChange !== undefined) {
            setRequirePasswordChange((res as any).requirePasswordChange === true);
          }
          if (res.success && userFromMe && Array.isArray(profilesFromMe) && profilesFromMe.length) {
          const u = userFromMe;
          const p = profilesFromMe;
          const userObj: User = { id: u.id, email: u.email, mobile: u.mobile ?? null };
            const sessionObj: Session = { user: userObj };
            setUser(userObj);
            setProfiles(p);
            setActiveProfileId(p[0]?.id ?? null);
            setSession(sessionObj);
            persistSession({
              user: userObj,
              profiles: p,
              activeProfileId: p[0]?.id ?? null,
              session: sessionObj,
            });
            setLoading(false);
            return;
          }
        } catch (e) {
          // Only drop JWT on real 401; keep token on network/gateway errors so admin APIs still work after refresh.
          if (e instanceof ApiError && e.status === 401) {
            localStorage.removeItem('token');
          }
        }
      }
      const stored = localStorage.getItem('auth_session');
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as {
            user?: User;
            session?: Session | null;
            profiles?: Profile[];
            profile?: Profile;
            activeProfileId?: string;
            authToken?: string;
          };
          if (parsed.authToken && typeof parsed.authToken === 'string') {
            localStorage.setItem('token', parsed.authToken);
          }
          setUser(parsed.user);
          setSession(parsed.session ?? null);
          if (parsed.profiles && Array.isArray(parsed.profiles)) {
            setProfiles(parsed.profiles);
            setActiveProfileId(parsed.activeProfileId ?? parsed.profiles[0]?.id ?? null);
          } else if (parsed.profile) {
            const profs = [parsed.profile];
            setProfiles(profs);
            setActiveProfileId(parsed.profile.id);
            try {
              const tok = parsed.authToken ?? localStorage.getItem('token');
              localStorage.setItem('auth_session', JSON.stringify({
                ...parsed,
                profiles: profs,
                activeProfileId: parsed.profile.id,
                profile: undefined,
                ...(tok ? { authToken: tok } : {}),
              }));
            } catch (_) {}
          } else {
            setProfiles(null);
            setActiveProfileId(null);
          }
        } catch (error) {
          console.error('Error parsing stored session:', error);
          localStorage.removeItem('auth_session');
        }
      }
      setLoading(false);
    }
    restoreSession();
  }, []);

  function persistSession(payload: {
    user: User;
    profiles: Profile[];
    activeProfileId: string;
    session: Session;
    /** When set (including null), overrides localStorage token for backup; when omitted, keeps current token in auth_session. */
    authToken?: string | null;
  }) {
    const { authToken: explicit, ...core } = payload;
    const token =
      explicit !== undefined ? explicit : localStorage.getItem('token');
    const serial = { ...core, ...(token ? { authToken: String(token) } : {}) };
    localStorage.setItem('auth_session', JSON.stringify(serial));
    if (token) localStorage.setItem('token', String(token));
    if (explicit === null) localStorage.removeItem('token');
  }

  function switchProfile(profileId: string) {
    if (!profiles?.some((p) => p.id === profileId)) return;
    setActiveProfileId(profileId);
    const stored = localStorage.getItem('auth_session');
    if (stored) {
      try {
        const p = JSON.parse(stored);
        p.activeProfileId = profileId;
        localStorage.setItem('auth_session', JSON.stringify(p));
      } catch (_) {}
    }
  }

  function mapApiProfile(raw: Record<string, unknown>): Profile {
    const levelRaw = raw.level;
    const level =
      levelRaw === 'entry' || levelRaw === 'intermediate' || levelRaw === 'advanced'
        ? levelRaw
        : null;
    const sexRaw = raw.sex ?? raw.gender;
    const sex =
      typeof sexRaw === 'boolean'
        ? sexRaw
        : sexRaw === 1 || sexRaw === '1' || sexRaw === 'true' || sexRaw === 'male'
          ? true
          : sexRaw === 0 || sexRaw === '0' || sexRaw === 'false' || sexRaw === 'female'
            ? false
            : null;
    const contact =
      raw.contact_number != null
        ? String(raw.contact_number)
        : raw.contactNumber != null
          ? String(raw.contactNumber)
          : raw.mobile != null
            ? String(raw.mobile)
            : null;
    return {
      id: String(raw.id ?? ''),
      full_name: String(raw.full_name ?? raw.fullName ?? raw.name ?? '').trim(),
      nick_name:
        raw.nick_name != null
          ? String(raw.nick_name)
          : raw.nickName != null
            ? String(raw.nickName)
            : null,
      date_of_birth:
        raw.date_of_birth != null
          ? String(raw.date_of_birth).slice(0, 10)
          : raw.dateOfBirth != null
            ? String(raw.dateOfBirth).slice(0, 10)
            : null,
      sex,
      parents_name:
        raw.parents_name != null
          ? String(raw.parents_name)
          : raw.parentsName != null
            ? String(raw.parentsName)
            : null,
      contact_number: contact,
      residential_district:
        raw.residential_district != null
          ? String(raw.residential_district)
          : raw.residentialDistrict != null
            ? String(raw.residentialDistrict)
            : null,
      has_joined_courses:
        raw.has_joined_courses === true ||
        raw.has_joined_courses === 1 ||
        raw.hasJoinedCourses === true ||
        raw.hasJoinedCourses === 1
          ? true
          : raw.has_joined_courses === false ||
              raw.has_joined_courses === 0 ||
              raw.hasJoinedCourses === false ||
              raw.hasJoinedCourses === 0
            ? false
            : null,
      student_id:
        raw.student_id != null
          ? String(raw.student_id)
          : raw.studentId != null
            ? String(raw.studentId)
            : null,
      role: raw.role === 'admin' ? 'admin' : 'student',
      mobile: contact,
      id_first_four:
        raw.id_first_four != null
          ? String(raw.id_first_four)
          : raw.idFirstFour != null
            ? String(raw.idFirstFour)
            : null,
      level,
    };
  }

  function extractCreatedProfile(res: ApiResponse<unknown>): Profile | null {
    const payload = extractProfileFromCreateResponse(res);
    if (payload) {
      const mapped = mapApiProfile(payload);
      if (mapped.id && mapped.full_name) return mapped;
    }
    return null;
  }

  async function addProfile(data: AddProfileData) {
    if (!profiles?.length || !user || !session) return;
    const name = data.full_name.trim();
    if (!name) throw new Error('Full name is required');

    const main = profiles[0];
    const token = localStorage.getItem('token');
    const keepActive = activeProfileId ?? main.id;

    if (token && !token.startsWith('sheet_')) {
      const res = await createStudentProfile(
        {
          full_name: name,
          nick_name: data.nick_name,
          date_of_birth: data.date_of_birth,
          sex: data.sex,
          parents_name: data.parents_name,
          contact_number: data.contact_number,
          residential_district: data.residential_district,
          has_joined_courses: data.has_joined_courses,
          level: data.level,
        },
        user.id,
        {
          parents_name: main.parents_name,
          contact_number: main.contact_number ?? main.mobile,
          residential_district: main.residential_district,
        },
      );
      if (res.success === false) {
        throw new Error(res.msg || res.message || 'Failed to add family member');
      }
      try {
        await refreshMePreservingActive(keepActive);
        return;
      } catch (_) {
        const created = extractCreatedProfile(res);
        if (created) {
          const next = [...profiles, created];
          setProfiles(next);
          persistSession({
            user,
            profiles: next,
            activeProfileId: keepActive,
            session,
          });
          return;
        }
        throw new Error('Family member created but profile list could not be refreshed');
      }
    }

    // Offline / sheet demo token: local-only fallback
    const contact = data.contact_number ?? main.contact_number ?? main.mobile;
    const newProfile: Profile = {
      id: `${main.id}-sub-${Date.now()}`,
      full_name: name,
      nick_name: data.nick_name ?? null,
      date_of_birth: data.date_of_birth ?? null,
      sex: data.sex ?? null,
      parents_name: data.parents_name ?? null,
      contact_number: data.contact_number ?? null,
      residential_district: data.residential_district ?? null,
      has_joined_courses: data.has_joined_courses ?? null,
      student_id: generateStudentIdForFamily(profiles),
      role: 'student',
      mobile: contact,
      id_first_four: null,
      level: data.level ?? null,
    };
    const next = [...profiles, newProfile];
    setProfiles(next);
    persistSession({
      user,
      profiles: next,
      activeProfileId: keepActive,
      session,
    });
  }

  async function updateProfile(profileId: string, data: Partial<AddProfileData>) {
    if (!profiles?.length || !user || !session) return;

    const patchBody: Record<string, unknown> = {};
    if (data.full_name !== undefined) {
      const name = data.full_name.trim();
      if (!name) throw new Error('Full name is required');
      patchBody.full_name = name;
    }
    if (data.date_of_birth !== undefined) patchBody.date_of_birth = data.date_of_birth || null;
    if (data.sex !== undefined) patchBody.sex = data.sex;
    if (data.residential_district !== undefined) {
      patchBody.residential_district = data.residential_district || null;
    }
    if (data.has_joined_courses !== undefined) patchBody.has_joined_courses = data.has_joined_courses;
    if (data.parents_name !== undefined) patchBody.parents_name = data.parents_name;
    if (data.contact_number !== undefined) patchBody.contact_number = data.contact_number;
    if (data.nick_name !== undefined) patchBody.nick_name = data.nick_name;
    if (data.level !== undefined) patchBody.level = data.level;

    const token = localStorage.getItem('token');
    if (token && !token.startsWith('sheet_') && Object.keys(patchBody).length > 0) {
      const endpoints =
        profileId === profiles[0]?.id
          ? [`profiles/${profileId}`, 'profiles/me']
          : [`profiles/${profileId}`];
      let saved = false;
      let lastError: unknown;
      for (const endpoint of endpoints) {
        try {
          const res = await api.patch(endpoint, patchBody);
          if (res.success) {
            saved = true;
            break;
          }
          lastError = new Error(res.msg || 'Update failed');
        } catch (err) {
          lastError = err;
          if (err instanceof ApiError && err.status === 404) continue;
          throw err;
        }
      }
      if (!saved && lastError) {
        throw lastError instanceof Error ? lastError : new Error('Update failed');
      }
    }

    const updated = profiles.map((p) => {
      if (p.id !== profileId) return p;
      const contact = data.contact_number !== undefined ? data.contact_number : p.contact_number;
      return {
        ...p,
        ...data,
        id: p.id,
        student_id: p.student_id,
        role: p.role,
        mobile: contact ?? p.mobile,
      } as Profile;
    });
    if (updated.every((p, i) => p === profiles[i])) return;
    const nextActive = activeProfileId ?? profiles[0].id;
    setProfiles(updated);
    persistSession({
      user,
      profiles: updated,
      activeProfileId: nextActive,
      session,
    });

    if (token && !token.startsWith('sheet_')) {
      try {
        await refreshMePreservingActive(nextActive);
      } catch (_) {
        // Local state already updated
      }
    }
  }

  async function deleteProfile(profileId: string) {
    if (!profiles?.length || !user || !session) return;
    const mainId = profiles[0]?.id;
    if (profileId === mainId) return; // cannot delete first profile

    const token = localStorage.getItem('token');
    const nextActiveGuess = activeProfileId === profileId ? (profiles[1]?.id ?? mainId) : activeProfileId;

    if (token && !token.startsWith('sheet_')) {
      const res = await api.delete(`profiles/${profileId}`);
      if (res.success === false) {
        throw new Error(res.msg || res.message || 'Failed to remove family member');
      }
      try {
        await refreshMePreservingActive(nextActiveGuess);
        return;
      } catch (_) {
        // fall through to local removal
      }
    }

    const next = profiles.filter((p) => p.id !== profileId);
    const nextActive = activeProfileId === profileId ? (next[0]?.id ?? mainId) : activeProfileId;
    setProfiles(next);
    setActiveProfileId(nextActive);
    persistSession({
      user,
      profiles: next,
      activeProfileId: nextActive ?? mainId!,
      session,
    });
  }

  async function signIn(loginIdentifier: string, password: string) {
    // API login with JWT – database accounts
    try {
      const res = await api.post<{ token?: string; user?: any }>('user/login', {
        loginIdentifier,
        password,
        rememberMe: true,
      });
      const loginBody =
        (res as { data?: { token?: string; user?: any } }).data &&
        typeof (res as { data?: { token?: string; user?: any } }).data === 'object'
          ? (res as { data: { token?: string; user?: any } }).data
          : res;
      const jwt = loginBody.token ?? (res as { token?: string }).token;
      const u = loginBody.user ?? (res as { user?: any }).user;
      if (res.success && jwt && u) {
        const needPasswordChange =
          (res as { requirePasswordChange?: boolean }).requirePasswordChange === true ||
          (loginBody as { requirePasswordChange?: boolean }).requirePasswordChange === true;
        setRequirePasswordChange(needPasswordChange);
        localStorage.setItem('token', jwt);
        try {
          const h = await api.get<{ serverId?: string }>('health');
          const sid = (h as any).serverId ?? (h as any).data?.serverId;
          if (sid) sessionStorage.setItem('studio_backend_server_id', sid);
        } catch (_) {}
        const userObj: User = { id: String(u.ID ?? u.id), email: u.email ?? loginIdentifier };
        try {
          const meRes = await api.get<{ user: { id: string; email: string }; profiles: Profile[]; requirePasswordChange?: boolean }>('auth/me');
          const profilesFromMe = (meRes as any).profiles ?? (meRes as any).data?.profiles;
          if ((meRes as any).requirePasswordChange !== undefined) {
            setRequirePasswordChange((meRes as any).requirePasswordChange === true);
          }
          if (meRes.success && Array.isArray(profilesFromMe) && profilesFromMe.length) {
            const sessionObj: Session = { user: userObj };
            setUser(userObj);
            setProfiles(profilesFromMe);
            setActiveProfileId(profilesFromMe[0]?.id ?? null);
            setSession(sessionObj);
            persistSession({
              user: userObj,
              profiles: profilesFromMe,
              activeProfileId: profilesFromMe[0]?.id ?? null,
              session: sessionObj,
              authToken: jwt,
            });
            return { requirePasswordChange: needPasswordChange || (meRes as any).requirePasswordChange === true };
          }
        } catch {
          // /me failed; use single profile from login response
        }
        const mainProfile: Profile = {
          id: userObj.id,
          full_name: u.name ?? u.username ?? userObj.email,
          role: u.role === 'admin' || (u.name && String(u.name).includes('管理')) ? 'admin' : 'student',
          mobile: u.mobile ?? null,
          id_first_four: u.id_first_four ?? null,
          student_id: u.student_id ?? null,
          nick_name: null,
          date_of_birth: null,
          sex: null,
          parents_name: null,
          contact_number: u.mobile ?? null,
          residential_district: null,
          has_joined_courses: null,
          level: null,
        };
        const sessionObj: Session = { user: userObj };
        setUser(userObj);
        setProfiles([mainProfile]);
        setActiveProfileId(mainProfile.id);
        setSession(sessionObj);
        persistSession({
          user: userObj,
          profiles: [mainProfile],
          activeProfileId: mainProfile.id,
          session: sessionObj,
          authToken: jwt,
        });
        return { requirePasswordChange: needPasswordChange };
      }
    } catch (apiErr) {
      if (apiErr instanceof ApiError && apiErr.status === 401) {
        throw new Error('Invalid email or password');
      }
      throw apiErr instanceof Error ? apiErr : new Error('Login failed');
    }

    throw new Error('Invalid email or password');
  }

  function parseStudentIdParts(value: unknown): { base: number; suffix: string } | null {
    if (typeof value !== 'string') return null;
    const raw = value.trim();
    const m = raw.match(/^std(\d{5})([A-Z])$/i);
    if (m) {
      const base = Number(m[1]);
      if (Number.isFinite(base) && base > 0) {
        return { base, suffix: m[2].toUpperCase() };
      }
    }
    const legacy = raw.toLowerCase().match(/^yayakid(\d+)$/);
    if (!legacy) return null;
    const n = Number(legacy[1]);
    return Number.isFinite(n) && n > 0 ? { base: n, suffix: 'A' } : null;
  }

  function formatStudentId(base: number, suffix: string): string {
    return `${STUDENT_ID_PREFIX}${String(base).padStart(STUDENT_ID_BASE_WIDTH, '0')}${suffix}`;
  }

  function nextSuffixLetter(used: Set<string>): string {
    for (let i = 0; i < 26; i += 1) {
      const letter = String.fromCharCode(65 + i);
      if (!used.has(letter)) return letter;
    }
    return 'Z';
  }

  function getNextStudentBaseNumber(): number {
    let maxBase = 0;
    const fromCounter = Number(localStorage.getItem(STUDENT_ID_COUNTER_KEY) || '0');
    if (Number.isFinite(fromCounter) && fromCounter > maxBase) {
      maxBase = fromCounter;
    }

    const fromProfiles = (profiles ?? [])
      .map((p) => parseStudentIdParts(p.student_id))
      .filter((x): x is { base: number; suffix: string } => x != null)
      .map((x) => x.base);
    if (fromProfiles.length > 0) {
      maxBase = Math.max(maxBase, ...fromProfiles);
    }

    try {
      const stored = localStorage.getItem('auth_session');
      if (stored) {
        const parsed = JSON.parse(stored) as { profiles?: Array<{ student_id?: string | null }> };
        const fromStored = (parsed.profiles ?? [])
          .map((p) => parseStudentIdParts(p.student_id))
          .filter((x): x is { base: number; suffix: string } => x != null)
          .map((x) => x.base);
        if (fromStored.length > 0) {
          maxBase = Math.max(maxBase, ...fromStored);
        }
      }
    } catch (_) {}

    const next = maxBase + 1;
    localStorage.setItem(STUDENT_ID_COUNTER_KEY, String(next));
    return next;
  }

  // Student ID format: std00001A; same family shares base and increments suffix A/B/C.
  function generateStudentIdForFamily(existingProfiles: Profile[] = []): string {
    const parsed = existingProfiles
      .map((p) => parseStudentIdParts(p.student_id))
      .filter((x): x is { base: number; suffix: string } => x != null);
    if (parsed.length === 0) {
      const base = getNextStudentBaseNumber();
      return formatStudentId(base, 'A');
    }
    const familyBase = parsed[0].base;
    const usedSuffix = new Set(parsed.filter((x) => x.base === familyBase).map((x) => x.suffix));
    const suffix = nextSuffixLetter(usedSuffix);
    return formatStudentId(familyBase, suffix);
  }

  async function signUp(
    email: string,
    password: string,
    fullName: string,
    nickName: string | null,
    dateOfBirth: string | null,
    sex: boolean | null,
    parentsName: string | null,
    contactNumber: string | null,
    residentialDistrict: string | null,
    hasJoinedCourses: boolean | null,
    extra?: { idLastFour: string; countryCode: string; mobile: string }
  ) {
    const normalizedEmail = email.trim().toLowerCase();
    const confirmPassword = password;
    const body: Record<string, string | boolean | null> = {
      email: normalizedEmail,
      password,
      confirmPassword,
      fullName,
      idLastFour: extra?.idLastFour ?? '',
      countryCode: extra?.countryCode ?? '852',
      mobile: extra?.mobile ?? contactNumber ?? '',
      // Student profile fields (first child) — send both camelCase and snake_case
      // for backend compatibility during API migration.
      nickName: nickName ?? null,
      nick_name: nickName ?? null,
      dateOfBirth: dateOfBirth ?? null,
      date_of_birth: dateOfBirth ?? null,
      sex: sex,
      parentsName: parentsName ?? null,
      parents_name: parentsName ?? null,
      contactNumber: contactNumber ?? null,
      contact_number: contactNumber ?? null,
      residentialDistrict: residentialDistrict ?? null,
      residential_district: residentialDistrict ?? null,
      hasJoinedCourses: hasJoinedCourses,
      has_joined_courses: hasJoinedCourses,
      level: 'entry',
    };
    try {
      const res = await api.post('user/register', body) as {
        success?: boolean;
        user?: any;
        profile?: any;
        token?: string;
        data?: { user?: any; profile?: any; token?: string };
      };
      const regBody =
        res.data && typeof res.data === 'object' ? res.data : res;
      const u = regBody.user ?? res.user;
      if (res.success && u) {
        const userObj: User = { id: String(u.ID ?? u.id), email: u.email ?? email };
        const profileData = regBody.profile ?? res.profile ?? {};
        const backendStudentId =
          profileData.student_id ??
          profileData.studentId ??
          u.student_id ??
          u.studentId ??
          null;
        const profileObj: Profile = {
          id: userObj.id,
          full_name: u.name ?? fullName,
          role: 'student',
          mobile: profileData.mobile ?? contactNumber ?? null,
          id_first_four: profileData.id_first_four ?? extra?.idLastFour ?? null,
          student_id:
            typeof backendStudentId === 'string' && backendStudentId.trim().length > 0
              ? backendStudentId
              : generateStudentIdForFamily([]),
          nick_name: nickName,
          date_of_birth: dateOfBirth,
          sex: sex,
          parents_name: parentsName,
          contact_number: contactNumber,
          residential_district: residentialDistrict,
          has_joined_courses: hasJoinedCourses,
          level:
            profileData.level === 'entry' ||
            profileData.level === 'intermediate' ||
            profileData.level === 'advanced'
              ? profileData.level
              : 'entry',
        };
        const sessionObj: Session = { user: userObj };
        const regToken = regBody.token ?? res.token;
        if (regToken) localStorage.setItem('token', regToken);
        setUser(userObj);
        setProfiles([profileObj]);
        setActiveProfileId(profileObj.id);
        setSession(sessionObj);
        persistSession({
          user: userObj,
          profiles: [profileObj],
          activeProfileId: profileObj.id,
          session: sessionObj,
          authToken: regToken ?? undefined,
        });
        return;
      }
    } catch (apiErr) {
      throw apiErr instanceof Error ? apiErr : new Error('Registration failed');
    }
  }

  async function signOut() {
    setUser(null);
    setProfiles(null);
    setActiveProfileId(null);
    setSession(null);
    setRequirePasswordChange(false);
    localStorage.removeItem('auth_session');
    localStorage.removeItem('token');
    sessionStorage.removeItem('studio_backend_server_id');
  }

  async function refreshMePreservingActive(preferredActiveId?: string | null) {
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await api.get<{
      user: { id: string; email: string; mobile?: string };
      profiles: Profile[];
      requirePasswordChange?: boolean;
    }>('auth/me');
    const userFromMe = (res as any).user ?? (res as any).data?.user;
    const profilesFromMe = (res as any).profiles ?? (res as any).data?.profiles;
    if ((res as any).requirePasswordChange !== undefined) {
      setRequirePasswordChange((res as any).requirePasswordChange === true);
    }
    if (res.success && userFromMe && Array.isArray(profilesFromMe)) {
      const userObj: User = { id: userFromMe.id, email: userFromMe.email, mobile: userFromMe.mobile ?? null };
      const keepId =
        preferredActiveId && profilesFromMe.some((p: Profile) => p.id === preferredActiveId)
          ? preferredActiveId
          : activeProfileId && profilesFromMe.some((p: Profile) => p.id === activeProfileId)
            ? activeProfileId
            : profilesFromMe[0]?.id ?? null;
      setUser(userObj);
      setProfiles(profilesFromMe);
      setActiveProfileId(keepId);
      persistSession({
        user: userObj,
        profiles: profilesFromMe,
        activeProfileId: keepId,
        session: { user: userObj },
      });
    }
  }

  async function refreshMe() {
    try {
      await refreshMePreservingActive(activeProfileId);
    } catch (_) {}
  }

  const value = {
    user,
    profile,
    profiles: profiles ?? [],
    activeProfileId,
    switchProfile,
    addProfile,
    updateProfile,
    deleteProfile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin: profile?.role === 'admin',
    requirePasswordChange,
    refreshMe,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    if (!hasWarnedMissingAuthProvider) {
      hasWarnedMissingAuthProvider = true;
      console.warn('useAuth called without AuthProvider. Falling back to unauthenticated state.');
    }
    return fallbackAuthContext;
  }
  return context;
}
