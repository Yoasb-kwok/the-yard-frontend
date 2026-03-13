import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, ApiError } from '../lib/api';

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
  /** Add a new family member (sub-account). Only for student accounts. */
  addProfile: (data: AddProfileData) => void;
  /** Update an existing family member. */
  updateProfile: (profileId: string, data: Partial<AddProfileData>) => void;
  /** Remove a family member. Cannot remove the first profile. */
  deleteProfile: (profileId: string) => void;
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

// Hardcoded accounts. Each account has profiles: [main, ...subAccounts]. Sub-accounts let one parent manage multiple children (e.g. 陳小明 family: 陳小明, 陳小美, 陳大明).
const HARDCODED_ACCOUNTS: Record<
  string,
  { password: string; profiles: Profile[] }
> = {
  'admin@admin.com': {
    password: 'admin123',
    profiles: [
      {
        id: 'admin-001',
        full_name: 'Admin User',
        role: 'admin' as const,
        mobile: '12345678',
        id_first_four: 'A123',
        student_id: null,
        nick_name: null,
        date_of_birth: null,
        sex: null,
        parents_name: null,
        contact_number: null,
        residential_district: null,
        has_joined_courses: null,
        level: null,
      },
    ],
  },
  'student@student.com': {
    password: 'student123',
    profiles: [
      // Main (primary) – 陳小明
      {
        id: 'student-001',
        full_name: '陳小明',
        role: 'student' as const,
        mobile: '85291234567',
        id_first_four: 'S123',
        student_id: 'std123456',
        nick_name: '小明',
        date_of_birth: '2010-05-15',
        sex: true, // male
        parents_name: '陳大華',
        contact_number: '85291234567',
        residential_district: 'Kowloon',
        has_joined_courses: true,
        level: 'entry' as CourseLevel,
      },
      // Sub-account – 陳小美
      {
        id: 'student-001-sub-2',
        full_name: '陳小美',
        role: 'student' as const,
        mobile: '85291234567',
        id_first_four: null,
        student_id: 'std123457',
        nick_name: '小美',
        date_of_birth: '2012-08-20',
        sex: false, // female
        parents_name: '陳大華',
        contact_number: '85291234567',
        residential_district: 'Kowloon',
        has_joined_courses: true,
        level: 'entry' as CourseLevel,
      },
      // Sub-account – 陳大明
      {
        id: 'student-001-sub-3',
        full_name: '陳大明',
        role: 'student' as const,
        mobile: '85291234567',
        id_first_four: null,
        student_id: 'std123458',
        nick_name: '大明',
        date_of_birth: '2008-03-10',
        sex: true, // male
        parents_name: '陳大華',
        contact_number: '85291234567',
        residential_district: 'Kowloon',
        has_joined_courses: true,
        level: 'intermediate' as CourseLevel,
      },
    ],
  },
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
        // Demo token (no backend): restore from auth_session only to avoid failed API calls
        if (token.startsWith('sheet_')) {
          const stored = localStorage.getItem('auth_session');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              setUser(parsed.user);
              setSession(parsed.session ?? null);
              if (parsed.profiles && Array.isArray(parsed.profiles)) {
                setProfiles(parsed.profiles);
                setActiveProfileId(parsed.activeProfileId ?? parsed.profiles[0]?.id ?? null);
              } else if (parsed.profile) {
                const profs = [parsed.profile];
                setProfiles(profs);
                setActiveProfileId(parsed.profile.id);
              } else {
                setProfiles(null);
                setActiveProfileId(null);
              }
            } catch {
              localStorage.removeItem('auth_session');
              localStorage.removeItem('token');
            }
          }
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
        } catch {
          // API unreachable or invalid token – remove token only; keep auth_session so we can restore below (fixes refresh logout when no backend).
          localStorage.removeItem('token');
        }
      }
      const stored = localStorage.getItem('auth_session');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
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
              localStorage.setItem('auth_session', JSON.stringify({
                ...parsed,
                profiles: profs,
                activeProfileId: parsed.profile.id,
                profile: undefined,
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
  }) {
    localStorage.setItem('auth_session', JSON.stringify(payload));
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

  function addProfile(data: AddProfileData) {
    if (!profiles?.length || !user || !session) return;
    const main = profiles[0];
    const contact = data.contact_number ?? main.contact_number ?? main.mobile;
    const newProfile: Profile = {
      id: `${main.id}-sub-${Date.now()}`,
      full_name: data.full_name.trim(),
      nick_name: data.nick_name ?? null,
      date_of_birth: data.date_of_birth ?? null,
      sex: data.sex ?? null,
      parents_name: data.parents_name ?? null,
      contact_number: data.contact_number ?? null,
      residential_district: data.residential_district ?? null,
      has_joined_courses: data.has_joined_courses ?? null,
      student_id: generateStudentId(),
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
      activeProfileId: activeProfileId ?? main.id,
      session,
    });
  }

  function updateProfile(profileId: string, data: Partial<AddProfileData>) {
    if (!profiles?.length || !user || !session) return;
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
    setProfiles(updated);
    persistSession({
      user,
      profiles: updated,
      activeProfileId: activeProfileId ?? profiles[0].id,
      session,
    });
  }

  function deleteProfile(profileId: string) {
    if (!profiles?.length || !user || !session) return;
    const mainId = profiles[0]?.id;
    if (profileId === mainId) return; // cannot delete first profile
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
      if (res.success && res.token && res.user) {
        const u = res.user;
        const needPasswordChange = (res as { requirePasswordChange?: boolean }).requirePasswordChange === true;
        setRequirePasswordChange(needPasswordChange);
        localStorage.setItem('token', res.token);
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
        });
        return { requirePasswordChange: needPasswordChange };
      }
    } catch (apiErr) {
      if (apiErr instanceof ApiError && apiErr.status === 401) {
        throw new Error('Invalid email or password');
      }
      const isBackendUnreachable =
        (apiErr instanceof ApiError && [502, 503, 504, 0].includes(apiErr.status)) ||
        (apiErr instanceof Error && /Network|fetch|ECONNREFUSED|Failed to fetch/i.test(apiErr.message));
      if (!isBackendUnreachable) {
        throw apiErr;
      }
      // Fall through to hardcoded demo accounts when backend/proxy is down
    }

    const account = HARDCODED_ACCOUNTS[loginIdentifier];
    if (account && account.password === password) {
      const main = account.profiles[0];
      const userObj: User = { id: main.id, email: loginIdentifier };
      const sessionObj: Session = { user: userObj };
      // Use a sheet-style token so student dashboard APIs can identify the user.
      // For student@student.com testing we use user_002 so dashboard shows real token/enrollment data.
      const sheetUserId = loginIdentifier === 'student@student.com' ? 'user_002' : main.id;
      const token = `sheet_${sheetUserId}_${Date.now()}`;
      localStorage.setItem('token', token);
      setUser(userObj);
      setProfiles(account.profiles);
      setActiveProfileId(main.id);
      setSession(sessionObj);
      persistSession({
        user: userObj,
        profiles: account.profiles,
        activeProfileId: main.id,
        session: sessionObj,
      });
      return;
    }

    const storedPassword = localStorage.getItem(`user_password_${loginIdentifier}`);
    const storedSession = localStorage.getItem('auth_session');
    if (storedPassword === password && storedSession) {
      try {
        const parsed = JSON.parse(storedSession);
        if (parsed.user?.email === loginIdentifier) {
          setUser(parsed.user);
          setSession(parsed.session ?? null);
          if (parsed.profiles?.length) {
            setProfiles(parsed.profiles);
            setActiveProfileId(parsed.activeProfileId ?? parsed.profiles[0]?.id ?? null);
          } else if (parsed.profile) {
            setProfiles([parsed.profile]);
            setActiveProfileId(parsed.profile.id);
          } else {
            setProfiles(null);
            setActiveProfileId(null);
          }
          return;
        }
      } catch (_) {}
    }

    throw new Error('Invalid email or password');
  }

  // Generate unique Student ID (format: std + 6 random digits)
  function generateStudentId(): string {
    // Generate 6 random digits
    const randomDigits = Math.floor(100000 + Math.random() * 900000).toString();
    return `std${randomDigits}`;
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
    const confirmPassword = password;
    const body: Record<string, string> = {
      email,
      password,
      confirmPassword,
      fullName,
      idLastFour: extra?.idLastFour ?? '',
      countryCode: extra?.countryCode ?? '852',
      mobile: extra?.mobile ?? contactNumber ?? '',
    };
    try {
      const res = await api.post('user/register', body) as { success?: boolean; user?: any; profile?: any; token?: string };
      if (res.success && res.user) {
        const u = res.user;
        const userObj: User = { id: String(u.ID ?? u.id), email: u.email ?? email };
        const profileData = res.profile ?? {};
        const profileObj: Profile = {
          id: userObj.id,
          full_name: u.name ?? fullName,
          role: 'student',
          mobile: profileData.mobile ?? contactNumber ?? null,
          id_first_four: profileData.id_first_four ?? extra?.idLastFour ?? null,
          student_id: profileData.student_id ?? null,
          nick_name: nickName,
          date_of_birth: dateOfBirth,
          sex: sex,
          parents_name: parentsName,
          contact_number: contactNumber,
          residential_district: residentialDistrict,
          has_joined_courses: hasJoinedCourses,
          level: null,
        };
        const sessionObj: Session = { user: userObj };
        if (res.token) localStorage.setItem('token', res.token);
        setUser(userObj);
        setProfiles([profileObj]);
        setActiveProfileId(profileObj.id);
        setSession(sessionObj);
        persistSession({
          user: userObj,
          profiles: [profileObj],
          activeProfileId: profileObj.id,
          session: sessionObj,
        });
        return;
      }
    } catch (apiErr) {
      const msg = apiErr instanceof Error ? apiErr.message : '';
      if (msg && !msg.includes('Network')) throw apiErr;
    }

    // Fallback: local-only account (no API)
    const userObj: User = { id: `user-${Date.now()}`, email };
    const studentId = generateStudentId();
    const profileObj: Profile = {
      id: userObj.id,
      full_name: fullName,
      nick_name: nickName,
      date_of_birth: dateOfBirth,
      sex: sex,
      parents_name: parentsName,
      contact_number: contactNumber,
      residential_district: residentialDistrict,
      has_joined_courses: hasJoinedCourses,
      student_id: studentId,
      role: 'student',
      mobile: contactNumber,
      id_first_four: null,
      level: null,
    };
    const sessionObj: Session = { user: userObj };
    setUser(userObj);
    setProfiles([profileObj]);
    setActiveProfileId(profileObj.id);
    setSession(sessionObj);
    persistSession({
      user: userObj,
      profiles: [profileObj],
      activeProfileId: profileObj.id,
      session: sessionObj,
    });
    if (password) localStorage.setItem(`user_password_${email}`, password);
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

  async function refreshMe() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await api.get<{ user: { id: string; email: string; mobile?: string }; profiles: Profile[]; requirePasswordChange?: boolean }>('auth/me');
      const userFromMe = (res as any).user ?? (res as any).data?.user;
      const profilesFromMe = (res as any).profiles ?? (res as any).data?.profiles;
      if ((res as any).requirePasswordChange !== undefined) {
        setRequirePasswordChange((res as any).requirePasswordChange === true);
      }
      if (res.success && userFromMe && Array.isArray(profilesFromMe)) {
        const userObj: User = { id: userFromMe.id, email: userFromMe.email, mobile: userFromMe.mobile ?? null };
        setUser(userObj);
        setProfiles(profilesFromMe);
        setActiveProfileId(profilesFromMe[0]?.id ?? null);
        persistSession({
          user: userObj,
          profiles: profilesFromMe,
          activeProfileId: profilesFromMe[0]?.id ?? null,
          session: { user: userObj },
        });
      }
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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
