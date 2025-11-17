import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Home, Calendar, ShoppingBag, User, LogOut, BookOpen, Users, BarChart, Settings, Menu, X } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { profile, signOut, isAdmin } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const studentNavItems = [
    { path: '/dashboard', icon: Home, label: t('nav.dashboard') },
    { path: '/schedule', icon: Calendar, label: t('nav.schedule') },
    { path: '/shop', icon: ShoppingBag, label: t('nav.shop') },
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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden mr-3 p-2 text-gray-600 hover:text-gray-900"
              >
                <Menu className="h-6 w-6" />
              </button>
              <Link to={isAdmin ? '/admin' : '/dashboard'} className="flex items-center">
                <BookOpen className="h-8 w-8 text-primary" />
                <span className="ml-2 text-xl font-semibold text-gray-900">Studio</span>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:block">
                <span className="text-sm text-gray-600">
                  {profile?.full_name} {isAdmin && <span className="text-primary font-medium">(Admin)</span>}
                </span>
              </div>
              <LanguageSwitcher />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-gray-600 hover:text-gray-900"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <div className="hidden lg:flex items-center space-x-4">
                <button
                  onClick={signOut}
                  className="inline-flex items-center px-3 py-2 text-sm text-gray-700 hover:text-gray-900"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  {t('nav.signOut')}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile menu dropdown */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t">
              <div className="px-2 pt-2 pb-3 space-y-1">
                <div className="px-3 py-2 text-sm text-gray-700">
                  {profile?.full_name} {isAdmin && <span className="text-primary font-medium">(Admin)</span>}
                </div>
                <button
                  onClick={() => {
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('nav.signOut')}
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      <div className="flex">
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
