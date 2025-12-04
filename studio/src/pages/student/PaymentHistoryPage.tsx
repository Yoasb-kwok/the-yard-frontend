import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { Receipt, CheckCircle, Clock, XCircle } from 'lucide-react';

interface Payment {
  id: string;
  date: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  payment_method: string;
  description: string;
  order_id?: string;
}

// Mock data
const MOCK_PAYMENTS: Payment[] = [
  {
    id: '1',
    date: '2024-01-15T10:30:00',
    amount: 1600,
    status: 'completed',
    payment_method: 'credit_card',
    description: 'Premium Pack - 20 tokens',
    order_id: 'ORD-001',
  },
  {
    id: '2',
    date: '2024-01-10T14:20:00',
    amount: 900,
    status: 'completed',
    payment_method: 'fps',
    description: 'Regular Pack - 10 tokens',
    order_id: 'ORD-002',
  },
  {
    id: '3',
    date: '2024-01-05T09:15:00',
    amount: 500,
    status: 'pending',
    payment_method: 'cash',
    description: 'Starter Pack - 5 tokens',
    order_id: 'ORD-003',
  },
];

export default function PaymentHistoryPage() {
  const { t } = useTranslation();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setPayments(MOCK_PAYMENTS);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const getStatusIcon = (status: Payment['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getStatusLabel = (status: Payment['status']) => {
    switch (status) {
      case 'completed':
        return t('paymentHistory.statusLabels.completed');
      case 'pending':
        return t('paymentHistory.statusLabels.pending');
      case 'failed':
        return t('paymentHistory.statusLabels.failed');
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'credit_card':
        return t('shop.creditCard');
      case 'fps':
        return t('shop.fps');
      case 'cash':
        return t('shop.cash');
      default:
        return method;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Receipt className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-gray-900">{t('paymentHistory.title')}</h1>
        </div>

        {payments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Receipt className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">{t('paymentHistory.noPayments')}</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('paymentHistory.date')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('paymentHistory.description')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('paymentHistory.paymentMethod')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('paymentHistory.amount')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('paymentHistory.status')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDateTime(payment.date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{payment.description}</div>
                          {payment.order_id && (
                            <div className="text-gray-500 text-xs mt-1">
                              {t('paymentHistory.orderId')}: {payment.order_id}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {getPaymentMethodLabel(payment.payment_method)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(payment.status)}
                          <span className="text-sm text-gray-900">{getStatusLabel(payment.status)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

