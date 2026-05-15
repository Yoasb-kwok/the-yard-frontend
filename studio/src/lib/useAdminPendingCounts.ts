import { useEffect, useState } from 'react';
import { api } from './api';
import { isDemoMode } from './mock';

export interface AdminPendingCounts {
  pendingApplications: number;
  pendingTrials: number;
}

const DEMO_COUNTS: AdminPendingCounts = {
  pendingApplications: 2,
  pendingTrials: 1,
};

const ZERO_COUNTS: AdminPendingCounts = { pendingApplications: 0, pendingTrials: 0 };
let lastKnownCounts: AdminPendingCounts = ZERO_COUNTS;

/**
 * Returns counts of items needing admin action (改期/病假 待處理申請, 試堂 pending).
 * Used for red badge on left sidebar. Only fetches when isAdmin is true.
 */
export function useAdminPendingCounts(isAdmin: boolean): AdminPendingCounts {
  const [counts, setCounts] = useState<AdminPendingCounts>(() => (isAdmin ? lastKnownCounts : ZERO_COUNTS));

  useEffect(() => {
    if (!isAdmin) {
      setCounts(ZERO_COUNTS);
      return;
    }
    api
      .get<AdminPendingCounts>('admin/pending-counts')
      .then((res: unknown) => {
        const data = (res as { data?: AdminPendingCounts })?.data;
        if (data && typeof data.pendingApplications === 'number' && typeof data.pendingTrials === 'number') {
          lastKnownCounts = data;
          setCounts(data);
        }
      })
      .catch(() => {
        const fallback = isDemoMode() ? (lastKnownCounts.pendingApplications || lastKnownCounts.pendingTrials ? lastKnownCounts : DEMO_COUNTS) : lastKnownCounts;
        setCounts(fallback);
      });
  }, [isAdmin]);

  return isAdmin ? counts : ZERO_COUNTS;
}
