import { useState } from "react";
import { supabase } from "../supabaseClient";

/**
 * Custom hook to upsert (insert or update) an invoice in Supabase.
 *
 * How it works:
 * - If the invoice `id` doesn't exist in the DB → INSERT.
 * - If the invoice `id` already exists → UPDATE (merge).
 * - This is a single atomic call — no race conditions.
 *
 * @returns {{ upsertInvoice, loading, error, success }}
 */
export const useUpsertInvoice = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  /**
   * Upsert an invoice to Supabase.
   *
   * @param {Object} params
   * @param {string|null} params.invoiceId  - Existing UUID or null for new invoices
   * @param {Object}      params.formState  - The full InvoiceForm state object
   * @returns {Object|null} The upserted invoice row, or null on error
   */
  const upsertInvoice = async ({ invoiceId, formState }) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Get the authenticated user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("You must be logged in to save an invoice.");
      }

      // 2. Build the row payload, mapping React state → DB columns
      const invoiceRow = {
        // If we have an existing ID, include it so Supabase does an UPDATE.
        // Otherwise, omit it and let the DB generate a new UUID.
        ...(invoiceId && { id: invoiceId }),

        user_id: user.id,
        invoice_number: parseInt(formState.invoiceNumber, 10) || 1,
        currency: formState.currency,
        date_of_issue: formState.dateOfIssue || null,
        bill_from: formState.billFrom,
        bill_from_email: formState.billFromEmail,
        bill_from_address: formState.billFromAddress,
        bill_to: formState.billTo,
        bill_to_email: formState.billToEmail,
        bill_to_address: formState.billToAddress,

        // JSONB: store the full items array as-is
        line_items: formState.items,

        // Tax & Discount
        tax_rate: parseFloat(formState.taxRate) || 0,
        tax_amount: parseFloat(formState.taxAmount) || 0,
        discount_rate: parseFloat(formState.discountRate) || 0,
        discount_amount: parseFloat(formState.discountAmount) || 0,
        sub_total: parseFloat(formState.subTotal) || 0,
        total: parseFloat(formState.total) || 0,

        notes: formState.notes,
        status: formState.status || "draft",
      };

      // 3. Upsert: onConflict targets the primary key `id`
      const { data, error: upsertError } = await supabase
        .from("invoices")
        .upsert(invoiceRow, { onConflict: "id" })
        .select() // Return the full row so we get the generated `id`
        .single();

      if (upsertError) {
        throw upsertError;
      }

      setSuccess(true);
      return data;
    } catch (err) {
      console.error("[useUpsertInvoice] Error:", err);
      setError(err.message || "Failed to save invoice.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { upsertInvoice, loading, error, success };
};
