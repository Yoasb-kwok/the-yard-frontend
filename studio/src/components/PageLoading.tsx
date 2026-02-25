interface PageLoadingProps {
  /** Optional text below spinner */
  message?: string;
}

/**
 * Unified full-page loading spinner. Use for initial data load.
 */
export default function PageLoading({ message }: PageLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12" role="status" aria-live="polite">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" aria-hidden="true" />
      {message && <p className="mt-4 text-sm text-gray-600">{message}</p>}
    </div>
  );
}
