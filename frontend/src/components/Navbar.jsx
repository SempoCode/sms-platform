import React from 'react';
import { NavLink } from 'react-router-dom';

const Navbar = () => {
  const activeStyle = {
    fontWeight: 'bold',
    color: '#4caf50',
  };

  return (
    <nav style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
      <NavLink to="/" style={({ isActive }) => (isActive ? activeStyle : undefined)} end>
        Dashboard
      </NavLink>{' '}
      |{' '}
      <NavLink to="/send-sms" style={({ isActive }) => (isActive ? activeStyle : undefined)}>
        Send SMS
      </NavLink>{' '}
      |{' '}
      <NavLink to="/template" style={({ isActive }) => (isActive ? activeStyle : undefined)}>
        Template
      </NavLink>{' '}
      |{' '}
      <NavLink to="/logs" style={({ isActive }) => (isActive ? activeStyle : undefined)}>
        Logs
      </NavLink>{' '}
      |{' '}
      <NavLink to="/settings" style={({ isActive }) => (isActive ? activeStyle : undefined)}>
        Settings
      </NavLink>
    </nav>
  );
};

export default Navbar;
