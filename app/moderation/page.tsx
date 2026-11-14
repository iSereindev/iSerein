"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import useCommunityAccount from "@/app/community/useCommunityAccount";
import { communityRpc, COMMUNITY_BUTTON as button } from "@/lib/community-client";
type Report={id:number;reason:string;comment_id:number;body:string;article_id:number;reported_user:string|null;hidden:boolean;name:string};
export default function ModerationPage(){
 const {profile,loading}=useCommunityAccount();
 const [reports,setReports]=useState<Report[]>([]);
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 const [userId,setUserId]=useState("");
 const load=useCallback(async()=>{try{setReports(await communityRpc<Report[]>("community_moderate"));}catch(e){setMessage(e instanceof Error?e.message:"Please try again.");}},[]);
 useEffect(()=>{const frame=requestAnimationFrame(()=>{if(profile?.moderator)void load();});return()=>cancelAnimationFrame(frame);},[profile?.moderator,load]);
 async function act(action:string,id:number|null=null,user:string|null=null,flag=true){
 setBusy(true);setMessage("");
 try{await communityRpc("community_moderate",{p_action:action,p_id:id,p_user:user,p_flag:flag});await load();setMessage("Updated.");}catch(e){setMessage(e instanceof Error?e.message:"Please try again.");}finally{setBusy(false);}}
 return <main className="min-h-screen bg-[#F6F0E8] px-6 py-12 text-[#33241D]"><div className="mx-auto max-w-3xl"><Link href="/profile">← Profile</Link><h1 className="my-8 font-serif text-4xl">Discussion moderation</h1>
 {loading?<p>Checking access…</p>:!profile?.moderator?<p>Moderator access is required.</p>:<>
 <p className="mb-4 text-sm">Reports are private. You can also hide comments and close threads directly beneath an article.</p>
 <button className={button} onClick={()=>void load()}>Refresh reports</button>
 {!reports.length&&<p className="my-6">No open reports.</p>}
 {reports.map(r=><article className="my-5 rounded-xl border border-[#33241D]/20 p-5" key={r.id}>
 <p className="text-sm">{r.name||"Former reader"} · {r.hidden?"Hidden":"Visible"}</p><p className="my-3 whitespace-pre-wrap">{r.body}</p><p className="my-3 text-sm">Report: {r.reason}</p>
 <div className="flex flex-wrap gap-2"><Link className={button} href={`/reading/${r.article_id}#discussion`}>Open discussion</Link>
 <button disabled={busy} className={button} onClick={()=>void act("hide",r.comment_id,null,!r.hidden)}>{r.hidden?"Restore":"Hide"} comment</button>
 {r.reported_user&&<button disabled={busy} className={button} onClick={()=>{if(window.confirm("Restrict this reader from posting?"))void act("block",null,r.reported_user);}}>Restrict reader</button>}
 <button disabled={busy} className={button} onClick={()=>void act("resolve",r.id)}>Resolve report</button></div></article>)}
 <details className="mt-8"><summary>Restore a restricted reader</summary><label className="my-3 block text-sm">Account ID<input value={userId} onChange={e=>setUserId(e.target.value)} className="my-2 block w-full rounded border p-2"/></label><button disabled={busy||!/^[0-9a-f-]{36}$/i.test(userId)} className={button} onClick={()=>void act("block",null,userId,false)}>Restore posting access</button></details>
 </>}
 {message&&<p role="status" className="my-4">{message}</p>}
 </div></main>;
}
