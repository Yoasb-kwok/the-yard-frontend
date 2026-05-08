import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';
import { parseAboutBody } from '../../lib/aboutContentParse';
import { api } from '../../lib/api';
import { getHomeAboutContent } from '../../lib/homeAboutStorage';
import {
  effectiveBlockLayout,
  getHomeAboutBlockBodyByLang,
  legacyContentToBlocks,
  parseHomeAboutContentField,
  siteAboutHasVisibleContent,
  type HomeAboutBlock,
} from '../../lib/homeAboutBlocks';

/** Section images for static About fallback (dance studio / community theme). */
const ABOUT_IMAGES = {
  hero: 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=1200&q=80',
  mission: 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800&q=80',
  instructors: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=800&q=80',
  facilities: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
  join: 'https://images.unsplash.com/photo-1524594152303-9fd13543fe6e?w=800&q=80',
} as const;

const SECTION_IMAGES: (keyof typeof ABOUT_IMAGES)[] = ['mission', 'instructors', 'facilities', 'join'];

function blocksFromStoredContent(content: string): HomeAboutBlock[] {
  const parsed = parseHomeAboutContentField(content);
  return parsed.kind === 'blocks' ? parsed.blocks : legacyContentToBlocks(parsed.legacyHtml);
}

export default function AboutPage() {
  const { t, i18n } = useTranslation();
  const [booting, setBooting] = useState(true);
  const [dynamic, setDynamic] = useState<{ title: string; blocks: HomeAboutBlock[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ title: string; content: string; updated_at?: string }>('/about');
        if (
          !cancelled &&
          res.success &&
          res.data &&
          typeof res.data.title === 'string' &&
          typeof res.data.content === 'string'
        ) {
          const blocks = blocksFromStoredContent(res.data.content);
          if (siteAboutHasVisibleContent(res.data.title, blocks)) {
            setDynamic({ title: res.data.title, blocks });
            setBooting(false);
            return;
          }
        }
      } catch {
        // API unavailable
      }
      const stored = getHomeAboutContent();
      if (!cancelled && stored) {
        const blocks = blocksFromStoredContent(stored.content);
        if (siteAboutHasVisibleContent(stored.title, blocks)) {
          setDynamic({ title: stored.title, blocks });
          setBooting(false);
          return;
        }
      }
      if (!cancelled) {
        setDynamic(null);
        setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (booting) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        </div>
      </PublicLayout>
    );
  }

  if (dynamic && siteAboutHasVisibleContent(dynamic.title, dynamic.blocks)) {
    const heroSrc = ABOUT_IMAGES.hero;
    const heading = dynamic.title.trim() || t('about.title');
    const lang = i18n.language === 'zh-CN' ? 'zh-CN' : i18n.language === 'zh-TW' ? 'zh-TW' : 'en';

    return (
      <PublicLayout>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
          <section className="relative h-[280px] sm:h-[360px] overflow-hidden">
            <img src={heroSrc} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white text-center drop-shadow-lg">
                {heading}
              </h1>
            </div>
          </section>

          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            {dynamic.blocks.map((block, index) => {
              const layout = effectiveBlockLayout(block, index);
              const placeholder = t('home.aboutSectionImagePlaceholder', '圖片待上載');

              return (
                <section key={block.id} className="mb-14 sm:mb-20 last:mb-0">
                  <div
                    className={`flex flex-col gap-8 sm:gap-10 ${
                      layout === 'split-image-left' ? 'sm:flex-row' : 'sm:flex-row-reverse'
                    } sm:items-center`}
                  >
                    <div className="flex-shrink-0 sm:w-[44%]">
                      <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200/80 aspect-[4/3] sm:aspect-[3/2] bg-gray-100">
                        {block.image_url ? (
                          <img src={block.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm px-4 text-center">
                            {placeholder}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      {/** About text is stored per language and falls back safely to legacy body_html. */}
                      <div
                        className="about-wysiwyg max-w-none text-gray-600 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: getHomeAboutBlockBodyByLang(block, lang) }}
                      />
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

  const title = t('about.title');
  const { intro, sections, introIsHtml, sectionBodiesAreHtml } = parseAboutBody(t('about.content'));

  return (
    <PublicLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <section className="relative h-[280px] sm:h-[360px] overflow-hidden">
          <img
            src={ABOUT_IMAGES.hero}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white text-center drop-shadow-lg">
              {title}
            </h1>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          {intro &&
            (introIsHtml ? (
              <div
                className="about-wysiwyg max-w-2xl mx-auto text-lg text-gray-700 leading-relaxed mb-14 text-center"
                dangerouslySetInnerHTML={{ __html: intro }}
              />
            ) : (
              <p className="text-lg text-gray-700 leading-relaxed mb-14 text-center max-w-2xl mx-auto whitespace-pre-line">
                {intro}
              </p>
            ))}

          {sections.map((section, index) => {
            const imageKey = SECTION_IMAGES[index];
            const img = imageKey ? ABOUT_IMAGES[imageKey] : ABOUT_IMAGES.mission;
            const isEven = index % 2 === 0;
            return (
              <section key={`${section.title}-${index}`} className="mb-14 sm:mb-20 last:mb-0">
                <div
                  className={`flex flex-col gap-8 sm:gap-10 ${
                    isEven ? 'sm:flex-row' : 'sm:flex-row-reverse'
                  } sm:items-center`}
                >
                  <div className="flex-shrink-0 sm:w-[44%]">
                    <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200/80 aspect-[4/3] sm:aspect-[3/2]">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">{section.title}</h2>
                    {sectionBodiesAreHtml ? (
                      <div
                        className="about-wysiwyg max-w-none text-gray-600 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: section.body }}
                      />
                    ) : (
                      <p className="text-gray-600 leading-relaxed whitespace-pre-line">{section.body}</p>
                    )}
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
