import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import BottomNav from "./BottomNav";
import { InstallProvider } from "./InstallApp";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "iSEREIN",
  title: "iSEREIN — A page for yourself",
  description:
    "One thoughtful page a day. Explore readings about Self, Life, and Growth.",
  appleWebApp: {
    capable: true,
    title: "iSEREIN",
    statusBarStyle: "default",
  },
  icons: {
    apple: {
      url: "/icons/iserein-180.png",
      sizes: "180x180",
      type: "image/png",
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F6F0E8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <InstallProvider>
          <div className="iserein-page-content">{children}</div>
          <BottomNav />
        </InstallProvider>
      </body>
    </html>
  );
}
