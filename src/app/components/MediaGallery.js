"use client";
import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, query, orderBy, onSnapshot, where } from "firebase/firestore";

export default function MediaGallery() {
  const [media, setMedia] = useState([]);

  useEffect(() => {
    // We can query all messages that are images or videos
    const q = query(collection(db, "messages"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(msg => msg.type === 'image' || msg.type === 'video');
      setMedia(msgs);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
      <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Private Gallery</h2>
      
      {media.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No media shared yet.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
          {media.map((item) => (
            <div key={item.id} style={{ aspectRatio: '1/1', backgroundColor: 'var(--panel-bg)', borderRadius: '8px', overflow: 'hidden' }}>
              {item.type === 'image' ? (
                <img src={item.url} alt="Gallery item" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <video src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
