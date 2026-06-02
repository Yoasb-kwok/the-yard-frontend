import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import DateSelect from '../../components/DateSelect';
import { useAuth } from '../../contexts/AuthContext';
import { HK_DISTRICT_KEYS } from '../../lib/hkDistricts';
import { getAgeFromDateOfBirth } from '../../lib/utils';
import { useTranslation } from 'react-i18next';
import { User, Copy, Check, Pencil } from 'lucide-react';

interface ProfileEditForm {
  full_name: string;
  date_of_birth: string;
  sex: boolean | null;
  residential_district: string;
  has_joined_courses: boolean | null;
}

function profileToForm(p: {
  full_name: string;
  date_of_birth: string | null;
  sex: boolean | null;
  residential_district: string | null;
  has_joined_courses: boolean | null;
}): ProfileEditForm {
  return {
    full_name: p.full_name,
    date_of_birth: p.date_of_birth || '',
    sex: p.sex,
    residential_district: p.residential_district || '',
    has_joined_courses: p.has_joined_courses,
  };
}

export default function ProfilePage() {
  const { profile, profiles, updateProfile } = useAuth();
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProfileEditForm | null>(null);
  const [saveError, setSaveError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (!editing && profile) {
      setForm(profileToForm(profile));
    }
  }, [profile, editing]);

  if (!profile) return null;

  const isStudent = profile.role === 'student';

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

  const formatDistrict = (key: string | null): string => {
    if (!key) return t('profile.notProvided');
    if (HK_DISTRICT_KEYS.includes(key as (typeof HK_DISTRICT_KEYS)[number])) {
      return t(`districts.${key}`);
    }
    return key;
  };

  const getRoleLabel = (role: string) => {
    if (role === 'admin') return t('profile.admin');
    return t('profile.student');
  };

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

  function startEdit() {
    setSaveError('');
    setSaveMessage('');
    setForm(profileToForm(profile));
    setEditing(true);
  }

  function cancelEdit() {
    setSaveError('');
    setForm(profileToForm(profile));
    setEditing(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (!form.full_name.trim()) {
      setSaveError(t('profile.fullNameRequired', '請輸入全名'));
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      await updateProfile(profile.id, {
        full_name: form.full_name.trim(),
        date_of_birth: form.date_of_birth || null,
        sex: form.sex,
        residential_district: form.residential_district || null,
        has_joined_courses: form.has_joined_courses,
      });
      setEditing(false);
      setSaveMessage(t('profile.profileUpdated', '資料已更新'));
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('common.saveFailed', '儲存失敗'));
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full rounded-md border border-gray-300 px-3 py-2 text-sm md:text-base focus:border-primary focus:ring-2 focus:ring-primary';

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <User className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('profile.title')}</h1>
          </div>
        </div>

        {saveMessage && (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {saveMessage}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 relative">
          <div className="mb-4 md:mb-6 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-1">
                {editing && form ? form.full_name : profile.full_name}
              </h2>
              <p className="text-sm md:text-base text-gray-600">{getRoleLabel(profile.role)}</p>
            </div>
            {isStudent && !editing && (
              <button
                type="button"
                onClick={startEdit}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5"
              >
                <Pencil className="h-4 w-4" />
                {t('common.edit')}
              </button>
            )}
          </div>

          {saveError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {saveError}
            </div>
          )}

          {editing && form ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t('profile.fullName')} <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.full_name}
                  onChange={(e) => setForm((f) => f && { ...f, full_name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('profile.dateOfBirth')}</label>
                <DateSelect
                  birthDateMode
                  value={form.date_of_birth}
                  onChange={(v) => setForm((f) => f && { ...f, date_of_birth: v })}
                  className="w-full"
                  ariaLabel={t('profile.dateOfBirth')}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('profile.sex')}</label>
                <select
                  value={form.sex === true ? 'male' : form.sex === false ? 'female' : ''}
                  onChange={(e) =>
                    setForm((f) =>
                      f
                        ? {
                            ...f,
                            sex:
                              e.target.value === 'male' ? true : e.target.value === 'female' ? false : null,
                          }
                        : f,
                    )
                  }
                  className={inputClass}
                >
                  <option value="">{t('profile.notProvided')}</option>
                  <option value="male">{t('profile.male')}</option>
                  <option value="female">{t('profile.female')}</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t('profile.residentialDistrict')}
                </label>
                <select
                  value={form.residential_district}
                  onChange={(e) =>
                    setForm((f) => f && { ...f, residential_district: e.target.value })
                  }
                  className={inputClass}
                >
                  <option value="">{t('profile.notProvided')}</option>
                  {HK_DISTRICT_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {t(`districts.${key}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t('profile.hasJoinedCourses')}
                </label>
                <div className="flex gap-4 pt-1">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="hasJoinedCourses"
                      checked={form.has_joined_courses === true}
                      onChange={() => setForm((f) => f && { ...f, has_joined_courses: true })}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">{t('common.yes')}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="hasJoinedCourses"
                      checked={form.has_joined_courses === false}
                      onChange={() => setForm((f) => f && { ...f, has_joined_courses: false })}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">{t('common.no')}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="hasJoinedCourses"
                      checked={form.has_joined_courses === null}
                      onChange={() => setForm((f) => f && { ...f, has_joined_courses: null })}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-500">{t('profile.notProvided')}</span>
                  </label>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
                >
                  {saving ? t('common.saving', '儲存中…') : t('common.save')}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3 md:space-y-4">
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
                          type="button"
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
                      <p className="mt-1 text-xs text-gray-500">{t('profile.studentIdHint')}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.level')}</label>
                    <div className="px-3 py-2 border rounded-md bg-gray-50 text-sm md:text-base">
                      {profile.level ? (
                        <span
                          className={`inline-block text-sm font-semibold px-3 py-1.5 rounded border ${
                            profile.level === 'entry'
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : profile.level === 'intermediate'
                                ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                : 'bg-purple-100 text-purple-800 border-purple-200'
                          }`}
                        >
                          {profile.level === 'entry'
                            ? t('calendar.level.entry')
                            : profile.level === 'intermediate'
                              ? t('calendar.level.intermediate')
                              : t('calendar.level.advanced')}
                        </span>
                      ) : (
                        <span className="text-gray-500">{t('profile.notProvided')}</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('profile.studentAge', '學生歲數')}
                    </label>
                    <div className="px-3 py-2 border rounded-md bg-gray-50 text-sm md:text-base">
                      {(() => {
                        const age = getAgeFromDateOfBirth(profile.date_of_birth);
                        return age != null ? (
                          <span className="inline-block text-sm font-semibold px-3 py-1.5 rounded border bg-teal-100 text-teal-800 border-teal-200">
                            {`${age}${t('calendar.ageTag.yearsOld', '歲')}`}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.fullName')}</label>
                <div className="px-3 py-2 border rounded-md bg-gray-50 text-sm md:text-base">
                  {profile.full_name}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.dateOfBirth')}</label>
                <div className="px-3 py-2 border rounded-md bg-gray-50 text-sm md:text-base">
                  {formatDateOfBirth(profile.date_of_birth)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.sex')}</label>
                <div className="px-3 py-2 border rounded-md bg-gray-50 text-sm md:text-base">
                  {profile.sex !== null
                    ? profile.sex
                      ? t('profile.male')
                      : t('profile.female')
                    : t('profile.notProvided')}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('profile.residentialDistrict')}
                </label>
                <div className="px-3 py-2 border rounded-md bg-gray-50 text-sm md:text-base">
                  {formatDistrict(profile.residential_district)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('profile.hasJoinedCourses')}
                </label>
                <div className="px-3 py-2 border rounded-md bg-gray-50 text-sm md:text-base">
                  {profile.has_joined_courses !== null
                    ? profile.has_joined_courses
                      ? t('common.yes')
                      : t('common.no')
                    : t('profile.notProvided')}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
