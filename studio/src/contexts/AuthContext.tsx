import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type CourseLevel = 'entry' | 'intermediate' | 'advanced';

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

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
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

// Hardcoded accounts
const HARDCODED_ACCOUNTS = {
  'admin@admin.com': {
    password: 'admin123',
      profile: {
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
  },
  'student@student.com': {
    password: 'student123',
    profile: {
      id: 'student-001',
      full_name: '陳小明',
      role: 'student' as const,
      mobile: '85291234567',
      id_first_four: 'S123',
      student_id: 'std123456',
      nick_name: '小明',
      date_of_birth: '2010-05-15',
      sex: true, // true = male, false = female
      parents_name: '陳大華',
      contact_number: '85291234567',
      residential_district: 'Kowloon',
      has_joined_courses: true,
      level: 'entry' as CourseLevel,
    },
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for existing session
    const storedSession = localStorage.getItem('auth_session');
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession);
        setUser(parsed.user);
        setProfile(parsed.profile);
        setSession(parsed.session);
      } catch (error) {
        console.error('Error parsing stored session:', error);
        localStorage.removeItem('auth_session');
      }
    }
    setLoading(false);
  }, []);

  async function signIn(email: string, password: string) {
    const account = HARDCODED_ACCOUNTS[email as keyof typeof HARDCODED_ACCOUNTS];
    
    // Check hardcoded accounts first
    if (account && account.password === password) {
      const userObj: User = {
        id: account.profile.id,
        email: email,
      };

      const sessionObj: Session = {
        user: userObj,
      };

      setUser(userObj);
      setProfile(account.profile);
      setSession(sessionObj);

      // Store in localStorage
      localStorage.setItem('auth_session', JSON.stringify({
        user: userObj,
        profile: account.profile,
        session: sessionObj,
      }));
      return;
    }

    // Check for dynamically created accounts (from trial applications)
    const storedPassword = localStorage.getItem(`user_password_${email}`);
    const storedSession = localStorage.getItem('auth_session');
    
    if (storedPassword === password && storedSession) {
      try {
        const parsed = JSON.parse(storedSession);
        if (parsed.user && parsed.user.email === email) {
          setUser(parsed.user);
          setProfile(parsed.profile);
          setSession(parsed.session);
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

    const sessionObj: Session = {
      user: userObj,
    };

    setUser(userObj);
    setProfile(profileObj);
    setSession(sessionObj);

    // Store in localStorage
    localStorage.setItem('auth_session', JSON.stringify({
      user: userObj,
      profile: profileObj,
      session: sessionObj,
    }));

    // Store password in localStorage for demo purposes (in production, this would be handled by backend)
    if (password) {
      localStorage.setItem(`user_password_${email}`, password);
    }
  }

  async function signOut() {
    setUser(null);
    setProfile(null);
    setSession(null);
    localStorage.removeItem('auth_session');
  }

  const value = {
    user,
    profile,
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
