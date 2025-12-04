import { useEffect, useState } from 'react';
import PublicLayout from '../../components/PublicLayout';
import { formatDate } from '../../lib/utils';

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
    image_url: null,
    published_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    title: 'Welcome Our New Instructor',
    content: 'Please join us in welcoming Sarah Johnson to our team! Sarah brings over 10 years of experience in yoga and pilates instruction. She will be leading our new evening stretch classes.',
    image_url: null,
    published_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    title: 'Holiday Special Promotion',
    content: 'This holiday season, we are offering special discounts on token packages. Purchase a Premium Pack and get 20% off! Limited time offer, valid until the end of the month.',
    image_url: null,
    published_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function NewsPage() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNews();
  }, []);

  async function loadNews() {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    setPosts(DUMMY_NEWS_POSTS);
    setLoading(false);
  }

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Latest News</h1>

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
            {posts.map((post) => (
              <article key={post.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                {post.image_url && (
                  <img
                    src={post.image_url}
                    alt={post.title}
                    className="w-full h-64 object-cover"
                  />
                )}
                <div className="p-6">
                  <div className="text-sm text-gray-500 mb-2">
                    {formatDate(post.published_at)}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">{post.title}</h2>
                  <p className="text-gray-700 whitespace-pre-line">{post.content}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
