import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | UrStudio',
  description: 'Privacy Policy for UrStudio. Learn about our 100% client-side zero-data-harvesting architecture for customer photos, Aadhaar cards, and ID documents.',
  keywords: ['privacy policy', 'urstudio privacy', 'zero data harvesting', 'client side photo processing', 'aadhaar privacy'],
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
