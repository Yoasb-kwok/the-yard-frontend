import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, calculateDiscount } from '../../lib/utils';
import { ShoppingCart, Lock, Check, Calendar, Clock, MapPin } from 'lucide-react';

interface ClassData {
  id: string;
  name: string;
  instructor: string;
  start_time: string;
  end_time: string;
  location: 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui';
  program_code: string;
}

interface TokenPackage {
  id: string;
  name: string;
  description: string;
  token_count: number;
  price: number;
  validity_days: number;
}

interface CartItem {
  package: TokenPackage;
  quantity: number;
}

const MOCK_COUPONS: { [key: string]: { id: string; discount_type: 'percentage' | 'fixed'; discount_value: number } } = {
  'WELCOME10': { id: '1', discount_type: 'percentage', discount_value: 10 },
  'SAVE50': { id: '2', discount_type: 'fixed', discount_value: 50 },
};

// Student ID format: std + digits (e.g. std123456). Valid codes get 10% off for testing.
const REFERRAL_CODE_REGEX = /^std\d+$/i;

// Mock data - same as ShopPage
const MOCK_PACKAGES: TokenPackage[] = [
  {
    id: '1',
    name: 'Starter Pack',
    description: 'Perfect for beginners',
    token_count: 5,
    price: 500,
    validity_days: 30,
  },
  {
    id: '2',
    name: 'Regular Pack',
    description: 'Great value for regular students',
    token_count: 10,
    price: 900,
    validity_days: 60,
  },
  {
    id: '3',
    name: 'Premium Pack',
    description: 'Best value for frequent visitors',
    token_count: 20,
    price: 1600,
    validity_days: 90,
  },
];

