"use client";
import { useState, useEffect, useRef } from "react";
import { db, storage } from "../../lib/firebase";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

export default function ChatRoom({ user, otherUser }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [streak, setStreak] = useState({ count: 0, lastDate: null });
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen to messages
  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, []);

  // Fetch and calculate streak
  useEffect(() => {
    const fetchStreak = async () => {
      const streakRef = doc(db, "meta", "streak");
      const docSnap = await getDoc(streakRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const today = new Date().toISOString().split("T")[0];
        
        // Calculate if streak is broken
        if (data.lastDate) {
          const last = new Date(data.lastDate);
          const now = new Date(today);
          const diffTime = Math.abs(now - last);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          
          if (diffDays > 1 && data.lastDate !== today) {
            // Streak broken
            setStreak({ count: 0, lastDate: today });
          } else {
            setStreak(data);
          }
        }
      } else {
        await setDoc(streakRef, { count: 0, lastDate: null });
      }
    };
    fetchStreak();
  }, []);

  const updateStreak = async () => {
    const today = new Date().toISOString().split("T")[0];
    const streakRef = doc(db, "meta", "streak");
    const docSnap = await getDoc(streakRef);
    
    let newCount = 1;
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.lastDate === today) return; // Already messaged today
      
      const last = new Date(data.lastDate || today);
      const now = new Date(today);
      const diffTime = Math.abs(now - last);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        newCount = (data.count || 0) + 1;
      }
    }
    
    await setDoc(streakRef, { count: newCount, lastDate: today }, { merge: true });
    setStreak({ count: newCount, lastDate: today });
  };

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
    updateStreak();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const fileType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document';
    
    // Create unique filename
    const filename = `${Date.now()}-${file.name}`;
    const storageRef = ref(storage, `shared/${filename}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {}, 
      (error) => {
        console.error("Upload failed", error);
        setUploading(false);
      }, 
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        await addDoc(collection(db, "messages"), {
          text: file.name,
          url: downloadURL,
          sender: user,
          timestamp: serverTimestamp(),
          type: fileType
        });
        updateStreak();
        setUploading(false);
      }
    );
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0.75rem', backgroundColor: 'var(--panel-bg)', textAlign: 'center', fontSize: '0.875rem' }}>
        Current Streak: {streak.count} 🔥
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
              {msg.type === 'text' && <div>{msg.text}</div>}
              {msg.type === 'image' && <img src={msg.url} alt="Shared image" style={{ maxWidth: '100%', borderRadius: '8px' }} />}
              {msg.type === 'video' && <video src={msg.url} controls style={{ maxWidth: '100%', borderRadius: '8px' }} />}
              {msg.type === 'document' && <a href={msg.url} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>📄 {msg.text}</a>}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
        <form onSubmit={sendMessage} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
            accept="image/*,video/*,.pdf,.doc,.docx" 
          />
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()} 
            style={{ padding: '0.75rem', borderRadius: '50%', border: 'none', backgroundColor: 'var(--panel-bg)', color: 'var(--text-primary)', cursor: 'pointer' }}
            disabled={uploading}
          >
            {uploading ? '⏳' : '📎'}
          </button>
          
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
  );
}
