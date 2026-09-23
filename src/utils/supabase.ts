import { createClient } from "@supabase/supabase-js";

const url =
  import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase = url && key ? createClient(url, key) : null;

export type UserRole = "admin" | "god";

export async function getProfile(userId: string) {
  if (!supabase) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, email, display_name, role, active")
    .eq("id", userId)
    .maybeSingle();
  return data as {
    id: string;
    email: string;
    display_name: string;
    role: UserRole;
    active: boolean;
  } | null;
}

export async function updateProfileName(userId: string, displayName: string) {
  if (!supabase) return { error: new Error("Supabase is not configured.") };
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", userId);
  return { error };
}

export async function authorizedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const session = await supabase?.auth.getSession();
  const headers = new Headers(init.headers);
  if (session?.data.session?.access_token)
    headers.set("Authorization", `Bearer ${session.data.session.access_token}`);
  return fetch(input, { ...init, headers });
}

export async function uploadArchiveImage(file: File, folder = "records") {
  if (!supabase)
    return { url: null, error: new Error("Supabase is not configured.") };
  const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from("archive-images")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) return { url: null, error };
  const { data } = supabase.storage.from("archive-images").getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}
