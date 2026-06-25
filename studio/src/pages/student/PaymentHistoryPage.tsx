import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { buildReceiptHtml, downloadReceiptHtml, openReceiptHtml } from '../../lib/receiptHtml';
import { api } from '../../lib/api';
import { getAppPublicOrigin } from '../../lib/appOrigin';
import { Receipt, CheckCircle, Clock, XCircle, Download, Mail, Loader2 } from 'lucide-react';
import { TablePaginationBar, useTablePagination } from '../../components/TablePagination';

interface Payment {
  id: string;
  date: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  payment_method: string;
  description: string;
  package_name?: string;
  order_id?: string;
  package_id?: string; // Package ID for translation
  token_count?: number; // Token count for display
}

function normalizeOrderStatus(status: string): Payment['status'] {
  const s = String(status || '').toLowerCase();
  if (s === 'paid' || s === 'completed' || s === 'success') return 'completed';
  if (s === 'failed' || s === 'canceled' || s === 'cancelled') return 'failed';
  return 'pending';
}

function normalizePayments(payload: any): Payment[] {
  const candidates = [payload, payload?.data, payload?.data?.data, payload?.orders, payload?.data?.orders];
  const rows = candidates.find((x) => Array.isArray(x));
  if (!Array.isArray(rows)) return [];
  return rows
    .map((o: any): Payment | null => {
      if (!o) return null;
      return {
        id: String(o.id ?? o.order_id ?? ''),
        date: String(o.created_at ?? o.date ?? new Date().toISOString()),
        amount: Number(o.total ?? o.amount ?? 0),
        status: normalizeOrderStatus(String(o.payment_status ?? o.status ?? 'pending')),
        payment_method: String(o.payment_method ?? 'credit_card'),
        description: String(o.description ?? ''),
        package_name: o.package_name
          ? String(o.package_name)
          : o.package?.name
          ? String(o.package.name)
          : undefined,
        order_id: o.order_id ? String(o.order_id) : undefined,
        package_id: o.package_id != null ? String(o.package_id) : undefined,
        token_count: o.token_count != null ? Number(o.token_count) : undefined,
      };
    })
    .filter((p: Payment | null): p is Payment => Boolean(p && p.id))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
  const [sendingReceiptId, setSendingReceiptId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function loadOrdersFromApi(profileId?: string): Promise<Payment[]> {
    const endpoints = [
      '/orders/me',
      '/student/orders/me',
      '/student/orders',
      '/orders',
      '/payment/orders/me',
    ];
    const errors: string[] = [];
    for (const endpoint of endpoints) {
      const res = await api.get(endpoint, profileId ? { profile_id: profileId } : undefined).catch((e) => {
        errors.push(`${endpoint}: ${e instanceof Error ? e.message : 'request failed'}`);
        return null;
      });
      if (!res) continue;
      const list = normalizePayments(res);
      if (list.length > 0) return list;
      if ((res as any).success === true) return [];
      errors.push(`${endpoint}: empty/unsupported response`);
    }
    throw new Error(errors[0] || 'Unable to load orders from API');
  }

  const handleReceiptDownload = (payment: Payment) => {
    const quantity = payment.token_count && payment.token_count > 0 ? String(payment.token_count) : '1';
    const html = buildReceiptHtml({
      orderId: payment.order_id ?? payment.id,
      date: formatDateTime(payment.date, getLocale()),
      description: getPackageDescription(payment),
      paymentMethod: getPaymentMethodLabel(payment.payment_method),
      amount: formatCurrency(payment.amount),
      status: getStatusLabel(payment.status),
      billedTo: profile?.full_name || '',
      quantity,
      unitPrice: formatCurrency(payment.amount),
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
    const quantity = payment.token_count && payment.token_count > 0 ? String(payment.token_count) : '1';
    const html = buildReceiptHtml({
      orderId: payment.order_id ?? payment.id,
      date: formatDateTime(payment.date, getLocale()),
      description: getPackageDescription(payment),
      paymentMethod: getPaymentMethodLabel(payment.payment_method),
      amount: formatCurrency(payment.amount),
      status: getStatusLabel(payment.status),
      billedTo: profile?.full_name || '',
      quantity,
      unitPrice: formatCurrency(payment.amount),
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
    openReceiptHtml(html);
  };

  const handleReceiptEmail = async (payment: Payment) => {
    if (sendingReceiptId) return;
    const orderId = payment.id;
    const appOrigin = getAppPublicOrigin();
    const endpoints = [
      `/orders/${encodeURIComponent(orderId)}/send-receipt-email`,
      `/student/orders/${encodeURIComponent(orderId)}/send-receipt-email`,
      `/orders/${encodeURIComponent(orderId)}/send-receipt`,
    ];

    setSendingReceiptId(payment.id);
    setReceiptMessage(null);
    try {
      let lastError: unknown = null;
      for (const endpoint of endpoints) {
        try {
          const res = await api.post(endpoint, {
            order_id: payment.order_id ?? payment.id,
            receipt_delivery: 'attachment',
            receipt_format: 'pdf',
            return_origin: appOrigin,
            app_public_url: appOrigin,
            receipt_portal_url: `${appOrigin}/payment-history`,
          });
          if (res.success) {
            setReceiptMessage(t('paymentHistory.receiptSent'));
            setTimeout(() => setReceiptMessage(null), 3000);
            return;
          }
          lastError = new Error(res.msg || 'Request failed');
        } catch (err) {
          lastError = err;
        }
      }
      throw lastError ?? new Error(t('common.error'));
    } catch {
      setReceiptMessage(t('paymentHistory.receiptSendFailed'));
      setTimeout(() => setReceiptMessage(null), 4000);
    } finally {
      setSendingReceiptId(null);
    }
  };

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const list = await loadOrdersFromApi(profile?.id);
        if (!cancelled) setPayments(list);
      } catch (e) {
        if (!cancelled) {
          setPayments([]);
          setLoadError(e instanceof Error ? e.message : 'Load error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  const {
    page: payPage,
    setPage: setPayPage,
    totalPages: payTotalPages,
    pageSize: payPageSize,
    totalItems: payTotalItems,
    paginatedItems: paginatedPayments,
  } = useTablePagination(payments, undefined, [profile?.id]);

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

  const canShowReceiptActions = (status: Payment['status']) => status === 'completed';

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
    const fallbackName =
      payment.package_name?.trim() ||
      payment.description.split(' - ')[0]?.trim() ||
      payment.description.trim();
    if (payment.package_id && payment.token_count !== undefined) {
      const packageNameKey = `tokenPackage.packages.${payment.package_id}.name`;
      const packageName = t(packageNameKey, { defaultValue: fallbackName });
      const tokensLabel = t('tokenPackage.tokens', { defaultValue: 'tokens' });
      return `${packageName} - ${payment.token_count} ${tokensLabel}`;
    }
    return fallbackName;
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
        <div>
          <div className="flex items-center gap-3">
            <Receipt className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('paymentHistory.title')}</h1>
          </div>
          {profile?.full_name && (
            <p className="mt-1 text-sm text-gray-600">
              {t('paymentHistory.forProfile', { name: profile.full_name })}
            </p>
          )}
        </div>

        {receiptMessage && (
          <div
            className={`px-4 py-3 rounded-md border ${
              receiptMessage === t('paymentHistory.receiptSent')
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {receiptMessage}
          </div>
        )}

        {payments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Receipt className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">{t('paymentHistory.noPayments')}</p>
            {loadError && <p className="text-xs text-red-500 mt-2">{loadError}</p>}
          </div>
        ) : (
          <>
            {/* Mobile View - Card Layout */}
            <div className="md:hidden space-y-4">
              {paginatedPayments.map((payment) => (
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
                    {canShowReceiptActions(payment.status) && (
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
                          onClick={() => handleReceiptEmail(payment)}
                          disabled={sendingReceiptId === payment.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary/5"
                        >
                          {sendingReceiptId === payment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Mail className="h-4 w-4" />
                          )}
                          {t('paymentHistory.emailReceipt')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="md:hidden">
              <TablePaginationBar
                page={payPage}
                totalPages={payTotalPages}
                totalItems={payTotalItems}
                pageSize={payPageSize}
                onPageChange={setPayPage}
                className="rounded-lg border border-gray-200 border-t-0 bg-white shadow-md"
              />
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
                    {paginatedPayments.map((payment) => (
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
                          {canShowReceiptActions(payment.status) ? (
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
                                onClick={() => handleReceiptEmail(payment)}
                                disabled={sendingReceiptId === payment.id}
                                className="inline-flex items-center gap-1 px-2 py-1 text-sm font-medium text-primary hover:bg-primary/10 rounded"
                              >
                                {sendingReceiptId === payment.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Mail className="h-4 w-4" />
                                )}
                                {t('paymentHistory.emailReceipt')}
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePaginationBar
                page={payPage}
                totalPages={payTotalPages}
                totalItems={payTotalItems}
                pageSize={payPageSize}
                onPageChange={setPayPage}
                className="rounded-b-lg"
              />
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

