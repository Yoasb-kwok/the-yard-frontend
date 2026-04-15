import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const TABLE_PAGE_SIZE = 10;

/**
 * Client-side table pagination. Pass resetDeps (e.g. search string, filters) to jump back to page 1 when they change.
 */
export function useTablePagination<T>(
  items: readonly T[],
  pageSize: number = TABLE_PAGE_SIZE,
  resetDeps: readonly unknown[] = []
): {
  page: number;
  setPage: (p: number | ((prev: number) => number)) => void;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  paginatedItems: T[];
  startIndex: number;
} {
  const [page, setPage] = useState(1);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize) || 1);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetDeps is the explicit contract
  }, resetDeps);

  useEffect(() => {
    setPage((p) => (p > totalPages ? totalPages : p));
  }, [totalPages]);

  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const paginatedItems = useMemo(
    () => items.slice(start, start + pageSize),
    [items, start, pageSize]
  );

  return {
    page: safePage,
    setPage,
    totalPages,
    pageSize,
    totalItems,
    paginatedItems,
    startIndex: start,
  };
}

export function TablePaginationBar({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className = '',
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  if (totalItems === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-gray-200 bg-gray-50/80 px-4 py-3 text-sm text-gray-700 ${className}`}
    >
      <span className="text-gray-600">
        {t('pagination.showing', { from, to, total: totalItems })}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t('pagination.prev')}
        </button>
        <span className="px-2 tabular-nums text-gray-700">
          {t('pagination.pageOf', { page, totalPages })}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t('pagination.next')}
        </button>
      </div>
    </div>
  );
}
