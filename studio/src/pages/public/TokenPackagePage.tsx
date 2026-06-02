import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, calculateDiscount, formatDateTimeRange } from '../../lib/utils';
import { ShoppingCart, Lock, Check, Calendar, MapPin } from 'lucide-react';
import { api } from '../../lib/api';
import InstructorIntroCard from '../../components/InstructorIntroCard';
import { getInstructorProfile } from '../../lib/instructorProfiles';
import { fetchTokenPackages } from '../../lib/tokenPackages';
import { createCheckoutSession } from '../../lib/paymentApi';
import { getSitePageContentForLocale, loadSimpleSitePage } from '../../lib/sitePageContent';

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

// Student ID format: yayakid + digits (e.g. yayakid1). Valid codes get 10% off for testing.
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
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'cash'>('credit_card');
  const [submitting, setSubmitting] = useState(false);
  const [packagesSource, setPackagesSource] = useState<TokenPackage[]>([]);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsState, setTermsState] = useState<{ title: string; html: string; legacy: string; mode: TermsMode }>({
    title: '',
    html: '',
    legacy: '',
    mode: 'legacy',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await fetchTokenPackages();
        if (!cancelled) {
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
              .filter((pkg) => !isCustomTokenPackage(pkg))
          );
        }
      } catch {
        if (!cancelled) setPackagesSource([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  // Get translated packages - use useMemo to recompute when language changes
  const packages = useMemo(() => {
    return packagesSource.map(pkg => {
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
      const translatedName = t(nameKey, { defaultValue: localizedName });
      const translatedDesc = t(descKey, { defaultValue: localizedDescription });
      
      return {
        ...pkg,
        name: translatedName,
        description: translatedDesc,
      };
    });
  }, [t, i18n.language, packagesSource]);

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
      const selectedItem = cart[0];
      if (cart.length !== 1 || selectedItem.quantity !== 1) {
        alert(t('shop.stripeSinglePackageOnly'));
        return;
      }
      setSubmitting(true);
      try {
        const { url } = await createCheckoutSession(selectedItem.package.id);
        window.location.href = url;
      } catch (e) {
        alert(e instanceof Error ? e.message : t('shop.stripeRedirectError'));
        setSubmitting(false);
      }
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
                    <p className="text-sm font-medium text-gray-500 mb-1">{t('trial.classDateTime')}</p>
                    <p className="text-base font-semibold">
                      {formatDateTimeRange(classData.start_time, classData.end_time, getLocale())}
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
                        <option value="cash">{t('shop.cash')}</option>
                      </select>
                    </div>

                    {/* Payment method specific fields */}
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
    </PublicLayout>
  );
}

