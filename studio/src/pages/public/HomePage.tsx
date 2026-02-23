import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';
import BannerSlider from '../../components/BannerSlider';
import { Calendar, Clock, MapPin, ChevronRight, LogIn } from 'lucide-react';
import greenBgImage from '../../assets/images/green_bg.jpg';
import roomRentalImage from '../../assets/images/room_rental.jpg';
import kidsDanceCoursesImage from '../../assets/images/s5-kids-dance-courses.jpg';
import { api } from '../../lib/api';
import { getDateStringFromStartTime, formatProgramCodeDisplay } from '../../lib/utils';

interface TodayClass {
  id: string;
  name: string;
  instructor: string;
  start_time: string;
  end_time: string;
  capacity: number;
  enrolled_count: number;
  location: 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui';
  program_code: string;
  /** Lesson number in the course (1, 2, 3…). Shown as L01, L02. */
  lesson_number?: number | null;
}

/** Upcoming class for booking (same shape, used for next 14 days) */
type UpcomingClass = TodayClass;

/** Fallback 新生課程 when API has no data — 6 堂，3 個一排共 2 行 */
function getFallbackNewStudentCourses(): UpcomingClass[] {
  const now = new Date();
  const courses: UpcomingClass[] = [];
  const list = [
    { name: '兒童芭蕾試堂', program_code: 'TRIAL-BAL', instructor: '李老師', location: 'sanpokong' as const },
    { name: '青少年街舞試堂', program_code: 'TRIAL-HH', instructor: '陳老師', location: 'causewaybay' as const },
    { name: '幼兒律動試堂', program_code: 'TRIAL-KIDS', instructor: '王老師', location: 'sanpokong' as const },
    { name: '爵士舞試堂', program_code: 'TRIAL-JAZZ', instructor: '張老師', location: 'fotan' as const },
    { name: '兒童中國舞試堂', program_code: 'TRIAL-CCD', instructor: '黃老師', location: 'sheungshui' as const },
    { name: 'K-Pop 流行舞試堂', program_code: 'TRIAL-KPOP', instructor: '林老師', location: 'causewaybay' as const },
  ];
  list.forEach((d, i) => {
    const base = new Date(now);
    base.setDate(base.getDate() + 1 + Math.floor(i / 2));
    base.setHours(14 + (i % 3) * 2, 0, 0, 0);
    const start = new Date(base);
    const end = new Date(base);
    end.setHours(end.getHours() + 1, 0, 0, 0);
    courses.push({
      id: `demo_trial_${i + 1}`,
      name: d.name,
      instructor: d.instructor,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      capacity: 12,
      enrolled_count: 3 + i,
      location: d.location,
      program_code: d.program_code,
      lesson_number: 1,
    });
  });
  return courses;
}

