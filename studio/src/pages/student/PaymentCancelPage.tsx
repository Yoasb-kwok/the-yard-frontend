import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useTranslation } from 'react-i18next';
import { XCircle } from 'lucide-react';

export default function PaymentCancelPage() {
  const { t } = useTranslation();

  return (
    <Layout>
      <div className="max-w-lg mx-auto py-12 px-4">
        <div className="bg-white rounded-lg shadow-md p-8 text-center border border-gray-200">
          <XCircle className="h-14 w-14 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{t('payment.cancelTitle')}</h1>
          <p className="text-gray-600 mb-8">{t('payment.cancelBody')}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/token-package"
              className="inline-flex justify-center px-5 py-2.5 rounded-md bg-primary text-white font-medium hover:bg-primary-dark"
            >
              {t('payment.tryAgain')}
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex justify-center px-5 py-2.5 rounded-md border border-gray-300 text-gray-800 font-medium hover:bg-gray-50"
            >
              {t('payment.goDashboard')}
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
