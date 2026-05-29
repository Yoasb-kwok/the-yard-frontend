import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { formatDate, formatDateTimeRange, formatMobileForDisplay } from '../../lib/utils';
import { api } from '../../lib/api';
import { ArrowLeft, Search, Calendar, User, Package, CheckCircle, X, Filter, MapPin, Play, Clock } from 'lucide-react';

interface Class {
  id: string;
  name: string;
  class_code: string;
  instructor: string;
  start_time: string;
  end_time: string;
  capacity: number;
  enrolled_count: number;
  is_internal: boolean;
  is_cancelled: boolean;
  location?: 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui';
}

interface Enrollment {
  id: string;
  class_id: string;
  status: 'enrolled' | 'attended' | 'absent' | 'sick_leave';
  created_at: string;
}

interface User {
  id: string;
  full_name: string;
  mobile: string | null;
  total_tokens: number;
  assigned_tokens: number;
  expiry_date: string;
}

function mapAdminUserRow(raw: Record<string, unknown>): User {
  const tokens = Array.isArray(raw.user_tokens) ? raw.user_tokens : [];
  let total_tokens = 0;
  let earliestExpiry = '';
  for (const t of tokens) {
    const row = t as Record<string, unknown>;
    total_tokens += Number(row.remaining_tokens ?? row.balance ?? 0);
    const exp = typeof row.expiry_date === 'string'
      ? row.expiry_date.slice(0, 10)
      : typeof row.expires_at === 'string'
        ? row.expires_at.slice(0, 10)
        : '';
    if (exp && (!earliestExpiry || exp < earliestExpiry)) earliestExpiry = exp;
  }
  const assigned_tokens = Number(raw.assigned_tokens ?? raw.assigned_token_count ?? 0);
  return {
    id: String(raw.id ?? ''),
    full_name: String(raw.full_name ?? raw.name ?? ''),
    mobile: raw.mobile != null ? String(raw.mobile) : null,
    total_tokens,
    assigned_tokens: Number.isFinite(assigned_tokens) ? assigned_tokens : 0,
    expiry_date: earliestExpiry,
  };
}

