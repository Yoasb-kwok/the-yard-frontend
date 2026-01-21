import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { formatDate, formatDateTime } from '../../lib/utils';
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

// Mock data
const MOCK_USER: User = {
  id: 'user-001',
  full_name: '張三',
  mobile: '91234567',
  total_tokens: 18,
  assigned_tokens: 1,
  expiry_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Latest expiry date
};

const now = Date.now();
const hour = 60 * 60 * 1000;
const day = 24 * 60 * 60 * 1000;
const MOCK_CLASSES: Class[] = [
  {
    id: '0a',
    name: 'Yoga Basics',
    class_code: 'YB001',
    instructor: 'Jane Smith',
    start_time: new Date(now - 2 * day).toISOString(),
    end_time: new Date(now - 2 * day + hour).toISOString(),
    capacity: 12,
    enrolled_count: 3,
    is_internal: false,
    is_cancelled: false,
    location: 'sanpokong',
  },
  {
    id: '0b',
    name: '幼兒街舞入門班',
    class_code: 'PSW6R3',
    instructor: 'Wawa',
    start_time: new Date(now - 5 * day).toISOString(),
    end_time: new Date(now - 5 * day + hour).toISOString(),
    capacity: 15,
    enrolled_count: 8,
    is_internal: false,
    is_cancelled: false,
    location: 'fotan',
  },
  {
    id: '1',
    name: 'Yoga Basics',
    class_code: 'YB001',
    instructor: 'Jane Smith',
    start_time: new Date(now + 1 * day).toISOString(),
    end_time: new Date(now + 1 * day + hour).toISOString(),
    capacity: 12,
    enrolled_count: 2,
    is_internal: false,
    is_cancelled: false,
    location: 'sanpokong',
  },
  {
    id: '2',
    name: 'Pilates Intermediate',
    class_code: 'PI002',
    instructor: 'John Doe',
    start_time: new Date(now + 2 * day).toISOString(),
    end_time: new Date(now + 2 * day + 90 * 60000).toISOString(),
    capacity: 15,
    enrolled_count: 5,
    is_internal: false,
    is_cancelled: false,
    location: 'causewaybay',
  },
  {
    id: '3',
    name: '補課 - Yoga Basics',
    class_code: 'YB-MK001',
    instructor: 'Jane Smith',
    start_time: new Date(now + 3 * day).toISOString(),
    end_time: new Date(now + 3 * day + hour).toISOString(),
    capacity: 5,
    enrolled_count: 1,
    is_internal: true,
    is_cancelled: false,
    location: 'fotan',
  },
];

