import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';
import { useAuth, CourseLevel, AgeTag } from '../../contexts/AuthContext';
import { HK_DISTRICT_KEYS } from '../../lib/hkDistricts';
import { CheckCircle, Calendar, MapPin, Mail } from 'lucide-react';
import DateSelect from '../../components/DateSelect';
import InstructorIntroCard from '../../components/InstructorIntroCard';
import { getInstructorProfile } from '../../lib/instructorProfiles';
import { getLocationInfo } from '../../lib/locationInfo';
import { api, ApiError } from '../../lib/api';
import { TRIAL_APPLY_ENDPOINT, trialApplyClassIdentifiers } from '../../lib/trialApplyFlow';
import type { TrialNavClassData } from '../../lib/trialClassDataFromQuery';
import { trialNavClassDataFromSearchParams } from '../../lib/trialClassDataFromQuery';
import { containsWhitespace, formatDateTimeRange } from '../../lib/utils';
import { useClassTags, localizeTagLabel } from '../../lib/useClassTags';

type ClassData = TrialNavClassData;

/** 6 堂試堂選項，整齊展示 */
function getTrialClassOptions(): ClassData[] {
  const base = new Date();
  base.setDate(base.getDate() + ((1 - base.getDay() + 7) % 7) || 7);
  const at = (dayOffset: number, hour: number, min: number) => {
    const d = new Date(base);
    d.setDate(base.getDate() + dayOffset);
    d.setHours(hour, min, 0, 0);
    return d;
  };
  const end = (start: Date, durMin: number) => {
    const e = new Date(start);
    e.setMinutes(e.getMinutes() + durMin);
    return e;
  };
  return [
    { id: 'trial-1', name: '兒童芭蕾體驗', instructor: '李老師', start_time: at(1, 16, 0).toISOString(), end_time: end(at(1, 16, 0), 60).toISOString(), location: 'sanpokong', program_code: 'KB-A', level: 'entry', age_tag: '5-8' },
    { id: 'trial-2', name: '青少年街舞體驗', instructor: '陳老師', start_time: at(3, 17, 0).toISOString(), end_time: end(at(3, 17, 0), 60).toISOString(), location: 'causewaybay', program_code: 'THH', level: 'intermediate', age_tag: '9-12' },
    { id: 'trial-3', name: '幼兒律動體驗', instructor: '王老師', start_time: at(6, 10, 0).toISOString(), end_time: end(at(6, 10, 0), 60).toISOString(), location: 'sanpokong', program_code: 'KIDS', level: 'entry', age_tag: '5-8' },
    { id: 'trial-4', name: '爵士舞體驗', instructor: '張老師', start_time: at(5, 18, 0).toISOString(), end_time: end(at(5, 18, 0), 60).toISOString(), location: 'fotan', program_code: 'JAZZ', level: 'entry', age_tag: '9-12' },
    { id: 'trial-5', name: '兒童中國舞體驗', instructor: '黃老師', start_time: at(2, 15, 30).toISOString(), end_time: end(at(2, 15, 30), 60).toISOString(), location: 'sheungshui', program_code: 'CCD', level: 'entry', age_tag: '5-8' },
    { id: 'trial-6', name: 'K-Pop 流行舞體驗', instructor: '林老師', start_time: at(4, 17, 30).toISOString(), end_time: end(at(4, 17, 30), 60).toISOString(), location: 'causewaybay', program_code: 'KPOP', level: 'entry', age_tag: '9-12' },
  ];
}

const TRIAL_CLASS_OPTIONS = getTrialClassOptions();
const TRIAL_FORM_DRAFT_KEY = 'trialApplicationDraft.v1';

type TrialFormDraft = {
  classData?: ClassData | null;
  fullName: string;
  nickName: string;
  dateOfBirth: string;
  sex: boolean | null;
  parentsName: string;
  countryCode: string;
  contactNumber: string;
  email: string;
  residentialDistrict: string;
  hasJoinedCourses: boolean;
  hasDanceExperience: boolean;
  howDidYouHear: string;
  promoCode: string;
};

type TrialNameSuggestion = {
  fullName: string;
  parentsName?: string;
  email?: string;
  contactNumber?: string;
};

