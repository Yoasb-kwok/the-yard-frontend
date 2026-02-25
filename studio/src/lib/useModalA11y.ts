import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Hook for modal a11y: Escape to close, return focus on close, optional focus trap.
 * @param isOpen - Whether the modal is open
 * @param onClose - Callback when modal should close (e.g. Escape)
 * @param contentRef - Ref on the modal content container (for focus trap)
 */
export function useModalA11y(
  isOpen: boolean,
  onClose: () => void,
  contentRef?: RefObject<HTMLElement | null>
) {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement | null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !contentRef?.current) return;

      const el = contentRef.current;
      const focusable = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (node) => node.offsetParent !== null
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    const raf = requestAnimationFrame(() => {
      if (contentRef?.current) {
        const first = contentRef.current.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        if (first) first.focus();
      }
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(raf);
      const prev = previousActiveElement.current;
      if (prev && typeof prev.focus === 'function' && document.contains(prev)) {
        prev.focus();
      }
    };
  }, [isOpen, onClose, contentRef]);
}
