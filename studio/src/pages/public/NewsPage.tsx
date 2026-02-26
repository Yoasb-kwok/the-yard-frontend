import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';
import { formatDate } from '../../lib/utils';
import { getStoredNewsPosts } from '../../lib/newsStorage';
import { api } from '../../lib/api';
import scheduleImage from '../../assets/images/schedule.jpg';

interface NewsPost {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  published_at: string;
}

// Fallback when admin has not added any news (demo)
const DUMMY_NEWS_POSTS: NewsPost[] = [
  {
    id: '1',
    title: 'New Class Schedule Available',
    content: 'We are excited to announce our new class schedule for the upcoming month. Check out our expanded offerings including early morning sessions and weekend workshops.',
    image_url: scheduleImage,
    published_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    title: 'Welcome Our New Instructor',
    content: 'Please join us in welcoming Sarah Johnson to our team! Sarah brings over 10 years of experience in yoga and pilates instruction. She will be leading our new evening stretch classes.',
    image_url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&h=800&fit=crop&q=80',
    published_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    title: 'Holiday Special Promotion',
    content: 'This holiday season, we are offering special discounts on token packages. Purchase a Premium Pack and get 20% off! Limited time offer, valid until the end of the month.',
    image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&h=800&fit=crop&q=80',
    published_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    title: 'Spring Term Enrollment Open',
    content: 'Enrollment for our spring term is now open. Secure your place in ballet, street dance, and children\'s movement classes. Early bird discount available until next Friday.',
    image_url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=1200&h=800&fit=crop&q=80',
    published_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function NewsPage() {
  const { t, i18n } = useTranslation();
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNews();
  }, [t, i18n.language]);

  async function loadNews() {
    setLoading(true);
    try {
      const res = await api.get<{ id: string; title: string; content: string; image_url: string | null; published_at: string }[]>('/news');
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setPosts(res.data.map((p) => ({ id: p.id, title: p.title, content: p.content, image_url: p.image_url, published_at: p.published_at })));
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
      const translatedPosts = DUMMY_NEWS_POSTS.map((post) => ({
        ...post,
        title: t(`news.posts.${post.id}.title`),
        content: t(`news.posts.${post.id}.content`),
      }));
      setPosts(translatedPosts);
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
                        src={post.image_url}
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
