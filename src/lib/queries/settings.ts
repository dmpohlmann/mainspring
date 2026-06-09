import { createClient } from "@/lib/supabase/server";
import type { Settings } from "@/lib/types/database";

export async function getSettings(): Promise<Settings | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}
