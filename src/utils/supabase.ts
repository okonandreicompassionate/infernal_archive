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

async function compressArchiveImage(file: File) {
  if (
    !file.type.startsWith("image/") ||
    file.type === "image/gif" ||
    file.type === "image/svg+xml"
  ) {
    return file;
  }

  try {
    const sourceUrl = URL.createObjectURL(file);
    const image = new Image();
    const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Image could not be decoded."));
    });
    image.src = sourceUrl;
    await loaded;

    const maxDimension = 2400;
    const scale = Math.min(
      1,
      maxDimension / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(sourceUrl);

    const compressedBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.88),
    );
    if (!compressedBlob || compressedBlob.size >= file.size) return file;

    return new File(
      [compressedBlob],
      `${file.name.replace(/\.[^.]+$/, "")}.webp`,
      { type: "image/webp", lastModified: file.lastModified },
    );
  } catch {
    return file;
  }
}

export async function uploadArchiveImage(file: File, folder = "records") {
  if (!supabase)
    return { url: null, error: new Error("Supabase is not configured.") };
  const uploadFile = await compressArchiveImage(file);
  const extension = uploadFile.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from("archive-images")
    .upload(path, uploadFile, { upsert: false, contentType: uploadFile.type });
  if (error) return { url: null, error };
  const { data } = supabase.storage.from("archive-images").getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

// Subscribes to live Postgres changes for one or more tables and invokes
// `onChange` whenever a row is inserted/updated/deleted, for instant refreshes
// instead of waiting on the next poll. No-ops (and returns a no-op cleanup)
// when Supabase isn't configured, since realtime isn't available in that mode.
export function subscribeToTables(tables: string[], onChange: () => void) {
  if (!supabase || tables.length === 0) return () => {};
  const channel = supabase.channel(
    `tables-${tables.join("-")}-${Math.random().toString(36).slice(2)}`,
  );
  for (const table of tables) {
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      () => onChange(),
    );
  }
  channel.subscribe();
  return () => {
    supabase?.removeChannel(channel);
  };
}

export function subscribeToTable(table: string, onChange: () => void) {
  return subscribeToTables([table], onChange);
}
