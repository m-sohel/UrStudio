import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'UrStudio — Offline-First Photo & ID Card Studio',
    short_name: 'UrStudio',
    description: 'Professional offline-first photo and ID card printing studio for cybercafés and photo print shops.',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#f97316',
    orientation: 'any',
    icons: [
      {
        src: '/svgs/logo and the favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
