import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';
import { getAboutContent } from '../../lib/aboutStorage';

/** Section images for About page (dance studio / community theme). */
const ABOUT_IMAGES = {
  hero: 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=1200&q=80',
  mission: 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800&q=80',
  instructors: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=800&q=80',
  facilities: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
  join: 'https://images.unsplash.com/photo-1524594152303-9fd13543fe6e?w=800&q=80',
} as const;

type Section = { title: string; body: string };

function parseAboutContent(content: string): { intro: string; sections: Section[] } {
  const blocks = content.split(/\n\n## /);
  const intro = (blocks[0] || '').trim();
  const sections: Section[] = [];
  const sectionKeys = ['mission', 'instructors', 'facilities', 'join'] as const;
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].trim();
    const firstNewline = block.indexOf('\n');
    const title = firstNewline >= 0 ? block.slice(0, firstNewline).trim() : block;
    const body = firstNewline >= 0 ? block.slice(firstNewline).trim() : '';
    const key = sectionKeys[sections.length];
    sections.push({ title, body });
  }
  return { intro, sections };
}

const SECTION_IMAGES: (keyof typeof ABOUT_IMAGES)[] = ['mission', 'instructors', 'facilities', 'join'];

export default function AboutPage() {
  const { t } = useTranslation();
  const [content, setContent] = useState({ title: '', content: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, [t]);

  async function loadContent() {
    await new Promise(resolve => setTimeout(resolve, 300));
    const stored = getAboutContent();
    if (stored) {
      setContent({ title: stored.title, content: stored.content });
    } else {
      setContent({
        title: t('about.title'),
        content: t('about.content'),
      });
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      </PublicLayout>
    );
  }

  const { intro, sections } = parseAboutContent(content.content);

  return (
    <PublicLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Hero with image */}
        <section className="relative h-[280px] sm:h-[360px] overflow-hidden">
          <img
            src={ABOUT_IMAGES.hero}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white text-center drop-shadow-lg">
              {content.title}
            </h1>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          {intro && (
            <p className="text-lg text-gray-700 leading-relaxed mb-14 text-center max-w-2xl mx-auto">
              {intro}
            </p>
          )}

          {sections.map((section, index) => {
            const imageKey = SECTION_IMAGES[index];
            const img = imageKey ? ABOUT_IMAGES[imageKey] : ABOUT_IMAGES.mission;
            const isEven = index % 2 === 0;
            return (
              <section
                key={section.title}
                className="mb-14 sm:mb-20 last:mb-0"
              >
                <div
                  className={`flex flex-col gap-8 sm:gap-10 ${
                    isEven ? 'sm:flex-row' : 'sm:flex-row-reverse'
                  } sm:items-center`}
                >
                  <div className="flex-shrink-0 sm:w-[44%]">
                    <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200/80 aspect-[4/3] sm:aspect-[3/2]">
                      <img
                        src={img}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
                      {section.title}
                    </h2>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                      {section.body}
                    </p>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </PublicLayout>
  );
}
