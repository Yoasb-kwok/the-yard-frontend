import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';
import { formatDate } from '../../lib/utils';
import { ArrowLeft } from 'lucide-react';
import { getStoredNewsPosts, getDemoNewsPosts } from '../../lib/newsStorage';

interface NewsPost {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  published_at: string;
}

export default function NewsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const [post, setPost] = useState<NewsPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNewsDetail();
  }, [id, t, i18n.language]);

  async function loadNewsDetail() {
    await new Promise(resolve => setTimeout(resolve, 300));
    const stored = getStoredNewsPosts();
    const fromStored = id ? stored.find((p) => p.id === id) : null;
    if (fromStored) {
      const { created_at: _, ...p } = fromStored;
      setPost(p);
    } else {
      const demo = getDemoNewsPosts(i18n.language);
      const foundPost = id ? demo.find((p) => p.id === id) : null;
      if (foundPost) {
        setPost({ id: foundPost.id, title: foundPost.title, content: foundPost.content, image_url: foundPost.image_url, published_at: foundPost.published_at });
      } else {
        setPost(null);
      }
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <PublicLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!post) {
    return (
      <PublicLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">News Not Found</h1>
            <Link to="/news" className="text-primary hover:text-primary-dark">
              Back to News
            </Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          to="/news"
          className="inline-flex items-center text-primary hover:text-primary-dark mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          {t('news.backToNews')}
        </Link>

        <article className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-8">
            <div className="text-sm text-gray-500 mb-4">
              {formatDate(post.published_at, i18n.language === 'zh-TW' || i18n.language === 'zh-CN' ? 'zh-TW' : 'en-US')}
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-6">{post.title}</h1>
            <div className="prose prose-lg max-w-none text-gray-700 whitespace-pre-line leading-relaxed">
              {post.content}
              {post.image_url && (
                <div className="mt-8 flex justify-center">
                  <a
                    href={typeof post.image_url === 'string' ? post.image_url : post.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block cursor-pointer w-full md:w-1/2"
                  >
                    <img
                      src={typeof post.image_url === 'string' ? post.image_url : post.image_url}
                      alt={post.title}
                      className="w-full h-auto rounded-lg hover:opacity-90 transition-opacity"
                    />
                  </a>
                </div>
              )}
            </div>
          </div>
        </article>
      </div>
    </PublicLayout>
  );
}

