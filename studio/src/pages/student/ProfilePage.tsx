import { useState } from 'react';
import Layout from '../../components/Layout';
import { useAuth, CourseLevel, AddProfileData } from '../../contexts/AuthContext';
import { getAgeTagFromDateOfBirth } from '../../lib/utils';
import { HK_DISTRICT_KEYS } from '../../lib/hkDistricts';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { User, Copy, Check, Pencil, Trash2, KeyRound } from 'lucide-react';
import DateSelect from '../../components/DateSelect';
import AccountSecurityCard from '../../components/AccountSecurityCard';

const emptyForm = (): AddProfileData & { has_joined_courses: boolean } => ({
  full_name: '',
  nick_name: '',
  date_of_birth: '',
  sex: null,
  parents_name: '',
  contact_number: '',
  residential_district: '',
  has_joined_courses: false,
  level: null,
});

export default function ProfilePage() {
  const { profile, user, profiles, addProfile, updateProfile, deleteProfile, refreshMe, requirePasswordChange } = useAuth();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [form, setForm] = useState<AddProfileData & { has_joined_courses: boolean }>(emptyForm());

  if (!profile) return null;

  const hasMultipleProfiles = profiles.length > 1;
  const isStudent = profile.role === 'student';
  const firstProfile = profiles[0];
  const canDelete = hasMultipleProfiles && firstProfile && profile.id !== firstProfile.id;

  // Open Add modal: reset form and pre-fill from first profile
  const openAddModal = () => {
    setForm({
      ...emptyForm(),
      parents_name: firstProfile?.parents_name ?? '',
      contact_number: firstProfile?.contact_number ?? firstProfile?.mobile ?? '',
      residential_district: firstProfile?.residential_district ?? '',
    });
    setModalMode('add');
    setEditingProfileId(null);
  };

  // Open Edit modal: fill from the profile
  const openEditModal = (p: (typeof profiles)[0]) => {
    setForm({
      full_name: p.full_name,
      nick_name: p.nick_name ?? '',
      date_of_birth: p.date_of_birth ?? '',
      sex: p.sex,
      parents_name: p.parents_name ?? '',
      contact_number: p.contact_number ?? p.mobile ?? '',
      residential_district: p.residential_district ?? '',
      has_joined_courses: p.has_joined_courses ?? false,
      level: p.level,
    });
    setModalMode('edit');
    setEditingProfileId(p.id);
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingProfileId(null);
    setForm(emptyForm());
  };

  const handleSubmitMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) return;
    const payload: AddProfileData = {
      full_name: form.full_name.trim(),
      nick_name: form.nick_name || null,
      date_of_birth: form.date_of_birth || null,
      sex: form.sex,
      parents_name: form.parents_name || null,
      contact_number: form.contact_number || null,
      residential_district: form.residential_district || null,
      has_joined_courses: form.has_joined_courses,
      level: form.level,
    };
    if (modalMode === 'add') {
      addProfile(payload);
      setMessage(t('profile.memberAdded'));
    } else if (modalMode === 'edit' && editingProfileId) {
      updateProfile(editingProfileId, payload);
      setMessage(t('profile.memberUpdated'));
    }
    closeModal();
  };

  const handleDeleteMember = (p: (typeof profiles)[0]) => {
    if (p.id === firstProfile?.id) return;
    if (!window.confirm(t('profile.confirmDeleteFamilyMember', { name: p.full_name }))) return;
    deleteProfile(p.id);
    setMessage(t('profile.memberDeleted'));
  };

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <User className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('profile.title')}</h1>
          </div>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
            {message}
          </div>
        )}

        {requirePasswordChange && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded flex items-center gap-2">
            <KeyRound className="h-5 w-5 flex-shrink-0" />
            <span>{t('auth.requirePasswordChangeBanner')}</span>
          </div>
        )}

        {isStudent && profiles.length === 1 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-sm text-gray-700">
            {t('profile.addMoreChildrenHint')}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 relative">
          <div className="mb-4 md:mb-6 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-1">{profile.full_name}</h2>
              <p className="text-sm md:text-base text-gray-600">{getRoleLabel(profile.role)}</p>
            </div>
            {isStudent && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={openAddModal}
                  className="flex items-center gap-1.5 rounded-md border border-primary bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20"
                >
                  <User className="h-4 w-4" />
                  {t('profile.addFamilyMember')}
                </button>
                <button
                  type="button"
                  onClick={() => openEditModal(profile)}
                  className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Pencil className="h-4 w-4" />
                  {t('profile.editFamilyMember')}
                </button>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => handleDeleteMember(profile)}
                    className="flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('profile.deleteFamilyMember')}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3 md:space-y-4">
            {/* Student ID - Show prominently for students */}
            {profile.role === 'student' && (
              <>
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

                {/* Level Tag - Show for students */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.level')}
                  </label>
                  <div className="px-3 py-2 border rounded-md bg-gray-50 text-sm md:text-base">
                    {profile.level ? (
                      <span className={`inline-block text-sm font-semibold px-3 py-1.5 rounded border ${
                        profile.level === 'entry' 
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : profile.level === 'intermediate'
                          ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                          : 'bg-purple-100 text-purple-800 border-purple-200'
                      }`}>
                        {profile.level === 'entry' 
                          ? t('calendar.level.entry')
                          : profile.level === 'intermediate'
                          ? t('calendar.level.intermediate')
                          : t('calendar.level.advanced')
                        }
                      </span>
                    ) : (
                      <span className="text-gray-500">{t('profile.notProvided')}</span>
                    )}
                  </div>
                </div>

                {/* Age Group (derived from date of birth) - Show for students */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.ageTag')}
                  </label>
                  <div className="px-3 py-2 border rounded-md bg-gray-50 text-sm md:text-base">
                    {(() => {
                      const ageTag = getAgeTagFromDateOfBirth(profile.date_of_birth);
                      return ageTag ? (
                        <span className={`inline-block text-sm font-semibold px-3 py-1.5 rounded border ${
                          ageTag === '5-8' 
                            ? 'bg-teal-100 text-teal-800 border-teal-200'
                            : ageTag === '9-12'
                            ? 'bg-cyan-100 text-cyan-800 border-cyan-200'
                            : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                        }`}>
                          {t(`calendar.ageTag.${ageTag}`)}
                        </span>
                      ) : (
                        <span className="text-gray-500">{t('profile.notProvided')}</span>
                      );
                    })()}
                  </div>
                </div>
              </>
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
              <p className="mt-1 text-xs text-gray-500">
                {t('profile.accountSecurityHint', 'To change password, email or mobile, use the "Account & security" section below.')}
              </p>
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

      <div className="mt-6">
        <AccountSecurityCard
          email={user?.email ?? null}
          mobile={user?.mobile ?? profile?.contact_number ?? profile?.mobile ?? null}
          onAccountUpdated={() => refreshMe()}
          initialOpenPasswordModal={requirePasswordChange || searchParams.get('changePassword') === '1'}
        />
      </div>

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-4 shadow-xl sm:p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              {modalMode === 'add' ? t('profile.addFamilyMember') : t('profile.editFamilyMember')}
            </h3>
            <form onSubmit={handleSubmitMember} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('profile.fullName')} <span className="text-red-600">*</span></label>
                <input
                  type="text"
                  required
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('profile.nickName')}</label>
                <input
                  type="text"
                  value={form.nick_name}
                  onChange={(e) => setForm((f) => ({ ...f, nick_name: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('profile.dateOfBirth')}</label>
                <DateSelect
                  birthDateMode
                  value={form.date_of_birth || ''}
                  onChange={(v) => setForm((f) => ({ ...f, date_of_birth: v || null }))}
                  className="w-full"
                  ariaLabel={t('profile.dateOfBirth')}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('profile.sex')}</label>
                <select
                  value={form.sex === true ? 'male' : form.sex === false ? 'female' : ''}
                  onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value === 'male' ? true : e.target.value === 'female' ? false : null }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">{t('profile.notProvided')}</option>
                  <option value="male">{t('profile.male')}</option>
                  <option value="female">{t('profile.female')}</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('profile.parentsName')}</label>
                <input
                  type="text"
                  value={form.parents_name || ''}
                  onChange={(e) => setForm((f) => ({ ...f, parents_name: e.target.value || null }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('profile.contactNumber')}</label>
                <input
                  type="text"
                  value={form.contact_number || ''}
                  onChange={(e) => setForm((f) => ({ ...f, contact_number: e.target.value || null }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('profile.residentialDistrict')}</label>
                <select
                  value={form.residential_district || ''}
                  onChange={(e) => setForm((f) => ({ ...f, residential_district: e.target.value || null }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">{t('profile.notProvided')}</option>
                  {HK_DISTRICT_KEYS.map((key) => (
                    <option key={key} value={key}>{t(`districts.${key}`)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('profile.hasJoinedCourses')}</label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.has_joined_courses}
                    onChange={(e) => setForm((f) => ({ ...f, has_joined_courses: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">{t('common.yes')}</span>
                </label>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('profile.level')}</label>
                <select
                  value={form.level || ''}
                  onChange={(e) => setForm((f) => ({ ...f, level: (e.target.value || null) as CourseLevel | null }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">{t('profile.notProvided')}</option>
                  <option value="entry">{t('calendar.level.entry')}</option>
                  <option value="intermediate">{t('calendar.level.intermediate')}</option>
                  <option value="advanced">{t('calendar.level.advanced')}</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">
                  {t('common.cancel')}
                </button>
                <button type="submit" className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary-dark">
                  {modalMode === 'add' ? t('common.create') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </Layout>
  );
}
