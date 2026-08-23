import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client serveur en lecture seule (clé publiable, aucune session).
 * Les données UPK (catégories, lieux, photos) sont publiques par conception.
 */
export function clientPublic(): SupabaseClient {
  return createClient(
    process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"]!,
    {
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
