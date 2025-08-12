import React, { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import smsService from "../services/smsService"; // expects sendSMS(numbersArray, message)

const SmsForm = () => {
  const [numbersInput, setNumbersInput] = useState(""); // raw input (comma/newline separated)
  const [message, setMessage] = useState("");
  const [validNumbers, setValidNumbers] = useState([]); // array of strings formatted +256...
  const [invalidNumbers, setInvalidNumbers] = useState([]); // [{ raw, formatted, reason }]
  const [loading, setLoading] = useState(false);

  // Helper: normalize and validate one number
  const normalizeAndValidate = (raw) => {
    const trimmed = String(raw || "").trim();
    if (!trimmed) return { valid: false, formatted: "", reason: "empty" };

    // quick letter check on raw (before removing allowed symbols)
    if (/[A-Za-z]/.test(trimmed)) {
      return { valid: false, formatted: trimmed, reason: "contains letters" };
    }

    // Remove spaces and common separators
    let s = trimmed.replace(/[\s-()]/g, "");

    // Keep leading + if there is one, otherwise only digits
    if (s.startsWith("+")) {
      s = "+" + s.slice(1).replace(/\D/g, "");
    } else {
      s = s.replace(/\D/g, "");
    }

    // Transform to candidate with +256
    let candidate = s;

    // If digits only and starts with 0 (e.g., 0712345678)
    if (!candidate.startsWith("+") && candidate.startsWith("0") && candidate.length === 10) {
      candidate = "+256" + candidate.slice(1);
    }
    // If digits only and 9 digits like 712345678
    else if (!candidate.startsWith("+") && candidate.length === 9) {
      candidate = "+256" + candidate;
    }
    // If digits only and starts with 256 (256712345678)
    else if (!candidate.startsWith("+") && candidate.startsWith("256") && candidate.length === 12) {
      candidate = "+" + candidate;
    }
    // If candidate starts with +256 but perhaps has wrong length we will check below
    else if (!candidate.startsWith("+")) {
      // fallback attempt: prefix +256 if length plausible (e.g., user entered 7123456780)
      // but avoid forcing on odd lengths; we will mark invalid later if length wrong
      if (candidate.length >= 8 && candidate.length <= 12 && !candidate.startsWith("256")) {
        // try to make it +256 + last up-to-9 digits
        candidate = "+256" + candidate.slice(-9);
      } else {
        // leave candidate as digits (will be validated)
      }
    }

    // Final sanitization: ensure candidate has only + and digits
    if (candidate.startsWith("+")) candidate = "+" + candidate.slice(1).replace(/\D/g, "");
    else candidate = candidate.replace(/\D/g, "");

    // Validate final
    const digitsOnly = candidate.startsWith("+") ? candidate.slice(1) : candidate;

    // must start with 256
    if (!digitsOnly.startsWith("256")) {
      return { valid: false, formatted: candidate, reason: "missing country code (256)" };
    }

    // Accept +256 + 9 digits (mobile) => digitsOnly length 12
    // Accept +256 + 8 digits (landline) => digitsOnly length 11
    if (digitsOnly.length === 12 || digitsOnly.length === 11) {
      // good: return formatted with leading +
      return { valid: true, formatted: "+" + digitsOnly, reason: null };
    }

    // otherwise invalid length
    return { valid: false, formatted: "+" + digitsOnly, reason: "invalid length" };
  };

  // parse raw input into arrays (runs in real-time)
  useEffect(() => {
    const parts = numbersInput
      .split(/[\n,;]+/) // split by newlines, commas, semicolons
      .map((x) => x.trim())
      .filter((x) => x.length > 0);

    const valids = [];
    const invalids = [];

    const seen = new Set();

    for (const raw of parts) {
      const res = normalizeAndValidate(raw);
      // dedupe by formatted number for valids
      if (res.valid) {
        if (!seen.has(res.formatted)) {
          valids.push(res.formatted);
          seen.add(res.formatted);
        }
      } else {
        // include the reason and raw input for inspection
        invalids.push({ raw, formatted: res.formatted || raw, reason: res.reason });
      }
    }

    setValidNumbers(valids);
    setInvalidNumbers(invalids);
  }, [numbersInput]);

  const handleSend = async (e) => {
    e.preventDefault();

    // Validation: message non-empty
    if (!message.trim()) {
      toast.error("Message cannot be empty");
      return;
    }

    if (validNumbers.length === 0) {
      toast.error("No valid numbers to send to");
      return;
    }

    setLoading(true);
    try {
      // expected smsService.sendSMS(numbersArray, message)
      await smsService.sendSMS(validNumbers, message);

      toast.success(`Sent to ${validNumbers.length} number(s)`);
      // Clear only the numbers that were sent
      // Keep invalid numbers visible for user to fix
      setNumbersInput("");
      setMessage("");
      setValidNumbers([]);
      // optionally you can keep invalidNumbers as is
    } catch (err) {
      console.error(err);
      toast.error("Failed to send SMS. Check backend or serial connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "20px auto", padding: 16 }}>
      <ToastContainer position="top-right" autoClose={3000} />
      <h2>Send SMS</h2>

      <form onSubmit={handleSend}>
        <label>Phone numbers (comma / newline / semicolon separated)</label>
        <textarea
          value={numbersInput}
          onChange={(e) => setNumbersInput(e.target.value)}
          placeholder="e.g. 0712345678, 712345678, +256712345678"
          rows={4}
          style={{ width: "100%", padding: 8, marginBottom: 12 }}
        />

        <label>Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message here..."
          rows={4}
          style={{ width: "100%", padding: 8, marginBottom: 12 }}
        />

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "10px 18px",
              background: "#0069d9",
              color: "#fff",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Sending..." : "Send SMS"}
          </button>

          {loading && (
            <div aria-hidden style={{ display: "inline-block" }}>
              <div className="spinner" />
            </div>
          )}

          <div style={{ marginLeft: "auto", fontSize: 14, color: "#555" }}>
            Valid: <strong>{validNumbers.length}</strong> • Invalid: <strong>{invalidNumbers.length}</strong>
          </div>
        </div>
      </form>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }}>
        <div>
          <h3>Valid Numbers ({validNumbers.length})</h3>
          <div style={{ background: "#fff", padding: 8, borderRadius: 6, minHeight: 60 }}>
            {validNumbers.length === 0 ? (
              <em style={{ color: "#666" }}>No valid numbers yet</em>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {validNumbers.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <h3>Invalid Numbers ({invalidNumbers.length})</h3>
          <div style={{ background: "#fff", padding: 8, borderRadius: 6, minHeight: 60 }}>
            {invalidNumbers.length === 0 ? (
              <em style={{ color: "#666" }}>No invalid numbers</em>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {invalidNumbers.map((it, idx) => (
                  <li key={idx}>
                    <strong>{it.raw}</strong>
                    {" → "}
                    <span style={{ color: "#c00" }}>{it.formatted}</span>
                    {" — "}
                    <em style={{ color: "#555" }}>{it.reason}</em>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* small spinner CSS */}
      <style>{`
        .spinner {
          width: 18px;
          height: 18px;
          border: 3px solid rgba(0,0,0,0.12);
          border-top-color: rgba(0,0,0,0.6);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        textarea { font-size: 14px; }
      `}</style>
    </div>
  );
};

export default SmsForm;
