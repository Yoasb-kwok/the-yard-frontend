import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import PublicLayout from '../../components/PublicLayout';
import { Mail, Lock } from 'lucide-react';
import { isDemoMode } from '../../lib/mock';

export default function LoginPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if there's a success message from OTP verification
    const message = (location.state as { message?: string })?.message;
    if (message) {
      setSuccessMessage(message);
      // Clear the state to prevent showing message on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn(loginIdentifier.trim(), password);
      if (result?.requirePasswordChange) {
        navigate('/profile?changePassword=1');
        return;
      }
      // Navigate by role (admin vs student)
      const stored = localStorage.getItem('auth_session');
      let isAdmin = loginIdentifier === 'admin@admin.com';
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const role = parsed.profiles?.[0]?.role ?? parsed.profile?.role;
          isAdmin = role === 'admin';
        } catch (_) {}
      }
      navigate(isAdmin ? '/admin' : '/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message === 'Invalid email or password' ? t('login.invalidCredentials') : err.message);
      } else {
        setError(t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
              {t('login.title')}
            </h2>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {successMessage && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
                {successMessage}
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <label htmlFor="loginIdentifier" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('login.emailOrUsername')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <Mail className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    id="loginIdentifier"
                    name="loginIdentifier"
                    type="text"
                    autoComplete="username email"
                    required
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder={
                      isDemoMode()
                        ? 'admin@demo.com（或 student@demo.com）'
                        : t('login.emailOrUsernamePlaceholder')
                    }
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('register.password')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <Lock className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder={isDemoMode() ? 'demo1234' : t('register.password')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                {loading ? t('login.signingIn') : t('login.signIn')}
              </button>
            </div>

            <div className="text-center space-y-2">
              <div>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-primary hover:text-primary-dark"
                >
                  {t('login.forgotPassword')}
                </Link>
              </div>
              <p className="text-sm text-gray-600">
                {t('login.dontHaveAccount')}{' '}
                <Link
                  to="/register"
                  className="font-medium text-primary hover:text-primary-dark"
                >
                  {t('login.register')}
                </Link>
              </p>
              {isDemoMode() && (
                <div className="mt-4 pt-4 border-t border-gray-200 text-left">
                  <p className="text-xs font-semibold text-gray-500 mb-2">
                    Demo 測試帳號（點擊自動填入）：
                  </p>
                  <div className="grid grid-cols-1 gap-1.5 text-xs text-gray-500">
                    {[
                      { label: '管理員', email: 'admin@demo.com' },
                      { label: '學員', email: 'student@demo.com' },
                      { label: '家長學員', email: 'parent@demo.com' },
                    ].map((a) => (
                      <button
                        key={a.email}
                        type="button"
                        onClick={() => {
                          setLoginIdentifier(a.email);
                          setPassword('demo1234');
                        }}
                        className="flex items-center justify-between rounded border border-gray-200 bg-gray-50 px-2 py-1 hover:bg-gray-100 hover:border-gray-300 transition text-left"
                      >
                        <span>
                          <span className="font-medium text-gray-700">{a.label}</span>
                          <span className="mx-1.5 text-gray-400">·</span>
                          <code className="text-[11px] text-gray-600">{a.email}</code>
                        </span>
                        <code className="text-[11px] text-gray-400">demo1234</code>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2">
                    忘記密碼 OTP 固定為 <code>123456</code>
                  </p>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </PublicLayout>
  );
}
