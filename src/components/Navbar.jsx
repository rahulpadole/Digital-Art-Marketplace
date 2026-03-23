import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import './Navbar.css';

export default function Navbar({ user, signOut }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <nav className="glass-nav navbar">
      <div className="container nav-container">
        <Link to="/" className="nav-logo" onClick={closeMobileMenu}>
          <h2>Digital Art <span>Marketplace</span></h2>
        </Link>

        {/* Hamburger Menu Toggle */}
        <div className="mobile-menu-toggle" onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? '✕' : '☰'}
        </div>

        <div className={`nav-links ${isMobileMenuOpen ? 'active' : ''}`}>
          <Link to="/" className="nav-link" onClick={closeMobileMenu}>Home</Link>
          <Link to="/explore" className="nav-link" onClick={closeMobileMenu}>Explore</Link>
          {user ? (
            <>
              <Link to="/upload" className="nav-link" onClick={closeMobileMenu}>Upload</Link>
              <div className="nav-item-wrapper">
                <NotificationBell />
              </div>
              <Link to="/messages" className="nav-link" onClick={closeMobileMenu}>Messages</Link>
              <Link to="/profile" className="nav-link" onClick={closeMobileMenu}>Profile</Link>
              <button 
                onClick={() => { signOut(); closeMobileMenu(); }} 
                className="btn btn-outline nav-btn"
                style={{marginLeft: '1rem'}}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline" style={{marginRight: '1rem'}} onClick={closeMobileMenu}>Login</Link>
              <Link to="/register" className="btn btn-primary" onClick={closeMobileMenu}>Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
