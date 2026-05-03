import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import { Container, Button, Navbar } from "react-bootstrap";
import InvoiceForm from "./components/InvoiceForm";
import Auth from "./components/Auth";
import { supabase } from "./supabaseClient";

const App = () => {
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for changes (login/logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="App">
      {!session ? (
        <Auth />
      ) : (
        <>
          <Navbar bg="dark" variant="dark" className="mb-4 px-4 justify-content-between">
            <Navbar.Brand href="#home">QuickBills</Navbar.Brand>
            <div className="d-flex align-items-center">
              <span className="text-light me-3 small">{session.user.email}</span>
              <Button variant="outline-light" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </Navbar>
          <Container>
            <InvoiceForm />
          </Container>
        </>
      )}
    </div>
  );
};

export default App;