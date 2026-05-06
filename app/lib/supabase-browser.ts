"use client";

import { createClient } from "@supabase/supabase-js";

export function getSupabaseBrowser() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://missing-supabase-url.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "missing-supabase-anon-key",
  );
}