export default function TokenPackagePage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const classData = (location.state as { classData?: ClassData })?.classData;
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
  } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'fps' | 'cash'>('credit_card');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Simulate API call delay
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Get translated packages - use useMemo to recompute when language changes
  const packages = useMemo(() => {
    return MOCK_PACKAGES.map(pkg => {
      const nameKey = `tokenPackage.packages.${pkg.id}.name`;
      const descKey = `tokenPackage.packages.${pkg.id}.description`;
      const translatedName = t(nameKey, { defaultValue: pkg.name });
      const translatedDesc = t(descKey, { defaultValue: pkg.description });
      
      return {
        ...pkg,
        name: translatedName,
        description: translatedDesc,
      };
    });
  }, [t, i18n.language]);

  function addToCart(pkg: TokenPackage) {
    setCart(prev => {
      const existing = prev.find(item => item.package.id === pkg.id);
      if (existing) {
        return prev.map(item =>
          item.package.id === pkg.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { package: pkg, quantity: 1 }];
    });
  }

  function removeFromCart(pkgId: string) {
    setCart(prev => prev.filter(item => item.package.id !== pkgId));
  }

  function updateQuantity(pkgId: string, quantity: number) {
    if (quantity < 1) return;
    setCart(prev =>
      prev.map(item =>
        item.package.id === pkgId ? { ...item, quantity } : item
      )
    );
  }

  async function applyCoupon() {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const coupon = MOCK_COUPONS[couponCode.toUpperCase()];
    if (!coupon) {
      alert('Invalid coupon code');
      return;
    }

    setAppliedCoupon(coupon);
    alert('Coupon applied successfully!');
  }

  async function handleCheckout() {
    if (cart.length === 0) return;
    setSubmitting(true);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    alert(t('shop.orderPlaced'));
    setCart([]);
    setAppliedCoupon(null);
    setCouponCode('');
    setReferralCode('');
    navigate('/dashboard');
    setSubmitting(false);
  }

  const subtotal = cart.reduce((sum, item) => sum + item.package.price * item.quantity, 0);
  const discount = appliedCoupon
    ? calculateDiscount(subtotal, appliedCoupon.discount_type, appliedCoupon.discount_value)
    : 0;
  const referralValid = REFERRAL_CODE_REGEX.test(referralCode.trim());
  const total = subtotal - discount;

  // Helper functions for class data display
  const getLocale = (): string => {
    const langMap: { [key: string]: string } = {
      'en': 'en-US',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
    };
    return langMap[i18n.language] || i18n.language || 'en-US';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(getLocale(), {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(getLocale(), {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const getTutorImageUrl = (name: string): string => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=128&background=random&color=fff&bold=true`;
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">{t('tokenPackage.title')}</h1>
        <p className="text-lg text-gray-600 mb-12">{t('tokenPackage.subtitle')}</p>

        {/* Class Information Section */}
        {classData && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('trial.classInformation')}</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left: Tutor Info */}
              <div className="flex items-center pb-6 border-b-2 border-gray-100 md:border-b-0 md:border-r-2 md:pr-6">
                <img
                  src={getTutorImageUrl(classData.instructor)}
                  alt={classData.instructor}
                  className="w-20 h-20 rounded-full object-cover mr-4 border-4"
                  style={{ borderColor: '#d1fae5' }}
                />
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">{t('home.tutor')}</p>
                  <p className="text-lg font-bold text-gray-900">{classData.instructor}</p>
                </div>
              </div>

              {/* Right: Class Details */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">{t('trial.className')}</p>
                  <p className="text-lg font-semibold text-gray-900">{classData.name}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">{t('trial.classCode')}</p>
                  <p className="text-lg font-semibold text-primary">{classData.program_code}</p>
                </div>

                <div className="flex items-center text-gray-800">
                  <Calendar className="h-5 w-5 mr-3 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{t('trial.classDate')}</p>
                    <p className="text-base font-semibold">{formatDate(classData.start_time)}</p>
                  </div>
                </div>

                <div className="flex items-center text-gray-800">
                  <Clock className="h-5 w-5 mr-3 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{t('trial.classTime')}</p>
                    <p className="text-base font-semibold">
                      {formatTime(classData.start_time)} - {formatTime(classData.end_time)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center text-gray-800">
                  <MapPin className="h-5 w-5 mr-3 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{t('home.location')}</p>
                    <p className="text-base font-semibold">{t(`home.locations.${classData.location}`)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {user ? (
          // Logged in: Show shopping cart flow
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                {packages.map((pkg) => (
                  <div key={pkg.id} className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{pkg.name}</h3>
                    <p className="text-gray-600 text-sm mb-4">{pkg.description}</p>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t('tokenPackage.tokens')}:</span>
                        <span className="font-medium">{pkg.token_count}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t('tokenPackage.validity')}:</span>
                        <span className="font-medium">{pkg.validity_days} {t('tokenPackage.days')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('tokenPackage.price')}:</span>
                        <span className="text-xl font-bold text-primary">
                          {formatCurrency(pkg.price)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => addToCart(pkg)}
                      className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary-dark transition-colors"
                    >
                      {t('shop.addToCart')}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
                <div className="flex items-center mb-4">
                  <ShoppingCart className="h-6 w-6 text-gray-700 mr-2" />
                  <h2 className="text-xl font-semibold text-gray-900">{t('shop.shoppingCart')}</h2>
                </div>

                {cart.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">{t('shop.cartEmpty')}</p>
                ) : (
                  <>
                    <div className="space-y-3 mb-4">
                      {cart.map((item) => (
                        <div key={item.package.id} className="border-b pb-3">
                          <div className="font-medium text-gray-900">{item.package.name}</div>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => updateQuantity(item.package.id, item.quantity - 1)}
                                className="px-2 py-1 border rounded"
                              >
                                -
                              </button>
                              <span>{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.package.id, item.quantity + 1)}
                                className="px-2 py-1 border rounded"
                              >
                                +
                              </button>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.package.id)}
                              className="text-red-600 text-sm"
                            >
                              {t('shop.remove')}
                            </button>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {formatCurrency(item.package.price * item.quantity)}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex">
                        <input
                          type="text"
                          placeholder={t('shop.couponCode')}
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          className="flex-1 px-3 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button
                          onClick={applyCoupon}
                          className="px-4 py-2 bg-gray-600 text-white rounded-r-md hover:bg-gray-700"
                        >
                          {t('shop.apply')}
                        </button>
                      </div>
                      {appliedCoupon && (
                        <div className="flex items-center text-green-600 text-sm">
                          <Check className="h-4 w-4 mr-1" />
                          {t('shop.couponApplied')}
                        </div>
                      )}
                      <div>
                        <input
                          type="text"
                          placeholder={t('shop.referralCode')}
                          value={referralCode}
                          onChange={(e) => setReferralCode(e.target.value)}
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        {referralValid && (
                          <div className="flex items-center text-green-600 text-sm mt-1">
                            <Check className="h-4 w-4 mr-1" />
                            {t('shop.referralApplied')}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 mb-4 pt-4 border-t">
                      <div className="flex justify-between text-sm">
                        <span>{t('shop.subtotal')}:</span>
                        <span>{formatCurrency(subtotal)}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>{t('shop.discount')}:</span>
                          <span>-{formatCurrency(discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold">
                        <span>{t('shop.total')}:</span>
                        <span>{formatCurrency(total)}</span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('shop.paymentMethod')}
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="credit_card">{t('shop.creditCard')}</option>
                        <option value="fps">{t('shop.fps')}</option>
                        <option value="cash">{t('shop.cash')}</option>
                      </select>
                    </div>

                    <button
                      onClick={handleCheckout}
                      disabled={submitting}
                      className="w-full bg-primary text-white py-3 rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 font-medium"
                    >
                      {submitting ? t('shop.processing') : t('shop.checkout')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Not logged in: Show login prompt
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {packages.map((pkg) => (
              <div key={pkg.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">{pkg.name}</h3>
                <p className="text-gray-600 text-sm mb-6">{pkg.description}</p>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('tokenPackage.tokens')}:</span>
                    <span className="font-medium">{pkg.token_count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('tokenPackage.validity')}:</span>
                    <span className="font-medium">{pkg.validity_days} {t('tokenPackage.days')}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t">
                    <span className="text-gray-600">{t('tokenPackage.price')}:</span>
                    <span className="text-2xl font-bold text-primary">
                      {formatCurrency(pkg.price)}
                    </span>
                  </div>
                </div>

                <Link
                  to="/login"
                  className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-md hover:bg-primary-dark transition-colors font-medium"
                >
                  <Lock className="h-5 w-5" />
                  {t('tokenPackage.loginToPurchase')}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}

