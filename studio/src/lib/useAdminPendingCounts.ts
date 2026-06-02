import { useEffect, useState } from 'react';
import { api } from './api';

export interface AdminPendingCounts {
  pendingApplications: number;
  pendingTrials: number;
  pendingEnrollmentRequests: number;
}

const ZERO_COUNTS: AdminPendingCounts = { pendingApplications: 0, pendingTrials: 0, pendingEnrollmentRequests: 0 };
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
        if (
          data &&
          typeof data.pendingApplications === 'number' &&
          typeof data.pendingTrials === 'number'
        ) {
          const next: AdminPendingCounts = {
            pendingApplications: data.pendingApplications,
            pendingTrials: data.pendingTrials,
            pendingEnrollmentRequests:
              typeof data.pendingEnrollmentRequests === 'number' ? data.pendingEnrollmentRequests : 0,
          };
          lastKnownCounts = next;
          setCounts(next);
        }
      })
      .catch(() => {
        setCounts(lastKnownCounts);
      });
  }, [isAdmin]);

  return isAdmin ? counts : ZERO_COUNTS;
}
