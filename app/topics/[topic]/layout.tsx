import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getTopicName } from "@/lib/topics";

export default async function TopicLayout({ children, params }: {
  children: ReactNode;
  params: Promise<{ topic: string }>;
}) {
  if (!getTopicName((await params).topic)) notFound();
  return children;
}
