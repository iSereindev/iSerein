"use client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { communityClient, communityRpc, COMMUNITY_CHANGE, type CommunityProfile } from "@/lib/community-client";
export default function useCommunityAccount() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true, generation = 0;
    const refresh = async () => {
      const current = ++generation;
      try {
        const { data, error } = await communityClient().auth.getSession();
        if (error) throw error;
        if (!alive || current !== generation) return;
        setUser(data.session?.user || null);
        const p = data.session ? await communityRpc<CommunityProfile | null>("community_profile") : null;
        if (alive && current === generation) setProfile(p);
      } catch { if (alive && current === generation) setProfile(null); }
      finally { if (alive && current === generation) setLoading(false); }
    };
    void refresh();
    // Run outside the auth callback to avoid Supabase auth lock deadlocks.
    const { data } = communityClient().auth.onAuthStateChange(() => { queueMicrotask(() => void refresh()); });
    window.addEventListener(COMMUNITY_CHANGE, refresh);
    return () => { alive = false; generation++; data.subscription.unsubscribe(); window.removeEventListener(COMMUNITY_CHANGE, refresh); };
  }, []);
  return { user, profile, loading };
}
