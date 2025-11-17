import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';

export default function PrivacyPage() {
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
      title: t('privacy.title'),
      content: t('privacy.content'),
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
        <div className="prose prose-lg max-w-none bg-white rounded-lg shadow-md p-8">
          <p className="text-gray-700 whitespace-pre-line">{content.content}</p>
        </div>
      </div>
    </PublicLayout>
  );
}
