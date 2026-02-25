import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';
import { formatDate } from '../../lib/utils';
import { ArrowLeft } from 'lucide-react';
import { getStoredNewsPosts } from '../../lib/newsStorage';
import scheduleImage from '../../assets/images/schedule.jpg';

interface NewsPost {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  published_at: string;
}

const DUMMY_NEWS_POSTS: NewsPost[] = [
  {
    id: '1',
    title: 'New Class Schedule Available',
    content: 'We are excited to announce our new class schedule for the upcoming month. Check out our expanded offerings including early morning sessions and weekend workshops.\n\nOur new schedule includes:\n- Morning yoga sessions starting at 7 AM\n- Weekend intensive workshops\n- Evening dance classes\n- Special holiday programs\n\nWe look forward to seeing you in our classes!',
    image_url: scheduleImage,
    published_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    title: 'Welcome Our New Instructor',
    content: 'Please join us in welcoming Sarah Johnson to our team! Sarah brings over 10 years of experience in yoga and pilates instruction. She will be leading our new evening stretch classes.\n\nSarah has trained with some of the best instructors in the world and brings a unique perspective to our studio. Her classes focus on:\n- Proper alignment and technique\n- Mindful movement\n- Building strength and flexibility\n- Creating a supportive community\n\nWe are thrilled to have Sarah join us and look forward to the positive impact she will have on our students.',
    image_url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&h=800&fit=crop&q=80',
    published_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    title: 'Holiday Special Promotion',
    content: 'This holiday season, we are offering special discounts on token packages. Purchase a Premium Pack and get 20% off! Limited time offer, valid until the end of the month.\n\nOur holiday promotion includes:\n- 20% off Premium Token Packages\n- Buy 10 tokens, get 2 free\n- Special gift cards available\n- Early bird discounts for January classes\n\nDon\'t miss out on these amazing deals! Visit our shop or contact us for more information.',
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
      const foundPost = DUMMY_NEWS_POSTS.find((p) => p.id === id);
      if (foundPost) {
        setPost({
          ...foundPost,
          title: t(`news.posts.${foundPost.id}.title`),
          content: t(`news.posts.${foundPost.id}.fullContent`),
        });
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

