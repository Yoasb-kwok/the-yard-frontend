import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

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
  /** Remove a family member. Cannot remove the main (first) profile. */
  deleteProfile: (profileId: string) => void;
  /** Set which profile is the main account (moves it to first in the list). */
  setMainProfile: (profileId: string) => void;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
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
    hasJoinedCourses: boolean | null
  ) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
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

  // Derive active profile from profiles + activeProfileId
  const profile =
    profiles && activeProfileId
      ? profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null
      : profiles?.[0] ?? null;

  useEffect(() => {
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
          // Migrate to new format
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
    if (profileId === mainId) return; // cannot delete main
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

  function setMainProfile(profileId: string) {
    if (!profiles?.length || !user || !session) return;
    const target = profiles.find((p) => p.id === profileId);
    if (!target || target.id === profiles[0]?.id) return; // already main
    const next = [target, ...profiles.filter((p) => p.id !== profileId)];
    setProfiles(next);
    persistSession({
      user,
      profiles: next,
      activeProfileId: activeProfileId ?? profiles[0].id,
      session,
    });
  }

  async function signIn(email: string, password: string) {
    const account = HARDCODED_ACCOUNTS[email];

    if (account && account.password === password) {
      const main = account.profiles[0];
      const userObj: User = { id: main.id, email };
      const sessionObj: Session = { user: userObj };

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

    const storedPassword = localStorage.getItem(`user_password_${email}`);
    const storedSession = localStorage.getItem('auth_session');

    if (storedPassword === password && storedSession) {
      try {
        const parsed = JSON.parse(storedSession);
        if (parsed.user?.email === email) {
          setUser(parsed.user);
          setSession(parsed.session ?? null);
          if (parsed.profiles && Array.isArray(parsed.profiles)) {
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
      } catch (error) {
        console.error('Error parsing stored session:', error);
      }
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
    hasJoinedCourses: boolean | null
  ) {
    // For demo purposes, create a student account
    const userObj: User = {
      id: `user-${Date.now()}`,
      email: email,
    };

    // Generate unique Student ID for students
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
      mobile: contactNumber, // Keep for backward compatibility
      id_first_four: null, // No longer used
      level: null, // Default to null, can be set later
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

    if (password) {
      localStorage.setItem(`user_password_${email}`, password);
    }
  }

  async function signOut() {
    setUser(null);
    setProfiles(null);
    setActiveProfileId(null);
    setSession(null);
    localStorage.removeItem('auth_session');
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
    setMainProfile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin: profile?.role === 'admin',
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
