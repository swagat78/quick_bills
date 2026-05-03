import React from "react";
import { BiSearch } from "react-icons/bi";
import "./DashboardFilters.css";

const DashboardFilters = ({ filters, setFilters, activeCount, resultCount }) => {
  const handleChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearAll = () => {
    setFilters({
      search: "",
      status: "",
      dateFrom: "",
      dateTo: "",
      amountMin: "",
      amountMax: "",
    });
  };

  return (
    <div className="df-container">
      {/* Search Bar */}
      <div className="df-search-wrapper">
        <BiSearch className="df-search-icon" />
        <input
          className="df-search-input"
          type="text"
          placeholder="Search by customer name, email, or invoice number..."
          value={filters.search}
          onChange={(e) => handleChange("search", e.target.value)}
        />
      </div>

      {/* Filter Row */}
      <div className="df-filters">
        {/* Status */}
        <div className="df-filter-group">
          <label className="df-filter-label">Status</label>
          <select
            className="df-filter-select"
            value={filters.status}
            onChange={(e) => handleChange("status", e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        {/* Date From */}
        <div className="df-filter-group">
          <label className="df-filter-label">From Date</label>
          <input
            className="df-filter-input"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleChange("dateFrom", e.target.value)}
          />
        </div>

        {/* Date To */}
        <div className="df-filter-group">
          <label className="df-filter-label">To Date</label>
          <input
            className="df-filter-input"
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleChange("dateTo", e.target.value)}
          />
        </div>

        {/* Amount Min */}
        <div className="df-filter-group">
          <label className="df-filter-label">Min Amount</label>
          <input
            className="df-filter-input"
            type="number"
            placeholder="₹0"
            min="0"
            value={filters.amountMin}
            onChange={(e) => handleChange("amountMin", e.target.value)}
          />
        </div>

        {/* Amount Max */}
        <div className="df-filter-group">
          <label className="df-filter-label">Max Amount</label>
          <input
            className="df-filter-input"
            type="number"
            placeholder="₹∞"
            min="0"
            value={filters.amountMax}
            onChange={(e) => handleChange("amountMax", e.target.value)}
          />
        </div>

        {/* Clear */}
        <button className="df-clear-btn" onClick={clearAll}>
          Clear
          {activeCount > 0 && <span className="df-active-count">{activeCount}</span>}
        </button>
      </div>

      {/* Results Info */}
      {activeCount > 0 && (
        <div className="df-results-info">
          Showing {resultCount} invoice{resultCount !== 1 ? "s" : ""} matching{" "}
          {activeCount} filter{activeCount !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
};

export default DashboardFilters;
