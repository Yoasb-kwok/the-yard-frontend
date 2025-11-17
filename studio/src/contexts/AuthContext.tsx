import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface Profile {
  id: string;
  full_name: string;
  role: 'student' | 'admin';
  mobile: string | null;
  id_first_four: string | null;
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
  signUp: (email: string, password: string, fullName: string, idFirstFour: string, mobile: string) => Promise<void>;
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
    },
  },
  'student@student.com': {
    password: 'student123',
    profile: {
      id: 'student-001',
      full_name: 'Student User',
      role: 'student' as const,
      mobile: '87654321',
      id_first_four: 'S123',
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
    
    if (!account || account.password !== password) {
      throw new Error('Invalid email or password');
    }

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
  }

  async function signUp(email: string, _password: string, fullName: string, idFirstFour: string, mobile: string) {
    // For demo purposes, create a student account
    const userObj: User = {
      id: `user-${Date.now()}`,
      email: email,
    };

    const profileObj: Profile = {
      id: userObj.id,
      full_name: fullName,
      role: 'student',
      mobile: mobile,
      id_first_four: idFirstFour,
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
