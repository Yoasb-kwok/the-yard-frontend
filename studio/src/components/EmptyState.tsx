import { type ReactNode } from 'react';

interface EmptyStateProps {
  /** Main message (e.g. "暫無資料") */
  message: string;
  /** Optional short description */
  description?: string;
  /** Optional icon or illustration */
  icon?: ReactNode;
}

/**
 * Unified empty state for lists / no data. Use when list is loaded but has zero items.
 */
export default function EmptyState({ message, description, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && <div className="mb-3 text-gray-400">{icon}</div>}
      <p className="text-gray-700 font-medium">{message}</p>
      {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
    </div>
  );
}
