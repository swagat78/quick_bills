/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  QuickBills — GST Calculation Engine
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 *  Supports three GST types used in India:
 *
 *  ┌──────────┬─────────────────────────────────┐
 *  │ Type     │ Description                     │
 *  ├──────────┼─────────────────────────────────┤
 *  │ intra    │ Intra-state: CGST + SGST        │
 *  │          │ (each = GST% ÷ 2)               │
 *  ├──────────┼─────────────────────────────────┤
 *  │ inter    │ Inter-state: IGST               │
 *  │          │ (full GST%)                      │
 *  ├──────────┼─────────────────────────────────┤
 *  │ none     │ No GST applied                  │
 *  └──────────┴─────────────────────────────────┘
 */

// Standard Indian GST slab rates
export const GST_SLABS = [0, 5, 12, 18, 28];

/**
 * Calculate GST breakdown from a subtotal.
 *
 * @param {number} subtotal       - Amount before tax
 * @param {number} gstRate        - GST percentage (e.g. 18)
 * @param {string} gstType        - "intra" | "inter" | "none"
 * @param {number} discountRate   - Discount percentage (e.g. 10)
 *
 * @returns {Object} Full calculation result
 */
export const calculateGST = (subtotal, gstRate, gstType, discountRate = 0) => {
  const sub = parseFloat(subtotal) || 0;
  const rate = parseFloat(gstRate) || 0;
  const discount = parseFloat(discountRate) || 0;

  // 1. Discount
  const discountAmount = parseFloat(((sub * discount) / 100).toFixed(2));
  const taxableAmount = parseFloat((sub - discountAmount).toFixed(2));

  // 2. GST split
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let totalTax = 0;

  if (gstType === "intra" && rate > 0) {
    // Intra-state: split equally into CGST + SGST
    cgst = parseFloat(((taxableAmount * (rate / 2)) / 100).toFixed(2));
    sgst = parseFloat(((taxableAmount * (rate / 2)) / 100).toFixed(2));
    totalTax = parseFloat((cgst + sgst).toFixed(2));
  } else if (gstType === "inter" && rate > 0) {
    // Inter-state: full IGST
    igst = parseFloat(((taxableAmount * rate) / 100).toFixed(2));
    totalTax = igst;
  }
  // "none" → all zeros

  // 3. Grand total
  const total = parseFloat((taxableAmount + totalTax).toFixed(2));

  return {
    subtotal: sub,
    discountRate: discount,
    discountAmount,
    taxableAmount,
    gstRate: rate,
    gstType,
    cgst,
    sgst,
    igst,
    totalTax,
    total,
  };
};

/**
 * Get a human-readable label for the GST type.
 */
export const getGSTLabel = (gstType) => {
  switch (gstType) {
    case "intra":
      return "Intra-State (CGST + SGST)";
    case "inter":
      return "Inter-State (IGST)";
    default:
      return "No GST";
  }
};
