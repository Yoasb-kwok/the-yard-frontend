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

export default function AdminTermsPage() {
  const { t } = useTranslation();
  const fallbackTitle = t('terms.title', 'Terms and Conditions');
  const fallbackContent = plaintextToHtml(t('terms.content', ''));

  return (
    <AdminSimpleSitePage
      pageKey="terms"
      heading={t('admin.terms.heading', '條款與細則')}
      description={t(
        'admin.terms.description',
        '編輯公開頁「條款與細則」(/terms) 的標題與內容。儲存後會即時套用；未儲存前仍顯示語系檔的預設內容。'
      )}
      fallbackTitle={fallbackTitle}
      fallbackContentHtml={fallbackContent}
      titleLabel={t('admin.terms.titleLabel', '頁面標題')}
    />
  );
}
