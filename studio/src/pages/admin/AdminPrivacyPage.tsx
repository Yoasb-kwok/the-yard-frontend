import { useTranslation } from 'react-i18next';
import AdminSimpleSitePage from './AdminSimpleSitePage';

function plaintextToHtml(text: string): string {
  if (!text) return '';
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return paragraphs
    .map((p) => `<p>${escape(p).replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

export default function AdminPrivacyPage() {
  const { t } = useTranslation();
  const fallbackTitle = t('privacy.title', 'Privacy Policy');
  const fallbackContent = plaintextToHtml(t('privacy.content', ''));

  return (
    <AdminSimpleSitePage
      pageKey="privacy"
      heading={t('admin.privacy.heading', '私隱政策')}
      description=""
      fallbackTitle={fallbackTitle}
      fallbackContentHtml={fallbackContent}
      showTitleField={false}
      enableContentLanguageSwitch={true}
    />
  );
}
