import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SmsForm from './components/SmsForm';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Pages
import Dashboard from './pages/Dashboard';
import SendSMS from './pages/SendSMS';
import Template from './pages/Template';
import Logs from './pages/Logs';
import Settings from './pages/Settings';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Contact from './pages/Contact';
import { SmsProvider } from "./context/SmsContext";

export default function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ padding: '20px' }}>
          <h1>📨 Bulk SMS Sender</h1>
        </div>
        <SmsProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Navbar />
            <div style={{ padding: '20px' }}>        
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/send-sms" element={<SendSMS />} />
                <Route path="/template" element={<Template />} />
                <Route path="/logs" element={<Logs />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/contact" element={<Contact />} />
              </Routes>
              <ToastContainer />
            </div>
          </Router>
          <Footer />
       </SmsProvider>
    </div>
    
  );
    
}
