import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import PageLoading from '../../components/PageLoading';
import { useAuth, type AddProfileData, type CourseLevel } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { formatDate, isExpiringSoon } from '../../lib/utils';
import { api } from '../../lib/api';
import { HK_DISTRICT_KEYS } from '../../lib/hkDistricts';
import {
  getFallbackUpcomingClasses,
  shouldUseDemoUpcomingClasses,
  type EnrolledClass,
} from '../../lib/studentEnrollments';
import { getLocationInfo } from '../../lib/locationInfo';
import { Calendar, Coins, AlertCircle, Home, ShoppingBag, BookOpen, TrendingDown, User, ChevronRight, Plus, MapPin } from 'lucide-react';
import DateSelect from '../../components/DateSelect';

interface UserToken {
  id: string;
  remaining_tokens: number;
  total_tokens: number;
  expiry_date: string;
}

interface OrderTokenLike {
  id?: string | number;
  order_id?: string;
  payment_status?: string;
  token_count?: number;
  created_at?: string;
}

function normalizeUserTokens(payload: any): UserToken[] {
  const candidates = [payload, payload?.data, payload?.data?.data, payload?.tokens, payload?.data?.tokens];
  const rows = candidates.find((x) => Array.isArray(x));
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r: any): UserToken | null => {
      if (!r) return null;
      return {
        id: String(r.id ?? r.user_token_id ?? ''),
        remaining_tokens: Number(r.remaining_tokens ?? r.balance ?? 0),
        total_tokens: Number(r.total_tokens ?? r.initial_tokens ?? r.remaining_tokens ?? 0),
        expiry_date: String(r.expiry_date ?? r.expires_at ?? ''),
      };
    })
    .filter((r: UserToken | null): r is UserToken => Boolean(r && r.id));
}

function tokensFromPaidOrders(payload: any): UserToken[] {
  const candidates = [payload, payload?.data, payload?.data?.data, payload?.orders, payload?.data?.orders];
  const rows = candidates.find((x) => Array.isArray(x));
  if (!Array.isArray(rows)) return [];
  const paid = (rows as OrderTokenLike[]).filter((o) => String(o?.payment_status ?? '').toLowerCase() === 'paid');
  const sum = paid.reduce((acc, o) => acc + Number(o?.token_count ?? 0), 0);
  if (sum <= 0) return [];
  const latest = paid
    .map((o) => String(o?.created_at ?? ''))
    .filter(Boolean)
    .sort()
    .pop();
  return [
    {
      id: 'orders-derived',
      remaining_tokens: sum,
      total_tokens: sum,
      expiry_date: latest || new Date().toISOString().slice(0, 10),
    },
  ];
}

/** Same shape as EnrolledClass so dashboard and schedule use same data */
type UpcomingClass = EnrolledClass;

/** 試堂／報名記錄（所有可能的 backend 狀態） */
type TrialStatus =
  | 'pending'
  | 'assigned'
  | 'confirmed'
  | 'contacted'
  | 'attended_trial'
  | 'converted'
  | 'cancelled'
  | 'could_not_assign';

interface TrialApplicationItem {
  id: string;
  class_name: string;
  status: TrialStatus;
  applied_date?: string;
  /** Admin 分配後應有此欄位，用於顯示「已分配：兒童爵士 A」 */
  assigned_class_name?: string | null;
}
const FALLBACK_TRIAL_APPLICATIONS: TrialApplicationItem[] = [
  { id: 't1', class_name: '兒童芭蕾試堂', status: 'assigned', applied_date: new Date().toISOString(), assigned_class_name: '兒童芭蕾 A' },
  { id: 't2', class_name: '兒童爵士試堂', status: 'pending', applied_date: new Date().toISOString() },
];

/** 學生 dashboard 對試堂狀態的顯示邏輯 */
function getTrialStatusLabel(status: TrialStatus, t: (k: string, d?: string) => string): string {
  switch (status) {
    case 'assigned':
    case 'confirmed':
    case 'contacted':
    case 'attended_trial':
      return t('dashboard.trialStatusConfirmed', '已確認');
    case 'converted':
      return t('dashboard.trialStatusConverted', '已轉正式');
    case 'cancelled':
      return t('dashboard.trialStatusCancelled', '已取消');
    case 'could_not_assign':
      return t('dashboard.trialStatusCouldNotAssign', '未能安排');
    case 'pending':
    default:
      return t('dashboard.trialStatusPending', '待確認');
  }
}

