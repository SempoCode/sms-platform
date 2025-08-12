// App.js
import React, { useState, useEffect } from 'react';
import smsService from './services/smsService';
import SmsForm from './components/SmsForm';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


export default function App() {
  const [logs, setLogs] = useState([]);

  const sendMessages = async (validNumbers, message, invalidNumbers) => {
    // Send valid numbers
    await smsService.sendSMS(validNumbers, message);

    // Optionally log failed/invalid numbers somewhere
    if (invalidNumbers.length > 0) {
      await smsService.saveInvalidNumbers(invalidNumbers); // Implement this if needed
    }

    loadLogs();
  };

  const loadLogs = async () => {
    const data = await smsService.getLogs();
    setLogs(data);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>📨 Bulk SMS Sender</h1>

      <SmsForm onSend={sendMessages} />

      <h2>📜 Logs</h2>
      <ul>
        {logs.map(log => (
          <li key={log._id}>
            {log.number} - {log.message} ({new Date(log.sentAt).toLocaleString()})
          </li>
        ))}
      </ul>

      <ToastContainer />
    </div>
  );
}
