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
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--panel-bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: 'white' }}>
              {otherUser.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, color: 'white' }}>{otherUser}</h3>
                {streak > 0 && <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{streak} 🔥</span>}
              </div>
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
