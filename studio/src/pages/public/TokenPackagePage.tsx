import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, calculateDiscount } from '../../lib/utils';
import { ShoppingCart, Lock, Check, Calendar, Clock, MapPin } from 'lucide-react';
import InstructorIntroCard from '../../components/InstructorIntroCard';
import { getInstructorProfile } from '../../lib/instructorProfiles';

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
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'fps' | 'cash' | 'alipay' | 'wechatpay' | 'payme'>('credit_card');
  const [submitting, setSubmitting] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [fpsIdOrPhone, setFpsIdOrPhone] = useState('');

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
    if (paymentMethod === 'credit_card') {
      const num = cardNumber.replace(/\D/g, '');
      if (num.length < 13) {
        alert(t('shop.cardNumber') + ' ' + (t('common.error') || '請填寫正確'));
        return;
      }
      const expiryMatch = expiry.match(/^(\d{2})\/?(\d{2})$/);
      if (!expiryMatch) {
        alert(t('shop.expiryDate') + ' ' + (t('common.error') || '請填寫 MM/YY'));
        return;
      }
      if (cvv.replace(/\D/g, '').length < 3) {
        alert(t('shop.cvv') + ' ' + (t('common.error') || '請填寫安全碼'));
        return;
      }
      if (!cardholderName.trim()) {
        alert(t('shop.cardholderName') + ' ' + (t('common.error') || '請填寫'));
        return;
      }
      if (!addressLine1.trim()) {
        alert(t('shop.addressLine1') + ' ' + (t('common.error') || '請填寫帳單地址'));
        return;
      }
    }
    if (paymentMethod === 'fps' && !fpsIdOrPhone.trim()) {
      alert(t('shop.fpsIdOrPhone') + ' ' + (t('common.error') || '請填寫'));
      return;
    }
    setSubmitting(true);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    alert(t('shop.orderPlaced'));
    setCart([]);
    setAppliedCoupon(null);
    setCouponCode('');
    setReferralCode('');
    setCardNumber('');
    setExpiry('');
    setCvv('');
    setCardholderName('');
    setAddressLine1('');
    setAddressLine2('');
    setCity('');
    setPostalCode('');
    setFpsIdOrPhone('');
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

  // Use admin-set profile avatar when available (synced with 導師主頁 / admin 導師管理)
  const getTutorImageUrl = (name: string): string => {
    const profile = getInstructorProfile(name);
    if (profile?.avatar_url) return profile.avatar_url;
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

        {/* 當前適用優惠 */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Check className="h-6 w-6 text-amber-600" />
            {t('promotions.currentOffers', '當前適用優惠')}
          </h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="text-amber-600 font-medium shrink-0">•</span>
              <span className="text-gray-800">{t('promotions.newTermDiscount', '新學期折扣：首次購買代幣套票享 9 折優惠（適用優惠碼 WELCOME10）')}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-amber-600 font-medium shrink-0">•</span>
              <span className="text-gray-800">{t('promotions.referralReward', '介紹獎賞：使用推薦碼購票，推薦人與新學員均可獲額外優惠')}</span>
            </li>
          </ul>
        </div>

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
            {getInstructorProfile(classData.instructor) && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <InstructorIntroCard instructorName={classData.instructor} />
              </div>
            )}
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
                        <option value="alipay">{t('shop.alipay')}</option>
                        <option value="wechatpay">{t('shop.wechatpay')}</option>
                        <option value="payme">{t('shop.payme')}</option>
                        <option value="cash">{t('shop.cash')}</option>
                      </select>
                    </div>

                    {/* Payment method specific fields */}
                    {paymentMethod === 'credit_card' && (
                      <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                        <p className="text-xs font-medium text-gray-500 uppercase">{t('shop.billingAddress')}</p>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">{t('shop.cardNumber')}</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder={t('shop.cardNumberPlaceholder')}
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm text-gray-700 mb-1">{t('shop.expiryDate')}</label>
                            <input
                              type="text"
                              placeholder={t('shop.expiryPlaceholder')}
                              value={expiry}
                              onChange={(e) => {
                                const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                                if (v.length >= 2) setExpiry(v.slice(0, 2) + '/' + v.slice(2));
                                else setExpiry(v);
                              }}
                              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-700 mb-1">{t('shop.cvv')}</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder={t('shop.cvvPlaceholder')}
                              value={cvv}
                              onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">{t('shop.cardholderName')}</label>
                          <input
                            type="text"
                            placeholder={t('shop.cardholderName')}
                            value={cardholderName}
                            onChange={(e) => setCardholderName(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">{t('shop.addressLine1')}</label>
                          <input
                            type="text"
                            value={addressLine1}
                            onChange={(e) => setAddressLine1(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">{t('shop.addressLine2')}</label>
                          <input
                            type="text"
                            value={addressLine2}
                            onChange={(e) => setAddressLine2(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm text-gray-700 mb-1">{t('shop.city')}</label>
                            <input
                              type="text"
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-700 mb-1">{t('shop.postalCode')}</label>
                            <input
                              type="text"
                              value={postalCode}
                              onChange={(e) => setPostalCode(e.target.value)}
                              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    {paymentMethod === 'fps' && (
                      <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">{t('shop.fpsIdOrPhone')}</label>
                          <input
                            type="text"
                            placeholder={t('shop.fpsPlaceholder')}
                            value={fpsIdOrPhone}
                            onChange={(e) => setFpsIdOrPhone(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <p className="text-sm text-gray-600">{t('shop.fpsInstruction')}</p>
                      </div>
                    )}
                    {paymentMethod === 'alipay' && (
                      <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-700">{t('shop.redirectToAlipay')}</p>
                      </div>
                    )}
                    {paymentMethod === 'wechatpay' && (
                      <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-700">{t('shop.redirectToWechat')}</p>
                      </div>
                    )}
                    {paymentMethod === 'payme' && (
                      <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-700">{t('shop.redirectToPayMe')}</p>
                      </div>
                    )}
                    {paymentMethod === 'cash' && (
                      <div className="mb-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-sm text-amber-800">{t('shop.payAtVenue')}</p>
                      </div>
                    )}

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

