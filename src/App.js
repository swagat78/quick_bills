import React, { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import { Button, Navbar, Container, Spinner, Nav, Dropdown } from "react-bootstrap";
import { BiChevronLeft, BiSun, BiMoon } from "react-icons/bi";
import InvoiceForm from "./components/InvoiceForm";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import BusinessHealth from "./components/BusinessHealth";
import PublicInvoice from "./components/PublicInvoice";
import { supabase } from "./supabaseClient";

// 🛡️ Middleware-style Protected Route component
const ProtectedRoute = ({ session, children }) => {
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// ── Navigation Component (to access router hooks) ──
const Navigation = ({ session, handleLogout }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = React.useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  // Show back button only on /create (invoice form) or /analytics
  const isFormPage = location.pathname === "/create";
  const isAnalyticsPage = location.pathname === "/analytics";
  const showBack = isFormPage || isAnalyticsPage;

  if (!session) return null;

  return (
    <Navbar bg="white" className="border-bottom px-3 py-1 sticky-top theme-navbar shadow-sm" style={{ minHeight: '50px' }}>
      <Container className="d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-2">
          {showBack && (
            <Button 
              variant="light" 
              size="sm" 
              className="p-1 d-flex align-items-center justify-content-center rounded-circle border-0 bg-transparent text-muted dark:text-slate-400 dark:hover:bg-slate-800"
              onClick={() => navigate("/dashboard")}
              title="Back to Dashboard"
            >
              <BiChevronLeft size={22} />
            </Button>
          )}
          <Navbar.Brand 
            as={Link} 
            to="/dashboard" 
            className="fw-bold text-primary m-0 p-0 dark:text-blue-400"
            style={{ fontSize: '1.25rem', letterSpacing: '-0.5px' }}
          >
            QuickBills
          </Navbar.Brand>
        </div>
        
        <div className="d-flex align-items-center gap-2">
          <div className="position-relative" ref={dropdownRef}>
            <Button 
              variant="light" 
              size="sm" 
              className="border-0 bg-transparent d-flex align-items-center gap-1 fw-medium text-muted dark:text-slate-300 dark:hover:bg-slate-800"
              style={{ fontSize: '0.85rem' }}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              Account
            </Button>
            
            {dropdownOpen && (
              <div 
                className="position-absolute end-0 mt-2 industrial-section shadow-lg p-0 overflow-hidden" 
                style={{ width: '220px', zIndex: 1000, top: '100%' }}
              >
                <div className="px-3 py-2 border-bottom dark:border-slate-800 bg-light bg-opacity-10 dark:bg-slate-900">
                  <div className="text-muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                    Logged in as
                  </div>
                  <div className="text-truncate text-slate-400" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {session.user.email}
                  </div>
                </div>
                <button 
                  className="w-100 text-start px-3 py-2 border-0 bg-transparent text-danger hover-bg-danger-soft transition-colors" 
                  onClick={() => {
                    handleLogout();
                    setDropdownOpen(false);
                  }}
                  style={{ fontSize: '0.85rem' }}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </Container>
    </Navbar>
  );
};

const App = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="grow" variant="primary" />
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Navigation session={session} handleLogout={handleLogout} />

        <Routes>
          {/* Public route — no auth needed */}
          <Route path="/invoice/public/:token" element={<PublicInvoice />} />

          <Route 
            path="/login" 
            element={!session ? <Auth /> : <Navigate to="/dashboard" replace />} 
          />
          
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute session={session}>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/create" 
            element={
              <ProtectedRoute session={session}>
                <InvoiceForm />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/analytics" 
            element={
              <ProtectedRoute session={session}>
                <BusinessHealth />
              </ProtectedRoute>
            } 
          />

          <Route path="/" element={<Navigate to={session ? "/dashboard" : "/login"} replace />} />
        </Routes>

        {/* Global Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#2d3436',
              color: '#fff',
              borderRadius: '12px',
              padding: '12px 20px',
              fontSize: '0.9rem',
              fontWeight: 500,
              boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
            },
            success: {
              iconTheme: { primary: '#00b894', secondary: '#fff' },
              duration: 3000,
            },
            error: {
              iconTheme: { primary: '#d63031', secondary: '#fff' },
              duration: 4000,
            },
          }}
        />
      </div>
    </Router>
  );
};

export default App;