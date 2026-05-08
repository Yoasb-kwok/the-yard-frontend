import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';
import { getSitePageContentForLocale, loadSimpleSitePage } from '../../lib/sitePageContent';

type Mode = 'html' | 'legacy';

interface PageState {
  title: string;
  html: string;
  legacy: string;
  mode: Mode;
}

export default function TermsPage() {
  const { t, i18n } = useTranslation();
  const [state, setState] = useState<PageState>({ title: '', html: '', legacy: '', mode: 'legacy' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const saved = await loadSimpleSitePage('terms');
        if (cancelled) return;
        if (saved && (saved.title || saved.contentHtml)) {
          const localizedHtml = getSitePageContentForLocale(saved.contentHtml || '', i18n.language);
          setState({
            title: saved.title || t('terms.title'),
            html: localizedHtml,
            legacy: t('terms.content'),
            mode: localizedHtml && localizedHtml.trim() !== '' ? 'html' : 'legacy',
          });
        } else {
          setState({
            title: t('terms.title'),
            html: '',
            legacy: t('terms.content'),
            mode: 'legacy',
          });
        }
      } catch {
        if (cancelled) return;
        setState({
          title: t('terms.title'),
          html: '',
          legacy: t('terms.content'),
          mode: 'legacy',
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [t, i18n.language]);

  if (loading) {
    return (
      <PublicLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">{state.title}</h1>
        <div className="bg-white rounded-lg shadow-md p-8">
          {state.mode === 'html' ? (
            <div
              className="prose prose-lg max-w-none text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: state.html }}
            />
          ) : (
            <div className="prose prose-lg max-w-none text-gray-700 whitespace-pre-line leading-relaxed">
              {state.legacy.split('\n').map((line, index) => {
                if (/^[A-D]\./.test(line.trim())) {
                  return (
                    <h2 key={index} className="text-2xl font-bold text-gray-900 mt-8 mb-4 first:mt-0">
                      {line}
                    </h2>
                  );
                }
                if (/^\d+\./.test(line.trim())) {
                  return (
                    <p key={index} className="mb-3 ml-4">
                      {line}
                    </p>
                  );
                }
                if (line.trim()) {
                  return (
                    <p key={index} className="mb-3">
                      {line}
                    </p>
                  );
                }
                return <br key={index} />;
              })}
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