function getTrialBadgeClass(status: TrialStatus): string {
  switch (status) {
    case 'assigned':
    case 'confirmed':
    case 'contacted':
    case 'attended_trial':
      return 'bg-green-100 text-green-800';
    case 'converted':
      return 'bg-blue-100 text-blue-800';
    case 'cancelled':
      return 'bg-gray-200 text-gray-600';
    case 'could_not_assign':
      return 'bg-red-100 text-red-700';
    case 'pending':
    default:
      return 'bg-amber-100 text-amber-800';
  }
}

/** Demo: 代幣使用紀錄 */
interface TokenUsageItem {
  id: string;
  date: string;
  class_name: string;
  change: number; // -1 for deduction
}
const FALLBACK_TOKEN_USAGE: TokenUsageItem[] = [
  { id: 'u1', date: new Date(Date.now() - 2 * 86400000).toISOString(), class_name: '兒童芭蕾 A', change: -1 },
  { id: 'u2', date: new Date(Date.now() - 5 * 86400000).toISOString(), class_name: '兒童爵士 B', change: -1 },
  { id: 'u3', date: new Date(Date.now() - 7 * 86400000).toISOString(), class_name: '兒童芭蕾 A', change: -1 },
];

function emptyAddForm(): AddProfileData & { has_joined_courses: boolean } {
  return { full_name: '', nick_name: '', date_of_birth: '', sex: null, parents_name: '', contact_number: '', residential_district: '', has_joined_courses: false, level: null };
}

