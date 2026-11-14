"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { communityClient } from "@/lib/community-client";
export default function ConfirmPage() {
  const [message, setMessage] = useState("Confirming your sign-in…");
  useEffect(() => {
    let alive = true;
    void communityClient().auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error || !data.session) { setMessage("This sign-in link has expired or belongs to another browser. Request a new link from Profile."); return; }
      // Stored locally by the composer; never trust an arbitrary redirect URL.
      let target: string | null = null;
      try { target = localStorage.getItem("iserein-discussion-return"); localStorage.removeItem("iserein-discussion-return"); } catch { /* A blocked store must not block sign-in. */ }
      window.location.replace(target && /^\/reading\/[1-9]\d*#discussion$/.test(target) ? target : "/profile#account");
    }).catch(() => { if (alive) setMessage("Sign-in could not be confirmed. Please try again."); });
    return () => { alive = false; };
  }, []);
  return <main className="min-h-screen bg-[#F6F0E8] px-6 py-20 text-[#33241D]"><div className="mx-auto max-w-lg"><h1 className="font-serif text-3xl">Welcome to iSEREIN</h1><p role="status" className="my-6">{message}</p><Link href="/profile#account" className="underline">Go to Profile</Link></div></main>;
}
