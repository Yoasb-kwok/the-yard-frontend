import { useEffect, useState } from 'react';
import { api } from './api';
import {
  countIncompleteEnrollmentRequests,
  loadAdminEnrollmentRequestQueue,
} from './adminEnrollmentRequestQueue';

export interface AdminPendingCounts {
  pendingApplications: number;
  pendingTrials: number;
  /** Matches 未完成代幣分配 on /admin/enrollment-requests. */
  pendingEnrollmentRequests: number;
  /** Orders with payment_status pending or failed (sidebar badge on purchase history). */
  pendingOrders: number;
}

const ZERO_COUNTS: AdminPendingCounts = {
  pendingApplications: 0,
  pendingTrials: 0,
  pendingEnrollmentRequests: 0,
  pendingOrders: 0,
};
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

    let cancelled = false;

    Promise.all([
      api.get<AdminPendingCounts>('admin/pending-counts'),
      loadAdminEnrollmentRequestQueue()
        .then((requests) => countIncompleteEnrollmentRequests(requests))
        .catch(() => lastKnownCounts.pendingEnrollmentRequests),
    ])
      .then(([pendingRes, incompleteEnrollmentCount]) => {
        if (cancelled) return;
        const data = (pendingRes as { data?: AdminPendingCounts })?.data;
        if (
          data &&
          typeof data.pendingApplications === 'number' &&
          typeof data.pendingTrials === 'number'
        ) {
          const next: AdminPendingCounts = {
            pendingApplications: data.pendingApplications,
            pendingTrials: data.pendingTrials,
            pendingEnrollmentRequests: incompleteEnrollmentCount,
            pendingOrders: typeof data.pendingOrders === 'number' ? data.pendingOrders : 0,
          };
          lastKnownCounts = next;
          setCounts(next);
        }
      })
      .catch(() => {
        if (!cancelled) setCounts(lastKnownCounts);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  return isAdmin ? counts : ZERO_COUNTS;
}
