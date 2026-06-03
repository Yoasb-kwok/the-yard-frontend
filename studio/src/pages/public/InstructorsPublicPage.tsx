import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';
import InstructorIntroCard from '../../components/InstructorIntroCard';
import { getInstructorProfile } from '../../lib/instructorProfiles';
import { fetchPublicInstructors, type PublicInstructorRow } from '../../lib/instructorApi';
import { GraduationCap, AlertCircle } from 'lucide-react';

function resolveDisplayProfile(row: PublicInstructorRow) {
  const fromApi = row.profile;
  const hasApiContent =
    Boolean(fromApi.intro?.trim()) ||
    Boolean(fromApi.intro_zh_tw?.trim()) ||
    Boolean(fromApi.intro_zh_cn?.trim()) ||
    Boolean(fromApi.intro_en?.trim()) ||
    (fromApi.awards?.length ?? 0) > 0 ||
    (fromApi.years_dancing ?? 0) > 0 ||
    (fromApi.teaching_experience ?? 0) > 0 ||
    Boolean(fromApi.dance_school?.trim());
  if (hasApiContent) return fromApi;
  return getInstructorProfile(row.name) ?? fromApi;
}

export default function InstructorsPublicPage() {
  const { t } = useTranslation();
  const [instructors, setInstructors] = useState<PublicInstructorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadFailed(false);
      const { instructors: list, loadFailed } = await fetchPublicInstructors();
      if (!cancelled) {
        setInstructors(list);
        setLoadFailed(loadFailed);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleInstructors = useMemo(
    () => instructors.filter((instructor) => instructor.name.trim().length > 0),
    [instructors],
  );

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

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : loadFailed ? (
            <div className="flex items-start gap-3 text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-5 max-w-lg mx-auto">
              <AlertCircle className="h-6 w-6 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{t('instructors.loadFailed')}</p>
            </div>
          ) : visibleInstructors.length === 0 ? (
            <p className="text-center text-gray-500 py-12">{t('instructors.empty')}</p>
          ) : (
            <div className="grid gap-8 sm:gap-10 md:grid-cols-2">
              {visibleInstructors.map((instructor) => {
                const profile = resolveDisplayProfile(instructor);
                return (
                  <InstructorIntroCard
                    key={instructor.id || instructor.name}
                    instructorName={instructor.name}
                    imageUrl={instructor.profile_image_url ?? profile.avatar_url}
                    profile={profile}
                    featured
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
