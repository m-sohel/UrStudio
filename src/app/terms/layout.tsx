import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | UrStudio',
  description: 'Terms and conditions of service for UrStudio, the professional local-first photo printing, ID card, and government form preparation studio.',
  keywords: ['terms of service', 'urstudio terms', 'cybercafe photo software license', 'refund policy', 'photo printing legal'],
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
