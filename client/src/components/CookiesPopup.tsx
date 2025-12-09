
import { useState, useEffect } from 'react';

export function CookiesPopup() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasAccepted = localStorage.getItem('nola_cookies_accepted');
    if (!hasAccepted) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        localStorage.setItem('nola_cookies_accepted', 'true');
      }, 15000); // Auto-hide after 15 seconds

      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('nola_cookies_accepted', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        zIndex: 3000,
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(14px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '16px 20px',
        maxWidth: '340px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        animation: 'slideInLeft 0.4s ease',
      }}
      data-testid="cookies-popup"
    >
      <div style={{ fontSize: '14px', marginBottom: '12px', color: '#e0b3ff' }}>
        🍪 We use cookies to enhance your experience
      </div>
      <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '12px' }}>
        By using NOLA Exchange, you agree to our use of cookies for analytics and personalization.
      </div>
      <button
        onClick={handleAccept}
        style={{
          background: 'linear-gradient(90deg, var(--accent-1), var(--accent-2))',
          color: '#fff',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 700,
        }}
        data-testid="button-accept-cookies"
      >
        Accept
      </button>
    </div>
  );
}
