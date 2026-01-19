import { useState } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { User, Copy, Check } from 'lucide-react';

export default function ProfilePage() {
  const { profile, user } = useAuth();
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  if (!profile) return null;

  // Extract country code and contact number
  const getContactParts = (contactNumber: string | null): { countryCode: string; number: string } => {
    if (!contactNumber) {
      return { countryCode: '', number: '' };
    }
    
    // Check if contact number starts with country codes: 852, 853, or 86
    if (contactNumber.startsWith('852')) {
      return { countryCode: '+852', number: contactNumber.substring(3) };
    } else if (contactNumber.startsWith('853')) {
      return { countryCode: '+853', number: contactNumber.substring(3) };
    } else if (contactNumber.startsWith('86')) {
      return { countryCode: '+86', number: contactNumber.substring(2) };
    }
    
    // If no country code detected but number exists, default to +852 (Hong Kong)
    // This handles cases where contact number was stored without country code
    if (contactNumber.length > 0) {
      return { countryCode: '+852', number: contactNumber };
    }
    
    return { countryCode: '', number: '' };
  };

  // Format date of birth
  const formatDateOfBirth = (dateString: string | null): string => {
    if (!dateString) return t('profile.notProvided');
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return t('profile.notProvided');
      return date.toLocaleDateString();
    } catch {
      return t('profile.notProvided');
    }
  };

  const getRoleLabel = (role: string) => {
    if (role === 'admin') {
      return t('profile.admin');
    }
    return t('profile.student');
  };

  // Copy Student ID to clipboard
  const copyStudentId = async () => {
    if (profile.student_id) {
      try {
        await navigator.clipboard.writeText(profile.student_id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
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
            {/* Student ID - Show prominently for students */}
            {profile.role === 'student' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('profile.studentId')}
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 border rounded-md bg-primary/5 text-sm md:text-base font-mono font-semibold text-primary">
                    {profile.student_id || t('profile.notProvided')}
                  </div>
                  {profile.student_id && (
                    <button
                      onClick={copyStudentId}
                      className="px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-gray-700 transition-colors flex items-center gap-2"
                      title={t('profile.copyStudentId')}
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 text-green-600" />
                          <span className="text-xs text-green-600">{t('profile.copied')}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span className="text-xs">{t('profile.copy')}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                {profile.student_id && (
                  <p className="mt-1 text-xs text-gray-500">
                    {t('profile.studentIdHint')}
                  </p>
                )}
              </div>
            )}

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
                {t('profile.nickName')}
              </label>
              <div className="px-3 py-2 border rounded-md bg-gray-50 text-sm md:text-base">
                {profile.nick_name || t('profile.notProvided')}
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
                {t('profile.dateOfBirth')}
              </label>
              <div className="px-3 py-2 border rounded-md bg-gray-50 text-sm md:text-base">
                {formatDateOfBirth(profile.date_of_birth)}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('profile.sex')}
              </label>
              <div className="px-3 py-2 border rounded-md bg-gray-50 text-sm md:text-base">
                {profile.sex !== null 
                  ? (profile.sex ? t('profile.male') : t('profile.female'))
                  : t('profile.notProvided')
                }
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('profile.parentsName')}
              </label>
              <div className="px-3 py-2 border rounded-md bg-gray-50 text-sm md:text-base">
                {profile.parents_name || t('profile.notProvided')}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('profile.contactNumber')}
              </label>
              {profile.contact_number ? (
                <div className="flex rounded-md shadow-sm">
                  <div className="px-3 py-2 border border-gray-300 border-r-0 rounded-l-md bg-gray-50 text-gray-700 text-sm md:text-base">
                    {getContactParts(profile.contact_number).countryCode}
                  </div>
                  <div className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md bg-gray-50 text-gray-900 text-sm md:text-base">
                    {getContactParts(profile.contact_number).number}
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
                {t('profile.residentialDistrict')}
              </label>
              <div className="px-3 py-2 border rounded-md bg-gray-50 text-sm md:text-base">
                {profile.residential_district || t('profile.notProvided')}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('profile.hasJoinedCourses')}
              </label>
              <div className="px-3 py-2 border rounded-md bg-gray-50 text-sm md:text-base">
                {profile.has_joined_courses !== null
                  ? (profile.has_joined_courses ? t('common.yes') : t('common.no'))
                  : t('profile.notProvided')
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
