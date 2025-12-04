import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';
import { formatCurrency } from '../../lib/utils';
import { ShoppingCart, Lock } from 'lucide-react';

interface TokenPackage {
  id: string;
  name: string;
  description: string;
  token_count: number;
  price: number;
  validity_days: number;
}

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
  const [loading, setLoading] = useState(true);

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
      </div>
    </PublicLayout>
  );
}

