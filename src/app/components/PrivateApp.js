"use client";
import { useState, useEffect, useRef } from "react";
import { db } from "../../lib/firebase";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";

export default function PrivateApp({ user }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);
  
  const otherUser = user === "veeku" ? "suki" : "veeku";

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for messages
  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, []);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const text = newMessage;
    setNewMessage("");

    await addDoc(collection(db, "messages"), {
      text,
      sender: user,
      timestamp: serverTimestamp(),
      type: "text"
    });
  };

  return (
    <div className="app-container">
      <div className="sidebar">
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Document</h2>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Logged in: {user}</span>
        </div>
        <div style={{ flex: 1, padding: '1rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--accent-color)' }}>
            <div style={{ fontWeight: 'bold', color: 'var(--accent-color)' }}>Chat with {otherUser}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Active now 🔥</div>
          </div>
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
            <button style={{ background: 'var(--panel-bg)', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer' }}>
              📞 Call
            </button>
            <button style={{ background: 'var(--accent-color)', padding: '0.5rem 1rem', borderRadius: '20px', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
              📹 Video
            </button>
          </div>
        </div>
        
        <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2rem' }}>
              Start of your secure conversation with {otherUser}.
            </div>
          ) : (
            messages.map((msg) => (
              <div 
                key={msg.id} 
                style={{
                  alignSelf: msg.sender === user ? 'flex-end' : 'flex-start',
                  backgroundColor: msg.sender === user ? 'var(--accent-color)' : 'var(--panel-bg)',
                  color: msg.sender === user ? 'white' : 'var(--text-primary)',
                  padding: '0.75rem 1rem',
                  borderRadius: msg.sender === user ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  maxWidth: '70%',
                  wordBreak: 'break-word',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}
              >
                {msg.text}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <form onSubmit={sendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              placeholder="Type a message..." 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              style={{ flex: 1, padding: '0.75rem 1.25rem', borderRadius: '20px', border: '1px solid var(--border-color)', backgroundColor: 'var(--panel-bg)', color: 'var(--text-primary)', outline: 'none' }}
            />
            <button type="submit" style={{ padding: '0.75rem 1.5rem', borderRadius: '20px', border: 'none', backgroundColor: 'var(--accent-color)', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
