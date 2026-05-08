import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getFaqFieldForLocale, loadFaqContent, type FaqItem } from '../../lib/faqContent';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function plaintextToHtml(text: string): string {
  if (!text) return '';
  return `<p>${escapeHtml(text).replace(/\n/g, '<br/>')}</p>`;
}

interface PageState {
  title: string;
  intro: string;
  items: FaqItem[];
}

export default function FAQPage() {
  const { t, i18n } = useTranslation();
  const [state, setState] = useState<PageState>({ title: '', intro: '', items: [] });
  const [loading, setLoading] = useState(true);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const stored = await loadFaqContent();
        if (cancelled) return;
        if (stored && stored.items.length > 0) {
          setState({
            title: stored.title || t('faq.title'),
            intro: stored.intro || t('faq.subtitle'),
            items: stored.items
              .map((it) => ({
                ...it,
                question: getFaqFieldForLocale(it.question, i18n.language),
                answer_html: getFaqFieldForLocale(it.answer_html, i18n.language),
              }))
              .filter((it) => it.question.trim() !== ''),
          });
          return;
        }
      } catch {
        // ignore – fall back to i18n
      }

      if (cancelled) return;
      const items: FaqItem[] = [];
      for (let i = 1; i <= 100; i++) {
        const question = t(`faq.questions.${i}.question`, { defaultValue: '' });
        const answer = t(`faq.questions.${i}.answer`, { defaultValue: '' });
        if (!question || !answer) break;
        items.push({
          id: `faq-i18n-${i}`,
          question,
          answer_html: plaintextToHtml(answer),
          is_active: true,
        });
      }
      setState({
        title: t('faq.title'),
        intro: t('faq.subtitle'),
        items,
      });
    })()
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t, i18n.language]);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">{state.title}</h1>
        {state.intro && <p className="text-lg text-gray-600 mb-8">{state.intro}</p>}

        <div className="space-y-4">
          {state.items.map((item, index) => (
            <div
              key={item.id}
              className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900 pr-4">{item.question}</span>
                {openIndex === index ? (
                  <ChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                )}
              </button>
              {openIndex === index && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div
                    className="prose max-w-none text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: item.answer_html }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
