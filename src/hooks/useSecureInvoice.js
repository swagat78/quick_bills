import { useState } from "react";
import { supabase } from "../supabaseClient";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

/**
 * Hook for server-side invoice price validation.
 *
 * Flow:
 *  1. Frontend sends items (with product_id + quantity) to the server.
 *  2. Server fetches FIXED prices from the `products` table.
 *  3. Server calculates subtotal, tax, discount, total.
 *  4. Server returns validated totals — frontend displays as read-only.
 *
 * This prevents any client-side price manipulation.
 */
export const useSecureInvoice = () => {
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Validate invoice totals server-side.
   * Call this before displaying the "Total" to the user.
   */
  const validateInvoice = async ({ items, taxRate, discountRate, gstType }) => {
    setValidating(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/validate-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, taxRate, discountRate, gstType }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Validation failed.");
      }

      setValidated(result.data);
      return result.data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setValidating(false);
    }
  };

  /**
   * Validate AND save in one atomic server call.
   * Prices are validated and saved server-side — no tampering possible.
   */
  const secureSave = async ({ invoiceId, formState }) => {
    setValidating(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error("You must be logged in.");

      const res = await fetch(`${API_URL}/api/invoice/secure-save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ invoiceId, formState }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Secure save failed.");
      }

      setValidated(result.validation);
      return result.data; // the saved invoice row
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setValidating(false);
    }
  };

  return {
    validateInvoice,
    secureSave,
    validating,
    validated,
    error,
  };
};
