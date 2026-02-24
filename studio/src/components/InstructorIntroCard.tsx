import { useTranslation } from 'react-i18next';
import { Award, BookOpen, GraduationCap, Music } from 'lucide-react';
import { getInstructorProfile, type InstructorProfile } from '../lib/instructorProfiles';

export interface InstructorIntroCardProps {
  /** Display name of the instructor (e.g. from class.instructor) */
  instructorName: string;
  /** Optional: custom image URL. If not provided, uses UI Avatars from name. */
  imageUrl?: string | null;
  /** Compact layout (e.g. for small modals) */
  compact?: boolean;
  /** Optional: override profile (e.g. from admin form preview). If not set, uses getInstructorProfile(name). */
  profile?: InstructorProfile | null;
}

function getTutorImageUrl(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=128&background=random&color=fff&bold=true`;
}

export default function InstructorIntroCard({ instructorName, imageUrl, compact, profile: profileOverride }: InstructorIntroCardProps) {
  const { t } = useTranslation();
  const resolved = profileOverride !== undefined ? profileOverride : getInstructorProfile(instructorName);
  const profile = resolved ?? null;
  const img = imageUrl || getTutorImageUrl(instructorName);

  // Show nothing only when no profile at all (and not a draft from form)
  if (!profile) return null;

  const intro = profile.intro?.trim() ?? '';
  const awards = Array.isArray(profile.awards) ? profile.awards : [];
  const yearsDancing = profile.years_dancing ?? 0;
  const teachingExp = profile.teaching_experience ?? 0;
  const danceSchool = profile.dance_school?.trim() ?? '';

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
