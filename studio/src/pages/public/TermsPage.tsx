import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';

export default function TermsPage() {
  const { t } = useTranslation();
  const [content, setContent] = useState({ title: '', content: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, [t]);

  async function loadContent() {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    setContent({
      title: t('terms.title'),
      content: t('terms.content'),
    });
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

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">{content.title}</h1>
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="prose prose-lg max-w-none text-gray-700 whitespace-pre-line leading-relaxed">
            {content.content.split('\n').map((line, index) => {
              // Check if line starts with a section letter (A., B., C., D.)
              if (/^[A-D]\./.test(line.trim())) {
                return (
                  <h2 key={index} className="text-2xl font-bold text-gray-900 mt-8 mb-4 first:mt-0">
                    {line}
                  </h2>
                );
              }
              // Check if line starts with a number (numbered list items)
              if (/^\d+\./.test(line.trim())) {
                return (
                  <p key={index} className="mb-3 ml-4">
                    {line}
                  </p>
                );
              }
              // Regular paragraph
              if (line.trim()) {
                return (
                  <p key={index} className="mb-3">
                    {line}
                  </p>
                );
              }
              // Empty line
              return <br key={index} />;
            })}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
