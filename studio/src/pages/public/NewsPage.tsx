import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';
import { formatDate } from '../../lib/utils';
import scheduleImage from '../../assets/images/schedule.jpg';

/** Dance-related banner for news page (horizontal) – distinct from first post image */
const NEWS_BANNER_IMAGE =
  'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=1200&h=600&fit=crop&q=80';

interface NewsPost {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  published_at: string;
}

// Dummy data
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
];

export default function NewsPage() {
  const { t, i18n } = useTranslation();
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNews();
  }, [t, i18n.language]);

  async function loadNews() {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const translatedPosts = DUMMY_NEWS_POSTS.map(post => ({
      ...post,
      title: t(`news.posts.${post.id}.title`),
      content: t(`news.posts.${post.id}.content`),
    }));
    
    setPosts(translatedPosts);
    setLoading(false);
  }

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">{t('news.title')}</h1>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600">No news posts available</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Banner: dedicated dance image (no longer reusing first post image) */}
            {posts.length > 0 && (
              <div className="rounded-xl overflow-hidden shadow-lg h-48 sm:h-56 md:h-64 bg-gray-200">
                <img
                  src={NEWS_BANNER_IMAGE}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  to={`/news/${post.id}`}
                  className="block bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <article>
                    {post.image_url && (
                      <div className="aspect-video w-full bg-gray-100">
                        <img
                          src={post.image_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="text-sm text-gray-500 mb-2">
                        {formatDate(post.published_at, i18n.language === 'zh-TW' || i18n.language === 'zh-CN' ? 'zh-TW' : 'en-US')}
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 mb-2 hover:text-primary transition-colors">
                        {post.title}
                      </h2>
                      <p className="text-gray-700 line-clamp-3">{post.content}</p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
