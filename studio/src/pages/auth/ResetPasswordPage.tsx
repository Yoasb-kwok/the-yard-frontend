import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';
import { api } from '../../lib/api';
import { Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';

type ResetState = {
  email?: string;
  otp?: string;
  usePhone?: boolean;
  countryCode?: string;
  mobile?: string;
  tempToken?: string | null;
};

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state || {}) as ResetState;
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const hasState = (state.email && state.otp) || (state.usePhone && state.countryCode && state.mobile && state.otp);

  useEffect(() => {
    if (!hasState) navigate('/forgot-password');
  }, [hasState, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError(t('register.passwordMin'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('register.passwordMismatch'));
      return;
    }
    setLoading(true);
    try {
      const body = state.usePhone
        ? {
            countryCode: state.countryCode,
            mobile: state.mobile,
            otp: state.otp,
            tempToken: state.tempToken,
            newPassword,
            confirmPassword,
          }
        : {
            email: state.email,
            otp: state.otp,
            tempToken: state.tempToken,
            newPassword,
            confirmPassword,
          };
      const res = await api.post<{ success?: boolean; msg?: string }>('user/reset-password', body);
      if (!res.success) throw new Error(res.msg || t('common.error'));
      setSuccess(true);
      setTimeout(() => navigate('/login', { state: { message: t('resetPassword.successMessage') } }), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  if (!hasState) return null;

  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">{t('resetPassword.title')}</h2>
            <p className="mt-2 text-center text-sm text-gray-600">{t('resetPassword.subtitle')}</p>
          </div>
          {success ? (
            <div className="text-center text-green-600 font-medium">{t('resetPassword.done')}</div>
          ) : (
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">{error}</div>
              )}
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('resetPassword.newPassword')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <Lock className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    className="appearance-none block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder={t('register.password')}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500"
                    aria-label={showPassword ? t('register.hidePassword') : t('register.showPassword')}
                  >
                    {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">{t('register.passwordMin')}</p>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('register.confirmPassword')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <Lock className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder={t('register.confirmPassword')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                >
                  {loading ? t('common.loading') : t('resetPassword.submit')}
                </button>
              </div>
              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-dark"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('forgotPassword.backToLogin')}
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
