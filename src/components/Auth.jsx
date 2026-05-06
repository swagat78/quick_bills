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
  const [isForgot, setIsForgot] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

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

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setForgotSent(true);
      toast.success("Password reset link sent! Check your email.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isForgot) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2>Reset Password</h2>
            <p>Enter your email to receive a reset link</p>
          </div>

          {error && <div className="error-msg">{error}</div>}
          {forgotSent && (
            <div className="success-msg">
              Check your email for a password reset link.
            </div>
          )}

          {!forgotSent && (
            <form onSubmit={handleForgotPassword}>
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

              <button className="auth-btn forgot-btn" type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          )}

          <div className="auth-footer">
            Remember your password?
            <span className="auth-link" onClick={() => { setIsForgot(false); setForgotSent(false); setError(null); }}>
              Back to Sign In
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className={`auth-card${isSignUp ? ' signup' : ''}`}>
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
          {isSignUp ? "Already have an account?" : "Forgot your password?"}
          <span className="auth-link" onClick={() => isSignUp ? setIsSignUp(false) : setIsForgot(true)}>
            {isSignUp ? "Sign In" : "Reset Password"}
          </span>
          {isSignUp && (
            <>
              <br />
              {"New to QuickBills?"}{" "}
              <span className="auth-link" onClick={() => {}}>
                Create Account
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
