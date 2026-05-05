import React, { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import { Button, Navbar, Container, Spinner, Nav } from "react-bootstrap";
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
const Navigation = ({ session, handleLogout, theme, toggleTheme }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Show back button only on /create (invoice form) or /analytics
  const isFormPage = location.pathname === "/create";
  const isAnalyticsPage = location.pathname === "/analytics";
  const showBack = isFormPage || isAnalyticsPage;

  if (!session) return null;

  return (
    <Navbar bg="white" className="border-bottom px-4 py-3 sticky-top theme-navbar">
      <Container>
        <div className="d-flex align-items-center gap-3">
          {showBack && (
            <Button 
              variant="light" 
              size="sm" 
              className="d-flex align-items-center gap-1 text-muted border-0 bg-transparent"
              onClick={() => navigate("/dashboard")}
              style={{ fontSize: '0.9rem', fontWeight: 500 }}
            >
              <BiChevronLeft size={20} /> Back to Dashboard
            </Button>
          )}
          {!showBack && (
            <Navbar.Brand as={Link} to="/dashboard" className="fw-bold fs-4 text-primary m-0 p-0">
              QuickBills
            </Navbar.Brand>
          )}
        </div>
        
        <div className="d-flex align-items-center gap-2 gap-md-3">
          <Button 
            variant="light" 
            size="sm" 
            className="rounded-circle p-2 d-flex align-items-center justify-content-center border-0 bg-transparent theme-toggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <BiSun size={20} className="text-warning" /> : <BiMoon size={20} className="text-primary" />}
          </Button>

          <span className="text-muted small d-none d-md-block">
            {session.user.email}
          </span>
          <Button variant="outline-danger" size="sm" onClick={handleLogout}>
            Sign Out
          </Button>
        </div>
      </Container>
    </Navbar>
  );
};

const App = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

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
        <Navigation session={session} handleLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />

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