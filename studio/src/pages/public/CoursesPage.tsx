import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/PublicLayout';
import { BookOpen, Users, Calendar } from 'lucide-react';
import type { CourseLevel, AgeTag } from '../../contexts/AuthContext';

interface CourseItem {
  id: string;
  name: string;
  program_code: string;
  intro: string;
  level: CourseLevel;
  age_tag: AgeTag;
  instructor: string;
  trial_class_name: string;
  location: 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui';
}

const COURSES_BY_AGE: { age_tag: AgeTag; labelKey: string; courses: CourseItem[] }[] = [
  {
    age_tag: '5-8',
    labelKey: 'calendar.ageTag.5-8',
    courses: [
      { id: 'kb-a', name: '兒童芭蕾', program_code: 'KB-A', intro: '從基礎芭蕾手位與步法開始，培養節奏感與身體協調，適合幼兒啟蒙。', level: 'entry', age_tag: '5-8', instructor: '李老師', trial_class_name: '兒童芭蕾體驗', location: 'sanpokong' },
      { id: 'kids', name: '幼兒律動', program_code: 'KIDS', intro: '透過音樂與遊戲學習基本節奏與肢體表達，課堂氣氛輕鬆愉快。', level: 'entry', age_tag: '5-8', instructor: '王老師', trial_class_name: '幼兒律動體驗', location: 'sanpokong' },
      { id: 'ccd', name: '兒童中國舞', program_code: 'CCD', intro: '中國舞基本功與身韻入門，認識民族民間舞小組合。', level: 'entry', age_tag: '5-8', instructor: '黃老師', trial_class_name: '兒童中國舞體驗', location: 'sheungshui' },
    ],
  },
  {
    age_tag: '9-12',
    labelKey: 'calendar.ageTag.9-12',
    courses: [
      { id: 'thh', name: '青少年街舞', program_code: 'THH', intro: 'Hip Hop 與街舞基礎，強調節奏感與表現力，可參與表演與比賽。', level: 'intermediate', age_tag: '9-12', instructor: '陳老師', trial_class_name: '青少年街舞體驗', location: 'causewaybay' },
      { id: 'jazz', name: '爵士舞', program_code: 'JAZZ', intro: '爵士舞基礎與現代舞元素，適合喜歡流行與舞台表現的學員。', level: 'entry', age_tag: '9-12', instructor: '張老師', trial_class_name: '爵士舞體驗', location: 'fotan' },
      { id: 'kpop', name: 'K-Pop 流行舞', program_code: 'KPOP', intro: 'K-Pop 偶像舞碼與編排，節奏明快，適合喜愛流行舞的學員。', level: 'entry', age_tag: '9-12', instructor: '林老師', trial_class_name: 'K-Pop 流行舞體驗', location: 'causewaybay' },
    ],
  },
  {
    age_tag: '13-16',
    labelKey: 'calendar.ageTag.13-16',
    courses: [
      { id: 'thh-teen', name: '青少年街舞（進階）', program_code: 'THH', intro: '街舞進階編舞與技巧，可參與比賽與演出。', level: 'advanced', age_tag: '13-16', instructor: '陳老師', trial_class_name: '青少年街舞體驗', location: 'causewaybay' },
    ],
  },
];

export default function CoursesPage() {
  const { t } = useTranslation();

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-3 mb-8">
          <BookOpen className="h-10 w-10 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('courses.title', '課程介紹')}</h1>
            <p className="text-gray-600 mt-1">{t('courses.subtitle', '按年齡組別瀏覽課程，歡迎預約試堂。')}</p>
          </div>
        </div>

        <div className="space-y-10">
          {COURSES_BY_AGE.map(({ age_tag, labelKey, courses }) => (
            <section key={age_tag} className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-primary/10 px-6 py-3 border-b border-primary/20">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  {t(labelKey)}
                </h2>
              </div>
              <div className="p-6 space-y-6">
                {courses.map((course) => (
                  <div key={course.id} className="border border-gray-200 rounded-lg p-5 hover:border-primary/40 transition-colors">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900">{course.name}</h3>
                        <p className="text-sm text-primary font-medium mt-0.5">{course.program_code}</p>
                        <p className="text-gray-600 mt-3">{course.intro}</p>
                        <p className="text-sm text-gray-500 mt-2">{t('home.tutor')}: {course.instructor}</p>
                      </div>
                      <Link
                        to="/trial"
                        state={{
                          classData: {
                            id: course.id,
                            name: course.trial_class_name,
                            instructor: course.instructor,
                            start_time: new Date(Date.now() + 86400000 * 3).toISOString(),
                            end_time: new Date(Date.now() + 86400000 * 3 + 3600000).toISOString(),
                            location: course.location,
                            program_code: course.program_code,
                            level: course.level,
                            age_tag: course.age_tag,
                          },
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark transition-colors shrink-0"
                      >
                        <Calendar className="h-4 w-4" />
                        {t('courses.bookTrial', '預約試堂')}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="text-center text-gray-500 mt-8">
          <Link to="/calendar" className="text-primary font-medium hover:underline">{t('courses.viewCalendar', '查看月曆可報名時段')}</Link>
        </p>
      </div>
    </PublicLayout>
  );
}
