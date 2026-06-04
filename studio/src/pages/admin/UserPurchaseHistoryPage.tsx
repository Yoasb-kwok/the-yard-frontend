import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { extractServerErrorText, formatCurrency, formatDateTime, formatMobileForDisplay } from '../../lib/utils';
import { api, ApiError } from '../../lib/api';
import { patchAdminOrderPaymentStatus } from '../../lib/adminOrderApi';
import {
  buildPurchaseReceiptHtml,
  getPurchaseReceiptLine,
  openReceiptHtml,
} from '../../lib/receiptHtml';
import { Search, Receipt, CheckCircle, Clock, XCircle, Filter, X, Pencil } from 'lucide-react';
import { TablePaginationBar, useTablePagination } from '../../components/TablePagination';

interface Purchase {
  id: string;
  order_id: string;
  user_id: string;
  user_name: string;
  user_mobile: string | null;
  package_id: string;
  package_name: string;
  quantity: number;
  subtotal: number;
  discount: number;
  total: number;
  coupon_code: string | null;
  payment_status: 'pending' | 'paid' | 'failed' | 'not_required';
  payment_method: string | null;
  payment_slip_url: string | null;
  created_at: string;
  paid_at: string | null;
  token_count: number;
}

type PurchaseStatus = Purchase['payment_status'];

function normalizePaymentStatus(value: unknown): PurchaseStatus {
  const next = String(value ?? '').toLowerCase();
  if (next === 'paid' || next === 'pending' || next === 'failed' || next === 'not_required') {
    return next;
  }
  return 'pending';
}

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizePurchaseRow(row: any): Purchase {
  const user = row?.user ?? {};
  const pkg = row?.package ?? {};
  const coupon = row?.coupon ?? {};
  const id = String(row?.id ?? row?.order_id ?? '');
  const orderId = String(row?.order_id ?? row?.id ?? '');

  return {
    id: id || orderId,
    order_id: orderId || id,
    user_id: String(row?.user_id ?? user?.id ?? ''),
    user_name: String(row?.user_name ?? user?.full_name ?? user?.name ?? '-'),
    user_mobile: row?.user_mobile ?? user?.mobile ?? null,
    package_id: String(row?.package_id ?? pkg?.id ?? ''),
    package_name: String(row?.package_name ?? pkg?.name ?? '-'),
    quantity: toNumber(row?.quantity ?? row?.qty, 1),
    subtotal: toNumber(row?.subtotal ?? row?.total, 0),
    discount: toNumber(row?.discount, 0),
    total: toNumber(row?.total ?? row?.subtotal, 0),
    coupon_code: row?.coupon_code ?? coupon?.code ?? null,
    payment_status: normalizePaymentStatus(row?.payment_status),
    payment_method: row?.payment_method ?? null,
    payment_slip_url: row?.payment_slip_url ?? null,
    created_at: String(row?.created_at ?? new Date().toISOString()),
    paid_at: row?.paid_at ?? null,
    token_count: toNumber(row?.token_count ?? pkg?.token_count ?? row?.tokens, 0),
  };
}

function extractPurchaseList(payload: any): Purchase[] {
  const candidates = [
    payload,
    payload?.data,
    payload?.data?.data,
    payload?.orders,
    payload?.data?.orders,
  ];
  const rows = candidates.find((x) => Array.isArray(x));
  if (!Array.isArray(rows)) return [];
  return rows.map(normalizePurchaseRow).filter((r) => r.id || r.order_id);
}

