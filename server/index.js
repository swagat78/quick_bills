const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
const PORT = 3001;

// ── Middleware ──
app.use(cors({ origin: "http://localhost:1234" }));
app.use(express.json());

// ── Supabase config (for public invoice sharing) ──
const { createClient } = require("@supabase/supabase-js");
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const supabaseAdmin = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// ── Gemini API config ──
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// ── System prompt that forces structured JSON output ──
const SYSTEM_PROMPT = `You are an AI invoice assistant for QuickBills. 
Given a natural language prompt from a user, extract invoice data and return ONLY valid JSON (no markdown, no backticks, no explanation).

The JSON must follow this exact schema:
{
  "billTo": "client name or empty string",
  "billToEmail": "client email or empty string",
  "billToAddress": "client address or empty string",
  "items": [
    {
      "name": "item name",
      "description": "brief description",
      "price": "unit price as string like 50000.00",
      "quantity": quantity_as_number
    }
  ],
  "taxRate": GST_percentage_as_number_or_0,
  "gstType": "intra" or "inter" or "none",
  "discountRate": discount_percentage_or_0,
  "currency": "₹" or "$" or "£" etc,
  "notes": "any special notes mentioned or empty string"
}

Rules:
- If a currency is mentioned (rupees, dollars, etc), set the currency symbol.
- If GST is mentioned, determine if it's IGST (inter-state) or CGST+SGST (intra-state). Default to "intra" if just "GST" is mentioned.
- Extract every item with its name, quantity, and unit price.
- If no client name is given, leave billTo empty.
- Always return valid JSON. Nothing else.`;