const FALLBACK_NEW_STUDENT_COURSES = getFallbackNewStudentCourses();

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([]);
  const [upcomingClasses, setUpcomingClasses] = useState<UpcomingClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Format today's date based on current locale
  const todayDate = new Date().toLocaleDateString(i18n.language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  // Format time only (HH:MM)
  const formatTime = (date: string | Date): string => {
    const d = new Date(date);
    return d.toLocaleTimeString(i18n.language, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // Generate tutor profile image URL from UI Avatars
  const getTutorImageUrl = (name: string): string => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=128&background=random&color=fff&bold=true`;
  };

  useEffect(() => {
    loadBookingCourses();
  }, []);

  async function loadBookingCourses() {
    setLoading(true);
    setLoadError(null);
    try {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 14);
      const toStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
      const response = await api.get<any[]>('/classes', { from: todayStr, to: toStr }).catch(() => ({ success: true, data: [] }));
      const rows = Array.isArray(response?.data) ? response.data : [];
      const mapRow = (cls: any): UpcomingClass => ({
        id: String(cls.id),
        name: cls.name || '',
        instructor: cls.instructor || cls.substitute_instructor || '',
        start_time: typeof cls.start_time === 'string' ? cls.start_time : new Date(cls.start_time).toISOString(),
        end_time: typeof cls.end_time === 'string' ? cls.end_time : new Date(cls.end_time).toISOString(),
        capacity: cls.capacity ?? 0,
        enrolled_count: cls.enrolled_count ?? 0,
        location: (cls.location || 'sanpokong') as TodayClass['location'],
        program_code: (cls.program_code || '').toString().trim(),
        lesson_number: cls.lesson_number != null ? Number(cls.lesson_number) : null,
      });
      const notCancelled = rows.filter((row: any) => !(row.is_cancelled === 1 || row.is_cancelled === true));
      const upcoming: UpcomingClass[] = notCancelled.length > 0
        ? notCancelled.map(mapRow)
        : FALLBACK_NEW_STUDENT_COURSES;
      const forToday: TodayClass[] = upcoming.filter((c) => getDateStringFromStartTime(c.start_time) === todayStr);
      setTodayClasses(forToday);
      setUpcomingClasses(upcoming);
      if (!response?.success && rows.length === 0) {
        setLoadError(null);
      } else if (!response?.success) {
        setLoadError(response?.msg || t('home.failedToLoadClasses', 'Failed to load classes'));
      }
    } catch (error) {
      console.error('Error loading new student courses:', error);
      setTodayClasses([]);
      setUpcomingClasses(FALLBACK_NEW_STUDENT_COURSES);
      setLoadError(null);
    } finally {
      setLoading(false);
    }
  }

  const bannerSlides = [
    {
      image: greenBgImage,
      alt: 'The Yard - Modern Studio Space',
    },
    {
      image: roomRentalImage,
      alt: 'The Yard - Premium Facilities',
    },
  ];

  return (
    <PublicLayout>
      <div className="relative">
        <BannerSlider slides={bannerSlides} autoPlayInterval={5000} />
        {/* Content Overlay */}
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center px-4 sm:px-6 lg:px-8 pointer-events-auto">
            <h1 className="text-5xl font-bold mb-6 text-white drop-shadow-lg">
              <a
                href="http://wa.me/+85292299875"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline transition-all"
              >
                BOOKING WHATSAPP: +852 9229 9875
              </a>
            </h1>
            <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto drop-shadow-md">
              {t('home.subtitle')}
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
              <Link
                to="/calendar?view=day"
                className="bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-primary-lighter transition-colors shadow-lg"
              >
                {t('nav.calendar')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('home.newStudentCourses')}</h2>
          <p className="text-lg text-gray-600">{t('home.newStudentCoursesSubtitle')}</p>
        </div>

        {loadError && (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            {loadError}
          </div>
        )}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : upcomingClasses.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">{t('home.noUpcomingClasses')}</p>
            <Link to="/calendar" className="inline-block mt-4 text-primary font-semibold hover:underline">
              {t('nav.calendar')}
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {upcomingClasses.slice(0, 6).map((classItem) => (
              <div key={classItem.id} className="bg-white rounded-xl shadow-lg border-2 border-gray-100 p-8 hover:shadow-2xl hover:border-primary transition-all duration-300 flex flex-col transform hover:-translate-y-1">
                {/* Top accent border */}
                <div className="h-1 bg-gradient-to-r from-primary to-primary-light rounded-t-xl -mx-8 -mt-8 mb-6"></div>
                
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-medium text-primary bg-primary-lighter px-2 py-1 rounded">
                    {new Date(classItem.start_time).toLocaleDateString(i18n.language, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="text-xs font-bold text-white bg-primary px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0">
                    {formatProgramCodeDisplay(classItem.program_code, classItem.lesson_number) || classItem.program_code}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 leading-tight mb-4 pr-2">{classItem.name}</h3>

                {/* Tutor Profile */}
                <div className="flex items-center mb-6 pb-6 border-b-2 border-gray-100">
                  <img
                    src={getTutorImageUrl(classItem.instructor)}
                    alt={classItem.instructor}
                    className="w-20 h-20 rounded-full object-cover mr-4 border-4 border-primary-lighter"
                  />
                  <div>
                    <p className="text-base font-bold text-gray-900">{classItem.instructor}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6 flex-1">
                  <div className="flex items-center text-gray-800 bg-primary-lighter/30 rounded-lg p-3">
                    <Clock className="h-5 w-5 mr-3 text-primary flex-shrink-0" />
                    <span className="text-base font-semibold">
                      {formatTime(classItem.start_time)} - {formatTime(classItem.end_time)}
                    </span>
                  </div>
                  <div className="flex items-center text-gray-800 bg-primary-lighter/30 rounded-lg p-3">
                    <MapPin className="h-5 w-5 mr-3 text-primary flex-shrink-0" />
                    <span className="text-base font-semibold">{t(`home.locations.${classItem.location}`)}</span>
                  </div>
                </div>

                <Link
                  to={`/trial?classId=${classItem.id}`}
                  state={{
                    classData: {
                      id: classItem.id,
                      name: classItem.name,
                      instructor: classItem.instructor,
                      start_time: classItem.start_time,
                      end_time: classItem.end_time,
                      location: classItem.location,
                      program_code: classItem.program_code,
                    }
                  }}
                  className="w-full bg-primary text-white px-6 py-3 rounded-lg text-base font-bold hover:bg-primary-dark transition-all duration-300 text-center shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  {t('home.bookTrial')}
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* View More Button */}
        {!loading && upcomingClasses.length > 0 && (
          <div className="text-center mt-8">
            <Link
              to="/calendar"
              className="inline-flex items-center gap-2 text-primary font-semibold text-lg hover:text-primary-dark transition-colors group"
            >
              <span>{t('home.viewMore')}</span>
              <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        )}
      </div>

      {/* Student Login – dancing background */}
      <div className="relative min-h-[420px] flex items-center justify-center overflow-hidden">
        <img
          src={kidsDanceCoursesImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 text-center px-4 py-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 drop-shadow-lg">
            {t('home.studentLogin')}
          </h2>
          <p className="text-lg text-white/90 mb-8 max-w-xl mx-auto drop-shadow-md">
            {t('home.studentLoginDesc')}
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-primary-lighter transition-colors shadow-lg"
          >
            <LogIn className="h-5 w-5" />
            {t('home.signIn')}
          </Link>
        </div>
      </div>

      {/* <div className="bg-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('home.expertInstructors')}</h3>
              <p className="text-gray-600">{t('home.expertInstructorsDesc')}</p>
            </div>
            <div>
              <div className="bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('home.flexibleSchedule')}</h3>
              <p className="text-gray-600">{t('home.flexibleScheduleDesc')}</p>
            </div>
            <div>
              <div className="bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('home.smallClassSizes')}</h3>
              <p className="text-gray-600">{t('home.smallClassSizesDesc')}</p>
            </div>
          </div>
        </div>
      </div> */}
    </PublicLayout>
  );
}
