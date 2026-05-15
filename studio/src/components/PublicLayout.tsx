import { ReactNode, useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, Mail, Facebook, Instagram, ChevronDown, User, Calendar, Home, Newspaper, Package, Phone, LogOut, LayoutDashboard, Info, Check, BookOpen, GraduationCap } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import { useAuth } from '../contexts/AuthContext';
const logoUrl = '/images/(Final)Logo.png';

// WhatsApp Icon Component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

interface PublicLayoutProps {
  children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const { user, profile, signOut, profiles, activeProfileId, switchProfile } = useAuth();
  const hasMultipleProfiles = !!(user && profile?.role === 'student' && profiles.length > 1);
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setUserMenuOpen(false);
  };

  // Check if student is logged in
  const isStudent = user && profile?.role === 'student';
  // Check if admin is logged in
  const isAdmin = user && profile?.role === 'admin';

  // Build navigation items with icons
  const navItems = [
    { path: '/', label: t('nav.home'), icon: Home },
    { path: '/about', label: t('nav.about'), icon: Info },
    { path: '/news', label: t('nav.news'), icon: Newspaper },
    { path: '/courses', label: t('nav.courses', '課程介紹'), icon: BookOpen },
    { path: '/instructors', label: t('nav.instructors', '導師介紹'), icon: GraduationCap },
    { path: '/calendar', label: t('nav.calendar'), icon: Calendar },
    { path: '/token-package', label: t('nav.tokenPackage'), icon: Package },
    { path: '/contact', label: t('nav.contact'), icon: Phone },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [userMenuOpen]);

  // Reset page scroll on public route changes.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);

  return (
    <div className="min-h-screen bg-cream">
      <a
        href="#main-content"
        className="absolute left-4 top-4 -translate-y-[200%] focus:translate-y-0 focus:z-[100] px-4 py-2 bg-primary text-white rounded-md outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-transform"
      >
        {t('common.skipToContent', 'Skip to main content')}
      </a>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-cream shadow-sm border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <img src={logoUrl} alt="The Yard Logo" className="h-8 w-auto" />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded ${
                    isActive(item.path)
                      ? 'text-primary'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <LanguageSwitcher />
              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <User className="h-4 w-4" />
                    {profile?.full_name || t('nav.dashboard')}
                    <ChevronDown className={`h-4 w-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
                      {/* Dashboard: student -> /dashboard, admin -> /admin */}
                      {user && (isStudent || isAdmin) && (
                        <Link
                          to={isAdmin ? '/admin' : '/dashboard'}
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <LayoutDashboard className="h-4 w-4" />
                          {t('nav.dashboard')}
                        </Link>
                      )}
                      {isStudent && hasMultipleProfiles && (
                        <div className="border-t border-gray-100 px-3 py-2">
                          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">{t('profile.familyMembers')}</p>
                          {profiles.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => {
                                switchProfile(p.id);
                                setUserMenuOpen(false);
                                navigate('/dashboard');
                              }}
                              className={`flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-sm rounded ${
                                p.id === activeProfileId ? 'bg-primary-lighter text-primary font-medium' : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <span>{p.full_name}</span>
                              {p.id === activeProfileId && <Check className="h-4 w-4 shrink-0" />}
                            </button>
                          ))}
                        </div>
                      )}
                      {user && (
                        <>
                          <div className="border-t border-gray-200 my-1"></div>
                          <button
                            onClick={handleSignOut}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            {t('nav.signOut')}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  {t('nav.login')}
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center space-x-2">
              <LanguageSwitcher />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
                aria-expanded={mobileMenuOpen}
                aria-label={mobileMenuOpen ? t('common.close') : t('nav.menu')}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile menu dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t bg-cream">
              <div className="px-3 pt-4 pb-4 space-y-2">
                {/* Public Navigation Items */}
                <div className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 text-base font-medium rounded-lg transition-all ${
                          isActive(item.path)
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${isActive(item.path) ? 'text-white' : 'text-gray-500'}`} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>

                {/* User Menu Items: Dashboard first for students, then family members */}
                {user && isStudent && (
                  <>
                    <div className="pt-2 border-t border-gray-200">
                      <Link
                        to="/dashboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-base font-medium rounded-lg bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200 ring-1 ring-gray-300"
                      >
                        <LayoutDashboard className="h-5 w-5 text-gray-500" />
                        {t('nav.dashboard')}
                      </Link>
                    </div>
                    {hasMultipleProfiles && (
                      <div className="pt-2 border-t border-gray-200">
                        <p className="px-4 mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">{t('profile.familyMembers')}</p>
                        <div className="flex flex-wrap gap-2 px-4">
                          {profiles.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => {
                                switchProfile(p.id);
                                setMobileMenuOpen(false);
                                navigate('/dashboard');
                              }}
                              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                                p.id === activeProfileId ? 'bg-primary text-white' : 'bg-white text-gray-700 ring-1 ring-gray-300'
                              }`}
                            >
                              {p.full_name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          handleSignOut();
                          setMobileMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-base font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 active:bg-red-800 transition-all shadow-sm"
                      >
                        <LogOut className="h-5 w-5" />
                        {t('nav.signOut')}
                      </button>
                    </div>
                  </>
                )}
                {user && isAdmin && (
                  <>
                    <div className="pt-2 border-t border-gray-200">
                      <Link
                        to="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-base font-medium rounded-lg transition-all bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200"
                      >
                        <LayoutDashboard className="h-5 w-5 text-gray-500" />
                        {t('nav.dashboard')}
                      </Link>
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          handleSignOut();
                          setMobileMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-base font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 active:bg-red-800 transition-all shadow-sm"
                      >
                        <LogOut className="h-5 w-5" />
                        {t('nav.signOut')}
                      </button>
                    </div>
                  </>
                )}
                {!user && (
                  <div className="pt-2">
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full text-center px-4 py-3 text-base font-medium text-white bg-primary rounded-lg hover:bg-primary-dark active:bg-primary transition-all shadow-sm"
                    >
                      {t('nav.login')}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      <main id="main-content" className="pt-16" tabIndex={-1}>
        {children}
      </main>

      <footer className="bg-primary-dark text-white border-t border-primary mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">{t('footer.company')}</h3>
              <ul className="space-y-2">
                <li><Link to="/about" className="text-sm text-white/90 hover:text-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary-dark rounded">{t('nav.about')}</Link></li>
                <li><Link to="/contact" className="text-sm text-white/90 hover:text-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary-dark rounded">{t('nav.contact')}</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">{t('footer.resources')}</h3>
              <ul className="space-y-2">
                <li><Link to="/news" className="text-sm text-white/90 hover:text-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary-dark rounded">{t('footer.latestNews')}</Link></li>
                <li><Link to="/faq" className="text-sm text-white/90 hover:text-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary-dark rounded">{t('footer.faq')}</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">{t('footer.legal')}</h3>
              <ul className="space-y-2">
                <li><Link to="/terms" className="text-sm text-white/90 hover:text-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary-dark rounded">{t('footer.termsConditions')}</Link></li>
                <li><Link to="/privacy" className="text-sm text-white/90 hover:text-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary-dark rounded">{t('footer.privacyPolicy')}</Link></li>
              </ul>
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <h3 className="text-sm font-semibold text-white mb-3">
                {t('footer.hotline')} {t('footer.hotlineNumber')}
              </h3>
              <div className="text-sm text-white/90 space-y-2">
                <p className="font-medium">{t('footer.hotlineTitle')}</p>
                <p>{t('footer.hotlineWeekday')}</p>
                <p>{t('footer.hotlineWeekend')}</p>
                <p className="mt-2">{t('footer.hotlineNote')}</p>
                <div className="flex items-center gap-3 mt-3">
                  <a
                    href="https://api.whatsapp.com/send?phone=85292299875"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/90 hover:text-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary-dark rounded"
                    aria-label="WhatsApp"
                  >
                    <WhatsAppIcon className="h-5 w-5" />
                  </a>
                  <a
                    href="mailto:info@theyard.com.hk"
                    className="text-white/90 hover:text-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary-dark rounded"
                    aria-label="Email"
                  >
                    <Mail className="h-5 w-5" />
                  </a>
                  <a
                    href="https://facebook.com/theyardltd"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/90 hover:text-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary-dark rounded"
                    aria-label="Facebook"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                  <a
                    href="https://instagram.com/theyardhk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/90 hover:text-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary-dark rounded"
                    aria-label="Instagram"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/20 text-center text-sm text-white/70">
            {t('footer.copyright')}
          </div>
        </div>
      </footer>
    </div>
  );
}
