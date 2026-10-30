import type { Metadata } from "next";

export const SITE_URL = "https://iserein.app";
export const SITE_DESCRIPTION =
  "One thoughtful page a day. Explore readings about Self, Life, and Growth.";

export function pageMetadata({
  title,
  description,
  path,
  article = false,
  image = "/opengraph-image",
  index = true,
}: {
  title: string;
  description: string;
  path: string;
  article?: boolean;
  image?: string;
  index?: boolean;
}): Metadata {
  const fullTitle = title.includes("iSEREIN") ? title : `${title} — iSEREIN`;
  const images = [{ url: image, width: 1200, height: 630, alt: fullTitle }];
  return {
    title: fullTitle,
    description,
    alternates: { canonical: path },
    ...(index ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      type: article ? "article" : "website",
      siteName: "iSEREIN",
      locale: "en_US",
      title: fullTitle,
      description,
      url: path,
      images,
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images },
  };
}
