import React from 'react';
import SmsForm from '../components/SmsForm';

export default function SendSMS({ onSend }) {
  return (
    <>
      <h2>📨 Send SMS</h2>
      <SmsForm onSend={onSend} />
    </>
  );
}
