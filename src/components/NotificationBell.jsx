import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { Link } from 'react-router-dom';

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => setIsOpen(!isOpen);

  const handleNotificationClick = (notif) => {
    markAsRead(notif.id);
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button 
        onClick={handleToggle}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', position: 'relative',
          fontSize: '1.2rem', padding: '0.5rem', display: 'flex', alignItems: 'center'
        }}
      >
        <span style={{ color: unreadCount > 0 ? 'var(--primary-accent)' : 'var(--text-secondary)' }}>🔔</span>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '2px', right: '2px', background: 'var(--error)',
            color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.7rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="glass animate-fade-in" style={{
          position: 'absolute', top: '100%', right: '0', width: '320px', maxHeight: '450px',
          zIndex: 1000, marginTop: '1rem', padding: '0', overflowY: 'auto', border: '1px solid var(--glass-border)'
        }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0 }}>Notifications</h4>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} style={{ background: 'none', border: 'none', color: 'var(--primary-accent)', fontSize: '0.8rem', cursor: 'pointer' }}>
                Mark all read
              </button>
            )}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No notifications yet
              </div>
            ) : (
              notifications.map(notif => (
                <Link 
                  key={notif.id}
                  to={notif.link || '#'}
                  onClick={() => handleNotificationClick(notif)}
                  style={{
                    padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)',
                    textDecoration: 'none', color: '#fff', background: notif.read ? 'transparent' : 'rgba(102, 252, 241, 0.05)',
                    display: 'flex', gap: '1rem', transition: 'background 0.2s'
                  }}
                >
                  <div style={{ fontSize: '1.2rem' }}>
                    {notif.type === 'like' && '❤️'}
                    {notif.type === 'comment' && '💬'}
                    {notif.type === 'purchase' && '💰'}
                    {notif.type === 'message' && '📧'}
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ fontSize: '0.9rem', marginBottom: '0.2rem', fontWeight: notif.read ? '400' : '600' }}>{notif.message}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {notif.createdAt?.toDate?.().toLocaleString() || 'Just now'}
                    </div>
                  </div>
                  {!notif.read && (
                    <div style={{ width: '8px', height: '8px', background: 'var(--primary-accent)', borderRadius: '50%', alignSelf: 'center' }} />
                  )}
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
