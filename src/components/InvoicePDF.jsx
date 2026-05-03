import React from "react";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Industrial Style Theme
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#2d3436",
    lineHeight: 1.5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: "#2d3436",
    paddingBottom: 20,
    marginBottom: 30,
  },
  brand: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    color: "#000",
  },
  invoiceTitle: {
    fontSize: 30,
    fontFamily: "Helvetica-Bold",
    color: "#dfe6e9",
    textAlign: "right",
  },
  infoSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  infoBlock: {
    width: "30%",
  },
  label: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    textTransform: "uppercase",
    color: "#636e72",
    marginBottom: 4,
  },
  table: {
    display: "table",
    width: "auto",
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#2d3436",
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    padding: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#dfe6e9",
    padding: 8,
  },
  col1: { width: "50%" },
  col2: { width: "15%", textAlign: "center" },
  col3: { width: "15%", textAlign: "right" },
  col4: { width: "20%", textAlign: "right" },
  totalsSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  totalsBlock: {
    width: "40%",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 2,
    borderTopColor: "#2d3436",
    marginTop: 10,
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#dfe6e9",
    paddingTop: 10,
    textAlign: "center",
    color: "#b2bec3",
    fontSize: 8,
  },
  watermark: {
    position: "absolute",
    top: "40%",
    left: "15%",
    fontSize: 120,
    fontFamily: "Helvetica-Bold",
    color: "rgba(255, 0, 0, 0.1)",
    transform: "rotate(-45deg)",
    zIndex: -1,
  },
});

const InvoicePDF = ({ info, items, currency, subTotal, taxAmount, discountAmount, total, status }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Watermark for Paid status */}
      {status === "paid" && (
        <Text style={styles.watermark}>PAID</Text>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>QUICKBILLS</Text>
          <Text style={{ color: "#636e72" }}>Industrial Grade Invoicing</Text>
        </View>
        <View>
          <Text style={styles.invoiceTitle}>INVOICE</Text>
          <Text style={{ textAlign: "right", marginTop: 5 }}>
            #{info.invoiceNumber}
          </Text>
        </View>
      </View>

      {/* Info Section */}
      <View style={styles.infoSection}>
        <View style={styles.infoBlock}>
          <Text style={styles.label}>Billed From</Text>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>{info.billFrom}</Text>
          <Text>{info.billFromAddress}</Text>
          <Text>{info.billFromEmail}</Text>
        </View>
        <View style={styles.infoBlock}>
          <Text style={styles.label}>Billed To</Text>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>{info.billTo}</Text>
          <Text>{info.billToAddress}</Text>
          <Text>{info.billToEmail}</Text>
        </View>
        <View style={styles.infoBlock}>
          <Text style={styles.label}>Date of Issue</Text>
          <Text>{info.dateOfIssue}</Text>
        </View>
      </View>

      {/* Items Table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.col1}>Item Description</Text>
          <Text style={styles.col2}>Qty</Text>
          <Text style={styles.col3}>Price</Text>
          <Text style={styles.col4}>Amount</Text>
        </View>
        {items.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <View style={styles.col1}>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>{item.name}</Text>
              <Text style={{ color: "#636e72", fontSize: 8 }}>
                {item.description}
              </Text>
            </View>
            <Text style={styles.col2}>{item.quantity}</Text>
            <Text style={styles.col3}>{currency}{item.price}</Text>
            <Text style={styles.col4}>
              {currency}{(item.price * item.quantity).toFixed(2)}
            </Text>
          </View>
        ))}
      </View>

      {/* Summary */}
      <View style={styles.totalsSection}>
        <View style={styles.totalsBlock}>
          <View style={styles.totalRow}>
            <Text style={styles.label}>Subtotal</Text>
            <Text>{currency}{subTotal}</Text>
          </View>
          {taxAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.label}>Tax</Text>
              <Text>{currency}{taxAmount}</Text>
            </View>
          )}
          {discountAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.label}>Discount</Text>
              <Text>-{currency}{discountAmount}</Text>
            </View>
          )}
          <View style={styles.grandTotal}>
            <Text>TOTAL</Text>
            <Text>{currency}{total}</Text>
          </View>
        </View>
      </View>

      {/* Notes */}
      {info.notes && (
        <View style={{ marginTop: 40 }}>
          <Text style={styles.label}>Notes & Terms</Text>
          <Text style={{ color: "#636e72", fontSize: 9 }}>{info.notes}</Text>
        </View>
      )}

      {/* Footer */}
      <Text style={styles.footer}>
        Thank you for your business. This is a computer generated invoice.
      </Text>
    </Page>
  </Document>
);

export default InvoicePDF;
