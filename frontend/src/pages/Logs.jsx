import React, { useEffect, useState } from 'react';
import smsService from '../services/smsService';
import * as XLSX from 'xlsx';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [tab, setTab] = useState('success'); // 'success' or 'failed'

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const data = await smsService.getLogs();
        setLogs(data || []);
      } catch (err) {
        console.error('Failed to load logs', err);
        setLogs([]);
      }
    };

    loadLogs();
  }, []);

  // Filter logs according to tab
  const filteredLogs = logs.filter(l => tab === 'success' ? l.success : !l.success);

  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredLogs.map(l => ({
        Number: l.number,
        Message: l.message,
        SentAt: new Date(l.sentAt).toLocaleString(),
        ...(tab === 'failed' ? { Error: l.error || '' } : {})
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, tab === 'success' ? 'Successful' : 'Failed');
    XLSX.writeFile(workbook, `sms_${tab}_logs.xlsx`);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>📜 SMS Logs</h2>

      {/* Tab navigation */}
      <div style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
        <button
          onClick={() => setTab('success')}
          style={{
            cursor: tab === 'success' ? 'default' : 'pointer',
            backgroundColor: tab === 'success' ? '#d4edda' : '#f0f0f0'
          }}
          disabled={tab === 'success'}
        >
          ✅ Successful
        </button>
        <button
          onClick={() => setTab('failed')}
          style={{
            cursor: tab === 'failed' ? 'default' : 'pointer',
            backgroundColor: tab === 'failed' ? '#f8d7da' : '#f0f0f0'
          }}
          disabled={tab === 'failed'}
        >
          ❌ Failed
        </button>
        <button onClick={downloadExcel} style={{ marginLeft: 'auto' }}>
          📥 Download Excel
        </button>
      </div>

      {/* Dynamic table title */}
      <h3 style={{ marginBottom: '10px' }}>
        {tab === 'success' ? '✅ Successfully Sent Messages' : '❌ Failed Messages'}
      </h3>
      

      {/* Table */}
      <table border="1" cellPadding="5" cellSpacing="0" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#e9ecef' }}>
            <th>Number</th>
            <th>Message</th>
            {tab === 'failed' && <th>Error</th>}
            <th>Sent At</th>
          </tr>
        </thead>
        <tbody>
          {filteredLogs.length === 0 ? (
            <tr>
              <td colSpan={tab === 'failed' ? 4 : 3} style={{ textAlign: 'center' }}>No logs available</td>
            </tr>
          ) : (
            filteredLogs.map(log => (
              <tr key={log._id}>
                <td>{log.number}</td>
                <td>{log.message}</td>
                {tab === 'failed' && <td>{log.error}</td>}
                <td>{new Date(log.sentAt).toLocaleString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
