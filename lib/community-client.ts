"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;
export function communityClient() {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      auth: { storageKey: "iserein-community-auth", flowType: "pkce", detectSessionInUrl: true },
      global: { fetch: (input, init) => fetch(input, { ...init,
        signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000),
      }) },
    });
  }
  return client;
}
export async function communityRpc<T>(name: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await communityClient().rpc(name, params);
  if (error) {
    if (error.code === "P0001") throw new Error(error.message);
    throw new Error("We couldn’t load or save this conversation. Please try again.");
  }
  return data as T;
}
export type CommunityProfile = { id: string; name: string; moderator: boolean; blocked: boolean };
export type DiscussionComment = {
  id: number; body: string; parent_id: number | null; parent_body: string | null;
  name: string; author: boolean; mine: boolean; created_at: string; edited_at: string | null;
  reactions: Record<string, number> | null; my_reaction: string | null;
};
export type Thread = { count: number; closed: boolean; following: boolean; comments: DiscussionComment[] };
export const COMMUNITY_CHANGE = "iserein-community-change";
export const COMMUNITY_BUTTON = "min-h-11 rounded-full border border-[#5B3A2D]/25 px-4 py-2 text-sm text-[#5B3A2D] disabled:opacity-40";