export default function DashboardPage() {
  const { profile, profiles, switchProfile, addProfile } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [tokens, setTokens] = useState<UserToken[]>([]);
  const [upcomingClasses, setUpcomingClasses] = useState<UpcomingClass[]>([]);
  const [trialApplications, setTrialApplications] = useState<TrialApplicationItem[]>([]);
  const [trialApplicationsLoaded, setTrialApplicationsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddProfileData & { has_joined_courses: boolean }>(emptyAddForm());

  /** Per-profile class count for child cards (each kid can have different classes) */
  const classesByProfileId = useMemo(() => {
    const map: Record<string, { count: number; name: string }> = {};
    (profiles ?? []).forEach((p) => {
      map[p.id] = { count: 0, name: p.full_name ?? t('dashboard.child') };
    });
    upcomingClasses.forEach((e) => {
      const id = (e.profile_id || e.user_id || '').trim() || (profile?.id ?? '');
      if (!id && profile) {
        map[profile.id] = map[profile.id] ?? { count: 0, name: profile.full_name ?? t('dashboard.child') };
        map[profile.id].count += 1;
        return;
      }
      if (map[id]) {
        map[id].count += 1;
        if (e.user_name) map[id].name = e.user_name;
      } else {
        map[id] = { count: 1, name: e.user_name ?? t('dashboard.child') };
      }
    });
    return map;
  }, [upcomingClasses, profiles, profile]);

  /** Next single lesson (soonest by start_time) for 下一堂 card */
  const nextLesson = useMemo(() => {
    const now = Date.now();
    const future = upcomingClasses
      .filter((e) => new Date(e.class.start_time).getTime() >= now)
      .sort((a, b) => new Date(a.class.start_time).getTime() - new Date(b.class.start_time).getTime());
    return future[0] ?? null;
  }, [upcomingClasses]);

  /** Next few upcoming classes across all kids (recent activity) */
  const recentUpcoming = useMemo(() => {
    const now = Date.now();
    return [...upcomingClasses]
      .filter((e) => new Date(e.class.start_time).getTime() >= now)
      .sort((a, b) => new Date(a.class.start_time).getTime() - new Date(b.class.start_time).getTime())
      .slice(0, 5);
  }, [upcomingClasses]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Map i18n language codes to locale strings for date formatting
  const getLocale = (): string => {
    const langMap: { [key: string]: string } = {
      'en': 'en-US',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
    };
    return langMap[i18n.language] || i18n.language || 'en-US';
  };

  useEffect(() => {
    if (profile || (profiles && profiles.length > 0)) {
      loadData();
    }
  }, [profile?.id, profiles?.length]);

  async function loadData() {
    setLoading(true);
    const fallbackUpcomingClasses =
      shouldUseDemoUpcomingClasses(profile?.id)
        ? getFallbackUpcomingClasses(profile?.id ?? undefined, profile?.full_name ?? undefined)
        : [];
    const token = localStorage.getItem('token');
    if (!token) {
      setTokens([]);
      setTrialApplications([]);
      setTrialApplicationsLoaded(false);
      setUpcomingClasses(fallbackUpcomingClasses);
      setLoading(false);
      return;
    }
    try {
      const profileId = profile?.id;
      const [tokensRes, classesRes, trialRes] = await Promise.all([
        api.get('/student/tokens').catch(() => api.get('/user-tokens')).catch(() => ({ success: false, data: [] })),
        api.get<{ data?: UpcomingClass[] }>('/student/upcoming-classes'),
        api.get<{ success?: boolean; data?: TrialApplicationItem[] }>('/student/trial-applications').catch(() => ({ success: false, data: [] })),
      ]);
      let tokensData = normalizeUserTokens(tokensRes);
      if (tokensData.length === 0) {
        const ordersRes = await api.get('/orders/me').catch(() => ({ success: false, data: [] }));
        tokensData = tokensFromPaidOrders(ordersRes);
      }
      let classesData = (classesRes as any).data;
      const trialData = (trialRes as any).data;
      setTokens(tokensData);
      setTrialApplications(Array.isArray(trialData) ? trialData : []);
      setTrialApplicationsLoaded((trialRes as any).success === true);
      if (Array.isArray(classesData) && profileId) {
        classesData = classesData.filter((e: UpcomingClass) => (e.profile_id || e.user_id || '') === profileId);
      }
      setUpcomingClasses(Array.isArray(classesData) && classesData.length > 0 ? classesData : fallbackUpcomingClasses);
    } catch {
      setTokens([]);
      setTrialApplications([]);
      setTrialApplicationsLoaded(false);
      setUpcomingClasses(fallbackUpcomingClasses);
    } finally {
      setLoading(false);
    }
  }

  const totalTokens = tokens.reduce((sum, tok) => sum + tok.remaining_tokens, 0);
  const expiringTokens = tokens.filter(tok => isExpiringSoon(tok.expiry_date));
  
  // Get the earliest expiry date from all tokens
  const earliestExpiryDate = tokens.length > 0 
    ? tokens.reduce((earliest, token) => {
        return new Date(token.expiry_date) < new Date(earliest) ? token.expiry_date : earliest;
      }, tokens[0].expiry_date)
    : null;

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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {t('dashboard.title')}
          </h1>
        </div>

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
            {successMessage}
          </div>
        )}

        {/* 下一堂：課堂提醒（與 Schedule 一致） */}
        {nextLesson && (() => {
          const start = new Date(nextLesson.class.start_time);
          const within24h = start.getTime() - Date.now() <= 24 * 60 * 60 * 1000;
          const locInfo = nextLesson.class.location ? getLocationInfo(nextLesson.class.location) : null;
          return (
            <div className={`rounded-lg border-2 p-4 md:p-5 ${within24h ? 'border-amber-400 bg-amber-50' : 'border-primary/30 bg-primary-lighter/30'}`}>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                {within24h ? t('schedule.comingWithin24h', '即將上課（24 小時內）') : t('schedule.nextLesson', '下一堂')}
              </p>
              <p className="text-lg font-bold text-gray-900">
                {start.toLocaleDateString(getLocale(), { weekday: 'short', month: 'short', day: 'numeric' })} {start.toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit', hour12: false })} · {nextLesson.class.name}
              </p>
              {nextLesson.user_name && <p className="text-sm text-primary mt-0.5">{nextLesson.user_name}</p>}
              {locInfo && (
                <div className="mt-2 text-sm text-gray-600">
                  <p className="font-medium text-gray-700">{locInfo.name}</p>
                  <p className="text-gray-600">{locInfo.address}</p>
                  <a href={locInfo.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1 text-primary font-medium hover:underline">
                    <MapPin className="h-4 w-4" />
                    {t('schedule.openMap', '打開地圖')}
                  </a>
                </div>
              )}
            </div>
          );
        })()}

        {/* 小朋友主頁入口：每個小朋友可上不同課堂 */}
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
                    parents_name: first?.parents_name ?? '',
                    contact_number: first?.contact_number ?? (first as any)?.mobile ?? '',
                    residential_district: first?.residential_district ?? '',
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

        {/* 最近即將上課 */}
        {recentUpcoming.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {t('dashboard.recentActivity')}
            </h2>
            <ul className="space-y-2">
              {recentUpcoming.map((e) => {
                const start = new Date(e.class.start_time);
                const dateStr = start.toLocaleDateString(getLocale(), { month: 'short', day: 'numeric', weekday: 'short' });
                const timeStr = start.toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit', hour12: false });
                return (
                  <li key={e.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <span className="font-medium text-gray-900">{e.class.name}</span>
                      {e.user_name && <span className="text-xs text-primary ml-2">({e.user_name})</span>}
                    </div>
                    <span className="text-sm text-gray-500">{dateStr} {timeStr}</span>
                  </li>
                );
              })}
            </ul>
            <Link
              to="/schedule"
              className="inline-flex items-center gap-2 mt-3 text-sm font-medium text-primary hover:underline"
            >
              {t('dashboard.viewFullSchedule')}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {totalTokens === 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-amber-900">{t('dashboard.insufficientTokens')}</p>
              <p className="text-sm text-amber-800 mt-1">{t('dashboard.insufficientTokensDesc')}</p>
              <Link
                to="/student/shop"
                className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 text-sm font-medium"
              >
                <ShoppingBag className="h-4 w-4" />
                {t('dashboard.insufficientTokensCta')}
              </Link>
            </div>
          </div>
        )}

        {totalTokens > 0 && totalTokens <= 2 && (
          <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-amber-900">{t('dashboard.tokensRunningOut', '即將用完，可購買新套票')}</p>
              <Link
                to="/student/shop"
                className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 text-sm font-medium"
              >
                <ShoppingBag className="h-4 w-4" />
                {t('dashboard.lowTokensCta')}
              </Link>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900">{t('dashboard.tokenBalance')}</h2>
            <Coins className="h-6 w-6 md:h-8 md:w-8 text-yellow-500" />
          </div>
          <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{totalTokens}</div>
          <p className="text-gray-600 text-sm mb-3">{t('dashboard.availableTokens')}</p>
          {earliestExpiryDate && (
            <div className="text-sm text-gray-600 mb-3">
              {t('dashboard.expires')}: {formatDate(earliestExpiryDate, getLocale())}
            </div>
          )}
          {expiringTokens.length > 0 && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-3 flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                {expiringTokens.length} {t('dashboard.tokensExpiring')}
              </div>
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              {t('dashboard.tokenUsageTitle')}
            </h3>
            <ul className="space-y-2 max-h-32 overflow-y-auto">
              {FALLBACK_TOKEN_USAGE.map((u) => (
                <li key={u.id} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 truncate">{formatDate(u.date, getLocale())} · {u.class_name}</span>
                  <span className="text-red-600 font-medium flex-shrink-0 ml-2">{u.change}</span>
                </li>
              ))}
            </ul>
            {upcomingClasses.some((e) => e.total_lessons != null && e.attended_lessons != null) && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-700 mb-2">{t('dashboard.lessonsLeftTitle')}</h3>
                <ul className="space-y-1.5 text-sm">
                  {upcomingClasses
                    .filter((e) => e.total_lessons != null && e.attended_lessons != null)
                    .map((e) => {
                      const left = (e.total_lessons ?? 0) - (e.attended_lessons ?? 0);
                      const studentName = e.user_name ?? profile?.full_name ?? t('dashboard.child');
                      return (
                        <li key={e.id} className="flex justify-between items-center gap-2">
                          <span className="text-gray-700 truncate" title={`${studentName} · ${e.class.name}`}>
                            {studentName} · {e.class.name}
                          </span>
                          <span className={left <= 2 ? 'text-amber-600 font-medium flex-shrink-0' : 'text-gray-600 flex-shrink-0'}>{t('dashboard.lessonsLeft', { count: left })}</span>
                        </li>
                      );
                    })}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* 我的試堂申請 */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            {t('dashboard.myTrialApplications')}
          </h2>
          {trialApplicationsLoaded && trialApplications.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">{t('dashboard.noTrialApplications', '暫無試堂申請')}</p>
          ) : (
            <ul className="space-y-2">
              {(trialApplicationsLoaded ? trialApplications : FALLBACK_TRIAL_APPLICATIONS).map((trial) => (
                <li key={trial.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 gap-3">
                  <div className="min-w-0">
                    <span className="font-medium text-gray-900">{trial.class_name}</span>
                    {trial.assigned_class_name && (
                      <span className="block text-xs text-green-700 mt-0.5">
                        {t('dashboard.trialAssignedTo', '已安排：{{name}}', { name: trial.assigned_class_name })}
                      </span>
                    )}
                    {trial.applied_date && (
                      <span className="block text-xs text-gray-500 mt-0.5">{formatDate(trial.applied_date, getLocale())}</span>
                    )}
                  </div>
                  <span
                    className={`flex-shrink-0 text-sm font-medium px-2 py-0.5 rounded ${getTrialBadgeClass(
                      trial.status
                    )}`}
                  >
                    {getTrialStatusLabel(trial.status, t)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-sm text-gray-600">{t('dashboard.scheduleHint')}</p>
      </div>

      {addMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-4 shadow-xl sm:p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">{t('profile.addFamilyMember')}</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!addForm.full_name.trim()) return;
                addProfile({
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
              }}
              className="space-y-4"
            >
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('profile.fullName')} <span className="text-red-600">*</span></label>
                <input type="text" required value={addForm.full_name} onChange={(e) => setAddForm((f) => ({ ...f, full_name: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('profile.nickName')}</label>
                <input type="text" value={addForm.nick_name || ''} onChange={(e) => setAddForm((f) => ({ ...f, nick_name: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('profile.dateOfBirth')}</label>
                <DateSelect birthDateMode value={addForm.date_of_birth || ''} onChange={(v) => setAddForm((f) => ({ ...f, date_of_birth: v || null }))} className="w-full" ariaLabel={t('profile.dateOfBirth')} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('profile.sex')}</label>
                <select value={addForm.sex === true ? 'male' : addForm.sex === false ? 'female' : ''} onChange={(e) => setAddForm((f) => ({ ...f, sex: e.target.value === 'male' ? true : e.target.value === 'female' ? false : null }))} className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary">
                  <option value="">{t('profile.notProvided')}</option>
                  <option value="male">{t('profile.male')}</option>
                  <option value="female">{t('profile.female')}</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('profile.parentsName')}</label>
                <input type="text" value={addForm.parents_name || ''} onChange={(e) => setAddForm((f) => ({ ...f, parents_name: e.target.value || null }))} className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('profile.contactNumber')}</label>
                <input type="text" value={addForm.contact_number || ''} onChange={(e) => setAddForm((f) => ({ ...f, contact_number: e.target.value || null }))} className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('profile.residentialDistrict')}</label>
                <select value={addForm.residential_district || ''} onChange={(e) => setAddForm((f) => ({ ...f, residential_district: e.target.value || null }))} className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary">
                  <option value="">{t('profile.notProvided')}</option>
                  {HK_DISTRICT_KEYS.map((key) => (<option key={key} value={key}>{t(`districts.${key}`)}</option>))}
                </select>
              </div>
              <div>
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={addForm.has_joined_courses} onChange={(e) => setAddForm((f) => ({ ...f, has_joined_courses: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                  <span className="text-sm text-gray-700">{t('profile.hasJoinedCourses')}</span>
                </label>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('profile.level')}</label>
                <select value={addForm.level || ''} onChange={(e) => setAddForm((f) => ({ ...f, level: (e.target.value || null) as CourseLevel | null }))} className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary">
                  <option value="">{t('profile.notProvided')}</option>
                  <option value="entry">{t('calendar.level.entry')}</option>
                  <option value="intermediate">{t('calendar.level.intermediate')}</option>
                  <option value="advanced">{t('calendar.level.advanced')}</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setAddMemberOpen(false); setAddForm(emptyAddForm()); }} className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">{t('common.cancel')}</button>
                <button type="submit" className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary-dark">{t('common.create')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
