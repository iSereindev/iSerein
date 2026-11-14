"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import useCommunityAccount from "./useCommunityAccount";
import { communityRpc, COMMUNITY_BUTTON as button, COMMUNITY_CHANGE, type Thread, type DiscussionComment } from "@/lib/community-client";

export default function Discussion({ articleId }: { articleId: number }) {
  const { user, profile, loading } = useCommunityAccount();
  const [thread, setThread] = useState<Thread | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [body, setBody] = useState("");
  const [parent, setParent] = useState<DiscussionComment | null>(null);
  const [edit, setEdit] = useState<number | null>(null);
  const [more, setMore] = useState(false);
  const [report, setReport] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [remove, setRemove] = useState<number | null>(null);
  const generation = useRef(0);
  const draftKey = `iserein-discussion-draft:${articleId}`;
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    try {
      const value = await communityRpc<Thread>("community_thread", { p_article: articleId });
      if (current !== generation.current) return;
      setThread(value); setMore(value.comments.length === 20);
    } catch (e) { if (current === generation.current) setMessage(e instanceof Error ? e.message : "Please try again."); }
  }, [articleId]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => void refresh());
    return () => { cancelAnimationFrame(frame); };
  }, [refresh, user?.id]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey) || "null");
      if (typeof draft?.body === "string") setBody(draft.body.slice(0,2000));
      if (draft?.parent && Number.isSafeInteger(draft.parent.id)) setParent(draft.parent);
    } catch { /* Invalid or unavailable local drafts do not block discussion. */ }
    const fromLink = () => { if (window.location.hash === "#discussion") setOpen(true); };
    fromLink(); });
    const fromLink = () => { if (window.location.hash === "#discussion") setOpen(true); };
    window.addEventListener("hashchange", fromLink);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("hashchange", fromLink); };
  }, [draftKey]);
  const saveDraft = (text: string, reply = parent) => {
    setBody(text);
    if (!edit) try { localStorage.setItem(draftKey, JSON.stringify({ body: text, parent: reply })); } catch { /* Keep in-memory text. */ }
  };
  async function run(work: () => Promise<void>, success = "") {
    if (busy) return;
    setBusy(true); setMessage("");
    try { await work(); setMessage(success); await refresh(); window.dispatchEvent(new Event(COMMUNITY_CHANGE)); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Please try again."); }
    finally { setBusy(false); }
  }
  function signIn() {
    try { localStorage.setItem("iserein-discussion-return", `/reading/${articleId}#discussion`); } catch { /* Sign-in remains usable. */ }
  }
  function clearComposer() {
    setBody(""); setParent(null); setEdit(null);
    try { localStorage.removeItem(draftKey); } catch { /* No persistent draft. */ }
  }
  return <details id="discussion" open={open} onToggle={event => setOpen(event.currentTarget.open)} className="mx-auto mt-6 max-w-2xl scroll-mt-6 border-t border-[#33241D]/15 pt-3 text-[#33241D]">
    <summary className="cursor-pointer py-3 text-sm font-medium">Discussion{thread ? ` · ${thread.count}` : ""}</summary>
    <p className="mb-4 text-xs text-[#75665C]">A public conversation. Be thoughtful, stay on topic. <Link href="/community-guidelines" className="underline">Guidelines</Link></p>
    {message && <p role="status" className="my-3 text-sm">{message}</p>}
    {!thread && <button type="button" className={button} onClick={() => void refresh()}>Retry loading</button>}
    {thread && <>
      <button type="button" className="mb-3 min-h-11 text-xs underline" disabled={busy} onClick={() => void refresh()}>Refresh conversation</button>
      {profile?.moderator && <button disabled={busy} type="button" className={button} onClick={() => void run(async () => {
        await communityRpc("community_moderate",{p_action:"close",p_id:articleId,p_flag:!thread.closed});
      })}>{thread.closed ? "Reopen discussion" : "Close discussion"}</button>}
      {thread.closed ? <p className="my-4 text-sm">This conversation is closed. You can still read it.</p> : <form className="my-4" onSubmit={e => { e.preventDefault(); void run(async () => {
        await communityRpc("community_comment",{p_article:articleId,p_body:body,p_parent:parent?.id || null,p_edit:edit});
        clearComposer();
      },edit ? "Comment updated." : "Comment posted."); }}>
        {(parent || edit) && <p className="mb-2 text-xs">{edit ? "Editing your comment" : `Replying to ${parent?.name}`} <button type="button" className="ml-2 underline" onClick={clearComposer}>Cancel</button></p>}
        <label className="block text-sm" htmlFor={`composer-${articleId}`}>What did this bring to mind?</label>
        <textarea id={`composer-${articleId}`} value={body} onChange={e => saveDraft(e.target.value)} maxLength={2000} rows={3}
          className="mt-2 w-full rounded-xl border border-[#33241D]/20 bg-[#FFFDF9] p-3 text-base" />
        <div className="flex flex-wrap items-center gap-2">
          {["❤️","💡","🤔"].map(emoji => <button type="button" key={emoji} aria-label={`Add ${emoji} to comment`} className="min-h-11 min-w-11" onClick={() => saveDraft((body + emoji).slice(0,2000))}>{emoji}</button>)}
          {!loading && user && profile ? <button disabled={busy || !body.trim() || profile.blocked} className={button}>{busy ? "Saving…" : edit ? "Save changes" : "Post comment"}</button> :
            <Link href="/profile#account" onClick={signIn} className={button}>{user ? "Choose a display name" : "Sign in to post"}</Link>}
        </div>
        <p className="mt-1 text-xs text-[#75665C]">Text or just an emoji. Your comment will be public.</p>
      </form>}
      {profile && <label className="my-4 flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={thread.following} disabled={busy} onChange={e => { const follow=e.target.checked; void run(async () => {
          await communityRpc("community_action",{p_action:follow?"follow":"unfollow",p_id:articleId});
        }); }} /> Show updates in My conversations
      </label>}
      {!thread.comments.length && <p className="py-5 text-sm text-[#75665C]">Be the first to share a thought.</p>}
      <ul className="divide-y divide-[#33241D]/10">{thread.comments.map(c => <li key={c.id} id={`comment-${c.id}`} className="py-5">
        <p className="text-sm font-medium">{c.name} {c.author && <span className="ml-1 rounded bg-[#5B3A2D]/10 px-2 py-1 text-xs">Author</span>}
          <time className="ml-2 text-xs font-normal text-[#75665C]" dateTime={c.created_at}>{new Date(c.created_at).toLocaleDateString()}{c.edited_at ? " · edited" : ""}</time></p>
        {c.parent_id && <p className="mt-2 border-l-2 border-[#33241D]/20 pl-3 text-xs text-[#75665C]">Reply to: {c.parent_body}</p>}
        <p className="my-3 whitespace-pre-wrap break-words text-sm leading-7">{c.body}</p>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {["❤️","💡","🤔"].map(emoji => <button disabled={busy || !profile} key={emoji} type="button" aria-label={`React ${emoji}: ${c.reactions?.[emoji] || 0}`} aria-pressed={c.my_reaction===emoji}
            className={`min-h-11 rounded-full px-2 ${c.my_reaction===emoji ? "bg-[#5B3A2D]/10" : ""}`}
            onClick={() => void run(async () => { await communityRpc("community_action",{p_action:"react",p_id:c.id,p_value:c.my_reaction===emoji?null:emoji}); })}>{emoji} {c.reactions?.[emoji] || ""}</button>)}
          {!thread.closed && <button type="button" className="min-h-11 underline" onClick={() => { setEdit(null); setParent(c); saveDraft(body,c); document.getElementById(`composer-${articleId}`)?.focus(); }}>Reply</button>}
          {c.mine && <><button disabled={busy || thread.closed} type="button" className="min-h-11 underline" onClick={() => { setEdit(c.id); setParent(null); setBody(c.body); }}>Edit</button><button type="button" className="min-h-11 underline" onClick={() => setRemove(c.id)}>Delete</button></>}
          {profile && !c.mine && <button type="button" className="min-h-11 underline" onClick={() => { setReport(c.id); setReason(""); }}>Report</button>}
          {profile?.moderator && <button type="button" disabled={busy} className="min-h-11 underline" onClick={() => void run(async () => { await communityRpc("community_moderate",{p_action:"hide",p_id:c.id}); },"Comment hidden.")}>Hide</button>}
        </div>
        {remove===c.id && <div className="text-sm">Delete this comment? <button disabled={busy} className={button} onClick={() => void run(async () => { await communityRpc("community_action",{p_action:"delete",p_id:c.id}); setRemove(null); },"Comment deleted.")}>Delete</button> <button className={button} onClick={() => setRemove(null)}>Cancel</button></div>}
        {report===c.id && <form className="mt-2" onSubmit={e => { e.preventDefault(); void run(async () => { await communityRpc("community_action",{p_action:"report",p_id:c.id,p_value:reason}); setReport(null); },"Report sent privately."); }}>
          <label className="text-sm">Why are you reporting this?<textarea required minLength={3} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} className="my-2 block w-full rounded border p-2" /></label>
          <button disabled={busy} className={button}>Send report</button> <button type="button" className={button} onClick={() => setReport(null)}>Cancel</button>
        </form>}
      </li>)}</ul>
      {more && <button type="button" disabled={busy} className={button} onClick={async () => {
        setBusy(true); setMessage("");
        try {
          const value=await communityRpc<Thread>("community_thread",{p_article:articleId,p_before:thread.comments.at(-1)?.id});
          setThread(current => current ? {...value,comments:[...current.comments,...value.comments.filter(c=>!current.comments.some(old=>old.id===c.id))]} : value); setMore(value.comments.length===20);
        } catch { setMessage("Couldn’t load more comments. Try again."); } finally { setBusy(false); }
      }}>View more</button>}
      {!profile && <p className="mt-3 text-xs"><Link href="/profile#account" onClick={signIn} className="underline">Sign in to reply or react</Link></p>}
    </>}
  </details>;
}