const MOCK_ENROLLMENTS: Enrollment[] = [
  {
    id: 'enroll-1',
    class_id: '1',
    status: 'enrolled',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function TokenAssignmentPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState<'all' | 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui'>('all');
  const [confirmModal, setConfirmModal] = useState<null | { type: 'assign'; classId: string; className: string } | { type: 'remove'; enrollmentId: string; classId: string; className: string }>(null);

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  async function loadData() {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    setUser(MOCK_USER);
    
    // Load classes
    await new Promise(resolve => setTimeout(resolve, 300));
    setClasses(MOCK_CLASSES);
    
    // Load enrollments
    await new Promise(resolve => setTimeout(resolve, 200));
    setEnrollments(MOCK_ENROLLMENTS);
    
    setLoading(false);
  }

  const getLocale = (): string => {
    const langMap: { [key: string]: string } = {
      'en': 'en-US',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
    };
    return langMap[i18n.language] || i18n.language || 'en-US';
  };

  const formatMobile = (mobile: string | null): string => {
    if (!mobile) return '-';
    
    if (mobile.startsWith('852')) {
      return `+852 ${mobile.substring(3)}`;
    } else if (mobile.startsWith('853')) {
      return `+853 ${mobile.substring(3)}`;
    } else if (mobile.startsWith('86')) {
      return `+86 ${mobile.substring(2)}`;
    }
    
    return `+852 ${mobile}`;
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

  async function assignTokenToClass(classId: string) {
    if (!user || getUnassignedTokens() === 0) return;
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Create new enrollment
    const newEnrollment: Enrollment = {
      id: `enroll-${Date.now()}`,
      class_id: classId,
      status: 'enrolled',
      created_at: new Date().toISOString(),
    };
    
    setEnrollments([...enrollments, newEnrollment]);
    
    // Increase assigned tokens count
    if (user) {
      setUser({
        ...user,
        assigned_tokens: user.assigned_tokens + 1,
      });
    }
    
    // Update class enrolled count
    setClasses(classes.map(c =>
      c.id === classId
        ? { ...c, enrolled_count: c.enrolled_count + 1 }
        : c
    ));
    
    alert(t('admin.tokenAssignment.assignedSuccessfully'));
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
    if (confirmModal.type === 'assign') {
      await assignTokenToClass(confirmModal.classId);
    } else {
      await removeAssignment(confirmModal.enrollmentId, confirmModal.classId);
    }
    setConfirmModal(null);
  };

  const getLocationLabel = (location?: string | typeof locationFilter): string => {
    if (!location || location === 'all') {
      return location === 'all' ? t('admin.classes.allLocations') : '-';
    }
    return t(`home.locations.${location}`);
  };

  const renderClassRow = (classItem: Class) => {
    const isAssigned = isClassAssigned(classItem.id);
    const canAssign = canAssignToClass(classItem);
    const enrollment = enrollments.find(e => e.class_id === classItem.id);

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
                  <CheckCircle className="h-3 w-3" /> {t('admin.tokenAssignment.assigned')}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-1"><span className="font-medium">{t('admin.tokenAssignment.classCode')}:</span> {classItem.class_code}</p>
            <p className="text-sm text-gray-600 mb-1"><span className="font-medium">{t('admin.tokenAssignment.instructor')}:</span> {classItem.instructor}</p>
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-medium">{t('admin.tokenAssignment.time')}:</span>{' '}
              {formatDateTime(classItem.start_time, getLocale())} - {formatDateTime(classItem.end_time, getLocale())}
            </p>
            {classItem.location && (
              <p className="text-sm text-gray-600 mb-1"><span className="font-medium">{t('admin.tokenAssignment.location')}:</span> {getLocationLabel(classItem.location)}</p>
            )}
            <p className="text-sm text-gray-600"><span className="font-medium">{t('admin.tokenAssignment.enrolled')}:</span> {classItem.enrolled_count} / {classItem.capacity}</p>
          </div>
          <div className="flex gap-2 ml-4">
            {isAssigned && enrollment ? (
              <button onClick={() => setConfirmModal({ type: 'remove', enrollmentId: enrollment.id, classId: classItem.id, className: classItem.name })} className="px-4 py-2 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 flex items-center gap-2">
                <X className="h-4 w-4" /> {t('admin.tokenAssignment.remove')}
              </button>
            ) : canAssign ? (
              <button onClick={() => setConfirmModal({ type: 'assign', classId: classItem.id, className: classItem.name })} className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-white hover:bg-primary-dark flex items-center gap-2">
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

  const startedClasses = filteredClasses.filter(c => new Date(c.start_time) < new Date());
  const upcomingClasses = filteredClasses.filter(c => new Date(c.start_time) >= new Date());

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
              <p className="text-gray-600">{formatMobile(user.mobile)}</p>
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
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setConfirmModal(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${confirmModal.type === 'assign' ? 'bg-primary/20' : 'bg-red-100'}`}>
                {confirmModal.type === 'assign' ? <Package className="h-5 w-5 text-primary" /> : <X className="h-5 w-5 text-red-600" />}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {confirmModal.type === 'assign' ? t('admin.tokenAssignment.confirmAssign') : t('admin.tokenAssignment.confirmRemove')}
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              {confirmModal.type === 'assign'
                ? t('admin.tokenAssignment.confirmAssignMessage', { className: confirmModal.className })
                : t('admin.tokenAssignment.confirmRemoveMessage', { className: confirmModal.className })}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-md text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirmModal}
                className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
                  confirmModal.type === 'assign' ? 'bg-primary hover:bg-primary-dark' : 'bg-red-600 hover:bg-red-700'
                }`}
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

