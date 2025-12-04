import { ReactNode, useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Home, Calendar, ShoppingBag, User, LogOut, Users, BarChart, Settings, Menu, X, PanelLeft, ChevronDown, Receipt, Newspaper, Package, Phone } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import logoImage from '../assets/images/the-yard-logo.png';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { profile, signOut, isAdmin, user } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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

  const studentNavItems = [
    { path: '/dashboard', icon: Home, label: t('nav.dashboard') },
    { path: '/schedule', icon: Calendar, label: t('nav.schedule') },
    { path: '/payment-history', icon: Receipt, label: t('nav.paymentHistory') },
    { path: '/profile', icon: User, label: t('nav.profile') },
  ];

  const adminNavItems = [
    { path: '/admin', icon: Home, label: t('nav.dashboard') },
    { path: '/admin/users', icon: Users, label: t('nav.users') },
    { path: '/admin/classes', icon: Calendar, label: t('nav.classes') },
    { path: '/admin/reports', icon: BarChart, label: t('nav.reports') },
    { path: '/admin/settings', icon: Settings, label: t('nav.settings') },
  ];

  const navItems = isAdmin ? adminNavItems : studentNavItems;

  // Public navigation items for top menu bar with icons
  const publicNavItems = [
    { path: '/', label: t('nav.home'), icon: Home },
    { path: '/calendar', label: t('nav.calendar'), icon: Calendar },
    { path: '/news', label: t('nav.news'), icon: Newspaper },
    { path: '/token-package', label: t('nav.tokenPackage'), icon: Package },
    { path: '/contact', label: t('nav.contact'), icon: Phone },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden mr-3 p-2 text-gray-600 hover:text-gray-900"
              >
                <PanelLeft className="h-6 w-6" />
              </button>
              <Link to={isAdmin ? '/admin' : '/dashboard'} className="flex items-center">
                <img src={logoImage} alt="The Yard Logo" className="h-8 w-auto" />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              {publicNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'text-primary'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <LanguageSwitcher />
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  {profile?.full_name || t('nav.dashboard')}
                  {isAdmin && <span className="text-xs opacity-90">(Admin)</span>}
                  <ChevronDown className={`h-4 w-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
                    {user && !isAdmin && (
                      <>
                        <Link
                          to="/dashboard"
                          onClick={() => setUserMenuOpen(false)}
                          className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                            isActive('/dashboard')
                              ? 'bg-primary-lighter text-primary'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <Home className="h-4 w-4" />
                          {t('nav.dashboard')}
                        </Link>
                        <Link
                          to="/schedule"
                          onClick={() => setUserMenuOpen(false)}
                          className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                            isActive('/schedule')
                              ? 'bg-primary-lighter text-primary'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <Calendar className="h-4 w-4" />
                          {t('nav.schedule')}
                        </Link>
                        <Link
                          to="/payment-history"
                          onClick={() => setUserMenuOpen(false)}
                          className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                            isActive('/payment-history')
                              ? 'bg-primary-lighter text-primary'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <Receipt className="h-4 w-4" />
                          {t('nav.paymentHistory')}
                        </Link>
                        <Link
                          to="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                            isActive('/profile')
                              ? 'bg-primary-lighter text-primary'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <User className="h-4 w-4" />
                          {t('nav.profile')}
                        </Link>
                      </>
                    )}
                    <button
                      onClick={() => {
                        signOut();
                        setUserMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      {t('nav.signOut')}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center space-x-2">
              <LanguageSwitcher />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-gray-600 hover:text-gray-900"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile menu dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t bg-gray-50">
              <div className="px-3 pt-4 pb-4 space-y-2">
                {/* Public Navigation Items */}
                <div className="space-y-1">
                  {publicNavItems.map((item) => {
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

                {/* User Menu Items */}
                {!isAdmin && (
                  <>
                    <div className="pt-2 border-t border-gray-200">
                      <div className="space-y-1">
                        <Link
                          to="/dashboard"
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 text-base font-medium rounded-lg transition-all ${
                            isActive('/dashboard')
                              ? 'bg-primary text-white shadow-sm'
                              : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                          }`}
                        >
                          <Home className={`h-5 w-5 ${isActive('/dashboard') ? 'text-white' : 'text-gray-500'}`} />
                          {t('nav.dashboard')}
                        </Link>
                        <Link
                          to="/schedule"
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 text-base font-medium rounded-lg transition-all ${
                            isActive('/schedule')
                              ? 'bg-primary text-white shadow-sm'
                              : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                          }`}
                        >
                          <Calendar className={`h-5 w-5 ${isActive('/schedule') ? 'text-white' : 'text-gray-500'}`} />
                          {t('nav.schedule')}
                        </Link>
                        <Link
                          to="/payment-history"
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 text-base font-medium rounded-lg transition-all ${
                            isActive('/payment-history')
                              ? 'bg-primary text-white shadow-sm'
                              : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                          }`}
                        >
                          <Receipt className={`h-5 w-5 ${isActive('/payment-history') ? 'text-white' : 'text-gray-500'}`} />
                          {t('nav.paymentHistory')}
                        </Link>
                        <Link
                          to="/profile"
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 text-base font-medium rounded-lg transition-all ${
                            isActive('/profile')
                              ? 'bg-primary text-white shadow-sm'
                              : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                          }`}
                        >
                          <User className={`h-5 w-5 ${isActive('/profile') ? 'text-white' : 'text-gray-500'}`} />
                          {t('nav.profile')}
                        </Link>
                      </div>
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          signOut();
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
                {isAdmin && (
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        signOut();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 text-base font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 active:bg-red-800 transition-all shadow-sm"
                    >
                      <X className="h-5 w-5" />
                      {t('nav.signOut')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      <div className="flex pt-16">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 bg-white shadow-sm min-h-[calc(100vh-4rem)]">
          <nav className="mt-5 px-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive(item.path)
                      ? 'bg-primary-lighter text-primary'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon
                    className={`mr-3 h-5 w-5 ${
                      isActive(item.path) ? 'text-primary' : "text-gray-400 group-hover:text-gray-500"
                    }`}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:hidden">
              <div className="flex items-center justify-between h-16 px-4 border-b">
                <span className="text-xl font-semibold text-gray-900">{t('nav.menu')}</span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 text-gray-600 hover:text-gray-900"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive(item.path)
                          ? 'bg-primary-lighter text-primary'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon
                        className={`mr-3 h-5 w-5 ${
                          isActive(item.path) ? 'text-primary' : "text-gray-400 group-hover:text-gray-500"
                        }`}
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
