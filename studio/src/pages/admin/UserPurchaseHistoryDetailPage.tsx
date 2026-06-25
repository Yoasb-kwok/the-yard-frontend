import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { formatCurrency, formatDateOnly, formatDateTime, formatMobileForDisplay } from '../../lib/utils';
import { api } from '../../lib/api';
import {
  buildPurchaseReceiptHtml,
  getPurchaseReceiptLine,
  openReceiptHtml,
} from '../../lib/receiptHtml';
import { ArrowLeft, Receipt, CheckCircle, Clock, XCircle, Search, Filter, X } from 'lucide-react';
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
  payment_method: 'credit_card' | 'fps' | 'cash';
  payment_slip_url: string | null;
  created_at: string;
  paid_at: string | null;
  token_count: number;
  start_date: string | null;
  remarks: string | null;
}

interface User {
  id: string;
  full_name: string;
  mobile: string | null;
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
    payment_method: row?.payment_method ?? 'cash',
    payment_slip_url: row?.payment_slip_url ?? null,
    created_at: String(row?.created_at ?? new Date().toISOString()),
    paid_at: row?.paid_at ?? null,
    token_count: toNumber(row?.token_count ?? pkg?.token_count ?? row?.tokens, 0),
    start_date:
      row?.start_date != null && String(row.start_date).trim() !== ''
        ? String(row.start_date).slice(0, 10)
        : null,
    remarks: row?.remarks != null && String(row.remarks).trim() !== '' ? String(row.remarks).trim() : null,
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

export default function UserPurchaseHistoryDetailPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  async function loadData() {
    setLoading(true);
    try {
      const orderRes = await api.get<any>('/admin/orders', { user_id: userId });
      const rows = extractPurchaseList(orderRes);
      setPurchases(rows);

      const first = rows[0];
      if (first?.user_id || first?.user_name) {
        setUser({
          id: first.user_id || String(userId),
          full_name: first.user_name || '-',
          mobile: first.user_mobile ?? null,
        });
      } else {
        // Fallback: try users list if order rows don't include user fields.
        const usersRes = await api.get<any>('/admin/users');
        const list = Array.isArray(usersRes?.data) ? usersRes.data : [];
        const matched = list.find((u: any) => String(u?.id) === String(userId));
        if (matched) {
          setUser({
            id: String(matched.id),
            full_name: String(matched.full_name ?? matched.name ?? '-'),
            mobile: matched.mobile ?? null,
          });
        } else {
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Failed to load user purchase history:', error);
      setPurchases([]);
      setUser(null);
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
      purchase.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.package_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || purchase.payment_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const {
    page: detailPurchasePage,
    setPage: setDetailPurchasePage,
    totalPages: detailPurchaseTotalPages,
    pageSize: detailPurchasePageSize,
    totalItems: detailPurchaseTotalItems,
    paginatedItems: paginatedDetailPurchases,
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

  if (!user) {
    return (
      <Layout>
        <div className="p-6">
          <p className="text-gray-600">{t('admin.users.userNotFound')}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/users')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>{t('common.back')}</span>
          </button>
          <div className="flex items-center gap-4">
            <Receipt className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('admin.purchaseHistory.userPurchaseHistory')}</h1>
              <p className="text-gray-600 mt-1">{user.full_name} ({formatMobileForDisplay(user.mobile, '-')})</p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
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
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
            >
              <Filter className="h-5 w-5" />
              {t('admin.purchaseHistory.filter')}
            </button>
          </div>

          {showFilters && (
            <div className="border-t pt-4 mt-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('admin.purchaseHistory.allStatuses')}
                </button>
                {(['paid', 'pending', 'failed', 'not_required'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      statusFilter === status
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {getStatusLabel(status)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Purchases List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {filteredPurchases.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              {t('admin.purchaseHistory.noPurchases')}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.purchaseHistory.orderId')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.purchaseHistory.package')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.purchaseHistory.quantity')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.purchaseHistory.total')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.purchaseHistory.paymentStatus')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.purchaseHistory.paymentMethod')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.purchaseHistory.date')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.purchaseHistory.startDate')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.purchaseHistory.remarks')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.purchaseHistory.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedDetailPurchases.map((purchase) => (
                      <tr key={purchase.id}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{purchase.order_id}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{purchase.package_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{purchase.quantity}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatCurrency(purchase.total)}</td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(purchase.payment_status)}
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(purchase.payment_status)}`}>
                              {getStatusLabel(purchase.payment_status)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{getPaymentMethodLabel(purchase.payment_method)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDateTime(purchase.created_at, getLocale())}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                          {purchase.start_date ? formatDateOnly(purchase.start_date, getLocale()) : '–'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 align-top min-w-[10rem] max-w-[16rem] whitespace-pre-wrap break-words">
                          {purchase.remarks || '–'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-2">
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
                <TablePaginationBar
                  page={detailPurchasePage}
                  totalPages={detailPurchaseTotalPages}
                  totalItems={detailPurchaseTotalItems}
                  pageSize={detailPurchasePageSize}
                  onPageChange={setDetailPurchasePage}
                  className="hidden md:flex"
                />
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-200">
                {paginatedDetailPurchases.map((purchase) => (
                  <div key={purchase.id} className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">{purchase.order_id}</h3>
                        <p className="text-xs text-gray-600 mt-1">{purchase.package_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(purchase.payment_status)}
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(purchase.payment_status)}`}>
                          {getStatusLabel(purchase.payment_status)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('admin.purchaseHistory.quantity')}:</span>
                        <span className="text-gray-900">{purchase.quantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('admin.purchaseHistory.total')}:</span>
                        <span className="text-gray-900 font-medium">{formatCurrency(purchase.total)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('admin.purchaseHistory.paymentMethod')}:</span>
                        <span className="text-gray-900">{getPaymentMethodLabel(purchase.payment_method)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('admin.purchaseHistory.date')}:</span>
                        <span className="text-gray-900">{formatDateTime(purchase.created_at, getLocale())}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('admin.purchaseHistory.startDate')}:</span>
                        <span className="text-gray-900">
                          {purchase.start_date ? formatDateOnly(purchase.start_date, getLocale()) : '–'}
                        </span>
                      </div>
                      {purchase.remarks && (
                        <div className="flex justify-between items-start gap-3">
                          <span className="text-gray-500 shrink-0">{t('admin.purchaseHistory.remarks')}:</span>
                          <span className="text-gray-900 text-right break-words">{purchase.remarks}</span>
                        </div>
                      )}
                      {purchase.payment_status === 'paid' && (
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <button
                            onClick={() => handleViewReceipt(purchase)}
                            className="p-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                            title={t('admin.purchaseHistory.receipt')}
                            aria-label={t('admin.purchaseHistory.receipt')}
                          >
                            <Receipt className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <TablePaginationBar
                page={detailPurchasePage}
                totalPages={detailPurchaseTotalPages}
                totalItems={detailPurchaseTotalItems}
                pageSize={detailPurchasePageSize}
                onPageChange={setDetailPurchasePage}
                className="md:hidden border-t border-gray-200"
              />
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

