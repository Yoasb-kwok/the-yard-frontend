import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { formatDate, formatDateTime } from '../../lib/utils';
import { Plus, Edit, Trash2, Search, Power, PowerOff, Percent, DollarSign } from 'lucide-react';

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  quantity: number;
  used_count: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  created_at: string;
}

// Mock data
const MOCK_COUPONS: Coupon[] = [
  {
    id: '1',
    code: 'SUMMER2024',
    discount_type: 'percentage',
    discount_value: 20,
    min_order_amount: 500,
    quantity: 100,
    used_count: 45,
    valid_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    code: 'NEWUSER50',
    discount_type: 'fixed',
    discount_value: 50,
    min_order_amount: 300,
    quantity: 50,
    used_count: 32,
    valid_from: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    valid_until: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    code: 'EXPIRED10',
    discount_type: 'percentage',
    discount_value: 10,
    min_order_amount: 200,
    quantity: 200,
    used_count: 180,
    valid_from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    valid_until: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: false,
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function CouponsPage() {
  const { t, i18n } = useTranslation();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '',
    min_order_amount: '',
    quantity: '',
    valid_from: '',
    valid_until: '',
    is_active: true,
  });

  useEffect(() => {
    loadCoupons();
  }, []);

  async function loadCoupons() {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    setCoupons(MOCK_COUPONS);
    setLoading(false);
  }

  function openCreateModal() {
    setEditingCoupon(null);
    setForm({
      code: '',
      discount_type: 'percentage',
      discount_value: '',
      min_order_amount: '',
      quantity: '',
      valid_from: '',
      valid_until: '',
      is_active: true,
    });
    setShowModal(true);
  }

  function openEditModal(coupon: Coupon) {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value.toString(),
      min_order_amount: coupon.min_order_amount.toString(),
      quantity: coupon.quantity.toString(),
      valid_from: new Date(coupon.valid_from).toISOString().slice(0, 16),
      valid_until: new Date(coupon.valid_until).toISOString().slice(0, 16),
      is_active: coupon.is_active,
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingCoupon(null);
    setForm({
      code: '',
      discount_type: 'percentage',
      discount_value: '',
      min_order_amount: '',
      quantity: '',
      valid_from: '',
      valid_until: '',
      is_active: true,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validation
    if (!form.code.trim()) {
      alert(t('admin.coupons.codeRequired'));
      return;
    }
    if (!form.discount_value || parseFloat(form.discount_value) <= 0) {
      alert(t('admin.coupons.discountValueRequired'));
      return;
    }
    if (!form.quantity || parseInt(form.quantity) <= 0) {
      alert(t('admin.coupons.quantityRequired'));
      return;
    }
    if (!form.valid_from) {
      alert(t('admin.coupons.validFromRequired'));
      return;
    }
    if (!form.valid_until) {
      alert(t('admin.coupons.validUntilRequired'));
      return;
    }
    if (new Date(form.valid_until) <= new Date(form.valid_from)) {
      alert(t('admin.coupons.validUntilAfterValidFrom'));
      return;
    }

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));

    if (editingCoupon) {
      // Update existing coupon
      const updatedCoupon: Coupon = {
        ...editingCoupon,
        code: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        min_order_amount: parseFloat(form.min_order_amount) || 0,
        quantity: parseInt(form.quantity),
        valid_from: new Date(form.valid_from).toISOString(),
        valid_until: new Date(form.valid_until).toISOString(),
        is_active: form.is_active,
      };
      setCoupons(coupons.map(c => c.id === editingCoupon.id ? updatedCoupon : c));
      alert(t('admin.coupons.couponUpdated'));
    } else {
      // Create new coupon
      const newCoupon: Coupon = {
        id: Date.now().toString(),
        code: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        min_order_amount: parseFloat(form.min_order_amount) || 0,
        quantity: parseInt(form.quantity),
        used_count: 0,
        valid_from: new Date(form.valid_from).toISOString(),
        valid_until: new Date(form.valid_until).toISOString(),
        is_active: form.is_active,
        created_at: new Date().toISOString(),
      };
      setCoupons([newCoupon, ...coupons]);
      alert(t('admin.coupons.couponCreated'));
    }

    closeModal();
  }

  async function handleToggleActive(coupon: Coupon) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setCoupons(coupons.map(c => 
      c.id === coupon.id 
        ? { ...c, is_active: !c.is_active }
        : c
    ));
  }

  async function handleDelete(coupon: Coupon) {
    if (!confirm(`Are you sure you want to delete coupon "${coupon.code}"?`)) {
      return;
    }

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setCoupons(coupons.filter(c => c.id !== coupon.id));
    alert(t('admin.coupons.couponDeleted'));
  }

  function getCouponStatus(coupon: Coupon): string {
    const now = new Date();
    const validUntil = new Date(coupon.valid_until);
    
    if (validUntil < now) {
      return 'expired';
    }
    return coupon.is_active ? 'active' : 'inactive';
  }

  function formatDateOnly(date: string, locale: string): string {
    const d = new Date(date);
    return d.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function formatTimeOnly(date: string, locale: string): string {
    const d = new Date(date);
    return d.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const filteredCoupons = coupons.filter(coupon =>
    coupon.code.toLowerCase().includes(search.toLowerCase())
  );

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
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('admin.coupons.title')}</h1>
          <button
            onClick={openCreateModal}
            className="w-full sm:w-auto bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark flex items-center justify-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            {t('admin.coupons.createCoupon')}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder={t('common.search') + '...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {filteredCoupons.length === 0 ? (
            <p className="text-gray-500 py-8 text-center">{t('admin.coupons.noCoupons')}</p>
          ) : (
            <>
              {/* Mobile/Tablet Card View */}
              <div className="md:hidden space-y-4">
                {filteredCoupons.map((coupon) => {
                  const status = getCouponStatus(coupon);
                  return (
                    <div
                      key={coupon.id}
                      className={`bg-gray-50 rounded-lg p-4 border ${status === 'expired' ? 'opacity-60' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">{coupon.code}</h3>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium mb-2 ${
                            status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : status === 'expired'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {t(`admin.coupons.${status}`)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openEditModal(coupon)}
                            className="text-primary hover:text-primary-dark p-1"
                            title={t('admin.coupons.edit')}
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(coupon)}
                            className={`p-1 ${
                              coupon.is_active
                                ? 'text-yellow-600 hover:text-yellow-800'
                                : 'text-green-600 hover:text-green-800'
                            }`}
                            title={t('admin.coupons.toggleActive')}
                          >
                            {coupon.is_active ? (
                              <PowerOff className="h-5 w-5" />
                            ) : (
                              <Power className="h-5 w-5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(coupon)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title={t('admin.coupons.deleteCoupon')}
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">{t('admin.coupons.discountType')}:</span>
                          <span className="ml-2 text-gray-900">
                            {coupon.discount_type === 'percentage' ? (
                              <Percent className="h-4 w-4" />
                            ) : (
                              <DollarSign className="h-4 w-4" />
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">{t('admin.coupons.discountValue')}:</span>
                          <span className="ml-2 text-gray-900 font-medium">
                            {coupon.discount_type === 'percentage' 
                              ? `${coupon.discount_value}%`
                              : `$${coupon.discount_value}`
                            }
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">{t('admin.coupons.minOrderAmount')}:</span>
                          <span className="ml-2 text-gray-900">
                            {coupon.min_order_amount > 0 ? `$${coupon.min_order_amount}` : '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">{t('admin.coupons.quantity')}:</span>
                          <span className="ml-2 text-gray-900 font-medium">{coupon.used_count}/{coupon.quantity}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500">{t('admin.coupons.validFrom')}:</span>
                          <span className="ml-2 text-gray-900 text-xs">
                            {formatDateTime(coupon.valid_from, i18n.language === 'zh-CN' ? 'zh-CN' : i18n.language === 'zh-TW' ? 'zh-TW' : 'en-US')}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500">{t('admin.coupons.validUntil')}:</span>
                          <span className="ml-2 text-gray-900 text-xs">
                            {formatDateTime(coupon.valid_until, i18n.language === 'zh-CN' ? 'zh-CN' : i18n.language === 'zh-TW' ? 'zh-TW' : 'en-US')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.coupons.code')}</th>
                      <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.coupons.discountType')}</th>
                      <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.coupons.discountValue')}</th>
                      <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.coupons.minOrderAmount')}</th>
                      <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.coupons.quantity')} ({t('admin.coupons.usedCount')})</th>
                      <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.coupons.validFrom')}</th>
                      <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.coupons.validUntil')}</th>
                      <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.coupons.status')}</th>
                      <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.users.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredCoupons.map((coupon) => {
                      const status = getCouponStatus(coupon);
                      return (
                        <tr key={coupon.id} className={status === 'expired' ? 'opacity-60' : ''}>
                          <td className="px-3 lg:px-4 py-3 text-sm font-medium text-gray-900">{coupon.code}</td>
                          <td className="px-3 lg:px-4 py-3 text-sm text-gray-600">
                            {coupon.discount_type === 'percentage' ? (
                              <Percent className="h-4 w-4" />
                            ) : (
                              <DollarSign className="h-4 w-4" />
                            )}
                          </td>
                          <td className="px-3 lg:px-4 py-3 text-sm text-gray-600">
                            {coupon.discount_type === 'percentage' 
                              ? `${coupon.discount_value}%`
                              : `$${coupon.discount_value}`
                            }
                          </td>
                          <td className="px-3 lg:px-4 py-3 text-sm text-gray-600">
                            {coupon.min_order_amount > 0 ? `$${coupon.min_order_amount}` : '-'}
                          </td>
                          <td className="px-3 lg:px-4 py-3 text-sm text-gray-600">{coupon.used_count}/{coupon.quantity}</td>
                          <td className="px-3 lg:px-4 py-3 text-sm text-gray-600">
                            <div>{formatDateOnly(coupon.valid_from, i18n.language === 'zh-CN' ? 'zh-CN' : i18n.language === 'zh-TW' ? 'zh-TW' : 'en-US')}</div>
                            <div className="text-xs text-gray-500">{formatTimeOnly(coupon.valid_from, i18n.language === 'zh-CN' ? 'zh-CN' : i18n.language === 'zh-TW' ? 'zh-TW' : 'en-US')}</div>
                          </td>
                          <td className="px-3 lg:px-4 py-3 text-sm text-gray-600">
                            <div>{formatDateOnly(coupon.valid_until, i18n.language === 'zh-CN' ? 'zh-CN' : i18n.language === 'zh-TW' ? 'zh-TW' : 'en-US')}</div>
                            <div className="text-xs text-gray-500">{formatTimeOnly(coupon.valid_until, i18n.language === 'zh-CN' ? 'zh-CN' : i18n.language === 'zh-TW' ? 'zh-TW' : 'en-US')}</div>
                          </td>
                          <td className="px-3 lg:px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : status === 'expired'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {t(`admin.coupons.${status}`)}
                            </span>
                          </td>
                          <td className="px-3 lg:px-4 py-3 text-sm">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => openEditModal(coupon)}
                                className="text-primary hover:text-primary-dark"
                                title={t('admin.coupons.edit')}
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleToggleActive(coupon)}
                                className={`${
                                  coupon.is_active
                                    ? 'text-yellow-600 hover:text-yellow-800'
                                    : 'text-green-600 hover:text-green-800'
                                }`}
                                title={t('admin.coupons.toggleActive')}
                              >
                                {coupon.is_active ? (
                                  <PowerOff className="h-4 w-4" />
                                ) : (
                                  <Power className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleDelete(coupon)}
                                className="text-red-600 hover:text-red-800"
                                title={t('admin.coupons.deleteCoupon')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[95vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
              {editingCoupon ? t('admin.coupons.editCoupon') : t('admin.coupons.createCoupon')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.coupons.code')} *
                </label>
                <input
                  type="text"
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="SUMMER2024"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.coupons.discountType')} *
                </label>
                <div className="relative">
                  <select
                    value={form.discount_type}
                    onChange={(e) => setForm({ ...form, discount_type: e.target.value as 'percentage' | 'fixed' })}
                    className="w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                  >
                    <option value="percentage">{t('admin.coupons.percentage')}</option>
                    <option value="fixed">{t('admin.coupons.fixed')}</option>
                  </select>
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    {form.discount_type === 'percentage' ? (
                      <Percent className="h-5 w-5 text-gray-400" />
                    ) : (
                      <DollarSign className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.coupons.discountValue')} *
                  {form.discount_type === 'percentage' ? ' (%)' : ' (HKD)'}
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step={form.discount_type === 'percentage' ? '1' : '0.01'}
                  max={form.discount_type === 'percentage' ? '100' : undefined}
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={form.discount_type === 'percentage' ? '20' : '50'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.coupons.minOrderAmount')} (HKD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.min_order_amount}
                  onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.coupons.quantity')} *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.coupons.validFrom')} *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={form.valid_from}
                  onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.coupons.validUntil')} *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={form.valid_until}
                  onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  {t('admin.coupons.isActive')}
                </label>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:space-x-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full sm:w-auto px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                >
                  {editingCoupon ? t('admin.users.saveChanges') : t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

