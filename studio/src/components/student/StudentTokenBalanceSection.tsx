import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Coins, ShoppingBag, TrendingDown } from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate, isExpiringSoon } from '../../lib/utils';
import { normalizeUserTokens, tokensFromPaidOrders, type UserToken } from '../../lib/studentTokens';
import type { EnrolledClass } from '../../lib/studentEnrollments';

interface TokenUsageItem {
  id: string;
  date: string;
  class_name: string;
  change: number;
}

const FALLBACK_TOKEN_USAGE: TokenUsageItem[] = [
  { id: 'u1', date: new Date(Date.now() - 2 * 86400000).toISOString(), class_name: '兒童芭蕾 A', change: -1 },
  { id: 'u2', date: new Date(Date.now() - 5 * 86400000).toISOString(), class_name: '兒童爵士 B', change: -1 },
];

interface StudentTokenBalanceSectionProps {
  profileId?: string;
  profileName?: string;
  upcomingClasses?: EnrolledClass[];
}

export default function StudentTokenBalanceSection({
  profileId,
  profileName,
  upcomingClasses = [],
}: StudentTokenBalanceSectionProps) {
  const { t, i18n } = useTranslation();
  const [tokens, setTokens] = useState<UserToken[]>([]);
  const [loading, setLoading] = useState(true);

  const getLocale = (): string => {
    const langMap: Record<string, string> = { en: 'en-US', 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW' };
    return langMap[i18n.language] || i18n.language || 'en-US';
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        if (!cancelled) {
          setTokens([]);
          setLoading(false);
        }
        return;
      }
      try {
        let tokensData = normalizeUserTokens(
          await api.get('/student/tokens').catch(() => api.get('/user-tokens')).catch(() => ({ data: [] }))
        );
        if (tokensData.length === 0) {
          const ordersRes = await api.get('/orders/me').catch(() => ({ data: [] }));
          tokensData = tokensFromPaidOrders(ordersRes);
        }
        if (!cancelled) setTokens(tokensData);
      } catch {
        if (!cancelled) setTokens([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const totalTokens = tokens.reduce((sum, tok) => sum + tok.remaining_tokens, 0);
  const expiringTokens = tokens.filter((tok) => isExpiringSoon(tok.expiry_date));
  const earliestExpiryDate =
    tokens.length > 0
      ? tokens.reduce(
          (earliest, token) => (new Date(token.expiry_date) < new Date(earliest) ? token.expiry_date : earliest),
          tokens[0].expiry_date
        )
      : null;

  const profileClasses = profileId
    ? upcomingClasses.filter((e) => (e.profile_id || e.user_id || '') === profileId)
    : upcomingClasses;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 animate-pulse">
        <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
        <div className="h-10 w-20 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {totalTokens === 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-amber-900">{t('dashboard.insufficientTokens')}</p>
            <p className="text-sm text-amber-800 mt-1">{t('dashboard.insufficientTokensDesc')}</p>
            <Link
              to="/student/shop"
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 text-sm font-medium"
            >
              <ShoppingBag className="h-4 w-4" />
              {t('dashboard.insufficientTokensCta')}
            </Link>
          </div>
        </div>
      )}

      {totalTokens > 0 && totalTokens <= 2 && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900">{t('dashboard.tokensRunningOut', '即將用完，可購買新套票')}</p>
            <Link
              to="/student/shop"
              className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 text-sm font-medium"
            >
              <ShoppingBag className="h-4 w-4" />
              {t('dashboard.lowTokensCta')}
            </Link>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900">{t('dashboard.tokenBalance')}</h2>
          <Coins className="h-6 w-6 md:h-8 md:w-8 text-yellow-500" />
        </div>
        <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{totalTokens}</div>
        <p className="text-gray-600 text-sm mb-3">{t('dashboard.availableTokens')}</p>
        {earliestExpiryDate && (
          <div className="text-sm text-gray-600 mb-3">
            {t('dashboard.expires')}: {formatDate(earliestExpiryDate, getLocale())}
          </div>
        )}
        {expiringTokens.length > 0 && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-3 flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              {expiringTokens.length} {t('dashboard.tokensExpiring')}
            </div>
          </div>
        )}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            {t('dashboard.tokenUsageTitle')}
          </h3>
          <ul className="space-y-2 max-h-32 overflow-y-auto">
            {FALLBACK_TOKEN_USAGE.map((u) => (
              <li key={u.id} className="flex justify-between items-center text-sm">
                <span className="text-gray-600 truncate">
                  {formatDate(u.date, getLocale())} · {u.class_name}
                </span>
                <span className="text-red-600 font-medium flex-shrink-0 ml-2">{u.change}</span>
              </li>
            ))}
          </ul>
          {profileClasses.some((e) => e.total_lessons != null && e.attended_lessons != null) && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-medium text-gray-700 mb-2">{t('dashboard.lessonsLeftTitle')}</h3>
              <ul className="space-y-1.5 text-sm">
                {profileClasses
                  .filter((e) => e.total_lessons != null && e.attended_lessons != null)
                  .map((e) => {
                    const left = (e.total_lessons ?? 0) - (e.attended_lessons ?? 0);
                    const studentName = e.user_name ?? profileName ?? t('dashboard.child');
                    return (
                      <li key={e.id} className="flex justify-between items-center gap-2">
                        <span className="text-gray-700 truncate" title={`${studentName} · ${e.class.name}`}>
                          {studentName} · {e.class.name}
                        </span>
                        <span className={left <= 2 ? 'text-amber-600 font-medium flex-shrink-0' : 'text-gray-600 flex-shrink-0'}>
                          {t('dashboard.lessonsLeft', { count: left })}
                        </span>
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
