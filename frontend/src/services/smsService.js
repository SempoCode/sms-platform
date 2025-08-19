import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/sms';

const sendSMS = async (numbers, message) => {
  const res = await axios.post(`${API_URL}/send`, { numbers, message });
  return res.data; // ✅ return backend response
};

const getLogs = async () => {
  const res = await axios.get(`${API_URL}/logs`);
  return res.data;
};

export default { sendSMS, getLogs };
