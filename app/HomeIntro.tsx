"use client";

import { useEffect, useState } from "react";

type Stage = "hello" | "statement" | "bloom" | "home";

export default function HomeIntro({
  children,
}: {
  children: React.ReactNode;
}) {
  const [stage, setStage] = useState<Stage>("hello");

  useEffect(() => {
    const statementTimer = setTimeout(() => {
      setStage("statement");
    }, 2200);

    const bloomTimer = setTimeout(() => {
      setStage("bloom");
    }, 4300);

    const homeTimer = setTimeout(() => {
      setStage("home");
    }, 5900);

    return () => {
      clearTimeout(statementTimer);
      clearTimeout(bloomTimer);
      clearTimeout(homeTimer);
    };
  }, []);

  return (
    <>
      {/* HOMEPAGE */}
      <div
        className={
          stage === "home"
            ? "iserein-home-reveal iserein-home-reveal-visible"
            : "iserein-home-reveal"
        }
      >
        {children}
      </div>

      {/* INTRO */}
      {stage !== "home" && (
        <div
          className={`iserein-intro ${
            stage === "bloom" ? "iserein-bloom-stage" : ""
          }`}
        >
          {/* Soft background glows */}
          <div className="iserein-glow iserein-glow-one" />
          <div className="iserein-glow iserein-glow-two" />

          {/* Floating petals */}
          <div className="iserein-petal petal-one" />
          <div className="iserein-petal petal-two" />
          <div className="iserein-petal petal-three" />
          <div className="iserein-petal petal-four" />
          <div className="iserein-petal petal-five" />
          <div className="iserein-petal petal-six" />
          <div className="iserein-petal petal-seven" />
          <div className="iserein-petal petal-eight" />

          {/* Intro words */}
          <div className="iserein-intro-content">
            {stage === "hello" && (
              <div className="iserein-hello">
                <div className="iserein-small-flower">✾</div>

                <h1>Hello.</h1>
              </div>
            )}

            {stage === "statement" && (
              <div className="iserein-statement">
                <div className="iserein-small-flower">✾</div>

                <h1>
                  Something Worth Reading
                  <br />
                  <span>Every Day.</span>
                </h1>

                <div className="iserein-line" />
              </div>
            )}
          </div>

          {/* VIOLET FLOWER BLOOM */}
          {stage === "bloom" && (
            <div className="iserein-flower-bloom">
              <div className="iserein-flower-glow" />

              <div className="iserein-flower">
                <span className="flower-petal flower-petal-1" />
                <span className="flower-petal flower-petal-2" />
                <span className="flower-petal flower-petal-3" />
                <span className="flower-petal flower-petal-4" />
                <span className="flower-petal flower-petal-5" />
                <span className="flower-petal flower-petal-6" />
                <span className="flower-petal flower-petal-7" />
                <span className="flower-petal flower-petal-8" />

                <span className="flower-center" />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}