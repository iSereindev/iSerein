"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Home", href: "/", icon: "home" },
  { label: "Topics", href: "/topics", icon: "topics" },
  { label: "Explore", href: "/explore", icon: "explore" },
  { label: "Profile", href: "/profile", icon: "profile" },
] as const;

type IconName = (typeof tabs)[number]["icon"];

function NavIcon({ name }: { name: IconName }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "home" && (
        <>
          <path d="m3 10 9-7 9 7" />
          <path d="M5 9v12h14V9" />
          <path d="M9 21v-8h6v8" />
        </>
      )}

      {name === "topics" && (
        <>
          <path d="M12 5v16" />
          <path d="M12 5C9 3 5 3 2 4v15c3-1 7-1 10 2" />
          <path d="M12 5c3-2 7-2 10-1v15c-3-1-7-1-10 2" />
        </>
      )}

      {name === "explore" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="m16 8-2.5 5.5L8 16l2.5-5.5L16 8Z" />
        </>
      )}

      {name === "profile" && (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
        </>
      )}
    </svg>
  );
}

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="iserein-bottom-nav" aria-label="Main navigation">
      <div className="iserein-bottom-nav-inner">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname === tab.href ||
                pathname.startsWith(`${tab.href}/`);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`iserein-nav-link${isActive ? " is-active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="iserein-nav-icon">
                <NavIcon name={tab.icon} />
              </span>

              <span className="iserein-nav-label">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}