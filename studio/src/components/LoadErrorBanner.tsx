import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';

interface LoadErrorBannerProps {
  /** Error message to show */
  message: string;
  /** Called when user clicks retry */
  onRetry: () => void;
}

/**
 * Banner shown when initial load fails (e.g. API error). Shows message + retry button.
 */
export default function LoadErrorBanner({ message, onRetry }: LoadErrorBannerProps) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" aria-hidden="true" />
        <p className="text-sm font-medium text-red-800">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="flex-shrink-0 px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
      >
        {t('common.retry')}
      </button>
    </div>
  );
}
