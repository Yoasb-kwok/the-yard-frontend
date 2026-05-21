import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

export type SortDir = 'asc' | 'desc' | null;

interface TableSortButtonProps {
  label: string;
  sortKey: string;
  currentSortKey: string | null;
  sortDir: SortDir;
  onSort: (key: string) => void;
  className?: string;
}

/**
 * Clickable table header for A–Z / Z–A sorting.
 * Cycle: none → asc (A–Z) → desc (Z–A) → asc ...
 */
export function TableSortButton({ label, sortKey, currentSortKey, sortDir, onSort, className = '' }: TableSortButtonProps) {
  const isActive = currentSortKey === sortKey;
  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-start gap-1 text-left font-medium text-gray-500 uppercase hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 rounded px-1 py-0.5 whitespace-normal"
      >
        <span>{label}</span>
        {isActive ? (
          sortDir === 'asc' ? (
            <ArrowUp className="h-4 w-4 text-primary" aria-hidden />
          ) : (
            <ArrowDown className="h-4 w-4 text-primary" aria-hidden />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 text-gray-400" aria-hidden />
        )}
      </button>
    </th>
  );
}
