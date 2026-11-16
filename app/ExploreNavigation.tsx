import Link from "next/link";
export default function ExploreNavigation({ watch = false }: { watch?: boolean }) {
  return <nav aria-label="Explore sections" className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-6 pt-6 md:px-10">
    {[{label:"Books",caption:"Selected reads",href:"/explore",active:!watch},
      {label:"Watch",caption:"Videos & podcast shorts",href:"/watch",active:watch}].map(item => (
      <Link key={item.href} href={item.href} aria-current={item.active ? "page" : undefined}
        className={`min-w-0 rounded-2xl border-2 bg-[#FFFDF9] p-4 text-[#33241D] transition-colors hover:border-[#5B3A2D] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#5B3A2D] ${item.active ? "border-[#5B3A2D]" : "border-[#33241D]/15"}`}>
        <span className="block font-serif text-2xl">{item.label}</span>
        <span className="mt-1 block text-xs leading-5 text-[#75665C]">{item.caption}</span>
      </Link>
    ))}
  </nav>;
}
