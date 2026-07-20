"use client";
import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import ChatRoom from "./ChatRoom";
import MediaGallery from "./MediaGallery";
import VideoCall from "./VideoCall";

export default function PrivateApp({ user }) {
  const [activeTab, setActiveTab] = useState("chat");
  const [streak, setStreak] = useState(0);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const otherUser = user === "veeku" ? "suki" : "veeku";

  useEffect(() => {
    const streakRef = doc(db, "meta", "photo_streak");
    const unsubscribe = onSnapshot(streakRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const today = new Date().toISOString().split("T")[0];
        
        if (data.lastCompletedDate) {
          const last = new Date(data.lastCompletedDate);
          const now = new Date(today);
          const diffDays = Math.ceil(Math.abs(now - last) / (1000 * 60 * 60 * 24)); 
          
          if (diffDays > 1 && data.lastCompletedDate !== today) {
            setStreak(0);
          } else {
            setStreak(data.count || 0);
          }
        } else {
          setStreak(data.count || 0);
        }
      }
    });

    return () => unsubscribe();
  }, []);

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
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(26, 29, 36, 0.85)', backdropFilter: 'blur(10px)', zIndex: 20 }}>
          <div 
            onClick={() => setShowMobileMenu(!showMobileMenu)} 
            style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', position: 'relative' }}
          >
            <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: 'white', boxShadow: '0 4px 10px rgba(99, 102, 241, 0.4)' }}>
              {otherUser.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, color: 'white' }}>{otherUser}</h3>
                {streak > 0 && <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{streak} 🔥</span>}
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: '0.2rem' }}>▼</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#10b981' }}>● Online (Stealth Mode)</span>
            </div>

            {showMobileMenu && (
              <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '1rem', backgroundColor: 'rgba(30, 41, 59, 0.95)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '0.5rem', zIndex: 50, boxShadow: '0 10px 25px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', minWidth: '180px' }}>
                <button onClick={(e) => { e.stopPropagation(); setActiveTab("chat"); setShowMobileMenu(false); }} style={{ display: 'block', width: '100%', padding: '0.75rem 1rem', textAlign: 'left', background: 'none', border: 'none', color: activeTab === 'chat' ? '#38bdf8' : 'white', fontWeight: activeTab === 'chat' ? 'bold' : 'normal', cursor: 'pointer', borderRadius: '8px' }}>💬 Chat Room</button>
                <button onClick={(e) => { e.stopPropagation(); setActiveTab("gallery"); setShowMobileMenu(false); }} style={{ display: 'block', width: '100%', padding: '0.75rem 1rem', textAlign: 'left', background: 'none', border: 'none', color: activeTab === 'gallery' ? '#38bdf8' : 'white', fontWeight: activeTab === 'gallery' ? 'bold' : 'normal', cursor: 'pointer', borderRadius: '8px' }}>📸 Private Gallery</button>
              </div>
            )}
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
