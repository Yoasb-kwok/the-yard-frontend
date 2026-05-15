import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';
import { api } from '../../lib/api';
import { Mail, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError(t('forgotPassword.emailRequired'));
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const res = await api.post('user/forgot-password', { email: normalizedEmail });
      if (!res.success) throw new Error(res.msg || t('common.error'));
      navigate('/verify-otp', { state: { email: normalizedEmail } });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('common.error');
      const lower = String(msg).toLowerCase();
      if (lower.includes('not found') || lower.includes('no such user') || lower.includes('user does not exist')) {
        setError(t('forgotPassword.userNotFound', { defaultValue: '沒有該用戶' }));
      } else {
        setError(msg);
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
              {t('forgotPassword.title')}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {t('forgotPassword.subtitle')}
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                {t('forgotPassword.email')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <Mail className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder={t('forgotPassword.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                {loading ? t('forgotPassword.sending') : t('forgotPassword.sendOTP')}
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
        </div>
      </div>
    </PublicLayout>
  );
}

