import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import "bootstrap/dist/css/bootstrap.min.css";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Card from "react-bootstrap/Card";
import InvoiceItem from "./InvoiceItem";
import InvoiceModal from "./InvoiceModal";
import InputGroup from "react-bootstrap/InputGroup";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useUpsertInvoice } from "../hooks/useUpsertInvoice";
import { supabase } from "../supabaseClient";
import { calculateGST, GST_SLABS } from "../utils/gstCalculator";
import AIPrompt from "./AIPrompt";
import { useUserProfile, CURRENCY_OPTIONS } from "../hooks/useUserProfile";
import { useSecureInvoice } from "../hooks/useSecureInvoice";

const InvoiceForm = () => {
  // ── Supabase upsert hook ──
  const {
    upsertInvoice,
    loading: saving,
    error: saveError,
    success: saveSuccess,
  } = useUpsertInvoice();
  const { profile, userId, updateProfile } = useUserProfile();
  const { secureSave, validating: secureValidating, validated: serverValidated } = useSecureInvoice();
  const [invoiceId, setInvoiceId] = useState(null);
  const [isOwner, setIsOwner] = useState(true); // default true for new invoices
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [currency, setCurrency] = useState("₹");
  const [currentDate, setCurrentDate] = useState(
    new Date().toLocaleDateString()
  );
  const [invoiceNumber, setInvoiceNumber] = useState(1);
  const [dateOfIssue, setDateOfIssue] = useState("");
  const [billTo, setBillTo] = useState("");
  const [billToEmail, setBillToEmail] = useState("");
  const [billToAddress, setBillToAddress] = useState("");
  const [billFrom, setBillFrom] = useState("");
  const [billFromEmail, setBillFromEmail] = useState("");
  const [billFromAddress, setBillFromAddress] = useState("");
  const [total, setTotal] = useState("0.00");
  const [subTotal, setSubTotal] = useState("0.00");
  const [taxRate, setTaxRate] = useState("");
  const [taxAmount, setTaxAmount] = useState("0.00");
  const [discountRate, setDiscountRate] = useState("");
  const [discountAmount, setDiscountAmount] = useState("0.00");
  const [status, setStatus] = useState("draft");

  // ── GST State ──
  const [gstType, setGstType] = useState("none");

  // Status-based lock logic
  const isLocked = status !== "draft"; // "none" | "intra" | "inter"
  const [cgst, setCgst] = useState("0.00");
  const [sgst, setSgst] = useState("0.00");
  const [igst, setIgst] = useState("0.00");
  const [isCustomTax, setIsCustomTax] = useState(false);

  const [items, setItems] = useState([
    {
      id: (+new Date() + Math.floor(Math.random() * 999999)).toString(36),
      name: "",
      description: "",
      price: "1.00",
      quantity: 1,
    },
  ]);

  const handleCalculateTotal = useCallback(() => {
    const newSubTotal = items
      .reduce((acc, item) => {
        return acc + parseFloat(item.price) * parseInt(item.quantity);
      }, 0)
      .toFixed(2);

    // Use the GST calculator for tax computation
    const gstResult = calculateGST(
      parseFloat(newSubTotal),
      parseFloat(taxRate) || 0,
      gstType,
      parseFloat(discountRate) || 0
    );

    setSubTotal(newSubTotal);
    setDiscountAmount(gstResult.discountAmount.toFixed(2));
    setCgst(gstResult.cgst.toFixed(2));
    setSgst(gstResult.sgst.toFixed(2));
    setIgst(gstResult.igst.toFixed(2));
    setTaxAmount(gstResult.totalTax.toFixed(2));
    setTotal(gstResult.total.toFixed(2));
  }, [items, taxRate, discountRate, gstType, currency]);

  useEffect(() => {
    handleCalculateTotal();
  }, [currency, handleCalculateTotal]);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      loadInvoice(id);
    }
  }, [searchParams]);

  // Set defaults from user profile for NEW invoices
  useEffect(() => {
    const editId = searchParams.get("id");
    if (!editId && profile) {
      if (profile.currency) {
        setCurrency(profile.currency);
      }
    }
  }, [profile, searchParams]);

  const loadInvoice = async (id) => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (data) {
        setInvoiceId(data.id);
        setInvoiceNumber(data.invoice_number);
        setCurrency(data.currency);
        setDateOfIssue(data.date_of_issue);
        setBillTo(data.bill_to);
        setBillToEmail(data.bill_to_email);
        setBillToAddress(data.bill_to_address);
        setBillFrom(data.bill_from);
        setBillFromEmail(data.bill_from_email);
        setBillFromAddress(data.bill_from_address);
        setItems(data.line_items);
        setTaxRate(data.tax_rate);
        setDiscountRate(data.discount_rate);
        setStatus(data.status || "draft");
        // Restore GST type if stored in notes or default to "none"
        if (data.gst_type) setGstType(data.gst_type);
        
        const rate = parseFloat(data.tax_rate) || 0;
        setIsCustomTax(!GST_SLABS.includes(rate));

        // Ownership check: is the current user the invoice owner?
        const { data: { user } } = await supabase.auth.getUser();
        setIsOwner(user?.id === data.user_id);
      }
    } catch (err) {
      console.error("Error loading invoice:", err.message);
    }
  };

  const handleRowDel = (item) => {
    const updatedItems = items.filter((i) => i.id !== item.id);
    setItems(updatedItems);
  };

  const handleAddEvent = () => {
    const id = (+new Date() + Math.floor(Math.random() * 999999)).toString(36);
    const newItem = {
      id,
      name: "",
      price: "1.00",
      description: "",
      quantity: 1,
    };
    setItems([...items, newItem]);
  };

  const onItemizedItemEdit = (evt) => {
    const { id, name, value } = evt.target;

    console.log(id, name, value);

    const updatedItems = items.map((item) =>
      item.id === id ? { ...item, [name]: value } : item
    );
    setItems(updatedItems);
  };

  const handleChange = (setter) => (event) => {
    setter(event.target.value);
    handleCalculateTotal();
  };

  const openModal = (event) => {
    event.preventDefault();
    handleCalculateTotal();
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  // ── Save / Update invoice to Supabase (SERVER-VALIDATED) ──
  const handleSaveInvoice = async () => {
    const formState = {
      invoiceNumber,
      currency,
      dateOfIssue,
      billFrom,
      billFromEmail,
      billFromAddress,
      billTo,
      billToEmail,
      billToAddress,
      items,
      taxRate,
      taxAmount,
      discountRate,
      discountAmount,
      subTotal,
      total,
      status,
      gstType,
    };

    // Use server-side validated save (prices verified from DB)
    const result = await secureSave({ invoiceId, formState });

    if (result?.id) {
      setInvoiceId(result.id);
      // Update local state with server-validated totals
      if (serverValidated) {
        setSubTotal(serverValidated.subTotal);
        setTaxAmount(serverValidated.taxAmount);
        setTotal(serverValidated.total);
      }
      toast.success(invoiceId ? "Invoice updated! (Server verified ✓)" : "Invoice saved! (Server verified ✓)");
    } else {
      toast.error(saveError || "Failed to save invoice.");
    }
  };

  // ── AI Auto-Fill handler ──
  const handleAIAutoFill = (aiData) => {
    // Map AI items to our format with unique IDs
    if (aiData.items && aiData.items.length > 0) {
      const mappedItems = aiData.items.map((item) => ({
        id: (+new Date() + Math.floor(Math.random() * 999999)).toString(36),
        name: item.name || "",
        description: item.description || "",
        price: String(item.price || "1.00"),
        quantity: parseInt(item.quantity) || 1,
      }));
      setItems(mappedItems);
    }

    // Fill client info
    if (aiData.billTo) setBillTo(aiData.billTo);
    if (aiData.billToEmail) setBillToEmail(aiData.billToEmail);
    if (aiData.billToAddress) setBillToAddress(aiData.billToAddress);

    // Tax & GST
    if (aiData.taxRate !== undefined) setTaxRate(aiData.taxRate);
    if (aiData.gstType) setGstType(aiData.gstType);
    if (aiData.discountRate !== undefined) setDiscountRate(aiData.discountRate);

    // Currency — AI cannot override profile currency
    // if (aiData.currency) setCurrency(aiData.currency);
  };

  return (
    <Form onSubmit={openModal}>
      <Row>
        <Col md={8} lg={9}>
          {/* ── AI Auto-Fill Bar ── */}
          <AIPrompt onAutoFill={handleAIAutoFill} />

          <Card className="p-4 p-xl-5 my-3 my-xl-4">
            <div className="d-flex flex-row align-items-start justify-content-between mb-3">
              <div className="d-flex flex-column">
                <div className="d-flex flex-column">
                  <div className="mb-2">
                    <span className="fw-bold">Current&nbsp;Date:&nbsp;</span>
                    <span className="current-date">{currentDate}</span>
                  </div>
                </div>
                <div className="d-flex flex-row align-items-center">
                  <span className="fw-bold d-block me-2">Due&nbsp;Date:</span>
                  <Form.Control
                    type="date"
                    value={dateOfIssue}
                    name="dateOfIssue"
                    onChange={handleChange(setDateOfIssue)}
                    style={{ maxWidth: "150px" }}
                    required
                  />
                </div>
              </div>
              <div className="d-flex flex-row align-items-center">
                <span className="fw-bold me-2">Invoice&nbsp;Number:&nbsp;</span>
                <Form.Control
                  type="number"
                  value={invoiceNumber}
                  name="invoiceNumber"
                  onChange={handleChange(setInvoiceNumber)}
                  min="1"
                  style={{ maxWidth: "70px" }}
                  required
                />
              </div>
            </div>
            <hr className="my-4" />
            <Row className="mb-5">
              <Col>
                <Form.Label className="fw-bold">Bill from:</Form.Label>
                <Form.Control
                  placeholder="Who is this invoice from?"
                  rows={3}
                  value={billFrom}
                  type="text"
                  name="billFrom"
                  className="my-2"
                  onChange={handleChange(setBillFrom)}
                  autoComplete="name"
                  required
                />
                <Form.Control
                  placeholder="Email address"
                  value={billFromEmail}
                  type="email"
                  name="billFromEmail"
                  className="my-2"
                  onChange={handleChange(setBillFromEmail)}
                  autoComplete="email"
                  required
                />
                <Form.Control
                  placeholder="Billing address"
                  value={billFromAddress}
                  type="text"
                  name="billFromAddress"
                  className="my-2"
                  autoComplete="address"
                  onChange={handleChange(setBillFromAddress)}
                  required
                />
              </Col>
              <Col>
                <Form.Label className="fw-bold">Bill to:</Form.Label>
                <Form.Control
                  placeholder="Who is this invoice to?"
                  rows={3}
                  value={billTo}
                  type="text"
                  name="billTo"
                  className="my-2"
                  onChange={handleChange(setBillTo)}
                  autoComplete="name"
                  required
                />
                <Form.Control
                  placeholder="Email address"
                  value={billToEmail}
                  type="email"
                  name="billToEmail"
                  className="my-2"
                  onChange={handleChange(setBillToEmail)}
                  autoComplete="email"
                  required
                />
                <Form.Control
                  placeholder="Billing address"
                  value={billToAddress}
                  type="text"
                  name="billToAddress"
                  className="my-2"
                  autoComplete="address"
                  onChange={handleChange(setBillToAddress)}
                  required
                />
              </Col>
            </Row>
            <InvoiceItem
              onItemizedItemEdit={onItemizedItemEdit}
              onRowAdd={handleAddEvent}
              onRowDel={handleRowDel}
              currency={currency}
              items={items}
              isLocked={isLocked || !isOwner}
            />

            {/* ── Totals & GST Breakdown ── */}
            <Row className="mt-4 justify-content-end">
              <Col lg={6}>
                <div className="d-flex flex-row align-items-start justify-content-between">
                  <span className="fw-bold">Subtotal:</span>
                  <span>
                    {currency}
                    {subTotal}
                  </span>
                </div>

                {parseFloat(discountAmount) > 0 && (
                  <div className="d-flex flex-row align-items-start justify-content-between mt-2">
                    <span className="fw-bold">Discount:</span>
                    <span>
                      <span className="small">({discountRate || 0}%)</span> -{currency}
                      {discountAmount}
                    </span>
                  </div>
                )}

                {/* GST Breakdown */}
                {gstType === "intra" && parseFloat(taxRate) > 0 && (
                  <>
                    <div className="d-flex flex-row align-items-start justify-content-between mt-2">
                      <span className="fw-bold text-success">CGST:</span>
                      <span>
                        <span className="small">({(parseFloat(taxRate) / 2).toFixed(1)}%)</span>{" "}
                        {currency}{cgst}
                      </span>
                    </div>
                    <div className="d-flex flex-row align-items-start justify-content-between mt-2">
                      <span className="fw-bold text-success">SGST:</span>
                      <span>
                        <span className="small">({(parseFloat(taxRate) / 2).toFixed(1)}%)</span>{" "}
                        {currency}{sgst}
                      </span>
                    </div>
                  </>
                )}

                {gstType === "inter" && parseFloat(taxRate) > 0 && (
                  <div className="d-flex flex-row align-items-start justify-content-between mt-2">
                    <span className="fw-bold text-primary">IGST:</span>
                    <span>
                      <span className="small">({taxRate}%)</span> {currency}{igst}
                    </span>
                  </div>
                )}

                {gstType === "none" && parseFloat(taxAmount) > 0 && (
                  <div className="d-flex flex-row align-items-start justify-content-between mt-2">
                    <span className="fw-bold">Tax:</span>
                    <span>
                      <span className="small">({taxRate || 0}%)</span> {currency}
                      {taxAmount}
                    </span>
                  </div>
                )}

                <hr />
                <div
                  className="d-flex flex-row align-items-start justify-content-between"
                  style={{ fontSize: "1.125rem" }}
                >
                  <span className="fw-bold">Total:</span>
                  <span className="fw-bold">
                    {currency}
                    {total || 0}
                    {serverValidated && (
                      <span
                        className="ms-2 badge bg-success bg-opacity-10 text-success border border-success border-opacity-25"
                        style={{ fontSize: '0.6rem', verticalAlign: 'middle' }}
                      >
                        ✓ Server Verified
                      </span>
                    )}
                  </span>
                </div>
              </Col>
            </Row>
            {!isOwner && (
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                🔒 Read-only — you are not the owner of this invoice.
              </div>
            )}
          </Card>
        </Col>
        <Col md={4} lg={3}>
          <div className="sticky-top pt-md-3 pt-xl-4">
            <InvoiceModal
              showModal={isOpen}
              closeModal={closeModal}
              info={{
                dateOfIssue,
                invoiceNumber,
                billTo,
                billToEmail,
                billToAddress,
                billFrom,
                billFromEmail,
                billFromAddress,
              }}
              items={items}
              currency={currency}
              subTotal={subTotal}
              taxAmount={taxAmount}
              discountAmount={discountAmount}
              total={total}
              status={status}
              gstType={gstType}
              taxRate={taxRate}
              cgst={cgst}
              sgst={sgst}
              igst={igst}
            />

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Status:</Form.Label>
              <Form.Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="btn btn-light my-1"
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <Form.Label className="fw-bold mb-0">Currency:</Form.Label>
                {isOwner && (
                  <Button
                    variant="link"
                    size="sm"
                    className="text-muted p-0"
                    style={{ fontSize: '0.75rem', textDecoration: 'none' }}
                    onClick={async () => {
                      const ok = await updateProfile({ currency: currency });
                      if (ok) toast.success("Default currency saved to your profile!");
                      else toast.error("Failed to save default currency.");
                    }}
                  >
                    ★ Save as Default
                  </Button>
                )}
              </div>
              <Form.Select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="btn btn-light my-1 text-start"
                aria-label="Change Currency"
              >
                {CURRENCY_OPTIONS.map((opt) => (
                  <option key={opt.symbol} value={opt.symbol}>
                    {opt.label} ({opt.symbol})
                  </option>
                ))}
              </Form.Select>
              <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>
                * Selecting a new currency updates all price fields in real-time.
              </div>
            </Form.Group>

            {/* ── GST Type Selector ── */}
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">GST Type:</Form.Label>
              <Form.Select
                value={gstType}
                onChange={(e) => {
                  const val = e.target.value;
                  setGstType(val);
                  if (val === "none") {
                    setTaxRate(0);
                    setIsCustomTax(false);
                  }
                }}
                className="btn btn-light my-1"
              >
                <option value="none">No GST</option>
                <option value="intra">Intra-State (CGST + SGST)</option>
                <option value="inter">Inter-State (IGST)</option>
              </Form.Select>
            </Form.Group>

            {/* ── GST Rate with Slab Presets ── */}
            <Form.Group className="my-3">
              <Form.Label className="fw-bold">
                {gstType === "none" ? "Tax rate:" : "GST rate:"}
              </Form.Label>
              {gstType !== "none" && (
                <div className="d-flex gap-1 mb-2 flex-wrap">
                  {GST_SLABS.map((slab) => (
                    <Button
                      key={slab}
                      size="sm"
                      variant={
                        parseFloat(taxRate) === slab
                          ? "primary"
                          : "outline-secondary"
                      }
                      onClick={() => {
                        setTaxRate(slab);
                        setIsCustomTax(false);
                      }}
                      style={{ minWidth: "42px", fontSize: "0.75rem" }}
                    >
                      {slab}%
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    variant={isCustomTax ? "primary" : "outline-secondary"}
                    onClick={() => setIsCustomTax(true)}
                    style={{ minWidth: "42px", fontSize: "0.75rem" }}
                  >
                    Custom
                  </Button>
                </div>
              )}
              <InputGroup className="my-1 flex-nowrap">
                <Form.Control
                  name="taxRate"
                  type="number"
                  value={taxRate}
                  onChange={handleChange(setTaxRate)}
                  className="bg-white border"
                  placeholder="0.0"
                  min="0.00"
                  step="0.01"
                  max="100.00"
                  readOnly={!isCustomTax}
                  style={!isCustomTax ? { backgroundColor: '#f8f9fa', cursor: 'not-allowed' } : {}}
                />
                <InputGroup.Text className="bg-light fw-bold text-secondary small">
                  %
                </InputGroup.Text>
              </InputGroup>
              {gstType === "intra" && parseFloat(taxRate) > 0 && (
                <div className="small text-muted mt-1">
                  CGST: {(parseFloat(taxRate) / 2).toFixed(1)}% + SGST:{" "}
                  {(parseFloat(taxRate) / 2).toFixed(1)}%
                </div>
              )}
            </Form.Group>

            <Form.Group className="my-3">
              <Form.Label className="fw-bold">Discount rate:</Form.Label>
              <InputGroup className="my-1 flex-nowrap">
                <Form.Control
                  name="discountRate"
                  type="number"
                  value={discountRate}
                  onChange={handleChange(setDiscountRate)}
                  className="bg-white border"
                  placeholder="0.0"
                  min="0.00"
                  step="0.01"
                  max="100.00"
                />
                <InputGroup.Text className="bg-light fw-bold text-secondary small">
                  %
                </InputGroup.Text>
              </InputGroup>
            </Form.Group>
            <hr className="mt-4 mb-3" />

            {/* ── Save Invoice Button (Server-Validated) ── */}
            <Button
              variant="success"
              className="d-block w-100 mb-2"
              onClick={handleSaveInvoice}
              disabled={saving || secureValidating}
            >
              {secureValidating
                ? "Validating & Saving..."
                : saving
                  ? "Saving..."
                  : invoiceId
                    ? "Update Invoice"
                    : "Save Invoice"}
            </Button>

            <Button
              variant="primary"
              type="submit"
              className="d-block w-100 btn-secondary mb-2"
            >
              Review Invoice
            </Button>

            <Button
              variant="outline-secondary"
              className="d-block w-100"
              onClick={() => navigate("/dashboard")}
            >
              Back to Dashboard
            </Button>
          </div>
        </Col>
      </Row>
    </Form>
  );
};

export default InvoiceForm;