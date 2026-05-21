import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import PublicLayout from '../../components/PublicLayout';

export default function TrialLoginRequiredPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const returnTo =
    (location.state as { returnTo?: string } | null)?.returnTo || '/trial';

  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center bg-white rounded-lg shadow-md p-6">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{t('trial.title')}</h1>
          <p className="text-gray-600 mb-6">{t('trial.loginRequiredForExistingEmail')}</p>
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/login"
              state={{ returnTo }}
              className="inline-block px-4 py-2 bg-primary text-white rounded-md font-medium hover:bg-primary-dark"
            >
              {t('trial.goToLogin')}
            </Link>
            <Link
              to={returnTo}
              className="inline-block px-4 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50"
            >
              {t('common.back')}
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
