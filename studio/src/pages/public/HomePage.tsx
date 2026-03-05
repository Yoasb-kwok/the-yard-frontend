import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';
import BannerSlider from '../../components/BannerSlider';
import { Calendar, ChevronRight, LogIn, Newspaper } from 'lucide-react';
import greenBgImage from '../../assets/images/green_bg.jpg';
import roomRentalImage from '../../assets/images/room_rental.jpg';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { getStoredNewsPosts, getDemoNewsPosts } from '../../lib/newsStorage';

interface NewsPost {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  published_at: string;
}

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const [latestNews, setLatestNews] = useState<NewsPost[]>([]);

  useEffect(() => {
    loadLatestNews();
  }, [t, i18n.language]);

  async function loadLatestNews() {
    try {
      const res = await api.get<{ id: string; title: string; content: string; image_url: string | null; published_at: string }[]>('/news');
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setLatestNews(res.data.slice(0, 3).map((p) => ({ id: p.id, title: p.title, content: p.content, image_url: p.image_url, published_at: p.published_at })));
        return;
      }
    } catch {
      // API unavailable
    }
    const stored = getStoredNewsPosts();
    if (stored.length > 0) {
      setLatestNews(stored.slice(0, 3).map(({ created_at: _, ...p }) => p));
    } else {
      const demo = getDemoNewsPosts(i18n.language);
      setLatestNews(demo.slice(0, 3).map(({ created_at: _, ...p }) => p));
    }
  }

  const bannerSlides = [
    {
      image: greenBgImage,
      alt: 'The Yard - Modern Studio Space',
    },
    {
      image: roomRentalImage,
      alt: 'The Yard - Premium Facilities',
    },
  ];

  return (
    <PublicLayout>
      <div className="relative">
        <BannerSlider slides={bannerSlides} autoPlayInterval={5000} />
        {/* Content Overlay */}
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center px-4 sm:px-6 lg:px-8 pointer-events-auto">
            <h1 className="text-5xl font-bold mb-6 text-white drop-shadow-lg">
              <a
                href="http://wa.me/+85292299875"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline transition-all"
              >
                BOOKING WHATSAPP: +852 9229 9875
              </a>
            </h1>
            <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto drop-shadow-md">
              {t('home.subtitle')}
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
              <Link
                to="/calendar?view=day"
                className="bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-primary-lighter transition-colors shadow-lg"
              >
                {t('nav.calendar')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Under banner: 試堂申請 (left) + 學生登入 (right) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <div className="flex flex-wrap justify-center gap-6">
          <Link
            to="/calendar"
            className="inline-flex items-center justify-center gap-2 bg-primary text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-primary-dark transition-colors shadow-lg hover:shadow-xl min-w-[200px]"
          >
            <Calendar className="h-6 w-6" />
            {t('home.trialApplication')}
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 bg-white text-primary border-2 border-primary px-10 py-4 rounded-xl font-bold text-lg hover:bg-primary-lighter transition-colors shadow-lg hover:shadow-xl min-w-[200px]"
          >
            <LogIn className="h-6 w-6" />
            {t('home.studentLogin')}
          </Link>
        </div>

        {/* 最新消息 - 與關於我們同風格：左圖右文，max-w-4xl */}
        {latestNews.length > 0 && (
          <div className="max-w-4xl mx-auto mt-14 sm:mt-20">
            <div className="flex items-center justify-between mb-8 sm:mb-10">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Newspaper className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                {t('home.latestNewsTitle', '最新消息')}
              </h2>
              <Link
                to="/news"
                className="inline-flex items-center gap-2 text-primary font-semibold hover:text-primary-dark transition-colors group"
              >
                {t('home.viewAllNews', '更多消息')}
                <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className="space-y-14 sm:space-y-20">
              {latestNews.map((post) => (
                <Link
                  key={post.id}
                  to={`/news/${post.id}`}
                  className="flex flex-col gap-8 sm:gap-10 sm:flex-row sm:items-center group"
                >
                  <div className="flex-shrink-0 sm:w-[44%]">
                    <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200/80 aspect-[4/3] sm:aspect-[3/2] bg-gray-100">
                      {post.image_url ? (
                        <img src={post.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <Newspaper className="h-16 w-16 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-500 mb-3">
                      {formatDate(post.published_at, i18n.language === 'zh-TW' || i18n.language === 'zh-CN' ? 'zh-TW' : 'en-US')}
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed line-clamp-3">{post.content}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
