import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Throws unless the caller (verified by the auth middleware) is an admin. */
export async function assertAdminId(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("للمديرين فقط");
}
