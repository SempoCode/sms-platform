import React, { useState, useEffect, useContext } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import * as XLSX from "xlsx";
import smsService from "../services/smsService"; // expects sendSMS(numbersArray, message)
import { SmsContext } from "../context/SmsContext";


const SmsForm = () => {
  
  //States
  const { numbersInput, setNumbersInput, message, setMessage } = useContext(SmsContext);

  // Keep all your other states (validNumbers, loading, etc.)
  const [validNumbers, setValidNumbers] = useState([]);
  const [invalidNumbers, setInvalidNumbers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [carrierFilter, setCarrierFilter] = useState("both"); // "mtn", "airtel", "both"
  const [mtnNumbers, setMtnNumbers] = useState([]);
  const [airtelNumbers, setAirtelNumbers] = useState([]);
  const [charCount, setCharCount] = useState(0);
  const [smsCount, setSmsCount] = useState(1);
  const [isUCS2, setIsUCS2] = useState(false);

  useEffect(() => {
  const gsm7bitRegex = /^[\u0000-\u007F]*$/;
  const ucs2 = !gsm7bitRegex.test(message);
  setIsUCS2(ucs2);

  const length = message.length;
  setCharCount(length);

  if (ucs2) {
    // UCS2: 70 chars per SMS
    setSmsCount(length === 0 ? 1 : Math.ceil(length / 70));
  } else {
    // GSM 7-bit: 160 chars per SMS
    setSmsCount(length === 0 ? 1 : Math.ceil(length / 160));
  }
}, [message]);



  // Normalize and validate one number
  const normalizeAndValidate = (raw) => {
    const trimmed = String(raw || "").trim();
    if (!trimmed) return { valid: false, formatted: "", reason: "empty" };
    if (/[A-Za-z]/.test(trimmed)) return { valid: false, formatted: trimmed, reason: "contains letters" };

    let s = trimmed.replace(/[\s-()]/g, "");
    if (s.startsWith("+")) s = "+" + s.slice(1).replace(/\D/g, "");
    else s = s.replace(/\D/g, "");

    let candidate = s;
    if (!candidate.startsWith("+") && candidate.startsWith("0") && candidate.length === 10) candidate = "+256" + candidate.slice(1);
    else if (!candidate.startsWith("+") && candidate.length === 9) candidate = "+256" + candidate;
    else if (!candidate.startsWith("+") && candidate.startsWith("256") && candidate.length === 12) candidate = "+" + candidate;
    else if (!candidate.startsWith("+")) {
      if (candidate.length >= 8 && candidate.length <= 12 && !candidate.startsWith("256")) candidate = "+256" + candidate.slice(-9);
    }

    if (candidate.startsWith("+")) candidate = "+" + candidate.slice(1).replace(/\D/g, "");
    else candidate = candidate.replace(/\D/g, "");

    const digitsOnly = candidate.startsWith("+") ? candidate.slice(1) : candidate;
    if (!digitsOnly.startsWith("256")) return { valid: false, formatted: candidate, reason: "missing country code (256)" };
    if (digitsOnly.length === 12 || digitsOnly.length === 11) return { valid: true, formatted: "+" + digitsOnly, reason: null };
    return { valid: false, formatted: "+" + digitsOnly, reason: "invalid length" };
  };

  //Detect Network Carrier
  const detectCarrier = (number) => {
    if (!number.startsWith("+256")) return "Other";
    const local = number.slice(4); // remove +256

    const airtelPrefixes = ["70", "75", "74", "20"]; // includes Africell numbers
    const mtnPrefixes = ["76", "77", "78", "79", "30"];

    const firstTwo = local.slice(0, 2);
    const firstThree = local.slice(0, 3);

    if (mtnPrefixes.includes(firstTwo)) return "MTN";
    if (airtelPrefixes.includes(firstTwo) || airtelPrefixes.includes(firstThree)) return "Airtel";

    return "Other";
  };


  // Parse raw input into arrays (runs in real-time)
  useEffect(() => {
    const parts = numbersInput
      .split(/[\n,;]+/)
      .map((x) => x.trim())
      .filter((x) => x.length > 0);

    const valids = [];
    const invalids = [];
    const seen = new Set();

    const mtns = [];
    const airtels = [];

    for (const raw of parts) {
      const res = normalizeAndValidate(raw);
      if (res.valid) {
        if (!seen.has(res.formatted)) {
          valids.push(res.formatted);
          seen.add(res.formatted);

          const carrier = detectCarrier(res.formatted);
          if (carrier === "MTN") mtns.push(res.formatted);
          else if (carrier === "Airtel") airtels.push(res.formatted);
        }
      } else {
        invalids.push({ raw, formatted: res.formatted || raw, reason: res.reason });
      }
    }

    setValidNumbers(valids);
    setInvalidNumbers(invalids);
    setMtnNumbers(mtns);
    setAirtelNumbers(airtels);
  }, [numbersInput]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return toast.error("Message cannot be empty");

    let numbersToSend = [];
    if (carrierFilter === "mtn") numbersToSend = mtnNumbers;
    else if (carrierFilter === "airtel") numbersToSend = airtelNumbers;
    else numbersToSend = validNumbers;

    if (numbersToSend.length === 0) return toast.error(`No valid numbers for ${carrierFilter}`);

    setLoading(true);
    try {
      const res = await smsService.sendSMS(numbersToSend, message);

      // Expect backend to return something like: { success: true, results: [...] }
      if (!res || res.success !== true) {
        throw new Error(res?.error || "SMS sending failed");
      }

      toast.success(`Sent to ${numbersToSend.length} number(s)`);
      setNumbersInput("");
      setMessage("");
      setValidNumbers([]);
      setInvalidNumbers([]);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to send SMS. Check backend or serial connection.");
    } finally {
      // ✅ Always stop loading state
      setLoading(false);
    }
  };


  // Handle CSV/Excel upload
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const extension = file.name.split(".").pop().toLowerCase();
    const reader = new FileReader();

    reader.onload = (event) => {
      let contacts = [];
      const data = event.target.result;

      try {
        if (extension === "csv") {
          contacts = data.split(/\r?\n/).map((x) => x.trim()).filter((x) => x.length > 0);
        } else if (extension === "xlsx" || extension === "xls") {
          const workbook = XLSX.read(data, { type: "binary" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet); // array of objects
          contacts = json.map(row => row.number ?? row.Number ?? row.phone ?? Object.values(row)[0])
                         .filter(n => n && n.toString().trim().length > 0);
        } else {
          toast.error("Unsupported file type. Use CSV or Excel.");
          return;
        }

        setNumbersInput(contacts.join("\n"));
        toast.success(`Imported ${contacts.length} contact(s)`);
      } catch (err) {
        console.error(err);
        toast.error("Failed to parse file");
      }
    };

    if (extension === "csv") reader.readAsText(file);
    else reader.readAsBinaryString(file);
  };

  return (
    <div style={{ maxWidth: 800, margin: "20px auto", padding: 16 }}>
      <ToastContainer position="top-right" autoClose={3000} />
     
      <form onSubmit={handleSend}>
        <label><h4>Enter Phone numbers</h4> (comma / newline / semicolon separated)</label>
        <textarea
          value={numbersInput}
          onChange={(e) => setNumbersInput(e.target.value)}
          placeholder="e.g. 0712345678, 712345678, +256712345678"
          rows={4}
          style={{ width: "100%", padding: 8, marginBottom: 12 }}
        />

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 16 }}>
            Or upload CSV / Excel file
          </label>
          <input
            type="file"
            accept=".csv,.xls,.xlsx"
            onChange={handleFile}
            style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc", fontSize: 14, cursor: "pointer", width: "100%",
              boxSizing: "border-box"
            }}
          />
        </div>

        <label><h3>Message</h3></label>
        {/* <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span>Type your message here...</span>
          <span style={{ fontSize: 12, color: "#555" }}>{message.length} characters</span>
        </div> */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
  <span>Type your message here...</span>
  <span style={{ fontSize: 12, color: "#555" }}>
    {charCount} characters • {smsCount} SMS {smsCount > 1 ? "(multiple messages, cost increases)" : ""}
  </span>
</div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message here..."
          rows={4}
          style={{ width: "100%", padding: 8, marginBottom: 12 }}
        />

        <label>Send to:</label>
        <select 
          value={carrierFilter}
          onChange={(e) => setCarrierFilter(e.target.value)}
          style={{ marginBottom: 12, marginLeft: 8 }}
        >
          <option value="both">All</option>
          <option value="mtn">MTN Only</option>
          <option value="airtel">Airtel Only</option>
        </select>


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

          
          {loading && <div className="spinner" />}

          <div style={{ marginLeft: "auto", fontSize: 14, color: "#555" }}>
            Valid: <strong>{validNumbers.length}</strong> • Invalid: <strong>{invalidNumbers.length}</strong>
          </div>
        </div>
      </form>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }}>
        {/* <div>
          <h3>Valid Numbers ({validNumbers.length})</h3>
          <div style={{ background: "#fff", padding: 8, borderRadius: 6, minHeight: 60 }}>
            {validNumbers.length === 0 ? <em style={{ color: "#666" }}>No valid numbers yet</em> : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {validNumbers.map((n) => <li key={n}>{n}</li>)}
              </ul>
            )}
          </div>
        </div> */}

        <div>
          <h3>Valid Numbers</h3>
          {mtnNumbers.length === 0 && airtelNumbers.length === 0 ? (
            <em style={{ color: "#666", background: "#fff", padding: 8, borderRadius: 6, minHeight: 60 }}>No valid numbers yet</em>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: `${mtnNumbers.length && airtelNumbers.length ? "1fr 1fr" : "1fr"}`, gap: 20, marginTop: 10 }}>
              
              {mtnNumbers.length > 0 && (
                <div>
                  <h4>MTN ({mtnNumbers.length})</h4>
                  <div style={{ background: "#fff", padding: 8, borderRadius: 6, minHeight: 60 }}>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {mtnNumbers.map((n) => <li key={n}>{n}</li>)}
                    </ul>
                  </div>
                </div>
              )}

              {airtelNumbers.length > 0 && (
                <div>
                  <h4>Airtel ({airtelNumbers.length})</h4>
                  <div style={{ background: "#fff", padding: 8, borderRadius: 6, minHeight: 60 }}>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {airtelNumbers.map((n) => <li key={n}>{n}</li>)}
                    </ul>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>


        <div>
          <h3>Invalid Numbers ({invalidNumbers.length})</h3>
          <div style={{ background: "#fff", padding: 8, borderRadius: 6, minHeight: 60 }}>
            {invalidNumbers.length === 0 ? <em style={{ color: "#666" }}>No invalid numbers</em> : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {invalidNumbers.map((it, idx) => (
                  <li key={idx}>
                    <strong>{it.raw}</strong> → <span style={{ color: "#c00" }}>{it.formatted}</span> — <em style={{ color: "#555" }}>{it.reason}</em>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

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
