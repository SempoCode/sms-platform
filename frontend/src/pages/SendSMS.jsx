// src/pages/SendSMS.jsx
import React from 'react';
import SmsForm from '../components/SmsForm';

const SendSMS = () => {
  return (
    <div>
      <h2>Send SMS</h2>
      <SmsForm />
      {/* Later: CSV/Excel import button here */}
    </div>
  );
};

export default SendSMS;