import React, { useEffect, useState } from 'react';
import smsService from '../services/smsService';
import * as XLSX from 'xlsx';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [tab, setTab] = useState('success'); // 'success' or 'failed'
  const [sortField, setSortField] = useState('sentAt'); // 'sentAt' | 'number'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [networkFilter, setNetworkFilter] = useState('all'); // 'all' | 'mtn' | 'airtel'

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
  let filteredLogs = logs.filter(l => tab === 'success' ? l.success : !l.success);

  // Apply network filter (assumes MTN starts with 077 / 078, Airtel with 070 / 075)
  if (networkFilter !== 'all') {
    filteredLogs = filteredLogs.filter(l => {
      const num = l.number || '';
      if (networkFilter === 'mtn') return num.startsWith('+25677') || num.startsWith('+25678');
      if (networkFilter === 'airtel') return num.startsWith('+25670') || num.startsWith('+25675');
      return true;
    });
  }

  // Apply sorting
  filteredLogs.sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === 'sentAt') {
      valA = new Date(valA);
      valB = new Date(valB);
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Fix: only generate Excel if data exists
  const downloadExcel = () => {
    if (filteredLogs.length === 0) {
      alert("No logs available to download!");
      return;
    }

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

      {/* Sorting & Filtering Controls */}
      <div style={{ marginBottom: '15px', display: 'flex', gap: '15px' }}>
        <label>
          Sort By:{' '}
          <select value={sortField} onChange={e => setSortField(e.target.value)}>
            <option value="sentAt">Time Sent</option>
            <option value="number">Phone Number</option>
          </select>
        </label>
        <label>
          Order:{' '}
          <select value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </label>
        <label>
          Network:{' '}
          <select value={networkFilter} onChange={e => setNetworkFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="mtn">MTN</option>
            <option value="airtel">Airtel</option>
          </select>
        </label>
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
