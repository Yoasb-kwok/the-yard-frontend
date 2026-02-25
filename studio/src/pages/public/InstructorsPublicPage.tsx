import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';
import InstructorIntroCard from '../../components/InstructorIntroCard';
import { EXAMPLE_INSTRUCTOR_PROFILES } from '../../lib/instructorProfiles';
import { GraduationCap } from 'lucide-react';

export default function InstructorsPublicPage() {
  const { t } = useTranslation();

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-3 mb-8">
          <GraduationCap className="h-10 w-10 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('instructors.title', '導師介紹')}</h1>
            <p className="text-gray-600 mt-1">{t('instructors.subtitle', '認識我們的導師團隊，每位均具豐富教學與演出經驗。')}</p>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-1">
          {EXAMPLE_INSTRUCTOR_PROFILES.map((profile) => (
            <div key={profile.name} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
              <InstructorIntroCard instructorName={profile.name} />
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
