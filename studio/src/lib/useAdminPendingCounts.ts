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

/**
 * Returns counts of items needing admin action (改期/病假 待處理申請, 試堂 pending).
 * Used for red badge on left sidebar. Only fetches when isAdmin is true.
 */
export function useAdminPendingCounts(isAdmin: boolean): AdminPendingCounts {
  const [counts, setCounts] = useState<AdminPendingCounts>(() => (isAdmin ? DEMO_COUNTS : ZERO_COUNTS));

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
          setCounts(data);
        }
      })
      .catch(() => {
        setCounts(isDemoMode() ? DEMO_COUNTS : ZERO_COUNTS);
      });
  }, [isAdmin]);

  return isAdmin ? counts : ZERO_COUNTS;
}
