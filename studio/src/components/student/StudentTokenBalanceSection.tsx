import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Activity, AlertCircle, Coins, RotateCcw, ShoppingBag } from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate, isExpiringSoon } from '../../lib/utils';
import {
  fetchTokenUsageHistory,
  formatTokenUsageLabel,
  getTotalRemainingTokens,
  normalizeUserTokens,
  tokensFromPaidOrders,
  type TokenUsageItem,
  type UserToken,
} from '../../lib/studentTokens';
import { getEnrolledLessonSlotCount, type EnrolledClass } from '../../lib/studentEnrollments';

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
  const [usage, setUsage] = useState<TokenUsageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [usageLoading, setUsageLoading] = useState(true);

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

  useEffect(() => {
    let cancelled = false;
    async function loadUsage() {
      setUsageLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        if (!cancelled) {
          setUsage([]);
          setUsageLoading(false);
        }
        return;
      }
      try {
        const list = await fetchTokenUsageHistory({
          profileId,
          purchaseLabel: t('dashboard.tokenUsagePurchase'),
          refundLabel: t('dashboard.tokenUsageRefundDefault'),
        });
        if (!cancelled) setUsage(list);
      } catch {
        if (!cancelled) setUsage([]);
      } finally {
        if (!cancelled) setUsageLoading(false);
      }
    }
    loadUsage();
    return () => {
      cancelled = true;
    };
  }, [profileId, t]);

  const totalTokens = getTotalRemainingTokens(tokens);
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
            <Activity className="h-4 w-4" />
            {t('dashboard.tokenActivityTitle')}
          </h3>
          {usageLoading ? (
            <p className="text-sm text-gray-500">{t('common.loading')}</p>
          ) : usage.length === 0 ? (
            <p className="text-sm text-gray-500">{t('dashboard.tokenUsageEmpty')}</p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {usage.map((u) => (
                <li key={u.id} className="flex justify-between items-start text-sm gap-2">
                  <span className="text-gray-600 truncate min-w-0 flex items-center gap-1">
                    {u.kind === 'refund' && (
                      <RotateCcw className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" aria-hidden />
                    )}
                    {formatDate(u.date, getLocale())} · {formatTokenUsageLabel(u, t)}
                  </span>
                  <span
                    className={`font-medium flex-shrink-0 ${
                      u.kind === 'refund' || u.change > 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {u.change > 0 ? `+${u.change}` : u.change}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {profileClasses.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-medium text-gray-700 mb-2">{t('dashboard.lessonsLeftTitle')}</h3>
              <ul className="space-y-1.5 text-sm">
                {profileClasses.map((e) => {
                    const booked = getEnrolledLessonSlotCount(e);
                    const left = booked - (e.attended_lessons ?? e.lessons_used ?? 0);
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
