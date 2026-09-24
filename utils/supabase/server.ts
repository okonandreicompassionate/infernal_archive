import dotenv from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
export const supabaseAdmin: SupabaseClient | null =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

const databaseClient = () => supabaseAdmin || supabase;

export function getUserClient(authorization: string | undefined) {
  if (!supabaseUrl || !supabaseKey || !authorization?.startsWith("Bearer "))
    return null;
  const token = authorization.slice("Bearer ".length);
  return createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

export async function getAuthenticatedProfile(
  authorization: string | undefined,
) {
  if (!supabase || !authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length);
  const userClient = getUserClient(authorization);
  if (!userClient) return null;
  const { data: userData } = await userClient.auth.getUser(token);
  if (!userData.user) return null;
  const { data: profile } = await userClient
    .from("profiles")
    .select("id, email, display_name, role, active")
    .eq("id", userData.user.id)
    .maybeSingle();
  return profile?.active ? { user: userData.user, profile } : null;
}

export const tableForCollection = (collection: string) =>
  collection.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

const camelToSnake = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(camelToSnake);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
      camelToSnake(item),
    ]),
  );
};

const snakeToCamel = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(snakeToCamel);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
      snakeToCamel(item),
    ]),
  );
};

export const toSupabaseRow = (value: Record<string, unknown>) =>
  camelToSnake(value) as Record<string, unknown>;
export const fromSupabaseRow = <T>(value: unknown) => snakeToCamel(value) as T;

export async function readCollection<T>(
  collection: string,
): Promise<{ data: T[] | null; error: string | null }> {
  const client = databaseClient();
  if (!client)
    return {
      data: null,
      error: "Supabase environment variables are not configured.",
    };
  const { data, error } = await client
    .from(tableForCollection(collection))
    .select("*");
  if (error) return { data: null, error: error.message };
  return { data: (data || []).map(fromSupabaseRow) as T[], error: null };
}

export async function createRow<T>(
  collection: string,
  value: Record<string, unknown>,
): Promise<{ data: T | null; error: string | null }> {
  const client = databaseClient();
  if (!client)
    return {
      data: null,
      error: "Supabase environment variables are not configured.",
    };
  const { data, error } = await client
    .from(tableForCollection(collection))
    .insert(toSupabaseRow(value))
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  return { data: fromSupabaseRow<T>(data), error: null };
}

export async function updateRow<T>(
  collection: string,
  id: string,
  value: Record<string, unknown>,
): Promise<{ data: T | null; error: string | null }> {
  const client = databaseClient();
  if (!client)
    return {
      data: null,
      error: "Supabase environment variables are not configured.",
    };
  const { data, error } = await client
    .from(tableForCollection(collection))
    .update(toSupabaseRow(value))
    .eq("id", id)
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  return { data: fromSupabaseRow<T>(data), error: null };
}

export async function deleteRow(
  collection: string,
  id: string,
): Promise<{ data: unknown | null; error: string | null }> {
  const client = databaseClient();
  if (!client)
    return {
      data: null,
      error: "Supabase environment variables are not configured.",
    };
  const { data, error } = await client
    .from(tableForCollection(collection))
    .delete()
    .eq("id", id)
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  return { data: fromSupabaseRow(data), error: null };
}
