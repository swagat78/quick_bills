import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./PublicInvoice.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

const PublicInvoice = () => {
  const { token } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPublicInvoice();
  }, [token]);

  const fetchPublicInvoice = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/public/invoice/${token}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Invoice not found.");
      }

      setInvoice(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="pub-loading">
        <div className="pub-spinner"></div>
        <p>Loading invoice...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="pub-error">
        <h3>Invoice Not Found</h3>
        <p>{error || "This link may be invalid or the invoice is no longer shared."}</p>
      </div>
    );
  }

  const items = invoice.line_items || [];
  const status = (invoice.status || "draft").toLowerCase();
  const currency = invoice.currency || "₹";
  const taxRate = parseFloat(invoice.tax_rate) || 0;
  const gstType = invoice.gst_type || "none";

  // Calculate GST splits
  const subTotal = parseFloat(invoice.sub_total) || 0;
  const discountAmt = parseFloat(invoice.discount_amount) || 0;
  const taxableAmount = subTotal - discountAmt;
  let cgst = 0, sgst = 0, igst = 0;

  if (gstType === "intra" && taxRate > 0) {
    cgst = (taxableAmount * (taxRate / 2) / 100);
    sgst = cgst;
  } else if (gstType === "inter" && taxRate > 0) {
    igst = (taxableAmount * taxRate / 100);
  }

  return (
    <div className="pub-wrapper">
      <div className="pub-container">
        {/* Top bar */}
        <div className="pub-topbar">
          <span className="pub-brand">QUICKBILLS</span>
          <span className={`pub-badge ${status}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>

        {/* Invoice Card */}
        <div className="pub-card">
          {/* Watermark */}
          {status === "paid" && <div className="pub-watermark">PAID</div>}

          <div className="pub-content">
            {/* Header */}
            <div className="pub-header">
              <div>
                <div className="pub-title">QUICKBILLS</div>
                <div className="pub-subtitle">Industrial Grade Invoicing</div>
              </div>
              <div>
                <div className="pub-invoice-label">INVOICE</div>
                <div className="pub-invoice-num">#{invoice.invoice_number}</div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="pub-info-grid">
              <div>
                <div className="pub-info-label">Billed From</div>
                <div className="pub-info-name">{invoice.bill_from || "—"}</div>
                <div className="pub-info-detail">{invoice.bill_from_email}</div>
                <div className="pub-info-detail">{invoice.bill_from_address}</div>
              </div>
              <div>
                <div className="pub-info-label">Billed To</div>
                <div className="pub-info-name">{invoice.bill_to || "—"}</div>
                <div className="pub-info-detail">{invoice.bill_to_email}</div>
                <div className="pub-info-detail">{invoice.bill_to_address}</div>
              </div>
              <div>
                <div className="pub-info-label">Date of Issue</div>
                <div className="pub-info-name">
                  {invoice.date_of_issue
                    ? new Date(invoice.date_of_issue).toLocaleDateString()
                    : "—"}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <table className="pub-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Item Description</th>
                  <th style={{ textAlign: "center" }}>Qty</th>
                  <th style={{ textAlign: "right" }}>Price</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <div className="pub-item-name">{item.name}</div>
                      {item.description && (
                        <div className="pub-item-desc">{item.description}</div>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>{item.quantity}</td>
                    <td style={{ textAlign: "right" }}>{currency}{parseFloat(item.price).toFixed(2)}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>
                      {currency}{(parseFloat(item.price) * parseInt(item.quantity)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="pub-totals">
              <div className="pub-totals-inner">
                <div className="pub-total-row">
                  <span className="pub-total-label">Subtotal</span>
                  <span>{currency}{subTotal.toFixed(2)}</span>
                </div>

                {discountAmt > 0 && (
                  <div className="pub-total-row">
                    <span className="pub-total-label">
                      Discount ({invoice.discount_rate || 0}%)
                    </span>
                    <span>-{currency}{discountAmt.toFixed(2)}</span>
                  </div>
                )}

                {gstType === "intra" && cgst > 0 && (
                  <>
                    <div className="pub-total-row">
                      <span className="pub-gst-label cgst">
                        CGST ({(taxRate / 2).toFixed(1)}%)
                      </span>
                      <span>{currency}{cgst.toFixed(2)}</span>
                    </div>
                    <div className="pub-total-row">
                      <span className="pub-gst-label sgst">
                        SGST ({(taxRate / 2).toFixed(1)}%)
                      </span>
                      <span>{currency}{sgst.toFixed(2)}</span>
                    </div>
                  </>
                )}

                {gstType === "inter" && igst > 0 && (
                  <div className="pub-total-row">
                    <span className="pub-gst-label igst">
                      IGST ({taxRate}%)
                    </span>
                    <span>{currency}{igst.toFixed(2)}</span>
                  </div>
                )}

                {gstType === "none" && parseFloat(invoice.tax_amount) > 0 && (
                  <div className="pub-total-row">
                    <span className="pub-total-label">Tax ({taxRate}%)</span>
                    <span>{currency}{parseFloat(invoice.tax_amount).toFixed(2)}</span>
                  </div>
                )}

                <div className="pub-grand-total">
                  <span>TOTAL</span>
                  <span>{currency}{parseFloat(invoice.total).toFixed(2)}</span>
                </div>
              </div>
            </div>


          </div>

          {/* Footer */}
          <div className="pub-footer">
            Thank you for your business. This is a computer generated invoice.
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicInvoice;
