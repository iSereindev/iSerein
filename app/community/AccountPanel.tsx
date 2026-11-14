"use client";
import { useState } from "react";
import Link from "next/link";
import useCommunityAccount from "./useCommunityAccount";
import { COMMUNITY_BUTTON as button, COMMUNITY_CHANGE, communityClient, communityRpc } from "@/lib/community-client";

export default function AccountPanel() {
  const { user, profile, loading } = useCommunityAccount();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  async function run(work: () => Promise<void>) {
    setBusy(true); setMessage("");
    try { await work(); window.dispatchEvent(new Event(COMMUNITY_CHANGE)); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Please try again."); }
    finally { setBusy(false); }
  }
  return <section id="account" aria-label="Discussion account" className="my-8 max-w-xl rounded-2xl border border-[#33241D]/15 bg-[#FFFDF9] p-5">
    <h2 className="font-serif text-2xl">{profile ? profile.name : "Join the conversation"}</h2>
    {loading ? <p role="status" className="mt-3 text-sm">Checking your account…</p> : user ? <>
      <p className="mt-2 text-sm text-[#75665C]">Signed in as {user.email}. Your email is private.</p>
      <form className="mt-4 flex flex-wrap gap-3" onSubmit={e => { e.preventDefault(); void run(async () => {
        await communityRpc("community_profile", { p_name: name.trim() }); setMessage("Display name saved.");
      }); }}>
        <label className="w-full text-sm">Public display name
          <input value={name} placeholder={profile?.name || "Choose a display name"} onChange={e => setName(e.target.value)} required minLength={2} maxLength={40} className="mt-2 min-h-11 w-full rounded-lg border border-[#33241D]/20 bg-transparent px-3" />
        </label>
        <button disabled={busy || name.trim().length < 2} className={button}>Save name</button>
        <button type="button" disabled={busy} className={button} onClick={() => void run(async () => {
          const { error } = await communityClient().auth.signOut(); if (error) throw error; setMessage("Signed out.");
        })}>Sign out</button>
      </form>
      {profile?.moderator && <Link href="/moderation" className="mt-4 inline-block text-sm underline">Manage discussions →</Link>}
      <details className="mt-5 text-sm"><summary className="cursor-pointer">Account settings</summary>
        <p className="my-3">Deleting your account removes your comments, reactions, and discussion updates. Saved items on this device remain.</p>
        {!deleting ? <button type="button" className={button} onClick={() => setDeleting(true)}>Delete account…</button> :
          <div><label>Type DELETE to confirm<input className="my-2 block rounded border p-2" value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>
            <button disabled={busy || confirmation !== "DELETE"} className={button} onClick={() => void run(async () => {
              await communityRpc("community_delete_account"); await communityClient().auth.signOut(); setDeleting(false); setConfirmation(""); setMessage("Account deleted.");
            })}>Permanently delete account</button></div>}
      </details>
    </> : <>
      <p className="mt-2 text-sm leading-6 text-[#75665C]">Sign in to post or reply. Reading and saved collections don’t need an account.</p>
      <form className="mt-4 space-y-3" onSubmit={e => { e.preventDefault(); void run(async () => {
        const { error } = await communityClient().auth.signInWithOtp({
          email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
        });
        if (error) throw new Error(error.message);
        setMessage("Check your email for a sign-in link. Open it in this browser.");
      }); }}>
        <label className="block text-sm">Email<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-[#33241D]/20 bg-transparent px-3" /></label>
        <button disabled={busy} className={button}>{busy ? "Sending…" : "Email me a sign-in link"}</button>
      </form>
      <p className="mt-3 text-xs text-[#75665C]">This signs you in; it doesn’t subscribe you to emails. <Link href="/community-guidelines" className="underline">Community & privacy</Link></p>
    </>}
    {message && <p role="status" className="mt-3 text-sm">{message}</p>}
  </section>;
}
