import React, { useState } from "react";
import "./AIPrompt.css";

const AI_SERVER = "http://localhost:3001";

const AIPrompt = ({ onAutoFill }) => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: "success"|"error", msg }

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch(`${AI_SERVER}/api/ai-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "AI generation failed.");
      }

      // Pass the parsed data up to InvoiceForm
      onAutoFill(result.data);

      setFeedback({
        type: "success",
        msg: `✓ Auto-filled ${result.data.items?.length || 0} item(s) from your prompt.`,
      });
      setPrompt("");
    } catch (err) {
      setFeedback({
        type: "error",
        msg: err.message || "Something went wrong. Try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !loading) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="ai-prompt-wrapper">
      <div className="ai-label">
        AI Auto-Fill <span className="ai-badge">BETA</span>
      </div>
      <div className="ai-prompt-bar">
        <span className="ai-prompt-icon">✨</span>
        <input
          className="ai-prompt-input"
          type="text"
          placeholder='e.g. "Invoice for 3 web designs at ₹15000 each with 18% GST"'
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          className="ai-prompt-btn"
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
        >
          {loading ? (
            <span>
              Generating<span className="ai-loading-dots"></span>
            </span>
          ) : (
            "Generate"
          )}
        </button>
      </div>

      {feedback && (
        <div className={`ai-feedback ${feedback.type}`}>{feedback.msg}</div>
      )}
    </div>
  );
};

export default AIPrompt;
