"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PageTurnLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

export default function PageTurnLink({
  href,
  children,
  className = "",
}: PageTurnLinkProps) {
  const router = useRouter();
  const [transitioning, setTransitioning] = useState(false);

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();

    if (transitioning) {
      return;
    }

    setTransitioning(true);

    // Start loading the next reading while the flower blooms.
    window.setTimeout(() => {
      router.push(href);
    }, 520);
  }

  return (
    <>
      <a
        href={href}
        onClick={handleClick}
        className={className}
        aria-busy={transitioning}
      >
        {children}
      </a>

      {transitioning && (
        <div
          className="fixed inset-0 z-[999] overflow-hidden"
          aria-hidden="true"
        >
          {/* Keep the current page visible underneath */}
          <div className="absolute inset-0 bg-[#0D1117]/25 backdrop-blur-[2px]" />

          {/* Soft central glow */}
          <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F4EFE3]/10 blur-3xl" />

          {/* iSEREIN flower */}
          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2">
            <div className="flower absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2">
              {/* Petal 1 */}
              <span className="petal petal-1" />

              {/* Petal 2 */}
              <span className="petal petal-2" />

              {/* Petal 3 */}
              <span className="petal petal-3" />

              {/* Petal 4 */}
              <span className="petal petal-4" />

              {/* Petal 5 */}
              <span className="petal petal-5" />

              {/* Petal 6 */}
              <span className="petal petal-6" />

              {/* Petal 7 */}
              <span className="petal petal-7" />

              {/* Petal 8 */}
              <span className="petal petal-8" />

              {/* Flower centre */}
              <span className="flower-center" />
            </div>

            {/* Brand */}
            <div className="absolute left-1/2 top-[calc(50%+110px)] -translate-x-1/2 text-center">
              <p className="whitespace-nowrap font-serif text-lg italic tracking-wide text-[#F4EFE3]">
                iSEREIN
              </p>

              <div className="mx-auto mt-3 h-px w-10 bg-[#C8A96B]" />
            </div>
          </div>

          <style jsx>{`
            .flower {
              animation:
                flower-bloom 850ms cubic-bezier(0.22, 1, 0.36, 1) forwards,
                flower-breathe 1200ms ease-in-out 220ms forwards;
              transform-origin: center;
            }

            .petal {
              position: absolute;
              left: 50%;
              top: 50%;
              width: 28px;
              height: 74px;
              margin-left: -14px;
              margin-top: -37px;
              border-radius: 50% 50% 45% 45%;
              background: linear-gradient(
                180deg,
                #f4efe3 0%,
                #d9ceb9 100%
              );
              box-shadow:
                inset 0 0 0 1px rgba(200, 169, 107, 0.28),
                0 8px 24px rgba(0, 0, 0, 0.14);
              opacity: 0;
              transform-origin: center bottom;
              animation-duration: 780ms;
              animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
              animation-fill-mode: forwards;
            }

            .petal-1 {
              transform: rotate(0deg) translateY(-7px) scaleY(0.1);
              animation-name: bloom-1;
              animation-delay: 40ms;
            }

            .petal-2 {
              transform: rotate(45deg) translateY(-7px) scaleY(0.1);
              animation-name: bloom-2;
              animation-delay: 80ms;
            }

            .petal-3 {
              transform: rotate(90deg) translateY(-7px) scaleY(0.1);
              animation-name: bloom-3;
              animation-delay: 120ms;
            }

            .petal-4 {
              transform: rotate(135deg) translateY(-7px) scaleY(0.1);
              animation-name: bloom-4;
              animation-delay: 160ms;
            }

            .petal-5 {
              transform: rotate(180deg) translateY(-7px) scaleY(0.1);
              animation-name: bloom-5;
              animation-delay: 200ms;
            }

            .petal-6 {
              transform: rotate(225deg) translateY(-7px) scaleY(0.1);
              animation-name: bloom-6;
              animation-delay: 240ms;
            }

            .petal-7 {
              transform: rotate(270deg) translateY(-7px) scaleY(0.1);
              animation-name: bloom-7;
              animation-delay: 280ms;
            }

            .petal-8 {
              transform: rotate(315deg) translateY(-7px) scaleY(0.1);
              animation-name: bloom-8;
              animation-delay: 320ms;
            }

            .flower-center {
              position: absolute;
              left: 50%;
              top: 50%;
              width: 22px;
              height: 22px;
              transform: translate(-50%, -50%) scale(0);
              border-radius: 9999px;
              background: #c8a96b;
              box-shadow: 0 0 30px rgba(200, 169, 107, 0.45);
              animation: center-bloom 600ms
                cubic-bezier(0.22, 1, 0.36, 1) 280ms forwards;
            }

            @keyframes bloom-1 {
              0% {
                opacity: 0;
                transform: rotate(0deg) translateY(-7px) scaleY(0.1);
              }

              100% {
                opacity: 1;
                transform: rotate(0deg) translateY(-48px) scaleY(1);
              }
            }

            @keyframes bloom-2 {
              0% {
                opacity: 0;
                transform: rotate(45deg) translateY(-7px) scaleY(0.1);
              }

              100% {
                opacity: 1;
                transform: rotate(45deg) translateY(-48px) scaleY(1);
              }
            }

            @keyframes bloom-3 {
              0% {
                opacity: 0;
                transform: rotate(90deg) translateY(-7px) scaleY(0.1);
              }

              100% {
                opacity: 1;
                transform: rotate(90deg) translateY(-48px) scaleY(1);
              }
            }

            @keyframes bloom-4 {
              0% {
                opacity: 0;
                transform: rotate(135deg) translateY(-7px) scaleY(0.1);
              }

              100% {
                opacity: 1;
                transform: rotate(135deg) translateY(-48px) scaleY(1);
              }
            }

            @keyframes bloom-5 {
              0% {
                opacity: 0;
                transform: rotate(180deg) translateY(-7px) scaleY(0.1);
              }

              100% {
                opacity: 1;
                transform: rotate(180deg) translateY(-48px) scaleY(1);
              }
            }

            @keyframes bloom-6 {
              0% {
                opacity: 0;
                transform: rotate(225deg) translateY(-7px) scaleY(0.1);
              }

              100% {
                opacity: 1;
                transform: rotate(225deg) translateY(-48px) scaleY(1);
              }
            }

            @keyframes bloom-7 {
              0% {
                opacity: 0;
                transform: rotate(270deg) translateY(-7px) scaleY(0.1);
              }

              100% {
                opacity: 1;
                transform: rotate(270deg) translateY(-48px) scaleY(1);
              }
            }

            @keyframes bloom-8 {
              0% {
                opacity: 0;
                transform: rotate(315deg) translateY(-7px) scaleY(0.1);
              }

              100% {
                opacity: 1;
                transform: rotate(315deg) translateY(-48px) scaleY(1);
              }
            }

            @keyframes center-bloom {
              0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0);
              }

              70% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.15);
              }

              100% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
              }
            }

            @keyframes flower-bloom {
              0% {
                transform: scale(0.72);
              }

              60% {
                transform: scale(1.04);
              }

              100% {
                transform: scale(1);
              }
            }

            @keyframes flower-breathe {
              0% {
                transform: scale(1);
              }

              100% {
                transform: scale(1.035);
              }
            }
          `}</style>
        </div>
      )}
    </>
  );
}