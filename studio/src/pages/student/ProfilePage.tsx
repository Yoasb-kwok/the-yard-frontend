import { useState } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { User } from 'lucide-react';

export default function ProfilePage() {
  const { profile, user } = useAuth();
  const { t } = useTranslation();
  const [message, setMessage] = useState('');

  if (!profile) return null;

  // Extract country code and mobile number
  const getMobileParts = (mobile: string | null): { countryCode: string; number: string } => {
    if (!mobile) {
      return { countryCode: '', number: '' };
    }
    
    // Check if mobile starts with country codes: 852, 853, or 86
    if (mobile.startsWith('852')) {
      return { countryCode: '+852', number: mobile.substring(3) };
    } else if (mobile.startsWith('853')) {
      return { countryCode: '+853', number: mobile.substring(3) };
    } else if (mobile.startsWith('86')) {
      return { countryCode: '+86', number: mobile.substring(2) };
    }
    
    // If no country code detected but number exists, default to +852 (Hong Kong)
    // This handles cases where mobile number was stored without country code
    if (mobile.length > 0) {
      return { countryCode: '+852', number: mobile };
    }
    
    return { countryCode: '', number: '' };
  };

  const getRoleLabel = (role: string) => {
    if (role === 'admin') {
      return t('profile.admin');
    }
    return t('profile.student');
  };

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center gap-3">
          <User className="h-6 w-6 md:h-8 md:w-8 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('profile.title')}</h1>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
            {message}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <div className="mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-1">{profile.full_name}</h2>
            <p className="text-sm md:text-base text-gray-600">{getRoleLabel(profile.role)}</p>
          </div>

          <div className="space-y-3 md:space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('profile.fullName')}
              </label>
              <div className="px-3 py-2 border rounded-md bg-gray-50 text-sm md:text-base">
                {profile.full_name}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('register.email')}
              </label>
              <div className="px-3 py-2 border rounded-md bg-gray-50 text-sm md:text-base">
                {user?.email || t('profile.notProvided')}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('profile.mobile')}
              </label>
              {profile.mobile ? (
                <div className="flex rounded-md shadow-sm">
                  <div className="px-3 py-2 border border-gray-300 border-r-0 rounded-l-md bg-gray-50 text-gray-700 text-sm md:text-base">
                    {getMobileParts(profile.mobile).countryCode}
                  </div>
                  <div className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md bg-gray-50 text-gray-900 text-sm md:text-base">
                    {getMobileParts(profile.mobile).number}
                  </div>
                </div>
              ) : (
                <div className="px-3 py-2 border rounded-md bg-gray-50 text-sm md:text-base text-gray-500">
                  {t('profile.notProvided')}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('profile.idFirstFour')}
              </label>
              <div className="px-3 py-2 border rounded-md bg-gray-50 text-sm md:text-base">
                {profile.id_first_four || t('profile.notProvided')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
