import { useEffect } from 'react';

/**
 * Global reference count for active scroll locks.
 * Allows nested/stacked modals (e.g. FilmographyModal opened on top of DetailModal)
 * to lock body scroll without prematurely restoring scroll when an inner modal closes.
 */
let activeLockCount = 0;
let previousBodyOverflow = '';
let previousHtmlOverflow = '';
let previousBodyPaddingRight = '';

export function lockBodyScroll(): void {
  if (typeof document === 'undefined') return;

  if (activeLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    previousHtmlOverflow = document.documentElement.style.overflow;
    previousBodyPaddingRight = document.body.style.paddingRight;

    // Compensate for scrollbar disappearance on desktop to prevent horizontal shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  }
  activeLockCount++;
}

export function unlockBodyScroll(): void {
  if (typeof document === 'undefined') return;

  activeLockCount = Math.max(0, activeLockCount - 1);
  if (activeLockCount === 0) {
    document.body.style.overflow = previousBodyOverflow;
    document.documentElement.style.overflow = previousHtmlOverflow;
    document.body.style.paddingRight = previousBodyPaddingRight;
  }
}

/**
 * React hook to lock body scroll while a component or modal is mounted/open.
 * @param isLocked Whether the scroll lock is active (default true)
 */
export function useBodyScrollLock(isLocked: boolean = true): void {
  useEffect(() => {
    if (!isLocked) return;

    lockBodyScroll();

    return () => {
      unlockBodyScroll();
    };
  }, [isLocked]);
}
