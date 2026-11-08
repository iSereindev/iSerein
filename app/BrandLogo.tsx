import type { SVGProps } from "react";
import { OPEN_PAGE_PATHS } from "@/lib/brand";

export function OpenPageMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="16 64 480 144"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {OPEN_PAGE_PATHS.map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

export default function BrandLogo() {
  return (
    <span className="iserein-brand-lockup">
      <OpenPageMark className="iserein-brand-mark" />
      <span>iSEREIN</span>
    </span>
  );
}
