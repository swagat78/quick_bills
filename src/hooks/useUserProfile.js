import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";

/**
 * Custom hook to manage user profile settings from Supabase.
 *
 * Fetches the profile on mount (via auth user ID) and provides
 * an update function to persist changes.
 *
 * Table: user_profiles
 *   - id             UUID (PK, references auth.users)
 *   - default_notes  TEXT
 *   - currency       TEXT (default '₹')
 *   - created_at     TIMESTAMPTZ
 *   - updated_at     TIMESTAMPTZ
 */

// Supported currencies (display labels for settings UI)
export const CURRENCY_OPTIONS = [
  { symbol: "₹", label: "INR (Indian Rupee)" },
  { symbol: "$", label: "USD (United States Dollar)" },
  { symbol: "£", label: "GBP (British Pound Sterling)" },
  { symbol: "¥", label: "JPY (Japanese Yen)" },
  { symbol: "€", label: "EUR (Euro)" },
  { symbol: "₿", label: "BTC (Bitcoin)" },
];

export const useUserProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  // Fetch the authenticated user's profile
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error && error.code === "PGRST116") {
        // Profile doesn't exist yet — create it with defaults
        const { data: newProfile, error: insertErr } = await supabase
          .from("user_profiles")
          .insert({
            id: user.id,
            default_notes:
              "Thank you for doing business with us. Have a great day!",
            currency: "₹",
          })
          .select()
          .single();

        if (!insertErr) {
          setProfile(newProfile);
        }
      } else if (!error && data) {
        setProfile(data);
      }
    } catch (err) {
      console.error("[useUserProfile] Fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  /**
   * Update a specific field in the user's profile.
   * @param {Object} updates - e.g. { currency: "₹" }
   * @returns {boolean} success
   */
  const updateProfile = async (updates) => {
    if (!userId) return false;

    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", userId)
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
      return true;
    } catch (err) {
      console.error("[useUserProfile] Update error:", err.message);
      return false;
    }
  };

  return { profile, userId, loading, updateProfile, refetch: fetchProfile };
};
