import { useState } from 'react';
import Layout from '../../components/Layout';
import { useAuth, CourseLevel, AddProfileData } from '../../contexts/AuthContext';
import { getAgeTagFromDateOfBirth } from '../../lib/utils';
import { useTranslation } from 'react-i18next';
import { User, Copy, Check, Plus, Pencil, Trash2, Crown } from 'lucide-react';

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
  const { profile, user, profiles, activeProfileId, switchProfile, addProfile, updateProfile, deleteProfile, setMainProfile } = useAuth();
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [form, setForm] = useState<AddProfileData & { has_joined_courses: boolean }>(emptyForm());
  const [confirmSetMain, setConfirmSetMain] = useState<(typeof profiles)[0] | null>(null);

  if (!profile) return null;

  const hasMultipleProfiles = profiles.length > 1;
  const isStudent = profile.role === 'student';
  const mainProfile = profiles[0];

  // Open Add modal: reset form and pre-fill from main
  const openAddModal = () => {
    setForm({
      ...emptyForm(),
      parents_name: mainProfile?.parents_name ?? '',
      contact_number: mainProfile?.contact_number ?? mainProfile?.mobile ?? '',
      residential_district: mainProfile?.residential_district ?? '',
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
    if (p.id === mainProfile?.id) return;
    if (!window.confirm(t('profile.confirmDeleteFamilyMember', { name: p.full_name }))) return;
    deleteProfile(p.id);
    setMessage(t('profile.memberDeleted'));
  };

  const openSetMainConfirm = (p: (typeof profiles)[0]) => {
    if (p.id === mainProfile?.id) return;
    setConfirmSetMain(p);
  };

  const handleConfirmSetAsMain = () => {
    if (!confirmSetMain) return;
    setMainProfile(confirmSetMain.id);
    setConfirmSetMain(null);
    setMessage(t('profile.mainAccountUpdated'));
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
        <div className="flex items-center gap-3">
          <User className="h-6 w-6 md:h-8 md:w-8 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('profile.title')}</h1>
        </div>

        {isStudent && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 md:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-700">{t('profile.familyMembers')}</p>
              <button
                type="button"
                onClick={openAddModal}
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-dark"
              >
                <Plus className="h-4 w-4" />
                {t('profile.addFamilyMember')}
              </button>
            </div>
            <ul className="space-y-2">
              {profiles.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-200 bg-white p-2 md:p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900">{p.full_name}</span>
                      {p.id === mainProfile?.id && (
                        <span className="rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-600">{t('profile.mainAccount')}</span>
                      )}
                      {p.id === activeProfileId && (
                        <span className="rounded bg-primary/20 px-1.5 py-0.5 text-xs text-primary">{t('profile.viewing')}</span>
                      )}
                    </div>
                    {p.student_id && <p className="mt-0.5 text-xs text-gray-500">{p.student_id}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    {hasMultipleProfiles && p.id !== activeProfileId && (
                      <button
                        type="button"
                        onClick={() => switchProfile(p.id)}
                        className="rounded p-1.5 text-sm text-primary hover:bg-primary/10"
                        title={t('profile.switchTo', { name: p.full_name })}
                      >
                        {t('profile.viewProfile')}
                      </button>
                    )}
                    {hasMultipleProfiles && p.id !== mainProfile?.id && (
                      <button
                        type="button"
                        onClick={() => openSetMainConfirm(p)}
                        className="rounded p-1.5 text-amber-600 hover:bg-amber-50"
                        title={t('profile.setAsMainAccount')}
                      >
                        <Crown className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditModal(p)}
                      className="rounded p-1.5 text-gray-600 hover:bg-gray-100"
                      title={t('profile.editFamilyMember')}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {p.id !== mainProfile?.id && (
                      <button
                        type="button"
                        onClick={() => handleDeleteMember(p)}
                        className="rounded p-1.5 text-red-600 hover:bg-red-50"
                        title={t('profile.deleteFamilyMember')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {hasMultipleProfiles && (
              <p className="mt-2 text-xs text-gray-500">
                {t('profile.viewing')}: <span className="font-medium text-gray-700">{profile.full_name}</span>
              </p>
            )}
          </div>
        )}

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

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-4 shadow-xl sm:p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              {modalMode === 'add' ? t('profile.addFamilyMember') : t('profile.editFamilyMember')}
            </h3>
            <form onSubmit={handleSubmitMember} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('profile.fullName')} *</label>
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
                <input
                  type="date"
                  value={form.date_of_birth || ''}
                  onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value || null }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
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
                <input
                  type="text"
                  value={form.residential_district || ''}
                  onChange={(e) => setForm((f) => ({ ...f, residential_district: e.target.value || null }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
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

      {confirmSetMain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl sm:p-6">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-amber-100 p-3">
                <Crown className="h-8 w-8 text-amber-600" />
              </div>
            </div>
            <h3 className="mb-2 text-center text-lg font-semibold text-gray-900">{t('profile.setAsMainAccount')}</h3>
            <p className="mb-6 text-center text-sm text-gray-600">
              {t('profile.confirmSetAsMainAccount', {
                name: confirmSetMain.full_name,
                current: mainProfile?.full_name ?? '',
              })}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmSetMain(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmSetAsMain}
                className="rounded-md bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
