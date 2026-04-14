import type { Metadata, Viewport } from "next";
import { MobileNav } from "@/components/MobileNav";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "JustSwangin — Golf Swing Analysis",
  description: "Swing analysis with pose mapping, benchmarks, and AI coaching.",
  icons: {
    icon: [{ url: "/icon.jpg", sizes: "1024x1024", type: "image/jpeg" }],
    apple: [{ url: "/apple-icon.jpg", sizes: "1024x1024", type: "image/jpeg" }],
  },
  appleWebApp: {
    capable: true,
    title: "JustSwangin",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#F4F2EC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="touch-manipulation antialiased">
        <div className="app-canvas overflow-x-hidden">
          <SiteHeader />
          <main className="pb-nav px-safe md:pb-10">{children}</main>
          <MobileNav />
        </div>
      </body>
    </html>
  );
}
