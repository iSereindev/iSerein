import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getPublishedArticle } from "@/lib/articles";
import { getPublicationDate } from "@/lib/publication";

export default async function ReadingLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Validate before this segment's loading boundary can start streaming a 200.
  const article = await getPublishedArticle(id, getPublicationDate());
  if (!article) notFound();
  return children;
}
