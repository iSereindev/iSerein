import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata({
  title: "Saved",
  description: "Return to the readings and books you saved on this device.",
  path: "/profile",
  index: false,
});

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return children;
}
