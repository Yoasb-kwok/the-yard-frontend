import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { ArrowLeft, Receipt, CheckCircle, Clock, XCircle, Search, Filter, Package, X, Printer } from 'lucide-react';

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
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

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

  const handlePrintReceipt = () => {
    // Create a new window with just the receipt content
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const receiptContent = document.getElementById('receipt-content');
    if (!receiptContent) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${selectedPurchase?.order_id}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              padding: 20px;
              color: #111827;
              background: white;
            }
            .receipt-container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
            }
            h1 { font-size: 2rem; font-weight: bold; margin-bottom: 0.5rem; }
            h2 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem; }
            h3 { font-size: 1.125rem; font-weight: 600; margin-bottom: 0.75rem; }
            .text-center { text-align: center; }
            .mb-8 { margin-bottom: 2rem; }
            .mb-6 { margin-bottom: 1.5rem; }
            .mb-3 { margin-bottom: 0.75rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-1 { margin-bottom: 0.25rem; }
            .mt-8 { margin-top: 2rem; }
            .mt-2 { margin-top: 0.5rem; }
            .pt-6 { padding-top: 1.5rem; }
            .pb-6 { padding-bottom: 1.5rem; }
            .p-8 { padding: 2rem; }
            .border-b { border-bottom: 1px solid #e5e7eb; }
            .border-t { border-top: 1px solid #e5e7eb; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .gap-4 { gap: 1rem; }
            .space-y-3 > * + * { margin-top: 0.75rem; }
            .space-y-2 > * + * { margin-top: 0.5rem; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .text-sm { font-size: 0.875rem; }
            .text-base { font-size: 1rem; }
            .text-lg { font-size: 1.125rem; }
            .text-2xl { font-size: 1.5rem; }
            .text-3xl { font-size: 1.875rem; }
            .font-medium { font-weight: 500; }
            .font-semibold { font-weight: 600; }
            .font-bold { font-weight: 700; }
            .text-gray-500 { color: #6b7280; }
            .text-gray-600 { color: #4b5563; }
            .text-gray-700 { color: #374151; }
            .text-gray-900 { color: #111827; }
            .text-red-600 { color: #dc2626; }
            .text-green-600 { color: #16a34a; }
            @media print {
              @page {
                margin: 0.5in;
              }
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            ${receiptContent.innerHTML}
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
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
                          <div className="flex items-center gap-2">
                            {purchase.payment_status === 'paid' && (
                              <>
                                <button
                                  onClick={() => setSelectedPurchase(purchase)}
                                  className="px-3 py-1.5 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors flex items-center gap-2 text-sm font-medium"
                                  title={t('admin.purchaseHistory.receipt')}
                                >
                                  <Receipt className="h-4 w-4" />
                                  <span className="hidden lg:inline">{t('admin.purchaseHistory.receipt')}</span>
                                </button>
                                <button
                                  onClick={() => navigate(`/admin/users/${userId}/assign-tokens`)}
                                  className="px-3 py-1.5 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors flex items-center gap-2 text-sm font-medium"
                                  title={t('admin.purchaseHistory.assignTokens')}
                                >
                                  <Package className="h-4 w-4" />
                                  <span className="hidden lg:inline">{t('admin.purchaseHistory.assignTokens')}</span>
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
                        <div className="pt-2 border-t space-y-2">
                          <button
                            onClick={() => setSelectedPurchase(purchase)}
                            className="w-full px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                          >
                            <Receipt className="h-4 w-4" />
                            {t('admin.purchaseHistory.receipt')}
                          </button>
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

