'use client';

import { useState, useEffect } from 'react';

/**
 * useMounted hook
 * Returns true only after the component has mounted on the client.
 * Prevents Next.js SSR hydration mismatches for client-persisted state (localStorage/IndexedDB).
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
