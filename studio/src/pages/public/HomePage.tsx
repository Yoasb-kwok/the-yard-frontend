import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';
import BannerSlider from '../../components/BannerSlider';
import { Calendar, ChevronRight, ChevronLeft, LogIn, Newspaper, X } from 'lucide-react';
import greenBgImage from '../../assets/images/green_bg.jpg';
import roomRentalImage from '../../assets/images/room_rental.jpg';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { getStoredNewsPosts, getDemoNewsPosts, getPopupNewsPosts } from '../../lib/newsStorage';

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
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupPosts, setPopupPosts] = useState<NewsPost[]>([]);
  const [popupIndex, setPopupIndex] = useState(0);
  const popupTouchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    loadLatestNews();
  }, [t, i18n.language]);

  useEffect(() => {
    loadPopupNews();
  }, [i18n.language]);

  async function loadPopupNews() {
    try {
      const res = await api.get<{ id: string; title: string; content: string; image_url: string | null; published_at: string; show_as_popup?: boolean }[]>('/news');
      if (res.success && Array.isArray(res.data)) {
        const popup = res.data.filter((p) => (p as { show_as_popup?: boolean }).show_as_popup === true);
        if (popup.length > 0) {
          setPopupPosts(popup.slice(0, 20).map((p) => ({ id: p.id, title: p.title, content: p.content, image_url: p.image_url, published_at: p.published_at })));
          if (!sessionStorage.getItem('news_popup_shown')) setPopupVisible(true);
          return;
        }
      }
    } catch {
      // API unavailable
    }
    const stored = getPopupNewsPosts();
    if (stored.length > 0) {
      setPopupPosts(stored.map(({ created_at: _, show_as_popup: __, ...p }) => p));
      if (!sessionStorage.getItem('news_popup_shown')) setPopupVisible(true);
      return;
    }
    // Demo: 用現時最新消息的 demo data 顯示彈窗（首 2 則）
    const demo = getDemoNewsPosts(i18n.language);
    if (demo.length > 0 && !sessionStorage.getItem('news_popup_shown')) {
      setPopupPosts(demo.slice(0, 2).map(({ created_at: _, show_as_popup: __, ...p }) => p));
      setPopupVisible(true);
    }
  }

  async function loadLatestNews() {
    try {
            const res = await api.get<{ id: string; title: string; content: string; image_url: string | null; published_at: string }[]>('/news', { limit: 4 });
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const sorted = [...res.data].sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
        setLatestNews(sorted.slice(0, 4).map((p) => ({ id: p.id, title: p.title, content: p.content, image_url: p.image_url, published_at: p.published_at })));
        return;
      }
    } catch {
      // API unavailable
    }
    const stored = getStoredNewsPosts();
    if (stored.length > 0) {
      const sorted = [...stored].sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
      setLatestNews(sorted.slice(0, 4).map(({ created_at: _, ...p }) => p));
    } else {
      const demo = getDemoNewsPosts(i18n.language);
      setLatestNews(demo.slice(0, 4).map(({ created_at: _, ...p }) => p));
    }
  }

  function closePopup() {
    setPopupVisible(false);
    setPopupIndex(0);
    try {
      sessionStorage.setItem('news_popup_shown', '1');
    } catch {}
  }

  function goPrev() {
    setPopupIndex((i) => (i <= 0 ? i : i - 1));
  }
  function goNext() {
    setPopupIndex((i) => (i >= popupPosts.length - 1 ? i : i + 1));
  }

  function handlePopupTouchStart(e: React.TouchEvent) {
    popupTouchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  function handlePopupTouchEnd(e: React.TouchEvent) {
    const start = popupTouchStart.current;
    if (!start) return;
    popupTouchStart.current = null;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = start.x - endX;
    const deltaY = start.y - endY;
    const threshold = 50;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
      if (deltaX > 0) goNext();
      else goPrev();
    }
  }

  const locale = i18n.language === 'zh-TW' || i18n.language === 'zh-CN' ? 'zh-TW' : 'en-US';

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
    <>
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

        {/* 最新消息 - 左：第一則標題在上、圖在下；右：其他消息標題列表 */}
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
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-6 sm:gap-8">
              {/* 左欄：第一則 - 標題左上、圖左下 */}
              <div className="sm:col-span-2 flex flex-col gap-4">
                <Link
                  key={latestNews[0].id}
                  to={`/news/${latestNews[0].id}`}
                  className="group flex flex-col flex-1 min-h-0"
                >
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 group-hover:text-primary transition-colors line-clamp-2">
                    {latestNews[0].title}
                  </h3>
                  <div className="flex-1 min-h-0 rounded-2xl overflow-hidden shadow-lg border border-gray-200/80 aspect-[4/3] sm:aspect-[3/2] bg-gray-100">
                    {latestNews[0].image_url ? (
                      <img src={latestNews[0].image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <Newspaper className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                  </div>
                </Link>
              </div>
              {/* 右欄：其他最新消息標題列表 */}
              <div className="sm:col-span-3 flex flex-col gap-3">
                {latestNews.slice(1).map((post) => (
                  <Link
                    key={post.id}
                    to={`/news/${post.id}`}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 py-3 border-b border-gray-100 last:border-0 group"
                  >
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors line-clamp-2 flex-1 min-w-0">
                      {post.title}
                    </h3>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-primary flex-shrink-0 hidden sm:block" />
                  </Link>
                ))}
              </div>
            </div>
            {/* Upgrade 圖片 - 最新消息下方 */}
            <div className="mt-10 sm:mt-12 flex justify-center">
              <img src="/images/Upgrade.png" alt="Upgrade" className="max-w-full h-auto rounded-2xl shadow-lg border border-gray-200/80" />
            </div>
          </div>
        )}
      </div>
    </PublicLayout>

    {/* 最新消息彈窗：左右滑動輪播，方便手機用戶 */}
    {popupVisible && popupPosts.length > 0 && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="news-popup-title">
        <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
            <h2 id="news-popup-title" className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Newspaper className="h-6 w-6 text-primary" />
              {t('home.latestNewsTitle', '最新消息')}
            </h2>
            <button type="button" onClick={closePopup} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors" aria-label={t('common.close', '關閉')}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative flex-1 min-h-0 flex items-stretch">
            {/* 左箭頭（僅桌面顯示，手機靠滑動） */}
            {popupPosts.length > 1 && popupIndex > 0 && (
              <button
                type="button"
                onClick={goPrev}
                className="hidden sm:flex absolute left-0 top-0 bottom-0 z-10 w-10 items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-l-2xl transition-colors"
                aria-label={t('common.previous', '上一則')}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            {/* 右箭頭（僅桌面顯示，手機靠滑動） */}
            {popupPosts.length > 1 && popupIndex < popupPosts.length - 1 && (
              <button
                type="button"
                onClick={goNext}
                className="hidden sm:flex absolute right-0 top-0 bottom-0 z-10 w-10 items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-r-2xl transition-colors"
                aria-label={t('common.next', '下一則')}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}

            <div
              className="flex-1 overflow-hidden"
              onTouchStart={handlePopupTouchStart}
              onTouchEnd={handlePopupTouchEnd}
            >
              <div
                className="flex h-full transition-transform duration-300 ease-out"
                style={{ transform: `translateX(-${popupIndex * 100}%)` }}
              >
                {popupPosts.map((post) => (
                  <div key={post.id} className="w-full flex-shrink-0 flex flex-col overflow-y-auto">
                    <Link
                      to={`/news/${post.id}`}
                      onClick={closePopup}
                      className="flex flex-col flex-1 min-h-0 group"
                    >
                      {post.image_url ? (
                        <div className="flex-shrink-0 aspect-[4/3] bg-gray-100 overflow-hidden">
                          <img src={post.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>
                      ) : null}
                      <div className="p-4 flex-1 flex flex-col min-h-0">
                        <p className="text-xs text-gray-500 mb-1">{formatDate(post.published_at, locale)}</p>
                        <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors line-clamp-2">{post.title}</h3>
                        <p className="text-sm text-gray-600 mt-2 line-clamp-4 flex-1">{post.content}</p>
                        <span className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-primary">
                          {t('home.viewAllNews', '更多消息')}
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 圓點指示：第幾則 */}
          {popupPosts.length > 1 && (
            <div className="flex justify-center gap-2 p-3 border-t border-gray-100 flex-shrink-0">
              {popupPosts.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPopupIndex(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${i === popupIndex ? 'bg-primary' : 'bg-gray-300 hover:bg-gray-400'}`}
                  aria-label={t('home.newsSlide', { current: i + 1, total: popupPosts.length }, `第 ${i + 1} 則，共 ${popupPosts.length} 則`)}
                  aria-current={i === popupIndex ? 'true' : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
}
