import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

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
    <html lang="en" className={cn("dark", "font-sans", geist.variable)} suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