export default function TokenAssignmentPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<'all' | 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui'>('all');
  const [confirmModal, setConfirmModal] = useState<null | { type: 'assign'; classId: string; className: string } | { type: 'remove'; enrollmentId: string; classId: string; className: string }>(null);
  const [assignTokenInput, setAssignTokenInput] = useState('1');

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  async function loadData() {
    setLoading(true);
    try {
      const usersRes = await api.get<any[]>('/admin/users');
      const users = usersRes.success && Array.isArray(usersRes.data) ? usersRes.data : [];
      const raw = users.find((u) => String(u.id) === String(userId));
      if (!raw) {
        setUser(null);
        setClasses([]);
        setEnrollments([]);
        return;
      }
      setUser(mapAdminUserRow(raw as Record<string, unknown>));

      const classesRes = await api.get<any[]>('/admin/classes');
      if (classesRes.success && Array.isArray(classesRes.data)) {
        const mapped: Class[] = classesRes.data.map((cls: any) => ({
          id: String(cls.id),
          name: cls.name || '',
          class_code: cls.program_code || '',
          instructor: cls.instructor || '',
          start_time: cls.start_time,
          end_time: cls.end_time,
          capacity: cls.capacity ?? 0,
          enrolled_count: cls.enrolled_count ?? 0,
          is_internal: cls.is_internal === 1 || cls.is_internal === true,
          is_cancelled: cls.is_cancelled === 1 || cls.is_cancelled === true,
          location: cls.location,
        }));
        setClasses(mapped);
      } else {
        setClasses([]);
      }

      // Enrollments: empty until enrollments-by-user API is wired
      setEnrollments([]);
    } catch (err) {
      console.error('TokenAssignment loadData:', err);
      setUser(null);
      setClasses([]);
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  }

  const getLocale = (): string => {
    const langMap: { [key: string]: string } = {
      'en': 'en-US',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
    };
    return langMap[i18n.language] || i18n.language || 'en-US';
  };

  const getUnassignedTokens = (): number => {
    if (!user) return 0;
    return user.total_tokens - user.assigned_tokens;
  };

  const isClassAssigned = (classId: string): boolean => {
    return enrollments.some(e => e.class_id === classId);
  };

  const isClassFull = (classItem: Class): boolean => {
    return classItem.enrolled_count >= classItem.capacity;
  };

  const isClassPast = (classItem: Class): boolean => {
    return new Date(classItem.start_time) < new Date();
  };

  const canAssignToClass = (classItem: Class): boolean => {
    const unassignedTokens = getUnassignedTokens();
    return !isClassAssigned(classItem.id) && !isClassFull(classItem) && !isClassPast(classItem) && !classItem.is_cancelled && unassignedTokens > 0;
  };

  async function assignTokenToClass(classId: string, count: number): Promise<boolean> {
    if (!user || count < 1) return false;

    // Reject if assigned + count would exceed total: show error and do not assign
    if (user.assigned_tokens + count > user.total_tokens) {
      alert(t('admin.tokenAssignment.assignExceedsTotal', {
        count,
        assigned: user.assigned_tokens,
        total: user.total_tokens,
      }));
      return false;
    }

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const newEnrollments: Enrollment[] = Array.from({ length: count }, (_, i) => ({
      id: `enroll-${Date.now()}-${i}`,
      class_id: classId,
      status: 'enrolled' as const,
      created_at: new Date().toISOString(),
    }));

    setEnrollments([...enrollments, ...newEnrollments]);

    if (user) {
      setUser({
        ...user,
        assigned_tokens: user.assigned_tokens + count,
      });
    }

    setClasses(classes.map(c =>
      c.id === classId
        ? { ...c, enrolled_count: c.enrolled_count + count }
        : c
    ));

    alert(t('admin.tokenAssignment.assignedSuccessfully'));
    return true;
  }

  async function removeAssignment(enrollmentId: string, classId: string) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Remove enrollment
    setEnrollments(enrollments.filter(e => e.id !== enrollmentId));
    
    // Decrease assigned tokens count
    if (user) {
      setUser({
        ...user,
        assigned_tokens: Math.max(0, user.assigned_tokens - 1),
      });
    }
    
    // Update class enrolled count
    setClasses(classes.map(c =>
      c.id === classId
        ? { ...c, enrolled_count: Math.max(0, c.enrolled_count - 1) }
        : c
    ));
    
    alert(t('admin.tokenAssignment.removedSuccessfully'));
  }

  const handleConfirmModal = async () => {
    if (!confirmModal) return;
    if (confirmModal.type === 'remove') {
      await removeAssignment(confirmModal.enrollmentId, confirmModal.classId);
    }
    setConfirmModal(null);
  };

  const handleAssignConfirm = async () => {
    if (!confirmModal || confirmModal.type !== 'assign') return;
    const n = Math.max(1, parseInt(assignTokenInput, 10) || 1);
    const ok = await assignTokenToClass(confirmModal.classId, n);
    if (ok) setConfirmModal(null);
  };

  const getLocationLabel = (location?: string | typeof locationFilter): string => {
    if (!location || location === 'all') {
      return location === 'all' ? t('admin.classes.allLocations') : '-';
    }
    return t(`home.locations.${location}`);
  };

  const renderClassRow = (classItem: Class) => {
    const classEnrollments = enrollments.filter(e => e.class_id === classItem.id);
    const isAssigned = classEnrollments.length > 0;
    const canAssign = canAssignToClass(classItem);
    const firstEnrollment = classEnrollments[0];

    return (
      <div
        key={classItem.id}
        className={`p-4 rounded-lg border ${
          isAssigned ? 'bg-green-50 border-green-200' : canAssign ? 'bg-white border-gray-200 hover:border-primary' : 'bg-gray-50 border-gray-200 opacity-60'
        } ${classItem.is_cancelled ? 'opacity-50' : ''}`}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{classItem.name}</h3>
              {classItem.is_internal && (
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">{t('admin.tokenAssignment.makeupClass')}</span>
              )}
              {classItem.is_cancelled && (
                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">{t('admin.classes.cancelled')}</span>
              )}
              {isAssigned && (
                <span className="bg-primary-lighter text-primary text-xs px-2 py-1 rounded flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> {classEnrollments.length > 1 ? t('admin.tokenAssignment.assignedCount', { count: classEnrollments.length }) : t('admin.tokenAssignment.assigned')}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-1"><span className="font-medium">{t('admin.tokenAssignment.classCode')}:</span> {classItem.class_code}</p>
            <p className="text-sm text-gray-600 mb-1"><span className="font-medium">{t('admin.tokenAssignment.instructor')}:</span> {classItem.instructor}</p>
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-medium">{t('admin.tokenAssignment.time')}:</span>{' '}
              {formatDateTimeRange(classItem.start_time, classItem.end_time, getLocale())}
            </p>
            {classItem.location && (
              <p className="text-sm text-gray-600 mb-1"><span className="font-medium">{t('admin.tokenAssignment.location')}:</span> {getLocationLabel(classItem.location)}</p>
            )}
            <p className="text-sm text-gray-600"><span className="font-medium">{t('admin.tokenAssignment.enrolled')}:</span> {classItem.enrolled_count} / {classItem.capacity}</p>
          </div>
          <div className="flex gap-2 ml-4">
            {isAssigned && firstEnrollment ? (
              <button onClick={() => setConfirmModal({ type: 'remove', enrollmentId: firstEnrollment.id, classId: classItem.id, className: classItem.name })} className="px-4 py-2 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 flex items-center gap-2">
                <X className="h-4 w-4" /> {t('admin.tokenAssignment.remove')}
              </button>
            ) : canAssign ? (
              <button onClick={() => { setConfirmModal({ type: 'assign', classId: classItem.id, className: classItem.name }); setAssignTokenInput('1'); }} className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-white hover:bg-primary-dark flex items-center gap-2">
                <Package className="h-4 w-4" /> {t('admin.tokenAssignment.assign')}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  const filteredClasses = classes.filter(classItem => {
    const locationMatches = locationFilter === 'all' || classItem.location === locationFilter;
    const searchMatches =
      classItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classItem.class_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classItem.instructor.toLowerCase().includes(searchTerm.toLowerCase());
    return locationMatches && searchMatches;
  });

  // Unique year-months from classes, plus at least 12 months: current + next 11 (Jan, Feb, Mar...)
  const yearMonths = (() => {
    const set = new Set<string>();
    filteredClasses.forEach(c => {
      const d = new Date(c.start_time);
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    });
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return Array.from(set).sort();
  })();

  const formatMonthOption = (key: string) => {
    if (key === 'all') return t('admin.tokenAssignment.allMonths');
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(getLocale(), { month: 'short', year: 'numeric' });
  };

  const filteredByMonth =
    monthFilter === 'all'
      ? filteredClasses
      : filteredClasses.filter(c => {
          const d = new Date(c.start_time);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === monthFilter;
        });

  const sortByStartTime = (a: Class, b: Class) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  const startedClasses = filteredByMonth.filter(c => new Date(c.start_time) < new Date()).sort(sortByStartTime);
  const upcomingClasses = filteredByMonth.filter(c => new Date(c.start_time) >= new Date()).sort(sortByStartTime);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/users')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{t('admin.tokenAssignment.title')}</h1>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-center text-gray-600 py-8">{t('admin.tokenAssignment.userNotFound')}</p>
          </div>
        </div>
      </Layout>
    );
  }

  const unassignedTokens = getUnassignedTokens();

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/users')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.tokenAssignment.title')}</h1>
        </div>

        {/* User Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-primary-lighter rounded-full">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{user.full_name}</h2>
              <p className="text-gray-600">{formatMobileForDisplay(user.mobile, '-')}</p>
            </div>
          </div>

          {/* Token Information */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-5 w-5 text-primary" />
                  <span className="font-medium text-gray-900">{t('admin.tokenAssignment.totalTokens')}</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{user.total_tokens}</div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="font-medium text-gray-900">{t('admin.tokenAssignment.tokenExpiryDate')}</span>
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatDate(user.expiry_date, getLocale())}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-gray-900">{t('admin.tokenAssignment.unassignedTokens')}</span>
                </div>
                <span className="text-2xl font-bold text-green-600">{unassignedTokens}</span>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                {t('admin.tokenAssignment.assignedTokens')}: {user.assigned_tokens} / {user.total_tokens}
              </div>
            </div>
          </div>
        </div>

        {/* Month choice (Jan, Feb...) - above Location Filter */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">{t('admin.tokenAssignment.filterByMonth')}</h3>
          </div>
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium bg-white min-w-[180px]"
          >
            <option value="all">{t('admin.tokenAssignment.allMonths')}</option>
            {yearMonths.map((ym) => (
              <option key={ym} value={ym}>
                {formatMonthOption(ym)}
              </option>
            ))}
          </select>
        </div>

        {/* Location Filter */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3 mb-3">
            <Filter className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">{t('admin.classes.filterByLocation')}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'sanpokong', 'causewaybay', 'fotan', 'sheungshui'] as typeof locationFilter[]).map((loc) => {
              const isActive = locationFilter === loc;
              
              return (
                <button
                  key={loc}
                  onClick={() => setLocationFilter(loc)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {getLocationLabel(loc)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Course List: 已開課 / 未開課 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('admin.tokenAssignment.assignToClasses')}</h2>

          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder={t('admin.tokenAssignment.searchClasses')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* 未開課 Not Yet Started - on top */}
          <div className="mb-8">
            <h3 className="flex items-center gap-2 text-lg font-medium text-gray-900 mb-3">
              <Clock className="h-5 w-5 text-primary" />
              {t('admin.tokenAssignment.upcoming')}
            </h3>
            {upcomingClasses.length === 0 ? (
              <p className="text-gray-500 py-4">{t('admin.tokenAssignment.noClassesInSection')}</p>
            ) : (
              <div className="space-y-3">
                {upcomingClasses.map((c) => renderClassRow(c))}
              </div>
            )}
          </div>

          {/* 已開課 Already Started - below */}
          <div>
            <h3 className="flex items-center gap-2 text-lg font-medium text-gray-900 mb-3">
              <Play className="h-5 w-5 text-amber-600" />
              {t('admin.tokenAssignment.started')}
            </h3>
            {startedClasses.length === 0 ? (
              <p className="text-gray-500 py-4">{t('admin.tokenAssignment.noClassesInSection')}</p>
            ) : (
              <div className="space-y-3">
                {startedClasses.map((c) => renderClassRow(c))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm modal for 分配 / 移除 */}
      {confirmModal && (() => {
        const isAssign = confirmModal.type === 'assign';
        const parsed = parseInt(assignTokenInput, 10);
        const assignValid = isAssign && !isNaN(parsed) && parsed >= 1;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setConfirmModal(null)}>
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${isAssign ? 'bg-primary/20' : 'bg-red-100'}`}>
                  {isAssign ? <Package className="h-5 w-5 text-primary" /> : <X className="h-5 w-5 text-red-600" />}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {isAssign ? t('admin.tokenAssignment.assignTokensModalTitle') : t('admin.tokenAssignment.confirmRemove')}
                </h3>
              </div>
              {isAssign ? (
                <>
                  <p className="text-gray-600 mb-2">{t('admin.tokenAssignment.assignTokensToClass', { className: confirmModal.className })}</p>
                  <div className="mb-6">
                    <label htmlFor="assign-token-count" className="block text-sm font-medium text-gray-700 mb-1">{t('admin.tokenAssignment.tokensToAssign')}</label>
                    <input
                      id="assign-token-count"
                      type="number"
                      min={1}
                      value={assignTokenInput}
                      onChange={(e) => setAssignTokenInput(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </>
              ) : (
                <p className="text-gray-600 mb-6">{t('admin.tokenAssignment.confirmRemoveMessage', { className: confirmModal.className })}</p>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 rounded-md text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
                {isAssign ? (
                  <button
                    onClick={handleAssignConfirm}
                    disabled={!assignValid}
                    className="px-4 py-2 rounded-md text-sm font-medium text-white bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('admin.tokenAssignment.assign')}
                  </button>
                ) : (
                  <button
                    onClick={handleConfirmModal}
                    className="px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                  >
                    {t('common.confirm')}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </Layout>
  );
}

