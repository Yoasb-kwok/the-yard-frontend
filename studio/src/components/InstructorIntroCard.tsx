import { useTranslation } from 'react-i18next';
import { Award, BookOpen, GraduationCap, Music } from 'lucide-react';
import { getInstructorProfile, getIntroForLocale, type InstructorProfile } from '../lib/instructorProfiles';

export interface InstructorIntroCardProps {
  /** Display name of the instructor (e.g. from class.instructor) */
  instructorName: string;
  /** Optional: custom image URL. If not provided, uses UI Avatars from name. */
  imageUrl?: string | null;
  /** Compact layout (e.g. for small modals) */
  compact?: boolean;
  /** Use large card layout for instructors page (more visual impact) */
  featured?: boolean;
  /** Optional: override profile (e.g. from admin form preview). If not set, uses getInstructorProfile(name). */
  profile?: InstructorProfile | null;
}

function getTutorImageUrl(name: string, size?: number): string {
  const s = size ?? 128;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=${s}&background=random&color=fff&bold=true`;
}

export default function InstructorIntroCard({ instructorName, imageUrl, compact, featured, profile: profileOverride }: InstructorIntroCardProps) {
  const { t, i18n } = useTranslation();
  const resolved = profileOverride !== undefined ? profileOverride : getInstructorProfile(instructorName);
  const profile = resolved ?? null;
  const img = imageUrl ?? resolved?.avatar_url ?? getTutorImageUrl(instructorName, featured ? 256 : undefined);

  // Show nothing only when no profile at all (and not a draft from form)
  if (!profile) return null;

  const intro = getIntroForLocale(profile, i18n.language) || profile.intro?.trim() || '';
  const awards = Array.isArray(profile.awards) ? profile.awards : [];
  const yearsDancing = profile.years_dancing ?? 0;
  const teachingExp = profile.teaching_experience ?? 0;
  const danceSchool = profile.dance_school?.trim() ?? '';

  if (featured) {
    const bgImage = profile.background_image?.trim();
    return (
      <article className="group flex flex-col sm:flex-row overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-lg shadow-gray-200/50 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 transition-all duration-300">
        <div
          className="relative sm:w-52 flex-shrink-0 min-h-[200px] sm:min-h-0 flex items-center justify-center p-6 bg-gradient-to-br from-primary/10 to-primary/5"
          style={bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        >
          {bgImage && <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" aria-hidden />}
          {bgImage && <div className="absolute inset-0 bg-primary/20 mix-blend-overlay" aria-hidden />}
          <div className="relative z-10 flex flex-col items-center gap-3">
            <img src={img} alt={instructorName} className="w-32 h-32 sm:w-36 sm:h-36 rounded-full object-cover ring-4 ring-white shadow-lg" />
          </div>
        </div>
        <div className="flex-1 p-6 sm:p-8 flex flex-col justify-center min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">{instructorName}</h2>
          <p className="mt-2 text-gray-600 leading-relaxed">{intro || '—'}</p>
          {awards.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {awards.map((a) => (
                <span key={a} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/80">
                  <Award className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  {a}
                </span>
              ))}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
            <span className="flex items-center gap-1.5">
              <Music className="h-4 w-4 text-primary shrink-0" />
              {yearsDancing} {t('home.yearsUnit')} {t('home.instructorYearsDancing')}
            </span>
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-primary shrink-0" />
              {teachingExp} {t('home.yearsUnit')} {t('home.instructorTeachingExperience')}
            </span>
            <span className="flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 text-primary shrink-0" />
              {danceSchool || '—'}
            </span>
          </div>
        </div>
      </article>
    );
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <p className="text-sm font-medium text-gray-500">{t('home.instructorIntro')}</p>
      <div className="flex gap-4">
        <img
          src={img}
          alt={instructorName}
          className={`rounded-full object-cover flex-shrink-0 ${compact ? 'w-14 h-14' : 'w-20 h-20'}`}
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{instructorName}</p>
          <p className="text-sm text-gray-600 mt-1">{intro || '—'}</p>
        </div>
      </div>
      <div className="grid gap-2 text-sm">
{awards.length > 0 && (
            <div className="flex gap-2">
              <Award className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-gray-500">{t('home.instructorAwards')}:</span>
                <span className="text-gray-800 ml-1">{awards.join('、')}</span>
              </div>
            </div>
          )}
        <div className="flex gap-2">
          <Music className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
          <span className="text-gray-700">
            {t('home.instructorYearsDancing')}: {yearsDancing} {t('home.yearsUnit')}
          </span>
        </div>
        <div className="flex gap-2">
          <BookOpen className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
          <span className="text-gray-700">
            {t('home.instructorTeachingExperience')}: {teachingExp} {t('home.yearsUnit')}
          </span>
        </div>
        <div className="flex gap-2">
          <GraduationCap className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
          <span className="text-gray-700">
            {t('home.instructorDanceSchool')}: {danceSchool || '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