export default function UserPurchaseHistoryPage() {
  const { t, i18n } = useTranslation();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [statusEditPurchase, setStatusEditPurchase] = useState<Purchase | null>(null);
  const [statusEditStep, setStatusEditStep] = useState<1 | 2>(1);
  const [pendingPaymentStatus, setPendingPaymentStatus] = useState<Purchase['payment_status'] | null>(null);
  const [statusConfirmChecked, setStatusConfirmChecked] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusEditError, setStatusEditError] = useState<string | null>(null);
  const [statusSuccessMessage, setStatusSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadPurchases();
  }, [statusFilter]);

  async function loadPurchases() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter && statusFilter !== 'all') params.payment_status = statusFilter;
      const res = await api.get<any>('admin/orders', params);
      const next = extractPurchaseList(res);
      setPurchases(next);
    } catch (err) {
      console.error('Failed to load purchases:', err);
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  }

  const getLocale = (): string => {
    const langMap: { [key: string]: string } = {
      'en': 'en-US',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
    };
    return langMap[i18n.language] || i18n.language || 'en-US';
  };

  const getStatusIcon = (status: Purchase['payment_status']) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'not_required':
        return <CheckCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusLabel = (status: Purchase['payment_status']) => {
    return t(`admin.purchaseHistory.statuses.${status}`);
  };

  const getStatusColor = (status: Purchase['payment_status']) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'not_required':
        return 'bg-gray-100 text-gray-800';
    }
  };

  function openStatusEdit(purchase: Purchase) {
    setStatusEditError(null);
    setStatusConfirmChecked(false);
    setStatusEditStep(1);
    setStatusEditPurchase(purchase);
    setPendingPaymentStatus(purchase.payment_status);
  }

  function closeStatusEdit() {
    setStatusEditPurchase(null);
    setStatusEditStep(1);
    setPendingPaymentStatus(null);
    setStatusConfirmChecked(false);
    setStatusEditError(null);
    setStatusUpdating(false);
  }

  async function applyPaymentStatusChange() {
    if (!statusEditPurchase || !pendingPaymentStatus || pendingPaymentStatus === statusEditPurchase.payment_status) return;
    setStatusUpdating(true);
    setStatusEditError(null);
    try {
      await patchAdminOrderPaymentStatus(statusEditPurchase.id, pendingPaymentStatus);
      setStatusSuccessMessage(t('admin.purchaseHistory.statusUpdateSuccess'));
      setTimeout(() => setStatusSuccessMessage(null), 4000);
      closeStatusEdit();
      await loadPurchases();
    } catch (e) {
      let msg: string;
      if (e instanceof ApiError) {
        const detail = extractServerErrorText(e.message);
        if (e.status === 404 || /cannot\s+patch/i.test(detail)) {
          msg = t('admin.purchaseHistory.statusUpdateRouteMissing');
        } else {
          msg = detail || t('admin.purchaseHistory.statusUpdateFailed');
        }
      } else if (e instanceof Error) {
        msg = extractServerErrorText(e.message) || e.message;
      } else {
        msg = t('admin.purchaseHistory.statusUpdateFailed');
      }
      setStatusEditError(msg);
    } finally {
      setStatusUpdating(false);
    }
  }

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return '-';
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

  const receiptLabels = {
    orderId: t('paymentHistory.orderId'),
    date: t('paymentHistory.date'),
    description: t('paymentHistory.description'),
    paymentMethod: t('paymentHistory.paymentMethod'),
    amount: t('paymentHistory.amount'),
    status: t('paymentHistory.status'),
  };

  const buildReceiptHtmlForPurchase = (purchase: Purchase) => {
    const { description, quantity } = getPurchaseReceiptLine({
      packageName: purchase.package_name,
      packageId: purchase.package_id,
      tokenCount: purchase.token_count,
      packageQuantity: purchase.quantity,
      translate: (key, opts) => t(key, opts),
      tokensLabel: t('tokenPackage.tokens'),
    });
    const receiptDate = formatDateTime(purchase.paid_at ?? purchase.created_at, getLocale());
    const notes = purchase.coupon_code
      ? `${t('admin.purchaseHistory.coupon')}: ${purchase.coupon_code}`
      : '-';

    return buildPurchaseReceiptHtml({
      orderId: purchase.order_id,
      date: receiptDate,
      description,
      paymentMethod: getPaymentMethodLabel(purchase.payment_method),
      totalFormatted: formatCurrency(purchase.total),
      status: getStatusLabel(purchase.payment_status),
      billedTo: purchase.user_name,
      quantity,
      unitPrice: formatCurrency(purchase.total),
      discountFormatted: purchase.discount > 0 ? formatCurrency(purchase.discount) : undefined,
      notes,
      receiptTitle: t('paymentHistory.receiptTitle'),
      printHint: t('paymentHistory.receiptPrintHint'),
      labels: receiptLabels,
    });
  };

  const handleViewReceipt = (purchase: Purchase) => {
    openReceiptHtml(buildReceiptHtmlForPurchase(purchase));
  };

  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = 
      purchase.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.user_mobile?.includes(searchTerm) ||
      purchase.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.package_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || purchase.payment_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const {
    page: purchasePage,
    setPage: setPurchasePage,
    totalPages: purchaseTotalPages,
    pageSize: purchasePageSize,
    totalItems: purchaseTotalItems,
    paginatedItems: paginatedPurchases,
  } = useTablePagination(filteredPurchases, undefined, [searchTerm, statusFilter]);

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
      <div className="space-y-6 min-w-0 max-w-full">
        <div className="flex items-center gap-4">
          <Receipt className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.purchaseHistory.title')}</h1>
        </div>

        {statusSuccessMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md text-sm">
            {statusSuccessMessage}
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder={t('admin.purchaseHistory.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  showFilters
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Filter className="h-4 w-4" />
                {t('admin.purchaseHistory.filter')}
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.purchaseHistory.paymentStatus')}
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">{t('admin.purchaseHistory.allStatuses')}</option>
                    <option value="paid">{t('admin.purchaseHistory.statuses.paid')}</option>
                    <option value="pending">{t('admin.purchaseHistory.statuses.pending')}</option>
                    <option value="failed">{t('admin.purchaseHistory.statuses.failed')}</option>
                    <option value="not_required">{t('admin.purchaseHistory.statuses.not_required')}</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Purchase History List */}
        {filteredPurchases.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Receipt className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">{t('admin.purchaseHistory.noPurchases')}</p>
          </div>
        ) : (
          <>
            {/* Mobile View - Card Layout */}
            <div className="md:hidden space-y-4">
              {paginatedPurchases.map((purchase) => (
                <div key={purchase.id} className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="font-semibold text-base text-gray-900 mb-1">
                        {purchase.user_name}
                      </div>
                      <div className="text-gray-500 text-xs mb-1">
                        {formatMobileForDisplay(purchase.user_mobile, '-')}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {t('admin.purchaseHistory.orderId')}: {purchase.order_id}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(purchase.payment_status)}
                    </div>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t('admin.purchaseHistory.package')}</span>
                      <span className="text-sm font-medium text-gray-900">
                        {purchase.package_name} × {purchase.quantity}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t('admin.purchaseHistory.tokens')}</span>
                      <span className="text-sm text-gray-900">
                        {purchase.token_count * purchase.quantity} {t('tokenPackage.tokens')}
                      </span>
                    </div>
                    {purchase.coupon_code && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{t('admin.purchaseHistory.coupon')}</span>
                        <span className="text-sm text-gray-900">{purchase.coupon_code}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t('admin.purchaseHistory.subtotal')}</span>
                      <span className="text-sm text-gray-900">{formatCurrency(purchase.subtotal)}</span>
                    </div>
                    {purchase.discount > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{t('admin.purchaseHistory.discount')}</span>
                        <span className="text-sm text-red-600">-{formatCurrency(purchase.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                      <span className="text-sm font-medium text-gray-700">{t('admin.purchaseHistory.total')}</span>
                      <span className="text-base font-semibold text-gray-900">
                        {formatCurrency(purchase.total)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t('admin.purchaseHistory.paymentMethod')}</span>
                      <span className="text-sm text-gray-900">
                        {getPaymentMethodLabel(purchase.payment_method)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t('admin.purchaseHistory.date')}</span>
                      <span className="text-sm text-gray-900">
                        {formatDateTime(purchase.created_at, getLocale())}
                      </span>
                    </div>
                    {purchase.paid_at && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{t('admin.purchaseHistory.paidAt')}</span>
                        <span className="text-sm text-gray-900">
                          {formatDateTime(purchase.paid_at, getLocale())}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                      <span className="text-sm text-gray-600">{t('admin.purchaseHistory.status')}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(purchase.payment_status)}`}>
                        {getStatusLabel(purchase.payment_status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100 mt-2">
                      <button
                        type="button"
                        onClick={() => openStatusEdit(purchase)}
                        className="p-2 border border-gray-300 text-gray-800 rounded-md hover:bg-gray-50 transition-colors"
                        title={t('admin.purchaseHistory.editPaymentStatus')}
                        aria-label={t('admin.purchaseHistory.editPaymentStatus')}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {purchase.payment_status === 'paid' && (
                        <>
                          <button
                            onClick={() => handleViewReceipt(purchase)}
                            className="p-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                            title={t('admin.purchaseHistory.receipt')}
                            aria-label={t('admin.purchaseHistory.receipt')}
                          >
                            <Receipt className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="md:hidden">
              <TablePaginationBar
                page={purchasePage}
                totalPages={purchaseTotalPages}
                totalItems={purchaseTotalItems}
                pageSize={purchasePageSize}
                onPageChange={setPurchasePage}
                className="rounded-lg border border-gray-200 border-t-0 bg-white shadow-md"
              />
            </div>

            {/* Desktop View - Table Layout (horizontal scroll when columns exceed viewport) */}
            <div className="hidden md:block bg-white rounded-lg shadow-md border border-gray-200">
              <div className="horizontal-scroll-always w-full min-w-0 overscroll-x-contain pb-1">
                <table className="min-w-max w-full table-auto divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('admin.purchaseHistory.orderId')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('admin.purchaseHistory.user')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('admin.purchaseHistory.package')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('admin.purchaseHistory.quantity')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('admin.purchaseHistory.total')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('admin.purchaseHistory.paymentMethod')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('admin.purchaseHistory.status')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('admin.purchaseHistory.date')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('admin.purchaseHistory.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedPurchases.map((purchase) => (
                      <tr key={purchase.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {purchase.order_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{purchase.user_name}</div>
                            <div className="text-gray-500 text-xs">{formatMobileForDisplay(purchase.user_mobile, '-')}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{purchase.package_name}</div>
                            <div className="text-gray-500 text-xs">
                              {purchase.token_count * purchase.quantity} {t('tokenPackage.tokens')}
                            </div>
                            {purchase.coupon_code && (
                              <div className="text-xs text-primary mt-1">
                                {t('admin.purchaseHistory.coupon')}: {purchase.coupon_code}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {purchase.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{formatCurrency(purchase.total)}</div>
                            {purchase.discount > 0 && (
                              <div className="text-xs text-gray-500">
                                {t('admin.purchaseHistory.subtotal')}: {formatCurrency(purchase.subtotal)}
                              </div>
                            )}
                            {purchase.discount > 0 && (
                              <div className="text-xs text-red-600">
                                {t('admin.purchaseHistory.discount')}: -{formatCurrency(purchase.discount)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {getPaymentMethodLabel(purchase.payment_method)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(purchase.payment_status)}
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(purchase.payment_status)}`}>
                              {getStatusLabel(purchase.payment_status)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <div>
                            <div>{formatDateTime(purchase.created_at, getLocale())}</div>
                            {purchase.paid_at && (
                              <div className="text-xs text-gray-500 mt-1">
                                {t('admin.purchaseHistory.paidAt')}: {formatDateTime(purchase.paid_at, getLocale())}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openStatusEdit(purchase)}
                              className="p-2 border border-gray-300 text-gray-800 rounded-md hover:bg-gray-50 transition-colors"
                              title={t('admin.purchaseHistory.editPaymentStatus')}
                              aria-label={t('admin.purchaseHistory.editPaymentStatus')}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            {purchase.payment_status === 'paid' && (
                              <>
                                <button
                                  onClick={() => handleViewReceipt(purchase)}
                                  className="p-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                                  title={t('admin.purchaseHistory.receipt')}
                                  aria-label={t('admin.purchaseHistory.receipt')}
                                >
                                  <Receipt className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePaginationBar
                page={purchasePage}
                totalPages={purchaseTotalPages}
                totalItems={purchaseTotalItems}
                pageSize={purchasePageSize}
                onPageChange={setPurchasePage}
                className="rounded-b-lg"
              />
            </div>
          </>
        )}
      </div>

      {/* Receipt Modal */}
      {statusEditPurchase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-labelledby="status-edit-title"
          >
            <div className="p-6 border-b border-gray-200 flex items-start justify-between gap-3">
              <h2 id="status-edit-title" className="text-lg font-semibold text-gray-900">
                {statusEditStep === 1
                  ? t('admin.purchaseHistory.editPaymentStatus')
                  : t('admin.purchaseHistory.confirmStatusTitle')}
              </h2>
              <button
                type="button"
                onClick={closeStatusEdit}
                className="p-1 rounded-md text-gray-500 hover:bg-gray-100"
                aria-label={t('common.close')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {statusEditStep === 1 && (
                <>
                  <p className="text-sm text-gray-600">
                    {t('admin.purchaseHistory.orderId')}:{' '}
                    <span className="font-mono font-medium text-gray-900">{statusEditPurchase.order_id}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    {t('admin.purchaseHistory.user')}:{' '}
                    <span className="font-medium text-gray-900">{statusEditPurchase.user_name}</span>
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.purchaseHistory.currentStatus')}
                    </label>
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getStatusColor(statusEditPurchase.payment_status)}`}>
                      {getStatusLabel(statusEditPurchase.payment_status)}
                    </span>
                  </div>
                  <div>
                    <label htmlFor="new-payment-status" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.purchaseHistory.newPaymentStatus')}
                    </label>
                    <select
                      id="new-payment-status"
                      value={pendingPaymentStatus ?? statusEditPurchase.payment_status}
                      onChange={(e) => setPendingPaymentStatus(e.target.value as Purchase['payment_status'])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="paid">{t('admin.purchaseHistory.statuses.paid')}</option>
                      <option value="pending">{t('admin.purchaseHistory.statuses.pending')}</option>
                      <option value="failed">{t('admin.purchaseHistory.statuses.failed')}</option>
                      <option value="not_required">{t('admin.purchaseHistory.statuses.not_required')}</option>
                    </select>
                  </div>
                  {statusEditError && <p className="text-sm text-red-600">{statusEditError}</p>}
                </>
              )}

              {statusEditStep === 2 && statusEditPurchase && pendingPaymentStatus && (
                <>
                  <p className="text-sm text-gray-800">
                    {t('admin.purchaseHistory.confirmStatusSummary', {
                      orderId: statusEditPurchase.order_id,
                      from: getStatusLabel(statusEditPurchase.payment_status),
                      to: getStatusLabel(pendingPaymentStatus),
                    })}
                  </p>
                  <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3">
                    {t('admin.purchaseHistory.confirmStatusWarning')}
                  </p>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={statusConfirmChecked}
                      onChange={(e) => setStatusConfirmChecked(e.target.checked)}
                    />
                    <span className="text-sm text-gray-700">{t('admin.purchaseHistory.confirmStatusCheckbox')}</span>
                  </label>
                  {statusEditError && <p className="text-sm text-red-600">{statusEditError}</p>}
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex flex-wrap justify-end gap-2">
              {statusEditStep === 1 ? (
                <>
                  <button
                    type="button"
                    onClick={closeStatusEdit}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    disabled={!pendingPaymentStatus || pendingPaymentStatus === statusEditPurchase.payment_status}
                    onClick={() => {
                      setStatusEditError(null);
                      setStatusConfirmChecked(false);
                      setStatusEditStep(2);
                    }}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('admin.purchaseHistory.continueToConfirm')}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={statusUpdating}
                    onClick={() => {
                      setStatusEditStep(1);
                      setStatusConfirmChecked(false);
                      setStatusEditError(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
                  >
                    {t('common.back')}
                  </button>
                  <button
                    type="button"
                    disabled={statusUpdating || !statusConfirmChecked || !pendingPaymentStatus}
                    onClick={() => applyPaymentStatusChange()}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {statusUpdating ? t('common.sending') : t('admin.purchaseHistory.applyStatusChange')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

