"use client";
import { useState, useEffect, useRef } from "react";
import { db, storage } from "../../lib/firebase";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

export default function ChatRoom({ user, otherUser }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [streak, setStreak] = useState({ count: 0, lastDate: null });
  const [uploading, setUploading] = useState(false);
  
  const [editingMessage, setEditingMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);

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
      
      // Update unseen messages to seen
      msgs.forEach(msg => {
        if (msg.sender !== user && msg.status !== "seen") {
          updateDoc(doc(db, "messages", msg.id), { status: "seen" });
        }
      });
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch and calculate streak
  useEffect(() => {
    const fetchStreak = async () => {
      const streakRef = doc(db, "meta", "streak");
      const docSnap = await getDoc(streakRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const today = new Date().toISOString().split("T")[0];
        
        if (data.lastDate) {
          const last = new Date(data.lastDate);
          const now = new Date(today);
          const diffTime = Math.abs(now - last);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          
          if (diffDays > 1 && data.lastDate !== today) {
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
      if (data.lastDate === today) return; 
      
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

    if (editingMessage) {
      await updateDoc(doc(db, "messages", editingMessage), {
        text,
        edited: true
      });
      setEditingMessage(null);
    } else {
      const msgData = {
        text,
        sender: user,
        timestamp: serverTimestamp(),
        type: "text",
        status: "sent"
      };

      if (replyingTo) {
        msgData.replyTo = {
          id: replyingTo.id,
          text: replyingTo.type === 'text' ? replyingTo.text : 'Media',
          sender: replyingTo.sender
        };
        setReplyingTo(null);
      }

      await addDoc(collection(db, "messages"), msgData);
      updateStreak();
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const fileType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document';
    
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
        const msgData = {
          text: file.name,
          url: downloadURL,
          sender: user,
          timestamp: serverTimestamp(),
          type: fileType,
          status: "sent"
        };
        
        if (replyingTo) {
          msgData.replyTo = {
            id: replyingTo.id,
            text: replyingTo.type === 'text' ? replyingTo.text : 'Media',
            sender: replyingTo.sender
          };
          setReplyingTo(null);
        }

        await addDoc(collection(db, "messages"), msgData);
        updateStreak();
        setUploading(false);
      }
    );
  };

  const handleEdit = (msg) => {
    setEditingMessage(msg.id);
    setNewMessage(msg.text);
    setReplyingTo(null);
  };

  const handleReply = (msg) => {
    setReplyingTo(msg);
    setEditingMessage(null);
  };

  // Group messages by date
  const groupedMessages = {};
  messages.forEach(msg => {
    if (!msg.timestamp) return; // Ignore messages still being saved to server
    const dateObj = msg.timestamp.toDate ? msg.timestamp.toDate() : new Date();
    const dateStr = dateObj.toLocaleDateString();
    if (!groupedMessages[dateStr]) groupedMessages[dateStr] = [];
    groupedMessages[dateStr].push({ ...msg, dateObj });
  });

  const getFormatTime = (dateObj) => {
    if (!dateObj) return "";
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div style={{ padding: '0.75rem', backgroundColor: 'var(--panel-bg)', textAlign: 'center', fontSize: '0.875rem' }}>
        Current Streak: {streak.count} 🔥
      </div>
      
      <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2rem' }}>
            Start of your secure conversation with {otherUser}.
          </div>
        ) : (
          Object.keys(groupedMessages).map(dateStr => (
            <div key={dateStr} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.3rem 0.8rem', borderRadius: '12px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {dateStr === new Date().toLocaleDateString() ? 'Today' : dateStr}
              </div>
              
              {groupedMessages[dateStr].map((msg) => (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignSelf: msg.sender === user ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', justifyContent: msg.sender === user ? 'flex-end' : 'flex-start' }}>
                    <button onClick={() => handleReply(msg)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem' }}>Reply</button>
                    {msg.sender === user && msg.type === 'text' && (
                      <button onClick={() => handleEdit(msg)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem' }}>Edit</button>
                    )}
                  </div>
                  
                  <div style={{
                    backgroundColor: msg.sender === user ? 'var(--accent-color)' : 'var(--panel-bg)',
                    color: msg.sender === user ? 'white' : 'var(--text-primary)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: msg.sender === user ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    wordBreak: 'break-word',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}>
                    {msg.replyTo && (
                      <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '8px', marginBottom: '0.5rem', fontSize: '0.85rem', borderLeft: '3px solid #10b981' }}>
                        <strong style={{ color: msg.replyTo.sender === user ? '#60a5fa' : '#34d399' }}>{msg.replyTo.sender === user ? 'You' : msg.replyTo.sender}</strong>
                        <div style={{ opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.replyTo.text}</div>
                      </div>
                    )}

                    {msg.type === 'text' && <div>{msg.text}</div>}
                    {msg.type === 'image' && <img src={msg.url} alt="Shared image" style={{ maxWidth: '100%', borderRadius: '8px' }} />}
                    {msg.type === 'video' && <video src={msg.url} controls style={{ maxWidth: '100%', borderRadius: '8px' }} />}
                    {msg.type === 'document' && <a href={msg.url} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>📄 {msg.text}</a>}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.3rem', marginTop: '0.25rem', fontSize: '0.65rem', opacity: 0.8 }}>
                      {msg.edited && <span>(edited)</span>}
                      <span>{getFormatTime(msg.dateObj)}</span>
                      {msg.sender === user && (
                        <span style={{ color: msg.status === 'seen' ? '#38bdf8' : 'inherit' }}>
                          {msg.status === 'seen' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Context Action Banner (Editing or Replying) */}
      {(editingMessage || replyingTo) && (
        <div style={{ padding: '0.75rem 1.5rem', backgroundColor: '#1e293b', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>{editingMessage ? 'Editing message' : `Replying to ${replyingTo.sender === user ? 'You' : replyingTo.sender}`}</span>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
              {editingMessage ? '' : (replyingTo.type === 'text' ? replyingTo.text : 'Media')}
            </div>
          </div>
          <button 
            onClick={() => { setEditingMessage(null); setReplyingTo(null); setNewMessage(""); }}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}
          >×</button>
        </div>
      )}

      <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}>
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
            {editingMessage ? 'Save' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
