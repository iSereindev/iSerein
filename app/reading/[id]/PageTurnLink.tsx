import Link from "next/link";
import type { ReactNode } from "react";

type PageTurnLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

export default function PageTurnLink({
  href,
  children,
  className = "",
}: PageTurnLinkProps) {
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