export default function TrialPage() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const classDataFromQuery = useMemo(
    () => trialNavClassDataFromSearchParams(new URLSearchParams(location.search)),
    [location.search]
  );
  const classDataFromState = (location.state as { classData?: ClassData })?.classData;
  const classData = classDataFromState ?? classDataFromQuery ?? undefined;
  const [fullName, setFullName] = useState('');
  const [nickName, setNickName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [sex, setSex] = useState<boolean | null>(null);
  const [parentsName, setParentsName] = useState('');
  const [countryCode, setCountryCode] = useState('852');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [residentialDistrict, setResidentialDistrict] = useState('');
  const [hasJoinedCourses, setHasJoinedCourses] = useState(false);
  const [hasDanceExperience, setHasDanceExperience] = useState(false);
  const [howDidYouHear, setHowDidYouHear] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  /**
   * 試堂 API 成功後的結果摘要。後端不再把臨時密碼放進 JSON 回傳
   * （會透過 email 寄給用戶），所以前端只需要知道帳號是否新建。
   */
  const [trialSuccessResult, setTrialSuccessResult] = useState<{
    accountCreated?: boolean;
    existingUser?: boolean;
    emailSent?: boolean;
    confirmationEmailSent?: boolean;
    message?: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [wasLoggedIn, setWasLoggedIn] = useState(false);
  const [selectedTrialClass, setSelectedTrialClass] = useState<ClassData | null>(null);
  const [nameSuggestions, setNameSuggestions] = useState<TrialNameSuggestion[]>([]);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  /** 避免連續點「提交」或 Enter 重複送出兩次 POST。 */
  const trialSubmitLockRef = useRef(false);
  const nameSuggestReqIdRef = useRef(0);
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { tagTypes, tagsByType, getTypeLabel } = useClassTags();

  const effectiveClassData = classData || selectedTrialClass;
  
  // Check if user is logged in
  const isLoggedIn = !!user && !!profile;

  // Extract country code and mobile number
  const stripCountryPrefix = (cc: string, localDigits: string): string => {
    const country = cc.replace(/\D/g, '');
    let digits = localDigits.replace(/\D/g, '');
    if (country && digits.startsWith(country)) {
      digits = digits.slice(country.length);
      while (country && digits.startsWith(country) && digits.length > 6) {
        digits = digits.slice(country.length);
      }
    }
    return digits;
  };

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
    if (mobile.length > 0) {
      return { countryCode: '+852', number: mobile };
    }
    
    return { countryCode: '', number: '' };
  };

  // Generate tutor profile image URL from UI Avatars
  // Use admin-set profile avatar when available (synced with 導師主頁 / admin 導師管理)
  const getTutorImageUrl = (name: string): string => {
    const profile = getInstructorProfile(name);
    if (profile?.avatar_url) return profile.avatar_url;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=128&background=random&color=fff&bold=true`;
  };

  const getLocale = (): string => {
    const m: Record<string, string> = { en: 'en-US', 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW' };
    return m[i18n.language] ?? i18n.language ?? 'en-US';
  };

  const isTrialClassExpired = (cls?: Pick<ClassData, 'end_time'> | null): boolean => {
    if (!cls?.end_time) return false;
    const end = new Date(cls.end_time);
    if (!Number.isFinite(end.getTime())) return false;
    return end.getTime() < Date.now();
  };

  const dynamicTagRows = useMemo(() => {
    if (!effectiveClassData) return [];
    return tagTypes
      .filter((tt) => tt.code !== 'level' && tt.code !== 'age')
      .map((tt) => {
        const raw = effectiveClassData.tag_values?.[tt.code];
        const code = typeof raw === 'string' ? raw.trim() : '';
        if (!code || code === '-') return null;
        const option = (tagsByType[tt.code] ?? []).find((r) => r.code === code);
        const valueLabel = option ? localizeTagLabel(option, i18n.language || 'zh-TW') : code;
        const typeLabel = getTypeLabel(tt.code) || localizeTagLabel(tt, i18n.language || 'zh-TW');
        return { key: tt.code, typeLabel, valueLabel };
      })
      .filter(Boolean) as Array<{ key: string; typeLabel: string; valueLabel: string }>;
  }, [effectiveClassData, getTypeLabel, i18n.language, tagTypes, tagsByType]);
  const instructorProfile = useMemo(
    () => getInstructorProfile(effectiveClassData?.instructor ?? ''),
    [effectiveClassData?.instructor]
  );

  const saveDraft = (forcedClassData?: ClassData | null) => {
    const draft: TrialFormDraft = {
      classData: forcedClassData ?? effectiveClassData ?? null,
      fullName,
      nickName,
      dateOfBirth,
      sex,
      parentsName,
      countryCode,
      contactNumber,
      email,
      residentialDistrict,
      hasJoinedCourses,
      hasDanceExperience,
      howDidYouHear,
      promoCode,
    };
    localStorage.setItem(TRIAL_FORM_DRAFT_KEY, JSON.stringify(draft));
  };

  useEffect(() => {
    if (isLoggedIn) return;
    const raw = localStorage.getItem(TRIAL_FORM_DRAFT_KEY);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as Partial<TrialFormDraft>;
      if (typeof draft.fullName === 'string') setFullName(draft.fullName);
      if (typeof draft.nickName === 'string') setNickName(draft.nickName);
      if (typeof draft.dateOfBirth === 'string') setDateOfBirth(draft.dateOfBirth);
      if (draft.sex === true || draft.sex === false || draft.sex === null) setSex(draft.sex);
      if (typeof draft.parentsName === 'string') setParentsName(draft.parentsName);
      if (typeof draft.countryCode === 'string') setCountryCode(draft.countryCode);
      if (typeof draft.contactNumber === 'string') setContactNumber(draft.contactNumber);
      if (typeof draft.email === 'string') setEmail(draft.email);
      if (typeof draft.residentialDistrict === 'string') setResidentialDistrict(draft.residentialDistrict);
      if (draft.hasJoinedCourses === true || draft.hasJoinedCourses === false) {
        setHasJoinedCourses(draft.hasJoinedCourses);
      }
      if (draft.hasDanceExperience === true || draft.hasDanceExperience === false) {
        setHasDanceExperience(draft.hasDanceExperience);
      }
      if (typeof draft.howDidYouHear === 'string') setHowDidYouHear(draft.howDidYouHear);
      if (typeof draft.promoCode === 'string') setPromoCode(draft.promoCode);
      if (!classData && !selectedTrialClass && draft.classData) {
        setSelectedTrialClass(draft.classData);
      }
      localStorage.removeItem(TRIAL_FORM_DRAFT_KEY);
    } catch {
      localStorage.removeItem(TRIAL_FORM_DRAFT_KEY);
    }
  }, [classData, isLoggedIn, selectedTrialClass]);

  const handleTrialLoginRequired = (draftClassData?: ClassData | null) => {
    saveDraft(draftClassData);
    navigate('/trial/login-required', {
      state: { returnTo: `${location.pathname}${location.search}` },
    });
  };

  useEffect(() => {
    if (isLoggedIn) {
      setNameSuggestions([]);
      setShowNameSuggestions(false);
      return;
    }
    const keyword = fullName.trim();
    if (keyword.length < 2) {
      setNameSuggestions([]);
      setShowNameSuggestions(false);
      return;
    }
    const reqId = ++nameSuggestReqIdRef.current;
    const timer = setTimeout(async () => {
      const endpoints = [
        '/trial-applications/name-suggestions',
        '/trial-application/name-suggestions',
        '/trial-applications/suggest-names',
        '/profiles/name-suggestions',
      ];
      const extract = (raw: unknown): TrialNameSuggestion[] => {
        const rows = Array.isArray(raw)
          ? raw
          : raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)
          ? ((raw as { data: unknown[] }).data)
          : [];
        return rows
          .map((r) => {
            if (!r || typeof r !== 'object') return null;
            const row = r as Record<string, unknown>;
            const fullNameValue = String(row.full_name ?? row.fullName ?? row.name ?? '').trim();
            if (!fullNameValue) return null;
            return {
              fullName: fullNameValue,
              parentsName: row.parents_name != null ? String(row.parents_name) : row.parentsName != null ? String(row.parentsName) : undefined,
              email: row.email != null ? String(row.email) : undefined,
              contactNumber:
                row.contact_number != null
                  ? String(row.contact_number)
                  : row.contactNumber != null
                  ? String(row.contactNumber)
                  : row.mobile != null
                  ? String(row.mobile)
                  : undefined,
            } as TrialNameSuggestion;
          })
          .filter((x): x is TrialNameSuggestion => x != null);
      };

      let suggestions: TrialNameSuggestion[] = [];
      for (const endpoint of endpoints) {
        try {
          const res = await api.get(endpoint, { q: keyword, keyword, search: keyword, limit: 8 });
          suggestions = extract(res.data ?? res);
          if (suggestions.length > 0) break;
        } catch {
          // try next endpoint
        }
      }
      if (nameSuggestReqIdRef.current !== reqId) return;
      const unique = Array.from(
        new Map(suggestions.map((s) => [s.fullName.toLowerCase(), s])).values(),
      ).slice(0, 8);
      setNameSuggestions(unique);
      setShowNameSuggestions(unique.length > 0);
    }, 250);
    return () => clearTimeout(timer);
  }, [fullName, isLoggedIn]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!effectiveClassData) {
      setError(t('trial.noClassSelected'));
      return;
    }
    if (isTrialClassExpired(effectiveClassData)) {
      setError(t('trial.classNotAvailable', '此試堂時段已過，請選擇其他課堂。'));
      return;
    }

    if (trialSubmitLockRef.current) {
      return;
    }

    // If logged in, still call backend so trial is saved and shows in 我的試堂申請
    if (isLoggedIn && user && profile) {
      trialSubmitLockRef.current = true;
      setLoading(true);
      setWasLoggedIn(true);
      try {
        const applicantName = (
          profile.full_name ||
          profile.parents_name ||
          profile.nick_name ||
          user.name ||
          (user.email ? user.email.split('@')[0] : '') ||
          ''
        ).trim();
        if (!applicantName) {
          setError(t('trial.fullName') + ' ' + t('common.required'));
          return;
        }
        const mobileParts = getMobileParts(
          (profile.mobile || profile.contact_number || '').replace(/\D/g, ''),
        );
        const payload = {
          ...trialApplyClassIdentifiers({
            id: effectiveClassData.id,
            program_code: effectiveClassData.program_code,
            apiClassRowId: effectiveClassData.apiClassRowId,
          }),
          trialClassName: effectiveClassData.name,
          fullName: applicantName,
          email: (user.email || '').trim().toLowerCase(),
          contactNumber: mobileParts.number || undefined,
          countryCode: mobileParts.countryCode.replace(/\D/g, '') || undefined,
          // Prefer new key `username`, keep `nickName` for backend compatibility.
          username: (profile.nick_name || '').trim() || undefined,
          nickName: (profile.nick_name || '').trim() || undefined,
          dateOfBirth: profile.date_of_birth || undefined,
          sex: profile.sex !== undefined && profile.sex !== null ? profile.sex : undefined,
          parentsName: (profile.parents_name || '').trim() || undefined,
          residentialDistrict: (profile.residential_district || '').trim() || undefined,
          hasJoinedCourses,
          hasDanceExperience,
          howDidYouHear: howDidYouHear || undefined,
          promoCode: promoCode.trim() || undefined,
          // Ask backend to send trial-application confirmation email on success.
          sendConfirmationEmail: true,
          confirmationEmailType: 'trial_application_submitted',
          // Ask backend to send one-time temporary password email when account is auto-created.
          sendTemporaryPasswordEmail: true,
          temporaryPasswordEmailType: 'trial_account_created',
          language: i18n.language || 'zh-TW',
        };
        const res = await api.post<{
          success?: boolean;
          applicationId?: number;
          existingUser?: boolean;
          confirmationEmailSent?: boolean;
        }>(TRIAL_APPLY_ENDPOINT, payload);
        if (res?.success) {
          setTrialSuccessResult({
            existingUser: true,
            confirmationEmailSent: res.confirmationEmailSent,
          });
          setSuccess(true);
          setTimeout(() => navigate('/dashboard'), 3000);
        } else {
          setSuccess(true);
          setTimeout(() => navigate('/dashboard'), 3000);
        }
      } catch (err: unknown) {
        if (err instanceof ApiError && err.status === 409 && err.code === 'TRIAL_LOGIN_REQUIRED') {
          handleTrialLoginRequired(effectiveClassData);
        } else {
          const msg = err instanceof ApiError ? err.message : (err as Error)?.message || t('common.error');
          setError(msg);
        }
      } finally {
        setLoading(false);
        trialSubmitLockRef.current = false;
      }
      return;
    }

    // Non-logged-in flow:
    //   1. POST /api/trial-application — 後端自動建帳號（隨機臨時密碼）+ 寄 email
    //   2. 成功後只顯示「密碼已寄到 email」，絕不在畫面顯示密碼
    // 新 API 只要求 classId, fullName, email；其餘為選填
    if (!fullName.trim() || !email.trim()) {
      setError(t('trial.fullName') + ' / ' + t('trial.email') + ' ' + t('common.required'));
      return;
    }

    if (containsWhitespace(nickName)) {
      setError(t('common.usernameNoSpaces'));
      return;
    }

    trialSubmitLockRef.current = true;
    setLoading(true);

    try {
      const localContactNumber = stripCountryPrefix(countryCode, contactNumber);
      const payload = {
        ...trialApplyClassIdentifiers({
          id: effectiveClassData.id,
          program_code: effectiveClassData.program_code,
          apiClassRowId: effectiveClassData.apiClassRowId,
        }),
        trialClassName: effectiveClassData.name,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        contactNumber: localContactNumber || undefined,
        countryCode: countryCode || undefined,
        // Prefer new key `username`, keep `nickName` for backend compatibility.
        username: nickName.trim() || undefined,
        nickName: nickName.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
        sex: sex !== null ? sex : undefined,
        parentsName: parentsName.trim() || undefined,
        residentialDistrict: residentialDistrict || undefined,
        hasJoinedCourses,
        hasDanceExperience,
        howDidYouHear: howDidYouHear || undefined,
        promoCode: promoCode.trim() || undefined,
        // Ask backend to send trial-application confirmation email on success.
        sendConfirmationEmail: true,
        confirmationEmailType: 'trial_application_submitted',
        // Ask backend to send one-time temporary password email when account is auto-created.
        sendTemporaryPasswordEmail: true,
        temporaryPasswordEmailType: 'trial_account_created',
        language: i18n.language || 'zh-TW',
      };

      const res = await api.post<{
        success?: boolean;
        applicationId?: number;
        existingUser?: boolean;
        accountCreated?: boolean;
        emailSent?: boolean;
        confirmationEmailSent?: boolean;
        message?: string;
        msg?: string;
      }>(TRIAL_APPLY_ENDPOINT, payload);

      if (res?.success) {
        setTrialSuccessResult({
          accountCreated: res.accountCreated,
          existingUser: res.existingUser,
          // Backend defaults to true when account is newly created; undefined is treated as
          // "unknown" and will still show the generic success message.
          emailSent: res.emailSent ?? res.accountCreated,
          confirmationEmailSent: res.confirmationEmailSent,
          message: res.message ?? res.msg,
        });
        setSuccess(true);
        return;
      }

      // 後端回傳非 2xx 理論上會 throw ApiError；這裡是保險的泛用錯誤
      setError((res as { msg?: string })?.msg || t('common.error'));
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409 && err.code === 'TRIAL_LOGIN_REQUIRED') {
        handleTrialLoginRequired(effectiveClassData);
        return;
      }
      const msg = err instanceof ApiError ? err.message : (err as Error)?.message || t('common.error');
      setError(msg);
    } finally {
      setLoading(false);
      trialSubmitLockRef.current = false;
    }
  }

  if (success) {
    const childName = profile?.full_name ?? '';
    const locInfo = effectiveClassData ? getLocationInfo(effectiveClassData.location) : null;
    const locationName = locInfo?.name ?? (effectiveClassData ? t(`home.locations.${effectiveClassData.location}`) : '');
    const datetimeStr = effectiveClassData
      ? formatDateTimeRange(effectiveClassData.start_time, effectiveClassData.end_time, getLocale())
      : '';
    return (
      <PublicLayout>
        <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-12 px-4">
          <div className="max-w-md w-full text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t('trial.applicationSubmitted')}
            </h2>
            {wasLoggedIn ? (
              <>
                {childName && effectiveClassData && (
                  <p className="text-gray-800 font-medium mb-2">
                    {t('trial.trialBookedFor', {
                      name: childName,
                      className: effectiveClassData.name,
                      datetime: datetimeStr,
                      location: locationName,
                    }, `已為 ${childName} 預約試堂：${effectiveClassData.name}、${datetimeStr}、${locationName}`)}
                  </p>
                )}
                <p className="text-gray-600 mb-2">{t('trial.applicationSubmittedDescLoggedIn')}</p>
                <Link to="/dashboard" className="inline-block mt-2 text-primary font-medium hover:underline">
                  {t('trial.viewTrialStatus', '查看我的試堂申請狀態')}
                </Link>
                <p className="text-sm text-gray-500 mt-4">{t('trial.redirectingToDashboard')}</p>
              </>
            ) : trialSuccessResult?.existingUser ? (
              <>
                <p className="text-gray-600 mb-4">{t('trial.existingUserApplicationSubmitted')}</p>
                <Link
                  to="/login"
                  className="inline-block mt-2 px-4 py-2 bg-primary text-white rounded-md font-medium hover:bg-primary-dark"
                >
                  {t('trial.goToLogin')}
                </Link>
              </>
            ) : (
              <>
                <p className="text-gray-600 mb-4">{t('trial.accountCreated')}</p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-left">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-gray-800 mb-1">
                        {t('trial.emailSentWithTempPassword', { email })}
                      </p>
                      <p className="text-sm text-gray-600">
                        {t('trial.checkEmailAndChangePassword')}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-gray-700 mb-4">
                  {t('trial.loginAccountLabel')}：
                  <span className="font-mono text-primary break-all">{email}</span>
                </p>
                <Link
                  to="/login"
                  className="inline-block mt-2 px-4 py-2 bg-primary text-white rounded-md font-medium hover:bg-primary-dark"
                >
                  {t('trial.goToLogin')}
                </Link>
              </>
            )}
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!effectiveClassData) {
    return (
      <PublicLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('trial.title')}</h1>
          <p className="text-gray-600 mb-8">{t('trial.chooseTrial')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TRIAL_CLASS_OPTIONS.map((opt) => {
              const expired = isTrialClassExpired(opt);
              return (
              <button
                key={opt.id}
                type="button"
                onClick={() => !expired && setSelectedTrialClass(opt)}
                disabled={expired}
                className={`bg-white rounded-lg shadow-md border border-gray-200 p-5 text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  expired
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:border-primary hover:shadow-lg'
                }`}
              >
                <p className="font-semibold text-gray-900 mb-1">{opt.name}</p>
                <p className="text-sm text-gray-500 mb-2">{opt.instructor}</p>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  {formatDateTimeRange(opt.start_time, opt.end_time, getLocale())}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  {t(`home.locations.${opt.location}`)}
                </div>
                <div className="flex flex-wrap gap-1 mt-3">
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">{t(`calendar.level.${opt.level}`)}</span>
                  {opt.age_tag && <span className="text-xs px-2 py-0.5 rounded bg-teal-100 text-teal-800">{t(`calendar.ageTag.${opt.age_tag}`)}</span>}
                </div>
                {expired && (
                  <p className="text-xs text-red-600 mt-2">
                    {t('trial.classNotAvailable', '此試堂時段已過，請選擇其他課堂。')}
                  </p>
                )}
              </button>
            )})}
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-3xl font-bold text-gray-900">{t('trial.title')}</h1>
          {selectedTrialClass && (
            <button
              type="button"
              onClick={() => setSelectedTrialClass(null)}
              className="text-sm text-primary font-medium hover:underline"
            >
              ← {t('trial.changeClass')}
            </button>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
            {/* Right Section - Class Information */}
            <div className="bg-white rounded-lg shadow-md p-6 lg:sticky lg:top-8 lg:h-fit">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                {t('trial.classInformation')}
              </h3>

              {/* Tutor Image and Name (fallback only when no detailed profile) */}
              {!instructorProfile && (
                <div className="flex items-center mb-6 pb-6 border-b-2 border-gray-100">
                  <img
                    src={getTutorImageUrl(effectiveClassData.instructor)}
                    alt={effectiveClassData.instructor}
                    className="w-24 h-24 rounded-full object-cover mr-4 border-4 border-primary-lighter"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{t('home.tutor')}</p>
                    <p className="text-lg font-bold text-gray-900">{effectiveClassData.instructor}</p>
                  </div>
                </div>
              )}

              {/* Teacher intro (awards, experience, dance school) */}
              {instructorProfile && (
                <div className="mb-6 pb-6 border-b-2 border-gray-100">
                  <InstructorIntroCard instructorName={effectiveClassData.instructor} />
                </div>
              )}

              {/* Dynamic tags synced with Tag Management */}
              {dynamicTagRows.length > 0 && (
                <div className="mb-6 pb-6 border-b-2 border-gray-100 space-y-2">
                  {dynamicTagRows.map((row) => (
                    <div key={row.key}>
                      <p className="text-sm font-medium text-gray-500 mb-1">{row.typeLabel}</p>
                      <span className="inline-block text-sm font-semibold px-3 py-1.5 rounded border bg-gray-100 text-gray-800 border-gray-200">
                        {row.valueLabel}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Class Details */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">{t('trial.className')}</p>
                  <p className="text-lg font-semibold text-gray-900">{effectiveClassData.name}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">{t('trial.classCode')}</p>
                  <p className="text-lg font-semibold text-primary">{effectiveClassData.program_code}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">{t('trial.level')}</p>
                  <span className={`inline-block text-sm font-semibold px-3 py-1.5 rounded border ${
                    effectiveClassData.level === 'entry' 
                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                      : effectiveClassData.level === 'intermediate'
                      ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                      : 'bg-purple-100 text-purple-800 border-purple-200'
                  }`}>
                    {effectiveClassData.level === 'entry' 
                      ? t('calendar.level.entry')
                      : effectiveClassData.level === 'intermediate'
                      ? t('calendar.level.intermediate')
                      : t('calendar.level.advanced')
                    }
                  </span>
                </div>

                {effectiveClassData.age_tag && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{t('trial.ageTag')}</p>
                    <span className={`inline-block text-sm font-semibold px-3 py-1.5 rounded border ${
                      effectiveClassData.age_tag === '5-8' 
                        ? 'bg-teal-100 text-teal-800 border-teal-200'
                        : effectiveClassData.age_tag === '9-12'
                        ? 'bg-cyan-100 text-cyan-800 border-cyan-200'
                        : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                    }`}>
                      {t(`calendar.ageTag.${effectiveClassData.age_tag}`)}
                    </span>
                  </div>
                )}

                <div className="flex items-center text-gray-800">
                  <Calendar className="h-5 w-5 mr-3 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{t('trial.classDateTime')}</p>
                    <p className="text-base font-semibold">
                      {formatDateTimeRange(
                        effectiveClassData.start_time,
                        effectiveClassData.end_time,
                        getLocale()
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center text-gray-800">
                  <MapPin className="h-5 w-5 mr-3 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{t('home.location')}</p>
                    <p className="text-base font-semibold">{t(`home.locations.${effectiveClassData.location}`)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Left Section - Registration Form or Apply Button */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                {isLoggedIn ? t('trial.submitApplication') : t('trial.registrationForm')}
              </h3>
              {isLoggedIn && profile && user && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">{t('register.fullName')}</p>
                    <p className="text-base font-semibold text-gray-900">{profile.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">{t('register.email')}</p>
                    <p className="text-base font-semibold text-gray-900">{user.email}</p>
                  </div>
                  {profile.mobile && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">{t('register.mobile')}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-gray-900">
                          {getMobileParts(profile.mobile).countryCode}
                        </span>
                        <span className="text-base font-semibold text-gray-900">
                          {getMobileParts(profile.mobile).number}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                    {error}
                  </div>
                )}

                {!isLoggedIn && (
                  <div className="rounded-md shadow-sm space-y-4">
                    <div>
                      <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('trial.fullName')} <span className="text-red-600">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="fullName"
                          name="fullName"
                          type="text"
                          autoComplete="name"
                          required
                          className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                          placeholder={t('trial.fullName')}
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          onFocus={() => {
                            if (nameSuggestions.length > 0) setShowNameSuggestions(true);
                          }}
                          onBlur={() => {
                            setTimeout(() => setShowNameSuggestions(false), 120);
                          }}
                        />
                        {showNameSuggestions && nameSuggestions.length > 0 && (
                          <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-56 overflow-auto">
                            {nameSuggestions.map((item) => (
                              <button
                                key={`${item.fullName}-${item.email || item.contactNumber || ''}`}
                                type="button"
                                className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                                onClick={() => {
                                  setFullName(item.fullName);
                                  if (!parentsName.trim() && item.parentsName) setParentsName(item.parentsName);
                                  if (!email.trim() && item.email) setEmail(item.email);
                                  if (!contactNumber.trim() && item.contactNumber) {
                                    const parts = getMobileParts(item.contactNumber.replace(/\D/g, ''));
                                    if (parts.countryCode) {
                                      setCountryCode(parts.countryCode.replace(/\D/g, ''));
                                    }
                                    setContactNumber(parts.number.replace(/\D/g, ''));
                                  }
                                  setShowNameSuggestions(false);
                                }}
                              >
                                <p className="text-sm font-medium text-gray-900">{item.fullName}</p>
                                {(item.parentsName || item.email) && (
                                  <p className="text-xs text-gray-500">
                                    {item.parentsName || item.email}
                                  </p>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="nickName" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('trial.nickName')}
                      </label>
                      <input
                        id="nickName"
                        name="nickName"
                        type="text"
                        className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                        placeholder={t('trial.nickName')}
                        value={nickName}
                        onChange={(e) => setNickName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('trial.dateOfBirth')} <span className="text-red-600">*</span>
                      </label>
                      <DateSelect
                        id="dateOfBirth"
                        birthDateMode
                        required
                        value={dateOfBirth}
                        onChange={setDateOfBirth}
                        className="w-full appearance-none relative block border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                        ariaLabel={t('trial.dateOfBirth')}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('trial.sex')} <span className="text-red-600">*</span>
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="sex"
                            value="male"
                            checked={sex === true}
                            onChange={() => setSex(true)}
                            className="mr-2"
                            required
                          />
                          {t('trial.male')}
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="sex"
                            value="female"
                            checked={sex === false}
                            onChange={() => setSex(false)}
                            className="mr-2"
                            required
                          />
                          {t('trial.female')}
                        </label>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="parentsName" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('trial.parentsName')}
                      </label>
                      <input
                        id="parentsName"
                        name="parentsName"
                        type="text"
                        className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                        placeholder={t('trial.parentsName')}
                        value={parentsName}
                        onChange={(e) => setParentsName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('trial.contactNumber')} <span className="text-red-600">*</span>
                      </label>
                      <div className="flex rounded-md shadow-sm">
                        <select
                          id="countryCode"
                          name="countryCode"
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="appearance-none relative block px-3 py-2 border border-gray-300 border-r-0 rounded-l-md bg-gray-50 text-gray-700 text-sm focus:outline-none focus:ring-primary focus:border-primary focus:z-10"
                        >
                          <option value="852">+852</option>
                          <option value="86">+86</option>
                          <option value="853">+853</option>
                        </select>
                        <input
                          id="contactNumber"
                          name="contactNumber"
                          type="tel"
                          autoComplete="tel"
                          required
                          className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-r-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                          placeholder={t('trial.contactNumber')}
                          value={contactNumber}
                          onChange={(e) => setContactNumber(e.target.value.replace(/\D/g, ''))}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('trial.email')} <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                        placeholder={t('trial.email')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>

                    <div>
                      <label htmlFor="residentialDistrict" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('trial.residentialDistrict')}
                      </label>
                      <select
                        id="residentialDistrict"
                        name="residentialDistrict"
                        className="appearance-none relative block w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                        value={residentialDistrict}
                        onChange={(e) => setResidentialDistrict(e.target.value)}
                      >
                        <option value="">{t('districts.pleaseSelect')}</option>
                        {HK_DISTRICT_KEYS.map((key) => (
                          <option key={key} value={key}>{t(`districts.${key}`)}</option>
                        ))}
                      </select>
                    </div>

                  </div>
                )}

                <div className="rounded-md shadow-sm space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('trial.hasJoinedCourses')}
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="hasJoinedCourses"
                          value="yes"
                          checked={hasJoinedCourses === true}
                          onChange={() => setHasJoinedCourses(true)}
                          className="mr-2"
                        />
                        {t('common.yes')}
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="hasJoinedCourses"
                          value="no"
                          checked={hasJoinedCourses === false}
                          onChange={() => setHasJoinedCourses(false)}
                          className="mr-2"
                        />
                        {t('common.no')}
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('trial.hasDanceExperience')}
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="hasDanceExperience"
                          value="yes"
                          checked={hasDanceExperience === true}
                          onChange={() => setHasDanceExperience(true)}
                          className="mr-2"
                        />
                        {t('common.yes')}
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="hasDanceExperience"
                          value="no"
                          checked={hasDanceExperience === false}
                          onChange={() => setHasDanceExperience(false)}
                          className="mr-2"
                        />
                        {t('common.no')}
                      </label>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="howDidYouHear" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('trial.howDidYouHear')}
                    </label>
                    <select
                      id="howDidYouHear"
                      name="howDidYouHear"
                      className="appearance-none relative block w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                      value={howDidYouHear}
                      onChange={(e) => setHowDidYouHear(e.target.value)}
                    >
                      <option value="">{t('trial.howDidYouHearPlaceholder')}</option>
                      <option value="facebook">{t('trial.howDidYouHearOptions.facebook')}</option>
                      <option value="instagram">{t('trial.howDidYouHearOptions.instagram')}</option>
                      <option value="searchEngine">{t('trial.howDidYouHearOptions.searchEngine')}</option>
                      <option value="theYardPromo">{t('trial.howDidYouHearOptions.theYardPromo')}</option>
                      <option value="friendReferral">{t('trial.howDidYouHearOptions.friendReferral')}</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="promoCode" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('trial.usedPromoCode', '使用了推廣碼')} <span className="text-gray-400">({t('common.optional')})</span>
                    </label>
                    <input
                      id="promoCode"
                      name="promoCode"
                      type="text"
                      className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                      placeholder={t('trial.promoCodePlaceholder', '選填，方便統計推廣來源')}
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                  >
                    {loading ? t('trial.submitting') : t('trial.submitApplication')}
                  </button>
                </div>
              </form>
            </div>
        </div>
      </div>
    </PublicLayout>
  );
}
