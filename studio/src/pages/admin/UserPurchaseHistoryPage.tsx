import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { api } from '../../lib/api';
import { Search, Receipt, CheckCircle, Clock, XCircle, Filter, Package, X, Printer } from 'lucide-react';

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

export default function UserPurchaseHistoryPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  useEffect(() => {
    loadPurchases();
  }, [statusFilter]);

  async function loadPurchases() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter && statusFilter !== 'all') params.payment_status = statusFilter;
      const res = await api.get<Purchase[]>('admin/orders', params);
      setPurchases(res.data ?? []);
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

  const formatMobile = (mobile: string | null): string => {
    if (!mobile) return '-';
    
    if (mobile.startsWith('852')) {
      return `+852 ${mobile.substring(3)}`;
    } else if (mobile.startsWith('853')) {
      return `+853 ${mobile.substring(3)}`;
    } else if (mobile.startsWith('86')) {
      return `+86 ${mobile.substring(2)}`;
    }
    
    return `+852 ${mobile}`;
  };

  const handlePrintReceipt = () => {
    if (!selectedPurchase) return;
    
    // Create a new window with just the receipt content
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const address = i18n.language === 'en' ? t('contact.addressEN') : t('contact.addressTC');
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${selectedPurchase.order_id}</title>
          <meta charset="UTF-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              padding: 40px;
              color: #111827;
              background: white;
            }
            .receipt-container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
            }
            .company-header {
              text-align: center;
              margin-bottom: 2rem;
              padding-bottom: 1.5rem;
              border-bottom: 1px solid #e5e7eb;
            }
            .company-header h1 {
              font-size: 2rem;
              font-weight: bold;
              margin-bottom: 0.5rem;
              color: #111827;
            }
            .company-header p {
              color: #4b5563;
              margin-bottom: 0.25rem;
            }
            .section {
              margin-bottom: 1.5rem;
              padding-bottom: 1.5rem;
              border-bottom: 1px solid #e5e7eb;
            }
            .section h3 {
              font-size: 1.125rem;
              font-weight: 600;
              margin-bottom: 0.75rem;
              color: #111827;
            }
            .section-title {
              font-size: 1.5rem;
              font-weight: 600;
              margin-bottom: 0.5rem;
              color: #111827;
            }
            .section-subtitle {
              font-size: 0.875rem;
              color: #6b7280;
              margin-bottom: 1.5rem;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 1rem;
              font-size: 0.875rem;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 0.5rem;
              font-size: 0.875rem;
            }
            .info-label {
              color: #4b5563;
            }
            .info-value {
              font-weight: 500;
              color: #111827;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding-top: 0.5rem;
              margin-top: 0.5rem;
              border-top: 1px solid #e5e7eb;
              font-size: 1rem;
              font-weight: 600;
            }
            .footer {
              text-align: center;
              font-size: 0.875rem;
              color: #6b7280;
              margin-top: 2rem;
              padding-top: 1.5rem;
              border-top: 1px solid #e5e7eb;
            }
            .discount {
              color: #dc2626;
            }
            .status-paid {
              color: #16a34a;
            }
            @media print {
              @page {
                margin: 0.5in;
              }
              body {
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="company-header">
              <h1>Yard</h1>
              <p>Dance Academy</p>
              <p style="font-size: 0.875rem; color: #6b7280; margin-top: 0.5rem;">${address}</p>
              <p style="font-size: 0.875rem; color: #6b7280; margin-top: 0.25rem;">${t('contact.email')}: info@theyard.com.hk</p>
            </div>

            <div class="section">
              <h2 class="section-title">${t('admin.purchaseHistory.receipt')}</h2>
              <p class="section-subtitle">${t('admin.purchaseHistory.receiptNumber')}: ${selectedPurchase.order_id}</p>
            </div>

            <div class="section">
              <h3>${t('admin.purchaseHistory.customerInfo')}</h3>
              <div class="info-grid">
                <div>
                  <span class="info-label">${t('admin.purchaseHistory.customerName')}:</span>
                  <span class="info-value">${selectedPurchase.user_name}</span>
                </div>
                <div>
                  <span class="info-label">${t('admin.purchaseHistory.contactNumber')}:</span>
                  <span class="info-value">${formatMobile(selectedPurchase.user_mobile)}</span>
                </div>
              </div>
            </div>

            <div class="section">
              <h3>${t('admin.purchaseHistory.purchaseDetails')}</h3>
              <div class="info-row">
                <span class="info-label">${t('admin.purchaseHistory.package')}:</span>
                <span class="info-value">${selectedPurchase.package_name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">${t('admin.purchaseHistory.quantity')}:</span>
                <span class="info-value">${selectedPurchase.quantity}</span>
              </div>
              <div class="info-row">
                <span class="info-label">${t('admin.purchaseHistory.tokens')}:</span>
                <span class="info-value">${selectedPurchase.token_count * selectedPurchase.quantity} ${t('tokenPackage.tokens')}</span>
              </div>
              ${selectedPurchase.coupon_code ? `
              <div class="info-row">
                <span class="info-label">${t('admin.purchaseHistory.coupon')}:</span>
                <span class="info-value">${selectedPurchase.coupon_code}</span>
              </div>
              ` : ''}
            </div>

            <div class="section">
              <h3>${t('admin.purchaseHistory.paymentSummary')}</h3>
              <div class="info-row">
                <span class="info-label">${t('admin.purchaseHistory.subtotal')}:</span>
                <span class="info-value">${formatCurrency(selectedPurchase.subtotal)}</span>
              </div>
              ${selectedPurchase.discount > 0 ? `
              <div class="info-row">
                <span class="info-label">${t('admin.purchaseHistory.discount')}:</span>
                <span class="info-value discount">-${formatCurrency(selectedPurchase.discount)}</span>
              </div>
              ` : ''}
              <div class="total-row">
                <span>${t('admin.purchaseHistory.total')}:</span>
                <span>${formatCurrency(selectedPurchase.total)}</span>
              </div>
            </div>

            <div class="section">
              <h3>${t('admin.purchaseHistory.paymentInfo')}</h3>
              <div class="info-grid">
                <div>
                  <span class="info-label">${t('admin.purchaseHistory.paymentMethod')}:</span>
                  <span class="info-value">${getPaymentMethodLabel(selectedPurchase.payment_method)}</span>
                </div>
                <div>
                  <span class="info-label">${t('admin.purchaseHistory.paymentStatus')}:</span>
                  <span class="info-value status-paid">${getStatusLabel(selectedPurchase.payment_status)}</span>
                </div>
                <div>
                  <span class="info-label">${t('admin.purchaseHistory.purchaseDate')}:</span>
                  <span class="info-value">${formatDateTime(selectedPurchase.created_at, getLocale())}</span>
                </div>
                ${selectedPurchase.paid_at ? `
                <div>
                  <span class="info-label">${t('admin.purchaseHistory.paidAt')}:</span>
                  <span class="info-value">${formatDateTime(selectedPurchase.paid_at, getLocale())}</span>
                </div>
                ` : ''}
              </div>
            </div>

            <div class="footer">
              <p>${t('admin.purchaseHistory.receiptFooter')}</p>
              <p style="margin-top: 0.5rem;">${t('admin.purchaseHistory.thankYou')}</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print();
      // Optionally close after printing
      // printWindow.close();
    }, 250);
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
        <div className="flex items-center gap-4">
          <Receipt className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.purchaseHistory.title')}</h1>
        </div>

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
              {filteredPurchases.map((purchase) => (
                <div key={purchase.id} className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="font-semibold text-base text-gray-900 mb-1">
                        {purchase.user_name}
                      </div>
                      <div className="text-gray-500 text-xs mb-1">
                        {formatMobile(purchase.user_mobile)}
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
                    {purchase.payment_status === 'paid' && (
                      <div className="pt-2 border-t border-gray-100 space-y-2">
                        <button
                          onClick={() => setSelectedPurchase(purchase)}
                          className="w-full px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                        >
                          <Receipt className="h-4 w-4" />
                          {t('admin.purchaseHistory.receipt')}
                        </button>
                        <button
                          onClick={() => navigate(`/admin/users/${purchase.user_id}/assign-tokens`)}
                          className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                        >
                          <Package className="h-4 w-4" />
                          {t('admin.users.assignTokens')}
                        </button>
                      </div>
                    )}
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
                    {filteredPurchases.map((purchase) => (
                      <tr key={purchase.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {purchase.order_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{purchase.user_name}</div>
                            <div className="text-gray-500 text-xs">{formatMobile(purchase.user_mobile)}</div>
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
                          <div className="flex items-center gap-2">
                            {purchase.payment_status === 'paid' && (
                              <>
                                <button
                                  onClick={() => setSelectedPurchase(purchase)}
                                  className="px-3 py-1.5 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors flex items-center gap-2 text-sm font-medium"
                                  title={t('admin.purchaseHistory.receipt')}
                                >
                                  <Receipt className="h-4 w-4" />
                                  {t('admin.purchaseHistory.receipt')}
                                </button>
                                <button
                                  onClick={() => navigate(`/admin/users/${purchase.user_id}/assign-tokens`)}
                                  className="px-3 py-1.5 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors flex items-center gap-2 text-sm font-medium"
                                  title={t('admin.users.assignTokens')}
                                >
                                  <Package className="h-4 w-4" />
                                  {t('admin.users.assignTokens')}
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
            </div>
          </>
        )}
      </div>

      {/* Receipt Modal */}
      {selectedPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto print:max-h-none print:shadow-none">
            {/* Receipt Content - Printable */}
            <div id="receipt-content" className="p-8 print:p-6">
              {/* Company Header */}
              <div className="text-center mb-8 border-b border-gray-200 pb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Yard</h1>
                <p className="text-gray-600 mb-1">Dance Academy</p>
                <p className="text-sm text-gray-500 mb-2">
                  {i18n.language === 'en' ? t('contact.addressEN') : t('contact.addressTC')}
                </p>
                <p className="text-sm text-gray-500">
                  {t('contact.email')}: info@theyard.com.hk
                </p>
              </div>

              {/* Receipt Title */}
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  {t('admin.purchaseHistory.receipt')}
                </h2>
                <p className="text-sm text-gray-500">
                  {t('admin.purchaseHistory.receiptNumber')}: {selectedPurchase.order_id}
                </p>
              </div>

              {/* Customer Information */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {t('admin.purchaseHistory.customerInfo')}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">{t('admin.purchaseHistory.customerName')}:</span>
                    <span className="ml-2 font-medium text-gray-900">{selectedPurchase.user_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">{t('admin.purchaseHistory.contactNumber')}:</span>
                    <span className="ml-2 font-medium text-gray-900">{formatMobile(selectedPurchase.user_mobile)}</span>
                  </div>
                </div>
              </div>

              {/* Purchase Details */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {t('admin.purchaseHistory.purchaseDetails')}
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('admin.purchaseHistory.package')}:</span>
                    <span className="font-medium text-gray-900">{selectedPurchase.package_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('admin.purchaseHistory.quantity')}:</span>
                    <span className="font-medium text-gray-900">{selectedPurchase.quantity}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('admin.purchaseHistory.tokens')}:</span>
                    <span className="font-medium text-gray-900">
                      {selectedPurchase.token_count * selectedPurchase.quantity} {t('tokenPackage.tokens')}
                    </span>
                  </div>
                  {selectedPurchase.coupon_code && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{t('admin.purchaseHistory.coupon')}:</span>
                      <span className="font-medium text-gray-900">{selectedPurchase.coupon_code}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Summary */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {t('admin.purchaseHistory.paymentSummary')}
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('admin.purchaseHistory.subtotal')}:</span>
                    <span className="text-gray-900">{formatCurrency(selectedPurchase.subtotal)}</span>
                  </div>
                  {selectedPurchase.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{t('admin.purchaseHistory.discount')}:</span>
                      <span className="text-red-600">-{formatCurrency(selectedPurchase.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-200">
                    <span className="text-gray-900">{t('admin.purchaseHistory.total')}:</span>
                    <span className="text-gray-900">{formatCurrency(selectedPurchase.total)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {t('admin.purchaseHistory.paymentInfo')}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">{t('admin.purchaseHistory.paymentMethod')}:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {getPaymentMethodLabel(selectedPurchase.payment_method)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">{t('admin.purchaseHistory.paymentStatus')}:</span>
                    <span className="ml-2 font-medium text-green-600">
                      {getStatusLabel(selectedPurchase.payment_status)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">{t('admin.purchaseHistory.purchaseDate')}:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {formatDateTime(selectedPurchase.created_at, getLocale())}
                    </span>
                  </div>
                  {selectedPurchase.paid_at && (
                    <div>
                      <span className="text-gray-600">{t('admin.purchaseHistory.paidAt')}:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {formatDateTime(selectedPurchase.paid_at, getLocale())}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-sm text-gray-500 mt-8 pt-6 border-t border-gray-200">
                <p>{t('admin.purchaseHistory.receiptFooter')}</p>
                <p className="mt-2">{t('admin.purchaseHistory.thankYou')}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-8 py-4 flex justify-end gap-3 print:hidden">
              <button
                onClick={() => setSelectedPurchase(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                {t('common.close')}
              </button>
              <button
                onClick={handlePrintReceipt}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                {t('admin.purchaseHistory.print')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

