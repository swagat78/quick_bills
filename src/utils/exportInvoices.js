import * as XLSX from "xlsx";
import { supabase } from "../supabaseClient";

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  QuickBills — Professional Invoice Export Utility
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 *  Flattens JSONB line_items into one row per item,
 *  duplicating invoice-level fields on each row for
 *  easy pivot-table analysis in Excel / Google Sheets.
 *
 *  Supports: CSV (.csv) and Excel (.xlsx)
 */

// ── Column headers (accounting-friendly) ──
const HEADERS = [
  "Invoice #",
  "Status",
  "Date of Issue",
  "Currency",
  "Bill From",
  "Bill From Email",
  "Bill From Address",
  "Bill To",
  "Bill To Email",
  "Bill To Address",
  "Item Name",
  "Item Description",
  "Qty",
  "Unit Price",
  "Line Total",
  "Subtotal",
  "Tax Rate (%)",
  "Tax Amount",
  "Discount Rate (%)",
  "Discount Amount",
  "Invoice Total",
  "Notes",
  "Created At",
];

/**
 * Flatten a single invoice into multiple rows (one per line item).
 * If the invoice has no items, a single row is produced with empty item fields.
 */
const flattenInvoice = (invoice) => {
  const items = invoice.line_items || [];
  const baseRow = {
    invoiceNumber: `INV-${invoice.invoice_number}`,
    status: (invoice.status || "draft").toUpperCase(),
    dateOfIssue: invoice.date_of_issue || "",
    currency: invoice.currency || "₹",
    billFrom: invoice.bill_from || "",
    billFromEmail: invoice.bill_from_email || "",
    billFromAddress: invoice.bill_from_address || "",
    billTo: invoice.bill_to || "",
    billToEmail: invoice.bill_to_email || "",
    billToAddress: invoice.bill_to_address || "",
    subTotal: Number(invoice.sub_total || 0).toFixed(2),
    taxRate: Number(invoice.tax_rate || 0).toFixed(2),
    taxAmount: Number(invoice.tax_amount || 0).toFixed(2),
    discountRate: Number(invoice.discount_rate || 0).toFixed(2),
    discountAmount: Number(invoice.discount_amount || 0).toFixed(2),
    total: Number(invoice.total || 0).toFixed(2),
    notes: invoice.notes || "",
    createdAt: invoice.created_at
      ? new Date(invoice.created_at).toLocaleDateString()
      : "",
  };

  if (items.length === 0) {
    return [
      [
        baseRow.invoiceNumber,
        baseRow.status,
        baseRow.dateOfIssue,
        baseRow.currency,
        baseRow.billFrom,
        baseRow.billFromEmail,
        baseRow.billFromAddress,
        baseRow.billTo,
        baseRow.billToEmail,
        baseRow.billToAddress,
        "",
        "",
        "",
        "",
        "",
        baseRow.subTotal,
        baseRow.taxRate,
        baseRow.taxAmount,
        baseRow.discountRate,
        baseRow.discountAmount,
        baseRow.total,
        baseRow.notes,
        baseRow.createdAt,
      ],
    ];
  }

  return items.map((item) => {
    const qty = Number(item.quantity || 0);
    const price = Number(item.price || 0);
    return [
      baseRow.invoiceNumber,
      baseRow.status,
      baseRow.dateOfIssue,
      baseRow.currency,
      baseRow.billFrom,
      baseRow.billFromEmail,
      baseRow.billFromAddress,
      baseRow.billTo,
      baseRow.billToEmail,
      baseRow.billToAddress,
      item.name || "",
      item.description || "",
      qty,
      price.toFixed(2),
      (qty * price).toFixed(2),
      baseRow.subTotal,
      baseRow.taxRate,
      baseRow.taxAmount,
      baseRow.discountRate,
      baseRow.discountAmount,
      baseRow.total,
      baseRow.notes,
      baseRow.createdAt,
    ];
  });
};

/**
 * Fetch all invoices for the current user and flatten them into rows.
 * @returns {Array<Array>} 2D array including the header row
 */
const buildExportData = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("You must be logged in to export data.");

  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!invoices || invoices.length === 0) {
    throw new Error("No invoices to export.");
  }

  const rows = invoices.flatMap(flattenInvoice);
  return [HEADERS, ...rows];
};

/**
 * Trigger a file download in the browser.
 */
const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PUBLIC API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Export invoices as a CSV file.
 * Zero dependencies — pure string manipulation.
 */
export const exportAsCSV = async () => {
  const data = await buildExportData();

  const csvContent = data
    .map((row) =>
      row
        .map((cell) => {
          // Escape double quotes and wrap in quotes if needed
          const str = String(cell);
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(",")
    )
    .join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(blob, `quickbills-invoices-${date}.csv`);
};

/**
 * Export invoices as an Excel (.xlsx) file.
 * Uses SheetJS for proper formatting with column widths.
 */
export const exportAsExcel = async () => {
  const data = await buildExportData();

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Auto-fit column widths based on content
  ws["!cols"] = HEADERS.map((header, i) => {
    const maxLen = data.reduce((max, row) => {
      return Math.max(max, String(row[i] || "").length);
    }, header.length);
    return { wch: Math.min(maxLen + 2, 40) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Invoices");

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(blob, `quickbills-invoices-${date}.xlsx`);
};
