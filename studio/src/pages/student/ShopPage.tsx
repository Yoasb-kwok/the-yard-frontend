import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, calculateDiscount, getLocalDateIso } from '../../lib/utils';
import { ShoppingCart, Check } from 'lucide-react';
import { api } from '../../lib/api';
import { fetchTokenPackages } from '../../lib/tokenPackages';
import {
  createCheckoutSession,
  createOfflineOrder,
  ORDER_REMARKS_MAX_LENGTH,
  type CheckoutOrderExtras,
} from '../../lib/paymentApi';
import { getSitePageContentForLocale, loadSimpleSitePage } from '../../lib/sitePageContent';
import DateSelect from '../../components/DateSelect';

interface TokenPackage {
  id: number;
  name: string;
  description: string;
  name_zh_tw?: string;
  name_zh_cn?: string;
  name_en?: string;
  description_zh_tw?: string;
  description_zh_cn?: string;
  description_en?: string;
  token_count: number;
  price: number;
  validity_days: number;
}

function isCustomTokenPackage(pkg: TokenPackage): boolean {
  const texts = [
    pkg.name,
    pkg.name_zh_tw,
    pkg.name_zh_cn,
    pkg.name_en,
    pkg.description,
    pkg.description_zh_tw,
    pkg.description_zh_cn,
    pkg.description_en,
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());
  return texts.some((s) => s.includes('自訂套裝') || s.includes('自定义套装') || s.includes('custom'));
}

interface CartItem {
  package: TokenPackage;
  quantity: number;
}

type TermsMode = 'html' | 'legacy';

const REFERRAL_CODE_REGEX = /^yayakid\d+$/i;

function pickLocalized(
  lang: string,
  zhTw?: string,
  zhCn?: string,
  en?: string,
  fallback?: string,
): string {
  const normalized = lang.toLowerCase();
  if (normalized.startsWith('zh-tw')) return zhTw || zhCn || en || fallback || '';
  if (normalized.startsWith('zh-cn') || normalized.startsWith('zh-hans')) return zhCn || zhTw || en || fallback || '';
  return en || zhTw || zhCn || fallback || '';
}

