import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { buildReceiptHtml, downloadReceiptHtml } from '../../lib/receiptHtml';
import { Receipt, CheckCircle, Clock, XCircle, Download, Mail } from 'lucide-react';

interface Payment {
  id: string;
  date: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  payment_method: string;
  description: string;
  order_id?: string;
  package_id?: string; // Package ID for translation
  token_count?: number; // Token count for display
}

// Profile-specific mock payments for testing (each child has different payment history)
function getMockPaymentsForProfile(profileId: string | undefined): Payment[] {
  if (profileId === 'student-001') {
    return [
      { id: '1', date: '2024-01-15T10:30:00', amount: 1600, status: 'completed', payment_method: 'credit_card', description: 'Premium Pack - 20 tokens', package_id: '3', token_count: 20, order_id: 'ORD-001' },
      { id: '2', date: '2024-01-10T14:20:00', amount: 900, status: 'completed', payment_method: 'fps', description: 'Regular Pack - 10 tokens', package_id: '2', token_count: 10, order_id: 'ORD-002' },
      { id: '3', date: '2024-01-05T09:15:00', amount: 500, status: 'pending', payment_method: 'cash', description: 'Starter Pack - 5 tokens', package_id: '1', token_count: 5, order_id: 'ORD-003' },
    ];
  }
  if (profileId === 'student-001-sub-2') {
    return [
      { id: '1', date: '2024-01-20T11:00:00', amount: 900, status: 'completed', payment_method: 'fps', description: 'Regular Pack - 10 tokens', package_id: '2', token_count: 10, order_id: 'ORD-101' },
      { id: '2', date: '2024-01-12T16:45:00', amount: 500, status: 'completed', payment_method: 'cash', description: 'Starter Pack - 5 tokens', package_id: '1', token_count: 5, order_id: 'ORD-102' },
    ];
  }
  if (profileId === 'student-001-sub-3') {
    return [
      { id: '1', date: '2024-01-18T09:30:00', amount: 1600, status: 'completed', payment_method: 'credit_card', description: 'Premium Pack - 20 tokens', package_id: '3', token_count: 20, order_id: 'ORD-201' },
      { id: '2', date: '2024-01-08T14:00:00', amount: 1600, status: 'completed', payment_method: 'fps', description: 'Premium Pack - 20 tokens', package_id: '3', token_count: 20, order_id: 'ORD-202' },
      { id: '3', date: '2024-01-02T10:15:00', amount: 900, status: 'completed', payment_method: 'credit_card', description: 'Regular Pack - 10 tokens', package_id: '2', token_count: 10, order_id: 'ORD-203' },
    ];
  }
  return [
    { id: '1', date: '2024-01-10T10:00:00', amount: 500, status: 'completed', payment_method: 'cash', description: 'Starter Pack - 5 tokens', package_id: '1', token_count: 5, order_id: 'ORD-999' },
  ];
}

