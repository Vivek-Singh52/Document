"use client";
import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import Lightbox from "./Lightbox";

export default function MediaGallery() {
  const [media, setMedia] = useState([]);
  const [lightboxData, setLightboxData] = useState(null);

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
    return () => unsubscribe();
  }, []);

  const handleMediaClick = (index) => {
    setLightboxData({ mediaList: media, initialIndex: index });
  };

  const handleDeleteMedia = async (id) => {
    try {
      await deleteDoc(doc(db, "messages", id));
    } catch (e) {
      console.error("Failed to delete media", e);
    }
  };

  return (
    <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
      <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Private Gallery</h2>
      
      {media.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No media shared yet.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
          {media.map((item, index) => (
            <div 
              key={item.id} 
              onClick={() => handleMediaClick(index)}
              style={{ aspectRatio: '1/1', backgroundColor: 'var(--panel-bg)', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer' }}
            >
              {item.type === 'image' ? (
                <img src={item.url} alt="Gallery item" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <video src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
            </div>
          ))}
        </div>
      )}

      {lightboxData && (
        <Lightbox 
          mediaList={lightboxData.mediaList}
          initialIndex={lightboxData.initialIndex}
          onClose={() => setLightboxData(null)}
          onDelete={handleDeleteMedia}
        />
      )}
    </div>
  );
}
