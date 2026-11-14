import Link from "next/link";
export default function ExploreNavigation({watch=false}:{watch?:boolean}){
 return <nav aria-label="Explore sections" className="mx-auto flex max-w-7xl gap-2 px-6 pt-6 md:px-10">
 {([{label:"Books",href:"/explore",active:!watch},{label:"Watch",href:"/watch",active:watch}]).map(item=><Link key={item.href} href={item.href} aria-current={item.active?"page":undefined} className={`min-h-11 rounded-full border border-[#5B3A2D]/20 px-6 py-3 text-sm ${item.active?"bg-[#5B3A2D] text-[#FFF9F0]":"text-[#5B3A2D]"}`}>{item.label}</Link>)}
 </nav>;
}
