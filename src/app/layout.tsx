import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "CyberCafe Studio — Photo & ID Card Printing",
  description: "Professional photo and ID card printing solution for cybercafés, photo studios, and printing shops. Upload, crop, layout, and print passport photos, visa photos, ID cards, and more.",
  keywords: ["photo printing", "passport photo", "id card", "cybercafe", "photo studio", "print layout"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const stored = localStorage.getItem('cybercafe-settings');
                const theme = stored ? JSON.parse(stored)?.state?.theme : 'dark';
                const isDark = theme === 'system' 
                  ? window.matchMedia('(prefers-color-scheme: dark)').matches 
                  : theme !== 'light';
                if (isDark) {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                  document.documentElement.style.colorScheme = 'dark';
                } else {
                  document.documentElement.classList.add('light');
                  document.documentElement.classList.remove('dark');
                  document.documentElement.style.colorScheme = 'light';
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
