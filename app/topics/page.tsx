import Link from "next/link";

const topics = [
  {
    name: "Self",
    description: "Mind, emotions, identity & confidence",
    introduction: "A little space to understand yourself.",
    href: "/topics/Self",
    color: "#6B2636",
    background: "#F1E4E7",
  },
  {
    name: "Life",
    description: "Love, relationships, work & meaning",
    introduction: "Thoughtful pages for being human.",
    href: "/topics/Life",
    color: "#173A70",
    background: "#E5EBF4",
  },
  {
    name: "Growth",
    description: "Courage, habits, learning & resilience",
    introduction: "Small steps toward who you are becoming.",
    href: "/topics/Growth",
    color: "#0D3B33",
    background: "#E3ECE8",
  },
];

export default function TopicsPage() {
  return (
    <main className="min-h-screen bg-[#E8EEF4] text-[#44313D]">
      <header className="border-b border-[#44313D]/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 md:px-10">
          <Link href="/" className="iserein-brand text-xl">
            iSEREIN
          </Link>

          <span className="text-xs uppercase tracking-[0.2em] text-[#5F6975]">
            The collection
          </span>
        </div>
      </header>

      <section className="px-6 pb-12 pt-14 md:px-10 md:pb-16 md:pt-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-4">
            <span className="h-px w-12 bg-[#C6A96B]" />

            <p className="text-xs font-medium uppercase tracking-[0.28em] text-[#7F6A39]">
              A page for every part of you
            </p>
          </div>

          <h1 className="mt-7 font-serif text-5xl font-normal tracking-tight md:text-7xl">
            Topics
          </h1>

          <p className="mt-6 max-w-xl font-serif text-lg leading-8 text-[#5F6975] md:text-xl">
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
              className="group flex flex-col overflow-hidden rounded-[1.75rem] border border-[#44313D]/10 bg-[#F7F8F9] shadow-[0_12px_35px_rgba(68,49,61,0.05)] transition-shadow hover:shadow-[0_20px_50px_rgba(68,49,61,0.12)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7F6A39]"
            >
              <div
                className="relative flex min-h-[190px] flex-col justify-between p-8 text-[#FFF7F0]"
                style={{ backgroundColor: topic.color }}
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-3 rounded-[1.1rem] border border-[#D7C28A]/35"
                />

                <span className="relative text-xs tracking-[0.2em] text-[#EAD5A6]">
                  CHAPTER {String(index + 1).padStart(2, "0")}
                </span>

                <h2 className="relative mt-10 font-serif text-4xl font-normal">
                  {topic.name}
                </h2>
              </div>

              <div className="flex flex-1 flex-col p-7 md:p-8">
                <p className="font-serif text-xl leading-8 text-[#44313D]">
                  {topic.introduction}
                </p>

                <p className="mt-4 text-sm leading-7 text-[#5F6975]">
                  {topic.description}
                </p>

                <div className="mt-auto pt-8">
                  <span
                    className="inline-flex items-center gap-3 rounded-full px-5 py-3 text-sm font-medium"
                    style={{
                      color: topic.color,
                      backgroundColor: topic.background,
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

      <footer className="border-t border-[#44313D]/10 px-6 py-12 text-center">
        <p className="font-serif text-xl italic text-[#5F6975]">
          Different chapters. One meaningful life.
        </p>

        <p className="iserein-footer-brand mt-6">iSEREIN</p>
      </footer>
    </main>
  );
}