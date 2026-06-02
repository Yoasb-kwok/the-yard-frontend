import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Layout from '../../components/Layout';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/utils';

interface ClassOption {
  id: string;
  name: string;
  programCode: string;
  startTime: string;
  location: string;
}

export default function AdminTrialApplicationCreatePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [studentName, setStudentName] = useState('');
  const [parentName, setParentName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [residentialDistrict, setResidentialDistrict] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classLoadError, setClassLoadError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [detailClassId, setDetailClassId] = useState<string>('');
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const selectedClass = useMemo(
    () => classOptions.find((c) => c.id === selectedClassId) ?? null,
    [classOptions, selectedClassId]
  );

  const getLocale = () => (i18n.language === 'zh-CN' ? 'zh-CN' : i18n.language === 'zh-TW' ? 'zh-TW' : 'en-US');
  const formatDateLabel = (isoDate: string) => {
    const d = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(d.getTime())) return isoDate;
    return new Intl.DateTimeFormat(getLocale(), {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    }).format(d);
  };
  const getBranchLabel = (branch: string): string => {
    if (!branch) return '—';
    const key = `home.locations.${branch}`;
    const translated = t(key);
    return translated !== key ? translated : branch;
  };

  const detailClass = useMemo(
    () => classOptions.find((c) => c.id === detailClassId) ?? null,
    [classOptions, detailClassId]
  );
  const classesByDate = useMemo(() => {
    const map = new Map<string, ClassOption[]>();
    classOptions.forEach((c) => {
      const dateKey = c.startTime ? c.startTime.slice(0, 10) : '';
      if (!dateKey) return;
      const list = map.get(dateKey) ?? [];
      list.push(c);
      map.set(dateKey, list);
    });
    map.forEach((rows, dateKey) => {
      map.set(
        dateKey,
        rows.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      );
    });
    return map;
  }, [classOptions]);

  useEffect(() => {
    void loadClassOptions();
  }, []);

  async function loadClassOptions() {
    setLoadingClasses(true);
    setClassLoadError(null);
    try {
      const endpoints = ['/admin/classes', '/classes'];
      let rows: any[] = [];
      for (const endpoint of endpoints) {
        try {
          const response = await api.get<any[]>(endpoint);
          if (response.success && Array.isArray(response.data) && response.data.length > 0) {
            rows = response.data;
            break;
          }
        } catch {
          // Try next endpoint.
        }
      }
      const mapped = rows
        .map((row) => {
          const id = String(row?.id ?? '').trim();
          const name = String(row?.name ?? row?.class_name ?? '').trim();
          const startTime = String(row?.start_time ?? '').trim();
          const location = String(row?.location ?? row?.branch ?? '').trim();
          const programCode = String(row?.class_code ?? row?.program_code ?? row?.programCode ?? '').trim();
          return { id, name, startTime, location, programCode };
        })
        .filter((row) => row.id && row.name && row.startTime)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      setClassOptions(mapped);
      if (mapped.length > 0 && !selectedClassId) {
        const now = new Date();
        const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
          now.getDate()
        ).padStart(2, '0')}`;
        const getDateKey = (iso: string) => {
          const d = new Date(iso);
          if (Number.isNaN(d.getTime())) return '';
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(
            2,
            '0'
          )}`;
        };

        const todayRows = mapped.filter((row) => getDateKey(row.startTime) === todayKey);
        const upcomingTodayRows = todayRows.filter((row) => new Date(row.startTime).getTime() >= now.getTime());
        const upcomingRows = mapped.filter((row) => new Date(row.startTime).getTime() >= now.getTime());
        const defaultClass = upcomingTodayRows[0] ?? todayRows[0] ?? upcomingRows[0] ?? mapped[0];

        setSelectedClassId(defaultClass.id);
        setDetailClassId(defaultClass.id);
        const firstDateObj = new Date(defaultClass.startTime);
        if (!Number.isNaN(firstDateObj.getTime())) {
          setCalendarMonth(new Date(firstDateObj.getFullYear(), firstDateObj.getMonth(), 1));
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setClassLoadError(msg);
    } finally {
      setLoadingClasses(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (
      !studentName.trim() ||
      !parentName.trim() ||
      !contactPhone.trim() ||
      !residentialDistrict.trim() ||
      !birthDate.trim() ||
      !gender.trim() ||
      !selectedClass
    ) {
      setError(
        t('admin.trialApplications.requiredHint', {
          defaultValue: '請先填寫學生姓名、家長姓名、居住地區、聯絡電話、出生日期、性別，並在課程表選擇課堂。',
        })
      );
      return;
    }

    const appliedAtIso = new Date().toISOString();
    const normalizedPhone = contactPhone.trim();
    const normalizedStudentName = studentName.trim();
    const normalizedParentName = parentName.trim();
    const normalizedDistrict = residentialDistrict.trim();
    const normalizedBirthDate = birthDate.trim();
    const normalizedGender = gender.trim();
    const classId = String(selectedClass.id ?? '').trim();
    const programCode = String(selectedClass.programCode ?? '').trim();
    const numericClassId = /^\d+$/.test(classId) ? classId : undefined;

    const payload = {
      fullName: normalizedStudentName,
      applicant_name: normalizedStudentName,
      full_name: normalizedStudentName,
      student_name: normalizedStudentName,
      studentName: normalizedStudentName,
      parent_name: normalizedParentName,
      parentName: normalizedParentName,
      guardian_name: normalizedParentName,
      guardianName: normalizedParentName,
      applicant_phone: normalizedPhone,
      mobile: normalizedPhone,
      contact_number: normalizedPhone,
      phone: normalizedPhone,
      contact_phone: normalizedPhone,
      district: normalizedDistrict,
      residential_district: normalizedDistrict,
      location_district: normalizedDistrict,
      birth_date: normalizedBirthDate,
      date_of_birth: normalizedBirthDate,
      dob: normalizedBirthDate,
      gender: normalizedGender,
      sex: normalizedGender,
      trial_class: selectedClass.name,
      class_name: selectedClass.name,
      trialClassName: selectedClass.name,
      requested_trial_class_name: selectedClass.name,
      // class identifiers (camelCase + snake_case) for backend compatibility
      classId: classId || undefined,
      class_id: classId || undefined,
      apiClassRowId: classId || undefined,
      api_class_row_id: classId || undefined,
      assigned_class_id: classId || undefined,
      programCode: programCode || undefined,
      program_code: programCode || undefined,
      class_code: programCode || undefined,
      course_code: programCode || undefined,
      preferred_program: programCode || undefined,
      ...(numericClassId ? { courseId: numericClassId, course_id: numericClassId } : {}),
      branch: selectedClass.location || null,
      preferred_location: selectedClass.location || null,
      location: selectedClass.location || null,
      preferred_datetime: selectedClass.startTime,
      preferred_date: selectedClass.startTime,
      trial_date: selectedClass.startTime,
      status: 'pending',
      applied_at: appliedAtIso,
      created_at: appliedAtIso,
      notes: '',
    };

    setSaving(true);
    try {
      const res = await api.post('/admin/trial-applications', payload);
      if (!res.success) {
        throw new Error(res.msg || t('common.error', { defaultValue: 'Something went wrong.' }));
      }
      navigate('/admin/trial-applications');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(t('admin.trialApplications.createFailed', { defaultValue: '新增失敗：{{msg}}', msg }));
    } finally {
      setSaving(false);
    }
  }

  const monthLabel = new Intl.DateTimeFormat(getLocale(), {
    year: 'numeric',
    month: 'long',
  }).format(calendarMonth);
  const weekLabels = useMemo(() => {
    const base = new Date(2024, 0, 7); // Sunday
    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(base);
      d.setDate(base.getDate() + idx);
      return new Intl.DateTimeFormat(getLocale(), { weekday: 'short' }).format(d);
    });
  }, [i18n.language]);
  const getLocationColors = (location: string) => {
    const colorMap: Record<string, { primary: string; dark: string; lighter: string }> = {
      sanpokong: { primary: '#10b981', dark: '#059669', lighter: '#d1fae5' },
      causewaybay: { primary: '#a67c52', dark: '#8b6f47', lighter: '#f0e6d2' },
      fotan: { primary: '#f97316', dark: '#ea580c', lighter: '#ffedd5' },
      sheungshui: { primary: '#3b82f6', dark: '#2563eb', lighter: '#dbeafe' },
    };
    return colorMap[location] ?? { primary: '#6366f1', dark: '#4f46e5', lighter: '#e0e7ff' };
  };
  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];
    const startDay = firstDay.getDay();
    for (let i = 0; i < startDay; i += 1) {
      days.push(new Date(year, month, 1 - startDay + i));
    }
    for (let i = 1; i <= lastDay.getDate(); i += 1) {
      days.push(new Date(year, month, i));
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i += 1) {
      const d = new Date(lastDay);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  };
  const getClassesForDate = (date: Date): ClassOption[] => {
    const key = date.toISOString().slice(0, 10);
    return classesByDate.get(key) ?? [];
  };
  const calendarDays = useMemo(() => getDaysInMonth(calendarMonth), [calendarMonth, classesByDate]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            {t('admin.trialApplications.add', { defaultValue: '新增試堂申請' })}
          </h1>
          <button
            type="button"
            onClick={() => navigate('/admin/trial-applications')}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('common.back', { defaultValue: '返回' })}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg bg-white p-5 shadow-md space-y-4">
          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">
                {t('admin.trialApplications.studentName', '學生姓名')} *
              </span>
              <input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">
                {t('admin.trialApplications.parentName', '家長姓名')} *
              </span>
              <input
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">
                {t('admin.trialApplications.residentialDistrict', '居住地區')} *
              </span>
              <input
                value={residentialDistrict}
                onChange={(e) => setResidentialDistrict(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">
                {t('admin.trialApplications.phone', '聯絡電話')} *
              </span>
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">
                {t('admin.trialApplications.birthDate', '出生日期')} *
              </span>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">
                {t('admin.trialApplications.gender', '性別')} *
              </span>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary"
              >
                <option value="">{t('common.pleaseSelect', { defaultValue: '請選擇' })}</option>
                <option value="female">{t('common.genderFemale', { defaultValue: '女' })}</option>
                <option value="male">{t('common.genderMale', { defaultValue: '男' })}</option>
                <option value="other">{t('common.genderOther', { defaultValue: '其他' })}</option>
              </select>
            </label>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-900">
                {t('admin.trialApplications.pickClass', { defaultValue: '課堂選擇' })}
              </h2>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-dark"
              >
                <CalendarDays className="h-4 w-4" />
                {t('admin.trialApplications.openClassPicker', { defaultValue: '從課程表選課堂' })}
              </button>
            </div>
            {selectedClass ? (
              <div className="rounded-md border border-primary/20 bg-white px-3 py-2 text-sm text-gray-700 space-y-1">
                <div>
                  <span className="font-medium text-gray-900">{t('admin.trialApplications.trialClass', '課程名稱')}：</span>
                  {selectedClass.name}
                </div>
                <div>
                  <span className="font-medium text-gray-900">{t('admin.trialApplications.courseCode', '課程代碼')}：</span>
                  {selectedClass.programCode || '—'}
                </div>
                <div>
                  <span className="font-medium text-gray-900">{t('admin.trialApplications.courseDateTime', '課程日期及時間')}：</span>
                  {formatDateTime(selectedClass.startTime, getLocale())}
                </div>
                <div>
                  <span className="font-medium text-gray-900">{t('admin.trialApplications.branch', '分店')}：</span>
                  {getBranchLabel(selectedClass.location)}
                </div>
              </div>
            ) : (
              <p className="text-sm text-amber-700">
                {t('admin.trialApplications.pickClassHint', { defaultValue: '請先從課程表選擇課堂。' })}
              </p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
            >
              {saving ? t('common.loading', { defaultValue: 'Loading...' }) : t('common.create', { defaultValue: '新增' })}
            </button>
          </div>
        </form>
      </div>
      {pickerOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="w-full max-w-4xl rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h2 className="text-base font-semibold text-gray-900">
                {t('admin.trialApplications.openClassPicker', { defaultValue: '從課程表選課堂' })}
              </h2>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4">
              {loadingClasses ? (
                <div className="py-10 text-center text-sm text-gray-500">{t('common.loading', { defaultValue: 'Loading...' })}</div>
              ) : classLoadError ? (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {classLoadError}
                </div>
              ) : classOptions.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-500">
                  {t('admin.trialApplications.noClassFound', { defaultValue: '暫時沒有可選課堂。' })}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() =>
                          setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <h3 className="text-sm font-semibold text-gray-900">{monthLabel}</h3>
                      <button
                        type="button"
                        onClick={() =>
                          setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      {(['sanpokong', 'causewaybay', 'fotan', 'sheungshui'] as const).map((loc) => {
                        const c = getLocationColors(loc);
                        return (
                          <div key={loc} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.primary }} />
                            {getBranchLabel(loc)}
                          </div>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {weekLabels.map((label) => (
                        <div key={label} className="py-1 text-center text-xs font-medium text-gray-500">
                          {label}
                        </div>
                      ))}
                      {calendarDays.map((day, idx) => {
                        const dayClasses = getClassesForDate(day);
                        const isToday = day.toDateString() === new Date().toDateString();
                        const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
                        return (
                          <div
                            key={`${day.toISOString()}-${idx}`}
                            className={`min-h-[110px] rounded-md border p-1.5 ${
                              isToday ? 'bg-primary-lighter' : 'bg-white'
                            } ${!isCurrentMonth ? 'opacity-60' : ''}`}
                          >
                            <div className={`mb-1 text-xs font-medium ${isToday ? 'text-primary' : 'text-gray-700'}`}>
                              {day.getDate()}
                            </div>
                            <div className="space-y-1">
                              {dayClasses.slice(0, 3).map((row) => {
                                const colors = getLocationColors(row.location);
                                return (
                                  <button
                                    key={row.id}
                                    type="button"
                                    onClick={() => setDetailClassId(row.id)}
                                    className="block w-full rounded px-1.5 py-0.5 text-left text-[10px] leading-tight text-white transition-colors"
                                    style={{ backgroundColor: colors.primary }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = colors.dark;
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = colors.primary;
                                    }}
                                    title={`${row.name} · ${formatDateTime(row.startTime, getLocale())}`}
                                  >
                                    {row.name}
                                  </button>
                                );
                              })}
                              {dayClasses.length > 3 && (
                                <div className="text-[10px] font-medium text-primary">
                                  +{dayClasses.length - 3} {t('calendar.moreOnDay', { defaultValue: 'more' })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                    <h4 className="mb-2 text-sm font-semibold text-gray-900">
                      {t('admin.trialApplications.classDetails', { defaultValue: '課堂詳情' })}
                    </h4>
                    {!detailClass ? (
                      <p className="text-sm text-gray-500">
                        {t('admin.trialApplications.pickClassHint', { defaultValue: '請直接點擊月曆內課堂查看詳情。' })}
                      </p>
                    ) : (
                      <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-2">
                        <div className="text-sm font-semibold text-gray-900">{detailClass.name}</div>
                        <div className="text-xs text-gray-700">
                          {t('admin.trialApplications.courseCode', { defaultValue: '課程代碼' })}: {detailClass.programCode || '—'}
                        </div>
                        <div className="text-xs text-gray-700">
                          {t('admin.trialApplications.courseDateTime', { defaultValue: '課程日期及時間' })}: {formatDateTime(detailClass.startTime, getLocale())}
                        </div>
                        <div className="text-xs text-gray-700">
                          {t('admin.trialApplications.branch', { defaultValue: '分店' })}: {getBranchLabel(detailClass.location)}
                        </div>
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClassId(detailClass.id);
                              setPickerOpen(false);
                            }}
                            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-dark"
                          >
                            {t('admin.trialApplications.selectClass', { defaultValue: '選擇此課堂' })}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
