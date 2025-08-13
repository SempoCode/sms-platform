// src/pages/Dashboard.jsx
import React from 'react';
import { toast } from 'react-toastify';

const Dashboard = () => {
  return (
    <div style={{ flex: 1, padding: '20px' }}>
      <h1>Dashboard</h1>
      <button onClick={() => toast.success('Welcome to the Dashboard!')}>
        Show Toast
      </button>
    </div>
  );
};

export default Dashboard;
