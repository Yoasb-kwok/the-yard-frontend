import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { ArrowLeft, Receipt, CheckCircle, Clock, XCircle, Search, Filter, Package } from 'lucide-react';

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

interface User {
  id: string;
  full_name: string;
  mobile: string | null;
}

// Mock data - in real app, this would come from API
const MOCK_PURCHASES: Purchase[] = [
  {
    id: '1',
    order_id: 'ORD-001',
    user_id: 'student-001',
    user_name: 'Student User',
    user_mobile: '87654321',
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
    user_id: 'student-001',
    user_name: 'Student User',
    user_mobile: '87654321',
    package_id: '2',
    package_name: 'Regular Pack',
    quantity: 1,
    subtotal: 900,
    discount: 90,
    total: 810,
    coupon_code: 'SAVE10',
    payment_status: 'paid',
    payment_method: 'fps',
    payment_slip_url: null,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    paid_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(),
    token_count: 10,
  },
  {
    id: '3',
    order_id: 'ORD-003',
    user_id: 'student-002',
    user_name: 'John Doe',
    user_mobile: '98765432',
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
];

const MOCK_USER: User = {
  id: 'student-001',
  full_name: 'Student User',
  mobile: '87654321',
};

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
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    setUser(MOCK_USER);
    
    // Load purchases for this user
    await new Promise(resolve => setTimeout(resolve, 300));
    const userPurchases = MOCK_PURCHASES.filter(p => p.user_id === userId);
    setPurchases(userPurchases);
    
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
              <p className="text-gray-600 mt-1">{user.full_name} ({formatMobile(user.mobile)})</p>
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.purchaseHistory.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredPurchases.map((purchase) => (
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
                        <td className="px-6 py-4 text-sm">
                          {purchase.payment_status === 'paid' && (
                            <button
                              onClick={() => navigate(`/admin/users/${userId}/assign-tokens`)}
                              className="text-primary hover:text-primary-dark flex items-center gap-1"
                              title={t('admin.purchaseHistory.assignTokens')}
                            >
                              <Package className="h-4 w-4" />
                              <span className="hidden lg:inline">{t('admin.purchaseHistory.assignTokens')}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-200">
                {filteredPurchases.map((purchase) => (
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
                      {purchase.payment_status === 'paid' && (
                        <div className="pt-2 border-t">
                          <button
                            onClick={() => navigate(`/admin/users/${userId}/assign-tokens`)}
                            className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark flex items-center justify-center gap-2"
                          >
                            <Package className="h-4 w-4" />
                            {t('admin.purchaseHistory.assignTokens')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

