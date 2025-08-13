// src/components/Footer.jsx
import React from 'react';

const Footer = () => {
  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        <p style={styles.text}>
          &copy; {new Date().getFullYear()} Bulk SMS Sender. All rights reserved.
        </p>
        <div style={styles.links}>
          <a href="/privacy" style={styles.link}>Privacy Policy</a>
          <a href="/terms" style={styles.link}>Terms of Service</a>
          <a href="/contact" style={styles.link}>Contact</a>
        </div>
      </div>
    </footer>
  );
};

const styles = {
  footer: {
    backgroundColor: '#222',
    color: '#fff',
    padding: '15px 0',
    marginTop: 'auto',
    // marginTop: '40px',
    borderTop: '3px solid #4caf50',
  },
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  text: {
    margin: '5px 0',
    fontSize: '14px',
    textAlign: 'center',
  },
  links: {
    display: 'flex',
    gap: '15px',
    marginTop: '5px',
  },
  link: {
    color: '#4caf50',
    textDecoration: 'none',
    fontSize: '14px',
    transition: 'color 0.3s ease',
  },
};

export default Footer;