export default function ShopPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [packagesSource, setPackagesSource] = useState<TokenPackage[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
  } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'cash'>('credit_card');
  const [startDate, setStartDate] = useState(() => getLocalDateIso());
  const [orderRemarks, setOrderRemarks] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsState, setTermsState] = useState<{ title: string; html: string; legacy: string; mode: TermsMode }>({
    title: '',
    html: '',
    legacy: '',
    mode: 'legacy',
  });

  const todayIso = useMemo(() => getLocalDateIso(), []);

  useEffect(() => {
    loadPackages();
  }, []);

  const checkoutExtras = useMemo((): CheckoutOrderExtras => {
    const extras: CheckoutOrderExtras = {};
    if (startDate.trim()) extras.startDate = startDate.trim();
    if (orderRemarks.trim()) extras.remarks = orderRemarks.trim();
    return extras;
  }, [startDate, orderRemarks]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await loadSimpleSitePage('terms');
        if (cancelled) return;
        if (saved && (saved.title || saved.contentHtml)) {
          const localizedHtml = getSitePageContentForLocale(saved.contentHtml || '', i18n.language);
          setTermsState({
            title: saved.title || t('terms.title'),
            html: localizedHtml,
            legacy: t('terms.content'),
            mode: localizedHtml && localizedHtml.trim() !== '' ? 'html' : 'legacy',
          });
        } else {
          setTermsState({
            title: t('terms.title'),
            html: '',
            legacy: t('terms.content'),
            mode: 'legacy',
          });
        }
      } catch {
        if (cancelled) return;
        setTermsState({
          title: t('terms.title'),
          html: '',
          legacy: t('terms.content'),
          mode: 'legacy',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [i18n.language, t]);

  async function loadPackages() {
    setLoading(true);
    try {
      const rows = await fetchTokenPackages();
      setPackagesSource(
        rows
          .map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          name_zh_tw: r.name_zh_tw,
          name_zh_cn: r.name_zh_cn,
          name_en: r.name_en,
          description_zh_tw: r.description_zh_tw,
          description_zh_cn: r.description_zh_cn,
          description_en: r.description_en,
          token_count: r.token_count,
          price: r.price,
          validity_days: r.validity_days,
          }))
          .filter((pkg) => !isCustomTokenPackage(pkg)),
      );
    } catch {
      setPackagesSource([]);
    } finally {
      setLoading(false);
    }
  }

  const packages = useMemo(() => {
    return packagesSource.map((pkg) => {
      const nameKey = `tokenPackage.packages.${pkg.id}.name`;
      const descKey = `tokenPackage.packages.${pkg.id}.description`;
      const localizedName = pickLocalized(i18n.language, pkg.name_zh_tw, pkg.name_zh_cn, pkg.name_en, pkg.name);
      const localizedDescription = pickLocalized(
        i18n.language,
        pkg.description_zh_tw,
        pkg.description_zh_cn,
        pkg.description_en,
        pkg.description,
      );
      return {
        ...pkg,
        name: t(nameKey, { defaultValue: localizedName }),
        description: t(descKey, { defaultValue: localizedDescription }),
      };
    });
  }, [packagesSource, t, i18n.language]);

  function addToCart(pkg: TokenPackage) {
    setCart((prev) => {
      const existing = prev.find((item) => item.package.id === pkg.id);
      if (existing) {
        return prev.map((item) =>
          item.package.id === pkg.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...prev, { package: pkg, quantity: 1 }];
    });
  }

  function removeFromCart(pkgId: number) {
    setCart((prev) => prev.filter((item) => item.package.id !== pkgId));
  }

  function updateQuantity(pkgId: number, quantity: number) {
    if (quantity < 1) return;
    setCart((prev) =>
      prev.map((item) => (item.package.id === pkgId ? { ...item, quantity } : item)),
    );
  }

  async function applyCoupon() {
    const code = couponCode.trim();
    if (!code) {
      alert(t('shop.invalidCoupon'));
      return;
    }
    const subtotal = cart.reduce((sum, item) => sum + item.package.price * item.quantity, 0);
    try {
      const couponEndpoints = ['/coupons/validate', '/coupon/validate'];
      let res:
        | {
            success: boolean;
            data?: {
              id: string;
              code: string;
              discount_type: 'percentage' | 'fixed';
              discount_value: number;
            };
          }
        | null = null;
      let lastError: unknown = null;
      for (const endpoint of couponEndpoints) {
        try {
          res = await api.post<{
            id: string;
            code: string;
            discount_type: 'percentage' | 'fixed';
            discount_value: number;
          }>(endpoint, { code, subtotal });
          break;
        } catch (err) {
          lastError = err;
        }
      }
      if (!res) throw lastError instanceof Error ? lastError : new Error(t('shop.invalidCoupon'));
      if (!res.success || !res.data) {
        alert(t('shop.invalidCoupon'));
        return;
      }
      setAppliedCoupon({
        id: String(res.data.id),
        discount_type: res.data.discount_type,
        discount_value: Number(res.data.discount_value),
      });
      alert(t('shop.couponAppliedSuccess'));
    } catch (err) {
      alert(err instanceof Error ? err.message : t('shop.invalidCoupon'));
    }
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
        const { url } = await createCheckoutSession(cart[0].package.id, {
          studentProfileId: profile?.id,
          ...checkoutExtras,
        });
        window.location.href = url;
      } catch (e) {
        alert(e instanceof Error ? e.message : t('shop.stripeRedirectError'));
        setSubmitting(false);
      }
      return;
    }

    if (!profile?.id) {
      alert(t('shop.profileRequired', { defaultValue: 'Please select a student profile before checkout.' }));
      return;
    }

    const cartSubtotal = cart.reduce((sum, item) => sum + item.package.price * item.quantity, 0);
    const cartDiscount = appliedCoupon
      ? calculateDiscount(cartSubtotal, appliedCoupon.discount_type, appliedCoupon.discount_value)
      : 0;

    setSubmitting(true);
    try {
      for (let i = 0; i < cart.length; i++) {
        const item = cart[i];
        const lineSubtotal = item.package.price * item.quantity;
        const lineDiscount = cartSubtotal > 0 ? (cartDiscount * lineSubtotal) / cartSubtotal : 0;
        await createOfflineOrder({
          packageId: item.package.id,
          quantity: item.quantity,
          paymentMethod: 'cash',
          studentProfileId: profile.id,
          couponId: i === 0 && appliedCoupon ? appliedCoupon.id : undefined,
          discountAmount: lineDiscount > 0 ? lineDiscount : undefined,
          ...checkoutExtras,
        });
      }
      alert(t('shop.orderPlaced'));
      setCart([]);
      setAppliedCoupon(null);
      setCouponCode('');
      setReferralCode('');
      navigate('/payment-history');
    } catch (e) {
      alert(e instanceof Error ? e.message : t('shop.orderFailed', { defaultValue: 'Failed to place order.' }));
    } finally {
      setSubmitting(false);
    }
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">{t('shop.title')}</h1>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              {packages.map((pkg) => (
                <div key={pkg.id} className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{pkg.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{pkg.description}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{t('shop.tokens')}:</span>
                      <span className="font-medium">{pkg.token_count}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{t('shop.validity')}:</span>
                      <span className="font-medium">
                        {pkg.validity_days} {t('shop.days')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('shop.price')}:</span>
                      <span className="text-xl font-bold text-primary">
                        {formatCurrency(pkg.price)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
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
                              type="button"
                              onClick={() => updateQuantity(item.package.id, item.quantity - 1)}
                              className="px-2 py-1 border rounded"
                              aria-label="-"
                            >
                              -
                            </button>
                            <span>{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.package.id, item.quantity + 1)}
                              className="px-2 py-1 border rounded"
                              aria-label="+"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
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
                        type="button"
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

                  <div className="space-y-3 mb-4 pt-4 border-t">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('shop.startDate')}
                      </label>
                      <DateSelect
                        value={startDate}
                        onChange={setStartDate}
                        minDate={todayIso}
                        required
                        className="w-full"
                        ariaLabel={t('shop.startDate')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('shop.remarks')}
                      </label>
                      <textarea
                        value={orderRemarks}
                        onChange={(e) => setOrderRemarks(e.target.value.slice(0, ORDER_REMARKS_MAX_LENGTH))}
                        placeholder={t('shop.remarksPlaceholder')}
                        maxLength={ORDER_REMARKS_MAX_LENGTH}
                        rows={3}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-y min-h-[4.5rem]"
                      />
                      <p className="text-xs text-gray-500 mt-1 text-right">
                        {orderRemarks.length}/{ORDER_REMARKS_MAX_LENGTH}
                      </p>
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
                      <option value="cash">{t('shop.cash')}</option>
                    </select>
                  </div>

                  {paymentMethod === 'credit_card' && (
                    <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-sm text-gray-700">{t('shop.stripeHostedHint')}</p>
                      <p className="text-xs text-gray-500 mt-2">{t('shop.stripeSinglePackageOnly')}</p>
                    </div>
                  )}
                  {paymentMethod === 'cash' && (
                    <div className="mb-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-sm text-amber-800">{t('shop.payAtVenue')}</p>
                    </div>
                  )}

                  <div className="mb-3 text-center">
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-xs text-gray-500 hover:text-primary underline underline-offset-2"
                    >
                      {t('terms.title', '條款及細則')}
                    </button>
                  </div>

                  <button
                    type="button"
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
      {showTermsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="text-base font-semibold text-gray-900">{termsState.title || t('terms.title', '條款及細則')}</h3>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                {t('common.close', '關閉')}
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto text-sm text-gray-700">
              {termsState.mode === 'html' ? (
                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: termsState.html }} />
              ) : (
                <div className="whitespace-pre-line">{termsState.legacy || t('terms.content', '')}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
