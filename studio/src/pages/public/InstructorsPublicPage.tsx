import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';
import InstructorIntroCard from '../../components/InstructorIntroCard';
import { EXAMPLE_INSTRUCTOR_PROFILES, getInstructorProfile, type InstructorProfile } from '../../lib/instructorProfiles';
import { api } from '../../lib/api';
import { GraduationCap } from 'lucide-react';

interface InstructorRow {
  id: string;
  name: string;
  profile_image_url: string | null;
}

const FALLBACK_INSTRUCTORS: InstructorRow[] = EXAMPLE_INSTRUCTOR_PROFILES.map((profile, index) => ({
  id: `fallback-${index + 1}`,
  name: profile.name,
  profile_image_url: profile.avatar_url ?? null,
}));

function buildFallbackProfile(name: string): InstructorProfile {
  return {
    name,
    intro: '',
    awards: [],
    years_dancing: 0,
    teaching_experience: 0,
    dance_school: '',
  };
}

export default function InstructorsPublicPage() {
  const { t } = useTranslation();
  const [instructors, setInstructors] = useState<InstructorRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const response = await api.get<InstructorRow[]>('/admin/instructors?demo=1');
        if (!cancelled && response.success && Array.isArray(response.data) && response.data.length > 0) {
          setInstructors(response.data);
        } else if (!cancelled) {
          setInstructors(FALLBACK_INSTRUCTORS);
        }
      } catch {
        if (!cancelled) setInstructors(FALLBACK_INSTRUCTORS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleInstructors = useMemo(() => {
    return instructors.filter((instructor) => (instructor.name || '').trim().length > 0);
  }, [instructors]);

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
          ) : (
            <div className="grid gap-8 sm:gap-10 md:grid-cols-2">
              {visibleInstructors.map((instructor) => {
                const profile = getInstructorProfile(instructor.name) ?? buildFallbackProfile(instructor.name);
                return (
                  <InstructorIntroCard
                    key={instructor.id || instructor.name}
                    instructorName={instructor.name}
                    imageUrl={instructor.profile_image_url}
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
