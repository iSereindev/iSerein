import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import BottomNav from "./BottomNav";
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
  title: "iSEREIN — A page for yourself",
  description:
    "One thoughtful page a day. Explore readings about Self, Life, and Growth.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="iserein-page-content">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}