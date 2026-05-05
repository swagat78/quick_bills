import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import "./BusinessHealth.css";

const COLORS = {
  paid: "#00b894",
  pending: "#fdcb6e",
  overdue: "#d63031",
  draft: "#b2bec3",
  sent: "#0984e3",
};

const BusinessHealth = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      console.error("Error fetching invoices:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── KPI Calculations ──
  const totalRevenue = invoices.reduce(
    (sum, inv) => sum + parseFloat(inv.total || 0),
    0
  );

  const paidInvoices = invoices.filter((inv) => inv.status === "paid");
  const pendingInvoices = invoices.filter(
    (inv) => inv.status !== "paid" && inv.status !== "cancelled"
  );

  const paidRevenue = paidInvoices.reduce(
    (sum, inv) => sum + parseFloat(inv.total || 0),
    0
  );

  // Fiscal year: April 1 → March 31
  const now = new Date();
  const fiscalYearStart =
    now.getMonth() >= 3
      ? new Date(now.getFullYear(), 3, 1) // April of current year
      : new Date(now.getFullYear() - 1, 3, 1); // April of previous year

  const taxCollected = invoices
    .filter((inv) => {
      const d = new Date(inv.created_at);
      return d >= fiscalYearStart && inv.status === "paid";
    })
    .reduce((sum, inv) => sum + parseFloat(inv.tax_amount || 0), 0);

  // ── Revenue Over Time (Line Chart Data) ──
  const revenueByMonth = {};
  invoices.forEach((inv) => {
    const d = new Date(inv.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
    if (!revenueByMonth[key]) {
      revenueByMonth[key] = { month: label, revenue: 0, count: 0 };
    }
    revenueByMonth[key].revenue += parseFloat(inv.total || 0);
    revenueByMonth[key].count += 1;
  });

  const lineData = Object.keys(revenueByMonth)
    .sort()
    .map((key) => ({
      month: revenueByMonth[key].month,
      revenue: parseFloat(revenueByMonth[key].revenue.toFixed(2)),
    }));

  // ── Status Breakdown (Pie Chart Data) ──
  const statusCounts = {};
  invoices.forEach((inv) => {
    const s = inv.status || "draft";
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });

  const pieData = Object.keys(statusCounts).map((key) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: statusCounts[key],
    color: COLORS[key] || "#b2bec3",
  }));

  // ── Custom Tooltip ──
  const RevenueTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: "#2d3436",
            color: "#fff",
            padding: "10px 14px",
            borderRadius: "8px",
            fontSize: "0.85rem",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
          <div>
            Revenue:{" "}
            <span style={{ color: "#00cec9" }}>
              ₹{payload[0].value.toLocaleString()}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bh-loading">
        <div className="spinner"></div>
        <p>Crunching your numbers...</p>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="bh-container">
        <div className="bh-empty">
          <h3>No Data Yet</h3>
          <p>Create and save some invoices to see your business analytics.</p>
          <button
            className="btn btn-primary mt-3"
            onClick={() => navigate("/create")}
          >
            Create Your First Invoice
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bh-container">
      {/* Back Navigation */}
      <a className="bh-back" href="/dashboard">
        ← Back to Dashboard
      </a>

      {/* Header */}
      <div className="bh-header">
        <h2>Business Health</h2>
        <p>
          Real-time financial overview across {invoices.length} invoice
          {invoices.length !== 1 ? "s" : ""}.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="bh-kpi-grid">
        <div className="bh-kpi-card revenue">
          <div className="bh-kpi-label">Total Revenue</div>
          <div className="bh-kpi-value">₹{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <div className="bh-kpi-sub">Lifetime earnings</div>
        </div>

        <div className="bh-kpi-card paid">
          <div className="bh-kpi-label">Paid Invoices</div>
          <div className="bh-kpi-value">{paidInvoices.length}</div>
          <div className="bh-kpi-sub">
            ₹{paidRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })} collected
          </div>
        </div>

        <div className="bh-kpi-card pending">
          <div className="bh-kpi-label">Pending</div>
          <div className="bh-kpi-value">{pendingInvoices.length}</div>
          <div className="bh-kpi-sub">Awaiting payment</div>
        </div>

        <div className="bh-kpi-card tax">
          <div className="bh-kpi-label">Tax Collected (FY)</div>
          <div className="bh-kpi-value">₹{taxCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <div className="bh-kpi-sub">Current fiscal year</div>
        </div>
      </div>

      {/* Charts */}
      <div className="bh-chart-grid">
        {/* Revenue Over Time */}
        <div className="bh-chart-card">
          <div className="bh-chart-title">Revenue Over Time</div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#636e72" }}
                axisLine={{ stroke: "#e9ecef" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#636e72" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `₹${val}`}
              />
              <Tooltip content={<RevenueTooltip />} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#0984e3"
                strokeWidth={3}
                dot={{
                  r: 5,
                  fill: "#0984e3",
                  stroke: "#fff",
                  strokeWidth: 2,
                }}
                activeDot={{ r: 7, stroke: "#0984e3", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Invoice Status Breakdown */}
        <div className="bh-chart-card">
          <div className="bh-chart-title">Invoice Status Breakdown</div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#2d3436",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "0.85rem",
                }}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: "0.8rem" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tax Summary */}
      <div className="bh-tax-card">
        <div className="bh-chart-title">Fiscal Year Tax Summary</div>
        <div className="bh-tax-value">
          ₹{taxCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
        <div className="bh-tax-label">
          Total tax collected from {paidInvoices.length} paid invoice
          {paidInvoices.length !== 1 ? "s" : ""} since{" "}
          {fiscalYearStart.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </div>
      </div>
    </div>
  );
};

export default BusinessHealth;
