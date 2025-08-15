import React, { useState } from 'react';

const Settings = () => {
  const [command, setCommand] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendCommand = async () => {
    if (!command.trim()) return;
    setLoading(true);
    setOutput("Sending...");
    try {
      const res = await fetch("http://localhost:5000/api/sms/run-at", {  // 🔹 Point directly to backend
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command })
      });

      if (!res.ok) {
        setOutput(`Error: ${res.status} ${res.statusText}`);
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.response) {
        setOutput(data.response);
      } else {
        setOutput(data.error || "No response");
      }
    } catch (err) {
      setOutput("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, padding: '20px', fontFamily: 'monospace' }}>
      <h2>AT Command Terminal</h2>
      <p>Send AT commands to the SIM800C module and view raw responses.</p>
      
      <div style={{ marginBottom: '10px' }}>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Enter AT command (e.g., AT+CSQ)"
          style={{
            padding: '8px',
            fontSize: '14px',
            width: '300px',
            marginRight: '10px',
          }}
        />
        <button
          onClick={sendCommand}
          style={{
            padding: '8px 14px',
            background: '#007BFF',
            color: '#fff',
            border: 'none',
            cursor: 'pointer'
          }}
          disabled={loading}
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>

      <pre
        style={{
          background: '#222',
          color: '#0f0',
          padding: '10px',
          minHeight: '100px',
          maxWidth: '600px',
          overflowX: 'auto',
          borderRadius: '4px'
        }}
      >
        {output}
      </pre>
    </div>
  );
};

export default Settings;
