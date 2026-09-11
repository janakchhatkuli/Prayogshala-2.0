'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';

export default function ViewTracker() {
  const pathname = usePathname();
  const logView = useStore(s => s.logView);

  useEffect(() => {
    if (!pathname) return;
    const match = pathname.match(/^\/lab\/([^/]+)/);
    logView(pathname, match?.[1]);
  }, [pathname, logView]);

  return null;
}
