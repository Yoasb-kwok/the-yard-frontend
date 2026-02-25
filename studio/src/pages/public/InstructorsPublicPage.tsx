import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';
import InstructorIntroCard from '../../components/InstructorIntroCard';
import { EXAMPLE_INSTRUCTOR_PROFILES } from '../../lib/instructorProfiles';
import { GraduationCap } from 'lucide-react';

export default function InstructorsPublicPage() {
  const { t } = useTranslation();

  return (
    <PublicLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <header className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-6">
              <GraduationCap className="h-8 w-8" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              {t('instructors.title', '導師介紹')}
            </h1>
            <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              {t('instructors.subtitle', '認識我們的導師團隊，每位均具豐富教學與演出經驗。')}
            </p>
          </header>

          <div className="grid gap-8 sm:gap-10 md:grid-cols-2">
            {EXAMPLE_INSTRUCTOR_PROFILES.map((profile) => (
              <InstructorIntroCard
                key={profile.name}
                instructorName={profile.name}
                featured
              />
            ))}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
