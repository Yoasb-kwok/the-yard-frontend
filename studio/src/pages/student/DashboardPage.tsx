import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import PageLoading from '../../components/PageLoading';
import { useAuth, type AddProfileData, type CourseLevel } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { containsWhitespace, formatMobileForDisplay } from '../../lib/utils';
import { api } from '../../lib/api';
import { HK_DISTRICT_KEYS } from '../../lib/hkDistricts';
import { pickEnrollmentProfileId, type EnrolledClass } from '../../lib/studentEnrollments';
import { fetchStudentUpcomingClasses } from '../../lib/studentUpcomingClasses';
import { Home, User, ChevronRight, Plus, KeyRound, Mail, Phone, Users, Calendar } from 'lucide-react';
import DateSelect from '../../components/DateSelect';
import AccountSecurityCard from '../../components/AccountSecurityCard';

type UpcomingClass = EnrolledClass;

function emptyAddForm(): AddProfileData & { has_joined_courses: boolean } {
  return {
    full_name: '',
    nick_name: '',
    date_of_birth: '',
    sex: null,
    parents_name: '',
    contact_number: '',
    residential_district: '',
    has_joined_courses: false,
    level: null,
  };
}

export default function DashboardPage() {
  const { user, profiles, switchProfile, addProfile, updateProfile, refreshMe, requirePasswordChange } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const primaryProfileId = profiles[0]?.id ?? null;
  const masterProfile = profiles[0] ?? null;

  const [upcomingClasses, setUpcomingClasses] = useState<UpcomingClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddProfileData & { has_joined_courses: boolean }>(emptyAddForm());
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [addMemberSaving, setAddMemberSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [parentForm, setParentForm] = useState({
    parents_name: '',
    contact_number: '',
    residential_district: '',
  });
  const [parentSaveMessage, setParentSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!masterProfile) return;
    setParentForm({
      parents_name: masterProfile.parents_name ?? '',
      contact_number: masterProfile.contact_number ?? masterProfile.mobile ?? '',
      residential_district: masterProfile.residential_district ?? '',
    });
  }, [masterProfile?.id, masterProfile?.parents_name, masterProfile?.contact_number, masterProfile?.residential_district, masterProfile?.mobile]);

  const classesByProfileId = useMemo(() => {
    const map: Record<string, { count: number; name: string }> = {};
    (profiles ?? []).forEach((p) => {
      map[p.id] = { count: 0, name: p.full_name ?? t('dashboard.child') };
    });
    upcomingClasses.forEach((e) => {
      const id = pickEnrollmentProfileId(e) ?? '';
      if (!id) return;
      if (map[id]) {
        map[id].count += 1;
        if (e.user_name) map[id].name = e.user_name;
      } else {
        map[id] = { count: 1, name: e.user_name ?? t('dashboard.child') };
      }
    });
    return map;
  }, [upcomingClasses, profiles, t]);

  const totalUpcomingLessons = useMemo(
    () => Object.values(classesByProfileId).reduce((sum, info) => sum + info.count, 0),
    [classesByProfileId]
  );

  const displayMobile = formatMobileForDisplay(user?.mobile ?? (parentForm.contact_number || null), '—');

  useEffect(() => {
    if (profiles && profiles.length > 0) loadUpcomingClasses();
  }, [profiles?.length]);

  async function loadUpcomingClasses() {
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setUpcomingClasses([]);
      setLoading(false);
      return;
    }
    try {
      const classesData = await fetchStudentUpcomingClasses(undefined, {
        singleProfileAccount: (profiles?.length ?? 0) <= 1,
      });
      setUpcomingClasses(classesData);
    } catch {
      setUpcomingClasses([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveParentInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!masterProfile || !profiles?.length) return;
    const payload = {
      parents_name: parentForm.parents_name.trim() || null,
      contact_number: parentForm.contact_number.trim() || null,
      residential_district: parentForm.residential_district || null,
    };
    try {
      await Promise.all(profiles.map((p) => updateProfile(p.id, payload)));
      setParentSaveMessage(t('profile.mainAccountUpdated'));
      setTimeout(() => setParentSaveMessage(null), 3000);
    } catch (err) {
      setParentSaveMessage(err instanceof Error ? err.message : t('common.saveFailed', '儲存失敗'));
      setTimeout(() => setParentSaveMessage(null), 5000);
    }
  }

  if (loading) {
    return (
      <Layout>
        <PageLoading message={t('dashboard.loading', '載入中…')} />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center gap-3">
          <Home className="h-6 w-6 md:h-8 md:w-8 text-primary" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
            <p className="text-sm text-gray-600 mt-0.5">{t('dashboard.masterAccountHint', '家長主帳戶')}</p>
          </div>
        </div>

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">{successMessage}</div>
        )}

        {profiles && profiles.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                {t('profile.familyMembers')}
              </h2>
              <button
                type="button"
                onClick={() => {
                  const first = profiles[0];
                  setAddForm({
                    ...emptyAddForm(),
                    parents_name: first?.parents_name ?? parentForm.parents_name,
                    contact_number: first?.contact_number ?? parentForm.contact_number,
                    residential_district: first?.residential_district ?? parentForm.residential_district,
                  });
                  setAddMemberOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark"
              >
                <Plus className="h-4 w-4" />
                {t('profile.addFamilyMember')}
              </button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {profiles.map((p) => {
                const info = classesByProfileId[p.id] ?? { count: 0, name: p.full_name ?? t('dashboard.child') };
                return (
                  <div
                    key={p.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{info.name}</p>
                        <p className="text-sm text-gray-600 mt-0.5">{t('dashboard.upcomingCount', { count: info.count })}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          switchProfile(p.id);
                          navigate('/schedule');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
                      >
                        {t('dashboard.enterChildPage')}
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">{t('dashboard.parentBasicInfo', '家長基本資料')}</h2>
          {parentSaveMessage && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md text-sm">{parentSaveMessage}</div>
          )}
          <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
            <form onSubmit={handleSaveParentInfo} className="lg:col-span-3 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.parentsName')}</label>
                  <input
                    type="text"
                    value={parentForm.parents_name}
                    onChange={(e) => setParentForm((f) => ({ ...f, parents_name: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.contactNumber')}</label>
                  <input
                    type="text"
                    value={parentForm.contact_number}
                    onChange={(e) => setParentForm((f) => ({ ...f, contact_number: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.residentialDistrict')}</label>
                <select
                  value={parentForm.residential_district}
                  onChange={(e) => setParentForm((f) => ({ ...f, residential_district: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary sm:max-w-md"
                >
                  <option value="">{t('profile.notProvided')}</option>
                  {HK_DISTRICT_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {t(`districts.${key}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pt-1">
                <button type="submit" className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary-dark">
                  {t('common.save')}
                </button>
              </div>
            </form>

            <aside className="lg:col-span-2 space-y-4">
              <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary-lighter/60 to-white p-4 md:p-5">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                  <KeyRound className="h-4 w-4 text-primary" />
                  {t('dashboard.accountOverview', '登入帳戶')}
                </h3>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-gray-500 flex items-center gap-1.5 mb-0.5">
                      <Mail className="h-3.5 w-3.5" />
                      {t('register.email')}
                    </dt>
                    <dd className="font-medium text-gray-900 break-all">{user?.email || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 flex items-center gap-1.5 mb-0.5">
                      <Phone className="h-3.5 w-3.5" />
                      {t('profile.contactNumber')}
                    </dt>
                    <dd className="font-medium text-gray-900">{displayMobile}</dd>
                  </div>
                </dl>
                <p className="text-xs text-gray-500 mt-3">{t('dashboard.emailEditHint')}</p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-primary" />
                  {t('dashboard.familyOverview', '家庭概覽')}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-white border border-gray-100 px-3 py-2.5 text-center">
                    <p className="text-2xl font-bold text-primary">{profiles?.length ?? 0}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{t('dashboard.familyMemberCount', '位家庭成員')}</p>
                  </div>
                  <div className="rounded-lg bg-white border border-gray-100 px-3 py-2.5 text-center">
                    <p className="text-2xl font-bold text-primary">{totalUpcomingLessons}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{t('dashboard.totalUpcomingLessons', '堂即將上課')}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('dashboard.quickLinks', '快捷入口')}</h3>
                <nav className="space-y-1">
                  {profiles && profiles.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        switchProfile(profiles[0].id);
                        navigate('/schedule');
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                    >
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {t('dashboard.viewFirstChildSchedule', '查看課程表')}
                      <ChevronRight className="h-4 w-4 ml-auto text-gray-300" />
                    </button>
                  )}
                </nav>
              </div>
            </aside>
          </div>
        </div>

        <AccountSecurityCard
          email={user?.email ?? null}
          mobile={user?.mobile ?? (masterProfile?.contact_number ?? masterProfile?.mobile ?? null)}
          onAccountUpdated={() => refreshMe()}
          initialOpenPasswordModal={requirePasswordChange || searchParams.get('changePassword') === '1'}
          allowEmailMobileUpdate={false}
        />

        <p className="text-sm text-gray-600">{t('dashboard.scheduleHint')}</p>
      </div>

      {addMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-4 shadow-xl sm:p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">{t('profile.addFamilyMember')}</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setAddMemberError(null);
                if (!addForm.full_name.trim()) return;
                if (containsWhitespace(addForm.nick_name || '')) {
                  setAddMemberError(t('common.usernameNoSpaces'));
                  return;
                }
                setAddMemberSaving(true);
                try {
                  await addProfile({
                    full_name: addForm.full_name.trim(),
                    nick_name: addForm.nick_name || null,
                    date_of_birth: addForm.date_of_birth || null,
                    sex: addForm.sex,
                    parents_name: addForm.parents_name || null,
                    contact_number: addForm.contact_number || null,
                    residential_district: addForm.residential_district || null,
                    has_joined_courses: addForm.has_joined_courses,
                    level: addForm.level,
                  });
                  setAddMemberOpen(false);
                  setAddForm(emptyAddForm());
                  setSuccessMessage(t('profile.memberAdded'));
                  setTimeout(() => setSuccessMessage(null), 3000);
                } catch (err) {
                  setAddMemberError(
                    err instanceof Error ? err.message : t('common.saveFailed', '儲存失敗'),
                  );
                } finally {
                  setAddMemberSaving(false);
                }
              }}
              className="space-y-4"
            >
              {addMemberError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{addMemberError}</div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t('profile.fullName')} <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addForm.full_name}
                  onChange={(e) => setAddForm((f) => ({ ...f, full_name: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('profile.nickName')}</label>
                <input
                  type="text"
                  value={addForm.nick_name || ''}
                  onChange={(e) => setAddForm((f) => ({ ...f, nick_name: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('profile.dateOfBirth')}</label>
                <DateSelect
                  birthDateMode
                  value={addForm.date_of_birth || ''}
                  onChange={(v) => setAddForm((f) => ({ ...f, date_of_birth: v || null }))}
                  className="w-full"
                  ariaLabel={t('profile.dateOfBirth')}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('profile.sex')}</label>
                <select
                  value={addForm.sex === true ? 'male' : addForm.sex === false ? 'female' : ''}
                  onChange={(e) =>
                    setAddForm((f) => ({
                      ...f,
                      sex: e.target.value === 'male' ? true : e.target.value === 'female' ? false : null,
                    }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary"
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
                  value={addForm.parents_name || ''}
                  onChange={(e) => setAddForm((f) => ({ ...f, parents_name: e.target.value || null }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('profile.contactNumber')}</label>
                <input
                  type="text"
                  value={addForm.contact_number || ''}
                  onChange={(e) => setAddForm((f) => ({ ...f, contact_number: e.target.value || null }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('profile.residentialDistrict')}</label>
                <select
                  value={addForm.residential_district || ''}
                  onChange={(e) => setAddForm((f) => ({ ...f, residential_district: e.target.value || null }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary"
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
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={addForm.has_joined_courses}
                    onChange={(e) => setAddForm((f) => ({ ...f, has_joined_courses: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">{t('profile.hasJoinedCourses')}</span>
                </label>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('profile.level')}</label>
                <select
                  value={addForm.level || ''}
                  onChange={(e) => setAddForm((f) => ({ ...f, level: (e.target.value || null) as CourseLevel | null }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary"
                >
                  <option value="">{t('profile.notProvided')}</option>
                  <option value="entry">{t('calendar.level.entry')}</option>
                  <option value="intermediate">{t('calendar.level.intermediate')}</option>
                  <option value="advanced">{t('calendar.level.advanced')}</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAddMemberOpen(false);
                    setAddForm(emptyAddForm());
                    setAddMemberError(null);
                  }}
                  className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={addMemberSaving}
                  className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary-dark disabled:opacity-50"
                >
                  {addMemberSaving ? t('common.loading') : t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
