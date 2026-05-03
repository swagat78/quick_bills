import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Container, Table, Button, Badge, Spinner, Dropdown, ButtonGroup } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { BiPlus, BiFile, BiShow, BiBarChartAlt2, BiDownload } from "react-icons/bi";
import { exportAsCSV, exportAsExcel } from "../utils/exportInvoices";

const Dashboard = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const navigate = useNavigate();

  const handleExport = async (format) => {
    try {
      setExporting(true);
      if (format === "csv") {
        await exportAsCSV();
      } else {
        await exportAsExcel();
      }
    } catch (err) {
      alert(err.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-5">
      <div className="d-flex justify-content-between align-items-center mb-5">
        <div>
          <h2 className="fw-bold">Your Invoices</h2>
          <p className="text-muted">Manage and track all your bills in one place.</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <Dropdown as={ButtonGroup}>
            <Button
              variant="outline-secondary"
              className="d-flex align-items-center gap-2 px-3 py-2"
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
            className="d-flex align-items-center gap-2 px-3 py-2"
            onClick={() => navigate("/analytics")}
          >
            <BiBarChartAlt2 size={20} /> Business Health
          </Button>
          <Button 
            variant="primary" 
            className="d-flex align-items-center gap-2 px-3 py-2 shadow-sm"
            onClick={() => navigate("/create")}
          >
            <BiPlus size={20} /> New Invoice
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading your workspace...</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-5 bg-light rounded-4 border border-dashed">
          <BiFile size={48} className="text-muted mb-3" />
          <h4>No invoices found</h4>
          <p className="text-muted">Start by creating your first professional invoice.</p>
          <Button variant="outline-primary" onClick={() => navigate("/create")}>
            Create Now
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-4 shadow-sm overflow-hidden border">
          <Table responsive hover className="mb-0 align-middle">
            <thead className="bg-light">
              <tr>
                <th className="px-4 py-3 text-uppercase small fw-bold text-muted">Invoice #</th>
                <th className="py-3 text-uppercase small fw-bold text-muted">Billed To</th>
                <th className="py-3 text-uppercase small fw-bold text-muted">Date</th>
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
                    <div className="small text-muted">{inv.bill_to_email}</div>
                  </td>
                  <td>{new Date(inv.date_of_issue).toLocaleDateString()}</td>
                  <td className="fw-bold">
                    {inv.currency}{inv.total}
                  </td>
                  <td>
                    <Badge bg="success" className="bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1">
                      {inv.status || "Draft"}
                    </Badge>
                  </td>
                  <td className="px-4 text-end">
                    <Button variant="light" size="sm" className="me-2">
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
      )}
    </Container>
  );
};

export default Dashboard;
