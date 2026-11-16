"use client";
import Link from "next/link";
import { discussionHref } from "@/lib/discussion-target";
import { useCallback, useEffect, useRef, useState } from "react";
import BrandLogo from "@/app/BrandLogo";
import useCommunityAccount from "@/app/community/useCommunityAccount";
import { communityRpc, COMMUNITY_BUTTON as button, COMMUNITY_CHANGE } from "@/lib/community-client";
type Row = { id:number; title:string; topic:string; count:number; latest:string };
type Update = { id:number; article_id:number; comment_id:number; title:string; seen:boolean; created_at:string };
export default function DiscussionsPage() {
 const { user,loading }=useCommunityAccount();
 const [topic,setTopic]=useState("");
 const [mine,setMine]=useState(false);
 const [rows,setRows]=useState<Row[]>([]);
 const [updates,setUpdates]=useState<Update[]>([]);
 const [busy,setBusy]=useState(true);
 const [more,setMore]=useState(false);
 const [error,setError]=useState("");
 const request=useRef(0);
 const load=useCallback(async () => {
   const generation=++request.current;
   setBusy(true);setError("");
   try {
     const list=await communityRpc<Row[]>("community_directory",{p_topic:topic||null,p_mine:mine});
     if(generation!==request.current)return;
     setRows(list);setMore(list.length===10);
     const inbox=user ? await communityRpc<Update[]>("community_inbox") : [];
     if(generation===request.current)setUpdates(inbox);
   }catch {if(generation===request.current)setError("Conversations couldn’t be loaded. Please try again.");}
   finally{if(generation===request.current)setBusy(false);}
 },[topic,mine,user]);
 useEffect(()=>{const frame=requestAnimationFrame(()=>void load());return()=>{cancelAnimationFrame(frame);};},[load]);
 return <main className="min-h-screen bg-[#F6F0E8] px-6 py-8 text-[#33241D]"><div className="mx-auto max-w-3xl">
   <Link href="/" className="iserein-brand"><BrandLogo /></Link>
   <h1 className="mt-12 font-serif text-5xl">Discussions</h1><p className="mt-4 text-[#75665C]">Thoughts worth sharing.</p>
   <div className="my-8 flex flex-wrap gap-4">
     <label className="sr-only" htmlFor="discussion-topic">Topic</label><select id="discussion-topic" value={topic} onChange={e=>setTopic(e.target.value)} className="min-h-11 rounded-full border border-[#33241D]/20 bg-transparent px-4">
       <option value="">All topics</option>{["Self","Life","Growth","Video"].map(t=><option key={t}>{t}</option>)}
     </select>
     <button className={button} aria-pressed={mine} onClick={()=>setMine(!mine)}>My conversations</button>
   </div>
   {mine && !user && !loading && <p className="my-4 text-sm"><Link className="underline" href="/profile#account">Sign in</Link> to find your conversations.</p>}
   {mine && user && <details className="mb-5 rounded-xl border border-[#33241D]/15 p-4"><summary className="cursor-pointer text-sm">Conversation updates · {updates.filter(u=>!u.seen).length} new</summary>
     {updates.length ? <><ul className="divide-y divide-[#33241D]/10">{updates.map(u=><li key={u.id} className="py-3 text-sm"><Link href={discussionHref(u.article_id)}>{!u.seen && "• "}{u.title} →</Link></li>)}</ul>
       <button className={button} onClick={async()=>{try{await communityRpc("community_inbox",{p_mark:true});setUpdates(updates.map(u=>({...u,seen:true})));window.dispatchEvent(new Event(COMMUNITY_CHANGE));}catch{setError("Couldn’t mark updates as read.");}}}>Mark all read</button></> : <p className="mt-3 text-sm text-[#75665C]">Follow a conversation to see new comments here.</p>}
   </details>}
   {error && <p role="alert" className="my-4 text-sm">{error} <button className="underline" onClick={()=>void load()}>Retry</button></p>}
   {busy && !rows.length && <p role="status">Loading conversations…</p>}
   {!busy && !error && !rows.length && <div className="py-10"><h2 className="font-serif text-2xl">{mine ? "Your conversations begin with a thought." : "A conversation starts with you."}</h2><p className="my-4 text-sm text-[#75665C]">Choose a reading or video and share what it brought to mind.</p><Link className="underline" href="/topics">Explore topics →</Link></div>}
   <ul className="divide-y divide-[#33241D]/15">{rows.map(row=><li key={row.id} className="py-6"><Link href={discussionHref(row.id)} className="block"><h2 className="font-serif text-2xl">{row.title}</h2><p className="mt-2 text-sm text-[#75665C]">{row.topic} · {row.count} {Number(row.count)===1?"comment":"comments"} · {new Date(row.latest).toLocaleDateString()}</p></Link></li>)}</ul>
   {more && <button disabled={busy} className={button} onClick={async()=>{
     const generation=request.current;setBusy(true);
     try{const next=await communityRpc<Row[]>("community_directory",{p_topic:topic||null,p_mine:mine,p_offset:rows.length});
       if(generation===request.current){setRows(current=>[...current,...next.filter(n=>!current.some(r=>r.id===n.id))]);setMore(next.length===10);}
     }catch{setError("Couldn’t load more. Please try again.");}finally{if(generation===request.current)setBusy(false);}
   }}>Load more</button>}
   <p className="mt-10 text-xs text-[#75665C]"><Link href="/community-guidelines" className="underline">Community guidelines & privacy</Link></p>
 </div></main>;
}
