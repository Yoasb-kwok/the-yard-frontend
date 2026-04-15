import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { formatCurrency, calculateDiscount } from '../../lib/utils';
import { ShoppingCart, Check } from 'lucide-react';
import { fetchTokenPackages } from '../../lib/tokenPackages';
import { createCheckoutSession } from '../../lib/paymentApi';

interface TokenPackage {
  id: number;
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

// Mock data
const MOCK_PACKAGES: TokenPackage[] = [
  {
    id: 1,
    name: 'Starter Pack',
    description: 'Perfect for beginners',
    token_count: 5,
    price: 500,
    validity_days: 30,
  },
  {
    id: 2,
    name: 'Regular Pack',
    description: 'Great value for regular students',
    token_count: 10,
    price: 900,
    validity_days: 60,
  },
  {
    id: 3,
    name: 'Premium Pack',
    description: 'Best value for frequent visitors',
    token_count: 20,
    price: 1600,
    validity_days: 90,
  },
];

const MOCK_COUPONS: { [key: string]: { id: string; discount_type: 'percentage' | 'fixed'; discount_value: number } } = {
  'WELCOME10': { id: '1', discount_type: 'percentage', discount_value: 10 },
  'SAVE50': { id: '2', discount_type: 'fixed', discount_value: 50 },
};

// Student ID format: std + digits (e.g. std123456). Valid codes get 10% off for testing.
const REFERRAL_CODE_REGEX = /^std\d+$/i;

export default function ShopPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
  } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'fps' | 'cash'>('credit_card');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPackages();
  }, []);

  async function loadPackages() {
    setLoading(true);
    try {
      const rows = await fetchTokenPackages();
      setPackages(
        rows.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          token_count: r.token_count,
          price: r.price,
          validity_days: r.validity_days,
        }))
      );
    } catch {
      setPackages(MOCK_PACKAGES);
    } finally {
      setLoading(false);
    }
  }

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

  function removeFromCart(pkgId: number) {
    setCart(prev => prev.filter(item => item.package.id !== pkgId));
  }

  function updateQuantity(pkgId: number, quantity: number) {
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
      if (cart.length !== 1 || cart[0].quantity !== 1) {
        alert(t('shop.stripeSinglePackageOnly'));
        return;
      }
      setSubmitting(true);
      try {
        const { url } = await createCheckoutSession(cart[0].package.id);
        window.location.href = url;
      } catch (e) {
        alert(e instanceof Error ? e.message : t('shop.stripeRedirectError'));
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
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
        <h1 className="text-3xl font-bold text-gray-900">Token Shop</h1>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              {packages.map((pkg) => (
                <div key={pkg.id} className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{pkg.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{pkg.description}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tokens:</span>
                      <span className="font-medium">{pkg.token_count}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Validity:</span>
                      <span className="font-medium">{pkg.validity_days} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Price:</span>
                      <span className="text-xl font-bold text-primary">
                        {formatCurrency(pkg.price)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => addToCart(pkg)}
                    className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary-dark transition-colors"
                  >
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
              <div className="flex items-center mb-4">
                <ShoppingCart className="h-6 w-6 text-gray-700 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">Shopping Cart</h2>
              </div>

              {cart.length === 0 ? (
                <p className="text-gray-600 text-center py-8">Your cart is empty</p>
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
                            Remove
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
                        placeholder="Coupon code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button
                        onClick={applyCoupon}
                        className="px-4 py-2 bg-gray-600 text-white rounded-r-md hover:bg-gray-700"
                      >
                        Apply
                      </button>
                    </div>
                    {appliedCoupon && (
                      <div className="flex items-center text-green-600 text-sm">
                        <Check className="h-4 w-4 mr-1" />
                        Coupon applied
                      </div>
                    )}
                    <div>
                      <input
                        type="text"
                        placeholder="Referral code (e.g. std123456)"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {referralValid && (
                        <div className="flex items-center text-green-600 text-sm mt-1">
                          <Check className="h-4 w-4 mr-1" />
                          Referral code applied
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 pt-4 border-t">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount:</span>
                        <span>-{formatCurrency(discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
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

                  {paymentMethod === 'credit_card' && (
                    <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-sm text-gray-700">{t('shop.stripeHostedHint')}</p>
                      <p className="text-xs text-gray-500 mt-2">{t('shop.stripeSinglePackageOnly')}</p>
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
      </div>
    </Layout>
  );
}
