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

