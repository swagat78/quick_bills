import React, { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import { Button, Navbar, Container, Spinner } from "react-bootstrap";
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

const App = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

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
        {session && (
          <Navbar bg="white" className="border-bottom px-4 py-3 sticky-top">
            <Container>
              <Navbar.Brand href="/dashboard" className="fw-bold fs-4 text-primary">
                QuickBills
              </Navbar.Brand>
              <div className="d-flex align-items-center gap-3">
                <span className="text-muted small d-none d-md-block">
                  {session.user.email}
                </span>
                <Button variant="outline-danger" size="sm" onClick={handleLogout}>
                  Sign Out
                </Button>
              </div>
            </Container>
          </Navbar>
        )}

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