export default function PaymentHistoryPage() {
  const { profile } = useAuth();
  const { t, i18n } = useTranslation();
  
  // Map i18n language codes to locale strings for date formatting
  const getLocale = (): string => {
    const langMap: { [key: string]: string } = {
      'en': 'en-US',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
    };
    return langMap[i18n.language] || i18n.language || 'en-US';
  };
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [receiptMessage, setReceiptMessage] = useState<string | null>(null);

  const handleReceiptDownload = (payment: Payment) => {
    const html = buildReceiptHtml({
      orderId: payment.order_id ?? payment.id,
      date: formatDateTime(payment.date, getLocale()),
      description: getPackageDescription(payment),
      paymentMethod: getPaymentMethodLabel(payment.payment_method),
      amount: formatCurrency(payment.amount),
      status: getStatusLabel(payment.status),
      receiptTitle: t('paymentHistory.receiptTitle'),
      labels: {
        orderId: t('paymentHistory.orderId'),
        date: t('paymentHistory.date'),
        description: t('paymentHistory.description'),
        paymentMethod: t('paymentHistory.paymentMethod'),
        amount: t('paymentHistory.amount'),
        status: t('paymentHistory.status'),
      },
      printHint: t('paymentHistory.receiptPrintHint'),
      brandName: 'The Yard',
    });
    const filename = `receipt-${payment.order_id ?? payment.id}.html`;
    downloadReceiptHtml(html, filename);
  };

  /** Open receipt in new tab (view / print / save as PDF) */
  const handleViewReceipt = (payment: Payment) => {
    const html = buildReceiptHtml({
      orderId: payment.order_id ?? payment.id,
      date: formatDateTime(payment.date, getLocale()),
      description: getPackageDescription(payment),
      paymentMethod: getPaymentMethodLabel(payment.payment_method),
      amount: formatCurrency(payment.amount),
      status: getStatusLabel(payment.status),
      receiptTitle: t('paymentHistory.receiptTitle'),
      labels: {
        orderId: t('paymentHistory.orderId'),
        date: t('paymentHistory.date'),
        description: t('paymentHistory.description'),
        paymentMethod: t('paymentHistory.paymentMethod'),
        amount: t('paymentHistory.amount'),
        status: t('paymentHistory.status'),
      },
      printHint: t('paymentHistory.receiptPrintHint'),
      brandName: 'The Yard',
    });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const handleReceiptEmail = () => {
    setReceiptMessage(t('paymentHistory.receiptSent'));
    setTimeout(() => setReceiptMessage(null), 3000);
  };

  useEffect(() => {
    if (!profile) return;
    setLoading(true);
    const timer = setTimeout(() => {
      setPayments(getMockPaymentsForProfile(profile?.id));
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [profile?.id]);

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
      case 'alipay':
        return t('shop.alipay');
      case 'wechatpay':
        return t('shop.wechatpay');
      case 'payme':
        return t('shop.payme');
      default:
        return method;
    }
  };

  const getPackageDescription = (payment: Payment) => {
    if (payment.package_id && payment.token_count !== undefined) {
      const packageNameKey = `tokenPackage.packages.${payment.package_id}.name`;
      const packageName = t(packageNameKey, { defaultValue: payment.description.split(' - ')[0] });
      const tokensLabel = t('tokenPackage.tokens', { defaultValue: 'tokens' });
      return `${packageName} - ${payment.token_count} ${tokensLabel}`;
    }
    return payment.description;
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
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center gap-3">
          <Receipt className="h-6 w-6 md:h-8 md:w-8 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('paymentHistory.title')}</h1>
        </div>

        {receiptMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            {receiptMessage}
          </div>
        )}

        {payments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Receipt className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">{t('paymentHistory.noPayments')}</p>
          </div>
        ) : (
          <>
            {/* Mobile View - Card Layout */}
            <div className="md:hidden space-y-4">
              {payments.map((payment) => (
                <div key={payment.id} className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="font-semibold text-base text-gray-900 mb-1">
                        {getPackageDescription(payment)}
                      </div>
                      {payment.order_id && (
                        <div className="text-gray-500 text-xs">
                          {t('paymentHistory.orderId')}: {payment.order_id}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {getStatusIcon(payment.status)}
                    </div>
                  </div>
                  
                  <div className="space-y-2 pt-3 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t('paymentHistory.date')}</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatDateTime(payment.date, getLocale())}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t('paymentHistory.paymentMethod')}</span>
                      <span className="text-sm text-gray-900">
                        {getPaymentMethodLabel(payment.payment_method)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t('paymentHistory.amount')}</span>
                      <span className="text-base font-semibold text-gray-900">
                        {formatCurrency(payment.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                      <span className="text-sm text-gray-600">{t('paymentHistory.status')}</span>
                      <span className="text-sm font-medium text-gray-900">
                        {getStatusLabel(payment.status)}
                      </span>
                    </div>
                    <div className="flex gap-2 pt-3 border-t border-gray-100 mt-2">
                      <button
                        type="button"
                        onClick={() => handleViewReceipt(payment)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary/5"
                      >
                        <Receipt className="h-4 w-4" />
                        {t('paymentHistory.viewReceipt')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReceiptDownload(payment)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary/5"
                      >
                        <Download className="h-4 w-4" />
                        {t('paymentHistory.downloadReceipt')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReceiptEmail()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary/5"
                      >
                        <Mail className="h-4 w-4" />
                        {t('paymentHistory.emailReceipt')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View - Table Layout */}
            <div className="hidden md:block bg-white rounded-lg shadow-md overflow-hidden">
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('paymentHistory.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDateTime(payment.date, getLocale())}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{getPackageDescription(payment)}</div>
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleViewReceipt(payment)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-sm font-medium text-primary hover:bg-primary/10 rounded"
                            >
                              <Receipt className="h-4 w-4" />
                              {t('paymentHistory.viewReceipt')}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReceiptDownload(payment)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-sm font-medium text-primary hover:bg-primary/10 rounded"
                            >
                              <Download className="h-4 w-4" />
                              {t('paymentHistory.downloadReceipt')}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReceiptEmail()}
                              className="inline-flex items-center gap-1 px-2 py-1 text-sm font-medium text-primary hover:bg-primary/10 rounded"
                            >
                              <Mail className="h-4 w-4" />
                              {t('paymentHistory.emailReceipt')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

