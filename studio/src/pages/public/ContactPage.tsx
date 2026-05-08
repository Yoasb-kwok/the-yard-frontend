import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';
import { Mail, MapPin, Facebook, Instagram, Clock } from 'lucide-react';
import building1Image from '../../assets/images/building1.jpg';
import {
  branchHasVisibleText,
  buildMapEmbedUrl,
  getContactFieldForLocale,
  loadPublicContact,
  type ContactBranch,
  type ContactContent,
} from '../../lib/contactContent';
import { resolveUploadUrl } from '../../lib/uploads';

export default function ContactPage() {
  const { t, i18n } = useTranslation();
  const [content, setContent] = useState<ContactContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadPublicContact();
        if (!cancelled) setContent(data);
      } catch (err) {
        console.warn('Failed to load contact content', err);
        if (!cancelled) setContent(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [i18n.language]);

  const branches = useMemo<ContactBranch[]>(() => {
    const branchesFromApi = content?.branches?.filter((b) => branchHasVisibleText(b));
    if (branchesFromApi && branchesFromApi.length > 0) return branchesFromApi;

    return [
      {
        id: 'default',
        name: 'The Yard',
        address: i18n.language === 'en' ? t('contact.addressEN') : t('contact.addressTC'),
        hours: [
          t('contact.serviceHoursWeekday'),
          t('contact.serviceHoursWeekend'),
          t('contact.serviceHoursNote'),
        ]
          .filter(Boolean)
          .join('\n'),
        image_url: building1Image,
        map_query:
          '21 Luk Hop Street, San Po Kong, Kowloon, Hong Kong',
        is_active: true,
      },
    ];
  }, [content, i18n.language, t]);

  const pageTitle = content?.title?.trim() ? content.title.trim() : t('contact.title');
  const pageIntro = content?.intro?.trim() || '';

  if (loading) {
    return (
      <PublicLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">{pageTitle}</h1>
        {pageIntro && (
          <p className="text-gray-600 mb-8 whitespace-pre-line">{pageIntro}</p>
        )}

        <div className="space-y-10">
          {branches.map((branch) => (
            <BranchCard key={branch.id} branch={branch} t={t} lang={i18n.language} />
          ))}
        </div>

        <div className="mt-12 flex items-center gap-4 text-gray-500">
          <a
            href="mailto:info@theyard.com.hk"
            className="hover:text-primary transition-colors"
            aria-label="Email"
          >
            <Mail className="h-6 w-6" />
          </a>
          <a
            href="https://facebook.com/theyardltd"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
            aria-label="Facebook"
          >
            <Facebook className="h-6 w-6" />
          </a>
          <a
            href="https://instagram.com/theyardhk"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
            aria-label="Instagram"
          >
            <Instagram className="h-6 w-6" />
          </a>
        </div>
      </div>
    </PublicLayout>
  );
}

interface BranchCardProps {
  branch: ContactBranch;
  t: (key: string, fallback?: string) => string;
  lang: string;
}

function BranchCard({ branch, t, lang }: BranchCardProps) {
  const embedUrl = buildMapEmbedUrl(getContactFieldForLocale(branch.map_query, lang));
  const address = getContactFieldForLocale(branch.address, lang).trim();
  const hours = getContactFieldForLocale(branch.hours, lang).trim();
  const name = getContactFieldForLocale(branch.name, lang).trim();

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {name && (
        <div className="px-6 pt-6">
          <h2 className="text-2xl font-semibold text-gray-900">{name}</h2>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        <div className="lg:col-span-1 space-y-5">
          {address && (
            <div className="flex items-start">
              <MapPin className="h-6 w-6 text-primary mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{t('contact.address')}</h3>
                <p className="text-gray-600 whitespace-pre-line">{address}</p>
              </div>
            </div>
          )}

          {hours && (
            <div className="flex items-start">
              <Clock className="h-6 w-6 text-primary mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{t('contact.serviceHours')}</h3>
                <p className="text-gray-600 whitespace-pre-line">{hours}</p>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="h-full w-full overflow-hidden rounded-lg bg-gray-50 border border-gray-100">
            {branch.image_url ? (
              <img
                src={resolveUploadUrl(branch.image_url)}
                alt={name || 'Branch photo'}
                className="w-full h-full min-h-[220px] object-cover"
              />
            ) : (
              <div className="w-full h-full min-h-[220px] flex items-center justify-center text-sm text-gray-400">
                {t('contact.noImage', 'No image')}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="h-full w-full overflow-hidden rounded-lg bg-gray-50 border border-gray-100 min-h-[220px]">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: 220 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`${name || 'Branch'} map`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
                {t('contact.noMap', 'No map')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
