import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';
import { formatDate } from '../../lib/utils';
import { getStoredNewsPosts, getDemoNewsPosts } from '../../lib/newsStorage';
import { api } from '../../lib/api';
import { resolveUploadUrl } from '../../lib/uploads';

interface NewsPost {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  published_at: string;
}

function pickTextByLang(
  row: any,
  lang: 'zh-TW' | 'zh-CN' | 'en',
  kind: 'title' | 'content'
): string {
  const byLang =
    lang === 'zh-TW'
      ? row?.[`${kind}_zh_tw`]
      : lang === 'zh-CN'
      ? row?.[`${kind}_zh_cn`]
      : row?.[`${kind}_en`];
  return byLang || row?.[kind] || '';
}

function toNewsPost(row: any, lang: 'zh-TW' | 'zh-CN' | 'en'): NewsPost {
  return {
    id: String(row?.id ?? ''),
    title: pickTextByLang(row, lang, 'title'),
    content: pickTextByLang(row, lang, 'content'),
    image_url: row?.image_url ?? row?.imageUrl ?? null,
    published_at: row?.published_at || row?.created_at || new Date().toISOString(),
  };
}

export default function NewsPage() {
  const { t, i18n } = useTranslation();
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNews();
  }, [t, i18n.language]);

  async function loadNews() {
    setLoading(true);
    const lang = i18n.language === 'zh-CN' ? 'zh-CN' : i18n.language === 'zh-TW' ? 'zh-TW' : 'en';
    try {
      const res = await api.get<any[]>('/news', { lang, _t: Date.now() });
      if (res.success && Array.isArray(res.data)) {
        const rows = res.data.map((p) => toNewsPost(p, lang));
        rows.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
        setPosts(rows);
        setLoading(false);
        return;
      }
    } catch {
      // API unavailable: use stored or dummy
    }
    const stored = getStoredNewsPosts();
    if (stored.length > 0) {
      setPosts(stored.map(({ created_at: _, ...p }) => p));
    } else {
      const demo = getDemoNewsPosts(i18n.language);
      setPosts(demo.map(({ created_at: _, ...p }) => p));
    }
    setLoading(false);
  }

  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">{t('news.title')}</h1>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600">No news posts available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            {posts.map((post) => (
              <Link
                key={post.id}
                to={`/news/${post.id}`}
                className="flex flex-col bg-white rounded-xl border border-gray-200/80 shadow-md overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all"
              >
                <article className="flex flex-col flex-1">
                  {post.image_url && (
                    <div className="aspect-video w-full bg-gray-100 shrink-0">
                      <img
                        src={resolveUploadUrl(post.image_url)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-5 sm:p-6 flex flex-col flex-1">
                    <div className="text-sm text-gray-500 mb-2 shrink-0">
                      {formatDate(post.published_at, i18n.language === 'zh-TW' || i18n.language === 'zh-CN' ? 'zh-TW' : 'en-US')}
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </h2>
                    <p className="text-gray-600 text-sm sm:text-base line-clamp-3 flex-1">{post.content}</p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
