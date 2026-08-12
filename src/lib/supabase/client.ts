"use client";
import { createBrowserClient } from "@supabase/ssr";
import { SCHEMA } from "./schema";

export function criarClienteBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: SCHEMA } },
  );
}
