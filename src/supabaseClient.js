import { createClient } from "@supabase/supabase-js";

// Parcel uses process.env to inject variables from .env
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "⚠️ Supabase keys are missing! Check your .env file and restart the server."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