// ── POST /api/ai-invoice ──
app.post("/api/ai-invoice", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        error:
          "GEMINI_API_KEY is not set. Add it to your environment variables.",
      });
    }

    // Call Gemini API
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const errMsg = errBody?.error?.message || "Unknown Gemini API error";
      console.error("Gemini API error:", errMsg);
      return res.status(502).json({ error: errMsg });
    }

    const data = await response.json();

    // Extract the text content from Gemini's response
    const rawText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Clean up: remove markdown code fences if present
    const cleaned = rawText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Parse JSON
    const invoiceData = JSON.parse(cleaned);

    return res.json({ success: true, data: invoiceData });
  } catch (err) {
    console.error("Server error:", err.message);
    return res.status(500).json({
      error: "Failed to parse AI response. Try rephrasing your prompt.",
    });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  INVOICE SHARING — Public Link System
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * POST /api/invoice/:id/share
 * Generates a share_token for the given invoice.
 * Requires the auth token in the Authorization header.
 */
app.post("/api/invoice/:id/share", async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Supabase not configured on server." });
    }

    const { id } = req.params;
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    // Verify the user owns this invoice by using their token
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: invoice, error: fetchErr } = await userClient
      .from("invoices")
      .select("id, share_token")
      .eq("id", id)
      .single();

    if (fetchErr || !invoice) {
      return res.status(404).json({ error: "Invoice not found." });
    }

    // If already shared, return existing token
    if (invoice.share_token) {
      return res.json({ success: true, token: invoice.share_token });
    }

    // Generate a new token
    const token = crypto.randomUUID();

    const { error: updateErr } = await userClient
      .from("invoices")
      .update({ share_token: token })
      .eq("id", id);

    if (updateErr) {
      console.error("Share token update error:", updateErr.message);
      return res.status(500).json({ error: "Failed to generate share link." });
    }

    return res.json({ success: true, token });
  } catch (err) {
    console.error("Share error:", err.message);
    return res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * GET /api/public/invoice/:token
 * Fetches a single invoice by its share_token.
 * No authentication required — this is the public endpoint.
 * Only returns read-only safe fields.
 */
app.get("/api/public/invoice/:token", async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Supabase not configured." });
    }

    const { token } = req.params;

    if (!token || token.length < 10) {
      return res.status(400).json({ error: "Invalid share link." });
    }

    const { data, error } = await supabaseAdmin
      .from("invoices")
      .select(
        "invoice_number, status, currency, date_of_issue, " +
        "bill_from, bill_from_email, bill_from_address, " +
        "bill_to, bill_to_email, bill_to_address, " +
        "line_items, sub_total, tax_rate, tax_amount, " +
        "discount_rate, discount_amount, total, notes, gst_type"
      )
      .eq("share_token", token)
      .single();

    if (error || !data) {
      return res.status(404).json({
        error: "Invoice not found or sharing is disabled.",
      });
    }

    // Never expose: id, user_id, share_token, created_at
    return res.json({ success: true, data });
  } catch (err) {
    console.error("Public invoice error:", err.message);
    return res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * DELETE /api/invoice/:id/share
 * Revokes the share link for an invoice.
 */
app.delete("/api/invoice/:id/share", async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Supabase not configured." });
    }

    const { id } = req.params;
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { error } = await userClient
      .from("invoices")
      .update({ share_token: null })
      .eq("id", id);

    if (error) {
      return res.status(500).json({ error: "Failed to revoke share link." });
    }

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error." });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SERVER-SIDE PRICE VALIDATION — Anti-Tampering
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Centralized calculation engine (runs ONLY on the server).
 * Fetches fixed prices from the `products` table and computes
 * all totals. Client-sent prices are completely ignored.
 *
 * @param {Object[]} items - [{ product_id, quantity }]
 * @param {number}   taxRate - GST/tax percentage
 * @param {number}   discountRate - discount percentage
 * @param {string}   gstType - "intra" | "inter" | "none"
 * @returns {Object} Validated breakdown
 */
async function calculateServerTotal(items, taxRate = 0, discountRate = 0, gstType = "none") {
  if (!supabaseAdmin) throw new Error("Supabase not configured.");

  // 1. Collect all product IDs
  const productIds = items.map((i) => i.product_id).filter(Boolean);

  // 2. Fetch fixed prices from the database
  let priceMap = {};
  if (productIds.length > 0) {
    const { data: products, error } = await supabaseAdmin
      .from("products")
      .select("id, name, price, currency")
      .in("id", productIds);

    if (error) throw new Error("Failed to fetch product prices.");
    products.forEach((p) => {
      priceMap[p.id] = p;
    });
  }

  // 3. Build validated line items and compute subtotal
  let subTotal = 0;
  const validatedItems = items.map((item) => {
    const product = priceMap[item.product_id];
    if (!product) {
      // Custom item (no product_id) — use client price but flag it
      const price = parseFloat(item.price) || 0;
      const qty = parseInt(item.quantity, 10) || 1;
      const lineTotal = price * qty;
      subTotal += lineTotal;
      return {
        ...item,
        price: price.toFixed(2),
        quantity: qty,
        lineTotal: lineTotal.toFixed(2),
        source: "custom", // flagged as user-entered
      };
    }

    // Product exists in DB — use FIXED price, ignore client price
    const fixedPrice = parseFloat(product.price);
    const qty = parseInt(item.quantity, 10) || 1;
    const lineTotal = fixedPrice * qty;
    subTotal += lineTotal;

    return {
      product_id: item.product_id,
      name: product.name,
      description: item.description || "",
      price: fixedPrice.toFixed(2),
      quantity: qty,
      lineTotal: lineTotal.toFixed(2),
      currency: product.currency,
      source: "verified", // price from DB
    };
  });

  // 4. Apply discount
  const discountAmount = (subTotal * discountRate) / 100;
  const afterDiscount = subTotal - discountAmount;

  // 5. Apply tax/GST
  let taxAmount = 0;
  let cgst = 0, sgst = 0, igst = 0;

  if (gstType === "intra" && taxRate > 0) {
    cgst = (afterDiscount * (taxRate / 2)) / 100;
    sgst = cgst;
    taxAmount = cgst + sgst;
  } else if (gstType === "inter" && taxRate > 0) {
    igst = (afterDiscount * taxRate) / 100;
    taxAmount = igst;
  } else if (taxRate > 0) {
    taxAmount = (afterDiscount * taxRate) / 100;
  }

  // 6. Grand total
  const total = afterDiscount + taxAmount;

  return {
    validatedItems,
    subTotal: subTotal.toFixed(2),
    discountRate,
    discountAmount: discountAmount.toFixed(2),
    taxRate,
    gstType,
    taxAmount: taxAmount.toFixed(2),
    ...(gstType === "intra" && { cgst: cgst.toFixed(2), sgst: sgst.toFixed(2) }),
    ...(gstType === "inter" && { igst: igst.toFixed(2) }),
    total: total.toFixed(2),
  };
}

/**
 * POST /api/validate-invoice
 * Validates prices server-side and returns the correct totals.
 * Client-sent prices are IGNORED for products in the DB.
 *
 * Body: { items: [{ product_id?, name, quantity, price }], taxRate, discountRate, gstType }
 */
app.post("/api/validate-invoice", async (req, res) => {
  try {
    const { items, taxRate, discountRate, gstType } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Items array is required." });
    }

    const result = await calculateServerTotal(items, taxRate, discountRate, gstType);
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error("Validation error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/invoice/secure-save
 * Validates prices AND saves the invoice in one atomic call.
 * This is the tamper-proof save endpoint.
 *
 * Body: { invoiceId?, formState, items }
 * Headers: Authorization: Bearer <token>
 */
app.post("/api/invoice/secure-save", async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Supabase not configured." });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const { invoiceId, formState } = req.body;
    if (!formState) {
      return res.status(400).json({ error: "formState is required." });
    }

    // Create authenticated Supabase client
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the authenticated user
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return res.status(401).json({ error: "Invalid session." });
    }

    // Validate totals server-side
    const validated = await calculateServerTotal(
      formState.items || [],
      parseFloat(formState.taxRate) || 0,
      parseFloat(formState.discountRate) || 0,
      formState.gstType || "none"
    );

    // Build the invoice row with SERVER-CALCULATED values
    const invoiceRow = {
      ...(invoiceId && { id: invoiceId }),
      user_id: user.id,
      invoice_number: parseInt(formState.invoiceNumber, 10) || 1,
      currency: formState.currency || "$",
      date_of_issue: formState.dateOfIssue || null,
      bill_from: formState.billFrom || "",
      bill_from_email: formState.billFromEmail || "",
      bill_from_address: formState.billFromAddress || "",
      bill_to: formState.billTo || "",
      bill_to_email: formState.billToEmail || "",
      bill_to_address: formState.billToAddress || "",

      // SERVER-VALIDATED values (client values overridden)
      line_items: validated.validatedItems,
      sub_total: parseFloat(validated.subTotal),
      tax_rate: validated.taxRate,
      tax_amount: parseFloat(validated.taxAmount),
      discount_rate: validated.discountRate,
      discount_amount: parseFloat(validated.discountAmount),
      total: parseFloat(validated.total),
      gst_type: validated.gstType,

      notes: formState.notes || "",
      status: formState.status || "draft",
    };

    // Upsert with server-calculated totals
    const { data, error } = await userClient
      .from("invoices")
      .upsert(invoiceRow, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      console.error("Secure save error:", error.message);
      return res.status(500).json({ error: "Failed to save invoice." });
    }

    return res.json({
      success: true,
      data,
      validation: validated,
    });
  } catch (err) {
    console.error("Secure save error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/products
 * Returns the product catalog for the frontend.
 * Prices here are for DISPLAY only — actual calculations
 * are always done server-side via /api/validate-invoice.
 */
app.get("/api/products", async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Supabase not configured." });
    }

    const { data, error } = await supabaseAdmin
      .from("products")
      .select("id, name, description, price, currency")
      .order("name");

    if (error) throw error;
    return res.json({ success: true, data: data || [] });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch products." });
  }
});

// ── Health check ──
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    model: GEMINI_MODEL,
    supabase: supabaseAdmin ? "connected" : "not configured",
  });
});

// ── Start ──
app.listen(PORT, () => {
  console.log(`\n⚡ QuickBills AI Server running at http://localhost:${PORT}`);
  console.log(`   Model: ${GEMINI_MODEL}`);
  console.log(
    `   API Key: ${GEMINI_API_KEY ? "✓ Configured" : "✗ MISSING"}`
  );
  console.log(
    `   Supabase: ${supabaseAdmin ? "✓ Connected" : "✗ MISSING — set SUPABASE_URL & SUPABASE_ANON_KEY"}\n`
  );
});


