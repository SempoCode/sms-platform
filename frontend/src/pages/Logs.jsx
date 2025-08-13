import React, { useEffect, useState } from 'react';
import smsService from '../services/smsService';

export default function Logs() {
  const [logs, setLogs] = useState([]); // ✅ Start with an empty array

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const data = await smsService.getLogs();
        setLogs(data || []); // ✅ Ensure it's always an array
      } catch (err) {
        console.error('Failed to load logs', err);
        setLogs([]);
      }
    };

    loadLogs();
  }, []);

  return (
    <div style={{ flex: 1, padding: '20px' }}>
      <h2>📜 Logs</h2>
      {logs.length === 0 ? (
        <p>No logs available</p>
      ) : (
        <ul>
          {logs.map(log => (
            <li key={log._id}>
              {log.number} - {log.message} ({new Date(log.sentAt).toLocaleString()})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
