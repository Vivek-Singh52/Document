"use client";

export default function PrivateApp({ user }) {
  const otherUser = user === "veeku" ? "suki" : "veeku";

  return (
    <div className="app-container">
      <div className="sidebar">
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Document</h2>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Welcome, {user}</span>
        </div>
        <div style={{ flex: 1, padding: '1rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No recent chats yet.</p>
        </div>
      </div>
      
      <div className="main-content">
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {otherUser.charAt(0).toUpperCase()}
            </div>
            <h3>{otherUser}</h3>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              {/* Call Icon Placeholder */}
              📞
            </button>
            <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              {/* Video Icon Placeholder */}
              📹
            </button>
          </div>
        </div>
        
        <div style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2rem' }}>
            Start of your secure conversation with {otherUser}.
          </div>
        </div>
        
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              placeholder="Type a message..." 
              style={{ flex: 1, padding: '0.75rem', borderRadius: '20px', border: '1px solid var(--border-color)', backgroundColor: 'var(--panel-bg)', color: 'var(--text-primary)', outline: 'none' }}
            />
            <button style={{ padding: '0.75rem 1.5rem', borderRadius: '20px', border: 'none', backgroundColor: 'var(--accent-color)', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
