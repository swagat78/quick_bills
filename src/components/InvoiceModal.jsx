import React, { useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import Modal from "react-bootstrap/Modal";
import { BiCloudDownload } from "react-icons/bi";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const InvoiceModal = ({
  showModal,
  closeModal,
  info,
  currency,
  total,
  items,
  taxAmount,
  discountAmount,
  subTotal,
  status,
}) => {
  const invoiceRef = useRef();

  const generatePDF = () => {
    const element = invoiceRef.current;
    html2canvas(element, { scale: 2, useCORS: true }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invoice-${info.invoiceNumber || "001"}.pdf`);
    });
  };

  return (
    <div>
      <Modal show={showModal} onHide={closeModal} size="lg" centered>
        {/* ── Printable Invoice Template ── */}
        <div
          ref={invoiceRef}
          style={{
            background: "#fff",
            padding: "40px",
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
            color: "#2d3436",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Watermark */}
          {status === "paid" && (
            <div
              style={{
                position: "absolute",
                top: "35%",
                left: "10%",
                fontSize: "140px",
                fontWeight: 900,
                color: "rgba(0, 184, 148, 0.08)",
                transform: "rotate(-35deg)",
                letterSpacing: "10px",
                zIndex: 0,
                pointerEvents: "none",
                userSelect: "none",
              }}
            >
              PAID
            </div>
          )}

          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              borderBottom: "3px solid #2d3436",
              paddingBottom: "20px",
              marginBottom: "30px",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "28px",
                  fontWeight: 900,
                  letterSpacing: "2px",
                  color: "#000",
                }}
              >
                QUICKBILLS
              </div>
              <div style={{ color: "#636e72", fontSize: "12px", marginTop: "4px" }}>
                Industrial Grade Invoicing
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: "36px",
                  fontWeight: 900,
                  color: "#dfe6e9",
                  lineHeight: 1,
                }}
              >
                INVOICE
              </div>
              <div style={{ fontSize: "13px", marginTop: "6px", color: "#636e72" }}>
                #{info.invoiceNumber}
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "35px",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div style={{ width: "30%" }}>
              <div
                style={{
                  fontSize: "9px",
                  textTransform: "uppercase",
                  letterSpacing: "1.5px",
                  color: "#636e72",
                  fontWeight: 700,
                  marginBottom: "6px",
                }}
              >
                Billed From
              </div>
              <div style={{ fontWeight: 700 }}>{info.billFrom}</div>
              <div style={{ fontSize: "12px", color: "#636e72" }}>
                {info.billFromAddress}
              </div>
              <div style={{ fontSize: "12px", color: "#636e72" }}>
                {info.billFromEmail}
              </div>
            </div>
            <div style={{ width: "30%" }}>
              <div
                style={{
                  fontSize: "9px",
                  textTransform: "uppercase",
                  letterSpacing: "1.5px",
                  color: "#636e72",
                  fontWeight: 700,
                  marginBottom: "6px",
                }}
              >
                Billed To
              </div>
              <div style={{ fontWeight: 700 }}>{info.billTo}</div>
              <div style={{ fontSize: "12px", color: "#636e72" }}>
                {info.billToAddress}
              </div>
              <div style={{ fontSize: "12px", color: "#636e72" }}>
                {info.billToEmail}
              </div>
            </div>
            <div style={{ width: "25%" }}>
              <div
                style={{
                  fontSize: "9px",
                  textTransform: "uppercase",
                  letterSpacing: "1.5px",
                  color: "#636e72",
                  fontWeight: 700,
                  marginBottom: "6px",
                }}
              >
                Date of Issue
              </div>
              <div>{info.dateOfIssue}</div>
            </div>
          </div>

          {/* Items Table */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: "30px",
              position: "relative",
              zIndex: 1,
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#2d3436",
                  color: "#fff",
                  fontSize: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                <th style={{ padding: "10px 12px", textAlign: "left" }}>
                  Item Description
                </th>
                <th style={{ padding: "10px 12px", textAlign: "center" }}>Qty</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Price</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid #eee",
                    fontSize: "13px",
                  }}
                >
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ fontWeight: 700 }}>{item.name}</div>
                    <div style={{ color: "#636e72", fontSize: "11px" }}>
                      {item.description}
                    </div>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    {item.quantity}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>
                    {currency}{item.price}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      textAlign: "right",
                      fontWeight: 600,
                    }}
                  >
                    {currency}{(item.price * item.quantity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div style={{ width: "280px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  fontSize: "13px",
                }}
              >
                <span style={{ color: "#636e72", textTransform: "uppercase", fontSize: "10px", letterSpacing: "1px" }}>
                  Subtotal
                </span>
                <span>{currency}{subTotal}</span>
              </div>
              {parseFloat(taxAmount) > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    fontSize: "13px",
                  }}
                >
                  <span style={{ color: "#636e72", textTransform: "uppercase", fontSize: "10px", letterSpacing: "1px" }}>
                    Tax
                  </span>
                  <span>{currency}{taxAmount}</span>
                </div>
              )}
              {parseFloat(discountAmount) > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    fontSize: "13px",
                  }}
                >
                  <span style={{ color: "#636e72", textTransform: "uppercase", fontSize: "10px", letterSpacing: "1px" }}>
                    Discount
                  </span>
                  <span>-{currency}{discountAmount}</span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "14px 0 0",
                  marginTop: "10px",
                  borderTop: "3px solid #2d3436",
                  fontSize: "18px",
                  fontWeight: 900,
                }}
              >
                <span>TOTAL</span>
                <span>{currency}{total}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {info.notes && (
            <div
              style={{
                marginTop: "40px",
                position: "relative",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  fontSize: "9px",
                  textTransform: "uppercase",
                  letterSpacing: "1.5px",
                  color: "#636e72",
                  fontWeight: 700,
                  marginBottom: "6px",
                }}
              >
                Notes & Terms
              </div>
              <div style={{ fontSize: "12px", color: "#636e72" }}>
                {info.notes}
              </div>
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              marginTop: "50px",
              borderTop: "1px solid #eee",
              paddingTop: "12px",
              textAlign: "center",
              fontSize: "10px",
              color: "#b2bec3",
            }}
          >
            Thank you for your business. This is a computer generated invoice.
          </div>
        </div>

        {/* Download Button */}
        <div className="pb-4 px-4">
          <Button
            variant="dark"
            className="d-block w-100 py-2 fw-bold"
            onClick={generatePDF}
          >
            <BiCloudDownload
              style={{ width: "18px", height: "18px", marginTop: "-3px" }}
              className="me-2"
            />
            Download Industrial PDF
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default InvoiceModal;