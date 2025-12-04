import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { Search, Receipt, CheckCircle, Clock, XCircle, Filter, Package } from 'lucide-react';

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
}

// Mock data
const MOCK_PURCHASES: Purchase[] = [
  {
    id: '1',
    order_id: 'ORD-001',
    user_id: 'user1',
    user_name: '張三',
    user_mobile: '91234567',
    package_id: '3',
    package_name: 'Premium Pack',
    quantity: 1,
    subtotal: 1600,
    discount: 0,
    total: 1600,
    coupon_code: null,
    payment_status: 'paid',
    payment_method: 'credit_card',
    payment_slip_url: null,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    paid_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString(),
    token_count: 20,
  },
  {
    id: '2',
    order_id: 'ORD-002',
    user_id: 'user2',
    user_name: '李四',
    user_mobile: '98765432',
    package_id: '2',
    package_name: 'Regular Pack',
    quantity: 2,
    subtotal: 1800,
    discount: 180,
    total: 1620,
    coupon_code: 'SAVE10',
    payment_status: 'paid',
    payment_method: 'fps',
    payment_slip_url: null,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    paid_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(),
    token_count: 20,
  },
  {
    id: '3',
    order_id: 'ORD-003',
    user_id: 'user3',
    user_name: '王五',
    user_mobile: '92345678',
    package_id: '1',
    package_name: 'Starter Pack',
    quantity: 1,
    subtotal: 500,
    discount: 0,
    total: 500,
    coupon_code: null,
    payment_status: 'pending',
    payment_method: 'cash',
    payment_slip_url: null,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    paid_at: null,
    token_count: 5,
  },
  {
    id: '4',
    order_id: 'ORD-004',
    user_id: 'user1',
    user_name: '張三',
    user_mobile: '91234567',
    package_id: '2',
    package_name: 'Regular Pack',
    quantity: 1,
    subtotal: 900,
    discount: 0,
    total: 900,
    coupon_code: null,
    payment_status: 'paid',
    payment_method: 'credit_card',
    payment_slip_url: null,
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    paid_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(),
    token_count: 10,
  },
  {
    id: '5',
    order_id: 'ORD-005',
    user_id: 'user4',
    user_name: '陳六',
    user_mobile: '93456789',
    package_id: '3',
    package_name: 'Premium Pack',
    quantity: 1,
    subtotal: 1600,
    discount: 320,
    total: 1280,
    coupon_code: 'PREMIUM20',
    payment_status: 'failed',
    payment_method: 'credit_card',
    payment_slip_url: null,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    paid_at: null,
    token_count: 20,
  },
];

export default function UserPurchaseHistoryPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadPurchases();
  }, []);

  async function loadPurchases() {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    setPurchases(MOCK_PURCHASES);
    setLoading(false);
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
                      <div className="pt-2 border-t border-gray-100">
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
                          {purchase.payment_status === 'paid' && (
                            <button
                              onClick={() => navigate(`/admin/users/${purchase.user_id}/assign-tokens`)}
                              className="px-3 py-1.5 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors flex items-center gap-2 text-sm font-medium"
                              title={t('admin.users.assignTokens')}
                            >
                              <Package className="h-4 w-4" />
                              {t('admin.users.assignTokens')}
                            </button>
                          )}
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

