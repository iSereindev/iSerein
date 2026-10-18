import Link from "next/link";
import { getTopicTheme } from "@/lib/reading-theme";

const topics = [
  {
    name: "Self",
    description: "Mind, emotions, identity & confidence",
    introduction: "A little space to understand yourself.",
    href: "/topics/Self",
    theme: getTopicTheme("Self"),
  },
  {
    name: "Life",
    description: "Love, relationships, work & meaning",
    introduction: "Thoughtful pages for being human.",
    href: "/topics/Life",
    theme: getTopicTheme("Life"),
  },
  {
    name: "Growth",
    description: "Courage, habits, learning & resilience",
    introduction: "Small steps toward who you are becoming.",
    href: "/topics/Growth",
    theme: getTopicTheme("Growth"),
  },
];

export default function TopicsPage() {
  return (
    <main className="min-h-screen bg-[#F6F0E8] text-[#33241D]">
      <header className="border-b border-[#33241D]/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 md:px-10">
          <Link href="/" className="iserein-brand text-xl">
            iSEREIN
          </Link>

          <span className="text-xs uppercase tracking-[0.2em] text-[#75665C]">
            The collection
          </span>
        </div>
      </header>

      <section className="px-6 pb-12 pt-14 md:px-10 md:pb-16 md:pt-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-4">
            <span className="h-px w-12 bg-[#A7784D]" />

            <p className="text-xs font-medium uppercase tracking-[0.28em] text-[#8C5F42]">
              A page for every part of you
            </p>
          </div>

          <h1 className="mt-7 font-serif text-5xl font-normal tracking-tight md:text-7xl">
            Topics
          </h1>

          <p className="mt-6 max-w-xl font-serif text-lg leading-8 text-[#75665C] md:text-xl">
            Begin wherever you are today. Choose a topic and discover
            a page to spend a little time with.
          </p>
        </div>
      </section>

      <section
        aria-label="Reading topics"
        className="px-6 pb-20 md:px-10 md:pb-28"
      >
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
          {topics.map((topic, index) => (
            <Link
              key={topic.name}
              href={topic.href}
              className="group flex flex-col overflow-hidden rounded-[1.75rem] border border-[#33241D]/10 bg-[#FFFDF9] shadow-[0_8px_28px_rgba(51,36,29,0.045)] transition-shadow hover:shadow-[0_14px_36px_rgba(51,36,29,0.09)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8C5F42]"
            >
              <div
                className="relative flex min-h-[190px] flex-col justify-between p-8 text-[#33241D]"
                style={{ backgroundColor: topic.theme.surface }}
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-3 rounded-[1.1rem] border border-[#33241D]/15"
                />

                <span className="relative text-xs tracking-[0.2em] text-[#33241D]">
                  CHAPTER {String(index + 1).padStart(2, "0")}
                </span>

                <h2 className="relative mt-10 font-serif text-4xl font-normal">
                  {topic.name}
                </h2>
              </div>

              <div className="flex flex-1 flex-col p-7 md:p-8">
                <p className="font-serif text-xl leading-8 text-[#33241D]">
                  {topic.introduction}
                </p>

                <p className="mt-4 text-sm leading-7 text-[#75665C]">
                  {topic.description}
                </p>

                <div className="mt-auto pt-8">
                  <span
                    className="inline-flex items-center gap-3 rounded-full px-5 py-3 text-sm font-medium"
                    style={{
                      color: topic.theme.accent,
                      backgroundColor: topic.theme.soft,
                    }}
                  >
                    Explore {topic.name}
                    <span aria-hidden="true">→</span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#33241D]/10 px-6 py-12 text-center">
        <p className="font-serif text-xl italic text-[#75665C]">
          Different chapters. One meaningful life.
        </p>

        <p className="iserein-footer-brand mt-6">iSEREIN</p>
      </footer>
    </main>
  );
}
