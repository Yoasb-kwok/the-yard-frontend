import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { getOrderStatus, type PaymentOrderStatus } from '../../lib/paymentApi';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';

type Phase = 'loading' | 'polling' | 'paid' | 'missing' | 'error' | 'timeout';

const POLL_ATTEMPTS = 20;
const POLL_INTERVAL_MS = 2000;

export default function PaymentSuccessPage() {
  const { t } = useTranslation();
  const { refreshMe } = useAuth();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id')?.trim() ?? '';

  const [phase, setPhase] = useState<Phase>('loading');
  const [order, setOrder] = useState<PaymentOrderStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setPhase('missing');
      return;
    }
    let cancelled = false;

    async function poll() {
      setPhase('polling');
      for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
        if (cancelled) return;
        try {
          const next = await getOrderStatus({ session_id: sessionId });
          if (cancelled) return;
          if (next) setOrder(next);

          if (next?.payment_status === 'paid') {
            setPhase('paid');
            await refreshMe().catch(() => {});
            await api.get('/student/tokens').catch(() => api.get('/user-tokens')).catch(() => {});
            return;
          }
        } catch (e) {
          if (cancelled) return;
          setPhase('error');
          setErrorMessage(e instanceof Error ? e.message : t('payment.loadError'));
          return;
        }

        if (cancelled) return;
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }

      if (!cancelled) setPhase('timeout');
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps -- refreshMe omitted; only sessionId should re-run polling

  const webhookPending =
    order &&
    order.payment_status !== 'paid' &&
    order.stripe_checkout_payment_status === 'paid';

  return (
    <Layout>
      <div className="max-w-lg mx-auto py-12 px-4">
        {phase === 'missing' && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center border border-amber-200">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">{t('payment.missingSessionTitle')}</h1>
            <p className="text-gray-600 mb-6">{t('payment.missingSessionBody')}</p>
            <Link to="/token-package" className="text-primary font-medium hover:underline">
              {t('payment.goShop')}
            </Link>
          </div>
        )}

        {(phase === 'loading' || phase === 'polling') && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              {webhookPending ? t('payment.confirmingTitle') : t('payment.verifyingTitle')}
            </h1>
            <p className="text-gray-600">
              {webhookPending ? t('payment.pendingWebhook') : t('payment.verifyingBody')}
            </p>
          </div>
        )}

        {phase === 'paid' && order && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center border border-green-200">
            <CheckCircle className="h-14 w-14 text-green-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('payment.successTitle')}</h1>
            <p className="text-gray-600 mb-2">
              {t('payment.orderLabel')}: <span className="font-mono">{order.order_id}</span>
            </p>
            <p className="text-gray-600 mb-6">
              {t('payment.tokensCredited', { count: order.token_count })}
            </p>
            <p className="text-lg font-semibold text-primary mb-8">{formatCurrency(order.total)}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/dashboard"
                className="inline-flex justify-center px-5 py-2.5 rounded-md bg-primary text-white font-medium hover:bg-primary-dark"
              >
                {t('payment.goDashboard')}
              </Link>
              <Link
                to="/payment-history"
                className="inline-flex justify-center px-5 py-2.5 rounded-md border border-gray-300 text-gray-800 font-medium hover:bg-gray-50"
              >
                {t('payment.goPaymentHistory')}
              </Link>
            </div>
          </div>
        )}

        {phase === 'error' && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center border border-red-200">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">{t('payment.loadErrorTitle')}</h1>
            <p className="text-gray-600 mb-6">{errorMessage || t('payment.loadError')}</p>
            <Link to="/payment-history" className="text-primary font-medium hover:underline">
              {t('payment.goPaymentHistory')}
            </Link>
          </div>
        )}

        {phase === 'timeout' && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center border border-amber-200">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">{t('payment.timeoutTitle')}</h1>
            <p className="text-gray-600 mb-6">{t('payment.timeoutBody')}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/dashboard"
                className="inline-flex justify-center px-5 py-2.5 rounded-md bg-primary text-white font-medium hover:bg-primary-dark"
              >
                {t('payment.goDashboard')}
              </Link>
              <Link
                to="/payment-history"
                className="inline-flex justify-center px-5 py-2.5 rounded-md border border-gray-300 text-gray-800 font-medium hover:bg-gray-50"
              >
                {t('payment.goPaymentHistory')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
