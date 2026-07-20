"use client";
import { useState, useEffect, useRef } from "react";
import { db } from "../../lib/firebase";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import Lightbox from "./Lightbox";

export default function ChatRoom({ user, otherUser }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  
  const [editingMessage, setEditingMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [lightboxData, setLightboxData] = useState(null);

  // New features state
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [otherTyping, setOtherTyping] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [showSearchMenu, setShowSearchMenu] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, otherTyping]);

  // Listen to messages
  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      
      msgs.forEach(async msg => {
        if (msg.sender !== user && msg.status !== "seen") {
          try {
            await updateDoc(doc(db, "messages", msg.id), { status: "seen" });
          } catch (err) {
            console.error("Failed to update seen status:", err);
          }
        }
      });
    });
    return () => unsubscribe();
  }, [user]);

  // Listen to typing status
  useEffect(() => {
    const typingRef = doc(db, "meta", `typing_${otherUser}`);
    const unsub = onSnapshot(typingRef, (docSnap) => {
      if (docSnap.exists()) {
        setOtherTyping(docSnap.data().isTyping);
      }
    });
    return () => unsub();
  }, [otherUser]);

  const updatePhotoStreak = async () => {
    const today = new Date().toISOString().split("T")[0];
    const streakRef = doc(db, "meta", "photo_streak");
    const docSnap = await getDoc(streakRef);
    
    let data = { count: 0, lastCompletedDate: null };
    if (docSnap.exists()) data = docSnap.data();
    
    data[`${user}_latest`] = today;
    
    if (data[`${otherUser}_latest`] === today) {
      if (data.lastCompletedDate !== today) {
        const last = data.lastCompletedDate ? new Date(data.lastCompletedDate) : null;
        const now = new Date(today);
        let newCount = 1;
        
        if (last) {
          const diffDays = Math.ceil(Math.abs(now - last) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            newCount = (data.count || 0) + 1;
          }
        }
        
        data.count = newCount;
        data.lastCompletedDate = today;
      }
    } else {
      if (data.lastCompletedDate && data.lastCompletedDate !== today) {
         const last = new Date(data.lastCompletedDate);
         const now = new Date(today);
         const diffDays = Math.ceil(Math.abs(now - last) / (1000 * 60 * 60 * 24));
         if (diffDays > 1) {
           data.count = 0; 
         }
      }
    }
    
    await setDoc(streakRef, data, { merge: true });
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    const typingRef = doc(db, "meta", `typing_${user}`);
    setDoc(typingRef, { isTyping: e.target.value.length > 0 }, { merge: true });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const text = newMessage;
    setNewMessage("");
    
    // Clear typing status
    const typingRef = doc(db, "meta", `typing_${user}`);
    setDoc(typingRef, { isTyping: false }, { merge: true });

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

      try {
        await addDoc(collection(db, "messages"), msgData);
      } catch (err) {
        alert("Failed to send text! Error: " + err.message + "\n\nPlease make sure your FIRESTORE rules (not just Storage rules) are set to true.");
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const fileType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document';
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "pg0wh8wp");

    try {
      const response = await fetch("https://api.cloudinary.com/v1_1/oudj31ln/auto/upload", {
        method: "POST",
        body: formData
      });
      
      const data = await response.json();
      
      if (data.secure_url) {
        const msgData = {
          text: file.name,
          url: data.secure_url,
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
        
        if (fileType === 'image') {
          updatePhotoStreak();
        }
      } else {
        alert("Upload to Cloudinary failed: " + (data.error?.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Upload failed", err);
      alert("Failed to upload file to Cloudinary.");
    } finally {
      setUploading(false);
    }
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

  const handleReact = async (msgId, emoji) => {
    const msgRef = doc(db, "messages", msgId);
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    
    const reactions = msg.reactions || {};
    reactions[user] = emoji; // one reaction per user
    
    try {
      await updateDoc(msgRef, { reactions });
    } catch (err) {
      console.error("Failed to add reaction", err);
    }
    setActiveMenuId(null);
  };

  const handleMediaClick = (msg) => {
    const mediaMessages = messages.filter(m => m.type === 'image' || m.type === 'video');
    const index = mediaMessages.findIndex(m => m.id === msg.id);
    if (index !== -1) {
      setLightboxData({ mediaList: mediaMessages, initialIndex: index });
    }
  };

  const handleDeleteMedia = async (id) => {
    try {
      await deleteDoc(doc(db, "messages", id));
    } catch (e) {
      console.error("Failed to delete media", e);
    }
  };

  const filteredMessages = messages.filter(msg => {
    if (searchQuery && msg.type === 'text' && !msg.text?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    if (startDate || endDate) {
      const msgDate = msg.timestamp?.toDate ? msg.timestamp.toDate() : new Date();
      
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0,0,0,0);
        if (msgDate < s) return false;
      }
      
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23,59,59,999);
        if (msgDate > e) return false;
      }
    }
    return true;
  });

  const groupedMessages = {};
  filteredMessages.forEach(msg => {
    const dateObj = msg.timestamp && msg.timestamp.toDate ? msg.timestamp.toDate() : new Date();
    const dateStr = dateObj.toLocaleDateString();
    if (!groupedMessages[dateStr]) groupedMessages[dateStr] = [];
    groupedMessages[dateStr].push({ ...msg, dateObj });
  });

  const getFormatTime = (dateObj) => {
    if (!dateObj) return "";
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Close context menu if clicked outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 0, backgroundImage: 'url(/wallpaper.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      
      {/* 3-Dots Search Menu Trigger */}
      <div style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 30 }}>
        <button 
          onClick={() => setShowSearchMenu(!showSearchMenu)} 
          style={{ background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.5rem 0.8rem', borderRadius: '50%', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.5)', transition: 'background 0.2s', fontWeight: 'bold' }}
          title="Search Options"
        >
          ⋮
        </button>
        {showSearchMenu && (
          <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', backgroundColor: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(15px)', borderRadius: '16px', padding: '1rem', width: '250px', boxShadow: '0 15px 40px rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <input 
              type="text" 
              placeholder="Search chats..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', marginBottom: '1rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none' }}
            />
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Filter by Date</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none' }}
              />
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none' }}
              />
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'rgba(0,0,0,0.4)', paddingBottom: '2rem' }}>
        {filteredMessages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', marginTop: '2rem', backgroundColor: 'rgba(0,0,0,0.5)', padding: '1rem', borderRadius: '12px', alignSelf: 'center' }}>
            {messages.length === 0 ? `Start of your secure conversation with ${otherUser}.` : `No messages match your search.`}
          </div>
        ) : (
          Object.keys(groupedMessages).map(dateStr => (
            <div key={dateStr} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ alignSelf: 'center', backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', padding: '0.3rem 0.8rem', borderRadius: '12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {dateStr === new Date().toLocaleDateString() ? 'Today' : dateStr}
              </div>
              
              {groupedMessages[dateStr].map((msg) => {
                const msgTime = msg.timestamp?.toDate ? msg.timestamp.toDate().getTime() : Date.now();
                const canEdit = msg.sender === user && msg.type === 'text' && (Date.now() - msgTime <= 5 * 60 * 1000);
                
                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignSelf: msg.sender === user ? 'flex-end' : 'flex-start', maxWidth: '75%', position: 'relative' }}>
                    <div 
                      onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === msg.id ? null : msg.id); }}
                      style={{
                        backgroundColor: msg.sender === user ? 'rgba(56, 189, 248, 0.85)' : 'rgba(30, 41, 59, 0.9)',
                        backdropFilter: 'blur(12px)',
                        color: msg.sender === user ? 'white' : 'var(--text-primary)',
                        padding: '0.6rem 1rem',
                        borderRadius: msg.sender === user ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        wordBreak: 'break-word',
                        boxShadow: '0 8px 25px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.2)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        cursor: 'pointer',
                        position: 'relative'
                      }}
                    >
                      {msg.replyTo && (
                        <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: '0.5rem', borderRadius: '8px', marginBottom: '0.5rem', fontSize: '0.85rem', borderLeft: `3px solid ${msg.replyTo.sender === user ? '#60a5fa' : '#34d399'}` }}>
                          <strong style={{ color: msg.replyTo.sender === user ? '#60a5fa' : '#34d399' }}>{msg.replyTo.sender === user ? 'You' : msg.replyTo.sender}</strong>
                          <div style={{ opacity: 0.9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.replyTo.text}</div>
                        </div>
                      )}

                      {msg.type === 'text' && <div>{msg.text}</div>}
                      {msg.type === 'image' && (
                        <img 
                          src={msg.url} 
                          alt="Shared image" 
                          onClick={(e) => { e.stopPropagation(); handleMediaClick(msg); }}
                          style={{ maxWidth: '100%', borderRadius: '8px', cursor: 'pointer', marginTop: '0.25rem' }} 
                        />
                      )}
                      {msg.type === 'video' && (
                        <video 
                          src={msg.url} 
                          onClick={(e) => { e.stopPropagation(); handleMediaClick(msg); }}
                          style={{ maxWidth: '100%', borderRadius: '8px', cursor: 'pointer', marginTop: '0.25rem' }} 
                        />
                      )}
                      {msg.type === 'document' && <a href={msg.url} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>📄 {msg.text}</a>}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.3rem', marginTop: '0.25rem', fontSize: '0.65rem', opacity: 0.8 }}>
                        {msg.edited && <span>(edited)</span>}
                        <span>{getFormatTime(msg.dateObj)}</span>
                        {msg.sender === user && (
                          <span style={{ display: 'flex', alignItems: 'center', color: msg.status === 'seen' ? '#38bdf8' : 'rgba(255,255,255,0.7)', marginLeft: '4px' }}>
                            {msg.status === 'sent' ? (
                              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            ) : (
                              <div style={{ position: 'relative', width: '18px', height: '14px' }}>
                                <svg style={{ position: 'absolute', left: 0 }} viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                <svg style={{ position: 'absolute', left: '4px' }} viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                              </div>
                            )}
                          </span>
                        )}
                      </div>

                      {/* Render Reactions */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div style={{ position: 'absolute', bottom: '-12px', right: msg.sender === user ? 'auto' : '-10px', left: msg.sender === user ? '-10px' : 'auto', backgroundColor: '#1e293b', padding: '2px 6px', borderRadius: '12px', fontSize: '0.8rem', display: 'flex', gap: '2px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                          {Object.values(msg.reactions).map((emoji, i) => <span key={i}>{emoji}</span>)}
                        </div>
                      )}
                    </div>

                    {/* Context Menu Dropdown */}
                    {activeMenuId === msg.id && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{ 
                          position: 'absolute', top: '100%', 
                          right: msg.sender === user ? 0 : 'auto', 
                          left: msg.sender === user ? 'auto' : 0, 
                          backgroundColor: '#0f172a', padding: '0.5rem', borderRadius: '12px', 
                          zIndex: 10, display: 'flex', gap: '0.25rem', 
                          boxShadow: '0 10px 25px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)',
                          marginTop: '0.5rem', animation: 'fadeIn 0.2s ease-out'
                        }}
                      >
                        <div style={{ display: 'flex', gap: '0.5rem', paddingRight: '0.5rem', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                          {['❤️', '😂', '😮', '😢', '👍'].map(emoji => (
                            <button key={emoji} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0.2rem', transition: 'transform 0.1s' }} onClick={() => handleReact(msg.id, emoji)} onMouseOver={(e) => e.target.style.transform = 'scale(1.2)'} onMouseOut={(e) => e.target.style.transform = 'scale(1)'}>
                              {emoji}
                            </button>
                          ))}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: '0.5rem' }}>
                          <button onClick={() => { handleReply(msg); setActiveMenuId(null); }} style={contextBtnStyle}>↩️ Reply</button>
                          {canEdit && (
                            <button onClick={() => { handleEdit(msg); setActiveMenuId(null); }} style={contextBtnStyle}>✏️ Edit</button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
        
        {/* Typing Indicator */}
        {otherTyping && (
          <div style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(30, 41, 59, 0.85)', backdropFilter: 'blur(8px)', color: 'var(--text-secondary)', padding: '0.5rem 1rem', borderRadius: '16px', fontSize: '0.85rem', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span>{otherUser} is typing</span>
            <div style={{ display: 'flex', gap: '2px' }}>
              <span className="dot-anim" style={{ animationDelay: '0s' }}>.</span>
              <span className="dot-anim" style={{ animationDelay: '0.2s' }}>.</span>
              <span className="dot-anim" style={{ animationDelay: '0.4s' }}>.</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {(editingMessage || replyingTo) && (
        <div style={{ padding: '0.75rem 1.5rem', backgroundColor: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(10px)', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>{editingMessage ? 'Editing message' : `Replying to ${replyingTo.sender === user ? 'You' : replyingTo.sender}`}</span>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
              {editingMessage ? '' : (replyingTo.type === 'text' ? replyingTo.text : 'Media')}
            </div>
          </div>
          <button 
            onClick={() => { setEditingMessage(null); setReplyingTo(null); setNewMessage(""); }}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '1.2rem' }}
          >×</button>
        </div>
      )}

      <div style={{ margin: '0 1rem 1rem 1rem', padding: '0.5rem', borderRadius: '30px', backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(20px)', boxShadow: '0 15px 35px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <form onSubmit={sendMessage} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
          />
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()} 
            style={{ padding: '0.75rem', borderRadius: '50%', border: 'none', backgroundColor: 'transparent', color: 'white', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            disabled={uploading}
            onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            {uploading ? '⏳' : '📎'}
          </button>
          
          <input 
            type="text" 
            placeholder="Type a message..." 
            value={newMessage}
            onChange={handleTyping}
            style={{ flex: 1, padding: '0.75rem 1.25rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none', transition: 'border 0.2s, background 0.2s' }}
            onFocus={(e) => { e.target.style.border = '1px solid rgba(56, 189, 248, 0.5)'; e.target.style.backgroundColor = 'rgba(255,255,255,0.1)' }}
            onBlur={(e) => { e.target.style.border = '1px solid rgba(255,255,255,0.1)'; e.target.style.backgroundColor = 'rgba(255,255,255,0.05)' }}
          />
          <button type="submit" style={{ padding: '0.75rem 1.5rem', borderRadius: '24px', border: 'none', backgroundColor: 'var(--accent-color)', color: 'white', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)' }}>
            {editingMessage ? 'Save' : 'Send'}
          </button>
        </form>
      </div>

      {lightboxData && (
        <Lightbox 
          mediaList={lightboxData.mediaList}
          initialIndex={lightboxData.initialIndex}
          onClose={() => setLightboxData(null)}
          onDelete={handleDeleteMedia}
        />
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dotBlink {
          0% { opacity: 0.2; }
          20% { opacity: 1; }
          100% { opacity: 0.2; }
        }
        .dot-anim {
          animation: dotBlink 1.4s infinite;
          font-size: 1.2rem;
          line-height: 0.5;
        }
      `}} />
    </div>
  );
}

const contextBtnStyle = {
  background: 'none', border: 'none', color: 'rgba(255,255,255,0.9)', cursor: 'pointer',
  fontSize: '0.85rem', padding: '0.4rem 0.5rem', textAlign: 'left', borderRadius: '6px',
  display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.2s'
};
