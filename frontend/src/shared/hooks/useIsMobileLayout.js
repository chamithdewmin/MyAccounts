import { useState, useEffect } from 'react';

/** Matches Sidebar drawer breakpoint — layout full-width below this width. */
export const MOBILE_LAYOUT_MAX_PX = 1023;

export function useIsMobileLayout() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= MOBILE_LAYOUT_MAX_PX : false
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_LAYOUT_MAX_PX}px)`);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return isMobile;
}
