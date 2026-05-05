import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { Container, Table, Button, Badge, Spinner, Dropdown, ButtonGroup } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { BiPlus, BiFile, BiShow, BiBarChartAlt2, BiDownload, BiLink } from "react-icons/bi";
import toast from "react-hot-toast";
import { exportAsCSV, exportAsExcel } from "../utils/exportInvoices";
import useDebounce from "../hooks/useDebounce";
import DashboardFilters from "./DashboardFilters";

const INITIAL_FILTERS = {
  search: "",
  status: "",
  dateFrom: "",
  dateTo: "",
  amountMin: "",
  amountMax: "",
};

const Dashboard = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const navigate = useNavigate();

  // Debounce the search input (400ms delay)
  const debouncedSearch = useDebounce(filters.search, 400);

  // Count active filters for the badge
  const activeFilterCount = [
    debouncedSearch,
    filters.status,
    filters.dateFrom,
    filters.dateTo,
    filters.amountMin,
    filters.amountMax,
  ].filter(Boolean).length;

  // ── Optimized Supabase Query with Server-Side Filtering ──
  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Start building the query
      let query = supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });

      // Filter: Status
      if (filters.status) {
        query = query.eq("status", filters.status);
      }

      // Filter: Date range (using date_of_issue or created_at)
      if (filters.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }
      if (filters.dateTo) {
        // Add one day to include the end date
        const endDate = new Date(filters.dateTo);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt("created_at", endDate.toISOString().split("T")[0]);
      }

      // Filter: Amount range
      if (filters.amountMin) {
        query = query.gte("total", parseFloat(filters.amountMin));
      }
      if (filters.amountMax) {
        query = query.lte("total", parseFloat(filters.amountMax));
      }

      // Filter: Search (name, email, or invoice number)
      // Supabase supports .or() for multi-column text search
      if (debouncedSearch) {
        const term = `%${debouncedSearch}%`;
        query = query.or(
          `bill_to.ilike.${term},bill_to_email.ilike.${term},bill_from.ilike.${term},invoice_number.eq.${parseInt(debouncedSearch) || -1}`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters.status, filters.dateFrom, filters.dateTo, filters.amountMin, filters.amountMax]);

  // Re-fetch when any filter changes (debounced search included)
  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleExport = async (format) => {
    try {
      setExporting(true);
      if (format === "csv") {
        await exportAsCSV();
      } else {
        await exportAsExcel();
      }
      toast.success(`Exported as ${format.toUpperCase()} successfully!`);
    } catch (err) {
      toast.error(err.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  // ── Share invoice link ──
  const handleShare = async (invoiceId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return toast.error("You must be logged in.");

      const res = await fetch(`http://localhost:3001/api/invoice/${invoiceId}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to generate share link.");
      }

      const shareUrl = `${window.location.origin}/invoice/public/${result.token}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied to clipboard!");
    } catch (err) {
      toast.error(err.message || "Failed to share.");
    }
  };

  // Status badge color mapping
  const getStatusBadge = (status) => {
    const map = {
      paid: { bg: "success", text: "text-success", border: "border-success" },
      sent: { bg: "primary", text: "text-primary", border: "border-primary" },
      overdue: { bg: "danger", text: "text-danger", border: "border-danger" },
      draft: { bg: "secondary", text: "text-secondary", border: "border-secondary" },
    };
    const s = (status || "draft").toLowerCase();
    const style = map[s] || map.draft;
    return (
      <Badge
        bg={style.bg}
        className={`bg-opacity-10 ${style.text} border ${style.border} border-opacity-25 px-2 py-1`}
      >
        {s.charAt(0).toUpperCase() + s.slice(1)}
      </Badge>
    );
  };

  return (
    <Container className="py-5">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 dash-header">
        <div>
          <h2 className="fw-bold">Your Invoices</h2>
          <p className="text-muted mb-0">Manage and track all your bills in one place.</p>
        </div>
        <div className="d-flex gap-2 flex-wrap dash-actions">
          <Dropdown as={ButtonGroup}>
            <Button
              variant="outline-secondary"
              className="d-flex align-items-center gap-2 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white"
              onClick={() => handleExport("excel")}
              disabled={exporting || invoices.length === 0}
            >
              <BiDownload size={18} />
              {exporting ? "Exporting..." : "Export"}
            </Button>
            <Dropdown.Toggle
              split
              variant="outline-secondary"
              disabled={exporting || invoices.length === 0}
            />
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => handleExport("excel")}>
                📊 Excel (.xlsx)
              </Dropdown.Item>
              <Dropdown.Item onClick={() => handleExport("csv")}>
                📄 CSV (.csv)
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
          <Button 
            variant="outline-dark" 
            className="d-flex align-items-center gap-2 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white"
            onClick={() => navigate("/analytics")}
          >
            <BiBarChartAlt2 size={20} /> <span className="d-none d-sm-inline">Business Health</span><span className="d-sm-none">Health</span>
          </Button>
          <Button 
            variant="primary" 
            className="d-flex align-items-center gap-2 px-3 py-2 shadow-sm"
            onClick={() => navigate("/create")}
          >
            <BiPlus size={20} /> <span className="d-none d-sm-inline">New Invoice</span><span className="d-sm-none">New</span>
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <DashboardFilters
        filters={filters}
        setFilters={setFilters}
        activeCount={activeFilterCount}
        resultCount={invoices.length}
      />

      {/* Content */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading your workspace...</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-5 bg-light rounded-4 border border-dashed">
          <BiFile size={48} className="text-muted mb-3" />
          <h4>{activeFilterCount > 0 ? "No matching invoices" : "No invoices found"}</h4>
          <p className="text-muted">
            {activeFilterCount > 0
              ? "Try adjusting your filters or search query."
              : "Start by creating your first professional invoice."}
          </p>
          {activeFilterCount > 0 ? (
            <Button
              variant="outline-dark"
              onClick={() => setFilters(INITIAL_FILTERS)}
            >
              Clear All Filters
            </Button>
          ) : (
            <Button variant="outline-primary" onClick={() => navigate("/create")}>
              Create Now
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* ── Desktop Table ── */}
          <div className="bg-white rounded-4 shadow-sm overflow-hidden border invoice-desktop-table">
            <Table responsive hover className="mb-0 align-middle">
              <thead className="bg-light">
                <tr>
                  <th className="px-4 py-3 text-uppercase small fw-bold text-muted">Invoice #</th>
                  <th className="py-3 text-uppercase small fw-bold text-muted">Billed To</th>
                  <th className="py-3 text-uppercase small fw-bold text-muted d-none d-md-table-cell">Date</th>
                  <th className="py-3 text-uppercase small fw-bold text-muted">Amount</th>
                  <th className="py-3 text-uppercase small fw-bold text-muted">Status</th>
                  <th className="px-4 py-3 text-end text-uppercase small fw-bold text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-4 fw-medium">INV-{inv.invoice_number}</td>
                    <td>
                      <div>{inv.bill_to || "No Name"}</div>
                      <div className="small text-muted d-none d-lg-block">{inv.bill_to_email}</div>
                    </td>
                    <td className="d-none d-md-table-cell">{inv.date_of_issue ? new Date(inv.date_of_issue).toLocaleDateString() : "—"}</td>
                    <td className="fw-bold">
                      {inv.currency}{inv.total}
                    </td>
                    <td>{getStatusBadge(inv.status)}</td>
                    <td className="px-4 text-end">
                      <Button
                        variant="light"
                        size="sm"
                        className="me-1"
                        title="Share public link"
                        onClick={() => handleShare(inv.id)}
                      >
                        <BiLink />
                      </Button>
                      <Button variant="light" size="sm" className="me-1">
                        <BiShow />
                      </Button>
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        onClick={() => navigate(`/create?id=${inv.id}`)}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          {/* ── Mobile Cards ── */}
          <div className="invoice-mobile-cards">
            {invoices.map((inv) => (
              <div className="invoice-card-item" key={inv.id}>
                <div className="invoice-card-header">
                  <span className="invoice-card-id">INV-{inv.invoice_number}</span>
                  {getStatusBadge(inv.status)}
                </div>
                <div className="invoice-card-body">
                  <div className="invoice-card-field">
                    <span className="invoice-card-label">Client</span>
                    <span className="invoice-card-value">{inv.bill_to || "No Name"}</span>
                  </div>
                  <div className="invoice-card-field">
                    <span className="invoice-card-label">Amount</span>
                    <span className="invoice-card-value amount">{inv.currency}{inv.total}</span>
                  </div>
                  <div className="invoice-card-field">
                    <span className="invoice-card-label">Date</span>
                    <span className="invoice-card-value">
                      {inv.date_of_issue ? new Date(inv.date_of_issue).toLocaleDateString() : "—"}
                    </span>
                  </div>
                  <div className="invoice-card-field">
                    <span className="invoice-card-label">Email</span>
                    <span className="invoice-card-value" style={{ fontSize: '0.8rem' }}>
                      {inv.bill_to_email || "—"}
                    </span>
                  </div>
                </div>
                <div className="invoice-card-actions">
                  <Button variant="light" size="sm" onClick={() => handleShare(inv.id)}>
                    <BiLink className="me-1" /> Share
                  </Button>
                  <Button variant="outline-secondary" size="sm" onClick={() => navigate(`/create?id=${inv.id}`)}>
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Container>
  );
};

export default Dashboard;
