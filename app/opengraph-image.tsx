import { shareImage } from "@/lib/share-image";

export const alt = "iSEREIN — Something worth reading. Every day.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return shareImage({
    title: "Something worth reading. Every day.",
    description: "One thoughtful page about the self, life, and change.",
  });
}
