import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';
import { loadSimpleSitePage } from '../../lib/sitePageContent';

type Mode = 'html' | 'legacy';

interface PageState {
  title: string;
  html: string;
  legacy: string;
  mode: Mode;
}

export default function PrivacyPage() {
  const { t } = useTranslation();
  const [state, setState] = useState<PageState>({ title: '', html: '', legacy: '', mode: 'legacy' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const saved = await loadSimpleSitePage('privacy');
        if (cancelled) return;
        if (saved && (saved.title || saved.contentHtml)) {
          setState({
            title: saved.title || t('privacy.title'),
            html: saved.contentHtml || '',
            legacy: t('privacy.content'),
            mode: saved.contentHtml && saved.contentHtml.trim() !== '' ? 'html' : 'legacy',
          });
        } else {
          setState({
            title: t('privacy.title'),
            html: '',
            legacy: t('privacy.content'),
            mode: 'legacy',
          });
        }
      } catch {
        if (cancelled) return;
        setState({
          title: t('privacy.title'),
          html: '',
          legacy: t('privacy.content'),
          mode: 'legacy',
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [t]);

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
        <div className="prose prose-lg max-w-none bg-white rounded-lg shadow-md p-8">
          {state.mode === 'html' ? (
            <div
              className="text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: state.html }}
            />
          ) : (
            <p className="text-gray-700 whitespace-pre-line">{state.legacy}</p>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
