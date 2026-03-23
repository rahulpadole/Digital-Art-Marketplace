import React from 'react';

export default function Footer() {
  return (
    <footer style={{ textAlign: 'center', padding: '2rem', borderTop: '1px solid var(--glass-border)', marginTop: '4rem' }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        &copy; {new Date().getFullYear()} DigitalArt. Built with Vite + Firebase.
      </p>
    </footer>
  );
}
