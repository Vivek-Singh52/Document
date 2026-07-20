"use client";
import { useState } from "react";
import ChatRoom from "./ChatRoom";
import MediaGallery from "./MediaGallery";
import VideoCall from "./VideoCall";

export default function PrivateApp({ user }) {
  const [activeTab, setActiveTab] = useState("chat");
  const otherUser = user === "veeku" ? "suki" : "veeku";

  return (
    <div className="app-container">
      <div className="sidebar">
        <div style={{ padding: '1.5rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white' }}>Document</h2>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Welcome, {user}</span>
        </div>
        <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button 
            onClick={() => setActiveTab("chat")}
            style={{ 
              padding: '0.75rem 1rem', 
              textAlign: 'left',
              backgroundColor: activeTab === "chat" ? 'var(--bg-color)' : 'transparent',
              border: activeTab === "chat" ? '1px solid var(--accent-color)' : '1px solid transparent',
              borderRadius: '8px', 
              cursor: 'pointer',
              color: activeTab === "chat" ? 'var(--accent-color)' : 'var(--text-primary)',
              fontWeight: activeTab === "chat" ? 'bold' : 'normal'
            }}
          >
            💬 Chat Room
          </button>
          <button 
            onClick={() => setActiveTab("gallery")}
            style={{ 
              padding: '0.75rem 1rem', 
              textAlign: 'left',
              backgroundColor: activeTab === "gallery" ? 'var(--bg-color)' : 'transparent',
              border: activeTab === "gallery" ? '1px solid var(--accent-color)' : '1px solid transparent',
              borderRadius: '8px', 
              cursor: 'pointer',
              color: activeTab === "gallery" ? 'var(--accent-color)' : 'var(--text-primary)',
              fontWeight: activeTab === "gallery" ? 'bold' : 'normal'
            }}
          >
            📸 Private Gallery
          </button>
        </div>
      </div>
      
      <div className="main-content">
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--panel-bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: 'white' }}>
              {otherUser.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 style={{ margin: 0, color: 'white' }}>{otherUser}</h3>
              <span style={{ fontSize: '0.8rem', color: '#10b981' }}>● Online (Stealth Mode)</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <VideoCall user={user} otherUser={otherUser} />
          </div>
        </div>
        
        {activeTab === "chat" && <ChatRoom user={user} otherUser={otherUser} />}
        {activeTab === "gallery" && <MediaGallery />}
      </div>
    </div>
  );
}
