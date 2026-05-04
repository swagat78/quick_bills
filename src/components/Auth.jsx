import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";
import "./Auth.css";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Verification email sent! Check your inbox.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>QuickBills</h2>
          <p>{isSignUp ? "Join our community today" : "Welcome back, please login"}</p>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleAuth}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              className="auth-input"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              className="auth-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? "Authenticating..." : isSignUp ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div className="auth-footer">
          {isSignUp ? "Already have an account?" : "New to QuickBills?"}
          <span className="auth-link" onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? "Sign In" : "Create Account"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Auth;
